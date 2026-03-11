import { formatISO, startOfMonth } from "date-fns";
import {
  getDemoBalanceSheet,
  demoCustomers,
  demoInvoices,
  getDemoDashboardKpis,
  getDemoMonthlyPerformance,
  getDemoPnl,
  getDemoTrialBalance,
} from "@/lib/demo/data";
import { isDemoMode } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CsvCell = string | number | null | undefined;
type CsvRow = Record<string, CsvCell>;

function customerMapFromRows(rows: Array<Record<string, unknown>>) {
  return new Map(
    rows.map((row) => [
      String(row.id ?? ""),
      {
        name: typeof row.name === "string" ? row.name : "",
        email: typeof row.email === "string" ? row.email : "",
        phone: typeof row.phone === "string" ? row.phone : "",
        billing_address: typeof row.billing_address === "string" ? row.billing_address : "",
        description: typeof row.description === "string" ? row.description : "",
      },
    ])
  );
}

function buildCustomerTransactionRows(params: {
  customers: Array<Record<string, unknown>>;
  invoices: Array<Record<string, unknown>>;
  receipts: Array<Record<string, unknown>>;
}) {
  const customerById = customerMapFromRows(params.customers);
  const invoiceRows: CsvRow[] = params.invoices.map((invoice) => {
    const customerId = String(invoice.customer_id ?? "");
    const customer = customerById.get(customerId);
    return {
      transaction_type: "invoice",
      transaction_id: String(invoice.id ?? ""),
      document_no: String(invoice.invoice_no ?? invoice.id ?? ""),
      transaction_date: String(invoice.invoice_date ?? ""),
      due_date: String(invoice.due_date ?? ""),
      status: String(invoice.status ?? ""),
      currency_code: String(invoice.currency_code ?? ""),
      amount: Number(invoice.total ?? 0),
      subtotal: Number(invoice.subtotal ?? 0),
      tax_total: Number(invoice.tax_total ?? 0),
      reference: null,
      customer_id: customerId,
      customer_name:
        typeof invoice.customer_name === "string" ? invoice.customer_name : customer?.name ?? "",
      customer_email:
        typeof invoice.customer_email === "string" ? invoice.customer_email : customer?.email ?? "",
      customer_phone:
        typeof invoice.customer_phone === "string" ? invoice.customer_phone : customer?.phone ?? "",
      customer_billing_address:
        typeof invoice.customer_billing_address === "string"
          ? invoice.customer_billing_address
          : customer?.billing_address ?? "",
      customer_description:
        typeof invoice.customer_description === "string"
          ? invoice.customer_description
          : customer?.description ?? "",
    };
  });

  const receiptRows: CsvRow[] = params.receipts.map((receipt) => {
    const customerId = String(receipt.customer_id ?? "");
    const customer = customerById.get(customerId);
    return {
      transaction_type: "receipt",
      transaction_id: String(receipt.id ?? ""),
      document_no: String(receipt.receipt_no ?? receipt.id ?? ""),
      transaction_date: String(receipt.receipt_date ?? ""),
      due_date: null,
      status: String(receipt.status ?? ""),
      currency_code: String(receipt.currency_code ?? ""),
      amount: Number(receipt.amount ?? 0),
      subtotal: null,
      tax_total: null,
      reference: String(receipt.reference ?? ""),
      customer_id: customerId,
      customer_name:
        typeof receipt.customer_name === "string" ? receipt.customer_name : customer?.name ?? "",
      customer_email:
        typeof receipt.customer_email === "string" ? receipt.customer_email : customer?.email ?? "",
      customer_phone: customer?.phone ?? "",
      customer_billing_address: customer?.billing_address ?? "",
      customer_description: customer?.description ?? "",
    };
  });

  return [...invoiceRows, ...receiptRows].sort((a, b) => {
    const dateCompare = String(b.transaction_date ?? "").localeCompare(String(a.transaction_date ?? ""));
    if (dateCompare !== 0) return dateCompare;
    return String(a.document_no ?? "").localeCompare(String(b.document_no ?? ""));
  });
}

function summarizeCustomerTransactions(rows: CsvRow[]) {
  const byCustomer = new Map<string, CsvRow>();

  for (const row of rows) {
    const customerId = String(row.customer_id ?? "");
    const key = customerId || "__unknown__";
    const current = byCustomer.get(key) ?? {
      customer_id: customerId,
      customer_name: row.customer_name ?? "",
      customer_email: row.customer_email ?? "",
      customer_phone: row.customer_phone ?? "",
      customer_billing_address: row.customer_billing_address ?? "",
      customer_description: row.customer_description ?? "",
      invoice_count: 0,
      invoice_total: 0,
      receipt_count: 0,
      receipt_total: 0,
      total_transactions: 0,
      net_balance: 0,
    };

    const amount = Number(row.amount ?? 0);
    current.total_transactions = Number(current.total_transactions ?? 0) + 1;
    if (row.transaction_type === "invoice") {
      current.invoice_count = Number(current.invoice_count ?? 0) + 1;
      current.invoice_total = Number(current.invoice_total ?? 0) + amount;
      current.net_balance = Number(current.net_balance ?? 0) + amount;
    } else if (row.transaction_type === "receipt") {
      current.receipt_count = Number(current.receipt_count ?? 0) + 1;
      current.receipt_total = Number(current.receipt_total ?? 0) + amount;
      current.net_balance = Number(current.net_balance ?? 0) - amount;
    }

    byCustomer.set(key, current);
  }

  return [...byCustomer.values()]
    .map((row): CsvRow => ({
      ...row,
      invoice_total: Number(Number(row.invoice_total ?? 0).toFixed(2)),
      receipt_total: Number(Number(row.receipt_total ?? 0).toFixed(2)),
      net_balance: Number(Number(row.net_balance ?? 0).toFixed(2)),
    }))
    .sort((a, b) => String(a.customer_name ?? "").localeCompare(String(b.customer_name ?? "")));
}

export function summarizeCustomerTransactionRows(
  rows: Array<Record<string, string | number | null | undefined>>
) {
  return summarizeCustomerTransactions(rows as CsvRow[]);
}

export async function getDashboardKpis(orgId: string, asOf = new Date()) {
  if (isDemoMode()) {
    return getDemoDashboardKpis();
  }

  const supabase = createSupabaseServerClient();
  const monthStart = formatISO(startOfMonth(asOf), { representation: "date" });
  const asOfDate = formatISO(asOf, { representation: "date" });

  const { data, error } = await supabase.rpc("kd_dashboard_kpis", {
    p_org_id: orgId,
    p_start_date: monthStart,
    p_end_date: asOfDate,
  });

  if (error) {
    return {
      cash: 0,
      revenue_mtd: 0,
      expenses_mtd: 0,
      ar: 0,
      ap: 0,
      note: "Dashboard KPI RPC unavailable; using zeros.",
    };
  }

  return Array.isArray(data) ? (data[0] ?? {}) : data;
}

export async function getRevenueExpenseSeries(orgId: string, months = 6) {
  if (isDemoMode()) {
    return getDemoMonthlyPerformance().slice(-Math.max(months, 1));
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("kd_monthly_performance", {
    p_org_id: orgId,
    p_months: months,
  });
  if (error) return [];
  return data ?? [];
}

export async function getTrialBalance(orgId: string, endDate: string) {
  if (isDemoMode()) {
    return getDemoTrialBalance();
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("kd_trial_balance", {
    p_org_id: orgId,
    p_end_date: endDate,
  });
  if (error) throw error;
  return data ?? [];
}

export async function getProfitAndLoss(
  orgId: string,
  startDate: string,
  endDate: string
) {
  if (isDemoMode()) {
    return getDemoPnl();
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("kd_profit_and_loss", {
    p_org_id: orgId,
    p_start_date: startDate,
    p_end_date: endDate,
  });
  if (error) throw error;
  return data ?? [];
}

export async function getBalanceSheet(orgId: string, endDate: string) {
  if (isDemoMode()) {
    return getDemoBalanceSheet();
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("kd_balance_sheet", {
    p_org_id: orgId,
    p_end_date: endDate,
  });
  if (error) throw error;
  return data ?? [];
}

export async function getCustomerTransactionRows(
  orgId: string,
  startDate: string,
  endDate: string
) {
  if (isDemoMode()) {
    const demoInvoiceRows = demoInvoices
      .filter((row) => String(row.invoice_date) >= startDate && String(row.invoice_date) <= endDate)
      .map((row) => ({ ...row })) as Array<Record<string, unknown>>;
    return buildCustomerTransactionRows({
      customers: demoCustomers.map((row) => ({ ...row })) as Array<Record<string, unknown>>,
      invoices: demoInvoiceRows,
      receipts: [],
    });
  }

  const supabase = createSupabaseServerClient();
  const [customersResult, invoicesResult, receiptsResult] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, email, phone, billing_address, description")
      .eq("org_id", orgId)
      .order("name", { ascending: true }),
    supabase
      .from("invoices")
      .select(
        "id, customer_id, customer_name, customer_email, customer_phone, customer_billing_address, customer_description, invoice_no, invoice_date, due_date, status, currency_code, subtotal, tax_total, total"
      )
      .eq("org_id", orgId)
      .gte("invoice_date", startDate)
      .lte("invoice_date", endDate)
      .order("invoice_date", { ascending: false }),
    supabase
      .from("receipts")
      .select(
        "id, customer_id, customer_name, customer_email, receipt_no, receipt_date, status, currency_code, amount, reference"
      )
      .eq("org_id", orgId)
      .gte("receipt_date", startDate)
      .lte("receipt_date", endDate)
      .order("receipt_date", { ascending: false }),
  ]);

  if (customersResult.error) throw customersResult.error;
  if (invoicesResult.error) throw invoicesResult.error;

  const receipts = receiptsResult.error ? [] : (receiptsResult.data ?? []);
  return buildCustomerTransactionRows({
    customers: (customersResult.data ?? []) as Array<Record<string, unknown>>,
    invoices: (invoicesResult.data ?? []) as Array<Record<string, unknown>>,
    receipts: receipts as Array<Record<string, unknown>>,
  });
}

export async function getCustomerTransactionSummary(
  orgId: string,
  startDate: string,
  endDate: string
) {
  const rows = await getCustomerTransactionRows(orgId, startDate, endDate);
  return summarizeCustomerTransactionRows(rows as Array<Record<string, CsvCell>>);
}
