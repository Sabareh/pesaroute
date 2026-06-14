from django.urls import path

from accounts.views import LoginView, MeView, RegisterView

urlpatterns = [
    path("register/", RegisterView.as_view(), name="accounts-register"),
    path("login/", LoginView.as_view(), name="accounts-login"),
    path("me/", MeView.as_view(), name="accounts-me"),
]
