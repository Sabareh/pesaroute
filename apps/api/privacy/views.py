from django.utils import timezone
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from privacy.models import DataAccessLog, DataGrant
from privacy.serializers import DataAccessLogSerializer, DataGrantSerializer


class DataGrantListCreateView(generics.ListCreateAPIView):
    serializer_class = DataGrantSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return DataGrant.objects.filter(user=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class DataAccessLogListView(generics.ListAPIView):
    serializer_class = DataAccessLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return DataAccessLog.objects.filter(user=self.request.user).order_by("-created_at")


class DataGrantRevokeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        grant = generics.get_object_or_404(DataGrant, pk=pk, user=request.user)
        if not grant.revoked_at:
            grant.revoked_at = timezone.now()
            grant.status = DataGrant.Status.REVOKED
            grant.save(update_fields=["revoked_at", "status"])
        return Response(DataGrantSerializer(grant).data)

    def delete(self, request, pk):
        return self.post(request, pk)
