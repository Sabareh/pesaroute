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
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        mode = attrs.get(
            "amount_display_mode", getattr(self.instance, "amount_display_mode", PortfolioItem.AmountDisplayMode.HIDDEN)
        )
        exact = attrs.get("amount_exact")
        range_min = attrs.get("amount_range_min")
        range_max = attrs.get("amount_range_max")
        if mode == PortfolioItem.AmountDisplayMode.EXACT and exact is None:
            raise serializers.ValidationError({"amount_exact": "Exact mode requires amount_exact."})
        if mode == PortfolioItem.AmountDisplayMode.RANGE:
            if range_min is None or range_max is None:
                raise serializers.ValidationError("Range mode requires amount_range_min and amount_range_max.")
            if range_min > range_max:
                raise serializers.ValidationError("amount_range_min cannot exceed amount_range_max.")
        return attrs
