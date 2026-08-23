-- Round 12: put the top pick back in the top column.
--
-- VegasHome wrote `top_pick: order[0]` on submit, so whoever was dropped into
-- P1 was stored as the top pick. Round 12 is the first round submitted through
-- that page and 7 of 48 rows carried a midfielder there. Admin scores
-- top_pick_pts off that field and sweeps the rest into midfield_pts, so the
-- same five drivers were split across the wrong two columns.
--
-- No total moves. top_pick_pts + midfield_pts is the sum of the same five
-- drivers either way, so no player total, no matchup and no championship point
-- changes. driver_pts is untouched and is the check: it already held the right
-- per-driver numbers, which is where the corrected split comes from.
--
-- Applied 2026-08-23. Recorded here because the app has no migration runner.

-- Larry Noel: Oscar Piastri -> George Russell, top/mid 8/21 -> 15/14
update picks  set top_pick = 'George Russell' where id = '2eb001ba-500c-4323-97b9-1025e81a9dd6';
update scores set top_pick_pts = 15, midfield_pts = 14 where id = 'bd21aaf0-53ff-4714-a906-1c256bdc24d6';

-- Evie Ishak: Oscar Piastri -> Lando Norris, top/mid 8/25 -> 25/8
update picks  set top_pick = 'Lando Norris' where id = '9b0b5bf7-18f9-4fb1-83f6-4df844a575f0';
update scores set top_pick_pts = 25, midfield_pts = 8 where id = '8ddb85a4-36d5-4d28-8146-3cc1ec4f7cbc';

-- George Fahmy: Max Verstappen -> Lewis Hamilton, top/mid -1/27 -> 12/14
update picks  set top_pick = 'Lewis Hamilton' where id = '4ceae233-1ab2-4ed5-aa79-5835953e4542';
update scores set top_pick_pts = 12, midfield_pts = 14 where id = '063d6603-d042-4a1d-815e-822fc17a21cc';

-- Ronnie Nobar: Max Verstappen -> Lewis Hamilton, top/mid -1/27 -> 12/14
update picks  set top_pick = 'Lewis Hamilton' where id = '8916c929-6056-43d2-b576-deae9ee0ac1e';
update scores set top_pick_pts = 12, midfield_pts = 14 where id = 'e7612bcd-b725-4edf-a619-08f3a4c4469c';

-- Formula5 Bot: Max Verstappen -> Lewis Hamilton, top/mid -1/27 -> 12/14
update picks  set top_pick = 'Lewis Hamilton' where id = '6eb8e242-3844-4f21-867f-5a466f9c3717';
update scores set top_pick_pts = 12, midfield_pts = 14 where id = '3e1fa5d4-015d-4b1c-ac7c-1a3419434344';

-- Scott Schertler: Max Verstappen -> Lewis Hamilton, top/mid -1/26 -> 12/13
update picks  set top_pick = 'Lewis Hamilton' where id = '1bf35b72-934d-421a-9e81-14a026a3aeb5';
update scores set top_pick_pts = 12, midfield_pts = 13 where id = '366d6926-db46-4e7e-bd56-b88495bae337';

-- Dan Patry: Max Verstappen -> Lewis Hamilton, top/mid -1/19 -> 12/6
update picks  set top_pick = 'Lewis Hamilton' where id = '5dcc3319-8db9-4742-b121-d9c6cf2e2592';
update scores set top_pick_pts = 12, midfield_pts = 6 where id = 'd3294b60-4fe7-4649-86cf-c3e06c9abc1f';

-- Check: nothing outside the pool is left, season-wide.
-- select r.round, count(*) from picks p join races r on r.id = p.race_id
--  where r.top_drivers is not null and not (p.top_pick = any(r.top_drivers))
--  group by r.round;
