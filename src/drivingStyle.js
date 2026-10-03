// A player's driving style, computed. Pure, no React and no Supabase, the same
// shape as playerTable.js.
//
// Three axes, set by Andrew 2026-10-02:
//   good      where they sit in the individual standings: top 10, the midfield,
//             or the bottom 20. Ranked on points a race, the way /players is.
//   selfless  chooses more extreme pit stops. Measured as how far their pit
//             guess sits from the field's median guess each week, averaged.
//             A guess far from the field pulls the team's line, which is what
//             the team game asks of a player; a guess at the field's median
//             pulls nothing.
//   daring    makes less popular choices. Measured as how popular their picks
//             were: the share of the field that made the same top pick, put the
//             same drivers in their order and named the same best finish.
//             Below the league's median popularity is daring.
//
// Both measures are relative to the league, so half the league is selfless and
// half daring by construction. Twelve types, named in STYLE_NAMES.
import { buildPlayerTable, placesBy } from "./playerTable.js";

export const BANDS = [
  { id: "top", label: "Top 10", test: p => p <= 10 },
  { id: "mid", label: "Midfield", test: p => p <= 28 },
  { id: "bottom", label: "Bottom 20", test: () => true },
];

// [band][selfless][daring]. Andrew's to rename.
export const STYLE_NAMES = {
  top: {
    selfless: { daring: "All-Out Ace", safe: "Team Captain" },
    selfish:  { daring: "Lone Wolf", safe: "The Metronome" },
  },
  mid: {
    selfless: { daring: "Midfield Maverick", safe: "The Wingman" },
    selfish:  { daring: "The Gambler", safe: "Points Collector" },
  },
  bottom: {
    selfless: { daring: "Crash or Glory", safe: "Water Carrier" },
    selfish:  { daring: "Banzai Runner", safe: "Sunday Driver" },
  },
};

export const styleName = (band, selfless, daring) =>
  STYLE_NAMES[band][selfless ? "selfless" : "selfish"][daring ? "daring" : "safe"];

const median = xs => {
  const a = xs.filter(x => Number.isFinite(x)).sort((x, y) => x - y);
  if (!a.length) return null;
  const m = a.length >> 1;
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};
const mean = xs => {
  const a = xs.filter(x => Number.isFinite(x));
  return a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
};
const num = x => (x == null || x === "" ? null : Number(x));

/**
 * @param {object} db { players, teams, races, scores, picks }
 * @returns {{ byId: object, byName: object, league: { pitDev, popularity } }}
 */
export function buildDrivingStyles(db) {
  const players = db.players || [], picks = db.picks || [];
  const rows = buildPlayerTable(db);
  const place = placesBy(rows, r => r.avg);

  // Picks grouped by race, only races where enough of the field picked for a
  // median or a popularity to mean anything.
  const byRace = {};
  picks.forEach(p => { (byRace[p.race_id] ||= []).push(p); });

  const pitDevs = {}, pops = {};
  Object.values(byRace).forEach(ps => {
    if (ps.length < 12) return;
    const med = median(ps.map(p => num(p.pit_guess)));
    const n = ps.length;
    const topCount = {}, orderCount = {}, bestCount = {};
    ps.forEach(p => {
      if (p.top_pick) topCount[p.top_pick] = (topCount[p.top_pick] || 0) + 1;
      (Array.isArray(p.finishing_order) ? p.finishing_order : []).forEach(d => {
        orderCount[d] = (orderCount[d] || 0) + 1;
      });
      if (p.best_finish) bestCount[p.best_finish] = (bestCount[p.best_finish] || 0) + 1;
    });
    ps.forEach(p => {
      const g = num(p.pit_guess);
      if (med != null && g != null) (pitDevs[p.player_id] ||= []).push(Math.abs(g - med));
      const shares = [];
      if (p.top_pick) shares.push(topCount[p.top_pick] / n);
      (Array.isArray(p.finishing_order) ? p.finishing_order : [])
        .filter(d => d !== p.top_pick)
        .forEach(d => shares.push(orderCount[d] / n));
      if (p.best_finish) shares.push(bestCount[p.best_finish] / n);
      if (shares.length) (pops[p.player_id] ||= []).push(mean(shares));
    });
  });

  const per = players.map(p => ({
    id: p.id, name: p.name,
    pitDev: mean(pitDevs[p.id] || []),
    popularity: mean(pops[p.id] || []),
  }));
  const league = {
    pitDev: median(per.map(x => x.pitDev)),
    popularity: median(per.map(x => x.popularity)),
  };

  const byId = {}, byName = {};
  per.forEach(x => {
    const pl = place[x.id] || rows.length;
    const band = BANDS.find(b => b.test(pl)).id;
    // No picks yet reads as neither: the safe, selfish default.
    const selfless = x.pitDev != null && league.pitDev != null && x.pitDev > league.pitDev;
    const daring = x.popularity != null && league.popularity != null && x.popularity < league.popularity;
    const s = {
      id: x.id, name: x.name, place: pl, band, bandLabel: BANDS.find(b => b.id === band).label,
      selfless, daring, type: styleName(band, selfless, daring),
      pitDev: x.pitDev, popularity: x.popularity,
    };
    byId[x.id] = s; byName[x.name] = s;
  });
  return { byId, byName, league };
}
