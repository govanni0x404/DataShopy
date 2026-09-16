-- 1) stores was missing the branding columns the app has been trying to
--    write to since OwnerBrandingScreen was built. Every "Guardar" there was
--    silently failing at the DB level with "column does not exist".
alter table public.stores
  add column if not exists logo_url text,
  add column if not exists cover_image_url text,
  add column if not exists gallery_urls jsonb not null default '[]'::jsonb;

-- 2) profiles: add email (denormalized from auth.users, so it's visible
--    directly in the table/dashboard instead of having to cross-reference
--    auth.users) and updated_at for consistency with the other tables.
alter table public.profiles
  add column if not exists email text,
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- Backfill existing rows.
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

-- 3) Keep profiles.email in sync automatically going forward, and make sure
--    every auth user ends up with a profile row even if the app's own
--    upsertProfile() call after signUp() fails or is skipped (it swallows
--    errors in a few places). Defaults to role 'customer'; the app's own
--    upsertProfile call right after signup still sets the real role
--    ('owner'/'customer') and overwrites this default.
create or replace function public.sync_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', null))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists trg_sync_profile_from_auth_user on auth.users;
create trigger trg_sync_profile_from_auth_user
  after insert or update of email on auth.users
  for each row
  execute function public.sync_profile_from_auth_user();

revoke execute on function public.sync_profile_from_auth_user() from public, anon, authenticated;

-- 4) promotions: add updated_at for consistency (title/description/tag edits
--    currently leave no trace of when they last changed).
alter table public.promotions add column if not exists updated_at timestamptz not null default now();

drop trigger if exists trg_promotions_updated_at on public.promotions;
create trigger trg_promotions_updated_at
  before update on public.promotions
  for each row
  execute function public.set_updated_at();
