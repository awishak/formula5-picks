// Fernolo 5 Bort. Random picks for anyone who missed the deadline.
//
// Runs nightly at 03:00 UTC, which is 8pm Pacific: three hours after a 5pm
// deadline, so there is still time to fill them in by hand from Admin first.
// Nightly rather than weekly because the deadlines are not all on the same day
// — round 15 closes on a Thursday and the rest on a Friday.
//
// It only acts on a race whose deadline passed in the last twelve hours, so a
// rerun on any other night is a no-op rather than a second pass over an old
// round.
import { ready, select, authorized } from "../_supabase.js";

const TOP_PICKS = 1, MID_PICKS = 4;

const shuffled = (a) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

export default async function handler(req, res) {
  if (!authorized(req)) return res.status(401).json({ error: "not a cron call" });
  if (!ready()) return res.status(500).json({ error: "supabase env missing" });

  const dry = String(req.query?.dry || "") === "1";

  try {
    const now = Date.now();
    const races = await select("races?select=id,round,race_name,pick_deadline,top_drivers,mid_drivers&order=round");
    const race = races.find(r => {
      if (!r.pick_deadline) return false;
      const gone = now - new Date(r.pick_deadline).getTime();
      return gone > 0 && gone < 12 * 3600e3;
    });
    if (!race) return res.status(200).json({ ok: true, skipped: "no deadline passed in the last twelve hours" });

    const top = (race.top_drivers || []).filter(Boolean);
    const mid = (race.mid_drivers || []).filter(Boolean);
    if (top.length < TOP_PICKS || mid.length < MID_PICKS) {
      return res.status(200).json({ ok: false, round: race.round, error: "no driver pool for this race" });
    }

    const [players, picks] = await Promise.all([
      select("players?select=id,name&order=name"),
      select(`picks?select=player_id&race_id=eq.${race.id}`),
    ]);
    const has = new Set(picks.map(p => p.player_id));
    const missing = players.filter(p => !has.has(p.id));
    if (!missing.length) {
      return res.status(200).json({ ok: true, round: race.round, filled: 0, note: "everyone picked" });
    }

    const rows = missing.map(p => {
      const order = shuffled([
        ...shuffled(top).slice(0, TOP_PICKS),
        ...shuffled(mid).slice(0, MID_PICKS),
      ]);
      return {
        player_id: p.id,
        race_id: race.id,
        top_pick: order[0],
        finishing_order: order,
        // P1 to P10, which is where a random guess is worth making.
        best_finish: `P${Math.floor(Math.random() * 10) + 1}`,
        // The dial runs 1.5 to 4.5 in tenths.
        pit_guess: Math.round((1.5 + Math.random() * 3.0) * 10) / 10,
        submitted_at: new Date().toISOString(),
        // Marks the row as Fernolo's, so a box score can say which weeks
        // somebody actually played.
        auto: true,
      };
    });

    if (dry) {
      return res.status(200).json({
        ok: true, dry: true, round: race.round, race: race.race_name,
        wouldFill: missing.length,
        names: missing.map(p => p.name),
        sample: { for: missing[0].name, ...rows[0], player_id: undefined, race_id: undefined },
      });
    }

    // Insert only, never update: someone who picked is not overwritten, and the
    // unique key on (race_id, player_id) is a second guard on the same thing.
    // .select() so a policy failure surfaces rather than returning nothing.
    const post = async (body) => fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/picks`, {
      method: "POST",
      headers: {
        apikey: process.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(body),
    });

    // The auto column may not exist yet. Filling somebody's picks matters more
    // than labelling them, so a missing column drops the label rather than the
    // week: better an unmarked pick than no pick at all on a Friday night.
    let r = await post(rows);
    let labelled = true;
    if (!r.ok && /auto/.test(await r.clone().text())) {
      labelled = false;
      r = await post(rows.map(({ auto, ...rest }) => rest));
    }
    if (!r.ok) throw new Error(`insert -> ${r.status} ${await r.text()}`);
    const back = await r.json();

    return res.status(200).json({
      ok: true, round: race.round, race: race.race_name,
      filled: back.length, labelled, names: missing.map(p => p.name),
    });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
