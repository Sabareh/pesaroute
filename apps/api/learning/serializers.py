from rest_framework import serializers

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
from learning.services import can_access_lesson, can_access_premium_learning


class LearningLessonSummarySerializer(serializers.ModelSerializer):
    locked = serializers.SerializerMethodField()
    body = serializers.SerializerMethodField()

    class Meta:
        model = LearningLesson
        fields = [
            "id",
            "title",
            "slug",
            "lesson_type",
            "body",
            "summary",
            "order",
            "xp_reward",
            "is_premium",
            "status",
            "locked",
        ]

    def get_locked(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        return not can_access_lesson(user, obj)

    def get_body(self, obj):
        return "" if self.get_locked(obj) else obj.body


class QuizQuestionPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizQuestion
        fields = ["id", "lesson", "prompt", "options", "explanation", "difficulty"]


class FlashcardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Flashcard
        fields = ["id", "lesson", "front", "back", "example", "tag"]


class LearningCourseSummarySerializer(serializers.ModelSerializer):
    lessons = LearningLessonSummarySerializer(many=True, read_only=True)

    class Meta:
        model = LearningCourse
        fields = [
            "id",
            "track",
            "title",
            "slug",
            "description",
            "order",
            "estimated_minutes",
            "is_premium",
            "status",
            "lessons",
        ]


class LearningTrackListSerializer(serializers.ModelSerializer):
    course_count = serializers.IntegerField(read_only=True)
    lesson_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = LearningTrack
        fields = [
            "id",
            "title",
            "slug",
            "description",
            "level",
            "target_user_type",
            "estimated_minutes",
            "is_premium",
            "status",
            "order",
            "course_count",
            "lesson_count",
        ]


class LearningTrackDetailSerializer(serializers.ModelSerializer):
    courses = LearningCourseSummarySerializer(many=True, read_only=True)

    class Meta:
        model = LearningTrack
        fields = [
            "id",
            "title",
            "slug",
            "description",
            "level",
            "target_user_type",
            "estimated_minutes",
            "is_premium",
            "status",
            "order",
            "courses",
        ]


class LearningCourseDetailSerializer(serializers.ModelSerializer):
    track = LearningTrackListSerializer(read_only=True)
    lessons = LearningLessonSummarySerializer(many=True, read_only=True)

    class Meta:
        model = LearningCourse
        fields = [
            "id",
            "track",
            "title",
            "slug",
            "description",
            "order",
            "estimated_minutes",
            "is_premium",
            "status",
            "lessons",
        ]


class LearningResourceSerializer(serializers.ModelSerializer):
    related_track_slug = serializers.CharField(source="related_track.slug", read_only=True)
    related_product_category_slug = serializers.CharField(source="related_product_category.slug", read_only=True)
    locked = serializers.SerializerMethodField()
    body = serializers.SerializerMethodField()

    class Meta:
        model = LearningResource
        fields = [
            "id",
            "title",
            "resource_type",
            "body",
            "related_track",
            "related_track_slug",
            "related_product_category",
            "related_product_category_slug",
            "is_premium",
            "status",
            "locked",
            "created_at",
            "updated_at",
        ]

    def get_locked(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        return bool(obj.is_premium and not can_access_premium_learning(user))

    def get_body(self, obj):
        return "" if self.get_locked(obj) else obj.body


class LessonActionSerializer(serializers.Serializer):
    score = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, min_value=0, max_value=100)


class LessonCompleteWithActionSerializer(LessonActionSerializer):
    simulation_run_id = serializers.IntegerField(required=False, min_value=1)
    journal_entry_id = serializers.IntegerField(required=False, min_value=1)
    consultation_request_id = serializers.IntegerField(required=False, min_value=1)


class QuizSubmitSerializer(serializers.Serializer):
    answer = serializers.CharField(max_length=240)


class UserLessonProgressSerializer(serializers.ModelSerializer):
    lesson_title = serializers.CharField(source="lesson.title", read_only=True)
    lesson_type = serializers.CharField(source="lesson.lesson_type", read_only=True)
    course_slug = serializers.CharField(source="lesson.course.slug", read_only=True)
    track_slug = serializers.CharField(source="lesson.course.track.slug", read_only=True)

    class Meta:
        model = UserLessonProgress
        fields = [
            "id",
            "lesson",
            "lesson_title",
            "lesson_type",
            "course_slug",
            "track_slug",
            "status",
            "score",
            "attempts",
            "completed_at",
            "updated_at",
        ]


class UserCourseProgressSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source="course.title", read_only=True)
    course_slug = serializers.CharField(source="course.slug", read_only=True)
    track_slug = serializers.CharField(source="course.track.slug", read_only=True)
    last_lesson_title = serializers.CharField(source="last_lesson.title", read_only=True)

    class Meta:
        model = UserCourseProgress
        fields = [
            "id",
            "course",
            "course_title",
            "course_slug",
            "track_slug",
            "percent_complete",
            "last_lesson",
            "last_lesson_title",
            "completed_at",
            "updated_at",
        ]


class XPEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = XPEvent
        fields = ["id", "source_type", "source_id", "xp_amount", "created_at"]


class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = ["id", "name", "slug", "description", "icon_key", "criteria_key"]


class UserBadgeSerializer(serializers.ModelSerializer):
    badge = BadgeSerializer(read_only=True)

    class Meta:
        model = UserBadge
        fields = ["id", "badge", "awarded_at"]


class UserStreakSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserStreak
        fields = [
            "current_streak_days",
            "longest_streak_days",
            "last_activity_date",
            "streak_freezes_available",
            "updated_at",
        ]
