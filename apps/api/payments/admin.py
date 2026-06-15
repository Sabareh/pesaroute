from django.contrib import admin

from payments.models import PaymentEvent, PaymentIntent


@admin.register(PaymentIntent)
class PaymentIntentAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "purpose", "amount", "currency", "provider", "status", "created_at"]
    list_filter = ["purpose", "provider", "status", "currency"]
    search_fields = [
        "user__username",
        "idempotency_key",
        "provider_checkout_request_id",
        "provider_merchant_request_id",
        "provider_receipt",
    ]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(PaymentEvent)
class PaymentEventAdmin(admin.ModelAdmin):
    list_display = ["id", "payment_intent", "event_type", "provider", "created_at"]
    list_filter = ["event_type", "provider"]
    search_fields = ["payment_intent__idempotency_key", "payment_intent__provider_checkout_request_id"]
    readonly_fields = ["created_at"]
