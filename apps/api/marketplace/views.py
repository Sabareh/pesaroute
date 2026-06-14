from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from audit.models import AuditEvent
from audit.utils import record_audit_event
from marketplace.models import ConsultationRequest
from marketplace.serializers import ConsultationRequestSerializer


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
