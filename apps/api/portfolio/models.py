from django.conf import settings
from django.db import models


class PortfolioItem(models.Model):
    class AmountDisplayMode(models.TextChoices):
        EXACT = "exact", "Exact"
        ROUNDED = "rounded", "Rounded"
        RANGE = "range", "Range"
        HIDDEN = "hidden", "Hidden"

    class LiquidityLevel(models.TextChoices):
        HIGH = "high", "High"
        MEDIUM = "medium", "Medium"
        LOW = "low", "Low"
        LOCKED = "locked", "Locked"

    class RiskLevel(models.TextChoices):
        LOW = "low", "Low"
        MODERATE = "moderate", "Moderate"
        HIGH = "high", "High"
        VERY_HIGH = "very_high", "Very high"

    class Visibility(models.TextChoices):
        PRIVATE = "private", "Private"
        SHARED = "shared", "Shared"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="portfolio_items")
    asset_type = models.CharField(max_length=120)
    provider_name = models.CharField(max_length=160, blank=True)
    amount_display_mode = models.CharField(
        max_length=32, choices=AmountDisplayMode.choices, default=AmountDisplayMode.HIDDEN
    )
    amount_exact = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    amount_range_min = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    amount_range_max = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    liquidity_level = models.CharField(max_length=32, choices=LiquidityLevel.choices)
    risk_level = models.CharField(max_length=32, choices=RiskLevel.choices)
    maturity_date = models.DateField(null=True, blank=True)
    visibility = models.CharField(max_length=32, choices=Visibility.choices, default=Visibility.PRIVATE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    version = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["asset_type"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.user_id}:{self.asset_type}"

    def save(self, *args, **kwargs):
        if self.pk and not kwargs.get("force_insert"):
            self.version = (self.version or 1) + 1
        super().save(*args, **kwargs)
