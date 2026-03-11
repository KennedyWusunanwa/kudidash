import { demoCustomers, demoInvoices, getDemoInvoice } from "@/lib/demo/data";
import { isDemoMode } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function listCustomers(orgId: string) {
  if (isDemoMode()) {
    return demoCustomers.map((row) => ({ ...row, org_id: orgId }));
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("org_id", orgId)
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listInvoices(orgId: string) {
  if (isDemoMode()) {
    return demoInvoices.map((row) => ({ ...row, org_id: orgId }));
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("org_id", orgId)
    .order("invoice_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getInvoice(orgId: string, invoiceId: string) {
  if (isDemoMode()) {
    return {
      ...getDemoInvoice(invoiceId),
      org_id: orgId,
      amount_paid: 0,
      paid_at: null,
      public_view_token: invoiceId,
    };
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("*, invoice_lines(*)")
    .eq("org_id", orgId)
    .eq("id", invoiceId)
    .single();
  if (error) throw error;
  return data;
}

export async function listRecentInvoices(orgId: string) {
  const rows = await listInvoices(orgId);
  return rows.slice(0, 5);
}
