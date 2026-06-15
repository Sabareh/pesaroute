from django.conf import settings
from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from billing.models import OneOffPackCode, Plan
from billing.serializers import (
    DevMockPurchaseSerializer,
    EntitlementSnapshotSerializer,
    PlanSerializer,
    SubscriptionSerializer,
)
from billing.services import (
    ONE_OFF_PACK_PRICES,
    entitlement_snapshot,
    grant_dev_pack,
    grant_dev_subscription,
    pack_access_key,
    seed_default_plans,
)


class PlanListView(generics.ListAPIView):
    serializer_class = PlanSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        seed_default_plans()
        return Plan.objects.filter(is_active=True)


class EntitlementSnapshotView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        payload = entitlement_snapshot(request.user)
        serializer = EntitlementSnapshotSerializer(payload)
        return Response(serializer.data)


class OneOffPackListView(APIView):
    permission_classes = [AllowAny]

    def get(self, _request):
        return Response(
            [
                {
                    "code": code,
                    "name": label,
                    "entitlement_key": pack_access_key(code),
                    "price_kes": ONE_OFF_PACK_PRICES.get(code, 0),
                    "payment_provider": "manual_placeholder",
                }
                for code, label in OneOffPackCode.choices
            ]
        )


class DevMockPurchaseView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not settings.DEBUG:
            return Response({"detail": "Development mock billing is disabled."}, status=404)

        serializer = DevMockPurchaseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        if data["kind"] == "subscription":
            subscription = grant_dev_subscription(
                request.user,
                plan_code=data["plan_code"],
                days=data.get("days", 30),
            )
            return Response(
                {
                    "detail": "Development placeholder subscription granted. No money was collected.",
                    "subscription": SubscriptionSerializer(subscription).data,
                    "entitlements": entitlement_snapshot(request.user),
                },
                status=201,
            )

        purchase = grant_dev_pack(request.user, data["pack_code"])
        return Response(
            {
                "detail": "Development placeholder guide pack granted. No money was collected.",
                "purchase": {
                    "id": purchase.id,
                    "pack_code": purchase.pack_code,
                    "status": purchase.status,
                    "amount_kes": purchase.amount_kes,
                },
                "entitlements": entitlement_snapshot(request.user),
            },
            status=201,
        )
