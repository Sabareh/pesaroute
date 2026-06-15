from django.contrib import admin

from marketplace.models import (
    ConsultationOffer,
    ConsultationRequest,
    ConsultationResponse,
    Professional,
    ProfessionalVerification,
)


@admin.register(Professional)
class ProfessionalAdmin(admin.ModelAdmin):
    list_display = ["id", "name", "firm", "specialty", "verification_status", "status", "is_active", "updated_at"]
    list_filter = ["verification_status", "status", "is_active", "diaspora_support", "chama_support"]
    search_fields = ["name", "display_name", "firm", "license_number", "specialty", "user__username"]


@admin.register(ProfessionalVerification)
class ProfessionalVerificationAdmin(admin.ModelAdmin):
    list_display = ["id", "professional", "status", "verified_at", "created_at"]
    list_filter = ["status"]
    search_fields = ["professional__name", "professional__display_name", "notes"]


@admin.register(ConsultationRequest)
class ConsultationRequestAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "category", "status", "professional", "amount_display_mode", "paid_at", "created_at"]
    list_filter = ["category", "status", "amount_display_mode", "preferred_language"]
    search_fields = ["user__username", "topic", "user_question", "professional__name"]
    readonly_fields = ["created_at", "updated_at", "paid_at"]


@admin.register(ConsultationOffer)
class ConsultationOfferAdmin(admin.ModelAdmin):
    list_display = ["id", "consultation_request", "professional", "proposed_fee", "status", "created_at"]
    list_filter = ["status", "professional"]
    search_fields = ["consultation_request__user__username", "professional__name", "message"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(ConsultationResponse)
class ConsultationResponseAdmin(admin.ModelAdmin):
    list_display = ["id", "consultation_request", "professional", "status", "created_at"]
    list_filter = ["status", "professional"]
    search_fields = ["consultation_request__user__username", "professional__name", "response_text"]
