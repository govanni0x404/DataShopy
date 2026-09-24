-- Favorites used to live only in each phone's SQLite, so they were lost on
-- reinstall / new device and the server could not know who to notify about
-- a store's new promotions. One row per (user, store).
create table public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  store_id bigint not null references public.stores (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, store_id)
);

-- store_id lookups: "who favorited this store" (push fan-out) and FK cascades.
create index idx_favorites_store_id on public.favorites (store_id);

alter table public.favorites enable row level security;

create policy favorites_select_own on public.favorites
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy favorites_insert_own on public.favorites
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy favorites_delete_own on public.favorites
  for delete to authenticated
  using (user_id = (select auth.uid()));
