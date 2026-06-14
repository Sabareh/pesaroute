from rest_framework import serializers

from billing.models import Invoice, OneOffPackCode, OneOffPurchase, Plan, Subscription


class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = [
            "id",
            "code",
            "name",
            "audience",
            "price_kes",
            "billing_period",
            "included_entitlements",
            "is_active",
        ]


class SubscriptionSerializer(serializers.ModelSerializer):
    plan = PlanSerializer(read_only=True)

    class Meta:
        model = Subscription
        fields = [
            "id",
            "plan",
            "status",
            "source",
            "current_period_start",
            "current_period_end",
            "created_at",
            "updated_at",
        ]


class OneOffPurchaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = OneOffPurchase
        fields = [
            "id",
            "pack_code",
            "status",
            "source",
            "amount_kes",
            "paid_at",
            "created_at",
            "updated_at",
        ]


class InvoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = [
            "id",
            "plan",
            "one_off_purchase",
            "amount_kes",
            "status",
            "source",
            "provider_reference",
            "created_at",
            "updated_at",
        ]


class EntitlementSnapshotSerializer(serializers.Serializer):
    is_authenticated = serializers.BooleanField()
    entitlements = serializers.ListField(child=serializers.CharField())
    features = serializers.DictField(child=serializers.BooleanField())
    packs = serializers.DictField(child=serializers.BooleanField())
    dev_mode = serializers.BooleanField()
    payment_provider = serializers.CharField()


class DevMockPurchaseSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(choices=["subscription", "pack"])
    plan_code = serializers.ChoiceField(choices=Plan.Code.choices, required=False)
    pack_code = serializers.ChoiceField(choices=OneOffPackCode.choices, required=False)
    days = serializers.IntegerField(default=30, min_value=1, max_value=366, required=False)

    def validate(self, attrs):
        kind = attrs["kind"]
        if kind == "subscription" and not attrs.get("plan_code"):
            raise serializers.ValidationError({"plan_code": "Required for subscription mock purchase."})
        if kind == "pack" and not attrs.get("pack_code"):
            raise serializers.ValidationError({"pack_code": "Required for pack mock purchase."})
        return attrs
