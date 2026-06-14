from rest_framework.response import Response
from rest_framework.views import APIView

from planning.models import SimulationRun
from planning.serializers import (
    GlobalRouteSimulationSerializer,
    MMFSimulationSerializer,
    SaccoSimulationSerializer,
    TBillSimulationSerializer,
)
from planning.services import DISCLAIMER, simulate_global_route, simulate_mmf, simulate_sacco, simulate_tbill


class SimulationAPIView(APIView):
    serializer_class = None
    simulator_type = None
    simulator = None

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = self.simulator(**serializer.validated_data)
        SimulationRun.objects.create(
            user=request.user if request.user.is_authenticated else None,
            simulator_type=self.simulator_type,
            inputs={key: str(value) for key, value in serializer.validated_data.items()},
            outputs=result,
            disclaimer=DISCLAIMER,
        )
        return Response(result)


class MMFSimulationView(SimulationAPIView):
    serializer_class = MMFSimulationSerializer
    simulator_type = SimulationRun.SimulatorType.MMF
    simulator = staticmethod(simulate_mmf)


class TBillSimulationView(SimulationAPIView):
    serializer_class = TBillSimulationSerializer
    simulator_type = SimulationRun.SimulatorType.TBILL
    simulator = staticmethod(simulate_tbill)


class SaccoSimulationView(SimulationAPIView):
    serializer_class = SaccoSimulationSerializer
    simulator_type = SimulationRun.SimulatorType.SACCO
    simulator = staticmethod(simulate_sacco)


class GlobalRouteSimulationView(SimulationAPIView):
    serializer_class = GlobalRouteSimulationSerializer
    simulator_type = SimulationRun.SimulatorType.GLOBAL_ROUTE
    simulator = staticmethod(simulate_global_route)
