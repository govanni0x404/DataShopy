-- The "max 5 active promotions" trigger counted is_active=true rows
-- regardless of whether they had already expired, which could block an
-- owner from creating a new promotion even when all their "active" ones
-- were actually expired and no longer shown to customers. A promotion is
-- only really active while it hasn't expired (expires_at null = never
-- expires).
create or replace function public.enforce_max_active_promotions()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  active_count integer;
begin
  if new.is_active is true and (new.expires_at is null or new.expires_at >= current_date) then
    select count(*) into active_count
    from public.promotions
    where store_id = new.store_id
      and is_active = true
      and (expires_at is null or expires_at >= current_date)
      and id <> coalesce(new.id, -1);

    if active_count >= 5 then
      raise exception 'Ya tienes 5 promociones activas. Desactiva una antes de crear otra.';
    end if;
  end if;
  return new;
end;
$$;
