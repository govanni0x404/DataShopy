-- tracking_events (store views, call clicks, directions clicks) had no
-- retention policy and would grow forever. Keep a rolling 12 months of
-- history (enough for year-over-year stats) and prune older rows daily.
create extension if not exists pg_cron with schema extensions;

create or replace function public.prune_old_tracking_events()
returns void
language sql
set search_path = public
as $$
  delete from public.tracking_events where created_at < now() - interval '12 months';
$$;

select cron.unschedule(jobid) from cron.job where jobname = 'prune_old_tracking_events';

select cron.schedule(
  'prune_old_tracking_events',
  '0 3 * * *',
  $$select public.prune_old_tracking_events();$$
);
