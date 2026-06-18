"""
Kenya investment product catalog importer.

Reads YAML fixtures (CMA CIS schemes + government securities + education routes),
infers product type/currency from names, resolves providers (with alias matching
to avoid duplicate provider records), and creates source-linked InvestmentProducts.
No rates, minimums, or yields are invented. Possible duplicates are flagged for
review, never auto-merged.
"""

from __future__ import annotations

import re
from pathlib import Path

import yaml
from django.utils import timezone
from django.utils.text import slugify

from catalog.models import ProductCategory, Provider
from knowledge.models import DataSource, SourceReference
from planning.models import InvestmentProduct, ProductCatalogImportBatch, StagedInvestmentProduct

IMPORT_MARKER = "import:kenya-catalog"
P = InvestmentProduct

# Ordered (substring -> product_type). First match wins.
TYPE_RULES: list[tuple[str, str]] = [
    ("money market", P.ProductType.MONEY_MARKET_FUND),
    ("enhanced yield", P.ProductType.ENHANCED_YIELD_FUND),
    ("multi asset", P.ProductType.MULTI_ASSET_FUND),
    ("multi-asset", P.ProductType.MULTI_ASSET_FUND),
    ("alternative investment fund", P.ProductType.ALTERNATIVE_INVESTMENT_FUND),
    ("hedge fund", P.ProductType.ALTERNATIVE_INVESTMENT_FUND),
    ("reit", P.ProductType.REIT),
    ("infrastructure bond", P.ProductType.INFRASTRUCTURE_BOND),
    ("treasury bond", P.ProductType.TREASURY_BOND),
    ("treasury bill", P.ProductType.TREASURY_BILL),
    ("shariah", P.ProductType.SHARIAH_FUND),
    ("sharia", P.ProductType.SHARIAH_FUND),
    ("iman", P.ProductType.SHARIAH_FUND),
    ("mabruk", P.ProductType.SHARIAH_FUND),
    ("bond", P.ProductType.BOND_FUND),
    ("fixed income", P.ProductType.FIXED_INCOME_FUND),
    ("balanced", P.ProductType.BALANCED_FUND),
    ("equit", P.ProductType.EQUITY_FUND),  # equity / equities
    ("wealth", P.ProductType.WEALTH_FUND),
    ("special", P.ProductType.SPECIAL_FUND),
]

# Low-confidence / ambiguous markers that need review.
NEEDS_REVIEW_MARKERS = ("index tracker", "global special", "financial services", "selective alpha", "megatrends")

CATEGORY_BY_TYPE: dict[str, str] = {
    P.ProductType.MONEY_MARKET_FUND: "Money Market Funds",
    P.ProductType.FIXED_INCOME_FUND: "Fixed Income Funds",
    P.ProductType.BOND_FUND: "Fixed Income Funds",
    P.ProductType.ENHANCED_YIELD_FUND: "Fixed Income Funds",
    P.ProductType.BALANCED_FUND: "Balanced Funds",
    P.ProductType.MULTI_ASSET_FUND: "Balanced Funds",
    P.ProductType.EQUITY_FUND: "Equity Funds",
    P.ProductType.SHARIAH_FUND: "Shariah Funds",
    P.ProductType.WEALTH_FUND: "Special Funds",
    P.ProductType.SPECIAL_FUND: "Special Funds",
    P.ProductType.ALTERNATIVE_INVESTMENT_FUND: "Special Funds",
    P.ProductType.REIT: "REITs",
    P.ProductType.TREASURY_BILL: "Treasury Bills",
    P.ProductType.TREASURY_BOND: "Treasury Bonds",
    P.ProductType.INFRASTRUCTURE_BOND: "Treasury Bonds",
    P.ProductType.SACCO_DEPOSIT: "SACCOs",
    P.ProductType.SACCO_SHARE_CAPITAL: "SACCOs",
    P.ProductType.FIXED_DEPOSIT: "Fixed Deposits",
    P.ProductType.NSE_EQUITY: "NSE Stocks",
    P.ProductType.NSE_SHARE_ROUTE: "NSE Stocks",
    P.ProductType.CDS_ACCOUNT_ROUTE: "NSE Stocks",
    P.ProductType.GLOBAL_STOCK_ROUTE: "Global Stocks and ETFs",
    P.ProductType.GLOBAL_ETF_ROUTE: "Global Stocks and ETFs",
    P.ProductType.PENSION_PRODUCT: "Pension Products",
    P.ProductType.INSURANCE_LINKED_INVESTMENT: "Insurance-linked Investments",
    P.ProductType.BITCOIN_ROUTE: "Bitcoin and Crypto Risk",
    P.ProductType.BITCOIN_CRYPTO_RISK_ROUTE: "Bitcoin and Crypto Risk",
    P.ProductType.LAND_DUE_DILIGENCE: "Land",
    P.ProductType.OTHER: "Other Investments",
}

DISCLAIMER = (
    "Educational information only. PesaRoute does not hold money, execute investments, recommend providers, "
    "or promise returns. Verify details with the provider, regulator, and licensed professionals "
    "before committing money."
)


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", (text or "").lower())).strip()


def _phrase_in(a: str, b: str) -> bool:
    """True if the shorter of a/b appears as a whole word/phrase in the longer."""
    short, long_ = (a, b) if len(a) <= len(b) else (b, a)
    if not short:
        return False
    return re.search(r"(?<!\w)" + re.escape(short) + r"(?!\w)", long_) is not None


def base_name(name: str) -> str:
    """Name without currency tokens — for currency-variant duplicate detection."""
    n = normalize(name)
    for token in ("usd", "kes", "gbp", "eur", "dollar", "dollars", "shilling", "shillings"):
        n = re.sub(rf"\b{token}\b", "", n)
    return re.sub(r"\s+", " ", n).strip()


def infer_currency(name: str) -> str:
    n = name.lower()
    if "(usd)" in n or "usd" in n or "dollar" in n or "us dollars" in n:
        return P.Currency.USD
    if "(gbp)" in n or "gbp" in n:
        return P.Currency.GBP
    if "(eur)" in n or "euro" in n:
        return P.Currency.EUR
    return P.Currency.KES


def infer_product_type(name: str) -> tuple[str, str]:
    """Return (product_type, parser_confidence)."""
    n = name.lower()
    for keyword, ptype in TYPE_RULES:
        if keyword in n:
            confidence = StagedInvestmentProduct.ParserConfidence.HIGH
            if any(marker in n for marker in NEEDS_REVIEW_MARKERS):
                confidence = StagedInvestmentProduct.ParserConfidence.MEDIUM
            return ptype, confidence
    return P.ProductType.OTHER, StagedInvestmentProduct.ParserConfidence.LOW


RISK_BY_TYPE = {
    P.ProductType.MONEY_MARKET_FUND: (P.RiskLevel.LOW, P.LiquidityLevel.HIGH),
    P.ProductType.FIXED_INCOME_FUND: (P.RiskLevel.MEDIUM, P.LiquidityLevel.MEDIUM),
    P.ProductType.BOND_FUND: (P.RiskLevel.MEDIUM, P.LiquidityLevel.MEDIUM),
    P.ProductType.ENHANCED_YIELD_FUND: (P.RiskLevel.MEDIUM, P.LiquidityLevel.MEDIUM),
    P.ProductType.BALANCED_FUND: (P.RiskLevel.MEDIUM, P.LiquidityLevel.MEDIUM),
    P.ProductType.MULTI_ASSET_FUND: (P.RiskLevel.MEDIUM, P.LiquidityLevel.MEDIUM),
    P.ProductType.EQUITY_FUND: (P.RiskLevel.HIGH, P.LiquidityLevel.MEDIUM),
    P.ProductType.SHARIAH_FUND: (P.RiskLevel.MEDIUM, P.LiquidityLevel.MEDIUM),
    P.ProductType.WEALTH_FUND: (P.RiskLevel.HIGH, P.LiquidityLevel.MEDIUM),
    P.ProductType.SPECIAL_FUND: (P.RiskLevel.HIGH, P.LiquidityLevel.MEDIUM),
    P.ProductType.ALTERNATIVE_INVESTMENT_FUND: (P.RiskLevel.VERY_HIGH, P.LiquidityLevel.LOW),
}


def _category(name: str, dry_run: bool) -> ProductCategory | None:
    slug = slugify(name)
    existing = ProductCategory.objects.filter(slug=slug).first()
    if existing or dry_run:
        return existing
    category, _ = ProductCategory.objects.get_or_create(
        slug=slug,
        defaults={
            "name": name,
            "description": f"Educational overview for {name}.",
            "status": ProductCategory.Status.ACTIVE,
        },
    )
    return category


def _resolve_provider(
    name: str, aliases: list[str], provider_type: str, source_conf: str, website: str, source_url: str, dry_run: bool
) -> tuple[Provider | None, bool]:
    """Find an existing provider by slug or whole-word alias match; else create. Returns (provider, created)."""
    slug = slugify(name)
    existing = Provider.objects.filter(slug=slug).first() or Provider.objects.filter(name=name).first()
    if not existing:
        candidates = {normalize(a) for a in ([name] + (aliases or [])) if a}
        for provider in Provider.objects.all():
            pn = normalize(provider.name)
            # Whole-word/phrase match in both directions so a short alias like "RBA"
            # does not match inside an unrelated word (e.g. "co-RBA-n" / Lofty Corban).
            if any(c and _phrase_in(c, pn) for c in candidates):
                existing = provider
                break
    if existing:
        return existing, False
    if dry_run:
        return None, True
    provider = Provider.objects.create(
        name=name,
        slug=slug,
        provider_type=provider_type or Provider.ProviderType.FUND_MANAGER,
        source_confidence=source_conf or Provider.SourceConfidence.OFFICIAL,
        regulator_category="Approved Collective Investment Scheme",
        website=website or "",
        public_source_url=source_url or "",
        last_verified_at=timezone.now(),
        verification_status=Provider.VerificationStatus.SOURCE_VERIFIED,
        published_status=Provider.PublishedStatus.PUBLISHED,
        status=Provider.Status.ACTIVE,
        editorial_notes=IMPORT_MARKER,
    )
    return provider, True


def _source_reference(source: DataSource, title: str, url: str, label: str, dry_run: bool) -> SourceReference | None:
    if dry_run or not source:
        return None
    ref, _ = SourceReference.objects.get_or_create(
        source=source,
        title=title[:240],
        url=url or source.homepage_url or "https://pesaroute.local/source",
        defaults={
            "retrieved_at": timezone.now(),
            "citation_label": label[:160],
            "notes": "Imported by import_kenya_product_catalog.",
        },
    )
    return ref


def import_catalog(
    path: str, *, dry_run: bool = True, publish: bool = False, created_by=None
) -> ProductCatalogImportBatch:
    base = Path(path)
    files = sorted(base.glob("*.yaml")) if base.is_dir() else [base]

    batch = ProductCatalogImportBatch(
        name=f"Kenya catalog import {timezone.now():%Y-%m-%d %H:%M}",
        import_type=ProductCatalogImportBatch.ImportType.MANUAL_EDITORIAL,
        status=ProductCatalogImportBatch.Status.RUNNING,
        created_by=created_by,
    )
    if not dry_run:
        batch.save()

    seen_base_names: dict[str, str] = {}  # base_name -> slug, within this run

    for file in files:
        data = yaml.safe_load(file.read_text(encoding="utf-8")) or {}
        src = data.get("source", {})
        source = None
        if not dry_run and src.get("slug"):
            source, _ = DataSource.objects.get_or_create(
                slug=src["slug"],
                defaults={
                    "name": src.get("name", src["slug"]),
                    "source_type": src.get("source_type", DataSource.SourceType.REGULATOR),
                    "authority_level": src.get("authority_level", DataSource.AuthorityLevel.OFFICIAL),
                    "homepage_url": src.get("url", ""),
                    "is_active": False,
                    "license_notes": "Imported catalog source. Verify with the official source before acting.",
                },
            )
            if batch.source_id is None:
                batch.source = source

        # Normalize both shapes: CIS `schemes` (names) and `providers` (explicit dicts).
        groups = []
        for scheme in data.get("schemes", []):
            groups.append(
                {
                    "provider": scheme["provider"],
                    "aliases": scheme.get("aliases", []),
                    "provider_type": scheme.get("provider_type", Provider.ProviderType.FUND_MANAGER),
                    "source_confidence": "official",
                    "scheme": True,
                    "products": [{"name": n} for n in scheme.get("products", [])],
                }
            )
        for prov in data.get("providers", []):
            groups.append(
                {
                    "provider": prov["name"],
                    "aliases": prov.get("aliases", []),
                    "provider_type": prov.get("provider_type", Provider.ProviderType.OTHER),
                    "source_confidence": prov.get("source_confidence", "editorial"),
                    "website": prov.get("website", ""),
                    "source_url": prov.get("source_url", src.get("url", "")),
                    "products": prov.get("products", []),
                }
            )

        for group in groups:
            provider, created = _resolve_provider(
                group["provider"],
                group.get("aliases", []),
                group["provider_type"],
                group["source_confidence"],
                group.get("website", ""),
                group.get("source_url", src.get("url", "")),
                dry_run,
            )
            if created:
                batch.providers_created += 1
            else:
                batch.providers_updated += 1
            ref = _source_reference(
                source,
                f"{src.get('name', 'Source')}: {group['provider']}",
                src.get("url", ""),
                src.get("name", "Source"),
                dry_run,
            )

            for raw in group["products"]:
                item = raw if isinstance(raw, dict) else {"name": raw}
                name = item["name"]
                batch.records_seen += 1
                ptype, confidence = infer_product_type(name)
                if item.get("product_type"):
                    ptype = item["product_type"]
                    confidence = StagedInvestmentProduct.ParserConfidence.HIGH
                currency = item.get("currency") or infer_currency(name)
                risk, liquidity = RISK_BY_TYPE.get(ptype, (P.RiskLevel.UNKNOWN, P.LiquidityLevel.UNKNOWN))
                risk = item.get("risk_level", risk)
                liquidity = item.get("liquidity_level", liquidity)
                slug = slugify(name)
                bname = base_name(name)

                needs_review = (
                    confidence == StagedInvestmentProduct.ParserConfidence.LOW or ptype == P.ProductType.OTHER
                )
                is_duplicate = False
                # Currency-variant / cross-provider duplicate detection (never auto-merge).
                if bname in seen_base_names and seen_base_names[bname] != slug:
                    is_duplicate = True
                seen_base_names.setdefault(bname, slug)

                explicit_status = item.get("published_status")
                target_status = (
                    P.PublishedStatus.PUBLISHED
                    if publish and not needs_review and explicit_status != "draft"
                    else P.PublishedStatus.DRAFT
                )

                tags = list(item.get("tags", []))
                tags.append("source_verified" if group["source_confidence"] == "official" else "editorial")
                if needs_review:
                    tags.append("needs_review")
                tags.append("no_rate_available")
                if currency == P.Currency.USD:
                    tags.append("usd")
                if "shariah" in name.lower() or ptype == P.ProductType.SHARIAH_FUND:
                    tags.append("shariah")

                if needs_review or is_duplicate:
                    batch.products_needing_review += 1
                    if not dry_run:
                        StagedInvestmentProduct.objects.update_or_create(
                            batch=batch,
                            provider_name=group["provider"],
                            product_name=name,
                            defaults={
                                "source": source,
                                "scheme_name": group["provider"] if group.get("scheme") else "",
                                "product_type": ptype,
                                "currency": currency,
                                "normalized_payload": {"name": name, "base_name": bname, "duplicate": is_duplicate},
                                "source_url": src.get("url", ""),
                                "source_confidence": group["source_confidence"],
                                "parser_confidence": confidence,
                                "review_status": StagedInvestmentProduct.ReviewStatus.NEEDS_REVIEW,
                                "matched_provider": provider,
                                "reason": (
                                    "Possible duplicate (currency variant / cross-provider)."
                                    if is_duplicate
                                    else "Ambiguous product type — needs review."
                                ),
                            },
                        )

                if dry_run:
                    if not InvestmentProduct.objects.filter(slug=slug).exists():
                        batch.products_created += 1
                    continue
                if provider is None:
                    continue

                category = _category(item.get("category") or CATEGORY_BY_TYPE.get(ptype, "Other Investments"), dry_run)
                product, was_created = InvestmentProduct.objects.update_or_create(
                    slug=slug,
                    defaults={
                        "name": name,
                        "category": category,
                        "provider": provider,
                        "product_type": ptype,
                        "currency": currency,
                        "regulator": item.get("regulator", src.get("regulator", "CMA")),
                        "regulator_category": item.get(
                            "regulator_category", src.get("regulator_category", "Approved Collective Investment Scheme")
                        ),
                        "license_status": "Source-listed; verify current status with the regulator/provider",
                        "minimum_amount_notes": item.get(
                            "minimum_amount_notes", "Verify the current minimum directly with the provider."
                        ),
                        "risk_level": risk,
                        "liquidity_level": liquidity,
                        "public_url": item.get("source_url", src.get("url", "")),
                        "published_status": target_status,
                        "last_verified_at": timezone.now(),
                        "freshness_status": P.FreshnessStatus.UNKNOWN,
                        "source_confidence": item.get("source_confidence", group["source_confidence"]),
                        "internal_notes": f"{IMPORT_MARKER}. {DISCLAIMER}",
                        "tags": sorted(set(tags)),
                    },
                )
                if was_created:
                    batch.products_created += 1
                else:
                    batch.products_updated += 1
                if ref:
                    product.source_references.add(ref)

    batch.status = (
        ProductCatalogImportBatch.Status.NEEDS_REVIEW
        if batch.products_needing_review
        else ProductCatalogImportBatch.Status.SUCCEEDED
    )
    batch.completed_at = timezone.now()
    if not dry_run:
        batch.save()
    return batch
