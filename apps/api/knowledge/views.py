from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from knowledge.models import (
    DataChangeEvent,
    DataIngestionRun,
    DataQualityIssue,
    DataSource,
    GovernmentSecurityReference,
    InvestmentProductCategory,
    InvestmentProvider,
    ListedCompany,
    Regulator,
    SaccoEntity,
    SourceRecord,
)
from knowledge.serializers import (
    DataChangeEventSerializer,
    DataIngestionRunSerializer,
    DataQualityIssueSerializer,
    DataSourceSerializer,
    GovernmentSecurityReferenceSerializer,
    InvestmentProductCategorySerializer,
    InvestmentProviderSerializer,
    ListedCompanySerializer,
    PublicDataSourceSerializer,
    RegulatorSerializer,
    SaccoEntitySerializer,
    SourceRecordSerializer,
)
from knowledge.services import approve_source_record, publish_source_record, reject_source_record


class PublicKnowledgeCacheMixin:
    cache_control = "public, max-age=300"

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        response["Cache-Control"] = self.cache_control
        response["Vary"] = "Accept"
        return response


class DataSourceListCreateView(generics.ListCreateAPIView):
    serializer_class = DataSourceSerializer
    permission_classes = [IsAdminUser]
    queryset = DataSource.objects.all()

    def perform_create(self, serializer):
        serializer.save()


class DataIngestionRunListView(generics.ListAPIView):
    serializer_class = DataIngestionRunSerializer
    permission_classes = [IsAdminUser]
    queryset = DataIngestionRun.objects.select_related("source", "created_by")


class DataQualityIssueListView(generics.ListAPIView):
    serializer_class = DataQualityIssueSerializer
    permission_classes = [IsAdminUser]
    queryset = DataQualityIssue.objects.select_related("ingestion_run", "source_record")


class DataChangeEventListView(generics.ListAPIView):
    serializer_class = DataChangeEventSerializer
    permission_classes = [IsAdminUser]
    queryset = DataChangeEvent.objects.select_related("source", "source_record", "ingestion_run")


class DataQualityIssueResolveView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, _request, pk: int):
        issue = generics.get_object_or_404(DataQualityIssue, pk=pk)
        issue.status = DataQualityIssue.Status.RESOLVED
        issue.resolved_at = timezone.now()
        issue.save(update_fields=["status", "resolved_at"])
        return Response(DataQualityIssueSerializer(issue).data, status=status.HTTP_200_OK)


class SourceRecordListView(generics.ListAPIView):
    serializer_class = SourceRecordSerializer
    permission_classes = [IsAdminUser]
    queryset = SourceRecord.objects.select_related("source")


class SourceRecordApproveView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, _request, pk: int):
        record = generics.get_object_or_404(SourceRecord.objects.select_related("source"), pk=pk)
        approve_source_record(record)
        return Response(SourceRecordSerializer(record).data, status=status.HTTP_200_OK)


class SourceRecordRejectView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk: int):
        record = generics.get_object_or_404(SourceRecord.objects.select_related("source"), pk=pk)
        reject_source_record(record, reason=request.data.get("reason", ""))
        return Response(SourceRecordSerializer(record).data, status=status.HTTP_200_OK)


class SourceRecordPublishView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, _request, pk: int):
        record = generics.get_object_or_404(SourceRecord.objects.select_related("source"), pk=pk)
        published_object, published = publish_source_record(record)
        if not published:
            return Response(
                {"detail": "Source record must be approved before it can publish canonical data."},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(
            {
                "source_record": SourceRecordSerializer(record).data,
                "published_object_type": published_object.__class__.__name__,
                "published_object_id": published_object.pk,
            },
            status=status.HTTP_200_OK,
        )


class RegulatorListView(PublicKnowledgeCacheMixin, generics.ListAPIView):
    serializer_class = RegulatorSerializer
    permission_classes = [AllowAny]
    queryset = Regulator.objects.all()


class InvestmentProductCategoryListView(PublicKnowledgeCacheMixin, generics.ListAPIView):
    serializer_class = InvestmentProductCategorySerializer
    permission_classes = [AllowAny]
    queryset = InvestmentProductCategory.objects.prefetch_related("source_references__source")


class InvestmentProviderListView(PublicKnowledgeCacheMixin, generics.ListAPIView):
    serializer_class = InvestmentProviderSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return (
            InvestmentProvider.objects.select_related("regulator")
            .prefetch_related("source_references__source")
            .filter(published_status=InvestmentProvider.PublishedStatus.PUBLISHED)
        )


class InvestmentProviderDetailView(PublicKnowledgeCacheMixin, generics.RetrieveAPIView):
    serializer_class = InvestmentProviderSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        return (
            InvestmentProvider.objects.select_related("regulator")
            .prefetch_related("source_references__source")
            .filter(published_status=InvestmentProvider.PublishedStatus.PUBLISHED)
        )


class ListedCompanyListView(PublicKnowledgeCacheMixin, generics.ListAPIView):
    serializer_class = ListedCompanySerializer
    permission_classes = [AllowAny]
    queryset = ListedCompany.objects.select_related("source_reference__source").filter(
        published_status=ListedCompany.PublishedStatus.PUBLISHED
    )


class SaccoEntityListView(PublicKnowledgeCacheMixin, generics.ListAPIView):
    serializer_class = SaccoEntitySerializer
    permission_classes = [AllowAny]
    queryset = SaccoEntity.objects.select_related("source_reference__source").filter(
        published_status=SaccoEntity.PublishedStatus.PUBLISHED
    )


class GovernmentSecurityRecentListView(PublicKnowledgeCacheMixin, generics.ListAPIView):
    serializer_class = GovernmentSecurityReferenceSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return GovernmentSecurityReference.objects.select_related("source_reference__source").order_by(
            "-auction_date", "-id"
        )[:20]


class PublicDataSourceDetailView(PublicKnowledgeCacheMixin, generics.RetrieveAPIView):
    serializer_class = PublicDataSourceSerializer
    permission_classes = [AllowAny]
    queryset = DataSource.objects.filter(is_active=True)
