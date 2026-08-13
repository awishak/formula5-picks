// Checks the pick pages and the driver-name data behind them.
//
// Why this exists: driver names moved into src/drivers.js and MyPicks, PickIntel
// and Admin were all rewritten to resolve through it. A wrong name there does
// not crash. It quietly shows the wrong face, the wrong team colour, or scores
// the wrong driver, and nobody notices until someone complains.
//
// Two jobs:
//   1. Check the driver data itself. Every driver has a face, a team, and a
//      colour, and every known misspelling resolves to the right person.
//   2. Open MyPicks and PickIntel once each and shout if they crash. They load
//      their real data from Supabase after the page appears, which does not
//      happen here, so this catches a broken page and not a broken query.

import { renderToString } from "react-dom/server";
import MyPicks from "../src/MyPicks.jsx";
import PickIntel from "../src/PickIntel.jsx";
import {
  DRIVER_NAMES, DRIVER_TEAMS, DRIVER_HEADSHOTS, NAME_ALIASES,
  TEAM_BY_NAME, canonicalName, fallbackDriverMap, findDriver,
} from "../src/drivers.js";
import { F1_TEAM_COLORS } from "../src/theme.js";

let failed = 0;
const check = (label, fn) => {
  try {
    const out = fn();
    if (out === false) throw new Error("returned false");
    console.log(`  ok    ${label}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL  ${label}\n        ${e.message}`);
  }
};

const names = Object.values(DRIVER_NAMES);

console.log("\ndriver data");

check("22 drivers, no duplicates", () => {
  if (names.length !== 22) throw new Error(`${names.length} drivers, expected 22`);
  const dupes = names.filter((n, i) => names.indexOf(n) !== i);
  if (dupes.length) throw new Error(`duplicated: ${dupes.join(", ")}`);
  return true;
});

check("every driver has a headshot entry", () => {
  const missing = names.filter(n => !(n in DRIVER_HEADSHOTS));
  if (missing.length) throw new Error(`no headshot key: ${missing.join(", ")}`);
  return true;
});

check("every headshot key is a real driver", () => {
  const orphans = Object.keys(DRIVER_HEADSHOTS).filter(n => !names.includes(n));
  if (orphans.length) throw new Error(`headshot for nobody: ${orphans.join(", ")}`);
  return true;
});

check("every driver has a team", () => {
  const missing = Object.keys(DRIVER_NAMES).filter(num => !DRIVER_TEAMS[num]);
  if (missing.length) throw new Error(`numbers with no team: ${missing.join(", ")}`);
  return true;
});

check("every team has a colour", () => {
  const teams = [...new Set(Object.values(DRIVER_TEAMS))];
  const missing = teams.filter(t => !F1_TEAM_COLORS[t]);
  if (missing.length) throw new Error(`no colour, chips render blank: ${missing.join(", ")}`);
  return true;
});

check("teams have two drivers each", () => {
  const count = {};
  Object.values(DRIVER_TEAMS).forEach(t => (count[t] = (count[t] || 0) + 1));
  const odd = Object.entries(count).filter(([, n]) => n !== 2);
  if (odd.length) throw new Error(odd.map(([t, n]) => `${t} has ${n}`).join(", "));
  return true;
});

check("TEAM_BY_NAME covers all 22", () =>
  names.every(n => TEAM_BY_NAME[n]) || (() => {
    throw new Error(names.filter(n => !TEAM_BY_NAME[n]).join(", "));
  })());

console.log("\nname resolution");

check("every canonical name resolves to itself", () => {
  const moved = names.filter(n => canonicalName(n) !== n);
  if (moved.length) throw new Error(moved.map(n => `${n} -> ${canonicalName(n)}`).join(", "));
  return true;
});

check("every known misspelling resolves to a real driver", () => {
  const bad = Object.entries(NAME_ALIASES)
    .filter(([alias, want]) => canonicalName(alias) !== want || !names.includes(want));
  if (bad.length) throw new Error(bad.map(([a, w]) => `${a} should be ${w}, got ${canonicalName(a)}`).join("; "));
  return true;
});

// The one that has already caused a real problem: scored data holds both
// spellings of Antonelli, which split 133 cards across two people in the recap.
check("both spellings of Antonelli land on the same driver", () =>
  canonicalName("Kimi Antonelli") === "Andrea Kimi Antonelli"
  && canonicalName("Andrea Kimi Antonelli") === "Andrea Kimi Antonelli");

check("accented spellings resolve", () =>
  canonicalName("Nico Hülkenberg") === "Nico Hulkenberg"
  && canonicalName("Sergio Pérez") === "Sergio Perez");

// canonicalName falls back to a surname match. If two drivers ever share a
// surname that fallback silently picks whichever is listed first.
check("no two drivers share a surname", () => {
  const last = {};
  names.forEach(n => {
    const s = n.split(" ").pop().toLowerCase();
    (last[s] ||= []).push(n);
  });
  const clash = Object.values(last).filter(v => v.length > 1);
  if (clash.length) throw new Error(
    `surname fallback is ambiguous: ${clash.map(v => v.join(" / ")).join(", ")}`);
  return true;
});

check("an unknown name comes back unchanged rather than as someone else", () =>
  canonicalName("Definitely Nobody") === "Definitely Nobody");

check("empty input does not throw", () =>
  canonicalName("") === "" && canonicalName(null) === "" && canonicalName(undefined) === "");

console.log("\ndriver map");

check("fallback map has all 22 with a team colour", () => {
  const map = fallbackDriverMap();
  if (map.size !== 22) throw new Error(`map has ${map.size}`);
  const noColour = [...map].filter(([, v]) => !v.teamColor).map(([k]) => k);
  if (noColour.length) throw new Error(`no colour: ${noColour.join(", ")}`);
  return true;
});

check("findDriver resolves a misspelling through the map", () => {
  const map = fallbackDriverMap();
  const a = findDriver(map, "Kimi Antonelli");
  const b = findDriver(map, "Andrea Kimi Antonelli");
  return a.team === b.team && a.headshot === b.headshot && a.team === "Mercedes";
});

check("findDriver on an empty map still returns a usable driver", () => {
  const d = findDriver(new Map(), "Alexander Albon");
  return d.team === "Williams" && !!d.headshot;
});

check("findDriver never returns undefined for any canonical name", () => {
  const map = fallbackDriverMap();
  const bad = names.filter(n => {
    const d = findDriver(map, n);
    return !d || !d.team;
  });
  if (bad.length) throw new Error(bad.join(", "));
  return true;
});

console.log("\npages");

// These pull their data from Supabase after the page appears, which does not
// happen in this environment. So this proves the page is not broken, not that
// its data is right.
check("MyPicks opens without crashing", () => {
  const html = renderToString(<MyPicks currentUser="Andrew Ishak" />);
  return typeof html === "string";
});

check("MyPicks opens with nobody signed in", () => {
  const html = renderToString(<MyPicks currentUser={null} />);
  return typeof html === "string";
});

check("PickIntel opens without crashing", () => {
  const html = renderToString(<PickIntel currentUser="Andrew Ishak" />);
  return typeof html === "string";
});

check("PickIntel opens with nobody signed in", () => {
  const html = renderToString(<PickIntel currentUser={null} />);
  return typeof html === "string";
});

console.log(failed ? `\n${failed} failed` : `\nall ${"passed"}`);
process.exit(failed ? 1 : 0);
