import {
  demoBankAccounts,
  demoBankTransactions,
  demoReconciliationSessions,
} from "@/lib/demo/data";
import { isDemoMode } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function listBankAccounts(orgId: string) {
  if (isDemoMode()) {
    return demoBankAccounts.map((row) => ({ ...row, org_id: orgId }));
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("bank_accounts")
    .select("*")
    .eq("org_id", orgId)
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listBankTransactions(orgId: string) {
  if (isDemoMode()) {
    return demoBankTransactions.map((row) => ({ ...row, org_id: orgId }));
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("bank_transactions")
    .select("*")
    .eq("org_id", orgId)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return data ?? [];
}

export async function listReconciliationSessions(orgId: string) {
  if (isDemoMode()) {
    return demoReconciliationSessions.map((row) => ({ ...row, org_id: orgId }));
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("bank_reconciliation_sessions")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
