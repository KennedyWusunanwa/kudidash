import { demoAccounts } from "@/lib/demo/data";
import { isDemoMode } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function listAccounts(orgId: string) {
  if (isDemoMode()) {
    return demoAccounts.map((row) => ({ ...row, org_id: orgId }));
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("chart_of_accounts")
    .select("*")
    .eq("org_id", orgId)
    .order("code", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getAccount(orgId: string, accountId: string) {
  if (isDemoMode()) {
    return (
      demoAccounts.find((row) => row.id === accountId) ??
      ({ ...demoAccounts[0], id: accountId, org_id: orgId, name: "Demo Placeholder Account" } as any)
    );
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("chart_of_accounts")
    .select("*")
    .eq("org_id", orgId)
    .eq("id", accountId)
    .single();
  if (error) throw error;
  return data;
}

export async function listAccountsForSelect(orgId: string) {
  const rows = await listAccounts(orgId);
  return rows
    .filter((row) => row.is_active)
    .map((row) => ({
      id: row.id as string,
      label: `${row.code} - ${row.name}`,
      type: row.type as string,
      sub_type: row.sub_type as string,
    }));
}
