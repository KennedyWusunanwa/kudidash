import type { Role } from "@/types/accounting";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  base_currency: string;
  fiscal_year_start_month: number;
  is_active: boolean;
  dashboard_name?: string | null;
  dashboard_logo_url?: string | null;
  dashboard_color_scheme?:
    | "default"
    | "emerald"
    | "indigo"
    | "rose"
    | "amber"
    | "teal"
    | "slate"
    | null;
  created_at: string;
  updated_at: string;
}

export interface OrgMember {
  org_id: string;
  user_id: string;
  role: Role;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrgAccountSettings {
  org_id: string;
  ar_account_id: string | null;
  ap_account_id: string | null;
  cash_account_id: string | null;
  bank_account_id: string | null;
  retained_earnings_account_id: string | null;
  revenue_default_account_id: string | null;
  expense_default_account_id: string | null;
  sales_tax_rate: number;
  updated_at: string;
}
