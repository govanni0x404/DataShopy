-- Free-text list of what a store sells / words customers might search for
-- (e.g. "rueda, manubrio, sillín" for a bike shop). Store descriptions are
-- usually too short to be findable by product terms, so owners/admins list
-- them here and the client search matches against this field too.
alter table public.stores add column if not exists keywords text;
