from django.core.management.base import BaseCommand
from django.db.models import Count
from django.utils import timezone

from learning.content import (
    find_banned_learning_phrase,
    flatten_structured_content,
    has_disclaimer_block,
    is_generic_placeholder,
)
from learning.models import LearningLesson, LearningResource


class Command(BaseCommand):
    help = "Audit learning lessons and resources for placeholders, sources, review freshness, and safety language."

    def handle(self, *args, **options):
        now = timezone.now()
        findings: list[str] = []

        lessons = (
            LearningLesson.objects.select_related("course", "course__track")
            .prefetch_related("content_sources")
            .annotate(source_count=Count("content_sources"))
            .order_by("course__track__order", "course__order", "order")
        )
        for lesson in lessons:
            label = f"lesson:{lesson.id}:{lesson.course.track.slug}/{lesson.slug}"
            structured_text = flatten_structured_content(lesson.structured_content)
            banned_phrase = find_banned_learning_phrase(lesson.summary, lesson.body, structured_text)
            if is_generic_placeholder(lesson.body):
                findings.append(f"{label}: placeholder body")
            if lesson.status == LearningLesson.Status.PUBLISHED and not lesson.structured_content:
                findings.append(f"{label}: missing structured content")
            if lesson.status == LearningLesson.Status.PUBLISHED and not has_disclaimer_block(lesson.structured_content):
                findings.append(f"{label}: missing disclaimer block")
            if len((lesson.body or "").strip()) < 180:
                findings.append(f"{label}: body too short")
            if lesson.source_count == 0 and lesson.editorial_status == LearningLesson.EditorialStatus.DRAFT:
                findings.append(f"{label}: no source references or editorial label")
            if (
                lesson.status == LearningLesson.Status.PUBLISHED
                and lesson.lesson_type == LearningLesson.LessonType.QUIZ
                and lesson.quiz_questions.count() == 0
            ):
                findings.append(f"{label}: missing quiz questions")
            if (
                lesson.status == LearningLesson.Status.PUBLISHED
                and lesson.lesson_type == LearningLesson.LessonType.FLASHCARD
                and lesson.flashcards.count() == 0
            ):
                findings.append(f"{label}: missing flashcards")
            if lesson.next_review_due_at and lesson.next_review_due_at <= now:
                findings.append(f"{label}: review due")
            if banned_phrase:
                findings.append(f"{label}: banned phrase '{banned_phrase}'")

        resources = (
            LearningResource.objects.select_related("related_track", "related_product_category")
            .prefetch_related("content_sources")
            .annotate(source_count=Count("content_sources"))
            .order_by("resource_type", "title")
        )
        for resource in resources:
            label = f"resource:{resource.id}:{resource.title}"
            structured_text = flatten_structured_content(resource.structured_content)
            banned_phrase = find_banned_learning_phrase(resource.body, structured_text)
            if is_generic_placeholder(resource.body):
                findings.append(f"{label}: placeholder body")
            if len((resource.body or "").strip()) < 120:
                findings.append(f"{label}: body too short")
            if resource.status == LearningResource.Status.PUBLISHED and not has_disclaimer_block(
                resource.structured_content
            ):
                findings.append(f"{label}: missing disclaimer block")
            if resource.source_count == 0 and resource.editorial_status == LearningResource.EditorialStatus.DRAFT:
                findings.append(f"{label}: no source references or editorial label")
            if resource.next_review_due_at and resource.next_review_due_at <= now:
                findings.append(f"{label}: review due")
            if banned_phrase:
                findings.append(f"{label}: banned phrase '{banned_phrase}'")

        if findings:
            self.stdout.write(self.style.WARNING(f"Learning content audit found {len(findings)} issue(s)."))
            for finding in findings:
                self.stdout.write(f"- {finding}")
        else:
            self.stdout.write(self.style.SUCCESS("Learning content audit passed with no findings."))
