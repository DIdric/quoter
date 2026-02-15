export interface Profile {
  id: string;
  business_name: string | null;
  logo_url: string | null;
  hourly_rate: number;
  margin_percentage: number;
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
