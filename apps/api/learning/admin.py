from django.contrib import admin

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
    list_display = ("title", "course", "lesson_type", "status", "is_premium", "order", "xp_reward")
    list_filter = ("lesson_type", "status", "is_premium")
    prepopulated_fields = {"slug": ("title",)}
    search_fields = ("title", "summary", "body")


admin.site.register(QuizQuestion)
admin.site.register(Flashcard)
admin.site.register(LearningResource)
admin.site.register(UserLessonProgress)
admin.site.register(UserCourseProgress)
admin.site.register(XPEvent)
admin.site.register(Badge)
admin.site.register(UserBadge)
admin.site.register(UserStreak)
