// The individual game, computed. Pure, no Supabase and no React, for the same
// reason teamTable.js is: two pages rendering a standings row from two copies of
// the rules is how they end up disagreeing by a point.
import { codeOf } from "./teams.js";

// A player's score for a race. Wider than the team score, which leaves out the
// needle and the weekly bonus: those are the individual game.
const totalOf = s =>
  (s.top_pick_pts || 0) + (s.midfield_pts || 0) + (s.order_bonus || 0) +
  (s.best_finish_bonus || 0) + (s.pit_individual_pts || 0) + (s.weekly_bonus_pts || 0);

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
      teamId: t ? t.id : null,
      // The full name, not the short one. This line has it to itself.
      teamName: t ? t.name : null,
      teamCode: t ? codeOf(t.name) : null,
      pts: 0, races: 0, avg: 0,
      // Where they finished among all 48 that week.
      p1: 0, p2: 0, p3: 0, top10: 0,
      last: null, lastRound: null,
      byRace: {},
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
      if (place === 1) r.p1++;
      else if (place === 2) r.p2++;
      else if (place === 3) r.p3++;
      else if (place <= 10) r.top10++;
    });
  });

  const lastRace = scoredRaces[scoredRaces.length - 1];
  rows.forEach(r => {
    r.avg = r.races ? Math.round((r.pts / r.races) * 10) / 10 : 0;
    r.last = lastRace != null && r.byRace[lastRace] != null ? r.byRace[lastRace] : null;
    r.lastRound = lastRace != null ? roundOf[lastRace] : null;
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
