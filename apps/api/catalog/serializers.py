from rest_framework import serializers

from catalog.models import ProductCategory, ProductPassport, Provider
from knowledge.serializers import SourceReferenceSerializer


class ProductCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductCategory
        fields = ["id", "name", "slug", "description", "status"]


class ProviderSerializer(serializers.ModelSerializer):
    source_references = SourceReferenceSerializer(many=True, read_only=True)

    class Meta:
        model = Provider
        fields = [
            "id",
            "name",
            "slug",
            "regulator_category",
            "regulator_license_number",
            "regulator_status",
            "website",
            "public_source_url",
            "last_verified_at",
            "data_freshness",
            "verification_status",
            "published_status",
            "source_references",
            "status",
        ]


class ProductPassportSerializer(serializers.ModelSerializer):
    category = ProductCategorySerializer(read_only=True)
    provider = ProviderSerializer(read_only=True)
    source_references = SourceReferenceSerializer(many=True, read_only=True)

    class Meta:
        model = ProductPassport
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "category",
            "provider",
            "regulator_category",
            "regulator_license_number",
            "regulator_status",
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
            "public_source_url",
            "last_verified_at",
            "data_freshness",
            "verification_status",
            "published_status",
            "source_references",
            "is_sponsored",
            "status",
            "created_at",
            "updated_at",
        ]
