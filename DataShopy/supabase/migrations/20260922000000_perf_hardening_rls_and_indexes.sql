-- 1) RLS policies were calling auth.uid()/auth.role() directly, which
--    Postgres re-evaluates for every row scanned. Wrapping in (select ...)
--    lets the planner evaluate it once per query instead — same access
--    rules, much cheaper at scale. No behavior change.
alter policy claims_insert_owner on public.claims
  with check (
    (owner_id = (select auth.uid()))
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'owner')
  );

alter policy claims_select_owner_or_admin on public.claims
  using (
    (owner_id = (select auth.uid()))
    or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  );

alter policy profiles_select_own on public.profiles
  using (id = (select auth.uid()));

alter policy profiles_update_own on public.profiles
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

alter policy profiles_upsert_own on public.profiles
  with check (id = (select auth.uid()));

alter policy promos_update_owner_only on public.promotions
  using (exists (select 1 from public.stores s where s.id = promotions.store_id and s.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.stores s where s.id = promotions.store_id and s.owner_id = (select auth.uid())));

alter policy promos_write_owner_only on public.promotions
  with check (
    exists (
      select 1 from public.stores s
      where s.id = promotions.store_id and s.owner_id = (select auth.uid()) and s.claimed = true
    )
  );

alter policy stores_update_owner_only on public.stores
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- 2) tracking_events had two separate permissive SELECT policies for the
--    same role/action (owner-of-store, admin), so Postgres had to evaluate
--    both on every query. Merge into one.
drop policy if exists tracking_select_admin_only on public.tracking_events;
drop policy if exists tracking_select_owner_store on public.tracking_events;
create policy tracking_select_owner_or_admin on public.tracking_events
  for select
  using (
    exists (select 1 from public.stores s where s.id = tracking_events.store_id and s.owner_id = (select auth.uid()))
    or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  );

-- 3) Foreign keys without a covering index slow down joins/deletes as these
--    tables grow.
create index if not exists idx_claims_owner_id on public.claims (owner_id);
create index if not exists idx_tracking_events_owner_id on public.tracking_events (owner_id);
create index if not exists idx_tracking_events_store_id on public.tracking_events (store_id);
create index if not exists idx_tracking_events_user_id on public.tracking_events (user_id);
