# PesaRoute Learning Product Model

PesaRoute's learning module follows a learning-operating-system pattern (Assess → Learn →
Practice → Apply → Review), adapted for Kenyan investment literacy. It borrows product
mechanics — not branding, UI, or copy — from platforms like DataCamp.

PesaRoute does **not** hold money, execute investments, act as a broker or fund manager, ask for
M-Pesa PINs / bank passwords / broker credentials, promise returns, or give unlicensed advice. XP
rewards **learning behaviour only** — never portfolio size or simulated returns.

---

## Learning model

| Phase | PesaRoute translation | Backing models / endpoints |
|-------|----------------------|----------------------------|
| **Assess** | money profile, risk comfort, scam awareness, liquidity needs | `Assessment`, `AssessmentQuestion`, `UserAssessmentResult` · `/assessments/` |
| **Learn** | tracks, courses, modules, lessons, glossary, resources | `LearningTrack/Course/Module/Lesson`, `LearningResource` · `/tracks/`, `/courses/`, `/resources/` |
| **Practice** | quizzes, flashcards, scenarios, weak-area review, daily challenge | `PracticeSet`, `PracticeQuestion`, `Flashcard(Set)`, `QuizQuestion` · `/practice/` |
| **Apply** | simulations, checklists, journal prompts, professional review, product comparison | lesson `complete-with-action`, planning simulators, journal, marketplace |
| **Review** | activity, XP, streaks, badges, library, completed tracks | `XPEvent`, `UserStreak`, `Badge/UserBadge`, `UserLibraryItem` · `/activity/`, `/progress/`, `/library/` |

---

## Content hierarchy

```
LearningTrack
└── LearningCourse
    └── LearningModule (chapter)        # optional layer; lessons may attach to a module or the course root
        └── LearningLesson              # concept | article | scenario | quiz | flashcard |
                                        # simulation/simulator | checklist | journal_prompt |
                                        # professional_review_prompt
            ├── QuizQuestion
            └── Flashcard ── FlashcardSet (optional grouping)
```

`LearningModule` is additive: `LearningLesson.module` is nullable, so existing content-pack
lessons (which attach directly to a course) keep working, and outline endpoints show module
groups plus any course-root lessons.

**Practice** and **Assess** are standalone subsystems (not lesson-attached):

```
PracticeSet (review_recent | weak_area | scenario_practice | flashcards |
             simulator_practice | scam_red_flag_practice)
└── PracticeQuestion

Assessment (money_profile | risk_comfort | scam_awareness | liquidity_needs)
└── AssessmentQuestion          # scoring: knowledge (% correct) or profile (weighted bands)
```

---

## XP model

XP rewards learning behaviour. It is never a financial reward, never ranks users by portfolio or
simulated returns, and is awarded **once** per source (enforced by the `XPEvent`
`unique_together(user, source_type, source_id)`).

| Behaviour | XP | Source type / id |
|-----------|----|------------------|
| Lesson complete | 10 | `lesson:<id>` |
| Quiz correct | 5 | `quiz:<question_id>` |
| Flashcard review | 5 | `flashcard:<id>` |
| Practice set complete | 25 | `practice:<set_id>` |
| Simulator complete (lesson-linked) | 30 | `simulation:lesson:<id>:simulation:<run_id>` |
| Journal reflection complete | 20 | `journal:lesson:<id>:journal:<entry_id>` |
| Assessment passed | 100 | `assessment:<id>` |
| Course complete | 100 | `course:<id>` |
| Track complete | 500 | `track:<id>` |
| Daily streak bonus | 25 | `streak:<YYYY-MM-DD>` |

The daily streak bonus is granted by `touch_streak()` on the first XP-earning activity of the day
(recursion-safe: the nested streak touch returns early once the day is marked).

---

## Premium model

- **Free:** starter lessons, some practice, limited simulations, product passports, all
  assessments (profiling stays free).
- **Premium** (`EntitlementCode.PREMIUM_LEARNING`): advanced tracks/courses/lessons, premium
  practice sets, advanced simulations, downloadable checklists, packs, professional review prep.

Gating helpers: `can_access_lesson`, `can_access_practice_set`, `can_access_assessment`,
`can_access_premium_learning`. Locked content returns `locked: true` and an empty body/questions
list rather than leaking premium material.

---

## API surface

### Dashboard & review
- `GET /api/learning/dashboard/` — greeting, premium status, total XP, daily streak, review count,
  current track, continue-learning item, suggested practice, suggested simulator, recent activity,
  assessments, quick actions.
- `GET /api/learning/activity/` — XP events, recent completions, assessment results.
- `GET /api/learning/progress/`, `/my-progress/`, `/streak/`, `/badges/`, `/xp/`.

### Learn
- `GET /api/learning/tracks/`, `/tracks/{slug}/`, `/tracks/{slug}/outline/`
- `GET /api/learning/courses/{slug}/`, `/courses/{slug}/outline/`
- `GET /api/learning/resources/`, `/resources/{id}/`
- `POST /api/learning/lessons/{id}/start|complete|complete-with-action/`
- `POST /api/learning/quiz/{id}/submit/`, `/flashcards/{id}/review/`

### Practice
- `GET /api/learning/practice/` (filter `?kind=&track=`), `/practice/review/`, `/practice/{id}/`
- `POST /api/learning/practice/{id}/submit/` → grades, awards 25 XP once.

### Assess
- `GET /api/learning/assessments/` (filter `?kind=`), `/assessments/{slug}/`, `/assessments/results/`
- `POST /api/learning/assessments/{slug}/submit/` → scores (knowledge % or profile band), awards
  100 XP once when passed.

### Library
- `GET /api/learning/library/` — saved/in-progress/completed tracks.
- `POST /api/learning/library/save/` — save a track to the library.

**Privacy of answers:** public practice/assessment payloads never expose `correct_answer`, option
`weight`, or `correct` flags. Grading happens server-side only.

**Anonymous access:** anyone can browse tracks, outlines, practice lists, and assessments. Saving
to the library and submitting practice/assessments require authentication (progress and XP are
never stored for anonymous users).

---

## Navigation (recommended)

**Web sidebar:** Dashboard · My Activity · Progress · Learn (Tracks, Courses, Practice,
Assessments, Resources) · Apply (Simulations, Journal Prompts, Product Comparisons, Professional
Reviews) · Privacy · Settings.

**Mobile bottom tabs — Option A (chosen):** Home · Learn · Practice · Simulate · Profile. The
mobile Home surfaces learning, practice, and simulation CTAs. Option A fits the current
switch-based navigation and the existing Simulate tab from Phase 2.9.3.

---

## Seed data

`python manage.py seed_learning` (idempotent) seeds:
- 13 tracks (Money Foundations, First Salary Money Plan, Money Market Funds, Treasury Bills and
  Bonds, SACCO Smart Member, Chama Investment Basics, NSE Stocks for Beginners, Global Stocks and
  ETFs, Land Due Diligence Basics, Scam Defense, Diaspora Investing in Kenya, Farmer Seasonal Money
  Plan, Jua Kali Daily Income Plan), each with a core course, a core module, lessons, a checklist
  resource, a flashcard, and badges.
- 3 starter practice sets (scam red-flag, liquidity scenario, recent review).
- 4 assessments (money profile, risk comfort, scam awareness, liquidity needs).

Deeper authored content (39+ quiz questions, 65+ flashcards, glossary, resources across the 13
tracks) is imported separately via
`python manage.py import_learning_content_pack --path content/kenya_investment_lessons --publish`.

---

## Tests

- `tests/test_learning.py` — existing lesson/quiz/flashcard/progress/XP/badge/premium/content-pack
  coverage (XP values aligned to the table above).
- `tests/test_learning_product.py` — dashboard, track/course outline, practice list/detail/submit,
  practice XP + idempotency, assessment detail (weights hidden), assessment submit + scoring + XP +
  idempotency, library save/list, premium gating, anonymous browse-vs-submit, no-leak checks.

---

## Remaining gaps

- **Frontend rebuild not included.** The web sidebar (Dashboard/Learn/Practice/Assessments/…) and
  the mobile bottom-tab redesign (Option A) are specified above but not yet implemented; the
  current web `/learning` page and mobile `LearnScreen` still use the prior layout. They can now
  consume `/dashboard/`, `/practice/`, and `/assessments/`.
- **Module hierarchy is shallow** — `seed_learning` creates one module per course. Multi-module
  courses and the content-pack importer attaching lessons to modules are future work.
- **Practice/assessment content is starter-only** — 3 practice sets and 4 assessments. Authoring a
  full practice + assessment library per track (and weak-area practice driven by real wrong-answer
  history) is future work.
- **Final per-track assessment + completion badge** — track-level final assessments and
  auto-awarded completion badges per track are not yet wired (track-complete XP exists).
- **Glossary** is delivered as `LearningResource` (glossary type) rather than a dedicated model.
