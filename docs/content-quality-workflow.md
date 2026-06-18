# Content Quality Workflow

PesaRoute content must stay useful, sourced, reviewed, and clearly educational. The platform must not publish stale, generic, or advice-like content as if it were verified guidance.

## Quality Score Rules

Run:

```powershell
cd apps\api
..\..\.venv\Scripts\python.exe manage.py score_learning_content
```

Lessons are scored from 0 to 100:

- `90-100`: strong
- `70-89`: acceptable
- `40-69`: thin
- `<40`: placeholder/poor

The scorer checks:

- structured content exists
- content length is useful
- at least three teaching sections
- Kenyan scenario is present
- quiz, simulator, checklist, or journal practice exists
- flashcards exist where applicable
- source references or reviewed editorial label exists
- education-only disclaimer exists
- banned advice-like language is absent
- review date is not stale

Poor or placeholder lessons must not be shown as normal public lessons. The API returns a review fallback instead.

## Gap Report

Run:

```powershell
cd apps\api
..\..\.venv\Scripts\python.exe manage.py list_content_gaps
```

The report looks for:

- placeholder lessons
- thin lessons/resources
- missing quizzes
- missing flashcards
- missing source references
- stale lessons
- product passports without sources
- glossary terms without Kenyan examples
- banned advice-like phrases

The expected private-beta state is: `No content gaps found.`

## Review Frequency

Default lesson review frequency is 180 days.

Use shorter review cycles for:

- tax content
- regulator lists
- product passport verification
- fees and withdrawal timelines
- land process references

Use longer review cycles only for stable concepts such as general definitions.

## Source Confidence

Source confidence values:

- `official`: regulator, government, exchange, or official public body
- `provider`: provider document or provider-maintained information
- `editorial`: reviewed PesaRoute literacy guidance without external factual claims
- `mixed`: multiple source types
- `unknown`: no usable source or pending review

Prefer official public sources for safety-critical claims.

## Manual Review Process

1. Draft or import content.
2. Attach official source references where available.
3. Add Kenyan scenario, mistake, action step, takeaway, and disclaimer.
4. Run `score_learning_content`.
5. Run `list_content_gaps`.
6. Review any thin, stale, or unsourced items in Django admin.
7. Publish only after the content is reviewed and the gap report is clean.

## Publishing Checklist

- No placeholder text.
- No personalized advice or provider ranking.
- No promises of returns.
- No execution language.
- Sources and review dates are visible.
- Admin-only reviewer notes are not exposed publicly.
- Content can be understood on mobile.
- The lesson tells users what to verify before money moves.

## Takedown Process

If a public source changes or content becomes unsafe:

1. Set the lesson/resource/passport to draft or archived.
2. Add reviewer notes explaining why it was pulled.
3. Replace public content with the review fallback.
4. Add a new reviewed version before republishing.
5. Re-run score and gap commands.

## Legal And Regulatory Disclaimer Policy

Every lesson and resource must preserve the education-only boundary:

- PesaRoute does not hold money.
- PesaRoute does not execute investments.
- PesaRoute does not promise returns.
- PesaRoute does not ask for M-Pesa PINs, bank passwords, broker credentials, MMF credentials, OTPs, seed phrases, or private keys.
- Users should verify current details with official sources and licensed professionals where needed.
