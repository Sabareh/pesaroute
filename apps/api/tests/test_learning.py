import pytest
from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from billing.models import EntitlementCode, Plan
from billing.services import grant_dev_subscription
from journal.models import JournalEntry
from learning.models import (
    Badge,
    LearningCourse,
    LearningLesson,
    LearningTrack,
    QuizQuestion,
    UserBadge,
    UserLessonProgress,
    UserStreak,
    XPEvent,
)
from learning.services import ensure_default_badges
from marketplace.models import ConsultationRequest
from planning.models import SimulationRun


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return get_user_model().objects.create_user(username="learner", password="test-pass-123")


def authenticate(api_client, user):
    token, _created = Token.objects.get_or_create(user=user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")


def create_lesson(*, is_premium=False, lesson_type=LearningLesson.LessonType.ARTICLE):
    track = LearningTrack.objects.create(
        title="Money Foundations",
        slug="money-foundations",
        description="Start here.",
        level=LearningTrack.Level.BEGINNER,
        target_user_type=LearningTrack.TargetUserType.GENERAL,
        estimated_minutes=20,
        is_premium=is_premium,
        status=LearningTrack.Status.PUBLISHED,
        order=1,
    )
    course = LearningCourse.objects.create(
        track=track,
        title="Foundation course",
        slug="foundation-course",
        description="Core money basics.",
        order=1,
        estimated_minutes=20,
        is_premium=is_premium,
        status=LearningCourse.Status.PUBLISHED,
    )
    return LearningLesson.objects.create(
        course=course,
        title="What is an emergency fund?",
        slug="what-is-an-emergency-fund",
        lesson_type=lesson_type,
        body="Educational content only. No investment execution.",
        summary="Emergency money should be liquid.",
        order=1,
        xp_reward=10,
        is_premium=is_premium,
        status=LearningLesson.Status.PUBLISHED,
    )


@pytest.mark.django_db
def test_anonymous_user_can_list_tracks(api_client):
    create_lesson()

    response = api_client.get("/api/learning/tracks/")

    assert response.status_code == 200
    assert response.json()["results"][0]["slug"] == "money-foundations"
    assert response.json()["results"][0]["lesson_count"] == 1


@pytest.mark.django_db
def test_anonymous_user_cannot_save_progress(api_client):
    lesson = create_lesson()

    response = api_client.post(f"/api/learning/lessons/{lesson.id}/complete/", {}, format="json")

    assert response.status_code in {401, 403}
    assert UserLessonProgress.objects.count() == 0


@pytest.mark.django_db
def test_authenticated_user_can_complete_lesson_and_get_xp_streak_badge(api_client, user):
    ensure_default_badges()
    lesson = create_lesson()
    authenticate(api_client, user)

    response = api_client.post(f"/api/learning/lessons/{lesson.id}/complete/", {"score": "100.00"}, format="json")

    assert response.status_code == 200
    progress = UserLessonProgress.objects.get(user=user, lesson=lesson)
    assert progress.status == UserLessonProgress.Status.COMPLETED
    assert XPEvent.objects.filter(user=user, source_type=XPEvent.SourceType.LESSON, xp_amount=10).exists()
    assert UserStreak.objects.get(user=user).current_streak_days == 1
    assert UserBadge.objects.filter(user=user, badge__slug="first-step-investor").exists()


@pytest.mark.django_db
def test_complete_lesson_with_simulator_awards_extra_xp(api_client, user):
    lesson = create_lesson(lesson_type=LearningLesson.LessonType.SIMULATION)
    simulation_run = SimulationRun.objects.create(
        user=user,
        simulator_type=SimulationRun.SimulatorType.MMF,
        inputs={"principal": "5000.00"},
        outputs={"projected_value": "5300.00"},
        disclaimer="For education only.",
    )
    authenticate(api_client, user)

    response = api_client.post(
        f"/api/learning/lessons/{lesson.id}/complete-with-action/",
        {"simulation_run_id": simulation_run.id},
        format="json",
    )

    assert response.status_code == 200
    simulation_run.refresh_from_db()
    assert simulation_run.learning_lesson == lesson
    assert response.json()["action_xp_awarded"] == 25
    assert XPEvent.objects.filter(user=user, source_type=XPEvent.SourceType.LESSON, xp_amount=10).exists()
    assert XPEvent.objects.filter(user=user, source_type=XPEvent.SourceType.SIMULATION, xp_amount=25).exists()


@pytest.mark.django_db
def test_complete_lesson_with_journal_awards_extra_xp(api_client, user):
    lesson = create_lesson(lesson_type=LearningLesson.LessonType.JOURNAL_PROMPT)
    journal_entry = JournalEntry.objects.create(
        user=user,
        goal="First investment",
        decision="Compare before committing money.",
        amount_display_mode=JournalEntry.AmountDisplayMode.HIDDEN,
        reason="For education only.",
    )
    authenticate(api_client, user)

    response = api_client.post(
        f"/api/learning/lessons/{lesson.id}/complete-with-action/",
        {"journal_entry_id": journal_entry.id, "score": "100.00"},
        format="json",
    )

    assert response.status_code == 200
    journal_entry.refresh_from_db()
    assert journal_entry.learning_lesson == lesson
    assert journal_entry.learning_course == lesson.course
    assert journal_entry.learning_track == lesson.course.track
    assert response.json()["action_xp_awarded"] == 20
    assert XPEvent.objects.filter(user=user, source_type=XPEvent.SourceType.JOURNAL, xp_amount=20).exists()


@pytest.mark.django_db
def test_streak_updates_once_per_day(api_client, user):
    first_lesson = create_lesson()
    second_lesson = LearningLesson.objects.create(
        course=first_lesson.course,
        title="Liquidity check",
        slug="liquidity-check",
        lesson_type=LearningLesson.LessonType.ARTICLE,
        body="Compare before committing money.",
        summary="Check access before return.",
        order=2,
        xp_reward=10,
        status=LearningLesson.Status.PUBLISHED,
    )
    authenticate(api_client, user)

    api_client.post(f"/api/learning/lessons/{first_lesson.id}/complete/", {}, format="json")
    api_client.post(f"/api/learning/lessons/{second_lesson.id}/complete/", {}, format="json")

    assert UserStreak.objects.get(user=user).current_streak_days == 1


@pytest.mark.django_db
def test_submit_quiz_awards_xp_and_marks_quiz_lesson_complete(api_client, user):
    lesson = create_lesson(lesson_type=LearningLesson.LessonType.QUIZ)
    question = QuizQuestion.objects.create(
        lesson=lesson,
        prompt="What should happen before money moves?",
        options=["Pressure", "Learning", "PIN sharing"],
        correct_answer="Learning",
        explanation="Learning comes before money moves.",
        difficulty=QuizQuestion.Difficulty.EASY,
    )
    authenticate(api_client, user)

    response = api_client.post(f"/api/learning/quiz/{question.id}/submit/", {"answer": "Learning"}, format="json")

    assert response.status_code == 200
    assert response.json()["correct"] is True
    assert UserLessonProgress.objects.get(user=user, lesson=lesson).status == UserLessonProgress.Status.COMPLETED
    assert XPEvent.objects.filter(user=user, source_type=XPEvent.SourceType.QUIZ, xp_amount=20).exists()


@pytest.mark.django_db
def test_premium_lesson_requires_premium_learning_entitlement(api_client, user):
    lesson = create_lesson(is_premium=True)
    authenticate(api_client, user)

    blocked = api_client.post(f"/api/learning/lessons/{lesson.id}/complete/", {}, format="json")

    assert blocked.status_code == 403
    assert UserLessonProgress.objects.count() == 0

    grant_dev_subscription(user, plan_code=Plan.Code.PREMIUM_MONTHLY)
    allowed = api_client.post(f"/api/learning/lessons/{lesson.id}/complete/", {}, format="json")

    assert allowed.status_code == 200
    plan_entitlements = set(Plan.objects.get(code=Plan.Code.PREMIUM_MONTHLY).included_entitlements)
    assert EntitlementCode.PREMIUM_LEARNING in plan_entitlements
    assert UserLessonProgress.objects.get(user=user, lesson=lesson).status == UserLessonProgress.Status.COMPLETED


@pytest.mark.django_db
def test_learning_home_endpoint_returns_summary(api_client, user):
    lesson = create_lesson()
    authenticate(api_client, user)
    api_client.post(f"/api/learning/lessons/{lesson.id}/complete/", {}, format="json")

    response = api_client.get("/api/learning/home/")

    assert response.status_code == 200
    assert response.json()["total_xp"] >= 10
    assert response.json()["recommended_track"]["slug"] == "money-foundations"
    assert response.json()["daily_challenge"]["action"] == "journal_reflection"


@pytest.mark.django_db
def test_learning_progress_counts_simulations_and_journal_reflections(api_client, user):
    lesson = create_lesson(lesson_type=LearningLesson.LessonType.SIMULATION)
    SimulationRun.objects.create(
        user=user,
        learning_lesson=lesson,
        simulator_type=SimulationRun.SimulatorType.MMF,
        inputs={},
        outputs={},
        disclaimer="For education only.",
    )
    JournalEntry.objects.create(
        user=user,
        learning_lesson=lesson,
        learning_course=lesson.course,
        learning_track=lesson.course.track,
        decision="Use ranges if I do not want exact amounts.",
    )
    authenticate(api_client, user)
    api_client.post(f"/api/learning/lessons/{lesson.id}/complete/", {}, format="json")

    response = api_client.get("/api/learning/progress/")

    assert response.status_code == 200
    assert response.json()["simulations_completed"] == 1
    assert response.json()["journal_reflections_completed"] == 1
    assert response.json()["completed_lessons"][0]["lesson"] == lesson.id


@pytest.mark.django_db
def test_professional_review_request_can_include_learning_context(api_client, user):
    lesson = create_lesson()
    journal_entry = JournalEntry.objects.create(
        user=user,
        goal="Treasury bills",
        decision="Speak to a licensed professional when needed.",
        amount_display_mode=JournalEntry.AmountDisplayMode.HIDDEN,
    )
    authenticate(api_client, user)

    response = api_client.post(
        "/api/marketplace/consultation-requests/",
        {
            "learning_track": lesson.course.track.id,
            "journal_entry": journal_entry.id,
            "category": ConsultationRequest.Category.TREASURY,
            "amount_display_mode": ConsultationRequest.AmountDisplayMode.HIDDEN,
            "user_question": "Can you review my T-bill learning notes?",
            "timeline": ConsultationRequest.Timeline.FLEXIBLE,
            "risk_preference": ConsultationRequest.RiskPreference.NOT_SURE,
            "preferred_language": ConsultationRequest.PreferredLanguage.ENGLISH,
        },
        format="json",
    )

    assert response.status_code == 201
    consultation = ConsultationRequest.objects.get(id=response.json()["id"])
    assert consultation.learning_track == lesson.course.track
    assert consultation.journal_entry == journal_entry


@pytest.mark.django_db
def test_badges_endpoint_returns_available_and_earned_badges(api_client, user):
    ensure_default_badges()
    badge = Badge.objects.get(slug="first-step-investor")
    UserBadge.objects.create(user=user, badge=badge)
    authenticate(api_client, user)

    response = api_client.get("/api/learning/badges/")

    assert response.status_code == 200
    assert any(item["slug"] == "first-step-investor" for item in response.json()["available"])
    assert response.json()["earned"][0]["badge"]["slug"] == "first-step-investor"
