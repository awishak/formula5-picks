// Draws the second-half schedule: rounds 12-22, a straight round robin per division.
//
// Rules, agreed 2026-08-17:
//   1. Twelve teams, eleven rounds, every pair meets exactly once.
//   2. The last round robin week (round 22) is 1v2, 3v4, 5v6, 7v8, 9v10, 11v12,
//      seeded on first-half scoring average.
//   3. Round 23 is left undrawn. It gets seeded once round 22 is scored.
//   4. Every team takes the OVER five or six times across the eleven rounds.
//      home_team_id IS the OVER seat (Admin.jsx:547), so balancing the OVER
//      means balancing who sits home. Home carries no other meaning.
//
// Reads the Supabase export for team ids and chart-data.json for the new
// divisions. Writes nothing. Prints the draw and the SQL.

import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';

const EXPORT = process.env.F5_DATA || `${homedir()}/Downloads/formula5_data_2026-07-27.json`;
const data = JSON.parse(readFileSync(EXPORT, 'utf8'));
const charts = JSON.parse(readFileSync(new URL('./recap/chart-data.json', import.meta.url), 'utf8'));

const FIRST_ROUND = 12;
const ROUNDS = 11; // rounds 12-22. Round 23 stays undrawn.

// ---------------------------------------------------------------- seeding

const allTeams = [...charts.c1.champ, ...charts.c1.second];
const idByName = new Map(data.teams.map(t => [t.name, t.id]));

function seed(names) {
  return names
    .map(n => {
      const t = allTeams.find(x => x.name === n);
      if (!t) throw new Error(`no first-half row for ${n}`);
      const id = idByName.get(n);
      if (!id) throw new Error(`no team id for ${n}`);
      return { name: n, avg: t.avg, pts: t.pts, id };
    })
    // Scoring average seeds the draw. Three pairs tie on it, so first-half
    // championship points break the tie rather than the alphabet.
    .sort((a, b) => b.avg - a.avg || b.pts - a.pts || a.name.localeCompare(b.name));
}

const divisions = {
  championship: seed(charts.next.champ),
  second: seed(charts.next.second),
};

// ---------------------------------------------------------------- the draw

// Circle method over twelve slots. Slot 11 sits still, the rest rotate.
function circleRobin() {
  const n = 12;
  const fixed = n - 1;
  const ring = Array.from({ length: n - 1 }, (_, i) => i);
  const rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs = [[fixed, ring[r % ring.length]]];
    for (let i = 1; i <= (n - 2) / 2; i++) {
      const a = ring[(r + i) % ring.length];
      const b = ring[(r - i + ring.length * 2) % ring.length];
      pairs.push([a, b]);
    }
    rounds.push(pairs);
  }
  return rounds;
}

// Relabel slots to seeds so the final week lands on 1v2, 3v4, 5v6, and so on.
function relabelForFinale(rounds) {
  const last = rounds[rounds.length - 1];
  const slotToSeed = new Map();
  last.forEach(([a, b], k) => {
    slotToSeed.set(a, 2 * k);
    slotToSeed.set(b, 2 * k + 1);
  });
  if (slotToSeed.size !== 12) throw new Error('final week is not a perfect matching');
  return rounds.map(pairs => pairs.map(([a, b]) => [slotToSeed.get(a), slotToSeed.get(b)]));
}

// ------------------------------------------------------- OVER/UNDER seats

// Each matchup gives the OVER to one side. Two things have to hold at once:
//
//   Across all eleven weeks, every team takes the OVER five or six times, which
//   leaves it on the UNDER the other six or five.
//
//   Across the opening three weeks, every team takes the OVER at least once and
//   the UNDER at least once. Nobody spends the whole opening stretch on one side.
//
// Seeded so the draw comes out the same every run.
const EARLY = 3;

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function cost(seats) {
  const over = new Array(12).fill(0);
  const early = new Array(12).fill(0);
  seats.forEach((pairs, r) =>
    pairs.forEach(([o]) => {
      over[o]++;
      if (r < EARLY) early[o]++;
    })
  );
  let c = 0;
  for (let t = 0; t < 12; t++) {
    c += Math.max(0, 5 - over[t]) + Math.max(0, over[t] - 6);
    if (early[t] === 0 || early[t] === EARLY) c += 1;
  }
  return { c, over, early };
}

function assignOver(rounds, seed) {
  const rand = rng(seed);
  for (let attempt = 0; attempt < 40; attempt++) {
    const seats = rounds.map(pairs => pairs.map(p => (rand() < 0.5 ? [p[0], p[1]] : [p[1], p[0]])));
    let best = cost(seats).c;
    for (let step = 0; step < 20000 && best > 0; step++) {
      const r = Math.floor(rand() * seats.length);
      const m = Math.floor(rand() * seats[r].length);
      seats[r][m].reverse();
      const next = cost(seats).c;
      if (next <= best) best = next;
      else seats[r][m].reverse();
    }
    if (best === 0) {
      const { over, early } = cost(seats);
      return { seats, over, early };
    }
  }
  throw new Error('could not satisfy the OVER rules');
}

// ---------------------------------------------------------------- assemble

function draw(teams, seed) {
  const rounds = relabelForFinale(circleRobin());
  const { seats, over, early } = assignOver(rounds, seed);
  return {
    teams,
    over,
    early,
    weeks: seats.map((pairs, i) => ({
      round: FIRST_ROUND + i,
      matchups: pairs.map(([o, u]) => ({ over: teams[o], under: teams[u] })),
    })),
  };
}

// ----------------------------------------------------------------- checks

function check(name, d, roster) {
  const results = [];
  const pass = (label, ok, detail = '') => {
    results.push({ label, ok, detail });
    if (!ok) throw new Error(`${name}: ${label} FAILED ${detail}`);
  };

  // 1. No matchup happens more than once, and nobody plays twice in a week.
  const seen = new Set();
  const played = new Array(12).fill(0);
  let dupes = 0;
  for (const w of d.weeks) {
    const inWeek = new Set();
    for (const m of w.matchups) {
      const a = d.teams.indexOf(m.over);
      const b = d.teams.indexOf(m.under);
      const key = [a, b].sort((x, y) => x - y).join('-');
      if (seen.has(key)) dupes++;
      seen.add(key);
      if (inWeek.has(a) || inWeek.has(b)) dupes++;
      inWeek.add(a);
      inWeek.add(b);
      played[a]++;
      played[b]++;
    }
  }
  pass('no matchup happens more than once', dupes === 0 && seen.size === 66, `${seen.size} distinct pairs, ${dupes} repeats`);
  pass('every team plays eleven times', played.every(p => p === ROUNDS));

  // 2. Every matchup is inside one division.
  const inDivision = new Set(roster.map(t => t.id));
  const crossings = d.weeks.flatMap(w => w.matchups).filter(m => !inDivision.has(m.over.id) || !inDivision.has(m.under.id));
  pass('every matchup is intra-division', crossings.length === 0, `${crossings.length} crossings`);

  // 3. Five or six on each side, all season.
  const under = d.over.map(o => ROUNDS - o);
  pass('every team is OVER five or six times', d.over.every(c => c >= 5 && c <= 6), `range ${Math.min(...d.over)}-${Math.max(...d.over)}`);
  pass('every team is UNDER five or six times', under.every(c => c >= 5 && c <= 6), `range ${Math.min(...under)}-${Math.max(...under)}`);

  // 4. Nobody spends rounds 12, 13 and 14 all on one side.
  const stuck = d.teams.filter((_, i) => d.early[i] === 0 || d.early[i] === EARLY);
  pass('nobody is one-sided across rounds 12-14', stuck.length === 0, stuck.map(t => t.name).join(', '));

  // 5. The finale is seeded 1v2, 3v4, and so on.
  const finale = d.weeks[d.weeks.length - 1].matchups
    .map(m => [d.teams.indexOf(m.over), d.teams.indexOf(m.under)].sort((x, y) => x - y).join('v'))
    .sort();
  const want = ['0v1', '10v11', '2v3', '4v5', '6v7', '8v9'].sort();
  pass('round 22 is seeded 1v2, 3v4, 5v6, 7v8, 9v10, 11v12', finale.join(',') === want.join(','), finale.join(','));

  return results;
}

// ----------------------------------------------------------------- output

// Malaysia becomes round 16, so everything from the old round 16 shifts up one.
function raceName(round) {
  if (round === 16) return 'Bahrain Grand Prix, Sepang';
  if (round === 14) return 'Madrid Grand Prix';
  const r = data.races.find(x => x.round === (round > 16 ? round - 1 : round));
  return r ? r.race_name : '';
}

const out = {};
const checks = {};
const SEEDS = { championship: 20260817, second: 20260818 };
for (const [key, teams] of Object.entries(divisions)) {
  const d = draw(teams, SEEDS[key]);
  checks[key] = check(key, d, teams);
  out[key] = d;
}

const W = 26;
for (const [key, d] of Object.entries(out)) {
  const title = key === 'championship' ? 'CHAMPIONSHIP DIVISION' : 'SECOND DIVISION';
  console.log(`\n${'='.repeat(70)}\n${title}\n${'='.repeat(70)}`);
  console.log('\nSeeds, by first-half scoring average');
  d.teams.forEach((t, i) => console.log(`  ${String(i + 1).padStart(2)}. ${t.name.padEnd(W)} ${String(t.avg).padStart(5)}   ${t.pts} pts`));

  for (const w of d.weeks) {
    const tag = w.round === 22 ? '   [seeded finale]' : '';
    console.log(`\n  ROUND ${w.round}  ${raceName(w.round)}${tag}`);
    for (const m of w.matchups) {
      console.log(`     ${m.over.name.padEnd(W)} OVER   v   UNDER  ${m.under.name}`);
    }
  }

  console.log(`\n  ROUND 23  Abu Dhabi Grand Prix   [seeded after round 22, left undrawn]`);

  console.log('\n  OVER / UNDER split');
  d.teams.forEach((t, i) =>
    console.log(`     ${t.name.padEnd(W)} ${d.over[i]} over, ${ROUNDS - d.over[i]} under   (rounds 12-14: ${d.early[i]} over, ${EARLY - d.early[i]} under)`)
  );

  console.log('\n  CHECKS');
  for (const r of checks[key]) console.log(`     ${r.ok ? 'PASS' : 'FAIL'}  ${r.label}${r.detail ? `  [${r.detail}]` : ''}`);
}

// --------------------------------------------------------------------- SQL

const q = s => `'${String(s).replace(/'/g, "''")}'`;

const rows = [];
for (const d of Object.values(out)) {
  for (const w of d.weeks) {
    for (const m of w.matchups) {
      rows.push({
        tuple: `  ((SELECT id FROM races WHERE season = 2026 AND round = ${w.round}), ${q(m.over.id)}, ${q(m.under.id)})`,
        note: `-- R${w.round}  ${m.over.name} OVER v UNDER ${m.under.name}`,
      });
    }
  }
}

const sql = `-- Second-half calendar and schedule. Generated by scripts/schedule2.mjs.
-- Additive only. Nothing is deleted and no scored round is touched.
-- Run the whole file as one transaction.

BEGIN;

-- 1. Malaysia joins the calendar as round 16, so the old rounds 16-22 shift up
--    one and the season ends at 23. Shifted in two hops so no two races ever
--    hold the same round number mid-statement.
UPDATE races SET round = round + 1000 WHERE season = 2026 AND round >= 16;
UPDATE races SET round = round - 999  WHERE season = 2026 AND round >= 1016;

INSERT INTO races (season, round, race_name, circuit, race_date, pick_deadline, top_drivers, mid_drivers, pit_stop_question)
VALUES (2026, 16, 'Bahrain Grand Prix', 'Sepang International Circuit', '2026-10-04', '2026-10-03T00:00:00+00:00', '{}', '{}', '');

-- 2. The second-half draw, rounds 12 to 22. Round 23 at Abu Dhabi is left
--    undrawn and gets seeded once round 22 is scored.
--    home_team_id is the OVER seat (Admin.jsx:547). Home carries no other meaning.
INSERT INTO schedule (race_id, home_team_id, away_team_id) VALUES
${rows.map((r, i) => `${r.tuple}${i === rows.length - 1 ? ';' : ','}  ${r.note}`).join('\n')}

COMMIT;

-- Checks to run after. Expect: 23 races ending at Abu Dhabi, 264 schedule rows,
-- 12 matchups per round for rounds 12-22, and no round with a repeated team.
-- SELECT round, race_name, race_date FROM races WHERE season = 2026 ORDER BY round;
-- SELECT r.round, count(*) FROM schedule s JOIN races r ON r.id = s.race_id GROUP BY r.round ORDER BY r.round;
`;

writeFileSync(new URL('./schedule2.sql', import.meta.url), sql);

// The recap deck's last card shows a player their second-half fixtures, so the
// draw is written out as data too rather than living only in the SQL.
const fixtures = {};
for (const [key, d] of Object.entries(out)) {
  for (const t of d.teams) fixtures[t.name] = { division: key, seed: d.teams.indexOf(t) + 1, weeks: [] };
  for (const w of d.weeks) {
    for (const m of w.matchups) {
      fixtures[m.over.name].weeks.push({ round: w.round, race: raceName(w.round), opp: m.under.name, side: 'over' });
      fixtures[m.under.name].weeks.push({ round: w.round, race: raceName(w.round), opp: m.over.name, side: 'under' });
    }
  }
}
for (const f of Object.values(fixtures)) f.weeks.sort((a, b) => a.round - b.round);
writeFileSync(new URL('./recap/schedule2.json', import.meta.url), JSON.stringify(fixtures));

console.log(`\n\nSQL written to scripts/schedule2.sql  (${rows.length} schedule rows)`);
console.log(`Fixtures written to scripts/recap/schedule2.json  (${Object.keys(fixtures).length} teams)`);

export { out as schedule2 };
