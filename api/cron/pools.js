// Tuesday morning: draw the driver pools for the next race.
//
// It will not overwrite a pool that already exists, so a pool set by hand in
// Admin on Monday night survives Tuesday morning. Clearing it in Admin and
// waiting is not the way to redraw; ?force=1 with the secret is.
import { drawPools, recentlyUsed } from "../../src/pools.js";
import { driverStandings } from "../../src/standings.js";
import { canonicalName } from "../../src/drivers.js";
import { ready, select, patch, authorized } from "../_supabase.js";

export default async function handler(req, res) {
  if (!authorized(req)) return res.status(401).json({ error: "not a cron call" });
  if (!ready()) return res.status(500).json({ error: "supabase env missing" });

  try {
    const force = String(req.query?.force || "") === "1";

    // The next race is the earliest one whose deadline has not passed.
    const now = new Date().toISOString();
    const races = await select(
      `races?select=id,round,race_name,pick_deadline,top_drivers,mid_drivers&order=round`);
    const next = races.find(r => r.pick_deadline && r.pick_deadline > now);
    if (!next) return res.status(200).json({ ok: true, skipped: "no race with an open deadline" });

    const has = (next.top_drivers || []).length && (next.mid_drivers || []).length;
    if (has && !force) {
      return res.status(200).json({ ok: true, skipped: `round ${next.round} already has a pool` });
    }

    // Standings from the table the Monday job writes, and from the API if that
    // has not run yet, so a first deploy still draws.
    let order = [];
    try {
      const stored = await select("driver_standings?select=driver,position&order=position");
      order = stored.map(r => r.driver);
    } catch { order = []; }
    if (order.length < 15) {
      order = (await driverStandings(2026, canonicalName)).map(d => d.name);
    }

    const pools = drawPools(order, { avoid: recentlyUsed(races, next.round, 2) });
    const written = await patch(`races?id=eq.${next.id}`,
      { top_drivers: pools.top, mid_drivers: pools.mid });

    return res.status(200).json({
      ok: true, round: next.round, race: next.race_name,
      top: pools.top, mid: pools.mid, wrote: written.length,
    });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
