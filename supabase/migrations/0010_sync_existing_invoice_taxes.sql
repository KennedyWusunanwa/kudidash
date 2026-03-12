begin;

create or replace function public.kd_sync_draft_invoice_taxes(
  p_org_id uuid
)
returns void
language plpgsql
as $$
declare
  v_tax_rate numeric(9,4) := 0;
begin
  if auth.uid() is not null and not public.kd_is_org_member(p_org_id) then
    raise exception 'Access denied for organization';
  end if;

  select coalesce(s.sales_tax_rate, 0)
  into v_tax_rate
  from public.org_account_settings s
  where s.org_id = p_org_id;

  v_tax_rate := coalesce(v_tax_rate, 0);

  update public.invoice_lines il
  set tax_amount = round(round(coalesce(il.quantity, 0) * coalesce(il.unit_price, 0), 2) * (v_tax_rate / 100), 2),
      line_total = round(
        round(coalesce(il.quantity, 0) * coalesce(il.unit_price, 0), 2) +
        round(round(coalesce(il.quantity, 0) * coalesce(il.unit_price, 0), 2) * (v_tax_rate / 100), 2),
      2),
      updated_at = timezone('utc', now())
  from public.invoices i
  where i.id = il.invoice_id
    and i.org_id = il.org_id
    and i.org_id = p_org_id
    and i.status in ('draft', 'approved');

  update public.invoices i
  set tax_rate = v_tax_rate,
      subtotal = coalesce(totals.subtotal, 0),
      tax_total = coalesce(totals.tax_total, 0),
      total = coalesce(totals.total, 0),
      updated_at = timezone('utc', now()),
      updated_by = coalesce(auth.uid(), i.updated_by)
  from (
    select
      il.invoice_id,
      round(sum(round(coalesce(il.quantity, 0) * coalesce(il.unit_price, 0), 2)), 2) as subtotal,
      round(sum(il.tax_amount), 2) as tax_total,
      round(sum(il.line_total), 2) as total
    from public.invoice_lines il
    where il.org_id = p_org_id
    group by il.invoice_id
  ) totals
  where i.id = totals.invoice_id
    and i.org_id = p_org_id
    and i.status in ('draft', 'approved');

  update public.invoices i
  set tax_rate = v_tax_rate,
      subtotal = 0,
      tax_total = 0,
      total = 0,
      updated_at = timezone('utc', now()),
      updated_by = coalesce(auth.uid(), i.updated_by)
  where i.org_id = p_org_id
    and i.status in ('draft', 'approved')
    and not exists (
      select 1
      from public.invoice_lines il
      where il.org_id = i.org_id
        and il.invoice_id = i.id
    );
end;
$$;

grant execute on function public.kd_sync_draft_invoice_taxes(uuid) to authenticated;

do $$
declare
  v_org record;
begin
  for v_org in
    select org_id
    from public.org_account_settings
  loop
    perform public.kd_sync_draft_invoice_taxes(v_org.org_id);
  end loop;
end $$;

commit;
