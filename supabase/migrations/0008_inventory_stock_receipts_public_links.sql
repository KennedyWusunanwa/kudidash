begin;

alter table public.inventory_items
  add column if not exists quantity_on_hand numeric(18,4) not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'inventory_items_quantity_on_hand_check'
  ) then
    alter table public.inventory_items
      add constraint inventory_items_quantity_on_hand_check check (quantity_on_hand >= 0);
  end if;
end $$;

alter table public.invoices
  add column if not exists amount_paid numeric(18,2) not null default 0,
  add column if not exists paid_at timestamptz,
  add column if not exists customer_name text,
  add column if not exists customer_email text,
  add column if not exists customer_phone text,
  add column if not exists customer_billing_address text,
  add column if not exists customer_tax_id text,
  add column if not exists customer_description text,
  add column if not exists public_view_token uuid not null default gen_random_uuid();

create unique index if not exists idx_invoices_public_view_token
  on public.invoices(public_view_token);

update public.invoices i
set customer_name = coalesce(i.customer_name, c.name),
    customer_email = coalesce(i.customer_email, c.email),
    customer_phone = coalesce(i.customer_phone, c.phone),
    customer_billing_address = coalesce(i.customer_billing_address, c.billing_address),
    customer_tax_id = coalesce(i.customer_tax_id, c.tax_id),
    customer_description = coalesce(i.customer_description, c.description)
from public.customers c
where c.id = i.customer_id
  and c.org_id = i.org_id;

alter table public.invoice_lines
  add column if not exists inventory_item_id uuid references public.inventory_items(id);

create index if not exists idx_invoice_lines_org_inventory_item
  on public.invoice_lines(org_id, inventory_item_id);

alter table public.bill_lines
  add column if not exists inventory_item_id uuid references public.inventory_items(id);

create index if not exists idx_bill_lines_org_inventory_item
  on public.bill_lines(org_id, inventory_item_id);

alter table public.receipts
  add column if not exists notes text,
  add column if not exists payment_method text,
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid references auth.users(id),
  add column if not exists customer_name text,
  add column if not exists customer_email text,
  add column if not exists public_view_token uuid not null default gen_random_uuid();

create unique index if not exists idx_receipts_public_view_token
  on public.receipts(public_view_token);

create index if not exists idx_receipt_allocations_org_invoice
  on public.receipt_allocations(org_id, invoice_id);

update public.receipts r
set customer_name = coalesce(r.customer_name, c.name),
    customer_email = coalesce(r.customer_email, c.email)
from public.customers c
where c.id = r.customer_id
  and c.org_id = r.org_id;

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
  v_next_line_no int;
  v_stock_item record;
  v_cost numeric(18,2);
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

  if v_invoice.status = 'posted' or v_invoice.status = 'paid' then
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
    round(il.line_total, 2)
  from public.invoice_lines il
  where il.org_id = p_org_id
    and il.invoice_id = p_invoice_id
  order by il.line_no;

  select coalesce(max(line_no), 0) + 1
  into v_next_line_no
  from public.journal_lines
  where journal_entry_id = v_journal_id;

  for v_stock_item in
    select
      il.inventory_item_id,
      max(ii.name) as item_name,
      max(ii.quantity_on_hand) as quantity_on_hand,
      max(ii.purchase_price) as unit_cost,
      max(ii.inventory_account_id) as inventory_account_id,
      max(ii.cogs_account_id) as cogs_account_id,
      round(sum(il.quantity), 4) as quantity_sold
    from public.invoice_lines il
    join public.inventory_items ii
      on ii.id = il.inventory_item_id
     and ii.org_id = p_org_id
    where il.org_id = p_org_id
      and il.invoice_id = p_invoice_id
      and il.inventory_item_id is not null
    group by il.inventory_item_id
  loop
    if v_stock_item.quantity_on_hand < v_stock_item.quantity_sold then
      raise exception 'Insufficient stock for item %', coalesce(v_stock_item.item_name, v_stock_item.inventory_item_id::text);
    end if;

    if v_stock_item.inventory_account_id is null or v_stock_item.cogs_account_id is null then
      raise exception 'Inventory item % requires inventory and COGS accounts before posting', coalesce(v_stock_item.item_name, v_stock_item.inventory_item_id::text);
    end if;

    v_cost := round(v_stock_item.quantity_sold * coalesce(v_stock_item.unit_cost, 0), 2);

    if v_cost > 0 then
      insert into public.journal_lines (org_id, journal_entry_id, line_no, account_id, description, debit, credit)
      values (
        p_org_id,
        v_journal_id,
        v_next_line_no,
        v_stock_item.cogs_account_id,
        concat('COGS - ', coalesce(v_stock_item.item_name, 'Inventory Item')),
        v_cost,
        0
      );
      v_next_line_no := v_next_line_no + 1;

      insert into public.journal_lines (org_id, journal_entry_id, line_no, account_id, description, debit, credit)
      values (
        p_org_id,
        v_journal_id,
        v_next_line_no,
        v_stock_item.inventory_account_id,
        concat('Inventory reduction - ', coalesce(v_stock_item.item_name, 'Inventory Item')),
        0,
        v_cost
      );
      v_next_line_no := v_next_line_no + 1;
    end if;

    update public.inventory_items
    set quantity_on_hand = round(quantity_on_hand - v_stock_item.quantity_sold, 4),
        updated_at = timezone('utc', now())
    where id = v_stock_item.inventory_item_id
      and org_id = p_org_id;

    insert into public.inventory_movements (
      org_id,
      item_id,
      movement_date,
      quantity,
      unit_cost,
      source_module,
      source_id
    )
    values (
      p_org_id,
      v_stock_item.inventory_item_id,
      v_invoice.invoice_date,
      -1 * v_stock_item.quantity_sold,
      coalesce(v_stock_item.unit_cost, 0),
      'sales_invoice',
      v_invoice.id
    );
  end loop;

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
  v_bill_line record;
  v_next_line_no int;
  v_debit_account_id uuid;
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

  if v_bill.status = 'posted' or v_bill.status = 'paid' then
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

  v_next_line_no := 1;

  for v_bill_line in
    select
      bl.line_no,
      bl.description,
      bl.quantity,
      bl.unit_cost,
      bl.line_total,
      bl.expense_account_id,
      bl.inventory_item_id,
      ii.name as inventory_item_name,
      ii.inventory_account_id
    from public.bill_lines bl
    left join public.inventory_items ii
      on ii.id = bl.inventory_item_id
     and ii.org_id = p_org_id
    where bl.org_id = p_org_id
      and bl.bill_id = p_bill_id
    order by bl.line_no
  loop
    v_debit_account_id := case
      when v_bill_line.inventory_item_id is not null then coalesce(v_bill_line.inventory_account_id, v_bill_line.expense_account_id)
      else v_bill_line.expense_account_id
    end;

    if v_debit_account_id is null then
      raise exception 'Bill line % is missing a debit account', v_bill_line.line_no;
    end if;

    insert into public.journal_lines (org_id, journal_entry_id, line_no, account_id, description, debit, credit)
    values (
      p_org_id,
      v_journal_id,
      v_next_line_no,
      v_debit_account_id,
      v_bill_line.description,
      round(v_bill_line.line_total, 2),
      0
    );
    v_next_line_no := v_next_line_no + 1;

    if v_bill_line.inventory_item_id is not null then
      update public.inventory_items
      set quantity_on_hand = round(quantity_on_hand + coalesce(v_bill_line.quantity, 0), 4),
          purchase_price = round(coalesce(v_bill_line.unit_cost, purchase_price), 2),
          updated_at = timezone('utc', now())
      where id = v_bill_line.inventory_item_id
        and org_id = p_org_id;

      insert into public.inventory_movements (
        org_id,
        item_id,
        movement_date,
        quantity,
        unit_cost,
        source_module,
        source_id
      )
      values (
        p_org_id,
        v_bill_line.inventory_item_id,
        v_bill.bill_date,
        coalesce(v_bill_line.quantity, 0),
        coalesce(v_bill_line.unit_cost, 0),
        'purchase_bill',
        v_bill.id
      );
    end if;
  end loop;

  insert into public.journal_lines (org_id, journal_entry_id, line_no, account_id, description, debit, credit)
  values (
    p_org_id,
    v_journal_id,
    v_next_line_no,
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

commit;
