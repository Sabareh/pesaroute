"""
Tests for the rebuilt learning information architecture:
- dashboard endpoint
- track/course outline (course -> module -> lesson)
- practice sets (list, detail, submit, XP, idempotency)
- assessments (list, detail, submit, scoring, XP, idempotency)
- library (save + list)
- premium gating
- anonymous browse vs. save/submit
- public payloads never leak correct answers / option weights
"""
from __future__ import annotations

import pytest
from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from billing.models import Plan
from billing.services import grant_dev_subscription
from learning.models import (
    Assessment,
    AssessmentQuestion,
    LearningCourse,
    LearningLesson,
    LearningModule,
    LearningTrack,
    PracticeQuestion,
    PracticeSet,
    UserLibraryItem,
    XPEvent,
)


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return get_user_model().objects.create_user(username="learner", password="test-pass-123")


def authenticate(api_client, user):
    token, _created = Token.objects.get_or_create(user=user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")


def make_track(*, is_premium=False):
    track = LearningTrack.objects.create(
        title="Money Foundations",
        slug="money-foundations",
        description="Start here.",
        status=LearningTrack.Status.PUBLISHED,
        is_premium=is_premium,
        order=1,
    )
    course = LearningCourse.objects.create(
        track=track,
        title="Core course",
        slug="core-course",
        order=1,
        is_premium=is_premium,
        status=LearningCourse.Status.PUBLISHED,
    )
    module = LearningModule.objects.create(
        course=course,
        title="Core chapter",
        slug="core-chapter",
        order=1,
        status=LearningModule.Status.PUBLISHED,
    )
    LearningLesson.objects.create(
        course=course,
        module=module,
        title="What is liquidity?",
        slug="what-is-liquidity",
        lesson_type=LearningLesson.LessonType.CONCEPT,
        body="Liquidity is how fast you can access money.",
        summary="Access matters.",
        order=1,
        status=LearningLesson.Status.PUBLISHED,
        is_premium=is_premium,
    )
    return track, course, module


def make_practice_set(*, is_premium=False):
    practice = PracticeSet.objects.create(
        title="Scenario practice",
        slug="scenario-practice",
        kind=PracticeSet.Kind.SCENARIO_PRACTICE,
        is_premium=is_premium,
        status=PracticeSet.Status.PUBLISHED,
        order=1,
    )
    PracticeQuestion.objects.create(
        practice_set=practice,
        prompt="What matters most when money is needed soon?",
        options=["Headline yield", "Withdrawal timeline", "Brand", "Referral"],
        correct_answer="Withdrawal timeline",
        explanation="Liquidity matters most when money is needed soon.",
        order=1,
    )
    return practice


def make_scam_assessment():
    assessment = Assessment.objects.create(
        title="Scam awareness quiz",
        slug="scam-awareness-quiz",
        kind=Assessment.Kind.SCAM_AWARENESS,
        scoring=Assessment.Scoring.KNOWLEDGE,
        pass_threshold=50,
        result_bands={"49": "Keep practicing", "100": "Scam aware"},
        status=Assessment.Status.PUBLISHED,
        order=1,
    )
    AssessmentQuestion.objects.create(
        assessment=assessment,
        prompt="Guaranteed high weekly returns usually mean:",
        options=[
            {"label": "A safe opportunity", "value": "safe", "correct": False},
            {"label": "A red flag", "value": "redflag", "correct": True},
        ],
        order=1,
    )
    return assessment


@pytest.mark.django_db
def test_dashboard_endpoint_works(api_client, user):
    make_track()
    make_practice_set()
    make_scam_assessment()
    authenticate(api_client, user)

    response = api_client.get("/api/learning/dashboard/")

    assert response.status_code == 200
    payload = response.json()
    assert "greeting" in payload
    assert payload["premium_status"] == "free"
    assert "total_xp" in payload
    assert "current_track" in payload
    assert "suggested_practice" in payload
    assert payload["suggested_simulator"]["route"] == "/simulate"
    assert any(action["key"] == "assess" for action in payload["quick_actions"])
    assert len(payload["assessments"]) == 1


@pytest.mark.django_db
def test_track_outline_returns_courses_modules_lessons(api_client):
    track, _course, _module = make_track()

    response = api_client.get(f"/api/learning/tracks/{track.slug}/outline/")

    assert response.status_code == 200
    payload = response.json()
    assert payload["courses"][0]["modules"][0]["title"] == "Core chapter"
    assert payload["courses"][0]["modules"][0]["lessons"][0]["slug"] == "what-is-liquidity"


@pytest.mark.django_db
def test_course_outline_returns_modules(api_client):
    _track, course, _module = make_track()

    response = api_client.get(f"/api/learning/courses/{course.slug}/outline/")

    assert response.status_code == 200
    payload = response.json()
    assert payload["modules"][0]["lessons"][0]["lesson_type"] == "concept"


@pytest.mark.django_db
def test_practice_set_returns_questions_without_correct_answer(api_client):
    practice = make_practice_set()

    response = api_client.get(f"/api/learning/practice/{practice.id}/")

    assert response.status_code == 200
    payload = response.json()
    assert payload["question_count"] == 1
    question = payload["questions"][0]
    assert "options" in question
    assert "correct_answer" not in question


@pytest.mark.django_db
def test_completing_practice_awards_xp(api_client, user):
    practice = make_practice_set()
    question = practice.questions.first()
    authenticate(api_client, user)

    response = api_client.post(
        f"/api/learning/practice/{practice.id}/submit/",
        {"answers": {str(question.id): "Withdrawal timeline"}},
        format="json",
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["correct_count"] == 1
    assert payload["score"] == 100.0
    assert payload["xp_awarded"] == 25
    assert XPEvent.objects.filter(user=user, source_type=XPEvent.SourceType.PRACTICE, xp_amount=25).exists()


@pytest.mark.django_db
def test_practice_xp_not_awarded_twice(api_client, user):
    practice = make_practice_set()
    question = practice.questions.first()
    authenticate(api_client, user)

    first = api_client.post(
        f"/api/learning/practice/{practice.id}/submit/",
        {"answers": {str(question.id): "Withdrawal timeline"}},
        format="json",
    )
    second = api_client.post(
        f"/api/learning/practice/{practice.id}/submit/",
        {"answers": {str(question.id): "Withdrawal timeline"}},
        format="json",
    )

    assert first.json()["xp_awarded"] == 25
    assert second.json()["xp_awarded"] == 0
    assert XPEvent.objects.filter(user=user, source_type=XPEvent.SourceType.PRACTICE).count() == 1


@pytest.mark.django_db
def test_assessment_detail_hides_weights_and_correct_flags(api_client):
    assessment = make_scam_assessment()

    response = api_client.get(f"/api/learning/assessments/{assessment.slug}/")

    assert response.status_code == 200
    option = response.json()["questions"][0]["options"][0]
    assert set(option.keys()) == {"label", "value"}
    assert "correct" not in option
    assert "weight" not in option


@pytest.mark.django_db
def test_assessment_submit_scores_awards_xp_and_is_idempotent(api_client, user):
    assessment = make_scam_assessment()
    question = assessment.questions.first()
    authenticate(api_client, user)

    first = api_client.post(
        f"/api/learning/assessments/{assessment.slug}/submit/",
        {"answers": {str(question.id): "redflag"}},
        format="json",
    )

    assert first.status_code == 200
    payload = first.json()
    assert payload["score"] == 100.0
    assert payload["passed"] is True
    assert payload["result_label"] == "Scam aware"
    assert payload["xp_awarded"] == 100
    assert XPEvent.objects.filter(user=user, source_type=XPEvent.SourceType.ASSESSMENT, xp_amount=100).exists()

    second = api_client.post(
        f"/api/learning/assessments/{assessment.slug}/submit/",
        {"answers": {str(question.id): "redflag"}},
        format="json",
    )
    assert second.json()["xp_awarded"] == 0
    assert XPEvent.objects.filter(user=user, source_type=XPEvent.SourceType.ASSESSMENT).count() == 1


@pytest.mark.django_db
def test_library_save_and_list(api_client, user):
    track, _course, _module = make_track()
    authenticate(api_client, user)

    save = api_client.post("/api/learning/library/save/", {"track": track.id}, format="json")
    assert save.status_code == 201
    assert UserLibraryItem.objects.filter(user=user, track=track).exists()

    listing = api_client.get("/api/learning/library/")
    assert listing.status_code == 200


@pytest.mark.django_db
def test_premium_practice_locked_for_free_user(api_client, user):
    practice = make_practice_set(is_premium=True)
    question = practice.questions.first()
    authenticate(api_client, user)

    blocked = api_client.post(
        f"/api/learning/practice/{practice.id}/submit/",
        {"answers": {str(question.id): "Withdrawal timeline"}},
        format="json",
    )
    assert blocked.status_code == 403
    assert not XPEvent.objects.filter(user=user, source_type=XPEvent.SourceType.PRACTICE).exists()

    grant_dev_subscription(user, plan_code=Plan.Code.PREMIUM_MONTHLY)
    allowed = api_client.post(
        f"/api/learning/practice/{practice.id}/submit/",
        {"answers": {str(question.id): "Withdrawal timeline"}},
        format="json",
    )
    assert allowed.status_code == 200


@pytest.mark.django_db
def test_anonymous_can_browse_but_cannot_submit_or_save(api_client):
    track, _course, _module = make_track()
    practice = make_practice_set()
    assessment = make_scam_assessment()

    # Browse is public.
    assert api_client.get("/api/learning/practice/").status_code == 200
    assert api_client.get("/api/learning/assessments/").status_code == 200
    assert api_client.get(f"/api/learning/tracks/{track.slug}/outline/").status_code == 200

    # Saving and submitting require auth.
    assert api_client.post("/api/learning/library/save/", {"track": track.id}, format="json").status_code in {401, 403}
    assert api_client.post(f"/api/learning/practice/{practice.id}/submit/", {"answers": {}}, format="json").status_code in {401, 403}
    assert api_client.post(
        f"/api/learning/assessments/{assessment.slug}/submit/", {"answers": {}}, format="json"
    ).status_code in {401, 403}
    assert UserLibraryItem.objects.count() == 0
    assert XPEvent.objects.count() == 0


@pytest.mark.django_db
def test_lesson_detail_renders_structured_content_with_context(api_client):
    _track, course, _module = make_track()
    lesson = course.lessons.first()

    response = api_client.get(f"/api/learning/lessons/{lesson.id}/")

    assert response.status_code == 200
    payload = response.json()
    assert payload["slug"] == "what-is-liquidity"
    assert payload["course_slug"] == course.slug
    assert payload["track_slug"] == "money-foundations"
    assert "reviewer_notes" not in payload
    assert "disclaimer" in payload


@pytest.mark.django_db
def test_practice_list_is_public_and_excludes_correct_answers(api_client):
    make_practice_set()

    response = api_client.get("/api/learning/practice/")

    assert response.status_code == 200
    results = response.json()["results"]
    assert results[0]["kind"] == "scenario_practice"
    assert "questions" not in results[0]  # list view stays lightweight
