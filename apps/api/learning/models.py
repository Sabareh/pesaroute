from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from learning.content import (
    EDUCATIONAL_DISCLAIMER,
    find_banned_learning_phrase,
    flatten_structured_content,
    has_disclaimer_block,
    is_generic_placeholder,
)


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


class LearningContentSource(TimestampedModel):
    class SourceType(models.TextChoices):
        REGULATOR = "regulator", "Regulator"
        EXCHANGE = "exchange", "Exchange"
        GOVERNMENT = "government", "Government"
        PROVIDER = "provider", "Provider"
        EDITORIAL = "editorial", "Editorial"
        PROFESSIONAL_REVIEWED = "professional_reviewed", "Professional reviewed"

    class ReliabilityLevel(models.TextChoices):
        OFFICIAL = "official", "Official"
        PROVIDER = "provider", "Provider"
        EDITORIAL = "editorial", "Editorial"
        UNKNOWN = "unknown", "Unknown"

    title = models.CharField(max_length=220)
    organization = models.CharField(max_length=180, blank=True)
    source_type = models.CharField(max_length=40, choices=SourceType.choices, default=SourceType.EDITORIAL)
    url = models.URLField(blank=True)
    retrieved_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    reliability_level = models.CharField(
        max_length=40,
        choices=ReliabilityLevel.choices,
        default=ReliabilityLevel.UNKNOWN,
    )

    class Meta:
        ordering = ["organization", "title"]
        unique_together = [("title", "organization")]
        indexes = [
            models.Index(fields=["source_type", "reliability_level"]),
            models.Index(fields=["retrieved_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.organization}: {self.title}" if self.organization else self.title


class LearningLesson(TimestampedModel):
    class LessonType(models.TextChoices):
        CONCEPT = "concept", "Concept"
        ARTICLE = "article", "Article"
        SCENARIO = "scenario", "Scenario"
        QUIZ = "quiz", "Quiz"
        FLASHCARD = "flashcard", "Flashcard"
        SIMULATION = "simulation", "Simulation"
        SIMULATOR = "simulator", "Simulator"
        JOURNAL_PROMPT = "journal_prompt", "Journal prompt"
        CHECKLIST = "checklist", "Checklist"
        PROFESSIONAL_REVIEW_PROMPT = "professional_review_prompt", "Professional review prompt"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        ARCHIVED = "archived", "Archived"

    class Difficulty(models.TextChoices):
        BEGINNER = "beginner", "Beginner"
        INTERMEDIATE = "intermediate", "Intermediate"
        ADVANCED = "advanced", "Advanced"

    class EditorialStatus(models.TextChoices):
        DRAFT = "draft", "Draft"
        REVIEWED = "reviewed", "Reviewed"
        PUBLISHED = "published", "Published"
        ARCHIVED = "archived", "Archived"

    class SourceConfidence(models.TextChoices):
        OFFICIAL = "official", "Official"
        PROVIDER = "provider", "Provider"
        EDITORIAL = "editorial", "Editorial"
        MIXED = "mixed", "Mixed"
        UNKNOWN = "unknown", "Unknown"

    course = models.ForeignKey(LearningCourse, on_delete=models.CASCADE, related_name="lessons")
    module = models.ForeignKey(
        "LearningModule", null=True, blank=True, on_delete=models.SET_NULL, related_name="lessons"
    )
    title = models.CharField(max_length=180)
    slug = models.SlugField(max_length=200)
    lesson_type = models.CharField(max_length=40, choices=LessonType.choices, default=LessonType.ARTICLE)
    body = models.TextField(blank=True)
    summary = models.TextField(blank=True)
    structured_content = models.JSONField(default=list, blank=True)
    estimated_minutes = models.PositiveIntegerField(default=5)
    difficulty = models.CharField(max_length=32, choices=Difficulty.choices, default=Difficulty.BEGINNER)
    order = models.PositiveIntegerField(default=0)
    xp_reward = models.PositiveIntegerField(default=10)
    is_premium = models.BooleanField(default=False)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.DRAFT)
    editorial_status = models.CharField(
        max_length=32,
        choices=EditorialStatus.choices,
        default=EditorialStatus.DRAFT,
    )
    last_reviewed_at = models.DateTimeField(null=True, blank=True)
    next_review_due_at = models.DateTimeField(null=True, blank=True)
    review_frequency_days = models.PositiveIntegerField(default=180)
    source_confidence = models.CharField(
        max_length=32,
        choices=SourceConfidence.choices,
        default=SourceConfidence.UNKNOWN,
    )
    content_quality_score = models.PositiveSmallIntegerField(default=0)
    content_warning_flags = models.JSONField(default=list, blank=True)
    reviewer_notes = models.TextField(blank=True)
    content_sources = models.ManyToManyField(LearningContentSource, blank=True, related_name="lessons")

    class Meta:
        ordering = ["course__track__order", "course__order", "order", "title"]
        unique_together = [("course", "slug"), ("course", "order")]
        indexes = [
            models.Index(fields=["course", "status", "order"]),
            models.Index(fields=["lesson_type"]),
            models.Index(fields=["is_premium"]),
            models.Index(fields=["editorial_status"]),
            models.Index(fields=["next_review_due_at"]),
            models.Index(fields=["source_confidence"]),
            models.Index(fields=["content_quality_score"]),
        ]

    def __str__(self) -> str:
        return self.title

    @property
    def disclaimer(self) -> str:
        return EDUCATIONAL_DISCLAIMER

    def clean(self):
        errors = {}
        structured_text = flatten_structured_content(self.structured_content)
        banned_phrase = find_banned_learning_phrase(self.summary, self.body, structured_text)
        if banned_phrase:
            errors["body"] = f"Learning content contains banned advice-like phrase: {banned_phrase}"
        if is_generic_placeholder(self.body):
            errors["body"] = "Learning content cannot use the generic placeholder body."
        if self.status == self.Status.PUBLISHED:
            if not self.title:
                errors["title"] = "Published lessons need a title."
            if not self.summary:
                errors["summary"] = "Published lessons need a summary."
            if not self.structured_content:
                errors["structured_content"] = "Published lessons need structured content."
            elif not has_disclaimer_block(self.structured_content):
                errors["structured_content"] = "Published lessons need a disclaimer block."
            if self.editorial_status == self.EditorialStatus.DRAFT:
                errors["editorial_status"] = "Published lessons must be reviewed or clearly editorial."
        if errors:
            raise ValidationError(errors)


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
    flashcard_set = models.ForeignKey(
        "FlashcardSet", null=True, blank=True, on_delete=models.SET_NULL, related_name="cards"
    )
    front = models.TextField()
    back = models.TextField()
    example = models.TextField(blank=True)
    tag = models.CharField(max_length=80, blank=True)

    class Meta:
        ordering = ["lesson__order", "id"]
        indexes = [models.Index(fields=["lesson", "tag"]), models.Index(fields=["flashcard_set"])]

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

    class EditorialStatus(models.TextChoices):
        DRAFT = "draft", "Draft"
        REVIEWED = "reviewed", "Reviewed"
        PUBLISHED = "published", "Published"
        ARCHIVED = "archived", "Archived"

    class SourceConfidence(models.TextChoices):
        OFFICIAL = "official", "Official"
        PROVIDER = "provider", "Provider"
        EDITORIAL = "editorial", "Editorial"
        MIXED = "mixed", "Mixed"
        UNKNOWN = "unknown", "Unknown"

    title = models.CharField(max_length=180)
    resource_type = models.CharField(max_length=40, choices=ResourceType.choices)
    body = models.TextField()
    structured_content = models.JSONField(default=list, blank=True)
    related_track = models.ForeignKey(
        LearningTrack, null=True, blank=True, on_delete=models.SET_NULL, related_name="resources"
    )
    related_product_category = models.ForeignKey(
        "catalog.ProductCategory", null=True, blank=True, on_delete=models.SET_NULL, related_name="learning_resources"
    )
    is_premium = models.BooleanField(default=False)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.DRAFT)
    editorial_status = models.CharField(
        max_length=32,
        choices=EditorialStatus.choices,
        default=EditorialStatus.DRAFT,
    )
    last_reviewed_at = models.DateTimeField(null=True, blank=True)
    next_review_due_at = models.DateTimeField(null=True, blank=True)
    source_confidence = models.CharField(
        max_length=32,
        choices=SourceConfidence.choices,
        default=SourceConfidence.UNKNOWN,
    )
    content_quality_score = models.PositiveSmallIntegerField(default=0)
    reviewer_notes = models.TextField(blank=True)
    content_sources = models.ManyToManyField(LearningContentSource, blank=True, related_name="resources")

    class Meta:
        ordering = ["resource_type", "title"]
        indexes = [
            models.Index(fields=["status", "resource_type"]),
            models.Index(fields=["related_track", "status"]),
            models.Index(fields=["related_product_category", "status"]),
            models.Index(fields=["is_premium"]),
            models.Index(fields=["editorial_status"]),
            models.Index(fields=["next_review_due_at"]),
            models.Index(fields=["source_confidence"]),
            models.Index(fields=["content_quality_score"]),
        ]

    def __str__(self) -> str:
        return self.title

    @property
    def disclaimer(self) -> str:
        return EDUCATIONAL_DISCLAIMER

    def clean(self):
        errors = {}
        structured_text = flatten_structured_content(self.structured_content)
        banned_phrase = find_banned_learning_phrase(self.body, structured_text)
        if banned_phrase:
            errors["body"] = f"Learning resource contains banned advice-like phrase: {banned_phrase}"
        if is_generic_placeholder(self.body):
            errors["body"] = "Learning resource cannot use the generic placeholder body."
        if self.status == self.Status.PUBLISHED:
            if not self.title:
                errors["title"] = "Published resources need a title."
            if not self.body:
                errors["body"] = "Published resources need body content."
            if self.structured_content and not has_disclaimer_block(self.structured_content):
                errors["structured_content"] = "Structured resources need a disclaimer block."
            if self.editorial_status == self.EditorialStatus.DRAFT:
                errors["editorial_status"] = "Published resources must be reviewed or clearly editorial."
        if errors:
            raise ValidationError(errors)


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
        PRACTICE = "practice", "Practice set"
        ASSESSMENT = "assessment", "Assessment"

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


class LearningModule(TimestampedModel):
    """Chapter level between a course and its lessons (Track -> Course -> Module -> Lesson)."""

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        ARCHIVED = "archived", "Archived"

    course = models.ForeignKey(LearningCourse, on_delete=models.CASCADE, related_name="modules")
    title = models.CharField(max_length=180)
    slug = models.SlugField(max_length=200)
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)
    estimated_minutes = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.PUBLISHED)

    class Meta:
        ordering = ["course__order", "order", "title"]
        unique_together = [("course", "slug")]
        indexes = [models.Index(fields=["course", "status", "order"])]

    def __str__(self) -> str:
        return self.title


class FlashcardSet(TimestampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        ARCHIVED = "archived", "Archived"

    title = models.CharField(max_length=180)
    slug = models.SlugField(max_length=200, unique=True)
    description = models.TextField(blank=True)
    track = models.ForeignKey(
        LearningTrack, null=True, blank=True, on_delete=models.SET_NULL, related_name="flashcard_sets"
    )
    is_premium = models.BooleanField(default=False)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.PUBLISHED)

    class Meta:
        ordering = ["title"]
        indexes = [models.Index(fields=["status"]), models.Index(fields=["track", "status"])]

    def __str__(self) -> str:
        return self.title


class PracticeSet(TimestampedModel):
    class Kind(models.TextChoices):
        REVIEW_RECENT = "review_recent", "Review recent"
        WEAK_AREA = "weak_area", "Weak area"
        SCENARIO_PRACTICE = "scenario_practice", "Scenario practice"
        FLASHCARDS = "flashcards", "Flashcards"
        SIMULATOR_PRACTICE = "simulator_practice", "Simulator practice"
        SCAM_RED_FLAG_PRACTICE = "scam_red_flag_practice", "Scam red-flag practice"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        ARCHIVED = "archived", "Archived"

    title = models.CharField(max_length=180)
    slug = models.SlugField(max_length=200, unique=True)
    description = models.TextField(blank=True)
    kind = models.CharField(max_length=40, choices=Kind.choices, default=Kind.SCENARIO_PRACTICE)
    track = models.ForeignKey(
        LearningTrack, null=True, blank=True, on_delete=models.SET_NULL, related_name="practice_sets"
    )
    is_premium = models.BooleanField(default=False)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.PUBLISHED)
    order = models.PositiveIntegerField(default=0)
    xp_reward = models.PositiveIntegerField(default=25)

    class Meta:
        ordering = ["order", "title"]
        indexes = [
            models.Index(fields=["status", "order"]),
            models.Index(fields=["kind", "status"]),
            models.Index(fields=["track", "status"]),
            models.Index(fields=["is_premium"]),
        ]

    def __str__(self) -> str:
        return self.title


class PracticeQuestion(TimestampedModel):
    class Difficulty(models.TextChoices):
        EASY = "easy", "Easy"
        MEDIUM = "medium", "Medium"
        HARD = "hard", "Hard"

    practice_set = models.ForeignKey(PracticeSet, on_delete=models.CASCADE, related_name="questions")
    prompt = models.TextField()
    options = models.JSONField(default=list)
    correct_answer = models.CharField(max_length=240)
    explanation = models.TextField(blank=True)
    difficulty = models.CharField(max_length=32, choices=Difficulty.choices, default=Difficulty.EASY)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["practice_set", "order", "id"]
        indexes = [models.Index(fields=["practice_set", "order"])]

    def __str__(self) -> str:
        return self.prompt[:80]


class Assessment(TimestampedModel):
    """The "Assess" phase: profiling and awareness checks (not investment advice)."""

    class Kind(models.TextChoices):
        MONEY_PROFILE = "money_profile", "Money profile"
        RISK_COMFORT = "risk_comfort", "Risk comfort"
        SCAM_AWARENESS = "scam_awareness", "Scam awareness"
        LIQUIDITY_NEEDS = "liquidity_needs", "Liquidity needs"

    class Scoring(models.TextChoices):
        KNOWLEDGE = "knowledge", "Knowledge (percent correct)"
        PROFILE = "profile", "Profile (weighted bands)"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        ARCHIVED = "archived", "Archived"

    title = models.CharField(max_length=180)
    slug = models.SlugField(max_length=200, unique=True)
    description = models.TextField(blank=True)
    kind = models.CharField(max_length=40, choices=Kind.choices)
    scoring = models.CharField(max_length=20, choices=Scoring.choices, default=Scoring.PROFILE)
    # Band labels keyed by inclusive upper bound as a string, e.g. {"33": "Cautious", "66": "Balanced", "100": "Growth"}.
    result_bands = models.JSONField(default=dict, blank=True)
    pass_threshold = models.PositiveSmallIntegerField(default=0)
    is_premium = models.BooleanField(default=False)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.PUBLISHED)
    order = models.PositiveIntegerField(default=0)
    xp_reward = models.PositiveIntegerField(default=100)

    class Meta:
        ordering = ["order", "title"]
        indexes = [
            models.Index(fields=["status", "order"]),
            models.Index(fields=["kind", "status"]),
            models.Index(fields=["is_premium"]),
        ]

    def __str__(self) -> str:
        return self.title


class AssessmentQuestion(TimestampedModel):
    assessment = models.ForeignKey(Assessment, on_delete=models.CASCADE, related_name="questions")
    prompt = models.TextField()
    # options: list of {"label": str, "value": str, "weight": int, "correct": bool}
    options = models.JSONField(default=list)
    explanation = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["assessment", "order", "id"]
        indexes = [models.Index(fields=["assessment", "order"])]

    def __str__(self) -> str:
        return self.prompt[:80]


class UserAssessmentResult(TimestampedModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="assessment_results")
    assessment = models.ForeignKey(Assessment, on_delete=models.CASCADE, related_name="results")
    score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    result_label = models.CharField(max_length=120, blank=True)
    answers = models.JSONField(default=dict, blank=True)
    passed = models.BooleanField(default=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-updated_at"]
        unique_together = [("user", "assessment")]
        indexes = [models.Index(fields=["user", "assessment"]), models.Index(fields=["completed_at"])]

    def __str__(self) -> str:
        return f"{self.user_id}:{self.assessment_id}:{self.result_label}"


class UserLibraryItem(TimestampedModel):
    class Status(models.TextChoices):
        SAVED = "saved", "Saved"
        IN_PROGRESS = "in_progress", "In progress"
        COMPLETED = "completed", "Completed"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="library_items")
    track = models.ForeignKey(LearningTrack, on_delete=models.CASCADE, related_name="library_items")
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.SAVED)
    saved_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-saved_at"]
        unique_together = [("user", "track")]
        indexes = [models.Index(fields=["user", "status"])]

    def __str__(self) -> str:
        return f"{self.user_id}:{self.track_id}:{self.status}"
