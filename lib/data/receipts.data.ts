import { isDemoMode } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AnyRow = Record<string, unknown>;

function buildCustomerSnapshot(source: AnyRow | null | undefined, fallback?: AnyRow | null) {
  if (!source && !fallback) return null;

  return {
    id:
      typeof source?.id === "string"
        ? source.id
        : typeof fallback?.id === "string"
          ? fallback.id
          : "",
    name:
      typeof source?.customer_name === "string"
        ? source.customer_name
        : typeof source?.name === "string"
          ? source.name
          : typeof fallback?.name === "string"
            ? fallback.name
            : null,
    email:
      typeof source?.customer_email === "string"
        ? source.customer_email
        : typeof source?.email === "string"
          ? source.email
          : typeof fallback?.email === "string"
            ? fallback.email
            : null,
    phone:
      typeof source?.customer_phone === "string"
        ? source.customer_phone
        : typeof source?.phone === "string"
          ? source.phone
          : typeof fallback?.phone === "string"
            ? fallback.phone
            : null,
    billing_address:
      typeof source?.customer_billing_address === "string"
        ? source.customer_billing_address
        : typeof source?.billing_address === "string"
          ? source.billing_address
          : typeof fallback?.billing_address === "string"
            ? fallback.billing_address
            : null,
    tax_id:
      typeof source?.customer_tax_id === "string"
        ? source.customer_tax_id
        : typeof source?.tax_id === "string"
          ? source.tax_id
          : typeof fallback?.tax_id === "string"
            ? fallback.tax_id
            : null,
  };
}

export async function listInvoiceReceipts(orgId: string, invoiceId: string) {
  if (isDemoMode()) {
    return [] as Array<Record<string, unknown>>;
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("receipt_allocations")
    .select(
      "amount_allocated, created_at, receipt:receipt_id(id, receipt_no, receipt_date, amount, currency_code, reference, payment_method, status, public_view_token)"
    )
    .eq("org_id", orgId)
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => {
    const receipt = Array.isArray((row as AnyRow).receipt)
      ? ((row as AnyRow).receipt as AnyRow[])[0]
      : ((row as AnyRow).receipt as AnyRow | null);
    return {
      amount_allocated: Number((row as AnyRow).amount_allocated ?? 0),
      created_at: String((row as AnyRow).created_at ?? ""),
      receipt: receipt
        ? {
            id: String(receipt.id ?? ""),
            receipt_no: typeof receipt.receipt_no === "string" ? receipt.receipt_no : null,
            receipt_date: String(receipt.receipt_date ?? ""),
            amount: Number(receipt.amount ?? 0),
            currency_code: String(receipt.currency_code ?? "USD"),
            reference: typeof receipt.reference === "string" ? receipt.reference : null,
            payment_method:
              typeof receipt.payment_method === "string" ? receipt.payment_method : null,
            status: String(receipt.status ?? "verified"),
            public_view_token:
              typeof receipt.public_view_token === "string" ? receipt.public_view_token : null,
          }
        : null,
    };
  });
}

export async function getReceiptById(orgId: string, receiptId: string) {
  if (isDemoMode()) {
    return null;
  }

  const supabase = createSupabaseServerClient();
  const { data: receipt, error: receiptError } = await supabase
    .from("receipts")
    .select("*")
    .eq("org_id", orgId)
    .eq("id", receiptId)
    .single();
  if (receiptError) throw receiptError;

  const [customerResult, allocationsResult] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, email, phone, billing_address, tax_id")
      .eq("org_id", orgId)
      .eq("id", String(receipt.customer_id ?? ""))
      .maybeSingle(),
    supabase
      .from("receipt_allocations")
      .select("amount_allocated, invoice:invoice_id(id, invoice_no, invoice_date, due_date, total, currency_code, public_view_token)")
      .eq("org_id", orgId)
      .eq("receipt_id", receiptId),
  ]);

  if (customerResult.error) throw customerResult.error;
  if (allocationsResult.error) throw allocationsResult.error;

  return {
    ...(receipt as AnyRow),
    customer: buildCustomerSnapshot(receipt as AnyRow, (customerResult.data ?? null) as AnyRow | null),
    allocations: (allocationsResult.data ?? []).map((row) => {
      const invoice = Array.isArray((row as AnyRow).invoice)
        ? ((row as AnyRow).invoice as AnyRow[])[0]
        : ((row as AnyRow).invoice as AnyRow | null);
      return {
        amount_allocated: Number((row as AnyRow).amount_allocated ?? 0),
        invoice: invoice
          ? {
              id: String(invoice.id ?? ""),
              invoice_no: typeof invoice.invoice_no === "string" ? invoice.invoice_no : null,
              invoice_date: String(invoice.invoice_date ?? ""),
              due_date: String(invoice.due_date ?? ""),
              total: Number(invoice.total ?? 0),
              currency_code: String(invoice.currency_code ?? "USD"),
              public_view_token:
                typeof invoice.public_view_token === "string" ? invoice.public_view_token : null,
            }
          : null,
      };
    }),
  };
}

export async function getPublicInvoiceDocumentByToken(token: string) {
  const supabase = createSupabaseAdminClient();
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("*, invoice_lines(*)")
    .eq("public_view_token", token)
    .maybeSingle();
  if (invoiceError) throw invoiceError;
  if (!invoice) return null;

  const [{ data: org, error: orgError }, { data: customer, error: customerError }] =
    await Promise.all([
      supabase.from("organizations").select("*").eq("id", String(invoice.org_id)).maybeSingle(),
      supabase
        .from("customers")
        .select("id, name, email, phone, billing_address, tax_id")
        .eq("org_id", String(invoice.org_id))
        .eq("id", String(invoice.customer_id))
        .maybeSingle(),
    ]);

  if (orgError) throw orgError;
  if (customerError) throw customerError;

  return {
    invoice,
    org,
    customer: buildCustomerSnapshot(invoice as AnyRow, (customer ?? null) as AnyRow | null),
  };
}

export async function getPublicReceiptDocumentByToken(token: string) {
  const supabase = createSupabaseAdminClient();
  const { data: receipt, error: receiptError } = await supabase
    .from("receipts")
    .select("*")
    .eq("public_view_token", token)
    .maybeSingle();
  if (receiptError) throw receiptError;
  if (!receipt) return null;

  const [{ data: org, error: orgError }, customerResult, allocationsResult] = await Promise.all([
    supabase.from("organizations").select("*").eq("id", String(receipt.org_id)).maybeSingle(),
    supabase
      .from("customers")
      .select("id, name, email, phone, billing_address, tax_id")
      .eq("org_id", String(receipt.org_id))
      .eq("id", String(receipt.customer_id))
      .maybeSingle(),
    supabase
      .from("receipt_allocations")
      .select("amount_allocated, invoice:invoice_id(id, invoice_no, invoice_date, due_date, total, currency_code)")
      .eq("org_id", String(receipt.org_id))
      .eq("receipt_id", String(receipt.id)),
  ]);

  if (orgError) throw orgError;
  if (customerResult.error) throw customerResult.error;
  if (allocationsResult.error) throw allocationsResult.error;

  return {
    receipt,
    org,
    customer: buildCustomerSnapshot(receipt as AnyRow, (customerResult.data ?? null) as AnyRow | null),
    allocations: (allocationsResult.data ?? []).map((row) => {
      const invoice = Array.isArray((row as AnyRow).invoice)
        ? ((row as AnyRow).invoice as AnyRow[])[0]
        : ((row as AnyRow).invoice as AnyRow | null);
      return {
        amount_allocated: Number((row as AnyRow).amount_allocated ?? 0),
        invoice: invoice
          ? {
              id: String(invoice.id ?? ""),
              invoice_no: typeof invoice.invoice_no === "string" ? invoice.invoice_no : null,
              invoice_date: String(invoice.invoice_date ?? ""),
              due_date: String(invoice.due_date ?? ""),
              total: Number(invoice.total ?? 0),
              currency_code: String(invoice.currency_code ?? "USD"),
            }
          : null,
      };
    }),
  };
}
