// Draw the driver pools for a round and print them. Writes nothing.
//
//   node scripts/pools.mjs 12                 draw for round 12
//   node scripts/pools.mjs 12 --seed 7        reproduce a draw
//
// The championship order comes from our own results, which hold all 22
// finishers per round.
import { drawPools, seededRandom, recentlyUsed } from "../src/pools.js";
import { driverStandings } from "../src/standings.js";
import { canonicalName } from "../src/drivers.js";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

// Finished races do not change, so their orders are kept on disk. Without this
// every run refetches seventeen sessions and gets rate limited.
const CACHE = new URL("f1-results.json", import.meta.url);
const store = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};
const cache = {
  get: k => store[k] || null,
  set: (k, v) => { store[k] = v; writeFileSync(CACHE, JSON.stringify(store, null, 1)); },
};

const round = Number(process.argv[2] || 12);
const seedArg = process.argv.indexOf("--seed");
const rand = seedArg > -1 ? seededRandom(Number(process.argv[seedArg + 1])) : Math.random;

const url = process.env.VITE_SUPABASE_URL, key = process.env.VITE_SUPABASE_ANON_KEY;
let avoid = [];
if (url && key) {
  const races = await (await fetch(`${url}/rest/v1/races?select=round,top_drivers,mid_drivers`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } })).json();
  avoid = recentlyUsed(races, round, 2);
}

if (!url || !key) throw new Error("set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
const table = await driverStandings(2026, canonicalName, { cache });

const pools = drawPools(table.map(d => d.name), { rand, avoid });

console.log(`Round ${round}`);
console.log(`  standings: ${table.length} drivers over ${table.sessions} sessions, leader ${table[0].name} on ${table[0].points}`);
console.log(`  avoiding ${avoid.length} from the last two rounds`);
if (table.skipped.length) console.log(`  no data for: ${table.skipped.join(", ")}`);
console.log(`\n  CHAMPIONSHIP, top 15`);
table.slice(0, 15).forEach((d, i) => {
  const band = i < 5 ? "1-5" : i < 10 ? "6-10" : "11-15";
  const inPool = pools.top.includes(d.name) || pools.mid.includes(d.name);
  console.log(`    ${String(i + 1).padStart(2)} ${d.name.padEnd(24)} ${String(d.points).padStart(4)}  ${band.padEnd(6)} ${inPool ? "DRAWN" : ""}`);
});
console.log(`\n  TOP (3, from positions 1-5)`);
pools.top.forEach(d => console.log(`    ${d}`));
console.log(`\n  MIDFIELD (7: 4 from 6-10, 3 from 11-15)`);
pools.mid.forEach(d => console.log(`    ${d}`));
console.log(`\nNothing was written.`);
