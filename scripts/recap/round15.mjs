// Round 15, Azerbaijan: the lowest-scoring week in the league's history, as a
// page. Pulls the live tables and writes public/recaps/round15.html, static,
// with every chart drawn server-side and a little JS for hover and the toggles.
//
//   node scripts/recap/round15.mjs
//
// Vegas look. Blue is good, pink is bad, and green never shares a chart with
// pink (deuteranopia cannot tell them apart, checked 2026-07-28). Charts are
// numbered so they can be argued with by number.
import fs from "node:fs";
import { DRIVER_HEADSHOTS } from "../../src/drivers.js";
import { TEAMS } from "../../src/teams.js";

const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split("\n").filter(l => l.includes("="))
  .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; }));
const H = { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}` };
const get = async q => (await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/${q}`, { headers: H })).json();

const ROUND = 15;

const [players, races, scores, results, teams, schedule] = await Promise.all([
  get("players?select=id,name,photo_url"),
  get("races?select=id,round,race_name,top_drivers,mid_drivers"),
  get("scores?select=*&limit=5000"),
  get("results?select=race_id,pit_stop_time,finishing_order"),
  get("teams?select=id,name,player1_id,player2_id,division_h2,logo_url"),
  get("schedule?select=race_id,home_team_id,away_team_id"),
]);

/* ------------------------------------------------------------------ the maths */

const playerOf = Object.fromEntries(players.map(p => [p.id, p]));
const raceOf = Object.fromEntries(races.map(r => [r.id, r]));
const teamOf = Object.fromEntries(teams.map(t => [t.id, t]));
const shortTeam = name => (TEAMS.find(t => t.name === name) || {}).short || name;
const ind = s => (s.top_pick_pts || 0) + (s.midfield_pts || 0) + (s.order_bonus || 0) + (s.best_finish_bonus || 0) + (s.pit_individual_pts || 0) + (s.weekly_bonus_pts || 0);
const drv = s => (s.top_pick_pts || 0) + (s.midfield_pts || 0) + (s.order_bonus || 0) + (s.best_finish_bonus || 0);
const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
const med = a => { const b = [...a].sort((x, y) => x - y); const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
// Race names are adjectives; a bar wants the place.
const PLACE = { Australian: "Australia", Chinese: "China", Japanese: "Japan", Canadian: "Canada", Spanish: "Spain", Austrian: "Austria",
  British: "Britain", Belgian: "Belgium", Hungarian: "Hungary", Dutch: "Zandvoort", Italian: "Monza", "United States": "Austin", "Mexico City": "Mexico", "São Paulo": "Brazil" };
// Round 15 is the Bahlaysian Grand Prix, Andrew's name for it, 2026-09-27.
const RACE_ALIAS = { "Azerbaijan Grand Prix": "Bahlaysian Grand Prix" };
const PLACE_ALIAS = { Azerbaijan: "Bahlaysia" };
const shortRace = name => { const k = name.replace(/ Grand Prix.*$/, ""); return PLACE_ALIAS[k] || PLACE[k] || k; };
const raceTitle = name => RACE_ALIAS[name] || name;

const rows = scores.map(s => ({ ...s, round: raceOf[s.race_id]?.round, race: raceOf[s.race_id], player: playerOf[s.player_id], ind: ind(s), drv: drv(s) }))
  .filter(r => r.round != null && r.player);
const rounds = [...new Set(rows.map(r => r.round))].sort((a, b) => a - b);
const race = races.find(r => r.round === ROUND);
const week = rows.filter(r => r.round === ROUND).sort((a, b) => a.ind - b.ind || a.player.name.localeCompare(b.player.name));
const before = rows.filter(r => r.round !== ROUND);

// Team score for a round: both players' driver points plus BOX BOX.
const teamScore = (t, rs) => [t.player1_id, t.player2_id].map(id => rs.find(s => s.player_id === id))
  .reduce((a, s) => a + (s ? drv(s) + (s.pit_matchup_pts || 0) : 0), 0);

const byRound = rounds.map(r => {
  const rs = rows.filter(x => x.round === r);
  const v = rs.map(x => x.ind);
  const top = rs.slice().sort((a, b) => b.ind - a.ind)[0];
  return {
    round: r, name: shortRace(rs[0].race.race_name), full: rs[0].race.race_name,
    n: v.length, avg: avg(v), med: med(v), min: Math.min(...v), max: Math.max(...v),
    drvAvg: avg(rs.map(x => x.drv)),
    teamAvg: avg(teams.map(t => teamScore(t, rs))),
    neg: v.filter(x => x < 0).length, under10: v.filter(x => x < 10).length,
    leader: top.player,
  };
});
const thisRound = byRound.find(b => b.round === ROUND);
const prevLowAvg = byRound.filter(b => b.round !== ROUND).sort((a, b) => a.avg - b.avg)[0];
const prevLowScore = Math.min(...before.map(r => r.ind));
const prevLowHigh = Math.min(...byRound.filter(b => b.round !== ROUND).map(b => b.max));
const prevLowTeamAvg = Math.min(...byRound.filter(b => b.round !== ROUND).map(b => b.teamAvg));

const lowestEver = rows.slice().sort((a, b) => a.ind - b.ind || a.round - b.round).slice(0, 20);
const negatives = rows.filter(r => r.ind < 0);

const personal = players.map(p => {
  const mine = rows.filter(r => r.player_id === p.id);
  const tw = mine.find(r => r.round === ROUND);
  if (!tw || mine.length < 2) return null;
  const prev = Math.min(...mine.filter(r => r.round !== ROUND).map(r => r.ind));
  return { player: p, now: tw.ind, prev, drop: prev - tw.ind, worst: tw.ind < prev };
}).filter(Boolean).sort((a, b) => b.drop - a.drop);
const worstCount = personal.filter(x => x.worst).length;

const teamWeek = teams.map(t => ({ team: t, v: teamScore(t, week) })).sort((a, b) => a.v - b.v || a.team.name.localeCompare(b.team.name));
const teamEver = rounds.flatMap(r => { const rs = rows.filter(x => x.round === r); return teams.map(t => ({ round: r, team: t, v: teamScore(t, rs) })); })
  .sort((a, b) => a.v - b.v);
const prevLowTeam = Math.min(...teamEver.filter(t => t.round !== ROUND).map(t => t.v));
const lowTeamAllThisWeek = teamEver.findIndex(t => t.round !== ROUND); // how many of the lowest ever are this week

const matchups = schedule.filter(m => m.race_id === race.id).map(m => {
  const h = teamOf[m.home_team_id], a = teamOf[m.away_team_id];
  const hs = teamScore(h, week), as = teamScore(a, week);
  return { home: h, away: a, hs, as, margin: Math.abs(hs - as), division: h.division_h2 };
}).sort((a, b) => a.margin - b.margin);

// The pool: what each driver was worth and to how many.
const dp = {};
week.forEach(s => {
  let d = s.driver_pts; if (typeof d === "string") { try { d = JSON.parse(d); } catch { d = {}; } }
  Object.entries(d || {}).forEach(([k, v]) => { (dp[k] ||= []).push(Number(v)); });
});
const pool = Object.entries(dp).map(([k, v]) => ({ driver: k, per: v[0], picks: v.length, total: v.reduce((a, b) => a + b, 0),
  top: (race.top_drivers || []).includes(k) })).sort((a, b) => b.per - a.per || b.picks - a.picks);
const CANON = n => (n === "Kimi Antonelli" ? "Andrea Kimi Antonelli" : n);
const driverWeeks = rounds.map(r => {
  const tot = {};
  rows.filter(x => x.round === r).forEach(sc => {
    let d = sc.driver_pts; if (typeof d === "string") { try { d = JSON.parse(d); } catch { d = {}; } }
    Object.entries(d || {}).forEach(([k, v]) => { const c = CANON(k); (tot[c] ||= { driver: c, n: 0, tot: 0, each: Number(v) }); tot[c].n++; tot[c].tot += Number(v); });
  });
  const e = Object.values(tot).sort((a, b) => b.tot - a.tot);
  const b = byRound.find(x => x.round === r);
  return { round: r, name: b.name, full: b.full, top: e[0], bottom: e[e.length - 1] };
});
const dowThis = driverWeeks.find(w => w.round === ROUND);
const dowSorted = driverWeeks.slice().sort((a, b) => b.top.tot - a.top.tot);
const dowPrevLow = Math.min(...driverWeeks.filter(w => w.round !== ROUND).map(w => w.top.tot));
const worstSorted = driverWeeks.slice().sort((a, b) => a.bottom.tot - b.bottom.tot);
const worstRank = worstSorted.findIndex(w => w.round === ROUND) + 1;
const worstEver = worstSorted[0];
// Every team's score every week, for the swarm and the highlights.
const teamWeeks = rounds.flatMap(r => { const rs = rows.filter(x => x.round === r); return teams.map(t => ({ round: r, team: t, v: teamScore(t, rs) })); });
const otherTeamWeeks = teamWeeks.filter(t => t.round !== ROUND);
const bestTeamThisWeek = Math.max(...teamWeek.map(t => t.v));
const teamScoresBelowBest = otherTeamWeeks.filter(t => t.v < bestTeamThisWeek).length;
const minOtherWeeklyTeamHigh = Math.min(...rounds.filter(r => r !== ROUND).map(r => Math.max(...teamWeeks.filter(t => t.round === r).map(t => t.v))));
// The lowest score a team has ever won a matchup with.
const winsEver = schedule.map(m => { const r = raceOf[m.race_id]; const h = teamOf[m.home_team_id], a = teamOf[m.away_team_id]; if (!r || !h || !a) return null;
  const rs = rows.filter(x => x.round === r.round); if (!rs.length) return null; const hs = teamScore(h, rs), as = teamScore(a, rs);
  return hs === as ? null : { round: r.round, w: Math.max(hs, as), team: hs > as ? h : a }; }).filter(Boolean).sort((a, b) => a.w - b.w);
const lowestWin = winsEver[0], lowestWinBefore = winsEver.find(w => w.round !== ROUND);
// Order and best finish, how many got each, every week.
const orderCount = Object.fromEntries(rounds.map(r => [r, rows.filter(x => x.round === r && (x.order_bonus || 0) > 0).length]));
const bestCount = Object.fromEntries(rounds.map(r => [r, rows.filter(x => x.round === r && (x.best_finish_bonus || 0) > 0).length]));
const weeksWithOrder = (n) => rounds.filter(r => r !== ROUND && orderCount[r] === n);
const weeksWithBest = (n) => rounds.filter(r => r !== ROUND && bestCount[r] === n);
// BOX BOX could only have flipped a matchup decided by fewer than six.
const bbFlippable = matchups.filter(m => m.margin < 6).length;
// The hundred lowest scores ever.
const lowest100 = rows.slice().sort((a, b) => a.ind - b.ind || (a.round === ROUND ? -1 : 1) || a.player.name.localeCompare(b.player.name)).slice(0, 100);
const lowest100ThisWeek = lowest100.filter(r => r.round === ROUND).length;
const medianOtherAbove = rounds.filter(r => r !== ROUND && byRound.find(b => b.round === r).med > thisRound.max).length;
// The hundred lowest team scores ever.
// W, L or D for a team in a round, off the schedule and the scores of that week.
const resultOf = (team, round) => {
  const r = races.find(x => x.round === round); const m = r && schedule.find(x => x.race_id === r.id && (x.home_team_id === team.id || x.away_team_id === team.id));
  if (!m) return "";
  const rs = rows.filter(x => x.round === round); const other = teamOf[m.home_team_id === team.id ? m.away_team_id : m.home_team_id];
  const mine = teamScore(team, rs), theirs = teamScore(other, rs);
  return mine > theirs ? "W" : mine < theirs ? "L" : "D";
};
const TEAM_N = 25;
const lowestTeam100 = teamWeeks.slice().sort((a, b) => a.v - b.v || (a.round === ROUND ? -1 : 1) || a.team.name.localeCompare(b.team.name)).slice(0, TEAM_N);
const lowestTeam100ThisWeek = lowestTeam100.filter(t => t.round === ROUND).length;
const teamOutsider = lowestTeam100.find(t => t.round !== ROUND);
const result = results.find(r => r.race_id === race.id);
const podium = (result.finishing_order || []).slice(0, 3);

/* ----------------------------------------------------------------- drawing */

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const initials = n => n.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
const face = (p, size = 28, ring = null) => p.photo_url
  ? `<img class="face" src="${esc(p.photo_url)}" alt="" width="${size}" height="${size}" loading="lazy" style="width:${size}px;height:${size}px${ring ? `;border-color:${ring}` : ""}">`
  : `<span class="face face-t" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.38)}px${ring ? `;border-color:${ring}` : ""}">${initials(p.name)}</span>`;
const logo = (t, size = 28) => t.logo_url
  ? `<img class="logo" src="${esc(t.logo_url)}" alt="" width="${size}" height="${size}" loading="lazy" style="width:${size}px;height:${size}px">`
  : `<span class="logo logo-t" style="width:${size}px;height:${size}px">${esc(shortTeam(t.name).slice(0, 3).toUpperCase())}</span>`;
const head = (name, size = 36) => DRIVER_HEADSHOTS[name]
  ? `<img class="head" src="${esc(DRIVER_HEADSHOTS[name])}" alt="" width="${size}" height="${size}" loading="lazy" style="width:${size}px;height:${size}px">`
  : `<span class="head head-t" style="width:${size}px;height:${size}px">${initials(name)}</span>`;
const one = n => (Math.round(n * 10) / 10).toFixed(1);
const signed = n => (n > 0 ? `+${n}` : String(n));
// Small numbers in words, the way a sentence wants them.
const W = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
// Surname unless the league holds two of them, then the whole name. Four
// families do: Ishak, Kohli, Thompson, Nobar.
const surnameCount = {};
players.forEach(p => { const k = p.name.split(" ").pop(); surnameCount[k] = (surnameCount[k] || 0) + 1; });
const surname = n => { const k = n.split(" ").pop(); return surnameCount[k] > 1 ? `${n[0]}. ${k}` : k; };

// A horizontal bar row: label, optional picture, bar, value. Bars run from
// zero; a negative bar runs left of a zero line that sits at `zeroPct`.
const barRow = ({ label, pic = "", value, max, min = 0, tone, tip, sub = "", i = 0, extra = "", who = "", dot = false, fmt = null }) => {
  const span = max - min;
  const zero = ((0 - min) / span) * 100;
  const w = (Math.abs(value) / span) * 100;
  const left = value >= 0 ? zero : zero - w;
  return `<div class="row" ${who} data-tip="${esc(tip)}" style="--i:${i}">
    <div class="lab">${pic}<span class="lt">${esc(label)}${sub ? `<small>${esc(sub)}</small>` : ""}</span></div>
    <div class="track"><span class="zero" style="left:${zero}%"></span><span class="bar ${tone}" style="left:${left}%;width:${w}%"${extra}></span>${dot ? `<span class="ydot" data-max="${max}"></span>` : ""}</div>
    <div class="val ${tone}">${esc(fmt ? fmt(value) : typeof value === "number" && !Number.isInteger(value) ? one(value) : value)}</div>
  </div>`;
};

// Andrew, 2026-09-26: a comparison of two numbers is shown, not said. Every
// week as a bar, sorted by the value, this one pink, so the gap is visible
// against the rest of the field.
const strip = (items, { fmt = v => String(v), tone = "blue" } = {}) => {
  const max = Math.max(...items.map(x => x.v), 1);
  const sorted = items.slice().sort((a, b) => a.v - b.v);
  return `<div class="strip">${sorted.map((x, i) => `<span class="sb${x.me ? " me" : ""}" style="height:${Math.max(2, x.v / max * 100)}%;--i:${i}" data-tip="${esc(`${x.label}: ${fmt(x.v)}`)}"></span>`).join("")}</div>`;
};
const weeks = (key, fmt) => strip(byRound.map(b => ({ label: `${b.full} (R${b.round})`, v: b[key], me: b.round === ROUND })), { fmt });
// How many players' season low sits in each round, for the worst-week tile.
const lowIn = {};
players.forEach(p => { const mine = rows.filter(r => r.player_id === p.id); if (!mine.length) return;
  const lo = Math.min(...mine.map(r => r.ind)); const at = mine.filter(r => r.ind === lo).sort((a, b) => b.round - a.round)[0]; lowIn[at.round] = (lowIn[at.round] || 0) + 1; });

/* chart 1, the lead: every week as a column, sorted by average, this one pink.
   Andrew, 2026-09-26: take the chart, turn it sideways, lead with it, and keep
   the bars tight. Values sit on the pink column and the tallest; the rest are
   on hover, because fifteen numbers over fifteen 22px columns collide. */
// One scale a view. The team game runs to a hundred and the individual game to
// fifty, and a shared scale drew the individual bars at half height.
const c1maxOf = { ind: Math.ceil(Math.max(...byRound.map(b => b.avg)) / 10) * 10, drv: Math.ceil(Math.max(...byRound.map(b => b.drvAvg)) / 10) * 10, team: Math.ceil(Math.max(...byRound.map(b => b.teamAvg)) / 10) * 10 };
const c1max = c1maxOf.ind;
const pMax0 = Math.max(...rows.map(r => r.ind)), tMax0 = Math.max(...rounds.flatMap(r => { const rs = rows.filter(x => x.round === r); return teams.map(t => teamScore(t, rs)); }));
// At most six gridlines whatever the scale.
const ticks = max => { const step = [10, 20, 50, 100, 200, 500].find(st => max / st <= 6) || 1000; const t = []; for (let g = 0; g <= max; g += step) t.push(g); return t; };
const c1sorted = byRound.slice().sort((a, b) => b.avg - a.avg);
// Horizontal since 2026-09-26, Andrew's call, best week first.
// The scale runs to the best score anybody posted, not the best average, so
// the reader's own dot always lands on the track.
const C1MAX = Math.ceil(pMax0 / 10) * 10, C4MAX = Math.ceil(tMax0 / 10) * 10;
const chart1 = c1sorted.map((b, i) => barRow({
  label: b.name, sub: `R${b.round}`, value: b.avg, max: C1MAX, tone: b.round === ROUND ? "pink" : "blue", i,
  tip: `${b.full}, round ${b.round}: average ${one(b.avg)}, median ${b.med}, high ${b.max}, low ${b.min}`,
  extra: ` data-round="${b.round}"`, dot: true, fmt: one,
})).join("");
const chart4t = byRound.slice().sort((a, b) => b.teamAvg - a.teamAvg).map((b, i) => barRow({
  label: b.name, sub: `R${b.round}`, value: b.teamAvg, max: C4MAX, tone: b.round === ROUND ? "pink" : "blue", i,
  extra: ` data-round="${b.round}"`, dot: true, fmt: one,
  tip: `${b.full}, round ${b.round}: team average ${one(b.teamAvg)}, best team ${Math.max(...teamWeeks.filter(t => t.round === b.round).map(t => t.v))}, worst ${Math.min(...teamWeeks.filter(t => t.round === b.round).map(t => t.v))}`,
})).join("");

/* the swarms: a dot for every player, or every team, every week */
const swarm = (weeks, { min, max, ticks: tks }) => {
  // A swarm packs in two dimensions: a dot that cannot sit on its value goes
  // up or down first, and only then a hair sideways, so seventeen people on
  // the same score make a blob rather than a tower through the row above.
  const W = 320, H = 44, R = 3, STEP = R * 2 + 0.4;
  const x = v => 6 + (v - min) / (max - min) * (W - 12);
  const cands = [];
  for (let dx = 0; dx <= 8; dx++) for (let dy = 0; dy <= 3; dy++) for (const sx of dx ? [1, -1] : [0]) for (const sy of dy ? [1, -1] : [0])
    cands.push({ dx: sx * dx * (R * 0.9), dy: sy * dy * STEP, d: (dx * R * 0.9) ** 2 * 2 + (dy * STEP) ** 2 });
  cands.sort((a, b) => a.d - b.d);
  const rowsHtml = weeks.map((wk, i) => {
    const pts = wk.dots.slice().sort((a, b) => a.v - b.v).map(d => ({ ...d, x0: x(d.v) }));
    const placed = [];
    pts.forEach(p => {
      for (const c of cands) {
        const px = p.x0 + c.dx, py = H / 2 + c.dy;
        if (!placed.some(q => (q.x - px) ** 2 + (q.y - py) ** 2 < (R * 2) ** 2)) { p.x = px; p.y = py; break; }
      }
      if (p.y == null) { p.x = p.x0; p.y = H / 2; }
      placed.push(p);
    });
    return `<div class="srow${wk.me ? " me" : ""}" style="--i:${i}">
      <div class="lab"><span class="lt">${esc(wk.name)}<small>R${wk.round}</small></span></div>
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="ss">${placed.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${R}" ${p.who || ""} data-tip="${esc(p.tip)}"/>`).join("")}</svg>
    </div>`;
  }).join("");
  return `<div class="swarm">${rowsHtml}<div class="srow ax"><div class="lab"></div><div class="axis">${tks.map(t => `<span style="left:${(x(t) / W * 100).toFixed(1)}%">${t}</span>`).join("")}</div></div></div>`;
};
const pMin = Math.min(...rows.map(r => r.ind)), pMax = Math.max(...rows.map(r => r.ind));
// One swarm, every score the league has posted. Taller, so 720 dots fit.
// A flat-bottomed swarm: every dot rests on the axis or on the dots under it,
// so the pile reads as a histogram of faces-sized dots. Andrew, 2026-09-27.
const swarmOne = (dots, { min, max, ticks: tks }) => {
  const W = 320, R = 2.7, STEP = R * 2 + 0.3;
  const x = v => 6 + (v - min) / (max - min) * (W - 12);
  const cands = [];
  for (let dx = 0; dx <= 4; dx++) for (let dy = 0; dy <= 80; dy++) for (const sx of dx ? [1, -1] : [0])
    cands.push({ dx: sx * dx * (R * 0.9), dy: dy * STEP, d: (dx * R * 0.9) ** 2 * 4 + (dy * STEP) ** 2 });
  cands.sort((a, b) => a.d - b.d);
  // This week's dots go down first, so they sit on the axis.
  const pts = dots.slice().sort((a, b) => (b.me ? 1 : 0) - (a.me ? 1 : 0) || a.v - b.v).map(d => ({ ...d, x0: x(d.v) }));
  const placed = [];
  pts.forEach(p => {
    for (const c of cands) { const px = p.x0 + c.dx, py = R + c.dy;
      if (!placed.some(q => (q.x - px) ** 2 + (q.y - py) ** 2 < (R * 2) ** 2)) { p.x = px; p.y = py; break; } }
    if (p.y == null) { p.x = p.x0; p.y = R; }
    placed.push(p);
  });
  // Height is whatever the tallest pile needs, and y counts up from the axis.
  const H = Math.ceil(Math.max(...placed.map(p => p.y)) + R + 4);
  placed.forEach(p => { p.y = H - p.y; });
  return `<div class="swarm one"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" class="ss" style="aspect-ratio:${W}/${H}"><line x1="0" x2="${W}" y1="${H - 0.5}" y2="${H - 0.5}" class="base"/>${placed.map(p => `<circle class="${p.me ? "me" : ""}" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${R}" ${p.who || ""} data-tip="${esc(p.tip)}"/>`).join("")}</svg>
    <div class="axis">${tks.map(t => `<span style="left:${(x(t) / W * 100).toFixed(1)}%">${t}</span>`).join("")}</div></div>`;
};
const chart2one = swarmOne(rows.map(r => ({ v: r.ind, me: r.round === ROUND, who: `data-player="${esc(r.player.name)}"`, tip: `${r.player.name}, ${raceTitle(r.race.race_name)}: ${r.ind}` })),
  { min: pMin, max: pMax, ticks: [0, 20, 40, 60] });
const chart2s = swarm(byRound.map(b => ({ round: b.round, name: b.name, me: b.round === ROUND,
  dots: rows.filter(r => r.round === b.round).map(r => ({ v: r.ind, who: `data-player="${esc(r.player.name)}"`, tip: `${r.player.name}, ${b.full}: ${r.ind}` })) })),
  { min: pMin, max: pMax, ticks: [0, 20, 40, 60] });
const tMin = Math.min(...teamWeeks.map(t => t.v)), tMax = Math.max(...teamWeeks.map(t => t.v));
const chart3s = swarm(byRound.map(b => ({ round: b.round, name: b.name, me: b.round === ROUND,
  dots: teamWeeks.filter(t => t.round === b.round).map(t => ({ v: t.v, who: `data-team="${esc(t.team.name)}"`, tip: `${t.team.name}, ${b.full}: ${t.v}` })) })),
  { min: tMin, max: tMax, ticks: [0, 40, 80, 120] });

/* the hundred lowest team scores, ten by ten */
const wallTeam100 = lowestTeam100.map((t, i) => `<div class="w2${t.round === ROUND ? " me" : ""}${i === 0 ? " lo" : i === TEAM_N - 1 ? " hi" : ""}" data-team="${esc(t.team.name)}" data-tip="${esc(`${i + 1}. ${t.team.name}, ${byRound.find(b => b.round === t.round).full}: ${t.v}`)}">${logo(t.team, 48)}<b>${t.v}<em class="wl ${resultOf(t.team, t.round)}">${resultOf(t.team, t.round)}</em></b><span>${esc(shortTeam(t.team.name))}</span>${i === 0 ? "<i>lowest</i>" : i === TEAM_N - 1 ? `<i>${TEAM_N}th</i>` : ""}</div>`).join("");
/* the negatives */
const negWall = [...negatives.map(r => `<div class="w3" data-player="${esc(r.player.name)}" data-tip="${esc(`${r.player.name}: ${r.ind}. Top ${signed(r.top_pick_pts || 0)}, midfield ${signed(r.midfield_pts || 0)}`)}">${face(r.player, 56, "#ff2d95")}<b>${r.ind}</b><span>${esc(surname(r.player.name))}</span></div>`),
  ...teamWeek.filter(t => t.v < 0).map(t => `<div class="w3" data-team="${esc(t.team.name)}" data-tip="${esc(`${t.team.name}: ${t.v}`)}">${logo(t.team, 56)}<b>${t.v}</b><span>${esc(shortTeam(t.team.name))}</span></div>`)].join("");
/* the hundred lowest, ten by ten */
const wall100 = lowest100.map((r, i) => `<div class="w2${r.round === ROUND ? " me" : ""}${i === 0 ? " lo" : i === 99 ? " hi" : ""}" data-player="${esc(r.player.name)}" data-tip="${esc(`${i + 1}. ${r.player.name}, ${r.race.race_name}: ${r.ind}`)}">${face(r.player, 28, r.round === ROUND ? "#ff2d95" : "#00d9ff")}<b>${r.ind}</b>${i === 0 ? "<i>lowest</i>" : i === 99 ? "<i>100th</i>" : ""}</div>`).join("");
const chart1_unused = `<div class="cols" style="--max:${c1max}">
  <div class="grid">${ticks(c1max).map(g => `<span style="bottom:${g / c1max * 100}%"><i>${g}</i></span>`).join("")}</div>
  ${c1sorted.map((b, i) => `<div class="col${b.round === ROUND ? " me" : ""}" style="--i:${i}" data-tip="${esc(`${b.full}, round ${b.round}: average ${one(b.avg)}, median ${b.med}, high ${b.max}, low ${b.min}`)}">
    <span class="bw"><span class="cv${i === 0 || b.round === ROUND ? " on" : ""}" style="bottom:calc(${b.avg / c1max * 100}% + 3px)">${one(b.avg)}</span><span class="cb" style="height:${b.avg / c1max * 100}%" data-ind="${b.avg}" data-drv="${b.drvAvg}" data-team="${b.teamAvg}"></span></span>
    <span class="cl">${esc(b.name)}</span>
  </div>`).join("")}
</div>`;

/* chart 2: every score this week, avatars stacked on their value */
const values = [...new Set(week.map(r => r.ind))].sort((a, b) => a - b);
const chart2 = values.map((v, i) => {
  const ps = week.filter(r => r.ind === v);
  return `<div class="stack" style="--i:${i}">
    <div class="sv ${v < 0 ? "pink" : v >= 20 ? "blue" : "muted"}">${signed(v)}</div>
    <div class="faces">${ps.map(r => `<span class="fw" data-player="${esc(r.player.name)}" data-tip="${esc(`${r.player.name}: ${r.ind}. Top ${signed(r.top_pick_pts || 0)}, midfield ${signed(r.midfield_pts || 0)}${r.best_finish_bonus ? `, best finish +${r.best_finish_bonus}` : ""}${r.weekly_bonus_pts ? `, weekly bonus +${r.weekly_bonus_pts}` : ""}`)}">${face(r.player, 30, v < 0 ? "#ff2d95" : v >= 20 ? "#00d9ff" : null)}</span>`).join("")}</div>
    <div class="sc">${ps.length}</div>
  </div>`;
}).join("");

/* chart 3: previous season low against this week, a dumbbell each */
const c3max = 60;
const dumbbell = (x, i, hidden) => {
  const l = (Math.min(x.now, x.prev) + 3) / (c3max + 3) * 100, r = (Math.max(x.now, x.prev) + 3) / (c3max + 3) * 100;
  return `<div class="row db${x.worst ? "" : " held"}${hidden ? " more" : ""}" style="--i:${i}" data-player="${esc(x.player.name)}" data-tip="${esc(`${x.player.name}: this week ${x.now}, previous low ${x.prev}${x.worst ? `, down ${x.drop}` : ", not a season low"}`)}">
    <div class="lab">${face(x.player, 26)}<span class="lt">${esc(surname(x.player.name))}</span></div>
    <div class="track"><span class="zero" style="left:${3 / (c3max + 3) * 100}%"></span>
      <span class="link" style="left:${l}%;width:${r - l}%"></span>
      <span class="dot blue" style="left:${(x.prev + 3) / (c3max + 3) * 100}%"></span>
      <span class="dot ${x.worst ? "pink" : "blue"}" style="left:${(x.now + 3) / (c3max + 3) * 100}%"></span></div>
    <div class="val"><span class="muted">${x.prev}</span> <span class="arr">&rarr;</span> <span class="${x.worst ? "pink" : "blue"}">${x.now}</span></div>
  </div>`;
};
const chart3 = personal.map((x, i) => dumbbell(x, i, i >= 15)).join("");

/* chart 4: driver of the week, every week, and the worst driver every week */
const colChart = (items, { max, down = false, fmt = v => String(v) }) => {
  const tk = ticks(max);
  return `<div class="cols${down ? " down" : ""}${max >= 100 ? " wide" : ""}">
    <div class="grid">${tk.map(g => `<span style="${down ? "top" : "bottom"}:${g / max * 100}%"><i>${down ? -g : g}</i></span>`).join("")}</div>
    ${items.map((x, i) => `<div class="col${x.me ? " me" : ""}" style="--i:${i}" data-tip="${esc(x.tip)}">
      <span class="bw"><span class="cv${x.on ? " on" : ""}" style="${down ? "top" : "bottom"}:calc(${Math.abs(x.v) / max * 100}% + 3px)">${fmt(x.v)}</span><span class="cb" style="height:${Math.abs(x.v) / max * 100}%"></span></span>
      <span class="cp">${x.pic || ""}</span>
      <span class="cl">${esc(x.label)}</span>
    </div>`).join("")}
  </div>`;
};
// Andrew, 2026-09-26: no bars here. The face sits where the bar's end would
// be, then the name, then the points. One row a race, sorted, this week pink.
const dotRows = (items, { max }) => items.map((x, i) => {
  const pct = Math.abs(x.v) / max * 100;
  const flip = pct > 62;
  return `<div class="drow${x.me ? " me" : ""}" style="--i:${i}" data-tip="${esc(x.tip)}">
    <div class="lab"><span class="lt">${esc(x.label)}<small>R${x.round}</small></span></div>
    <div class="dtrack"><span class="dline" style="width:${pct}%"></span>
      <span class="dmark" style="left:${pct}%">${x.pic}</span>
      <span class="dlab${flip ? " flip" : ""}" style="${flip ? "right" : "left"}:calc(${flip ? 100 - pct : pct}% + 22px)"><b>${esc(x.name)}</b><i>${x.v}</i></span>
    </div>
  </div>`;
}).join("");
const dowMax = Math.ceil(Math.max(...driverWeeks.map(w => w.top.tot)) / 100) * 100;
const chart4a = dotRows(driverWeeks.map(w => ({
  v: w.top.tot, label: w.name, round: w.round, me: w.round === ROUND, name: surname(w.top.driver), pic: head(w.top.driver, 34),
  tip: `${w.full}, round ${w.round}: ${w.top.driver}, ${w.top.tot} across the league, ${w.top.each} a pick for ${w.top.n} pickers`,
})), { max: dowMax });
const worstMax = Math.ceil(Math.max(...driverWeeks.map(w => -w.bottom.tot)) / 10) * 10;
const chart4b = dotRows(driverWeeks.map(w => ({
  v: w.bottom.tot, label: w.name, round: w.round, me: w.round === ROUND, name: surname(w.bottom.driver), pic: head(w.bottom.driver, 34),
  tip: `${w.full}, round ${w.round}: ${w.bottom.driver}, ${w.bottom.tot} across the league, ${w.bottom.each} a pick for ${w.bottom.n} pickers`,
})), { max: worstMax });

/* the pool, this week */
const c4per = pool.map((d, i) => barRow({
  label: d.driver.split(" ").pop(), sub: `${d.picks} pickers`, pic: head(d.driver, 34), value: d.total, max: 170, min: -40,
  tone: d.total < 0 ? "pink" : d.total === 0 ? "muted" : "blue", i,
  tip: `${d.driver}: ${signed(d.per)} a pick, picked by ${d.picks} of 48, ${signed(d.total)} across the league`,
})).join("");

/* chart 5: team scores this week */
const chart5 = teamWeek.map((t, i) => barRow({
  label: shortTeam(t.team.name), pic: logo(t.team, 28), value: t.v, max: 30, min: -6, who: `data-team="${esc(t.team.name)}"`,
  tone: t.v < 0 ? "pink" : t.v >= 20 ? "blue" : "muted", i,
  tip: `${t.team.name}: ${t.v}. ${playerOf[t.team.player1_id]?.name} ${drv(week.find(s => s.player_id === t.team.player1_id) || {})}, ${playerOf[t.team.player2_id]?.name} ${drv(week.find(s => s.player_id === t.team.player2_id) || {})}, BOX BOX a push`,
})).join("");

/* chart 6: the weekly leader, every round */
const chart6 = byRound.map((b, i) => barRow({
  label: b.name, sub: `R${b.round} · ${surname(b.leader.name)}`, pic: face(b.leader, 28), value: b.max, max: 80, who: `data-player="${esc(b.leader.name)}"`,
  tone: b.round === ROUND ? "pink" : "blue", i,
  tip: `${b.full}: ${b.leader.name} led the week with ${b.max}`,
})).join("");

/* the matchups */
const matchupCards = matchups.map((m, i) => {
  const hw = m.hs > m.as;
  return `<div class="mu ${m.division === "championship" ? "ch" : "se"}" data-team="${esc(m.home.name)}|${esc(m.away.name)}" style="--i:${i}">
    <div class="side${hw ? " won" : ""}">${logo(m.home, 34)}<span class="tn">${esc(shortTeam(m.home.name))}</span><span class="seat">OVER</span></div>
    <div class="score"><span class="${m.hs < 0 ? "pink" : hw ? "blue" : ""}">${m.hs}</span><span class="v">v</span><span class="${m.as < 0 ? "pink" : !hw ? "blue" : ""}">${m.as}</span></div>
    <div class="side r${!hw ? " won" : ""}">${logo(m.away, 34)}<span class="tn">${esc(shortTeam(m.away.name))}</span><span class="seat">UNDER</span></div>
  </div>`;
}).join("");

/* the table view */
const table = `<table><thead><tr><th>#</th><th>Player</th><th>Total</th><th>Top</th><th>Mid</th><th>Order</th><th>Best</th><th>Needle</th><th>Bonus</th><th>Prev low</th></tr></thead><tbody>${
  week.map((r, i) => { const p = personal.find(x => x.player.id === r.player_id); return `<tr data-player="${esc(r.player.name)}"><td>${i + 1}</td><td>${esc(r.player.name)}</td><td class="${r.ind < 0 ? "pink" : ""}"><b>${r.ind}</b></td><td>${r.top_pick_pts || 0}</td><td>${r.midfield_pts || 0}</td><td>${r.order_bonus || 0}</td><td>${r.best_finish_bonus || 0}</td><td>${r.pit_individual_pts || 0}</td><td>${r.weekly_bonus_pts || 0}</td><td>${p ? p.prev : ""}</td></tr>`; }).join("")
}</tbody></table>`;

const roundTable = `<table><thead><tr><th>R</th><th>Race</th><th>Avg</th><th>Median</th><th>High</th><th>Low</th><th>Drivers only</th><th>Team avg</th></tr></thead><tbody>${
  byRound.map(b => `<tr class="${b.round === ROUND ? "hl" : ""}"><td>${b.round}</td><td>${esc(b.full)}</td><td>${one(b.avg)}</td><td>${b.med}</td><td>${b.max}</td><td>${b.min}</td><td>${one(b.drvAvg)}</td><td>${one(b.teamAvg)}</td></tr>`).join("")
}</tbody></table>`;

/* who is reading: one line a player, baked in, so the picker can say your week */
const rankThisWeek = Object.fromEntries(week.slice().sort((a, b) => b.ind - a.ind).map((r, i) => [r.player_id, i + 1]));
const ME = Object.fromEntries(players.filter(p => week.some(r => r.player_id === p.id)).map(p => {
  const r = week.find(x => x.player_id === p.id); const t = teams.find(t => t.player1_id === p.id || t.player2_id === p.id);
  const m = t && matchups.find(m => m.home.id === t.id || m.away.id === t.id);
  const mine = m && (m.home.id === t.id ? m.hs : m.as), theirs = m && (m.home.id === t.id ? m.as : m.hs), opp = m && (m.home.id === t.id ? m.away : m.home);
  const pl = personal.find(x => x.player.id === p.id);
  const weeksOf = Object.fromEntries(rows.filter(x => x.player_id === p.id).map(x => [x.round, x.ind]));
  const teamWeeksOf = t ? Object.fromEntries(teamWeeks.filter(x => x.team.id === t.id).map(x => [x.round, x.v])) : {};
  return [p.name, { score: r.ind, rank: rankThisWeek[p.id], team: t ? t.name : null, mine, theirs, opp: opp ? opp.name : null,
    won: m ? mine > theirs : null, low: pl ? pl.worst : false, prev: pl ? pl.prev : null, wall: lowest100.filter(x => x.player_id === p.id && x.round === ROUND).length,
    weeks: weeksOf, teamWeeks: teamWeeksOf }];
}));
const PLAYER_NAMES = players.map(p => p.name).sort((a, b) => a.localeCompare(b));

/* ---------------------------------------------------------------- the page */

const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>The Bahlaysian GP in Numbers</title>
<meta name="description" content="Round 15, the Bahlaysian Grand Prix: the lowest-scoring week in Formula 5 history, in numbers.">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Encode+Sans+Semi+Condensed:wght@400;600;700&family=Chakra+Petch:wght@600;700&display=swap" rel="stylesheet">
<style>
:root{--amber:#ffc93c;--bg:#07070c;--bg2:#0e0e17;--bg3:#151521;--bg4:#1d1d2b;--blue:#00d9ff;--pink:#ff2d95;--text:#f2f2f7;--text2:#a8a8c0;--text3:#8a8aa6;--border:rgba(255,255,255,.09);--border2:rgba(255,255,255,.16);--fd:'Encode Sans Semi Condensed',system-ui,sans-serif;--fn:'Chakra Petch',monospace}
*{margin:0;padding:0;box-sizing:border-box}
html{background:var(--bg)}
body{font-family:var(--fd);background:var(--bg);color:var(--text);padding:16px 16px 60px;max-width:660px;margin:0 auto;font-size:15px;line-height:1.5;-webkit-font-smoothing:antialiased}
a{color:var(--blue)}
.kicker{font-family:var(--fn);font-weight:700;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--blue)}
h1{font-family:var(--fn);font-weight:700;font-size:clamp(26px,7.4vw,40px);line-height:1;letter-spacing:.02em;text-transform:uppercase;margin:8px 0 6px;color:var(--pink);text-shadow:0 0 6px rgba(255,45,149,.55),0 0 22px rgba(255,45,149,.35)}
.stand{font-size:17px;color:var(--text2);max-width:520px}
.who{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;margin:10px 0 14px}
.who label{font-family:var(--fn);font-weight:700;font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:var(--amber)}
.who select{font-family:var(--fd);font-size:16px;font-weight:600;color:var(--text);background:var(--bg3);border:1px solid var(--amber);border-radius:10px;padding:8px 10px;min-height:40px}
.mine{flex-basis:100%;font-size:15px;color:var(--text);line-height:1.4}
.mine:empty{display:none}
.you .face,.w2.you .face,.fw.you .face{border-color:var(--amber)!important;box-shadow:0 0 12px rgba(255,201,60,.8)!important}
.ss circle.you{fill:var(--amber)!important;fill-opacity:1;stroke:#000;stroke-width:1;r:4.5}
.row.you,.drow.you{background:rgba(255,201,60,.08);border-radius:8px;box-shadow:inset 3px 0 0 var(--amber)}
.row.you .lt,.mu.you .tn{color:var(--amber)}
.mu.you{border-color:var(--amber);box-shadow:0 0 12px rgba(255,201,60,.25)}
tr.you td{color:var(--amber)}
.w2.you b,.row.you .val{color:var(--amber)}
.stand b{color:var(--text)}
.hero{margin:8px 0 24px}
.tiles{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:18px 0 0}
.tile{background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:14px 14px 12px}
.tile .n{font-family:var(--fn);font-weight:700;font-size:38px;line-height:1;color:var(--pink);text-shadow:0 0 10px rgba(255,45,149,.45)}
.tile .n.blue{color:var(--blue);text-shadow:0 0 10px rgba(0,217,255,.45)}
.tile .c{font-size:13px;color:var(--text2);margin-top:8px;line-height:1.35}
.tile.wide{grid-column:1/-1}
.swarm{margin-top:4px}
.srow{display:grid;grid-template-columns:96px 1fr;align-items:center;gap:8px;animation:fade .5s both;animation-delay:calc(var(--i)*35ms)}
.ss{display:block;width:100%;height:44px;overflow:visible}
.ss circle{fill:var(--blue);fill-opacity:.75}
.srow.me .ss circle{fill:var(--pink);fill-opacity:1}
.srow.me .lt{color:var(--pink)}
.srow.ax{height:20px}
.axis{position:relative;height:20px}
.axis span{position:absolute;transform:translateX(-50%);font-family:var(--fn);font-size:13px;color:var(--text3)}
.wall100{display:grid;grid-template-columns:repeat(10,1fr);gap:14px 2px;margin-top:10px;padding-bottom:12px}
.w2{display:flex;flex-direction:column;align-items:center;gap:1px;position:relative}
.w2 .face{width:28px;height:28px}
.w2 b{font-family:var(--fn);font-size:13px;color:var(--text2);line-height:1}
.w2.me b{color:var(--pink)}
.w2.lo .face,.w2.hi .face{border-color:#fff;box-shadow:0 0 10px #fff}
.wall25{display:grid;grid-template-columns:repeat(5,1fr);gap:16px 4px;margin-top:10px;padding-bottom:14px}
.wall25 .w2 .logo{width:48px;height:48px;border-width:2px}
.wall25 .w2.me .logo{border-color:var(--pink)}
.wall25 .w2:not(.me) .logo{border-color:var(--blue)}
.wall25 .w2 b{font-size:16px;display:flex;align-items:baseline;gap:3px}
.wall25 .w2 b .wl{font-style:normal;font-size:13px;font-weight:700;color:var(--text3)}
.wall25 .w2 b .wl.W{color:var(--blue)}
.wall25 .w2:not(.me) .logo{filter:grayscale(1) brightness(.7);border-color:var(--text3)}
.wall25 .w2 span{font-size:13px;color:var(--text2);line-height:1.1;text-align:center;max-width:72px;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.w2 i{position:absolute;top:100%;left:50%;transform:translateX(-50%);margin-top:1px;font-style:normal;font-size:13px;line-height:1;color:var(--text);white-space:nowrap;text-transform:uppercase;letter-spacing:.04em}
.w2.hi i{left:auto;right:0;transform:none}
.lead{background:var(--bg2);border:1px solid var(--border);border-radius:18px;padding:16px 14px 14px;margin-top:18px}
.cols{position:relative;display:flex;align-items:flex-end;gap:2px;padding:0 0 0 26px;margin-top:6px}
.grid{position:absolute;left:0;right:0;top:20px;height:180px;pointer-events:none}
.grid span{position:absolute;left:26px;right:0;height:1px;background:var(--border)}
.grid span i{position:absolute;left:-26px;top:-8px;font-style:normal;font-family:var(--fn);font-size:13px;color:var(--text3)}
.col{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;position:relative}
.bw{display:flex;align-items:flex-end;width:100%;height:180px;margin-top:20px;position:relative}
.cb{display:block;width:100%;background:var(--blue);border-radius:3px 3px 0 0;transform-origin:bottom;animation:rise .6s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--i)*35ms);transition:height .5s cubic-bezier(.2,.8,.2,1);box-shadow:0 0 8px rgba(0,217,255,.25)}
.col.me .cb{background:var(--pink);box-shadow:0 0 12px rgba(255,45,149,.6)}
.cv{position:absolute;left:50%;transform:translateX(-50%);font-family:var(--fn);font-weight:700;font-size:13px;color:var(--text2);line-height:1;visibility:hidden;white-space:nowrap;transition:bottom .5s cubic-bezier(.2,.8,.2,1)}
.cv.on{visibility:visible}
.col.me .cv{color:var(--pink)}
.cp{display:flex;justify-content:center;margin-top:6px;min-height:0}
.cp:empty{display:none}
.sub{font-family:var(--fn);font-weight:700;font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:var(--text2);margin:10px 0 0}
.drow{display:grid;grid-template-columns:96px 1fr;align-items:center;gap:8px;height:42px;animation:fade .5s both;animation-delay:calc(var(--i)*35ms)}
.dtrack{position:relative;height:42px;margin-right:18px}
.dline{position:absolute;left:0;top:50%;height:1px;background:var(--border2)}
.dmark{position:absolute;top:50%;transform:translate(-50%,-50%);display:flex}
.dmark .head{width:34px;height:34px;border-color:var(--blue);box-shadow:0 0 8px rgba(0,217,255,.35)}
.drow.me .dmark .head{border-color:var(--pink);box-shadow:0 0 10px rgba(255,45,149,.6)}
.dlab{position:absolute;top:50%;transform:translateY(-50%);white-space:nowrap;font-size:13px;line-height:1.1;display:flex;flex-direction:column}
.dlab.flip{text-align:right;align-items:flex-end}
.dlab b{font-weight:600;color:var(--text)}
.dlab i{font-style:normal;font-family:var(--fn);font-weight:700;color:var(--blue)}
.drow.me .dlab i{color:var(--pink)}
.drow.me .lt{color:var(--pink)}
.cols.wide{padding-left:36px}.cols.wide .grid span{left:36px}.cols.wide .grid span i{left:-36px}
.cols.down .bw{align-items:flex-start;margin-top:0;margin-bottom:20px}
.cols.down .cb{transform-origin:top;border-radius:0 0 3px 3px}
.cols.down .grid span i{top:-8px}
.cl{height:76px;margin-top:5px;writing-mode:vertical-rl;transform:rotate(180deg);font-size:13px;color:var(--text2);line-height:1;white-space:nowrap;overflow:hidden}
.col.me .cl{color:var(--pink);font-weight:700}
.col:hover .cv{visibility:visible}
@keyframes rise{from{transform:scaleY(0)}to{transform:scaleY(1)}}
.tile .c b{color:var(--text)}
section{margin:22px 0}
.card{background:var(--bg2);border:1px solid var(--border);border-radius:18px;padding:16px 14px 14px;margin-bottom:14px}
.ch{display:flex;align-items:flex-start;gap:10px;margin-bottom:6px}
.num{font-family:var(--fn);font-weight:700;font-size:13px;color:var(--blue);border:1px solid var(--blue);border-radius:6px;padding:1px 6px;letter-spacing:.06em;flex-shrink:0;margin-top:2px}
.ch h2{font-size:20px;line-height:1.2;font-weight:700}
.ch p,.note{font-size:14px;color:var(--text2);margin-top:4px}
.note{margin-top:10px;line-height:1.45}
.note b{color:var(--text)}
.acts{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0 12px}
.act{font-family:var(--fd);font-weight:700;font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:var(--text2);background:var(--bg3);border:1px solid var(--border2);border-radius:999px;padding:9px 12px;min-height:36px;cursor:pointer}
.act[aria-pressed="true"]{color:#000;background:var(--blue);border-color:var(--blue)}
.act:focus-visible{outline:2px solid var(--blue);outline-offset:2px}
.legend{display:flex;gap:14px;flex-wrap:wrap;font-size:13px;color:var(--text2);margin:0 0 10px}
.legend i{display:inline-block;width:12px;height:12px;border-radius:3px;vertical-align:-1px;margin-right:5px}
.legend i.blue{background:var(--blue)}.legend i.pink{background:var(--pink)}.legend i.muted{background:var(--text3)}.legend i.amber{background:var(--amber)}.legend i.round{border-radius:50%}
.ydot{position:absolute;top:50%;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;background:var(--amber);border:2px solid #000;box-shadow:0 0 8px rgba(255,201,60,.8);display:none;z-index:2}
.swarm.one .ss{height:auto}
.swarm.one .axis{margin-top:6px}
.swarm.one .ss line.base{stroke:var(--border2);stroke-width:1}
.swarm.one .ss circle{fill:var(--blue);fill-opacity:.55}
.swarm.one .ss circle.me{fill:var(--pink);fill-opacity:1}
.gone{display:none}
.negs{display:flex;flex-wrap:wrap;gap:12px 10px;justify-content:center;margin-top:12px}
.w3{display:flex;flex-direction:column;align-items:center;gap:3px;width:76px;text-align:center}
.w3 .face,.w3 .logo{width:56px;height:56px}
.w3 .logo{border:2px solid var(--pink)}
.w3 b{font-family:var(--fn);font-size:20px;color:var(--pink);line-height:1}
.w3 span{font-size:13px;color:var(--text2);line-height:1.15}
.w3.you .face,.w3.you .logo{border-color:var(--amber)!important;box-shadow:0 0 12px rgba(255,201,60,.8)}
.youleg{display:none}body.has-you .youleg{display:inline}
.row{display:grid;grid-template-columns:132px 1fr 58px;align-items:center;gap:8px;min-height:32px;padding:2px 0}
.row.db{grid-template-columns:112px 1fr 84px}
.lab{display:flex;align-items:center;gap:7px;min-width:0}
.lt{font-size:14px;font-weight:600;line-height:1.15;min-width:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.lt small{display:block;font-size:13px;font-weight:400;color:var(--text3)}
.track{position:relative;height:20px;background:var(--bg3);border-radius:6px;overflow:hidden}
.zero{position:absolute;top:0;bottom:0;width:1px;background:var(--border2)}
.bar{position:absolute;top:2px;bottom:2px;border-radius:4px;transform-origin:left center;animation:grow .6s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--i)*35ms)}
.bar.blue{background:var(--blue);box-shadow:0 0 10px rgba(0,217,255,.35)}
.bar.pink{background:var(--pink);box-shadow:0 0 10px rgba(255,45,149,.35)}
.bar.muted{background:var(--text3)}
.val{font-family:var(--fn);font-weight:700;font-size:16px;text-align:right;white-space:nowrap}
.val.blue,.blue{color:var(--blue)}.val.pink,.pink{color:var(--pink)}.val.muted,.muted{color:var(--text2)}
@keyframes grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.face,.logo,.head{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;object-fit:cover;background:var(--bg4);border:2px solid var(--border2);flex-shrink:0;font-family:var(--fn);font-weight:700;color:var(--text2);font-size:13px}
.logo{border-radius:8px;object-fit:contain;background:#fff;padding:2px}
.logo-t{background:var(--bg4);color:var(--text2)}
.head{object-fit:cover;object-position:top;background:var(--bg4)}
.stack{display:grid;grid-template-columns:44px 1fr 28px;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--border);animation:fade .5s both;animation-delay:calc(var(--i)*40ms)}
.stack:last-child{border-bottom:0}
.sv{font-family:var(--fn);font-weight:700;font-size:20px;text-align:right}
.faces{display:flex;flex-wrap:wrap;gap:3px}
.fw{display:inline-flex}
.sc{font-family:var(--fn);font-size:13px;color:var(--text3);text-align:right}
@keyframes fade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
.link{position:absolute;top:9px;height:2px;background:var(--border2)}
.dot{position:absolute;top:3px;width:14px;height:14px;margin-left:-7px;border-radius:50%;border:2px solid var(--bg2)}
.dot.blue{background:var(--blue)}.dot.pink{background:var(--pink);box-shadow:0 0 8px rgba(255,45,149,.6)}
.db .val{font-size:14px}.arr{color:var(--text3)}
.db.held .lt{color:var(--text2)}
.more{display:none}.show-all .more{display:grid}
.pod{display:flex;gap:10px;margin:10px 0 4px}
.pod .p{flex:1;background:var(--bg3);border-radius:12px;padding:10px 8px;text-align:center;font-size:13px;color:var(--text2)}
.pod .p b{display:block;color:var(--text);font-size:14px;margin-top:6px}
.pod .p .pos{font-family:var(--fn);font-weight:700;color:var(--blue);font-size:13px;letter-spacing:.08em}
.pod .p .no{color:var(--pink);font-weight:600;font-size:13px}
.wall{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}
.wall .w{display:flex;flex-direction:column;align-items:center;width:58px;font-size:13px;color:var(--text2);text-align:center;line-height:1.15}
.wall .w b{font-family:var(--fn);color:var(--pink);font-size:15px}
.mu{display:grid;grid-template-columns:1fr 92px 1fr;align-items:center;gap:6px;background:var(--bg2);border:1px solid var(--border);border-left:3px solid #c9ccd6;border-radius:14px;padding:10px 10px;margin-bottom:8px;animation:fade .5s both;animation-delay:calc(var(--i)*40ms)}
.mu.ch{border-left-color:#ffc93c}
.side{display:flex;flex-direction:column;align-items:flex-start;gap:3px;min-width:0}
.side.r{align-items:flex-end;text-align:right}
.side .tn{font-size:14px;font-weight:600;line-height:1.15;color:var(--text2)}
.side.won .tn{color:var(--text)}
.side .seat{font-family:var(--fn);font-size:13px;letter-spacing:.1em;color:var(--text3)}
.score{font-family:var(--fn);font-weight:700;font-size:24px;text-align:center;display:flex;justify-content:center;gap:6px;align-items:baseline}
.score .v{font-size:13px;color:var(--text3);font-weight:600}
.divh{font-family:var(--fn);font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:var(--text2);margin:14px 0 8px}
#tip{position:fixed;z-index:9;pointer-events:none;background:#000;color:var(--text);border:1px solid var(--blue);border-radius:8px;padding:7px 10px;font-size:13px;line-height:1.35;max-width:280px;opacity:0;transition:opacity .12s}
#tip.on{opacity:1}
details{margin-top:14px}
summary{cursor:pointer;font-weight:700;color:var(--text2);font-size:14px;padding:8px 0;min-height:36px}
table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}
th{text-align:left;font-weight:700;color:var(--text3);letter-spacing:.04em;text-transform:uppercase;padding:6px 4px;border-bottom:1px solid var(--border2);font-size:13px}
td{padding:6px 4px;border-bottom:1px solid var(--border);font-family:var(--fn);font-size:13px}
td:nth-child(2){font-family:var(--fd);font-size:14px;white-space:nowrap}
tr.hl td{color:var(--pink)}
.tw{overflow-x:auto}
.foot{font-size:13px;color:var(--text3);margin-top:30px;line-height:1.5}
@media (max-width:420px){.drow,.srow{grid-template-columns:78px 1fr}.w2 .face{width:26px;height:26px}.row{grid-template-columns:122px 1fr 42px;gap:6px}.row.db{grid-template-columns:110px 1fr 74px}.lt{font-size:13px}.tile .n{font-size:32px}.val{font-size:15px}}
@media (prefers-reduced-motion:reduce){*{animation-duration:.01ms!important;animation-delay:0ms!important;transition-duration:.01ms!important}}
</style></head>
<body>
<div id="tip" role="status" aria-live="polite"></div>

<header class="hero">
  <div class="kicker">Round ${ROUND} · ${esc(raceTitle(race.race_name))}</div>
  <h1>The Bahlaysian GP in Numbers</h1>
  <div class="who">
    <label for="me">Viewing as</label>
    <select id="me"><option value="">Nobody</option>${PLAYER_NAMES.map(n => `<option>${esc(n)}</option>`).join("")}</select>
    <p id="mine" class="mine"></p>
  </div>
  <p class="stand">The lowest scoring week in league history, the Bahlaysian GP stands as an outlier in this F5 season. Scores were low across the board, including the first ever negative scores, achieved by ${W[negatives.length]} people. And the team matchups were just as strange: one team won their matchup by scoring exactly one point.</p>
  <div class="lead">
    <div class="ch"><span class="num">1</span><div><h2>The Bahlaysian GP led to the lowest F5 scores of the season by every measure, and by a wide margin.</h2><p>Through fourteen rounds the average F5 score had never dipped below ${one(prevLowAvg.avg)}, and ${W[byRound.filter(b => b.round !== ROUND && b.avg > 38).length]} of those weeks averaged over 38. Bahlaysia came in at ${one(thisRound.avg)}, with half the league on ${thisRound.med} points or fewer. And the drop holds with the Needle and the weekly bonus stripped out: it was the drivers that sank the week, not the missing pit stop.</p></div></div>
    <div class="legend"><span><i class="blue"></i>Other weeks</span><span><i class="pink"></i>This week</span><span class="youleg"><i class="amber round"></i>Your score that week</span></div>
    <div id="c1">${chart1}</div>
  </div>
</header>

<section>
  <div class="card">
    <div class="ch"><span class="num">2</span><div><h2>${week.filter(r => r.ind < prevLowAvg.avg).length} of the 48 scores in Baku were lower than the average score of any other week.</h2><p>Every dot is one player's score in one week, ${rows.length} in all, and the league's scores pile up between the twenties and the fifties. Baku's 48 sit in a clump against the left edge, with ${thisRound.under10} people under ten. And the best score of the week, ${esc(thisRound.leader.name)}'s ${thisRound.max}, would have been in the bottom half of the field in ${W[medianOtherAbove]} of the other fourteen.</p></div></div>
    <div class="legend"><span><i class="blue"></i>A score, any other week</span><span><i class="pink"></i>A score this week</span><span class="youleg"><i class="amber"></i>You</span></div>
    ${chart2one}
  </div>
</section>

<section>
  <div class="card">
    <div class="ch"><span class="num">3</span><div><h2>${W[negatives.length][0].toUpperCase() + W[negatives.length].slice(1)} players and one team finished the week below zero, which nobody had done before.</h2><p>An F5 score is five drivers, a finishing-order bonus, a best-finish guess, the Needle and a weekly bonus for the top ten, and a driver who finishes outside the points costs the people holding him a point. These ${W[negatives.length]} had Norris on top for minus one and two midfielders who finished out of the points, with nothing from the order, the best finish or the Needle to cover it. And Garra Dynamics put two of them on the same team: ${esc(playerOf[teamWeek[0].team.player1_id].name)} and ${esc(playerOf[teamWeek[0].team.player2_id].name)}, for a team score of ${teamWeek[0].v}.</p></div></div>
    <div class="negs">${negWall}</div>
  </div>
</section>

<section>
  <div class="card">
    <div class="ch"><span class="num">4</span><div><h2>${lowestTeam100ThisWeek} of the ${TEAM_N} lowest team scores in league history were set in Baku.</h2><p>A team's week is two hands of driver points plus BOX BOX, and ${teamWeeks.length} of them have been posted across ${rounds.length} rounds. These are the ${W[TEAM_N] || TEAM_N} lowest, in order, and every one of this week's 24 teams is on the list, from Garra Dynamics on ${teamWeek[0].v} to Bronco and Peloton on ${bestTeamThisWeek}. And the only other team here is ${esc(teamOutsider.team.name)}, whose ${teamOutsider.v} in ${esc(byRound.find(b => b.round === teamOutsider.round).name)} was the lowest team score in the league until Saturday.</p></div></div>
    <div class="legend"><span><i class="pink"></i>This week</span><span><i class="blue"></i>Any other week</span><span class="youleg"><i class="amber"></i>Your team</span></div>
    <div class="wall25">${wallTeam100}</div>
  </div>
</section>

<section>
  <div class="card">
    <div class="ch"><span class="num">5</span><div><h2>The average team score was ${one(thisRound.teamAvg)}, against a previous low of ${one(prevLowTeamAvg)}.</h2><p>Across fourteen rounds the league's 24 teams had averaged between ${one(prevLowTeamAvg)} and ${one(Math.max(...byRound.map(b => b.teamAvg)))} a week, with the Canadian GP the only one under sixty. Bahlaysia came in at ${one(thisRound.teamAvg)}. And that is with nothing lost on the line: BOX BOX was a push for every team, so no one gave up the point a losing side usually does.</p></div></div>
    <div class="legend"><span><i class="blue"></i>Other weeks</span><span><i class="pink"></i>This week</span><span class="youleg"><i class="amber round"></i>Your team's score that week</span></div>
    <div id="c4t">${chart4t}</div>
  </div>
</section>

<section>
  <div class="card">
    <div class="ch"><span class="num">6</span><div><h2>${esc(surname(dowThis.top.driver))} was F5 driver of the week with ${dowThis.top.tot} points, the lowest winning total of the season and less than half the previous low.</h2><p>Every driver in the pool earns each of his pickers the same points, and adding those up across all 48 hands gives his league total for the week, which is how the driver of the week is named. Fourteen rounds in, the driver of the week had never scored the league fewer than ${dowPrevLow}, including ${driverWeeks.filter(w => w.top.tot >= 850).length} weeks over 850. And Lindblad's ${dowThis.top.tot} came off ${dowThis.top.n} pickers at ${dowThis.top.each} points each: the best driver in the pool finished seventh.</p></div></div>
    ${chart4a}
    <div class="gone">
    <p class="note" style="margin:0 0 6px">${esc(surname(dowThis.bottom.driver))}'s ${dowThis.bottom.tot} was not the worst a driver has done. ${esc(surname(worstEver.bottom.driver))} cost the league ${worstEver.bottom.tot} in ${esc(worstEver.name)}, and Gasly himself did ${driverWeeks.find(w => w.round === 4).bottom.tot} in Miami. And the mechanism is the same every time: a driver who finishes outside the points costs a point to everybody holding him, so the damage is the size of his following.</p>
    </div>
  </div>
</section>

<section>
  <div class="card">
    <div class="ch"><span class="num">7</span><div><h2>${esc(thisRound.leader.name)} won the week with ${thisRound.max}, the lowest winning score the league has seen.</h2><p>Somebody wins every F5 week, and through fourteen rounds the winning score had never been under ${prevLowHigh}. ${esc(thisRound.leader.name)} won this one with ${thisRound.max}, including a best-finish bonus that only two people collected. And the drop is bigger than it looks: ${W[byRound.filter(b => b.max >= 60).length]} of the season's weekly winners scored 60 or more.</p></div></div>
    <div id="c6">${chart6}</div>

  </div>
</section>

<section>
  <div class="card">
    <div class="ch"><div><h2>And there was no pit stop.</h2><p>On top of the craziness of this week, Aston Martin retired without a pit stop, meaning there were no pit stop points in either the team or the individual competition. The Needle paid nobody and BOX BOX was a push in all twelve matchups. However, a BOX BOX moves a matchup by six points, and only ${W[bbFlippable]} of the twelve were close enough that the line could have decided them.</p></div></div>
  </div>
</section>

<p class="foot">Individual score is drivers plus order bonus, best finish, the Needle and the weekly bonus. Team score is both players' driver points plus BOX BOX. Built from the scores table on ${new Date().toISOString().slice(0, 10)} by scripts/recap/round15.mjs.</p>

<script>
var ME=${JSON.stringify(ME)};
(function(){
  // Who is reading. ?player= first, then what the app remembers, then nobody.
  // Every mark that belongs to a person or a team carries its name, and yours
  // go amber: the deck's colour for "you", so it means the same thing here.
  var sel=document.getElementById('me'),line=document.getElementById('mine');
  var q=new URLSearchParams(location.search).get('player');var stored=null;try{stored=localStorage.getItem('f1_user');}catch(e){}
  function apply(name){
    document.querySelectorAll('.you').forEach(function(el){el.classList.remove('you');});
    var m=ME[name];
    document.body.classList.toggle('has-you',!!m);
    if(!m){line.textContent='';document.querySelectorAll('.ydot').forEach(function(d){d.style.display='none';});return;}
    document.querySelectorAll('[data-player]').forEach(function(el){if(el.getAttribute('data-player')===name)el.classList.add('you');});
    if(m.team)document.querySelectorAll('[data-team]').forEach(function(el){if(el.getAttribute('data-team').split('|').indexOf(m.team)>=0)el.classList.add('you');});
    // Your dot draws last, so it sits on top of the swarm rather than under it.
    document.querySelectorAll('.ss circle.you').forEach(function(c){c.parentNode.appendChild(c);});
    // Your score on each week's bar, and your team's on each team bar.
    document.querySelectorAll('#c1 .row').forEach(function(r){var d=r.querySelector('.ydot'),v=m.weeks[r.querySelector('.bar').getAttribute('data-round')];
      if(v==null){d.style.display='none';}else{d.style.display='block';d.style.left=(v/ +d.getAttribute('data-max')*100)+'%';d.setAttribute('data-tip','You: '+v);}});
    document.querySelectorAll('#c4t .row').forEach(function(r){var d=r.querySelector('.ydot'),v=m.teamWeeks[r.querySelector('.bar').getAttribute('data-round')];
      if(v==null){d.style.display='none';}else{d.style.display='block';d.style.left=(v/ +d.getAttribute('data-max')*100)+'%';d.setAttribute('data-tip',m.team+': '+v);}});
    var s='You scored '+m.score+', '+ord(m.rank)+' of 48'+(m.low?', your lowest of the season (it was '+m.prev+')':'')+'. ';
    if(m.team)s+=m.team+' '+(m.won?'beat':'lost to')+' '+m.opp+', '+m.mine+' to '+m.theirs+'. ';
    line.textContent=s;
  }
  function ord(n){return n+(n%10==1&&n!=11?'st':n%10==2&&n!=12?'nd':n%10==3&&n!=13?'rd':'th');}
  var start=(q&&ME[q])?q:(stored&&ME[stored])?stored:'';
  sel.value=start;apply(start);
  sel.addEventListener('change',function(){apply(sel.value);try{if(sel.value)localStorage.setItem('f1_user',sel.value);}catch(e){}});
  var tip=document.getElementById('tip');
  function show(e,t){tip.textContent=t;tip.classList.add('on');move(e);}
  function move(e){var x=(e.touches?e.touches[0].clientX:e.clientX),y=(e.touches?e.touches[0].clientY:e.clientY);
    var w=tip.offsetWidth,h=tip.offsetHeight;tip.style.left=Math.max(6,Math.min(window.innerWidth-w-6,x+12))+'px';tip.style.top=(y-h-14<6?y+16:y-h-14)+'px';}
  function hide(){tip.classList.remove('on');}
  document.querySelectorAll('[data-tip]').forEach(function(el){
    el.addEventListener('mouseenter',function(e){show(e,el.getAttribute('data-tip'));});
    el.addEventListener('mousemove',move);el.addEventListener('mouseleave',hide);
    el.addEventListener('touchstart',function(e){show(e,el.getAttribute('data-tip'));setTimeout(hide,2200);},{passive:true});
  });
  // Chart 1: the same fifteen bars, three measures. Widths move, nothing is redrawn.
  var c1=document.getElementById('c1');
  c1.parentNode.querySelectorAll('.act[data-k]').forEach(function(b){b.addEventListener('click',function(){
    var k=b.getAttribute('data-k');var max=+c1.getAttribute('data-max-'+k);
    b.parentNode.querySelectorAll('.act').forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false');});
    var step=[10,20,50,100,200,500].find(function(st){return max/st<=6;})||1000,g='';for(var t=0;t<=max;t+=step){g+='<span style="bottom:'+(t/max*100)+'%"><i>'+t+'</i></span>';}
    c1.querySelector('.grid').innerHTML=g;
    c1.querySelectorAll('.col').forEach(function(r){var bar=r.querySelector('.cb');var v=+bar.getAttribute('data-'+k);
      bar.style.height=(v/max*100)+'%';var cv=r.querySelector('.cv');cv.textContent=(Math.round(v*10)/10).toFixed(1);cv.style.bottom='calc('+(v/max*100)+'% + 3px)';});
  });});

})();
</script>
</body></html>`;

// A deck, since 2026-09-27: five cards, one on screen at a time. Card 1 is
// the title and the lead chart; the rest pair up. Each card is measured and
// scaled to fit the phone, floored at 0.72, and scrolls only past the floor.
const bodyStart = html.indexOf("<body>") + "<body>".length, scriptAt = html.indexOf("<script>");
const body = html.slice(bodyStart, scriptAt);
const tip = body.slice(0, body.indexOf("</div>") + "</div>".length);
const rest = body.slice(tip.length);
const headerEnd = rest.indexOf("</header>") + "</header>".length;
const header = rest.slice(0, headerEnd);
const after = rest.slice(headerEnd);
const sections = after.split("<section>").slice(1).map(x => "<section>" + x.slice(0, x.indexOf("</section>") + "</section>".length));
const foot = after.slice(after.indexOf("<p class=\"foot\">"));
if (sections.length !== 7) throw new Error("expected 7 sections, got " + sections.length);
const cards = [[header], [sections[0], sections[1]], [sections[2], sections[3]], [sections[4]], [sections[5], sections[6], foot]];
const deck = cards.map((c, i) => `<section class="dc${i === 0 ? " on" : ""}" data-i="${i}"><div class="fit">${c.join("\n")}</div></section>`).join("\n");
const bar = `<div class="dbar"><button class="nav" id="back" aria-label="Back">&#8249;</button><div class="lights">${cards.map((_, i) => `<i${i === 0 ? ' class="on"' : ""}></i>`).join("")}</div><button class="nav next" id="next">NEXT</button></div>`;
const deckJs = `<script>
(function(){
  var cards=[].slice.call(document.querySelectorAll('.dc')),lights=[].slice.call(document.querySelectorAll('.lights i')),back=document.getElementById('back'),next=document.getElementById('next');
  var q0=new URLSearchParams(location.search),embed=q0.get('embed')==='1';
  if(embed)document.documentElement.classList.add('embed');
  var i=Math.max(0,Math.min(cards.length-1,(+q0.get('card')||1)-1));
  var MIN=0.72;
  function fit(card){var f=card.querySelector('.fit');f.style.transform='';f.style.width='';var have=card.clientHeight,nat=f.scrollHeight;
    var k=Math.min(1,have/nat);if(k<MIN)k=MIN;if(k<1){f.style.width=(100/k)+'%';f.style.transform='scale('+k+')';}
    card.classList.toggle('scrolls',f.scrollHeight*k>have+2);document.documentElement.dataset.fit=k.toFixed(3);}
  function show(n){i=n;cards.forEach(function(c,j){c.classList.toggle('on',j===n);c.scrollTop=0;});lights.forEach(function(l,j){l.classList.toggle('on',j<=n);});
    back.disabled=n===0;next.textContent=n===cards.length-1?'DONE':'NEXT';fit(cards[n]);
    if(!embed)try{history.replaceState(null,'',location.pathname+'?'+(function(){var q=new URLSearchParams(location.search);q.set('card',n+1);return q.toString();})());}catch(e){}}
  next.addEventListener('click',function(){if(i<cards.length-1)show(i+1);else location.href='/';});
  back.addEventListener('click',function(){if(i>0)show(i-1);});
  if(!embed)document.addEventListener('keydown',function(e){if(e.key==='ArrowRight')next.click();if(e.key==='ArrowLeft')back.click();});
  window.addEventListener('resize',function(){fit(cards[i]);});
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){fit(cards[i]);});
  [].forEach.call(document.images,function(im){im.addEventListener('load',function(){if(cards[i].contains(im))fit(cards[i]);});});
  show(i);setTimeout(function(){fit(cards[i]);},400);
})();
</script>`;
const deckCss = `<style>
html,body{height:100%;overflow:hidden}
body{padding:0;max-width:none}
.deck{position:fixed;inset:0 0 64px 0;overflow:hidden}
.dc{position:absolute;inset:0;display:none;overflow:hidden;padding:12px 16px 8px;box-sizing:border-box}
.dc.on{display:block}
.dc.scrolls{overflow-y:auto}
.fit{transform-origin:top left;max-width:660px;margin:0 auto}
.dc .card,.dc .lead{margin-bottom:10px}
.dc section{margin:0 0 8px}
.dc .hero{margin:0 0 8px}
.dbar{position:fixed;left:0;right:0;bottom:0;height:64px;display:flex;align-items:center;gap:10px;padding:0 16px;background:var(--bg2);border-top:1px solid var(--border);z-index:5}
.dc .row{min-height:22px;padding:0}
.dc .track{height:12px}
.dc .val{font-size:14px}
.dc #c4t .lt small{display:none}
.dc #c4t .row{min-height:20px}
.dc .lt{font-size:13px;line-height:1.05}
.dc .lt small{font-size:12px;line-height:1}
.dc .stand{font-size:15px}
.dc h1{font-size:clamp(24px,6.6vw,34px)}
.dc .ch h2{font-size:18px}
.dc .ch p{font-size:13px}
.dc .who{margin:8px 0 10px}
.dc .who select{min-height:36px;padding:6px 8px;font-size:15px}
.dc .mine{font-size:14px}
.dc .wall25{grid-template-columns:repeat(7,1fr);gap:6px 3px;padding-bottom:6px;margin-top:6px}
.dc .wall25 .w2 .logo{width:32px;height:32px}
.dc .wall25 .w2 b{font-size:13px;gap:2px}
.dc .wall25 .w2 b .wl{font-size:12px}
.dc .wall25 .w2 span{display:none}
.dc .wall25 .w2 b{font-size:15px}
.dc .wall25 .w2 i{display:none}
.dc .drow,.dc .dtrack{height:36px}
.dc .dmark .head{width:30px;height:30px}
.dc .negs{gap:8px 6px}
.dc .w3{width:64px}
.dc .w3 .face,.dc .w3 .logo{width:46px;height:46px}
.dc .w3 b{font-size:17px}
.dc .legend{margin-bottom:6px}
.dc .swarm.one .ss{max-height:260px;width:auto;max-width:100%;margin:0 auto;display:block}
.nav{font-family:var(--fn);font-weight:700;font-size:16px;letter-spacing:.08em;color:var(--text);background:var(--bg3);border:1px solid var(--border2);border-radius:12px;min-height:44px;min-width:44px;padding:0 14px;cursor:pointer}
.nav:disabled{opacity:.35;cursor:default}
.nav.next{margin-left:auto;background:var(--blue);color:#000;border-color:var(--blue);padding:0 26px;box-shadow:0 0 14px rgba(0,217,255,.45)}
.lights{display:flex;gap:6px}
.lights i{width:9px;height:9px;border-radius:50%;background:var(--bg4);border:1px solid var(--border2)}
.lights i.on{background:var(--blue);border-color:var(--blue);box-shadow:0 0 6px var(--blue)}
.foot{margin-top:14px}
html.embed .dbar,html.embed .who,html.embed .kicker{display:none}
html.embed .deck{inset:0}
html.embed .dc{padding:4px 2px 0}
html.embed .hero{margin-top:0}
</style>`;
const out = html.slice(0, bodyStart).replace("</head>", deckCss + "\n</head>") + tip + `\n<div class="deck">${deck}</div>\n${bar}\n` + html.slice(scriptAt).replace("</body>", deckJs + "\n</body>");
fs.writeFileSync("public/recaps/round15.html", out);
console.log(`wrote public/recaps/round15.html (${(html.length / 1024).toFixed(0)}KB)`);
console.log(`avg ${one(thisRound.avg)} prev ${one(prevLowAvg.avg)} (${prevLowAvg.name}); negatives ${negatives.length}; worst ${worstCount}/48; high ${thisRound.max} prev ${prevLowHigh}; team avg ${one(thisRound.teamAvg)} prev ${one(prevLowTeamAvg)}; low team ever prev ${prevLowTeam}, this week holds the ${lowTeamAllThisWeek} lowest`);
