-- The drivers' championship, refreshed every Monday by /api/cron/standings.
-- Additive: nothing reads it yet except the Tuesday pool draw, which falls back
-- to computing the table live if this is empty.
create table if not exists driver_standings (
  driver      text primary key,
  position    integer not null,
  points      numeric not null default 0,
  rounds      integer not null default 0,
  updated_at  timestamptz not null default now()
);

alter table driver_standings enable row level security;

-- Same shape as the rest of the app: the anon key reads and writes, because
-- Admin already writes driver pools that way from the browser.
drop policy if exists driver_standings_read on driver_standings;
create policy driver_standings_read on driver_standings for select using (true);

drop policy if exists driver_standings_write on driver_standings;
create policy driver_standings_write on driver_standings for all using (true) with check (true);
