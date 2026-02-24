begin;

alter table if exists public.organizations
  add column if not exists dashboard_name text;

alter table if exists public.organizations
  add column if not exists dashboard_logo_url text;

alter table if exists public.organizations
  add column if not exists dashboard_color_scheme text not null default 'default';

do $$
begin
  alter table public.organizations
    add constraint organizations_dashboard_color_scheme_check
    check (
      dashboard_color_scheme in ('default', 'emerald', 'indigo', 'rose', 'amber', 'teal', 'slate')
    );
exception when duplicate_object then null;
end $$;

commit;

