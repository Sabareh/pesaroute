from datetime import timedelta
from decimal import Decimal, InvalidOperation

from django.db.models import Exists, OuterRef, Prefetch, Q, TextField
from django.db.models.functions import Cast
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.views import parse_bool
from learning.models import LearningLesson
from learning.services import can_access_lesson
from planning import simulation_engine
from planning.models import (
    InvestmentProduct,
    ProductRateSnapshot,
    ProductSimulationRun,
    SimulationRun,
    VirtualSimulationPortfolio,
    VirtualSimulationPosition,
    VirtualSimulationSnapshot,
)
from planning.serializers import (
    CategoryCompareSimulationSerializer,
    CompareProductsSimulationSerializer,
    GlobalRouteSimulationSerializer,
    InvestmentProductDetailSerializer,
    InvestmentProductListSerializer,
    MMFSimulationSerializer,
    ProductSimulationSerializer,
    ProductSpecificSimulationSerializer,
    SaccoSimulationSerializer,
    TBillSimulationSerializer,
    VirtualPortfolioCreateSerializer,
    VirtualPortfolioSerializer,
    VirtualPositionCreateSerializer,
)
from planning.services import (
    DISCLAIMER,
    PRODUCT_SIMULATION_DISCLAIMER,
    simulate_global_route,
    simulate_mmf,
    simulate_product,
    simulate_sacco,
    simulate_tbill,
)

CONSULTATION_CATEGORY_BY_TYPE = {
    "money_market_fund": "mmf",
    "fixed_income_fund": "mmf",
    "balanced_fund": "mmf",
    "equity_fund": "mmf",
    "special_fund": "global_investing",
    "treasury_bill": "treasury",
    "treasury_bond": "treasury",
    "infrastructure_bond": "treasury",
    "sacco_deposit": "sacco",
    "sacco_share_capital": "sacco",
    "global_etf_route": "global_investing",
    "global_stock_route": "global_investing",
    "bitcoin_route": "global_investing",
    "land_due_diligence": "land_literacy",
}


class SimulationAPIView(APIView):
    serializer_class = None
    simulator_type = None
    simulator = None
    throttle_scope = "simulators"

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        learning_lesson = None
        learning_lesson_id = request.data.get("learning_lesson_id") or request.data.get("learning_lesson")
        if learning_lesson_id:
            learning_lesson = (
                LearningLesson.objects.filter(
                    pk=learning_lesson_id,
                    status=LearningLesson.Status.PUBLISHED,
                )
                .select_related("course", "course__track")
                .first()
            )
            if not learning_lesson:
                return Response({"detail": "Learning lesson not found."}, status=404)
            if not can_access_lesson(request.user, learning_lesson):
                return Response({"detail": "Premium learning entitlement required."}, status=403)
        result = self.simulator(**serializer.validated_data)
        simulation_run = SimulationRun.objects.create(
            user=request.user if request.user.is_authenticated else None,
            learning_lesson=learning_lesson,
            simulator_type=self.simulator_type,
            inputs={key: str(value) for key, value in serializer.validated_data.items()},
            outputs=result,
            disclaimer=DISCLAIMER,
        )
        response = dict(result)
        response["simulation_run_id"] = simulation_run.id
        return Response(response)


class MMFSimulationView(SimulationAPIView):
    serializer_class = MMFSimulationSerializer
    simulator_type = SimulationRun.SimulatorType.MMF
    simulator = staticmethod(simulate_mmf)


class TBillSimulationView(SimulationAPIView):
    serializer_class = TBillSimulationSerializer
    simulator_type = SimulationRun.SimulatorType.TBILL
    simulator = staticmethod(simulate_tbill)


class SaccoSimulationView(SimulationAPIView):
    serializer_class = SaccoSimulationSerializer
    simulator_type = SimulationRun.SimulatorType.SACCO
    simulator = staticmethod(simulate_sacco)


class GlobalRouteSimulationView(SimulationAPIView):
    serializer_class = GlobalRouteSimulationSerializer
    simulator_type = SimulationRun.SimulatorType.GLOBAL_ROUTE
    simulator = staticmethod(simulate_global_route)


def product_base_queryset():
    return InvestmentProduct.objects.select_related("category", "provider").prefetch_related(
        "source_references__source",
        "fee_schedules__source_reference__source",
        "liquidity_rules__source_reference__source",
        Prefetch(
            "rate_snapshots",
            to_attr="prefetched_current_rates",
            queryset=ProductRateSnapshot.objects.filter(is_current=True).order_by("-snapshot_date"),
        ),
    )


class ProductCacheMixin:
    cache_control = "public, max-age=300"

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        response["Cache-Control"] = self.cache_control
        response["Vary"] = "Accept"
        return response


class InvestmentProductListView(ProductCacheMixin, generics.ListAPIView):
    serializer_class = InvestmentProductListSerializer

    def get_queryset(self):
        current_rates = ProductRateSnapshot.objects.filter(product=OuterRef("pk"), is_current=True)
        queryset = product_base_queryset().annotate(
            has_current_rate_value=Exists(current_rates),
            typical_use_cases_text=Cast("typical_use_cases", output_field=TextField()),
            beginner_mistakes_text=Cast("beginner_mistakes", output_field=TextField()),
            questions_to_ask_text=Cast("questions_to_ask", output_field=TextField()),
        )
        status_param = self.request.query_params.get("published_status")
        if status_param:
            if status_param == InvestmentProduct.PublishedStatus.PUBLISHED or self.request.user.is_staff:
                queryset = queryset.filter(published_status=status_param)
            else:
                queryset = queryset.none()
        else:
            queryset = queryset.filter(published_status=InvestmentProduct.PublishedStatus.PUBLISHED)

        filters = {
            "product_type": "product_type",
            "currency": "currency",
            "risk_level": "risk_level",
            "liquidity_level": "liquidity_level",
            "regulator": "regulator__iexact",
            "regulator_category": "regulator_category__iexact",
            "license_status": "license_status__iexact",
            "freshness_status": "freshness_status",
            "source_confidence": "source_confidence",
        }
        for param, field in filters.items():
            value = self.request.query_params.get(param)
            if value:
                queryset = queryset.filter(**{field: value})

        category = self.request.query_params.get("category")
        if category:
            queryset = queryset.filter(Q(category__slug=category) | Q(category__name__iexact=category))

        provider = self.request.query_params.get("provider")
        if provider:
            queryset = queryset.filter(Q(provider__slug=provider) | Q(provider__name__icontains=provider))

        minimum_amount_lte = self.request.query_params.get("minimum_amount_lte")
        if minimum_amount_lte:
            try:
                queryset = queryset.filter(minimum_amount__lte=Decimal(minimum_amount_lte))
            except InvalidOperation:
                queryset = queryset.none()

        has_current_rate = self.request.query_params.get("has_current_rate")
        if has_current_rate is not None:
            parsed = parse_bool(has_current_rate)
            queryset = queryset.none() if parsed is None else queryset.filter(has_current_rate_value=parsed)

        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(provider__name__icontains=search)
                | Q(category__name__icontains=search)
                | Q(regulator__icontains=search)
                | Q(typical_use_cases_text__icontains=search)
                | Q(beginner_mistakes_text__icontains=search)
                | Q(questions_to_ask_text__icontains=search)
            )

        return queryset.order_by("category__name", "name")


class InvestmentProductDetailView(ProductCacheMixin, generics.RetrieveAPIView):
    serializer_class = InvestmentProductDetailSerializer
    lookup_field = "slug"

    def get_queryset(self):
        return product_base_queryset().filter(published_status=InvestmentProduct.PublishedStatus.PUBLISHED)


class ProductCompareView(ProductCacheMixin, APIView):
    def get(self, request):
        product_ids = [
            value.strip() for value in request.query_params.get("product_ids", "").split(",") if value.strip()
        ]
        if not product_ids:
            return Response({"detail": "product_ids query parameter is required."}, status=status.HTTP_400_BAD_REQUEST)
        products = (
            product_base_queryset()
            .filter(id__in=product_ids, published_status=InvestmentProduct.PublishedStatus.PUBLISHED)
            .order_by("category__name", "name")
        )
        comparison = []
        for product in products:
            current_rate = product.rate_snapshots.filter(is_current=True).order_by("-snapshot_date").first()
            comparison.append(
                {
                    "id": product.id,
                    "name": product.name,
                    "slug": product.slug,
                    "provider": product.provider.name if product.provider else "",
                    "category": product.category.name,
                    "risk_level": product.risk_level,
                    "liquidity_level": product.liquidity_level,
                    "minimum_amount": str(product.minimum_amount) if product.minimum_amount is not None else None,
                    "current_rate": product_simulation_rate_summary(current_rate),
                    "fees": [fee.notes or fee.fee_type for fee in product.fee_schedules.filter(is_current=True)],
                    "freshness_status": product.freshness_status,
                    "source_confidence": product.source_confidence,
                    "documents_needed": product.documents_needed,
                    "questions_to_ask": product.questions_to_ask,
                }
            )
        return Response({"results": comparison, "disclaimer": PRODUCT_SIMULATION_DISCLAIMER})


def product_simulation_rate_summary(snapshot):
    if not snapshot:
        return None
    return {
        "id": snapshot.id,
        "snapshot_date": snapshot.snapshot_date.isoformat(),
        "rate_type": snapshot.rate_type,
        "rate_value": str(snapshot.rate_value),
        "rate_period": snapshot.rate_period,
        "confidence": snapshot.confidence,
    }


class ProductSimulationView(APIView):
    throttle_scope = "simulators"

    def post(self, request):
        serializer = ProductSimulationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        products = InvestmentProduct.objects.select_related("category", "provider").filter(
            published_status=InvestmentProduct.PublishedStatus.PUBLISHED
        )
        if data.get("product_id"):
            product = products.filter(id=data["product_id"]).first()
        else:
            product = products.filter(slug=data["product_slug"]).first()
        if not product:
            return Response({"detail": "Product not found."}, status=status.HTTP_404_NOT_FOUND)
        _run, output = simulate_product(
            product=product,
            input_amount=data["input_amount"],
            monthly_topup=data["monthly_topup"],
            timeline_months=data["timeline_months"],
            rate_mode=data["rate_mode"],
            custom_rate=data.get("custom_rate"),
            goal=data.get("goal", ""),
            liquidity_need=data.get("liquidity_need", ""),
            user=request.user,
        )
        return Response(output, status=status.HTTP_201_CREATED)


class CategoryCompareSimulationView(APIView):
    throttle_scope = "simulators"

    def post(self, request):
        serializer = CategoryCompareSimulationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        queryset = InvestmentProduct.objects.select_related("category", "provider").filter(
            published_status=InvestmentProduct.PublishedStatus.PUBLISHED
        )
        if data.get("category"):
            queryset = queryset.filter(Q(category__slug=data["category"]) | Q(category__name__iexact=data["category"]))
        if data.get("product_type"):
            queryset = queryset.filter(product_type=data["product_type"])
        if data.get("risk_preference"):
            queryset = queryset.filter(risk_level__in=[data["risk_preference"], InvestmentProduct.RiskLevel.UNKNOWN])
        options = []
        for product in queryset.order_by("risk_level", "liquidity_level", "name")[:12]:
            _run, output = simulate_product(
                product=product,
                input_amount=data["amount"],
                monthly_topup=data["monthly_topup"],
                timeline_months=data["timeline_months"],
                rate_mode=ProductSimulationSerializer.RateMode.LATEST_SNAPSHOT,
                goal=data.get("goal", ""),
                liquidity_need=data.get("liquidity_need", ""),
                user=request.user,
            )
            options.append(output)
        return Response(
            {"results": options, "disclaimer": PRODUCT_SIMULATION_DISCLAIMER}, status=status.HTTP_201_CREATED
        )


def _published_products():
    return InvestmentProduct.objects.select_related("category", "provider").prefetch_related(
        "fee_schedules", "liquidity_rules", "rate_snapshots"
    ).filter(published_status=InvestmentProduct.PublishedStatus.PUBLISHED)


class ProductSpecificSimulationView(APIView):
    """POST /api/simulations/product-specific/ — rich provider-specific estimate."""

    permission_classes = [AllowAny]
    throttle_scope = "simulators"

    def post(self, request):
        serializer = ProductSpecificSimulationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        product = _published_products().filter(slug=data["product_slug"]).first()
        if not product:
            return Response({"detail": "Product not found."}, status=status.HTTP_404_NOT_FOUND)
        _run, output = simulation_engine.run_product_specific(product, dict(data), user=request.user)
        return Response(output, status=status.HTTP_201_CREATED)


class CompareProductsSimulationView(APIView):
    """POST /api/simulations/compare-products/ — compare 2-5 products, no winner."""

    permission_classes = [AllowAny]
    throttle_scope = "simulators"

    def post(self, request):
        serializer = CompareProductsSimulationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        slugs = data["product_slugs"]
        products_by_slug = {p.slug: p for p in _published_products().filter(slug__in=slugs)}
        ordered = [products_by_slug[s] for s in slugs if s in products_by_slug]
        if len(ordered) < 2:
            return Response({"detail": "At least two valid published products are required."}, status=status.HTTP_400_BAD_REQUEST)
        params = {
            "initial_amount": data["initial_amount"],
            "monthly_topup": data["monthly_topup"],
            "timeline_months": data["timeline_months"],
            "rate_mode": data["rate_mode"],
            "include_fees": True,
            "include_tax_estimate": False,
            "goal": data.get("goal", ""),
        }
        custom_rates = {k: v for k, v in (data.get("custom_rates") or {}).items()}
        result = simulation_engine.run_compare(ordered, params, custom_rates=custom_rates, user=request.user)
        return Response(result, status=status.HTTP_201_CREATED)


class VirtualPortfolioListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        portfolios = VirtualSimulationPortfolio.objects.filter(user=request.user).prefetch_related("positions__product")
        return Response(VirtualPortfolioSerializer(portfolios, many=True).data)

    def post(self, request):
        serializer = VirtualPortfolioCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        portfolio = VirtualSimulationPortfolio.objects.create(
            user=request.user,
            name=data.get("name") or "My what-if portfolio",
            starting_virtual_cash=data["starting_virtual_cash"],
            currency=(data.get("currency") or InvestmentProduct.Currency.KES),
            goal=data.get("goal", ""),
        )
        return Response(VirtualPortfolioSerializer(portfolio).data, status=status.HTTP_201_CREATED)


class VirtualPortfolioDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        portfolio = VirtualSimulationPortfolio.objects.filter(pk=pk, user=request.user).prefetch_related("positions__product").first()
        if not portfolio:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        data = VirtualPortfolioSerializer(portfolio).data
        data["note"] = "Educational what-if portfolio only. Not real investing, trading, or holdings."
        return Response(data)


class VirtualPortfolioAddPositionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        portfolio = VirtualSimulationPortfolio.objects.filter(pk=pk, user=request.user).first()
        if not portfolio:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = VirtualPositionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        product = _published_products().filter(slug=data["product_slug"]).first()
        if not product:
            return Response({"detail": "Product not found."}, status=status.HTTP_404_NOT_FOUND)
        position = VirtualSimulationPosition.objects.create(
            portfolio=portfolio, product=product,
            virtual_amount_allocated=data["virtual_amount_allocated"],
            rate_mode=data["rate_mode"], custom_rate=data.get("custom_rate"),
            timeline_months=data["timeline_months"],
            assumptions={"rate_mode": data["rate_mode"]},
        )
        return Response(VirtualPortfolioSerializer(portfolio).data, status=status.HTTP_201_CREATED)


class VirtualPortfolioRunView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        portfolio = VirtualSimulationPortfolio.objects.filter(pk=pk, user=request.user).prefetch_related("positions__product").first()
        if not portfolio:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        rows = []
        total_value = Decimal("0")
        total_contributions = Decimal("0")
        for position in portfolio.positions.all():
            if not position.product:
                continue
            params = {
                "initial_amount": position.virtual_amount_allocated,
                "monthly_topup": Decimal("0"),
                "timeline_months": position.timeline_months,
                "rate_mode": position.rate_mode,
                "custom_rate": position.custom_rate,
                "include_fees": True,
                "include_tax_estimate": False,
            }
            _run, output = simulation_engine.run_product_specific(position.product, params, user=request.user)
            value = output.get("estimated_maturity_value") or output.get("estimated_gross_value")
            contrib = output.get("total_contributions") or "0"
            if value is not None:
                total_value += Decimal(value)
            total_contributions += Decimal(contrib)
            rows.append({
                "product": output["product"]["name"], "provider": output["provider"]["name"],
                "allocated": str(position.virtual_amount_allocated), "rate_mode": position.rate_mode,
                "estimated_value": value, "estimated_growth": output.get("estimated_growth"),
                "warnings": output["warnings"],
            })
        growth = total_value - total_contributions
        snapshot = VirtualSimulationSnapshot.objects.create(
            portfolio=portfolio, snapshot_date=timezone.localdate(),
            estimated_value=total_value, total_contributions=total_contributions, estimated_growth=growth,
            notes={"rows": rows},
        )
        return Response({
            "portfolio_id": portfolio.id,
            "snapshot_id": snapshot.id,
            "label": "Educational what-if estimate only — not real investing, trading, or returns.",
            "estimated_value": str(total_value),
            "total_contributions": str(total_contributions),
            "estimated_growth": str(growth),
            "rows": rows,
            "disclaimer": simulation_engine.calc.ESTIMATE_DISCLAIMER,
        }, status=status.HTTP_201_CREATED)


def _amount_range(amount: Decimal) -> tuple[Decimal, Decimal]:
    low = (amount * Decimal("0.8")).quantize(Decimal("1"))
    high = (amount * Decimal("1.2")).quantize(Decimal("1"))
    return low, high


class SimulationSaveToJournalView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, run_id):
        run = ProductSimulationRun.objects.filter(pk=run_id).first()
        if not run or (run.user_id and run.user_id != request.user.id):
            return Response({"detail": "Simulation run not found."}, status=status.HTTP_404_NOT_FOUND)
        from journal.models import JournalEntry

        output = run.output or {}
        provider = output.get("provider", {}).get("name") or (run.provider.name if run.provider else "the provider")
        product_name = output.get("product", {}).get("name") or (run.product.name if run.product else "this product")
        low, high = _amount_range(run.input_amount)
        reason = (
            f"Simulated {product_name} via {provider}. "
            f"Rate source: {output.get('rate_source_label', 'n/a')}; freshness: {output.get('freshness', 'n/a')}; "
            f"source confidence: {output.get('source_confidence', 'n/a')}.\n\n"
            "Why am I considering this product? What risk could make me avoid it? When will I review this decision?"
        )
        entry = JournalEntry.objects.create(
            user=request.user,
            goal=request.data.get("goal", "") or f"Simulate: {product_name}",
            decision=f"Considering {product_name} via {provider} (educational simulation).",
            amount_display_mode=JournalEntry.AmountDisplayMode.RANGE,
            amount_range_min=low,
            amount_range_max=high,
            reason=reason,
            visibility=JournalEntry.Visibility.PRIVATE,
        )
        return Response({
            "journal_entry_id": entry.id,
            "amount_display_mode": entry.amount_display_mode,
            "note": "Saved privately as an amount range (not exact). Add your reflection answers anytime.",
        }, status=status.HTTP_201_CREATED)


class SimulationRequestReviewView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, run_id):
        run = ProductSimulationRun.objects.filter(pk=run_id).first()
        if not run or (run.user_id and run.user_id != request.user.id):
            return Response({"detail": "Simulation run not found."}, status=status.HTTP_404_NOT_FOUND)
        from marketplace.models import ConsultationRequest

        output = run.output or {}
        product_name = output.get("product", {}).get("name") or (run.product.name if run.product else "a product")
        provider = output.get("provider", {}).get("name") or ""
        product_type = output.get("product", {}).get("product_type", "")
        low, high = _amount_range(run.input_amount)
        category = CONSULTATION_CATEGORY_BY_TYPE.get(product_type, ConsultationRequest.Category.GENERAL_FIRST_INVESTMENT)
        question = (
            f"Reviewing {product_name} via {provider}. "
            f"Source: {output.get('rate_source_label', 'n/a')}, freshness {output.get('freshness', 'n/a')}. "
            "What should I check before committing money?"
        )
        consultation = ConsultationRequest.objects.create(
            user=request.user,
            category=category,
            amount_display_mode=ConsultationRequest.AmountDisplayMode.RANGE,  # exact amount NOT shared by default
            amount_range_min=low,
            amount_range_max=high,
            user_question=question,
            topic=product_name[:180],
            risk_preference=ConsultationRequest.RiskPreference.NOT_SURE,
            status=ConsultationRequest.Status.SUBMITTED,
        )
        return Response({
            "consultation_request_id": consultation.id,
            "amount_display_mode": consultation.amount_display_mode,
            "note": "Created with an amount range. Exact amounts and private data are not shared unless you choose to.",
        }, status=status.HTTP_201_CREATED)
