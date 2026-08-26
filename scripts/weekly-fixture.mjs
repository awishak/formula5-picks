// Snapshots what the weekly deck reads, so scripts/smoke-weekly.jsx runs offline
// and gives the same answer every time.
//
//   export $(grep -v '^#' .env.local | xargs) && node scripts/weekly-fixture.mjs
//
// Re-run it after a round is scored if the smoke fixture should cover the newer
// week. The committed file is a real round, not made-up rows, because the deck's
// branches (identical picks, a locked-out pit guess) only exist in real data.
import { writeFileSync } from "node:fs";

const U = process.env.VITE_SUPABASE_URL, K = process.env.VITE_SUPABASE_ANON_KEY;
if (!U || !K) { console.error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY needed"); process.exit(1); }
const H = { apikey: K, Authorization: `Bearer ${K}` };
const get = async p => {
  const r = await fetch(`${U}/rest/v1/${p}`, { headers: H });
  if (!r.ok) throw new Error(`${p} -> ${r.status} ${await r.text()}`);
  return r.json();
};

const db = {
  players: await get("players?select=*"),
  teams: await get("teams?select=*"),
  races: await get("races?season=eq.2026&select=*"),
  scores: await get("scores?select=*&limit=5000"),
  picks: await get("picks?select=*&limit=5000"),
  results: await get("results?select=*"),
  schedule: await get("schedule?select=*"),
};

// Row order out of Postgres is not stable, and the deck's weekly placings break
// ties on name for exactly that reason. Sorting here keeps the fixture's diff
// readable when it is regenerated.
for (const k of Object.keys(db)) db[k].sort((a, b) => String(a.id).localeCompare(String(b.id)));

writeFileSync("scripts/weekly-fixture.json", JSON.stringify(db));
console.log(Object.entries(db).map(([k, v]) => `${k} ${v.length}`).join(", "));
