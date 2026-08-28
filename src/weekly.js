// The week, computed. Pure, no React and no Supabase, for the same reason
// teamTable.js and playerTable.js are: the weekly deck restates the scoring
// rules eight different ways, and a second copy of those rules is how two
// screens end up disagreeing about who won.
//
// Everything here is derived from one round's rows. Nothing is generated ahead
// of time and nothing is stored, so a deck exists the moment Admin writes the
// scores and it changes if a round is rescored.
//
// The rules this file mirrors, all of them from scoreRace() in Admin.jsx:
//
//   individual score = top pick + midfield + order bonus + best finish
//                      + needle + weekly bonus
//   team score       = top pick + midfield + order bonus + best finish,
//                      both players, plus the BOX BOX result
//   BOX BOX line     = the average of ALL FOUR pit guesses in the matchup,
//                      both teams. A stop above the line goes to the OVER seat,
//                      below it to the UNDER seat, exactly equal is a push.
//   home_team_id     IS the OVER seat.
import { buildTeamTable, FIRST_H2_ROUND } from "./teamTable.js";
import { codeOf, shortOf } from "./teams.js";
// Finishing orders and pool lists are external spellings, so they resolve
// through the alias map rather than by string equality.
import { canonicalName } from "./drivers.js";
// Flags come from the row, falling back to the static map and then the default,
// so a player who has picked one wins over anything hardcoded.
import { nationOf as staticNationOf, teamNationOf as staticTeamNationOf } from "./nations.js";
import { buildPlayerTable, placesBy } from "./playerTable.js";

// The pit guess input runs 1.5 to 4.5. Card 5 asks what the best legal guess
// would have done, so the ends of that range are part of the scoring model and
// belong here rather than in the input.
export const PIT_FLOOR = 1.5;
export const PIT_CEIL = 4.5;

// BOX BOX is worth 5 to the winner and -1 to the loser, so flipping the line moves one
// team by 6 and the other by 6 the other way. The MARGIN moves by 12, which is
// the number card 5 needs and the one that is easy to get wrong.
export const BB_WIN = 5;
export const BB_LOSS = -1;
// One team moves 6, the other moves 6 the other way, so the margin moves 12.
export const BB_SWING = (BB_WIN - BB_LOSS) * 2;

// A driver comparison needs both sides of the league to be a real sample. In
// round 12 Piastri was picked by 46 of 48, which leaves two people to stand in
// for "everyone else" and makes their average two players' bad afternoon. Any
// driver more lopsided than this is left off card 6 rather than shown with a
// denominator that cannot support the sentence.
const MIN_SIDE = 5;

const num = v => (v == null || v === "" ? null : Number(v));

const INDIVIDUAL = s =>
  (s.top_pick_pts || 0) + (s.midfield_pts || 0) + (s.order_bonus || 0) +
  (s.best_finish_bonus || 0) + (s.pit_individual_pts || 0) + (s.weekly_bonus_pts || 0);

// The team half of a player's score. The needle and the weekly bonus are the
// individual game and never reach a matchup.
const TEAM_HALF = s =>
  (s.top_pick_pts || 0) + (s.midfield_pts || 0) + (s.order_bonus || 0) + (s.best_finish_bonus || 0);

// driver_pts is stored as a JSON string, so every read has to parse. A row that
// predates the column, or one written badly, gives an empty map rather than
// throwing and taking the whole deck down with it.
const driverPts = s => {
  if (!s) return {};
  const raw = s.driver_pts;
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try { return JSON.parse(raw) || {}; } catch (e) { return {}; }
};

const avg = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const round1 = n => Math.round(n * 10) / 10;

/**
 * The most recent round that has been scored. This is what the deck opens on,
 * and it is why there is no cron: scoring a round in Admin is what publishes
 * the week.
 *
 * @param {object} db { races, scores }
 * @returns {object|null} the race row, or null before anything is scored
 */
export function latestScoredRound(db) {
  const races = db.races || [], scores = db.scores || [];
  const scored = new Set(scores.map(s => s.race_id));
  return (races || [])
    .filter(r => scored.has(r.id))
    .sort((a, b) => b.round - a.round)[0] || null;
}

/** The next race after `round`, for the last card. */
export function nextRaceAfter(db, round) {
  return (db.races || [])
    .filter(r => r.round > round)
    .sort((a, b) => a.round - b.round)[0] || null;
}

/**
 * One player's week, as eight cards' worth of data.
 *
 * @param {object} db { players, teams, races, scores, picks, results, schedule }
 * @param {string} playerName the signed-in player
 * @param {number} round which round to build; defaults to the latest scored
 * @returns {object|null} null when that player has no score for the round
 */
export function buildWeekly(db, playerName, round = null) {
  const players = db.players || [], teams = db.teams || [];
  const races = db.races || [], scores = db.scores || [];
  const picks = db.picks || [], results = db.results || [];
  const schedule = db.schedule || [];

  const race = round == null
    ? latestScoredRound(db)
    : races.find(r => r.round === round);
  if (!race) return null;

  const me = players.find(p => p.name === playerName);
  if (!me) return null;

  const roundScores = scores.filter(s => s.race_id === race.id);
  const myScore = roundScores.find(s => s.player_id === me.id);
  if (!myScore) return null;

  const result = results.find(r => r.race_id === race.id) || {};
  const pit = num(result.pit_stop_time);
  // Where every driver finished, resolved through the alias map once.
  const finishPos = {};
  (Array.isArray(result.finishing_order) ? result.finishing_order : [])
    .forEach((n, i) => { finishPos[canonicalName(n)] = i + 1; });

  const nameOf = {}; players.forEach(p => { nameOf[p.id] = p.name; });
  // null means never chosen, which falls through to the map. "" means chose no
  // flag, which is an answer and must not fall through.
  const nationById = {};
  players.forEach(p => {
    nationById[p.id] = p.nation != null ? p.nation : staticNationOf(p.name);
  });
  const nationOfTeam = t => (t && t.nation != null ? t.nation : staticTeamNationOf(t ? t.name : ""));
  const photoOf = {}; players.forEach(p => { photoOf[p.id] = p.photo_url || null; });
  const teamById = {}; teams.forEach(t => { teamById[t.id] = t; });
  const scoreOf = {}; roundScores.forEach(s => { scoreOf[s.player_id] = s; });
  const pickOf = {};
  picks.filter(p => p.race_id === race.id).forEach(p => { pickOf[p.player_id] = p; });

  /* ------------------------------------------------------- the whole round */

  // Every matchup this round, scored the way Admin scores one. Card 2 needs all
  // twelve and card 6 needs to know which driver moved which of them.
  const fixtures = schedule.filter(f => f.race_id === race.id).map(f => {
    const home = teamById[f.home_team_id], away = teamById[f.away_team_id];
    if (!home || !away) return null;
    const homePlayers = [home.player1_id, home.player2_id].filter(Boolean);
    const awayPlayers = [away.player1_id, away.player2_id].filter(Boolean);

    const guesses = [...homePlayers, ...awayPlayers]
      .map(id => num(pickOf[id] && pickOf[id].pit_guess))
      .filter(v => v != null && !isNaN(v));
    const line = guesses.length ? avg(guesses) : null;

    let overBonus = 0, underBonus = 0;
    if (line != null && pit != null) {
      if (pit > line) { overBonus = BB_WIN; underBonus = BB_LOSS; }
      else if (pit < line) { overBonus = BB_LOSS; underBonus = BB_WIN; }
    }

    const half = ids => ids.reduce((a, id) => a + (scoreOf[id] ? TEAM_HALF(scoreOf[id]) : 0), 0);
    const homeHalf = half(homePlayers), awayHalf = half(awayPlayers);
    const homeTotal = homeHalf + overBonus, awayTotal = awayHalf + underBonus;

    return {
      home, away, homePlayers, awayPlayers, line,
      overBonus, underBonus, homeHalf, awayHalf, homeTotal, awayTotal,
      // Home is the OVER seat and carries no other meaning.
      winner: homeTotal > awayTotal ? home.id : awayTotal > homeTotal ? away.id : null,
    };
  }).filter(Boolean);

  const fixtureOf = {};
  fixtures.forEach(f => {
    [...f.homePlayers, ...f.awayPlayers].forEach(id => { fixtureOf[id] = f; });
  });

  // Individual placings for the week, across everyone who scored.
  //
  // Equal scores must not fall to row order. Postgres heap order is not stable,
  // so the same player came out P37 on one read and P41 on the next while no
  // score changed, which is the bug that reshuffled 45 championship points in
  // the first half. Name is an arbitrary tiebreak and it is the same answer
  // every time. playerTable.js breaks weekly ties the same way, so the place on
  // this card and the trophy on /players agree.
  const teamOfPlayer = {};
  teams.forEach(t => {
    [t.player1_id, t.player2_id].forEach(id => { if (id) teamOfPlayer[id] = t; });
  });
  const ladder = roundScores
    .map(s => ({
      id: s.player_id, name: nameOf[s.player_id], photo: photoOf[s.player_id],
      pts: INDIVIDUAL(s),
      nation: nationById[s.player_id],
      team: teamOfPlayer[s.player_id] ? teamOfPlayer[s.player_id].name : null,
      teamLogo: teamOfPlayer[s.player_id] ? teamOfPlayer[s.player_id].logo_url : null,
    }))
    .sort((a, b) => (b.pts - a.pts) || a.name.localeCompare(b.name))
    .map((r, i) => ({ ...r, place: i + 1 }));
  const placeOf = {}; ladder.forEach(r => { placeOf[r.id] = r.place; });

  const mine = fixtureOf[me.id];
  if (!mine) return null;

  const iAmHome = mine.homePlayers.includes(me.id);
  const myTeam = iAmHome ? mine.home : mine.away;
  const oppTeam = iAmHome ? mine.away : mine.home;
  const myPlayers = iAmHome ? mine.homePlayers : mine.awayPlayers;
  const oppPlayers = iAmHome ? mine.awayPlayers : mine.homePlayers;
  const myTotal = iAmHome ? mine.homeTotal : mine.awayTotal;
  const oppTotal = iAmHome ? mine.awayTotal : mine.homeTotal;
  const myBB = iAmHome ? mine.overBonus : mine.underBonus;
  const seat = iAmHome ? "OVER" : "UNDER";
  const mateId = myPlayers.find(id => id !== me.id) || null;
  const outcome = myTotal > oppTotal ? "won" : myTotal < oppTotal ? "lost" : "drew";

  /* --------------------------------------- the matchup, taken apart */

  // Which drivers separated the two teams, and what happens to the result when
  // each scoring component is taken away. Card 1's review names whichever of
  // these mattered, and card 3 draws them, so the arithmetic sits above both.
  const sideDrivers = ids => {
    const out = {};
    ids.forEach(id => {
      const dp = driverPts(scoreOf[id]);
      for (const [d, v] of Object.entries(dp)) out[d] = (out[d] || 0) + v;
    });
    return out;
  };
  const myDrivers = sideDrivers(myPlayers), oppDrivers = sideDrivers(oppPlayers);
  const driverGaps = [...new Set([...Object.keys(myDrivers), ...Object.keys(oppDrivers)])]
    .map(d => ({ driver: d, mine: myDrivers[d] || 0, theirs: oppDrivers[d] || 0,
                 gap: (myDrivers[d] || 0) - (oppDrivers[d] || 0) }))
    .filter(x => x.gap !== 0)
    .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));

  const componentDiff = key =>
    myPlayers.reduce((a, id) => a + ((scoreOf[id] || {})[key] || 0), 0) -
    oppPlayers.reduce((a, id) => a + ((scoreOf[id] || {})[key] || 0), 0);

  const margin = myTotal - oppTotal;
  const marginNoBB = margin - (myBB - (iAmHome ? mine.underBonus : mine.overBonus));
  const orderDiff = componentDiff("order_bonus");
  const bestDiff = componentDiff("best_finish_bonus");
  // A component decided the matchup when taking it away changes who won. A
  // margin that lands on zero counts: a win turning into a draw is a different
  // result and the card should say so.
  const decided = (diff, m) => diff !== 0 && Math.sign(m - diff) !== Math.sign(m);

  const topGap = driverGaps[0] || null;
  const bbDecidedFlag = decided(margin - marginNoBB, margin);

  /* ------------------------------------------------------------- 1. result */

  // What to blame, or thank, in one line. Whichever of these is true first is
  // the one the review names, strongest reason down to weakest.
  const mateScore = mateId ? INDIVIDUAL(scoreOf[mateId]) : 0;
  const myInd = INDIVIDUAL(myScore);
  const cause = (() => {
    if (bbDecidedFlag) return { kind: "boxbox" };
    if (topGap && Math.abs(topGap.gap) >= 10) {
      return { kind: "driver", driver: topGap.driver, gap: Math.abs(topGap.gap),
               yours: topGap.gap > 0 };
    }
    if (mateId && mateScore - myInd >= 12) return { kind: "mate", who: nameOf[mateId] };
    if (mateId && myInd - mateScore >= 12) return { kind: "you" };
    return { kind: "spread" };
  })();

  // Where the player sits in the season's individual standings, and where they
  // sat before this round was scored. Same builder both times, with the scores
  // filtered, so the two numbers cannot disagree about the rules.
  const seasonRows = cutoff => {
    const upTo = scores.filter(sc => {
      const r = races.find(x => x.id === sc.race_id);
      return r && r.round <= cutoff;
    });
    return buildPlayerTable({ players, teams, races, scores: upTo })
      .sort((a, b) => (b.avg - a.avg) || (b.pts - a.pts) || a.name.localeCompare(b.name));
  };
  const seasonPlaceAt = cutoff => {
    const rows = seasonRows(cutoff);
    const place = placesBy(rows, r => r.avg);
    const row = rows.find(r => r.id === me.id);
    return row ? { place: place[me.id], pts: row.pts, avg: row.avg, of: rows.length } : null;
  };
  const seasonNow = seasonPlaceAt(race.round);
  const seasonBefore = race.round > 1 ? seasonPlaceAt(race.round - 1) : null;

  // Everybody's place before this round, so every row in the table can carry
  // its own movement rather than only the reader's.
  const placesBefore = race.round <= 1 ? {} : (() => {
    const rows = seasonRows(race.round - 1);
    return placesBy(rows, r => r.avg);
  })();

  const card1 = {
    outcome, seat,
    // Which quarter of the 48 this week's score landed in, 0 for the best.
    quarter: Math.min(3, Math.floor((placeOf[me.id] - 1) / (ladder.length / 4))),
    season: seasonNow ? {
      ...seasonNow,
      of: seasonNow.of,
      // Up is a smaller number, so the move is the old place minus the new one.
      move: seasonBefore ? seasonBefore.place - seasonNow.place : null,
      was: seasonBefore ? seasonBefore.place : null,
    } : null,
    myTeam: teamCard(myTeam), oppTeam: teamCard(oppTeam),
    myTotal, oppTotal, margin: myTotal - oppTotal,
    ind: myInd, place: placeOf[me.id], field: ladder.length,
    // The week's scoring range and its middle, so a score can be read against
    // the field rather than only against a rank.
    low: ladder[ladder.length - 1].pts,
    high: ladder[0].pts,
    mid: round1(avg(ladder.map(r => r.pts))),
    // Every score, for the distribution behind the marker.
    spread: ladder.map(r => r.pts),
    mate: mateId ? {
      name: nameOf[mateId], photo: photoOf[mateId],
      ind: mateScore, place: placeOf[mateId],
    } : null,
    cause,
    // True when the result and the placing pull in opposite directions, which
    // is what earns a "though" instead of an "and".
    contrast: (outcome === "won" && placeOf[me.id] > ladder.length / 2) ||
              (outcome === "lost" && placeOf[me.id] <= ladder.length / 2),
  };

  /* ------------------------------------------------------------ 2. scatter */

  // One dot per player: their own score against what their team put up.
  //
  // The upright split is the league's average score for the week. Winning and
  // losing is carried by colour, because a win is not a height on this chart:
  // two teams can both score 61 and one of them has to lose. So the four
  // players called out are the ends of each side.
  //
  //   highest score on a winning team    STAR OF THE WEEK
  //   lowest score on a winning team     LUCKY
  //   highest score on a losing team     UNLUCKY
  //   lowest score on a losing team      MIGHT AS WELL HAVE DNFED
  const xSplit = round1(avg(roundScores.map(INDIVIDUAL)) || 0);

  const dots = roundScores.map(s => {
    const f = fixtureOf[s.player_id];
    if (!f) return null;
    const home = f.homePlayers.includes(s.player_id);
    const team = home ? f.home : f.away;
    const teamPts = home ? f.homeTotal : f.awayTotal;
    const oppPts = home ? f.awayTotal : f.homeTotal;
    const x = INDIVIDUAL(s);
    const result = teamPts > oppPts ? "won" : teamPts < oppPts ? "lost" : "drew";
    return {
      id: s.player_id, name: nameOf[s.player_id], photo: photoOf[s.player_id],
      x, y: teamPts, opp: oppPts, result,
      me: s.player_id === me.id, mate: s.player_id === mateId,
      teamName: team.name, teamLogo: team.logo_url || null,
      above: x > xSplit,
    };
  }).filter(Boolean);

  // Highest or lowest scorer on each side. Equal scores break on name, so the
  // same four people come out on every load.
  const endOf = (result, best) => {
    const side = dots.filter(d => d.result === result);
    if (!side.length) return null;
    return side.slice().sort((a, b) =>
      (best === "high" ? b.x - a.x : a.x - b.x) || a.name.localeCompare(b.name))[0];
  };

  const corners = [
    { q: "star", label: "STAR OF THE WEEK", who: endOf("won", "high") },
    { q: "lucky", label: "LUCKY", who: endOf("won", "low") },
    { q: "unlucky", label: "UNLUCKY", who: endOf("lost", "high") },
    { q: "dnf", label: "MIGHT AS WELL HAVE DNFED", who: endOf("lost", "low") },
  ].filter(c => c.who);
  corners.forEach(c => { c.who = { ...c.who, corner: c.q }; });
  const cornerOf = {};
  corners.forEach(c => { cornerOf[c.who.id] = c.q; });

  // Where the player themself landed, on two counts. Their own score against
  // the other 47, in thirds. And their team's week: won or lost, with a team
  // score in the top or bottom half of the 24.
  //
  // Three bands by four team situations gives twelve, and each one gets its own
  // sentence, so the card opens on something true about your week rather than
  // on a label.
  const teamScores = [];
  fixtures.forEach(f => {
    teamScores.push({ id: f.home.id, score: f.homeTotal, name: f.home.name });
    teamScores.push({ id: f.away.id, score: f.awayTotal, name: f.away.name });
  });
  // Equal team scores break on name, so the halves are the same on every load.
  teamScores.sort((a, b) => (b.score - a.score) || a.name.localeCompare(b.name));
  const topTeams = new Set(teamScores.slice(0, Math.floor(teamScores.length / 2)).map(t => t.id));

  const myDot = dots.find(d => d.me) || null;
  // Equal thirds, 16 apiece, so "top this week" and "bottom this week" are the
  // same size as the middle and the six boxes are comparable.
  const third = Math.ceil(ladder.length / 3);
  const bandAt = pl => (pl <= third ? "top" : pl > third * 2 ? "bottom" : "mid");
  const myPlace = placeOf[me.id];
  const band = bandAt(myPlace);
  const teamBand = topTeams.has(myTeam.id) ? "high" : "low";
  const teamKey = `${outcome === "won" ? "W" : outcome === "lost" ? "L" : "D"}_${teamBand}`;

  const card2 = {
    points: dots, xSplit,
    // Both axes run from zero, so a distance on screen is a distance in points.
    xMax: Math.max(...dots.map(d => d.x), 1),
    yMax: Math.max(...dots.map(d => d.y), 1),
    corners,
    top3: ladder.slice(0, 3),
    yours: cornerOf[me.id] || null,
    you: myDot,
    // "top_W_high" and the eleven others. A draw falls back to the win wording,
    // since a drawn matchup is nobody's disaster.
    band, teamBand, outcome,
    // Every player sorted into the same twelve boxes, for the grid card. The
    // bands are worked out once here rather than once per card, so the box a
    // player is drawn in and the line they read always agree.
    grid: (() => {
      const myPlayers = iAmHome ? mine.homePlayers : mine.awayPlayers;
      const oppPlayers = iAmHome ? mine.awayPlayers : mine.homePlayers;
      const ours = new Set(myPlayers), theirs = new Set(oppPlayers);
      const members = {};
      let yours = null;
      ladder.forEach(r => {
        const f = fixtureOf[r.id];
        if (!f) return;
        const home = f.homePlayers.includes(r.id);
        const tp = home ? f.homeTotal : f.awayTotal;
        const op = home ? f.awayTotal : f.homeTotal;
        // A draw sits with the wins. Nobody drew this half, but the box has to
        // hold one when it happens.
        const res = tp >= op ? "W" : "L";
        const key = `${bandAt(r.place)}_${res}`;
        (members[key] = members[key] || []).push({
          ...r,
          me: r.id === me.id,
          ours: ours.has(r.id), theirs: theirs.has(r.id),
          result: tp > op ? "won" : tp < op ? "lost" : "drew",
          teamPts: tp, oppPts: op,
        });
        if (r.id === me.id) yours = key;
      });
      return { members, yours, bandSize: third };
    })(),
    // Everyone's score for the week, best first, for the bar chart. Split into
    // the half a matchup counts and the half only the individual game counts,
    // because the chart peels the individual half off on its way to team mode.
    ladder: ladder.map(r => {
      const sc = scoreOf[r.id] || {};
      const f = fixtureOf[r.id];
      const home = f && f.homePlayers.includes(r.id);
      const tp = f ? (home ? f.homeTotal : f.awayTotal) : 0;
      const op = f ? (home ? f.awayTotal : f.homeTotal) : 0;
      return {
        ...r, me: r.id === me.id,
        teamPart: TEAM_HALF(sc),
        indPart: (sc.pit_individual_pts || 0) + (sc.weekly_bonus_pts || 0),
        result: tp > op ? "won" : tp < op ? "lost" : "drew",
      };
    }),
    // What the winning and losing halves of the league averaged.
    averages: (() => {
      const w = [], l = [];
      roundScores.forEach(sc => {
        const f = fixtureOf[sc.player_id];
        if (!f) return;
        const home = f.homePlayers.includes(sc.player_id);
        const tp = home ? f.homeTotal : f.awayTotal;
        const op = home ? f.awayTotal : f.homeTotal;
        (tp >= op ? w : l).push(INDIVIDUAL(sc));
      });
      return { won: w.length ? round1(avg(w)) : null, wonN: w.length,
               lost: l.length ? round1(avg(l)) : null, lostN: l.length };
    })(),
    // The four players in your matchup, ready to be pushed to one side or the
    // other. The OVER seat goes right and the UNDER seat goes left, so your own
    // team's side depends on which seat you were in.
    matchup: {
      seat, outcome, line: mine.line, pit,
      myTeam: teamCard(myTeam), oppTeam: teamCard(oppTeam),
      myBB, oppBB: iAmHome ? mine.underBonus : mine.overBonus,
      myPreBB: myTotal - myBB, oppPreBB: oppTotal - (iAmHome ? mine.underBonus : mine.overBonus),
      myTotal, oppTotal,
      mineIds: myPlayers, oppIds: oppPlayers,
      // Shaped for HandsColumns, the board the home page draws. Same keys, so the
      // deck and the home page render the identical component.
      seats: [...myPlayers, ...oppPlayers].map(id => {
        const sc = scoreOf[id] || {};
        const pk = pickOf[id] || {};
        const order = [];
        if (pk.top_pick) order.push(pk.top_pick);
        (Array.isArray(pk.finishing_order) ? pk.finishing_order : []).forEach(n => {
          if (!order.includes(n)) order.push(n);
        });
        // Fall back to whatever scored, so a hand is never empty.
        if (order.length < 5) {
          Object.keys(driverPts(sc)).forEach(n => { if (!order.includes(n)) order.push(n); });
        }
        return {
          id, name: nameOf[id], photo: photoOf[id],
          ours: myPlayers.includes(id), mine: id === me.id,
          pick: { order: order.slice(0, 5), bestFinish: pk.best_finish || null },
          score: {
            top: sc.top_pick_pts || 0, mid: sc.midfield_pts || 0,
            best: sc.best_finish_bonus || 0, order: sc.order_bonus || 0,
            total: TEAM_HALF(sc),
          },
        };
      }),
      // What each driver was worth, for the numbers drawn on the faces.
      driverPtsMap: (() => {
        const out = {};
        [...myPlayers, ...oppPlayers].forEach(id => {
          Object.entries(driverPts(scoreOf[id])).forEach(([d, v]) => { out[d] = v; });
        });
        return out;
      })(),
      // Every driver each side picked, with what he was worth. A driver both teams
      // held pairs off copy for copy and the leftovers are what separated them,
      // which is the same rule the rooting board uses.
      hands: [...myPlayers, ...oppPlayers].map(id => ({
        id, name: nameOf[id], first: String(nameOf[id]).split(/\s+/)[0],
        photo: photoOf[id], ours: myPlayers.includes(id),
        // Finishing order, so all four columns read down the same way.
        drivers: Object.entries(driverPts(scoreOf[id]))
          .map(([driver, pts]) => ({ driver, pts, pos: finishPos[canonicalName(driver)] || 99 }))
          .sort((a, b) => a.pos - b.pos),
      })),
    },
    // Your teammate's week, in the same thirds. A summary reads much better
    // when it can name who did or did not turn up, so the copy can say "and
    // nothing from Kevin" rather than "and your team came up short".
    mate: mateId ? {
      name: nameOf[mateId], first: String(nameOf[mateId]).split(/\s+/)[0],
      pts: INDIVIDUAL(scoreOf[mateId]), place: placeOf[mateId],
      band: bandAt(placeOf[mateId]),
    } : null,
    verdict: `${band}_${teamKey.replace("D_", "W_")}`,
  };

  /* ------------------------------------------------- 3. what decided it */

  const card3 = {
    margin, marginNoBB,
    gaps: driverGaps.slice(0, 3),
    // Two of round 12's twelve matchups had four players on identical drivers,
    // so every gap is zero and there is nothing to name. That is a real finding
    // and gets its own line rather than an empty chart.
    identical: driverGaps.length === 0,
    bbDecided: decided(margin - marginNoBB, margin),
    orderDiff, orderDecided: decided(orderDiff, margin),
    bestDiff, bestDecided: decided(bestDiff, margin),
  };

  /* ------------------------------------------------------------- 4. needle */

  const myPick = pickOf[me.id] || {};
  const myGuess = num(myPick.pit_guess);
  const four = [...myPlayers, ...oppPlayers].map(id => ({
    id, name: nameOf[id], photo: photoOf[id],
    guess: num((pickOf[id] || {}).pit_guess),
    pts: (scoreOf[id] || {}).pit_individual_pts || 0,
    mine: myPlayers.includes(id), me: id === me.id,
  }));

  const needlePts = myScore.pit_individual_pts || 0;
  const bbWon = myBB > 0 ? "won" : myBB < 0 ? "lost" : "push";
  const card4 = {
    pit, guess: myGuess, line: mine.line, seat,
    // Guesses are entered in tenths and hundredths, so the raw subtraction
    // gives 1.4000000000000004. Two places is more than the input carries.
    off: myGuess != null && pit != null ? Math.round(Math.abs(myGuess - pit) * 100) / 100 : null,
    needlePts, bb: bbWon,
    // Both, one, or neither. The card's headline turns on this.
    verdict: needlePts > 0 && bbWon === "won" ? "both"
      : needlePts > 0 ? "needle"
      : bbWon === "won" ? "line"
      : "neither",
    four,
    toFloor: myGuess != null ? round1(myGuess - PIT_FLOOR) : null,
    toCeil: myGuess != null ? round1(PIT_CEIL - myGuess) : null,
    leagueScored: roundScores.filter(s => (s.pit_individual_pts || 0) > 0).length,
    field: roundScores.length,
    // Every guess in the league, for the chart's second view. Your matchup is
    // four dots and tells you nothing about whether 4.2 was a brave call or a
    // crowded one; all 48 does.
    leagueFour: roundScores.map(s => ({
      id: s.player_id, name: nameOf[s.player_id],
      guess: num((pickOf[s.player_id] || {}).pit_guess),
      pts: s.pit_individual_pts || 0,
      mine: myPlayers.includes(s.player_id), me: s.player_id === me.id,
    })).filter(f => f.guess != null),
  };

  /* ----------------------------------------------- 5. the guess you could have made */

  // The line is the average of all four guesses, so your guess is a quarter of
  // it and your PAIR is half. That is what makes this a team question: a guess
  // that cannot win the line on its own often wins it when both teammates move.
  //
  // OVER wants the line below the actual stop, UNDER wants the line above.
  const oppSum = oppPlayers.reduce((a, id) => a + (num((pickOf[id] || {}).pit_guess) || 0), 0);
  const mateGuess = mateId ? num((pickOf[mateId] || {}).pit_guess) : null;
  const n = four.filter(f => f.guess != null).length || 4;
  const target = pit != null ? pit * n - oppSum : null;   // what the two of you had to sum to

  const wantLow = seat === "OVER";
  // On my own, with my teammate's guess where they left it.
  const soloNeed = target != null && mateGuess != null ? round1(target - mateGuess) : null;
  const soloPossible = soloNeed == null ? null
    : wantLow ? soloNeed > PIT_FLOOR : soloNeed < PIT_CEIL;
  // The pair at full stretch: both to the floor, or both to the ceiling.
  const pairBest = wantLow ? PIT_FLOOR * 2 : PIT_CEIL * 2;
  const pairPossible = target == null ? null : wantLow ? pairBest < target : pairBest > target;

  const flipped = margin + (myBB > 0 ? -BB_SWING : BB_SWING);
  const card5 = {
    outcome, seat, margin, swing: BB_SWING,
    guess: myGuess, mateGuess, mateName: mateId ? nameOf[mateId] : null,
    need: soloNeed, wantLow, soloPossible, pairPossible,
    pairNeed: target != null ? round1(target) : null,
    pairBest,
    flippedMargin: flipped,
    // Four states, and each gets its own copy. A winner sees the mirror: how
    // far the guess could have drifted before the line went the other way.
    state: outcome === "won" || outcome === "drew" ? "held"
      : soloPossible && flipped > 0 ? "solo"
      : !soloPossible && pairPossible && flipped > 0 ? "pair"
      : soloPossible || pairPossible ? "notEnough"
      : "locked",
    // For the winner's mirror: the room between the guess and the point where
    // the line crosses.
    room: soloNeed != null && myGuess != null ? round1(Math.abs(myGuess - soloNeed)) : null,
  };

  /* ------------------------------------------------- 6. the difference maker */

  const pickers = {};
  roundScores.forEach(s => {
    Object.keys(driverPts(s)).forEach(d => {
      (pickers[d] = pickers[d] || []).push(s.player_id);
    });
  });

  const driverRows = Object.entries(pickers).map(([driver, ids]) => {
    const set = new Set(ids);
    const withIt = roundScores.filter(s => set.has(s.player_id)).map(INDIVIDUAL);
    const without = roundScores.filter(s => !set.has(s.player_id)).map(INDIVIDUAL);
    // What the driver was worth. Every picker gets the same number, so the first is
    // as good as an average.
    const pts = driverPts(scoreOf[ids[0]])[driver];

    // How many points this driver moved between the two sides of a matchup,
    // added up over the round, and how often that gap alone was the difference.
    let swing = 0, decidedCount = 0;
    fixtures.forEach(f => {
      const side = ids2 => ids2.reduce((a, id) => a + (driverPts(scoreOf[id])[driver] || 0), 0);
      const gap = side(f.homePlayers) - side(f.awayPlayers);
      const m = f.homeTotal - f.awayTotal;
      swing += Math.abs(gap);
      if (gap !== 0 && Math.sign(m - gap) !== Math.sign(m)) decidedCount += 1;
    });

    return {
      driver, picks: ids.length, pts, swing, decided: decidedCount,
      pickerAvg: withIt.length ? round1(avg(withIt)) : null,
      otherAvg: without.length ? round1(avg(without)) : null,
      edge: withIt.length && without.length ? round1(avg(withIt) - avg(without)) : null,
      // Both sides have to be a real sample before the comparison is printed.
      comparable: withIt.length >= MIN_SIDE && without.length >= MIN_SIDE,
      mine: !!driverPts(myScore)[driver],
    };
  });

  const bySwing = [...driverRows].sort((a, b) => b.swing - a.swing);
  const comparable = driverRows.filter(d => d.comparable);
  const trap = [...comparable].sort((a, b) => a.edge - b.edge)[0] || null;
  const hero = bySwing[0] || null;
  const mostDecisive = [...driverRows].sort((a, b) => b.decided - a.decided)[0] || null;

  const card6 = {
    hero,
    trap,
    // Named separately when the driver who moved the most points is not the one
    // who turned the most matchups. In round 12 that is Norris against Russell.
    mostDecisive: mostDecisive && hero && mostDecisive.driver !== hero.driver && mostDecisive.decided > 0
      ? mostDecisive : null,
    // Everyone who could be compared, worst to best, for the small chart.
    compared: [...comparable].sort((a, b) => b.edge - a.edge),
    excluded: driverRows.filter(d => !d.comparable).length,
    field: roundScores.length,
  };

  /* ------------------------------------------------- the week, in context */

  // The stats a fantasy league lives on. Each one answers a question the raw
  // score cannot: was the score any good, was the schedule kind, and how close
  // did anybody get to the best picks available.
  const teamScoreOf = {};
  fixtures.forEach(f => {
    teamScoreOf[f.home.id] = f.homeTotal;
    teamScoreOf[f.away.id] = f.awayTotal;
  });
  const teamRank = Object.entries(teamScoreOf)
    .map(([id, v]) => ({ id, v, name: (teamById[id] || {}).name || "" }))
    .sort((a, b) => (b.v - a.v) || a.name.localeCompare(b.name));
  const rankOfTeam = {};
  teamRank.forEach((t, i) => { rankOfTeam[t.id] = i + 1; });

  // All-play: your score against every other team's, not only the one you drew.
  // A team can score the fourth best number of the week and still lose.
  const others = teamRank.filter(t => t.id !== myTeam.id);
  const allPlay = {
    beat: others.filter(t => myTotal > t.v).length,
    lost: others.filter(t => myTotal < t.v).length,
    of: others.length,
    rank: rankOfTeam[myTeam.id],
  };
  // Winning on a score most teams would have lost with, or the reverse.
  const luck = outcome === "won" && allPlay.beat < allPlay.of / 2 ? "lucky"
    : outcome === "lost" && allPlay.beat >= allPlay.of / 2 ? "unlucky" : null;

  // The best hand the pools allowed: the top pool's best driver and the four
  // best midfielders. Anything short of that is points left behind.
  const worth = {};
  roundScores.forEach(sc => {
    Object.entries(driverPts(sc)).forEach(([d, v]) => { worth[d] = v; });
  });
  const poolBest = (names, take) => (names || [])
    .map(n => ({ driver: n, pts: worth[n] != null ? worth[n] : 0 }))
    .sort((a, b) => b.pts - a.pts).slice(0, take);
  const perfectTop = poolBest(race.top_drivers, 1);
  const perfectMid = poolBest(race.mid_drivers, 4);
  const perfect = {
    picks: [...perfectTop, ...perfectMid],
    total: [...perfectTop, ...perfectMid].reduce((a, x) => a + x.pts, 0),
  };
  const haulOf = sc => Object.values(driverPts(sc)).reduce((a, b) => a + b, 0);
  const myHaul = haulOf(myScore);
  const hauls = roundScores.map(sc => ({ id: sc.player_id, name: nameOf[sc.player_id],
    photo: photoOf[sc.player_id], haul: haulOf(sc) }))
    .sort((a, b) => b.haul - a.haul || a.name.localeCompare(b.name));

  // Your own picks, best and worst.
  const myPicksRanked = Object.entries(driverPts(myScore))
    .map(([driver, pts]) => ({ driver, pts }))
    .sort((a, b) => b.pts - a.pts);

  // This week against your own other weeks.
  const myWeeks = races
    .filter(r => r.round <= race.round)
    .map(r => {
      const sc = scores.find(x => x.race_id === r.id && x.player_id === me.id);
      return sc ? { round: r.round, pts: INDIVIDUAL(sc) } : null;
    })
    .filter(Boolean);
  const weeksSorted = [...myWeeks].sort((a, b) => b.pts - a.pts);
  const weekVsSelf = {
    rank: weeksSorted.findIndex(w => w.round === race.round) + 1,
    of: weeksSorted.length,
    best: weeksSorted[0], worst: weeksSorted[weeksSorted.length - 1],
  };

  // How many weeks running the team has won, this round included. BOX BOX has
  // to be in it: Cal Aggie were level at 55 on driver points this week and won
  // on the line, and a streak that ignores the line calls that a non-win.
  // Every round the team has played, newest first, replayed the same way a
  // matchup is scored. BOX BOX has to be in it: Cal Aggie were level at 55 on
  // driver points this week and won on the line, and a run that ignores the
  // line calls that a non-win.
  const teamForm = (() => {
    const out = [];
    const rounds = races.filter(r => r.round <= race.round)
      .sort((a, b) => b.round - a.round);
    for (const r of rounds) {
      const f = schedule.find(x => x.race_id === r.id &&
        (x.home_team_id === myTeam.id || x.away_team_id === myTeam.id));
      const rows = scores.filter(x => x.race_id === r.id);
      const rr = results.find(x => x.race_id === r.id);
      // A round with no fixture, no scores or no result was never played. Rounds
      // are walked newest first, so stopping here keeps the run contiguous.
      if (!f || !rows.length || !rr) break;
      const stop = num(rr.pit_stop_time);
      const ids = t => (teamById[t] ? [teamById[t].player1_id, teamById[t].player2_id].filter(Boolean) : []);
      const home = ids(f.home_team_id), away = ids(f.away_team_id);
      const guesses = [...home, ...away]
        .map(id => {
          const pk = picks.find(x => x.race_id === r.id && x.player_id === id);
          return num(pk && pk.pit_guess);
        })
        .filter(v => v != null && !isNaN(v));
      const line = guesses.length ? avg(guesses) : null;
      let ob = 0, ub = 0;
      if (line != null && stop != null) {
        if (stop > line) { ob = BB_WIN; ub = BB_LOSS; }
        else if (stop < line) { ob = BB_LOSS; ub = BB_WIN; }
      }
      const half = list => list.reduce((a, id) => {
        const row = rows.find(x => x.player_id === id);
        return a + (row ? TEAM_HALF(row) : 0);
      }, 0);
      const homeTotal = half(home) + ob, awayTotal = half(away) + ub;
      const iAmHomeHere = f.home_team_id === myTeam.id;
      const mineTotal = iAmHomeHere ? homeTotal : awayTotal;
      const theirTotal = iAmHomeHere ? awayTotal : homeTotal;
      const oppId = iAmHomeHere ? f.away_team_id : f.home_team_id;
      out.push({
        round: r.round,
        won: mineTotal > theirTotal, lost: mineTotal < theirTotal,
        drew: mineTotal === theirTotal,
        mine: mineTotal, theirs: theirTotal,
        margin: mineTotal - theirTotal,
        opp: teamById[oppId] ? teamById[oppId].name : null,
      });
    }
    return out;
  })();

  // A run of the same result, this round included, and what the last few weeks
  // have looked like. A draw ends a run of wins and a run of losses both: it is
  // neither, and calling a draw part of either is how a streak line lies.
  const runOf = key => {
    let n = 0;
    for (const w of teamForm) { if (w[key]) n += 1; else break; }
    return n;
  };
  const tally = n => teamForm.slice(0, n).reduce((a, w) => ({
    w: a.w + (w.won ? 1 : 0), l: a.l + (w.lost ? 1 : 0), d: a.d + (w.drew ? 1 : 0),
  }), { w: 0, l: 0, d: 0 });
  const teamRun = {
    played: teamForm.length,
    wins: runOf("won"), losses: runOf("lost"),
    // Unbeaten and winless both count a draw, which is why they are not the
    // same number as the win and loss runs.
    unbeaten: (() => { let n = 0; for (const w of teamForm) { if (!w.lost) n += 1; else break; } return n; })(),
    winless: (() => { let n = 0; for (const w of teamForm) { if (!w.won) n += 1; else break; } return n; })(),
    last5: tally(5), last10: tally(10),
    prev: teamForm[1] || null,
  };
  const teamStreak = teamRun.wins;

  const margins = fixtures.map(f => ({
    home: f.home, away: f.away, homeTotal: f.homeTotal, awayTotal: f.awayTotal,
    margin: Math.abs(f.homeTotal - f.awayTotal),
  })).sort((a, b) => a.margin - b.margin);

  // Every driver the pools offered, in the order they finished, with what each
  // was worth, who you took and which five were the best hand available. Finishing
  // order is the honest sort here: it is the thing that decided the points.
  const posOf = finishPos;
  const myDriverPts = driverPts(myScore);
  const perfectSet = new Set(perfect.picks.map(p => p.driver));
  const poolBoard = [
    ...(race.top_drivers || []).map(n => ({ driver: n, pool: "top" })),
    ...(race.mid_drivers || []).map(n => ({ driver: n, pool: "mid" })),
  ].map(d => ({
    ...d,
    pos: posOf[canonicalName(d.driver)] || null,
    pts: worth[d.driver] != null ? worth[d.driver] : 0,
    mine: Object.prototype.hasOwnProperty.call(myDriverPts, d.driver),
    best: perfectSet.has(d.driver) && (worth[d.driver] || 0) > 0,
  })).sort((a, b) => (a.pos == null) - (b.pos == null) || (a.pos - b.pos));

  // Every team's score this week, best first, for the all-play strip. Ties are
  // marked because 12 beaten and 7 lost does not add up to 23 without them.
  const teamDriverPts = {};
  fixtures.forEach(f => {
    const haul = ids => ids.reduce((a, id) => {
      const row = scoreOf[id];
      return a + (row ? Object.values(driverPts(row)).reduce((x, y) => x + y, 0) : 0);
    }, 0);
    teamDriverPts[f.home.id] = haul(f.homePlayers);
    teamDriverPts[f.away.id] = haul(f.awayPlayers);
  });
  const leagueScores = teamRank.map(t => ({
    id: t.id, name: t.name, code: codeOf(t.name), v: t.v,
    logo: (teamById[t.id] || {}).logo_url || null,
    nation: nationOfTeam(teamById[t.id]),
    drivers: teamDriverPts[t.id] || 0,
    me: t.id === myTeam.id, opp: t.id === oppTeam.id,
    beat: myTotal > t.v, lostTo: myTotal < t.v,
  }));

  // The single change that would have gained the most. Pools are separate, so a
  // swap only counts inside its own pool: nobody could have taken Norris in
  // place of a midfielder. "Left 14 behind" is a number; "you should have taken
  // Norris over Hamilton" is the decision that produced it.
  const bestSwap = (() => {
    let best = null;
    for (const pool of ["top", "mid"]) {
      const inPool = poolBoard.filter(d => d.pool === pool);
      const taken = inPool.filter(d => d.mine).sort((a, b) => a.pts - b.pts);
      const free = inPool.filter(d => !d.mine).sort((a, b) => b.pts - a.pts);
      if (!taken.length || !free.length) continue;
      const gain = free[0].pts - taken[0].pts;
      if (gain > 0 && (!best || gain > best.gain)) {
        best = { pool, out: taken[0], in: free[0], gain };
      }
    }
    return best;
  })();

  // The season behind this week, so a result can be called rare or ordinary
  // with a number rather than a guess. Every scored round is rebuilt the same
  // way this one is: individual places, and whether each team won.
  const history = (() => {
    const scored = races
      .filter(r => r.round <= race.round && scores.some(x => x.race_id === r.id))
      .sort((a, b) => a.round - b.round);
    let topScorerLost = 0, sameBandWon = 0, sameBandPlayed = 0, rounds = 0;
    const myBandLo = Math.floor((placeOf[me.id] - 1) / 12) * 12 + 1;
    const myBandHi = myBandLo + 11;

    scored.forEach(r => {
      const rows = scores.filter(x => x.race_id === r.id);
      const rr = results.find(x => x.race_id === r.id);
      if (!rows.length || !rr) return;
      const stop = num(rr.pit_stop_time);
      const ladderR = rows
        .map(x => ({ id: x.player_id, pts: INDIVIDUAL(x), name: nameOf[x.player_id] || "" }))
        .sort((a, b) => (b.pts - a.pts) || a.name.localeCompare(b.name));
      const placeR = {};
      ladderR.forEach((x, i) => { placeR[x.id] = i + 1; });

      const wonBy = {};
      schedule.filter(f => f.race_id === r.id).forEach(f => {
        const ids = t => (teamById[t] ? [teamById[t].player1_id, teamById[t].player2_id].filter(Boolean) : []);
        const home = ids(f.home_team_id), away = ids(f.away_team_id);
        const gs = [...home, ...away].map(id => {
          const pk = picks.find(x => x.race_id === r.id && x.player_id === id);
          return num(pk && pk.pit_guess);
        }).filter(v => v != null && !isNaN(v));
        const line = gs.length ? avg(gs) : null;
        let ob = 0, ub = 0;
        if (line != null && stop != null) {
          if (stop > line) { ob = BB_WIN; ub = BB_LOSS; }
          else if (stop < line) { ob = BB_LOSS; ub = BB_WIN; }
        }
        const half = list => list.reduce((a, id) => {
          const row = rows.find(x => x.player_id === id);
          return a + (row ? TEAM_HALF(row) : 0);
        }, 0);
        const hT = half(home) + ob, aT = half(away) + ub;
        home.forEach(id => { wonBy[id] = hT > aT; });
        away.forEach(id => { wonBy[id] = aT > hT; });
      });
      if (!Object.keys(wonBy).length) return;

      rounds += 1;
      if (ladderR[0] && wonBy[ladderR[0].id] === false) topScorerLost += 1;
      ladderR.forEach(x => {
        const pl = placeR[x.id];
        if (pl >= myBandLo && pl <= myBandHi && wonBy[x.id] != null) {
          sameBandPlayed += 1;
          if (wonBy[x.id]) sameBandWon += 1;
        }
      });
    });

    return {
      rounds, topScorerLost,
      band: { lo: myBandLo, hi: myBandHi, won: sameBandWon, played: sameBandPlayed },
    };
  })();

  const context = {
    history,
    allPlay, luck, perfect, myHaul, poolBoard, leagueScores, bestSwap,
    tied: leagueScores.filter(t => !t.me && !t.beat && !t.lostTo).length,
    left: round1(perfect.total - myHaul),
    bestHaul: hauls[0], worstHaul: hauls[hauls.length - 1],
    mateHaul: mateId ? haulOf(scoreOf[mateId]) : null,
    mateFirst: mateId ? String(nameOf[mateId]).split(/\s+/)[0] : null,
    myBestPick: myPicksRanked[0] || null,
    myWorstPick: myPicksRanked[myPicksRanked.length - 1] || null,
    oppRank: rankOfTeam[oppTeam.id], teams: teamRank.length,
    weekVsSelf, teamStreak, teamRun, teamForm,
    closest: margins[0], biggest: margins[margins.length - 1],
  };

  /* ---------------------------------------------------------- 7. standings */

  // The team game resets at the half; the individual game runs all 23 rounds.
  const half = race.round >= FIRST_H2_ROUND
    ? { fromRound: FIRST_H2_ROUND, toRound: 99, label: "second half" }
    : { fromRound: 1, toRound: FIRST_H2_ROUND - 1, label: "first half" };
  const teamRows = buildTeamTable({ teams, races, scores, schedule },
    { fromRound: half.fromRound, toRound: half.toRound });
  const myRow = teamRows.find(r => r.id === myTeam.id) || null;
  const inDivision = myRow ? teamRows.filter(r => r.division === myRow.division) : [];
  const teamPlace = myRow ? inDivision.findIndex(r => r.id === myRow.id) + 1 : null;

  const sortedPlayers = seasonRows(race.round);
  const indPlaces = placesBy(sortedPlayers, r => r.avg);
  const indPlace = indPlaces[me.id];
  const myPlayerRow = sortedPlayers.find(r => r.id === me.id) || null;

  // Where the team sat in its division before this round, so the standings card
  // can show the move rather than only the destination.
  const teamPlaceBefore = (() => {
    if (race.round <= half.fromRound) return null;
    const before = buildTeamTable({ teams, races, scores, schedule },
      { fromRound: half.fromRound, toRound: race.round - 1 });
    const row = before.find(r => r.id === myTeam.id);
    if (!row) return null;
    const div = before.filter(r => r.division === row.division);
    return { place: div.findIndex(r => r.id === row.id) + 1, pts: row.pts };
  })();

  // The few rows either side of you in each table. A marker on a 48-wide track
  // sits in the same place whether you are 4th or 7th; the rows around you are
  // what somebody actually wants to see.
  const slice = (rows, meIdx, span = 2) => {
    const lo = Math.max(0, Math.min(rows.length - (span * 2 + 1), meIdx - span));
    return rows.slice(lo, lo + span * 2 + 1);
  };
  const indAll = sortedPlayers.map(r => ({
    id: r.id, name: r.name, photo: r.photo, nation: r.nation,
    place: indPlaces[r.id], pts: r.pts, avg: r.avg, races: r.races,
    me: r.id === me.id,
    was: placesBefore[r.id] || null,
    move: placesBefore[r.id] ? placesBefore[r.id] - indPlaces[r.id] : null,
  }));
  const indNeighbours = slice(indAll, indAll.findIndex(r => r.me));
  // The leader always shows, so the table has a top. When the reader is far
  // enough down that the two blocks would not touch, the gap is marked.
  const indLeader = indAll[0];
  const indGap = indNeighbours[0] && indNeighbours[0].place > 2;
  const divRows = myRow ? inDivision : [];
  // One either side is enough in a division of twelve. The individual table is
  // 48 deep, so that one keeps two.
  const teamAll = divRows.map((r, i) => ({
    id: r.id, name: r.name, code: r.code, logo: r.logo, nation: r.nation,
    place: i + 1, pts: r.pts, w: r.w, l: r.l, d: r.d,
    me: myRow && r.id === myRow.id, move: null,
  }));
  const teamNeighbours = myRow ? slice(teamAll, teamPlace - 1, 1) : [];
  const teamLeader = teamAll[0] || null;
  const teamGap = teamNeighbours[0] && teamNeighbours[0].place > 2;

  const card7 = {
    half: half.label,
    teamBefore: teamPlaceBefore,
    individualBefore: seasonBefore,
    indNeighbours, teamNeighbours,
    indLeader, indGap, teamLeader, teamGap,
    // The whole table, for the scrollable version.
    indAll, teamAll,
    team: myRow ? {
      name: myRow.name, code: myRow.code, logo: myRow.logo,
      place: teamPlace, of: inDivision.length,
      division: myRow.division, pts: myRow.pts,
      w: myRow.w, l: myRow.l, d: myRow.d,
    } : null,
    individual: myPlayerRow ? {
      place: indPlace, of: sortedPlayers.length,
      pts: myPlayerRow.pts, races: myPlayerRow.races, avg: myPlayerRow.avg,
    } : null,
    // Who is top of each, so a placing has something to be measured against.
    divisionLeader: inDivision[0] ? { name: inDivision[0].name, pts: inDivision[0].pts } : null,
    individualLeader: sortedPlayers[0] ? { name: sortedPlayers[0].name, pts: sortedPlayers[0].pts } : null,
  };

  /* --------------------------------------------------------- 8. next race */

  const next = nextRaceAfter({ races }, race.round);
  const card8 = {
    race: next ? {
      round: next.round, name: next.race_name,
      date: next.race_date, deadline: next.pick_deadline,
    } : null,
    // Pools are drawn by the Tuesday cron, so picks are not open the morning
    // this deck goes up. The button says so rather than opening an empty grid.
    poolReady: next ? Boolean((next.top_drivers || []).length && (next.mid_drivers || []).length) : false,
  };

  return {
    round: race.round, raceName: race.race_name, raceDate: race.race_date,
    // id and nation so card 4 can offer the flag and write the choice.
    // nation is the raw column, NOT nationById: null there means never
    // chosen, which is what the card needs to know to ask.
    player: { id: me.id, name: me.name, photo: me.photo_url || null,
              nation: me.nation === undefined ? null : me.nation },
    context,
    cards: [card1, card2, card3, card4, card5, card6, card7, card8],
    card1, card2, card3, card4, card5, card6, card7, card8,
  };
}

function teamCard(t) {
  // The code and the short name are what fit under a bar. Codes are part of the
  // URL scheme, so they come from teams.js rather than being cut from the name.
  return { id: t.id, name: t.name, logo: t.logo_url || null,
           code: codeOf(t.name), short: shortOf(t.name),
           nation: t.nation != null ? t.nation : staticTeamNationOf(t.name) };
}
