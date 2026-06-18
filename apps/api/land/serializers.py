from rest_framework import serializers

from land.models import (
    LandDocumentRecord,
    LandDueDiligenceItem,
    LandOpportunity,
    LandRiskFlag,
)


class LandDueDiligenceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = LandDueDiligenceItem
        fields = [
            "id",
            "item_key",
            "title",
            "description",
            "status",
            "importance",
            "professional_type_needed",
            "source_note",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class LandDocumentRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = LandDocumentRecord
        fields = ["id", "document_type", "file", "notes", "visibility", "created_at"]
        read_only_fields = ["id", "created_at"]


class LandRiskFlagSerializer(serializers.ModelSerializer):
    class Meta:
        model = LandRiskFlag
        fields = ["id", "flag_type", "severity", "message", "suggested_action", "created_at"]
        read_only_fields = fields


class LandOpportunitySerializer(serializers.ModelSerializer):
    due_diligence_items = LandDueDiligenceItemSerializer(many=True, read_only=True)
    risk_flags = LandRiskFlagSerializer(many=True, read_only=True)
    documents = LandDocumentRecordSerializer(many=True, read_only=True)

    class Meta:
        model = LandOpportunity
        fields = [
            "id",
            "title",
            "location_text",
            "county",
            "area_or_town",
            "asking_price",
            "deposit_requested",
            "plot_size",
            "seller_type",
            "title_status",
            "intended_use",
            "decision_stage",
            "risk_level",
            "privacy_mode",
            "created_at",
            "updated_at",
            "due_diligence_items",
            "risk_flags",
            "documents",
        ]
        # risk_level is computed by the risk-score engine, never set directly by the client.
        read_only_fields = [
            "id",
            "risk_level",
            "created_at",
            "updated_at",
            "due_diligence_items",
            "risk_flags",
            "documents",
        ]


class LandOpportunityListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list views (no nested children)."""

    class Meta:
        model = LandOpportunity
        fields = [
            "id",
            "title",
            "location_text",
            "county",
            "area_or_town",
            "asking_price",
            "deposit_requested",
            "plot_size",
            "seller_type",
            "title_status",
            "intended_use",
            "decision_stage",
            "risk_level",
            "privacy_mode",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "risk_level", "created_at", "updated_at"]


class RiskScoreInputSerializer(serializers.Serializer):
    deposit_before_search = serializers.BooleanField(required=False, default=False)
    pressure_to_pay_quickly = serializers.BooleanField(required=False, default=False)
    seller_mismatch = serializers.BooleanField(required=False, default=False)
    unrealistic_appreciation_claim = serializers.BooleanField(required=False, default=False)
    diaspora_relying_on_proxy = serializers.BooleanField(required=False, default=False)
    chama_lacks_minutes = serializers.BooleanField(required=False, default=False)


class SaveToJournalSerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True, default="")


class RequestReviewSerializer(serializers.Serializer):
    professional_type = serializers.ChoiceField(
        choices=["land_lawyer", "surveyor", "valuer", "diaspora_land_adviser", "chama_land_adviser"],
        default="land_lawyer",
    )
    professional_id = serializers.IntegerField(required=False, allow_null=True)
    # Sharing is OFF by default: documents stay private, exact amount stays hidden.
    share_document_ids = serializers.ListField(child=serializers.IntegerField(), required=False, default=list)
    share_amount = serializers.BooleanField(required=False, default=False)
    question = serializers.CharField(required=False, allow_blank=True, default="")
    access_days = serializers.IntegerField(required=False, default=14, min_value=1, max_value=90)


class LandComparisonInputSerializer(serializers.Serializer):
    land_price = serializers.DecimalField(max_digits=16, decimal_places=2)
    deposit = serializers.DecimalField(max_digits=16, decimal_places=2, required=False, allow_null=True)
    holding_period_years = serializers.IntegerField(min_value=1, max_value=50, default=5)
    appreciation_scenario = serializers.ChoiceField(
        choices=["conservative", "neutral", "optimistic", "custom"], default="neutral"
    )
    custom_rate = serializers.DecimalField(max_digits=6, decimal_places=2, required=False, allow_null=True)
    transaction_cost_estimate = serializers.DecimalField(
        max_digits=16, decimal_places=2, required=False, allow_null=True
    )
    liquidity_need = serializers.CharField(required=False, allow_blank=True, default="")
