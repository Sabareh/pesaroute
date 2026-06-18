from django.contrib import admin

from catalog.models import ProductCategory, ProductPassport, ProductPassportVersion, Provider


@admin.register(ProductCategory)
class ProductCategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "status", "updated_at"]
    list_filter = ["status"]
    search_fields = ["name", "slug", "description"]


@admin.register(Provider)
class ProviderAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "regulator_category",
        "regulator_status",
        "data_freshness",
        "verification_status",
        "published_status",
        "updated_at",
    ]
    list_filter = ["status", "published_status", "verification_status", "data_freshness", "regulator_category"]
    search_fields = ["name", "slug", "regulator_category", "regulator_license_number", "website"]
    filter_horizontal = ["source_references"]


@admin.register(ProductPassport)
class ProductPassportAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "category",
        "provider",
        "risk_level",
        "liquidity_level",
        "freshness_status",
        "next_review_due_at",
        "data_freshness",
        "verification_status",
        "is_sponsored",
        "status",
    ]
    list_filter = [
        "category",
        "risk_level",
        "liquidity_level",
        "freshness_status",
        "data_freshness",
        "verification_status",
        "published_status",
        "is_sponsored",
        "status",
    ]
    search_fields = ["name", "provider__name", "description", "execution_route_external", "regulator_license_number"]
    filter_horizontal = ["source_references"]


@admin.register(ProductPassportVersion)
class ProductPassportVersionAdmin(admin.ModelAdmin):
    list_display = ["passport", "version_number", "status", "created_by", "created_at"]
    list_filter = ["status"]
    search_fields = ["passport__name", "created_by__username"]
