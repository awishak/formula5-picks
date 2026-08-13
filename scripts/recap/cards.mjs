// Builds src/recapData.json: one personalised card deck per player, plus the
// league-wide sets the deck shares.
//
// Run after prep3.mjs, which is where the stake windows come from:
//   export F5_DATA=~/Downloads/formula5_data_2026-07-27.json
//   node prep3.mjs && node cards.mjs
//
// The six components below sum exactly to total_pts on all 528 score rows.
// order_pts is dead (always 0) and pit_matchup_pts is the team's BOX BOX
// result, which is deliberately outside an individual's total.

import { readFileSync, writeFileSync } from "fs";

const SP = import.meta.url;
const D = JSON.parse(readFileSync(process.env.F5_DATA, "utf8"));
const C = JSON.parse(readFileSync(new URL("chart-data.json", SP), "utf8"));

const HALF = 11;

export const COMPONENTS = [
  { key: "top_pick_pts",      label: "Top pool" },
  { key: "midfield_pts",      label: "Midfield" },
  { key: "order_bonus",       label: "Order" },
  { key: "best_finish_bonus", label: "Best finish" },
  { key: "pit_individual_pts",label: "Pit" },
  { key: "weekly_bonus_pts",  label: "Weekly bonus" },
];

/* ------------------------------------------------------------- players */

const firstHalf = new Set(D.races.filter(r => r.round <= HALF).map(r => r.id));
const scores = D.scores.filter(s => firstHalf.has(s.race_id));

const agg = {};
scores.forEach(s => {
  const a = agg[s.player_name] ||= { races: 0, total: 0, rounds: [] };
  a.races++;
  a.total += s.total_pts || 0;
  a.rounds.push({ round: s.round, pts: s.total_pts || 0, race: s.race_name });
  COMPONENTS.forEach(({ key }) => (a[key] = (a[key] || 0) + (s[key] || 0)));
});

const ladder = Object.entries(agg)
  .map(([name, a]) => {
    const o = { name, races: a.races, total: a.total, ppr: a.total / a.races };
    COMPONENTS.forEach(({ key }) => (o[key] = a[key] / a.races));
    o.best = a.rounds.reduce((m, r) => (r.pts > m.pts ? r : m), a.rounds[0]);
    return o;
  })
  .sort((a, b) => b.ppr - a.ppr);

ladder.forEach((p, i) => (p.rank = i + 1));

// Per-component rank, so a player can be told where each part of their game sits.
const compRank = {};
COMPONENTS.forEach(({ key }) => {
  compRank[key] = {};
  [...ladder].sort((a, b) => b[key] - a[key]).forEach((p, i) => (compRank[key][p.name] = i + 1));
});
const leagueAvg = Object.fromEntries(
  COMPONENTS.map(({ key }) => [key, ladder.reduce((s, p) => s + p[key], 0) / ladder.length]),
);
const leaguePPR = ladder.reduce((s, p) => s + p.ppr, 0) / ladder.length;

const photoOf = Object.fromEntries(C.cYou.players.map(p => [p.name, p.photo]));

/* --------------------------------------------------------------- teams */

const teams = C.cYou.teams;
const teamOf = {};
teams.forEach(t => { teamOf[t.p1] = t; teamOf[t.p2] = t; });

// Where each team sits once the swap has happened.
const destOf = t => (t.div === "champ" ? (t.moved === "down" ? "second" : "champ")
                                       : (t.moved === "up" ? "champ" : "second"));

const avgOf = Object.fromEntries([...C.c1.champ, ...C.c1.second].map(t => [t.name, t.avg]));

// oldDiv/oldPos are where the team ended the first half, before the swap. The
// board animates from that layout to the new one, so both have to travel with
// the team rather than being recomputed in the component.
const newDiv = { champ: [], second: [] };
teams.forEach(t => newDiv[destOf(t)].push({
  name: t.name, logo: t.logo, avg: avgOf[t.name], moved: t.moved,
  oldDiv: t.div, oldPos: t.posAfter,
  p1: t.p1, p2: t.p2, photo1: t.photo1, photo2: t.photo2,
}));
// New divisions are listed in championship-points order: the promoted teams land
// at the bottom of the top flight, which is the whole point of the swap.
const ptsOrder = (a, b) => (a.moved === "up") - (b.moved === "up")
  || (a.moved === "down") - (b.moved === "down")
  || a.oldPos - b.oldPos;
newDiv.champ.sort(ptsOrder);
newDiv.second.sort((a, b) => (b.moved === "down") - (a.moved === "down") || a.oldPos - b.oldPos);

// The fairness check on card 6: how many of the best 12 averages ended up in the
// top flight, and which teams the bracket left behind.
const byAvg = [...teams].map(t => ({ name: t.name, avg: avgOf[t.name], dest: destOf(t) }))
  .sort((a, b) => b.avg - a.avg);
const top12 = byAvg.slice(0, 12);
const sorry = top12.filter(t => t.dest === "second");
const fairCount = top12.filter(t => t.dest === "champ").length;

/* -------------------------------------------------------------- stakes */

// One sentence per (stake state, outcome). The stake is what was still reachable
// going into round 11; the outcome is what actually happened. They are separate
// slots because a team can miss the title and still go up.
function stakeCopy(t) {
  const s = t.stake.state;
  const won = t.won;
  const up = t.moved === "up", down = t.moved === "down";
  const opp = t.opp;

  // `was` has to read straight after "You were playing for", so every one of
  // these is a noun phrase. No verbs, or the card doubles up on itself.
  if (s === "title") {
    const tookIt = t.posAfter === 1;
    if (tookIt) return { was: "the division title", got: `You won it.`, tone: "good" };
    if (up)     return { was: "the division title", got: `You missed it, and went up anyway.`, tone: "ok" };
    return        { was: "the division title", got: `You missed it, but you stayed up.`, tone: "ok" };
  }
  if (s === "locked") return { was: "nothing. You were already up", got: `A free week.`, tone: "ok" };
  if (s === "winisenough") {
    if (!down) return { was: `one win against ${opp}`, got: won ? `You took it.` : `You lost and survived anyway.`, tone: "good" };
    return { was: `one win against ${opp}`, got: `You lost, and it cost you.`, tone: "bad" };
  }
  if (s === "mustwin") {
    const stay = t.div === "champ";
    if (stay && !down) return { was: `a must-win against ${opp}`, got: `You did it.`, tone: "good" };
    if (!stay && up)   return { was: `a must-win against ${opp}`, got: `You did it.`, tone: "good" };
    // Won the one match that was required and still missed out. Two teams did
    // this, and the consequence differs by division: the Championship side went
    // down, the Second Division side simply stayed put.
    if (won) return {
      was: `a must-win against ${opp}`,
      got: stay ? `You won it, and went down anyway.` : `You won it, and it still wasn't enough.`,
      tone: "bad",
    };
    return { was: `a must-win against ${opp}`, got: stay ? `You lost, and you went down.` : `You lost, and you stayed put.`, tone: "bad" };
  }
  if (s === "winandhelp") {
    const madeIt = t.div === "champ" ? !down : up;
    if (madeIt) return { was: "a win, and help from elsewhere", got: won ? `You got both.` : `You got the help without the win.`, tone: "good" };
    return { was: "a win, and help from elsewhere", got: won ? `You did your bit. Nobody else did.` : `Neither turned up.`, tone: "bad" };
  }
  // Out of the promotion race. Three of these four could still finish last;
  // TJ Premium could not, so their card gets a different line.
  const couldBeLast = t.stake.worst >= 12;
  if (couldBeLast) return {
    was: "pride, and last place to avoid",
    got: t.posAfter === 12 ? `Last place got you anyway.` : `You avoided it.`,
    tone: t.posAfter === 12 ? "bad" : "ok",
  };
  return { was: "nothing at all", got: `All good.`, tone: "ok" };
}

/* -------------------------------------------------------------- rivals */

// "Someone you know", in falling order of confidence. Family first, because a
// shared surname is the only signal in this data that is certain.
const surname = n => n.trim().split(/\s+/).slice(-1)[0];
const bySurname = {};
ladder.forEach(p => (bySurname[surname(p.name)] ||= []).push(p.name));

function pickRival(me, mate) {
  const fam = (bySurname[surname(me.name)] || []).filter(n => n !== me.name && n !== mate);
  if (fam.length) return { name: fam.sort((a, b) => byName[b].ppr - byName[a].ppr)[0], why: "family" };

  const t = teamOf[me.name];
  if (t) {
    const o = teams.find(x => x.name === t.opp);
    if (o) {
      const cands = [o.p1, o.p2].filter(n => byName[n]);
      if (cands.length) return { name: cands.sort((a, b) => byName[b].ppr - byName[a].ppr)[0], why: "round 11 opponent" };
    }
  }
  const above = ladder[me.rank - 2];
  if (above && above.name !== mate) return { name: above.name, why: "one place above you" };

  // Deterministic coin flip on the name, so rebuilds do not shuffle.
  const h = [...me.name].reduce((a, c) => a + c.charCodeAt(0), 0);
  return { name: h % 2 ? "Andrew Ishak" : "Formula5 Bot", why: "fallback" };
}

const byName = Object.fromEntries(ladder.map(p => [p.name, p]));

/* ---------------------------------------------------------------- deck */

const slim = p => ({ name: p.name, photo: photoOf[p.name] || null, ppr: +p.ppr.toFixed(1), rank: p.rank });

const players = {};
ladder.forEach(p => {
  const t = teamOf[p.name];
  if (!t) return;                       // players with no team get no deck
  const mate = t.p1 === p.name ? t.p2 : t.p1;

  const comps = COMPONENTS.map(({ key, label }) => ({
    key, label,
    you: +p[key].toFixed(1),
    league: +leagueAvg[key].toFixed(1),
    rank: compRank[key][p.name],
  }));
  // Best and worst by rank, for the one-line read on card 7. Ties break toward
  // the bigger gap from league average so the sentence has something to point at.
  const gap = c => c.you - c.league;
  const strong = [...comps].sort((a, b) => a.rank - b.rank || gap(b) - gap(a))[0];
  const weak   = [...comps].sort((a, b) => b.rank - a.rank || gap(a) - gap(b))[0];

  const rival = pickRival(p, mate);
  const contenders = [];
  const push = (n, role) => {
    if (!n || !byName[n] || contenders.some(c => c.name === n)) return;
    contenders.push({ ...slim(byName[n]), role });
  };
  push(ladder[0].name, "top of the table");
  push(mate, "your teammate");
  push(rival.name, rival.why);
  push(p.name, "you");
  contenders.sort((a, b) => a.rank - b.rank);

  players[p.name] = {
    name: p.name, photo: photoOf[p.name] || null,
    ppr: +p.ppr.toFixed(1), rank: p.rank, total: p.total,
    bestRound: { round: p.best.round, pts: p.best.pts, race: p.best.race },
    team: {
      name: t.name, logo: t.logo, div: t.div, dest: destOf(t), moved: t.moved,
      mate, matePhoto: photoOf[mate] || null,
      posBefore: t.posBefore, posAfter: t.posAfter,
      opp: t.opp, oppLogo: t.oppLogo, score: t.score, oppScore: t.oppScore, won: t.won,
      avg: avgOf[t.name],
      newRank: newDiv[destOf(t)].findIndex(x => x.name === t.name) + 1,
    },
    stake: stakeCopy(t),
    comps, strong: strong.key, weak: weak.key,
    contenders,
  };
});

const out = {
  meta: { half: HALF, generated: D.exported_at, players: Object.keys(players).length },
  league: {
    ppr: +leaguePPR.toFixed(1),
    ladder: ladder.map(slim),
    newDiv, sorry: sorry.map(s => ({ name: s.name, avg: s.avg })), fairCount,
    // The boundary card 6 is about: the worst average that stayed up against the
    // best one that went down. Taken by average explicitly, because newDiv is
    // stored in championship-points order.
    boundary: {
      lastChamp: [...newDiv.champ].sort((a, b) => a.avg - b.avg)[0],
      firstSecond: [...newDiv.second].sort((a, b) => b.avg - a.avg)[0],
    },
  },
  players,
};

writeFileSync(new URL("../../src/recapData.json", SP), JSON.stringify(out));

console.log(`recapData written: ${out.meta.players} decks`);
console.log(`  league PPR ${out.league.ppr}, ladder ${ladder[0].ppr.toFixed(1)} down to ${ladder[ladder.length - 1].ppr.toFixed(1)}`);
console.log(`  fairness: ${fairCount}/12 of the best averages in the top flight`);
console.log(`  sorry: ${sorry.map(s => `${s.name} ${s.avg}`).join(", ") || "none"}`);
console.log(`  boundary: ${out.league.boundary.lastChamp.name} ${out.league.boundary.lastChamp.avg} vs ${out.league.boundary.firstSecond.name} ${out.league.boundary.firstSecond.avg}`);
const tally = {};
Object.values(players).forEach(p => (tally[p.stake.was] = (tally[p.stake.was] || 0) + 1));
console.log("  stakes:", Object.entries(tally).map(([k, v]) => `${v}× ${k}`).join(" | "));
const rivals = {};
Object.values(players).forEach(p => {
  const r = p.contenders.find(c => !["top of the table", "your teammate", "you"].includes(c.role));
  if (r) rivals[r.role] = (rivals[r.role] || 0) + 1;
});
console.log("  rival source:", Object.entries(rivals).map(([k, v]) => `${k} ${v}`).join(", "));
