from rest_framework.response import Response
from rest_framework.views import APIView

from learning.models import LearningLesson
from learning.services import can_access_lesson
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
    throttle_scope = "simulators"

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        learning_lesson = None
        learning_lesson_id = request.data.get("learning_lesson_id") or request.data.get("learning_lesson")
        if learning_lesson_id:
            learning_lesson = (
                LearningLesson.objects.filter(
                    pk=learning_lesson_id,
                    status=LearningLesson.Status.PUBLISHED,
                )
                .select_related("course", "course__track")
                .first()
            )
            if not learning_lesson:
                return Response({"detail": "Learning lesson not found."}, status=404)
            if not can_access_lesson(request.user, learning_lesson):
                return Response({"detail": "Premium learning entitlement required."}, status=403)
        result = self.simulator(**serializer.validated_data)
        simulation_run = SimulationRun.objects.create(
            user=request.user if request.user.is_authenticated else None,
            learning_lesson=learning_lesson,
            simulator_type=self.simulator_type,
            inputs={key: str(value) for key, value in serializer.validated_data.items()},
            outputs=result,
            disclaimer=DISCLAIMER,
        )
        response = dict(result)
        response["simulation_run_id"] = simulation_run.id
        return Response(response)


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
