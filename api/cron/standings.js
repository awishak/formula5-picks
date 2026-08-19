// Monday: refresh the drivers' championship from the weekend's race.
//
// Runs after every race weekend rather than only when one happened; a week with
// no race rewrites the same table and costs nothing.
import { driverStandings } from "../../src/standings.js";
import { canonicalName } from "../../src/drivers.js";
import { ready, upsert, authorized } from "../_supabase.js";

export default async function handler(req, res) {
  if (!authorized(req)) return res.status(401).json({ error: "not a cron call" });
  if (!ready()) return res.status(500).json({ error: "supabase env missing" });

  try {
    const table = await driverStandings(2026, canonicalName);
    const rows = table.map((d, i) => ({
      driver: d.name,
      position: i + 1,
      points: d.points,
      rounds: d.rounds,
      updated_at: new Date().toISOString(),
    }));
    const written = await upsert("driver_standings", rows, "driver");
    return res.status(200).json({
      ok: true,
      drivers: written.length,
      sessions: table.sessions,
      skipped: table.skipped,
      leader: rows[0],
    });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
