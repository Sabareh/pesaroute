import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import type {
  ConsultationRequestApiRequest,
  ConsultationRequestApiResponse,
  DataGrantScope,
  PesaRouteApiClient,
  ProfessionalApiResponse
} from "../api/client";
import { ProfessionalCard, maliPrime, maliPrimeText } from "../components/maliprime";
import type { AuthCredentials } from "../types";

const durations = [7, 14, 30];

const categories: Array<{ label: string; value: ConsultationRequestApiRequest["category"] }> = [
  { label: "MMF", value: "mmf" },
  { label: "Treasury", value: "treasury" },
  { label: "SACCO", value: "sacco" },
  { label: "Chama", value: "chama" },
  { label: "Global", value: "global_investing" },
  { label: "Land literacy", value: "land_literacy" },
  { label: "Tax", value: "tax" },
  { label: "Diaspora", value: "diaspora" },
  { label: "First investment", value: "general_first_investment" }
];

const specialtyFilters = ["All", "Investment adviser", "Tax", "SACCO/chama", "Land lawyer", "Diaspora", "Global investing"];
const sampleProfessionals: ProfessionalApiResponse[] = [
  {
    id: 1,
    name: "Amina Wanjiku",
    display_name: "Amina Wanjiku",
    firm: "Pesa Advisory LLP",
    specialty: "Treasury bills/bonds",
    license_category: "Investment adviser",
    license_number: "Sample verified",
    verification_status: "verified",
    languages: ["en", "sw"],
    consultation_fee_range: "KES 1k-5k",
    diaspora_support: true,
    chama_support: true,
    bio: "Helps first-time investors compare regulated fixed-income routes.",
    disclosures: "Sample profile for MVP testing.",
    is_active: true
  }
];

type ViewMode = "browse" | "request" | "mine";

function parseAmountToken(token: string): number | null {
  const trimmed = token.trim().toLowerCase();
  const multiplier = trimmed.endsWith("k") ? 1000 : 1;
  const value = Number(trimmed.replace(/[^\d.]/g, ""));
  return Number.isFinite(value) && value > 0 ? value * multiplier : null;
}

function parseAmountRange(text: string): { min?: string; max?: string } {
  const parts = text.split(/\s*(?:-|to)\s*/i).map(parseAmountToken);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return { min: parts[0].toFixed(2), max: parts[1].toFixed(2) };
  }
  return {};
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-KE");
}

export function ProfessionalsScreen({
  apiClient,
  auth,
  onRequestAuth
}: {
  apiClient: PesaRouteApiClient;
  auth: AuthCredentials | null;
  onRequestAuth: () => void;
}) {
  const [mode, setMode] = useState<ViewMode>("browse");
  const [professionals, setProfessionals] = useState<ProfessionalApiResponse[]>(sampleProfessionals);
  const [requests, setRequests] = useState<ConsultationRequestApiResponse[]>([]);
  const [selectedProfessional, setSelectedProfessional] = useState<ProfessionalApiResponse | null>(sampleProfessionals[0]);
  const [specialtyFilter, setSpecialtyFilter] = useState("All");
  const [languageFilter, setLanguageFilter] = useState<"all" | "en" | "sw">("all");
  const [diasporaOnly, setDiasporaOnly] = useState(false);
  const [chamaOnly, setChamaOnly] = useState(false);
  const [category, setCategory] = useState<ConsultationRequestApiRequest["category"]>("general_first_investment");
  const [amountRange, setAmountRange] = useState("KES 5k-20k");
  const [timeline, setTimeline] = useState<ConsultationRequestApiRequest["timeline"]>("flexible");
  const [riskPreference, setRiskPreference] = useState<ConsultationRequestApiRequest["risk_preference"]>("not_sure");
  const [preferredLanguage, setPreferredLanguage] = useState<"en" | "sw">("en");
  const [question, setQuestion] = useState("");
  const [paymentPhone, setPaymentPhone] = useState("");
  const [shareContact, setShareContact] = useState(false);
  const [sharePortfolioSummary, setSharePortfolioSummary] = useState(true);
  const [shareExactValues, setShareExactValues] = useState(false);
  const [shareJournal, setShareJournal] = useState(false);
  const [durationDays, setDurationDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredProfessionals = useMemo(
    () =>
      professionals.filter((professional) => {
        const normalizedFilter = specialtyFilter.toLowerCase().replace("/chama", "").replace(" lawyer", "");
        const specialtyText = `${professional.specialty} ${professional.license_category}`.toLowerCase();
        const specialtyMatch = specialtyFilter === "All" || specialtyText.includes(normalizedFilter);
        const languageMatch = languageFilter === "all" || professional.languages.includes(languageFilter);
        const diasporaMatch = !diasporaOnly || professional.diaspora_support;
        const chamaMatch = !chamaOnly || professional.chama_support;
        return specialtyMatch && languageMatch && diasporaMatch && chamaMatch;
      }),
    [chamaOnly, diasporaOnly, languageFilter, professionals, specialtyFilter]
  );

  async function loadProfessionals() {
    try {
      const apiProfessionals = await apiClient.listProfessionals();
      if (apiProfessionals.length > 0) {
        setProfessionals(apiProfessionals);
        setSelectedProfessional((current) => current ?? apiProfessionals[0]);
      }
    } catch {
      setProfessionals(sampleProfessionals);
    }
  }

  async function loadMyRequests() {
    if (!auth) return;
    try {
      setRequests(await apiClient.myConsultationRequests(auth));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load requests.");
    }
  }

  useEffect(() => {
    void loadProfessionals();
  }, []);

  useEffect(() => {
    if (auth) void loadMyRequests();
  }, [auth?.token]);

  function startRequest(professional: ProfessionalApiResponse) {
    setSelectedProfessional(professional);
    setMode("request");
    setStatus(null);
    setError(null);
  }

  async function requestReview() {
    if (!auth) {
      onRequestAuth();
      return;
    }
    if (!selectedProfessional) {
      setError("Choose a verified professional first.");
      return;
    }
    if (question.trim().length < 5) {
      setError("Add a short question for the professional.");
      return;
    }
    const parsed = parseAmountRange(amountRange);
    if (!parsed.min || !parsed.max) {
      setError("Use a range like KES 5k-20k.");
      return;
    }
    const scopes: DataGrantScope[] = ["consultation_context"];
    if (shareContact) scopes.push("contact_info");
    if (sharePortfolioSummary) scopes.push("portfolio_summary");
    if (shareExactValues) scopes.push("portfolio_exact_values");
    if (shareJournal) scopes.push("journal_entries");

    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
      const grant = await apiClient.createDataGrant(
        {
          grantee_type: "professional",
          grantee_id: selectedProfessional.id,
          scopes,
          expires_at: expiresAt
        },
        auth
      );
      await apiClient.createConsultationRequest(
        {
          selected_professional: selectedProfessional.id,
          data_grant: grant.id,
          category,
          amount_display_mode: "range",
          amount_range_min: parsed.min,
          amount_range_max: parsed.max,
          user_question: question.trim(),
          timeline,
          risk_preference: riskPreference,
          preferred_language: preferredLanguage,
          topic: categories.find((item) => item.value === category)?.label,
          notes: question.trim()
        },
        auth
      );
      setStatus("Review request submitted. Private details remain hidden unless selected above.");
      setQuestion("");
      setMode("mine");
      await loadMyRequests();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not create review request.");
    } finally {
      setLoading(false);
    }
  }

  async function acceptOffer(offerId: number) {
    if (!auth) {
      onRequestAuth();
      return;
    }
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      await apiClient.acceptConsultationOffer(offerId, auth);
      setStatus("Offer accepted. Start payment only if the fee and professional are correct.");
      await loadMyRequests();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not accept offer.");
    } finally {
      setLoading(false);
    }
  }

  async function startConsultationPayment(requestId: number) {
    if (!auth) {
      onRequestAuth();
      return;
    }
    if (!paymentPhone.trim()) {
      setError("Enter the M-Pesa phone number for the review payment prompt.");
      return;
    }
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const intent = await apiClient.startConsultationPayment(
        requestId,
        { phone_number: paymentPhone.trim(), idempotency_key: `consultation-${requestId}` },
        auth
      );
      setStatus(`Consultation payment intent created: ${intent.status}. Approve only the phone prompt if the amount is correct.`);
      await loadMyRequests();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not start consultation payment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View>
      <Text style={maliPrimeText.title}>Professional Review</Text>
      <Text style={maliPrimeText.subtitle}>
        Request review without exposing private details by default. PesaRoute does not collect payment or promise advice.
      </Text>

      <View style={styles.modeRow}>
        {[
          { label: "Professionals", value: "browse" as const },
          { label: "Request", value: "request" as const },
          { label: "My Requests", value: "mine" as const }
        ].map((item) => (
          <Pressable
            accessibilityRole="button"
            key={item.value}
            onPress={() => setMode(item.value)}
            style={[styles.modeButton, mode === item.value && styles.modeButtonActive]}
          >
            <Text style={[styles.modeText, mode === item.value && styles.modeTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      {mode === "browse" ? (
        <View>
          <Text style={styles.groupTitle}>Filter</Text>
          <View style={styles.pillRow}>
            {specialtyFilters.map((filter) => (
              <Pressable
                accessibilityRole="button"
                key={filter}
                onPress={() => setSpecialtyFilter(filter)}
                style={[styles.pill, specialtyFilter === filter && styles.pillActive]}
              >
                <Text style={[styles.pillText, specialtyFilter === filter && styles.pillTextActive]}>{filter}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.pillRow}>
            {[
              { label: "Any language", value: "all" as const },
              { label: "English", value: "en" as const },
              { label: "Swahili", value: "sw" as const }
            ].map((item) => (
              <Pressable
                accessibilityRole="button"
                key={item.value}
                onPress={() => setLanguageFilter(item.value)}
                style={[styles.pill, languageFilter === item.value && styles.pillActive]}
              >
                <Text style={[styles.pillText, languageFilter === item.value && styles.pillTextActive]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.filterRow}>
            <ConsentSwitch label="Diaspora support" value={diasporaOnly} onValueChange={setDiasporaOnly} />
            <ConsentSwitch label="Chama support" value={chamaOnly} onValueChange={setChamaOnly} />
          </View>
          <View style={styles.list}>
            {filteredProfessionals.map((professional) => (
              <ProfessionalCard
                body={`${professional.bio || "Learn first. Compare clearly. Get guidance when needed."} Languages: ${
                  professional.languages.join(", ") || "en"
                }. Fee: ${professional.consultation_fee_range || "Not set"}.`}
                firm={professional.firm || "Independent"}
                key={professional.id}
                name={professional.name || professional.display_name}
                onPress={() => startRequest(professional)}
                specialty={professional.specialty || "General first investment"}
              />
            ))}
          </View>
        </View>
      ) : null}

      {mode === "request" ? (
        !auth ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Login required for review requests</Text>
            <Text style={styles.cardCopy}>Anonymous mode can still learn and simulate, but sharing needs an account.</Text>
            <Pressable accessibilityRole="button" onPress={onRequestAuth} style={styles.primaryButton}>
              <Text style={styles.primaryText}>Log in or create account</Text>
            </Pressable>
          </View>
        ) : (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                Professional: {selectedProfessional?.name || selectedProfessional?.display_name || "Choose from list"}
              </Text>
              <Text style={styles.cardCopy}>Exact values are not shared by default. Use ranges unless you choose otherwise.</Text>
            </View>

            <Text style={styles.groupTitle}>Category</Text>
            <View style={styles.pillRow}>
              {categories.map((item) => (
                <Pressable
                  accessibilityRole="button"
                  key={item.value}
                  onPress={() => setCategory(item.value)}
                  style={[styles.pill, category === item.value && styles.pillActive]}
                >
                  <Text style={[styles.pillText, category === item.value && styles.pillTextActive]}>{item.label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.form}>
              <TextInput
                onChangeText={setAmountRange}
                placeholder="Amount range e.g. KES 5k-20k"
                placeholderTextColor="#7D8794"
                style={styles.input}
                value={amountRange}
              />
              <TextInput
                multiline
                onChangeText={setQuestion}
                placeholder="Question for review"
                placeholderTextColor="#7D8794"
                style={[styles.input, styles.multi]}
                textAlignVertical="top"
                value={question}
              />
            </View>

            <Text style={styles.groupTitle}>Timeline</Text>
            <View style={styles.pillRow}>
              {[
                { label: "This week", value: "this_week" as const },
                { label: "This month", value: "this_month" as const },
                { label: "Flexible", value: "flexible" as const }
              ].map((item) => (
                <Pressable
                  accessibilityRole="button"
                  key={item.value}
                  onPress={() => setTimeline(item.value)}
                  style={[styles.pill, timeline === item.value && styles.pillActive]}
                >
                  <Text style={[styles.pillText, timeline === item.value && styles.pillTextActive]}>{item.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.groupTitle}>Risk preference</Text>
            <View style={styles.pillRow}>
              {["low", "moderate", "high", "not_sure"].map((item) => (
                <Pressable
                  accessibilityRole="button"
                  key={item}
                  onPress={() => setRiskPreference(item as ConsultationRequestApiRequest["risk_preference"])}
                  style={[styles.pill, riskPreference === item && styles.pillActive]}
                >
                  <Text style={[styles.pillText, riskPreference === item && styles.pillTextActive]}>{item.replace("_", " ")}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.groupTitle}>Preferred language</Text>
            <View style={styles.pillRow}>
              {[
                { label: "English", value: "en" as const },
                { label: "Swahili", value: "sw" as const }
              ].map((item) => (
                <Pressable
                  accessibilityRole="button"
                  key={item.value}
                  onPress={() => setPreferredLanguage(item.value)}
                  style={[styles.pill, preferredLanguage === item.value && styles.pillActive]}
                >
                  <Text style={[styles.pillText, preferredLanguage === item.value && styles.pillTextActive]}>{item.label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>You choose what this professional can see.</Text>
              <Text style={styles.cardCopy}>
                Access expires automatically. You can revoke access anytime. Exact amounts are optional.
              </Text>
              <ConsentSwitch label="Share name/contact" value={shareContact} onValueChange={setShareContact} />
              <ConsentSwitch label="Share portfolio summary" value={sharePortfolioSummary} onValueChange={setSharePortfolioSummary} />
              <ConsentSwitch label="Share exact values" value={shareExactValues} onValueChange={setShareExactValues} />
              <ConsentSwitch label="Share selected journal notes" value={shareJournal} onValueChange={setShareJournal} />
            </View>

            <Text style={styles.groupTitle}>Access duration</Text>
            <View style={styles.pillRow}>
              {durations.map((days) => (
                <Pressable
                  accessibilityRole="button"
                  key={days}
                  onPress={() => setDurationDays(days)}
                  style={[styles.pill, durationDays === days && styles.pillActive]}
                >
                  <Text style={[styles.pillText, durationDays === days && styles.pillTextActive]}>{days} days</Text>
                </Pressable>
              ))}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {status ? <Text style={styles.status}>{status}</Text> : null}
            <Pressable accessibilityRole="button" disabled={loading} onPress={requestReview} style={[styles.primaryButton, loading && styles.disabled]}>
              <Text style={styles.primaryText}>{loading ? "Submitting..." : "Submit review request"}</Text>
            </Pressable>
          </View>
        )
      ) : null}

      {mode === "mine" ? (
        <View>
          {!auth ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Login required</Text>
              <Text style={styles.cardCopy}>Create an account to submit and track review requests.</Text>
              <Pressable accessibilityRole="button" onPress={onRequestAuth} style={styles.primaryButton}>
                <Text style={styles.primaryText}>Log in or create account</Text>
              </Pressable>
            </View>
          ) : (
            <View>
              <Pressable accessibilityRole="button" onPress={loadMyRequests} style={styles.secondaryButton}>
                <Text style={styles.secondaryText}>Refresh requests</Text>
              </Pressable>
              {requests.length === 0 ? <Text style={styles.empty}>No review requests yet.</Text> : null}
              <View style={styles.list}>
                {requests.map((request) => (
                  <View key={request.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle}>{categories.find((item) => item.value === request.category)?.label ?? request.category}</Text>
                      <Text style={styles.badge}>{request.status}</Text>
                    </View>
                    <Text style={styles.meta}>{request.amount_display_mode}: {request.amount_range_min && request.amount_range_max ? `KES ${request.amount_range_min}-${request.amount_range_max}` : "Hidden"}</Text>
                    <Text style={styles.cardCopy}>{request.user_question}</Text>
                    <Text style={styles.meta}>Submitted {formatDate(request.created_at)}</Text>
                    {request.paid_at ? <Text style={styles.status}>Paid {formatDate(request.paid_at)}</Text> : null}
                    {request.responses?.length ? (
                      <View style={styles.responseBox}>
                        <Text style={styles.responseTitle}>Professional response</Text>
                        <Text style={styles.cardCopy}>{request.responses[0].response_text}</Text>
                        {request.responses[0].next_steps ? <Text style={styles.meta}>{request.responses[0].next_steps}</Text> : null}
                      </View>
                    ) : (
                      <Text style={styles.meta}>Response placeholder: awaiting professional reply.</Text>
                    )}
                    {request.offers?.length ? (
                      <View style={styles.responseBox}>
                        <Text style={styles.responseTitle}>Professional offers</Text>
                        {request.offers.map((offer) => (
                          <View key={offer.id} style={styles.offerBox}>
                            <Text style={styles.cardCopy}>{offer.professional_name}: KES {offer.proposed_fee}</Text>
                            <Text style={styles.meta}>
                              {offer.estimated_duration}. Status: {offer.status}. {offer.available_slots_text}
                            </Text>
                            <Text style={styles.meta}>Educational/professional review only. No guaranteed returns.</Text>
                            {offer.status === "pending" ? (
                              <Pressable
                                accessibilityRole="button"
                                disabled={loading}
                                onPress={() => acceptOffer(offer.id)}
                                style={styles.secondaryButton}
                              >
                                <Text style={styles.secondaryText}>Accept offer</Text>
                              </Pressable>
                            ) : null}
                          </View>
                        ))}
                      </View>
                    ) : null}
                    {request.status === "user_selected_professional" || request.status === "awaiting_payment" ? (
                      <View style={styles.responseBox}>
                        <Text style={styles.responseTitle}>Review payment</Text>
                        <Text style={styles.cardCopy}>We never ask for your M-Pesa PIN inside PesaRoute.</Text>
                        <TextInput
                          keyboardType="phone-pad"
                          onChangeText={setPaymentPhone}
                          placeholder="M-Pesa phone e.g. 0712 345 678"
                          placeholderTextColor="#7D8794"
                          style={styles.input}
                          value={paymentPhone}
                        />
                        <Pressable
                          accessibilityRole="button"
                          disabled={loading}
                          onPress={() => startConsultationPayment(request.id)}
                          style={styles.primaryButton}
                        >
                          <Text style={styles.primaryText}>Start consultation payment</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

function ConsentSwitch({
  label,
  onValueChange,
  value
}: {
  label: string;
  onValueChange: (value: boolean) => void;
  value: boolean;
}) {
  return (
    <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>{label}</Text>
      <Switch
        onValueChange={onValueChange}
        thumbColor={value ? maliPrime.colors.surface : maliPrime.colors.surfaceAlt}
        trackColor={{ false: maliPrime.colors.surfaceSubtle, true: maliPrime.colors.emerald }}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  modeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 18 },
  modeButton: {
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  modeButtonActive: { backgroundColor: maliPrime.colors.primary, borderColor: maliPrime.colors.primary },
  modeText: { color: maliPrime.colors.textSecondary, fontSize: 13, fontWeight: "900" },
  modeTextActive: { color: maliPrime.colors.surface },
  groupTitle: { color: maliPrime.colors.textPrimary, fontSize: 14, fontWeight: "900", marginTop: 16 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  pill: {
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  pillActive: { backgroundColor: maliPrime.colors.primary, borderColor: maliPrime.colors.primary },
  pillText: { color: maliPrime.colors.textSecondary, fontSize: 13, fontWeight: "700", textTransform: "capitalize" },
  pillTextActive: { color: maliPrime.colors.surface },
  filterRow: { gap: 0, marginTop: 8 },
  list: { gap: 12, marginTop: 14 },
  card: {
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.lg,
    borderWidth: 1,
    marginTop: 14,
    padding: 16,
    ...maliPrime.shadow
  },
  cardHeader: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  cardTitle: { color: maliPrime.colors.textPrimary, flex: 1, fontSize: 16, fontWeight: "900" },
  badge: {
    backgroundColor: "#E9F8F1",
    borderRadius: maliPrime.radius.pill,
    color: maliPrime.colors.emerald,
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
    textTransform: "uppercase"
  },
  meta: { color: maliPrime.colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 5 },
  cardCopy: { color: maliPrime.colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 8 },
  form: { gap: 10, marginTop: 16 },
  input: {
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.md,
    borderWidth: 1,
    color: maliPrime.colors.textPrimary,
    fontSize: 15,
    minHeight: 50,
    paddingHorizontal: 14
  },
  multi: { minHeight: 104, paddingTop: 14 },
  switchRow: {
    alignItems: "center",
    borderTopColor: maliPrime.colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12
  },
  switchLabel: { color: maliPrime.colors.textPrimary, flex: 1, fontSize: 14, fontWeight: "800", paddingRight: 12 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: maliPrime.colors.primary,
    borderRadius: maliPrime.radius.md,
    justifyContent: "center",
    marginTop: 16,
    minHeight: 50,
    paddingHorizontal: 14
  },
  primaryText: { color: maliPrime.colors.surface, fontSize: 14, fontWeight: "700", textAlign: "center" },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: maliPrime.colors.surfaceAlt,
    borderRadius: maliPrime.radius.md,
    justifyContent: "center",
    marginTop: 14,
    minHeight: 46
  },
  secondaryText: { color: maliPrime.colors.textPrimary, fontSize: 13, fontWeight: "700" },
  error: { color: maliPrime.colors.danger, fontSize: 13, lineHeight: 19, marginTop: 10 },
  status: { color: maliPrime.colors.emerald, fontSize: 13, fontWeight: "900", lineHeight: 19, marginTop: 10 },
  empty: { color: maliPrime.colors.textSecondary, fontSize: 14, marginTop: 12 },
  responseBox: { backgroundColor: maliPrime.colors.surfaceAlt, borderRadius: maliPrime.radius.md, marginTop: 12, padding: 12 },
  offerBox: {
    borderTopColor: maliPrime.colors.border,
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 10
  },
  responseTitle: { color: maliPrime.colors.textPrimary, fontSize: 13, fontWeight: "700" },
  disabled: { backgroundColor: maliPrime.colors.textTertiary }
});
