-- Mark the picks the randomizer made before it labelled them.
--
-- Run scripts/picks_auto_column.sql first, or run this file: the column is
-- added here too, so one paste in the Supabase SQL editor does both.
--
-- Found 2026-09-25 by timestamp: a random pick lands after the deadline and
-- Admin's generator stamps a whole batch with the same minute. Sixteen rows
-- fit that shape; the six in round 11 were entered by hand for players who
-- had picked, Andrew's word, so they stay unmarked. Ten rows, six rounds.
alter table picks add column if not exists auto boolean not null default false;

comment on column picks.auto is
  'true when the randomizer (Admin or Fernolo 5 Bort) filled these in after the deadline';

update picks k
   set auto = true
  from races r, players p
 where k.race_id = r.id
   and k.player_id = p.id
   and (r.round, p.name) in (
     (9,  'Pavly Attalah'),
     (9,  'Dan Patry'),
     (10, 'Pavly Attalah'),
     (12, 'Brian Dong'),
     (12, 'Max Reisinger'),
     (13, 'Pavly Attalah'),
     (13, 'Ramy Stephanos'),
     (14, 'Jack Civitts'),
     (15, 'Pavly Attalah'),
     (15, 'Stacy Michaelsen')
   );

-- Expect 10.
select r.round, p.name, k.submitted_at
  from picks k join races r on r.id = k.race_id join players p on p.id = k.player_id
 where k.auto
 order by r.round, p.name;
