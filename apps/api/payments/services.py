from __future__ import annotations

import uuid
from datetime import timedelta
from decimal import Decimal
from typing import Any

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from billing.models import Invoice, OneOffPackCode, OneOffPurchase, Plan, Subscription
from billing.services import ONE_OFF_PACK_PRICES, seed_default_plans
from marketplace.models import ConsultationOffer, ConsultationRequest
from notifications.models import Notification
from notifications.services import create_notification
from payments.models import PaymentEvent, PaymentIntent
from payments.mpesa import MpesaAdapter, MpesaError, extract_callback_summary, mask_phone_number


class PaymentValidationError(ValueError):
    pass


def payment_amount_for(
    *,
    purpose: str,
    plan_code: str = "",
    pack_code: str = "",
    consultation_request: ConsultationRequest | None = None,
) -> Decimal:
    seed_default_plans()
    if purpose == PaymentIntent.Purpose.SUBSCRIPTION:
        paid_plan_codes = {
            Plan.Code.PREMIUM_MONTHLY,
            Plan.Code.PREMIUM_YEARLY,
            Plan.Code.PROFESSIONAL_BASIC,
            Plan.Code.PROFESSIONAL_PRO,
        }
        if plan_code not in paid_plan_codes:
            raise PaymentValidationError("Choose a valid paid subscription plan.")
        return Decimal(Plan.objects.get(code=plan_code).price_kes)
    if purpose == PaymentIntent.Purpose.ONE_OFF_PACK:
        if pack_code not in OneOffPackCode.values:
            raise PaymentValidationError("Choose a valid guide pack.")
        return Decimal(ONE_OFF_PACK_PRICES[pack_code])
    if purpose == PaymentIntent.Purpose.PROFESSIONAL_CONSULTATION:
        if consultation_request is None:
            raise PaymentValidationError("Consultation request is required for consultation payments.")
        accepted_offer = (
            consultation_request.offers.filter(status=ConsultationOffer.Status.ACCEPTED).order_by("-updated_at").first()
        )
        if not accepted_offer:
            raise PaymentValidationError("Accept a professional offer before paying for consultation.")
        return Decimal(accepted_offer.proposed_fee)
    raise PaymentValidationError("Choose a valid payment purpose.")


def create_payment_intent(
    *,
    user,
    purpose: str,
    idempotency_key: str | None = None,
    plan_code: str = "",
    pack_code: str = "",
    consultation_request: ConsultationRequest | None = None,
    phone_number: str = "",
) -> PaymentIntent:
    idempotency_key = idempotency_key or uuid.uuid4().hex
    existing = PaymentIntent.objects.filter(user=user, idempotency_key=idempotency_key).first()
    if existing:
        return existing

    amount = payment_amount_for(
        purpose=purpose,
        plan_code=plan_code,
        pack_code=pack_code,
        consultation_request=consultation_request,
    )
    if amount < 0:
        raise PaymentValidationError("Payment amount cannot be negative.")

    if purpose == PaymentIntent.Purpose.SUBSCRIPTION:
        pack_code = ""
        consultation_request = None
    elif purpose == PaymentIntent.Purpose.ONE_OFF_PACK:
        plan_code = ""
        consultation_request = None
    elif purpose == PaymentIntent.Purpose.PROFESSIONAL_CONSULTATION:
        plan_code = ""
        pack_code = ""

    intent = PaymentIntent.objects.create(
        user=user,
        purpose=purpose,
        plan_code=plan_code,
        pack_code=pack_code,
        consultation_request=consultation_request,
        amount=amount,
        currency="KES",
        phone_number_masked=mask_phone_number(phone_number) if phone_number else "",
        idempotency_key=idempotency_key,
        expires_at=timezone.now() + timedelta(minutes=settings.MPESA_INTENT_EXPIRY_MINUTES),
    )
    if purpose == PaymentIntent.Purpose.PROFESSIONAL_CONSULTATION and consultation_request:
        if consultation_request.status == ConsultationRequest.Status.USER_SELECTED_PROFESSIONAL:
            consultation_request.status = ConsultationRequest.Status.AWAITING_PAYMENT
            consultation_request.save(update_fields=["status", "updated_at"])
    record_payment_event(intent, "intent_created", {"purpose": purpose, "amount": str(amount), "currency": "KES"})
    return intent


def record_payment_event(intent: PaymentIntent, event_type: str, summary: dict[str, Any]) -> PaymentEvent:
    return PaymentEvent.objects.create(payment_intent=intent, event_type=event_type, safe_payload_summary=summary)


def get_mpesa_adapter() -> MpesaAdapter:
    return MpesaAdapter()


def initiate_mpesa_checkout(
    intent: PaymentIntent, *, phone_number: str, adapter: MpesaAdapter | None = None
) -> PaymentIntent:
    if intent.status == PaymentIntent.Status.SUCCESSFUL:
        return intent
    if intent.is_expired:
        intent.status = PaymentIntent.Status.EXPIRED
        intent.save(update_fields=["status", "updated_at"])
        record_payment_event(intent, "intent_expired", {"reason": "expired_before_initiation"})
        return intent
    if intent.purpose == PaymentIntent.Purpose.PROFESSIONAL_CONSULTATION and intent.amount <= 0:
        raise PaymentValidationError("Consultation payments are not priced yet.")

    adapter = adapter or get_mpesa_adapter()
    try:
        response = adapter.initiate_checkout(
            amount=intent.amount_as_integer,
            phone_number=phone_number,
            account_reference=f"PesaRoute-{intent.id}",
            transaction_description=f"PesaRoute {intent.purpose}",
        )
    except MpesaError:
        mark_failed(intent, "M-Pesa checkout could not be initiated.")
        raise

    intent.phone_number_masked = mask_phone_number(phone_number)
    intent.provider_checkout_request_id = response.checkout_request_id
    intent.provider_merchant_request_id = response.merchant_request_id
    intent.status = PaymentIntent.Status.INITIATED
    intent.save(
        update_fields=[
            "phone_number_masked",
            "provider_checkout_request_id",
            "provider_merchant_request_id",
            "status",
            "updated_at",
        ]
    )
    record_payment_event(
        intent,
        "mpesa_checkout_initiated",
        {
            "checkout_request_id": response.checkout_request_id,
            "merchant_request_id": response.merchant_request_id,
            "response_code": response.response_code,
        },
    )
    return intent


def find_intent_for_callback(summary: dict[str, Any]) -> PaymentIntent:
    checkout_request_id = summary.get("checkout_request_id", "")
    merchant_request_id = summary.get("merchant_request_id", "")
    queryset = PaymentIntent.objects.all()
    if checkout_request_id:
        intent = queryset.filter(provider_checkout_request_id=checkout_request_id).first()
        if intent:
            return intent
    if merchant_request_id:
        intent = queryset.filter(provider_merchant_request_id=merchant_request_id).first()
        if intent:
            return intent
    raise PaymentValidationError("No payment intent matches this M-Pesa callback.")


@transaction.atomic
def handle_mpesa_callback(payload: dict[str, Any]) -> PaymentIntent:
    summary = extract_callback_summary(payload)
    intent = PaymentIntent.objects.select_for_update().get(id=find_intent_for_callback(summary).id)
    record_payment_event(intent, "mpesa_callback_received", summary)

    result_code = summary.get("result_code")
    if result_code in {0, "0"}:
        return mark_successful(intent, provider_receipt=str(summary.get("receipt") or ""))

    description = str(summary.get("result_description") or "M-Pesa payment failed.")
    return mark_failed(intent, description)


@transaction.atomic
def mark_successful(intent: PaymentIntent, *, provider_receipt: str = "") -> PaymentIntent:
    locked_intent = PaymentIntent.objects.select_for_update().get(id=intent.id)
    if locked_intent.status == PaymentIntent.Status.SUCCESSFUL:
        return locked_intent
    locked_intent.status = PaymentIntent.Status.SUCCESSFUL
    locked_intent.provider_receipt = provider_receipt or locked_intent.provider_receipt
    locked_intent.save(update_fields=["status", "provider_receipt", "updated_at"])
    apply_entitlement_after_success(locked_intent)
    create_notification(
        user=locked_intent.user,
        type=Notification.Type.PAYMENT_SUCCESSFUL,
        title="Payment confirmed",
        body="Your PesaRoute payment was confirmed by the backend.",
    )
    record_payment_event(
        locked_intent,
        "payment_successful",
        {"purpose": locked_intent.purpose, "receipt": locked_intent.provider_receipt},
    )
    return locked_intent


@transaction.atomic
def mark_failed(intent: PaymentIntent, reason: str) -> PaymentIntent:
    locked_intent = PaymentIntent.objects.select_for_update().get(id=intent.id)
    if locked_intent.status == PaymentIntent.Status.SUCCESSFUL:
        return locked_intent
    locked_intent.status = PaymentIntent.Status.FAILED
    locked_intent.save(update_fields=["status", "updated_at"])
    create_notification(
        user=locked_intent.user,
        type=Notification.Type.PAYMENT_FAILED,
        title="Payment failed",
        body="Your M-Pesa payment was not completed. You can retry from the app.",
    )
    record_payment_event(locked_intent, "payment_failed", {"reason": reason[:160]})
    return locked_intent


def apply_entitlement_after_success(intent: PaymentIntent) -> None:
    seed_default_plans()
    if intent.purpose == PaymentIntent.Purpose.SUBSCRIPTION:
        plan = Plan.objects.get(code=intent.plan_code)
        days = 365 if intent.plan_code == Plan.Code.PREMIUM_YEARLY else 30
        now = timezone.now()
        subscription = Subscription.objects.create(
            user=intent.user,
            plan=plan,
            status=Subscription.Status.ACTIVE,
            source=Subscription.Source.FUTURE_MPESA,
            current_period_start=now,
            current_period_end=now + timedelta(days=days),
        )
        Invoice.objects.get_or_create(
            user=intent.user,
            plan=plan,
            status=Invoice.Status.PAID,
            provider_reference=intent.provider_receipt or intent.provider_checkout_request_id,
            defaults={
                "amount_kes": int(intent.amount),
                "source": "mpesa",
                "notes": "M-Pesa subscription payment confirmed by callback.",
            },
        )
        record_payment_event(
            intent, "subscription_granted", {"subscription_id": subscription.id, "plan_code": plan.code}
        )
        create_notification(
            user=intent.user,
            type=Notification.Type.PREMIUM_ACTIVATED,
            title="Premium activated",
            body=f"{plan.name} is active on your PesaRoute account.",
        )
        return

    if intent.purpose == PaymentIntent.Purpose.ONE_OFF_PACK:
        purchase, _created = OneOffPurchase.objects.get_or_create(
            user=intent.user,
            pack_code=intent.pack_code,
            status=OneOffPurchase.Status.COMPLETED,
            defaults={
                "source": OneOffPurchase.Source.FUTURE_MPESA,
                "amount_kes": int(intent.amount),
                "paid_at": timezone.now(),
            },
        )
        Invoice.objects.get_or_create(
            user=intent.user,
            one_off_purchase=purchase,
            status=Invoice.Status.PAID,
            provider_reference=intent.provider_receipt or intent.provider_checkout_request_id,
            defaults={
                "amount_kes": int(intent.amount),
                "source": "mpesa",
                "notes": "M-Pesa guide-pack payment confirmed by callback.",
            },
        )
        record_payment_event(intent, "pack_granted", {"purchase_id": purchase.id, "pack_code": purchase.pack_code})
        create_notification(
            user=intent.user,
            type=Notification.Type.PACK_UNLOCKED,
            title="Guide pack unlocked",
            body="Your paid learning pack is now unlocked.",
        )
        return

    if intent.purpose == PaymentIntent.Purpose.PROFESSIONAL_CONSULTATION and intent.consultation_request_id:
        consultation = intent.consultation_request
        if consultation and consultation.status != ConsultationRequest.Status.PAID:
            consultation.status = ConsultationRequest.Status.PAID
            consultation.paid_at = timezone.now()
            accepted_offer = consultation.offers.filter(status=ConsultationOffer.Status.ACCEPTED).first()
            if accepted_offer:
                consultation.professional = accepted_offer.professional
                consultation.selected_professional = accepted_offer.professional
                consultation.platform_fee_amount = accepted_offer.platform_fee_amount
            consultation.save(
                update_fields=[
                    "status",
                    "paid_at",
                    "professional",
                    "selected_professional",
                    "platform_fee_amount",
                    "updated_at",
                ]
            )
            create_notification(
                user=consultation.user,
                type=Notification.Type.CONSULTATION_PAID,
                title="Professional review paid",
                body=(
                    "Your professional review payment is confirmed. "
                    "The professional can now see only the granted context."
                ),
            )
            professional_user = getattr(getattr(consultation, "professional", None), "user", None)
            create_notification(
                user=professional_user,
                type=Notification.Type.CONSULTATION_PAID,
                title="Consultation paid",
                body="A user has paid for a professional review. Check your PesaRoute leads inbox.",
            )
        record_payment_event(
            intent,
            "consultation_marked_paid",
            {"consultation_request_id": intent.consultation_request_id},
        )
        return

    record_payment_event(
        intent,
        "consultation_payment_confirmed",
        {"consultation_request_id": intent.consultation_request_id},
    )


def expire_stale_intent(intent: PaymentIntent) -> PaymentIntent:
    if intent.is_expired:
        intent.status = PaymentIntent.Status.EXPIRED
        intent.save(update_fields=["status", "updated_at"])
        record_payment_event(intent, "intent_expired", {"reason": "status_read_after_expiry"})
    return intent
