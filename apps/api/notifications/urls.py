from django.urls import path

from notifications.views import NotificationListView, NotificationReadView

urlpatterns = [
    path("", NotificationListView.as_view(), name="notifications-list"),
    path("<int:pk>/read/", NotificationReadView.as_view(), name="notifications-read"),
]
