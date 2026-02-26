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
const updateInvoiceSchema = invoiceSchema.extend({
  orgId: z.string().uuid(),
  invoiceId: z.string().uuid(),
});
const postSchema = postInvoiceSchema.extend({ orgId: z.string().uuid() });
const deleteInvoiceSchema = z.object({
  orgId: z.string().uuid(),
  invoiceId: z.string().uuid(),
});

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

    const customerPayload = {
      name: parsed.customer_name,
      email: parsed.customer_email || null,
      phone: parsed.customer_phone || null,
      billing_address: parsed.customer_billing_address || null,
      description: parsed.customer_description || null,
      is_active: true,
    };

    let customerId: string;
    if (parsed.customer_id === "__new__") {
      const { data: createdCustomer, error: customerError } = await supabase
        .from("customers")
        .insert({
          org_id: parsed.orgId,
          ...customerPayload,
        })
        .select("id")
        .single();
      if (customerError) throw customerError;
      customerId = String(createdCustomer.id);
    } else {
      const { data: updatedCustomer, error: customerError } = await supabase
        .from("customers")
        .update(customerPayload)
        .eq("org_id", parsed.orgId)
        .eq("id", parsed.customer_id)
        .select("id")
        .single();
      if (customerError) throw customerError;
      customerId = String(updatedCustomer.id);
    }

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
        customer_id: customerId,
        invoice_date: parsed.invoice_date,
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

    revalidateOrgPaths(parsed.orgId, ["/invoices", "/invoices/new", "/dashboard"]);
    return { success: true, data: { invoiceId: invoice.id as string } };
  } catch (error) {
    return { success: false, error: parseActionError(error) };
  }
}

export async function updateDraftInvoiceAction(
  input: z.infer<typeof updateInvoiceSchema>
): Promise<ActionResult> {
  try {
    const parsed = updateInvoiceSchema.parse(input);
    if (isDemoMode()) {
      revalidateOrgPaths(parsed.orgId, [
        "/invoices",
        `/invoices/${parsed.invoiceId}`,
        `/invoices/${parsed.invoiceId}/edit`,
        "/invoices/new",
        "/dashboard",
        "/reports",
        "/customers",
      ]);
      return { success: true };
    }

    const supabase = await getServerSupabaseForOrg(parsed.orgId, "org.manage");

    const { data: existingInvoice, error: existingInvoiceError } = await supabase
      .from("invoices")
      .select("id, status, customer_id")
      .eq("org_id", parsed.orgId)
      .eq("id", parsed.invoiceId)
      .single();
    if (existingInvoiceError) throw existingInvoiceError;

    const currentStatus = String(existingInvoice.status ?? "draft").toLowerCase();
    if (!["draft", "approved"].includes(currentStatus)) {
      return {
        success: false,
        error: "Only draft/approved invoices can be edited. Posted invoices must remain unchanged.",
      };
    }

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

    const customerPayload = {
      name: parsed.customer_name,
      email: parsed.customer_email || null,
      phone: parsed.customer_phone || null,
      billing_address: parsed.customer_billing_address || null,
      description: parsed.customer_description || null,
      is_active: true,
    };

    let customerId: string;
    if (parsed.customer_id === "__new__") {
      const { data: createdCustomer, error: customerError } = await supabase
        .from("customers")
        .insert({
          org_id: parsed.orgId,
          ...customerPayload,
        })
        .select("id")
        .single();
      if (customerError) throw customerError;
      customerId = String(createdCustomer.id);
    } else {
      const { data: updatedCustomer, error: customerError } = await supabase
        .from("customers")
        .update(customerPayload)
        .eq("org_id", parsed.orgId)
        .eq("id", parsed.customer_id)
        .select("id")
        .single();
      if (customerError) throw customerError;
      customerId = String(updatedCustomer.id);
    }

    const subtotal = Number(
      parsed.lines.reduce((sum, line) => sum + line.quantity * line.unit_price, 0).toFixed(2)
    );
    const tax_total = Number(
      parsed.lines.reduce((sum, line) => sum + (line.tax_amount ?? 0), 0).toFixed(2)
    );
    const total = Number((subtotal + tax_total).toFixed(2));

    const { error: deleteLinesError } = await supabase
      .from("invoice_lines")
      .delete()
      .eq("org_id", parsed.orgId)
      .eq("invoice_id", parsed.invoiceId);
    if (deleteLinesError) throw deleteLinesError;

    const lines = parsed.lines.map((line, index) => ({
      org_id: parsed.orgId,
      invoice_id: parsed.invoiceId,
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

    const { error: invoiceUpdateError } = await supabase
      .from("invoices")
      .update({
        customer_id: customerId,
        invoice_date: parsed.invoice_date,
        due_date: parsed.due_date,
        currency_code: orgBaseCurrency,
        notes: parsed.notes || null,
        subtotal,
        tax_total,
        total,
      })
      .eq("org_id", parsed.orgId)
      .eq("id", parsed.invoiceId);
    if (invoiceUpdateError) throw invoiceUpdateError;

    const relatedCustomerPaths = Array.from(
      new Set(
        [existingInvoice.customer_id, customerId]
          .filter((value): value is string => typeof value === "string" && value.length > 0)
          .map((id) => `/customers/${id}`)
      )
    );

    revalidateOrgPaths(parsed.orgId, [
      "/invoices",
      `/invoices/${parsed.invoiceId}`,
      `/invoices/${parsed.invoiceId}/edit`,
      "/invoices/new",
      "/dashboard",
      "/reports",
      "/customers",
      ...relatedCustomerPaths,
    ]);
    return { success: true };
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

export async function deleteInvoiceAction(
  input: z.infer<typeof deleteInvoiceSchema>
): Promise<ActionResult> {
  try {
    const parsed = deleteInvoiceSchema.parse(input);
    if (isDemoMode()) {
      revalidateOrgPaths(parsed.orgId, [
        "/invoices",
        `/invoices/${parsed.invoiceId}`,
        `/invoices/${parsed.invoiceId}/edit`,
        "/dashboard",
        "/reports",
        "/customers",
      ]);
      return { success: true };
    }

    const supabase = await getServerSupabaseForOrg(parsed.orgId, "org.manage");

    const { data: existingInvoice, error: invoiceLookupError } = await supabase
      .from("invoices")
      .select("id, status, customer_id")
      .eq("org_id", parsed.orgId)
      .eq("id", parsed.invoiceId)
      .single();
    if (invoiceLookupError) throw invoiceLookupError;

    const currentStatus = String(existingInvoice.status ?? "draft").toLowerCase();
    if (!["draft", "approved"].includes(currentStatus)) {
      return {
        success: false,
        error: "Only draft/approved invoices can be deleted. Posted invoices must remain in history.",
      };
    }

    const { count: allocationCount, error: allocationCountError } = await supabase
      .from("receipt_allocations")
      .select("id", { count: "exact", head: true })
      .eq("org_id", parsed.orgId)
      .eq("invoice_id", parsed.invoiceId);
    if (allocationCountError) throw allocationCountError;
    if ((allocationCount ?? 0) > 0) {
      return {
        success: false,
        error: "This invoice has receipt allocations and cannot be deleted.",
      };
    }

    const { error } = await supabase
      .from("invoices")
      .delete()
      .eq("org_id", parsed.orgId)
      .eq("id", parsed.invoiceId);
    if (error) throw error;

    const customerId =
      typeof existingInvoice.customer_id === "string" ? existingInvoice.customer_id : null;
    revalidateOrgPaths(parsed.orgId, [
      "/invoices",
      `/invoices/${parsed.invoiceId}`,
      `/invoices/${parsed.invoiceId}/edit`,
      "/dashboard",
      "/reports",
      "/customers",
      ...(customerId ? [`/customers/${customerId}`] : []),
    ]);
    return { success: true };
  } catch (error) {
    return { success: false, error: parseActionError(error) };
  }
}
