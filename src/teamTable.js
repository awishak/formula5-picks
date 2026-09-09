// The team game, computed. Pure functions, no Supabase and no React.
//
// This math used to live only inside TeamStandings.jsx, welded to that
// component's state. Any second page that wanted a standings row had to
// reimplement the rules, which is how you end up with two copies that disagree by a
// point and nobody knowing which one is right. Same failure DRIVER_NAMES had
// before it moved into drivers.js.
//
// Feed it the four tables raw. It hands back one row per team.
import { codeOf, shortOf } from "./teams.js";

// Championship points, by finishing position within a division, per race.
export const TEAM_PTS_TABLE = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1, 0, 0];

// The team game resets here. Rounds 1-11 are the first half, 12-23 the second.
export const FIRST_H2_ROUND = 12;

// A player's contribution to the team score. Everything except the needle:
// pit_individual_pts is the individual game, pit_matchup_pts is the team's and
// is stored on player1's row only, so it is added once at the team level.
const playerPart = s =>
  (s.top_pick_pts || 0) + (s.midfield_pts || 0) + (s.order_bonus || 0) + (s.best_finish_bonus || 0);

// Which division a team is in depends on the half the race belongs to, because
// promotion and relegation happened between them.
const divisionAt = (team, round) =>
  round >= FIRST_H2_ROUND ? (team.division_h2 || team.division || "second") : (team.division || "second");

// The coin flip at the end of the tiebreak chain. Flipped from the team and race
// ids, so it is arbitrary between two teams and identical on every load. A flip
// that came out differently each time would be the bug this chain exists to fix.
const hash = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};
const flip = (a, b) =>
  hash(a.row.id + a.wk.raceId) - hash(b.row.id + b.wk.raceId);

/**
 * @param {object} db  { teams, races, scores, schedule } straight from Supabase
 * @param {object} opts { fromRound, toRound } inclusive round window
 * @returns rows sorted best first, each carrying its own division
 */
export function buildTeamTable(db, { fromRound = 1, toRound = 99, seed = null } = {}) {
  const teams = db.teams || [], races = db.races || [];
  const scores = db.scores || [], schedule = db.schedule || [];

  const roundOf = {};
  races.forEach(r => { roundOf[r.id] = r.round; });

  const scoreAt = {};
  scores.forEach(s => { scoreAt[`${s.player_id}_${s.race_id}`] = s; });

  // Only races that are both in the window and actually scored.
  const inWindow = [...new Set(scores.map(s => s.race_id))].filter(id => {
    const r = roundOf[id];
    return r >= fromRound && r <= toRound;
  }).sort((a, b) => roundOf[a] - roundOf[b]);

  const rows = teams.map(team => {
    const weeks = [];

    inWindow.forEach(raceId => {
      const s1 = scoreAt[`${team.player1_id}_${raceId}`];
      const s2 = scoreAt[`${team.player2_id}_${raceId}`];
      if (!s1 || !s2) return;

      const drivers = playerPart(s1) + playerPart(s2);
      const boxBox = s1.pit_matchup_pts || 0;
      const score = drivers + boxBox;
      // Tiebreak inputs. order_pts is dead in the table (every row is 0);
      // order_bonus is the live field, 6 a player for a perfect order.
      const orderPts = (s1.order_bonus || 0) + (s2.order_bonus || 0);
      const midPts = (s1.midfield_pts || 0) + (s2.midfield_pts || 0);
      const bestPlayer = Math.max(playerPart(s1), playerPart(s2));

      const fixture = schedule.find(m =>
        m.race_id === raceId && (m.home_team_id === team.id || m.away_team_id === team.id));
      if (!fixture) return;

      const oppId = fixture.home_team_id === team.id ? fixture.away_team_id : fixture.home_team_id;
      const opp = teams.find(t => t.id === oppId);
      if (!opp) return;
      const o1 = scoreAt[`${opp.player1_id}_${raceId}`], o2 = scoreAt[`${opp.player2_id}_${raceId}`];
      if (!o1 || !o2) return;

      const oppDrivers = playerPart(o1) + playerPart(o2);
      const oppScore = oppDrivers + (o1.pit_matchup_pts || 0);
      const won = score > oppScore ? true : score < oppScore ? false : null;

      // The week turned on BOX BOX when the drivers alone did not separate them.
      // Its full swing
      // is 6 (winner +5, loser -1), so any driver margin inside 6 was live.
      const decidedByBoxBox = Math.abs(drivers - oppDrivers) <= 6;

      weeks.push({
        raceId, round: roundOf[raceId], score, oppScore, oppId, won,
        boxBoxWon: boxBox > 0, decidedByBoxBox,
        // What the score is made of. The schedule shows the two players and
        // the BOX BOX under each total, and it reads them from here rather
        // than adding the same three numbers up a second time somewhere else.
        parts: { p1: playerPart(s1), p2: playerPart(s2), boxBox },
        orderPts, midPts, bestPlayer,
        // home_team_id IS the OVER seat. Home carries no other meaning.
        over: fixture.home_team_id === team.id,
        teamPts: 0,
      });
    });

    const played = weeks.length;
    const w = weeks.filter(x => x.won === true).length;
    const l = weeks.filter(x => x.won === false).length;
    const d = weeks.filter(x => x.won === null).length;
    const bb = weeks.filter(x => x.decidedByBoxBox);

    return {
      id: team.id,
      name: team.name,
      nation: team.nation != null ? team.nation : null,
      code: codeOf(team.name),
      short: shortOf(team.name),
      logo: team.logo_url,
      p1Id: team.player1_id, p2Id: team.player2_id,
      division: divisionAt(team, toRound >= FIRST_H2_ROUND ? FIRST_H2_ROUND : 1),
      weeks, played, w, l, d,
      pts: 0,
      avg: played ? Math.round((weeks.reduce((a, x) => a + x.score, 0) / played) * 10) / 10 : 0,
      // Q4, answered: the BOX BOX line is a record in the matchups that turned on it,
      // not a count of pit guesses that landed.
      bbW: bb.filter(x => x.won === true).length,
      bbL: bb.filter(x => x.won === false).length,
      bbPlayed: bb.length,
    };
  });

  // Championship points are ranked inside a division, race by race.
  inWindow.forEach(raceId => {
    const round = roundOf[raceId];
    ["championship", "second"].forEach(div => {
      const inDiv = rows.filter(r => {
        const t = teams.find(x => x.id === r.id);
        return divisionAt(t, round) === div;
      });
      const results = inDiv.map(r => {
        const wk = r.weeks.find(x => x.raceId === raceId);
        return wk ? { row: r, wk } : null;
      }).filter(Boolean);

      // Winners first, then draws, then losers, each block ordered by the
      // tiebreak chain below. Nobody shares a place: the chain runs until one
      // team is above the other.
      //
      // This exists because score alone left the order to whatever sequence
      // Postgres handed back. The query has no ORDER BY, heap order is not
      // stable, and an UPDATE rewrites a row to the end of the heap, so adding
      // the division_h2 column silently reshuffled 45 championship points
      // across ten tied places in the first half. A rule fixes that; a better
      // sort key would not have.
      //
      // Andrew's chain, set for the second half:
      //   1. score
      //   2. BOX BOX. On a WIN the team that did NOT win BOX BOX goes ahead,
      //      because BOX BOX swings 6 and a team level without it picked six
      //      points better. On a DRAW it is the other way round: winning BOX
      //      BOX is the thing that separates two teams who could not be
      //      separated on the day.
      //   3. margin of victory
      //   4. order points, both players
      //   5. midfield points, both players
      //   6. the better of the two players
      //   7. coin flip
      const rest = (a, b) =>
        ((b.wk.score - b.wk.oppScore) - (a.wk.score - a.wk.oppScore)) ||
        (b.wk.orderPts - a.wk.orderPts) ||
        (b.wk.midPts - a.wk.midPts) ||
        (b.wk.bestPlayer - a.wk.bestPlayer) ||
        flip(a, b);
      const onWin = (a, b) => (b.wk.score - a.wk.score) || (a.wk.boxBoxWon - b.wk.boxBoxWon) || rest(a, b);
      const onDraw = (a, b) => (b.wk.boxBoxWon - a.wk.boxBoxWon) || rest(a, b);

      const ranked = [
        ...results.filter(x => x.wk.won === true).sort(onWin),
        ...results.filter(x => x.wk.won === null).sort(onDraw),
        ...results.filter(x => x.wk.won === false).sort(onWin),
      ];

      ranked.forEach((x, k) => {
        const pts = TEAM_PTS_TABLE[k] ?? 0;
        x.row.pts += pts;
        x.wk.teamPts = pts;
      });
    });
  });

  // seed is a map of team id to a preseason number, used only once everything
  // above it is level. Before the first race of a half that is every team, and
  // without it the table falls through to alphabetical order, which reads as a
  // ranking nobody earned. The second half seeds on first-half scoring average.
  const seedOf = id => (seed && seed[id] != null ? seed[id] : 0);
  rows.sort((a, b) =>
    b.pts - a.pts || b.w - a.w || b.avg - a.avg ||
    seedOf(b.id) - seedOf(a.id) || a.name.localeCompare(b.name));
  return rows;
}

// Scoring-average rank is across all 24 teams, never within a division.
export function rankByAverage(rows) {
  return [...rows].sort((a, b) => b.avg - a.avg).map((r, i) => ({ ...r, avgRank: i + 1 }));
}

// The next fixture for every team: the earliest round in the window that has a
// schedule row and no scores yet.
export function nextFixtures(db, fromRound = FIRST_H2_ROUND) {
  const races = (db.races || []).filter(r => r.round >= fromRound).sort((a, b) => a.round - b.round);
  const scored = new Set((db.scores || []).map(s => s.race_id));
  const race = races.find(r => !scored.has(r.id));
  if (!race) return { race: null, opponentOf: {}, overOf: {} };

  const opponentOf = {}, overOf = {};
  (db.schedule || []).filter(m => m.race_id === race.id).forEach(m => {
    opponentOf[m.home_team_id] = m.away_team_id;
    opponentOf[m.away_team_id] = m.home_team_id;
    overOf[m.home_team_id] = true;   // home_team_id IS the OVER seat
    overOf[m.away_team_id] = false;
  });
  return { race, opponentOf, overOf };
}

export const ordinal = n => {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

// The tiebreak chain in one place, for the rules page and the glossary.
export const TIEBREAKS = [
  "Matchup score",
  "BOX BOX: on a win the team that did not win BOX BOX goes ahead, on a draw the team that did",
  "Margin of victory",
  "Order points",
  "Midfield points",
  "The better of the two players",
  "Coin flip",
];

/* ------------------------------------------------------------ power rankings */

// The team Power Index. Not the standings: the standings answer who has the
// most championship points in their division, and this answers who you would
// least like to draw next week, across all 24 teams.
//
// Five parts, weights set by Andrew 2026-09-09, summing to 1:
//
//   season   the team's scoring average across every round played this year,
//            drivers plus BOX BOX, the same number /teams ranks on
//   last 5   the same average over the last five rounds: form
//   last 2   and over the last two: the twitch
//   wins     wins in the last five, a draw counting half, out of five
//   schedule the scoring average of the last five opponents, stretched so the
//            easiest schedule in the league scores 0 and the hardest scores
//            the full weight. Plain division by PERFECT_WEEK moved nobody:
//            every team's opponents average within twelve points of each
//            other, which is one rating point at this weight.
//
// A perfect week is 100 points. A team on 100 has scored 100 a week all season,
// won its last five, and played the hardest schedule in the league. The best
// week anybody has posted is 121, so 100 is high and reachable. Fixed rather
// than taken from the data so a 75 in round 14 means the same thing in round 22.
//
// The schedule part's ends are set by whoever has the easiest and hardest run
// that week, so a team's schedule score can move when somebody else's schedule
// changes. That is the price of a part that always reaches both ends.
export const PERFECT_WEEK = 100;
export const POWER_WEIGHTS = [
  { key: "season",   weight: 0.30, label: "season average" },
  { key: "last5",    weight: 0.20, label: "last 5 average" },
  { key: "last2",    weight: 0.20, label: "last 2 average" },
  { key: "wins",     weight: 0.20, label: "wins in the last 5" },
  { key: "schedule", weight: 0.10, label: "strength of schedule" },
];
const W = Object.fromEntries(POWER_WEIGHTS.map(p => [p.key, p.weight]));

const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const r1 = n => Math.round(n * 10) / 10;

// One team's parts at a cutoff. Exported for the peek script; the page reads
// buildTeamPower.
function powerParts(row, seasonAvgOf) {
  const weeks = row.weeks.slice().sort((a, b) => a.round - b.round);
  const sc = weeks.map(w => w.score);
  const last5 = weeks.slice(-5);
  const wins = last5.reduce((a, w) => a + (w.won === true ? 1 : w.won === null ? 0.5 : 0), 0);
  return {
    season: mean(sc),
    last5: mean(sc.slice(-5)),
    last2: mean(sc.slice(-2)),
    wins,
    // A week whose opponent has no average yet counts nothing, which cannot
    // happen once a round is scored: both teams in a matchup are scored together.
    oppAvg: mean(last5.map(w => seasonAvgOf[w.oppId] || 0)),
    form: last5.map(w => ({ round: w.round, won: w.won, score: w.score, oppScore: w.oppScore, oppId: w.oppId, boxBoxWon: w.boxBoxWon, decidedByBoxBox: w.decidedByBoxBox, parts: w.parts })),
  };
}

/**
 * @param {object} db  { teams, races, scores, schedule } straight from Supabase
 * @param {object} opts { toRound } the round the index is built for; defaults
 *                 to the last scored round. Built twice, this round and the one
 *                 before, so a place carries its own move.
 * @returns { rows, round, weights, perfect, easiest, hardest }
 */
export function buildTeamPower(db, { toRound = null } = {}) {
  const races = db.races || [], scores = db.scores || [];
  const roundOf = {}; races.forEach(r => { roundOf[r.id] = r.round; });
  const scoredRounds = [...new Set(scores.map(s => roundOf[s.race_id]).filter(Boolean))].sort((a, b) => a - b);
  const round = toRound != null ? toRound : (scoredRounds[scoredRounds.length - 1] || 0);

  const at = cutoff => {
    const table = buildTeamTable(db, { fromRound: 1, toRound: cutoff });
    const seasonAvgOf = {}; table.forEach(t => { seasonAvgOf[t.id] = mean(t.weeks.map(w => w.score)); });
    const rows = table.map(t => ({ row: t, parts: powerParts(t, seasonAvgOf) }));
    const opps = rows.map(r => r.parts.oppAvg);
    const lo = Math.min(...opps), hi = Math.max(...opps);
    const spread = hi - lo;
    return rows.map(({ row, parts }) => {
      // Each part is a fraction of perfect, then weighted. Schedule is the one
      // part scaled to the league rather than to the perfect week.
      const schedule = spread > 0 ? (parts.oppAvg - lo) / spread : 0;
      const pieces = {
        season: W.season * parts.season / PERFECT_WEEK,
        last5: W.last5 * parts.last5 / PERFECT_WEEK,
        last2: W.last2 * parts.last2 / PERFECT_WEEK,
        wins: W.wins * parts.wins / 5,
        schedule: W.schedule * schedule,
      };
      const rating = 100 * Object.values(pieces).reduce((a, b) => a + b, 0);
      return {
        id: row.id, name: row.name, short: row.short, code: row.code, logo: row.logo,
        nation: row.nation, division: row.division,
        p1Id: row.p1Id, p2Id: row.p2Id,
        w: row.w, l: row.l, d: row.d, played: row.played,
        rating: r1(rating),
        // The five parts as they were measured, for the row and the write-up.
        season: r1(parts.season), last5: r1(parts.last5), last2: r1(parts.last2),
        wins: parts.wins, oppAvg: r1(parts.oppAvg),
        // The schedule part on its own 0 to 10 scale, which is what the page prints.
        schedule: r1(100 * pieces.schedule),
        form: parts.form,
        last: row.weeks[row.weeks.length - 1] || null,
      };
    }).sort((a, b) => (b.rating - a.rating) || a.name.localeCompare(b.name))
      .map((r, i) => ({ ...r, place: i + 1 }));
  };

  const rows = at(round);
  const before = round > 1 ? at(round - 1) : [];
  const wasAt = {}; before.forEach(r => { wasAt[r.id] = r.place; });
  rows.forEach(r => {
    r.was = wasAt[r.id] || null;
    // Up is a smaller number, so the move is the old place minus the new.
    r.move = r.was ? r.was - r.place : null;
  });
  // Schedule rank across the league: 1 is the hardest run of opponents.
  const bySched = rows.slice().sort((a, b) => b.oppAvg - a.oppAvg);
  const schedRank = {}; bySched.forEach((r, i) => { schedRank[r.id] = i + 1; });
  rows.forEach(r => { r.schedRank = schedRank[r.id]; });

  const opps = rows.map(r => r.oppAvg);
  return {
    rows, round, weights: POWER_WEIGHTS, perfect: PERFECT_WEEK,
    easiest: Math.min(...opps), hardest: Math.max(...opps),
  };
}
