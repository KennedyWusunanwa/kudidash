"use server";

import { z } from "zod";
import { isDemoMode } from "@/lib/env";
import { calculateInvoiceLineAmounts, normalizeTaxRate } from "@/lib/accounting/tax";
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

type InvoiceLineInput = z.infer<typeof invoiceSchema>["lines"][number];

function buildComputedInvoiceLines(lines: InvoiceLineInput[], taxRate: number) {
  return lines.map((line) => {
    const amounts = calculateInvoiceLineAmounts(
      { quantity: line.quantity, unit_price: line.unit_price },
      taxRate
    );

    return {
      ...line,
      base_amount: amounts.baseAmount,
      tax_amount: amounts.taxAmount,
      line_total: amounts.lineTotal,
    };
  });
}

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
    const [
      { data: orgRow, error: orgError },
      { data: accountSettings, error: accountSettingsError },
    ] = await Promise.all([
      supabase.from("organizations").select("base_currency").eq("id", parsed.orgId).single(),
      supabase
        .from("org_account_settings")
        .select("sales_tax_rate")
        .eq("org_id", parsed.orgId)
        .maybeSingle(),
    ]);
    if (orgError) throw orgError;
    if (accountSettingsError) throw accountSettingsError;
    const orgBaseCurrency =
      typeof orgRow?.base_currency === "string" && orgRow.base_currency.trim()
        ? orgRow.base_currency.trim().toUpperCase()
        : parsed.currency_code.toUpperCase();
    const invoiceTaxRate = normalizeTaxRate(accountSettings?.sales_tax_rate);

    const customerPayload = {
      name: parsed.customer_name,
      email: parsed.customer_email || null,
      phone: parsed.customer_phone || null,
      billing_address: parsed.customer_billing_address || null,
      description: parsed.customer_description || null,
      is_active: true,
    };

    let customerId: string;
    let customerTaxId: string | null = null;
    if (parsed.customer_id === "__new__") {
      const { data: createdCustomer, error: customerError } = await supabase
        .from("customers")
        .insert({
          org_id: parsed.orgId,
          ...customerPayload,
        })
        .select("id, tax_id")
        .single();
      if (customerError) throw customerError;
      customerId = String(createdCustomer.id);
      customerTaxId =
        typeof createdCustomer.tax_id === "string" ? createdCustomer.tax_id : null;
    } else {
      const { data: existingCustomer, error: customerError } = await supabase
        .from("customers")
        .select("id, tax_id")
        .eq("org_id", parsed.orgId)
        .eq("id", parsed.customer_id)
        .single();
      if (customerError) throw customerError;
      customerId = String(existingCustomer.id);
      customerTaxId =
        typeof existingCustomer.tax_id === "string" ? existingCustomer.tax_id : null;
    }

    const computedLines = buildComputedInvoiceLines(parsed.lines, invoiceTaxRate);
    const subtotal = Number(
      computedLines.reduce((sum, line) => sum + line.base_amount, 0).toFixed(2)
    );
    const tax_total = Number(
      computedLines.reduce((sum, line) => sum + line.tax_amount, 0).toFixed(2)
    );
    const total = Number((subtotal + tax_total).toFixed(2));

    const { data: invoice, error: headerError } = await supabase
      .from("invoices")
      .insert({
        org_id: parsed.orgId,
        customer_id: customerId,
        customer_name: parsed.customer_name,
        customer_email: parsed.customer_email || null,
        customer_phone: parsed.customer_phone || null,
        customer_billing_address: parsed.customer_billing_address || null,
        customer_tax_id: customerTaxId,
        customer_description: parsed.customer_description || null,
        invoice_date: parsed.invoice_date,
        due_date: parsed.due_date,
        currency_code: orgBaseCurrency,
        notes: parsed.notes || null,
        tax_rate: invoiceTaxRate,
        subtotal,
        tax_total,
        total,
        status: "draft",
      })
      .select("id")
      .single();
    if (headerError) throw headerError;

    const lines = computedLines.map((line, index) => ({
      org_id: parsed.orgId,
      invoice_id: invoice.id,
      line_no: index + 1,
      description: line.description,
      quantity: line.quantity,
      unit_price: line.unit_price,
      inventory_item_id: line.inventory_item_id || null,
      revenue_account_id: line.revenue_account_id,
      tax_amount: line.tax_amount,
      line_total: line.line_total,
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

    const supabase = await getServerSupabaseForOrg(parsed.orgId, "sales.manage");

    const [
      { data: existingInvoice, error: existingInvoiceError },
      { data: orgRow, error: orgError },
      { data: accountSettings, error: accountSettingsError },
    ] = await Promise.all([
      supabase
        .from("invoices")
        .select("id, status, customer_id, tax_rate")
        .eq("org_id", parsed.orgId)
        .eq("id", parsed.invoiceId)
        .single(),
      supabase.from("organizations").select("base_currency").eq("id", parsed.orgId).single(),
      supabase
        .from("org_account_settings")
        .select("sales_tax_rate")
        .eq("org_id", parsed.orgId)
        .maybeSingle(),
    ]);
    if (existingInvoiceError) throw existingInvoiceError;
    if (orgError) throw orgError;
    if (accountSettingsError) throw accountSettingsError;

    const currentStatus = String(existingInvoice.status ?? "draft").toLowerCase();
    if (!["draft", "approved"].includes(currentStatus)) {
      return {
        success: false,
        error: "Only draft/approved invoices can be edited. Posted invoices must remain unchanged.",
      };
    }

    const orgBaseCurrency =
      typeof orgRow?.base_currency === "string" && orgRow.base_currency.trim()
        ? orgRow.base_currency.trim().toUpperCase()
        : parsed.currency_code.toUpperCase();
    const invoiceTaxRate = normalizeTaxRate(
      existingInvoice.tax_rate ?? accountSettings?.sales_tax_rate
    );

    const customerPayload = {
      name: parsed.customer_name,
      email: parsed.customer_email || null,
      phone: parsed.customer_phone || null,
      billing_address: parsed.customer_billing_address || null,
      description: parsed.customer_description || null,
      is_active: true,
    };

    let customerId: string;
    let customerTaxId: string | null = null;
    if (parsed.customer_id === "__new__") {
      const { data: createdCustomer, error: customerError } = await supabase
        .from("customers")
        .insert({
          org_id: parsed.orgId,
          ...customerPayload,
        })
        .select("id, tax_id")
        .single();
      if (customerError) throw customerError;
      customerId = String(createdCustomer.id);
      customerTaxId =
        typeof createdCustomer.tax_id === "string" ? createdCustomer.tax_id : null;
    } else {
      const { data: existingCustomer, error: customerError } = await supabase
        .from("customers")
        .select("id, tax_id")
        .eq("org_id", parsed.orgId)
        .eq("id", parsed.customer_id)
        .single();
      if (customerError) throw customerError;
      customerId = String(existingCustomer.id);
      customerTaxId =
        typeof existingCustomer.tax_id === "string" ? existingCustomer.tax_id : null;
    }

    const computedLines = buildComputedInvoiceLines(parsed.lines, invoiceTaxRate);
    const subtotal = Number(
      computedLines.reduce((sum, line) => sum + line.base_amount, 0).toFixed(2)
    );
    const tax_total = Number(
      computedLines.reduce((sum, line) => sum + line.tax_amount, 0).toFixed(2)
    );
    const total = Number((subtotal + tax_total).toFixed(2));

    const { error: deleteLinesError } = await supabase
      .from("invoice_lines")
      .delete()
      .eq("org_id", parsed.orgId)
      .eq("invoice_id", parsed.invoiceId);
    if (deleteLinesError) throw deleteLinesError;

    const lines = computedLines.map((line, index) => ({
      org_id: parsed.orgId,
      invoice_id: parsed.invoiceId,
      line_no: index + 1,
      description: line.description,
      quantity: line.quantity,
      unit_price: line.unit_price,
      inventory_item_id: line.inventory_item_id || null,
      revenue_account_id: line.revenue_account_id,
      tax_amount: line.tax_amount,
      line_total: line.line_total,
    }));
    const { error: lineError } = await supabase.from("invoice_lines").insert(lines);
    if (lineError) throw lineError;

    const { error: invoiceUpdateError } = await supabase
      .from("invoices")
      .update({
        customer_id: customerId,
        customer_name: parsed.customer_name,
        customer_email: parsed.customer_email || null,
        customer_phone: parsed.customer_phone || null,
        customer_billing_address: parsed.customer_billing_address || null,
        customer_tax_id: customerTaxId,
        customer_description: parsed.customer_description || null,
        invoice_date: parsed.invoice_date,
        due_date: parsed.due_date,
        currency_code: orgBaseCurrency,
        notes: parsed.notes || null,
        tax_rate: invoiceTaxRate,
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
