// Draw the driver pools for a round and print them. Writes nothing.
//
//   node scripts/pools.mjs 12                 draw for round 12
//   node scripts/pools.mjs 12 --seed 7        reproduce a draw
//
// The standings order is the input this does not have: OpenF1 has no standings
// endpoint and driver_pts only records drivers who were in a pool, so it is not
// a championship table. STANDINGS below is a placeholder until that is settled.
import { drawPools, seededRandom, recentlyUsed } from "../src/pools.js";

// PLACEHOLDER. Championship order, best first, top 15. Replace with the real
// thing before this draws a pool anyone plays.
const STANDINGS = [
  "Lando Norris", "Oscar Piastri", "George Russell", "Andrea Kimi Antonelli",
  "Max Verstappen", "Charles Leclerc", "Lewis Hamilton", "Isack Hadjar",
  "Liam Lawson", "Pierre Gasly", "Arvid Lindblad", "Franco Colapinto",
  "Oliver Bearman", "Nico Hulkenberg", "Gabriel Bortoleto",
];

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

const pools = drawPools(STANDINGS, { rand, avoid });
console.log(`Round ${round}`);
console.log(`  avoiding ${avoid.length} from the last two rounds`);
console.log(`\n  TOP (3, from positions 1-5)`);
pools.top.forEach(d => console.log(`    ${d}`));
console.log(`\n  MIDFIELD (7: 4 from 6-10, 3 from 11-15)`);
pools.mid.forEach(d => console.log(`    ${d}`));
console.log(`\nNothing was written. STANDINGS in this file is a placeholder.`);
