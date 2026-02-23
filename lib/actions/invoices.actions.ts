"use server";

import { z } from "zod";
import { isDemoMode } from "@/lib/env";
import {
  ActionResult,
  getServerSupabaseForOrg,
  parseActionError,
  revalidateOrgPaths,
} from "@/lib/actions/_helpers";
import { invoiceSchema, postInvoiceSchema } from "@/lib/validators/invoice";

const createInvoiceSchema = invoiceSchema.extend({ orgId: z.string().uuid() });
const postSchema = postInvoiceSchema.extend({ orgId: z.string().uuid() });

export async function createDraftInvoiceAction(
  input: z.infer<typeof createInvoiceSchema>
): Promise<ActionResult<{ invoiceId: string }>> {
  try {
    const parsed = createInvoiceSchema.parse(input);
    if (isDemoMode()) {
      revalidateOrgPaths(parsed.orgId, ["/invoices", "/dashboard"]);
      return { success: true, data: { invoiceId: crypto.randomUUID() } };
    }
    const supabase = await getServerSupabaseForOrg(parsed.orgId, "sales.manage");

    const subtotal = Number(
      parsed.lines.reduce((sum, line) => sum + line.quantity * line.unit_price, 0).toFixed(2)
    );
    const tax_total = Number(
      parsed.lines.reduce((sum, line) => sum + (line.tax_amount ?? 0), 0).toFixed(2)
    );
    const total = Number((subtotal + tax_total).toFixed(2));

    const { data: invoice, error: headerError } = await supabase
      .from("invoices")
      .insert({
        org_id: parsed.orgId,
        customer_id: parsed.customer_id,
        invoice_date: parsed.invoice_date,
        due_date: parsed.due_date,
        currency_code: parsed.currency_code.toUpperCase(),
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
      invoice_id: invoice.id,
      line_no: index + 1,
      description: line.description,
      quantity: line.quantity,
      unit_price: line.unit_price,
      revenue_account_id: line.revenue_account_id,
      tax_amount: line.tax_amount ?? 0,
      line_total: Number((line.quantity * line.unit_price + (line.tax_amount ?? 0)).toFixed(2)),
    }));
    const { error: lineError } = await supabase.from("invoice_lines").insert(lines);
    if (lineError) throw lineError;

    revalidateOrgPaths(parsed.orgId, ["/invoices", "/dashboard"]);
    return { success: true, data: { invoiceId: invoice.id as string } };
  } catch (error) {
    return { success: false, error: parseActionError(error) };
  }
}

export async function postInvoiceAction(
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
      revalidateOrgPaths(parsed.orgId, ["/invoices", `/invoices/${parsed.invoiceId}`, "/dashboard"]);
      return { success: true };
    }
    const supabase = await getServerSupabaseForOrg(parsed.orgId, "sales.manage");
    const { error } = await supabase.rpc("kd_post_invoice", {
      p_org_id: parsed.orgId,
      p_invoice_id: parsed.invoiceId,
      p_idempotency_key: parsed.idempotencyKey,
    });
    if (error) throw error;
    revalidateOrgPaths(parsed.orgId, ["/invoices", `/invoices/${parsed.invoiceId}`, "/dashboard"]);
    return { success: true };
  } catch (error) {
    return { success: false, error: parseActionError(error) };
  }
}
