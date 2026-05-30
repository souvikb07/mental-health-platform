-- MindBridge Sprint 1 anonymous data controls.
-- User-requested hard deletion stays behind one narrow service-role-only RPC.

create or replace function public.delete_anonymous_owner_data(p_owner_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.anonymous_owners
    where id = p_owner_id;
end;
$$;

revoke delete on table public.anonymous_owners
from service_role;

revoke all on function public.delete_anonymous_owner_data(uuid)
from public, anon, authenticated;

grant execute on function public.delete_anonymous_owner_data(uuid)
to service_role;
