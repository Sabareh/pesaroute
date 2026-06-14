from django.conf import settings
from django.db import models


class UserProfile(models.Model):
    class Role(models.TextChoices):
        CONSUMER = "consumer", "Consumer"
        PROFESSIONAL = "professional", "Professional"
        PROVIDER = "provider", "Provider"
        ADMIN = "admin", "Admin"

    class PreferredLanguage(models.TextChoices):
        ENGLISH = "en", "English"
        SWAHILI = "sw", "Swahili"

    class UserType(models.TextChoices):
        STUDENT = "student", "Student"
        FIRST_JOBBER = "first_jobber", "First jobber"
        PROFESSIONAL = "professional", "Professional"
        DIASPORA = "diaspora", "Diaspora"
        CHAMA_MEMBER = "chama_member", "Chama member"
        FARMER = "farmer", "Farmer"
        JUA_KALI = "jua_kali", "Jua kali"
        OTHER = "other", "Other"

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    role = models.CharField(max_length=32, choices=Role.choices, default=Role.CONSUMER)
    preferred_language = models.CharField(
        max_length=8, choices=PreferredLanguage.choices, default=PreferredLanguage.ENGLISH
    )
    user_type = models.CharField(max_length=32, choices=UserType.choices, default=UserType.OTHER)
    approximate_investment_range = models.CharField(max_length=80, blank=True)
    privacy_mode_enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=["role"]), models.Index(fields=["created_at"])]

    def __str__(self) -> str:
        return f"{self.user_id}:{self.role}"
