// Driver pool generation.
//
// The rule, set by Andrew 2026-08-19: three drivers from championship positions
// 1-5, four from 6-10, three from 11-15. Ten drivers, three in the top pool and
// seven in the midfield pool.
//
// Pure, and with no imports on purpose: drivers.js imports ./theme without a
// file extension, which Node will not resolve, so anything that depends on it
// cannot run from a script. Names in and out are expected to be canonical
// already; a caller in the app can run them through canonicalName first.

// Where the picks come from: [from, to] inclusive, 1-indexed championship
// positions, and how many to draw.
export const BANDS = [
  { pool: "top", from: 1, to: 5, take: 3 },
  { pool: "mid", from: 6, to: 10, take: 4 },
  { pool: "mid", from: 11, to: 15, take: 3 },
];

// Deterministic shuffle, so a seed reproduces a draw. Fisher-Yates over a
// caller-supplied random, rather than Math.random, for exactly that reason.
const shuffled = (arr, rand) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// mulberry32: small, seeded, good enough to draw ten names.
export const seededRandom = (seed) => {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * @param {string[]} standings driver names in championship order, best first
 * @param {object} opts
 *   rand    () => [0,1), defaults to Math.random
 *   avoid   names to leave out of the draw where a band still has enough left,
 *           for keeping the same faces out of back-to-back rounds
 * @returns {{ top: string[], mid: string[] }}
 */
export function drawPools(standings, { rand = Math.random, avoid = [] } = {}) {
  const order = standings || [];
  const skip = new Set(avoid || []);

  const need = Math.max(...BANDS.map(b => b.to));
  if (order.length < need) {
    throw new Error(`need ${need} drivers in the standings, got ${order.length}`);
  }

  const out = { top: [], mid: [] };
  BANDS.forEach(({ pool, from, to, take }) => {
    const band = order.slice(from - 1, to);
    // Prefer drivers who were not in the recent pools, but never at the cost of
    // filling the band: a band of five that has four to avoid still draws.
    const fresh = band.filter(d => !skip.has(d));
    const source = fresh.length >= take ? fresh : band;
    out[pool].push(...shuffled(source, rand).slice(0, take));
  });
  return out;
}

// The pools of the last N rounds, flattened, for the avoid list.
export const recentlyUsed = (races, round, lookback = 2) =>
  races
    .filter(r => r.round < round && r.round >= round - lookback)
    .flatMap(r => [...(r.top_drivers || []), ...(r.mid_drivers || [])]);
