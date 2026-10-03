// One player's card, computed. Pure, no React and no Supabase, the same shape
// as playerTable.js and weekly.js: the modal renders what this returns and
// scripts/smoke-card.jsx renders it without a network.
import { buildPlayerTable, placesBy } from "./playerTable.js";
import { buildDrivingStyles } from "./drivingStyle.js";
import { careerOf, yearDescriptor } from "./history.js";
import { sloganOf } from "./slogans.js";
import { codeOf, displayOf } from "./teams.js";

const WIN = "\u{1F3C6}", P2 = "\u{1F948}", P3 = "\u{1F949}";

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

  const career = careerOf(name);
  const now = {
    year: 2026, pts: row.pts, place, wins: row.p1, podiums: row.p1 + row.p2 + row.p3,
    trophies: WIN.repeat(row.p1) + P2.repeat(row.p2) + P3.repeat(row.p3),
    topTens: row.top10, races: row.races, live: true, shared: false,
  };

  return {
    id: row.id, name, photo: row.photo, nation: row.nation,
    team,
    style,
    slogan: sloganOf(name),
    stats: {
      pts: row.pts, place, field: rows.length, avg: row.avg,
      wins: row.p1, podiums: row.p1 + row.p2 + row.p3, topTens: row.top10,
      races: row.races, last: row.last, lastPlace: row.lastPlace,
    },
    career: { ...career, seasons: [...career.seasons, now], years: yearDescriptor(name) },
  };
}
