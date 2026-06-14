from decimal import Decimal

from rest_framework import serializers

from portfolio.models import PortfolioItem


class PortfolioItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortfolioItem
        fields = [
            "id",
            "asset_type",
            "provider_name",
            "amount_display_mode",
            "amount_exact",
            "amount_range_min",
            "amount_range_max",
            "liquidity_level",
            "risk_level",
            "maturity_date",
            "visibility",
            "created_at",
            "updated_at",
            "version",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "version"]

    def validate(self, attrs):
        mode = attrs.get(
            "amount_display_mode", getattr(self.instance, "amount_display_mode", PortfolioItem.AmountDisplayMode.HIDDEN)
        )
        exact = attrs.get("amount_exact", getattr(self.instance, "amount_exact", None))
        range_min = attrs.get("amount_range_min", getattr(self.instance, "amount_range_min", None))
        range_max = attrs.get("amount_range_max", getattr(self.instance, "amount_range_max", None))
        for field_name, value in {
            "amount_exact": exact,
            "amount_range_min": range_min,
            "amount_range_max": range_max,
        }.items():
            if value is not None and value < Decimal("0.00"):
                raise serializers.ValidationError({field_name: "Amount cannot be negative."})

        if mode == PortfolioItem.AmountDisplayMode.EXACT and exact is None:
            raise serializers.ValidationError({"amount_exact": "Exact mode requires amount_exact."})
        if mode == PortfolioItem.AmountDisplayMode.RANGE:
            if range_min is None or range_max is None:
                raise serializers.ValidationError("Range mode requires amount_range_min and amount_range_max.")
            if range_min > range_max:
                raise serializers.ValidationError("amount_range_min cannot exceed amount_range_max.")
            attrs["amount_exact"] = None
        elif mode == PortfolioItem.AmountDisplayMode.HIDDEN:
            attrs["amount_exact"] = None
            attrs["amount_range_min"] = None
            attrs["amount_range_max"] = None
        elif mode != PortfolioItem.AmountDisplayMode.EXACT:
            attrs["amount_exact"] = None
            attrs["amount_range_min"] = None
            attrs["amount_range_max"] = None
        else:
            attrs["amount_range_min"] = None
            attrs["amount_range_max"] = None
        return attrs

    def to_representation(self, instance):
        data = super().to_representation(instance)
        mode = data.get("amount_display_mode")
        if mode in {PortfolioItem.AmountDisplayMode.HIDDEN, PortfolioItem.AmountDisplayMode.RANGE}:
            data["amount_exact"] = None
        if mode == PortfolioItem.AmountDisplayMode.HIDDEN:
            data["amount_range_min"] = None
            data["amount_range_max"] = None
        return data
