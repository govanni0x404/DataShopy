-- Product showcase: each owner can list products (or packs of products) with
-- name, price, optional "before" price, description and photo. Everyone can
-- read active products; only the owner of a claimed store can write them.
create table public.products (
  id bigint generated always as identity primary key,
  store_id bigint not null references public.stores (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  description text check (description is null or char_length(description) <= 300),
  price numeric(12, 2) not null check (price >= 0),
  compare_at_price numeric(12, 2) check (compare_at_price is null or compare_at_price >= 0),
  image_url text check (image_url is null or char_length(image_url) <= 1000),
  is_pack boolean not null default false,
  pack_items text check (pack_items is null or char_length(pack_items) <= 300),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_products_store_created on public.products (store_id, created_at desc);

alter table public.products enable row level security;

-- Clients see active products; the store owner also sees their hidden ones.
create policy products_select_public on public.products
  for select to anon, authenticated
  using (
    is_active
    or exists (select 1 from public.stores s where s.id = products.store_id and s.owner_id = (select auth.uid()))
  );

create policy products_insert_owner on public.products
  for insert to authenticated
  with check (
    exists (
      select 1 from public.stores s
      where s.id = products.store_id and s.owner_id = (select auth.uid()) and s.claimed = true
    )
  );

create policy products_update_owner on public.products
  for update to authenticated
  using (exists (select 1 from public.stores s where s.id = products.store_id and s.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.stores s where s.id = products.store_id and s.owner_id = (select auth.uid())));

create policy products_delete_owner on public.products
  for delete to authenticated
  using (exists (select 1 from public.stores s where s.id = products.store_id and s.owner_id = (select auth.uid())));

-- Keep identity columns fixed on update, bump updated_at, and cap each store
-- at 30 products so the catalog stays a showcase (not a full inventory).
create or replace function public.products_before_write()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    new.store_id := old.store_id;
    new.created_at := old.created_at;
  elsif (select count(*) from public.products p where p.store_id = new.store_id) >= 30 then
    raise exception 'Máximo 30 productos por tienda.';
  end if;
  return new;
end;
$$;

create trigger trg_products_before_write
  before insert or update on public.products
  for each row execute function public.products_before_write();
