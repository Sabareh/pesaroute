from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from audit.models import AuditEvent
from audit.utils import record_audit_event
from portfolio.models import PortfolioItem
from portfolio.serializers import PortfolioItemSerializer
from portfolio.services import build_portfolio_summary


class PortfolioItemListCreateView(generics.ListCreateAPIView):
    serializer_class = PortfolioItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PortfolioItem.objects.filter(user=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        item = serializer.save(user=self.request.user)
        record_audit_event(
            actor=self.request.user,
            event_type=AuditEvent.EventType.PORTFOLIO_ITEM_CREATED,
            resource_type="PortfolioItem",
            resource_id=item.id,
        )


class PortfolioItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PortfolioItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PortfolioItem.objects.filter(user=self.request.user)


class PortfolioSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        items = list(PortfolioItem.objects.filter(user=request.user))
        return Response(build_portfolio_summary(items))
