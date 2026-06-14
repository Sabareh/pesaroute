from django.utils import timezone
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from audit.models import AuditEvent
from audit.utils import record_audit_event
from privacy.models import DataAccessLog, DataGrant
from privacy.serializers import DataAccessLogSerializer, DataGrantSerializer


class DataGrantListCreateView(generics.ListCreateAPIView):
    serializer_class = DataGrantSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return DataGrant.objects.filter(user=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        grant = serializer.save(user=self.request.user)
        record_audit_event(
            actor=self.request.user,
            event_type=AuditEvent.EventType.DATA_GRANT_CREATED,
            resource_type="DataGrant",
            resource_id=grant.id,
            metadata={"grantee_type": grant.grantee_type, "scopes": grant.scopes},
        )


class DataAccessLogListView(generics.ListAPIView):
    serializer_class = DataAccessLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return DataAccessLog.objects.filter(user=self.request.user).order_by("-created_at")


class DataGrantRevokeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        grant = generics.get_object_or_404(DataGrant, pk=pk, user=request.user)
        if not grant.revoked_at:
            grant.revoked_at = timezone.now()
            grant.status = DataGrant.Status.REVOKED
            grant.save(update_fields=["revoked_at", "status"])
            record_audit_event(
                actor=request.user,
                event_type=AuditEvent.EventType.DATA_GRANT_REVOKED,
                resource_type="DataGrant",
                resource_id=grant.id,
                metadata={"grantee_type": grant.grantee_type},
            )
        return Response(DataGrantSerializer(grant).data)

    def delete(self, request, pk):
        return self.post(request, pk)
