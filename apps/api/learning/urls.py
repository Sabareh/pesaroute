from django.urls import path

from learning import views

urlpatterns = [
    path("home/", views.LearningHomeView.as_view(), name="learning-home"),
    path("library/", views.LearningLibraryView.as_view(), name="learning-library"),
    path("progress/", views.LearningProgressView.as_view(), name="learning-progress"),
    path("tracks/", views.LearningTrackListView.as_view(), name="learning-track-list"),
    path("tracks/<slug:slug>/", views.LearningTrackDetailView.as_view(), name="learning-track-detail"),
    path("courses/<slug:slug>/", views.LearningCourseDetailView.as_view(), name="learning-course-detail"),
    path("resources/", views.LearningResourceListView.as_view(), name="learning-resource-list"),
    path("resources/<int:pk>/", views.LearningResourceDetailView.as_view(), name="learning-resource-detail"),
    path("my-progress/", views.MyProgressView.as_view(), name="learning-my-progress"),
    path("lessons/<int:pk>/start/", views.LessonStartView.as_view(), name="learning-lesson-start"),
    path("lessons/<int:pk>/complete/", views.LessonCompleteView.as_view(), name="learning-lesson-complete"),
    path(
        "lessons/<int:pk>/complete-with-action/",
        views.LessonCompleteWithActionView.as_view(),
        name="learning-lesson-complete-with-action",
    ),
    path("quiz/<int:pk>/submit/", views.QuizSubmitView.as_view(), name="learning-quiz-submit"),
    path("flashcards/<int:pk>/review/", views.FlashcardReviewView.as_view(), name="learning-flashcard-review"),
    path("xp/", views.XPView.as_view(), name="learning-xp"),
    path("badges/", views.BadgeView.as_view(), name="learning-badges"),
    path("streak/", views.StreakView.as_view(), name="learning-streak"),
]
