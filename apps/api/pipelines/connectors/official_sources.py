from __future__ import annotations

import re

from knowledge.models import DataSource, SourceRecord
from pipelines.base import BaseSourceConnector, PipelineRecord


class OfficialPageSnapshotConnector(BaseSourceConnector):
    record_type = SourceRecord.RecordType.LEARNING_REFERENCE
    source_title = "Official source page"

    def parse(self, source: DataSource, raw_snapshot) -> list[PipelineRecord]:
        text = _html_to_text(raw_snapshot.storage_path)
        return [
            PipelineRecord(
                source_record_key=f"{source.slug}:snapshot:{raw_snapshot.content_hash[:12]}",
                source_record_type=self.record_type,
                raw_payload={
                    "source_title": self.source_title,
                    "source_url": raw_snapshot.fetched_url,
                    "content_hash": raw_snapshot.content_hash,
                    "content_type": raw_snapshot.content_type,
                    "storage_path": raw_snapshot.storage_path,
                    "preview": text[:1200],
                },
                normalized_payload={
                    "title": self.source_title,
                    "source_url": raw_snapshot.fetched_url,
                    "needs_manual_review": True,
                    "parser_confidence": "low",
                    "summary": text[:500],
                },
            )
        ]


class CmaFundManagersConnector(OfficialPageSnapshotConnector):
    source_slug = "cma-fund-managers"
    record_type = SourceRecord.RecordType.LICENSE
    source_title = "CMA fund managers licensee page"
    source_defaults = {
        "name": "CMA Fund Managers",
        "source_type": DataSource.SourceType.REGULATOR,
        "authority_level": DataSource.AuthorityLevel.OFFICIAL,
        "homepage_url": "https://licensees.cma.or.ke/",
        "data_url": "https://licensees.cma.or.ke/licenses/8/",
        "terms_url": "https://licensees.cma.or.ke/",
        "license_notes": "Official CMA market-player page. Stage parsed rows for admin review before publishing.",
        "update_frequency": DataSource.UpdateFrequency.MONTHLY,
        "parser_strategy": DataSource.ParserStrategy.HTML_TABLE,
        "is_active": False,
    }


class CmaInvestmentAdvisersConnector(CmaFundManagersConnector):
    source_slug = "cma-investment-advisers"
    source_title = "CMA investment advisers licensee page"
    source_defaults = {
        **CmaFundManagersConnector.source_defaults,
        "name": "CMA Investment Advisers",
        "data_url": "https://licensees.cma.or.ke/licenses/9/",
    }


class CmaStockbrokersConnector(CmaFundManagersConnector):
    source_slug = "cma-stockbrokers"
    source_title = "CMA stockbrokers licensee page"
    source_defaults = {
        **CmaFundManagersConnector.source_defaults,
        "name": "CMA Stockbrokers",
        "data_url": "https://licensees.cma.or.ke/licenses/3/",
    }


class CmaApprovedCisConnector(CmaFundManagersConnector):
    source_slug = "cma-approved-cis"
    source_title = "CMA approved collective investment schemes page"
    source_defaults = {
        **CmaFundManagersConnector.source_defaults,
        "name": "CMA Approved CIS",
        "data_url": "https://licensees.cma.or.ke/licenses/15/",
    }


class CmaApprovedCollectiveInvestmentSchemesConnector(OfficialPageSnapshotConnector):
    """Parse the official CMA approved CIS page into staged product records.

    The shipped ``cma_cis_fallback.yaml`` fixture remains the source of truth and is
    imported by ``import_kenya_product_catalog``. This connector only *augments* it:
    it tries to read fund names off the live page and stages each as a needs-review
    record with an inferred product type/currency. It never publishes rates and never
    auto-approves — a human (or the importer) confirms everything.
    """

    source_slug = "cma-approved-collective-investment-schemes"
    record_type = SourceRecord.RecordType.PRODUCT
    source_title = "CMA approved collective investment schemes page"
    source_defaults = {
        "name": "CMA Approved Collective Investment Schemes",
        "source_type": DataSource.SourceType.REGULATOR,
        "authority_level": DataSource.AuthorityLevel.OFFICIAL,
        "homepage_url": "https://www.cma.or.ke/",
        "data_url": "https://www.cma.or.ke/regulated-entities/approved-collective-investment-schemes/",
        "terms_url": "https://www.cma.or.ke/",
        "license_notes": (
            "Official CMA CIS list. The shipped fallback YAML is canonical; parsed rows are "
            "staged for review and never publish rates or auto-merge duplicates."
        ),
        "update_frequency": DataSource.UpdateFrequency.WEEKLY,
        "parser_strategy": DataSource.ParserStrategy.HTML_TABLE,
        "is_active": False,
    }

    # Words that mark a line as a likely fund/scheme name.
    _FUND_HINTS = ("fund", "scheme", "unit trust", "reit", "umbrella")

    def parse(self, source: DataSource, raw_snapshot) -> list[PipelineRecord]:
        from planning.catalog_import import infer_currency, infer_product_type

        text = _html_to_text(raw_snapshot.storage_path)
        candidates = _extract_fund_candidates(text, self._FUND_HINTS)
        records: list[PipelineRecord] = []
        for index, name in enumerate(candidates):
            ptype, parser_confidence = infer_product_type(name)
            currency = infer_currency(name)
            records.append(
                PipelineRecord(
                    source_record_key=f"{source.slug}:cis:{index:04d}:{name.lower()[:60]}",
                    source_record_type=self.record_type,
                    raw_payload={
                        "source_title": self.source_title,
                        "source_url": raw_snapshot.fetched_url,
                        "content_hash": raw_snapshot.content_hash,
                        "raw_name": name,
                    },
                    normalized_payload={
                        "product_name": name,
                        "product_type": ptype,
                        "currency": currency,
                        "parser_confidence": parser_confidence,
                        "source_url": raw_snapshot.fetched_url,
                        "needs_manual_review": True,
                        "note": "Confirm against cma_cis_fallback.yaml. No rate is implied.",
                    },
                )
            )
        if not records:
            # Live parse found nothing usable — fall back to a single review marker.
            return super().parse(source, raw_snapshot)
        return records


class CbkTreasuryBillsConnector(OfficialPageSnapshotConnector):
    source_slug = "cbk-treasury-bills"
    record_type = SourceRecord.RecordType.AUCTION_RESULT
    source_title = "CBK Treasury bills source page"
    source_defaults = {
        "name": "CBK Treasury Bills",
        "source_type": DataSource.SourceType.GOVERNMENT,
        "authority_level": DataSource.AuthorityLevel.OFFICIAL,
        "homepage_url": "https://www.centralbank.go.ke/",
        "data_url": "https://www.centralbank.go.ke/securities/treasury-bills/",
        "terms_url": "https://www.centralbank.go.ke/",
        "license_notes": "Official CBK page. Auction/PDF details must be reviewed before publishing.",
        "update_frequency": DataSource.UpdateFrequency.WEEKLY,
        "parser_strategy": DataSource.ParserStrategy.HTML_TABLE,
        "is_active": False,
    }


class CbkTreasuryBondsConnector(CbkTreasuryBillsConnector):
    source_slug = "cbk-treasury-bonds"
    source_title = "CBK Treasury bonds source page"
    source_defaults = {
        **CbkTreasuryBillsConnector.source_defaults,
        "name": "CBK Treasury Bonds",
        "data_url": "https://www.centralbank.go.ke/securities/treasury-bonds/",
    }


class NseListedCompaniesConnector(OfficialPageSnapshotConnector):
    source_slug = "nse-listed-companies"
    record_type = SourceRecord.RecordType.LISTED_COMPANY
    source_title = "NSE listed companies page"
    source_defaults = {
        "name": "NSE Listed Companies",
        "source_type": DataSource.SourceType.EXCHANGE,
        "authority_level": DataSource.AuthorityLevel.OFFICIAL,
        "homepage_url": "https://www.nse.co.ke/",
        "data_url": "https://www.nse.co.ke/listed-companies/",
        "terms_url": "https://www.nse.co.ke/data/",
        "license_notes": "Do not ingest or redistribute restricted NSE market prices without permission.",
        "update_frequency": DataSource.UpdateFrequency.WEEKLY,
        "parser_strategy": DataSource.ParserStrategy.HTML_TABLE,
        "is_active": False,
    }


class SasraRegulatedSaccosConnector(OfficialPageSnapshotConnector):
    source_slug = "sasra-regulated-saccos"
    record_type = SourceRecord.RecordType.SACCO
    source_title = "SASRA regulated SACCOs page"
    source_defaults = {
        "name": "SASRA Regulated SACCOs",
        "source_type": DataSource.SourceType.REGULATOR,
        "authority_level": DataSource.AuthorityLevel.OFFICIAL,
        "homepage_url": "https://www.sasra.go.ke/",
        "data_url": "https://www.sasra.go.ke/licensed-dt-saccos/",
        "terms_url": "https://www.sasra.go.ke/",
        "license_notes": "Official SACCO list page. PDFs should be converted manually to CSV before publishing.",
        "update_frequency": DataSource.UpdateFrequency.MONTHLY,
        "parser_strategy": DataSource.ParserStrategy.PDF,
        "is_active": False,
    }


class RbaRegisteredServiceProvidersConnector(OfficialPageSnapshotConnector):
    source_slug = "rba-registered-service-providers"
    record_type = SourceRecord.RecordType.PENSION_SERVICE_PROVIDER
    source_title = "RBA registered service providers page"
    source_defaults = {
        "name": "RBA Registered Service Providers",
        "source_type": DataSource.SourceType.REGULATOR,
        "authority_level": DataSource.AuthorityLevel.OFFICIAL,
        "homepage_url": "https://www.rba.go.ke/",
        "data_url": "https://www.rba.go.ke/registered-fund-managers/",
        "terms_url": "https://www.rba.go.ke/",
        "license_notes": "Official RBA page. Downloaded lists should be staged and reviewed before publishing.",
        "update_frequency": DataSource.UpdateFrequency.MONTHLY,
        "parser_strategy": DataSource.ParserStrategy.PDF,
        "is_active": False,
    }


class IraLicensedEntitiesConnector(OfficialPageSnapshotConnector):
    source_slug = "ira-licensed-entities"
    record_type = SourceRecord.RecordType.INSURANCE_ENTITY
    source_title = "IRA licensed entities page"
    source_defaults = {
        "name": "IRA Licensed Entities",
        "source_type": DataSource.SourceType.REGULATOR,
        "authority_level": DataSource.AuthorityLevel.OFFICIAL,
        "homepage_url": "https://ira.go.ke/",
        "data_url": "https://ira.go.ke/entities-registry/",
        "terms_url": "https://ira.go.ke/",
        "license_notes": "Official IRA registry page. Stage insurer/intermediary references for review.",
        "update_frequency": DataSource.UpdateFrequency.MONTHLY,
        "parser_strategy": DataSource.ParserStrategy.MANUAL,
        "is_active": False,
    }


def _extract_fund_candidates(text: str, hints: tuple[str, ...]) -> list[str]:
    """Pull plausible fund/scheme names out of flattened page text.

    Best-effort and deliberately conservative: splits on common separators, keeps
    fragments that contain a fund hint and look like a name, and de-duplicates while
    preserving order. The fallback YAML is the source of truth, so missing a few here
    is acceptable.
    """
    fragments = re.split(r"\s*[•·\|\n;]\s*|(?<=[a-z])\.(?=\s+[A-Z])", text)
    seen: set[str] = set()
    candidates: list[str] = []
    for fragment in fragments:
        name = fragment.strip(" -\t–—")
        lowered = name.lower()
        if not (3 <= len(name.split()) <= 12):
            continue
        if not any(hint in lowered for hint in hints):
            continue
        if not re.match(r"^[A-Za-z0-9][A-Za-z0-9 &'/().\-]+$", name):
            continue
        key = re.sub(r"\s+", " ", lowered)
        if key in seen:
            continue
        seen.add(key)
        candidates.append(name)
    return candidates


def _html_to_text(storage_path: str) -> str:
    try:
        html = open(storage_path, encoding="utf-8", errors="ignore").read()
    except OSError:
        return ""
    text = re.sub(r"<script.*?</script>", " ", html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<style.*?</style>", " ", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()
