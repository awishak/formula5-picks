// Where a team can still finish, and where it probably will. Pure: no React
// and no Supabase. Built 2026-11-23 for the last two rounds of the season.
//
// Two different things, kept apart on the page:
//
//   range     the true best and worst place still possible. Mathematics, not
//             a forecast. With one round left it is worked out here; with two
//             it comes from scripts/finish-range.mjs, which plays round 22
//             every way it can go and re-draws round 23 each time, and takes
//             up to a minute a team, so its answer is saved in
//             finishRange.json and used only while the table still matches.
//   project   a forecast: the rounds that are left, played 20,000 times on
//             each team's second-half scoring.
//
// Both follow teamTable.js: in a week the six matchup winners of a division
// take 25-18-15-12-10-8 in score order and the six losers take 6-4-2-1-0-0,
// and the table orders on points, then wins, then scoring average. Drawn
// matchups are left out of both.
//
// Promotion and relegation, the same as the first half (Andrew, 2026-11-23):
// the top four of the Second Division go up, the bottom four of the
// Championship go down, and 5th in the Second Division swaps with 8th in the
// Championship if its second-half scoring average is the higher.
import SAVED from "./finishRange.json";

export const LAST_ROUND = 23;
export const ZONES = {
  championship: { down: [9, 10, 11, 12], playoff: 8 },
  second: { up: [1, 2, 3, 4], playoff: 5 },
};

const WIN = [25, 18, 15, 12, 10, 8], LOSE = [6, 4, 2, 1, 0, 0];
const asc = (a, b) => a - b;

// Most teams that can be held at or under their cap by the values on offer.
function kept(caps, vals) {
  let n = 0, j = 0;
  for (let i = 0; i < caps.length && j < vals.length; i++) if (vals[j] <= caps[i]) { n++; j++; }
  return n;
}
// Most teams that can be lifted to their need.
function raised(needs, vals) {
  let n = 0, j = 0;
  for (let i = 0; i < needs.length; i++) { while (j < vals.length && vals[j] < needs[i]) j++; if (j < vals.length) { n++; j++; } }
  return n;
}

// 1 v 12, 2 v 11 and so on, off a table that is already in order.
const seeded = n => Array.from({ length: n / 2 }, (_, k) => [k, n - 1 - k]);

// One round left and the matchups known. div is the division in table order,
// each row with pts and w; pairs are index pairs into it. Returns the place.
export function lastRoundPlace(div, pairs, T, best) {
  const N = div.length;
  const mine = pairs.find(p => p[0] === T || p[1] === T);
  if (!mine) return null;
  const opp = mine[0] === T ? mine[1] : mine[0];
  const rest = pairs.filter(p => p !== mine);
  const finalT = div[T].pts + (best ? 25 : 0), finalW = div[T].w + (best ? 1 : 0);
  let out = best ? N : 0;
  for (let mask = 0; mask < (1 << rest.length); mask++) {
    const winners = [], losers = [];
    rest.forEach((p, k) => { const a = (mask >> k) & 1; winners.push(p[a]); losers.push(p[1 - a]); });
    if (best) {
      losers.push(opp);
      // Level on points with more wins is above; level on both goes T's way.
      const cap = (i, won) => (finalT - div[i].pts) - (div[i].w + won > finalW ? 1 : 0);
      const k = kept(winners.map(i => cap(i, 1)).sort(asc), WIN.slice(1).sort(asc))
              + kept(losers.map(i => cap(i, 0)).sort(asc), LOSE.slice().sort(asc));
      out = Math.min(out, N - 1 - k);
    } else {
      winners.push(opp);
      // Level on points and wins goes against T.
      const need = (i, won) => (finalT - div[i].pts) + (div[i].w + won < finalW ? 1 : 0);
      const k = raised(winners.map(i => need(i, 1)).sort(asc), WIN.slice().sort(asc))
              + raised(losers.map(i => need(i, 0)).sort(asc), LOSE.slice(0, 5).sort(asc));
      out = Math.max(out, k);
    }
  }
  return out + 1;
}

// { [teamId]: { best, worst } } for one division, or null when it cannot be
// said honestly: more than two rounds left, or the saved search is for a
// table that has since changed.
export function ranges(div, { scored, pairs }) {
  const left = LAST_ROUND - scored;
  if (left <= 0) return Object.fromEntries(div.map((r, i) => [r.id, { best: i + 1, worst: i + 1 }]));
  if (left === 1) {
    const ps = pairs && pairs.length === div.length / 2 ? pairs : seeded(div.length);
    return Object.fromEntries(div.map((r, i) => [r.id, {
      best: lastRoundPlace(div, ps, i, true), worst: lastRoundPlace(div, ps, i, false) }]));
  }
  if (left === 2 && SAVED.round === scored) {
    const saved = Object.fromEntries(Object.values(SAVED.divisions).flat().map(x => [x.id, x]));
    if (div.every(r => saved[r.id] && saved[r.id].pts === r.pts && saved[r.id].w === r.w)) {
      return Object.fromEntries(div.map(r => [r.id, { best: saved[r.id].best, worst: saved[r.id].worst }]));
    }
  }
  return null;
}

// A fixed seed, so the forecast is the same number on every load and every
// phone until the table changes.
function rng(seed) {
  let a = seed >>> 0;
  const u = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  return () => Math.sqrt(-2 * Math.log(u() || 1e-12)) * Math.cos(2 * Math.PI * u());
}

// The rounds that are left, played `sims` times. divisions is
// { championship: rows, second: rows } in table order; each row needs id,
// pts, w and weeks[].score. pairsFor(divKey, round) gives index pairs when
// that round is drawn and null when it is not, which seeds it off the table.
export function project(divisions, { scored, pairsFor, sims = 20000 }) {
  const left = Math.max(0, LAST_ROUND - scored);
  const keys = Object.keys(divisions);
  const all = keys.flatMap(k => divisions[k]);
  // One spread for the league: how far a team's week sits from its own average.
  let ss = 0, n = 0;
  all.forEach(r => { const m = mean(r); r.weeks.forEach(wk => { ss += (wk.score - m) ** 2; n++; }); });
  const sd = Math.max(4, Math.sqrt(ss / Math.max(1, n - all.length)));
  const normal = rng(20261123 + scored);

  const out = {};
  const side = () => ({ n: 0, dist: new Array(12).fill(0), up: 0 });
  all.forEach(r => { out[r.id] = { dist: new Array(12).fill(0), up: 0, exp: 0, win: side(), lose: side() }; });
  let swaps = 0;
  const state = {};
  keys.forEach(k => { state[k] = divisions[k].map(r => ({ id: r.id, pts: 0, w: 0, sum: 0, n: 0, m: mean(r), s: 0, won: false })); });

  for (let it = 0; it < sims; it++) {
    const final = {};
    keys.forEach(k => {
      const rows = divisions[k], st = state[k];
      st.forEach((x, i) => { x.pts = rows[i].pts; x.w = rows[i].w; x.n = rows[i].weeks.length; x.sum = x.m * x.n; });
      let order = st.map((_, i) => i);
      for (let r = scored + 1; r <= scored + left; r++) {
        const pairs = pairsFor(k, r) || seeded(st.length).map(p => [order[p[0]], order[p[1]]]);
        const winners = [], losers = [];
        pairs.forEach(([a, b]) => {
          st[a].s = st[a].m + sd * normal(); st[b].s = st[b].m + sd * normal();
          if (st[a].s >= st[b].s) { winners.push(a); losers.push(b); } else { winners.push(b); losers.push(a); }
        });
        // How the next round went for each team, so the page can split on it.
        if (r === scored + 1) { winners.forEach(i => { st[i].won = true; }); losers.forEach(i => { st[i].won = false; }); }
        winners.sort((a, b) => st[b].s - st[a].s).forEach((i, p) => { st[i].pts += WIN[p]; st[i].w++; });
        losers.sort((a, b) => st[b].s - st[a].s).forEach((i, p) => { st[i].pts += LOSE[p]; });
        st.forEach(x => { x.sum += x.s; x.n++; });
        order = st.map((_, i) => i).sort((a, b) =>
          st[b].pts - st[a].pts || st[b].w - st[a].w || st[b].sum / st[b].n - st[a].sum / st[a].n);
      }
      final[k] = order.map(i => st[i]);
      final[k].forEach((x, p) => { out[x.id].dist[p]++; out[x.id].exp += p + 1;
        const b = x.won ? out[x.id].win : out[x.id].lose; b.n++; b.dist[p]++; });
    });
    const c = final.championship, s = final.second;
    if (c && s) {
      const swap = s[4].sum / s[4].n > c[7].sum / c[7].n;
      if (swap) swaps++;
      const goes = x => { out[x.id].up++; (x.won ? out[x.id].win : out[x.id].lose).up++; };
      c.forEach((x, p) => { if (p < 7 || (p === 7 && !swap)) goes(x); });
      s.forEach((x, p) => { if (p < 4 || (p === 4 && swap)) goes(x); });
    }
  }
  Object.values(out).forEach(o => {
    o.dist = o.dist.map(v => v / sims); o.up /= sims; o.exp /= sims; o.title = o.dist[0];
    // win and lose: the same numbers given how the next round goes, and p,
    // the chance of that result.
    [o.win, o.lose].forEach(b => { const n = Math.max(1, b.n); b.p = b.n / sims; b.dist = b.dist.map(v => v / n);
      b.up /= n; b.title = b.dist[0]; b.likely = b.dist.indexOf(Math.max(...b.dist)) + 1; });
  });
  return { teams: out, swap: swaps / sims, sims, left };
}

const mean = r => (r.weeks.length ? r.weeks.reduce((a, x) => a + x.score, 0) / r.weeks.length : 0);

// The individual game, forecast the same way: each player's remaining rounds
// drawn around their own average, and the whole field ranked each time. rows
// come from buildPlayerTable. For each player: dist[place - 1], the chance of
// the title, the podium, the top five and the top ten, the most likely place,
// and lo and hi, the places the middle 80% of the runs land between.
export function projectPlayers(rows, { left, sims = 20000 }) {
  const N = rows.length;
  const out = rows.map(() => ({ dist: new Array(N).fill(0) }));
  if (left <= 0) rows.forEach((r, i) => { out[i].dist[i] = 1; });
  else {
    let ss = 0, n = 0;
    rows.forEach(r => Object.values(r.byRace || {}).forEach(v => { ss += (v - r.avg) ** 2; n++; }));
    const sd = Math.max(4, Math.sqrt(ss / Math.max(1, n - N)));
    const normal = rng(77 + N + Math.round(rows[0] ? rows[0].pts : 0));
    const tot = new Float64Array(N), order = Array.from({ length: N }, (_, i) => i);
    for (let it = 0; it < sims; it++) {
      for (let i = 0; i < N; i++) {
        let t = rows[i].pts;
        for (let k = 0; k < left; k++) t += Math.max(0, rows[i].avg + sd * normal());
        tot[i] = t / (rows[i].races + left);
      }
      order.sort((a, b) => tot[b] - tot[a]);
      for (let p = 0; p < N; p++) out[order[p]].dist[p]++;
    }
    out.forEach(o => { o.dist = o.dist.map(v => v / sims); });
  }
  const res = {};
  rows.forEach((r, i) => {
    const d = out[i].dist, upTo = k => d.slice(0, k).reduce((a, x) => a + x, 0);
    let acc = 0, lo = 1, hi = N, seenLo = false;
    for (let p = 0; p < N; p++) {
      acc += d[p];
      if (!seenLo && acc >= 0.1) { lo = p + 1; seenLo = true; }
      if (acc >= 0.9) { hi = p + 1; break; }
    }
    res[r.id] = { dist: d, title: d[0], podium: upTo(3), top5: upTo(5), top10: upTo(10),
      likely: d.indexOf(Math.max(...d)) + 1, lo, hi };
  });
  return res;
}
