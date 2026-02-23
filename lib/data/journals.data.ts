import { demoJournals, getDemoJournal } from "@/lib/demo/data";
import { isDemoMode } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function listJournals(orgId: string, status?: string) {
  if (isDemoMode()) {
    const rows = demoJournals
      .map((row) => ({ ...row, org_id: orgId }))
      .sort((a, b) => String(b.entry_date).localeCompare(String(a.entry_date)));
    if (status && status !== "all") {
      return rows.filter((row) => row.status === status);
    }
    return rows;
  }

  const supabase = createSupabaseServerClient();
  let query = supabase
    .from("journal_entries")
    .select("*")
    .eq("org_id", orgId)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query.limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function getJournal(orgId: string, journalId: string) {
  if (isDemoMode()) {
    return { ...getDemoJournal(journalId), org_id: orgId };
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("journal_entries")
    .select("*, journal_lines(*)")
    .eq("org_id", orgId)
    .eq("id", journalId)
    .single();
  if (error) throw error;
  return data;
}

export async function listPendingJournals(orgId: string) {
  return listJournals(orgId, "approved");
}
