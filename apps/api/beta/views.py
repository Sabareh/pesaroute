from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from beta.models import BetaFeedback, BetaInvite, FeatureFlag
from beta.serializers import (
    BetaFeedbackSerializer,
    BetaInviteSerializer,
    BetaInviteValidateSerializer,
    FeatureFlagModelSerializer,
    FeatureFlagSerializer,
)
from beta.services import current_feature_flags, get_valid_beta_invite


class FeatureFlagView(APIView):
    permission_classes = [AllowAny]

    def get(self, _request):
        return Response(FeatureFlagSerializer(current_feature_flags()).data)


class BetaInviteValidateView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = BetaInviteValidateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invite = get_valid_beta_invite(
            serializer.validated_data["invite_code"],
            email=serializer.validated_data.get("email", ""),
        )
        return Response({"valid": True, "remaining_uses": max(invite.max_uses - invite.used_count, 0)})


class BetaFeedbackCreateView(generics.CreateAPIView):
    serializer_class = BetaFeedbackSerializer
    permission_classes = [AllowAny]
    queryset = BetaFeedback.objects.all()

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(user=user)


class AdminBetaInviteListCreateView(generics.ListCreateAPIView):
    serializer_class = BetaInviteSerializer
    permission_classes = [IsAdminUser]
    queryset = BetaInvite.objects.all()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class AdminFeatureFlagListView(generics.ListCreateAPIView):
    serializer_class = FeatureFlagModelSerializer
    permission_classes = [IsAdminUser]
    queryset = FeatureFlag.objects.all()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        flag, _created = FeatureFlag.objects.update_or_create(
            key=serializer.validated_data["key"],
            defaults={
                "enabled": serializer.validated_data["enabled"],
                "description": serializer.validated_data.get("description", ""),
            },
        )
        return Response(self.get_serializer(flag).data, status=status.HTTP_201_CREATED)
