from django.core.management.base import BaseCommand
from django.utils.text import slugify

from catalog.models import ProductCategory
from learning.content import EDUCATIONAL_DISCLAIMER, structured_lesson_content, sync_learning_sources
from learning.models import (
    Assessment,
    AssessmentQuestion,
    Flashcard,
    LearningCourse,
    LearningLesson,
    LearningModule,
    LearningResource,
    LearningTrack,
    PracticeQuestion,
    PracticeSet,
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
            ("Promised high payouts", "article"),
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


PRACTICE_SETS = [
    {
        "title": "Scam red-flag practice",
        "kind": PracticeSet.Kind.SCAM_RED_FLAG_PRACTICE,
        "track": "scam-defense",
        "description": "Spot the red flags in common Kenyan investment pitches.",
        "questions": [
            {
                "prompt": "A message says you must deposit within one hour to lock a 20% weekly return. What is the safest response?",
                "options": [
                    "Send a small amount to test it",
                    "Pause, verify the regulator, and refuse pressure",
                    "Ask a friend to invest first",
                    "Share your M-Pesa PIN to confirm identity",
                ],
                "correct_answer": "Pause, verify the regulator, and refuse pressure",
                "explanation": "Urgency plus unrealistic returns is a classic red flag. Verify before moving money.",
            },
            {
                "prompt": "Which request should always be refused?",
                "options": [
                    "A public regulator registration number",
                    "Your M-Pesa PIN or bank password",
                    "A written explanation of fees",
                    "Time to think it over",
                ],
                "correct_answer": "Your M-Pesa PIN or bank password",
                "explanation": "PesaRoute and legitimate providers never need your PIN or password.",
            },
        ],
    },
    {
        "title": "Liquidity scenario practice",
        "kind": PracticeSet.Kind.SCENARIO_PRACTICE,
        "track": "money-foundations",
        "description": "Decide whether a product fits when money may be needed soon.",
        "questions": [
            {
                "prompt": "You may need school-fee money in 6 weeks. Which factor matters most before choosing a product?",
                "options": ["Headline yield", "Withdrawal timeline and access", "Brand popularity", "Referral bonus"],
                "correct_answer": "Withdrawal timeline and access",
                "explanation": "When money is needed soon, liquidity matters more than the headline return.",
            },
        ],
    },
    {
        "title": "Recent review",
        "kind": PracticeSet.Kind.REVIEW_RECENT,
        "track": "money-foundations",
        "description": "Quick review of the core ideas you have seen recently.",
        "questions": [
            {
                "prompt": "Before money moves, what should you list first?",
                "options": ["Possible upside only", "What can go wrong", "The most exciting product", "A referral target"],
                "correct_answer": "What can go wrong",
                "explanation": "Naming downside and exit first keeps decisions grounded.",
            },
        ],
    },
]

ASSESSMENTS = [
    {
        "title": "Money profile quiz",
        "kind": Assessment.Kind.MONEY_PROFILE,
        "scoring": Assessment.Scoring.PROFILE,
        "description": "A short, private profile of how you currently handle money. Not investment advice.",
        "result_bands": {"33": "Building basics", "66": "Steady saver", "100": "Confident planner"},
        "questions": [
            {
                "prompt": "When you get income, what happens first?",
                "options": [
                    {"label": "It is usually spent quickly", "value": "spend", "weight": 0},
                    {"label": "I cover needs, then see what is left", "value": "needs", "weight": 1},
                    {"label": "I split needs, buffer, and goals on purpose", "value": "plan", "weight": 2},
                ],
            },
            {
                "prompt": "Do you keep an emergency buffer?",
                "options": [
                    {"label": "No buffer yet", "value": "none", "weight": 0},
                    {"label": "A small one", "value": "small", "weight": 1},
                    {"label": "A few months of needs", "value": "solid", "weight": 2},
                ],
            },
        ],
    },
    {
        "title": "Risk comfort quiz",
        "kind": Assessment.Kind.RISK_COMFORT,
        "scoring": Assessment.Scoring.PROFILE,
        "description": "Understand your comfort with ups and downs. This does not recommend any product.",
        "result_bands": {"33": "Prefers stability", "66": "Balanced", "100": "Comfortable with volatility"},
        "questions": [
            {
                "prompt": "If a learning simulation showed a possible short-term loss, you would feel:",
                "options": [
                    {"label": "Very uncomfortable", "value": "low", "weight": 0},
                    {"label": "Cautious but okay learning", "value": "mid", "weight": 1},
                    {"label": "Fine, I understand it can recover or not", "value": "high", "weight": 2},
                ],
            },
        ],
    },
    {
        "title": "Scam awareness quiz",
        "kind": Assessment.Kind.SCAM_AWARENESS,
        "scoring": Assessment.Scoring.KNOWLEDGE,
        "pass_threshold": 50,
        "description": "Check how well you spot unsafe investment pitches.",
        "result_bands": {"49": "Keep practicing", "100": "Scam aware"},
        "questions": [
            {
                "prompt": "Guaranteed high weekly returns usually mean:",
                "options": [
                    {"label": "A safe opportunity", "value": "safe", "correct": False},
                    {"label": "A red flag to slow down", "value": "redflag", "correct": True},
                ],
            },
            {
                "prompt": "A legitimate provider will:",
                "options": [
                    {"label": "Need your M-Pesa PIN", "value": "pin", "correct": False},
                    {"label": "Have verifiable regulator details", "value": "regulated", "correct": True},
                ],
            },
        ],
    },
    {
        "title": "Liquidity needs quiz",
        "kind": Assessment.Kind.LIQUIDITY_NEEDS,
        "scoring": Assessment.Scoring.PROFILE,
        "description": "Estimate how quickly you may need access to money. Educational only.",
        "result_bands": {"33": "Needs high access", "66": "Some flexibility", "100": "Can lock longer"},
        "questions": [
            {
                "prompt": "How soon might you need this money?",
                "options": [
                    {"label": "Within weeks", "value": "weeks", "weight": 0},
                    {"label": "Within a year", "value": "year", "weight": 1},
                    {"label": "Several years", "value": "years", "weight": 2},
                ],
            },
        ],
    },
]


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

            module, _module_created = LearningModule.objects.update_or_create(
                course=course,
                slug=f"{track_slug}-core-module",
                defaults={
                    "title": f"{track.title}: Core chapter",
                    "description": "Core chapter grouping the lessons in this course.",
                    "order": 1,
                    "estimated_minutes": track.estimated_minutes,
                    "status": LearningModule.Status.PUBLISHED,
                },
            )

            for lesson_order, (lesson_title, lesson_type) in enumerate(track_data["lessons"], start=1):
                content = structured_lesson_content(lesson_title, track.title, lesson_type)
                lesson_slug = slugify(lesson_title)
                lesson = LearningLesson.objects.filter(course=course, slug=lesson_slug).first()
                lesson_was_created = False
                order_conflict = LearningLesson.objects.filter(course=course, order=lesson_order)
                if lesson:
                    order_conflict = order_conflict.exclude(pk=lesson.pk)
                if order_conflict.exists():
                    continue
                if not lesson:
                    lesson = LearningLesson(course=course, slug=lesson_slug, order=lesson_order)
                    lesson_was_created = True
                lesson.title = lesson_title
                lesson.lesson_type = lesson_type
                lesson.body = content["body"]
                lesson.summary = content["summary"]
                lesson.structured_content = content["structured_content"]
                lesson.estimated_minutes = content["estimated_minutes"]
                lesson.difficulty = content["difficulty"]
                lesson.order = lesson_order
                lesson.xp_reward = 10
                lesson.is_premium = track.is_premium
                lesson.status = LearningLesson.Status.PUBLISHED
                lesson.editorial_status = content["editorial_status"]
                lesson.last_reviewed_at = content["last_reviewed_at"]
                lesson.next_review_due_at = content["next_review_due_at"]
                lesson.reviewer_notes = content["reviewer_notes"]
                lesson.module = module
                lesson.save()
                sync_learning_sources(lesson, content["source_keys"])
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
                    "structured_content": [
                        {"type": "heading", "text": f"{track.title} checklist"},
                        {
                            "type": "checklist",
                            "title": "Before money moves",
                            "items": [
                                "Verify provider details and public source references where available.",
                                "Compare fees, liquidity, documents, and what can go wrong.",
                                "Use ranges or hidden amounts if exact values feel too private.",
                                "Ask for licensed professional review when the decision is material.",
                            ],
                        },
                        {"type": "disclaimer", "text": EDUCATIONAL_DISCLAIMER},
                    ],
                    "related_track": track,
                    "related_product_category": category,
                    "is_premium": track.is_premium,
                    "status": LearningResource.Status.PUBLISHED,
                    "editorial_status": LearningResource.EditorialStatus.REVIEWED,
                },
            )
            resource = LearningResource.objects.get(title=f"{track.title} checklist")
            sync_learning_sources(resource, ["pesaroute_editorial"])

        self._seed_practice_sets()
        self._seed_assessments()

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded learning engine: {LearningTrack.objects.count()} tracks, "
                f"{LearningLesson.objects.count()} lessons, {PracticeSet.objects.count()} practice sets, "
                f"{Assessment.objects.count()} assessments. New tracks={tracks_created}, new lessons={lessons_created}."
            )
        )

    def _seed_practice_sets(self):
        for order, data in enumerate(PRACTICE_SETS, start=1):
            track = LearningTrack.objects.filter(slug=data["track"]).first()
            practice_set, _created = PracticeSet.objects.update_or_create(
                slug=slugify(data["title"]),
                defaults={
                    "title": data["title"],
                    "description": data["description"],
                    "kind": data["kind"],
                    "track": track,
                    "is_premium": False,
                    "status": PracticeSet.Status.PUBLISHED,
                    "order": order,
                    "xp_reward": 25,
                },
            )
            for question_order, question in enumerate(data["questions"], start=1):
                PracticeQuestion.objects.update_or_create(
                    practice_set=practice_set,
                    prompt=question["prompt"],
                    defaults={
                        "options": question["options"],
                        "correct_answer": question["correct_answer"],
                        "explanation": question["explanation"],
                        "order": question_order,
                    },
                )

    def _seed_assessments(self):
        for order, data in enumerate(ASSESSMENTS, start=1):
            assessment, _created = Assessment.objects.update_or_create(
                slug=slugify(data["title"]),
                defaults={
                    "title": data["title"],
                    "description": data["description"],
                    "kind": data["kind"],
                    "scoring": data["scoring"],
                    "result_bands": data["result_bands"],
                    "pass_threshold": data.get("pass_threshold", 0),
                    "is_premium": False,
                    "status": Assessment.Status.PUBLISHED,
                    "order": order,
                    "xp_reward": 100,
                },
            )
            for question_order, question in enumerate(data["questions"], start=1):
                AssessmentQuestion.objects.update_or_create(
                    assessment=assessment,
                    prompt=question["prompt"],
                    defaults={
                        "options": question["options"],
                        "explanation": question.get("explanation", ""),
                        "order": question_order,
                    },
                )
