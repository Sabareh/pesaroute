import { getApiBaseUrl } from "./config";
import type {
  AmountDisplayMode,
  AuthCredentials,
  ProductCategory,
  ProductPassport
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
  professional?: number;
  topic: string;
  notes?: string;
};

export type ConsultationRequestApiResponse = {
  id: number;
  professional: number | null;
  topic: string;
  notes: string;
  status: string;
  created_at: string;
};

type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type ScamCheckApiResponse = {
  id: number;
  prompt_text: string;
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
};

export type TBillApiRequest = {
  face_value: string;
  discount_rate_percent: string;
  days: number;
};

export type SaccoApiRequest = {
  monthly_deposit: string;
  months: number;
  annual_dividend_percent: string;
};

export type GlobalRouteApiRequest = {
  amount_kes: string;
  fx_rate: string;
  transfer_fee_percent: string;
};

export type JournalApiRequest = {
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

  async productPassports() {
    const response = await this.request<Paginated<ProductPassport>>("/api/catalog/product-passports/");
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
}
