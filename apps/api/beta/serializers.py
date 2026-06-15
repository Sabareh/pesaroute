from rest_framework import serializers

from beta.models import BetaFeedback, BetaInvite, FeatureFlag


class FeatureFlagSerializer(serializers.Serializer):
    payments_enabled = serializers.BooleanField()
    professional_marketplace_enabled = serializers.BooleanField()
    packs_enabled = serializers.BooleanField()
    subscriptions_enabled = serializers.BooleanField()
    beta_only_mode = serializers.BooleanField()


class BetaInviteSerializer(serializers.ModelSerializer):
    class Meta:
        model = BetaInvite
        fields = [
            "id",
            "code",
            "email",
            "phone",
            "max_uses",
            "used_count",
            "expires_at",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "used_count", "created_at", "updated_at"]


class BetaInviteValidateSerializer(serializers.Serializer):
    invite_code = serializers.CharField(max_length=80)
    email = serializers.EmailField(required=False, allow_blank=True)


class BetaFeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = BetaFeedback
        fields = ["id", "category", "message", "screenshot_placeholder", "status", "created_at"]
        read_only_fields = ["id", "status", "created_at"]

    def validate_message(self, value):
        if len(value.strip()) < 5:
            raise serializers.ValidationError("Feedback message is too short.")
        return value.strip()


class FeatureFlagModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeatureFlag
        fields = ["id", "key", "enabled", "description", "updated_at"]
