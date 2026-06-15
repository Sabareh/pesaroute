from django.core.management.base import BaseCommand
from django.utils.text import slugify

from catalog.models import ProductCategory
from learning.models import (
    Flashcard,
    LearningCourse,
    LearningLesson,
    LearningResource,
    LearningTrack,
    QuizQuestion,
)
from learning.services import ensure_default_badges

TRACKS = [
    {
        "title": "Money Foundations",
        "target_user_type": LearningTrack.TargetUserType.GENERAL,
        "estimated_minutes": 40,
        "lessons": [
            ("What is an emergency fund?", "article"),
            ("Why liquidity matters", "article"),
            ("Risk vs return", "quiz"),
            ("How to avoid investment pressure", "checklist"),
        ],
    },
    {
        "title": "First Salary Money Plan",
        "target_user_type": LearningTrack.TargetUserType.FIRST_JOBBER,
        "estimated_minutes": 35,
        "lessons": [
            ("Split needs, buffer, and learning money", "article"),
            ("Avoid pressure after payday", "checklist"),
            ("Journal prompt: What can wait?", "journal_prompt"),
        ],
    },
    {
        "title": "Money Market Funds",
        "target_user_type": LearningTrack.TargetUserType.GENERAL,
        "estimated_minutes": 45,
        "lessons": [
            ("What is a Money Market Fund?", "article"),
            ("Why highest yield is not always best", "article"),
            ("MMF simulator practice", "simulation"),
            ("Journal prompt: Why am I choosing an MMF?", "journal_prompt"),
        ],
    },
    {
        "title": "Treasury Bills and Bonds",
        "target_user_type": LearningTrack.TargetUserType.GENERAL,
        "estimated_minutes": 50,
        "lessons": [
            ("What is a Treasury Bill?", "article"),
            ("What is a Treasury Bond?", "article"),
            ("What is DhowCSD?", "article"),
            ("T-bill simulator practice", "simulation"),
        ],
    },
    {
        "title": "SACCO Smart Member",
        "target_user_type": LearningTrack.TargetUserType.GENERAL,
        "estimated_minutes": 45,
        "lessons": [
            ("Share capital vs deposits", "article"),
            ("Loan multiplier", "article"),
            ("Guarantor risk", "checklist"),
            ("SACCO simulator practice", "simulation"),
        ],
    },
    {
        "title": "Chama Investment Basics",
        "target_user_type": LearningTrack.TargetUserType.CHAMA_MEMBER,
        "estimated_minutes": 35,
        "lessons": [
            ("Agree the goal before contributions", "article"),
            ("Keep records and approvals", "checklist"),
            ("Review member risk openly", "professional_review_prompt"),
        ],
    },
    {
        "title": "NSE Stocks for Beginners",
        "target_user_type": LearningTrack.TargetUserType.GENERAL,
        "estimated_minutes": 55,
        "lessons": [
            ("Shares, dividends, and price movement", "article"),
            ("Broker and CDS account basics", "article"),
            ("Avoid hot tips", "checklist"),
        ],
    },
    {
        "title": "Global Stocks and ETFs",
        "target_user_type": LearningTrack.TargetUserType.DIASPORA,
        "estimated_minutes": 60,
        "is_premium": True,
        "lessons": [
            ("ETFs vs individual stocks", "article"),
            ("USD/KES currency risk", "article"),
            ("Platform risk", "checklist"),
            ("Global route simulator practice", "simulation"),
        ],
    },
    {
        "title": "Land Due Diligence Basics",
        "target_user_type": LearningTrack.TargetUserType.GENERAL,
        "estimated_minutes": 60,
        "is_premium": True,
        "lessons": [
            ("Why land is not always liquid", "article"),
            ("Before deposit checklist", "checklist"),
            ("When to involve a lawyer", "article"),
            ("Journal prompt: What have I verified?", "journal_prompt"),
        ],
    },
    {
        "title": "Scam Defense",
        "target_user_type": LearningTrack.TargetUserType.GENERAL,
        "estimated_minutes": 45,
        "lessons": [
            ("Guaranteed returns", "article"),
            ("Recruitment schemes", "article"),
            ("Pressure tactics", "checklist"),
            ("Paste a suspicious pitch into scam checker", "simulation"),
        ],
    },
    {
        "title": "Diaspora Investing in Kenya",
        "target_user_type": LearningTrack.TargetUserType.DIASPORA,
        "estimated_minutes": 50,
        "is_premium": True,
        "lessons": [
            ("Verify providers while abroad", "checklist"),
            ("Currency and timing risk", "article"),
            ("Who can act on your behalf?", "professional_review_prompt"),
        ],
    },
    {
        "title": "Farmer Seasonal Money Plan",
        "target_user_type": LearningTrack.TargetUserType.FARMER,
        "estimated_minutes": 35,
        "lessons": [
            ("Separate harvest money from household money", "article"),
            ("Plan before the next planting season", "journal_prompt"),
            ("Liquidity between seasons", "article"),
        ],
    },
    {
        "title": "Jua Kali Daily Income Plan",
        "target_user_type": LearningTrack.TargetUserType.JUA_KALI,
        "estimated_minutes": 35,
        "lessons": [
            ("Daily income needs a weekly plan", "article"),
            ("Protect emergency money", "checklist"),
            ("Record decisions simply", "journal_prompt"),
        ],
    },
]


def lesson_body(title: str, track_title: str, lesson_type: str) -> str:
    return (
        f"{title} in the {track_title} track. This lesson is educational only. "
        "Compare risks, costs, liquidity, and provider/regulator checks before moving money. "
        "PesaRoute does not hold money, execute investments, promise returns, or ask for M-Pesa PINs, "
        "bank passwords, broker credentials, or MMF credentials."
        if lesson_type != LearningLesson.LessonType.SIMULATION
        else (
            f"{title} in the {track_title} track. "
            "Use the simulator to test assumptions before journaling your decision. "
            "A simulation is not a recommendation, prediction, or promised return."
        )
    )


class Command(BaseCommand):
    help = "Seed PesaRoute learning tracks, lessons, quizzes, flashcards, badges, and starter resources."

    def handle(self, *args, **options):
        ensure_default_badges()
        tracks_created = 0
        lessons_created = 0

        for track_order, track_data in enumerate(TRACKS, start=1):
            track_slug = slugify(track_data["title"])
            track, track_was_created = LearningTrack.objects.update_or_create(
                slug=track_slug,
                defaults={
                    "title": track_data["title"],
                    "description": f"A Kenya-first investment literacy path for {track_data['title'].lower()}.",
                    "level": LearningTrack.Level.BEGINNER,
                    "target_user_type": track_data["target_user_type"],
                    "estimated_minutes": track_data["estimated_minutes"],
                    "is_premium": track_data.get("is_premium", False),
                    "status": LearningTrack.Status.PUBLISHED,
                    "order": track_order,
                },
            )
            tracks_created += int(track_was_created)

            course, _course_created = LearningCourse.objects.update_or_create(
                slug=f"{track_slug}-core",
                defaults={
                    "track": track,
                    "title": f"{track.title}: Core lessons",
                    "description": (
                        "Short lessons that connect learning to practice, simulation, journaling, and review."
                    ),
                    "order": 1,
                    "estimated_minutes": track.estimated_minutes,
                    "is_premium": track.is_premium,
                    "status": LearningCourse.Status.PUBLISHED,
                },
            )

            for lesson_order, (lesson_title, lesson_type) in enumerate(track_data["lessons"], start=1):
                lesson, lesson_was_created = LearningLesson.objects.update_or_create(
                    course=course,
                    slug=slugify(lesson_title),
                    defaults={
                        "title": lesson_title,
                        "lesson_type": lesson_type,
                        "body": lesson_body(lesson_title, track.title, lesson_type),
                        "summary": f"Understand {lesson_title.lower()} before taking the next step.",
                        "order": lesson_order,
                        "xp_reward": 10,
                        "is_premium": track.is_premium,
                        "status": LearningLesson.Status.PUBLISHED,
                    },
                )
                lessons_created += int(lesson_was_created)
                if lesson_order == 1:
                    Flashcard.objects.update_or_create(
                        lesson=lesson,
                        front=f"What should you check before acting on {lesson_title.lower()}?",
                        defaults={
                            "back": (
                                "Check risk, liquidity, fees, provider or regulator status, "
                                "and whether you feel pressured."
                            ),
                            "example": "Use ranges and private notes before sharing exact details.",
                            "tag": track_slug,
                        },
                    )
                if lesson.lesson_type == LearningLesson.LessonType.QUIZ:
                    QuizQuestion.objects.update_or_create(
                        lesson=lesson,
                        prompt="Which statement fits PesaRoute's learning-first approach?",
                        defaults={
                            "options": [
                                "Move money quickly when returns sound high",
                                "Compare risk and liquidity before moving money",
                                "Share your M-Pesa PIN for verification",
                                "Treat XP as financial reward",
                            ],
                            "correct_answer": "Compare risk and liquidity before moving money",
                            "explanation": (
                                "Learning should happen before money moves. XP is only app progress, not money."
                            ),
                            "difficulty": QuizQuestion.Difficulty.EASY,
                        },
                    )

            category = ProductCategory.objects.filter(name__icontains=track.title.split()[0]).first()
            LearningResource.objects.update_or_create(
                title=f"{track.title} checklist",
                defaults={
                    "resource_type": LearningResource.ResourceType.CHECKLIST,
                    "body": (
                        f"Use this checklist for {track.title}. Verify provider details, fees, liquidity, risks, "
                        "and whether you need professional review. Educational only."
                    ),
                    "related_track": track,
                    "related_product_category": category,
                    "is_premium": track.is_premium,
                    "status": LearningResource.Status.PUBLISHED,
                },
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded learning engine: {LearningTrack.objects.count()} tracks, "
                f"{LearningLesson.objects.count()} lessons. New tracks={tracks_created}, new lessons={lessons_created}."
            )
        )
