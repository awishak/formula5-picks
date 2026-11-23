// Where every team can still finish in its division with two rounds left.
//
//   node scripts/finish-range.mjs            reads the live league, prints both divisions
//
// Exhaustive, not sampled. Round 22's matchups are in the schedule; round 23
// is drawn 1 v 12, 2 v 11 off the table after round 22, so the search plays
// round 22 every way it can go and re-draws round 23 for each. A week's champ
// points follow teamTable.js: the six matchup winners take 25-18-15-12-10-8 in
// score order and the six losers take 6-4-2-1-0-0. Draws are left out. The
// table orders on points, then wins; anything still level is taken as going
// the team's way for its best case and against it for its worst.
import { readFileSync, writeFileSync } from "node:fs";
import { buildTeamTable, FIRST_H2_ROUND } from "../src/teamTable.js";

const env = Object.fromEntries(readFileSync(new URL("../.env", import.meta.url), "utf8")
  .split("\n").filter(l => l.includes("=")).map(l => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]));
const URL_ = env.VITE_SUPABASE_URL, KEY = env.VITE_SUPABASE_ANON_KEY;

async function all(table) {
  const rows = [];
  for (let page = 0; page < 50; page++) {
    const r = await fetch(`${URL_}/rest/v1/${table}?select=*&order=id`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Range: `${page * 1000}-${page * 1000 + 999}` } });
    if (!r.ok) throw new Error(`${table}: ${r.status}`);
    const data = await r.json();
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

const TOP = [18, 15, 12, 10, 8], BOT = [6, 4, 2, 1, 0, 0];
function perms(vals) {
  const out = [], seen = new Set();
  const go = (rest, acc) => {
    if (!rest.length) { const k = acc.join(","); if (!seen.has(k)) { seen.add(k); out.push(acc.slice()); } return; }
    for (let i = 0; i < rest.length; i++) { acc.push(rest[i]); go(rest.filter((_, j) => j !== i), acc); acc.pop(); }
  };
  go(vals, []);
  return out;
}
const TOPP = perms(TOP), BOTP = perms(BOT);

// Most teams that can be held at or under their cap, given the values on offer.
function kept(caps, vals) {            // both ascending
  let n = 0, j = 0;
  for (let i = 0; i < caps.length && j < vals.length; i++) if (vals[j] <= caps[i]) { n++; j++; }
  return n;
}
// Most teams that can reach their need.
function raised(needs, vals) {         // needs ascending, vals descending
  let n = 0, j = 0;
  const v = vals.slice().sort((a, b) => a - b), nd = needs;
  // give the smallest value that still meets each need, smallest need first
  for (let i = 0; i < nd.length; i++) { while (j < v.length && v[j] < nd[i]) j++; if (j < v.length) { n++; j++; } }
  return n;
}

function solve(div, pairs22, T, best) {
  const N = div.length;
  const others22 = pairs22.filter(p => p[0] !== T && p[1] !== T);
  const opp22 = pairs22.find(p => p[0] === T || p[1] === T);
  const tOpp22 = opp22[0] === T ? opp22[1] : opp22[0];
  const tGain = best ? 25 : 0;
  const finalT = div[T].pts + 2 * tGain, finalW = div[T].w + (best ? 2 : 0);
  // The values the other eleven share in a week.
  const winVals = best ? TOPP : perms([25, 18, 15, 12, 10]);   // five other winners (worst: T's opponent is a sixth)
  let answer = best ? N : -1;                                   // teams above T
  const floor = best
    ? div.filter((x, i) => i !== T && (x.pts > finalT || (x.pts === finalT && x.w > finalW))).length
    : null;
  const ceil = best ? null : div.filter((x, i) => i !== T && x.pts + 50 >= finalT).length;
  const pts = new Array(N), w = new Array(N), order = new Array(N);

  const round23 = () => {
    // Table after round 22: points, wins, then the order they are in now.
    for (let i = 0; i < N; i++) order[i] = i;
    order.sort((a, b) => pts[b] - pts[a] || w[b] - w[a] || a - b);
    const pairs = [];
    for (let k = 0; k < N / 2; k++) pairs.push([order[k], order[N - 1 - k]]);
    const mine = pairs.find(p => p[0] === T || p[1] === T);
    const tOpp = mine[0] === T ? mine[1] : mine[0];
    const rest = pairs.filter(p => p !== mine);
    for (let mask = 0; mask < 32; mask++) {
      const winners = [], losers = [];
      rest.forEach((p, k) => { const a = (mask >> k) & 1; winners.push(p[a]); losers.push(p[1 - a]); });
      if (best) {
        losers.push(tOpp);
        // cap: the most a team can take and still not finish above T
        const cap = (i, win) => {
          const ww = w[i] + (win ? 1 : 0);
          const c = finalT - pts[i];
          return ww > finalW ? c - 1 : c;          // level on points with more wins is above
        };
        const k = kept(winners.map(i => cap(i, true)).sort((a, b) => a - b), [8, 10, 12, 15, 18])
                + kept(losers.map(i => cap(i, false)).sort((a, b) => a - b), [0, 0, 1, 2, 4, 6]);
        const above = N - 1 - k;
        if (above < answer) answer = above;
      } else {
        winners.push(tOpp);
        const need = (i, win) => {
          const ww = w[i] + (win ? 1 : 0);
          const c = finalT - pts[i];
          return ww >= finalW ? c : c + 1;         // level on points and wins counts against T
        };
        const k = raised(winners.map(i => need(i, true)).sort((a, b) => a - b), [25, 18, 15, 12, 10, 8])
                + raised(losers.map(i => need(i, false)).sort((a, b) => a - b), [6, 4, 2, 1, 0]);
        if (k > answer) answer = k;
      }
    }
  };

  for (let mask = 0; mask < 32; mask++) {
    const winners = [], losers = [];
    others22.forEach((p, k) => { const a = (mask >> k) & 1; winners.push(p[a]); losers.push(p[1 - a]); });
    if (best) losers.push(tOpp22); else winners.push(tOpp22);
    const WP = best ? TOPP : perms([25, 18, 15, 12, 10, 8]);
    const LP = best ? BOTP : perms([6, 4, 2, 1, 0]);
    for (const wp of WP) {
      for (const lp of LP) {
        for (let i = 0; i < N; i++) { pts[i] = div[i].pts; w[i] = div[i].w; }
        pts[T] += tGain; if (best) w[T] += 1;
        winners.forEach((i, k) => { pts[i] += wp[k]; w[i] += 1; });
        losers.forEach((i, k) => { pts[i] += lp[k]; });
        if (best) {
          // Even with nothing next week, these are above. No point going on.
          let sure = 0;
          for (let i = 0; i < N; i++) if (i !== T && (pts[i] > finalT || (pts[i] === finalT && w[i] > finalW))) sure++;
          if (sure >= answer) continue;
        }
        round23();
        if (best ? answer === floor : answer === ceil) return answer;
      }
    }
  }
  return answer;
}

const db = {};
for (const t of ["teams", "races", "scores", "schedule", "players"]) db[t] = await all(t);
const rows = buildTeamTable(db, { fromRound: FIRST_H2_ROUND });
const roundOf = Object.fromEntries(db.races.map(r => [r.id, r.round]));
const scored = Math.max(...db.scores.map(s => roundOf[s.race_id]));
const next = db.schedule.filter(m => roundOf[m.race_id] === scored + 1);
const teamOf = Object.fromEntries(db.teams.map(t => [t.id, t]));
console.log(`Scored through round ${scored}. Round ${scored + 1} has ${next.length} matchups drawn.\n`);

const out = { round: scored, divisions: {} };
for (const d of ["championship", "second"]) {
  const div = rows.filter(r => (teamOf[r.id].division_h2 || teamOf[r.id].division) === d);
  const idx = Object.fromEntries(div.map((r, i) => [r.id, i]));
  const pairs = next.filter(m => idx[m.home_team_id] != null && idx[m.away_team_id] != null)
    .map(m => [idx[m.home_team_id], idx[m.away_team_id]]);
  console.log(`${d}  (${div.length} teams, ${pairs.length} matchups next)`);
  out.divisions[d] = [];
  div.forEach((r, i) => {
    const t0 = Date.now();
    const hi = solve(div, pairs, i, true) + 1;
    const lo = solve(div, pairs, i, false) + 1;
    out.divisions[d].push({ id: r.id, name: r.name, place: i + 1, pts: r.pts, w: r.w, avg: +r.avg.toFixed(2), best: hi, worst: lo });
    console.log(`${String(i + 1).padStart(2)}  ${r.name.padEnd(26)} ${String(r.pts).padStart(4)} pts  ${r.w}W  avg ${r.avg.toFixed(1)}   best P${hi}  worst P${lo}   ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  });
  console.log("");
}
// The app reads this copy: src/finishRange.js uses it while the table matches.
writeFileSync(new URL("../src/finishRange.json", import.meta.url), JSON.stringify(out, null, 1));
