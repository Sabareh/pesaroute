from datetime import timedelta
from typing import Any

from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from django.core.exceptions import PermissionDenied
from django.utils import timezone

from billing.models import Entitlement, EntitlementCode, Invoice, OneOffPackCode, OneOffPurchase, Plan, Subscription

FREE_ENTITLEMENTS = {
    EntitlementCode.CORE_LEARNING,
    EntitlementCode.LIMITED_SIMULATIONS,
    EntitlementCode.LIMITED_SCAM_CHECKS,
}

PREMIUM_ENTITLEMENTS = {
    EntitlementCode.PREMIUM_LEARNING,
    EntitlementCode.UNLIMITED_SIMULATIONS,
    EntitlementCode.UNLIMITED_SCAM_CHECKS,
    EntitlementCode.PORTFOLIO_MIRROR,
    EntitlementCode.ADVANCED_ROUTE_ENGINE,
    EntitlementCode.PRIVATE_JOURNAL_UNLIMITED,
    EntitlementCode.PROFESSIONAL_REVIEW_PRIORITY,
}

PROFESSIONAL_BASIC_ENTITLEMENTS = {
    EntitlementCode.PROFESSIONAL_PROFILE_PUBLIC,
    EntitlementCode.PROFESSIONAL_LEAD_INBOX,
}

PROFESSIONAL_PRO_ENTITLEMENTS = {
    EntitlementCode.PROFESSIONAL_PROFILE_PUBLIC,
    EntitlementCode.PROFESSIONAL_LEAD_INBOX,
    EntitlementCode.PROFESSIONAL_CLIENT_NOTES,
}

PROFESSIONAL_PLAN_FEATURES = {
    Plan.Code.PROFESSIONAL_BASIC: PROFESSIONAL_BASIC_ENTITLEMENTS,
    Plan.Code.PROFESSIONAL_PRO: PROFESSIONAL_PRO_ENTITLEMENTS,
}

DEFAULT_PLANS: list[dict[str, Any]] = [
    {
        "code": Plan.Code.FREE,
        "name": "Free",
        "audience": Plan.Audience.CONSUMER,
        "price_kes": 0,
        "billing_period": Plan.BillingPeriod.NONE,
        "included_entitlements": sorted(FREE_ENTITLEMENTS),
    },
    {
        "code": Plan.Code.PREMIUM_MONTHLY,
        "name": "Premium monthly",
        "audience": Plan.Audience.CONSUMER,
        "price_kes": 300,
        "billing_period": Plan.BillingPeriod.MONTHLY,
        "included_entitlements": sorted(PREMIUM_ENTITLEMENTS),
    },
    {
        "code": Plan.Code.PREMIUM_YEARLY,
        "name": "Premium yearly",
        "audience": Plan.Audience.CONSUMER,
        "price_kes": 3000,
        "billing_period": Plan.BillingPeriod.YEARLY,
        "included_entitlements": sorted(PREMIUM_ENTITLEMENTS),
    },
    {
        "code": Plan.Code.PROFESSIONAL_BASIC,
        "name": "Professional basic",
        "audience": Plan.Audience.PROFESSIONAL,
        "price_kes": 1000,
        "billing_period": Plan.BillingPeriod.MONTHLY,
        "included_entitlements": sorted(PROFESSIONAL_BASIC_ENTITLEMENTS),
    },
    {
        "code": Plan.Code.PROFESSIONAL_PRO,
        "name": "Professional pro",
        "audience": Plan.Audience.PROFESSIONAL,
        "price_kes": 2500,
        "billing_period": Plan.BillingPeriod.MONTHLY,
        "included_entitlements": sorted(PROFESSIONAL_PRO_ENTITLEMENTS),
    },
]

ONE_OFF_PACK_PRICES = {
    OneOffPackCode.GLOBAL_INVESTING: 500,
    OneOffPackCode.TREASURY_BILLS: 300,
    OneOffPackCode.SACCO_CHAMA: 300,
    OneOffPackCode.LAND_DUE_DILIGENCE_LITERACY: 500,
    OneOffPackCode.DIASPORA: 500,
}

PACK_ENTITLEMENT_BY_CODE = {
    OneOffPackCode.GLOBAL_INVESTING: EntitlementCode.GLOBAL_INVESTING_PACK_ACCESS,
    OneOffPackCode.TREASURY_BILLS: EntitlementCode.TREASURY_BILLS_PACK_ACCESS,
    OneOffPackCode.SACCO_CHAMA: EntitlementCode.SACCO_CHAMA_PACK_ACCESS,
    OneOffPackCode.LAND_DUE_DILIGENCE_LITERACY: EntitlementCode.LAND_PACK_ACCESS,
    OneOffPackCode.DIASPORA: EntitlementCode.DIASPORA_PACK_ACCESS,
}

ENTITLEMENT_KEYS = {
    EntitlementCode.PREMIUM_LEARNING,
    EntitlementCode.UNLIMITED_SIMULATIONS,
    EntitlementCode.UNLIMITED_SCAM_CHECKS,
    EntitlementCode.PORTFOLIO_MIRROR,
    EntitlementCode.ADVANCED_ROUTE_ENGINE,
    EntitlementCode.PRIVATE_JOURNAL_UNLIMITED,
    EntitlementCode.PROFESSIONAL_REVIEW_PRIORITY,
    EntitlementCode.GLOBAL_INVESTING_PACK_ACCESS,
    EntitlementCode.TREASURY_BILLS_PACK_ACCESS,
    EntitlementCode.SACCO_CHAMA_PACK_ACCESS,
    EntitlementCode.LAND_PACK_ACCESS,
    EntitlementCode.DIASPORA_PACK_ACCESS,
    EntitlementCode.PROFESSIONAL_LEAD_INBOX,
    EntitlementCode.PROFESSIONAL_PROFILE_PUBLIC,
    EntitlementCode.PROFESSIONAL_CLIENT_NOTES,
}


def seed_default_plans() -> list[Plan]:
    plans: list[Plan] = []
    for plan_data in DEFAULT_PLANS:
        plan, _created = Plan.objects.update_or_create(
            code=plan_data["code"],
            defaults={
                "name": plan_data["name"],
                "audience": plan_data["audience"],
                "price_kes": plan_data["price_kes"],
                "billing_period": plan_data["billing_period"],
                "included_entitlements": plan_data["included_entitlements"],
                "is_active": True,
            },
        )
        plans.append(plan)
    return plans


def is_authenticated_user(user) -> bool:
    return bool(user and not isinstance(user, AnonymousUser) and user.is_authenticated)


def active_subscription_entitlements(user) -> set[str]:
    if not is_authenticated_user(user):
        return set()
    entitlements: set[str] = set()
    subscriptions = Subscription.objects.select_related("plan").filter(user=user)
    for subscription in subscriptions:
        if subscription.is_active:
            entitlements.update(subscription.plan.included_entitlements)
    return entitlements


def active_direct_entitlements(user) -> set[str]:
    if not is_authenticated_user(user):
        return set()
    return {
        entitlement.code
        for entitlement in Entitlement.objects.filter(user=user, is_active=True)
        if entitlement.is_current
    }


def active_pack_entitlements(user) -> set[str]:
    if not is_authenticated_user(user):
        return set()
    return {
        PACK_ENTITLEMENT_BY_CODE[purchase.pack_code]
        for purchase in OneOffPurchase.objects.filter(user=user, status=OneOffPurchase.Status.COMPLETED)
        if purchase.is_active and purchase.pack_code in PACK_ENTITLEMENT_BY_CODE
    }


def get_entitlement_codes(user) -> set[str]:
    entitlements = set(FREE_ENTITLEMENTS)
    entitlements.update(active_subscription_entitlements(user))
    entitlements.update(active_direct_entitlements(user))
    entitlements.update(active_pack_entitlements(user))
    return entitlements


def user_has_entitlement(user, entitlement_key: str) -> bool:
    return entitlement_key in get_entitlement_codes(user)


def has_entitlement(user, code: str) -> bool:
    # Backward-compatible alias for older callers.
    return user_has_entitlement(user, code)


def require_entitlement(user, entitlement_key: str) -> None:
    if not user_has_entitlement(user, entitlement_key):
        raise PermissionDenied(f"Missing required entitlement: {entitlement_key}")


def professional_has_plan_feature(professional, feature_key: str) -> bool:
    user = getattr(professional, "user", None)
    if user is None and hasattr(professional, "is_authenticated"):
        user = professional
    return user_has_entitlement(user, feature_key)


def pack_access_key(pack_code: str) -> str:
    return PACK_ENTITLEMENT_BY_CODE[pack_code]


def has_pack_access(user, pack_code: str) -> bool:
    return user_has_entitlement(user, pack_access_key(pack_code))


def entitlement_snapshot(user) -> dict[str, Any]:
    codes = sorted(get_entitlement_codes(user))
    return {
        "is_authenticated": is_authenticated_user(user),
        "entitlements": codes,
        "features": {
            "premium_learning": EntitlementCode.PREMIUM_LEARNING in codes,
            "unlimited_simulations": EntitlementCode.UNLIMITED_SIMULATIONS in codes,
            "unlimited_scam_checks": EntitlementCode.UNLIMITED_SCAM_CHECKS in codes,
            "portfolio_mirror": EntitlementCode.PORTFOLIO_MIRROR in codes,
            "advanced_route_engine": EntitlementCode.ADVANCED_ROUTE_ENGINE in codes,
            "private_journal_unlimited": EntitlementCode.PRIVATE_JOURNAL_UNLIMITED in codes,
            "professional_review_priority": EntitlementCode.PROFESSIONAL_REVIEW_PRIORITY in codes,
            "professional_lead_inbox": EntitlementCode.PROFESSIONAL_LEAD_INBOX in codes,
            "professional_profile_public": EntitlementCode.PROFESSIONAL_PROFILE_PUBLIC in codes,
            "professional_client_notes": EntitlementCode.PROFESSIONAL_CLIENT_NOTES in codes,
        },
        "packs": {pack_code: PACK_ENTITLEMENT_BY_CODE[pack_code] in codes for pack_code in OneOffPackCode.values},
        "dev_mode": settings.DEBUG,
        "payment_provider": "manual_placeholder",
    }


def grant_dev_subscription(user, plan_code: str = Plan.Code.PREMIUM_MONTHLY, days: int = 30) -> Subscription:
    seed_default_plans()
    plan = Plan.objects.get(code=plan_code)
    now = timezone.now()
    subscription = Subscription.objects.create(
        user=user,
        plan=plan,
        status=Subscription.Status.MANUAL,
        source=Subscription.Source.DEV_MANUAL,
        current_period_start=now,
        current_period_end=now + timedelta(days=days),
    )
    Invoice.objects.create(
        user=user,
        plan=plan,
        amount_kes=plan.price_kes,
        status=Invoice.Status.PAID,
        source="dev_manual",
        notes="Development placeholder subscription grant. No money was collected.",
    )
    return subscription


def grant_dev_pack(user, pack_code: str) -> OneOffPurchase:
    amount_kes = ONE_OFF_PACK_PRICES.get(pack_code, 0)
    purchase, _created = OneOffPurchase.objects.get_or_create(
        user=user,
        pack_code=pack_code,
        status=OneOffPurchase.Status.COMPLETED,
        defaults={
            "source": OneOffPurchase.Source.DEV_MANUAL,
            "amount_kes": amount_kes,
            "paid_at": timezone.now(),
        },
    )
    Invoice.objects.get_or_create(
        user=user,
        one_off_purchase=purchase,
        status=Invoice.Status.PAID,
        defaults={
            "amount_kes": amount_kes,
            "source": "dev_manual",
            "notes": "Development placeholder guide-pack grant. No money was collected.",
        },
    )
    return purchase


def expire_dev_subscriptions(user, plan_code: str | None = None) -> int:
    queryset = Subscription.objects.filter(user=user)
    if plan_code:
        queryset = queryset.filter(plan__code=plan_code)
    now = timezone.now()
    return queryset.update(status=Subscription.Status.EXPIRED, current_period_end=now - timedelta(seconds=1))
