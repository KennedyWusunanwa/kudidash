"use server";

import { z } from "zod";
import { isDemoMode } from "@/lib/env";
import {
  ActionResult,
  getServerSupabaseForOrg,
  parseActionError,
  revalidateOrgPaths,
} from "@/lib/actions/_helpers";
import { parseBasicCsv } from "@/lib/accounting/csv";

const bankAccountSchema = z.object({
  orgId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  account_number_masked: z.string().trim().max(32).optional().or(z.literal("")),
  currency_code: z.string().length(3).default("GHS"),
  gl_account_id: z.string().uuid(),
});

const csvImportSchema = z.object({
  orgId: z.string().uuid(),
  bank_account_id: z.string().uuid(),
  csvText: z.string().min(1),
});

const startReconciliationSchema = z.object({
  orgId: z.string().uuid(),
  bank_account_id: z.string().uuid(),
  statement_start_date: z.string().date(),
  statement_end_date: z.string().date(),
  statement_ending_balance: z.coerce.number().finite(),
});

const matchTransactionSchema = z.object({
  orgId: z.string().uuid(),
  reconciliation_session_id: z.string().uuid(),
  bank_transaction_id: z.string().uuid(),
  journal_line_id: z.string().uuid().optional(),
  invoice_id: z.string().uuid().optional(),
  bill_id: z.string().uuid().optional(),
  match_amount: z.coerce.number().finite().positive(),
});

export async function createBankAccountAction(
  input: z.infer<typeof bankAccountSchema>
): Promise<ActionResult> {
  try {
    const parsed = bankAccountSchema.parse(input);
    if (isDemoMode()) {
      revalidateOrgPaths(parsed.orgId, ["/banking/reconciliation", "/settings"]);
      return { success: true };
    }
    const supabase = await getServerSupabaseForOrg(parsed.orgId, "banking.manage");
    const { error } = await supabase.from("bank_accounts").insert({
      org_id: parsed.orgId,
      name: parsed.name,
      account_number_masked: parsed.account_number_masked || null,
      currency_code: parsed.currency_code.toUpperCase(),
      gl_account_id: parsed.gl_account_id,
    });
    if (error) throw error;
    revalidateOrgPaths(parsed.orgId, ["/banking/reconciliation", "/settings"]);
    return { success: true };
  } catch (error) {
    return { success: false, error: parseActionError(error) };
  }
}

export async function importBankTransactionsCsvAction(
  input: z.infer<typeof csvImportSchema>
): Promise<ActionResult<{ imported: number }>> {
  try {
    const parsed = csvImportSchema.parse(input);
    const rows = parseBasicCsv(parsed.csvText);
    if (rows.length < 2) throw new Error("CSV must include headers and at least one row.");

    const [headers, ...dataRows] = rows;
    const index = (name: string) =>
      headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());

    // UNSPECIFIED: CSV format. Expected headers: date, description, amount, reference(optional).
    const dateIdx = index("date");
    const descIdx = index("description");
    const amountIdx = index("amount");
    const refIdx = index("reference");

    if (dateIdx < 0 || descIdx < 0 || amountIdx < 0) {
      throw new Error("CSV headers must include date, description, amount.");
    }

    if (isDemoMode()) {
      revalidateOrgPaths(parsed.orgId, ["/banking/reconciliation"]);
      return { success: true, data: { imported: dataRows.length } };
    }

    const supabase = await getServerSupabaseForOrg(parsed.orgId, "banking.manage");
    const payload = dataRows.map((row) => ({
      org_id: parsed.orgId,
      bank_account_id: parsed.bank_account_id,
      transaction_date: row[dateIdx],
      description: row[descIdx],
      amount: Number(row[amountIdx]),
      reference: refIdx >= 0 ? row[refIdx] || null : null,
      source: "csv_import",
      match_status: "unmatched",
    }));

    const { error } = await supabase.from("bank_transactions").insert(payload);
    if (error) throw error;
    revalidateOrgPaths(parsed.orgId, ["/banking/reconciliation"]);
    return { success: true, data: { imported: payload.length } };
  } catch (error) {
    return { success: false, error: parseActionError(error) };
  }
}

export async function startReconciliationAction(
  input: z.infer<typeof startReconciliationSchema>
): Promise<ActionResult<{ sessionId: string }>> {
  try {
    const parsed = startReconciliationSchema.parse(input);
    if (isDemoMode()) {
      revalidateOrgPaths(parsed.orgId, ["/banking/reconciliation"]);
      return { success: true, data: { sessionId: crypto.randomUUID() } };
    }
    const supabase = await getServerSupabaseForOrg(parsed.orgId, "banking.manage");
    const { data, error } = await supabase
      .from("bank_reconciliation_sessions")
      .insert({
        org_id: parsed.orgId,
        bank_account_id: parsed.bank_account_id,
        statement_start_date: parsed.statement_start_date,
        statement_end_date: parsed.statement_end_date,
        statement_ending_balance: parsed.statement_ending_balance,
        status: "open",
      })
      .select("id")
      .single();
    if (error) throw error;
    revalidateOrgPaths(parsed.orgId, ["/banking/reconciliation"]);
    return { success: true, data: { sessionId: data.id as string } };
  } catch (error) {
    return { success: false, error: parseActionError(error) };
  }
}

export async function matchTransactionAction(
  input: z.infer<typeof matchTransactionSchema>
): Promise<ActionResult> {
  try {
    const parsed = matchTransactionSchema.parse(input);
    if (isDemoMode()) {
      revalidateOrgPaths(parsed.orgId, ["/banking/reconciliation"]);
      return { success: true };
    }
    const supabase = await getServerSupabaseForOrg(parsed.orgId, "banking.manage");
    const { error } = await supabase.from("bank_reconciliation_matches").insert({
      org_id: parsed.orgId,
      reconciliation_session_id: parsed.reconciliation_session_id,
      bank_transaction_id: parsed.bank_transaction_id,
      journal_line_id: parsed.journal_line_id ?? null,
      invoice_id: parsed.invoice_id ?? null,
      bill_id: parsed.bill_id ?? null,
      match_amount: parsed.match_amount,
      match_status: "matched",
      // UNSPECIFIED: matching confidence/scoring algorithm
    });
    if (error) throw error;

    await supabase
      .from("bank_transactions")
      .update({ match_status: "matched" })
      .eq("org_id", parsed.orgId)
      .eq("id", parsed.bank_transaction_id);

    revalidateOrgPaths(parsed.orgId, ["/banking/reconciliation"]);
    return { success: true };
  } catch (error) {
    return { success: false, error: parseActionError(error) };
  }
}
