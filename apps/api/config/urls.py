from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def health_check(_request):
    return JsonResponse({"status": "ok", "service": "pesaroute-api"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health_check, name="health-check"),
    path("api/admin/", include("knowledge.admin_urls")),
    path("api/accounts/", include("accounts.urls")),
    path("api/beta/", include("beta.urls")),
    path("api/billing/", include("billing.urls")),
    path("api/catalog/", include("catalog.urls")),
    path("api/planning/", include("planning.urls")),
    path("api/risk/", include("risk.urls")),
    path("api/journal/", include("journal.urls")),
    path("api/knowledge/", include("knowledge.urls")),
    path("api/learning/", include("learning.urls")),
    path("api/portfolio/", include("portfolio.urls")),
    path("api/marketplace/", include("marketplace.urls")),
    path("api/privacy/", include("privacy.urls")),
    path("api/payments/", include("payments.urls")),
    path("api/notifications/", include("notifications.urls")),
]
