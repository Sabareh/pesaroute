from django.conf import settings
from django.db import models


class ScamCheck(models.Model):
    class RiskLevel(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        SEVERE = "severe", "Severe"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="scam_checks"
    )
    prompt_text = models.TextField()
    risk_score = models.PositiveIntegerField()
    risk_level = models.CharField(max_length=32, choices=RiskLevel.choices)
    flags = models.JSONField(default=list)
    questions_to_ask = models.JSONField(default=list)
    disclaimer = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "created_at"]), models.Index(fields=["risk_level", "created_at"])]

    def __str__(self) -> str:
        return f"{self.risk_level}:{self.risk_score}"


class ScamFlag(models.Model):
    scam_check = models.ForeignKey(ScamCheck, on_delete=models.CASCADE, related_name="flag_rows")
    phrase = models.CharField(max_length=160)
    reason = models.TextField()
    weight = models.PositiveIntegerField(default=10)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["scam_check", "created_at"])]

    def __str__(self) -> str:
        return self.phrase
