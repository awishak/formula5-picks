// Where every player can still finish in the individual game, on points a
// race, with ROUNDS_LEFT rounds to go. A round scores between MIN and MAX:
// MAX is a top pick that wins (25), four midfielders home second to fifth
// (55), the order bonus (6), the best finish bonus (3), the needle (5) and the
// week's top score (10).
import { readFileSync } from "node:fs";
import { buildPlayerTable } from "../src/playerTable.js";
const env = Object.fromEntries(readFileSync(new URL("../.env", import.meta.url), "utf8")
  .split("\n").filter(l => l.includes("=")).map(l => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]));
const U = env.VITE_SUPABASE_URL, K = env.VITE_SUPABASE_ANON_KEY;
async function all(table) {
  const rows = [];
  for (let p = 0; p < 50; p++) {
    const r = await fetch(`${U}/rest/v1/${table}?select=*&order=id`, { headers: { apikey: K, Authorization: `Bearer ${K}`, Range: `${p * 1000}-${p * 1000 + 999}` } });
    const d = await r.json(); rows.push(...d); if (d.length < 1000) break;
  }
  return rows;
}
const db = {};
for (const t of ["teams", "races", "scores", "schedule", "players"]) db[t] = await all(t);
const MAX = 104, MIN = 0, LEFT = 2;
const rows = buildPlayerTable(db);
if (process.argv[2] === "keys") { console.log(Object.keys(rows[0]), rows[0].name, rows[0].pts, rows[0].avg, rows[0].races); process.exit(0); }
const n = r => r.races ?? r.played ?? r.finishes.length;
rows.forEach((r, i) => {
  const hi = (r.pts + LEFT * MAX) / (n(r) + LEFT), lo = (r.pts + LEFT * MIN) / (n(r) + LEFT);
  const best = 1 + rows.filter(x => x !== r && (x.pts + LEFT * MIN) / (n(x) + LEFT) > hi).length;
  const worst = 1 + rows.filter(x => x !== r && (x.pts + LEFT * MAX) / (n(x) + LEFT) >= lo).length;
  console.log(`${String(i + 1).padStart(2)}  ${r.name.padEnd(24)} ${String(r.pts).padStart(5)}  ${r.avg.toFixed(1)}  n${n(r)}  best P${best}  worst P${worst}`);
});
