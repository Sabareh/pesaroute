from django.contrib.auth import get_user_model
from django.utils import timezone

from marketplace.models import Professional
from privacy.models import DataAccessLog, DataGrant


def resolve_data_owner(user_data):
    if isinstance(user_data, get_user_model()):
        return user_data
    return getattr(user_data, "user", None)


def get_active_grant(user_data, professional: Professional, scope: str, *, at=None):
    user = resolve_data_owner(user_data)
    if not user or not professional:
        return None
    timestamp = at or timezone.now()
    grants = DataGrant.objects.filter(
        user=user,
        grantee_type=DataGrant.GranteeType.PROFESSIONAL,
        grantee_id=professional.id,
        status=DataGrant.Status.ACTIVE,
        revoked_at__isnull=True,
        starts_at__lte=timestamp,
        expires_at__gt=timestamp,
    ).order_by("-created_at")
    return next((grant for grant in grants if scope in grant.scopes), None)


def can_professional_access(user_data, professional: Professional, scope: str) -> bool:
    return get_active_grant(user_data, professional, scope) is not None


def log_data_access(
    *,
    user,
    professional: Professional,
    data_grant: DataGrant | None,
    action: str,
    scope: str,
    resource_type: str,
    resource_id: str = "",
):
    return DataAccessLog.objects.create(
        user=user,
        professional=professional,
        grantee_type=DataGrant.GranteeType.PROFESSIONAL,
        grantee_id=professional.id if professional else None,
        data_grant=data_grant,
        action=action,
        scope=scope,
        resource_type=resource_type,
        resource_id=str(resource_id),
    )
