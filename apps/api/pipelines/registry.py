from __future__ import annotations

from pipelines.connectors import (
    CbkTreasuryBillsConnector,
    CbkTreasuryBondsConnector,
    CmaApprovedCisConnector,
    CmaApprovedCollectiveInvestmentSchemesConnector,
    CmaFundManagersConnector,
    CmaInvestmentAdvisersConnector,
    CmaStockbrokersConnector,
    IraLicensedEntitiesConnector,
    NseListedCompaniesConnector,
    ProviderCalculatorPageConnector,
    ProviderPageHtmlConnector,
    ProviderPdfFactsheetConnector,
    RbaRegisteredServiceProvidersConnector,
    SasraRegulatedSaccosConnector,
)

CONNECTOR_CLASSES = {
    "cma-approved-cis": CmaApprovedCisConnector,
    "cma-approved-collective-investment-schemes": CmaApprovedCollectiveInvestmentSchemesConnector,
    "cma-fund-managers": CmaFundManagersConnector,
    "cma-investment-advisers": CmaInvestmentAdvisersConnector,
    "cma-stockbrokers": CmaStockbrokersConnector,
    "cbk-treasury-bills": CbkTreasuryBillsConnector,
    "cbk-treasury-bonds": CbkTreasuryBondsConnector,
    "nse-listed-companies": NseListedCompaniesConnector,
    "sasra-regulated-saccos": SasraRegulatedSaccosConnector,
    "rba-registered-service-providers": RbaRegisteredServiceProvidersConnector,
    "ira-licensed-entities": IraLicensedEntitiesConnector,
    "provider-page-html": ProviderPageHtmlConnector,
    "provider-pdf-factsheet": ProviderPdfFactsheetConnector,
    "provider-calculator-page": ProviderCalculatorPageConnector,
}

INACTIVE_STUB_SLUGS = {
    "provider-page-html",
    "provider-pdf-factsheet",
    "provider-calculator-page",
}


def get_connector(source_slug: str):
    connector_class = CONNECTOR_CLASSES.get(source_slug)
    if not connector_class:
        raise KeyError(f"Unsupported source connector: {source_slug}")
    return connector_class()


def ensure_supported_sources() -> list:
    return [connector_class().get_source() for connector_class in CONNECTOR_CLASSES.values()]
