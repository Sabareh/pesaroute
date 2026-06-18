from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from billing.models import EntitlementCode
from billing.services import is_authenticated_user, user_has_entitlement
from learning.models import (
    Assessment,
    AssessmentQuestion,
    Badge,
    Flashcard,
    LearningCourse,
    LearningLesson,
    LearningTrack,
    PracticeQuestion,
    PracticeSet,
    QuizQuestion,
    UserAssessmentResult,
    UserBadge,
    UserCourseProgress,
    UserLessonProgress,
    UserLibraryItem,
    UserStreak,
    XPEvent,
)

LESSON_XP = 10
QUIZ_XP = 5
FLASHCARD_REVIEW_XP = 5
SIMULATION_XP = 30
JOURNAL_XP = 20
SCAM_CHECK_XP = 20
PRACTICE_SET_XP = 25
ASSESSMENT_XP = 100
STREAK_BONUS_XP = 25
COURSE_XP = 100
TRACK_XP = 500

BADGE_SEEDS = [
    {
        "name": "First Step Investor",
        "slug": "first-step-investor",
        "description": "Completed the first PesaRoute learning step.",
        "icon_key": "route",
        "criteria_key": "first_lesson_completed",
    },
    {
        "name": "Scam Defender",
        "slug": "scam-defender",
        "description": "Completed a scam defense learning activity.",
        "icon_key": "shield",
        "criteria_key": "scam_defense_completed",
    },
    {
        "name": "MMF Beginner",
        "slug": "mmf-beginner",
        "description": "Completed a Money Market Fund learning activity.",
        "icon_key": "money-market",
        "criteria_key": "mmf_completed",
    },
    {
        "name": "Treasury Starter",
        "slug": "treasury-starter",
        "description": "Completed a Treasury bills or bonds learning activity.",
        "icon_key": "treasury",
        "criteria_key": "treasury_completed",
    },
    {
        "name": "SACCO Smart Member",
        "slug": "sacco-smart-member",
        "description": "Completed a SACCO learning activity.",
        "icon_key": "sacco",
        "criteria_key": "sacco_completed",
    },
    {
        "name": "Chama Ready",
        "slug": "chama-ready",
        "description": "Completed a chama learning activity.",
        "icon_key": "chama",
        "criteria_key": "chama_completed",
    },
    {
        "name": "Global Investing Learner",
        "slug": "global-investing-learner",
        "description": "Completed a global investing learning activity.",
        "icon_key": "global",
        "criteria_key": "global_completed",
    },
    {
        "name": "Land Due Diligence Aware",
        "slug": "land-due-diligence-aware",
        "description": "Completed a land due diligence learning activity.",
        "icon_key": "land",
        "criteria_key": "land_completed",
    },
    {
        "name": "Private Planner",
        "slug": "private-planner",
        "description": "Used the learning loop to plan privately before moving money.",
        "icon_key": "lock",
        "criteria_key": "journal_prompt_completed",
    },
]


def ensure_default_badges() -> list[Badge]:
    badges: list[Badge] = []
    for data in BADGE_SEEDS:
        badge, _created = Badge.objects.update_or_create(slug=data["slug"], defaults=data)
        badges.append(badge)
    return badges


def can_access_premium_learning(user) -> bool:
    return user_has_entitlement(user, EntitlementCode.PREMIUM_LEARNING)


def can_access_lesson(user, lesson: LearningLesson) -> bool:
    if not lesson.is_premium and not lesson.course.is_premium and not lesson.course.track.is_premium:
        return True
    return can_access_premium_learning(user)


def require_lesson_access(user, lesson: LearningLesson) -> None:
    if not can_access_lesson(user, lesson):
        raise PermissionDenied("Premium learning entitlement required.")


def touch_streak(user) -> UserStreak | None:
    if not is_authenticated_user(user):
        return None
    today = timezone.localdate()
    streak, _created = UserStreak.objects.get_or_create(user=user)
    if streak.last_activity_date == today:
        return streak
    if streak.last_activity_date == today - timedelta(days=1):
        streak.current_streak_days += 1
    else:
        streak.current_streak_days = 1
    streak.longest_streak_days = max(streak.longest_streak_days, streak.current_streak_days)
    streak.last_activity_date = today
    streak.save(update_fields=["current_streak_days", "longest_streak_days", "last_activity_date", "updated_at"])
    # Daily streak bonus. Safe from recursion: the nested award_xp -> touch_streak call
    # returns early now that last_activity_date == today.
    award_xp(user, XPEvent.SourceType.STREAK, today.isoformat(), STREAK_BONUS_XP)
    return streak


def award_xp(user, source_type: str, source_id: str | int, xp_amount: int) -> XPEvent | None:
    if not is_authenticated_user(user):
        return None
    event, created = XPEvent.objects.get_or_create(
        user=user,
        source_type=source_type,
        source_id=str(source_id),
        defaults={"xp_amount": xp_amount},
    )
    if created:
        touch_streak(user)
    return event


def total_xp(user) -> int:
    if not is_authenticated_user(user):
        return 0
    value = XPEvent.objects.filter(user=user).aggregate(total=Sum("xp_amount"))["total"]
    return int(value or 0)


def award_badge(user, slug: str) -> UserBadge | None:
    if not is_authenticated_user(user):
        return None
    ensure_default_badges()
    badge = Badge.objects.get(slug=slug)
    user_badge, _created = UserBadge.objects.get_or_create(user=user, badge=badge)
    return user_badge


def maybe_award_lesson_badges(user, lesson: LearningLesson) -> None:
    if not is_authenticated_user(user):
        return
    award_badge(user, "first-step-investor")
    track_slug = lesson.course.track.slug
    course_slug = lesson.course.slug
    lesson_type = lesson.lesson_type
    slug_text = f"{track_slug} {course_slug} {lesson.slug}".lower()
    if "scam" in slug_text:
        award_badge(user, "scam-defender")
    if "money-market" in slug_text or "mmf" in slug_text:
        award_badge(user, "mmf-beginner")
    if "treasury" in slug_text:
        award_badge(user, "treasury-starter")
    if "sacco" in slug_text:
        award_badge(user, "sacco-smart-member")
    if "chama" in slug_text:
        award_badge(user, "chama-ready")
    if "global" in slug_text:
        award_badge(user, "global-investing-learner")
    if "land" in slug_text:
        award_badge(user, "land-due-diligence-aware")
    if lesson_type == LearningLesson.LessonType.JOURNAL_PROMPT:
        award_badge(user, "private-planner")


def update_course_progress(
    user,
    course: LearningCourse,
    last_lesson: LearningLesson | None = None,
) -> UserCourseProgress:
    lessons = LearningLesson.objects.filter(course=course, status=LearningLesson.Status.PUBLISHED)
    total_lessons = lessons.count()
    completed_lessons = UserLessonProgress.objects.filter(
        user=user,
        lesson__in=lessons,
        status=UserLessonProgress.Status.COMPLETED,
    ).count()
    percent = Decimal("0.00") if total_lessons == 0 else Decimal(completed_lessons * 100) / Decimal(total_lessons)
    completed_at = timezone.now() if total_lessons > 0 and completed_lessons == total_lessons else None
    progress, _created = UserCourseProgress.objects.update_or_create(
        user=user,
        course=course,
        defaults={
            "percent_complete": percent.quantize(Decimal("0.01")),
            "last_lesson": last_lesson,
            "completed_at": completed_at,
        },
    )
    if completed_at:
        award_xp(user, XPEvent.SourceType.COURSE, course.id, COURSE_XP)
        maybe_award_track_completion(user, course.track)
    return progress


def maybe_award_track_completion(user, track: LearningTrack) -> None:
    courses = LearningCourse.objects.filter(track=track, status=LearningCourse.Status.PUBLISHED)
    if not courses.exists():
        return
    completed_courses = UserCourseProgress.objects.filter(
        user=user,
        course__in=courses,
        percent_complete__gte=100,
    ).count()
    if completed_courses == courses.count():
        award_xp(user, XPEvent.SourceType.TRACK, track.id, TRACK_XP)


@transaction.atomic
def start_lesson(user, lesson: LearningLesson) -> UserLessonProgress:
    require_lesson_access(user, lesson)
    progress, _created = UserLessonProgress.objects.get_or_create(user=user, lesson=lesson)
    if progress.status == UserLessonProgress.Status.NOT_STARTED:
        progress.status = UserLessonProgress.Status.IN_PROGRESS
        progress.save(update_fields=["status", "updated_at"])
    touch_streak(user)
    return progress


@transaction.atomic
def complete_lesson(user, lesson: LearningLesson, score=None) -> UserLessonProgress:
    require_lesson_access(user, lesson)
    progress, _created = UserLessonProgress.objects.get_or_create(user=user, lesson=lesson)
    already_completed = progress.status == UserLessonProgress.Status.COMPLETED
    progress.status = UserLessonProgress.Status.COMPLETED
    progress.completed_at = progress.completed_at or timezone.now()
    progress.attempts += 1
    if score is not None:
        progress.score = score
    progress.save(update_fields=["status", "completed_at", "attempts", "score", "updated_at"])
    if not already_completed:
        award_xp(user, XPEvent.SourceType.LESSON, lesson.id, lesson.xp_reward or LESSON_XP)
        maybe_award_lesson_badges(user, lesson)
    update_course_progress(user, lesson.course, lesson)
    return progress


@transaction.atomic
def complete_lesson_with_action(
    user,
    lesson: LearningLesson,
    *,
    score=None,
    simulation_run_id: int | None = None,
    journal_entry_id: int | None = None,
    consultation_request_id: int | None = None,
) -> dict:
    progress = complete_lesson(user, lesson, score=score)
    action_xp_awarded = 0
    linked_actions: list[str] = []

    if simulation_run_id:
        from planning.models import SimulationRun

        simulation_run = SimulationRun.objects.select_for_update().filter(pk=simulation_run_id).first()
        if not simulation_run:
            raise PermissionDenied("Simulation run not found.")
        if simulation_run.user_id not in {None, user.id}:
            raise PermissionDenied("Simulation run does not belong to this user.")
        if simulation_run.learning_lesson_id and simulation_run.learning_lesson_id != lesson.id:
            raise PermissionDenied("Simulation run is linked to another lesson.")
        if simulation_run.learning_lesson_id != lesson.id:
            simulation_run.learning_lesson = lesson
            simulation_run.save(update_fields=["learning_lesson"])
        source_id = f"lesson:{lesson.id}:simulation:{simulation_run.id}"
        already_awarded = XPEvent.objects.filter(
            user=user,
            source_type=XPEvent.SourceType.SIMULATION,
            source_id=source_id,
        ).exists()
        award_xp(user, XPEvent.SourceType.SIMULATION, source_id, SIMULATION_XP)
        if not already_awarded:
            action_xp_awarded += SIMULATION_XP
        linked_actions.append("simulation")

    if journal_entry_id:
        from journal.models import JournalEntry

        journal_entry = JournalEntry.objects.select_for_update().filter(pk=journal_entry_id, user=user).first()
        if not journal_entry:
            raise PermissionDenied("Journal entry does not belong to this user.")
        journal_entry.learning_lesson = journal_entry.learning_lesson or lesson
        journal_entry.learning_course = journal_entry.learning_course or lesson.course
        journal_entry.learning_track = journal_entry.learning_track or lesson.course.track
        journal_entry.save(update_fields=["learning_lesson", "learning_course", "learning_track", "updated_at"])
        source_id = f"lesson:{lesson.id}:journal:{journal_entry.id}"
        already_awarded = XPEvent.objects.filter(
            user=user,
            source_type=XPEvent.SourceType.JOURNAL,
            source_id=source_id,
        ).exists()
        award_xp(user, XPEvent.SourceType.JOURNAL, source_id, JOURNAL_XP)
        if not already_awarded:
            action_xp_awarded += JOURNAL_XP
        linked_actions.append("journal")

    if consultation_request_id:
        from marketplace.models import ConsultationRequest

        consultation_request = (
            ConsultationRequest.objects.select_for_update().filter(pk=consultation_request_id, user=user).first()
        )
        if not consultation_request:
            raise PermissionDenied("Consultation request does not belong to this user.")
        if not consultation_request.learning_track_id:
            consultation_request.learning_track = lesson.course.track
        if journal_entry_id and not consultation_request.journal_entry_id:
            consultation_request.journal_entry_id = journal_entry_id
        consultation_request.save(update_fields=["learning_track", "journal_entry", "updated_at"])
        linked_actions.append("professional_review")

    return {
        "progress": progress,
        "action_xp_awarded": action_xp_awarded,
        "linked_actions": linked_actions,
        "total_xp": total_xp(user),
    }


@transaction.atomic
def submit_quiz_answer(user, question: QuizQuestion, answer: str) -> dict:
    require_lesson_access(user, question.lesson)
    progress, _created = UserLessonProgress.objects.get_or_create(user=user, lesson=question.lesson)
    progress.attempts += 1
    correct = answer.strip() == question.correct_answer
    if correct:
        progress.score = Decimal("100.00")
        if question.lesson.lesson_type == LearningLesson.LessonType.QUIZ:
            progress.status = UserLessonProgress.Status.COMPLETED
            progress.completed_at = progress.completed_at or timezone.now()
        award_xp(user, XPEvent.SourceType.QUIZ, question.id, QUIZ_XP)
        maybe_award_lesson_badges(user, question.lesson)
    elif progress.status == UserLessonProgress.Status.NOT_STARTED:
        progress.status = UserLessonProgress.Status.IN_PROGRESS
    progress.save(update_fields=["attempts", "score", "status", "completed_at", "updated_at"])
    update_course_progress(user, question.lesson.course, question.lesson)
    touch_streak(user)
    return {
        "correct": correct,
        "correct_answer": question.correct_answer if correct else "",
        "explanation": question.explanation,
        "progress": progress,
    }


@transaction.atomic
def review_flashcard(user, flashcard: Flashcard) -> dict:
    require_lesson_access(user, flashcard.lesson)
    progress, _created = UserLessonProgress.objects.get_or_create(user=user, lesson=flashcard.lesson)
    if progress.status == UserLessonProgress.Status.NOT_STARTED:
        progress.status = UserLessonProgress.Status.IN_PROGRESS
    progress.attempts += 1
    progress.save(update_fields=["status", "attempts", "updated_at"])
    award_xp(user, XPEvent.SourceType.FLASHCARD, flashcard.id, FLASHCARD_REVIEW_XP)
    return {"progress": progress, "xp_awarded": FLASHCARD_REVIEW_XP}


def can_access_practice_set(user, practice_set: PracticeSet) -> bool:
    return not practice_set.is_premium or can_access_premium_learning(user)


def can_access_assessment(user, assessment: Assessment) -> bool:
    return not assessment.is_premium or can_access_premium_learning(user)


@transaction.atomic
def submit_practice_set(user, practice_set: PracticeSet, answers: dict[str, str]) -> dict:
    """
    Grade a practice set. answers maps str(question_id) -> chosen answer.
    Awards PRACTICE_SET_XP once per practice set (idempotent via XPEvent unique key).
    """
    if not can_access_practice_set(user, practice_set):
        raise PermissionDenied("Premium learning entitlement required.")
    questions = list(practice_set.questions.all())
    total = len(questions)
    results = []
    correct_count = 0
    for question in questions:
        given = (answers.get(str(question.id)) or "").strip()
        is_correct = given == question.correct_answer
        if is_correct:
            correct_count += 1
        results.append(
            {
                "question_id": question.id,
                "correct": is_correct,
                "correct_answer": question.correct_answer,
                "explanation": question.explanation,
            }
        )
    score = round((correct_count / total) * 100, 2) if total else 0.0
    already_awarded = XPEvent.objects.filter(
        user=user, source_type=XPEvent.SourceType.PRACTICE, source_id=str(practice_set.id)
    ).exists()
    award_xp(user, XPEvent.SourceType.PRACTICE, practice_set.id, PRACTICE_SET_XP)
    touch_streak(user)
    return {
        "practice_set_id": practice_set.id,
        "total_questions": total,
        "correct_count": correct_count,
        "score": score,
        "results": results,
        "xp_awarded": 0 if already_awarded else PRACTICE_SET_XP,
        "total_xp": total_xp(user),
    }


def _band_label(bands: dict, percent: float) -> str:
    if not bands:
        return ""
    for bound in sorted(bands.keys(), key=lambda value: int(value)):
        if percent <= int(bound):
            return bands[bound]
    # Fall back to the highest band.
    highest = max(bands.keys(), key=lambda value: int(value))
    return bands[highest]


@transaction.atomic
def submit_assessment(user, assessment: Assessment, answers: dict[str, str]) -> dict:
    """
    Score an assessment. answers maps str(question_id) -> chosen option value.

    KNOWLEDGE assessments score percent-correct against option "correct" flags.
    PROFILE assessments sum option "weight" values into a 0-100 band label.
    Awards ASSESSMENT_XP once when passed (idempotent via XPEvent unique key).
    """
    if not can_access_assessment(user, assessment):
        raise PermissionDenied("Premium learning entitlement required.")
    questions = list(assessment.questions.all())
    total = len(questions)
    if assessment.scoring == Assessment.Scoring.KNOWLEDGE:
        correct = 0
        for question in questions:
            given = (answers.get(str(question.id)) or "").strip()
            option = next((opt for opt in question.options if str(opt.get("value")) == given), None)
            if option and option.get("correct"):
                correct += 1
        percent = round((correct / total) * 100, 2) if total else 0.0
    else:
        max_weight = 0
        earned_weight = 0
        for question in questions:
            weights = [int(opt.get("weight", 0)) for opt in question.options]
            max_weight += max(weights) if weights else 0
            given = (answers.get(str(question.id)) or "").strip()
            option = next((opt for opt in question.options if str(opt.get("value")) == given), None)
            earned_weight += int(option.get("weight", 0)) if option else 0
        percent = round((earned_weight / max_weight) * 100, 2) if max_weight else 0.0

    result_label = _band_label(assessment.result_bands, percent)
    passed = percent >= assessment.pass_threshold
    result, _created = UserAssessmentResult.objects.update_or_create(
        user=user,
        assessment=assessment,
        defaults={
            "score": Decimal(str(percent)),
            "result_label": result_label,
            "answers": answers,
            "passed": passed,
            "completed_at": timezone.now(),
        },
    )
    xp_awarded = 0
    if passed:
        already_awarded = XPEvent.objects.filter(
            user=user, source_type=XPEvent.SourceType.ASSESSMENT, source_id=str(assessment.id)
        ).exists()
        award_xp(user, XPEvent.SourceType.ASSESSMENT, assessment.id, ASSESSMENT_XP)
        xp_awarded = 0 if already_awarded else ASSESSMENT_XP
    touch_streak(user)
    return {
        "assessment_id": assessment.id,
        "score": percent,
        "result_label": result_label,
        "passed": passed,
        "xp_awarded": xp_awarded,
        "total_xp": total_xp(user),
        "result_id": result.id,
    }


def add_to_library(user, track: LearningTrack) -> UserLibraryItem:
    item, _created = UserLibraryItem.objects.get_or_create(user=user, track=track)
    return item
