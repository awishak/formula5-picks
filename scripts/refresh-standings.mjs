// Refresh driver_standings by hand: the same work as api/cron/standings.js,
// for when the Monday cron has not run. The picker's driver points read this
// table (useLeague.js), so a stale table is stale points on the picker.
//
//   node --env-file=.env.local scripts/refresh-standings.mjs          write
//   node --env-file=.env.local scripts/refresh-standings.mjs --dry    look only
//
// Finished races are cached in scripts/f1-results.json, the cache pools.mjs
// uses, so a rerun does not run into OpenF1's rate limit.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { driverStandings } from "../src/standings.js";
import { canonicalName } from "../src/drivers.js";
import { ready, select, upsert } from "../api/_supabase.js";

const dry = process.argv.includes("--dry");
if (!ready()) { console.error("supabase env missing: run with --env-file=.env.local"); process.exit(1); }

const CACHE = new URL("f1-results.json", import.meta.url);
const store = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};
const cache = {
  get: k => store[k] || null,
  // An empty answer is not kept: a race OpenF1 has not filled in yet would
  // otherwise be skipped for good.
  set: (k, v) => { if (v.length) store[k] = v; },
};

const before = await select("driver_standings?select=driver,position,points,rounds,updated_at&order=position");
const was = Object.fromEntries(before.map(r => [r.driver, r]));
console.log(`before: ${before.length} drivers, last written ${before[0]?.updated_at || "never"}`);

const table = await driverStandings(2026, canonicalName, { cache });
writeFileSync(CACHE, JSON.stringify(store, null, 1));

const rows = table.map((d, i) => ({
  driver: d.name,
  position: i + 1,
  points: d.points,
  rounds: d.rounds,
  updated_at: new Date().toISOString(),
}));

console.log(`now:    ${rows.length} drivers over ${table.sessions} sessions, skipped: ${table.skipped.join(", ") || "none"}`);
for (const r of rows) {
  const old = was[r.driver];
  const from = old ? `${old.points}` : "new";
  console.log(`  ${String(r.position).padStart(2)}  ${r.driver.padEnd(24)} ${String(r.points).padStart(4)}  (was ${from}${old && old.position !== r.position ? `, P${old.position}` : ""})`);
}

if (dry) { console.log("dry run, nothing written"); process.exit(0); }
const written = await upsert("driver_standings", rows, "driver");
console.log(`wrote ${written.length} rows`);
