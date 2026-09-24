-- Server-side push notifications straight from Postgres via pg_net (no Edge
-- Function or secrets needed: Expo's push API is open).
create extension if not exists pg_net with schema extensions;

-- Sends one Expo push message per token (batched 100 per HTTP call, the API
-- limit). Never raises: a failed push must not fail the row that triggered it.
create or replace function public.send_expo_push(tokens text[], p_title text, p_body text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  i int := 1;
  total int;
  chunk jsonb;
begin
  total := coalesce(array_length(tokens, 1), 0);
  while i <= total loop
    select jsonb_agg(jsonb_build_object('to', t, 'title', p_title, 'body', p_body, 'sound', 'default'))
      into chunk
      from unnest(tokens[i:i + 99]) as t;
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := chunk,
      headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb
    );
    i := i + 100;
  end loop;
exception when others then
  raise warning 'send_expo_push failed: %', sqlerrm;
end;
$$;

-- New active promo -> notify everyone who favorited that store.
create or replace function public.notify_favorites_new_promo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_name text;
  v_owner uuid;
  v_tokens text[];
begin
  if new.is_active is not true or (new.expires_at is not null and new.expires_at < current_date) then
    return new;
  end if;

  select s.name, s.owner_id into v_store_name, v_owner from public.stores s where s.id = new.store_id;

  select array_agg(distinct p.push_token) into v_tokens
  from public.favorites f
  join public.profiles p on p.id = f.user_id
  where f.store_id = new.store_id
    and p.push_token is not null
    and p.id is distinct from v_owner;

  perform public.send_expo_push(v_tokens, coalesce(v_store_name, 'Un local') || ' tiene una promo nueva', new.title);
  return new;
exception when others then
  raise warning 'notify_favorites_new_promo failed: %', sqlerrm;
  return new;
end;
$$;

create trigger trg_notify_favorites_new_promo
  after insert on public.promotions
  for each row execute function public.notify_favorites_new_promo();

-- New review -> notify the store's owner.
create or replace function public.notify_owner_new_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_name text;
  v_token text;
begin
  select s.name, p.push_token into v_store_name, v_token
  from public.stores s
  left join public.profiles p on p.id = s.owner_id
  where s.id = new.store_id;

  if v_token is not null then
    perform public.send_expo_push(
      array[v_token],
      'Nueva reseña en ' || coalesce(v_store_name, 'tu local'),
      new.rating::text || ' de 5' || coalesce(': ' || nullif(left(new.comment, 100), ''), '')
    );
  end if;
  return new;
exception when others then
  raise warning 'notify_owner_new_review failed: %', sqlerrm;
  return new;
end;
$$;

create trigger trg_notify_owner_new_review
  after insert on public.reviews
  for each row execute function public.notify_owner_new_review();

-- These run only from triggers; nobody should be able to call them via the API.
revoke execute on function public.send_expo_push(text[], text, text) from public, anon, authenticated;
revoke execute on function public.notify_favorites_new_promo() from public, anon, authenticated;
revoke execute on function public.notify_owner_new_review() from public, anon, authenticated;
