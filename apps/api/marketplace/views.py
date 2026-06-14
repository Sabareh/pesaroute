from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from audit.models import AuditEvent
from audit.utils import record_audit_event
from journal.models import JournalEntry
from marketplace.models import ConsultationRequest
from marketplace.serializers import ConsultationRequestSerializer
from portfolio.models import PortfolioItem
from portfolio.services import build_portfolio_summary
from privacy.models import DataGrant
from privacy.services import can_professional_access, get_active_grant, log_data_access


class ConsultationRequestCreateView(generics.CreateAPIView):
    serializer_class = ConsultationRequestSerializer
    permission_classes = [IsAuthenticated]
    queryset = ConsultationRequest.objects.all()

    def perform_create(self, serializer):
        request_obj = serializer.save(user=self.request.user)
        record_audit_event(
            actor=self.request.user,
            event_type=AuditEvent.EventType.CONSULTATION_REQUEST_CREATED,
            resource_type="ConsultationRequest",
            resource_id=request_obj.id,
        )


class ConsultationContextView(APIView):
    permission_classes = [IsAuthenticated]

    def get_professional(self, request):
        return getattr(request.user, "professional_profile", None)

    def get(self, request, pk):
        professional = self.get_professional(request)
        if not professional:
            return Response({"detail": "Professional profile required."}, status=403)

        consultation = generics.get_object_or_404(ConsultationRequest, pk=pk, professional=professional)
        context_grant = get_active_grant(consultation.user, professional, DataGrant.Scope.CONSULTATION_CONTEXT)
        if not context_grant:
            return Response({"detail": "No active data grant for consultation context."}, status=403)

        allowed_scopes = [
            scope for scope in DataGrant.Scope.values if can_professional_access(consultation.user, professional, scope)
        ]
        payload = {
            "consultation": {
                "id": consultation.id,
                "topic": consultation.topic,
                "notes": consultation.notes,
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
