from decimal import Decimal

from rest_framework import serializers


class MMFSimulationSerializer(serializers.Serializer):
    principal = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("1.00"))
    annual_rate_percent = serializers.DecimalField(max_digits=6, decimal_places=2, min_value=Decimal("0.00"))
    months = serializers.IntegerField(min_value=1, max_value=600)


class TBillSimulationSerializer(serializers.Serializer):
    face_value = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("1.00"))
    discount_rate_percent = serializers.DecimalField(max_digits=6, decimal_places=2, min_value=Decimal("0.00"))
    days = serializers.IntegerField(min_value=1, max_value=364, default=91)


class SaccoSimulationSerializer(serializers.Serializer):
    monthly_deposit = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("1.00"))
    months = serializers.IntegerField(min_value=1, max_value=600)
    annual_dividend_percent = serializers.DecimalField(max_digits=6, decimal_places=2, min_value=Decimal("0.00"))


class GlobalRouteSimulationSerializer(serializers.Serializer):
    amount_kes = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("1.00"))
    fx_rate = serializers.DecimalField(max_digits=10, decimal_places=4, min_value=Decimal("1.0000"))
    transfer_fee_percent = serializers.DecimalField(
        max_digits=5, decimal_places=2, min_value=Decimal("0.00"), default=Decimal("0.00")
    )
