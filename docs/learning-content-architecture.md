# Learning Content Architecture

PesaRoute lessons now support structured educational content instead of a single generic body paragraph.

## Content Model

`LearningLesson` keeps the legacy `body` field for fallback, but primary rendering should use `structured_content`.

Important public fields:

- `title`
- `summary`
- `body`
- `structured_content`
- `lesson_type`
- `estimated_minutes`
- `xp_reward`
- `difficulty`
- `is_premium`
- `editorial_status`
- `last_reviewed_at`
- `next_review_due_at`
- `content_sources`
- `disclaimer`

Internal-only field:

- `reviewer_notes`

`reviewer_notes` must not be returned to mobile or web clients.

## Structured Blocks

Supported block types:

- `heading`
- `paragraph`
- `example`
- `scenario`
- `key_takeaway`
- `caution`
- `checklist`
- `definition`
- `comparison_table`
- `quiz_prompt`
- `simulator_cta`
- `journal_prompt`
- `professional_review_cta`
- `source_note`
- `disclaimer`

All published lessons should include a disclaimer block.

## Source References

`LearningContentSource` records the public source context for lessons and resources:

- `title`
- `organization`
- `source_type`
- `url`
- `retrieved_at`
- `notes`
- `reliability_level`

Public API responses expose title, organization, source type, URL, retrieved date, and reliability level. They do not expose internal notes.

Current seed sources include:

- Central Bank of Kenya government securities and Treasury Bills pages.
- Capital Markets Authority investor education handbook.
- Nairobi Securities Exchange FAQs and trading participants pages.
- SASRA regulated and licensed SACCO pages.
- PesaRoute editorial literacy standard for lessons that need human editorial review rather than official source data.

## Validation Rules

Published lessons should have:

- title
- summary
- structured content
- disclaimer block
- reviewed or published editorial status

Learning content rejects or flags:

- generic placeholder bodies
- missing structured content
- missing disclaimer
- missing source reference and missing editorial label
- stale review dates
- advice-like banned phrases

Banned phrases:

- `guaranteed return`
- `best investment`
- `recommended allocation`
- `risk-free`
- `buy now`
- `invest here now`

## Audit Command

Run:

```powershell
cd apps\api
..\..\.venv\Scripts\python.exe manage.py audit_learning_content
```

The audit reports:

- placeholder lessons
- lessons without source references or editorial label
- too-short body content
- missing quizzes
- missing flashcards
- missing disclaimers
- review dates due
- banned phrases

## Rendering

Mobile:

- Uses `structured_content` first.
- Falls back to `body` only if structured content is missing.
- Shows a `Content coming soon` state if the body is detected as generic placeholder text.
- Shows sources and last reviewed date at the bottom of lessons and resources.

Web:

- `/learning` now shows detailed lesson examples with scenarios, decision checks, source context, and education-only disclaimer.
- Future lesson detail pages should reuse the same block model.

## Editorial Workflow

1. Draft or seed lesson content as structured blocks.
2. Attach official source references where available.
3. Use `PesaRoute Editorial Literacy Standard` where a lesson is editorial guidance rather than official-source data.
4. Set `editorial_status=reviewed` before publishing.
5. Set `last_reviewed_at` and `next_review_due_at`.
6. Run `audit_learning_content`.
7. Run backend tests and mobile/web checks before beta release.
