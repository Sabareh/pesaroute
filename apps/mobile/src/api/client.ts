import { getApiBaseUrl } from "./config";
import type {
  AmountDisplayMode,
  AuthCredentials,
  CategoryCompareRequest,
  CategoryCompareResponse,
  CompareProductsRequest,
  InvestmentProduct,
  LandComparisonInput,
  LandComparisonResult,
  LandDueDiligenceItem,
  LandOpportunity,
  LandOpportunityInput,
  LandRiskScoreResult,
  MarketplaceProduct,
  ProductSpecificRequest,
  ProductCategory,
  ProductCompareResponse,
  ProductPassport,
  ProductQuery,
  ProductSimulationRequest,
  ProductSimulationResult
} from "../types";

export type ApiStatus = {
  status: string;
  service: string;
};

export type UserRole = "consumer" | "professional" | "provider" | "admin";

export type UserProfileApiResponse = {
  role: UserRole;
  preferred_language: "en" | "sw";
  user_type:
    | "student"
    | "first_jobber"
    | "professional"
    | "diaspora"
    | "chama_member"
    | "farmer"
    | "jua_kali"
    | "other";
  approximate_investment_range: string;
  privacy_mode_enabled: boolean;
};

export type UserApiResponse = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  profile: UserProfileApiResponse;
};

export type AuthApiResponse = {
  token: string;
  user: UserApiResponse;
};

export type LoginApiRequest = {
  username: string;
  password: string;
};

export type RegisterApiRequest = LoginApiRequest & {
  email?: string;
  role?: Exclude<UserRole, "admin">;
  preferred_language?: "en" | "sw";
  user_type?: UserProfileApiResponse["user_type"];
  approximate_investment_range?: string;
  privacy_mode_enabled?: boolean;
  invite_code?: string;
};

export type DataGrantScope =
  | "contact_info"
  | "portfolio_summary"
  | "portfolio_exact_values"
  | "journal_entries"
  | "selected_documents"
  | "consultation_context";

export type DataGrantApiResponse = {
  id: number;
  grantee_type: "professional" | "provider" | "admin";
  grantee_id: number;
  professional: number | null;
  scopes: DataGrantScope[];
  status: "active" | "revoked" | "expired";
  starts_at: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
};

export type DataGrantApiRequest = {
  grantee_type: "professional" | "provider" | "admin";
  grantee_id: number;
  scopes: DataGrantScope[];
  expires_at: string;
};

export type ConsultationRequestApiRequest = {
  learning_track?: number;
  journal_entry?: number;
  selected_professional?: number;
  professional?: number;
  data_grant?: number;
  category:
    | "mmf"
    | "treasury"
    | "sacco"
    | "chama"
    | "global_investing"
    | "land_literacy"
    | "tax"
    | "diaspora"
    | "general_first_investment";
  amount_display_mode: AmountDisplayMode;
  amount_range_min?: string;
  amount_range_max?: string;
  user_question: string;
  timeline: "this_week" | "this_month" | "flexible";
  risk_preference: "low" | "moderate" | "high" | "not_sure";
  preferred_language: "en" | "sw";
  topic?: string;
  notes?: string;
};

export type ProfessionalApiResponse = {
  id: number;
  name: string;
  display_name: string;
  firm: string;
  specialty: string;
  license_category: string;
  license_number: string;
  verification_status: "pending" | "verified" | "rejected";
  languages: string[];
  consultation_fee_range: string;
  diaspora_support: boolean;
  chama_support: boolean;
  bio: string;
  disclosures: string;
  is_active: boolean;
};

export type ConsultationResponseApiResponse = {
  id: number;
  professional: number;
  professional_name: string;
  response_text: string;
  next_steps: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type ConsultationOfferApiResponse = {
  id: number;
  consultation_request: number;
  professional: number;
  professional_name: string;
  proposed_fee: string;
  platform_fee_amount: string;
  message: string;
  estimated_duration: string;
  available_slots_text: string;
  status: "pending" | "accepted" | "rejected" | "expired";
  created_at: string;
  updated_at: string;
};

export type ConsultationRequestApiResponse = {
  id: number;
  selected_professional: number | null;
  selected_professional_detail?: ProfessionalApiResponse | null;
  data_grant: number | null;
  category: ConsultationRequestApiRequest["category"];
  amount_display_mode: AmountDisplayMode;
  amount_range_min: string | null;
  amount_range_max: string | null;
  user_question: string;
  timeline: ConsultationRequestApiRequest["timeline"];
  risk_preference: ConsultationRequestApiRequest["risk_preference"];
  preferred_language: "en" | "sw";
  topic?: string;
  notes?: string;
  status: string;
  platform_fee_amount?: string;
  paid_at?: string | null;
  scheduled_at?: string | null;
  created_at: string;
  updated_at?: string;
  responses?: ConsultationResponseApiResponse[];
  offers?: ConsultationOfferApiResponse[];
};

export type ProductPassportQuery = {
  category?: string;
  risk_level?: string;
  liquidity_level?: string;
  regulator_category?: string;
  minimum_amount_lte?: string;
  is_sponsored?: boolean;
  status?: string;
  search?: string;
  ordering?: "updated_at" | "-updated_at" | "category" | "-category" | "risk_level" | "-risk_level";
};

export type BillingPlanApiResponse = {
  id: number;
  code: "free" | "premium_monthly" | "premium_yearly" | "professional_basic" | "professional_pro";
  name: string;
  audience: "consumer" | "professional";
  price_kes: number;
  billing_period: "none" | "monthly" | "yearly";
  included_entitlements: string[];
  is_active: boolean;
};

export type OneOffPackApiResponse = {
  code:
    | "global_investing_pack"
    | "treasury_bills_pack"
    | "sacco_chama_pack"
    | "land_due_diligence_literacy_pack"
    | "diaspora_pack";
  name: string;
  entitlement_key:
    | "global_investing_pack_access"
    | "treasury_bills_pack_access"
    | "sacco_chama_pack_access"
    | "land_pack_access"
    | "diaspora_pack_access";
  price_kes: number;
  payment_provider: "manual_placeholder";
};

export type BillingEntitlementSnapshot = {
  is_authenticated: boolean;
  entitlements: string[];
  features: {
    unlimited_simulations: boolean;
    unlimited_scam_checks: boolean;
    portfolio_mirror: boolean;
    advanced_route_engine: boolean;
    premium_learning: boolean;
    private_journal_unlimited: boolean;
    professional_review_priority: boolean;
    professional_lead_inbox: boolean;
    professional_profile_public: boolean;
    professional_client_notes: boolean;
  };
  packs: Record<string, boolean>;
  dev_mode: boolean;
  payment_provider: "manual_placeholder";
};

export type PaymentPurpose = "subscription" | "one_off_pack" | "professional_consultation";

export type PaymentIntentStatus = "pending" | "initiated" | "successful" | "failed" | "cancelled" | "expired";

export type PaymentIntentApiRequest = {
  purpose: PaymentPurpose;
  plan_code?: BillingPlanApiResponse["code"];
  pack_code?: OneOffPackApiResponse["code"];
  consultation_request?: number;
  phone_number?: string;
  idempotency_key?: string;
};

export type PaymentIntentApiResponse = {
  id: number;
  purpose: PaymentPurpose;
  plan_code: string;
  pack_code: string;
  consultation_request: number | null;
  amount: string;
  currency: "KES";
  phone_number_masked: string;
  provider: "mpesa";
  status: PaymentIntentStatus;
  provider_checkout_request_id: string;
  provider_merchant_request_id: string;
  provider_receipt: string;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
};

export type NotificationApiResponse = {
  id: number;
  channel: "in_app" | "email" | "push" | "sms_placeholder";
  type: string;
  title: string;
  body: string;
  status: "unread" | "read" | "archived";
  created_at: string;
  read_at: string | null;
};

export type BetaFeatureFlagsApiResponse = {
  payments_enabled: boolean;
  professional_marketplace_enabled: boolean;
  packs_enabled: boolean;
  subscriptions_enabled: boolean;
  beta_only_mode: boolean;
};

export type BetaFeedbackApiRequest = {
  category: "payment_issue" | "privacy_question" | "professional_review_issue" | "bug_report" | "general";
  message: string;
  screenshot_placeholder?: string;
};

export type LearningLevel = "beginner" | "intermediate" | "advanced";

export type LearningLessonType =
  | "article"
  | "quiz"
  | "flashcard"
  | "simulation"
  | "journal_prompt"
  | "checklist"
  | "professional_review_prompt";

export type LearningContentSourceApiResponse = {
  id: number;
  title: string;
  organization: string;
  source_type: "regulator" | "exchange" | "government" | "provider" | "editorial" | "professional_reviewed";
  url: string;
  retrieved_at: string | null;
  reliability_level: "official" | "provider" | "editorial" | "unknown";
};

export type LearningStructuredContentBlock = {
  type:
    | "heading"
    | "paragraph"
    | "example"
    | "scenario"
    | "key_takeaway"
    | "caution"
    | "checklist"
    | "definition"
    | "comparison_table"
    | "quiz_prompt"
    | "simulator_cta"
    | "journal_prompt"
    | "professional_review_cta"
    | "source_note"
    | "disclaimer";
  title?: string;
  text?: string;
  term?: string;
  items?: string[];
  columns?: string[];
  rows?: string[][];
};

export type LearningLessonApiResponse = {
  id: number;
  title: string;
  slug: string;
  lesson_type: LearningLessonType;
  body: string;
  summary: string;
  structured_content: LearningStructuredContentBlock[];
  estimated_minutes: number;
  difficulty: LearningLevel;
  order: number;
  xp_reward: number;
  is_premium: boolean;
  status: string;
  editorial_status: "draft" | "reviewed" | "published" | "archived";
  last_reviewed_at: string | null;
  next_review_due_at: string | null;
  review_frequency_days: number;
  source_confidence: "official" | "provider" | "editorial" | "mixed" | "unknown";
  content_quality_score: number;
  content_warning_flags: string[];
  needs_review_fallback: boolean;
  content_sources: LearningContentSourceApiResponse[];
  source_label: string;
  disclaimer: string;
  locked: boolean;
};

export type LearningCourseApiResponse = {
  id: number;
  track:
    | number
    | {
        id: number;
        title: string;
        slug: string;
        description: string;
        level: LearningLevel;
        target_user_type: string;
        estimated_minutes: number;
        is_premium: boolean;
        status: string;
        order: number;
        course_count?: number;
        lesson_count?: number;
      };
  title: string;
  slug: string;
  description: string;
  order: number;
  estimated_minutes: number;
  is_premium: boolean;
  status: string;
  lessons: LearningLessonApiResponse[];
};

export type LearningTrackApiResponse = {
  id: number;
  title: string;
  slug: string;
  description: string;
  level: LearningLevel;
  target_user_type: string;
  estimated_minutes: number;
  is_premium: boolean;
  status: string;
  order: number;
  course_count?: number;
  lesson_count?: number;
  courses?: LearningCourseApiResponse[];
};

export type LearningResourceApiResponse = {
  id: number;
  title: string;
  resource_type: "guide" | "cheat_sheet" | "tutorial" | "glossary" | "market_brief" | "checklist";
  body: string;
  structured_content: LearningStructuredContentBlock[];
  related_track: number | null;
  related_track_slug: string;
  related_product_category: number | null;
  related_product_category_slug: string;
  is_premium: boolean;
  status: string;
  editorial_status: "draft" | "reviewed" | "published" | "archived";
  last_reviewed_at: string | null;
  next_review_due_at: string | null;
  source_confidence: "official" | "provider" | "editorial" | "mixed" | "unknown";
  content_quality_score: number;
  needs_review_fallback: boolean;
  content_sources: LearningContentSourceApiResponse[];
  source_label: string;
  disclaimer: string;
  locked?: boolean;
  created_at: string;
  updated_at: string;
};

export type UserLessonProgressApiResponse = {
  id: number;
  lesson: number;
  lesson_title: string;
  lesson_type: LearningLessonType;
  course_slug: string;
  track_slug: string;
  status: "not_started" | "in_progress" | "completed";
  score: string | null;
  attempts: number;
  completed_at: string | null;
  updated_at: string;
};

export type UserCourseProgressApiResponse = {
  id: number;
  course: number;
  course_title: string;
  course_slug: string;
  track_slug: string;
  percent_complete: string;
  last_lesson: number | null;
  last_lesson_title: string;
  completed_at: string | null;
  updated_at: string;
};

export type UserBadgeApiResponse = {
  id: number;
  badge: {
    id: number;
    name: string;
    slug: string;
    description: string;
    icon_key: string;
    criteria_key: string;
  };
  awarded_at: string;
};

export type UserStreakApiResponse = {
  current_streak_days: number;
  longest_streak_days: number;
  last_activity_date: string | null;
  streak_freezes_available: number;
  updated_at: string;
};

export type LearningProgressApiResponse = {
  total_xp: number;
  lessons: UserLessonProgressApiResponse[];
  courses: UserCourseProgressApiResponse[];
  badges: UserBadgeApiResponse[];
  streak: UserStreakApiResponse;
};

export type LearningHomeApiResponse = {
  streak: UserStreakApiResponse | null;
  total_xp: number;
  continue_learning: {
    track: LearningTrackApiResponse;
    course: Pick<LearningCourseApiResponse, "id" | "title" | "slug" | "estimated_minutes">;
    lesson: LearningLessonApiResponse;
  } | null;
  recommended_track: LearningTrackApiResponse | null;
  recent_badges: UserBadgeApiResponse[];
  daily_challenge: {
    title: string;
    body: string;
    action: "journal_reflection";
    xp_reward: number;
  };
  quick_actions: Array<{ key: string; label: string }>;
};

export type LearningLibraryApiResponse = {
  saved_tracks: LearningTrackApiResponse[];
  in_progress_courses: UserCourseProgressApiResponse[];
  completed_courses: UserCourseProgressApiResponse[];
  practice_suggestions: LearningTrackApiResponse[];
};

export type LearningProgressSummaryApiResponse = {
  total_xp: number;
  streak: UserStreakApiResponse;
  badges: UserBadgeApiResponse[];
  completed_lessons: UserLessonProgressApiResponse[];
  simulations_completed: number;
  journal_reflections_completed: number;
};

export type LearningCompleteWithActionApiRequest = {
  score?: number;
  simulation_run_id?: number;
  journal_entry_id?: number;
  consultation_request_id?: number;
};

export type LearningCompleteWithActionApiResponse = {
  progress: UserLessonProgressApiResponse;
  action_xp_awarded: number;
  linked_actions: string[];
  total_xp: number;
};

export type PracticeKind =
  | "review_recent"
  | "weak_area"
  | "scenario_practice"
  | "flashcards"
  | "simulator_practice"
  | "scam_red_flag_practice";

export type PracticeSetApiResponse = {
  id: number;
  title: string;
  slug: string;
  description: string;
  kind: PracticeKind;
  track: number | null;
  track_slug: string | null;
  is_premium: boolean;
  order: number;
  xp_reward: number;
  question_count: number;
  locked: boolean;
};

export type PracticeQuestionApiResponse = {
  id: number;
  prompt: string;
  options: string[];
  explanation: string;
  difficulty: string;
  order: number;
};

export type PracticeSetDetailApiResponse = PracticeSetApiResponse & {
  questions: PracticeQuestionApiResponse[];
};

export type PracticeSubmitApiResponse = {
  practice_set_id: number;
  total_questions: number;
  correct_count: number;
  score: number;
  results: Array<{ question_id: number; correct: boolean; correct_answer: string; explanation: string }>;
  xp_awarded: number;
  total_xp: number;
};

export type AssessmentApiResponse = {
  id: number;
  title: string;
  slug: string;
  description: string;
  kind: "money_profile" | "risk_comfort" | "scam_awareness" | "liquidity_needs";
  scoring: "knowledge" | "profile";
  is_premium: boolean;
  order: number;
  xp_reward: number;
  question_count: number;
  locked: boolean;
};

export type AssessmentQuestionApiResponse = {
  id: number;
  prompt: string;
  options: Array<{ label: string; value: string }>;
  order: number;
};

export type AssessmentDetailApiResponse = AssessmentApiResponse & {
  questions: AssessmentQuestionApiResponse[];
};

export type AssessmentSubmitApiResponse = {
  assessment_id: number;
  score: number;
  result_label: string;
  passed: boolean;
  xp_awarded: number;
  total_xp: number;
};

export type LearningDashboardApiResponse = {
  greeting: string;
  premium_status: "premium" | "free";
  total_xp: number;
  daily_streak: UserStreakApiResponse | null;
  review_count: number;
  current_track: LearningTrackApiResponse | null;
  continue_learning: LearningHomeApiResponse["continue_learning"];
  suggested_practice: PracticeSetApiResponse | null;
  suggested_simulator: { key: string; label: string; route: string };
  recent_activity: Array<{ source_type: string; source_id: string; xp_amount: number; created_at: string }>;
  assessments: AssessmentApiResponse[];
  quick_actions: Array<{ key: string; label: string }>;
};

export type LearningActivityApiResponse = {
  total_xp: number;
  xp_events: Array<{ id: number; source_type: string; source_id: string; xp_amount: number; created_at: string }>;
  recent_completions: UserLessonProgressApiResponse[];
  assessment_results: Array<{
    id: number;
    assessment_slug: string;
    assessment_kind: string;
    score: string;
    result_label: string;
    passed: boolean;
  }>;
};

type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type ScamCheckApiResponse = {
  id: number;
  prompt_text?: string;
  risk_score: number;
  risk_level: "low" | "medium" | "high" | "severe";
  flags: Array<{ phrase: string; reason: string; weight: number }>;
  questions_to_ask: string[];
  disclaimer: string;
  created_at: string;
};

export type MMFApiRequest = {
  principal: string;
  annual_rate_percent: string;
  months: number;
  learning_lesson_id?: number;
};

export type TBillApiRequest = {
  face_value: string;
  discount_rate_percent: string;
  days: number;
  learning_lesson_id?: number;
};

export type SaccoApiRequest = {
  monthly_deposit: string;
  months: number;
  annual_dividend_percent: string;
  learning_lesson_id?: number;
};

export type GlobalRouteApiRequest = {
  amount_kes: string;
  fx_rate: string;
  transfer_fee_percent: string;
  learning_lesson_id?: number;
};

export type JournalApiRequest = {
  learning_lesson?: number;
  learning_course?: number;
  learning_track?: number;
  goal: string;
  decision: string;
  amount_display_mode: AmountDisplayMode;
  amount_exact?: string;
  amount_range_min?: string;
  amount_range_max?: string;
  reason?: string;
  visibility: "private";
};

export type JournalApiResponse = JournalApiRequest & {
  id: number;
  alternatives_considered: string;
  risks_considered: string;
  review_date: string | null;
  created_at: string;
  updated_at: string;
  version: number;
};

export type PortfolioApiRequest = {
  asset_type: string;
  provider_name?: string;
  amount_display_mode: AmountDisplayMode;
  amount_exact?: string;
  amount_range_min?: string;
  amount_range_max?: string;
  liquidity_level: "high" | "medium" | "low" | "locked";
  risk_level: "low" | "moderate" | "high" | "very_high";
  maturity_date?: string;
  visibility: "private";
};

export type PortfolioApiResponse = PortfolioApiRequest & {
  id: number;
  provider_name: string;
  amount_exact: string | null;
  amount_range_min: string | null;
  amount_range_max: string | null;
  maturity_date: string | null;
  created_at: string;
  updated_at: string;
  version: number;
};

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: AuthCredentials | null;
};

function toBase64(value: string): string {
  if (typeof btoa === "function") {
    return btoa(value);
  }
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let output = "";
  let index = 0;
  while (index < value.length) {
    const chr1 = value.charCodeAt(index++);
    const chr2 = value.charCodeAt(index++);
    const chr3 = value.charCodeAt(index++);
    const enc1 = chr1 >> 2;
    const enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
    const enc3 = Number.isNaN(chr2) ? 64 : ((chr2 & 15) << 2) | (chr3 >> 6);
    const enc4 = Number.isNaN(chr3) ? 64 : chr3 & 63;
    output += chars.charAt(enc1) + chars.charAt(enc2) + chars.charAt(enc3) + chars.charAt(enc4);
  }
  return output;
}

function withQuery(path: string, query?: Record<string, string | boolean | undefined>) {
  if (!query) {
    return path;
  }
  const params = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  return params.length > 0 ? `${path}?${params.join("&")}` : path;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class PesaRouteApiClient {
  readonly baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl = getApiBaseUrl()) {
    this.baseUrl = baseUrl;
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = {
      Accept: "application/json"
    };
    const requestBody = options.body ? JSON.stringify(options.body) : undefined;

    if (requestBody) {
      headers["Content-Type"] = "application/json";
    }

    const token = options.auth?.token ?? this.authToken;
    if (token) {
      headers.Authorization = `Token ${token}`;
    } else if (options.auth?.username && options.auth.password) {
      headers.Authorization = `Basic ${toBase64(`${options.auth.username}:${options.auth.password}`)}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const url = /^https?:\/\//i.test(path) ? path : `${this.baseUrl}${path}`;
      const response = await fetch(url, {
        method: options.method ?? "GET",
        headers,
        body: requestBody,
        signal: controller.signal
      });
      if (!response.ok) {
        throw new ApiError(`API returned ${response.status}`, response.status);
      }
      const text = await response.text();
      return (text ? JSON.parse(text) : undefined) as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(error instanceof Error ? error.message : "API request failed");
    } finally {
      clearTimeout(timeout);
    }
  }

  health() {
    return this.request<ApiStatus>("/api/health/");
  }

  register(body: RegisterApiRequest) {
    return this.request<AuthApiResponse>("/api/accounts/register/", { method: "POST", body });
  }

  login(body: LoginApiRequest) {
    return this.request<AuthApiResponse>("/api/accounts/login/", { method: "POST", body });
  }

  me(auth: AuthCredentials) {
    return this.request<UserApiResponse>("/api/accounts/me/", { auth });
  }

  updateMe(body: Partial<UserProfileApiResponse>, auth?: AuthCredentials | null) {
    return this.request<UserApiResponse>("/api/accounts/me/", { method: "PATCH", body, auth });
  }

  async productCategories() {
    const response = await this.request<Paginated<ProductCategory>>("/api/catalog/categories/");
    return response.results;
  }

  private async listAll<T>(path: string, auth?: AuthCredentials | null) {
    const collected: T[] = [];
    let nextPath: string | null = path;
    while (nextPath) {
      const response: Paginated<T> = await this.request<Paginated<T>>(nextPath, { auth });
      collected.push(...response.results);
      nextPath = response.next;
    }
    return collected;
  }

  async productPassports(query?: ProductPassportQuery) {
    const response = await this.request<Paginated<ProductPassport>>(
      withQuery("/api/catalog/product-passports/", query)
    );
    return response.results;
  }

  async products(query?: ProductQuery) {
    const normalized = query
      ? Object.fromEntries(
          Object.entries(query).map(([key, value]) => [
            key,
            typeof value === "boolean" ? String(value) : value
          ])
        )
      : undefined;
    const response = await this.request<Paginated<InvestmentProduct>>(
      withQuery("/api/products/", normalized as Record<string, string | undefined>)
    );
    return response.results;
  }

  // Follows pagination so category summaries and pickers see the whole catalogue,
  // not just the first page (the API paginates at 20).
  async allProducts(query?: ProductQuery) {
    const normalized = query
      ? Object.fromEntries(
          Object.entries(query).map(([key, value]) => [
            key,
            typeof value === "boolean" ? String(value) : value
          ])
        )
      : undefined;
    return this.listAll<InvestmentProduct>(
      withQuery("/api/products/", normalized as Record<string, string | undefined>)
    );
  }

  product(slug: string) {
    return this.request<InvestmentProduct>(`/api/products/${slug}/`);
  }

  compareProducts(productIds: Array<number | string>) {
    return this.request<ProductCompareResponse>(
      withQuery("/api/products/compare/", { product_ids: productIds.join(",") })
    );
  }

  simulateProduct(body: ProductSimulationRequest, auth?: AuthCredentials | null) {
    return this.request<ProductSimulationResult>("/api/simulations/product/", {
      method: "POST",
      body,
      auth
    });
  }

  categoryCompareSimulation(body: CategoryCompareRequest, auth?: AuthCredentials | null) {
    return this.request<CategoryCompareResponse>("/api/simulations/category-compare/", {
      method: "POST",
      body,
      auth
    });
  }

  // Provider-specific simulation engine (Phase 2.10.2).
  simulateProductSpecific(body: ProductSpecificRequest, auth?: AuthCredentials | null) {
    return this.request<Record<string, unknown>>("/api/simulations/product-specific/", {
      method: "POST",
      body,
      auth
    });
  }

  compareProductsSimulation(body: CompareProductsRequest, auth?: AuthCredentials | null) {
    return this.request<Record<string, unknown>>("/api/simulations/compare-products/", {
      method: "POST",
      body,
      auth
    });
  }

  saveSimulationToJournal(runId: number, auth: AuthCredentials, goal?: string) {
    return this.request<{ journal_entry_id: number; note: string }>(
      `/api/simulations/${runId}/save-to-journal/`,
      { method: "POST", body: goal ? { goal } : {}, auth }
    );
  }

  requestSimulationReview(runId: number, auth: AuthCredentials) {
    return this.request<{ consultation_request_id: number; note: string }>(
      `/api/simulations/${runId}/request-professional-review/`,
      { method: "POST", body: {}, auth }
    );
  }

  // --- Land Decision Safety (Phase 2.12) -------------------------------------

  async listLandOpportunities(auth: AuthCredentials) {
    const response = await this.request<Paginated<LandOpportunity>>("/api/land/opportunities/", { auth });
    return response.results;
  }

  createLandOpportunity(body: LandOpportunityInput, auth: AuthCredentials) {
    return this.request<LandOpportunity>("/api/land/opportunities/", { method: "POST", body, auth });
  }

  getLandOpportunity(id: number, auth: AuthCredentials) {
    return this.request<LandOpportunity>(`/api/land/opportunities/${id}/`, { auth });
  }

  updateLandOpportunity(id: number, body: Partial<LandOpportunityInput>, auth: AuthCredentials) {
    return this.request<LandOpportunity>(`/api/land/opportunities/${id}/`, { method: "PATCH", body, auth });
  }

  ensureLandChecklist(id: number, auth: AuthCredentials) {
    return this.request<LandDueDiligenceItem[]>(`/api/land/opportunities/${id}/checklist/`, {
      method: "POST",
      body: {},
      auth
    });
  }

  updateLandChecklistItem(itemId: number, body: { status: string }, auth: AuthCredentials) {
    return this.request<LandDueDiligenceItem>(`/api/land/checklist-items/${itemId}/`, {
      method: "PATCH",
      body,
      auth
    });
  }

  scoreLandRisk(id: number, signals: Record<string, boolean>, auth: AuthCredentials) {
    return this.request<LandRiskScoreResult>(`/api/land/opportunities/${id}/risk-score/`, {
      method: "POST",
      body: signals,
      auth
    });
  }

  saveLandToJournal(id: number, note: string, auth: AuthCredentials) {
    return this.request<{ journal_entry_id: number; visibility: string }>(
      `/api/land/opportunities/${id}/save-to-journal/`,
      { method: "POST", body: { note }, auth }
    );
  }

  requestLandReview(
    id: number,
    body: { professional_type: string; share_document_ids?: number[]; share_amount?: boolean; question?: string },
    auth: AuthCredentials
  ) {
    return this.request<Record<string, unknown>>(`/api/land/opportunities/${id}/request-professional-review/`, {
      method: "POST",
      body,
      auth
    });
  }

  addLandDocument(
    id: number,
    body: { document_type: string; notes?: string },
    auth: AuthCredentials
  ) {
    return this.request<Record<string, unknown>>(`/api/land/opportunities/${id}/documents/`, {
      method: "POST",
      body,
      auth
    });
  }

  landDefaultChecklist() {
    return this.request<{ items: LandDueDiligenceItem[]; disclaimer: string }>("/api/land/default-checklist/");
  }

  compareLand(body: LandComparisonInput) {
    return this.request<LandComparisonResult>("/api/land/compare/", { method: "POST", body });
  }

  // --- Marketplace (Phase 2.13 + 2.15) ---------------------------------------

  async marketplaceProducts(query?: Record<string, string>) {
    const response = await this.request<Paginated<MarketplaceProduct>>(
      withQuery("/api/marketplace/products/", { ...query, page_size: "60" })
    );
    return response;
  }

  marketplaceProduct(slug: string) {
    return this.request<Record<string, unknown>>(`/api/marketplace/products/${slug}/`);
  }

  marketplaceFinder(body: Record<string, unknown>) {
    return this.request<Record<string, unknown>>("/api/marketplace/finder/", { method: "POST", body });
  }

  marketplaceMmfFinder(body: Record<string, unknown>) {
    return this.request<Record<string, unknown>>("/api/marketplace/mmf-finder/", { method: "POST", body });
  }

  marketplaceNetAfterTax(body: Record<string, unknown>) {
    return this.request<Record<string, unknown>>("/api/marketplace/net-after-tax/", { method: "POST", body });
  }

  marketplaceCompare(slugs: string[], amount?: string) {
    return this.request<Record<string, unknown>>(
      withQuery("/api/marketplace/products/compare/", { slugs: slugs.join(","), amount })
    );
  }

  marketplaceSaccoScore(slug: string) {
    return this.request<Record<string, unknown>>(`/api/marketplace/products/${slug}/sacco-score/`);
  }

  marketplaceQuickScenarios() {
    return this.request<Record<string, unknown>>("/api/marketplace/quick-scenarios/");
  }

  marketplaceIntelligence() {
    return this.request<Record<string, unknown>>("/api/marketplace/intelligence/");
  }

  async listWatchlist(auth: AuthCredentials) {
    const response = await this.request<Paginated<Record<string, unknown>>>("/api/marketplace/watchlist/", { auth });
    return response.results;
  }

  addToWatchlist(slug: string, note: string, auth: AuthCredentials) {
    return this.request<Record<string, unknown>>("/api/marketplace/watchlist/", {
      method: "POST",
      body: { product_slug: slug, note },
      auth
    });
  }

  removeFromWatchlist(id: number, auth: AuthCredentials) {
    return this.request<void>(`/api/marketplace/watchlist/${id}/`, { method: "DELETE", auth });
  }

  personalBrief(auth: AuthCredentials) {
    return this.request<Record<string, unknown>>("/api/marketplace/personal-brief/", { auth });
  }

  saveProductToJournal(slug: string, note: string, auth: AuthCredentials) {
    return this.request<Record<string, unknown>>(`/api/marketplace/products/${slug}/save-to-journal/`, {
      method: "POST",
      body: { note },
      auth
    });
  }

  requestProductReview(slug: string, body: Record<string, unknown>, auth: AuthCredentials) {
    return this.request<Record<string, unknown>>(`/api/marketplace/products/${slug}/request-review/`, {
      method: "POST",
      body,
      auth
    });
  }

  createVirtualPortfolio(
    body: { name?: string; starting_virtual_cash: string; currency?: string; goal?: string },
    auth: AuthCredentials
  ) {
    return this.request<Record<string, unknown>>("/api/simulations/virtual-portfolios/", {
      method: "POST",
      body,
      auth
    });
  }

  listVirtualPortfolios(auth: AuthCredentials) {
    return this.request<Record<string, unknown>[]>("/api/simulations/virtual-portfolios/", { auth });
  }

  addVirtualPosition(
    portfolioId: number,
    body: { product_slug: string; virtual_amount_allocated: string; rate_mode: string; custom_rate?: string; timeline_months: number },
    auth: AuthCredentials
  ) {
    return this.request<Record<string, unknown>>(`/api/simulations/virtual-portfolios/${portfolioId}/positions/`, {
      method: "POST",
      body,
      auth
    });
  }

  runVirtualPortfolio(portfolioId: number, auth: AuthCredentials) {
    return this.request<Record<string, unknown>>(`/api/simulations/virtual-portfolios/${portfolioId}/run/`, {
      method: "POST",
      body: {},
      auth
    });
  }

  async billingPlans() {
    const response = await this.request<Paginated<BillingPlanApiResponse>>("/api/billing/plans/");
    return response.results;
  }

  billingEntitlements(auth?: AuthCredentials | null) {
    return this.request<BillingEntitlementSnapshot>("/api/billing/entitlements/", { auth });
  }

  billingPacks() {
    return this.request<OneOffPackApiResponse[]>("/api/billing/packs/");
  }

  devMockPurchase(
    body:
      | { kind: "subscription"; plan_code: BillingPlanApiResponse["code"]; days?: number }
      | { kind: "pack"; pack_code: OneOffPackApiResponse["code"] },
    auth: AuthCredentials
  ) {
    return this.request<{ detail: string; entitlements: BillingEntitlementSnapshot }>("/api/billing/dev/mock-purchase/", {
      method: "POST",
      body,
      auth
    });
  }

  createPaymentIntent(body: PaymentIntentApiRequest, auth: AuthCredentials) {
    return this.request<PaymentIntentApiResponse>("/api/payments/intents/", {
      method: "POST",
      body,
      auth
    });
  }

  initiatePaymentIntent(id: number, phoneNumber: string, auth: AuthCredentials) {
    return this.request<PaymentIntentApiResponse>(`/api/payments/intents/${id}/initiate/`, {
      method: "POST",
      body: { phone_number: phoneNumber },
      auth
    });
  }

  getPaymentIntent(id: number, auth: AuthCredentials) {
    return this.request<PaymentIntentApiResponse>(`/api/payments/intents/${id}/`, { auth });
  }

  async listProfessionals() {
    const response = await this.request<Paginated<ProfessionalApiResponse>>("/api/marketplace/professionals/");
    return response.results;
  }

  scamCheck(text: string) {
    return this.request<ScamCheckApiResponse>("/api/risk/scam-check/", {
      method: "POST",
      body: { text }
    });
  }

  simulateMMF(body: MMFApiRequest) {
    return this.request<Record<string, unknown>>("/api/planning/simulate/mmf/", { method: "POST", body });
  }

  simulateTBill(body: TBillApiRequest) {
    return this.request<Record<string, unknown>>("/api/planning/simulate/tbill/", { method: "POST", body });
  }

  simulateSacco(body: SaccoApiRequest) {
    return this.request<Record<string, unknown>>("/api/planning/simulate/sacco/", { method: "POST", body });
  }

  simulateGlobalRoute(body: GlobalRouteApiRequest) {
    return this.request<Record<string, unknown>>("/api/planning/simulate/global-route/", { method: "POST", body });
  }

  listJournalEntries(auth: AuthCredentials) {
    return this.listAll<JournalApiResponse>("/api/journal/entries/", auth);
  }

  createJournalEntry(body: JournalApiRequest, auth: AuthCredentials) {
    return this.request<JournalApiResponse>("/api/journal/entries/", { method: "POST", body, auth });
  }

  updateJournalEntry(id: number, body: Partial<JournalApiRequest>, auth: AuthCredentials) {
    return this.request<JournalApiResponse>(`/api/journal/entries/${id}/`, { method: "PATCH", body, auth });
  }

  deleteJournalEntry(id: number, auth: AuthCredentials) {
    return this.request<void>(`/api/journal/entries/${id}/`, { method: "DELETE", auth });
  }

  listPortfolioItems(auth: AuthCredentials) {
    return this.listAll<PortfolioApiResponse>("/api/portfolio/items/", auth);
  }

  createPortfolioItem(body: PortfolioApiRequest, auth: AuthCredentials) {
    return this.request<PortfolioApiResponse>("/api/portfolio/items/", { method: "POST", body, auth });
  }

  updatePortfolioItem(id: number, body: Partial<PortfolioApiRequest>, auth: AuthCredentials) {
    return this.request<PortfolioApiResponse>(`/api/portfolio/items/${id}/`, { method: "PATCH", body, auth });
  }

  deletePortfolioItem(id: number, auth: AuthCredentials) {
    return this.request<void>(`/api/portfolio/items/${id}/`, { method: "DELETE", auth });
  }

  async listDataGrants(auth: AuthCredentials) {
    const response = await this.request<Paginated<DataGrantApiResponse>>("/api/privacy/data-grants/", { auth });
    return response.results;
  }

  createDataGrant(body: DataGrantApiRequest, auth: AuthCredentials) {
    return this.request<DataGrantApiResponse>("/api/privacy/data-grants/", { method: "POST", body, auth });
  }

  revokeDataGrant(id: number, auth: AuthCredentials) {
    return this.request<DataGrantApiResponse>(`/api/privacy/data-grants/${id}/revoke/`, {
      method: "POST",
      auth
    });
  }

  createConsultationRequest(body: ConsultationRequestApiRequest, auth: AuthCredentials) {
    return this.request<ConsultationRequestApiResponse>("/api/marketplace/consultation-requests/", {
      method: "POST",
      body,
      auth
    });
  }

  async myConsultationRequests(auth: AuthCredentials) {
    return this.listAll<ConsultationRequestApiResponse>("/api/marketplace/my-consultation-requests/", auth);
  }

  acceptConsultationOffer(id: number, auth: AuthCredentials) {
    return this.request<ConsultationOfferApiResponse>(`/api/marketplace/consultation-offers/${id}/accept/`, {
      method: "POST",
      auth
    });
  }

  startConsultationPayment(id: number, body: { phone_number?: string; idempotency_key?: string }, auth: AuthCredentials) {
    return this.request<PaymentIntentApiResponse>(`/api/marketplace/consultation-requests/${id}/start-payment/`, {
      method: "POST",
      body,
      auth
    });
  }

  consultationPaidStatus(id: number, auth: AuthCredentials) {
    return this.request<ConsultationRequestApiResponse>(`/api/marketplace/consultation-requests/${id}/paid-status/`, {
      auth
    });
  }

  async notifications(auth: AuthCredentials) {
    return this.listAll<NotificationApiResponse>("/api/notifications/", auth);
  }

  markNotificationRead(id: number, auth: AuthCredentials) {
    return this.request<NotificationApiResponse>(`/api/notifications/${id}/read/`, { method: "POST", auth });
  }

  betaFlags() {
    return this.request<BetaFeatureFlagsApiResponse>("/api/beta/flags/");
  }

  sendBetaFeedback(body: BetaFeedbackApiRequest, auth?: AuthCredentials | null) {
    return this.request<{ id: number }>("/api/beta/feedback/", { method: "POST", body, auth });
  }

  async learningTracks(query?: { level?: LearningLevel; target_user_type?: string }) {
    const response = await this.request<Paginated<LearningTrackApiResponse>>(withQuery("/api/learning/tracks/", query));
    return response.results;
  }

  learningHome(auth?: AuthCredentials | null) {
    return this.request<LearningHomeApiResponse>("/api/learning/home/", { auth });
  }

  learningLibrary(auth?: AuthCredentials | null) {
    return this.request<LearningLibraryApiResponse>("/api/learning/library/", { auth });
  }

  learningProgress(auth: AuthCredentials) {
    return this.request<LearningProgressSummaryApiResponse>("/api/learning/progress/", { auth });
  }

  learningTrack(slug: string) {
    return this.request<LearningTrackApiResponse>(`/api/learning/tracks/${slug}/`);
  }

  learningCourse(slug: string) {
    return this.request<LearningCourseApiResponse>(`/api/learning/courses/${slug}/`);
  }

  async learningResources(query?: { resource_type?: LearningResourceApiResponse["resource_type"]; track?: string }) {
    return this.listAll<LearningResourceApiResponse>(withQuery("/api/learning/resources/", query));
  }

  learningMyProgress(auth: AuthCredentials) {
    return this.request<LearningProgressApiResponse>("/api/learning/my-progress/", { auth });
  }

  startLearningLesson(id: number, auth: AuthCredentials) {
    return this.request<UserLessonProgressApiResponse>(`/api/learning/lessons/${id}/start/`, {
      method: "POST",
      auth
    });
  }

  completeLearningLesson(id: number, auth: AuthCredentials, score?: number) {
    return this.request<UserLessonProgressApiResponse>(`/api/learning/lessons/${id}/complete/`, {
      method: "POST",
      body: score === undefined ? {} : { score },
      auth
    });
  }

  completeLearningLessonWithAction(id: number, body: LearningCompleteWithActionApiRequest, auth: AuthCredentials) {
    return this.request<LearningCompleteWithActionApiResponse>(`/api/learning/lessons/${id}/complete-with-action/`, {
      method: "POST",
      body,
      auth
    });
  }

  learningXp(auth: AuthCredentials) {
    return this.request<{ total_xp: number; events: Array<{ id: number; source_type: string; source_id: string; xp_amount: number; created_at: string }> }>(
      "/api/learning/xp/",
      { auth }
    );
  }

  learningBadges(auth: AuthCredentials) {
    return this.request<{ available: UserBadgeApiResponse["badge"][]; earned: UserBadgeApiResponse[] }>("/api/learning/badges/", {
      auth
    });
  }

  learningStreak(auth: AuthCredentials) {
    return this.request<UserStreakApiResponse>("/api/learning/streak/", { auth });
  }

  learningDashboard(auth?: AuthCredentials | null) {
    return this.request<LearningDashboardApiResponse>("/api/learning/dashboard/", { auth });
  }

  learningTrackOutline(slug: string, auth?: AuthCredentials | null) {
    return this.request<LearningTrackApiResponse>(`/api/learning/tracks/${slug}/outline/`, { auth });
  }

  learningLessonDetail(id: number, auth?: AuthCredentials | null) {
    return this.request<LearningLessonApiResponse>(`/api/learning/lessons/${id}/`, { auth });
  }

  learningActivity(auth: AuthCredentials) {
    return this.request<LearningActivityApiResponse>("/api/learning/activity/", { auth });
  }

  async learningPractice(auth?: AuthCredentials | null) {
    const response = await this.request<Paginated<PracticeSetApiResponse>>("/api/learning/practice/", { auth });
    return response.results;
  }

  learningPracticeDetail(id: number, auth?: AuthCredentials | null) {
    return this.request<PracticeSetDetailApiResponse>(`/api/learning/practice/${id}/`, { auth });
  }

  submitPractice(id: number, answers: Record<string, string>, auth: AuthCredentials) {
    return this.request<PracticeSubmitApiResponse>(`/api/learning/practice/${id}/submit/`, {
      method: "POST",
      body: { answers },
      auth
    });
  }

  async learningAssessments(auth?: AuthCredentials | null) {
    const response = await this.request<Paginated<AssessmentApiResponse>>("/api/learning/assessments/", { auth });
    return response.results;
  }

  learningAssessmentDetail(slug: string, auth?: AuthCredentials | null) {
    return this.request<AssessmentDetailApiResponse>(`/api/learning/assessments/${slug}/`, { auth });
  }

  submitAssessment(slug: string, answers: Record<string, string>, auth: AuthCredentials) {
    return this.request<AssessmentSubmitApiResponse>(`/api/learning/assessments/${slug}/submit/`, {
      method: "POST",
      body: { answers },
      auth
    });
  }

  saveLearningLibrary(trackId: number, auth: AuthCredentials) {
    return this.request<{ id: number }>("/api/learning/library/save/", {
      method: "POST",
      body: { track: trackId },
      auth
    });
  }
}
