// One player's card, computed. Pure, no React and no Supabase, the same shape
// as playerTable.js and weekly.js: the modal renders what this returns and
// scripts/smoke-card.jsx renders it without a network.
import { buildPlayerTable, placesBy } from "./playerTable.js";
import { buildDrivingStyles } from "./drivingStyle.js";
import { careerOf, yearDescriptor, LEAGUE_PPR, gpName } from "./history.js";
import { sloganOf } from "./slogans.js";
import { codeOf, displayOf } from "./teams.js";

/**
 * @param {object} db { players, teams, races, scores, picks }
 * @param {string} name the player's name as the players table has it
 */
export function buildPlayerCard(db, name) {
  const rows = buildPlayerTable(db);
  const row = rows.find(r => r.name === name);
  if (!row) return null;
  const place = placesBy(rows, r => r.avg)[row.id];
  const styles = buildDrivingStyles(db);
  const style = styles.byId[row.id];

  const teamRow = (db.teams || []).find(t => t.id === row.teamId) || null;
  const team = teamRow ? {
    name: displayOf(teamRow.name), code: codeOf(teamRow.name),
    logo: teamRow.logo_url || null,
    division: teamRow.division_h2 || teamRow.division || null,
  } : null;

  // The league's scoring level this year, every point over every player-race,
  // the same sum LEAGUE_PPR holds for the years on paper.
  const totalPts = rows.reduce((a, r) => a + r.pts, 0);
  const totalRaces = rows.reduce((a, r) => a + r.races, 0);
  const levelNow = totalRaces ? totalPts / totalRaces : 0;

  const career = careerOf(name);
  // A prior year's points a race, put on this year's footing: scaled by this
  // year's level over that year's. Andrew, 2026-10-02: compare each year's
  // average to 2026's and adjust. The raw figure stays on the row as `ppr`.
  const prior = career.seasons.map(s => {
    const lvl = LEAGUE_PPR[s.year];
    const pprAdj = lvl && levelNow ? Math.round(s.ppr * (levelNow / lvl) * 10) / 10 : s.ppr;
    return { ...s, pprAdj, adjusted: true };
  });
  // This season, in the same shape as a prior one. A podium is first, second
  // or third; the table's top tens are not one.
  // The race's own name off the races table, the way the sheets' rounds carry
  // theirs, so round 16 reads as the Bahrain Grand Prix it is.
  const raceName = {};
  (db.races || []).forEach(r => { raceName[r.round] = r.race_name || null; });
  const finishes = row.finishes.filter(f => f.place <= 3)
    .map(f => ({ round: f.round, place: f.place, where: f.where,
      race: raceName[f.round] || gpName(f.where), score: f.score }));
  const now = {
    year: 2026, pts: row.pts, place, wins: row.p1, podiums: finishes.length,
    races: row.races, ppr: row.avg, pprAdj: row.avg, adjusted: false,
    // Nobody is champion of a season still running.
    champion: false,
    finishes, extras: [], topTens: row.top10, live: true, shared: false,
  };
  const seasons = [...prior, now];

  return {
    id: row.id, name, photo: row.photo, nation: row.nation,
    team,
    style,
    slogan: sloganOf(name),
    stats: {
      pts: row.pts, place, field: rows.length, avg: row.avg,
      wins: row.p1, podiums: finishes.length, topTens: row.top10,
      races: row.races, last: row.last, lastPlace: row.lastPlace,
    },
    career: {
      ...career, seasons, years: yearDescriptor(name),
      // Every podium of their career, oldest first, with the trophies that
      // are not a podium after them.
      podiums: seasons.flatMap(s => s.finishes.map(f => ({ ...f, year: s.year }))),
      extras: seasons.flatMap(s => s.extras.map(m => ({ mark: m, year: s.year }))),
      total: seasons.reduce((a, s) => a + s.podiums, 0),
      wins: seasons.reduce((a, s) => a + s.wins, 0),
      level: { now: levelNow, ...LEAGUE_PPR },
      // The years they were World Champion, under the team name on the card.
      titles: seasons.filter(s => s.champion).map(s => s.year),
    },
  };
}
