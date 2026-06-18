from datetime import timedelta

from django.utils import timezone
from rest_framework import generics, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from journal.models import JournalEntry
from land.models import (
    LandDecisionJournalLink,
    LandDocumentRecord,
    LandDueDiligenceItem,
    LandOpportunity,
)
from land.serializers import (
    LandComparisonInputSerializer,
    LandDocumentRecordSerializer,
    LandDueDiligenceItemSerializer,
    LandOpportunityListSerializer,
    LandOpportunitySerializer,
    RequestReviewSerializer,
    RiskScoreInputSerializer,
    SaveToJournalSerializer,
)
from land.services import (
    DEFAULT_CHECKLIST,
    DISCLAIMER,
    compare_land_with_alternatives,
    create_default_checklist,
    score_risk,
)
from marketplace.models import ConsultationRequest, Professional
from privacy.models import DataGrant

# Maps the land-specific reviewer type to a marketplace consultation category.
REVIEW_TYPE_LABEL = {
    "land_lawyer": "Land lawyer",
    "surveyor": "Surveyor",
    "valuer": "Valuer",
    "diaspora_land_adviser": "Diaspora land adviser",
    "chama_land_adviser": "Chama land adviser",
}


def _owned_opportunity(request, pk):
    """Fetch an opportunity owned by the requesting user, or 404."""
    return generics.get_object_or_404(LandOpportunity, pk=pk, user=request.user)


class LandOpportunityListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        return LandOpportunityListSerializer if self.request.method == "GET" else LandOpportunitySerializer

    def get_queryset(self):
        return LandOpportunity.objects.filter(user=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        opportunity = serializer.save(user=self.request.user)
        # Every new opportunity starts with the full due-diligence checklist.
        create_default_checklist(opportunity)


class LandOpportunityDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = LandOpportunitySerializer

    def get_queryset(self):
        return LandOpportunity.objects.filter(user=self.request.user).prefetch_related(
            "due_diligence_items", "risk_flags", "documents"
        )


class LandChecklistView(APIView):
    """POST creates/ensures the default checklist for an opportunity and returns it."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        opportunity = _owned_opportunity(request, pk)
        items = create_default_checklist(opportunity)
        return Response(LandDueDiligenceItemSerializer(items, many=True).data, status=status.HTTP_201_CREATED)

    def get(self, request, pk):
        opportunity = _owned_opportunity(request, pk)
        items = opportunity.due_diligence_items.all()
        return Response(LandDueDiligenceItemSerializer(items, many=True).data)


class LandChecklistItemUpdateView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = LandDueDiligenceItemSerializer

    def get_queryset(self):
        # Ownership enforced through the parent opportunity.
        return LandDueDiligenceItem.objects.filter(land_opportunity__user=self.request.user)


class LandRiskScoreView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        opportunity = _owned_opportunity(request, pk)
        serializer = RiskScoreInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = score_risk(opportunity, serializer.validated_data)
        return Response(result)


class LandSaveToJournalView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        opportunity = _owned_opportunity(request, pk)
        serializer = SaveToJournalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        note = serializer.validated_data["note"]

        risk = opportunity.get_risk_level_display()
        decision_lines = [
            f"Land decision: {opportunity.title} ({opportunity.location_text}).",
            f"Decision stage: {opportunity.get_decision_stage_display()}. Visible risk: {risk}.",
            f"Seller: {opportunity.get_seller_type_display()}. Title status: {opportunity.get_title_status_display()}.",
        ]
        if note:
            decision_lines.append(f"My reasoning: {note}")
        decision_lines.append(DISCLAIMER)

        entry = JournalEntry.objects.create(
            user=request.user,
            goal=f"Land decision: {opportunity.title}"[:180],
            decision="\n".join(decision_lines),
            amount_display_mode=JournalEntry.AmountDisplayMode.HIDDEN,
            visibility=JournalEntry.Visibility.PRIVATE,
        )
        link = LandDecisionJournalLink.objects.create(land_opportunity=opportunity, journal_entry=entry)
        return Response(
            {"journal_entry_id": entry.id, "land_decision_journal_link_id": link.id, "visibility": entry.visibility},
            status=status.HTTP_201_CREATED,
        )


class LandRequestReviewView(APIView):
    """Create a privacy-respecting professional-review request for a land opportunity.

    Defaults: documents private, exact amount hidden, access auto-expires. The user
    explicitly chooses which documents to share.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        opportunity = _owned_opportunity(request, pk)
        serializer = RequestReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        professional = None
        if data.get("professional_id"):
            professional = Professional.objects.filter(
                id=data["professional_id"],
                verification_status=Professional.VerificationStatus.VERIFIED,
                is_active=True,
            ).first()

        # Only the documents the user explicitly listed get shared.
        share_ids = data["share_document_ids"]
        shared_docs = list(opportunity.documents.filter(id__in=share_ids)) if share_ids else []
        for doc in shared_docs:
            doc.visibility = LandDocumentRecord.Visibility.SHARED_WITH_PROFESSIONAL
        if shared_docs:
            LandDocumentRecord.objects.bulk_update(shared_docs, ["visibility"])

        scopes = [DataGrant.Scope.CONSULTATION_CONTEXT]
        if shared_docs:
            scopes.append(DataGrant.Scope.SELECTED_DOCUMENTS)

        now = timezone.now()
        grant = DataGrant.objects.create(
            user=request.user,
            grantee_type=DataGrant.GranteeType.PROFESSIONAL,
            professional=professional,
            grantee_id=professional.id if professional else None,
            scopes=scopes,
            status=DataGrant.Status.ACTIVE,
            starts_at=now,
            expires_at=now + timedelta(days=data["access_days"]),
        )

        share_amount = data["share_amount"]
        amount_mode = (
            ConsultationRequest.AmountDisplayMode.RANGE
            if share_amount
            else ConsultationRequest.AmountDisplayMode.HIDDEN
        )
        reviewer_label = REVIEW_TYPE_LABEL.get(data["professional_type"], "Land adviser")
        consultation = ConsultationRequest.objects.create(
            user=request.user,
            selected_professional=professional,
            data_grant=grant,
            category=ConsultationRequest.Category.LAND_LITERACY,
            topic=f"Land review ({reviewer_label}): {opportunity.title}"[:180],
            amount_display_mode=amount_mode,
            amount_range_min=opportunity.asking_price if share_amount else None,
            amount_range_max=opportunity.asking_price if share_amount else None,
            user_question=data["question"],
            notes=data["question"],
            status=ConsultationRequest.Status.SUBMITTED,
        )

        return Response(
            {
                "consultation_request_id": consultation.id,
                "data_grant_id": grant.id,
                "professional_type": data["professional_type"],
                "documents_shared": [doc.id for doc in shared_docs],
                "documents_shared_count": len(shared_docs),
                "amount_shared": share_amount,
                "access_expires_at": grant.expires_at.isoformat(),
                "disclaimer": DISCLAIMER,
            },
            status=status.HTTP_201_CREATED,
        )


class LandDefaultChecklistView(APIView):
    """Public educational checklist template (no opportunity, no auth)."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response(
            {
                "items": [
                    {
                        "item_key": spec["item_key"],
                        "title": spec["title"],
                        "description": spec["description"],
                        "importance": spec["importance"],
                        "professional_type_needed": spec["professional_type_needed"],
                        "source_note": spec["source_note"],
                    }
                    for spec in DEFAULT_CHECKLIST
                ],
                "disclaimer": DISCLAIMER,
            }
        )


class LandDocumentCreateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request, pk):
        opportunity = _owned_opportunity(request, pk)
        serializer = LandDocumentRecordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # visibility defaults to private on the model; never auto-shared on upload.
        document = serializer.save(land_opportunity=opportunity)
        return Response(LandDocumentRecordSerializer(document).data, status=status.HTTP_201_CREATED)

    def get(self, request, pk):
        opportunity = _owned_opportunity(request, pk)
        return Response(LandDocumentRecordSerializer(opportunity.documents.all(), many=True).data)


class LandCompareView(APIView):
    """Educational land-vs-alternatives comparison. No login required, no guarantees."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LandComparisonInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        result = compare_land_with_alternatives(
            land_price=data["land_price"],
            deposit=data.get("deposit"),
            holding_period_years=data["holding_period_years"],
            appreciation_scenario=data["appreciation_scenario"],
            custom_rate=data.get("custom_rate"),
            transaction_cost_estimate=data.get("transaction_cost_estimate"),
            liquidity_need=data["liquidity_need"],
        )
        return Response(result)
