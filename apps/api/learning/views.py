from django.db.models import Count, Q
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from learning.models import (
    Badge,
    Flashcard,
    LearningCourse,
    LearningLesson,
    LearningResource,
    LearningTrack,
    QuizQuestion,
    UserBadge,
    UserCourseProgress,
    UserLessonProgress,
    UserStreak,
    XPEvent,
)
from learning.serializers import (
    BadgeSerializer,
    LearningCourseDetailSerializer,
    LearningLessonSummarySerializer,
    LearningResourceSerializer,
    LearningTrackDetailSerializer,
    LearningTrackListSerializer,
    LessonActionSerializer,
    LessonCompleteWithActionSerializer,
    QuizSubmitSerializer,
    UserBadgeSerializer,
    UserCourseProgressSerializer,
    UserLessonProgressSerializer,
    UserStreakSerializer,
    XPEventSerializer,
)
from learning.services import (
    complete_lesson,
    complete_lesson_with_action,
    ensure_default_badges,
    review_flashcard,
    start_lesson,
    submit_quiz_answer,
    total_xp,
)


class PublicLearningCacheMixin:
    cache_control = "public, max-age=300"

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        response["Cache-Control"] = self.cache_control
        response["Vary"] = "Accept, Authorization"
        return response


def published_lessons_filter(prefix=""):
    return {
        f"{prefix}status": LearningLesson.Status.PUBLISHED,
    }


class LearningTrackListView(PublicLearningCacheMixin, generics.ListAPIView):
    serializer_class = LearningTrackListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = LearningTrack.objects.filter(status=LearningTrack.Status.PUBLISHED).annotate(
            course_count=Count("courses", filter=Q(courses__status=LearningCourse.Status.PUBLISHED), distinct=True),
            lesson_count=Count(
                "courses__lessons",
                filter=Q(courses__lessons__status=LearningLesson.Status.PUBLISHED),
                distinct=True,
            ),
        )
        level = self.request.query_params.get("level")
        target_user_type = self.request.query_params.get("target_user_type")
        if level:
            queryset = queryset.filter(level=level)
        if target_user_type:
            queryset = queryset.filter(target_user_type=target_user_type)
        return queryset.order_by("order", "title")


class LearningTrackDetailView(PublicLearningCacheMixin, generics.RetrieveAPIView):
    serializer_class = LearningTrackDetailSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        return LearningTrack.objects.prefetch_related("courses__lessons").filter(status=LearningTrack.Status.PUBLISHED)


class LearningCourseDetailView(PublicLearningCacheMixin, generics.RetrieveAPIView):
    serializer_class = LearningCourseDetailSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        return (
            LearningCourse.objects.select_related("track")
            .prefetch_related("lessons")
            .filter(
                status=LearningCourse.Status.PUBLISHED,
                track__status=LearningTrack.Status.PUBLISHED,
            )
        )


class LearningResourceListView(PublicLearningCacheMixin, generics.ListAPIView):
    serializer_class = LearningResourceSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = LearningResource.objects.select_related("related_track", "related_product_category").filter(
            status=LearningResource.Status.PUBLISHED
        )
        resource_type = self.request.query_params.get("resource_type")
        track = self.request.query_params.get("track")
        if resource_type:
            queryset = queryset.filter(resource_type=resource_type)
        if track:
            queryset = queryset.filter(related_track__slug=track)
        return queryset.order_by("resource_type", "title")


class LearningResourceDetailView(PublicLearningCacheMixin, generics.RetrieveAPIView):
    serializer_class = LearningResourceSerializer
    permission_classes = [AllowAny]
    queryset = LearningResource.objects.select_related("related_track", "related_product_category").filter(
        status=LearningResource.Status.PUBLISHED
    )


class MyProgressView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        lesson_progress = UserLessonProgress.objects.select_related(
            "lesson",
            "lesson__course",
            "lesson__course__track",
        ).filter(user=request.user)[:50]
        course_progress = UserCourseProgress.objects.select_related("course", "course__track", "last_lesson").filter(
            user=request.user
        )[:50]
        streak, _created = UserStreak.objects.get_or_create(user=request.user)
        return Response(
            {
                "total_xp": total_xp(request.user),
                "lessons": UserLessonProgressSerializer(lesson_progress, many=True).data,
                "courses": UserCourseProgressSerializer(course_progress, many=True).data,
                "badges": UserBadgeSerializer(
                    UserBadge.objects.select_related("badge").filter(user=request.user),
                    many=True,
                ).data,
                "streak": UserStreakSerializer(streak).data,
            }
        )


class LessonStartView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        lesson = generics.get_object_or_404(
            LearningLesson.objects.select_related("course", "course__track"),
            pk=pk,
            status=LearningLesson.Status.PUBLISHED,
        )
        progress = start_lesson(request.user, lesson)
        return Response(UserLessonProgressSerializer(progress).data)


class LessonCompleteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        lesson = generics.get_object_or_404(
            LearningLesson.objects.select_related("course", "course__track"),
            pk=pk,
            status=LearningLesson.Status.PUBLISHED,
        )
        serializer = LessonActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        progress = complete_lesson(request.user, lesson, score=serializer.validated_data.get("score"))
        return Response(UserLessonProgressSerializer(progress).data)


class LessonCompleteWithActionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        lesson = generics.get_object_or_404(
            LearningLesson.objects.select_related("course", "course__track"),
            pk=pk,
            status=LearningLesson.Status.PUBLISHED,
        )
        serializer = LessonCompleteWithActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = complete_lesson_with_action(
            request.user,
            lesson,
            score=serializer.validated_data.get("score"),
            simulation_run_id=serializer.validated_data.get("simulation_run_id"),
            journal_entry_id=serializer.validated_data.get("journal_entry_id"),
            consultation_request_id=serializer.validated_data.get("consultation_request_id"),
        )
        return Response(
            {
                "progress": UserLessonProgressSerializer(result["progress"]).data,
                "action_xp_awarded": result["action_xp_awarded"],
                "linked_actions": result["linked_actions"],
                "total_xp": result["total_xp"],
            }
        )


class QuizSubmitView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        question = generics.get_object_or_404(
            QuizQuestion.objects.select_related("lesson", "lesson__course", "lesson__course__track"),
            pk=pk,
            lesson__status=LearningLesson.Status.PUBLISHED,
        )
        serializer = QuizSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = submit_quiz_answer(request.user, question, serializer.validated_data["answer"])
        return Response(
            {
                "correct": result["correct"],
                "correct_answer": result["correct_answer"],
                "explanation": result["explanation"],
                "progress": UserLessonProgressSerializer(result["progress"]).data,
            },
            status=status.HTTP_200_OK,
        )


class FlashcardReviewView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        flashcard = generics.get_object_or_404(
            Flashcard.objects.select_related("lesson", "lesson__course", "lesson__course__track"),
            pk=pk,
            lesson__status=LearningLesson.Status.PUBLISHED,
        )
        result = review_flashcard(request.user, flashcard)
        return Response(
            {
                "xp_awarded": result["xp_awarded"],
                "progress": UserLessonProgressSerializer(result["progress"]).data,
            }
        )


class XPView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        events = XPEvent.objects.filter(user=request.user)[:100]
        return Response({"total_xp": total_xp(request.user), "events": XPEventSerializer(events, many=True).data})


class BadgeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        ensure_default_badges()
        return Response(
            {
                "available": BadgeSerializer(Badge.objects.all(), many=True).data,
                "earned": UserBadgeSerializer(
                    UserBadge.objects.select_related("badge").filter(user=request.user),
                    many=True,
                ).data,
            }
        )


class StreakView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        streak, _created = UserStreak.objects.get_or_create(user=request.user)
        return Response(UserStreakSerializer(streak).data)


def track_list_queryset():
    return LearningTrack.objects.filter(status=LearningTrack.Status.PUBLISHED).annotate(
        course_count=Count("courses", filter=Q(courses__status=LearningCourse.Status.PUBLISHED), distinct=True),
        lesson_count=Count(
            "courses__lessons",
            filter=Q(courses__lessons__status=LearningLesson.Status.PUBLISHED),
            distinct=True,
        ),
    )


def first_published_lesson_for_track(track):
    return (
        LearningLesson.objects.select_related("course", "course__track")
        .filter(
            course__track=track,
            course__status=LearningCourse.Status.PUBLISHED,
            status=LearningLesson.Status.PUBLISHED,
        )
        .order_by("course__order", "order", "title")
        .first()
    )


def learning_item_payload(lesson, context):
    if not lesson:
        return None
    return {
        "track": LearningTrackListSerializer(lesson.course.track, context=context).data,
        "course": {
            "id": lesson.course.id,
            "title": lesson.course.title,
            "slug": lesson.course.slug,
            "estimated_minutes": lesson.course.estimated_minutes,
        },
        "lesson": LearningLessonSummarySerializer(lesson, context=context).data,
    }


class LearningHomeView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        context = {"request": request}
        tracks = track_list_queryset().order_by("order", "title")
        recommended_track = tracks.first()
        continue_lesson = None
        if request.user.is_authenticated:
            course_progress = (
                UserCourseProgress.objects.select_related("course", "course__track", "last_lesson")
                .filter(user=request.user, percent_complete__lt=100)
                .order_by("-updated_at")
                .first()
            )
            continue_lesson = course_progress.last_lesson if course_progress else None
        if not continue_lesson and recommended_track:
            continue_lesson = first_published_lesson_for_track(recommended_track)

        streak = None
        recent_badges = []
        if request.user.is_authenticated:
            streak, _created = UserStreak.objects.get_or_create(user=request.user)
            recent_badges = UserBadge.objects.select_related("badge").filter(user=request.user)[:5]

        return Response(
            {
                "streak": UserStreakSerializer(streak).data if streak else None,
                "total_xp": total_xp(request.user),
                "continue_learning": learning_item_payload(continue_lesson, context),
                "recommended_track": (
                    LearningTrackListSerializer(recommended_track, context=context).data if recommended_track else None
                ),
                "recent_badges": UserBadgeSerializer(recent_badges, many=True).data,
                "daily_challenge": {
                    "title": "Check the exit before the return",
                    "body": "Pick one product and write down withdrawal timing, fees, and what can go wrong.",
                    "action": "journal_reflection",
                    "xp_reward": 10,
                },
                "quick_actions": [
                    {"key": "flashcards", "label": "Flashcards"},
                    {"key": "practice", "label": "Practice"},
                    {"key": "simulate", "label": "Run simulator"},
                    {"key": "journal", "label": "Save reflection"},
                    {"key": "professional_review", "label": "Request professional review"},
                ],
            }
        )


class LearningLibraryView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        context = {"request": request}
        if not request.user.is_authenticated:
            return Response(
                {
                    "saved_tracks": [],
                    "in_progress_courses": [],
                    "completed_courses": [],
                    "practice_suggestions": LearningTrackListSerializer(
                        track_list_queryset().order_by("order", "title")[:3],
                        many=True,
                        context=context,
                    ).data,
                }
            )
        courses = UserCourseProgress.objects.select_related("course", "course__track", "last_lesson").filter(
            user=request.user
        )
        saved_track_ids = list(courses.values_list("course__track_id", flat=True).distinct())
        saved_tracks = track_list_queryset().filter(id__in=saved_track_ids)
        in_progress = courses.filter(percent_complete__lt=100)
        completed = courses.filter(percent_complete__gte=100)
        suggestions = track_list_queryset().exclude(id__in=saved_track_ids).order_by("order", "title")[:3]
        return Response(
            {
                "saved_tracks": LearningTrackListSerializer(saved_tracks, many=True, context=context).data,
                "in_progress_courses": UserCourseProgressSerializer(in_progress, many=True).data,
                "completed_courses": UserCourseProgressSerializer(completed, many=True).data,
                "practice_suggestions": LearningTrackListSerializer(suggestions, many=True, context=context).data,
            }
        )


class LearningProgressView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from journal.models import JournalEntry
        from planning.models import SimulationRun

        streak, _created = UserStreak.objects.get_or_create(user=request.user)
        completed_lessons = UserLessonProgress.objects.select_related(
            "lesson", "lesson__course", "lesson__course__track"
        ).filter(
            user=request.user,
            status=UserLessonProgress.Status.COMPLETED,
        )
        return Response(
            {
                "total_xp": total_xp(request.user),
                "streak": UserStreakSerializer(streak).data,
                "badges": UserBadgeSerializer(
                    UserBadge.objects.select_related("badge").filter(user=request.user),
                    many=True,
                ).data,
                "completed_lessons": UserLessonProgressSerializer(completed_lessons[:100], many=True).data,
                "simulations_completed": SimulationRun.objects.filter(
                    user=request.user,
                    learning_lesson__isnull=False,
                ).count(),
                "journal_reflections_completed": JournalEntry.objects.filter(
                    user=request.user,
                    learning_lesson__isnull=False,
                ).count(),
            }
        )
