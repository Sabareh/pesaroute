# Mobile Learning Experience

PesaRoute mobile now treats learning as a core tab, not a static explainer.

## Navigation

Primary mobile tabs:

- Home
- Learn
- Simulate
- Journal
- Profile

Home still supports amount/goal route discovery. Learn owns XP, tracks, lessons, resources, and progress.

## Learn Tab

The Learn tab supports:

- Today dashboard with XP, streak, completed lesson count, continue-learning card, daily money challenge, and quick actions.
- Explore view with search and filters for Beginner, First salary, SACCO/chama, Global investing, Land, Scam defense, Diaspora, and Swahili.
- Track cards with title, description, level, estimated time, lesson count, progress, and premium badge.
- Track detail with course and lesson lists.
- Lesson view for article, quiz, flashcard, simulation, checklist, journal prompt, and professional-review prompt lesson types.
- Resources view for guides, cheat sheets, glossary items, market briefs, tutorials, and checklists.
- Library view for synced progress, XP, streaks, courses, and badges.

## API Integration

The mobile app uses these backend endpoints when available:

- `GET /api/learning/tracks/`
- `GET /api/learning/tracks/{slug}/`
- `GET /api/learning/courses/{slug}/`
- `GET /api/learning/resources/`
- `GET /api/learning/my-progress/`
- `POST /api/learning/lessons/{id}/start/`
- `POST /api/learning/lessons/{id}/complete/`
- `GET /api/learning/xp/`
- `GET /api/learning/badges/`
- `GET /api/learning/streak/`

Anonymous users can browse and complete local interactions. Logged-in users can sync lesson start/completion, XP, streak, badges, and course progress.

## Offline Fallback

If the API is unavailable, the Learn tab shows seeded offline tracks and resources from the Expo app. It does not crash, and progress messaging tells users to log in and reconnect to save XP.

## Premium

Premium learning uses the existing `premium_learning` entitlement. Locked premium lessons show an upgrade path, while free learning remains available.

## Product Boundaries

The mobile learning experience does not:

- execute investments
- collect investment money
- ask for M-Pesa PINs
- ask for bank passwords
- ask for broker or MMF credentials
- call AI services
