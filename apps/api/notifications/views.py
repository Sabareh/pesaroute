from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from notifications.models import Notification
from notifications.serializers import NotificationSerializer
from notifications.services import mark_notification_read


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)


class NotificationReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        notification = generics.get_object_or_404(Notification.objects.filter(user=request.user), pk=pk)
        return Response(NotificationSerializer(mark_notification_read(notification)).data)
