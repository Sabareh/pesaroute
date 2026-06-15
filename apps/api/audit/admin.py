from django.contrib import admin

from audit.models import AuditEvent


@admin.register(AuditEvent)
class AuditEventAdmin(admin.ModelAdmin):
    list_display = ["id", "actor", "event_type", "resource_type", "resource_id", "created_at"]
    list_filter = ["event_type", "resource_type"]
    search_fields = ["actor__username", "resource_type", "resource_id"]
    readonly_fields = ["created_at"]
