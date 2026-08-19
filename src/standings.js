// The drivers' championship, from our own data.
//
// There is no clean source for this, and every obvious one was tried:
//
//   OpenF1 has no standings endpoint. /v1/standings and /v1/driver_standings
//   both 404. It does have /v1/session_result with a points column, but for
//   2026 only three sessions carry one: Australia, and the China sprint and
//   race. Everything from Japan on is empty. Summing that looks like a table
//   and is a table of two race weekends.
//
//   results.finishing_order holds all 22 finishers for rounds 1 and 2 and only
//   the top 5 from round 3 on, because Admin slices the order before it writes
//   (Admin.jsx:668). So it pays 101 points a round for two rounds and 80 for
//   the other nine.
//
//   driver_pts in a score row holds five drivers, which is one player's picks.
//   The union across all 48 players is that round's pool, which is ten.
//
// So the table is both, layered: the finishing order first, which is exact for
// the positions it has, then any pool driver it did not already cover, whose
// points are exact too. That reaches 11 to 13 drivers a round rather than five.
//
// What it still cannot see is a driver who finished outside the top five and
// was not in the pool. Those are low scores by definition, but they are missing,
// so treat the tail of this table as approximate.

// F1 points for positions 1 to 10.
export const F1_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

/**
 * @param {object} db { results, scores, races } straight from Supabase
 * @param {(name: string) => string} canonical maps spellings onto ours
 * @returns {{name, points, rounds}[]} best first
 */
export function driverStandings(db, canonical = (n) => n) {
  const roundOf = {};
  (db.races || []).forEach(r => { roundOf[r.id] = r.round; });

  const points = {}, rounds = {};
  // Which drivers a round has already accounted for, so the second pass cannot
  // pay anyone twice.
  const covered = {};

  const add = (raceId, name, pts) => {
    const c = canonical(name);
    if (!c) return;
    const seen = (covered[raceId] ||= new Set());
    if (seen.has(c)) return;
    seen.add(c);
    points[c] = (points[c] || 0) + (pts || 0);
    rounds[c] = (rounds[c] || 0) + 1;
  };

  (db.results || []).forEach(r => {
    (r.finishing_order || []).forEach((name, i) => add(r.race_id, name, F1_POINTS[i] || 0));
  });

  (db.scores || []).forEach(s => {
    let dp = {};
    try { dp = JSON.parse(s.driver_pts || "{}"); } catch { dp = {}; }
    Object.entries(dp).forEach(([name, pts]) => add(s.race_id, name, pts));
  });

  return Object.entries(points)
    .map(([name, pts]) => ({ name, points: pts, rounds: rounds[name] }))
    // Ties break on name, so the order is the same on every run. Two drivers
    // level would otherwise swap between draws, and which band they land in
    // decides whether they can be picked at all.
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
}
