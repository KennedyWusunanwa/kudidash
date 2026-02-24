-- Fix org bootstrap RLS cycle:
-- org_members insert policy checks organizations(created_by),
-- but organizations select policy previously required org_members to exist.

begin;

drop policy if exists organizations_select on public.organizations;

create policy organizations_select on public.organizations
for select using (
  created_by = auth.uid()
  or exists (
    select 1
    from public.org_members om
    where om.org_id = id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);

commit;
