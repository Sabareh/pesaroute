from datetime import timedelta

from django.contrib import admin
from django.utils import timezone

from learning.models import (
    Assessment,
    AssessmentQuestion,
    Badge,
    Flashcard,
    FlashcardSet,
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


class LessonQualityFilter(admin.SimpleListFilter):
    title = "quality"
    parameter_name = "quality"

    def lookups(self, request, model_admin):
        return (
            ("strong", "Strong 90-100"),
            ("acceptable", "Acceptable 70-89"),
            ("thin", "Thin 40-69"),
            ("poor", "Poor below 40"),
        )

    def queryset(self, request, queryset):
        value = self.value()
        if value == "strong":
            return queryset.filter(content_quality_score__gte=90)
        if value == "acceptable":
            return queryset.filter(content_quality_score__gte=70, content_quality_score__lt=90)
        if value == "thin":
            return queryset.filter(content_quality_score__gte=40, content_quality_score__lt=70)
        if value == "poor":
            return queryset.filter(content_quality_score__lt=40)
        return queryset


class ReviewDueFilter(admin.SimpleListFilter):
    title = "review due"
    parameter_name = "review_due"

    def lookups(self, request, model_admin):
        return (
            ("stale", "Stale"),
            ("soon", "Due in 30 days"),
            ("missing", "No review date"),
        )

    def queryset(self, request, queryset):
        now = timezone.now()
        value = self.value()
        if value == "stale":
            return queryset.filter(next_review_due_at__lt=now)
        if value == "soon":
            return queryset.filter(next_review_due_at__gte=now, next_review_due_at__lte=now + timedelta(days=30))
        if value == "missing":
            return queryset.filter(next_review_due_at__isnull=True)
        return queryset


@admin.register(LearningTrack)
class LearningTrackAdmin(admin.ModelAdmin):
    list_display = ("title", "level", "target_user_type", "status", "is_premium", "order")
    list_filter = ("level", "target_user_type", "status", "is_premium")
    prepopulated_fields = {"slug": ("title",)}
    search_fields = ("title", "description")


@admin.register(LearningCourse)
class LearningCourseAdmin(admin.ModelAdmin):
    list_display = ("title", "track", "status", "is_premium", "order")
    list_filter = ("track", "status", "is_premium")
    prepopulated_fields = {"slug": ("title",)}
    search_fields = ("title", "description")


@admin.register(LearningLesson)
class LearningLessonAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "course",
        "lesson_type",
        "status",
        "editorial_status",
        "difficulty",
        "is_premium",
        "source_confidence",
        "content_quality_score",
        "next_review_due_at",
        "order",
        "xp_reward",
    )
    list_filter = (
        LessonQualityFilter,
        ReviewDueFilter,
        "lesson_type",
        "status",
        "editorial_status",
        "source_confidence",
        "difficulty",
        "is_premium",
    )
    prepopulated_fields = {"slug": ("title",)}
    search_fields = ("title", "summary", "body")
    filter_horizontal = ("content_sources",)


@admin.register(LearningContentSource)
class LearningContentSourceAdmin(admin.ModelAdmin):
    list_display = ("title", "organization", "source_type", "reliability_level", "retrieved_at")
    list_filter = ("source_type", "reliability_level")
    search_fields = ("title", "organization", "url", "notes")


admin.site.register(QuizQuestion)
admin.site.register(Flashcard)


@admin.register(LearningResource)
class LearningResourceAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "resource_type",
        "status",
        "editorial_status",
        "source_confidence",
        "content_quality_score",
        "next_review_due_at",
        "is_premium",
    )
    list_filter = (
        LessonQualityFilter,
        ReviewDueFilter,
        "resource_type",
        "status",
        "editorial_status",
        "source_confidence",
        "is_premium",
    )
    search_fields = ("title", "body")
    filter_horizontal = ("content_sources",)


@admin.register(LearningModule)
class LearningModuleAdmin(admin.ModelAdmin):
    list_display = ("title", "course", "status", "order")
    list_filter = ("status", "course__track")
    prepopulated_fields = {"slug": ("title",)}
    search_fields = ("title", "description")


class PracticeQuestionInline(admin.TabularInline):
    model = PracticeQuestion
    extra = 1


@admin.register(PracticeSet)
class PracticeSetAdmin(admin.ModelAdmin):
    list_display = ("title", "kind", "track", "status", "is_premium", "order", "xp_reward")
    list_filter = ("kind", "status", "is_premium", "track")
    prepopulated_fields = {"slug": ("title",)}
    search_fields = ("title", "description")
    inlines = [PracticeQuestionInline]


class AssessmentQuestionInline(admin.TabularInline):
    model = AssessmentQuestion
    extra = 1


@admin.register(Assessment)
class AssessmentAdmin(admin.ModelAdmin):
    list_display = ("title", "kind", "scoring", "status", "is_premium", "pass_threshold", "order", "xp_reward")
    list_filter = ("kind", "scoring", "status", "is_premium")
    prepopulated_fields = {"slug": ("title",)}
    search_fields = ("title", "description")
    inlines = [AssessmentQuestionInline]


@admin.register(FlashcardSet)
class FlashcardSetAdmin(admin.ModelAdmin):
    list_display = ("title", "track", "status", "is_premium")
    list_filter = ("status", "is_premium", "track")
    prepopulated_fields = {"slug": ("title",)}
    search_fields = ("title", "description")


admin.site.register(UserLessonProgress)
admin.site.register(UserCourseProgress)
admin.site.register(UserAssessmentResult)
admin.site.register(UserLibraryItem)
admin.site.register(XPEvent)
admin.site.register(Badge)
admin.site.register(UserBadge)
admin.site.register(UserStreak)
