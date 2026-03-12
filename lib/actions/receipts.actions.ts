"use server";

import { z } from "zod";
import { isDemoMode } from "@/lib/env";
import {
  ActionResult,
  getServerSupabaseForOrg,
  parseActionError,
  revalidateOrgPaths,
} from "@/lib/actions/_helpers";
import { verifyReceiptSchema } from "@/lib/validators/receipt";

const verifyInvoiceReceiptInputSchema = verifyReceiptSchema.extend({
  orgId: z.string().uuid(),
});

export async function verifyInvoiceReceiptAction(
  input: z.infer<typeof verifyInvoiceReceiptInputSchema>
): Promise<ActionResult<{ receiptId: string; publicViewToken?: string }>> {
  try {
    const parsed = verifyInvoiceReceiptInputSchema.parse(input);

    if (isDemoMode()) {
      revalidateOrgPaths(parsed.orgId, [
        "/invoices",
        `/invoices/${parsed.invoice_id}`,
        "/customers",
        `/customers/${parsed.customer_id}`,
        "/dashboard",
        "/reports",
      ]);
      return {
        success: true,
        data: { receiptId: crypto.randomUUID(), publicViewToken: crypto.randomUUID() },
      };
    }

    const supabase = await getServerSupabaseForOrg(parsed.orgId, "sales.manage");
    const normalizedCurrency =
      (parsed.currency_code || "GHS").trim().toUpperCase() || "GHS";

    const { data, error } = await supabase.rpc("kd_verify_invoice_receipt", {
      p_org_id: parsed.orgId,
      p_invoice_id: parsed.invoice_id,
      p_customer_id: parsed.customer_id,
      p_receipt_date: parsed.receipt_date,
      p_amount: parsed.amount,
      p_currency_code: normalizedCurrency,
      p_payment_method: parsed.payment_method || null,
      p_reference: parsed.reference || null,
      p_notes: parsed.notes || null,
      p_idempotency_key: crypto.randomUUID(),
    });
    if (error) throw error;

    const receipt = Array.isArray(data) ? data[0] : data;
    if (!receipt || typeof receipt !== "object") {
      throw new Error("Receipt verification did not return a receipt.");
    }

    revalidateOrgPaths(parsed.orgId, [
      "/invoices",
      `/invoices/${parsed.invoice_id}`,
      `/invoices/${parsed.invoice_id}/edit`,
      "/customers",
      `/customers/${parsed.customer_id}`,
      "/dashboard",
      "/reports",
      "/journals",
    ]);

    return {
      success: true,
      data: {
        receiptId: String((receipt as { receipt_id?: unknown }).receipt_id ?? ""),
        publicViewToken:
          typeof (receipt as { public_view_token?: unknown }).public_view_token === "string"
            ? (receipt as { public_view_token: string }).public_view_token
            : undefined,
      },
    };
  } catch (error) {
    return { success: false, error: parseActionError(error) };
  }
}
