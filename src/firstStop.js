// The stop the week's pit question is about, named: team, driver and lap.
//
// Andrew, 2026-09-13: the stop on the line chart should say what it was, "Haas,
// Bearman, Lap 23", not "ACTUAL". The time is still his: he enters it in Admin
// and it lives in results.pit_stop_time. Who made the stop and on which lap
// come from OpenF1 here, looked up in the browser and kept in localStorage,
// because a finished race does not change and three requests a device a round
// is nothing to OpenF1.
//
// Two things in the data, both handled rather than trusted:
//   - The first rows of a race can be fake stops. Dutch and Italian 2026 both
//     open on laps 2 and 3 with pit lane times of 26 to 31 minutes, cars sitting
//     in the lane under a red flag or at the start. Anything over a minute in
//     the lane is not a stop.
//   - stop_duration is empty on every 2026 row checked, so the stop cannot be
//     matched to Andrew's time. The first real stop by lap is the answer, which
//     is what the question asks for.
import { useEffect, useState } from "react";
import { DRIVER_NAMES, DRIVER_TEAMS } from "./drivers.js";

const API = "https://api.openf1.org/v1";
const MAX_LANE = 60;

// Free text to a team, in the order Admin has always matched it: Red Bull
// before Racing Bulls, and the old Sauber names are Audi now.
export const TEAM_ALIASES = [
  ["Red Bull", ["red bull"]],
  ["Racing Bulls", ["racing bulls", "vcarb"]],
  ["McLaren", ["mclaren"]],
  ["Ferrari", ["ferrari"]],
  ["Mercedes", ["mercedes"]],
  ["Williams", ["williams"]],
  ["Aston Martin", ["aston"]],
  ["Alpine", ["alpine"]],
  ["Haas", ["haas"]],
  ["Audi", ["audi", "sauber", "kick", "stake"]],
  ["Cadillac", ["cadillac"]],
];

export function teamOfQuestion(question) {
  const q = String(question || "").toLowerCase();
  const hit = TEAM_ALIASES.find(([, aliases]) => aliases.some(a => q.includes(a)));
  return hit ? hit[0] : null;
}

// The team's first real stop in a race's pit rows, or null.
export function firstStopOf(pits, team) {
  const nums = Object.entries(DRIVER_TEAMS).filter(([, t]) => t === team).map(([n]) => Number(n));
  const real = (pits || []).filter(p => nums.includes(p.driver_number) && p.lap_number != null)
    .filter(p => {
      const lane = p.lane_duration ?? p.pit_duration;
      return lane == null || lane <= MAX_LANE;
    })
    .sort((a, b) => (a.lap_number - b.lap_number) || String(a.date).localeCompare(String(b.date)));
  const p = real[0];
  if (!p) return null;
  const driver = DRIVER_NAMES[p.driver_number] || null;
  return { team, driver, lap: p.lap_number };
}

// "Haas, Ocon, Lap 14". Surname only, the way every plate on the chart names a
// person; a lookup that has not come back yet, or failed, is just the team.
export function stopLabel(stop, team) {
  if (stop && stop.driver && stop.lap != null) {
    return `${stop.team}, ${String(stop.driver).split(/\s+/).pop()}, Lap ${stop.lap}`;
  }
  return team || stop?.team || "The stop";
}

const get = async url => {
  for (let i = 0; i < 3; i++) {
    const res = await fetch(url);
    if (res.ok) return res.json();
    if (res.status !== 429) throw new Error(`HTTP ${res.status}`);
    await new Promise(r => setTimeout(r, 1200 * (i + 1)));
  }
  throw new Error("rate limited");
};

let sessionsOnce = null;
export async function fetchFirstStop({ date, question }) {
  const team = teamOfQuestion(question);
  // "The fastest stop" is not a first stop, and nothing here can say which it was.
  if (!team || !date || /fastest/i.test(question || "")) return null;
  const key = `f5_first_stop_${date}_${team}`;
  try {
    const hit = localStorage.getItem(key);
    if (hit) return JSON.parse(hit);
  } catch (e) { /* private mode: look it up every time */ }

  const year = Number(String(date).slice(0, 4)) || 2026;
  sessionsOnce = sessionsOnce || get(`${API}/sessions?year=${year}&session_name=Race`);
  const sessions = await sessionsOnce;
  const day = new Date(`${date}T00:00:00Z`).getTime();
  const best = (Array.isArray(sessions) ? sessions : [])
    .filter(s => s.date_start)
    .map(s => ({ s, d: Math.abs(new Date(s.date_start.slice(0, 10) + "T00:00:00Z").getTime() - day) }))
    .sort((a, b) => a.d - b.d)[0];
  if (!best || best.d > 3 * 86400000) return null;
  const stop = firstStopOf(await get(`${API}/pit?session_key=${best.s.session_key}`), team);
  if (stop) {
    try { localStorage.setItem(key, JSON.stringify(stop)); } catch (e) { /* fine */ }
  }
  return stop;
}

// Only once there is a stop to name: before the race OpenF1 has nothing, and
// during one it answers 401.
export function useFirstStop({ date, question, enabled = true }) {
  const [stop, setStop] = useState(null);
  useEffect(() => {
    if (!enabled || !date || !question) return;
    let alive = true;
    fetchFirstStop({ date, question }).then(s => { if (alive) setStop(s); }).catch(() => {});
    return () => { alive = false; };
  }, [date, question, enabled]);
  return stop;
}
