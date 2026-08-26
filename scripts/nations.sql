-- Flags. Additive: two nullable columns, nothing dropped, nothing rewritten.
--
-- A null means "has not chosen", which falls back to the map in src/nations.js
-- and then to the default. An empty string means "chose no flag", which is a
-- real answer and draws nothing. Those two are deliberately different.
--
-- Codes are ISO 3166-1 alpha-2 for countries and US-XX for states and
-- territories, matching src/nationList.js. AL is Albania; Alabama is US-AL.

alter table players add column if not exists nation text;
alter table teams   add column if not exists nation text;

-- Anyone signed in can set a flag. The app is a private league behind a name
-- picker, and the same anon key already writes picks and driver pools, so this
-- adds no access that was not already there.
drop policy if exists "players nation update" on players;
create policy "players nation update" on players
  for update using (true) with check (true);

drop policy if exists "teams nation update" on teams;
create policy "teams nation update" on teams
  for update using (true) with check (true);
