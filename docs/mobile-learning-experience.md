# Mobile Learning Experience

PesaRoute mobile treats learning as a core surface using DataCamp-style mechanics, redesigned in
light-mode MaliPrime Liquid. It borrows mechanics only — no DataCamp branding, assets, screens,
icons, copy, or layouts. See
[datacamp-inspired-learning-model.md](datacamp-inspired-learning-model.md) for the model and
boundaries.

## Navigation (bottom tabs)

Migrated from `Home · Learn · Simulate · Journal · Profile` to:

**Home · Learn · Practice · Simulate · Profile**

- **Practice** is the new tab.
- **Journal** moved into the Profile tab's tools grid and stays reachable from the Learn tab and from
  "Save to journal" actions — no existing flow was lost.
- The **Profile** tab renders privacy/settings **plus** a tools grid (Journal, Route, Scam check,
  Portfolio mirror, Passports, Professional review, Premium, Inbox, Help, API), making every
  secondary screen reachable from one hub.

Navigation remains the existing `switch`-based shell in `App.tsx` (no React Navigation dependency
added), preserving auth/onboarding/anonymous flows.

## Home tab (learning dashboard)

`HomeScreen` now consumes `GET /api/learning/dashboard/` and leads with learning:
- **Top summary** — total XP, day streak, review count.
- **Continue learning** card — current lesson/track + Continue (→ Learn) and Practice (→ Practice)
  CTAs; an anonymous note nudges sign-in to sync across web and mobile.
- **Quick actions** — Flashcards (→ Learn), Practice (→ Practice), Scam check (→ scam), Simulate
  (→ Simulate).
- **Assess yourself** — links to the Assessments screen when assessments exist.
- **Daily money challenge** + suggested track.
- **Route builder preserved** — the amount/goal selector and "Start with my amount" flow remain
  below the dashboard, so no existing flow was lost.
- **Privacy promise** — no M-Pesa PIN, no bank passwords, no execution.

## Assessments (`src/screens/AssessmentsScreen.tsx`, new)

The Assess phase: list → intro → player → result, consuming `GET /api/learning/assessments/`,
`/assessments/{slug}/`, and `POST /api/learning/assessments/{slug}/submit/`. Money-profile, risk
comfort, scam awareness, and liquidity needs. Profile assessments return a band label; knowledge
assessments return a percent. Submitting awards XP once and requires sign-in. Reached from the Home
"Assess yourself" card and the Profile tools grid ("Assess").

## Practice tab (`src/screens/PracticeScreen.tsx`, new)

Four phases:
1. **Home** — practice sets from `GET /api/learning/practice/` with kind label, blurb, question
   count, XP, premium badge; free-access note + Premium CTA when not entitled.
2. **Intro** — title, description, number of questions, "no time limit", XP available, Start.
3. **Player** — one question per screen, large numbered answer cards, progress bar, Back/Next, and
   Submit on the last question.
4. **Results** — score, XP-awarded note, and per-question feedback (correct / correct answer +
   explanation).

`correct_answer` is hidden from public payloads, so grading is server-side via
`POST /api/learning/practice/{id}/submit/` and per-question feedback appears after the set.

## Learn tab

The Learn tab supports a Today dashboard (XP, streak, completed-lesson count, continue-learning,
daily money challenge, quick actions), Explore (search + filters), track cards (title, description,
level, time, lesson count, progress, premium badge), track/course/lesson detail, the full lesson
type set (concept, article, scenario, quiz, flashcard, simulation, checklist, journal prompt,
professional-review prompt), resources, and a library/progress view.

## Simulate tab

`ProductSimulationScreen` (category → filters → product list → compare → simulate → results) with
post-simulation **Save to journal**, **Learn this product**, and **Request professional review**.
Lesson-linked simulator runs award XP via `complete-with-action`. The legacy MMF/T-bill/SACCO/global
simulators remain as the generic simulator.

## API integration

Existing: `GET /api/learning/tracks/`, `/tracks/{slug}/`, `/courses/{slug}/`, `/resources/`,
`/my-progress/`, `/home/`, `/library/`, `/progress/`, lesson `start/complete/complete-with-action`,
`/xp/`, `/badges/`, `/streak/`.

Added this phase (client methods): `GET /api/learning/dashboard/`, `/tracks/{slug}/outline/`,
`/lessons/{id}/`, `/activity/`, `/practice/`, `/practice/{id}/`,
`POST /api/learning/practice/{id}/submit/`, `/assessments/`, `/assessments/{slug}/`,
`POST /api/learning/assessments/{slug}/submit/`, `POST /api/learning/library/save/`.

Anonymous users can browse; logged-in users sync lesson start/completion, practice submission, XP,
streak, badges, and progress. Practice/assessment payloads never expose correct answers.

## Offline fallback

The catalog uses an in-memory cache with mock fallback; journal/portfolio use the offline-first sync
queue (drafts are never lost; XP/progress sync when online). Practice questions and learning content
are fetched live this phase (no on-device cache yet).

## Premium

Premium learning uses the existing `premium_learning` entitlement. Locked premium lessons and
practice sets show a calm upgrade path (no discounts/urgency/get-rich language); free learning
remains available.

## XP & privacy boundaries

XP rewards learning only (lesson 10, quiz 5, practice 25, simulator 30, journal 20, assessment 100,
streak bonus 25, course 100, track 500); no return/portfolio gamification and no money leaderboard.
The mobile learning experience does not execute investments, collect money, ask for M-Pesa PINs,
bank passwords, or broker/MMF credentials, or call AI services.

## QA status

- ✅ Practice tab lists sets; intro → player → results; per-question feedback after submit; XP returned.
- ✅ Simulate-from-lesson and save-to-journal flows preserved; premium gate appears for locked sets.
- ✅ Anonymous users browse but cannot submit/save.
- ✅ `npm run typecheck` passes; `npm run test:logic` 22 tests pass (7 new practice tests).
- Backend unchanged this phase; suite remains at 146 passing.

## Cross-device sync

Web and mobile authenticate against the same backend with a per-user token, so XP, streak, lesson
completion, practice/assessment results, and library are the same account on both. A learner can
start on mobile and continue on web (or vice-versa); web now supports both sign-in and registration.

## Remaining mobile learning debt

- **No "practice this chapter" deep links** from specific lessons/tracks yet.
- **No standalone My Library / Activity screens** on mobile (they live as Learn-tab panels);
  `saveLearningLibrary` is wired in the client but not surfaced in UI.
- **No on-device caching** of practice questions/lessons for offline practice.
- **No mobile lint script** (eslint is web-only); mobile is verified via `tsc --noEmit` + `tsx --test`.
- **Practice question types render as multiple choice** (true/false, match-term presented as options).
