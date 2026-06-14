from rest_framework import serializers

from journal.models import JournalEntry


class JournalEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = JournalEntry
        fields = [
            "id",
            "goal",
            "decision",
            "amount_display_mode",
            "amount_exact",
            "amount_range_min",
            "amount_range_max",
            "reason",
            "alternatives_considered",
            "risks_considered",
            "review_date",
            "visibility",
            "created_at",
            "updated_at",
            "version",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "version"]

    def validate(self, attrs):
        mode = attrs.get(
            "amount_display_mode", getattr(self.instance, "amount_display_mode", JournalEntry.AmountDisplayMode.HIDDEN)
        )
        exact = attrs.get("amount_exact", getattr(self.instance, "amount_exact", None))
        range_min = attrs.get("amount_range_min", getattr(self.instance, "amount_range_min", None))
        range_max = attrs.get("amount_range_max", getattr(self.instance, "amount_range_max", None))
        if mode == JournalEntry.AmountDisplayMode.EXACT and exact is None:
            raise serializers.ValidationError({"amount_exact": "Exact mode requires amount_exact."})
        if mode == JournalEntry.AmountDisplayMode.RANGE:
            if range_min is None or range_max is None:
                raise serializers.ValidationError("Range mode requires amount_range_min and amount_range_max.")
            if range_min > range_max:
                raise serializers.ValidationError("amount_range_min cannot exceed amount_range_max.")
        return attrs
