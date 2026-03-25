export type DisplayMode = "open" | "module" | "hoogover";

export type Language = "nl" | "en" | "de" | "pl";

export interface Keurmerk {
  id: string;
  name: string;
  logo_url: string | null;
  type: "preset" | "custom";
}

export interface Profile {
  id: string;
  business_name: string | null;
  logo_url: string | null;
  business_address: string | null;
  business_postal_code: string | null;
  business_city: string | null;
  business_phone: string | null;
  business_email: string | null;
  kvk_number: string | null;
  btw_number: string | null;
  iban: string | null;
  hourly_rate: number;
  margin_percentage: number;
  quote_validity_days: number;
  quote_number_prefix: string | null;
  default_display_mode: DisplayMode;
  default_language?: Language;
  estimation_style?: string;
  keurmerken: Keurmerk[];
  subscription_tier: "free" | "pro" | "business";
  stripe_customer_id: string | null;
}

export interface Material {
  id: string;
  user_id: string;
  name: string;
  unit: string;
  cost_price: number;
  created_at: string;
}

export interface Quote {
  id: string;
  user_id: string;
  client_name: string;
  status: "draft" | "final";
  quote_number: string | null;
  json_data: Record<string, unknown> | null;
  pdf_url: string | null;
  created_at: string;
}

export interface TokenUsage {
  id: string;
  user_id: string;
  endpoint: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_estimate: number;
  created_at: string;
}

export interface DefaultMaterial {
  id: string;
  name: string;
  category: string;
  unit: string;
  cost_price: number;
  source: string | null;
  source_url: string | null;
  article_number: string | null;
  updated_at: string;
  created_at: string;
}
