-- Add default sale/purchase pricing to inventory items for form autofill across sales/purchases.

begin;

alter table public.inventory_items
  add column if not exists sale_price numeric(18,2) not null default 0,
  add column if not exists purchase_price numeric(18,2) not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'inventory_items_sale_price_check'
  ) then
    alter table public.inventory_items
      add constraint inventory_items_sale_price_check check (sale_price >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'inventory_items_purchase_price_check'
  ) then
    alter table public.inventory_items
      add constraint inventory_items_purchase_price_check check (purchase_price >= 0);
  end if;
end $$;

commit;
