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
  json_data: Record<string, unknown> | null;
  pdf_url: string | null;
  created_at: string;
}
