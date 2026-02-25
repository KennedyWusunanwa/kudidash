begin;

alter table if exists public.organizations
  add column if not exists invoice_company_name text;

alter table if exists public.organizations
  add column if not exists invoice_company_address text;

alter table if exists public.organizations
  add column if not exists invoice_company_phone text;

alter table if exists public.organizations
  add column if not exists invoice_company_email text;

alter table if exists public.organizations
  add column if not exists invoice_company_tax_id text;

alter table if exists public.organizations
  add column if not exists invoice_logo_url text;

commit;

