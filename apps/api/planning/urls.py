from django.urls import path

from planning.views import GlobalRouteSimulationView, MMFSimulationView, SaccoSimulationView, TBillSimulationView

urlpatterns = [
    path("simulate/mmf/", MMFSimulationView.as_view(), name="simulate-mmf"),
    path("simulate/tbill/", TBillSimulationView.as_view(), name="simulate-tbill"),
    path("simulate/sacco/", SaccoSimulationView.as_view(), name="simulate-sacco"),
    path("simulate/global-route/", GlobalRouteSimulationView.as_view(), name="simulate-global-route"),
]
