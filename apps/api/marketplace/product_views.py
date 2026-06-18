"""Marketplace product + decision-layer API (Phase 2.13 + 2.15)."""

from datetime import timedelta
from decimal import Decimal, InvalidOperation

from django.db.models import Case, Count, DecimalField, IntegerField, OuterRef, Subquery, When
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from journal.models import JournalEntry
from marketplace import product_services as svc
from marketplace.models import ConsultationRequest, Professional, WatchedProduct
from marketplace.product_serializers import (
    MarketplaceProductCardSerializer,
    MarketplaceProductDetailSerializer,
    WatchlistItemSerializer,
)
from planning.models import InvestmentProduct, ProductRateSnapshot
from privacy.models import DataGrant

PT = InvestmentProduct.ProductType
LAND_TYPES = {PT.LAND_DUE_DILIGENCE}

USER_TYPE_FIT = {
    "beginner": [PT.MONEY_MARKET_FUND, PT.TREASURY_BILL, PT.SACCO_DEPOSIT, PT.FIXED_DEPOSIT],
    "first_salary": [PT.MONEY_MARKET_FUND, PT.SACCO_DEPOSIT],
    "chama": [PT.SACCO_DEPOSIT, PT.SACCO_SHARE_CAPITAL, PT.MONEY_MARKET_FUND],
    "diaspora": [PT.MONEY_MARKET_FUND, PT.GLOBAL_ETF_ROUTE, PT.TREASURY_BILL],
    "farmer": [PT.SACCO_DEPOSIT, PT.MONEY_MARKET_FUND, PT.FIXED_DEPOSIT],
    "jua_kali": [PT.MONEY_MARKET_FUND, PT.SACCO_DEPOSIT, PT.FIXED_DEPOSIT],
}

LAND_NOTICE = {
    "headline": "Land price comparison is not enough.",
    "steps": [
        "Complete a Before Deposit Checklist.",
        "Compare land with MMF / Treasury bill / SACCO / REIT.",
        "Request a lawyer or surveyor review.",
        "Save your decision to your journal.",
    ],
    "url": "/land-decision-safety",
}

COMPARE_NOTE = "Compare assumptions before committing money."

REVIEW_CATEGORY_BY_TYPE = {
    PT.MONEY_MARKET_FUND: ConsultationRequest.Category.MMF,
    PT.TREASURY_BILL: ConsultationRequest.Category.TREASURY,
    PT.TREASURY_BOND: ConsultationRequest.Category.TREASURY,
    PT.SACCO_DEPOSIT: ConsultationRequest.Category.SACCO,
    PT.SACCO_SHARE_CAPITAL: ConsultationRequest.Category.SACCO,
    PT.GLOBAL_ETF_ROUTE: ConsultationRequest.Category.GLOBAL_INVESTING,
    PT.GLOBAL_STOCK_ROUTE: ConsultationRequest.Category.GLOBAL_INVESTING,
    PT.LAND_DUE_DILIGENCE: ConsultationRequest.Category.LAND_LITERACY,
}


def _published(request):
    qs = InvestmentProduct.objects.filter(published_status=InvestmentProduct.PublishedStatus.PUBLISHED)
    return qs.select_related("provider", "category").prefetch_related("rate_snapshots")


def _owned_product(slug):
    return generics.get_object_or_404(
        InvestmentProduct.objects.filter(published_status=InvestmentProduct.PublishedStatus.PUBLISHED), slug=slug
    )


class MarketplaceProductListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = MarketplaceProductCardSerializer

    def get_queryset(self):
        params = self.request.query_params
        qs = _published(self.request)

        current_rate = ProductRateSnapshot.objects.filter(product=OuterRef("pk"), is_current=True).order_by(
            "-snapshot_date"
        )
        qs = qs.annotate(
            current_yield=Subquery(
                current_rate.values("rate_value")[:1], output_field=DecimalField(max_digits=9, decimal_places=4)
            ),
            sim_count=Count("simulation_runs", distinct=True),
            watch_count=Count("watchers", distinct=True),
        )

        simple = {
            "product_type": "product_type",
            "currency": "currency",
            "risk_level": "risk_level",
            "liquidity_level": "liquidity_level",
            "source_confidence": "source_confidence",
            "freshness_status": "freshness_status",
            "regulator_category": "regulator_category__iexact",
        }
        for param, field in simple.items():
            value = params.get(param)
            if value:
                qs = qs.filter(**{field: value})

        if params.get("category"):
            qs = qs.filter(category__slug=params["category"])
        if params.get("provider"):
            qs = qs.filter(provider__slug=params["provider"])
        if params.get("mpesa") in {"1", "true", "yes"}:
            qs = qs.filter(mpesa_paybill_available=True)
        if params.get("has_rate") in {"1", "true", "yes"}:
            qs = qs.filter(current_yield__isnull=False)
        if params.get("minimum_amount_lte"):
            try:
                qs = qs.filter(minimum_amount__lte=Decimal(params["minimum_amount_lte"]))
            except InvalidOperation:
                qs = qs.none()
        if params.get("goal_fit"):
            fit = svc.GOAL_FIT.get(params["goal_fit"])
            if fit:
                qs = qs.filter(product_type__in=set(fit["understand"]) | set(fit["compare"]))
        if params.get("user_type_fit"):
            types = USER_TYPE_FIT.get(params["user_type_fit"])
            if types:
                qs = qs.filter(product_type__in=types)
        if params.get("search"):
            s = params["search"]
            qs = (
                qs.filter(name__icontains=s)
                | qs.filter(provider__name__icontains=s)
                | qs.filter(category__name__icontains=s)
            )

        sort = params.get("sort", "name")
        order = {
            "yield": ("-current_yield", "name"),
            "minimum": ("minimum_amount", "name"),
            "name": ("name",),
            "recently_updated": ("-updated_at",),
            "most_simulated": ("-sim_count", "name"),
            "most_saved": ("-watch_count", "name"),
        }
        if sort in order:
            return qs.order_by(*order[sort])
        if sort == "freshness":
            rank = Case(
                When(freshness_status="fresh", then=0),
                When(freshness_status="acceptable", then=1),
                When(freshness_status="stale", then=2),
                default=3,
                output_field=IntegerField(),
            )
            return qs.annotate(_r=rank).order_by("_r", "name")
        if sort in {"risk", "beginner_friendly"}:
            risk_rank = Case(
                When(risk_level="low", then=0),
                When(risk_level="medium", then=1),
                When(risk_level="high", then=2),
                When(risk_level="very_high", then=3),
                default=4,
                output_field=IntegerField(),
            )
            liq_rank = Case(
                When(liquidity_level="high", then=0),
                When(liquidity_level="medium", then=1),
                When(liquidity_level="low", then=2),
                default=3,
                output_field=IntegerField(),
            )
            return qs.annotate(_risk=risk_rank, _liq=liq_rank).order_by("_risk", "_liq", "name")
        if sort == "liquidity":
            liq_rank = Case(
                When(liquidity_level="high", then=0),
                When(liquidity_level="medium", then=1),
                When(liquidity_level="low", then=2),
                default=3,
                output_field=IntegerField(),
            )
            return qs.annotate(_liq=liq_rank).order_by("_liq", "name")
        return qs.order_by("name")

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        params = request.query_params
        is_land = params.get("product_type") == PT.LAND_DUE_DILIGENCE or (params.get("category") or "").startswith(
            "land"
        )
        if is_land and isinstance(response.data, dict):
            response.data["land_notice"] = LAND_NOTICE
        return response


class MarketplaceProductDetailView(generics.RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = MarketplaceProductDetailSerializer
    lookup_field = "slug"

    def get_queryset(self):
        return _published(self.request).prefetch_related("fee_schedules", "liquidity_rules", "source_references")


class MarketplaceCompareView(APIView):
    """Compare 2-5 products. NEVER returns a winner or recommendation."""

    permission_classes = [AllowAny]

    def get(self, request):
        raw = request.query_params.get("slugs") or request.query_params.get("product_ids") or ""
        keys = [k.strip() for k in raw.split(",") if k.strip()][:5]
        qs = _published(request)
        products = list(qs.filter(slug__in=keys)) or list(qs.filter(id__in=[k for k in keys if k.isdigit()]))
        amount = request.query_params.get("amount")

        rows = []
        for p in products:
            card = MarketplaceProductCardSerializer(p).data
            net_after_tax = None
            if amount and p.product_type == PT.MONEY_MARKET_FUND and card["annual_yield"]:
                try:
                    net_after_tax = svc.net_after_tax_mmf(
                        initial_amount=Decimal(amount),
                        timeline_months=12,
                        annual_yield=Decimal(card["annual_yield"]),
                        yield_treatment=p.yield_type or "unknown",
                        management_fee=p.management_fee_rate or 0,
                        withholding_tax_rate=p.withholding_tax_rate or 15,
                    )
                except (InvalidOperation, ValueError):
                    net_after_tax = None
            rows.append(
                {
                    "product": card,
                    "questions_to_ask": p.questions_to_ask,
                    "net_after_tax_estimate": net_after_tax,
                }
            )

        return Response(
            {
                "comparison_note": COMPARE_NOTE,
                "rows": rows,
                "disclaimer": svc.EDU_DISCLAIMER,
            }
        )


class MarketplaceFinderView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        d = request.data
        return Response(
            svc.run_product_finder(
                amount_range=d.get("amount_range", ""),
                goal=d.get("goal", "first_investment"),
                timeline=d.get("timeline", ""),
                quick_withdrawal=d.get("quick_withdrawal", ""),
                value_drop_comfort=d.get("value_drop_comfort", ""),
                currency_pref=d.get("currency_pref", ""),
                investing_context=d.get("investing_context", ""),
            )
        )


class MarketplaceMmfFinderView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        d = request.data
        return Response(
            svc.run_mmf_finder(
                amount_range=d.get("amount_range", ""),
                goal=d.get("goal", "first_investment"),
                timeline=d.get("timeline", ""),
                need_quick_withdrawal=bool(d.get("need_quick_withdrawal")),
                minimum_amount_preference=d.get("minimum_amount_preference"),
                mpesa_preference=bool(d.get("mpesa_preference")),
                risk_comfort=d.get("risk_comfort", ""),
            )
        )


class MarketplaceNetAfterTaxView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        d = request.data
        try:
            result = svc.net_after_tax_mmf(
                initial_amount=Decimal(str(d.get("initial_amount", "0"))),
                monthly_contribution=Decimal(str(d.get("monthly_contribution", "0"))),
                timeline_months=int(d.get("timeline_months", 12)),
                annual_yield=Decimal(str(d.get("annual_yield", "0"))),
                yield_treatment=d.get("yield_treatment", "unknown"),
                management_fee=Decimal(str(d.get("management_fee", "0"))),
                withholding_tax_rate=Decimal(str(d.get("withholding_tax_rate", "15"))),
            )
        except (InvalidOperation, ValueError):
            return Response({"detail": "Invalid numeric input."}, status=400)
        return Response(result)


class MarketplaceSaccoScoreView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        product = _owned_product(slug)
        return Response(svc.sacco_due_diligence_score(product))


class MarketplaceQuickScenariosView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"scenarios": svc.QUICK_SCENARIOS, "disclaimer": svc.EDU_DISCLAIMER})


class MarketplaceIntelligenceView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(svc.build_intelligence())


class MarketplaceWatchlistView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = WatchlistItemSerializer

    def get_queryset(self):
        return (
            WatchedProduct.objects.filter(user=self.request.user)
            .select_related("product", "product__provider", "product__category")
            .prefetch_related("product__rate_snapshots")
        )

    def create(self, request, *args, **kwargs):
        product = _owned_product(request.data.get("product_slug", ""))
        snap = product.rate_snapshots.filter(is_current=True).order_by("-snapshot_date").first()
        watch, _ = WatchedProduct.objects.update_or_create(
            user=request.user,
            product=product,
            defaults={
                "note": request.data.get("note", ""),
                "last_seen_rate_value": snap.rate_value if snap else None,
                "last_seen_snapshot_date": snap.snapshot_date if snap else None,
                "last_seen_source_confidence": snap.confidence if snap else "",
                "last_reviewed_at": timezone.now(),
            },
        )
        return Response(WatchlistItemSerializer(watch).data, status=status.HTTP_201_CREATED)


class MarketplaceWatchlistItemView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return WatchedProduct.objects.filter(user=self.request.user)


class MarketplacePersonalBriefView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(svc.build_personal_brief(request.user))


class MarketplaceSaveToJournalView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, slug):
        product = _owned_product(slug)
        d = request.data
        snap = product.rate_snapshots.filter(is_current=True).order_by("-snapshot_date").first()
        assumptions = [
            f"Product: {product.name} ({product.get_product_type_display()}).",
            (
                f"Latest rate: {snap.rate_value}% as of {snap.snapshot_date}."
                if snap
                else "Latest rate unavailable; an educational rate would be assumed."
            ),
            f"Source confidence: {product.source_confidence}; freshness: {product.freshness_status}.",
        ]
        prompts = [
            "Why am I considering this product?",
            "Is liquidity important for this goal?",
            "Am I chasing yield only?",
            "What must I verify before sending money?",
            "When will I review this decision?",
        ]
        decision_lines = [f"Considering {product.name}."]
        if d.get("note"):
            decision_lines.append(f"My reasoning: {d['note']}")
        decision_lines.append("Assumptions: " + " ".join(assumptions))
        decision_lines.append("Questions to revisit: " + " ".join(prompts))
        decision_lines.append(svc.EDU_DISCLAIMER)

        entry = JournalEntry.objects.create(
            user=request.user,
            goal=f"Marketplace: {product.name}"[:180],
            decision="\n".join(decision_lines),
            amount_display_mode=JournalEntry.AmountDisplayMode.HIDDEN,
            visibility=JournalEntry.Visibility.PRIVATE,
        )
        return Response(
            {
                "journal_entry_id": entry.id,
                "visibility": entry.visibility,
                "assumptions": assumptions,
                "prompts": prompts,
            },
            status=status.HTTP_201_CREATED,
        )


class MarketplaceRequestReviewView(APIView):
    """Request professional review for a product. Defaults: amount RANGE (not exact),
    exact values OFF, portfolio summary OFF, access auto-expires."""

    permission_classes = [IsAuthenticated]

    def post(self, request, slug):
        product = _owned_product(slug)
        d = request.data
        professional = None
        if d.get("professional_id"):
            professional = Professional.objects.filter(
                id=d["professional_id"], verification_status=Professional.VerificationStatus.VERIFIED, is_active=True
            ).first()

        now = timezone.now()
        grant = DataGrant.objects.create(
            user=request.user,
            grantee_type=DataGrant.GranteeType.PROFESSIONAL,
            professional=professional,
            grantee_id=professional.id if professional else None,
            scopes=[DataGrant.Scope.CONSULTATION_CONTEXT],
            status=DataGrant.Status.ACTIVE,
            starts_at=now,
            expires_at=now + timedelta(days=int(d.get("access_days", 14))),
        )

        snap = product.rate_snapshots.filter(is_current=True).order_by("-snapshot_date").first()
        source_warning = (
            f"Source confidence {product.source_confidence}, freshness {product.freshness_status}."
            if product.freshness_status != InvestmentProduct.FreshnessStatus.FRESH
            else "Data marked fresh; still verify with the provider."
        )
        notes = " | ".join(
            [
                f"Product: {product.name}",
                (
                    f"Assumptions: latest rate {snap.rate_value}% as of {snap.snapshot_date}"
                    if snap
                    else "Assumptions: no live rate, educational rate only"
                ),
                source_warning,
                f"Goal: {d.get('goal', 'not specified')}",
                f"Timeline: {d.get('timeline', 'not specified')}",
                f"Question: {d.get('question', '')}",
            ]
        )

        consultation = ConsultationRequest.objects.create(
            user=request.user,
            selected_professional=professional,
            data_grant=grant,
            category=REVIEW_CATEGORY_BY_TYPE.get(
                product.product_type, ConsultationRequest.Category.GENERAL_FIRST_INVESTMENT
            ),
            topic=f"Product review: {product.name}"[:180],
            amount_display_mode=ConsultationRequest.AmountDisplayMode.RANGE,
            amount_range_min=d.get("amount_range_min"),
            amount_range_max=d.get("amount_range_max"),
            user_question=d.get("question", ""),
            notes=notes,
            timeline=d.get("timeline", ConsultationRequest.Timeline.FLEXIBLE),
            status=ConsultationRequest.Status.SUBMITTED,
        )
        return Response(
            {
                "consultation_request_id": consultation.id,
                "data_grant_id": grant.id,
                "amount_display_mode": consultation.amount_display_mode,
                "exact_values_shared": False,
                "portfolio_summary_shared": False,
                "access_expires_at": grant.expires_at.isoformat(),
                "source_warning": source_warning,
                "disclaimer": svc.EDU_DISCLAIMER,
            },
            status=status.HTTP_201_CREATED,
        )
