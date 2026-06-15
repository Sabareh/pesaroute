from django.contrib import admin

from journal.models import JournalEntry


@admin.register(JournalEntry)
class JournalEntryAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "goal", "amount_display_mode", "visibility", "review_date", "created_at"]
    list_filter = ["amount_display_mode", "visibility", "review_date"]
    search_fields = ["user__username", "goal"]
    readonly_fields = ["created_at", "updated_at"]
