from django.conf import settings
from django.db import models
from django.utils import timezone


class TimestampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class LearningTrack(TimestampedModel):
    class Level(models.TextChoices):
        BEGINNER = "beginner", "Beginner"
        INTERMEDIATE = "intermediate", "Intermediate"
        ADVANCED = "advanced", "Advanced"

    class TargetUserType(models.TextChoices):
        STUDENT = "student", "Student"
        FIRST_JOBBER = "first_jobber", "First jobber"
        CHAMA_MEMBER = "chama_member", "Chama member"
        DIASPORA = "diaspora", "Diaspora"
        FARMER = "farmer", "Farmer"
        JUA_KALI = "jua_kali", "Jua kali"
        GENERAL = "general", "General"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        ARCHIVED = "archived", "Archived"

    title = models.CharField(max_length=160)
    slug = models.SlugField(max_length=180, unique=True)
    description = models.TextField(blank=True)
    level = models.CharField(max_length=32, choices=Level.choices, default=Level.BEGINNER)
    target_user_type = models.CharField(max_length=32, choices=TargetUserType.choices, default=TargetUserType.GENERAL)
    estimated_minutes = models.PositiveIntegerField(default=0)
    is_premium = models.BooleanField(default=False)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.DRAFT)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "title"]
        indexes = [
            models.Index(fields=["status", "order"]),
            models.Index(fields=["level"]),
            models.Index(fields=["target_user_type"]),
            models.Index(fields=["is_premium"]),
        ]

    def __str__(self) -> str:
        return self.title


class LearningCourse(TimestampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        ARCHIVED = "archived", "Archived"

    track = models.ForeignKey(LearningTrack, on_delete=models.CASCADE, related_name="courses")
    title = models.CharField(max_length=160)
    slug = models.SlugField(max_length=180, unique=True)
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)
    estimated_minutes = models.PositiveIntegerField(default=0)
    is_premium = models.BooleanField(default=False)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.DRAFT)

    class Meta:
        ordering = ["track__order", "order", "title"]
        unique_together = [("track", "order")]
        indexes = [
            models.Index(fields=["track", "status", "order"]),
            models.Index(fields=["is_premium"]),
        ]

    def __str__(self) -> str:
        return self.title


class LearningLesson(TimestampedModel):
    class LessonType(models.TextChoices):
        ARTICLE = "article", "Article"
        QUIZ = "quiz", "Quiz"
        FLASHCARD = "flashcard", "Flashcard"
        SIMULATION = "simulation", "Simulation"
        JOURNAL_PROMPT = "journal_prompt", "Journal prompt"
        CHECKLIST = "checklist", "Checklist"
        PROFESSIONAL_REVIEW_PROMPT = "professional_review_prompt", "Professional review prompt"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        ARCHIVED = "archived", "Archived"

    course = models.ForeignKey(LearningCourse, on_delete=models.CASCADE, related_name="lessons")
    title = models.CharField(max_length=180)
    slug = models.SlugField(max_length=200)
    lesson_type = models.CharField(max_length=40, choices=LessonType.choices, default=LessonType.ARTICLE)
    body = models.TextField(blank=True)
    summary = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)
    xp_reward = models.PositiveIntegerField(default=10)
    is_premium = models.BooleanField(default=False)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.DRAFT)

    class Meta:
        ordering = ["course__track__order", "course__order", "order", "title"]
        unique_together = [("course", "slug"), ("course", "order")]
        indexes = [
            models.Index(fields=["course", "status", "order"]),
            models.Index(fields=["lesson_type"]),
            models.Index(fields=["is_premium"]),
        ]

    def __str__(self) -> str:
        return self.title


class QuizQuestion(TimestampedModel):
    class Difficulty(models.TextChoices):
        EASY = "easy", "Easy"
        MEDIUM = "medium", "Medium"
        HARD = "hard", "Hard"

    lesson = models.ForeignKey(LearningLesson, on_delete=models.CASCADE, related_name="quiz_questions")
    prompt = models.TextField()
    options = models.JSONField(default=list)
    correct_answer = models.CharField(max_length=240)
    explanation = models.TextField(blank=True)
    difficulty = models.CharField(max_length=32, choices=Difficulty.choices, default=Difficulty.EASY)

    class Meta:
        ordering = ["lesson__order", "id"]
        indexes = [models.Index(fields=["lesson", "difficulty"])]

    def __str__(self) -> str:
        return self.prompt[:80]


class Flashcard(TimestampedModel):
    lesson = models.ForeignKey(LearningLesson, on_delete=models.CASCADE, related_name="flashcards")
    front = models.TextField()
    back = models.TextField()
    example = models.TextField(blank=True)
    tag = models.CharField(max_length=80, blank=True)

    class Meta:
        ordering = ["lesson__order", "id"]
        indexes = [models.Index(fields=["lesson", "tag"])]

    def __str__(self) -> str:
        return self.front[:80]


class LearningResource(TimestampedModel):
    class ResourceType(models.TextChoices):
        GUIDE = "guide", "Guide"
        CHEAT_SHEET = "cheat_sheet", "Cheat sheet"
        TUTORIAL = "tutorial", "Tutorial"
        GLOSSARY = "glossary", "Glossary"
        MARKET_BRIEF = "market_brief", "Market brief"
        CHECKLIST = "checklist", "Checklist"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        ARCHIVED = "archived", "Archived"

    title = models.CharField(max_length=180)
    resource_type = models.CharField(max_length=40, choices=ResourceType.choices)
    body = models.TextField()
    related_track = models.ForeignKey(
        LearningTrack, null=True, blank=True, on_delete=models.SET_NULL, related_name="resources"
    )
    related_product_category = models.ForeignKey(
        "catalog.ProductCategory", null=True, blank=True, on_delete=models.SET_NULL, related_name="learning_resources"
    )
    is_premium = models.BooleanField(default=False)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.DRAFT)

    class Meta:
        ordering = ["resource_type", "title"]
        indexes = [
            models.Index(fields=["status", "resource_type"]),
            models.Index(fields=["related_track", "status"]),
            models.Index(fields=["related_product_category", "status"]),
            models.Index(fields=["is_premium"]),
        ]

    def __str__(self) -> str:
        return self.title


class UserLessonProgress(TimestampedModel):
    class Status(models.TextChoices):
        NOT_STARTED = "not_started", "Not started"
        IN_PROGRESS = "in_progress", "In progress"
        COMPLETED = "completed", "Completed"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="lesson_progress")
    lesson = models.ForeignKey(LearningLesson, on_delete=models.CASCADE, related_name="user_progress")
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.NOT_STARTED)
    score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    attempts = models.PositiveIntegerField(default=0)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-updated_at"]
        unique_together = [("user", "lesson")]
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["lesson", "status"]),
            models.Index(fields=["completed_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.user_id}:{self.lesson_id}:{self.status}"


class UserCourseProgress(TimestampedModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="course_progress")
    course = models.ForeignKey(LearningCourse, on_delete=models.CASCADE, related_name="user_progress")
    percent_complete = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    last_lesson = models.ForeignKey(
        LearningLesson, null=True, blank=True, on_delete=models.SET_NULL, related_name="last_for_course_progress"
    )
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-updated_at"]
        unique_together = [("user", "course")]
        indexes = [
            models.Index(fields=["user", "course"]),
            models.Index(fields=["completed_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.user_id}:{self.course_id}:{self.percent_complete}"


class XPEvent(models.Model):
    class SourceType(models.TextChoices):
        LESSON = "lesson", "Lesson"
        QUIZ = "quiz", "Quiz"
        FLASHCARD = "flashcard", "Flashcard"
        SIMULATION = "simulation", "Simulation"
        JOURNAL = "journal", "Journal"
        SCAM_CHECK = "scam_check", "Scam check"
        STREAK = "streak", "Streak"
        COURSE = "course", "Course"
        TRACK = "track", "Track"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="xp_events")
    source_type = models.CharField(max_length=32, choices=SourceType.choices)
    source_id = models.CharField(max_length=80, blank=True)
    xp_amount = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = [("user", "source_type", "source_id")]
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["source_type", "source_id"]),
        ]

    def __str__(self) -> str:
        return f"{self.user_id}:{self.source_type}:{self.xp_amount}"


class Badge(TimestampedModel):
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=140, unique=True)
    description = models.TextField(blank=True)
    icon_key = models.CharField(max_length=80, blank=True)
    criteria_key = models.CharField(max_length=120, blank=True)

    class Meta:
        ordering = ["name"]
        indexes = [models.Index(fields=["criteria_key"])]

    def __str__(self) -> str:
        return self.name


class UserBadge(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="badges")
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE, related_name="awards")
    awarded_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-awarded_at"]
        unique_together = [("user", "badge")]
        indexes = [models.Index(fields=["user", "awarded_at"])]

    def __str__(self) -> str:
        return f"{self.user_id}:{self.badge.slug}"


class UserStreak(TimestampedModel):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="learning_streak")
    current_streak_days = models.PositiveIntegerField(default=0)
    longest_streak_days = models.PositiveIntegerField(default=0)
    last_activity_date = models.DateField(null=True, blank=True)
    streak_freezes_available = models.PositiveIntegerField(default=0)

    def __str__(self) -> str:
        return f"{self.user_id}:{self.current_streak_days}"
