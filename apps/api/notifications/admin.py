from django.contrib import admin

from notifications.models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "channel", "type", "status", "created_at", "read_at"]
    list_filter = ["channel", "type", "status"]
    search_fields = ["user__username", "title", "body"]
    readonly_fields = ["created_at", "read_at"]
