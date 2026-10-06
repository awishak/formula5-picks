// One team's card, computed. Pure, no React and no Supabase, the same shape as
// playerCard.js: the modal renders what this returns and scripts/smoke-card.jsx
// renders it without a network.
//
// Every number here comes out of teamTable.js, the way /teams gets its own, so
// the card and the standings cannot disagree about a record or a place.
import { buildTeamTable, rankByAverage, FIRST_H2_ROUND } from "./teamTable.js";
import { codeOf, displayOf, shortOf } from "./teams.js";
import { TEAM_LORE } from "./teamLore.js";

export const DIV_NAME = { championship: "Championship", second: "Second Division" };

const recordOf = (w, l, d) => (d > 0 ? `${w}-${l}-${d}` : `${w}-${l}`);

// Places share on level points, the same rule /teams uses, so the two never
// disagree. Everybody on nought is everybody in first.
function placesIn(rows) {
  const out = {};
  ["championship", "second"].forEach(div => {
    const list = rows.filter(r => r.division === div);
    list.forEach((r, i) => {
      out[r.id] = (i > 0 && list[i - 1].pts === r.pts) ? out[list[i - 1].id] : i + 1;
    });
  });
  return out;
}

/**
 * @param {object} db { players, teams, races, scores, schedule }
 * @param {string} teamId
 */
export function buildTeamCard(db, teamId) {
  const teams = db.teams || [], players = db.players || [];
  const team = teams.find(t => t.id === teamId);
  if (!team) return null;
  const races = (db.races || []).filter(r => r.season == null || r.season === 2026);
  const dbx = { ...db, races };

  // Records and scoring average run the whole season; championship points are
  // the second half only, because the team game resets at the break.
  const season = buildTeamTable(dbx, { fromRound: 1, toRound: 99 });
  const seed = Object.fromEntries(season.map(r => [r.id, r.avg]));
  const half = buildTeamTable(dbx, { fromRound: FIRST_H2_ROUND, toRound: 99, seed });
  const first = buildTeamTable(dbx, { fromRound: 1, toRound: FIRST_H2_ROUND - 1 });
  const row = season.find(r => r.id === teamId);
  const h = half.find(r => r.id === teamId);
  const f = first.find(r => r.id === teamId);
  const avgRank = (rankByAverage(season).find(r => r.id === teamId) || {}).avgRank || null;

  // Who carried what. A player's share of the points the two of them put on
  // the board, BOX BOX left out: it is the team's, scored once, and nobody's
  // in particular.
  const p1 = row ? row.weeks.reduce((a, w) => a + w.parts.p1, 0) : 0;
  const p2 = row ? row.weeks.reduce((a, w) => a + w.parts.p2, 0) : 0;
  const both = p1 + p2;
  const seat = (id, pts) => {
    const p = players.find(x => x.id === id);
    return p ? {
      id, name: p.name, photo: p.photo_url || null, nation: p.nation != null ? p.nation : null,
      pts, share: both ? Math.round((pts / both) * 100) : null,
    } : null;
  };
  const seats = [seat(team.player1_id, p1), seat(team.player2_id, p2)].filter(Boolean);
  // Rounded separately, the two can come to 99 or 101. The bigger share takes
  // the difference, so the pair always reads as one whole.
  if (seats.length === 2 && seats[0].share != null) {
    const big = seats[0].share >= seats[1].share ? 0 : 1;
    seats[big].share = 100 - seats[1 - big].share;
  }

  // BOX BOX, a win, a loss or a push each week. Pushed when the stop landed
  // on the line or there was no stop.
  const weeks = row ? row.weeks : [];
  const bb = {
    won: weeks.filter(w => w.parts.boxBox > 0).length,
    lost: weeks.filter(w => w.parts.boxBox < 0).length,
    push: weeks.filter(w => w.parts.boxBox === 0).length,
  };

  // Every round, played or not: a result where there is one, the fixture
  // where there is not. Round 23 is undrawn until 22 is scored, so it is
  // simply absent until then.
  const byId = Object.fromEntries(teams.map(t => [t.id, t]));
  const weekOf = Object.fromEntries(weeks.map(w => [w.raceId, w]));
  const games = races.slice().sort((a, b) => a.round - b.round).map(r => {
    const fx = (db.schedule || []).find(m => m.race_id === r.id &&
      (m.home_team_id === teamId || m.away_team_id === teamId));
    if (!fx) return null;
    const oppId = fx.home_team_id === teamId ? fx.away_team_id : fx.home_team_id;
    const opp = byId[oppId];
    const w = weekOf[r.id];
    return {
      round: r.round, race: r.race_name || null, date: r.race_date || null,
      // home_team_id IS the OVER seat.
      side: fx.home_team_id === teamId ? "OVER" : "UNDER",
      opp: opp ? { id: opp.id, short: shortOf(opp.name), code: codeOf(opp.name), logo: opp.logo_url || null } : null,
      played: Boolean(w),
      score: w ? w.score : null, oppScore: w ? w.oppScore : null,
      won: w ? w.won : null,
      boxBox: w ? w.parts.boxBox : null,
      teamPts: w && r.round >= FIRST_H2_ROUND ? w.teamPts : null,
    };
  }).filter(Boolean);

  // The first half as it was played, and which way the break moved them.
  const divNow = team.division_h2 || team.division || null;
  const divThen = team.division || null;
  const firstPlace = placesIn(first)[teamId] || null;
  const moved = divThen && divNow && divThen !== divNow
    ? (divNow === "championship" ? "promoted" : "relegated") : null;

  const code = codeOf(team.name);
  return {
    id: team.id, name: displayOf(team.name), fullName: team.name, short: shortOf(team.name),
    code, logo: team.logo_url || null, nation: team.nation != null ? team.nation : null,
    division: divNow,
    seats,
    season: {
      played: row ? row.played : 0,
      record: row ? recordOf(row.w, row.l, row.d) : "0-0",
      w: row ? row.w : 0, l: row ? row.l : 0, d: row ? row.d : 0,
      avg: row ? row.avg : 0, avgRank, teams: season.length,
      bb,
    },
    half: h ? {
      record: recordOf(h.w, h.l, h.d), pts: h.pts, place: placesIn(half)[teamId] || null,
    } : null,
    games,
    history: {
      lore: TEAM_LORE[code] || null,
      firstHalf: f && f.played ? {
        division: divThen, place: firstPlace, pts: f.pts, record: recordOf(f.w, f.l, f.d),
      } : null,
      moved,
    },
  };
}
