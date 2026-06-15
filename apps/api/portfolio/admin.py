from django.contrib import admin

from portfolio.models import PortfolioItem


@admin.register(PortfolioItem)
class PortfolioItemAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "asset_type", "provider_name", "amount_display_mode", "liquidity_level", "risk_level"]
    list_filter = ["asset_type", "amount_display_mode", "liquidity_level", "risk_level", "visibility"]
    search_fields = ["user__username", "asset_type", "provider_name"]
    readonly_fields = ["created_at", "updated_at"]
