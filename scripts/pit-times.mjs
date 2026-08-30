// Per-team pit stop times for the season, cached to src/pitTimes.json.
//
//   node scripts/pit-times.mjs
//
// The Needle is a guess at a stationary pit stop, so this is the reference a
// player actually wants before guessing: what each team's stops have looked
// like this year.
//
// Cached rather than fetched in the browser. OpenF1 rate limits and answers
// 429, one request a race is 25 requests, and the dashboard should not spend a
// player's first ten seconds on somebody else's API. Rerun this when the
// numbers should move; the file is committed.
//
// Two things the data does, both handled here rather than trusted:
//   - stop_duration is missing on a lot of rows, and present on others as a
//     lane time in the teens. The Needle lives between 1.5 and 4.5, so a stop
//     outside a sane window is somebody rolling through the pit lane, not a
//     tyre change, and it is dropped.
//   - a session with nothing usable is recorded as skipped rather than thrown,
//     the same way the results cache treats a race OpenF1 has no data for.
import { writeFileSync } from "node:fs";
import { DRIVER_TEAMS } from "../src/drivers.js";

const YEAR = 2026;
// A tyre change, and nothing else. The data has 19.8s, 26.9s and 16.9s in it
// under the same field: those are stops with a problem, a repair or a penalty
// served, and they measure a bad afternoon rather than how quick a crew is.
// Seventeen of the first seventy-seven timed stops were over five seconds.
const MIN_STOP = 1.5, MAX_STOP = 5;

const sleep = ms => new Promise(r => setTimeout(r, ms));

const get = async (url, tries = 5) => {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url);
    if (res.ok) {
      const body = await res.json();
      if (Array.isArray(body)) return body;
      throw new Error(`expected a list, got ${typeof body}`);
    }
    if (res.status !== 429) throw new Error(`HTTP ${res.status}`);
    await sleep(1500 * (i + 1));
  }
  throw new Error("rate limited after five tries");
};

const sessions = await get(`https://api.openf1.org/v1/sessions?year=${YEAR}&session_name=Race`);
console.log(`${sessions.length} race sessions`);

const byTeam = {};
let used = 0, skipped = 0;
for (const s of sessions) {
  let pits = [];
  try {
    pits = await get(`https://api.openf1.org/v1/pit?session_key=${s.session_key}`);
  } catch (e) {
    skipped++;
    console.log(`  skip  ${s.country_name}: ${e.message}`);
    await sleep(900);
    continue;
  }
  let kept = 0;
  for (const p of pits) {
    const d = p.stop_duration;
    if (d == null || d < MIN_STOP || d > MAX_STOP) continue;
    const team = DRIVER_TEAMS[p.driver_number];
    if (!team) continue;
    (byTeam[team] = byTeam[team] || []).push(d);
    kept++;
  }
  if (kept) used++; else skipped++;
  console.log(`  ${kept ? "ok  " : "none"}  ${s.country_name}  ${kept} of ${pits.length}`);
  await sleep(900);
}

const pct = (list, p) => {
  const a = [...list].sort((x, y) => x - y);
  return a[Math.min(a.length - 1, Math.floor((p / 100) * a.length))];
};
const round2 = n => Math.round(n * 100) / 100;

// The median leads, not the mean. Nine to sixteen stops a team is a small
// sample and one slow one moves a mean further than it should; the median is
// what "how quick are they normally" is actually asking.
const teams = Object.entries(byTeam)
  .map(([team, stops]) => ({
    team,
    stops: stops.length,
    median: round2(pct(stops, 50)),
    avg: round2(stops.reduce((a, b) => a + b, 0) / stops.length),
    fastest: round2(Math.min(...stops)),
    slowest: round2(Math.max(...stops)),
  }))
  .sort((a, b) => a.median - b.median);

const all = Object.values(byTeam).flat();
const out = {
  season: YEAR,
  builtFrom: `${used} races`,
  skipped,
  stops: all.length,
  league: all.length ? {
    median: round2(pct(all, 50)),
    avg: round2(all.reduce((a, b) => a + b, 0) / all.length),
    fastest: round2(Math.min(...all)),
    slowest: round2(Math.max(...all)),
  } : null,
  teams,
};
writeFileSync("src/pitTimes.json", JSON.stringify(out, null, 2) + "\n");
console.log(`\n${teams.length} teams, ${all.length} stops, from ${used} races (${skipped} skipped)`);
