from __future__ import annotations

from django.conf import settings
from django.db import transaction
from rest_framework import serializers

from beta.models import BetaInvite, FeatureFlag

DEFAULT_FEATURE_FLAGS = {
    FeatureFlag.Key.PAYMENTS_ENABLED: True,
    FeatureFlag.Key.PROFESSIONAL_MARKETPLACE_ENABLED: True,
    FeatureFlag.Key.PACKS_ENABLED: True,
    FeatureFlag.Key.SUBSCRIPTIONS_ENABLED: True,
    FeatureFlag.Key.BETA_ONLY_MODE: False,
}


def feature_flag_enabled(key: str) -> bool:
    default = DEFAULT_FEATURE_FLAGS.get(key, False)
    if key == FeatureFlag.Key.BETA_ONLY_MODE:
        default = getattr(settings, "BETA_ONLY_MODE", False)
    flag = FeatureFlag.objects.filter(key=key).first()
    return flag.enabled if flag else default


def current_feature_flags() -> dict[str, bool]:
    return {key: feature_flag_enabled(key) for key in FeatureFlag.Key.values}


def beta_only_mode_enabled() -> bool:
    return feature_flag_enabled(FeatureFlag.Key.BETA_ONLY_MODE)


def get_valid_beta_invite(code: str, *, email: str = "") -> BetaInvite:
    invite = BetaInvite.objects.filter(code=code.strip()).first()
    if not invite or not invite.is_valid:
        raise serializers.ValidationError({"invite_code": "Invite code is invalid or expired."})
    if invite.email and email and invite.email.lower() != email.lower():
        raise serializers.ValidationError({"invite_code": "Invite code is not assigned to this email."})
    return invite


@transaction.atomic
def consume_beta_invite(code: str, *, email: str = "") -> BetaInvite:
    invite = BetaInvite.objects.select_for_update().filter(code=code.strip()).first()
    if not invite or not invite.is_valid:
        raise serializers.ValidationError({"invite_code": "Invite code is invalid or expired."})
    if invite.email and email and invite.email.lower() != email.lower():
        raise serializers.ValidationError({"invite_code": "Invite code is not assigned to this email."})
    invite.used_count += 1
    invite.save(update_fields=["used_count", "updated_at"])
    return invite
