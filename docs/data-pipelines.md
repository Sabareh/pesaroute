# PesaRoute Data Pipelines

## Purpose

PesaRoute data pipelines update the Kenya investment knowledge base from public and official sources without making unreviewed data look verified. The pipeline is designed for slow, auditable growth:

1. discover/check source
2. fetch raw content
3. store raw snapshot
4. parse into `SourceRecord`
5. normalize
6. validate
7. create `DataQualityIssue` rows when needed
8. stage changes
9. compare with canonical data
10. require admin review for sensitive changes
11. publish only after approval
12. update freshness state

## Safety Rules

- Do not scrape fragile pages aggressively.
- Respect robots.txt and source terms.
- Do not redistribute restricted NSE market-price data.
- Do not publish canonical provider, SACCO, listed-company, or government-security changes until an admin approves the staged `SourceRecord`, unless a connector is explicitly marked low-risk and run with `--auto-approve`.
- If parser confidence is low, stage as `needs_review`.
- If source terms are unclear, use manual CSV import.

## Supported Source Connectors

All connector source rows are created inactive by default. Run them explicitly in dry-run mode before enabling schedules.

| Source slug | Schedule target | Default mode |
| --- | --- | --- |
| `cma-approved-cis` | monthly | inactive, needs review |
| `cma-fund-managers` | monthly | inactive, needs review |
| `cma-investment-advisers` | monthly | inactive, needs review |
| `cma-stockbrokers` | monthly | inactive, needs review |
| `cbk-treasury-bills` | weekly | inactive, needs review |
| `cbk-treasury-bonds` | weekly | inactive, needs review |
| `nse-listed-companies` | weekly | inactive, strips restricted price fields |
| `sasra-regulated-saccos` | monthly | inactive, prefer CSV from official PDF/list |
| `rba-registered-service-providers` | monthly | inactive, prefer CSV from official downloads |
| `ira-licensed-entities` | monthly | inactive, needs review |

## Commands

Create/update supported source rows:

```powershell
cd apps\api
..\..\.venv\Scripts\python.exe manage.py list_data_sources --ensure-supported
```

Run one source in safe dry-run mode:

```powershell
..\..\.venv\Scripts\python.exe manage.py run_data_pipeline --source cbk-treasury-bills --dry-run
```

Run all enabled connectors:

```powershell
..\..\.venv\Scripts\python.exe manage.py run_data_pipeline --all-active --dry-run
```

Mark staged source records stale:

```powershell
..\..\.venv\Scripts\python.exe manage.py mark_source_stale --source nse-listed-companies --reason "Manual refresh required"
```

Import a curated CSV:

```powershell
..\..\.venv\Scripts\python.exe manage.py import_source_csv --source nse-listed-companies --record-kind listed_companies --file .\fixtures\nse-listed-companies.csv --dry-run
```

Only use `--auto-approve` for reviewed low-risk imports:

```powershell
..\..\.venv\Scripts\python.exe manage.py import_source_csv --source cma-fund-managers --record-kind providers --file .\fixtures\cma-fund-managers.csv --auto-approve
```

## CSV Formats

Supported `--record-kind` values:

- `providers`: `name`, `provider_type`
- `product_passports`: `name`, `slug`, `category`
- `listed_companies`: `name`, `symbol`
- `saccos`: `name`, `sasra_status`
- `government_securities`: `security_type`
- `regulator_licensees`: `name`, `regulator`, `category`
- `learning_references`: `title`, `source_url`

Extra columns are preserved in staged payloads unless they are known restricted market-data fields. For NSE imports, fields such as `price`, `share_price`, `last_price`, `bid`, `ask`, `volume`, and `turnover` are stripped and logged as permission warnings.

## Admin Review

Admin endpoints:

- `GET /api/admin/ingestion-runs/`
- `GET /api/admin/source-records/`
- `POST /api/admin/source-records/{id}/approve/`
- `POST /api/admin/source-records/{id}/reject/`
- `POST /api/admin/source-records/{id}/publish/`
- `GET /api/admin/data-quality-issues/`
- `POST /api/admin/data-quality-issues/{id}/resolve/`
- `GET /api/admin/data-change-events/`

Review process:

1. Inspect the `DataIngestionRun`.
2. Inspect `RawDataSnapshot` metadata and stored file path.
3. Inspect staged `SourceRecord.raw_payload` and `normalized_payload`.
4. Resolve or accept any `DataQualityIssue`.
5. Approve or reject the source record.
6. Publish approved source records into canonical tables.
7. Check public API output to confirm raw/internal payloads are not exposed.

## Freshness Rules

- CBK auction data: stale after 14 days, acceptable until 28 days.
- NSE listed company list: stale after 30 days, acceptable until 60 days.
- CMA licensees: stale after 45 days, acceptable until 75 days.
- SASRA SACCO lists: stale after 90 days, acceptable until 365 days.
- RBA/IRA service-provider references: stale after 75 days, acceptable until 120 days.
- Generic educational content: stale after 180 days, acceptable until 240 days.

## Schedules

Celery is installed in the backend, but Celery Beat scheduling is not yet wired for these pipelines. The schedule map lives in `pipelines/schedules/registry.py` and should be connected only after each connector has been tested against its source terms and review workflow.

## Troubleshooting

- `failed` ingestion run: check `error_summary` and `DataQualityIssue`.
- no source rows: run `list_data_sources --ensure-supported`.
- parser confidence low: use CSV import instead of automatic parsing.
- stale public content: run the freshness scan from Django shell or add the daily scheduled task later.
- duplicate records: staging deduplicates by `source + source_record_key`; canonical publish deduplicates by stable slug/symbol/name where available.

## Adding A Connector

1. Add a connector class under `apps/api/pipelines/connectors/`.
2. Register it in `apps/api/pipelines/registry.py`.
3. Set `is_active=False` by default.
4. Fetch only official/public URLs.
5. Store raw snapshots.
6. Stage `SourceRecord` rows as `needs_review`.
7. Add tests for dry-run, validation, and no public leakage.
8. Document source terms and freshness rules.

## Production Safety Checklist

- Confirm source terms and robots.txt behavior.
- Confirm no restricted market prices or paid data are imported.
- Confirm raw snapshots are retained only where allowed.
- Confirm admin review is required for sensitive changes.
- Confirm public APIs expose only reviewed public fields.
- Confirm schedules are disabled by default and enabled source by source.
- Confirm monitoring/alerts exist for failed runs and stale critical sources.
