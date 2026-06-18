from decimal import Decimal, InvalidOperation

from django.db.models import Q, TextField
from django.db.models.functions import Cast
from rest_framework import generics

from catalog.models import ProductCategory, ProductPassport
from catalog.serializers import ProductCategorySerializer, ProductPassportSerializer


def parse_bool(value: str) -> bool | None:
    normalized = value.strip().lower()
    if normalized in {"1", "true", "yes"}:
        return True
    if normalized in {"0", "false", "no"}:
        return False
    return None


class PublicCatalogCacheMixin:
    cache_control = "public, max-age=300"

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        response["Cache-Control"] = self.cache_control
        response["Vary"] = "Accept"
        # TODO: Put published catalog responses behind Redis or CDN caching when the public catalog grows.
        return response


class ProductCategoryListView(PublicCatalogCacheMixin, generics.ListAPIView):
    serializer_class = ProductCategorySerializer

    def get_queryset(self):
        return ProductCategory.objects.filter(status=ProductCategory.Status.ACTIVE).order_by("name")


class ProductPassportListView(PublicCatalogCacheMixin, generics.ListAPIView):
    serializer_class = ProductPassportSerializer
    ordering_fields = {"category": "category__name", "risk_level": "risk_level", "updated_at": "updated_at"}

    def get_queryset(self):
        queryset = ProductPassport.objects.select_related("category", "provider").annotate(
            beginner_mistakes_text=Cast("beginner_mistakes", output_field=TextField())
        )
        status = self.request.query_params.get("status")
        if status:
            if status == ProductPassport.Status.PUBLISHED or self.request.user.is_staff:
                queryset = queryset.filter(status=status)
            else:
                queryset = queryset.none()
        else:
            queryset = queryset.filter(status=ProductPassport.Status.PUBLISHED)

        category = self.request.query_params.get("category")
        if category:
            queryset = queryset.filter(Q(category__slug=category) | Q(category__name__iexact=category))

        risk_level = self.request.query_params.get("risk_level")
        if risk_level:
            queryset = queryset.filter(risk_level=risk_level)

        liquidity_level = self.request.query_params.get("liquidity_level")
        if liquidity_level:
            queryset = queryset.filter(liquidity_level=liquidity_level)

        regulator_category = self.request.query_params.get("regulator_category")
        if regulator_category:
            queryset = queryset.filter(regulator_category__iexact=regulator_category)

        # Free-tier education passports are visible to everyone; clients can still
        # filter explicitly (e.g. ?audience=free) to show the free-tier baseline.
        audience = self.request.query_params.get("audience")
        if audience:
            queryset = queryset.filter(audience=audience)

        minimum_amount_lte = self.request.query_params.get("minimum_amount_lte")
        if minimum_amount_lte:
            try:
                queryset = queryset.filter(minimum_amount__lte=Decimal(minimum_amount_lte))
            except InvalidOperation:
                queryset = queryset.none()

        is_sponsored = self.request.query_params.get("is_sponsored")
        if is_sponsored is not None:
            sponsored_value = parse_bool(is_sponsored)
            if sponsored_value is None:
                queryset = queryset.none()
            else:
                queryset = queryset.filter(is_sponsored=sponsored_value)

        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(provider__name__icontains=search)
                | Q(description__icontains=search)
                | Q(beginner_mistakes_text__icontains=search)
                | Q(execution_route_external__icontains=search)
            )

        ordering = self.request.query_params.get("ordering")
        if ordering:
            direction = "-" if ordering.startswith("-") else ""
            field = ordering.removeprefix("-")
            mapped_field = self.ordering_fields.get(field)
            if mapped_field:
                return queryset.order_by(f"{direction}{mapped_field}", "name")

        return queryset.order_by("category__name", "name")


class ProductPassportDetailView(PublicCatalogCacheMixin, generics.RetrieveAPIView):
    serializer_class = ProductPassportSerializer
    queryset = ProductPassport.objects.select_related("category", "provider").filter(
        status=ProductPassport.Status.PUBLISHED
    )
