from decimal import Decimal

from rest_framework import serializers

from marketplace.models import ConsultationRequest, ConsultationResponse, Professional


class ProfessionalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Professional
        fields = [
            "id",
            "name",
            "display_name",
            "firm",
            "specialty",
            "license_category",
            "license_number",
            "verification_status",
            "languages",
            "consultation_fee_range",
            "diaspora_support",
            "chama_support",
            "bio",
            "disclosures",
            "is_active",
        ]
        read_only_fields = fields


class ConsultationResponseSerializer(serializers.ModelSerializer):
    professional_name = serializers.CharField(source="professional.name", read_only=True)

    class Meta:
        model = ConsultationResponse
        fields = [
            "id",
            "professional",
            "professional_name",
            "response_text",
            "next_steps",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "professional", "professional_name", "status", "created_at", "updated_at"]


class ConsultationRequestSerializer(serializers.ModelSerializer):
    professional = serializers.PrimaryKeyRelatedField(
        queryset=Professional.objects.all(), required=False, allow_null=True, write_only=True
    )
    selected_professional_detail = ProfessionalSerializer(source="selected_professional", read_only=True)
    responses = ConsultationResponseSerializer(many=True, read_only=True)

    class Meta:
        model = ConsultationRequest
        fields = [
            "id",
            "professional",
            "selected_professional",
            "selected_professional_detail",
            "data_grant",
            "category",
            "amount_display_mode",
            "amount_range_min",
            "amount_range_max",
            "user_question",
            "timeline",
            "risk_preference",
            "preferred_language",
            "topic",
            "notes",
            "status",
            "created_at",
            "responses",
        ]
        read_only_fields = ["id", "status", "created_at", "responses", "selected_professional_detail"]
        extra_kwargs = {
            "topic": {"required": False, "allow_blank": True},
            "notes": {"required": False, "allow_blank": True},
            "user_question": {"required": False, "allow_blank": True},
            "data_grant": {"required": False, "allow_null": True},
            "selected_professional": {"required": False, "allow_null": True},
        }

    def validate(self, attrs):
        selected_professional = attrs.get("selected_professional") or attrs.get("professional")
        if selected_professional:
            is_verified = selected_professional.verification_status == Professional.VerificationStatus.VERIFIED
            legacy_verified = selected_professional.status == Professional.Status.VERIFIED
            if not selected_professional.is_active or not (is_verified or legacy_verified):
                raise serializers.ValidationError({"selected_professional": "Choose an active verified professional."})

        grant = attrs.get("data_grant")
        request = self.context.get("request")
        if grant and request and grant.user_id != request.user.id:
            raise serializers.ValidationError({"data_grant": "Grant must belong to the requesting user."})
        if grant and selected_professional and grant.grantee_id != selected_professional.id:
            raise serializers.ValidationError({"data_grant": "Grant must target the selected professional."})

        mode = attrs.get("amount_display_mode", ConsultationRequest.AmountDisplayMode.RANGE)
        range_min = attrs.get("amount_range_min")
        range_max = attrs.get("amount_range_max")
        for field_name, value in {"amount_range_min": range_min, "amount_range_max": range_max}.items():
            if value is not None and value < Decimal("0.00"):
                raise serializers.ValidationError({field_name: "Amount cannot be negative."})
        if mode == ConsultationRequest.AmountDisplayMode.RANGE:
            if range_min is None or range_max is None:
                raise serializers.ValidationError("Range mode requires amount_range_min and amount_range_max.")
            if range_min > range_max:
                raise serializers.ValidationError("amount_range_min cannot exceed amount_range_max.")
        elif mode == ConsultationRequest.AmountDisplayMode.HIDDEN:
            attrs["amount_range_min"] = None
            attrs["amount_range_max"] = None

        return attrs

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if data.get("amount_display_mode") == ConsultationRequest.AmountDisplayMode.HIDDEN:
            data["amount_range_min"] = None
            data["amount_range_max"] = None
        return data

    def create(self, validated_data):
        legacy_professional = validated_data.pop("professional", None)
        selected_professional = validated_data.get("selected_professional") or legacy_professional
        if selected_professional:
            validated_data["selected_professional"] = selected_professional
            validated_data["professional"] = selected_professional
        if not validated_data.get("topic"):
            category = validated_data.get("category", ConsultationRequest.Category.GENERAL_FIRST_INVESTMENT)
            validated_data["topic"] = ConsultationRequest.Category(category).label
        if not validated_data.get("notes"):
            validated_data["notes"] = validated_data.get("user_question", "")
        if not validated_data.get("user_question"):
            validated_data["user_question"] = validated_data.get("notes", "")
        return super().create(validated_data)


class ConsultationLeadSerializer(serializers.ModelSerializer):
    selected_professional_name = serializers.CharField(source="selected_professional.name", read_only=True)
    response_count = serializers.SerializerMethodField()
    user_question = serializers.SerializerMethodField()

    class Meta:
        model = ConsultationRequest
        fields = [
            "id",
            "category",
            "amount_display_mode",
            "amount_range_min",
            "amount_range_max",
            "user_question",
            "timeline",
            "risk_preference",
            "preferred_language",
            "status",
            "selected_professional",
            "selected_professional_name",
            "created_at",
            "response_count",
        ]
        read_only_fields = fields

    def get_response_count(self, obj):
        return obj.responses.count()

    def get_user_question(self, obj):
        request = self.context.get("request")
        professional = getattr(getattr(request, "user", None), "professional_profile", None)
        if professional and obj.selected_professional_id == professional.id:
            return obj.user_question
        return ""

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if data.get("amount_display_mode") == ConsultationRequest.AmountDisplayMode.HIDDEN:
            data["amount_range_min"] = None
            data["amount_range_max"] = None
        return data


class ConsultationResponseCreateSerializer(serializers.Serializer):
    response_text = serializers.CharField()
    next_steps = serializers.CharField(required=False, allow_blank=True)

    def validate_response_text(self, value):
        if len(value.strip()) < 5:
            raise serializers.ValidationError("Response is too short.")
        return value.strip()
