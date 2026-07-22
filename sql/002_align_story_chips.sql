-- Align the standings-chart chips with each team's status chip (the matchup
-- card `tag`) in the Round 11 preview. Run this in the Supabase SQL editor.
--
-- The two standings blocks were carrying their own taxonomy (TITLE, EXPOSED,
-- DANGER, UP, WIN BIG, DOWN) while the team cards below them said something
-- else for the same team. This rewrites chip/ctone on every standings row to
-- whatever that team's card says, and touches nothing else in the body.
--
-- src/news.js already carries the same values, so the fallback story and the
-- published row stay in step.

with chip_map(name, chip, ctone) as (values
  -- Championship
  ('Van City Corsa',         'SAFE',         'good'),
  ('Juicero Silicon Valley', 'SAFE',         'good'),
  ('XLIX Racing Team',       'SAFE',         'good'),
  ('Cougar Autosport',       'SAFE',         'good'),
  ('Drivetex',               'SWAP RISK',    'warn'),
  ('East Bay Racing',        'SWAP RISK',    'warn'),
  ('Garra Dynamics',         'WIN TO STAY',  'warn'),
  ('El Camino Rapido',       'IN DANGER',    'warn'),
  ('Stalloni 1851',          'IN DANGER',    'warn'),
  ('Cascadia Motorsport',    'IN DANGER',    'warn'),
  ('Wildcat Motors',         'MUST WIN',     'bad'),
  ('Bronco SCUderia',        'MUST WIN',     'bad'),
  -- Second Division
  ('Meatballs',              'GOING UP',     'good'),
  ('TNT Roku F5 Team',       'GOING UP',     'good'),
  ('HomeworkTubes.Com',      'GOING UP',     'good'),
  ('Peloton Aubergine',      'IN THE HUNT',  'warn'),
  ('Cal Aggie Racing',       'IN THE HUNT',  'warn'),
  ('Luxor Motorsport',       'MUST WIN',     'bad'),
  ('Shoey Time!',            'MUST WIN BIG', 'bad'),
  ('Magic Kingdom Racing',   'LONG SHOT',    'warn'),
  ('TJ Premium',             'STAYING DOWN', 'dead'),
  ('Prestissimo Veloce',     'STAYING DOWN', 'dead'),
  ('Aggie Slipstream',       'STAYING DOWN', 'dead'),
  ('Scuderia Iskandaraya',   'STAYING DOWN', 'dead')
),
patched as (
  select
    n.id,
    (
      select jsonb_agg(
        case
          when blk->>'t' = 'standings' then jsonb_set(blk, '{rows}', (
            select jsonb_agg(
              case when m.name is null then r
                   else r || jsonb_build_object('chip', m.chip, 'ctone', m.ctone)
              end
              order by (r->>'pos')::int
            )
            from jsonb_array_elements(blk->'rows') as r
            left join chip_map m on m.name = r->>'name'
          ))
          else blk
        end
        order by ord
      )
      from jsonb_array_elements(n.body) with ordinality as b(blk, ord)
    ) as body
  from public.news n
  where n.slug = 'r11-preview'
)
update public.news n
   set body = p.body
  from patched p
 where n.id = p.id
   and p.body is not null
returning n.slug, jsonb_array_length(n.body) as blocks;

-- Check: every standings row and what it now reads.
select b.blk->>'title' as block, r->>'pos' as pos, r->>'name' as name,
       r->>'chip' as chip, r->>'ctone' as ctone
  from public.news n,
       jsonb_array_elements(n.body) as b(blk),
       jsonb_array_elements(b.blk->'rows') as r
 where n.slug = 'r11-preview' and b.blk->>'t' = 'standings'
 order by (r->>'pos')::int;
