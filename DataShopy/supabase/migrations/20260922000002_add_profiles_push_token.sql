-- Expo push token for this user's current device, so the server can send
-- real push notifications (e.g. "tu reclamo fue aprobado") instead of only
-- showing promos inside the app. A user can only be signed in on one
-- device's token at a time with this simple design (last write wins).
alter table public.profiles add column if not exists push_token text;
