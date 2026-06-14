from django.db.models import Q
from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from audit.models import AuditEvent
from audit.utils import record_audit_event
from journal.models import JournalEntry
from marketplace.models import ConsultationRequest, ConsultationResponse, Professional
from marketplace.serializers import (
    ConsultationLeadSerializer,
    ConsultationRequestSerializer,
    ConsultationResponseCreateSerializer,
    ConsultationResponseSerializer,
    ProfessionalSerializer,
)
from portfolio.models import PortfolioItem
from portfolio.services import build_portfolio_summary
from privacy.models import DataGrant
from privacy.services import can_professional_access, get_active_grant, log_data_access


class ProfessionalListView(generics.ListAPIView):
    serializer_class = ProfessionalSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Professional.objects.filter(is_active=True).filter(
            Q(verification_status=Professional.VerificationStatus.VERIFIED) | Q(status=Professional.Status.VERIFIED)
        )
        specialty = self.request.query_params.get("specialty")
        language = self.request.query_params.get("language")
        diaspora = self.request.query_params.get("diaspora_support")
        chama = self.request.query_params.get("chama_support")
        if specialty:
            queryset = queryset.filter(specialty__icontains=specialty)
        if language:
            queryset = [professional for professional in queryset if language in professional.languages]
        if diaspora in {"true", "1"}:
            queryset = (
                queryset.filter(diaspora_support=True)
                if hasattr(queryset, "filter")
                else [professional for professional in queryset if professional.diaspora_support]
            )
        if chama in {"true", "1"}:
            queryset = (
                queryset.filter(chama_support=True)
                if hasattr(queryset, "filter")
                else [professional for professional in queryset if professional.chama_support]
            )
        return (
            queryset.order_by("name", "id")
            if hasattr(queryset, "order_by")
            else sorted(queryset, key=lambda item: item.name)
        )


class ProfessionalDetailView(generics.RetrieveAPIView):
    serializer_class = ProfessionalSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Professional.objects.filter(is_active=True).filter(
            Q(verification_status=Professional.VerificationStatus.VERIFIED) | Q(status=Professional.Status.VERIFIED)
        )


class ProfessionalVerifyView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        professional = generics.get_object_or_404(Professional, pk=pk)
        professional.verification_status = Professional.VerificationStatus.VERIFIED
        professional.status = Professional.Status.VERIFIED
        professional.is_active = True
        professional.save(update_fields=["verification_status", "status", "is_active", "updated_at"])
        return Response(ProfessionalSerializer(professional).data)


class ConsultationRequestCreateView(generics.CreateAPIView):
    serializer_class = ConsultationRequestSerializer
    permission_classes = [IsAuthenticated]
    queryset = ConsultationRequest.objects.all()
    throttle_scope = "consultation_create"

    def perform_create(self, serializer):
        request_obj = serializer.save(user=self.request.user)
        record_audit_event(
            actor=self.request.user,
            event_type=AuditEvent.EventType.CONSULTATION_REQUEST_CREATED,
            resource_type="ConsultationRequest",
            resource_id=request_obj.id,
        )


class MyConsultationRequestListView(generics.ListAPIView):
    serializer_class = ConsultationRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ConsultationRequest.objects.filter(user=self.request.user).prefetch_related("responses")


class ProfessionalLeadListView(generics.ListAPIView):
    serializer_class = ConsultationLeadSerializer
    permission_classes = [IsAuthenticated]

    def get_professional(self):
        return getattr(self.request.user, "professional_profile", None)

    def get_queryset(self):
        professional = self.get_professional()
        if not professional:
            return ConsultationRequest.objects.none()
        return ConsultationRequest.objects.filter(
            Q(selected_professional__isnull=True) | Q(selected_professional=professional),
            status__in=[
                ConsultationRequest.Status.REQUESTED,
                ConsultationRequest.Status.REVIEWING,
                ConsultationRequest.Status.RESPONDED,
            ],
        ).order_by("-created_at")


class ProfessionalLeadRespondView(APIView):
    permission_classes = [IsAuthenticated]

    def get_professional(self, request):
        return getattr(request.user, "professional_profile", None)

    def post(self, request, pk):
        professional = self.get_professional(request)
        if not professional:
            return Response({"detail": "Professional profile required."}, status=403)
        lead = generics.get_object_or_404(
            ConsultationRequest.objects.filter(
                Q(selected_professional__isnull=True) | Q(selected_professional=professional),
                pk=pk,
            )
        )
        serializer = ConsultationResponseCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        response = ConsultationResponse.objects.create(
            consultation_request=lead,
            professional=professional,
            response_text=serializer.validated_data["response_text"],
            next_steps=serializer.validated_data.get("next_steps", ""),
        )
        lead.selected_professional = professional
        lead.professional = professional
        lead.status = ConsultationRequest.Status.RESPONDED
        lead.save(update_fields=["selected_professional", "professional", "status"])
        record_audit_event(
            actor=request.user,
            event_type=AuditEvent.EventType.CONSULTATION_RESPONSE_CREATED,
            resource_type="ConsultationResponse",
            resource_id=response.id,
            metadata={"consultation_request_id": lead.id},
        )
        return Response(ConsultationResponseSerializer(response).data, status=201)


class ConsultationContextView(APIView):
    permission_classes = [IsAuthenticated]

    def get_professional(self, request):
        return getattr(request.user, "professional_profile", None)

    def get(self, request, pk):
        professional = self.get_professional(request)
        if not professional:
            return Response({"detail": "Professional profile required."}, status=403)

        consultation = generics.get_object_or_404(
            ConsultationRequest.objects.filter(Q(professional=professional) | Q(selected_professional=professional)),
            pk=pk,
        )
        context_grant = get_active_grant(consultation.user, professional, DataGrant.Scope.CONSULTATION_CONTEXT)
        if not context_grant:
            return Response({"detail": "No active data grant for consultation context."}, status=403)

        allowed_scopes = [
            scope for scope in DataGrant.Scope.values if can_professional_access(consultation.user, professional, scope)
        ]
        payload = {
            "consultation": {
                "id": consultation.id,
                "category": consultation.category,
                "topic": consultation.topic,
                "user_question": consultation.user_question,
                "timeline": consultation.timeline,
                "risk_preference": consultation.risk_preference,
                "preferred_language": consultation.preferred_language,
                "status": consultation.status,
                "created_at": consultation.created_at,
            },
            "allowed_scopes": allowed_scopes,
        }

        if DataGrant.Scope.CONTACT_INFO in allowed_scopes:
            payload["contact_info"] = {
                "username": consultation.user.username,
                "email": consultation.user.email,
                "first_name": consultation.user.first_name,
                "last_name": consultation.user.last_name,
            }

        portfolio_items = list(PortfolioItem.objects.filter(user=consultation.user))
        if DataGrant.Scope.PORTFOLIO_SUMMARY in allowed_scopes:
            summary = build_portfolio_summary(portfolio_items)
            payload["portfolio_summary"] = {
                "asset_categories": {
                    item.asset_type: sum(1 for current in portfolio_items if current.asset_type == item.asset_type)
                    for item in portfolio_items
                },
                "liquidity_score": summary["liquidity_score"],
                "risk_concentration_note": summary["risk_concentration_note"],
                "items_count": summary["items_count"],
            }

        if DataGrant.Scope.PORTFOLIO_EXACT_VALUES in allowed_scopes:
            payload["portfolio_exact_values"] = [
                {
                    "asset_type": item.asset_type,
                    "provider_name": item.provider_name,
                    "amount_exact": str(item.amount_exact) if item.amount_exact else None,
                }
                for item in portfolio_items
                if item.amount_display_mode == PortfolioItem.AmountDisplayMode.EXACT
            ]

        if DataGrant.Scope.JOURNAL_ENTRIES in allowed_scopes:
            payload["journal_entries"] = [
                {
                    "id": entry.id,
                    "goal": entry.goal,
                    "decision": entry.decision,
                    "reason": entry.reason,
                    "created_at": entry.created_at,
                }
                for entry in JournalEntry.objects.filter(user=consultation.user).order_by("-created_at")[:20]
            ]

        log_data_access(
            user=consultation.user,
            professional=professional,
            data_grant=context_grant,
            action="view_consultation_context",
            scope=DataGrant.Scope.CONSULTATION_CONTEXT,
            resource_type="ConsultationRequest",
            resource_id=str(consultation.id),
        )
        return Response(payload)
