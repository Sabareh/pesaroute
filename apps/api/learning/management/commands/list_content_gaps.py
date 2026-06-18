from django.core.management.base import BaseCommand
from django.utils import timezone

from catalog.models import ProductPassport
from learning.content import find_banned_learning_phrase, flatten_structured_content, is_generic_placeholder
from learning.models import Flashcard, LearningLesson, LearningResource, QuizQuestion
from learning.quality import score_lesson, score_resource


class Command(BaseCommand):
    help = "List content quality gaps for editorial review."

    def handle(self, *args, **options):
        findings: list[str] = []
        now = timezone.now()

        lessons = LearningLesson.objects.select_related("course", "course__track").prefetch_related(
            "content_sources", "quiz_questions", "flashcards"
        )
        for lesson in lessons:
            label = f"{lesson.course.track.slug}/{lesson.course.slug}/{lesson.slug}"
            structured_text = flatten_structured_content(lesson.structured_content)
            result = score_lesson(lesson)
            if is_generic_placeholder(lesson.body) or is_generic_placeholder(structured_text):
                findings.append(f"placeholder lesson: {label}")
            if result.score < 70:
                findings.append(f"thin lesson: {label} score={result.score}")
            if (
                not lesson.content_sources.exists()
                and result.source_confidence != LearningLesson.SourceConfidence.EDITORIAL
            ):
                findings.append(f"missing source references: {label}")
            if lesson.next_review_due_at and lesson.next_review_due_at < now:
                findings.append(f"stale lesson: {label}")
            banned_phrase = find_banned_learning_phrase(lesson.summary, lesson.body, structured_text)
            if banned_phrase:
                findings.append(f"banned phrase '{banned_phrase}': {label}")

        lesson_ids_with_quiz = set(QuizQuestion.objects.values_list("lesson_id", flat=True))
        lesson_ids_with_flashcards = set(Flashcard.objects.values_list("lesson_id", flat=True))
        for lesson in lessons:
            label = f"{lesson.course.track.slug}/{lesson.course.slug}/{lesson.slug}"
            if lesson.lesson_type == LearningLesson.LessonType.QUIZ and lesson.id not in lesson_ids_with_quiz:
                findings.append(f"missing quizzes: {label}")
            if (
                lesson.lesson_type == LearningLesson.LessonType.FLASHCARD
                and lesson.id not in lesson_ids_with_flashcards
            ):
                findings.append(f"missing flashcards: {label}")

        resources = LearningResource.objects.prefetch_related("content_sources")
        for resource in resources:
            result = score_resource(resource)
            if result.score < 70:
                findings.append(f"thin resource: {resource.title} score={result.score}")
            if resource.resource_type == LearningResource.ResourceType.GLOSSARY:
                structured_text = flatten_structured_content(resource.structured_content)
                if "Kenyan example" not in structured_text:
                    findings.append(f"glossary term without example: {resource.title}")
            if (
                not resource.content_sources.exists()
                and result.source_confidence != LearningResource.SourceConfidence.EDITORIAL
            ):
                findings.append(f"resource missing source references: {resource.title}")

        for passport in ProductPassport.objects.select_related("provider", "category").prefetch_related(
            "source_references"
        ):
            if not passport.public_source_url and not passport.source_references.exists():
                findings.append(f"product passport without sources: {passport.slug}")
            if passport.next_review_due_at and passport.next_review_due_at < now:
                findings.append(f"product passport needs verification: {passport.slug}")

        if findings:
            self.stdout.write(self.style.WARNING(f"Content gaps found: {len(findings)}"))
            for finding in findings:
                self.stdout.write(f"- {finding}")
            return

        self.stdout.write(self.style.SUCCESS("No content gaps found."))
