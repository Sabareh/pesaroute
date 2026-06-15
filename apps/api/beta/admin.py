from django.contrib import admin

from beta.models import BetaFeedback, BetaInvite, FeatureFlag


@admin.register(FeatureFlag)
class FeatureFlagAdmin(admin.ModelAdmin):
    list_display = ["key", "enabled", "updated_at"]
    list_filter = ["enabled"]
    search_fields = ["key", "description"]


@admin.register(BetaInvite)
class BetaInviteAdmin(admin.ModelAdmin):
    list_display = ["code", "email", "phone", "used_count", "max_uses", "expires_at", "is_active"]
    list_filter = ["is_active", "expires_at"]
    search_fields = ["code", "email", "phone"]
    readonly_fields = ["used_count", "created_at", "updated_at"]


@admin.register(BetaFeedback)
class BetaFeedbackAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "category", "status", "created_at"]
    list_filter = ["category", "status"]
    search_fields = ["user__username", "message"]
    readonly_fields = ["created_at"]
