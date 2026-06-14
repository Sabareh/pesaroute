from django.contrib import admin

from billing.models import Entitlement, Invoice, OneOffPurchase, Plan, Subscription


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ["code", "audience", "price_kes", "billing_period", "is_active"]
    list_filter = ["audience", "billing_period", "is_active"]
    search_fields = ["code", "name"]


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ["user", "plan", "status", "source", "current_period_end"]
    list_filter = ["status", "source", "plan"]
    search_fields = ["user__username", "plan__code"]


@admin.register(Entitlement)
class EntitlementAdmin(admin.ModelAdmin):
    list_display = ["user", "code", "source", "is_active", "expires_at"]
    list_filter = ["source", "is_active", "code"]
    search_fields = ["user__username", "code"]


@admin.register(OneOffPurchase)
class OneOffPurchaseAdmin(admin.ModelAdmin):
    list_display = ["user", "pack_code", "status", "source", "amount_kes"]
    list_filter = ["pack_code", "status", "source"]
    search_fields = ["user__username", "pack_code"]


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ["user", "amount_kes", "status", "source", "provider_reference"]
    list_filter = ["status", "source"]
    search_fields = ["user__username", "provider_reference"]
