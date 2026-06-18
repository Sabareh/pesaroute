from rest_framework import serializers

from learning.models import (
    Assessment,
    AssessmentQuestion,
    Badge,
    Flashcard,
    LearningContentSource,
    LearningCourse,
    LearningLesson,
    LearningModule,
    LearningResource,
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
from learning.services import (
    can_access_assessment,
    can_access_lesson,
    can_access_practice_set,
    can_access_premium_learning,
)


class LearningContentSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningContentSource
        fields = [
            "id",
            "title",
            "organization",
            "source_type",
            "url",
            "retrieved_at",
            "reliability_level",
        ]


class LearningLessonSummarySerializer(serializers.ModelSerializer):
    locked = serializers.SerializerMethodField()
    needs_review_fallback = serializers.SerializerMethodField()
    body = serializers.SerializerMethodField()
    structured_content = serializers.SerializerMethodField()
    content_sources = LearningContentSourceSerializer(many=True, read_only=True)
    disclaimer = serializers.CharField(read_only=True)
    source_label = serializers.SerializerMethodField()

    class Meta:
        model = LearningLesson
        fields = [
            "id",
            "title",
            "slug",
            "lesson_type",
            "body",
            "summary",
            "structured_content",
            "estimated_minutes",
            "difficulty",
            "order",
            "xp_reward",
            "is_premium",
            "status",
            "editorial_status",
            "last_reviewed_at",
            "next_review_due_at",
            "review_frequency_days",
            "source_confidence",
            "content_quality_score",
            "content_warning_flags",
            "needs_review_fallback",
            "content_sources",
            "source_label",
            "disclaimer",
            "locked",
        ]

    def get_locked(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        return not can_access_lesson(user, obj)

    def get_needs_review_fallback(self, obj):
        return "placeholder_content" in (obj.content_warning_flags or []) or (
            obj.content_quality_score > 0 and obj.content_quality_score < 40
        )

    def get_body(self, obj):
        return "" if self.get_locked(obj) or self.get_needs_review_fallback(obj) else obj.body

    def get_structured_content(self, obj):
        return [] if self.get_locked(obj) or self.get_needs_review_fallback(obj) else obj.structured_content

    def get_source_label(self, obj):
        if obj.content_sources.exists():
            return "Source referenced"
        if obj.editorial_status in {
            LearningLesson.EditorialStatus.REVIEWED,
            LearningLesson.EditorialStatus.PUBLISHED,
        }:
            return "Editorial reviewed"
        return "Editorial review pending"


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
    needs_review_fallback = serializers.SerializerMethodField()
    body = serializers.SerializerMethodField()
    structured_content = serializers.SerializerMethodField()
    content_sources = LearningContentSourceSerializer(many=True, read_only=True)
    disclaimer = serializers.CharField(read_only=True)
    source_label = serializers.SerializerMethodField()

    class Meta:
        model = LearningResource
        fields = [
            "id",
            "title",
            "resource_type",
            "body",
            "structured_content",
            "related_track",
            "related_track_slug",
            "related_product_category",
            "related_product_category_slug",
            "is_premium",
            "status",
            "editorial_status",
            "last_reviewed_at",
            "next_review_due_at",
            "source_confidence",
            "content_quality_score",
            "needs_review_fallback",
            "content_sources",
            "source_label",
            "disclaimer",
            "locked",
            "created_at",
            "updated_at",
        ]

    def get_locked(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        return bool(obj.is_premium and not can_access_premium_learning(user))

    def get_needs_review_fallback(self, obj):
        return obj.content_quality_score > 0 and obj.content_quality_score < 40

    def get_body(self, obj):
        return "" if self.get_locked(obj) or self.get_needs_review_fallback(obj) else obj.body

    def get_structured_content(self, obj):
        return [] if self.get_locked(obj) or self.get_needs_review_fallback(obj) else obj.structured_content

    def get_source_label(self, obj):
        if obj.content_sources.exists():
            return "Source referenced"
        if obj.editorial_status in {
            LearningResource.EditorialStatus.REVIEWED,
            LearningResource.EditorialStatus.PUBLISHED,
        }:
            return "Editorial reviewed"
        return "Editorial review pending"


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


class LearningModuleSerializer(serializers.ModelSerializer):
    lessons = LearningLessonSummarySerializer(many=True, read_only=True)

    class Meta:
        model = LearningModule
        fields = ["id", "title", "slug", "description", "order", "estimated_minutes", "status", "lessons"]


class CourseOutlineSerializer(serializers.ModelSerializer):
    modules = serializers.SerializerMethodField()
    lessons = serializers.SerializerMethodField()

    class Meta:
        model = LearningCourse
        fields = ["id", "title", "slug", "description", "order", "estimated_minutes", "is_premium", "modules", "lessons"]

    def _published_lessons(self, course):
        return course.lessons.filter(status=LearningLesson.Status.PUBLISHED).order_by("order", "title")

    def get_modules(self, course):
        modules = course.modules.filter(status=LearningModule.Status.PUBLISHED).order_by("order", "title")
        return LearningModuleSerializer(modules, many=True, context=self.context).data

    def get_lessons(self, course):
        # Lessons not assigned to any module appear at the course root.
        lessons = self._published_lessons(course).filter(module__isnull=True)
        return LearningLessonSummarySerializer(lessons, many=True, context=self.context).data


class TrackOutlineSerializer(serializers.ModelSerializer):
    courses = serializers.SerializerMethodField()

    class Meta:
        model = LearningTrack
        fields = ["id", "title", "slug", "description", "level", "target_user_type", "estimated_minutes", "is_premium", "courses"]

    def get_courses(self, track):
        courses = track.courses.filter(status=LearningCourse.Status.PUBLISHED).order_by("order", "title")
        return CourseOutlineSerializer(courses, many=True, context=self.context).data


class LearningLessonDetailSerializer(LearningLessonSummarySerializer):
    """Lesson payload for the standalone lesson player, with course/track context for navigation."""

    course_slug = serializers.CharField(source="course.slug", read_only=True)
    course_title = serializers.CharField(source="course.title", read_only=True)
    track_slug = serializers.CharField(source="course.track.slug", read_only=True)
    track_title = serializers.CharField(source="course.track.title", read_only=True)

    class Meta(LearningLessonSummarySerializer.Meta):
        fields = LearningLessonSummarySerializer.Meta.fields + [
            "course_slug",
            "course_title",
            "track_slug",
            "track_title",
        ]


class PracticeQuestionPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = PracticeQuestion
        # correct_answer is intentionally excluded from public payloads.
        fields = ["id", "prompt", "options", "explanation", "difficulty", "order"]


class PracticeSetListSerializer(serializers.ModelSerializer):
    locked = serializers.SerializerMethodField()
    question_count = serializers.IntegerField(read_only=True)
    track_slug = serializers.CharField(source="track.slug", read_only=True, default=None)

    class Meta:
        model = PracticeSet
        fields = ["id", "title", "slug", "description", "kind", "track", "track_slug", "is_premium", "order", "xp_reward", "question_count", "locked"]

    def get_locked(self, obj):
        request = self.context.get("request")
        return not can_access_practice_set(getattr(request, "user", None), obj)


class PracticeSetDetailSerializer(PracticeSetListSerializer):
    questions = serializers.SerializerMethodField()

    class Meta(PracticeSetListSerializer.Meta):
        fields = PracticeSetListSerializer.Meta.fields + ["questions"]

    def get_questions(self, obj):
        if self.get_locked(obj):
            return []
        return PracticeQuestionPublicSerializer(obj.questions.all(), many=True, context=self.context).data


class AssessmentQuestionPublicSerializer(serializers.ModelSerializer):
    options = serializers.SerializerMethodField()

    class Meta:
        model = AssessmentQuestion
        fields = ["id", "prompt", "options", "order"]

    def get_options(self, obj):
        # Never expose option weights or correctness flags to the client.
        return [{"label": opt.get("label"), "value": opt.get("value")} for opt in obj.options or []]


class AssessmentListSerializer(serializers.ModelSerializer):
    locked = serializers.SerializerMethodField()
    question_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Assessment
        fields = ["id", "title", "slug", "description", "kind", "scoring", "is_premium", "order", "xp_reward", "question_count", "locked"]

    def get_locked(self, obj):
        request = self.context.get("request")
        return not can_access_assessment(getattr(request, "user", None), obj)


class AssessmentDetailSerializer(AssessmentListSerializer):
    questions = serializers.SerializerMethodField()

    class Meta(AssessmentListSerializer.Meta):
        fields = AssessmentListSerializer.Meta.fields + ["questions"]

    def get_questions(self, obj):
        if self.get_locked(obj):
            return []
        return AssessmentQuestionPublicSerializer(obj.questions.all(), many=True, context=self.context).data


class UserAssessmentResultSerializer(serializers.ModelSerializer):
    assessment_slug = serializers.CharField(source="assessment.slug", read_only=True)
    assessment_kind = serializers.CharField(source="assessment.kind", read_only=True)

    class Meta:
        model = UserAssessmentResult
        fields = ["id", "assessment", "assessment_slug", "assessment_kind", "score", "result_label", "passed", "completed_at", "updated_at"]


class UserLibraryItemSerializer(serializers.ModelSerializer):
    track_slug = serializers.CharField(source="track.slug", read_only=True)
    track_title = serializers.CharField(source="track.title", read_only=True)

    class Meta:
        model = UserLibraryItem
        fields = ["id", "track", "track_slug", "track_title", "status", "saved_at"]


class PracticeSubmitSerializer(serializers.Serializer):
    answers = serializers.DictField(child=serializers.CharField(allow_blank=True), default=dict)


class AssessmentSubmitSerializer(serializers.Serializer):
    answers = serializers.DictField(child=serializers.CharField(allow_blank=True), default=dict)


class LibrarySaveSerializer(serializers.Serializer):
    track = serializers.IntegerField(min_value=1)
