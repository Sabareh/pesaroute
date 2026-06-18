from __future__ import annotations

from knowledge.models import DataSource
from pipelines.product_connector import NormalizedProductData, ProductDataConnector


class ProviderPageHtmlConnector(ProductDataConnector):
    """
    Inactive stub for fetching provider-reported MMF/fund data from a provider's public HTML page.

    To activate: configure selectors per provider and set DataSource.is_active=True.
    Never auto-publish unknown provider page changes — always require admin review.
    """

    source_slug = "provider-page-html"
    sensitive = True
    source_defaults = {
        "name": "Provider Page (HTML) - Stub",
        "source_type": DataSource.SourceType.PROVIDER,
        "authority_level": DataSource.AuthorityLevel.PROVIDER_SELF_REPORTED,
        "homepage_url": "",
        "data_url": "",
        "license_notes": (
            "Inactive stub. Configure selectors and activate per provider. "
            "Never auto-publish provider page changes without editorial review."
        ),
        "update_frequency": DataSource.UpdateFrequency.WEEKLY,
        "parser_strategy": DataSource.ParserStrategy.HTML_TABLE,
        "is_active": False,
    }

    def parse(self, source: DataSource, raw_snapshot) -> list[NormalizedProductData]:
        return []


class ProviderPdfFactsheetConnector(ProductDataConnector):
    """
    Inactive stub for fetching provider-reported fund data from PDF factsheets.

    PDF parsing is unreliable. Always mark parser_confidence=low and requires_review=True.
    """

    source_slug = "provider-pdf-factsheet"
    sensitive = True
    source_defaults = {
        "name": "Provider PDF Factsheet - Stub",
        "source_type": DataSource.SourceType.PROVIDER,
        "authority_level": DataSource.AuthorityLevel.PROVIDER_SELF_REPORTED,
        "homepage_url": "",
        "data_url": "",
        "license_notes": (
            "Inactive stub for PDF factsheet ingestion. "
            "Confidence is always low. Requires manual review before publishing."
        ),
        "update_frequency": DataSource.UpdateFrequency.MONTHLY,
        "parser_strategy": DataSource.ParserStrategy.PDF,
        "is_active": False,
    }

    def parse(self, source: DataSource, raw_snapshot) -> list[NormalizedProductData]:
        return []


class ProviderCalculatorPageConnector(ProductDataConnector):
    """
    Inactive stub for extracting rates from provider calculator pages.

    Calculator pages may change structure without notice. Always requires_review=True.
    """

    source_slug = "provider-calculator-page"
    sensitive = True
    source_defaults = {
        "name": "Provider Calculator Page - Stub",
        "source_type": DataSource.SourceType.PROVIDER,
        "authority_level": DataSource.AuthorityLevel.PROVIDER_SELF_REPORTED,
        "homepage_url": "",
        "data_url": "",
        "license_notes": (
            "Inactive stub for calculator page ingestion. "
            "Structure may change at any time. Admin review always required."
        ),
        "update_frequency": DataSource.UpdateFrequency.WEEKLY,
        "parser_strategy": DataSource.ParserStrategy.HTML_TABLE,
        "is_active": False,
    }

    def parse(self, source: DataSource, raw_snapshot) -> list[NormalizedProductData]:
        return []
