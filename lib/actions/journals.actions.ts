"use server";

import { z } from "zod";
import { isDemoMode } from "@/lib/env";
import {
  ActionResult,
  getServerSupabaseForOrg,
  parseActionError,
  revalidateOrgPaths,
} from "@/lib/actions/_helpers";
import {
  approveJournalSchema,
  journalEntrySchema,
  postJournalSchema,
  reverseJournalSchema,
} from "@/lib/validators/journal";

const createDraftSchema = journalEntrySchema.extend({
  orgId: z.string().uuid(),
});

const approveSchema = approveJournalSchema.extend({
  orgId: z.string().uuid(),
});

const postSchema = postJournalSchema.extend({
  orgId: z.string().uuid(),
});

const reverseSchema = reverseJournalSchema.extend({
  orgId: z.string().uuid(),
});

export async function createDraftJournalAction(
  input: z.infer<typeof createDraftSchema>
): Promise<ActionResult<{ journalId: string }>> {
  try {
    const parsed = createDraftSchema.parse(input);
    if (isDemoMode()) {
      revalidateOrgPaths(parsed.orgId, ["/journals"]);
      return { success: true, data: { journalId: crypto.randomUUID() } };
    }
    const supabase = await getServerSupabaseForOrg(parsed.orgId, "journals.create");

    const { data: entry, error: headerError } = await supabase
      .from("journal_entries")
      .insert({
        org_id: parsed.orgId,
        entry_date: parsed.entry_date,
        memo: parsed.memo || null,
        reference: parsed.reference || null,
        status: "draft",
        source_module: "manual_journal",
      })
      .select("id")
      .single();
    if (headerError) throw headerError;

    const linesPayload = parsed.lines.map((line, index) => ({
      org_id: parsed.orgId,
      journal_entry_id: entry.id,
      line_no: index + 1,
      account_id: line.account_id,
      description: line.description || null,
      debit: line.debit,
      credit: line.credit,
    }));
    const { error: lineError } = await supabase.from("journal_lines").insert(linesPayload);
    if (lineError) throw lineError;

    revalidateOrgPaths(parsed.orgId, ["/journals"]);
    return { success: true, data: { journalId: entry.id as string } };
  } catch (error) {
    return { success: false, error: parseActionError(error) };
  }
}

export async function approveJournalAction(
  input: z.infer<typeof approveSchema>
): Promise<ActionResult> {
  try {
    const parsed = approveSchema.parse(input);
    if (isDemoMode()) {
      revalidateOrgPaths(parsed.orgId, ["/journals", `/journals/${parsed.journalId}`]);
      return { success: true };
    }
    const supabase = await getServerSupabaseForOrg(parsed.orgId, "journals.approve");
    const { error } = await supabase
      .from("journal_entries")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("org_id", parsed.orgId)
      .eq("id", parsed.journalId)
      .eq("status", "draft");
    if (error) throw error;
    revalidateOrgPaths(parsed.orgId, ["/journals", `/journals/${parsed.journalId}`]);
    return { success: true };
  } catch (error) {
    return { success: false, error: parseActionError(error) };
  }
}

export async function postJournalAction(
  input: Omit<z.infer<typeof postSchema>, "idempotencyKey"> & {
    idempotencyKey?: string;
  }
): Promise<ActionResult> {
  try {
    const parsed = postSchema.parse({
      ...input,
      idempotencyKey: input.idempotencyKey ?? crypto.randomUUID(),
    });
    if (isDemoMode()) {
      revalidateOrgPaths(parsed.orgId, ["/journals", `/journals/${parsed.journalId}`, "/dashboard"]);
      return { success: true };
    }
    const supabase = await getServerSupabaseForOrg(parsed.orgId, "journals.post");
    const { error } = await supabase.rpc("kd_post_journal_entry", {
      p_org_id: parsed.orgId,
      p_journal_entry_id: parsed.journalId,
      p_idempotency_key: parsed.idempotencyKey,
    });
    if (error) throw error;
    revalidateOrgPaths(parsed.orgId, ["/journals", `/journals/${parsed.journalId}`, "/dashboard"]);
    return { success: true };
  } catch (error) {
    return { success: false, error: parseActionError(error) };
  }
}

export async function reverseJournalAction(
  input: Omit<z.infer<typeof reverseSchema>, "idempotencyKey"> & {
    idempotencyKey?: string;
  }
): Promise<ActionResult<{ reversalJournalId?: string }>> {
  try {
    const parsed = reverseSchema.parse({
      ...input,
      idempotencyKey: input.idempotencyKey ?? crypto.randomUUID(),
    });
    if (isDemoMode()) {
      revalidateOrgPaths(parsed.orgId, ["/journals", `/journals/${parsed.journalId}`]);
      return { success: true, data: { reversalJournalId: crypto.randomUUID() } };
    }
    const supabase = await getServerSupabaseForOrg(parsed.orgId, "journals.reverse");
    const { data, error } = await supabase.rpc("kd_reverse_journal_entry", {
      p_org_id: parsed.orgId,
      p_journal_entry_id: parsed.journalId,
      p_reversal_date: parsed.reversalDate,
      p_reason: parsed.reason,
      p_idempotency_key: parsed.idempotencyKey,
    });
    if (error) throw error;
    revalidateOrgPaths(parsed.orgId, ["/journals", `/journals/${parsed.journalId}`]);
    return {
      success: true,
      data: { reversalJournalId: Array.isArray(data) ? data[0]?.journal_id : data?.journal_id },
    };
  } catch (error) {
    return { success: false, error: parseActionError(error) };
  }
}
