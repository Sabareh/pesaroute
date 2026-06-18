from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from datetime import timedelta

from django.utils import timezone

from catalog.models import ProductPassport
from learning.content import (
    find_banned_learning_phrase,
    flatten_structured_content,
    has_disclaimer_block,
    is_generic_placeholder,
)
from learning.models import LearningLesson, LearningResource


@dataclass(frozen=True)
class QualityResult:
    score: int
    flags: list[str]
    source_confidence: str
    freshness_status: str


def score_label(score: int) -> str:
    if score >= 90:
        return "strong"
    if score >= 70:
        return "acceptable"
    if score >= 40:
        return "thin"
    return "placeholder/poor"


def source_confidence_from_levels(levels: Iterable[str], *, editorial_status: str) -> str:
    unique_levels = {level for level in levels if level}
    if not unique_levels:
        if editorial_status in {
            LearningLesson.EditorialStatus.REVIEWED,
            LearningLesson.EditorialStatus.PUBLISHED,
            LearningResource.EditorialStatus.REVIEWED,
            LearningResource.EditorialStatus.PUBLISHED,
        }:
            return LearningLesson.SourceConfidence.EDITORIAL
        return LearningLesson.SourceConfidence.UNKNOWN
    if unique_levels == {"official"}:
        return LearningLesson.SourceConfidence.OFFICIAL
    if unique_levels == {"provider"}:
        return LearningLesson.SourceConfidence.PROVIDER
    if unique_levels == {"editorial"}:
        return LearningLesson.SourceConfidence.EDITORIAL
    return LearningLesson.SourceConfidence.MIXED


def freshness_status(last_reviewed_at, next_review_due_at, *, acceptable_days: int = 30) -> str:
    now = timezone.now()
    if not last_reviewed_at and not next_review_due_at:
        return "unknown"
    if next_review_due_at and next_review_due_at < now:
        return "stale"
    if next_review_due_at and next_review_due_at <= now + timedelta(days=acceptable_days):
        return "acceptable"
    return "fresh"


def structured_block_count(blocks: list[dict], block_type: str) -> int:
    return sum(1 for block in blocks or [] if block.get("type") == block_type)


def score_lesson(lesson: LearningLesson) -> QualityResult:
    flags: list[str] = []
    score = 0
    blocks = lesson.structured_content or []
    flattened = flatten_structured_content(blocks)
    body_text = f"{lesson.summary}\n{lesson.body}\n{flattened}"

    if blocks:
        score += 12
    else:
        flags.append("missing_structured_content")

    if len(body_text) >= 1200:
        score += 12
    elif len(body_text) >= 700:
        score += 8
    else:
        flags.append("short_content")

    teaching_sections = max(0, structured_block_count(blocks, "paragraph") - 1)
    if teaching_sections >= 3:
        score += 12
    else:
        flags.append("few_teaching_sections")

    if structured_block_count(blocks, "scenario") > 0:
        score += 10
    else:
        flags.append("missing_kenyan_scenario")

    if lesson.quiz_questions.exists() or lesson.lesson_type in {
        LearningLesson.LessonType.QUIZ,
        LearningLesson.LessonType.SIMULATION,
        LearningLesson.LessonType.JOURNAL_PROMPT,
        LearningLesson.LessonType.CHECKLIST,
    }:
        score += 10
    else:
        flags.append("missing_quiz_or_practice")

    if lesson.flashcards.exists():
        score += 8
    else:
        flags.append("missing_flashcards")

    source_levels = list(lesson.content_sources.values_list("reliability_level", flat=True))
    source_confidence = source_confidence_from_levels(source_levels, editorial_status=lesson.editorial_status)
    if source_levels or source_confidence == LearningLesson.SourceConfidence.EDITORIAL:
        score += 12
    else:
        flags.append("missing_source_references")

    if has_disclaimer_block(blocks):
        score += 10
    else:
        flags.append("missing_disclaimer")

    banned_phrase = find_banned_learning_phrase(body_text)
    if banned_phrase:
        flags.append(f"banned_phrase:{banned_phrase}")
    else:
        score += 8

    freshness = freshness_status(lesson.last_reviewed_at, lesson.next_review_due_at)
    if freshness == "fresh":
        score += 6
    elif freshness == "acceptable":
        score += 3
        flags.append("review_due_soon")
    else:
        flags.append("stale_or_unreviewed")

    if is_generic_placeholder(lesson.body) or is_generic_placeholder(flattened):
        flags.append("placeholder_content")
        score = min(score, 35)

    return QualityResult(
        score=max(0, min(100, score)),
        flags=sorted(set(flags)),
        source_confidence=source_confidence,
        freshness_status=freshness,
    )


def score_resource(resource: LearningResource) -> QualityResult:
    flags: list[str] = []
    score = 0
    blocks = resource.structured_content or []
    flattened = flatten_structured_content(blocks)
    body_text = f"{resource.body}\n{flattened}"

    if blocks:
        score += 15
    else:
        flags.append("missing_structured_content")

    if len(body_text) >= 700:
        score += 18
    elif len(body_text) >= 300:
        score += 12
    else:
        flags.append("short_content")

    if resource.resource_type == LearningResource.ResourceType.GLOSSARY:
        if structured_block_count(blocks, "definition") > 0 and structured_block_count(blocks, "scenario") > 0:
            score += 18
        else:
            flags.append("glossary_missing_example")
    elif structured_block_count(blocks, "checklist") > 0 or structured_block_count(blocks, "scenario") > 0:
        score += 18
    else:
        flags.append("missing_action_or_example")

    source_levels = list(resource.content_sources.values_list("reliability_level", flat=True))
    source_confidence = source_confidence_from_levels(source_levels, editorial_status=resource.editorial_status)
    if source_levels or source_confidence == LearningResource.SourceConfidence.EDITORIAL:
        score += 18
    else:
        flags.append("missing_source_references")

    if has_disclaimer_block(blocks):
        score += 14
    else:
        flags.append("missing_disclaimer")

    banned_phrase = find_banned_learning_phrase(body_text)
    if banned_phrase:
        flags.append(f"banned_phrase:{banned_phrase}")
    else:
        score += 10

    freshness = freshness_status(resource.last_reviewed_at, resource.next_review_due_at)
    if freshness == "fresh":
        score += 7
    elif freshness == "acceptable":
        score += 3
        flags.append("review_due_soon")
    else:
        flags.append("stale_or_unreviewed")

    if is_generic_placeholder(resource.body) or is_generic_placeholder(flattened):
        flags.append("placeholder_content")
        score = min(score, 35)

    return QualityResult(
        score=max(0, min(100, score)),
        flags=sorted(set(flags)),
        source_confidence=source_confidence,
        freshness_status=freshness,
    )


def passport_freshness(passport: ProductPassport) -> str:
    status = freshness_status(passport.last_verified_at, passport.next_review_due_at)
    if status == "unknown" and passport.data_freshness:
        return passport.data_freshness
    return status
