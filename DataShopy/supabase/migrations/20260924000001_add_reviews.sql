-- Ratings & reviews: one review per user per store (editable), readable by
-- everyone, writable only by its author, and never by the store's own owner.
create table public.reviews (
  id bigint generated always as identity primary key,
  store_id bigint not null references public.stores (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 500),
  author_name text not null default 'Usuario',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, user_id)
);

create index idx_reviews_store_created on public.reviews (store_id, created_at desc);
create index idx_reviews_user_id on public.reviews (user_id);

alter table public.reviews enable row level security;

create policy reviews_select_public on public.reviews
  for select to anon, authenticated
  using (true);

create policy reviews_insert_own on public.reviews
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and not exists (
      select 1 from public.stores s where s.id = reviews.store_id and s.owner_id = (select auth.uid())
    )
  );

create policy reviews_update_own on public.reviews
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and not exists (
      select 1 from public.stores s where s.id = reviews.store_id and s.owner_id = (select auth.uid())
    )
  );

-- Authors can delete their own review; admins can delete any (moderation).
create policy reviews_delete_own_or_admin on public.reviews
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  );

-- The author name is copied from the profile server-side (so it can't be
-- spoofed) and identity columns can't be changed by an update.
create or replace function public.reviews_before_write()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.author_name := coalesce(nullif(trim((select p.name from public.profiles p where p.id = new.user_id)), ''), 'Usuario');
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    new.user_id := old.user_id;
    new.store_id := old.store_id;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

create trigger trg_reviews_before_write
  before insert or update on public.reviews
  for each row execute function public.reviews_before_write();

-- Per-store aggregate, computed on read (nothing on `stores` for an owner to
-- tamper with). security_invoker keeps it subject to reviews' RLS.
create view public.store_rating_stats with (security_invoker = true) as
  select store_id,
         round(avg(rating)::numeric, 2) as rating_avg,
         count(*)::int as rating_count
  from public.reviews
  group by store_id;

grant select on public.store_rating_stats to anon, authenticated;
