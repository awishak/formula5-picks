// The individual game, computed. Pure, no Supabase and no React, for the same
// reason teamTable.js is: two pages rendering a standings row from two copies of
// the rules is how they end up disagreeing by a point.
import { codeOf, displayOf } from "./teams.js";

// A player's score for a race. Wider than the team score, which leaves out the
// needle and the weekly bonus: those are the individual game.
const totalOf = s =>
  (s.top_pick_pts || 0) + (s.midfield_pts || 0) + (s.order_bonus || 0) +
  (s.best_finish_bonus || 0) + (s.pit_individual_pts || 0) + (s.weekly_bonus_pts || 0);

// What to call a race in one word. Rounds 7 and 14 are both the Spanish Grand
// Prix, so the label comes from the round rather than the name.
export const RACE_LABEL = {
  1: "Australia", 2: "China", 3: "Japan", 4: "Miami", 5: "Canada", 6: "Monaco",
  7: "Spain", 8: "Austria", 9: "Britain", 10: "Belgium", 11: "Hungary",
  12: "Netherlands", 13: "Italy", 14: "Madrid", 15: "Azerbaijan", 16: "Bahrain",
  17: "Singapore", 18: "USA", 19: "Mexico", 20: "S\u00e3o Paulo",
  21: "Las Vegas", 22: "Qatar", 23: "Abu Dhabi",
};

// How many races "recent form" covers.
export const FORM_RACES = 5;

/**
 * Individual standings across every scored race. The individual game runs all
 * 23 rounds and does not reset at the half, so there is no round window here.
 *
 * @param {object} db { players, teams, races, scores }
 */
export function buildPlayerTable(db) {
  const players = db.players || [], teams = db.teams || [];
  const races = db.races || [], scores = db.scores || [];

  const roundOf = {};
  races.forEach(r => { roundOf[r.id] = r.round; });

  const teamOf = {};
  teams.forEach(t => {
    [t.player1_id, t.player2_id].forEach(pid => { if (pid) teamOf[pid] = t; });
  });

  const rows = players.map(p => {
    const t = teamOf[p.id];
    return {
      id: p.id, name: p.name, photo: p.photo_url || null,
      // null means never chosen and "" means chose no flag. Both render as no
      // flag; only the column knows the difference, and only the picker cares.
      nation: p.nation != null ? p.nation : null,
      teamNation: t && t.nation != null ? t.nation : null,
      teamId: t ? t.id : null,
      // Full names. Two teams carry a shorter display name in teams.js because
      // they are the only ones that will not fit written out.
      teamName: t ? displayOf(t.name) : null,
      teamCode: t ? codeOf(t.name) : null,
      pts: 0, races: 0, avg: 0,
      // Where they finished among all 48 that week.
      p1: 0, p2: 0, p3: 0, top10: 0,
      last: null, lastRound: null, lastPlace: null,
      // Every top ten, in the order they happened, for the trophy case.
      finishes: [],
      formAvg: 0, formRank: null,
      byRace: {}, placeByRace: {},
    };
  });
  const byId = Object.fromEntries(rows.map(r => [r.id, r]));

  scores.forEach(s => {
    const r = byId[s.player_id];
    if (!r || roundOf[s.race_id] == null) return;
    const total = totalOf(s);
    r.pts += total;
    r.races += 1;
    r.byRace[s.race_id] = total;
  });

  // Trophies are a placing among everyone who scored that week, worked out race
  // by race. A dot is a top ten that was not a podium, so nothing is counted
  // twice when the marks are drawn.
  const scoredRaces = [...new Set(scores.map(s => s.race_id))]
    .filter(id => roundOf[id] != null)
    .sort((a, b) => roundOf[a] - roundOf[b]);

  scoredRaces.forEach(raceId => {
    const week = rows
      .filter(r => r.byRace[raceId] != null)
      .map(r => ({ r, score: r.byRace[raceId] }))
      // Same problem the team table had: equal scores must not be left to row
      // order. Name is arbitrary but it is the same answer every time.
      .sort((a, b) => (b.score - a.score) || a.r.name.localeCompare(b.r.name));
    week.forEach(({ r }, i) => {
      const place = i + 1;
      r.placeByRace[raceId] = place;
      if (place === 1) r.p1++;
      else if (place === 2) r.p2++;
      else if (place === 3) r.p3++;
      else if (place <= 10) r.top10++;
      if (place <= 10) {
        r.finishes.push({
          round: roundOf[raceId], place,
          where: RACE_LABEL[roundOf[raceId]] || `Round ${roundOf[raceId]}`,
          score: r.byRace[raceId],
        });
      }
    });
  });

  const lastRace = scoredRaces[scoredRaces.length - 1];
  // Recent form: the last five scored races, or all of them if fewer.
  const form = scoredRaces.slice(-FORM_RACES);
  rows.forEach(r => {
    r.avg = r.races ? Math.round((r.pts / r.races) * 10) / 10 : 0;
    r.last = lastRace != null && r.byRace[lastRace] != null ? r.byRace[lastRace] : null;
    r.lastRound = lastRace != null ? roundOf[lastRace] : null;
    r.lastPlace = lastRace != null ? (r.placeByRace[lastRace] ?? null) : null;
    r.finishes.sort((a, b) => a.round - b.round);
    const got = form.filter(id => r.byRace[id] != null);
    r.formAvg = got.length
      ? Math.round((got.reduce((a, id) => a + r.byRace[id], 0) / got.length) * 10) / 10
      : 0;
    r.formRaces = got.length;
  });
  // Rank on recent form, across everyone, the same way the season rank works.
  [...rows].sort((a, b) => b.formAvg - a.formAvg || a.name.localeCompare(b.name))
    .forEach((r, i, arr) => {
      r.formRank = (i > 0 && arr[i - 1].formAvg === r.formAvg) ? arr[i - 1].formRank : i + 1;
    });

  // Ranked on scoring average, because that is the number the page leads with.
  // Everyone has played every race so far, so this is the same order as total
  // points; it stops being the same the first time somebody misses one.
  rows.sort((a, b) => b.avg - a.avg || b.pts - a.pts || a.name.localeCompare(b.name));
  return rows;
}

// Standard competition ranking: level players share a place and the next one
// skips. Everybody on nought is everybody in first.
export function placesBy(rows, key) {
  const place = {};
  rows.forEach((r, i) => {
    place[r.id] = (i > 0 && key(rows[i - 1]) === key(r)) ? place[rows[i - 1].id] : i + 1;
  });
  return place;
}
