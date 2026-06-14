from django.conf import settings
from django.db import models


class JournalEntry(models.Model):
    class AmountDisplayMode(models.TextChoices):
        EXACT = "exact", "Exact"
        ROUNDED = "rounded", "Rounded"
        RANGE = "range", "Range"
        HIDDEN = "hidden", "Hidden"

    class Visibility(models.TextChoices):
        PRIVATE = "private", "Private"
        SHARED = "shared", "Shared"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="journal_entries")
    goal = models.CharField(max_length=180, blank=True)
    decision = models.TextField()
    amount_display_mode = models.CharField(
        max_length=32, choices=AmountDisplayMode.choices, default=AmountDisplayMode.HIDDEN
    )
    amount_exact = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    amount_range_min = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    amount_range_max = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    reason = models.TextField(blank=True)
    alternatives_considered = models.TextField(blank=True)
    risks_considered = models.TextField(blank=True)
    review_date = models.DateField(null=True, blank=True)
    visibility = models.CharField(max_length=32, choices=Visibility.choices, default=Visibility.PRIVATE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    version = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "created_at"]), models.Index(fields=["created_at"])]

    def __str__(self) -> str:
        return f"{self.user_id}:{self.decision[:40]}"

    def save(self, *args, **kwargs):
        if self.pk and not kwargs.get("force_insert"):
            self.version = (self.version or 1) + 1
        super().save(*args, **kwargs)
