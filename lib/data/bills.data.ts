import { demoBills, demoVendors, getDemoBill } from "@/lib/demo/data";
import { isDemoMode } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function listVendors(orgId: string) {
  if (isDemoMode()) {
    return demoVendors.map((row) => ({ ...row, org_id: orgId }));
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .eq("org_id", orgId)
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listBills(orgId: string) {
  if (isDemoMode()) {
    return demoBills.map((row) => ({ ...row, org_id: orgId }));
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("bills")
    .select("*")
    .eq("org_id", orgId)
    .order("bill_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getBill(orgId: string, billId: string) {
  if (isDemoMode()) {
    return { ...getDemoBill(billId), org_id: orgId };
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("bills")
    .select("*, bill_lines(*)")
    .eq("org_id", orgId)
    .eq("id", billId)
    .single();
  if (error) throw error;
  return data;
}

export async function listBillsToApprove(orgId: string) {
  const rows = await listBills(orgId);
  return rows.filter((row) => row.status === "draft").slice(0, 5);
}
