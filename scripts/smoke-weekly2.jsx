// Render every card of the second weekly deck for every player and fail loudly
// on any runtime error. Same shape as smoke-weekly.jsx, same fixture.
//
// Also checks the matchup arithmetic closes for all 48: everything the card
// names as different, plus the line, has to add up to the margin, or the card
// is telling a story the scoreboard does not.

import { renderToString } from "react-dom/server";
import { WeeklyDeckV2 } from "../src/WeeklyV2.jsx";
import { buildWeekly } from "../src/weekly.js";
import { buildWeeklyV2 } from "../src/weeklyV2.js";
import DB from "./weekly-fixture.json";

const CARDS = 6;
const names = DB.players.map(p => p.name);

const hash = s => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h;
};

let failed = 0, total = 0;
const byCard = new Map();

for (const name of names) {
  const data = buildWeekly(DB, name);
  if (!data) { failed++; console.log(`  FAIL  ${name}: buildWeekly returned null`); continue; }
  total++;
  try {
    const v = buildWeeklyV2(data);
    if (!v.matchup.closes) throw new Error(`matchup does not close: margin ${v.matchup.margin}`);
    if (v.podium.row3.length !== 4) throw new Error(`row 3 has ${v.podium.row3.length} tiles`);
    if (v.boxScore.drivers.length !== 5) throw new Error(`${v.boxScore.drivers.length} drivers in the box score`);
    const lines = v.boxScore.lines.reduce((a, l) => a + l.pts, 0);
    if (lines !== v.boxScore.ind) throw new Error(`box score lines sum to ${lines}, score is ${v.boxScore.ind}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL  ${name} data\n        ${e.message}`);
  }
  for (let i = 0; i < CARDS; i++) {
    total++;
    try {
      const html = renderToString(<WeeklyDeckV2 data={data} initialCard={i} />);
      if (!html || html.length < 400) throw new Error(`suspiciously short: ${html.length} chars`);
      if (!byCard.has(i)) byCard.set(i, new Set());
      byCard.get(i).add(hash(html));
    } catch (e) {
      failed++;
      console.log(`  FAIL  ${name} card ${i + 1}\n        ${e.message}`);
    }
  }
}

for (const [i, set] of byCard) {
  const flat = set.size < 2;
  console.log(`  ${flat ? "FLAT" : "ok  "}  card ${i + 1}: ${set.size} distinct of ${names.length}`);
  if (flat) failed++;
}

console.log(`\n${failed ? "FAILED" : "OK"}  ${total - failed}/${total} renders`);
process.exit(failed ? 1 : 0);
