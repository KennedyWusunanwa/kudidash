import { demoCustomers, demoInvoices } from "@/lib/demo/data";
import { getInvoiceDisplayNumber } from "@/lib/accounting/invoice-number";
import { isDemoMode } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AnyRow = Record<string, unknown>;

export interface CustomerSummaryRow {
  id: string;
  org_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  billing_address: string | null;
  tax_id: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
  invoice_count: number;
  invoice_total: number;
  receipt_count: number;
  receipt_total: number;
  outstanding_balance: number;
  last_activity_at: string | null;
}

export interface CustomerInvoiceRow {
  id: string;
  invoice_no: string | null;
  invoice_date: string;
  due_date: string;
  status: string;
  currency_code: string;
  subtotal: number;
  tax_total: number;
  total: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface CustomerReceiptRow {
  id: string;
  receipt_no: string | null;
  receipt_date: string;
  status: string;
  currency_code: string;
  amount: number;
  reference: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CustomerActivityItem {
  id: string;
  kind: "profile" | "invoice" | "receipt";
  activity_date: string;
  title: string;
  description: string | null;
  amount: number | null;
  currency_code: string | null;
  status: string | null;
  href: string | null;
}

export interface CustomerProfileData {
  customer: CustomerSummaryRow;
  invoices: CustomerInvoiceRow[];
  receipts: CustomerReceiptRow[];
  activities: CustomerActivityItem[];
}

function isoMax(...values: Array<string | null | undefined>) {
  const valid = values.filter((value): value is string => Boolean(value));
  if (!valid.length) return null;
  return [...valid].sort((a, b) => b.localeCompare(a))[0] ?? null;
}

function toCustomerSummaryRow(
  customer: AnyRow,
  invoices: CustomerInvoiceRow[],
  receipts: CustomerReceiptRow[]
): CustomerSummaryRow {
  const invoiceCount = invoices.length;
  const invoiceTotal = Number(
    invoices.reduce((sum, row) => sum + Number(row.total ?? 0), 0).toFixed(2)
  );
  const receiptCount = receipts.length;
  const receiptTotal = Number(
    receipts.reduce((sum, row) => sum + Number(row.amount ?? 0), 0).toFixed(2)
  );
  const outstandingBalance = Number((invoiceTotal - receiptTotal).toFixed(2));

  const latestInvoiceActivity = invoices.reduce<string | null>(
    (current, row) => isoMax(current, row.invoice_date, row.updated_at),
    null
  );
  const latestReceiptActivity = receipts.reduce<string | null>(
    (current, row) => isoMax(current, row.receipt_date, row.updated_at),
    null
  );

  return {
    id: String(customer.id ?? ""),
    org_id: String(customer.org_id ?? ""),
    name: String(customer.name ?? ""),
    email: typeof customer.email === "string" ? customer.email : null,
    phone: typeof customer.phone === "string" ? customer.phone : null,
    billing_address:
      typeof customer.billing_address === "string" ? customer.billing_address : null,
    tax_id: typeof customer.tax_id === "string" ? customer.tax_id : null,
    description: typeof customer.description === "string" ? customer.description : null,
    is_active: customer.is_active !== false,
    created_at: typeof customer.created_at === "string" ? customer.created_at : null,
    updated_at: typeof customer.updated_at === "string" ? customer.updated_at : null,
    invoice_count: invoiceCount,
    invoice_total: invoiceTotal,
    receipt_count: receiptCount,
    receipt_total: receiptTotal,
    outstanding_balance: outstandingBalance,
    last_activity_at: isoMax(
      typeof customer.updated_at === "string" ? customer.updated_at : null,
      typeof customer.created_at === "string" ? customer.created_at : null,
      latestInvoiceActivity,
      latestReceiptActivity
    ),
  };
}

function mapInvoiceRow(row: AnyRow): CustomerInvoiceRow {
  return {
    id: String(row.id ?? ""),
    invoice_no: typeof row.invoice_no === "string" ? row.invoice_no : null,
    invoice_date: String(row.invoice_date ?? ""),
    due_date: String(row.due_date ?? ""),
    status: String(row.status ?? "draft"),
    currency_code: String(row.currency_code ?? "USD"),
    subtotal: Number(row.subtotal ?? 0),
    tax_total: Number(row.tax_total ?? 0),
    total: Number(row.total ?? 0),
    created_at: typeof row.created_at === "string" ? row.created_at : null,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : null,
  };
}

function mapReceiptRow(row: AnyRow): CustomerReceiptRow {
  return {
    id: String(row.id ?? ""),
    receipt_no: typeof row.receipt_no === "string" ? row.receipt_no : null,
    receipt_date: String(row.receipt_date ?? ""),
    status: String(row.status ?? "draft"),
    currency_code: String(row.currency_code ?? "USD"),
    amount: Number(row.amount ?? 0),
    reference: typeof row.reference === "string" ? row.reference : null,
    created_at: typeof row.created_at === "string" ? row.created_at : null,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : null,
  };
}

function buildCustomerActivities(params: {
  orgId: string;
  customer: CustomerSummaryRow;
  invoices: CustomerInvoiceRow[];
  receipts: CustomerReceiptRow[];
}) {
  const items: CustomerActivityItem[] = [];
  const { orgId, customer, invoices, receipts } = params;

  if (customer.created_at) {
    items.push({
      id: `profile-created-${customer.id}`,
      kind: "profile",
      activity_date: customer.created_at,
      title: "Customer profile created",
      description: customer.description || null,
      amount: null,
      currency_code: null,
      status: customer.is_active ? "active" : "inactive",
      href: null,
    });
  }

  if (customer.updated_at && customer.updated_at !== customer.created_at) {
    items.push({
      id: `profile-updated-${customer.id}`,
      kind: "profile",
      activity_date: customer.updated_at,
      title: "Customer profile updated",
      description: "Customer details were updated.",
      amount: null,
      currency_code: null,
      status: customer.is_active ? "active" : "inactive",
      href: null,
    });
  }

  for (const invoice of invoices) {
    items.push({
      id: `invoice-${invoice.id}`,
      kind: "invoice",
      activity_date: invoice.invoice_date || invoice.created_at || "",
      title: `Invoice ${getInvoiceDisplayNumber(invoice.invoice_no, invoice.id)}`,
      description: `Status: ${invoice.status}`,
      amount: invoice.total,
      currency_code: invoice.currency_code,
      status: invoice.status,
      href: `/${orgId}/invoices/${invoice.id}`,
    });
  }

  for (const receipt of receipts) {
    items.push({
      id: `receipt-${receipt.id}`,
      kind: "receipt",
      activity_date: receipt.receipt_date || receipt.created_at || "",
      title: `Receipt ${receipt.receipt_no ?? receipt.id.slice(0, 8)}`,
      description: receipt.reference || "Customer receipt recorded",
      amount: receipt.amount,
      currency_code: receipt.currency_code,
      status: receipt.status,
      href: null,
    });
  }

  return items.sort((a, b) => {
    const dateCompare = String(b.activity_date ?? "").localeCompare(String(a.activity_date ?? ""));
    if (dateCompare !== 0) return dateCompare;
    return a.title.localeCompare(b.title);
  });
}

async function listReceiptsForOrg(orgId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("receipts")
    .select(
      "id, org_id, customer_id, receipt_no, receipt_date, status, currency_code, amount, reference, created_at, updated_at"
    )
    .eq("org_id", orgId)
    .order("receipt_date", { ascending: false });

  if (error) {
    // Receipts UI may not be fully configured in some deployments; keep Customers pages usable.
    console.error("listReceiptsForOrg failed", error);
    return [] as AnyRow[];
  }

  return (data ?? []) as AnyRow[];
}

export async function listCustomersWithSummary(orgId: string): Promise<CustomerSummaryRow[]> {
  if (isDemoMode()) {
    const customers = demoCustomers.map((row) => ({ ...row, org_id: orgId })) as AnyRow[];
    const invoices = demoInvoices
      .filter((row) => String(row.org_id ?? orgId) === orgId)
      .map((row) => ({ ...row })) as AnyRow[];

    return customers
      .map((customer) => {
        const customerInvoices = invoices
          .filter((invoice) => String(invoice.customer_id ?? "") === String(customer.id ?? ""))
          .map(mapInvoiceRow);
        return toCustomerSummaryRow(customer, customerInvoices, []);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  const supabase = createSupabaseServerClient();
  const [customersResult, invoicesResult, receiptRows] = await Promise.all([
    supabase
      .from("customers")
      .select("*")
      .eq("org_id", orgId)
      .order("name", { ascending: true }),
    supabase
      .from("invoices")
      .select(
        "id, org_id, customer_id, invoice_no, invoice_date, due_date, status, currency_code, subtotal, tax_total, total, created_at, updated_at"
      )
      .eq("org_id", orgId)
      .order("invoice_date", { ascending: false }),
    listReceiptsForOrg(orgId),
  ]);

  if (customersResult.error) throw customersResult.error;
  if (invoicesResult.error) throw invoicesResult.error;

  const invoices = (invoicesResult.data ?? []) as AnyRow[];
  const receipts = receiptRows as AnyRow[];

  return ((customersResult.data ?? []) as AnyRow[])
    .map((customer) => {
      const customerId = String(customer.id ?? "");
      const customerInvoices = invoices
        .filter((invoice) => String(invoice.customer_id ?? "") === customerId)
        .map(mapInvoiceRow);
      const customerReceipts = receipts
        .filter((receipt) => String(receipt.customer_id ?? "") === customerId)
        .map(mapReceiptRow);
      return toCustomerSummaryRow(customer, customerInvoices, customerReceipts);
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getCustomerProfile(
  orgId: string,
  customerId: string
): Promise<CustomerProfileData | null> {
  if (isDemoMode()) {
    const customerRow = demoCustomers.find((row) => row.id === customerId);
    if (!customerRow) return null;

    const customer = toCustomerSummaryRow(
      { ...customerRow, org_id: orgId },
      demoInvoices
        .filter((row) => row.customer_id === customerId)
        .map((row) => mapInvoiceRow({ ...row })),
      []
    );

    const invoices = demoInvoices
      .filter((row) => row.customer_id === customerId)
      .map((row) => mapInvoiceRow({ ...row }))
      .sort((a, b) => b.invoice_date.localeCompare(a.invoice_date));
    const receipts: CustomerReceiptRow[] = [];

    return {
      customer,
      invoices,
      receipts,
      activities: buildCustomerActivities({ orgId, customer, invoices, receipts }),
    };
  }

  const supabase = createSupabaseServerClient();
  const [customerResult, invoicesResult, receiptsRows] = await Promise.all([
    supabase
      .from("customers")
      .select("*")
      .eq("org_id", orgId)
      .eq("id", customerId)
      .maybeSingle(),
    supabase
      .from("invoices")
      .select(
        "id, customer_id, invoice_no, invoice_date, due_date, status, currency_code, subtotal, tax_total, total, created_at, updated_at"
      )
      .eq("org_id", orgId)
      .eq("customer_id", customerId)
      .order("invoice_date", { ascending: false })
      .order("created_at", { ascending: false }),
    listReceiptsForOrg(orgId),
  ]);

  if (customerResult.error) throw customerResult.error;
  if (invoicesResult.error) throw invoicesResult.error;
  if (!customerResult.data) return null;

  const invoices = ((invoicesResult.data ?? []) as AnyRow[]).map(mapInvoiceRow);
  const receipts = (receiptsRows as AnyRow[])
    .filter((row) => String(row.customer_id ?? "") === customerId)
    .map(mapReceiptRow)
    .sort((a, b) => b.receipt_date.localeCompare(a.receipt_date));

  const customer = toCustomerSummaryRow(
    customerResult.data as AnyRow,
    invoices,
    receipts
  );

  return {
    customer,
    invoices,
    receipts,
    activities: buildCustomerActivities({ orgId, customer, invoices, receipts }),
  };
}
