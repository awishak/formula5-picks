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
// A stationary stop. Anything above this is lane time or a drive-through.
const MIN_STOP = 1.2, MAX_STOP = 8;

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

const teams = Object.entries(byTeam)
  .map(([team, stops]) => ({
    team,
    stops: stops.length,
    avg: round2(stops.reduce((a, b) => a + b, 0) / stops.length),
    median: round2(pct(stops, 50)),
    fastest: round2(Math.min(...stops)),
    slowest: round2(Math.max(...stops)),
  }))
  .sort((a, b) => a.avg - b.avg);

const all = Object.values(byTeam).flat();
const out = {
  season: YEAR,
  builtFrom: `${used} races`,
  skipped,
  stops: all.length,
  league: all.length ? {
    avg: round2(all.reduce((a, b) => a + b, 0) / all.length),
    median: round2(pct(all, 50)),
    fastest: round2(Math.min(...all)),
    slowest: round2(Math.max(...all)),
  } : null,
  teams,
};
writeFileSync("src/pitTimes.json", JSON.stringify(out, null, 2) + "\n");
console.log(`\n${teams.length} teams, ${all.length} stops, from ${used} races (${skipped} skipped)`);
