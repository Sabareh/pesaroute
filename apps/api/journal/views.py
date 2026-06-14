from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from audit.models import AuditEvent
from audit.utils import record_audit_event
from journal.models import JournalEntry
from journal.serializers import JournalEntrySerializer


class JournalEntryListCreateView(generics.ListCreateAPIView):
    serializer_class = JournalEntrySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return JournalEntry.objects.filter(user=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        entry = serializer.save(user=self.request.user)
        record_audit_event(
            actor=self.request.user,
            event_type=AuditEvent.EventType.JOURNAL_CREATED,
            resource_type="JournalEntry",
            resource_id=entry.id,
        )


class JournalEntryDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = JournalEntrySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return JournalEntry.objects.filter(user=self.request.user)
