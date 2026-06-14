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

export type PortfolioApiRequest = {
  asset_type: string;
  provider_name?: string;
  amount_display_mode: AmountDisplayMode;
  amount_exact?: string;
  amount_range_min?: string;
  amount_range_max?: string;
  liquidity_level: "high" | "medium" | "low" | "locked";
  risk_level: "low" | "moderate" | "high" | "very_high";
  visibility: "private";
};

type RequestOptions = {
  method?: "GET" | "POST";
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

  constructor(baseUrl = getApiBaseUrl()) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = {
      Accept: "application/json"
    };
    const requestBody = options.body ? JSON.stringify(options.body) : undefined;

    if (requestBody) {
      headers["Content-Type"] = "application/json";
    }

    if (options.auth?.username && options.auth.password) {
      headers.Authorization = `Basic ${toBase64(`${options.auth.username}:${options.auth.password}`)}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: options.method ?? "GET",
        headers,
        body: requestBody,
        signal: controller.signal
      });
      if (!response.ok) {
        throw new ApiError(`API returned ${response.status}`, response.status);
      }
      return (await response.json()) as T;
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

  async productCategories() {
    const response = await this.request<Paginated<ProductCategory>>("/api/catalog/categories/");
    return response.results;
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

  createJournalEntry(body: JournalApiRequest, auth: AuthCredentials) {
    return this.request<Record<string, unknown>>("/api/journal/entries/", { method: "POST", body, auth });
  }

  createPortfolioItem(body: PortfolioApiRequest, auth: AuthCredentials) {
    return this.request<Record<string, unknown>>("/api/portfolio/items/", { method: "POST", body, auth });
  }
}
