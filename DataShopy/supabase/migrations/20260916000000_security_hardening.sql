-- Server-side enforcement of business rules that the app currently only checks
-- client-side (bypassable by anyone calling the Supabase REST API directly).

-- 1) One store per owner.
create unique index if not exists stores_owner_id_unique_idx
  on public.stores (owner_id)
  where owner_id is not null;

-- 2) Max 5 active promotions per store.
create or replace function public.enforce_max_active_promotions()
returns trigger as $$
declare
  active_count integer;
begin
  if new.is_active is true then
    select count(*) into active_count
    from public.promotions
    where store_id = new.store_id
      and is_active = true
      and id <> coalesce(new.id, -1);

    if active_count >= 5 then
      raise exception 'Ya tienes 5 promociones activas. Desactiva una antes de crear otra.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_enforce_max_active_promotions on public.promotions;
create trigger trg_enforce_max_active_promotions
  before insert or update on public.promotions
  for each row
  execute function public.enforce_max_active_promotions();
