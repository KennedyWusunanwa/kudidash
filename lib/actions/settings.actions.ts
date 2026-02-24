"use server";

import { z } from "zod";
import { DASHBOARD_COLOR_SCHEMES } from "@/lib/branding";
import { isDemoMode } from "@/lib/env";
import {
  ActionResult,
  getServerSupabaseForOrg,
  parseActionError,
  revalidateOrgPaths,
} from "@/lib/actions/_helpers";

const orgSettingsSchema = z.object({
  orgId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  base_currency: z.string().length(3),
  fiscal_year_start_month: z.coerce.number().int().min(1).max(12),
  dashboard_name: z.string().trim().min(2).max(120).optional().or(z.literal("")),
  dashboard_logo_url: z.string().url().optional().or(z.literal("")),
  dashboard_color_scheme: z.enum(DASHBOARD_COLOR_SCHEMES).default("default"),
});

const accountSettingsSchema = z.object({
  orgId: z.string().uuid(),
  ar_account_id: z.string().uuid().nullable().optional(),
  ap_account_id: z.string().uuid().nullable().optional(),
  cash_account_id: z.string().uuid().nullable().optional(),
  bank_account_id: z.string().uuid().nullable().optional(),
  retained_earnings_account_id: z.string().uuid().nullable().optional(),
  revenue_default_account_id: z.string().uuid().nullable().optional(),
  expense_default_account_id: z.string().uuid().nullable().optional(),
});

export async function updateOrgSettingsAction(
  input: z.infer<typeof orgSettingsSchema>
): Promise<ActionResult> {
  try {
    const parsed = orgSettingsSchema.parse(input);
    if (isDemoMode()) {
      revalidateOrgPaths(parsed.orgId, ["/settings", "/dashboard"]);
      return { success: true };
    }
    const supabase = await getServerSupabaseForOrg(parsed.orgId, "org.manage");
    const { error } = await supabase
      .from("organizations")
      .update({
        name: parsed.name,
        base_currency: parsed.base_currency.toUpperCase(),
        fiscal_year_start_month: parsed.fiscal_year_start_month,
        dashboard_name: parsed.dashboard_name?.trim() ? parsed.dashboard_name.trim() : null,
        dashboard_logo_url: parsed.dashboard_logo_url?.trim()
          ? parsed.dashboard_logo_url.trim()
          : null,
        dashboard_color_scheme: parsed.dashboard_color_scheme,
      })
      .eq("id", parsed.orgId);
    if (error) throw error;
    revalidateOrgPaths(parsed.orgId, [
      "/settings",
      "/dashboard",
      "/coa",
      "/invoices",
      "/bills",
      "/reports",
      "/inventory",
      "/banking/reconciliation",
    ]);
    return { success: true };
  } catch (error) {
    return { success: false, error: parseActionError(error) };
  }
}

export async function updateOrgAccountSettingsAction(
  input: z.infer<typeof accountSettingsSchema>
): Promise<ActionResult> {
  try {
    const parsed = accountSettingsSchema.parse(input);
    if (isDemoMode()) {
      revalidateOrgPaths(parsed.orgId, ["/settings", "/dashboard"]);
      return { success: true };
    }
    const supabase = await getServerSupabaseForOrg(parsed.orgId, "org.manage");
    const { orgId, ...rest } = parsed;
    const { error } = await supabase
      .from("org_account_settings")
      .upsert({ org_id: orgId, ...rest });
    if (error) throw error;
    revalidateOrgPaths(orgId, ["/settings", "/dashboard", "/journals", "/invoices", "/bills"]);
    return { success: true };
  } catch (error) {
    return { success: false, error: parseActionError(error) };
  }
}
