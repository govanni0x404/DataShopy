-- Store owners can publish ONE public reply per review of their own store.
-- Column separation is enforced in a trigger: the author can only touch
-- rating/comment, the store owner can only touch the reply.
alter table public.reviews
  add column owner_reply text check (owner_reply is null or char_length(owner_reply) <= 500),
  add column owner_reply_at timestamptz;

create policy reviews_update_store_owner on public.reviews
  for update to authenticated
  using (exists (select 1 from public.stores s where s.id = reviews.store_id and s.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.stores s where s.id = reviews.store_id and s.owner_id = (select auth.uid())));

create or replace function public.reviews_before_write()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_actor uuid := (select auth.uid());
  v_is_owner boolean;
begin
  new.author_name := coalesce(nullif(trim((select p.name from public.profiles p where p.id = new.user_id)), ''), 'Usuario');

  if tg_op = 'INSERT' then
    -- a new review never starts with a reply
    new.owner_reply := null;
    new.owner_reply_at := null;
    new.updated_at := now();
    return new;
  end if;

  -- identity columns are immutable
  new.user_id := old.user_id;
  new.store_id := old.store_id;
  new.created_at := old.created_at;

  select exists (select 1 from public.stores s where s.id = old.store_id and s.owner_id = v_actor) into v_is_owner;

  if v_actor is not null and v_is_owner then
    -- store owner: only the reply can change
    new.rating := old.rating;
    new.comment := old.comment;
    new.updated_at := old.updated_at;
    new.owner_reply := nullif(trim(new.owner_reply), '');
    if new.owner_reply is distinct from old.owner_reply then
      new.owner_reply_at := case when new.owner_reply is null then null else now() end;
    else
      new.owner_reply_at := old.owner_reply_at;
    end if;
  else
    -- author (or anyone else): the reply is read-only
    new.owner_reply := old.owner_reply;
    new.owner_reply_at := old.owner_reply_at;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

-- A new/edited reply -> notify the reviewer.
create or replace function public.notify_reviewer_owner_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_name text;
  v_token text;
begin
  if new.owner_reply is null or new.owner_reply is not distinct from old.owner_reply then
    return new;
  end if;

  select s.name into v_store_name from public.stores s where s.id = new.store_id;
  select p.push_token into v_token from public.profiles p where p.id = new.user_id;

  if v_token is not null then
    perform public.send_expo_push(
      array[v_token],
      coalesce(v_store_name, 'Un local') || ' respondió tu reseña',
      left(new.owner_reply, 120)
    );
  end if;
  return new;
exception when others then
  raise warning 'notify_reviewer_owner_reply failed: %', sqlerrm;
  return new;
end;
$$;

create trigger trg_notify_reviewer_owner_reply
  after update of owner_reply on public.reviews
  for each row execute function public.notify_reviewer_owner_reply();

revoke execute on function public.notify_reviewer_owner_reply() from public, anon, authenticated;
