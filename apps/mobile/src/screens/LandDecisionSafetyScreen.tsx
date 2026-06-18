import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import type { PesaRouteApiClient } from "../api/client";
import {
  EmptyState,
  ErrorState,
  GoalChip,
  LoadingState,
  PremiumCard,
  PrimaryButton,
  RiskBadge,
  SecondaryButton,
  TrustBadge,
  maliPrime,
  maliPrimeText
} from "../components/maliprime";
import type {
  AuthCredentials,
  LandComparisonResult,
  LandDueDiligenceItem,
  LandOpportunity,
  LandRiskScoreResult
} from "../types";

type LandView = "intro" | "list" | "create" | "detail" | "compare";

type Props = {
  apiClient: PesaRouteApiClient;
  auth: AuthCredentials | null;
  onRequestAuth: () => void;
};

const SELLER_TYPES = ["individual", "company", "agent", "chama", "family_member", "unknown"];
const TITLE_STATUSES = ["title_seen", "title_not_seen", "mother_title", "allotment_letter", "unknown"];
const INTENDED_USES = ["residential", "agricultural", "commercial", "speculation", "chama_project", "diaspora_investment"];
const SCENARIOS = ["conservative", "neutral", "optimistic"];
const REVIEW_TYPES = ["land_lawyer", "surveyor", "valuer", "diaspora_land_adviser", "chama_land_adviser"];

const DISCLAIMER =
  "PesaRoute does not verify land ownership, provide legal advice, or guarantee that a land deal is safe " +
  "or will appreciate. Always verify through official sources (Ardhisasa / Ministry of Lands) and qualified " +
  "professionals before sending money.";

function label(value: string): string {
  return value.replace(/_/g, " ");
}

export function LandDecisionSafetyScreen({ apiClient, auth, onRequestAuth }: Props) {
  const [view, setView] = useState<LandView>("intro");
  const [opportunities, setOpportunities] = useState<LandOpportunity[]>([]);
  const [selected, setSelected] = useState<LandOpportunity | null>(null);
  const [risk, setRisk] = useState<LandRiskScoreResult | null>(null);
  const [comparison, setComparison] = useState<LandComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Create form
  const [form, setForm] = useState({
    title: "",
    location_text: "",
    county: "",
    asking_price: "",
    deposit_requested: "",
    plot_size: "",
    seller_type: "unknown",
    title_status: "unknown",
    intended_use: "unknown"
  });

  // Compare form
  const [compareForm, setCompareForm] = useState({
    land_price: "1500000",
    holding_period_years: "5",
    appreciation_scenario: "neutral",
    transaction_cost_estimate: "",
    liquidity_need: ""
  });

  const setField = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const loadList = useCallback(async () => {
    if (!auth) return;
    setLoading(true);
    setError(null);
    try {
      setOpportunities(await apiClient.listLandOpportunities(auth));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your land checks.");
    } finally {
      setLoading(false);
    }
  }, [apiClient, auth]);

  useEffect(() => {
    if (view === "list") void loadList();
  }, [view, loadList]);

  async function openDetail(id: number) {
    if (!auth) return;
    setLoading(true);
    setError(null);
    setRisk(null);
    try {
      const opp = await apiClient.getLandOpportunity(id, auth);
      setSelected(opp);
      setView("detail");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open this land check.");
    } finally {
      setLoading(false);
    }
  }

  async function createOpportunity() {
    if (!auth) {
      onRequestAuth();
      return;
    }
    if (!form.title.trim() || !form.location_text.trim()) {
      setError("Add at least a title and a location.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const opp = await apiClient.createLandOpportunity(
        {
          title: form.title.trim(),
          location_text: form.location_text.trim(),
          county: form.county.trim() || undefined,
          asking_price: form.asking_price.trim() || undefined,
          deposit_requested: form.deposit_requested.trim() || undefined,
          plot_size: form.plot_size.trim() || undefined,
          seller_type: form.seller_type as never,
          title_status: form.title_status as never,
          intended_use: form.intended_use as never,
          decision_stage: "before_deposit"
        },
        auth
      );
      setSelected(opp);
      setView("detail");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save this land check.");
    } finally {
      setLoading(false);
    }
  }

  async function runRiskScore() {
    if (!auth || !selected) return;
    setLoading(true);
    try {
      const result = await apiClient.scoreLandRisk(selected.id, {}, auth);
      setRisk(result);
      setSelected((prev) => (prev ? { ...prev, risk_level: result.risk_level } : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not score risk.");
    } finally {
      setLoading(false);
    }
  }

  async function cycleItem(item: LandDueDiligenceItem) {
    if (!auth || !selected) return;
    const next =
      item.status === "not_started"
        ? "requested"
        : item.status === "requested"
          ? "verified_by_user"
          : item.status === "verified_by_user"
            ? "failed"
            : "not_started";
    try {
      await apiClient.updateLandChecklistItem(item.id, { status: next }, auth);
      setSelected((prev) =>
        prev
          ? {
              ...prev,
              due_diligence_items: (prev.due_diligence_items ?? []).map((i) =>
                i.id === item.id ? { ...i, status: next as never } : i
              )
            }
          : prev
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the item.");
    }
  }

  async function saveToJournal() {
    if (!auth || !selected) {
      onRequestAuth();
      return;
    }
    setNotice(null);
    try {
      await apiClient.saveLandToJournal(selected.id, "Saved my land decision reasoning.", auth);
      setNotice("Saved to your private journal.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save to journal.");
    }
  }

  async function requestReview(professionalType: string) {
    if (!auth || !selected) {
      onRequestAuth();
      return;
    }
    setNotice(null);
    try {
      await apiClient.requestLandReview(
        selected.id,
        { professional_type: professionalType, question: "Please review my land due diligence." },
        auth
      );
      setNotice(`Review requested (${label(professionalType)}). Documents stay private until you share them.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not request review.");
    }
  }

  async function runComparison() {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.compareLand({
        land_price: compareForm.land_price || "0",
        holding_period_years: Math.max(1, parseInt(compareForm.holding_period_years || "1", 10)),
        appreciation_scenario: compareForm.appreciation_scenario as never,
        transaction_cost_estimate: compareForm.transaction_cost_estimate || undefined,
        liquidity_need: compareForm.liquidity_need || undefined
      });
      setComparison(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not run the comparison.");
    } finally {
      setLoading(false);
    }
  }

  // --- Renders ---------------------------------------------------------------

  function renderIntro() {
    return (
      <View style={s.stack}>
        <Text style={maliPrimeText.eyebrow}>Land Decision Safety</Text>
        <Text style={maliPrimeText.title}>Before you pay a land deposit, check the route.</Text>
        <Text style={maliPrimeText.subtitle}>
          Serrari-style platforms compare market prices. PesaRoute helps you make a safe, documented, reviewed
          decision before you send money — with a due-diligence checklist, visible risk flags, and a handoff to a
          verified professional.
        </Text>
        <PremiumCard tone="warning">
          <Text style={s.body}>{DISCLAIMER}</Text>
        </PremiumCard>
        <PrimaryButton onPress={() => setView(auth ? "list" : "create")}>Start a land check</PrimaryButton>
        <SecondaryButton onPress={() => setView("compare")}>Compare land vs alternatives</SecondaryButton>
        {auth ? (
          <SecondaryButton onPress={() => setView("list")}>My land checks</SecondaryButton>
        ) : (
          <Text style={s.muted}>Sign in to save a land check, checklist, and request a professional review.</Text>
        )}
      </View>
    );
  }

  function renderList() {
    if (!auth) {
      return (
        <View style={s.stack}>
          <EmptyState title="Sign in required" body="Sign in from the Profile tab to save and track land checks." />
          <PrimaryButton onPress={onRequestAuth}>Sign in</PrimaryButton>
          <SecondaryButton onPress={() => setView("intro")}>Back</SecondaryButton>
        </View>
      );
    }
    return (
      <View style={s.stack}>
        <Text style={maliPrimeText.sectionTitle}>My land checks</Text>
        <PrimaryButton onPress={() => setView("create")}>New land opportunity</PrimaryButton>
        {loading ? <LoadingState /> : null}
        {!loading && opportunities.length === 0 ? (
          <EmptyState title="No land checks yet" body="Create one to start a due-diligence checklist." />
        ) : null}
        {opportunities.map((opp) => (
          <PremiumCard key={opp.id}>
            <Text style={maliPrimeText.sectionTitle}>{opp.title}</Text>
            <Text style={s.muted}>{opp.location_text}</Text>
            <View style={s.row}>
              <RiskBadge level={opp.risk_level} />
              <TrustBadge tone="muted">{label(opp.decision_stage)}</TrustBadge>
            </View>
            <SecondaryButton onPress={() => openDetail(opp.id)}>Open</SecondaryButton>
          </PremiumCard>
        ))}
        <SecondaryButton onPress={() => setView("intro")}>Back</SecondaryButton>
      </View>
    );
  }

  function selector(title: string, options: string[], value: string, onPick: (v: string) => void) {
    return (
      <View style={s.field}>
        <Text style={s.fieldLabel}>{title}</Text>
        <View style={s.chips}>
          {options.map((opt) => (
            <GoalChip key={opt} active={value === opt} label={label(opt)} onPress={() => onPick(opt)} />
          ))}
        </View>
      </View>
    );
  }

  function input(title: string, key: keyof typeof form, placeholder: string, numeric = false) {
    return (
      <View style={s.field}>
        <Text style={s.fieldLabel}>{title}</Text>
        <TextInput
          style={s.input}
          value={form[key]}
          onChangeText={(t) => setField(key, t)}
          placeholder={placeholder}
          placeholderTextColor={maliPrime.colors.textTertiary}
          keyboardType={numeric ? "numeric" : "default"}
        />
      </View>
    );
  }

  function renderCreate() {
    return (
      <View style={s.stack}>
        <Text style={maliPrimeText.sectionTitle}>New land opportunity</Text>
        <Text style={s.muted}>This is your private decision workspace. Nothing is shared unless you choose to.</Text>
        {input("Title", "title", "e.g. 2 acres in Kitengela")}
        {input("Location", "location_text", "Town, county")}
        {input("County", "county", "e.g. Kajiado")}
        {input("Asking price (KES)", "asking_price", "1500000", true)}
        {input("Deposit requested (KES)", "deposit_requested", "200000", true)}
        {input("Plot size", "plot_size", "e.g. 50x100")}
        {selector("Seller type", SELLER_TYPES, form.seller_type, (v) => setField("seller_type", v))}
        {selector("Title status", TITLE_STATUSES, form.title_status, (v) => setField("title_status", v))}
        {selector("Intended use", INTENDED_USES, form.intended_use, (v) => setField("intended_use", v))}
        <PrimaryButton disabled={loading} onPress={createOpportunity}>
          Save and build checklist
        </PrimaryButton>
        <SecondaryButton onPress={() => setView(auth ? "list" : "intro")}>Cancel</SecondaryButton>
      </View>
    );
  }

  function renderDetail() {
    if (!selected) return null;
    const items = selected.due_diligence_items ?? [];
    return (
      <View style={s.stack}>
        <Text style={maliPrimeText.sectionTitle}>{selected.title}</Text>
        <Text style={s.muted}>{selected.location_text}</Text>

        <PremiumCard tone={risk && (risk.risk_level === "high" || risk.risk_level === "very_high") ? "danger" : "alt"}>
          <Text style={maliPrimeText.sectionTitle}>Visible risk</Text>
          {risk ? (
            <>
              <View style={s.row}>
                <RiskBadge level={risk.risk_level} />
              </View>
              <Text style={s.body}>{risk.summary}</Text>
              {risk.risk_flags.map((f, idx) => (
                <View key={idx} style={s.flag}>
                  <Text style={s.flagTitle}>
                    {label(f.flag_type)} · {f.severity}
                  </Text>
                  <Text style={s.body}>{f.message}</Text>
                  {f.suggested_action ? <Text style={s.muted}>→ {f.suggested_action}</Text> : null}
                </View>
              ))}
              {risk.suggested_next_steps.length ? (
                <Text style={s.muted}>Next: {risk.suggested_next_steps[0]}</Text>
              ) : null}
            </>
          ) : (
            <Text style={s.muted}>Run the check to see visible risk based on your checklist.</Text>
          )}
          <PrimaryButton disabled={loading} onPress={runRiskScore}>
            {risk ? "Re-check risk" : "Check risk"}
          </PrimaryButton>
        </PremiumCard>

        <Text style={maliPrimeText.sectionTitle}>Due-diligence checklist</Text>
        {items.map((item) => (
          <PremiumCard key={item.id}>
            <Text style={s.body}>{item.title}</Text>
            <View style={s.row}>
              <TrustBadge
                tone={
                  item.status === "verified_by_user" || item.status === "reviewed_by_professional"
                    ? "emerald"
                    : item.status === "failed"
                      ? "danger"
                      : "muted"
                }
              >
                {label(item.status)}
              </TrustBadge>
              {item.importance === "critical" ? <TrustBadge tone="danger">critical</TrustBadge> : null}
            </View>
            {item.source_note ? <Text style={s.muted}>{item.source_note}</Text> : null}
            <SecondaryButton onPress={() => cycleItem(item)}>Update status</SecondaryButton>
          </PremiumCard>
        ))}

        <Text style={maliPrimeText.sectionTitle}>Actions</Text>
        {notice ? (
          <PremiumCard tone="success">
            <Text style={s.body}>{notice}</Text>
          </PremiumCard>
        ) : null}
        <SecondaryButton onPress={saveToJournal}>Save reasoning to journal</SecondaryButton>
        <Text style={s.fieldLabel}>Request a verified professional</Text>
        <View style={s.chips}>
          {REVIEW_TYPES.map((t) => (
            <GoalChip key={t} label={label(t)} onPress={() => requestReview(t)} />
          ))}
        </View>
        <Text style={s.muted}>
          Sharing is off by default: documents stay private and your exact amount is hidden. Access expires
          automatically.
        </Text>
        <SecondaryButton onPress={() => setView("list")}>Back to my checks</SecondaryButton>
      </View>
    );
  }

  function renderCompare() {
    return (
      <View style={s.stack}>
        <Text style={maliPrimeText.sectionTitle}>Land vs alternatives</Text>
        <Text style={s.muted}>Educational comparison only. Land appreciation is not guaranteed and land is illiquid.</Text>
        <View style={s.field}>
          <Text style={s.fieldLabel}>Land price (KES)</Text>
          <TextInput
            style={s.input}
            value={compareForm.land_price}
            onChangeText={(t) => setCompareForm((f) => ({ ...f, land_price: t }))}
            keyboardType="numeric"
            placeholderTextColor={maliPrime.colors.textTertiary}
          />
        </View>
        <View style={s.field}>
          <Text style={s.fieldLabel}>Holding period (years)</Text>
          <TextInput
            style={s.input}
            value={compareForm.holding_period_years}
            onChangeText={(t) => setCompareForm((f) => ({ ...f, holding_period_years: t }))}
            keyboardType="numeric"
            placeholderTextColor={maliPrime.colors.textTertiary}
          />
        </View>
        <View style={s.field}>
          <Text style={s.fieldLabel}>Appreciation scenario</Text>
          <View style={s.chips}>
            {SCENARIOS.map((sc) => (
              <GoalChip
                key={sc}
                active={compareForm.appreciation_scenario === sc}
                label={sc}
                onPress={() => setCompareForm((f) => ({ ...f, appreciation_scenario: sc }))}
              />
            ))}
          </View>
        </View>
        <PrimaryButton disabled={loading} onPress={runComparison}>
          Compare
        </PrimaryButton>

        {comparison ? (
          <>
            <PremiumCard tone="warning">
              <Text style={s.body}>{comparison.warning}</Text>
            </PremiumCard>
            <PremiumCard>
              <Text style={maliPrimeText.sectionTitle}>Land</Text>
              <Text style={s.body}>
                Estimated value: KES {String((comparison.land_scenario as Record<string, unknown>).estimated_value)}
              </Text>
              <Text style={s.muted}>{String((comparison.land_scenario as Record<string, unknown>).note)}</Text>
              <View style={s.row}>
                <TrustBadge tone="muted">liquidity: low</TrustBadge>
                <TrustBadge tone="danger">due diligence: high</TrustBadge>
              </View>
            </PremiumCard>
            {comparison.alternatives.map((alt, idx) => (
              <PremiumCard key={idx}>
                <Text style={maliPrimeText.sectionTitle}>{String(alt.label)}</Text>
                <Text style={s.body}>Estimated value: KES {String(alt.estimated_value)}</Text>
                <View style={s.row}>
                  <TrustBadge tone="muted">liquidity: {String(alt.liquidity)}</TrustBadge>
                  <TrustBadge tone="muted">risk: {String(alt.risk)}</TrustBadge>
                </View>
              </PremiumCard>
            ))}
            <Text style={s.muted}>{comparison.liquidity_comparison}</Text>
            <Text style={s.muted}>{comparison.disclaimer}</Text>
          </>
        ) : null}
        <SecondaryButton onPress={() => setView("intro")}>Back</SecondaryButton>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      {error ? <ErrorState message={error} /> : null}
      {view === "intro" && renderIntro()}
      {view === "list" && renderList()}
      {view === "create" && renderCreate()}
      {view === "detail" && renderDetail()}
      {view === "compare" && renderCompare()}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: maliPrime.spacing.lg, gap: maliPrime.spacing.lg, paddingBottom: 64 },
  stack: { gap: maliPrime.spacing.md },
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginVertical: 6 },
  chips: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  field: { gap: 6 },
  fieldLabel: { color: maliPrime.colors.textTertiary, fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  input: {
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.md,
    borderWidth: 1,
    color: maliPrime.colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15
  },
  body: { color: maliPrime.colors.textPrimary, fontSize: 14, lineHeight: 21 },
  muted: { color: maliPrime.colors.textSecondary, fontSize: 13, lineHeight: 19 },
  flag: { borderTopColor: maliPrime.colors.border, borderTopWidth: 1, paddingVertical: 8, gap: 2 },
  flagTitle: { color: maliPrime.colors.textPrimary, fontSize: 13, fontWeight: "700", textTransform: "capitalize" }
});
