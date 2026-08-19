import { useState, useEffect } from "react";
import { F1_TEAM_COLORS } from "./theme.js";

// ── Canonical driver identity ───────────────────────────
// Single source of truth for driver names, teams, and headshots.
// Every driver reference (scoring, headshots, team color chips, pick intel)
// must resolve through this module. See CLAUDE.md.

// OpenF1 driver number → canonical name.
export const DRIVER_NAMES = {
  3: "Max Verstappen", 1: "Lando Norris", 16: "Charles Leclerc",
  44: "Lewis Hamilton", 63: "George Russell", 81: "Oscar Piastri",
  55: "Carlos Sainz", 14: "Fernando Alonso", 12: "Andrea Kimi Antonelli",
  23: "Alex Albon", 18: "Lance Stroll", 10: "Pierre Gasly",
  43: "Franco Colapinto", 27: "Nico Hulkenberg",
  5: "Gabriel Bortoleto", 87: "Oliver Bearman", 31: "Esteban Ocon",
  30: "Liam Lawson", 6: "Isack Hadjar", 41: "Arvid Lindblad",
  11: "Sergio Perez", 77: "Valtteri Bottas"
};

// OpenF1 driver number → team.
export const DRIVER_TEAMS = {
  3: "Red Bull", 6: "Red Bull", 1: "McLaren", 81: "McLaren",
  16: "Ferrari", 44: "Ferrari", 63: "Mercedes", 12: "Mercedes",
  55: "Williams", 23: "Williams", 14: "Aston Martin", 18: "Aston Martin",
  10: "Alpine", 43: "Alpine", 41: "Racing Bulls", 30: "Racing Bulls",
  27: "Audi", 5: "Audi", 87: "Haas", 31: "Haas",
  11: "Cadillac", 77: "Cadillac"
};

// Cached headshot URLs, keyed by canonical name.
//
// OpenF1 hands these out via drivers.headshot_url, but it returns 401 for the
// entire API (including past sessions) while a session is live, which is exactly
// when people are looking at their picks. These point at the F1 media CDN, which
// stays reachable through those lockouts, so faces survive any OpenF1 outage.
//
// The CDN slug does not always track the canonical name (Alex Albon is filed
// under Alexander_Albon), so these are stored literally rather than derived.
// Arvid Lindblad is null: the CDN still serves a silhouette placeholder for him.
const CDN = "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers";
const shot = (letter, slug, code) =>
  `${CDN}/${letter}/${code.toUpperCase()}_${slug}/${code.toLowerCase()}.png.transform/1col/image.png`;

export const DRIVER_HEADSHOTS = {
  "Max Verstappen": shot("M", "Max_Verstappen", "maxver01"),
  "Isack Hadjar": shot("I", "Isack_Hadjar", "isahad01"),
  "Lando Norris": shot("L", "Lando_Norris", "lannor01"),
  "Oscar Piastri": shot("O", "Oscar_Piastri", "oscpia01"),
  "Charles Leclerc": shot("C", "Charles_Leclerc", "chalec01"),
  "Lewis Hamilton": shot("L", "Lewis_Hamilton", "lewham01"),
  "George Russell": shot("G", "George_Russell", "georus01"),
  "Andrea Kimi Antonelli": shot("A", "Andrea%20Kimi_Antonelli", "andant01"),
  "Carlos Sainz": shot("C", "Carlos_Sainz", "carsai01"),
  "Alex Albon": shot("A", "Alexander_Albon", "alealb01"),
  "Fernando Alonso": shot("F", "Fernando_Alonso", "feralo01"),
  "Lance Stroll": shot("L", "Lance_Stroll", "lanstr01"),
  "Pierre Gasly": shot("P", "Pierre_Gasly", "piegas01"),
  "Franco Colapinto": shot("F", "Franco_Colapinto", "fracol01"),
  "Liam Lawson": shot("L", "Liam_Lawson", "lialaw01"),
  "Arvid Lindblad": null,
  "Nico Hulkenberg": shot("N", "Nico_Hulkenberg", "nichul01"),
  "Gabriel Bortoleto": shot("G", "Gabriel_Bortoleto", "gabbor01"),
  "Oliver Bearman": shot("O", "Oliver_Bearman", "olibea01"),
  "Esteban Ocon": shot("E", "Esteban_Ocon", "estoco01"),
  "Sergio Perez": shot("S", "Sergio_Perez", "serper01"),
  "Valtteri Bottas": shot("V", "Valtteri_Bottas", "valbot01"),
};

// Known name variants → canonical name. OpenF1 and our own older code spell
// some drivers differently; resolve through here instead of string equality.
export const NAME_ALIASES = {
  "Kimi Antonelli": "Andrea Kimi Antonelli",
  "Andrea Antonelli": "Andrea Kimi Antonelli",
  "Alexander Albon": "Alex Albon",
  "Nico Hülkenberg": "Nico Hulkenberg",
  "Sergio Pérez": "Sergio Perez",
};

// Canonical name → team, derived from the number-keyed maps above.
export const TEAM_BY_NAME = Object.fromEntries(
  Object.entries(DRIVER_NAMES).map(([num, name]) => [name, DRIVER_TEAMS[num] || ""])
);

export function canonicalName(name) {
  if (!name) return "";
  if (DRIVER_HEADSHOTS[name] !== undefined) return name;
  if (NAME_ALIASES[name]) return NAME_ALIASES[name];
  // Fall back to a last-name match against the canonical list.
  const last = name.split(" ").pop().toLowerCase();
  const hit = Object.keys(DRIVER_HEADSHOTS).find(n => n.split(" ").pop().toLowerCase() === last);
  return hit || name;
}

// Build a driver map from local data alone, with no network involved.
export function fallbackDriverMap() {
  const map = new Map();
  Object.entries(DRIVER_NAMES).forEach(([num, name]) => {
    const team = DRIVER_TEAMS[num] || "";
    map.set(name, {
      team,
      headshot: DRIVER_HEADSHOTS[name] || null,
      teamColor: F1_TEAM_COLORS[team] || null,
      acronym: "",
      number: Number(num),
    });
  });
  return map;
}

// ── OpenF1 API: driver data (name, team, headshot) ──────
// Returns a Map keyed by full name → { team, headshot, teamColor, acronym, number }.
// Seeded with local data so faces render immediately and survive a failed fetch.
export function useOpenF1Drivers() {
  const [driverMap, setDriverMap] = useState(fallbackDriverMap);

  useEffect(() => {
    let cancelled = false;
    async function fetchDrivers() {
      try {
        const res = await fetch("https://api.openf1.org/v1/drivers?session_key=latest");
        if (!res.ok) throw new Error(`OpenF1 request failed: ${res.status}`);
        const data = await res.json();

        if (cancelled || !Array.isArray(data) || data.length === 0) return;

        // Start from local data so anything OpenF1 omits keeps its face.
        const map = fallbackDriverMap();
        // OpenF1 can return duplicate driver entries (one per session); dedupe by driver_number.
        const seen = new Set();
        for (const d of data) {
          if (seen.has(d.driver_number)) continue;
          seen.add(d.driver_number);

          const name = canonicalName(
            DRIVER_NAMES[d.driver_number] ||
            `${d.first_name || ""} ${d.last_name || ""}`.trim()
          );
          if (!name) continue;

          const team = d.team_name || TEAM_BY_NAME[name] || "";
          map.set(name, {
            team,
            // Prefer the live URL, but never let a missing one blank out a face.
            headshot: d.headshot_url || DRIVER_HEADSHOTS[name] || null,
            teamColor: d.team_colour ? `#${d.team_colour}` : (F1_TEAM_COLORS[team] || null),
            acronym: d.name_acronym || "",
            number: d.driver_number || null,
          });
        }
        setDriverMap(map);
      } catch (err) {
        // Local data is already in state, so faces stay up. Nothing to swap in.
        console.warn("OpenF1 fetch failed, using cached driver data:", err);
      }
    }
    fetchDrivers();
    return () => { cancelled = true; };
  }, []);

  return driverMap;
}

// Find a driver in the map, tolerating name spelling differences.
export function findDriver(driverMap, name) {
  const miss = () => {
    const canon = canonicalName(name);
    const team = TEAM_BY_NAME[canon] || "";
    return {
      team,
      headshot: DRIVER_HEADSHOTS[canon] || null,
      teamColor: F1_TEAM_COLORS[team] || null,
      acronym: "",
      number: null,
    };
  };
  if (!name || driverMap.size === 0) return miss();
  if (driverMap.has(name)) return driverMap.get(name);

  const canon = canonicalName(name);
  if (driverMap.has(canon)) return driverMap.get(canon);

  // Last-name match, then first-name match, then a contains match.
  const parts = name.split(" ");
  const last = parts[parts.length - 1].toLowerCase();
  for (const [key, val] of driverMap) {
    if (key.split(" ").pop().toLowerCase() === last) return val;
  }
  for (const [key, val] of driverMap) {
    if (parts.some(p => p.toLowerCase() === key.split(" ")[0].toLowerCase())) return val;
  }
  const lower = name.toLowerCase();
  for (const [key, val] of driverMap) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) return val;
  }
  return miss();
}
