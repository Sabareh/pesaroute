from django.core.management.base import BaseCommand

from catalog.models import ProductPassport
from learning.models import LearningLesson, LearningResource
from learning.quality import passport_freshness, score_label, score_lesson, score_resource


class Command(BaseCommand):
    help = "Score learning content quality and update source/freshness metadata."

    def handle(self, *args, **options):
        lesson_counts = {"strong": 0, "acceptable": 0, "thin": 0, "placeholder/poor": 0}
        resource_counts = {"strong": 0, "acceptable": 0, "thin": 0, "placeholder/poor": 0}
        passport_counts = {"fresh": 0, "acceptable": 0, "stale": 0, "unknown": 0}

        lessons = LearningLesson.objects.prefetch_related("content_sources", "quiz_questions", "flashcards")
        for lesson in lessons:
            result = score_lesson(lesson)
            lesson.content_quality_score = result.score
            lesson.content_warning_flags = result.flags
            lesson.source_confidence = result.source_confidence
            lesson.save(
                update_fields=[
                    "content_quality_score",
                    "content_warning_flags",
                    "source_confidence",
                    "updated_at",
                ]
            )
            lesson_counts[score_label(result.score)] += 1

        resources = LearningResource.objects.prefetch_related("content_sources")
        for resource in resources:
            result = score_resource(resource)
            resource.content_quality_score = result.score
            resource.source_confidence = result.source_confidence
            resource.save(update_fields=["content_quality_score", "source_confidence", "updated_at"])
            resource_counts[score_label(result.score)] += 1

        for passport in ProductPassport.objects.all():
            freshness = passport_freshness(passport)
            passport.freshness_status = freshness
            passport.data_freshness = freshness
            passport.save(update_fields=["freshness_status", "data_freshness", "updated_at"])
            passport_counts[freshness] += 1

        self.stdout.write(
            self.style.SUCCESS(
                "Learning lesson quality: " + ", ".join(f"{label}={count}" for label, count in lesson_counts.items())
            )
        )
        self.stdout.write(
            self.style.SUCCESS(
                "Learning resource quality: "
                + ", ".join(f"{label}={count}" for label, count in resource_counts.items())
            )
        )
        self.stdout.write(
            self.style.SUCCESS(
                "Product passport freshness: "
                + ", ".join(f"{label}={count}" for label, count in passport_counts.items())
            )
        )
