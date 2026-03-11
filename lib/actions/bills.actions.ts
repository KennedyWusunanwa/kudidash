"use server";

import { z } from "zod";
import { isDemoMode } from "@/lib/env";
import {
  ActionResult,
  getServerSupabaseForOrg,
  parseActionError,
  revalidateOrgPaths,
} from "@/lib/actions/_helpers";
import { billSchema, postBillSchema } from "@/lib/validators/bill";

const createBillSchema = billSchema.extend({ orgId: z.string().uuid() });
const postSchema = postBillSchema.extend({ orgId: z.string().uuid() });

export async function createDraftBillAction(
  input: z.infer<typeof createBillSchema>
): Promise<ActionResult<{ billId: string }>> {
  try {
    const parsed = createBillSchema.parse(input);
    if (isDemoMode()) {
      revalidateOrgPaths(parsed.orgId, ["/bills", "/dashboard"]);
      return { success: true, data: { billId: crypto.randomUUID() } };
    }
    const supabase = await getServerSupabaseForOrg(parsed.orgId, "purchases.manage");
    const { data: orgRow, error: orgError } = await supabase
      .from("organizations")
      .select("base_currency")
      .eq("id", parsed.orgId)
      .single();
    if (orgError) throw orgError;
    const orgBaseCurrency =
      typeof orgRow?.base_currency === "string" && orgRow.base_currency.trim()
        ? orgRow.base_currency.trim().toUpperCase()
        : parsed.currency_code.toUpperCase();

    const subtotal = Number(
      parsed.lines.reduce((sum, line) => sum + line.quantity * line.unit_cost, 0).toFixed(2)
    );
    const tax_total = Number(
      parsed.lines.reduce((sum, line) => sum + (line.tax_amount ?? 0), 0).toFixed(2)
    );
    const total = Number((subtotal + tax_total).toFixed(2));

    const { data: bill, error: headerError } = await supabase
      .from("bills")
      .insert({
        org_id: parsed.orgId,
        vendor_id: parsed.vendor_id,
        bill_date: parsed.bill_date,
        due_date: parsed.due_date,
        currency_code: orgBaseCurrency,
        notes: parsed.notes || null,
        subtotal,
        tax_total,
        total,
        status: "draft",
      })
      .select("id")
      .single();
    if (headerError) throw headerError;

    const lines = parsed.lines.map((line, index) => ({
      org_id: parsed.orgId,
      bill_id: bill.id,
      line_no: index + 1,
      description: line.description,
      quantity: line.quantity,
      unit_cost: line.unit_cost,
      inventory_item_id: line.inventory_item_id || null,
      expense_account_id: line.expense_account_id,
      tax_amount: line.tax_amount ?? 0,
      line_total: Number((line.quantity * line.unit_cost + (line.tax_amount ?? 0)).toFixed(2)),
    }));
    const { error: lineError } = await supabase.from("bill_lines").insert(lines);
    if (lineError) throw lineError;

    revalidateOrgPaths(parsed.orgId, ["/bills", "/dashboard"]);
    return { success: true, data: { billId: bill.id as string } };
  } catch (error) {
    return { success: false, error: parseActionError(error) };
  }
}

export async function postBillAction(
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
      revalidateOrgPaths(parsed.orgId, ["/bills", `/bills/${parsed.billId}`, "/dashboard"]);
      return { success: true };
    }
    const supabase = await getServerSupabaseForOrg(parsed.orgId, "purchases.manage");
    const { error } = await supabase.rpc("kd_post_bill", {
      p_org_id: parsed.orgId,
      p_bill_id: parsed.billId,
      p_idempotency_key: parsed.idempotencyKey,
    });
    if (error) throw error;
    revalidateOrgPaths(parsed.orgId, ["/bills", `/bills/${parsed.billId}`, "/dashboard"]);
    return { success: true };
  } catch (error) {
    return { success: false, error: parseActionError(error) };
  }
}
