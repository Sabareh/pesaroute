# DataCamp-inspired learning model (PesaRoute adaptation)

PesaRoute's learning product borrows **mechanics** from learning platforms like DataCamp and
re-applies them to Kenyan investment literacy. It does **not** copy DataCamp branding, assets,
screens, icons, copy, or layouts. PesaRoute is light-mode MaliPrime Liquid; DataCamp's dark
green/purple aesthetic is not used.

## Mechanics borrowed → PesaRoute meaning

| Mechanic (generic) | PesaRoute adaptation |
|--------------------|----------------------|
| Home dashboard | Learning home: XP, streak, review count, continue-learning hero |
| Continue learning | Resume the current track's next lesson |
| Explore tracks | Investment-literacy tracks (MMF, T-bills, SACCO, scam defense, …) |
| Courses → chapters → exercises | Tracks → courses → modules → lessons |
| Practice mode | Money-decision practice sets (scenario, scam red-flag, review, weak-area) |
| Flashcards | Term/meaning review for investment vocabulary |
| Assessments | Assess phase: money profile, risk comfort, scam awareness, liquidity needs |
| Library | Saved/in-progress/completed tracks |
| Activity / progress | XP, streak, badges, completed lessons/simulations/journal reflections |
| Streaks & XP | Reward **learning behaviour only** |
| Premium lock | Calm upgrade screen for advanced learning |
| Resources drawer | Guides, checklists, cheat sheets, glossary, market briefs |
| Settings | Profile, privacy, subscription, support |

## Hard boundaries (what we deliberately do NOT borrow)

- **No gamification of investment returns.** XP rewards lessons, practice, assessments, simulations
  run for learning, and streaks — never returns, profit, or portfolio size.
- **No leaderboards by money or portfolio.** Any future leaderboard is XP-only and optional.
- **No coding exercises.** DataCamp's code editor is replaced with money-decision scenarios
  (multiple choice, true/false, scenario decision, identify-the-red-flag, choose-safer-next-step,
  match-term-to-meaning).
- **No advice / execution.** No AI, no M-Pesa, no investment execution, no account linking, no
  promises of returns. Lessons always carry sources and an educational disclaimer.
- **No pressure monetisation.** The premium screen has no fake discounts, urgency countdowns, or
  get-rich language.

## The learning loop

Assess → Learn → Practice → Apply → Review

1. **Assess** — money profile / risk comfort / scam awareness / liquidity needs.
2. **Learn** — tracks → courses → modules → lessons (concept, scenario, quiz, flashcard, simulator,
   checklist, journal prompt, professional-review prompt).
3. **Practice** — standalone practice sets with immediate per-set feedback.
4. **Apply** — run a simulation, complete a checklist, save a journal reflection, request
   professional review, compare products.
5. **Review** — activity dashboard, XP, streak, badges, library, completed tracks.

## XP values (shared backend)

Lesson 10 · quiz correct 5 · flashcard 5 · practice set 25 · simulator 30 · journal reflection 20 ·
assessment passed 100 · course 100 · track 500 · daily streak bonus 25. Awarded once per source
(idempotent). See [learning-product-model.md](learning-product-model.md) for the backend detail.

## Surfaces

- **Web:** `/learn/*` — see [web-learning-experience.md](web-learning-experience.md).
- **Mobile:** bottom tabs Home · Learn · Practice · Simulate · Profile — see
  [mobile-learning-experience.md](mobile-learning-experience.md).

Both surfaces consume the same `/api/learning/*` endpoints, so progress, XP, and the content
hierarchy stay consistent across devices.
