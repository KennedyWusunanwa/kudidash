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

function buildReceiptNumber(date = new Date()) {
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, "");
  const timePart = date.toISOString().slice(11, 19).replace(/:/g, "");
  return `RCT-${datePart}-${timePart}`;
}

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
    const [{ data: invoice, error: invoiceError }, { data: customer, error: customerError }] =
      await Promise.all([
        supabase
          .from("invoices")
          .select("id, invoice_no, customer_id, total, amount_paid, status, currency_code")
          .eq("org_id", parsed.orgId)
          .eq("id", parsed.invoice_id)
          .single(),
        supabase
          .from("customers")
          .select("id, name, email")
          .eq("org_id", parsed.orgId)
          .eq("id", parsed.customer_id)
          .single(),
      ]);

    if (invoiceError) throw invoiceError;
    if (customerError) throw customerError;

    if (String(invoice.customer_id) !== parsed.customer_id) {
      throw new Error("The selected invoice does not belong to this customer.");
    }

    const invoiceStatus = String(invoice.status ?? "").toLowerCase();
    if (!["posted", "paid"].includes(invoiceStatus)) {
      throw new Error("Only posted invoices can be marked as paid.");
    }

    const total = Number(invoice.total ?? 0);
    const currentPaid = Number(invoice.amount_paid ?? 0);
    const outstanding = Number((total - currentPaid).toFixed(2));
    if (outstanding <= 0) {
      throw new Error("This invoice is already fully paid.");
    }

    if (parsed.amount > Number((outstanding + 0.009).toFixed(2))) {
      throw new Error(`Receipt amount exceeds outstanding balance of ${outstanding.toFixed(2)}.`);
    }

    const nowIso = new Date().toISOString();
    const receiptNo = buildReceiptNumber(new Date(nowIso));
    const normalizedCurrency =
      (parsed.currency_code || String(invoice.currency_code ?? "GHS")).trim().toUpperCase() ||
      "GHS";

    const { data: receipt, error: receiptError } = await supabase
      .from("receipts")
      .insert({
        org_id: parsed.orgId,
        customer_id: parsed.customer_id,
        customer_name: customer.name,
        customer_email: customer.email,
        receipt_no: receiptNo,
        receipt_date: parsed.receipt_date,
        amount: parsed.amount,
        currency_code: normalizedCurrency,
        reference: parsed.reference || null,
        payment_method: parsed.payment_method || null,
        notes: parsed.notes || null,
        status: "verified",
        verified_at: nowIso,
      })
      .select("id, public_view_token")
      .single();
    if (receiptError) throw receiptError;

    const { error: allocationError } = await supabase.from("receipt_allocations").insert({
      org_id: parsed.orgId,
      receipt_id: receipt.id,
      invoice_id: parsed.invoice_id,
      amount_allocated: parsed.amount,
    });
    if (allocationError) throw allocationError;

    const nextAmountPaid = Number((currentPaid + parsed.amount).toFixed(2));
    const isFullyPaid = nextAmountPaid + 0.009 >= total;
    const { error: invoiceUpdateError } = await supabase
      .from("invoices")
      .update({
        amount_paid: nextAmountPaid,
        status: isFullyPaid ? "paid" : "posted",
        paid_at: isFullyPaid ? nowIso : null,
      })
      .eq("org_id", parsed.orgId)
      .eq("id", parsed.invoice_id);
    if (invoiceUpdateError) throw invoiceUpdateError;

    revalidateOrgPaths(parsed.orgId, [
      "/invoices",
      `/invoices/${parsed.invoice_id}`,
      `/invoices/${parsed.invoice_id}/edit`,
      "/customers",
      `/customers/${parsed.customer_id}`,
      "/dashboard",
      "/reports",
    ]);

    return {
      success: true,
      data: {
        receiptId: String(receipt.id),
        publicViewToken:
          typeof receipt.public_view_token === "string" ? receipt.public_view_token : undefined,
      },
    };
  } catch (error) {
    return { success: false, error: parseActionError(error) };
  }
}
