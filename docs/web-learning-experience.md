# PesaRoute Web Learning Experience

A DataCamp-style learning **operating system** for Kenyan investment literacy, built on the Phase
2.9 learning APIs. It borrows product mechanics (top nav, sidebar, dashboard cards, continue
learning, practice mode, premium gate, resources panel) — never DataCamp branding, copy, assets, or
layouts.

Design direction: MaliPrime Liquid, Apple-style system typography, light-mode-first, calm
professional fintech. No AI-robot, crypto, casino, or trading visuals. XP rewards learning, never
returns or portfolio size.

---

## Routes

All pages live under `/learn/*` and share a layout with a top nav + collapsible left sidebar.

| Route | Page | Auth |
|-------|------|------|
| `/learn` | Dashboard (greeting, continue-learning hero, review/suggestions, right rail: streak/XP/badges/goal/privacy) | public + personalised when signed in |
| `/learn/explore` | Learn Index (Recommended, Tracks, Practice, Assessments, Resources, Apply-with-Simulations) + filter chips | public |
| `/learn/tracks` | Tracks, grouped into Foundations / Product Skills / Life Situations / Group Investing / Global Investing / Risk and Scam Defense, with filter chips | public |
| `/learn/tracks/[slug]` | Track detail: hero, expandable courses → modules → lessons, right sidebar (prerequisites, resources, professional review, privacy) | public |
| `/learn/courses/[slug]` | Course detail: what-you'll-learn, lessons, resources, related passports | public |
| `/learn/lessons/[id]` | Lesson player: top bar, structured content, sources/disclaimer, sticky CTAs (Mark complete, Practice, Run simulator, Next) | public; completing requires sign-in |
| `/learn/practice` | Practice index | public |
| `/learn/practice/[id]` | Practice intro → keyboard-driven player → per-question results + XP | public to read; submitting requires sign-in |
| `/learn/assessments` | Assessments list (money profile, risk comfort, scam awareness, liquidity needs) | public |
| `/learn/assessments/[slug]` | Assessment intro → player → result band + XP | public to read; submitting requires sign-in |
| `/learn/resources` | Resources grouped by type, with source-confidence labels | public |
| `/learn/my-activity` | Activity & progress: XP, streak, badges, completed lessons, simulations, journal reflections | requires sign-in |

The old marketing page at `/learning` is untouched; the nav and homepage CTAs now point to `/learn`.

---

## Architecture

- **`app/learn/layout.tsx`** wraps every learning page in `AuthProvider` + `LearnChrome`.
- **`app/learn/LearnChrome.tsx`** — client shell: sticky top nav (logo, Simulate link, Sign in/out),
  left sidebar (Learn / Review / Apply groups) with active-state highlighting, mobile hamburger +
  overlay sidebar, and the sign-in modal.
- **`app/lib/auth.tsx`** — lightweight client auth: `AuthProvider` + `useAuth()` storing a token in
  `localStorage`, with `signIn()` (POST `/api/accounts/login/`) and `register()` (POST
  `/api/accounts/register/`). This is **app login**, not account linking (no bank/broker/M-Pesa
  credentials are ever requested). The same token-based account is used by the mobile app, so a
  learner's tracks, XP, streak, and progress **sync across web and mobile** automatically.
- **Sign in / Create account** — the `SignInModal` has two modes. Registration collects username,
  password, optional email, and an optional invite code (required only when the backend's
  `beta_only_mode` is on). Backend validation errors (e.g. invite required, username taken) surface
  inline.
- **`app/lib/learning.ts`** — typed API client (`learningApi.*`) with token-aware `fetch` helpers,
  plus filter-chip and track-category helpers.
- **`app/learn/ui.tsx`** — shared client components: `StructuredContent` (renders heading,
  paragraph, scenario, definition, checklist, caution, key_takeaway, comparison_table, source_note,
  disclaimer), `ProgressBar`, `Chip`, `LessonTypeBadge`, `SourceFooter`, `QuestionStepper`
  (keyboard 1–4 + Enter), `PremiumGate` modal, `SignInModal`.

All learning pages are client components that fetch from the API at runtime (CORS allows
`localhost:3000`). Anonymous users get full browsing; personalised data loads when a token is
present.

---

## Premium gate

Locked tracks/courses/lessons/practice/assessments arrive from the API with `locked: true`.
Clicking them opens the `PremiumGate` modal:

- Title: “Unlock deeper investment learning.”
- Subtitle and benefits: advanced Kenyan tracks, unlimited practice, unlimited simulations, premium
  checklists, professional review prep.
- KES 300/month placeholder (annual placeholder noted), primary “Unlock Premium” → `/#pricing`,
  secondary “Continue with free lessons”.
- No discount hype, fake urgency, or get-rich language.

No new checkout/payments were added — the gate links to the existing pricing section.

---

## Responsive behaviour

- Sidebar is fixed on `lg+`, collapses behind a hamburger + overlay on smaller screens.
- The dashboard right rail drops below the main content on narrow screens (`xl` breakpoint).
- The lesson player is a centred max-width column with a sticky bottom CTA bar.
- The practice/assessment players work on desktop and tablet; keyboard shortcuts are desktop-first
  with on-screen tap targets for touch.

---

## API integration

`/api/learning/`: `dashboard/`, `tracks/`, `tracks/{slug}/outline/`, `courses/{slug}/`,
`lessons/{id}/` (added this phase), `lessons/{id}/complete/`, `practice/`, `practice/{id}/`,
`practice/{id}/submit/`, `assessments/`, `assessments/{slug}/`, `assessments/{slug}/submit/`,
`resources/`, `activity/`, `progress/`, `library/save/`.

Public payloads never expose practice `correct_answer` or assessment option `weight`/`correct`
flags — grading happens server-side.

### Backend change

Added a read-only `GET /api/learning/lessons/{id}/` endpoint (`LearningLessonDetailView` +
`LearningLessonDetailSerializer`) so the lesson player is directly linkable. Covered by
`tests/test_learning_product.py::test_lesson_detail_renders_structured_content_with_context`.

---

## QA status

- ✅ Anonymous users browse tracks, outlines, courses, lessons, practice, assessments, resources.
- ✅ Signed-in users continue learning; lesson completion and practice/assessment submission award
  XP (visible on `/learn/my-activity`).
- ✅ Track/course/lesson/practice/assessment pages render; lesson player renders structured content
  with sources and disclaimers.
- ✅ Premium gate appears on locked content.
- ✅ No investment-advice language; educational disclaimers and source/confidence labels appear.
- ✅ `npm run typecheck`, `npm run lint`, `npm run build` all pass; backend `pytest` 146 passed.

---

## Theming (light & dark, system-driven)

The UI follows the OS/browser preference automatically — no manual toggle.

- **Token plumbing:** every Tailwind colour token (`bg-background`, `text-textPrimary`, `bg-surface`,
  `text-accent`, …) is backed by a CSS variable defined in `app/globals.css`. Solid colours are stored
  as space-separated RGB channels and exposed through `rgb(var(--c-x) / <alpha-value>)` in
  `tailwind.config.ts`, so alpha modifiers (`bg-primary/40`, `border-accent/20`) keep working. Borders
  and shadows carry baked alpha and use the variable directly.
- **Light** = warm MaliPrime paper (`#F6F5F0`), ink text, deep-emerald CTAs. **Dark** = deep PesaRoute
  navy (`#0E1525`), light text, brighter green/teal accents — set under
  `@media (prefers-color-scheme: dark)`. `color-scheme` is declared so form controls/scrollbars adapt.
- **DataCamp-grade polish, PesaRoute palette:** new shared components in `app/components/maliprime.tsx`
  — `ProgressRing` (accent→violet gradient ring), `StatPill` (XP/streak/review pills), `IconTile`
  (colored rounded-square quick actions), plus `.pr-gradient`/`.pr-gradient-text` utilities. These give
  the dashboard the DataCamp dashboard feel without copying its branding or exact colours, and they
  read correctly in both themes.
- **Primary buttons stay white-text-safe in both modes** (`primary` is a deep/medium emerald that
  always pairs with white). The only hand-fixes needed were the marketing hero's hardcoded white CTAs,
  which now use fixed ink text (`!text-[#11110F]`) because they sit on an always-dark photo hero.
- Because the whole app shares these tokens, every page (homepage, `/simulate`, passports, portals,
  and all of `/learn/*`) flips light/dark from this one central change.

---

## Remaining web learning debt

- **Per-track/course progress is partially wired.** The `/learn` dashboard hero now shows a **real**
  completion ring (completed lessons in the current track ÷ total from its outline). Track-detail and
  course hero bars still render 0% pending a per-course progress map.
- **No web journal.** Lesson "Save to journal" and dashboard journal prompts link to Explore; a
  full web journal (the mobile app has one) is not built.
- **Practice feedback is end-of-set, not per-question.** Because `correct_answer` is hidden from
  public payloads, the player grades the whole set on submit and then shows per-question results,
  rather than immediate per-answer feedback.
- **No password reset / SSO.** Web now supports sign-in **and** registration (synced with mobile via
  the shared backend token), but there is no password-reset flow or SSO yet.
- **Practice question types are limited to multiple choice.** True/false, match-term, and
  red-flag-identification render as multiple choice; richer interactions are future work.
- **Learning pages are client-rendered** (no SSR/SEO for `/learn/*`), unlike the SSR `/simulate`
  pages, since the section is personalised.
- **Sidebar "Courses" has no standalone index** — courses are reached via tracks; the sidebar links
  Tracks/Practice/Assessments/Resources directly.
