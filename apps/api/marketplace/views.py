from decimal import Decimal

from django.db import transaction
from django.db.models import Q
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from audit.models import AuditEvent
from audit.utils import record_audit_event
from journal.models import JournalEntry
from marketplace.models import ConsultationOffer, ConsultationRequest, ConsultationResponse, Professional
from marketplace.serializers import (
    ConsultationLeadSerializer,
    ConsultationOfferSerializer,
    ConsultationRequestSerializer,
    ConsultationResponseCreateSerializer,
    ConsultationResponseSerializer,
    ProfessionalSerializer,
)
from notifications.models import Notification
from notifications.services import create_notification
from payments.models import PaymentIntent
from payments.serializers import PaymentIntentSerializer
from payments.services import PaymentValidationError, create_payment_intent
from portfolio.models import PortfolioItem
from portfolio.services import build_portfolio_summary
from privacy.models import DataGrant
from privacy.services import can_professional_access, get_active_grant, log_data_access


def is_verified_active_professional(professional: Professional | None) -> bool:
    if not professional or not professional.is_active:
        return False
    return (
        professional.verification_status == Professional.VerificationStatus.VERIFIED
        or professional.status == Professional.Status.VERIFIED
    )


ELIGIBLE_LEAD_STATUSES = [
    ConsultationRequest.Status.REQUESTED,
    ConsultationRequest.Status.SUBMITTED,
    ConsultationRequest.Status.REVIEWING,
    ConsultationRequest.Status.RESPONDED,
    ConsultationRequest.Status.PROFESSIONAL_RESPONDED,
]


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
        if not is_verified_active_professional(professional):
            return ConsultationRequest.objects.none()
        return ConsultationRequest.objects.filter(
            Q(selected_professional__isnull=True) | Q(selected_professional=professional),
            status__in=ELIGIBLE_LEAD_STATUSES,
        ).order_by("-created_at")


class ProfessionalLeadRespondView(APIView):
    permission_classes = [IsAuthenticated]

    def get_professional(self, request):
        return getattr(request.user, "professional_profile", None)

    def post(self, request, pk):
        professional = self.get_professional(request)
        if not is_verified_active_professional(professional):
            return Response({"detail": "Professional profile required."}, status=403)
        lead = generics.get_object_or_404(
            ConsultationRequest.objects.filter(
                Q(selected_professional__isnull=True) | Q(selected_professional=professional),
                pk=pk,
                status__in=ELIGIBLE_LEAD_STATUSES,
            )
        )
        serializer = ConsultationResponseCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            response = ConsultationResponse.objects.create(
                consultation_request=lead,
                professional=professional,
                response_text=serializer.validated_data["response_text"],
                next_steps=serializer.validated_data.get("next_steps", ""),
            )
            proposed_fee = serializer.validated_data.get("proposed_fee")
            offer = ConsultationOffer.objects.create(
                consultation_request=lead,
                professional=professional,
                proposed_fee=proposed_fee if proposed_fee is not None else Decimal("0.00"),
                platform_fee_amount=Decimal("0.00"),
                message=serializer.validated_data["response_text"],
                estimated_duration=serializer.validated_data.get("estimated_duration") or "30 minutes",
                available_slots_text=serializer.validated_data.get("available_slots_text", ""),
            )
            lead.status = ConsultationRequest.Status.PROFESSIONAL_RESPONDED
            lead.save(update_fields=["status", "updated_at"])
        record_audit_event(
            actor=request.user,
            event_type=AuditEvent.EventType.CONSULTATION_RESPONSE_CREATED,
            resource_type="ConsultationResponse",
            resource_id=response.id,
            metadata={"consultation_request_id": lead.id, "consultation_offer_id": offer.id},
        )
        create_notification(
            user=lead.user,
            type=Notification.Type.PROFESSIONAL_RESPONDED,
            title="Professional responded",
            body="A verified professional has sent a review offer. You can accept it before paying.",
        )
        return Response(
            {
                "response": ConsultationResponseSerializer(response).data,
                "offer": ConsultationOfferSerializer(offer).data,
            },
            status=201,
        )


class ConsultationOfferAcceptView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        offer = generics.get_object_or_404(
            ConsultationOffer.objects.select_related("consultation_request", "professional"),
            pk=pk,
            consultation_request__user=request.user,
        )
        if offer.status != ConsultationOffer.Status.PENDING:
            return Response({"detail": "Offer is no longer pending."}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            ConsultationOffer.objects.filter(consultation_request=offer.consultation_request).exclude(
                id=offer.id
            ).update(status=ConsultationOffer.Status.REJECTED)
            offer.status = ConsultationOffer.Status.ACCEPTED
            offer.save(update_fields=["status", "updated_at"])
            consultation = offer.consultation_request
            consultation.professional = offer.professional
            consultation.selected_professional = offer.professional
            consultation.status = ConsultationRequest.Status.USER_SELECTED_PROFESSIONAL
            consultation.platform_fee_amount = offer.platform_fee_amount
            consultation.save(
                update_fields=[
                    "professional",
                    "selected_professional",
                    "status",
                    "platform_fee_amount",
                    "updated_at",
                ]
            )
        create_notification(
            user=getattr(offer.professional, "user", None),
            type=Notification.Type.PROFESSIONAL_RESPONDED,
            title="Offer accepted",
            body="A user accepted your professional review offer. Payment is still required before review proceeds.",
        )
        return Response(ConsultationOfferSerializer(offer).data)


class ConsultationPaymentStartView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "payments"

    def post(self, request, pk: int):
        consultation = generics.get_object_or_404(ConsultationRequest.objects.filter(user=request.user), pk=pk)
        idempotency_key = request.data.get("idempotency_key") or f"consultation-{consultation.id}"
        try:
            intent = create_payment_intent(
                user=request.user,
                purpose=PaymentIntent.Purpose.PROFESSIONAL_CONSULTATION,
                consultation_request=consultation,
                idempotency_key=idempotency_key,
                phone_number=request.data.get("phone_number", ""),
            )
        except PaymentValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        if consultation.status == ConsultationRequest.Status.USER_SELECTED_PROFESSIONAL:
            consultation.status = ConsultationRequest.Status.AWAITING_PAYMENT
            consultation.save(update_fields=["status", "updated_at"])
        return Response(PaymentIntentSerializer(intent).data, status=status.HTTP_201_CREATED)


class ConsultationPaidStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk: int):
        consultation = generics.get_object_or_404(ConsultationRequest.objects.filter(user=request.user), pk=pk)
        return Response(ConsultationRequestSerializer(consultation).data)


class ProfessionalConsultationListView(generics.ListAPIView):
    serializer_class = ConsultationRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        professional = getattr(self.request.user, "professional_profile", None)
        if not is_verified_active_professional(professional):
            return ConsultationRequest.objects.none()
        return ConsultationRequest.objects.filter(
            professional=professional,
            status__in=[
                ConsultationRequest.Status.PAID,
                ConsultationRequest.Status.SCHEDULED,
                ConsultationRequest.Status.COMPLETED,
            ],
        ).prefetch_related("offers", "responses")


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
