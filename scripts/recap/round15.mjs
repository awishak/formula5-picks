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

/* chart 1: average score by round, three ways */
const c1max = Math.ceil(Math.max(...byRound.map(b => Math.max(b.avg, b.drvAvg, b.teamAvg))) / 10) * 10;
const chart1 = byRound.map((b, i) => barRow({
  label: b.name, sub: `R${b.round}`, value: b.avg, max: c1max,
  tone: b.round === ROUND ? "pink" : "blue", i,
  tip: `${b.full}: average ${one(b.avg)}, median ${b.med}, high ${b.max}, low ${b.min}`,
  extra: ` data-ind="${b.avg}" data-drv="${b.drvAvg}" data-team="${b.teamAvg}"`,
})).join("");

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

/* chart 4: the pool */
const c4per = pool.map((d, i) => barRow({
  label: d.driver.split(" ").pop(), sub: d.top ? "top pool" : "midfield", pic: head(d.driver, 34), value: d.per, max: 12, min: -1,
  tone: d.per < 0 ? "pink" : d.per === 0 ? "muted" : "blue", i,
  tip: `${d.driver}: ${signed(d.per)} a pick, picked by ${d.picks} of 48, ${signed(d.total)} across the league`,
  extra: ` data-per="${d.per}" data-total="${d.total}"`,
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
<title>Round 15: the floor</title>
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
h1{font-family:var(--fn);font-weight:700;font-size:clamp(34px,9vw,52px);line-height:1;letter-spacing:.02em;text-transform:uppercase;margin:8px 0 6px;color:var(--pink);text-shadow:0 0 6px rgba(255,45,149,.55),0 0 22px rgba(255,45,149,.35)}
.stand{font-size:17px;color:var(--text2);max-width:520px}
.stand b{color:var(--text)}
.hero{margin:8px 0 24px}
.tiles{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:18px 0 0}
.tile{background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:14px 14px 12px}
.tile .n{font-family:var(--fn);font-weight:700;font-size:38px;line-height:1;color:var(--pink);text-shadow:0 0 10px rgba(255,45,149,.45)}
.tile .n.blue{color:var(--blue);text-shadow:0 0 10px rgba(0,217,255,.45)}
.tile .c{font-size:13px;color:var(--text2);margin-top:6px;line-height:1.35}
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
.act{font-family:var(--fd);font-weight:700;font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:var(--text2);background:var(--bg3);border:1px solid var(--border2);border-radius:999px;padding:9px 14px;min-height:36px;cursor:pointer}
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
  <h1>The floor</h1>
  <p class="stand">The lowest-scoring week in Formula 5 history, by every number the league keeps. <b>Aston Martin never pitted</b>, so the Needle paid nobody and BOX BOX was a push in all twelve matchups. That is not the story. The pool was.</p>
  <div class="tiles">
    <div class="tile"><div class="n">${one(thisRound.avg)}</div><div class="c">Average score. The previous low was <b>${one(prevLowAvg.avg)}</b>, ${esc(prevLowAvg.name)}.</div></div>
    <div class="tile"><div class="n">${negatives.length}</div><div class="c">Negative scores. <b>The first ever.</b> Nobody had scored below zero before Saturday.</div></div>
    <div class="tile"><div class="n">${worstCount}<span style="font-size:20px;color:var(--text2)">/48</span></div><div class="c">Players who had their <b>worst week of the season</b>.</div></div>
    <div class="tile"><div class="n blue">${thisRound.max}</div><div class="c">The winning score, ${esc(thisRound.leader.name)}. <b>Lowest ever.</b> Every other week's leader scored ${prevLowHigh} or more.</div></div>
  </div>
</header>

<section>
  <div class="card">
    <div class="ch"><span class="num">1</span><div><h2>Average score, every round</h2><p>All fifteen scored rounds. Press a button to take the Needle and the weekly bonus out, or to see the team game.</p></div></div>
    <div class="acts" role="group" aria-label="Chart 1 view">
      <button class="act" aria-pressed="true" data-k="ind">Individual</button>
      <button class="act" aria-pressed="false" data-k="drv">Drivers only</button>
      <button class="act" aria-pressed="false" data-k="team">Team score</button>
    </div>
    <div class="legend"><span><i class="blue"></i>Other rounds</span><span><i class="pink"></i>This week</span></div>
    <div id="c1" data-max="${c1max}">${chart1}</div>
    <p class="note">Take the Needle out and this week is <b>${one(thisRound.drvAvg)}</b> against a previous low of <b>${one(Math.min(...byRound.filter(b => b.round !== ROUND).map(b => b.drvAvg)))}</b>. The missing pit stop cost a few points a head. The pool cost the rest.</p>
  </div>
</section>

<section>
  <div class="card">
    <div class="ch"><span class="num">2</span><div><h2>Where all 48 landed</h2><p>Every score this week, each player on their number. Hover or tap a face for the breakdown.</p></div></div>
    <div id="c2">${chart2}</div>
    <p class="note"><b>${week.filter(r => r.ind === 4).length} players scored exactly 4</b>: Norris on top for &minus;1 and one scoring midfielder for 5. <b>${negatives.length} scored &minus;3</b>: Norris on top and two of the negative midfielders. Before this week the lowest score in league history was <b>${prevLowScore}</b>. ${thisRound.under10} of 48 came in under it.</p>
  </div>
</section>

<section>
  <div class="card">
    <div class="ch"><span class="num">3</span><div><h2>Season low, before and after</h2><p>Each player's previous worst week against this one. Blue is where the floor was. Pink is where it is now.</p></div></div>
    <div class="acts"><button class="act" id="c3more" aria-pressed="false">All 48</button></div>
    <div class="legend"><span><i class="blue"></i>Previous low</span><span><i class="pink"></i>This week, a new low</span></div>
    <div id="c3">${chart3}</div>
    <p class="note">${worstCount} of 48 set a new season low. The five who did not are the five who finished on top: ${personal.filter(x => !x.worst).map(x => esc(surname(x.player.name))).join(", ")}. ${esc(personal[0].player.name)} fell furthest, ${personal[0].prev} to ${personal[0].now}.</p>
  </div>
</section>

<section>
  <div class="card">
    <div class="ch"><span class="num">4</span><div><h2>The pool</h2><p>What each driver on offer was worth, and how many hands he was in. The podium was not on the menu.</p></div></div>
    <div class="pod">${podium.map((d, i) => `<div class="p">${head(d, 44)}<span class="pos">P${i + 1}</span><b>${esc(d)}</b><span class="no">not in the pool</span></div>`).join("")}</div>
    <div class="acts" role="group" aria-label="Chart 4 view">
      <button class="act" aria-pressed="true" data-k="per">A pick</button>
      <button class="act" aria-pressed="false" data-k="total">Whole league</button>
    </div>
    <div class="legend"><span><i class="blue"></i>Scored</span><span><i class="muted"></i>Nothing</span><span><i class="pink"></i>Cost a point</span></div>
    <div id="c4">${c4per}</div>
    <p class="note">Three of ten drivers scored. <b>Piastri and Lawson</b>, in ${pool.find(d => d.driver === "Oscar Piastri")?.picks} and ${pool.find(d => d.driver === "Liam Lawson")?.picks} hands, returned nothing. <b>Gasly</b> was on ${pool.find(d => d.driver === "Pierre Gasly")?.picks} of 48 and cost every one of them. <b>Norris</b> was the top pick for ${pool.find(d => d.driver === "Lando Norris")?.picks} people.</p>
  </div>
</section>

<section>
  <div class="card">
    <div class="ch"><span class="num">5</span><div><h2>Team scores this week</h2><p>Both players' driver points, and BOX BOX, which was a push for everyone.</p></div></div>
    <div class="legend"><span><i class="blue"></i>20 or more</span><span><i class="muted"></i>Under 20</span><span><i class="pink"></i>Below zero</span></div>
    <div id="c5">${chart5}</div>
    <p class="note">Average <b>${one(thisRound.teamAvg)}</b>, previous low <b>${one(prevLowTeamAvg)}</b>. <b>Garra Dynamics on ${teamWeek[0].v}</b> is the first negative team score. The ${lowTeamAllThisWeek} lowest team scores in league history all happened on Saturday; before this week the floor was ${prevLowTeam}.</p>
  </div>
</section>

<section>
  <div class="card">
    <div class="ch"><span class="num">6</span><div><h2>The weekly leader, every round</h2><p>The high score each week and who posted it.</p></div></div>
    <div id="c6">${chart6}</div>
    <p class="note">${esc(thisRound.leader.name)} won the week with <b>${thisRound.max}</b>. Every other round's leader scored ${prevLowHigh} or more, and ${byRound.filter(b => b.max >= 60).length} of them scored 60 or more.</p>
  </div>
</section>

<section>
  <div class="card">
    <div class="ch"><span class="num">7</span><div><h2>The twenty lowest scores ever</h2><p>All twenty are from this week.</p></div></div>
    <div class="wall">${lowestEver.map(r => `<div class="w" data-tip="${esc(`${r.player.name}, round ${r.round}: ${r.ind}`)}">${face(r.player, 40, r.ind < 0 ? "#ff2d95" : null)}<b>${signed(r.ind)}</b>${esc(surname(r.player.name))}</div>`).join("")}</div>
  </div>
</section>

<section>
  <div class="divh">The matchups</div>
  <p class="note" style="margin:0 0 10px">Sorted closest first. No draws, nothing inside four points. BOX BOX a push in all twelve.</p>
  ${matchupCards}
</section>

<section>
  <div class="card">
    <div class="ch"><span class="num">8</span><div><h2>The numbers</h2><p>Every score this week, and every round's averages.</p></div></div>
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
    var k=b.getAttribute('data-k');var max=+c1.getAttribute('data-max');
    b.parentNode.querySelectorAll('.act').forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false');});
    c1.querySelectorAll('.row').forEach(function(r){var bar=r.querySelector('.bar');var v=+bar.getAttribute('data-'+k);
      bar.style.width=(v/max*100)+'%';r.querySelector('.val').textContent=(Math.round(v*10)/10).toFixed(1);});
  });});
  // Chart 4: a pick, or the whole league.
  var c4=document.getElementById('c4');
  c4.parentNode.querySelectorAll('.act[data-k]').forEach(function(b){b.addEventListener('click',function(){
    var k=b.getAttribute('data-k');var min=k==='per'?-1:-40,max=k==='per'?12:168,span=max-min,zero=(0-min)/span*100;
    b.parentNode.querySelectorAll('.act').forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false');});
    c4.querySelectorAll('.row').forEach(function(r){var bar=r.querySelector('.bar');var v=+bar.getAttribute('data-'+k);var w=Math.abs(v)/span*100;
      bar.style.left=(v>=0?zero:zero-w)+'%';bar.style.width=w+'%';r.querySelector('.zero').style.left=zero+'%';r.querySelector('.val').textContent=(v>0?'+':'')+v;});
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
