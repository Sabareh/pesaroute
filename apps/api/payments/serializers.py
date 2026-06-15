from rest_framework import serializers

from billing.models import OneOffPackCode, Plan
from marketplace.models import ConsultationOffer, ConsultationRequest
from payments.models import PaymentIntent


class PaymentIntentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentIntent
        fields = [
            "id",
            "purpose",
            "plan_code",
            "pack_code",
            "consultation_request",
            "amount",
            "currency",
            "phone_number_masked",
            "provider",
            "status",
            "provider_checkout_request_id",
            "provider_merchant_request_id",
            "provider_receipt",
            "idempotency_key",
            "created_at",
            "updated_at",
            "expires_at",
        ]
        read_only_fields = [
            "id",
            "amount",
            "currency",
            "phone_number_masked",
            "provider",
            "status",
            "provider_checkout_request_id",
            "provider_merchant_request_id",
            "provider_receipt",
            "created_at",
            "updated_at",
            "expires_at",
        ]


class PaymentIntentCreateSerializer(serializers.Serializer):
    purpose = serializers.ChoiceField(choices=PaymentIntent.Purpose.choices)
    plan_code = serializers.ChoiceField(
        choices=[
            Plan.Code.PREMIUM_MONTHLY,
            Plan.Code.PREMIUM_YEARLY,
            Plan.Code.PROFESSIONAL_BASIC,
            Plan.Code.PROFESSIONAL_PRO,
        ],
        required=False,
        allow_blank=True,
    )
    pack_code = serializers.ChoiceField(choices=OneOffPackCode.choices, required=False, allow_blank=True)
    consultation_request = serializers.PrimaryKeyRelatedField(
        queryset=ConsultationRequest.objects.all(),
        required=False,
        allow_null=True,
    )
    phone_number = serializers.CharField(required=False, allow_blank=True, write_only=True)
    idempotency_key = serializers.CharField(max_length=160, required=False, allow_blank=True)

    def validate(self, attrs):
        purpose = attrs["purpose"]
        user = self.context["request"].user
        consultation_request = attrs.get("consultation_request")

        if purpose == PaymentIntent.Purpose.SUBSCRIPTION and not attrs.get("plan_code"):
            raise serializers.ValidationError({"plan_code": "Required for subscription payments."})
        if purpose == PaymentIntent.Purpose.ONE_OFF_PACK and not attrs.get("pack_code"):
            raise serializers.ValidationError({"pack_code": "Required for guide-pack payments."})
        if purpose == PaymentIntent.Purpose.PROFESSIONAL_CONSULTATION:
            if not consultation_request:
                raise serializers.ValidationError({"consultation_request": "Required for consultation payments."})
            if consultation_request.user_id != user.id:
                raise serializers.ValidationError({"consultation_request": "Choose your own consultation request."})
            if not consultation_request.offers.filter(status=ConsultationOffer.Status.ACCEPTED).exists():
                raise serializers.ValidationError(
                    {"consultation_request": "Accept a professional offer before paying."}
                )
        return attrs


class PaymentInitiateSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=32)


class MpesaCallbackSerializer(serializers.Serializer):
    Body = serializers.DictField(required=False)
