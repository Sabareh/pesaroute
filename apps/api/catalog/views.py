from rest_framework import generics

from catalog.models import ProductCategory, ProductPassport
from catalog.serializers import ProductCategorySerializer, ProductPassportSerializer


class ProductCategoryListView(generics.ListAPIView):
    serializer_class = ProductCategorySerializer

    def get_queryset(self):
        return ProductCategory.objects.filter(status=ProductCategory.Status.ACTIVE).order_by("name")


class ProductPassportListView(generics.ListAPIView):
    serializer_class = ProductPassportSerializer

    def get_queryset(self):
        queryset = (
            ProductPassport.objects.select_related("category", "provider")
            .filter(status=ProductPassport.Status.PUBLISHED)
            .order_by("category__name", "name")
        )
        category = self.request.query_params.get("category")
        if category:
            queryset = queryset.filter(category__slug=category)
        return queryset


class ProductPassportDetailView(generics.RetrieveAPIView):
    serializer_class = ProductPassportSerializer
    queryset = ProductPassport.objects.select_related("category", "provider").filter(
        status=ProductPassport.Status.PUBLISHED
    )
