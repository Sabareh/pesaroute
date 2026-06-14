from rest_framework import serializers

from risk.models import ScamCheck


class ScamCheckRequestSerializer(serializers.Serializer):
    text = serializers.CharField(max_length=5000)


class ScamCheckSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScamCheck
        fields = [
            "id",
            "risk_score",
            "risk_level",
            "flags",
            "questions_to_ask",
            "disclaimer",
            "created_at",
        ]
