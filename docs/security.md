# PesaRoute Security And Privacy Notes

PesaRoute handles sensitive financial planning data. It does not hold money, execute investments, connect financial accounts, or collect financial account credentials.

## Data We Collect

- Account identity: username, optional email, and profile preferences.
- Planning inputs: educational simulator inputs and generated outputs.
- Scam-check text: pasted pitches are stored so users can review checks later; API responses do not echo the prompt text.
- Journal entries: private goals, decisions, reasons, review dates, and optional amount display fields.
- Portfolio mirror items: manually entered asset type, provider name, liquidity/risk labels, maturity date, and optional amount display fields.
- Consultation requests: category, amount display mode, optional amount range, timeline, risk preference, language, and user question.
- Privacy grants and access logs: what was shared, with whom, when it expires, and access events.
- Billing placeholders: fake/manual subscriptions, guide-pack purchases, and invoice records for development only.

## Data We Do Not Collect

- M-Pesa PINs.
- Bank passwords.
- Broker credentials.
- MMF provider credentials.
- Card details.
- Bank, broker, MMF, SACCO, or M-Pesa account links.
- Payment payout details.
- Real investment execution instructions.

## Access Model

- Journal endpoints require authentication and return only the current user's entries.
- Portfolio endpoints require authentication and return only the current user's mirrored items.
- Hidden amount mode clears exact and range values in API responses.
- Range amount mode does not return exact values.
- Consultation request lists return only the consumer's own requests.
- Professional lead views show eligible anonymous lead fields. Open leads do not expose the full user question.
- A selected professional can see the request question for their assigned lead.
- Professional consultation context requires an active, unrevoked, unexpired data grant with `consultation_context`.
- Additional context is scoped by grant: `contact_info`, `portfolio_summary`, `portfolio_exact_values`, `journal_entries`, `selected_documents`, and `consultation_context`.
- Exact portfolio values are not exposed unless `portfolio_exact_values` is granted and the item itself uses exact mode.
- Admin-only professional verification uses Django admin/staff permissions.

## Sharing Model

Data sharing is explicit, scoped, revocable, and time-limited.

- Users choose scopes before sharing with a professional.
- Grants have an expiry date.
- Users can revoke grants before expiry.
- Professional access is logged in `DataAccessLog`.
- Data-grant creation and revocation create audit events.

## Logging Rules

- Do not log auth tokens.
- Do not log private journal text.
- Do not log exact portfolio values.
- Do not put pasted scam-check text into audit metadata.
- Audit events should use resource IDs and non-sensitive metadata only.

## Rate Limiting

Scoped API throttles are configured for:

- `auth`: registration and login.
- `scam_check`: scam checker.
- `simulators`: simulator endpoints.
- `consultation_create`: consultation request creation.

Rates are environment-based in `apps/api/.env.example`.

## Headers And CORS

- `CORS_ALLOWED_ORIGINS` is environment-based.
- Wildcard CORS is rejected when `DJANGO_DEBUG=false`.
- Cookie/security settings are environment-based for deployment.
- Production should enable HTTPS, secure cookies, CSRF trusted origins, and HSTS after domain and proxy configuration are finalized.

## Deletion And Export Roadmap

- Add self-service data export for account profile, journal, portfolio mirror, grants, access logs, consultation requests, and billing placeholders.
- Add account deletion flow with confirmation, grace period, and irreversible purge path.
- Add admin-assisted deletion workflow for support cases.
- Define retention windows for audit events and access logs.
- Document backups, restore windows, and deletion propagation limits.

## Future ODPC Compliance Checklist

- Identify data controller/processor responsibilities.
- Publish a plain-language privacy notice.
- Maintain lawful basis records for each data category.
- Add consent records for optional professional sharing.
- Add data subject request workflows for access, correction, export, and deletion.
- Document cross-border processing if global infrastructure or vendors are used.
- Maintain breach response procedures and notification timelines.
- Keep a record of processing activities.
- Review vendor agreements before adding payments, analytics, AI, SMS, email, or cloud storage vendors.
