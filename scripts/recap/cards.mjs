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
// The second-half draw, from scripts/schedule2.mjs. Card 10 shows it.
const FIX = JSON.parse(readFileSync(new URL("schedule2.json", SP), "utf8"));

const HALF = 11;

export const COMPONENTS = [
  { key: "top_pick_pts",      label: "Top driver" },
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

// Short forms, agreed with Andrew 2026-08-17. Nobody's team is renamed: the full
// name is used everywhere it fits, and this is only for the promotion board and
// the division grid, where a row gives a name about 120px at 13px DM Sans.
// Six names genuinely overflowed; the rest are here so the board reads evenly.
const SHORT = {
  "XLIX Racing Team": "XLIX Racing",
  "Van City Corsa": "Van City",
  "Juicero Silicon Valley": "Juicero SV",
  "Drivetex": "Drivetex",
  "Cougar Autosport": "Cougar Auto",
  "East Bay Racing": "East Bay",
  "Cascadia Motorsport": "Cascadia",
  "Meatballs": "Meatballs",
  "HomeworkTubes.Com": "HomeworkTubes",
  "TNT Roku F5 Team": "TNT Roku",
  "Cal Aggie Racing": "Cal Aggie",
  "Peloton Aubergine": "Peloton",
  "Garra Dynamics": "Garra",
  "El Camino Rapido": "El Camino",
  "Stalloni 1851": "Stalloni",
  "Bronco SCUderia": "Bronco",
  "Wildcat Motors": "Wildcat",
  "Luxor Motorsport": "Luxor",
  "Magic Kingdom Racing": "Magic Kingdom",
  "Shoey Time! w/ Max and Danny": "Shoey Time!",
  "TJ Premium": "TJ Premium",
  "Prestissimo Veloce": "Prestissimo",
  "Aggie Slipstream": "AgSlipstream",
  "Scuderia Iskandaraya": "Iskandaraya",
};
const shortOf = n => SHORT[n] || n;

// Every team must have one, or the board silently falls back to a name that
// does not fit.
const missing = teams.map(t => t.name).filter(n => !SHORT[n]);
if (missing.length) throw new Error(`no short name for: ${missing.join(", ")}`);

// oldDiv/oldPos are where the team ended the first half, before the swap. The
// board animates from that layout to the new one, so both have to travel with
// the team rather than being recomputed in the component.
const ptsOf = Object.fromEntries([...C.c1.champ, ...C.c1.second].map(t => [t.name, t.pts]));

const newDiv = { champ: [], second: [] };
teams.forEach(t => newDiv[destOf(t)].push({
  name: t.name, short: shortOf(t.name), logo: t.logo, avg: avgOf[t.name], moved: t.moved,
  pts: ptsOf[t.name],
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
// Where each team would be if the table were scoring average and nothing else.
const avgDivOf = {};
byAvg.forEach((t, i) => (avgDivOf[t.name] = i < 12 ? "champ" : "second"));
const sorry = top12.filter(t => t.dest === "second");
const fairCount = top12.filter(t => t.dest === "champ").length;

/* ------------------------------------------------------- round by round */

// The two line charts and the stacked breakdown all need a value per round
// rather than a season total, so everything below is keyed by round.

const roundsAsc = D.races.filter(r => r.round <= HALF).sort((a, b) => a.round - b.round);
const rowAt = {};
D.scores.forEach(s => (rowAt[`${s.player_id}_${s.race_id}`] = s));
const idByPlayer = Object.fromEntries(D.players.map(p => [p.name, p.id]));
const teamRowByName = Object.fromEntries(D.teams.map(t => [t.name, t]));

// A team's matchup score is the four scoring components for both players plus
// the BOX BOX result, exactly as Admin.jsx scores it. pit_matchup_pts is stored
// on player1 only, checked across all 264 team-rounds.
const FOUR = ["top_pick_pts", "midfield_pts", "order_bonus", "best_finish_bonus"];
const part = s => FOUR.reduce((n, k) => n + (s[k] || 0), 0);

function teamScoreAt(team, raceId) {
  const a = rowAt[`${team.player1_id}_${raceId}`];
  const b = rowAt[`${team.player2_id}_${raceId}`];
  if (!a || !b) return null;
  const base = part(a) + part(b);
  const bb = a.pit_matchup_pts || 0;
  return { base, bb, total: base + bb };
}

// Per team, the eleven weeks: what we scored, what they scored, who won, and
// whether the BOX BOX swing is what decided it.
const teamWeeks = {};
D.teams.forEach(team => {
  teamWeeks[team.name] = roundsAsc.map(race => {
    const m = D.schedule.find(
      s => s.race_id === race.id && (s.home_team_id === team.id || s.away_team_id === team.id),
    );
    const us = teamScoreAt(team, race.id);
    if (!m || !us) return { round: race.round, race: race.race_name, us: null };
    const oppId = m.home_team_id === team.id ? m.away_team_id : m.home_team_id;
    const oppTeam = D.teams.find(t => t.id === oppId);
    const them = oppTeam ? teamScoreAt(oppTeam, race.id) : null;
    const verdict = (x, y) => (x > y ? "W" : x < y ? "L" : "D");
    const result = them ? verdict(us.total, them.total) : null;
    return {
      round: race.round,
      race: race.race_name,
      us: us.total,
      them: them ? them.total : null,
      result,
      opp: oppTeam ? oppTeam.name : null,
      oppLogo: oppTeam ? C.logos[oppTeam.name] || null : null,
      // Home is the OVER seat. Same rule as the second half.
      side: m.home_team_id === team.id ? "over" : "under",
      boxBox: us.bb > 0 ? "W" : us.bb < 0 ? "L" : null,
      // Did the BOX BOX swing change the answer? Compare the result with it to
      // the result without it.
      decided: them ? verdict(us.total, them.total) !== verdict(us.base, them.base) : false,
    };
  });
});

// driver_pts holds both "Andrea Kimi Antonelli" and "Kimi Antonelli", which
// splits one driver across two spellings. Merged here rather than at source.
const CANON = n => (n === "Andrea Kimi Antonelli" ? "Kimi Antonelli" : n);

// Per player: the round series, the stacked breakdown, and who actually paid.
// Top pool and midfield get their own band; everything else is folded together.
const REST = ["order_bonus", "best_finish_bonus", "pit_individual_pts", "weekly_bonus_pts"];
const perRound = {};
ladder.forEach(p => {
  const pid = idByPlayer[p.name];
  const rows = roundsAsc.map(race => rowAt[`${pid}_${race.id}`]).filter(Boolean);

  const drivers = {};
  rows.forEach(s => {
    let dp = {};
    try { dp = JSON.parse(s.driver_pts || "{}"); } catch { dp = {}; }
    Object.entries(dp).forEach(([raw, pts]) => {
      const name = CANON(raw);
      const d = (drivers[name] ||= { name, cards: 0, pts: 0 });
      d.cards++;
      d.pts += pts || 0;
    });
  });
  const byPts = Object.values(drivers).sort((a, b) => b.pts - a.pts || b.cards - a.cards);
  const byCards = Object.values(drivers).sort((a, b) => b.cards - a.cards || b.pts - a.pts);
  // Same again, but only counting rounds where the driver was in the midfield.
  const midOnly = {};
  rows.forEach(s => {
    const race = roundsAsc.find(r => r.id === s.race_id);
    if (!race) return;
    const inMid = new Set((race.mid_drivers || []).map(CANON));
    let dp = {};
    try { dp = JSON.parse(s.driver_pts || "{}"); } catch { dp = {}; }
    Object.keys(dp).forEach(raw => {
      const nm = CANON(raw);
      if (inMid.has(nm)) midOnly[nm] = (midOnly[nm] || 0) + 1;
    });
  });
  const favMid = Object.entries(midOnly).sort((a, b) => b[1] - a[1])[0] || null;

  perRound[p.name] = {
    series: rows.map(s => ({ round: s.round, pts: s.total_pts || 0 })),
    stack: rows.map(s => ({
      round: s.round,
      top: s.top_pick_pts || 0,
      mid: s.midfield_pts || 0,
      rest: REST.reduce((n, k) => n + (s[k] || 0), 0),
    })),
    star: byPts[0] ? { name: byPts[0].name, pts: byPts[0].pts, cards: byPts[0].cards } : null,
    favMid: favMid ? { name: favMid[0], cards: favMid[1] } : null,
    favourite: byCards[0] ? { name: byCards[0].name, cards: byCards[0].cards, pts: byCards[0].pts } : null,
    worst: rows.reduce((m, s) => ((s.total_pts || 0) < (m.total_pts || 0) ? s : m), rows[0]),
  };
});

/* ---------------------------------------------------- card 1: the notes */

// Three throwaway lines about how a person plays. Each is derived, so nobody
// gets a note that is not true of them.
const raceById = Object.fromEntries(D.races.map(r => [r.id, r]));
const timing = {};
D.picks.forEach(pk => {
  const r = raceById[pk.race_id];
  if (!r || r.round > HALF || !pk.submitted_at || !r.pick_deadline) return;
  const hrs = (new Date(r.pick_deadline) - new Date(pk.submitted_at)) / 3600000;
  const day = new Date(pk.submitted_at).toLocaleDateString("en-US", {
    weekday: "long", timeZone: "America/Los_Angeles",
  });
  (timing[pk.player_name] ||= []).push({ hrs, day });
});

const medianOf = a => { const x = [...a].sort((m, n) => m - n); return x[Math.floor(x.length / 2)]; };

function whenNote(name) {
  const rows = timing[name];
  if (!rows || !rows.length) return null;
  const counts = {};
  rows.forEach(r => (counts[r.day] = (counts[r.day] || 0) + 1));
  const [day, n] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  // A day only counts as a habit if it is at least half of their picks.
  if (n / rows.length >= 0.5) return `Loves to pick on ${day}s`;
  const med = medianOf(rows.map(r => r.hrs));
  if (med >= 48) return "Loves to pick early";
  if (med <= 12) return "Loves to leave it late";
  return "Picks a day or two out";
}

// Which way a season is going: the last four rounds against the first four.
function trendNote(series) {
  if (!series || series.length < 8) return null;
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  const early = mean(series.slice(0, 4).map(s => s.pts));
  const late = mean(series.slice(-4).map(s => s.pts));
  if (late >= early * 1.15) return "Having a late surge";
  if (early >= late * 1.15) return "Started strong, fading a little";
  return "Has been consistent all half";
}

/* -------------------------------------------------------------- stakes */

// A team plays for a thing, not for a result. "A win and help from elsewhere" is
// a mechanism, so `goal` names what was actually at stake and `condition` says
// what it would have taken. Both come off the position window the solver stored:
// goalPos is the last safe place, edgePos is the swap spot below it.
function goalOf(t) {
  const s = t.stake.state;
  const champ = t.div === "champ";
  if (s === "title") {
    return champ
      ? "for the first half championship"
      : "for the chance to finish top of the Second Division for the first half";
  }
  if (s === "locked") return "for nothing, because your promotion to the Championship Division was already safe";
  if (s === "gone") {
    return t.stake.worstLose >= 12
      ? "for the chance to stay off the bottom of the Second Division"
      : "for pride, and nothing else";
  }
  return champ
    ? "for the chance to stay in the Championship Division for the second half"
    : "for the chance to be promoted to the Championship Division for the second half";
}

// Card 4 is the result on its own, so it needs the beats separately: what the
// scoreline did, what it meant, and where the championship points left you.
function resultOf(t) {
  const champ = t.div === "champ";
  const up = t.moved === "up", down = t.moved === "down";
  const word = t.won === true ? "you won" : t.won === false ? "you lost" : "you drew";
  const took = t.posAfter === 1;

  let consequence;
  if (t.won) {
    if (up) consequence = "And that win was enough to send you up to the Championship Division.";
    else if (down) consequence = "But you went down anyway.";
    else if (took) consequence = "And that was enough to take the first half championship.";
    else if (champ) consequence = "And that was enough to keep you in the Championship Division.";
    else consequence = "But it wasn't enough to go up.";
  } else if (t.won === false) {
    if (up) consequence = "You went up anyway.";
    else if (down) consequence = "And that sealed your fate.";
    else if (champ) consequence = "You stayed in the Championship Division anyway.";
    else consequence = "So you stay in the Second Division.";
  } else {
    consequence = down ? "And a draw was not enough to save you."
      : up ? "And a draw was still enough to send you up."
      : "And a draw left everything where it was.";
  }

  const divName = champ ? "Championship Division" : "Second Division";
  return {
    word,
    consequence,
    points: `You earned ${t.earned} championship ${t.earned === 1 ? "point" : "points"} to move to ${t.ptsAfter}, which left you ${ordinal(t.posAfter)} in the ${divName}.`,
    tone: t.won ? "good" : t.won === false ? "bad" : "ok",
  };
}

const ordinal = n => n + (["th", "st", "nd", "rd"][(n % 100 - 20) % 10] || ["th", "st", "nd", "rd"][n % 100] || "th");

function conditionOf(t) {
  const s = t.stake;
  const champ = t.div === "champ";
  const keep = champ ? "keep you up" : "take you up";

  // Teams chasing the title are already safe, so the condition is about first
  // place rather than about the drop.
  if (s.state === "title") {
    if (s.worstWin === 1) return "Win and first place was yours.";
    if (s.bestLose === 1) return "The top spot was in play with a good win, and even a loss could have kept you first.";
    return "The top spot was in play with a good win.";
  }

  // Already promoted, so the goal line says that. Don't say it twice here.
  if (s.state === "locked") {
    const ord = n => n + (n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th");
    return `You were finishing between ${ord(s.bestWin)} and ${ord(s.worstLose)}, and every one of those goes up.`;
  }

  if (s.state === "gone") {
    if (s.worstLose >= 12) return "Lose, and last place was a real possibility.";
    return `You could neither ${champ ? "go down" : "go up"} nor finish last.`;
  }

  // Safe before a wheel turned.
  if (s.worstLose <= s.goalPos) return champ ? "You were safe either way." : "You were going up either way.";

  const canWin = s.bestWin <= s.edgePos;
  const canLose = s.bestLose <= s.edgePos;
  const winSettles = s.worstWin <= s.goalPos;

  if (winSettles && canLose) return `A win was enough on its own, and even a loss could have ${champ ? "kept you up" : "taken you up"}.`;
  if (winSettles) return "A win was enough on its own. Lose, and you needed help.";
  if (canWin && canLose) return "A win could have been enough, and so could a loss with help.";
  if (canWin) return `Only a win would ${keep}.`;
  return champ ? "Nothing you did could keep you up." : "You could no longer go up.";
}

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
    if (tookIt) return { was: "the division title", got: `You finished first.`, tone: "good" };
    if (up)     return { was: "the division title", got: `You missed first place, and went up anyway.`, tone: "ok" };
    return        { was: "the division title", got: `You missed first place, but you stayed up.`, tone: "ok" };
  }
  if (s === "locked") return { was: "nothing. You were already up", got: `A free week.`, tone: "ok" };
  if (s === "winisenough") {
    if (!down) return { was: `one win against ${opp}`, got: won ? `You beat ${opp}.` : `You lost and survived anyway.`, tone: "good" };
    return { was: `one win against ${opp}`, got: `You lost, and it cost you.`, tone: "bad" };
  }
  if (s === "mustwin") {
    const stay = t.div === "champ";
    if (stay && !down) return { was: `a must-win against ${opp}`, got: `You beat ${opp}, and you stayed up.`, tone: "good" };
    if (!stay && up)   return { was: `a must-win against ${opp}`, got: `You beat ${opp}, and you went up.`, tone: "good" };
    // Won the one match that was required and still missed out. Two teams did
    // this, and the consequence differs by division: the Championship side went
    // down, the Second Division side simply stayed put.
    if (won) return {
      was: `a must-win against ${opp}`,
      got: stay ? `You beat ${opp}, and went down anyway.` : `You beat ${opp}, and still missed out.`,
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
    got: t.posAfter === 12 ? `Last place got you anyway.` : `You finished ${t.posAfter}th, clear of the bottom.`,
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

// First-half record per team, off the weeks already worked out above.
const recordOf = {};
Object.entries(teamWeeks).forEach(([name, weeks]) => {
  const r = { w: 0, l: 0, d: 0 };
  weeks.forEach(x => { if (x.result === "W") r.w++; else if (x.result === "L") r.l++; else if (x.result === "D") r.d++; });
  recordOf[name] = r;
});
[...newDiv.champ, ...newDiv.second].forEach(t => (t.record = recordOf[t.name] || { w: 0, l: 0, d: 0 }));

// Scoring-average rank across ALL 24 teams, not within a division. A team's
// standing against the whole league is the interesting number; ranking them
// inside their own twelve just renumbers the same order.
[...newDiv.champ, ...newDiv.second]
  .sort((a, b) => b.avg - a.avg)
  .forEach((t, i) => (t.avgRank = i + 1));

/* ---------------------------------------------------- the division table */

// Card 3's reveal moves your team up or down the twelve-team division table, so
// both layouts have to travel with the deck. c3 and c4 store a position and a
// points total per round, so round 10 is the before and round 11 is the after.
function tableFor(div) {
  const src = div === "champ" ? C.c3 : C.c4;
  const at = (t, r) => ({ name: t.name, logo: C.logos[t.name] || null, pos: t.pos[r], pts: t.pts[r] });
  const order = (a, b) => a.pos - b.pos;
  return {
    before: src.map(t => at(t, HALF - 2)).sort(order),
    after: src.map(t => at(t, HALF - 1)).sort(order),
  };
}
const TABLES = { champ: tableFor("champ"), second: tableFor("second") };

// The board on the promotion card moves in two stages: first every team shuffles
// inside its own division on round 11 points, then the ten that swap cross over.
// So each team needs where it stood after round 10 as well as after round 11.
[...newDiv.champ, ...newDiv.second].forEach(t => {
  const tbl = TABLES[t.oldDiv];
  t.pos10 = (tbl.before.find(r => r.name === t.name) || {}).pos ?? t.oldPos;
  t.pos11 = (tbl.after.find(r => r.name === t.name) || {}).pos ?? t.oldPos;
});

/* ------------------------------------------- what to work on next half */

// Card 11 is the only forward-looking card, so it is league-wide rather than
// personal: what actually paid in the first half, for everybody.
const poolReturns = () => {
  const roles = { top: {}, mid: {} };
  D.races.filter(r => r.round <= HALF).forEach(race => {
    const inTop = new Set((race.top_drivers || []).map(CANON));
    const inMid = new Set((race.mid_drivers || []).map(CANON));
    D.scores.filter(s => s.race_id === race.id).forEach(s => {
      let dp = {};
      try { dp = JSON.parse(s.driver_pts || "{}"); } catch { dp = {}; }
      Object.entries(dp).forEach(([raw, pts]) => {
        const name = CANON(raw);
        const bucket = inTop.has(name) ? "top" : inMid.has(name) ? "mid" : null;
        if (!bucket) return;
        const d = (roles[bucket][name] ||= { name, picks: 0, pts: 0, rounds: new Set() });
        d.picks++;
        d.pts += pts || 0;
        // Rounds, not picks, is the honest denominator. Every player who picks
        // the same driver in the same round scores identically, so 48 picks in
        // one round is one race, not 48 samples. Antonelli's 25.0 a pick came
        // off three rounds in the pool, and showing 91 picks hides that.
        d.rounds.add(race.round);
      });
    });
  });
  // Ranked on points per pick, not on total points. A total just rewards the
  // driver who was in the pool most often; the return per pick is what a player
  // can act on.
  const rate = obj => Object.values(obj)
    .map(d => ({ name: d.name, picks: d.picks, pts: d.pts, rounds: d.rounds.size,
                 per: +(d.pts / d.picks).toFixed(1) }))
    .sort((a, b) => b.per - a.per);

  // Every driver who was in the top pool this half, all of them, with the pick
  // count alongside so a small sample is visible rather than hidden.
  const top = rate(roles.top);

  // Several drivers moved between the pools during the half, so a few show up in
  // both lists and it reads as a mistake. A driver belongs to whichever pool
  // they were picked from more often: Antonelli is 91 top against 42 midfield so
  // he is a top driver, while Verstappen is 32 against 224 and is not.
  const mostlyTop = new Set(
    Object.values(roles.top)
      .filter(d => d.picks >= (roles.mid[d.name] ? roles.mid[d.name].picks : 0))
      .map(d => d.name),
  );
  const mid = rate(roles.mid).filter(d => !mostlyTop.has(d.name));

  // The other end is the more useful warning: picked constantly, paid nothing.
  const trap = rate(roles.mid).filter(d => d.picks >= 120).sort((a, b) => a.per - b.per)[0] || null;
  return { top, mid, trap };
};

const pits = D.results
  .map(r => ({ round: (D.races.find(x => x.id === r.race_id) || {}).round, t: r.pit_stop_time }))
  .filter(r => r.t != null)
  .sort((a, b) => a.t - b.t);
const median = pits.length ? pits[Math.floor(pits.length / 2)].t : null;

const prep = {
  drivers: poolReturns(),
  // cBF is the best-finish guess: how often each called position actually landed.
  bestSpot: C.cBF.map(b => ({ pos: b.g, guesses: b.n, hits: b.hit, pct: b.pct }))
    .sort((a, b) => b.pct - a.pct),
  pit: {
    median,
    low: pits.length ? pits[0].t : null,
    high: pits.length ? pits[pits.length - 1].t : null,
    under5: pits.filter(p => p.t < 5).length,
    recorded: pits.length,
  },
};

/* ------------------------------------------------- what happened, league */

// Card 4 is the same for all 48, so it is built once. Every number is read out
// of the data and asserted, because a highlight that drifts out of date is
// worse than no highlight at all.
function must(ok, msg) { if (!ok) throw new Error(`highlight check failed: ${msg}`); }

const r11 = C.c2.winners;
const bigWin = [...r11].sort((a, b) => b.score - a.score)[0];
const champWinner = C.c1.champ[0];
const secondWinner = C.c1.second[0];
const cascadia = [...C.c1.champ, ...C.c1.second].find(t => t.name === "Cascadia Motorsport");
const cascadiaTrend = C.c3.find(t => t.name === "Cascadia Motorsport");
const promoted = C.c1.second.filter(t => t.role === "up");
const swapUp = promoted.find(t => t.viaSwap);
const swapDown = C.c1.champ.find(t => t.role === "down" && t.viaSwap);

must(bigWin.name === "Cascadia Motorsport", "Cascadia no longer has the biggest round 11 score");
must(cascadiaTrend.pos[9] === 10 && cascadia.pos === 7, "Cascadia no longer goes 10th to 7th");
must(secondWinner.pts > champWinner.pts, "the Second Division no longer outscores the Championship");
must(swapUp && swapDown, "the swap spot no longer resolves");
must(promoted.length === 5, `expected 5 promoted, got ${promoted.length}`);

// Each story leads with a bold line and then explains itself, so the card can be
// skimmed in three glances.
const highlights = {
  headline: "What happened around the league?",
  items: [
    {
      key: "cascadia",
      logo: C.logos[cascadia.name],
      text: `${cascadia.name} had a huge win to climb out of the relegation zone and into ${ordinal(cascadia.pos)} place.`,
    },
    {
      key: "swap",
      logo: C.logos[swapUp.name],
      text: `${promoted[3].name} and ${swapUp.name} both had strong enough weeks to move into the promotion zone, even though they were playing each other.`,
    },
    {
      key: "champions",
      logo: C.logos[champWinner.name],
      text: `${champWinner.name} took the first half championship, finishing on ${champWinner.pts} points.`,
    },
  ],
};

// Card 5: four teams go up on points and the fifth goes up on average, which is
// the part nobody remembers.
const promotion = {
  byRule: promoted.filter(t => !t.viaSwap).map(t => ({ name: t.name, pts: t.pts, logo: C.logos[t.name] })),
  swap: {
    up: { name: swapUp.name, avg: swapUp.avg, logo: C.logos[swapUp.name] },
    down: { name: swapDown.name, avg: swapDown.avg, logo: C.logos[swapDown.name] },
  },
};

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
      name: t.name, short: shortOf(t.name), logo: t.logo, div: t.div, dest: destOf(t), moved: t.moved,
      mate, matePhoto: photoOf[mate] || null,
      posBefore: t.posBefore, posAfter: t.posAfter,
      opp: t.opp, oppLogo: t.oppLogo, score: t.score, oppScore: t.oppScore, won: t.won,
      earned: t.earned, ptsAfter: t.ptsAfter,
      avg: avgOf[t.name],
      // Which division scoring average alone would have put them in.
      avgDiv: avgDivOf[t.name],
      newRank: newDiv[destOf(t)].findIndex(x => x.name === t.name) + 1,
    },
    stake: { ...stakeCopy(t), goal: goalOf(t), condition: conditionOf(t) },
    result: resultOf(t),
    comps, strong: strong.key, weak: weak.key,
    contenders,
    // Card 7's two charts: your eleven rounds, your teammate's underneath in a
    // muted line, and the team's week-by-week result against its opponent.
    series: perRound[p.name].series,
    mateSeries: perRound[mate] ? perRound[mate].series : [],
    mateTotal: byName[mate] ? byName[mate].total : null,
    mateRank: byName[mate] ? byName[mate].rank : null,
    teamSeries: teamWeeks[t.name] || [],
    // Card 8: the same rounds broken into where the points came from.
    stack: perRound[p.name].stack,
    star: perRound[p.name].star,
    favourite: perRound[p.name].favourite,
    // Card 1's three lines.
    notes: [
      whenNote(p.name),
      perRound[p.name].favMid ? `Big fan of ${perRound[p.name].favMid.name}` : null,
      trendNote(perRound[p.name].series),
    ].filter(Boolean),
    worstRound: {
      round: perRound[p.name].worst.round,
      pts: perRound[p.name].worst.total_pts || 0,
      race: perRound[p.name].worst.race_name,
    },
    // Card 10: the second half, drawn 2026-08-17.
    fixtures: FIX[t.name]
      ? {
          ...FIX[t.name],
          weeks: FIX[t.name].weeks.map(w => {
            const o = [...newDiv.champ, ...newDiv.second].find(x => x.name === w.opp) || {};
            return { ...w, oppLogo: o.logo || null, oppRank: o.avgRank || null, oppAvg: o.avg || null };
          }),
        }
      : null,
  };
});

// Every player as a point: midfield against top driver, both per race. The
// scatter card plots all 48 and finds you in it.
const scatter = ladder.map(p => ({
  name: p.name,
  mid: +p.midfield_pts.toFixed(1),
  top: +p.top_pick_pts.toFixed(1),
}));

const out = {
  meta: { half: HALF, generated: D.exported_at, players: Object.keys(players).length },
  league: {
    ppr: +leaguePPR.toFixed(1),
    ladder: ladder.map(slim),
    newDiv, sorry: sorry.map(s => ({ name: s.name, avg: s.avg })), fairCount,
    highlights, promotion, prep, scatter,
    // Both division tables, stored once. A deck looks its own up by division
    // rather than carrying a private copy, which is 48 copies of the same rows.
    tables: TABLES,
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
