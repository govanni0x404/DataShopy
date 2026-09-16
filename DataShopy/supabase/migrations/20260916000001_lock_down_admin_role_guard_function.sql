-- The previous migration made prevent_self_admin_role() SECURITY DEFINER,
-- which the Supabase linter flags because it becomes callable directly as a
-- public RPC endpoint (/rest/v1/rpc/prevent_self_admin_role) by anon/authenticated
-- roles. It doesn't need elevated privileges (it only reads auth.role() and
-- raises), so switch it to SECURITY INVOKER and revoke direct RPC execution.
-- Trigger firing is unaffected by revoking EXECUTE (Postgres invokes trigger
-- functions internally, not as a permission-checked function call).
create or replace function public.prevent_self_admin_role()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.role = 'admin' and auth.role() is distinct from 'service_role' and auth.role() is not null then
    raise exception 'No autorizado para asignar rol admin.';
  end if;
  return new;
end;
$$;

revoke execute on function public.prevent_self_admin_role() from public, anon, authenticated;
