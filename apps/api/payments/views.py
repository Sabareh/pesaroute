from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import generics, status
from rest_framework.generics import get_object_or_404
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from payments.models import PaymentIntent
from payments.mpesa import MpesaError
from payments.serializers import (
    MpesaCallbackSerializer,
    PaymentInitiateSerializer,
    PaymentIntentCreateSerializer,
    PaymentIntentSerializer,
)
from payments.services import (
    PaymentValidationError,
    create_payment_intent,
    expire_stale_intent,
    handle_mpesa_callback,
    initiate_mpesa_checkout,
)


class PaymentIntentCreateView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "payments"

    def post(self, request):
        serializer = PaymentIntentCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            intent = create_payment_intent(
                user=request.user,
                purpose=data["purpose"],
                plan_code=data.get("plan_code", ""),
                pack_code=data.get("pack_code", ""),
                consultation_request=data.get("consultation_request"),
                phone_number=data.get("phone_number", ""),
                idempotency_key=data.get("idempotency_key") or None,
            )
        except PaymentValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(PaymentIntentSerializer(intent).data, status=status.HTTP_201_CREATED)


class PaymentIntentDetailView(generics.RetrieveAPIView):
    serializer_class = PaymentIntentSerializer
    permission_classes = [IsAuthenticated]
    throttle_scope = "payments"

    def get_queryset(self):
        return PaymentIntent.objects.filter(user=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        intent = expire_stale_intent(self.get_object())
        return Response(self.get_serializer(intent).data)


class PaymentIntentInitiateView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "payments"

    def post(self, request, pk: int):
        intent = get_object_or_404(PaymentIntent.objects.filter(user=request.user), pk=pk)
        serializer = PaymentInitiateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            intent = initiate_mpesa_checkout(intent, phone_number=serializer.validated_data["phone_number"])
        except (MpesaError, PaymentValidationError) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(PaymentIntentSerializer(intent).data)


@method_decorator(csrf_exempt, name="dispatch")
class MpesaCallbackView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_scope = "payments"

    def post(self, request):
        serializer = MpesaCallbackSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            intent = handle_mpesa_callback(request.data)
        except PaymentValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_404_NOT_FOUND)
        return Response({"status": "ok", "payment_intent": intent.id})
