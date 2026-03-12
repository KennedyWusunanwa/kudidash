begin;

alter table public.org_account_settings
  add column if not exists sales_tax_rate numeric(9,4) not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'org_account_settings_sales_tax_rate_check'
  ) then
    alter table public.org_account_settings
      add constraint org_account_settings_sales_tax_rate_check
      check (sales_tax_rate >= 0 and sales_tax_rate <= 100);
  end if;
end $$;

alter table public.invoices
  add column if not exists tax_rate numeric(9,4) not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'invoices_tax_rate_check'
  ) then
    alter table public.invoices
      add constraint invoices_tax_rate_check
      check (tax_rate >= 0 and tax_rate <= 100);
  end if;
end $$;

update public.invoices
set tax_rate = round((tax_total / nullif(subtotal, 0)) * 100, 4)
where coalesce(subtotal, 0) > 0
  and coalesce(tax_total, 0) > 0
  and coalesce(tax_rate, 0) = 0;

alter table public.receipts
  add column if not exists posted_journal_entry_id uuid references public.journal_entries(id);

create index if not exists idx_receipts_posted_journal_entry
  on public.receipts(posted_journal_entry_id);

create or replace function public.kd_verify_invoice_receipt(
  p_org_id uuid,
  p_invoice_id uuid,
  p_customer_id uuid,
  p_receipt_date date,
  p_amount numeric,
  p_currency_code text,
  p_payment_method text,
  p_reference text,
  p_notes text,
  p_idempotency_key text
)
returns table (receipt_id uuid, journal_id uuid, public_view_token uuid)
language plpgsql
as $$
declare
  v_invoice public.invoices%rowtype;
  v_customer public.customers%rowtype;
  v_settings public.org_account_settings%rowtype;
  v_receipt_id uuid;
  v_journal_id uuid;
  v_public_view_token uuid;
  v_receipt_no text;
  v_current_paid numeric(18,2);
  v_total numeric(18,2);
  v_outstanding numeric(18,2);
  v_receipt_amount numeric(18,2);
  v_deposit_account_id uuid;
  v_currency_code text;
  v_is_fully_paid boolean;
  v_now timestamptz := timezone('utc', now());
begin
  if not public.kd_is_org_member(p_org_id) then
    raise exception 'Access denied for organization';
  end if;

  perform public.kd_claim_idempotency(
    p_org_id,
    'verify_invoice_receipt',
    p_idempotency_key,
    p_invoice_id
  );

  select * into v_invoice
  from public.invoices i
  where i.id = p_invoice_id
    and i.org_id = p_org_id
  for update;

  if not found then
    raise exception 'Invoice not found';
  end if;

  if v_invoice.customer_id <> p_customer_id then
    raise exception 'The selected invoice does not belong to this customer';
  end if;

  if v_invoice.status not in ('posted', 'paid') then
    raise exception 'Only posted invoices can be marked as paid';
  end if;

  select * into v_customer
  from public.customers c
  where c.id = p_customer_id
    and c.org_id = p_org_id;

  if not found then
    raise exception 'Customer not found';
  end if;

  v_receipt_amount := round(coalesce(p_amount, 0), 2);
  if v_receipt_amount <= 0 then
    raise exception 'Receipt amount must be greater than zero';
  end if;

  v_current_paid := round(coalesce(v_invoice.amount_paid, 0), 2);
  v_total := round(coalesce(v_invoice.total, 0), 2);
  v_outstanding := round(v_total - v_current_paid, 2);

  if v_outstanding <= 0 then
    raise exception 'This invoice is already fully paid';
  end if;

  if v_receipt_amount > v_outstanding then
    raise exception 'Receipt amount exceeds outstanding balance of %', trim(to_char(v_outstanding, 'FM9999999999990.00'));
  end if;

  perform public.kd_require_open_period(p_org_id, p_receipt_date);

  select * into v_settings
  from public.org_account_settings s
  where s.org_id = p_org_id;

  if v_settings.ar_account_id is null then
    raise exception 'AR control account not configured in org_account_settings';
  end if;

  v_deposit_account_id := coalesce(v_settings.bank_account_id, v_settings.cash_account_id);
  if v_deposit_account_id is null then
    raise exception 'Cash or bank control account not configured in org_account_settings';
  end if;

  v_currency_code := upper(coalesce(nullif(trim(p_currency_code), ''), v_invoice.currency_code, 'GHS'));
  v_receipt_no := public.kd_generate_doc_no('RCT');

  insert into public.receipts (
    org_id,
    customer_id,
    receipt_no,
    receipt_date,
    amount,
    currency_code,
    reference,
    status,
    notes,
    payment_method,
    verified_at,
    verified_by,
    customer_name,
    customer_email
  )
  values (
    p_org_id,
    p_customer_id,
    v_receipt_no,
    p_receipt_date,
    v_receipt_amount,
    v_currency_code,
    nullif(trim(p_reference), ''),
    'verified',
    nullif(trim(p_notes), ''),
    nullif(trim(p_payment_method), ''),
    v_now,
    auth.uid(),
    coalesce(v_invoice.customer_name, v_customer.name),
    coalesce(v_invoice.customer_email, v_customer.email)
  )
  returning id, public_view_token into v_receipt_id, v_public_view_token;

  insert into public.receipt_allocations (
    org_id,
    receipt_id,
    invoice_id,
    amount_allocated
  )
  values (
    p_org_id,
    v_receipt_id,
    p_invoice_id,
    v_receipt_amount
  );

  insert into public.journal_entries (
    org_id,
    entry_date,
    memo,
    reference,
    status,
    source_module,
    source_id,
    approved_at,
    approved_by,
    created_by,
    updated_by
  )
  values (
    p_org_id,
    p_receipt_date,
    concat('Customer receipt ', v_receipt_no, ' for ', coalesce(v_invoice.invoice_no, v_invoice.id::text)),
    coalesce(nullif(trim(p_reference), ''), v_receipt_no),
    'approved',
    'sales_receipt',
    v_receipt_id,
    v_now,
    auth.uid(),
    auth.uid(),
    auth.uid()
  )
  returning id into v_journal_id;

  insert into public.journal_lines (
    org_id,
    journal_entry_id,
    line_no,
    account_id,
    description,
    debit,
    credit
  )
  values (
    p_org_id,
    v_journal_id,
    1,
    v_deposit_account_id,
    concat('Receipt ', v_receipt_no),
    v_receipt_amount,
    0
  );

  insert into public.journal_lines (
    org_id,
    journal_entry_id,
    line_no,
    account_id,
    description,
    debit,
    credit
  )
  values (
    p_org_id,
    v_journal_id,
    2,
    v_settings.ar_account_id,
    concat('AR settlement ', coalesce(v_invoice.invoice_no, v_invoice.id::text)),
    0,
    v_receipt_amount
  );

  perform public.kd_post_journal_entry(
    p_org_id,
    v_journal_id,
    p_idempotency_key || ':journal'
  );

  update public.receipts
  set posted_journal_entry_id = v_journal_id,
      updated_at = v_now
  where id = v_receipt_id
    and org_id = p_org_id;

  v_current_paid := round(v_current_paid + v_receipt_amount, 2);
  v_is_fully_paid := v_current_paid + 0.009 >= v_total;

  update public.invoices
  set amount_paid = v_current_paid,
      status = case when v_is_fully_paid then 'paid' else 'posted' end,
      paid_at = case when v_is_fully_paid then v_now else null end,
      updated_by = auth.uid()
  where id = p_invoice_id
    and org_id = p_org_id;

  return query select v_receipt_id, v_journal_id, v_public_view_token;
end;
$$;

grant execute on function public.kd_verify_invoice_receipt(
  uuid,
  uuid,
  uuid,
  date,
  numeric,
  text,
  text,
  text,
  text,
  text
) to authenticated;

commit;
