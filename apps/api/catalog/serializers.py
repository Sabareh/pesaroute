from rest_framework import serializers

from catalog.models import ProductCategory, ProductPassport, Provider


class ProductCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductCategory
        fields = ["id", "name", "slug", "description", "status"]


class ProviderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Provider
        fields = ["id", "name", "regulator_category", "website", "status"]


class ProductPassportSerializer(serializers.ModelSerializer):
    category = ProductCategorySerializer(read_only=True)
    provider = ProviderSerializer(read_only=True)

    class Meta:
        model = ProductPassport
        fields = [
            "id",
            "name",
            "slug",
            "category",
            "provider",
            "regulator_category",
            "minimum_amount",
            "liquidity_level",
            "risk_level",
            "withdrawal_timeline",
            "fees_summary",
            "tax_notes",
            "beginner_mistakes",
            "documents_needed",
            "execution_route_external",
            "disclosures",
            "is_sponsored",
            "status",
            "created_at",
            "updated_at",
        ]
