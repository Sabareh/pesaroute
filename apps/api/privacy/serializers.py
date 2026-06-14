from django.utils import timezone
from rest_framework import serializers

from marketplace.models import Professional
from privacy.models import DataAccessLog, DataGrant


class DataGrantSerializer(serializers.ModelSerializer):
    professional = serializers.PrimaryKeyRelatedField(read_only=True)
    starts_at = serializers.DateTimeField(required=False)

    class Meta:
        model = DataGrant
        fields = [
            "id",
            "grantee_type",
            "grantee_id",
            "professional",
            "scopes",
            "status",
            "starts_at",
            "expires_at",
            "revoked_at",
            "created_at",
        ]
        read_only_fields = ["id", "professional", "status", "revoked_at", "created_at"]

    def validate_scopes(self, value):
        if not isinstance(value, list) or not value:
            raise serializers.ValidationError("Choose at least one sharing scope.")
        allowed = set(DataGrant.Scope.values)
        invalid = [scope for scope in value if scope not in allowed]
        if invalid:
            raise serializers.ValidationError(f"Unsupported scopes: {', '.join(invalid)}.")
        return sorted(set(value))

    def validate(self, attrs):
        starts_at = attrs.get("starts_at") or timezone.now()
        expires_at = attrs.get("expires_at")
        grantee_type = attrs.get("grantee_type", DataGrant.GranteeType.PROFESSIONAL)
        grantee_id = attrs.get("grantee_id")

        if expires_at and expires_at <= starts_at:
            raise serializers.ValidationError("expires_at must be after starts_at.")
        if expires_at and expires_at <= timezone.now():
            raise serializers.ValidationError("expires_at must be in the future.")
        if not grantee_id:
            raise serializers.ValidationError({"grantee_id": "A grantee_id is required."})
        if (
            grantee_type == DataGrant.GranteeType.PROFESSIONAL
            and not Professional.objects.filter(id=grantee_id).exists()
        ):
            raise serializers.ValidationError({"grantee_id": "Professional does not exist."})

        attrs["starts_at"] = starts_at
        return attrs

    def create(self, validated_data):
        if validated_data["grantee_type"] == DataGrant.GranteeType.PROFESSIONAL:
            validated_data["professional"] = Professional.objects.get(id=validated_data["grantee_id"])
        return super().create(validated_data)


class DataAccessLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = DataAccessLog
        fields = [
            "id",
            "grantee_type",
            "grantee_id",
            "professional",
            "data_grant",
            "action",
            "scope",
            "resource_type",
            "resource_id",
            "created_at",
        ]
        read_only_fields = fields
