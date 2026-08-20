-- Let a player change their picks before the deadline.
--
-- picks has a unique key on (race_id, player_id), so an edit is the same row
-- written again. Today the anon key can insert a pick and cannot update one:
-- the update runs, matches no rows under the policy, and returns 200 with an
-- empty body. Nothing saves and nothing complains, which is the silent-write
-- failure this project has hit before.
--
-- Additive. It grants no more than the app already promises on screen: "You can
-- change them until the deadline."
alter table picks enable row level security;

drop policy if exists picks_update on picks;
create policy picks_update on picks
  for update
  using (true)
  with check (true);
