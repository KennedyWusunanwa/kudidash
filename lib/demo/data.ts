import type { Role } from "@/types/accounting";

export const DEMO_ORG_ID = "11111111-1111-4111-8111-111111111111";
export const DEMO_USER_ID = "22222222-2222-4222-8222-222222222222";

const NOW = "2026-02-23T12:00:00.000Z";
const TODAY = "2026-02-23";

const ACCOUNT_IDS = {
  cash: "30000000-0000-4000-8000-000000000001",
  bank: "30000000-0000-4000-8000-000000000002",
  ar: "30000000-0000-4000-8000-000000000003",
  ap: "30000000-0000-4000-8000-000000000004",
  revenue: "30000000-0000-4000-8000-000000000005",
  expense: "30000000-0000-4000-8000-000000000006",
  retained: "30000000-0000-4000-8000-000000000007",
} as const;

const CUSTOMER_IDS = {
  acme: "40000000-0000-4000-8000-000000000001",
  beta: "40000000-0000-4000-8000-000000000002",
} as const;

const VENDOR_IDS = {
  officehub: "50000000-0000-4000-8000-000000000001",
  utilico: "50000000-0000-4000-8000-000000000002",
} as const;

const JOURNAL_IDS = {
  draft: "60000000-0000-4000-8000-000000000001",
  approved: "60000000-0000-4000-8000-000000000002",
  posted: "60000000-0000-4000-8000-000000000003",
  reversal: "60000000-0000-4000-8000-000000000004",
} as const;

const INVOICE_IDS = {
  draft: "70000000-0000-4000-8000-000000000001",
  posted: "70000000-0000-4000-8000-000000000002",
} as const;

const BILL_IDS = {
  draft: "80000000-0000-4000-8000-000000000001",
  posted: "80000000-0000-4000-8000-000000000002",
} as const;

const BANK_IDS = {
  main: "90000000-0000-4000-8000-000000000001",
  txn1: "90000000-0000-4000-8000-000000000011",
  txn2: "90000000-0000-4000-8000-000000000012",
  recon1: "90000000-0000-4000-8000-000000000021",
} as const;

export const demoUser = {
  id: DEMO_USER_ID,
  email: "demo@kudidash.local",
  user_metadata: { full_name: "Demo Owner" },
};

export const demoSession = {
  user: demoUser,
  access_token: "demo-access-token",
  refresh_token: "demo-refresh-token",
} as const;

export const demoOrganization = {
  id: DEMO_ORG_ID,
  name: "KudiDash Demo Ventures",
  slug: "kudidash-demo",
  base_currency: "GHS",
  fiscal_year_start_month: 1,
  is_active: true,
  created_at: NOW,
  updated_at: NOW,
};

export const demoOrgMembership = {
  org_id: DEMO_ORG_ID,
  user_id: DEMO_USER_ID,
  role: "owner" as Role,
  is_active: true,
  created_at: NOW,
  updated_at: NOW,
};

export const demoOrgMembers = [
  {
    org_id: DEMO_ORG_ID,
    user_id: DEMO_USER_ID,
    role: "owner",
    is_active: true,
    email: "demo@kudidash.local",
    full_name: "Demo Owner",
  },
  {
    org_id: DEMO_ORG_ID,
    user_id: "22222222-2222-4222-8222-222222222223",
    role: "accountant",
    is_active: true,
    email: "accountant@kudidash.local",
    full_name: "Demo Accountant",
  },
];

export const demoOrgAccountSettings = {
  org_id: DEMO_ORG_ID,
  ar_account_id: ACCOUNT_IDS.ar,
  ap_account_id: ACCOUNT_IDS.ap,
  cash_account_id: ACCOUNT_IDS.cash,
  bank_account_id: ACCOUNT_IDS.bank,
  retained_earnings_account_id: ACCOUNT_IDS.retained,
  revenue_default_account_id: ACCOUNT_IDS.revenue,
  expense_default_account_id: ACCOUNT_IDS.expense,
  created_at: NOW,
  updated_at: NOW,
};

export const demoAccounts = [
  {
    id: ACCOUNT_IDS.cash,
    org_id: DEMO_ORG_ID,
    code: "1000",
    name: "Cash on Hand",
    type: "asset",
    sub_type: "cash",
    currency_code: "GHS",
    is_active: true,
    is_system: true,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: ACCOUNT_IDS.bank,
    org_id: DEMO_ORG_ID,
    code: "1010",
    name: "Bank - Main GHS",
    type: "asset",
    sub_type: "bank",
    currency_code: "GHS",
    is_active: true,
    is_system: true,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: ACCOUNT_IDS.ar,
    org_id: DEMO_ORG_ID,
    code: "1100",
    name: "Accounts Receivable",
    type: "asset",
    sub_type: "accounts_receivable",
    currency_code: "GHS",
    is_active: true,
    is_system: true,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: ACCOUNT_IDS.ap,
    org_id: DEMO_ORG_ID,
    code: "2000",
    name: "Accounts Payable",
    type: "liability",
    sub_type: "accounts_payable",
    currency_code: "GHS",
    is_active: true,
    is_system: true,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: ACCOUNT_IDS.revenue,
    org_id: DEMO_ORG_ID,
    code: "4000",
    name: "Service Revenue",
    type: "income",
    sub_type: "sales",
    currency_code: "GHS",
    is_active: true,
    is_system: false,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: ACCOUNT_IDS.expense,
    org_id: DEMO_ORG_ID,
    code: "5000",
    name: "Office Expenses",
    type: "expense",
    sub_type: "operating_expense",
    currency_code: "GHS",
    is_active: true,
    is_system: false,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: ACCOUNT_IDS.retained,
    org_id: DEMO_ORG_ID,
    code: "3000",
    name: "Retained Earnings",
    type: "equity",
    sub_type: "equity",
    currency_code: "GHS",
    is_active: true,
    is_system: true,
    created_at: NOW,
    updated_at: NOW,
  },
];

export const demoCustomers = [
  {
    id: CUSTOMER_IDS.acme,
    org_id: DEMO_ORG_ID,
    name: "Acme Retail Ltd",
    email: "finance@acme.example",
    is_active: true,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: CUSTOMER_IDS.beta,
    org_id: DEMO_ORG_ID,
    name: "Beta Manufacturing",
    email: "ap@beta.example",
    is_active: true,
    created_at: NOW,
    updated_at: NOW,
  },
];

export const demoVendors = [
  {
    id: VENDOR_IDS.officehub,
    org_id: DEMO_ORG_ID,
    name: "OfficeHub Supplies",
    email: "billing@officehub.example",
    is_active: true,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: VENDOR_IDS.utilico,
    org_id: DEMO_ORG_ID,
    name: "UtiliCo Power",
    email: "collections@utilico.example",
    is_active: true,
    created_at: NOW,
    updated_at: NOW,
  },
];

export const demoJournals = [
  {
    id: JOURNAL_IDS.draft,
    org_id: DEMO_ORG_ID,
    journal_no: null,
    entry_date: "2026-02-20",
    memo: "Accrual for professional fees",
    reference: "JV-DEMO-001",
    status: "draft",
    source_module: "manual_journal",
    source_id: null,
    approved_at: null,
    posted_at: null,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: JOURNAL_IDS.approved,
    org_id: DEMO_ORG_ID,
    journal_no: null,
    entry_date: "2026-02-21",
    memo: "Accrual approved - pending post",
    reference: "JV-DEMO-002",
    status: "approved",
    source_module: "manual_journal",
    source_id: null,
    approved_at: NOW,
    posted_at: null,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: JOURNAL_IDS.posted,
    org_id: DEMO_ORG_ID,
    journal_no: "JV-20260223-120000-DEMO01",
    entry_date: "2026-02-18",
    memo: "Record consulting income receipt",
    reference: "JV-DEMO-003",
    status: "posted",
    source_module: "manual_journal",
    source_id: null,
    approved_at: NOW,
    posted_at: NOW,
    created_at: NOW,
    updated_at: NOW,
  },
];

const demoJournalLinesById: Record<string, Array<Record<string, unknown>>> = {
  [JOURNAL_IDS.draft]: [
    {
      id: "61000000-0000-4000-8000-000000000001",
      org_id: DEMO_ORG_ID,
      journal_entry_id: JOURNAL_IDS.draft,
      line_no: 1,
      account_id: ACCOUNT_IDS.expense,
      description: "Professional fees accrual",
      debit: 1200,
      credit: 0,
    },
    {
      id: "61000000-0000-4000-8000-000000000002",
      org_id: DEMO_ORG_ID,
      journal_entry_id: JOURNAL_IDS.draft,
      line_no: 2,
      account_id: ACCOUNT_IDS.ap,
      description: "Accrued payable",
      debit: 0,
      credit: 1200,
    },
  ],
  [JOURNAL_IDS.approved]: [
    {
      id: "61000000-0000-4000-8000-000000000003",
      org_id: DEMO_ORG_ID,
      journal_entry_id: JOURNAL_IDS.approved,
      line_no: 1,
      account_id: ACCOUNT_IDS.expense,
      description: "Utilities accrual",
      debit: 540,
      credit: 0,
    },
    {
      id: "61000000-0000-4000-8000-000000000004",
      org_id: DEMO_ORG_ID,
      journal_entry_id: JOURNAL_IDS.approved,
      line_no: 2,
      account_id: ACCOUNT_IDS.ap,
      description: "Utilities payable",
      debit: 0,
      credit: 540,
    },
  ],
  [JOURNAL_IDS.posted]: [
    {
      id: "61000000-0000-4000-8000-000000000005",
      org_id: DEMO_ORG_ID,
      journal_entry_id: JOURNAL_IDS.posted,
      line_no: 1,
      account_id: ACCOUNT_IDS.bank,
      description: "Cash receipt",
      debit: 3500,
      credit: 0,
    },
    {
      id: "61000000-0000-4000-8000-000000000006",
      org_id: DEMO_ORG_ID,
      journal_entry_id: JOURNAL_IDS.posted,
      line_no: 2,
      account_id: ACCOUNT_IDS.revenue,
      description: "Consulting income",
      debit: 0,
      credit: 3500,
    },
  ],
};

export const demoInvoices = [
  {
    id: INVOICE_IDS.draft,
    org_id: DEMO_ORG_ID,
    customer_id: CUSTOMER_IDS.acme,
    invoice_no: null,
    invoice_date: "2026-02-22",
    due_date: "2026-03-08",
    currency_code: "GHS",
    status: "draft",
    subtotal: 2500,
    tax_total: 0,
    total: 2500,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: INVOICE_IDS.posted,
    org_id: DEMO_ORG_ID,
    customer_id: CUSTOMER_IDS.beta,
    invoice_no: "INV-20260220-DEMO01",
    invoice_date: "2026-02-20",
    due_date: "2026-03-05",
    currency_code: "GHS",
    status: "posted",
    subtotal: 4200,
    tax_total: 0,
    total: 4200,
    posted_at: NOW,
    created_at: NOW,
    updated_at: NOW,
  },
];

const demoInvoiceLinesById: Record<string, Array<Record<string, unknown>>> = {
  [INVOICE_IDS.draft]: [
    {
      id: "71000000-0000-4000-8000-000000000001",
      line_no: 1,
      description: "Bookkeeping retainer - February",
      quantity: 1,
      unit_price: 2500,
      tax_amount: 0,
      line_total: 2500,
      revenue_account_id: ACCOUNT_IDS.revenue,
    },
  ],
  [INVOICE_IDS.posted]: [
    {
      id: "71000000-0000-4000-8000-000000000002",
      line_no: 1,
      description: "Audit support engagement",
      quantity: 1,
      unit_price: 4200,
      tax_amount: 0,
      line_total: 4200,
      revenue_account_id: ACCOUNT_IDS.revenue,
    },
  ],
};

export const demoBills = [
  {
    id: BILL_IDS.draft,
    org_id: DEMO_ORG_ID,
    vendor_id: VENDOR_IDS.officehub,
    bill_no: null,
    bill_date: "2026-02-22",
    due_date: "2026-03-01",
    currency_code: "GHS",
    status: "draft",
    subtotal: 380,
    tax_total: 0,
    total: 380,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: BILL_IDS.posted,
    org_id: DEMO_ORG_ID,
    vendor_id: VENDOR_IDS.utilico,
    bill_no: "BILL-20260215-DEMO01",
    bill_date: "2026-02-15",
    due_date: "2026-02-28",
    currency_code: "GHS",
    status: "posted",
    subtotal: 540,
    tax_total: 0,
    total: 540,
    posted_at: NOW,
    created_at: NOW,
    updated_at: NOW,
  },
];

const demoBillLinesById: Record<string, Array<Record<string, unknown>>> = {
  [BILL_IDS.draft]: [
    {
      id: "81000000-0000-4000-8000-000000000001",
      line_no: 1,
      description: "Printer supplies",
      quantity: 1,
      unit_cost: 380,
      tax_amount: 0,
      line_total: 380,
      expense_account_id: ACCOUNT_IDS.expense,
    },
  ],
  [BILL_IDS.posted]: [
    {
      id: "81000000-0000-4000-8000-000000000002",
      line_no: 1,
      description: "Electricity charge",
      quantity: 1,
      unit_cost: 540,
      tax_amount: 0,
      line_total: 540,
      expense_account_id: ACCOUNT_IDS.expense,
    },
  ],
};

export const demoBankAccounts = [
  {
    id: BANK_IDS.main,
    org_id: DEMO_ORG_ID,
    name: "Main GHS Bank",
    account_number_masked: "****1234",
    currency_code: "GHS",
    gl_account_id: ACCOUNT_IDS.bank,
    is_active: true,
    created_at: NOW,
    updated_at: NOW,
  },
];

export const demoBankTransactions = [
  {
    id: BANK_IDS.txn1,
    org_id: DEMO_ORG_ID,
    bank_account_id: BANK_IDS.main,
    transaction_date: "2026-02-22",
    description: "Acme Retail payment",
    reference: "TRX-ACME-001",
    amount: 2500,
    source: "csv_import",
    match_status: "unmatched",
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: BANK_IDS.txn2,
    org_id: DEMO_ORG_ID,
    bank_account_id: BANK_IDS.main,
    transaction_date: "2026-02-21",
    description: "OfficeHub supplies",
    reference: "TRX-OFFICE-002",
    amount: -380,
    source: "csv_import",
    match_status: "matched",
    created_at: NOW,
    updated_at: NOW,
  },
];

export const demoReconciliationSessions = [
  {
    id: BANK_IDS.recon1,
    org_id: DEMO_ORG_ID,
    bank_account_id: BANK_IDS.main,
    statement_start_date: "2026-02-01",
    statement_end_date: TODAY,
    statement_ending_balance: 12420,
    status: "open",
    created_at: NOW,
    updated_at: NOW,
  },
];

export function demoUserOrganizations() {
  return [
    {
      org_id: DEMO_ORG_ID,
      role: "owner" as Role,
      is_active: true,
      organization: demoOrganization,
    },
  ];
}

export function getDemoJournal(journalId: string) {
  const journal =
    demoJournals.find((j) => j.id === journalId) ??
    ({
      ...demoJournals[0],
      id: journalId,
      journal_no: null,
      status: "draft",
      memo: "Demo placeholder journal (no database persistence)",
      reference: "JV-DEMO-PLACEHOLDER",
    } as (typeof demoJournals)[number]);
  return {
    ...journal,
    journal_lines: demoJournalLinesById[journal.id] ?? demoJournalLinesById[JOURNAL_IDS.draft],
  };
}

export function getDemoInvoice(invoiceId: string) {
  const invoice =
    demoInvoices.find((i) => i.id === invoiceId) ??
    ({
      ...demoInvoices[0],
      id: invoiceId,
      invoice_no: null,
      status: "draft",
      total: 2500,
      subtotal: 2500,
      tax_total: 0,
    } as (typeof demoInvoices)[number]);
  return {
    ...invoice,
    invoice_lines: demoInvoiceLinesById[invoice.id] ?? demoInvoiceLinesById[INVOICE_IDS.draft],
  };
}

export function getDemoBill(billId: string) {
  const bill =
    demoBills.find((b) => b.id === billId) ??
    ({
      ...demoBills[0],
      id: billId,
      bill_no: null,
      status: "draft",
      total: 380,
      subtotal: 380,
      tax_total: 0,
    } as (typeof demoBills)[number]);
  return {
    ...bill,
    bill_lines: demoBillLinesById[bill.id] ?? demoBillLinesById[BILL_IDS.draft],
  };
}

export function getDemoDashboardKpis() {
  return {
    cash: 12420,
    revenue_mtd: 6700,
    expenses_mtd: 2120,
    ar: 4200,
    ap: 920,
    note: "Demo mode values (placeholder; no Supabase).",
  };
}

export function getDemoMonthlyPerformance() {
  return [
    { period: "2025-09-01", period_label: "Sep 2025", revenue: 4200, expenses: 1850 },
    { period: "2025-10-01", period_label: "Oct 2025", revenue: 5100, expenses: 2010 },
    { period: "2025-11-01", period_label: "Nov 2025", revenue: 4800, expenses: 1940 },
    { period: "2025-12-01", period_label: "Dec 2025", revenue: 6300, expenses: 2380 },
    { period: "2026-01-01", period_label: "Jan 2026", revenue: 5900, expenses: 2210 },
    { period: "2026-02-01", period_label: "Feb 2026", revenue: 6700, expenses: 2120 },
  ];
}

export function getDemoTrialBalance() {
  return [
    {
      account_id: ACCOUNT_IDS.bank,
      account_code: "1010",
      account_name: "Bank - Main GHS",
      account_type: "asset",
      debit: 12420,
      credit: 0,
      balance: 12420,
    },
    {
      account_id: ACCOUNT_IDS.ar,
      account_code: "1100",
      account_name: "Accounts Receivable",
      account_type: "asset",
      debit: 4200,
      credit: 0,
      balance: 4200,
    },
    {
      account_id: ACCOUNT_IDS.ap,
      account_code: "2000",
      account_name: "Accounts Payable",
      account_type: "liability",
      debit: 0,
      credit: 920,
      balance: -920,
    },
    {
      account_id: ACCOUNT_IDS.revenue,
      account_code: "4000",
      account_name: "Service Revenue",
      account_type: "income",
      debit: 0,
      credit: 6700,
      balance: -6700,
    },
    {
      account_id: ACCOUNT_IDS.expense,
      account_code: "5000",
      account_name: "Office Expenses",
      account_type: "expense",
      debit: 2120,
      credit: 0,
      balance: 2120,
    },
  ];
}

export function getDemoPnl() {
  return [
    {
      account_id: ACCOUNT_IDS.revenue,
      account_code: "4000",
      account_name: "Service Revenue",
      category: "income",
      amount: 6700,
    },
    {
      account_id: ACCOUNT_IDS.expense,
      account_code: "5000",
      account_name: "Office Expenses",
      category: "expense",
      amount: 2120,
    },
  ];
}

export function getDemoBalanceSheet() {
  return [
    {
      account_id: ACCOUNT_IDS.bank,
      account_code: "1010",
      account_name: "Bank - Main GHS",
      category: "asset",
      amount: 12420,
    },
    {
      account_id: ACCOUNT_IDS.ar,
      account_code: "1100",
      account_name: "Accounts Receivable",
      category: "asset",
      amount: 4200,
    },
    {
      account_id: ACCOUNT_IDS.ap,
      account_code: "2000",
      account_name: "Accounts Payable",
      category: "liability",
      amount: 920,
    },
    {
      account_id: ACCOUNT_IDS.retained,
      account_code: "3000",
      account_name: "Retained Earnings",
      category: "equity",
      amount: 15700,
    },
  ];
}

export const demoIds = {
  orgId: DEMO_ORG_ID,
  userId: DEMO_USER_ID,
  journalIds: JOURNAL_IDS,
  invoiceIds: INVOICE_IDS,
  billIds: BILL_IDS,
  bankIds: BANK_IDS,
};
