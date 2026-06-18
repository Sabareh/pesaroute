import json
from datetime import timedelta
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from catalog.models import ProductCategory
from learning.content import (
    EDUCATIONAL_DISCLAIMER,
    SOURCE_CATALOG,
    body_from_structured_content,
    find_banned_learning_phrase,
    is_generic_placeholder,
    sync_learning_sources,
)
from learning.models import Flashcard, LearningCourse, LearningLesson, LearningResource, LearningTrack, QuizQuestion

PACK_MARKER = "content-pack:kenya-investment-lessons"
GENERATED_NOTE_PREFIXES = ("Seeded structured educational content", PACK_MARKER)


class Command(BaseCommand):
    help = "Import the curated Kenya investment lesson content pack."

    def add_arguments(self, parser):
        parser.add_argument("--path", required=True, help="Path to the content pack directory.")
        parser.add_argument("--dry-run", action="store_true", help="Validate and report without writing.")
        parser.add_argument("--publish", action="store_true", help="Create or update published content.")
        parser.add_argument("--overwrite", action="store_true", help="Overwrite manually edited lessons/resources.")

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        publish = options["publish"]
        overwrite = options["overwrite"]
        if dry_run and publish:
            raise CommandError("Use either --dry-run or --publish, not both.")
        if not dry_run and not publish:
            raise CommandError("Use --dry-run to validate or --publish to import.")

        pack_path = self._resolve_path(options["path"])
        files = sorted(pack_path.glob("*.json"))
        if not files:
            raise CommandError(f"No JSON content files found in {pack_path}")

        packs = [self._load_pack(file_path) for file_path in files]
        validation_errors = self._validate_packs(packs)
        if validation_errors:
            raise CommandError("Content pack validation failed:\n- " + "\n- ".join(validation_errors))

        if dry_run:
            counts = self._count_input(packs)
            self.stdout.write(
                self.style.SUCCESS(
                    "Dry run passed: "
                    f"{counts['tracks']} tracks, {counts['courses']} courses, {counts['lessons']} lessons, "
                    f"{counts['quizzes']} quizzes, {counts['flashcards']} flashcards, "
                    f"{counts['glossary']} glossary terms, {counts['resources']} resources."
                )
            )
            return

        with transaction.atomic():
            counts = self._publish_packs(packs, overwrite=overwrite)

        self.stdout.write(
            self.style.SUCCESS(
                "Imported learning content pack: "
                f"tracks={counts['tracks']}, courses={counts['courses']}, lessons={counts['lessons']}, "
                f"quizzes={counts['quizzes']}, flashcards={counts['flashcards']}, "
                f"glossary={counts['glossary']}, resources={counts['resources']}, skipped={counts['skipped']}."
            )
        )

    def _resolve_path(self, raw_path: str) -> Path:
        candidate = Path(raw_path)
        if candidate.is_absolute() and candidate.exists():
            return candidate
        candidates = [
            Path.cwd() / raw_path,
            settings.BASE_DIR / raw_path,
            settings.BASE_DIR.parent.parent / raw_path,
        ]
        for path in candidates:
            if path.exists():
                return path
        raise CommandError(f"Content pack path not found: {raw_path}")

    def _load_pack(self, file_path: Path) -> dict:
        try:
            return json.loads(file_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise CommandError(f"Invalid JSON in {file_path}: {exc}") from exc

    def _validate_packs(self, packs: list[dict]) -> list[str]:
        errors: list[str] = []
        seen_slugs: set[str] = set()
        for pack in packs:
            track = pack.get("track", {})
            track_slug = track.get("slug") or slugify(track.get("title", ""))
            if not track_slug:
                errors.append("Track is missing title/slug.")
            if track_slug in seen_slugs:
                errors.append(f"Duplicate track slug: {track_slug}")
            seen_slugs.add(track_slug)

            lessons = pack.get("lessons", [])
            if not lessons:
                errors.append(f"{track_slug}: no lessons.")
            for lesson in lessons:
                errors.extend(self._validate_lesson(track_slug, lesson))

            if len(pack.get("quiz_questions", [])) < 3:
                errors.append(f"{track_slug}: expected at least 3 quiz questions.")
            if len(pack.get("flashcards", [])) < 5:
                errors.append(f"{track_slug}: expected at least 5 flashcards.")
            for source_key in pack.get("sources", []):
                if source_key not in SOURCE_CATALOG:
                    errors.append(f"{track_slug}: unknown source key {source_key}.")
            for resource in pack.get("resources", []):
                errors.extend(self._validate_resource(track_slug, resource))
            for glossary in pack.get("glossary", []):
                errors.extend(self._validate_glossary(track_slug, glossary))
        return errors

    def _validate_lesson(self, track_slug: str, lesson: dict) -> list[str]:
        errors: list[str] = []
        label = f"{track_slug}/{lesson.get('slug') or slugify(lesson.get('title', ''))}"
        required = ["title", "summary", "introduction", "sections", "scenario", "takeaway", "mistake", "action"]
        for field in required:
            if not lesson.get(field):
                errors.append(f"{label}: missing {field}.")
        if len(lesson.get("sections", [])) < 3:
            errors.append(f"{label}: expected at least 3 teaching sections.")
        lesson_type = lesson.get("lesson_type", LearningLesson.LessonType.ARTICLE)
        if lesson_type not in LearningLesson.LessonType.values:
            errors.append(f"{label}: unknown lesson_type {lesson_type}.")
        difficulty = lesson.get("difficulty", LearningLesson.Difficulty.BEGINNER)
        if difficulty not in LearningLesson.Difficulty.values:
            errors.append(f"{label}: unknown difficulty {difficulty}.")
        if len(lesson.get("introduction", "")) < 80:
            errors.append(f"{label}: introduction is too short.")
        if is_generic_placeholder(lesson.get("introduction", "")):
            errors.append(f"{label}: generic placeholder text.")
        text_values = [
            lesson.get("summary", ""),
            lesson.get("introduction", ""),
            " ".join(lesson.get("sections", [])),
            lesson.get("scenario", {}).get("text", ""),
            lesson.get("takeaway", ""),
            lesson.get("mistake", ""),
            lesson.get("action", ""),
        ]
        banned_phrase = find_banned_learning_phrase(*text_values)
        if banned_phrase:
            errors.append(f"{label}: banned phrase '{banned_phrase}'.")
        source_keys = lesson.get("sources", [])
        if not source_keys and lesson.get("editorial_status") not in {"reviewed", "published"}:
            errors.append(f"{label}: needs source references or reviewed editorial label.")
        for source_key in source_keys:
            if source_key not in SOURCE_CATALOG:
                errors.append(f"{label}: unknown source key {source_key}.")
        return errors

    def _validate_resource(self, track_slug: str, resource: dict) -> list[str]:
        errors = []
        label = f"{track_slug}/resource/{resource.get('title', '')}"
        if not resource.get("title") or len(resource.get("body", "")) < 80:
            errors.append(f"{label}: title/body missing or too short.")
        banned_phrase = find_banned_learning_phrase(resource.get("body", ""))
        if banned_phrase:
            errors.append(f"{label}: banned phrase '{banned_phrase}'.")
        for source_key in resource.get("sources", []):
            if source_key not in SOURCE_CATALOG:
                errors.append(f"{label}: unknown source key {source_key}.")
        return errors

    def _validate_glossary(self, track_slug: str, glossary: dict) -> list[str]:
        errors = []
        label = f"{track_slug}/glossary/{glossary.get('term', '')}"
        for field in ("term", "definition", "example"):
            if not glossary.get(field):
                errors.append(f"{label}: missing {field}.")
        for source_key in glossary.get("sources", []):
            if source_key not in SOURCE_CATALOG:
                errors.append(f"{label}: unknown source key {source_key}.")
        return errors

    def _count_input(self, packs: list[dict]) -> dict[str, int]:
        return {
            "tracks": len(packs),
            "courses": len(packs),
            "lessons": sum(len(pack.get("lessons", [])) for pack in packs),
            "quizzes": sum(len(pack.get("quiz_questions", [])) for pack in packs),
            "flashcards": sum(len(pack.get("flashcards", [])) for pack in packs),
            "glossary": sum(len(pack.get("glossary", [])) for pack in packs),
            "resources": sum(len(pack.get("resources", [])) for pack in packs),
        }

    def _publish_packs(self, packs: list[dict], *, overwrite: bool) -> dict[str, int]:
        counts = {**self._count_input(packs), "skipped": 0}
        for order, pack in enumerate(packs, start=1):
            track = self._upsert_track(pack, order=pack.get("track", {}).get("order", order))
            course = self._upsert_course(pack, track)
            lesson_by_slug = {}
            incoming_lesson_slugs = {lesson["slug"] for lesson in pack.get("lessons", [])}
            self._retire_generated_lessons_not_in_pack(course, incoming_lesson_slugs, overwrite)
            for lesson_order, lesson_data in enumerate(pack.get("lessons", []), start=1):
                lesson, skipped = self._upsert_lesson(course, lesson_data, lesson_order, track.is_premium, overwrite)
                if skipped:
                    counts["skipped"] += 1
                    continue
                lesson_by_slug[lesson.slug] = lesson
            for quiz in pack.get("quiz_questions", []):
                lesson = self._resolve_lesson(course, lesson_by_slug, quiz.get("lesson"))
                QuizQuestion.objects.update_or_create(
                    lesson=lesson,
                    prompt=quiz["prompt"],
                    defaults={
                        "options": quiz["options"],
                        "correct_answer": quiz["correct_answer"],
                        "explanation": quiz["explanation"],
                        "difficulty": quiz.get("difficulty", QuizQuestion.Difficulty.EASY),
                    },
                )
            for flashcard in pack.get("flashcards", []):
                lesson = self._resolve_lesson(course, lesson_by_slug, flashcard.get("lesson"))
                Flashcard.objects.update_or_create(
                    lesson=lesson,
                    front=flashcard["front"],
                    defaults={
                        "back": flashcard["back"],
                        "example": flashcard.get("example", ""),
                        "tag": track.slug,
                    },
                )
            for resource in pack.get("resources", []):
                self._upsert_resource(track, resource, overwrite)
            for glossary in pack.get("glossary", []):
                self._upsert_glossary(glossary, overwrite)
        return counts

    def _upsert_track(self, pack: dict, *, order: int) -> LearningTrack:
        track_data = pack["track"]
        track, _created = LearningTrack.objects.update_or_create(
            slug=track_data["slug"],
            defaults={
                "title": track_data["title"],
                "description": track_data["description"],
                "level": track_data.get("level", LearningTrack.Level.BEGINNER),
                "target_user_type": track_data.get("target_user_type", LearningTrack.TargetUserType.GENERAL),
                "estimated_minutes": track_data.get("estimated_minutes", 45),
                "is_premium": track_data.get("is_premium", False),
                "status": LearningTrack.Status.PUBLISHED,
                "order": order,
            },
        )
        return track

    def _upsert_course(self, pack: dict, track: LearningTrack) -> LearningCourse:
        course_data = pack["course"]
        course, _created = LearningCourse.objects.update_or_create(
            slug=course_data["slug"],
            defaults={
                "track": track,
                "title": course_data["title"],
                "description": course_data["description"],
                "order": 1,
                "estimated_minutes": track.estimated_minutes,
                "is_premium": track.is_premium,
                "status": LearningCourse.Status.PUBLISHED,
            },
        )
        return course

    def _upsert_lesson(
        self,
        course: LearningCourse,
        lesson_data: dict,
        lesson_order: int,
        is_premium: bool,
        overwrite: bool,
    ) -> tuple[LearningLesson, bool]:
        lesson_slug = lesson_data["slug"]
        lesson = LearningLesson.objects.filter(course=course, slug=lesson_slug).first()
        if lesson and not self._can_update(lesson, overwrite):
            return lesson, True
        if not lesson:
            lesson = LearningLesson(course=course, slug=lesson_slug)
        order = lesson_data.get("order", lesson_order)
        order_conflict = LearningLesson.objects.filter(course=course, order=order).exclude(pk=lesson.pk).first()
        if order_conflict:
            if not self._can_update(order_conflict, overwrite):
                raise CommandError(
                    f"Manual lesson order conflict in {course.slug}: "
                    f"{order_conflict.slug} already uses order {order}."
                )
            self._archive_lesson(order_conflict)
        blocks = self._lesson_blocks(lesson_data)
        now = timezone.now()
        lesson.title = lesson_data["title"]
        lesson.lesson_type = lesson_data.get("lesson_type", LearningLesson.LessonType.ARTICLE)
        lesson.summary = lesson_data["summary"]
        lesson.body = body_from_structured_content(blocks)
        lesson.structured_content = blocks
        lesson.estimated_minutes = lesson_data.get("estimated_minutes", 6)
        lesson.difficulty = lesson_data.get("difficulty", LearningLesson.Difficulty.BEGINNER)
        lesson.order = order
        lesson.xp_reward = lesson_data.get("xp_reward", 10)
        lesson.is_premium = lesson_data.get("is_premium", is_premium)
        lesson.status = LearningLesson.Status.PUBLISHED
        lesson.editorial_status = LearningLesson.EditorialStatus.REVIEWED
        lesson.last_reviewed_at = now
        lesson.next_review_due_at = now + timedelta(days=180)
        lesson.reviewer_notes = f"{PACK_MARKER}:{course.track.slug}:{lesson.slug}"
        lesson.full_clean()
        lesson.save()
        sync_learning_sources(lesson, lesson_data.get("sources", ["pesaroute_editorial"]))
        return lesson, False

    def _retire_generated_lessons_not_in_pack(
        self,
        course: LearningCourse,
        incoming_lesson_slugs: set[str],
        overwrite: bool,
    ) -> None:
        for lesson in LearningLesson.objects.filter(course=course).exclude(slug__in=incoming_lesson_slugs):
            if self._can_update(lesson, overwrite):
                self._archive_lesson(lesson)

    def _archive_lesson(self, lesson: LearningLesson) -> None:
        max_order_lesson = LearningLesson.objects.filter(course=lesson.course).order_by("-order").first()
        next_order = ((max_order_lesson.order if max_order_lesson else 0) or 0) + 1
        lesson.status = LearningLesson.Status.ARCHIVED
        lesson.order = next_order
        lesson.reviewer_notes = f"{lesson.reviewer_notes}\nArchived during content-pack import.".strip()
        lesson.save(update_fields=["status", "order", "reviewer_notes", "updated_at"])

    def _upsert_resource(self, track: LearningTrack, resource_data: dict, overwrite: bool) -> None:
        resource = LearningResource.objects.filter(title=resource_data["title"]).first()
        if resource and not self._can_update(resource, overwrite):
            return
        if not resource:
            resource = LearningResource(title=resource_data["title"])
        blocks = [
            {"type": "heading", "text": resource_data["title"]},
            {"type": "paragraph", "text": resource_data["body"]},
            {
                "type": "checklist",
                "title": "Use this checklist",
                "items": resource_data.get("items", []),
            },
            {"type": "disclaimer", "text": EDUCATIONAL_DISCLAIMER},
        ]
        now = timezone.now()
        resource.resource_type = resource_data.get("resource_type", LearningResource.ResourceType.CHECKLIST)
        resource.body = body_from_structured_content(blocks)
        resource.structured_content = blocks
        resource.related_track = track
        resource.related_product_category = self._category_for(resource_data.get("related_categories", []))
        resource.is_premium = resource_data.get("is_premium", track.is_premium)
        resource.status = LearningResource.Status.PUBLISHED
        resource.editorial_status = LearningResource.EditorialStatus.REVIEWED
        resource.last_reviewed_at = now
        resource.next_review_due_at = now + timedelta(days=180)
        resource.reviewer_notes = f"{PACK_MARKER}:resource:{slugify(resource.title)}"
        resource.full_clean()
        resource.save()
        sync_learning_sources(resource, resource_data.get("sources", ["pesaroute_editorial"]))

    def _upsert_glossary(self, glossary_data: dict, overwrite: bool) -> None:
        title = f"Glossary: {glossary_data['term']}"
        resource = LearningResource.objects.filter(title=title).first()
        if resource and not self._can_update(resource, overwrite):
            return
        if not resource:
            resource = LearningResource(title=title)
        related_categories = glossary_data.get("related_categories", [])
        blocks = [
            {"type": "definition", "term": glossary_data["term"], "text": glossary_data["definition"]},
            {"type": "scenario", "title": "Kenyan example", "text": glossary_data["example"]},
            {
                "type": "source_note",
                "text": "Verify official terms and current rules with the relevant public source where applicable.",
            },
            {"type": "disclaimer", "text": EDUCATIONAL_DISCLAIMER},
        ]
        now = timezone.now()
        resource.resource_type = LearningResource.ResourceType.GLOSSARY
        resource.body = body_from_structured_content(blocks)
        resource.structured_content = blocks
        resource.related_product_category = self._category_for(related_categories)
        resource.is_premium = False
        resource.status = LearningResource.Status.PUBLISHED
        resource.editorial_status = LearningResource.EditorialStatus.REVIEWED
        resource.last_reviewed_at = now
        resource.next_review_due_at = now + timedelta(days=365)
        resource.reviewer_notes = f"{PACK_MARKER}:glossary:{slugify(glossary_data['term'])}"
        resource.full_clean()
        resource.save()
        sync_learning_sources(resource, glossary_data.get("sources", ["pesaroute_editorial"]))

    def _lesson_blocks(self, lesson: dict) -> list[dict]:
        blocks = [
            {"type": "heading", "text": lesson["title"]},
            {"type": "paragraph", "text": lesson["introduction"]},
        ]
        for section in lesson.get("sections", []):
            blocks.append({"type": "paragraph", "text": section})
        blocks.extend(
            [
                {
                    "type": "scenario",
                    "title": lesson["scenario"].get("title", "Kenyan scenario"),
                    "text": lesson["scenario"]["text"],
                },
                {"type": "caution", "title": "Mistake to avoid", "text": lesson["mistake"]},
                {"type": "checklist", "title": "Action step", "items": [lesson["action"]]},
                {"type": "key_takeaway", "text": lesson["takeaway"]},
                {
                    "type": "source_note",
                    "text": lesson.get(
                        "source_note",
                        "Verify current details with official sources, providers, or licensed professionals.",
                    ),
                },
                {"type": "disclaimer", "text": EDUCATIONAL_DISCLAIMER},
            ]
        )
        return blocks

    def _resolve_lesson(self, course: LearningCourse, lesson_by_slug: dict[str, LearningLesson], slug: str | None):
        if slug and slug in lesson_by_slug:
            return lesson_by_slug[slug]
        if slug:
            lesson = LearningLesson.objects.filter(course=course, slug=slug).first()
            if lesson:
                return lesson
        lesson = LearningLesson.objects.filter(course=course).order_by("order").first()
        if not lesson:
            raise CommandError(f"No lesson exists for course {course.slug}")
        return lesson

    def _category_for(self, category_names: list[str]) -> ProductCategory | None:
        for category_name in category_names:
            category = ProductCategory.objects.filter(name__iexact=category_name).first()
            if category:
                return category
        return None

    def _can_update(self, obj, overwrite: bool) -> bool:
        if overwrite:
            return True
        notes = getattr(obj, "reviewer_notes", "") or ""
        return not notes or notes.startswith(GENERATED_NOTE_PREFIXES)
