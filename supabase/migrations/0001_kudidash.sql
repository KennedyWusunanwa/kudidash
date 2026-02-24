-- KudiDash core schema (Supabase/PostgreSQL)
-- Apply in Supabase SQL Editor or migrations pipeline.
-- NOTE: This file includes RLS, triggers, and RPCs for accounting correctness.

begin;

create extension if not exists pgcrypto;

-- ============================================================================
-- Enums (guarded for repeatable execution)
-- ============================================================================
do $$
begin
  create type public.kd_role as enum ('owner', 'admin', 'accountant', 'approver', 'viewer');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.kd_account_type as enum ('asset', 'liability', 'equity', 'income', 'expense');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.kd_journal_status as enum ('draft', 'approved', 'posted', 'voided');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.kd_doc_status as enum ('draft', 'approved', 'posted', 'paid', 'voided');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.kd_period_status as enum ('open', 'closed');
exception when duplicate_object then null;
end $$;

-- ============================================================================
-- Core identity / tenancy
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  base_currency text not null default 'GHS',
  fiscal_year_start_month int not null default 1 check (fiscal_year_start_month between 1 and 12),
  is_active boolean not null default true,
  dashboard_name text,
  dashboard_logo_url text,
  dashboard_color_scheme text not null default 'default',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    dashboard_color_scheme in ('default', 'emerald', 'indigo', 'rose', 'amber', 'teal', 'slate')
  )
);

create table if not exists public.org_members (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.kd_role not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (org_id, user_id)
);

create table if not exists public.org_account_settings (
  org_id uuid primary key references public.organizations(id) on delete cascade,
  ar_account_id uuid,
  ap_account_id uuid,
  cash_account_id uuid,
  bank_account_id uuid,
  retained_earnings_account_id uuid,
  revenue_default_account_id uuid,
  expense_default_account_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.posting_periods (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  period_name text not null,
  start_date date not null,
  end_date date not null,
  status public.kd_period_status not null default 'open',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (org_id, start_date, end_date),
  check (start_date <= end_date)
);

-- ============================================================================
-- Chart of accounts
-- ============================================================================
create table if not exists public.chart_of_accounts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  type public.kd_account_type not null,
  sub_type text not null default 'other',
  currency_code text not null default 'GHS',
  is_active boolean not null default true,
  is_system boolean not null default false,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (org_id, code)
);

-- ============================================================================
-- Journals (double-entry core)
-- ============================================================================
create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  journal_no text,
  entry_date date not null,
  memo text,
  reference text,
  status public.kd_journal_status not null default 'draft',
  source_module text,
  source_id uuid,
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  posted_at timestamptz,
  posted_by uuid references auth.users(id),
  reversal_of_journal_id uuid references public.journal_entries(id),
  reversed_by_journal_id uuid references public.journal_entries(id),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_journal_entries_org_status on public.journal_entries(org_id, status);
create index if not exists idx_journal_entries_org_date on public.journal_entries(org_id, entry_date);

create table if not exists public.journal_lines (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  journal_entry_id uuid not null references public.journal_entries(id) on delete cascade,
  line_no int not null,
  account_id uuid not null references public.chart_of_accounts(id),
  description text,
  debit numeric(18,2) not null default 0 check (debit >= 0),
  credit numeric(18,2) not null default 0 check (credit >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (journal_entry_id, line_no)
);

create index if not exists idx_journal_lines_org_journal on public.journal_lines(org_id, journal_entry_id);
create index if not exists idx_journal_lines_org_account on public.journal_lines(org_id, account_id);

create table if not exists public.posting_idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  operation text not null,
  idempotency_key text not null,
  target_id uuid,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default timezone('utc', now()),
  unique (org_id, operation, idempotency_key)
);

-- ============================================================================
-- Sales / AR
-- ============================================================================
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  billing_address text,
  tax_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id),
  invoice_no text,
  invoice_date date not null,
  due_date date not null,
  currency_code text not null default 'GHS',
  notes text,
  subtotal numeric(18,2) not null default 0,
  tax_total numeric(18,2) not null default 0,
  total numeric(18,2) not null default 0,
  status public.kd_doc_status not null default 'draft',
  posted_at timestamptz,
  posted_journal_entry_id uuid references public.journal_entries(id),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_invoices_org_status on public.invoices(org_id, status);
create index if not exists idx_invoices_org_date on public.invoices(org_id, invoice_date);

create table if not exists public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  line_no int not null,
  description text not null,
  quantity numeric(18,4) not null default 1 check (quantity > 0),
  unit_price numeric(18,2) not null default 0 check (unit_price >= 0),
  tax_amount numeric(18,2) not null default 0 check (tax_amount >= 0),
  line_total numeric(18,2) not null default 0 check (line_total >= 0),
  revenue_account_id uuid not null references public.chart_of_accounts(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (invoice_id, line_no)
);

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id),
  receipt_no text,
  receipt_date date not null,
  amount numeric(18,2) not null check (amount > 0),
  currency_code text not null default 'GHS',
  bank_account_id uuid,
  reference text,
  status text not null default 'draft',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.receipt_allocations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  receipt_id uuid not null references public.receipts(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  amount_allocated numeric(18,2) not null check (amount_allocated > 0),
  created_at timestamptz not null default timezone('utc', now())
);

-- ============================================================================
-- Purchases / AP
-- ============================================================================
create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  billing_address text,
  tax_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id),
  bill_no text,
  bill_date date not null,
  due_date date not null,
  currency_code text not null default 'GHS',
  notes text,
  subtotal numeric(18,2) not null default 0,
  tax_total numeric(18,2) not null default 0,
  total numeric(18,2) not null default 0,
  status public.kd_doc_status not null default 'draft',
  posted_at timestamptz,
  posted_journal_entry_id uuid references public.journal_entries(id),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_bills_org_status on public.bills(org_id, status);
create index if not exists idx_bills_org_date on public.bills(org_id, bill_date);

create table if not exists public.bill_lines (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  bill_id uuid not null references public.bills(id) on delete cascade,
  line_no int not null,
  description text not null,
  quantity numeric(18,4) not null default 1 check (quantity > 0),
  unit_cost numeric(18,2) not null default 0 check (unit_cost >= 0),
  tax_amount numeric(18,2) not null default 0 check (tax_amount >= 0),
  line_total numeric(18,2) not null default 0 check (line_total >= 0),
  expense_account_id uuid not null references public.chart_of_accounts(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (bill_id, line_no)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id),
  payment_no text,
  payment_date date not null,
  amount numeric(18,2) not null check (amount > 0),
  currency_code text not null default 'GHS',
  bank_account_id uuid,
  reference text,
  status text not null default 'draft',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  payment_id uuid not null references public.payments(id) on delete cascade,
  bill_id uuid not null references public.bills(id) on delete cascade,
  amount_allocated numeric(18,2) not null check (amount_allocated > 0),
  created_at timestamptz not null default timezone('utc', now())
);

-- ============================================================================
-- Banking + reconciliation
-- ============================================================================
create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  account_number_masked text,
  currency_code text not null default 'GHS',
  gl_account_id uuid not null references public.chart_of_accounts(id),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.bank_transactions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  bank_account_id uuid not null references public.bank_accounts(id) on delete cascade,
  transaction_date date not null,
  description text not null,
  reference text,
  amount numeric(18,2) not null,
  source text not null default 'manual',
  external_id text,
  match_status text not null default 'unmatched',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_bank_transactions_org_date on public.bank_transactions(org_id, transaction_date);
create index if not exists idx_bank_transactions_org_match on public.bank_transactions(org_id, match_status);

create table if not exists public.bank_reconciliation_sessions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  bank_account_id uuid not null references public.bank_accounts(id),
  statement_start_date date not null,
  statement_end_date date not null,
  statement_ending_balance numeric(18,2) not null,
  status text not null default 'open',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (statement_start_date <= statement_end_date)
);

create table if not exists public.bank_reconciliation_matches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  reconciliation_session_id uuid not null references public.bank_reconciliation_sessions(id) on delete cascade,
  bank_transaction_id uuid not null references public.bank_transactions(id) on delete cascade,
  journal_line_id uuid references public.journal_lines(id),
  invoice_id uuid references public.invoices(id),
  bill_id uuid references public.bills(id),
  match_amount numeric(18,2) not null check (match_amount > 0),
  match_status text not null default 'matched',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ============================================================================
-- Optional/scaffold modules (Inventory / Fixed Assets / Payroll)
-- ============================================================================
create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  sku text not null,
  name text not null,
  inventory_account_id uuid references public.chart_of_accounts(id),
  cogs_account_id uuid references public.chart_of_accounts(id),
  revenue_account_id uuid references public.chart_of_accounts(id),
  valuation_method text not null default 'weighted_average',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (org_id, sku)
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  movement_date date not null,
  quantity numeric(18,4) not null,
  unit_cost numeric(18,2),
  source_module text,
  source_id uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.fixed_assets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  asset_code text not null,
  name text not null,
  acquisition_date date not null,
  acquisition_cost numeric(18,2) not null,
  asset_account_id uuid references public.chart_of_accounts(id),
  accumulated_depr_account_id uuid references public.chart_of_accounts(id),
  depr_expense_account_id uuid references public.chart_of_accounts(id),
  depreciation_method text not null default 'straight_line',
  useful_life_months int,
  residual_value numeric(18,2) default 0,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (org_id, asset_code)
);

create table if not exists public.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  run_name text not null,
  pay_period_start date not null,
  pay_period_end date not null,
  pay_date date not null,
  country_code text not null,
  status text not null default 'draft',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (pay_period_start <= pay_period_end)
);

create table if not exists public.payroll_run_lines (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  payroll_run_id uuid not null references public.payroll_runs(id) on delete cascade,
  employee_external_ref text not null,
  gross_pay numeric(18,2) not null default 0,
  net_pay numeric(18,2) not null default 0,
  tax_withheld numeric(18,2) not null default 0,
  -- UNSPECIFIED: country-specific statutory breakdown columns/hooks
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ============================================================================
-- Utility trigger functions
-- ============================================================================
create or replace function public.kd_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.kd_create_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email, updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_auth_user_profile on auth.users;
create trigger trg_auth_user_profile
after insert or update on auth.users
for each row execute function public.kd_create_profile_from_auth_user();

do $$
declare
  t text;
  tables text[] := array[
    'profiles','organizations','org_members','org_account_settings','posting_periods',
    'chart_of_accounts','journal_entries','journal_lines','customers','invoices','invoice_lines',
    'receipts','vendors','bills','bill_lines','payments','bank_accounts','bank_transactions',
    'bank_reconciliation_sessions','bank_reconciliation_matches','inventory_items','fixed_assets',
    'payroll_runs','payroll_run_lines'
  ];
begin
  foreach t in array tables loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I', t, t);
    execute format(
      'create trigger trg_%I_updated_at before update on public.%I for each row execute function public.kd_set_updated_at()',
      t, t
    );
  end loop;
end $$;

-- ============================================================================
-- Authorization / helper functions (used by RLS and RPCs)
-- ============================================================================
create or replace function public.kd_is_org_member(p_org_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.org_members om
    where om.org_id = p_org_id
      and om.user_id = auth.uid()
      and om.is_active = true
  );
$$;

create or replace function public.kd_is_org_adminish(p_org_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.org_members om
    where om.org_id = p_org_id
      and om.user_id = auth.uid()
      and om.is_active = true
      and om.role in ('owner', 'admin')
  );
$$;

create or replace function public.kd_can_read_profile(p_profile_id uuid)
returns boolean
language sql
stable
as $$
  select p_profile_id = auth.uid()
  or exists (
    select 1
    from public.org_members a
    join public.org_members b on b.org_id = a.org_id
    where a.user_id = auth.uid()
      and a.is_active = true
      and b.user_id = p_profile_id
      and b.is_active = true
  );
$$;

create or replace function public.kd_require_open_period(p_org_id uuid, p_date date)
returns void
language plpgsql
as $$
declare
  v_any_period boolean;
  v_open_period boolean;
begin
  select exists(select 1 from public.posting_periods where org_id = p_org_id) into v_any_period;
  if not v_any_period then
    -- Safe default for first-time setup. Admins should configure posting periods explicitly.
    return;
  end if;

  select exists(
    select 1
    from public.posting_periods pp
    where pp.org_id = p_org_id
      and p_date between pp.start_date and pp.end_date
      and pp.status = 'open'
  ) into v_open_period;

  if not v_open_period then
    raise exception 'Posting period is closed or not configured for date %', p_date;
  end if;
end;
$$;

create or replace function public.kd_assert_journal_balanced(p_org_id uuid, p_journal_entry_id uuid)
returns void
language plpgsql
as $$
declare
  v_debit numeric(18,2);
  v_credit numeric(18,2);
  v_count int;
begin
  select coalesce(sum(jl.debit), 0), coalesce(sum(jl.credit), 0), count(*)
  into v_debit, v_credit, v_count
  from public.journal_lines jl
  where jl.org_id = p_org_id
    and jl.journal_entry_id = p_journal_entry_id;

  if v_count < 2 then
    raise exception 'Journal entry must have at least 2 lines';
  end if;
  if round(v_debit, 2) <> round(v_credit, 2) then
    raise exception 'Journal entry is not balanced (debit %, credit %)', v_debit, v_credit;
  end if;
end;
$$;

create or replace function public.kd_claim_idempotency(
  p_org_id uuid,
  p_operation text,
  p_idempotency_key text,
  p_target_id uuid
)
returns boolean
language plpgsql
as $$
declare
  v_existing_target uuid;
begin
  insert into public.posting_idempotency_keys (org_id, operation, idempotency_key, target_id, created_by)
  values (p_org_id, p_operation, p_idempotency_key, p_target_id, auth.uid())
  on conflict (org_id, operation, idempotency_key) do nothing;

  if found then
    return true;
  end if;

  select pik.target_id
  into v_existing_target
  from public.posting_idempotency_keys pik
  where pik.org_id = p_org_id
    and pik.operation = p_operation
    and pik.idempotency_key = p_idempotency_key;

  if v_existing_target is distinct from p_target_id then
    raise exception 'Idempotency key already used for a different target';
  end if;

  return false;
end;
$$;

create or replace function public.kd_generate_doc_no(p_prefix text)
returns text
language sql
stable
as $$
  select p_prefix || '-' || to_char(timezone('utc', now()), 'YYYYMMDD-HH24MISS') || '-' ||
         substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
$$;

create or replace function public.kd_prevent_posted_journal_entry_mutation()
returns trigger
language plpgsql
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and old.status = 'posted' then
    raise exception 'Posted journal entries are immutable. Use reversal.';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function public.kd_prevent_posted_journal_line_mutation()
returns trigger
language plpgsql
as $$
declare
  v_status public.kd_journal_status;
  v_journal_id uuid;
begin
  v_journal_id := coalesce(new.journal_entry_id, old.journal_entry_id);
  select je.status into v_status from public.journal_entries je where je.id = v_journal_id;
  if v_status = 'posted' then
    raise exception 'Posted journal lines are immutable. Use reversal.';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists trg_prevent_posted_journal_entry_mutation on public.journal_entries;
create trigger trg_prevent_posted_journal_entry_mutation
before update or delete on public.journal_entries
for each row execute function public.kd_prevent_posted_journal_entry_mutation();

drop trigger if exists trg_prevent_posted_journal_line_mutation on public.journal_lines;
create trigger trg_prevent_posted_journal_line_mutation
before update or delete on public.journal_lines
for each row execute function public.kd_prevent_posted_journal_line_mutation();

create unique index if not exists uq_journal_entries_org_journal_no
  on public.journal_entries(org_id, journal_no)
  where journal_no is not null;
create unique index if not exists uq_invoices_org_invoice_no
  on public.invoices(org_id, invoice_no)
  where invoice_no is not null;
create unique index if not exists uq_bills_org_bill_no
  on public.bills(org_id, bill_no)
  where bill_no is not null;

-- ============================================================================
-- Posting RPCs (atomic transactions via PL/pgSQL functions)
-- ============================================================================
create or replace function public.kd_post_journal_entry(
  p_org_id uuid,
  p_journal_entry_id uuid,
  p_idempotency_key text
)
returns table (journal_id uuid, journal_no text, status text, posted_at timestamptz)
language plpgsql
as $$
declare
  v_entry public.journal_entries%rowtype;
  v_no text;
begin
  if not public.kd_is_org_member(p_org_id) then
    raise exception 'Access denied for organization';
  end if;

  perform public.kd_claim_idempotency(p_org_id, 'post_journal', p_idempotency_key, p_journal_entry_id);

  select * into v_entry
  from public.journal_entries je
  where je.id = p_journal_entry_id
    and je.org_id = p_org_id
  for update;

  if not found then
    raise exception 'Journal entry not found';
  end if;

  if v_entry.status = 'posted' then
    return query
      select v_entry.id, v_entry.journal_no, v_entry.status::text, v_entry.posted_at;
    return;
  end if;

  if v_entry.status <> 'approved' then
    raise exception 'Journal entry must be approved before posting';
  end if;

  perform public.kd_require_open_period(p_org_id, v_entry.entry_date);
  perform public.kd_assert_journal_balanced(p_org_id, p_journal_entry_id);

  v_no := coalesce(v_entry.journal_no, public.kd_generate_doc_no('JV'));

  update public.journal_entries
  set status = 'posted',
      journal_no = v_no,
      posted_at = timezone('utc', now()),
      posted_by = auth.uid(),
      updated_by = auth.uid()
  where id = p_journal_entry_id
    and org_id = p_org_id;

  return query
  select je.id, je.journal_no, je.status::text, je.posted_at
  from public.journal_entries je
  where je.id = p_journal_entry_id;
end;
$$;

create or replace function public.kd_reverse_journal_entry(
  p_org_id uuid,
  p_journal_entry_id uuid,
  p_reversal_date date,
  p_reason text,
  p_idempotency_key text
)
returns table (journal_id uuid)
language plpgsql
as $$
declare
  v_original public.journal_entries%rowtype;
  v_reversal_id uuid;
begin
  if not public.kd_is_org_member(p_org_id) then
    raise exception 'Access denied for organization';
  end if;

  perform public.kd_claim_idempotency(p_org_id, 'reverse_journal', p_idempotency_key, p_journal_entry_id);

  select * into v_original
  from public.journal_entries je
  where je.id = p_journal_entry_id
    and je.org_id = p_org_id
  for update;

  if not found then
    raise exception 'Journal entry not found';
  end if;
  if v_original.status <> 'posted' then
    raise exception 'Only posted journals can be reversed';
  end if;
  if v_original.reversed_by_journal_id is not null then
    raise exception 'Journal entry is already reversed';
  end if;

  perform public.kd_require_open_period(p_org_id, p_reversal_date);

  insert into public.journal_entries (
    org_id, entry_date, memo, reference, status, source_module, source_id,
    reversal_of_journal_id, approved_at, approved_by, created_by, updated_by
  )
  values (
    p_org_id,
    p_reversal_date,
    concat('Reversal of ', coalesce(v_original.journal_no, v_original.id::text), ': ', p_reason),
    v_original.reference,
    'approved',
    'journal_reversal',
    v_original.id,
    v_original.id,
    timezone('utc', now()),
    auth.uid(),
    auth.uid(),
    auth.uid()
  )
  returning id into v_reversal_id;

  insert into public.journal_lines (
    org_id, journal_entry_id, line_no, account_id, description, debit, credit
  )
  select
    p_org_id,
    v_reversal_id,
    jl.line_no,
    jl.account_id,
    coalesce(jl.description, 'Reversal line'),
    jl.credit,
    jl.debit
  from public.journal_lines jl
  where jl.org_id = p_org_id
    and jl.journal_entry_id = p_journal_entry_id
  order by jl.line_no;

  perform public.kd_post_journal_entry(
    p_org_id,
    v_reversal_id,
    p_idempotency_key || ':post'
  );

  update public.journal_entries
  set reversed_by_journal_id = v_reversal_id,
      updated_by = auth.uid()
  where id = p_journal_entry_id
    and org_id = p_org_id;

  return query select v_reversal_id;
end;
$$;

create or replace function public.kd_post_invoice(
  p_org_id uuid,
  p_invoice_id uuid,
  p_idempotency_key text
)
returns table (invoice_id uuid, journal_id uuid)
language plpgsql
as $$
declare
  v_invoice public.invoices%rowtype;
  v_settings public.org_account_settings%rowtype;
  v_journal_id uuid;
  v_invoice_no text;
begin
  if not public.kd_is_org_member(p_org_id) then
    raise exception 'Access denied for organization';
  end if;

  perform public.kd_claim_idempotency(p_org_id, 'post_invoice', p_idempotency_key, p_invoice_id);

  select * into v_invoice
  from public.invoices i
  where i.id = p_invoice_id
    and i.org_id = p_org_id
  for update;

  if not found then
    raise exception 'Invoice not found';
  end if;

  if v_invoice.status = 'posted' then
    return query select v_invoice.id, v_invoice.posted_journal_entry_id;
    return;
  end if;
  if v_invoice.status not in ('draft', 'approved') then
    raise exception 'Invoice status % cannot be posted', v_invoice.status;
  end if;

  perform public.kd_require_open_period(p_org_id, v_invoice.invoice_date);

  select * into v_settings
  from public.org_account_settings s
  where s.org_id = p_org_id;

  if v_settings.ar_account_id is null then
    raise exception 'AR control account not configured in org_account_settings';
  end if;

  insert into public.journal_entries (
    org_id, entry_date, memo, reference, status, source_module, source_id,
    approved_at, approved_by, created_by, updated_by
  )
  values (
    p_org_id,
    v_invoice.invoice_date,
    concat('Invoice posting ', coalesce(v_invoice.invoice_no, v_invoice.id::text)),
    v_invoice.invoice_no,
    'approved',
    'sales_invoice',
    v_invoice.id,
    timezone('utc', now()),
    auth.uid(),
    auth.uid(),
    auth.uid()
  )
  returning id into v_journal_id;

  insert into public.journal_lines (org_id, journal_entry_id, line_no, account_id, description, debit, credit)
  values (
    p_org_id, v_journal_id, 1, v_settings.ar_account_id,
    'Accounts Receivable', round(v_invoice.total, 2), 0
  );

  insert into public.journal_lines (org_id, journal_entry_id, line_no, account_id, description, debit, credit)
  select
    p_org_id,
    v_journal_id,
    il.line_no + 1,
    il.revenue_account_id,
    il.description,
    0,
    round(il.line_total, 2) -- UNSPECIFIED: tax line split; tax is included in line_total by default scaffold
  from public.invoice_lines il
  where il.org_id = p_org_id
    and il.invoice_id = p_invoice_id
  order by il.line_no;

  perform public.kd_post_journal_entry(p_org_id, v_journal_id, p_idempotency_key || ':journal');

  v_invoice_no := coalesce(v_invoice.invoice_no, public.kd_generate_doc_no('INV'));

  update public.invoices
  set status = 'posted',
      invoice_no = v_invoice_no,
      posted_at = timezone('utc', now()),
      posted_journal_entry_id = v_journal_id,
      updated_by = auth.uid()
  where id = p_invoice_id
    and org_id = p_org_id;

  return query select p_invoice_id, v_journal_id;
end;
$$;

create or replace function public.kd_post_bill(
  p_org_id uuid,
  p_bill_id uuid,
  p_idempotency_key text
)
returns table (bill_id uuid, journal_id uuid)
language plpgsql
as $$
declare
  v_bill public.bills%rowtype;
  v_settings public.org_account_settings%rowtype;
  v_journal_id uuid;
  v_bill_no text;
begin
  if not public.kd_is_org_member(p_org_id) then
    raise exception 'Access denied for organization';
  end if;

  perform public.kd_claim_idempotency(p_org_id, 'post_bill', p_idempotency_key, p_bill_id);

  select * into v_bill
  from public.bills b
  where b.id = p_bill_id
    and b.org_id = p_org_id
  for update;

  if not found then
    raise exception 'Bill not found';
  end if;

  if v_bill.status = 'posted' then
    return query select v_bill.id, v_bill.posted_journal_entry_id;
    return;
  end if;
  if v_bill.status not in ('draft', 'approved') then
    raise exception 'Bill status % cannot be posted', v_bill.status;
  end if;

  perform public.kd_require_open_period(p_org_id, v_bill.bill_date);

  select * into v_settings
  from public.org_account_settings s
  where s.org_id = p_org_id;

  if v_settings.ap_account_id is null then
    raise exception 'AP control account not configured in org_account_settings';
  end if;

  insert into public.journal_entries (
    org_id, entry_date, memo, reference, status, source_module, source_id,
    approved_at, approved_by, created_by, updated_by
  )
  values (
    p_org_id,
    v_bill.bill_date,
    concat('Bill posting ', coalesce(v_bill.bill_no, v_bill.id::text)),
    v_bill.bill_no,
    'approved',
    'purchase_bill',
    v_bill.id,
    timezone('utc', now()),
    auth.uid(),
    auth.uid(),
    auth.uid()
  )
  returning id into v_journal_id;

  insert into public.journal_lines (org_id, journal_entry_id, line_no, account_id, description, debit, credit)
  select
    p_org_id,
    v_journal_id,
    bl.line_no,
    bl.expense_account_id,
    bl.description,
    round(bl.line_total, 2), -- UNSPECIFIED: tax line split; tax is included in line_total by default scaffold
    0
  from public.bill_lines bl
  where bl.org_id = p_org_id
    and bl.bill_id = p_bill_id
  order by bl.line_no;

  insert into public.journal_lines (org_id, journal_entry_id, line_no, account_id, description, debit, credit)
  values (
    p_org_id,
    v_journal_id,
    (select coalesce(max(line_no), 0) + 1 from public.journal_lines where journal_entry_id = v_journal_id),
    v_settings.ap_account_id,
    'Accounts Payable',
    0,
    round(v_bill.total, 2)
  );

  perform public.kd_post_journal_entry(p_org_id, v_journal_id, p_idempotency_key || ':journal');

  v_bill_no := coalesce(v_bill.bill_no, public.kd_generate_doc_no('BILL'));

  update public.bills
  set status = 'posted',
      bill_no = v_bill_no,
      posted_at = timezone('utc', now()),
      posted_journal_entry_id = v_journal_id,
      updated_by = auth.uid()
  where id = p_bill_id
    and org_id = p_org_id;

  return query select p_bill_id, v_journal_id;
end;
$$;

-- ============================================================================
-- Reporting / KPI RPCs (aggregated from posted journal lines)
-- ============================================================================
create or replace view public.kd_posted_ledger_lines_v as
select
  jl.org_id,
  je.entry_date,
  jl.journal_entry_id,
  jl.account_id,
  coa.code as account_code,
  coa.name as account_name,
  coa.type as account_type,
  coa.sub_type as account_sub_type,
  jl.debit,
  jl.credit
from public.journal_lines jl
join public.journal_entries je on je.id = jl.journal_entry_id
join public.chart_of_accounts coa on coa.id = jl.account_id
where je.status = 'posted';

create or replace function public.kd_trial_balance(
  p_org_id uuid,
  p_end_date date
)
returns table (
  account_id uuid,
  account_code text,
  account_name text,
  account_type text,
  debit numeric,
  credit numeric,
  balance numeric
)
language sql
stable
as $$
  select
    v.account_id,
    v.account_code,
    v.account_name,
    v.account_type::text,
    round(sum(v.debit), 2) as debit,
    round(sum(v.credit), 2) as credit,
    round(sum(v.debit - v.credit), 2) as balance
  from public.kd_posted_ledger_lines_v v
  where v.org_id = p_org_id
    and v.entry_date <= p_end_date
  group by v.account_id, v.account_code, v.account_name, v.account_type
  order by v.account_code;
$$;

create or replace function public.kd_profit_and_loss(
  p_org_id uuid,
  p_start_date date,
  p_end_date date
)
returns table (
  account_id uuid,
  account_code text,
  account_name text,
  category text,
  amount numeric
)
language sql
stable
as $$
  select
    v.account_id,
    v.account_code,
    v.account_name,
    v.account_type::text as category,
    round(
      case
        when v.account_type = 'income' then sum(v.credit - v.debit)
        when v.account_type = 'expense' then sum(v.debit - v.credit)
        else 0
      end
    , 2) as amount
  from public.kd_posted_ledger_lines_v v
  where v.org_id = p_org_id
    and v.entry_date between p_start_date and p_end_date
    and v.account_type in ('income', 'expense')
  group by v.account_id, v.account_code, v.account_name, v.account_type
  having round(
    case
      when v.account_type = 'income' then sum(v.credit - v.debit)
      when v.account_type = 'expense' then sum(v.debit - v.credit)
      else 0
    end, 2
  ) <> 0
  order by v.account_type, v.account_code;
$$;

create or replace function public.kd_balance_sheet(
  p_org_id uuid,
  p_end_date date
)
returns table (
  account_id uuid,
  account_code text,
  account_name text,
  category text,
  amount numeric
)
language sql
stable
as $$
  select
    v.account_id,
    v.account_code,
    v.account_name,
    v.account_type::text as category,
    round(
      case
        when v.account_type = 'asset' then sum(v.debit - v.credit)
        when v.account_type in ('liability', 'equity') then sum(v.credit - v.debit)
        else 0
      end
    , 2) as amount
  from public.kd_posted_ledger_lines_v v
  where v.org_id = p_org_id
    and v.entry_date <= p_end_date
    and v.account_type in ('asset', 'liability', 'equity')
  group by v.account_id, v.account_code, v.account_name, v.account_type
  having round(
    case
      when v.account_type = 'asset' then sum(v.debit - v.credit)
      when v.account_type in ('liability', 'equity') then sum(v.credit - v.debit)
      else 0
    end, 2
  ) <> 0
  order by v.account_type, v.account_code;
$$;

create or replace function public.kd_dashboard_kpis(
  p_org_id uuid,
  p_start_date date,
  p_end_date date
)
returns table (
  cash numeric,
  revenue_mtd numeric,
  expenses_mtd numeric,
  ar numeric,
  ap numeric
)
language sql
stable
as $$
  with settings as (
    select * from public.org_account_settings where org_id = p_org_id
  ),
  base as (
    select *
    from public.kd_posted_ledger_lines_v v
    where v.org_id = p_org_id
      and v.entry_date <= p_end_date
  ),
  period as (
    select *
    from public.kd_posted_ledger_lines_v v
    where v.org_id = p_org_id
      and v.entry_date between p_start_date and p_end_date
  )
  select
    round(coalesce((
      select sum(case when b.account_type = 'asset' then (b.debit - b.credit) else 0 end)
      from base b
      left join settings s on true
      where (b.account_sub_type in ('cash', 'bank'))
         or b.account_id in (s.cash_account_id, s.bank_account_id)
    ), 0), 2) as cash,
    round(coalesce((
      select sum(p.credit - p.debit) from period p where p.account_type = 'income'
    ), 0), 2) as revenue_mtd,
    round(coalesce((
      select sum(p.debit - p.credit) from period p where p.account_type = 'expense'
    ), 0), 2) as expenses_mtd,
    round(coalesce((
      select sum(b.debit - b.credit)
      from base b
      join settings s on true
      where b.account_id = s.ar_account_id
    ), 0), 2) as ar,
    round(coalesce((
      select sum(b.credit - b.debit)
      from base b
      join settings s on true
      where b.account_id = s.ap_account_id
    ), 0), 2) as ap;
$$;

create or replace function public.kd_monthly_performance(
  p_org_id uuid,
  p_months int default 6
)
returns table (
  period date,
  period_label text,
  revenue numeric,
  expenses numeric
)
language sql
stable
as $$
  with months as (
    select generate_series(
      date_trunc('month', timezone('utc', now()))::date - ((greatest(p_months,1)-1) || ' months')::interval,
      date_trunc('month', timezone('utc', now()))::date,
      interval '1 month'
    )::date as month_start
  ),
  ledger as (
    select *
    from public.kd_posted_ledger_lines_v v
    where v.org_id = p_org_id
  )
  select
    m.month_start as period,
    to_char(m.month_start, 'Mon YYYY') as period_label,
    round(coalesce(sum(case when l.account_type = 'income' then (l.credit - l.debit) else 0 end), 0), 2) as revenue,
    round(coalesce(sum(case when l.account_type = 'expense' then (l.debit - l.credit) else 0 end), 0), 2) as expenses
  from months m
  left join ledger l
    on date_trunc('month', l.entry_date) = m.month_start
  group by m.month_start
  order by m.month_start;
$$;

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.org_members enable row level security;

do $$
declare
  t text;
  org_scoped_tables text[] := array[
    'org_account_settings','posting_periods','chart_of_accounts','journal_entries','journal_lines',
    'posting_idempotency_keys','customers','invoices','invoice_lines','receipts','receipt_allocations',
    'vendors','bills','bill_lines','payments','payment_allocations','bank_accounts','bank_transactions',
    'bank_reconciliation_sessions','bank_reconciliation_matches',
    'inventory_items','inventory_movements','fixed_assets','payroll_runs','payroll_run_lines'
  ];
begin
  foreach t in array org_scoped_tables loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I_select on public.%I', t || '_select', t);
    execute format('drop policy if exists %I_insert on public.%I', t || '_insert', t);
    execute format('drop policy if exists %I_update on public.%I', t || '_update', t);
    execute format('drop policy if exists %I_delete on public.%I', t || '_delete', t);
    execute format(
      'create policy %I_select on public.%I for select using (public.kd_is_org_member(org_id))',
      t || '_select', t
    );
    execute format(
      'create policy %I_insert on public.%I for insert with check (public.kd_is_org_member(org_id))',
      t || '_insert', t
    );
    execute format(
      'create policy %I_update on public.%I for update using (public.kd_is_org_member(org_id)) with check (public.kd_is_org_member(org_id))',
      t || '_update', t
    );
    execute format(
      'create policy %I_delete on public.%I for delete using (public.kd_is_org_member(org_id))',
      t || '_delete', t
    );
  end loop;
end $$;

drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_select on public.profiles
for select using (public.kd_can_read_profile(id));
create policy profiles_insert on public.profiles
for insert with check (id = auth.uid());
create policy profiles_update on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());

alter table public.organizations alter column created_by set default auth.uid();

drop policy if exists organizations_select on public.organizations;
drop policy if exists organizations_insert on public.organizations;
drop policy if exists organizations_update on public.organizations;
drop policy if exists organizations_delete on public.organizations;

create policy organizations_select on public.organizations
for select using (
  exists (
    select 1 from public.org_members om
    where om.org_id = id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);

create policy organizations_insert on public.organizations
for insert with check (auth.uid() is not null and created_by = auth.uid());

create policy organizations_update on public.organizations
for update using (public.kd_is_org_adminish(id))
with check (public.kd_is_org_adminish(id));

create policy organizations_delete on public.organizations
for delete using (public.kd_is_org_adminish(id));

drop policy if exists org_members_select on public.org_members;
drop policy if exists org_members_insert on public.org_members;
drop policy if exists org_members_update on public.org_members;
drop policy if exists org_members_delete on public.org_members;

create policy org_members_select on public.org_members
for select using (public.kd_is_org_member(org_id));

create policy org_members_insert on public.org_members
for insert with check (
  (
    user_id = auth.uid()
    and role = 'owner'
    and exists (
      select 1 from public.organizations o
      where o.id = org_id
        and o.created_by = auth.uid()
    )
  )
  or public.kd_is_org_adminish(org_id)
);

create policy org_members_update on public.org_members
for update using (public.kd_is_org_adminish(org_id))
with check (public.kd_is_org_adminish(org_id));

create policy org_members_delete on public.org_members
for delete using (public.kd_is_org_adminish(org_id));

-- ============================================================================
-- Grants for RPCs
-- ============================================================================
grant execute on function public.kd_post_journal_entry(uuid, uuid, text) to authenticated;
grant execute on function public.kd_reverse_journal_entry(uuid, uuid, date, text, text) to authenticated;
grant execute on function public.kd_post_invoice(uuid, uuid, text) to authenticated;
grant execute on function public.kd_post_bill(uuid, uuid, text) to authenticated;
grant execute on function public.kd_trial_balance(uuid, date) to authenticated;
grant execute on function public.kd_profit_and_loss(uuid, date, date) to authenticated;
grant execute on function public.kd_balance_sheet(uuid, date) to authenticated;
grant execute on function public.kd_dashboard_kpis(uuid, date, date) to authenticated;
grant execute on function public.kd_monthly_performance(uuid, int) to authenticated;

-- ============================================================================
-- Supabase Storage scaffolding (commented)
-- ============================================================================
-- UNSPECIFIED: bucket names, file retention policy, and document classification.
-- Example approach (apply after deciding bucket names/path conventions):
--   create bucket: `org-documents`
--   object path convention: `<org_id>/<module>/<entity_id>/<filename>`
-- Example RLS (storage.objects) policy sketch:
--   using (
--     bucket_id = 'org-documents'
--     and public.kd_is_org_member((storage.foldername(name))[1]::uuid)
--   )
--   with check (
--     bucket_id = 'org-documents'
--     and public.kd_is_org_member((storage.foldername(name))[1]::uuid)
--   );

commit;

create or replace function public.kd_validate_journal_line_amounts()
returns trigger
language plpgsql
as $$
begin
  if coalesce(new.debit, 0) < 0 or coalesce(new.credit, 0) < 0 then
    raise exception 'Journal line debit/credit cannot be negative';
  end if;
  if (coalesce(new.debit, 0) = 0 and coalesce(new.credit, 0) = 0)
     or (coalesce(new.debit, 0) > 0 and coalesce(new.credit, 0) > 0) then
    raise exception 'Journal line must have either debit or credit';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_journal_line_amounts on public.journal_lines;
create trigger trg_validate_journal_line_amounts
before insert or update on public.journal_lines
for each row execute function public.kd_validate_journal_line_amounts();

create or replace function public.kd_ensure_org_consistency()
returns trigger
language plpgsql
as $$
declare
  parent_org uuid;
begin
  if tg_table_name = 'journal_lines' then
    select org_id into parent_org from public.journal_entries where id = new.journal_entry_id;
  elsif tg_table_name = 'invoice_lines' then
    select org_id into parent_org from public.invoices where id = new.invoice_id;
  elsif tg_table_name = 'bill_lines' then
    select org_id into parent_org from public.bills where id = new.bill_id;
  elsif tg_table_name = 'receipt_allocations' then
    select org_id into parent_org from public.receipts where id = new.receipt_id;
  elsif tg_table_name = 'payment_allocations' then
    select org_id into parent_org from public.payments where id = new.payment_id;
  elsif tg_table_name = 'bank_reconciliation_matches' then
    select org_id into parent_org from public.bank_reconciliation_sessions where id = new.reconciliation_session_id;
  else
    return new;
  end if;

  if parent_org is null or parent_org <> new.org_id then
    raise exception 'org_id mismatch with parent record on %', tg_table_name;
  end if;
  return new;
end;
$$;

do $$
declare
  t text;
  child_tables text[] := array[
    'journal_lines','invoice_lines','bill_lines','receipt_allocations',
    'payment_allocations','bank_reconciliation_matches'
  ];
begin
  foreach t in array child_tables loop
    execute format('drop trigger if exists trg_%I_org_consistency on public.%I', t, t);
    execute format(
      'create trigger trg_%I_org_consistency before insert or update on public.%I for each row execute function public.kd_ensure_org_consistency()',
      t, t
    );
  end loop;
end $$;
