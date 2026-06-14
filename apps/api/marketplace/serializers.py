from rest_framework import serializers

from marketplace.models import ConsultationRequest


class ConsultationRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConsultationRequest
        fields = ["id", "professional", "topic", "notes", "status", "created_at"]
        read_only_fields = ["id", "status", "created_at"]
