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
const shortRace = name => { const k = name.replace(/ Grand Prix.*$/, ""); return PLACE[k] || k; };

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
const barRow = ({ label, pic = "", value, max, min = 0, tone, tip, sub = "", i = 0, extra = "" }) => {
  const span = max - min;
  const zero = ((0 - min) / span) * 100;
  const w = (Math.abs(value) / span) * 100;
  const left = value >= 0 ? zero : zero - w;
  return `<div class="row" data-tip="${esc(tip)}" style="--i:${i}">
    <div class="lab">${pic}<span class="lt">${esc(label)}${sub ? `<small>${esc(sub)}</small>` : ""}</span></div>
    <div class="track"><span class="zero" style="left:${zero}%"></span><span class="bar ${tone}" style="left:${left}%;width:${w}%"${extra}></span></div>
    <div class="val ${tone}">${esc(typeof value === "number" && !Number.isInteger(value) ? one(value) : value)}</div>
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
// At most six gridlines whatever the scale.
const ticks = max => { const step = [10, 20, 50, 100, 200, 500].find(st => max / st <= 6) || 1000; const t = []; for (let g = 0; g <= max; g += step) t.push(g); return t; };
const c1sorted = byRound.slice().sort((a, b) => b.avg - a.avg);
const chart1 = `<div class="cols" style="--max:${c1max}">
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
    <div class="faces">${ps.map(r => `<span class="fw" data-tip="${esc(`${r.player.name}: ${r.ind}. Top ${signed(r.top_pick_pts || 0)}, midfield ${signed(r.midfield_pts || 0)}${r.best_finish_bonus ? `, best finish +${r.best_finish_bonus}` : ""}${r.weekly_bonus_pts ? `, weekly bonus +${r.weekly_bonus_pts}` : ""}`)}">${face(r.player, 30, v < 0 ? "#ff2d95" : v >= 20 ? "#00d9ff" : null)}</span>`).join("")}</div>
    <div class="sc">${ps.length}</div>
  </div>`;
}).join("");

/* chart 3: previous season low against this week, a dumbbell each */
const c3max = 60;
const dumbbell = (x, i, hidden) => {
  const l = (Math.min(x.now, x.prev) + 3) / (c3max + 3) * 100, r = (Math.max(x.now, x.prev) + 3) / (c3max + 3) * 100;
  return `<div class="row db${x.worst ? "" : " held"}${hidden ? " more" : ""}" style="--i:${i}" data-tip="${esc(`${x.player.name}: this week ${x.now}, previous low ${x.prev}${x.worst ? `, down ${x.drop}` : ", not a season low"}`)}">
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
const dowMax = Math.ceil(Math.max(...driverWeeks.map(w => w.top.tot)) / 100) * 100;
const chart4a = colChart(dowSorted.map((w, i) => ({
  v: w.top.tot, label: w.name, me: w.round === ROUND, on: i === 0 || w.round === ROUND, pic: head(w.top.driver, 26),
  tip: `${w.full}, round ${w.round}: ${w.top.driver}, ${w.top.tot} across the league, ${w.top.each} a pick for ${w.top.n} pickers`,
})), { max: dowMax });
const worstMax = Math.ceil(Math.max(...driverWeeks.map(w => -w.bottom.tot)) / 10) * 10;
const chart4b = colChart(worstSorted.map((w, i) => ({
  v: w.bottom.tot, label: w.name, me: w.round === ROUND, on: i === 0 || w.round === ROUND, pic: head(w.bottom.driver, 26),
  tip: `${w.full}, round ${w.round}: ${w.bottom.driver}, ${w.bottom.tot} across the league, ${w.bottom.each} a pick for ${w.bottom.n} pickers`,
})), { max: worstMax, down: true });

/* the pool, this week */
const c4per = pool.map((d, i) => barRow({
  label: d.driver.split(" ").pop(), sub: `${d.picks} pickers`, pic: head(d.driver, 34), value: d.total, max: 170, min: -40,
  tone: d.total < 0 ? "pink" : d.total === 0 ? "muted" : "blue", i,
  tip: `${d.driver}: ${signed(d.per)} a pick, picked by ${d.picks} of 48, ${signed(d.total)} across the league`,
})).join("");

/* chart 5: team scores this week */
const chart5 = teamWeek.map((t, i) => barRow({
  label: shortTeam(t.team.name), pic: logo(t.team, 28), value: t.v, max: 30, min: -6,
  tone: t.v < 0 ? "pink" : t.v >= 20 ? "blue" : "muted", i,
  tip: `${t.team.name}: ${t.v}. ${playerOf[t.team.player1_id]?.name} ${drv(week.find(s => s.player_id === t.team.player1_id) || {})}, ${playerOf[t.team.player2_id]?.name} ${drv(week.find(s => s.player_id === t.team.player2_id) || {})}, BOX BOX a push`,
})).join("");

/* chart 6: the weekly leader, every round */
const chart6 = byRound.map((b, i) => barRow({
  label: b.name, sub: `R${b.round} · ${surname(b.leader.name)}`, pic: face(b.leader, 28), value: b.max, max: 80,
  tone: b.round === ROUND ? "pink" : "blue", i,
  tip: `${b.full}: ${b.leader.name} led the week with ${b.max}`,
})).join("");

/* the matchups */
const matchupCards = matchups.map((m, i) => {
  const hw = m.hs > m.as;
  return `<div class="mu ${m.division === "championship" ? "ch" : "se"}" style="--i:${i}">
    <div class="side${hw ? " won" : ""}">${logo(m.home, 34)}<span class="tn">${esc(shortTeam(m.home.name))}</span><span class="seat">OVER</span></div>
    <div class="score"><span class="${m.hs < 0 ? "pink" : hw ? "blue" : ""}">${m.hs}</span><span class="v">v</span><span class="${m.as < 0 ? "pink" : !hw ? "blue" : ""}">${m.as}</span></div>
    <div class="side r${!hw ? " won" : ""}">${logo(m.away, 34)}<span class="tn">${esc(shortTeam(m.away.name))}</span><span class="seat">UNDER</span></div>
  </div>`;
}).join("");

/* the table view */
const table = `<table><thead><tr><th>#</th><th>Player</th><th>Total</th><th>Top</th><th>Mid</th><th>Order</th><th>Best</th><th>Needle</th><th>Bonus</th><th>Prev low</th></tr></thead><tbody>${
  week.map((r, i) => { const p = personal.find(x => x.player.id === r.player_id); return `<tr><td>${i + 1}</td><td>${esc(r.player.name)}</td><td class="${r.ind < 0 ? "pink" : ""}"><b>${r.ind}</b></td><td>${r.top_pick_pts || 0}</td><td>${r.midfield_pts || 0}</td><td>${r.order_bonus || 0}</td><td>${r.best_finish_bonus || 0}</td><td>${r.pit_individual_pts || 0}</td><td>${r.weekly_bonus_pts || 0}</td><td>${p ? p.prev : ""}</td></tr>`; }).join("")
}</tbody></table>`;

const roundTable = `<table><thead><tr><th>R</th><th>Race</th><th>Avg</th><th>Median</th><th>High</th><th>Low</th><th>Drivers only</th><th>Team avg</th></tr></thead><tbody>${
  byRound.map(b => `<tr class="${b.round === ROUND ? "hl" : ""}"><td>${b.round}</td><td>${esc(b.full)}</td><td>${one(b.avg)}</td><td>${b.med}</td><td>${b.max}</td><td>${b.min}</td><td>${one(b.drvAvg)}</td><td>${one(b.teamAvg)}</td></tr>`).join("")
}</tbody></table>`;

/* ---------------------------------------------------------------- the page */

const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>The Azerbaijan GP in Numbers</title>
<meta name="description" content="Round 15, the Azerbaijan Grand Prix: the lowest-scoring week in Formula 5 history, in numbers.">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Encode+Sans+Semi+Condensed:wght@400;600;700&family=Chakra+Petch:wght@600;700&display=swap" rel="stylesheet">
<style>
:root{--bg:#07070c;--bg2:#0e0e17;--bg3:#151521;--bg4:#1d1d2b;--blue:#00d9ff;--pink:#ff2d95;--text:#f2f2f7;--text2:#a8a8c0;--text3:#8a8aa6;--border:rgba(255,255,255,.09);--border2:rgba(255,255,255,.16);--fd:'Encode Sans Semi Condensed',system-ui,sans-serif;--fn:'Chakra Petch',monospace}
*{margin:0;padding:0;box-sizing:border-box}
html{background:var(--bg)}
body{font-family:var(--fd);background:var(--bg);color:var(--text);padding:16px 16px 60px;max-width:660px;margin:0 auto;font-size:15px;line-height:1.5;-webkit-font-smoothing:antialiased}
a{color:var(--blue)}
.kicker{font-family:var(--fn);font-weight:700;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--blue)}
h1{font-family:var(--fn);font-weight:700;font-size:clamp(26px,7.4vw,40px);line-height:1;letter-spacing:.02em;text-transform:uppercase;margin:8px 0 6px;color:var(--pink);text-shadow:0 0 6px rgba(255,45,149,.55),0 0 22px rgba(255,45,149,.35)}
.stand{font-size:17px;color:var(--text2);max-width:520px}
.stand b{color:var(--text)}
.hero{margin:8px 0 24px}
.tiles{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:18px 0 0}
.tile{background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:14px 14px 12px}
.tile .n{font-family:var(--fn);font-weight:700;font-size:38px;line-height:1;color:var(--pink);text-shadow:0 0 10px rgba(255,45,149,.45)}
.tile .n.blue{color:var(--blue);text-shadow:0 0 10px rgba(0,217,255,.45)}
.tile .c{font-size:13px;color:var(--text2);margin-top:8px;line-height:1.35}
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
.legend i.blue{background:var(--blue)}.legend i.pink{background:var(--pink)}.legend i.muted{background:var(--text3)}
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
@media (max-width:420px){.row{grid-template-columns:122px 1fr 42px;gap:6px}.row.db{grid-template-columns:110px 1fr 74px}.lt{font-size:13px}.tile .n{font-size:32px}.val{font-size:15px}}
@media (prefers-reduced-motion:reduce){*{animation-duration:.01ms!important;animation-delay:0ms!important;transition-duration:.01ms!important}}
</style></head>
<body>
<div id="tip" role="status" aria-live="polite"></div>

<header class="hero">
  <div class="kicker">Round ${ROUND} · ${esc(race.race_name)}</div>
  <h1>The Azerbaijan GP in Numbers</h1>
  <p class="stand">The lowest scoring week in league history, the Azerbaijan GP stands as an outlier in this F5 season. Scores were low across the board, including the first ever negative scores, achieved by ${W[negatives.length]} people. And the team matchups were just as strange: one team won their matchup by scoring exactly one point.</p>
  <div class="lead">
    <div class="ch"><span class="num">1</span><div><h2>The Azerbaijan GP led to the lowest F5 scores of the season by every measure, and by a wide margin.</h2><p>Every F5 week has an average score, and for fourteen rounds it sat between ${one(prevLowAvg.avg)} and ${one(Math.max(...byRound.map(b => b.avg)))}. Then Baku came in at ${one(thisRound.avg)}, including a median of ${thisRound.med}, less than a third of the previous low. And the buttons show it was not the missing pit stop: take the Needle and the weekly bonus out and the gap is the same.</p></div></div>
    <div class="acts" role="group" aria-label="Chart 1 view">
      <button class="act" aria-pressed="true" data-k="ind">Individual</button>
      <button class="act" aria-pressed="false" data-k="drv">Drivers only</button>
      <button class="act" aria-pressed="false" data-k="team">Team score</button>
    </div>
    <div id="c1" data-max-ind="${c1maxOf.ind}" data-max-drv="${c1maxOf.drv}" data-max-team="${c1maxOf.team}">${chart1}</div>
    <p class="note">The other fourteen weeks run from <b>${one(prevLowAvg.avg)}</b> to <b>${one(Math.max(...byRound.map(b => b.avg)))}</b>. Take the Needle out and this week is <b>${one(thisRound.drvAvg)}</b> against a previous low of <b>${one(Math.min(...byRound.filter(b => b.round !== ROUND).map(b => b.drvAvg)))}</b>. The missing pit stop cost a few points a head. The pool cost the rest.</p>
  </div>
  <div class="tiles">
    <div class="tile"><div class="n">${one(thisRound.avg)}</div><div class="c">Average score. The previous low was <b>${one(prevLowAvg.avg)}</b>, ${esc(prevLowAvg.name)}.</div></div>
    <div class="tile"><div class="n">${negatives.length}</div><div class="c">Negative scores. <b>The first ever.</b> Nobody had scored below zero before Saturday.</div></div>
    <div class="tile"><div class="n">${worstCount}<span style="font-size:20px;color:var(--text2)">/48</span></div><div class="c">Players who had their <b>worst week of the season</b>.</div></div>
    <div class="tile"><div class="n">${thisRound.max}</div><div class="c">The winning score, ${esc(thisRound.leader.name)}. <b>Lowest ever.</b> Every other week's leader scored ${prevLowHigh} or more.</div></div>
  </div>
</header>

<section>
  <div class="card">
    <div class="ch"><span class="num">2</span><div><h2>${week.filter(r => r.ind === 4).length} players finished on exactly 4 points, ${negatives.length} finished below zero, and the top score was ${thisRound.max}.</h2><p>An F5 score is five drivers, a finishing-order bonus, a best-finish guess, the Needle and a weekly bonus for the top ten, and this week the drivers did almost all of the work. Most of that work was negative, including ${W[negatives.length]} people on minus three from Norris up top and two midfielders who finished out of the points. And the top of the field was thin: only ${W[week.filter(r => r.ind >= 20).length]} players reached twenty, and each face here sits on its own number.</p></div></div>
    <div id="c2">${chart2}</div>
    <p class="note"><b>${week.filter(r => r.ind === 4).length} players scored exactly 4</b>: Norris on top for &minus;1 and one scoring midfielder for 5. <b>${negatives.length} scored &minus;3</b>: Norris on top and two of the negative midfielders. Before this week the lowest score in league history was <b>${prevLowScore}</b>. ${thisRound.under10} of 48 came in under it.</p>
  </div>
</section>

<section>
  <div class="card">
    <div class="ch"><span class="num">3</span><div><h2>${worstCount} of 48 players had the worst week of their season.</h2><p>Every player carries a worst week, and before Baku the lowest of anyone's was ${prevLowScore}. This week ${worstCount} of 48 set a new one, including ${esc(personal[0].player.name)}, whose floor fell from ${personal[0].prev} to ${personal[0].now}. And the five who kept their old floor were the five at the top of the week: their previous worst was simply lower than the score that won this one. Blue is where the floor was, pink is where it is now.</p></div></div>
    <div class="acts"><button class="act" id="c3more" aria-pressed="false">All 48</button></div>
    <div class="legend"><span><i class="blue"></i>Previous low</span><span><i class="pink"></i>This week, a new low</span></div>
    <div id="c3">${chart3}</div>
    <p class="note">${worstCount} of 48 set a new season low. The five who did not are the five who finished on top: ${personal.filter(x => !x.worst).map(x => esc(surname(x.player.name))).join(", ")}. ${esc(personal[0].player.name)} fell furthest, ${personal[0].prev} to ${personal[0].now}.</p>
  </div>
</section>

<section>
  <div class="card">
    <div class="ch"><span class="num">4</span><div><h2>${esc(surname(dowThis.top.driver))} was F5 driver of the week with ${dowThis.top.tot} points, the lowest winning total of the season and less than half the previous low.</h2><p>Every driver in the pool earns each of his pickers the same points, and adding those up across all 48 hands gives his league total for the week, which is how the driver of the week is named. Fourteen rounds in, the driver of the week had never scored the league fewer than ${dowPrevLow}, including ${driverWeeks.filter(w => w.top.tot >= 850).length} weeks over 850. And Lindblad's ${dowThis.top.tot} came off ${dowThis.top.n} pickers at ${dowThis.top.each} points each: the best driver in the pool finished seventh.</p></div></div>
    <div class="sub">Driver of the week, every week</div>
    ${chart4a}
    <div class="sub" style="margin-top:18px">The worst driver of the week, every week</div>
    <p class="note" style="margin:0 0 6px">${esc(surname(dowThis.bottom.driver))}'s ${dowThis.bottom.tot} was not the worst a driver has done. ${esc(surname(worstEver.bottom.driver))} cost the league ${worstEver.bottom.tot} in ${esc(worstEver.name)}, and Gasly himself did ${driverWeeks.find(w => w.round === 4).bottom.tot} in Miami. And the mechanism is the same every time: a driver who finishes outside the points costs a point to everybody holding him, so the damage is the size of his following.</p>
    ${chart4b}
    <div class="sub" style="margin-top:18px">This week's pool, across the league</div>
    <div class="legend"><span><i class="blue"></i>Scored</span><span><i class="muted"></i>Nothing</span><span><i class="pink"></i>Cost a point</span></div>
    <div id="c4">${c4per}</div>
  </div>
</section>

<section>
  <div class="card">
    <div class="ch"><span class="num">5</span><div><h2>No team scored more than ${Math.max(...teamWeek.map(t => t.v))}, and ${esc(teamWeek[0].team.name)} became the first to finish a week below zero.</h2><p>A team's score is both players' driver points plus BOX BOX, and with BOX BOX a push for everyone this week the whole league ran on drivers alone. No team reached ${Math.max(...teamWeek.map(t => t.v)) + 1}, including ${W[teamWeek.filter(t => t.v < 10).length]} of the 24 that finished under ten. And ${esc(teamWeek[0].team.name)} finished on ${teamWeek[0].v}: the first team ever to end a week below zero.</p></div></div>
    <div class="legend"><span><i class="blue"></i>20 or more</span><span><i class="muted"></i>Under 20</span><span><i class="pink"></i>Below zero</span></div>
    <div id="c5">${chart5}</div>
    <p class="note">Average <b>${one(thisRound.teamAvg)}</b>, previous low <b>${one(prevLowTeamAvg)}</b>. <b>Garra Dynamics on ${teamWeek[0].v}</b> is the first negative team score. The ${lowTeamAllThisWeek} lowest team scores in league history all happened on Saturday; before this week the floor was ${prevLowTeam}.</p>
  </div>
</section>

<section>
  <div class="card">
    <div class="ch"><span class="num">6</span><div><h2>${esc(thisRound.leader.name)} won the week with ${thisRound.max}, the lowest winning score the league has seen.</h2><p>Somebody wins every F5 week, and through fourteen rounds the winning score had never been under ${prevLowHigh}. ${esc(thisRound.leader.name)} won this one with ${thisRound.max}, including a best-finish bonus that only two people collected. And the drop is bigger than it looks: ${W[byRound.filter(b => b.max >= 60).length]} of the season's weekly winners scored 60 or more.</p></div></div>
    <div id="c6">${chart6}</div>
    <p class="note">${esc(thisRound.leader.name)} won the week with <b>${thisRound.max}</b>. Every other round's leader scored ${prevLowHigh} or more, and ${byRound.filter(b => b.max >= 60).length} of them scored 60 or more.</p>
  </div>
</section>

<section>
  <div class="card">
    <div class="ch"><span class="num">7</span><div><h2>The twenty lowest scores in league history all happened in Baku.</h2><p>League history is ${rounds.length} rounds and ${rows.length} scores, and the twenty lowest are now all from one afternoon. ${W[negatives.length][0].toUpperCase() + W[negatives.length].slice(1)} of them are the minus threes, including both Kohlis. And the old record low no longer makes the list: ${prevLowScore} would have been the ${thisRound.under10 + 1}th-lowest score of the week.</p></div></div>
    <div class="wall">${lowestEver.map(r => `<div class="w" data-tip="${esc(`${r.player.name}, round ${r.round}: ${r.ind}`)}">${face(r.player, 40, r.ind < 0 ? "#ff2d95" : null)}<b>${signed(r.ind)}</b>${esc(surname(r.player.name))}</div>`).join("")}</div>
  </div>
</section>

<section>
  <div class="divh">The matchups</div>
  <h2 style="font-size:20px;line-height:1.2;margin-bottom:4px">Twelve matchups, no draws, and nothing closer than ${matchups[0].margin} points.</h2>
  <p class="note" style="margin:0 0 10px">Twelve matchups ran on Saturday, and with BOX BOX a push every one of them came down to driver points alone. Nothing was drawn, including the closest, which finished ${matchups[0].hs} to ${matchups[0].as}. And Prestissimo Veloce won theirs by scoring exactly one point: Garra Dynamics scored ${W[6]} fewer than nothing. Closest first.</p>
  ${matchupCards}
</section>

<section>
  <div class="card">
    <div class="ch"><span class="num">8</span><div><h2>Every score this week, and every round's averages.</h2><p>Everything above comes from two tables, and both are here. The first is every player's score this week broken into its parts, including the previous season low beside it. And the second is every round's averages: the season the charts were drawn from.</p></div></div>
    <details open><summary>This week, all 48</summary><div class="tw">${table}</div></details>
    <details><summary>Every round</summary><div class="tw">${roundTable}</div></details>
  </div>
</section>

<p class="foot">Individual score is drivers plus order bonus, best finish, the Needle and the weekly bonus. Team score is both players' driver points plus BOX BOX. Built from the scores table on ${new Date().toISOString().slice(0, 10)} by scripts/recap/round15.mjs.</p>

<script>
(function(){
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
  // Chart 3: fifteen biggest drops, or everyone.
  var m=document.getElementById('c3more');
  m.addEventListener('click',function(){var on=m.getAttribute('aria-pressed')!=='true';m.setAttribute('aria-pressed',on?'true':'false');
    document.getElementById('c3').classList.toggle('show-all',on);m.textContent=on?'Biggest drops':'All 48';});
})();
</script>
</body></html>`;

fs.writeFileSync("public/recaps/round15.html", html);
console.log(`wrote public/recaps/round15.html (${(html.length / 1024).toFixed(0)}KB)`);
console.log(`avg ${one(thisRound.avg)} prev ${one(prevLowAvg.avg)} (${prevLowAvg.name}); negatives ${negatives.length}; worst ${worstCount}/48; high ${thisRound.max} prev ${prevLowHigh}; team avg ${one(thisRound.teamAvg)} prev ${one(prevLowTeamAvg)}; low team ever prev ${prevLowTeam}, this week holds the ${lowTeamAllThisWeek} lowest`);
