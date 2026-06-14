from django.conf import settings
from django.db import models


class InvestmentGoal(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="investment_goals")
    name = models.CharField(max_length=160)
    target_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    target_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["user", "created_at"])]

    def __str__(self) -> str:
        return self.name


class RouteRequest(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="route_requests"
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    source = models.CharField(max_length=80, default="KES")
    target_category = models.CharField(max_length=120)
    risk_preference = models.CharField(max_length=80, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["user", "created_at"]), models.Index(fields=["target_category", "created_at"])]

    def __str__(self) -> str:
        return f"{self.amount} to {self.target_category}"


class RouteResult(models.Model):
    route_request = models.ForeignKey(RouteRequest, on_delete=models.CASCADE, related_name="results")
    summary = models.TextField()
    steps = models.JSONField(default=list)
    disclaimers = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["route_request", "created_at"])]


class SimulationRun(models.Model):
    class SimulatorType(models.TextChoices):
        MMF = "mmf", "Money market fund"
        TBILL = "tbill", "Treasury bill"
        SACCO = "sacco", "SACCO"
        GLOBAL_ROUTE = "global_route", "Global investing route"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="simulation_runs"
    )
    simulator_type = models.CharField(max_length=32, choices=SimulatorType.choices)
    inputs = models.JSONField(default=dict)
    outputs = models.JSONField(default=dict)
    disclaimer = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["simulator_type", "created_at"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.simulator_type}:{self.created_at:%Y-%m-%d}"
