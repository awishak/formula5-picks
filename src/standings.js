// The drivers' championship, from real race results.
//
// OpenF1 has no standings endpoint (/v1/standings and /v1/driver_standings both
// 404) and its session_result carries points for only three 2026 sessions:
// Australia, and the China sprint and race. Everything from Japan on is empty.
//
// /v1/position is populated for every session. The last position record for a
// driver is where they finished, and that reproduces the official Australia
// result exactly: all 22, same order, checked before this was relied on.
//
// Our own results.finishing_order cannot do it either. Admin sliced the order
// to five before writing (fixed 2026-08-19), so rounds 3 to 11 are missing
// positions 6 to 22, which is most of what the pool bands need.
//
// Sprints count and pay a different table.

const API = "https://api.openf1.org/v1";

export const RACE_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
export const SPRINT_POINTS = [8, 7, 6, 5, 4, 3, 2, 1];

const sleep = ms => new Promise(r => setTimeout(r, ms));

// OpenF1 rate limits, and it answers 429 rather than failing outright. That is
// what was behind two runs a minute apart counting 14 races and then 12: the
// loop was being throttled and the drops were being swallowed. A race missing
// from the table is a table that is simply wrong, and wrong standings draw
// wrong pools that 48 people play. So: back off properly, and give up loudly.
const get = async (path, tries = 6) => {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(`${API}/${path}`);
      if (r.ok) return r.json();
      last = new Error(`OpenF1 ${path} -> ${r.status}`);
      if (r.status !== 429 && r.status < 500) throw last;
    } catch (e) {
      last = e;
      if (!/429|5\d\d|fetch/i.test(String(e.message))) throw e;
    }
    await sleep(Math.min(8000, 1000 * 2 ** i));
  }
  throw last;
};

const isSprint = s => /sprint/i.test(s.session_name || "");

// Where everyone finished, from the last position each driver was recorded in.
export async function finishingOrder(sessionKey) {
  // OpenF1 answers 404 "No results found" for a session it has nothing for,
  // rather than an empty list. Bahrain and Saudi Arabia 2026 are both that,
  // which is also why neither is on the F5 calendar.
  let rows;
  try { rows = await get(`position?session_key=${sessionKey}`); }
  catch (e) { if (/-> 404/.test(String(e.message))) return []; throw e; }
  const last = {};
  rows
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .forEach(p => { last[p.driver_number] = p.position; });
  return Object.entries(last)
    .sort((a, b) => a[1] - b[1])
    .map(([num]) => Number(num));
}

/**
 * @param {number} year
 * @param {(name: string) => string} canonical maps OpenF1 spelling onto ours
 * @returns {Promise<{name, points, rounds}[]>} best first
 */
export async function driverStandings(year = 2026, canonical = (n) => n, { cache } = {}) {
  const sessions = (await get(`sessions?year=${year}&session_type=Race`))
    .filter(s => new Date(s.date_start) < new Date())
    .sort((a, b) => new Date(a.date_start) - new Date(b.date_start));

  // OpenF1 shouts surnames: "Kimi ANTONELLI". Title-case before canonicalName,
  // which matches on our spellings.
  const titled = s => (s || "").split(" ")
    .map(w => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w)).join(" ");
  const nameOf = {};
  (await get(`drivers?session_key=latest`))
    .forEach(d => { nameOf[d.driver_number] = canonical(titled(d.full_name)); });

  const points = {}, rounds = {}, skipped = [];

  for (const s of sessions) {
    // A fetch that still fails after four tries is a problem and throws: a
    // dropped request is how a table quietly comes back short a race. A
    // session that answers with nothing is different, and is recorded rather
    // than thrown. Bahrain and Saudi Arabia 2026 have no position data at all,
    // which is also why they are not on the F5 calendar.
    // Cached by session key. A finished race never changes, and refetching
    // seventeen of them is what runs into the rate limit.
    let order = cache && cache.get ? cache.get(s.session_key) : null;
    if (!order) {
      order = await finishingOrder(s.session_key);
      if (cache && cache.set) cache.set(s.session_key, order);
      await sleep(500);
    }
    if (!order.length) { skipped.push(`${s.country_name} ${s.session_name}`); continue; }

    const table = isSprint(s) ? SPRINT_POINTS : RACE_POINTS;
    order.forEach((num, i) => {
      const name = nameOf[num];
      if (!name) return;
      points[name] = (points[name] || 0) + (table[i] || 0);
      rounds[name] = (rounds[name] || 0) + 1;
    });
  }

  const table = Object.entries(points)
    .map(([name, pts]) => ({ name, points: pts, rounds: rounds[name] }))
    // Ties break on name, so the order is the same on every run. Two drivers
    // level would otherwise swap between draws, and which band they land in
    // decides whether they can be picked at all.
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  table.sessions = sessions.length - skipped.length;
  table.skipped = skipped;
  return table;
}
