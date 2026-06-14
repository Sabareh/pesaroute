from datetime import timedelta
from typing import Any

from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from django.utils import timezone

from billing.models import Entitlement, EntitlementCode, Invoice, OneOffPackCode, OneOffPurchase, Plan, Subscription

FREE_ENTITLEMENTS = {
    EntitlementCode.CORE_LEARNING,
    EntitlementCode.LIMITED_SIMULATIONS,
    EntitlementCode.LIMITED_SCAM_CHECKS,
}

PREMIUM_ENTITLEMENTS = {
    EntitlementCode.UNLIMITED_SIMULATIONS,
    EntitlementCode.UNLIMITED_SCAM_CHECKS,
    EntitlementCode.PORTFOLIO_MIRROR,
    EntitlementCode.ADVANCED_ROUTE_ENGINE,
    EntitlementCode.PROFESSIONAL_REQUEST_PRIORITY,
}

PROFESSIONAL_BASIC_ENTITLEMENTS = {
    EntitlementCode.PROFESSIONAL_DASHBOARD,
    EntitlementCode.PROFESSIONAL_LEADS,
}

PROFESSIONAL_PRO_ENTITLEMENTS = {
    EntitlementCode.PROFESSIONAL_DASHBOARD,
    EntitlementCode.PROFESSIONAL_LEADS,
    EntitlementCode.PROFESSIONAL_ANALYTICS,
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
        purchase.pack_code
        for purchase in OneOffPurchase.objects.filter(user=user, status=OneOffPurchase.Status.COMPLETED)
        if purchase.is_active
    }


def get_entitlement_codes(user) -> set[str]:
    entitlements = set(FREE_ENTITLEMENTS)
    entitlements.update(active_subscription_entitlements(user))
    entitlements.update(active_direct_entitlements(user))
    entitlements.update(active_pack_entitlements(user))
    return entitlements


def has_entitlement(user, code: str) -> bool:
    return code in get_entitlement_codes(user)


def entitlement_snapshot(user) -> dict[str, Any]:
    codes = sorted(get_entitlement_codes(user))
    return {
        "is_authenticated": is_authenticated_user(user),
        "entitlements": codes,
        "features": {
            "unlimited_simulations": EntitlementCode.UNLIMITED_SIMULATIONS in codes,
            "unlimited_scam_checks": EntitlementCode.UNLIMITED_SCAM_CHECKS in codes,
            "portfolio_mirror": EntitlementCode.PORTFOLIO_MIRROR in codes,
            "advanced_route_engine": EntitlementCode.ADVANCED_ROUTE_ENGINE in codes,
            "professional_request_priority": EntitlementCode.PROFESSIONAL_REQUEST_PRIORITY in codes,
            "professional_dashboard": EntitlementCode.PROFESSIONAL_DASHBOARD in codes,
        },
        "packs": {pack_code: pack_code in codes for pack_code in OneOffPackCode.values},
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
