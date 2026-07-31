// Chart 1 and 2: the recap seen from one team's seat.
//
// For every team we need three things going into round 11:
//   what was still mathematically available, what actually happened, and
//   whether that got them there. The first one is the only hard part.
//
// Round 11 pays each division 25-18-15-12-10-8 to that week's six winners in
// score order and 6-4-2-1-0-0 to the six losers, so a team's award is bounded
// by whether it won, and everything inside that band is free. That makes the
// space small enough to enumerate exactly: 32 win/loss configurations for the
// five matchups that are not ours, times the six awards we could take.
import { readFileSync, writeFileSync } from "node:fs";
import { standingsThrough, D } from "./standings.mjs";

const SP = new URL("./", import.meta.url);
const out = JSON.parse(readFileSync(new URL("chart-data.json", SP), "utf8"));

const WIN_POOL = [25, 18, 15, 12, 10, 8];
const LOSE_POOL = [6, 4, 2, 1, 0, 0];
const r11 = D.races.find(r => r.round === 11);

const b10 = standingsThrough(10);
const fin = standingsThrough(11);
const teamById = Object.fromEntries(D.teams.map(t => [t.id, t]));
const photos = Object.fromEntries(D.players.map(p => [p.name, p.photo_url || null]));
const sm = {}; D.scores.forEach(s => sm[s.player_id + "_" + s.race_id] = s);
const base = s => s ? (s.top_pick_pts||0)+(s.midfield_pts||0)+(s.order_bonus||0)+(s.best_finish_bonus||0) : 0;

// Zones. Stated in the recap's own words: top four in the Second Division go up,
// bottom four in the Championship Division go down, and the fifth/eighth seat
// changes hands on scoring average.
const AUTO_UP = 4, AUTO_DOWN_FROM = 9, SWAP_UP_POS = 5, SWAP_DOWN_POS = 8;

const UP = ["Meatballs","HomeworkTubes.Com","TNT Roku F5 Team","Cal Aggie Racing","Peloton Aubergine"];
const DOWN = ["El Camino Rapido","Stalloni 1851","Bronco SCUderia","Wildcat Motors","Garra Dynamics"];
const SWAP_UP = "Peloton Aubergine", SWAP_DOWN = "Garra Dynamics";

/* ---------------------------------------------------------------- solver */

// Pair awards with teams so that as FEW as possible (dir=-1) or as MANY as
// possible (dir=+1) end up above `thr`. Biggest award to the team furthest from
// the threshold minimises crossings; to the nearest team maximises them.
function pairAwards(teams, awards, dir) {
  const ts = [...teams].sort((a, b) => dir < 0 ? a.pts - b.pts : b.pts - a.pts);
  const as = [...awards].sort((a, b) => b - a);
  return ts.map((t, i) => t.pts + as[i]);
}

// Best (dir=-1) or worst (dir=+1) final position for `me`, given whether we won.
function reach(divTeams, matchups, me, iWon, dir) {
  const myMatch = matchups.find(m => m.a === me.id || m.b === me.id);
  const oppId = myMatch.a === me.id ? myMatch.b : myMatch.a;
  const rest = matchups.filter(m => m !== myMatch);
  const pts = Object.fromEntries(divTeams.map(t => [t.id, t.pts]));
  const myPool = iWon ? WIN_POOL : LOSE_POOL;
  let bestPos = dir < 0 ? 99 : -1;

  for (let mask = 0; mask < (1 << rest.length); mask++) {
    const winners = [oppId].filter(() => !iWon);   // if I lost, my opponent won
    const losers = [oppId].filter(() => iWon);
    rest.forEach((m, i) => {
      const aWins = (mask >> i) & 1;
      winners.push(aWins ? m.a : m.b);
      losers.push(aWins ? m.b : m.a);
    });

    for (const mine of new Set(myPool)) {
      const myFinal = pts[me.id] + mine;
      // remove one copy of my award from the pool I drew it from
      const wp = [...WIN_POOL], lp = [...LOSE_POOL];
      (iWon ? wp : lp).splice((iWon ? wp : lp).indexOf(mine), 1);

      const wTeams = winners.map(id => ({ id, pts: pts[id] }));
      const lTeams = losers.map(id => ({ id, pts: pts[id] }));
      const finals = [...pairAwards(wTeams, wp, dir), ...pairAwards(lTeams, lp, dir)];

      // dir<0 wants me high: ties break my way. dir>0 wants me low: ties break against.
      const above = finals.filter(v => dir < 0 ? v > myFinal : v >= myFinal).length;
      const pos = above + 1;
      if (dir < 0 ? pos < bestPos : pos > bestPos) bestPos = pos;
    }
  }
  return bestPos;
}

/* ------------------------------------------------------- stake per team */

function stakeFor(divKey, t) {
  const divTeams = b10[divKey].map(x => ({ id: x.id, name: x.name, pts: x.pts }));
  const ids = new Set(divTeams.map(d => d.id));
  const matchups = D.schedule.filter(s => s.race_id === r11.id && ids.has(s.home_team_id))
    .map(s => ({ a: s.home_team_id, b: s.away_team_id }));
  const me = divTeams.find(d => d.id === t.id);
  const champ = divKey === "champ";

  const r = {
    bestWin:  reach(divTeams, matchups, me, true,  -1),
    worstWin: reach(divTeams, matchups, me, true,  +1),
    bestLose: reach(divTeams, matchups, me, false, -1),
    worstLose:reach(divTeams, matchups, me, false, +1),
  };
  const best = Math.min(r.bestWin, r.bestLose), worst = Math.max(r.worstWin, r.worstLose);

  // The zone this team is actually playing for, and whether it is settled.
  // Championship teams are avoiding the drop (or chasing the title from the top);
  // Second Division teams are chasing promotion.
  const goalPos = champ ? SWAP_DOWN_POS - 1 : AUTO_UP;   // champ: stay 7th or better; second: top four
  const edgePos = champ ? SWAP_DOWN_POS : SWAP_UP_POS;   // the seat decided on average

  const opp = oppName(t);
  let state, need, sub = null;

  // The title outranks everything else. A team sitting in a locked-safe seat
  // with first place still reachable is not "safe from relegation", it is
  // playing for the division, and that is the sentence they should get.
  if (worst === 1) {
    state = "titlewon";
    need = "had the division won already";
  } else if (best === 1) {
    state = "title";
    need = "were playing for the division title";
    sub = champ ? "already safe" : "already up";
  } else if (worst <= goalPos) {
    state = "locked";
    need = champ ? "were already safe" : "were already up";
  } else if (best > edgePos) {
    state = "gone";
    need = champ ? "were already down" : "could no longer go up";
  } else if (r.bestLose > edgePos) {
    state = "mustwin";
    need = champ ? `had to beat ${opp} to stay up` : `had to beat ${opp} to go up`;
  } else if (r.worstWin <= goalPos) {
    state = "winisenough";
    need = `just had to beat ${opp}`;
  } else {
    state = "winandhelp";
    need = "needed a win, and needed help elsewhere";
    // A Second Division team in this state is chasing promotion, not survival,
    // so the two divisions cannot share the sentence.
    sub = champ ? `even losing to ${opp}, they could have stayed up`
                : `even losing to ${opp}, they could have gone up`;
  }
  return { ...r, best, worst, state, need, sub, goalPos, edgePos };
}

function oppName(t) {
  const w = fin.all.find(x => x.id === t.id).weekly.find(x => x.round === 11);
  return w?.oppName || "their opponent";
}

/* ------------------------------------------------------------ assemble */

const posIn = (rows, id) => rows.findIndex(x => x.id === id) + 1;

const teams = [];
["champ", "second"].forEach(divKey => {
  b10[divKey].forEach(bt => {
    const t = fin.all.find(x => x.id === bt.id);
    const raw = teamById[t.id];
    const w = t.weekly.find(x => x.round === 11);
    const opp = fin.all.find(x => x.id === w.oppId);
    const s = (pid) => base(sm[pid + "_" + r11.id]);
    const stake = stakeFor(divKey, t);

    const posBefore = posIn(b10[divKey], t.id);
    const posAfter = posIn(fin[divKey], t.id);

    // Outcome is the real promotion/relegation result, not the league position.
    // Peloton finished fifth and went up anyway through the swap seat, and Garra
    // finished eighth and went down through it, so position alone lies about both.
    const stakeState = stake.state;
    const got = stakeState === "title" || stakeState === "titlewon"
      ? posAfter === 1
      : divKey === "champ" ? !DOWN.includes(t.name) : UP.includes(t.name);

    teams.push({
      id: t.id, name: t.name, div: divKey, logo: raw.logo_url || null,
      p1: raw.player1_name, p2: raw.player2_name,
      photo1: photos[raw.player1_name] || null, photo2: photos[raw.player2_name] || null,
      posBefore, ptsBefore: bt.pts, posAfter, ptsAfter: t.pts, earned: w.earned ?? 0,
      opp: opp.name, oppLogo: teamById[opp.id].logo_url || null,
      oppP1: teamById[opp.id].player1_name, oppP2: teamById[opp.id].player2_name,
      score: w.matchupScore, oppScore: w.oppScore, won: w.won, bb: w.bb,
      s1: s(raw.player1_id), s2: s(raw.player2_id),
      o1: s(teamById[opp.id].player1_id), o2: s(teamById[opp.id].player2_id),
      oppBb: opp.weekly.find(x => x.round === 11)?.bb ?? 0,
      stake, got, viaSwap: t.name === SWAP_UP || t.name === SWAP_DOWN,
      moved: divKey === "champ" ? (DOWN.includes(t.name) ? "down" : "stay")
                                : (UP.includes(t.name) ? "up" : "stay"),
    });
  });
});

// Standings either side of round 11, for chart 2.
const table = (rows, before) => rows.map((t, i) => ({
  id: t.id, name: t.name, pos: i + 1, pts: t.pts,
  earned: before ? null : (fin.all.find(x => x.id === t.id).weekly.find(x => x.round === 11)?.earned ?? 0),
}));

out.cYou = {
  teams,
  players: D.players.map(p => {
    const t = D.teams.find(x => x.player1_id === p.id || x.player2_id === p.id);
    return { name: p.name, photo: p.photo_url || null, teamId: t?.id ?? null };
  }).filter(p => p.teamId).sort((a, b) => a.name.localeCompare(b.name)),
  standings: {
    champ:  { before: table(b10.champ, true),  after: table(fin.champ, false) },
    second: { before: table(b10.second, true), after: table(fin.second, false) },
  },
  zones: { autoUp: AUTO_UP, swapUp: SWAP_UP_POS, swapDown: SWAP_DOWN_POS, autoDownFrom: AUTO_DOWN_FROM },
};

writeFileSync(new URL("chart-data.json", SP), JSON.stringify(out));

console.log("cYou written:", teams.length, "teams,", out.cYou.players.length, "players");
const tally = {};
teams.forEach(t => tally[t.stake.state] = (tally[t.stake.state] || 0) + 1);
console.log("  states:", Object.entries(tally).map(([k, v]) => `${k} ${v}`).join(", "));
console.log("\n  team                          div  pos  window   stake");
teams.forEach(t => console.log(
  `  ${t.name.padEnd(29)} ${t.div === "champ" ? "C" : "2"}   ${String(t.posBefore).padStart(2)}   ` +
  `${String(t.stake.best).padStart(2)}-${String(t.stake.worst).padEnd(2)}   ` +
  `${t.stake.need}${t.stake.titleLive ? "  [title live]" : ""}`));
