from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers
from rest_framework.authtoken.models import Token

from accounts.models import UserProfile
from beta.services import beta_only_mode_enabled, consume_beta_invite


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = [
            "role",
            "preferred_language",
            "user_type",
            "approximate_investment_range",
            "privacy_mode_enabled",
        ]
        read_only_fields = ["role"]


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = get_user_model()
        fields = ["id", "username", "email", "first_name", "last_name", "profile"]


class AuthResponseSerializer(serializers.Serializer):
    token = serializers.CharField()
    user = UserSerializer()


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    role = serializers.ChoiceField(
        choices=[
            UserProfile.Role.CONSUMER,
            UserProfile.Role.PROFESSIONAL,
            UserProfile.Role.PROVIDER,
        ],
        default=UserProfile.Role.CONSUMER,
    )
    preferred_language = serializers.ChoiceField(
        choices=UserProfile.PreferredLanguage.choices,
        default=UserProfile.PreferredLanguage.ENGLISH,
    )
    user_type = serializers.ChoiceField(choices=UserProfile.UserType.choices, default=UserProfile.UserType.OTHER)
    approximate_investment_range = serializers.CharField(required=False, allow_blank=True, max_length=80)
    privacy_mode_enabled = serializers.BooleanField(default=True)
    invite_code = serializers.CharField(required=False, allow_blank=True, max_length=80, write_only=True)

    def validate_username(self, value):
        if get_user_model().objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        if beta_only_mode_enabled() and not attrs.get("invite_code"):
            raise serializers.ValidationError({"invite_code": "Invite code is required for private beta."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        invite_code = validated_data.pop("invite_code", "")
        profile_data = {
            "role": validated_data.pop("role"),
            "preferred_language": validated_data.pop("preferred_language"),
            "user_type": validated_data.pop("user_type"),
            "approximate_investment_range": validated_data.pop("approximate_investment_range", ""),
            "privacy_mode_enabled": validated_data.pop("privacy_mode_enabled"),
        }
        user = get_user_model().objects.create_user(**validated_data)
        if invite_code:
            consume_beta_invite(invite_code, email=user.email)
        profile, _created = UserProfile.objects.update_or_create(user=user, defaults=profile_data)
        user.profile = profile
        Token.objects.get_or_create(user=user)
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        user = authenticate(
            request=self.context.get("request"),
            username=attrs.get("username"),
            password=attrs.get("password"),
        )
        if not user:
            raise serializers.ValidationError("Unable to log in with the provided credentials.")
        if not user.is_active:
            raise serializers.ValidationError("This account is inactive.")
        attrs["user"] = user
        return attrs
