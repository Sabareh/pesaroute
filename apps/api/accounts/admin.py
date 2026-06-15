from django.contrib import admin

from accounts.models import UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "role", "preferred_language", "user_type", "privacy_mode_enabled", "created_at"]
    list_filter = ["role", "preferred_language", "user_type", "privacy_mode_enabled"]
    search_fields = ["user__username", "user__email", "approximate_investment_range"]
