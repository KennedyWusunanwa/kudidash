export type AccountType =
  | "asset"
  | "liability"
  | "equity"
  | "income"
  | "expense";

export type AccountSubType =
  | "bank"
  | "cash"
  | "accounts_receivable"
  | "inventory"
  | "fixed_asset"
  | "accounts_payable"
  | "tax"
  | "equity"
  | "sales"
  | "cost_of_sales"
  | "operating_expense"
  | "other";

export type JournalStatus = "draft" | "approved" | "posted" | "voided";

export type Role = "owner" | "admin" | "accountant" | "approver" | "viewer";

export type InvoiceStatus = "draft" | "approved" | "posted" | "paid" | "voided";

export type BillStatus = "draft" | "approved" | "posted" | "paid" | "voided";

export interface BaseOrgScopedRecord {
  id: string;
  org_id: string;
  created_at: string;
  updated_at: string;
}

export interface Account extends BaseOrgScopedRecord {
  code: string;
  name: string;
  type: AccountType;
  sub_type: AccountSubType;
  currency_code: string;
  is_active: boolean;
  is_system: boolean;
}

export interface JournalLine {
  id?: string;
  account_id: string;
  description?: string | null;
  debit: number;
  credit: number;
  line_no?: number;
}

export interface JournalEntry extends BaseOrgScopedRecord {
  journal_no: string | null;
  entry_date: string;
  memo: string | null;
  reference: string | null;
  status: JournalStatus;
  approved_at: string | null;
  posted_at: string | null;
  source_module: string | null;
  source_id: string | null;
  reversal_of_journal_id: string | null;
  reversed_by_journal_id: string | null;
  lines?: JournalLine[];
}

export interface InvoiceLine {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  revenue_account_id: string;
  tax_amount?: number;
}

export interface Invoice extends BaseOrgScopedRecord {
  invoice_no: string | null;
  customer_id: string;
  invoice_date: string;
  due_date: string;
  currency_code: string;
  status: InvoiceStatus;
  tax_rate?: number;
  subtotal: number;
  tax_total: number;
  total: number;
  amount_paid?: number;
  paid_at?: string | null;
}

export interface BillLine {
  id?: string;
  description: string;
  quantity: number;
  unit_cost: number;
  expense_account_id: string;
  tax_amount?: number;
}

export interface Bill extends BaseOrgScopedRecord {
  bill_no: string | null;
  vendor_id: string;
  bill_date: string;
  due_date: string;
  currency_code: string;
  status: BillStatus;
  subtotal: number;
  tax_total: number;
  total: number;
}

export interface TrialBalanceRow {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: AccountType;
  debit: number;
  credit: number;
  balance: number;
}

export interface PnlRow {
  account_id: string;
  account_code: string;
  account_name: string;
  category: "income" | "expense";
  amount: number;
}

export interface BalanceSheetRow {
  account_id: string;
  account_code: string;
  account_name: string;
  category: "asset" | "liability" | "equity";
  amount: number;
}
