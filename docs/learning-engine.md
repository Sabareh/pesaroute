# PesaRoute Learning Engine

PesaRoute's learning engine is an investment literacy system for Kenya-first users. It supports learning tracks, courses, lessons, quizzes, flashcards, resources, XP, streaks, progress, badges, and premium unlocks.

The learning loop is:

```text
Learn -> Practice -> Simulate -> Journal -> Review
```

## Product Boundaries

Learning content must stay educational:

- PesaRoute does not hold user money.
- PesaRoute does not execute investments.
- PesaRoute does not act as a broker, fund manager, or robo-adviser.
- PesaRoute does not ask for M-Pesa PINs, bank passwords, broker credentials, MMF credentials, or wallet secrets.
- PesaRoute does not promise returns.
- XP and badges are app progress only, not financial rewards.
- Content must not rank investments as "best" or pressure users to invest.

## Backend App

The backend app is `learning`.

Core content models:

- `LearningTrack`
- `LearningCourse`
- `LearningLesson`
- `QuizQuestion`
- `Flashcard`
- `LearningResource`

User progress models:

- `UserLessonProgress`
- `UserCourseProgress`
- `XPEvent`
- `Badge`
- `UserBadge`
- `UserStreak`

## Public APIs

These endpoints are public and return published learning content.

```text
GET /api/learning/tracks/
GET /api/learning/tracks/{slug}/
GET /api/learning/courses/{slug}/
GET /api/learning/resources/
GET /api/learning/resources/{id}/
```

Premium lessons may appear in public track/course responses, but locked lesson bodies are hidden unless the user has the `premium_learning` entitlement.

## Authenticated APIs

These endpoints require `Authorization: Token <token>`.

```text
GET  /api/learning/my-progress/
POST /api/learning/lessons/{id}/start/
POST /api/learning/lessons/{id}/complete/
POST /api/learning/quiz/{id}/submit/
POST /api/learning/flashcards/{id}/review/
GET  /api/learning/xp/
GET  /api/learning/badges/
GET  /api/learning/streak/
```

Anonymous users can view public learning content but cannot save progress, earn XP, update streaks, or earn badges.

## XP Rules

Current backend rules:

- Complete lesson: lesson `xp_reward`, seeded as `10 XP`
- Pass quiz: `20 XP`
- Review flashcard: `5 XP`
- Complete course: `100 XP`
- Complete track: `500 XP`

Reserved product rules for integration points:

- Complete simulator from lesson: `25 XP`
- Create journal entry from lesson: `20 XP`
- Complete scam check exercise: `20 XP`

XP events are idempotent per `user + source_type + source_id`, so duplicate API calls do not repeatedly inflate XP.

## Streaks

Learning activity updates `UserStreak` once per local date:

- same-day activity keeps the streak unchanged
- next-day activity increments the streak
- missed days reset the current streak to `1`
- longest streak is preserved

## Badges

Seeded badge examples:

- First Step Investor
- Scam Defender
- MMF Beginner
- Treasury Starter
- SACCO Smart Member
- Chama Ready
- Global Investing Learner
- Land Due Diligence Aware
- Private Planner

Badges are awarded conservatively from lesson/course context. They do not imply investment competence, returns, or platform endorsement.

## Premium Unlocks

Premium learning content uses the existing billing/entitlement system.

Required entitlement:

```text
premium_learning
```

Premium monthly and yearly plans include this entitlement when billing plans are seeded.

## Seed Data

Run:

```bash
cd apps/api
python manage.py seed_learning
```

Seeded tracks:

- Money Foundations
- First Salary Money Plan
- Money Market Funds
- Treasury Bills and Bonds
- SACCO Smart Member
- Chama Investment Basics
- NSE Stocks for Beginners
- Global Stocks and ETFs
- Land Due Diligence Basics
- Scam Defense
- Diaspora Investing in Kenya
- Farmer Seasonal Money Plan
- Jua Kali Daily Income Plan

The seed command also creates starter resources, flashcards, quiz questions, and badges.

## Verification

Useful backend commands:

```bash
cd apps/api
python manage.py migrate
python manage.py seed_learning
pytest tests/test_learning.py
pytest
```

## Next Work

Recommended next tasks:

- Add mobile Learning screen backed by `/api/learning/tracks/`.
- Connect simulator lessons to simulator screens and award reserved XP.
- Connect journal prompt lessons to local/cloud journal creation.
- Add learning progress summaries to Profile/Privacy.
- Add web public learning pages for SEO-friendly educational content.
