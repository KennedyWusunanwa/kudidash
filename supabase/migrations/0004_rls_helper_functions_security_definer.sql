-- Fix recursive RLS evaluation on org_members by running helper functions as definer.
-- These helpers are used inside policies and query RLS-protected tables.

begin;

create or replace function public.kd_is_org_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
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
security definer
set search_path = public
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
security definer
set search_path = public
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

commit;
