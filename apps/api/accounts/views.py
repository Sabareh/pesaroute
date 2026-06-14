from rest_framework import generics, status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.serializers import LoginSerializer, RegisterSerializer, UserProfileSerializer, UserSerializer
from audit.models import AuditEvent
from audit.utils import record_audit_event


def auth_payload(user):
    token, _created = Token.objects.get_or_create(user=user)
    return {"token": token.key, "user": UserSerializer(user).data}


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        record_audit_event(
            actor=user,
            event_type=AuditEvent.EventType.USER_REGISTERED,
            resource_type="User",
            resource_id=user.id,
        )
        return Response(auth_payload(user), status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        record_audit_event(
            actor=user,
            event_type=AuditEvent.EventType.USER_LOGGED_IN,
            resource_type="User",
            resource_id=user.id,
        )
        return Response(auth_payload(user))


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        profile_data = request.data.get("profile", request.data)
        serializer = UserProfileSerializer(
            request.user.profile,
            data=profile_data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)
