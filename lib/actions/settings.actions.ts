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

function isValidHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function isInvoiceLogoDataUrl(value: string) {
  return /^data:image\/(?:png|jpe?g);base64,[a-z0-9+/=\s]+$/i.test(value);
}

const invoiceLogoSchema = z
  .string()
  .trim()
  .max(1_000_000, "Logo image is too large")
  .refine((value) => !value || isValidHttpUrl(value) || isInvoiceLogoDataUrl(value), {
    message: "Use an HTTP(S) image URL or upload a PNG/JPG logo.",
  });

const orgSettingsSchema = z.object({
  orgId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  base_currency: z.string().length(3),
  fiscal_year_start_month: z.coerce.number().int().min(1).max(12),
  dashboard_name: z.string().trim().min(2).max(120).optional().or(z.literal("")),
  dashboard_logo_url: z.string().url().optional().or(z.literal("")),
  dashboard_color_scheme: z.enum(DASHBOARD_COLOR_SCHEMES).default("default"),
  invoice_company_name: z.string().trim().max(120).optional().or(z.literal("")),
  invoice_company_address: z.string().trim().max(500).optional().or(z.literal("")),
  invoice_company_phone: z.string().trim().max(60).optional().or(z.literal("")),
  invoice_company_email: z.string().email().max(254).optional().or(z.literal("")),
  invoice_company_tax_id: z.string().trim().max(120).optional().or(z.literal("")),
  invoice_logo_url: invoiceLogoSchema.optional().or(z.literal("")),
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
      revalidateOrgPaths(parsed.orgId, ["/settings", "/dashboard", "/invoices", "/invoices/new"]);
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
        invoice_company_name: parsed.invoice_company_name?.trim()
          ? parsed.invoice_company_name.trim()
          : null,
        invoice_company_address: parsed.invoice_company_address?.trim()
          ? parsed.invoice_company_address.trim()
          : null,
        invoice_company_phone: parsed.invoice_company_phone?.trim()
          ? parsed.invoice_company_phone.trim()
          : null,
        invoice_company_email: parsed.invoice_company_email?.trim()
          ? parsed.invoice_company_email.trim()
          : null,
        invoice_company_tax_id: parsed.invoice_company_tax_id?.trim()
          ? parsed.invoice_company_tax_id.trim()
          : null,
        invoice_logo_url: parsed.invoice_logo_url?.trim() ? parsed.invoice_logo_url.trim() : null,
      })
      .eq("id", parsed.orgId);
    if (error) throw error;
    revalidateOrgPaths(parsed.orgId, [
      "/settings",
      "/dashboard",
      "/coa",
      "/invoices",
      "/invoices/new",
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
