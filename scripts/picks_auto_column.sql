-- Mark the picks Fernolo made.
--
-- Without this a bot pick and a real one are the same row, so a box score
-- cannot say which weeks somebody actually played. Additive, and false for
-- every row that already exists, which is correct: nothing before now was
-- filled in automatically.
alter table picks add column if not exists auto boolean not null default false;

comment on column picks.auto is
  'true when Fernolo 5 Bort filled these in after the deadline';
