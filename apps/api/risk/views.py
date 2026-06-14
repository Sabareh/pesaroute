from rest_framework.response import Response
from rest_framework.views import APIView

from audit.models import AuditEvent
from audit.utils import record_audit_event
from risk.models import ScamCheck, ScamFlag
from risk.serializers import ScamCheckRequestSerializer, ScamCheckSerializer
from risk.services import check_scam_red_flags


class ScamCheckView(APIView):
    throttle_scope = "scam_check"

    def post(self, request):
        serializer = ScamCheckRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = check_scam_red_flags(serializer.validated_data["text"])
        scam_check = ScamCheck.objects.create(
            user=request.user if request.user.is_authenticated else None,
            prompt_text=serializer.validated_data["text"],
            risk_score=result["risk_score"],
            risk_level=result["risk_level"],
            flags=result["flags"],
            questions_to_ask=result["questions_to_ask"],
            disclaimer=result["disclaimer"],
        )
        ScamFlag.objects.bulk_create(
            [
                ScamFlag(
                    scam_check=scam_check,
                    phrase=flag["phrase"],
                    reason=flag["reason"],
                    weight=flag["weight"],
                )
                for flag in result["flags"]
            ]
        )
        record_audit_event(
            actor=request.user,
            event_type=AuditEvent.EventType.SCAM_CHECK_CREATED,
            resource_type="ScamCheck",
            resource_id=scam_check.id,
        )
        return Response(ScamCheckSerializer(scam_check).data, status=201)
