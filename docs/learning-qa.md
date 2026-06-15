# Learning QA

## Tested Flows

- Anonymous user can fetch and view public learning tracks.
- Authenticated user can complete a lesson and receive lesson XP.
- Completing a lesson with a simulator run links the `SimulationRun` to the lesson and awards simulator XP.
- Completing a lesson with a journal entry links the journal reflection to the lesson, course, and track and awards journal XP.
- Streak updates once per day even if multiple learning actions happen on the same date.
- Premium lessons remain locked for free users and unlock when the user has the `premium_learning` entitlement.
- Learning home endpoint returns streak, XP, continue item, recommended track, daily challenge, badges, and quick actions.
- Learning progress endpoint returns XP, streak, badges, completed lessons, simulator count, and journal reflection count.
- Consultation requests can include learning track and journal context.
- Mobile Learn tab typechecks with learning home, library, progress, and action-completion client calls.

## Known Bugs / Beta Caveats

- Mobile quiz and flashcard content still uses deterministic local prompts because the public lesson list does not expose quiz question or flashcard records yet.
- Mobile simulator lessons mark progress from the first returned simulator run when all simulator cards are run together.
- Journal reflections created from the Learn tab are saved locally first and also sent directly to the backend when logged in; cloud sync reconciliation should be watched during beta.
- Professional review from a lesson creates a basic consultation request with learning context but does not yet open a dedicated prefilled review form.
- Anonymous users can practice locally, but XP and streaks require login.

## Remaining Debt

- Add public lesson-detail endpoints for quiz questions and flashcards with premium-safe body filtering.
- Add a dedicated simulator-per-lesson flow so an MMF lesson opens only the MMF simulator.
- Add a learning-aware consultation request screen with explicit data-sharing choices before submission.
- Add saved-track/bookmark models if users need a real library beyond in-progress courses.
- Add analytics-free local QA instrumentation for learning loop drop-off points.

## Beta Testing Checklist

- Start app anonymously and open Learn.
- Search tracks and apply filters.
- Open a beginner track and complete an article lesson.
- Complete a local quiz and verify feedback copy avoids investment advice.
- Open a flashcard and use Got it / Review again.
- Log in, start a track, complete a lesson, and verify XP/streak updates.
- Open a simulator lesson, run API simulators, and verify progress updates.
- Save a reflection from a lesson and confirm the journal entry remains private.
- Open Library and Progress panels after completing actions.
- Open a premium lesson as a free user and confirm lock/upgrade copy is clear and non-aggressive.
- Grant premium in dev and confirm the premium lesson body is accessible.
- Request professional review from a learning prompt and confirm only learning context is attached.

## Private Beta Readiness

The learning loop is ready for small private-beta validation if testers understand that quiz/flashcard content is still local and deterministic on mobile. The backend foundations for XP, streaks, premium locks, simulator/journal action XP, and learning-context review requests are in place.
