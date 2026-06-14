from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

from accounts.models import UserProfile


@receiver(post_save, sender=get_user_model())
def ensure_user_profile(sender, instance, created, **kwargs):
    if not created:
        return
    role = UserProfile.Role.ADMIN if instance.is_staff or instance.is_superuser else UserProfile.Role.CONSUMER
    UserProfile.objects.get_or_create(user=instance, defaults={"role": role})
