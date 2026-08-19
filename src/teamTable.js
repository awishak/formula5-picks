// The team game, computed. Pure functions, no Supabase and no React.
//
// This math used to live only inside TeamStandings.jsx, welded to that
// component's state. Any second page that wanted a standings row had to
// reimplement it, which is how you end up with two copies that disagree by a
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

      // BOX BOX decided it when the drivers alone would not have. Its full swing
      // is 6 (winner +5, loser -1), so any driver margin inside 6 was live.
      const decidedByBoxBox = Math.abs(drivers - oppDrivers) <= 6;

      weeks.push({
        raceId, round: roundOf[raceId], score, oppScore, oppId, won,
        boxBoxWon: boxBox > 0, decidedByBoxBox,
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
      code: codeOf(team.name),
      short: shortOf(team.name),
      logo: team.logo_url,
      p1Id: team.player1_id, p2Id: team.player2_id,
      division: divisionAt(team, toRound >= FIRST_H2_ROUND ? FIRST_H2_ROUND : 1),
      weeks, played, w, l, d,
      pts: 0,
      avg: played ? Math.round((weeks.reduce((a, x) => a + x.score, 0) / played) * 10) / 10 : 0,
      // Q4, answered: the BOX BOX line is a record in the matchups it decided,
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

      // Winners first by score, then draws, then losers by score. A draw where
      // the team won BOX BOX outranks a draw where it did not.
      //
      // Every sort below ends on team name. That is not cosmetic. Two teams in a
      // division can post the identical score in the same race (it happened 36
      // times in the first half), and score alone leaves their order to whatever
      // sequence Postgres handed back, which has no ORDER BY and is not stable.
      // The same table could rank them differently on two page loads and hand
      // one of them 18 points instead of 15. Ties break on margin of victory,
      // then on BOX BOX, then on name, so the answer is the same every time.
      const cmp = (a, b) =>
        (b.wk.score - a.wk.score) ||
        ((b.wk.score - b.wk.oppScore) - (a.wk.score - a.wk.oppScore)) ||
        (b.wk.boxBoxWon - a.wk.boxBoxWon) ||
        a.row.name.localeCompare(b.row.name);
      const winners = results.filter(x => x.wk.won === true).sort(cmp);
      const draws = results.filter(x => x.wk.won === null)
        .sort((a, b) => (b.wk.boxBoxWon - a.wk.boxBoxWon) || cmp(a, b));
      const losers = results.filter(x => x.wk.won === false).sort(cmp);
      const ranked = [...winners, ...draws, ...losers];

      let i = 0;
      while (i < ranked.length) {
        // Teams that drew and are level on the BOX BOX tiebreak share the points
        // for the places they occupy, rather than one of them taking the higher.
        let end = i + 1;
        if (ranked[i].wk.won === null) {
          while (end < ranked.length && ranked[end].wk.won === null &&
                 ranked[end].wk.boxBoxWon === ranked[i].wk.boxBoxWon) end++;
        }
        const size = end - i;
        let pool = 0;
        for (let k = i; k < end; k++) pool += TEAM_PTS_TABLE[k] ?? 0;
        const each = size > 1 ? pool / size : (TEAM_PTS_TABLE[i] ?? 0);
        for (let k = i; k < end; k++) {
          ranked[k].row.pts += each;
          ranked[k].wk.teamPts = each;
        }
        i = end;
      }
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
