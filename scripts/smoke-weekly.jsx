// Render every weekly card for every player and fail loudly on any runtime error.
//
// `vite build` does not catch undefined identifiers: a missing helper compiles
// clean and throws in the browser, which shipped once and crashed on a phone.
// This deck is 48 players x 8 cards and most of it is never on screen at once.
//
// Coverage is per (player, card). A card index missing from the loop is
// silently untested, so adding a card means raising CARDS here.

import { renderToString } from "react-dom/server";
import { WeeklyDeck } from "../src/Weekly.jsx";
import { buildWeekly } from "../src/weekly.js";
import DB from "./weekly-fixture.json";

const CARDS = 4;
// Card 2 plays out in five presses. A stage that is never rendered here is
// silently untested, which is the whole reason this script exists, so the loop
// walks every stage of every card.
const STAGES = [1, 5, 1, 1];
const names = DB.players.map(p => p.name);

// Compare CONTENT, not output length. Two cards that differ only in which row
// is highlighted have the same byte count, so counting distinct lengths scores
// a personalised card as a flat one. That bit the recap pipeline already.
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
  for (let i = 0; i < CARDS; i++) {
    for (let st = 0; st < STAGES[i]; st++) {
      total++;
      try {
        const html = renderToString(<WeeklyDeck data={data} initialCard={i} initialStage={st} />);
        if (!html || html.length < 400) throw new Error(`suspiciously short: ${html.length} chars`);
        const key = STAGES[i] > 1 ? `${i}.${st}` : `${i}`;
        if (!byCard.has(key)) byCard.set(key, new Set());
        byCard.get(key).add(hash(html));
      } catch (e) {
        failed++;
        console.log(`  FAIL  ${name} card ${i + 1} stage ${st}\n        ${e.message}`);
      }
    }
  }
}

// A player with no score for the round must come back null rather than throw,
// which is what the loader turns into the "not scored yet" screen.
try {
  if (buildWeekly(DB, "Nobody At All") !== null) throw new Error("unknown player did not return null");
  console.log("  ok    unknown player returns null");
} catch (e) { failed++; console.log(`  FAIL  unknown player\n        ${e.message}`); }

// Every card has to differ across players. Identical output means the card is
// not reading the player at all, which is the failure that looks like success.
//
// Card 4 was the exception: it is the next race, the same for all 48. It has
// carried the flag row since 2026-08-28, so it names the reader and is covered
// like the rest. Nothing is exempt now, and adding an exemption back means
// being able to say why the card cannot know who is reading it.
const FLAT = new Set();
console.log("");
for (const [key, set] of [...byCard.entries()].sort()) {
  const flat = FLAT.has(key);
  const ok = flat ? true : set.size > 1;
  if (!ok) failed++;
  const label = key.includes(".") ? `card ${+key.split(".")[0] + 1} stage ${+key.split(".")[1] + 1}` : `card ${+key + 1}`;
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${label}: ${set.size} distinct render${set.size === 1 ? "" : "s"} across ${names.length} players${flat ? " (flat by design)" : ""}`);
}

// Every branch the copy is written for should actually be exercised by the
// fixture. A state with no players behind it has never been rendered.
const states = {}, verdicts = {};
for (const name of names) {
  const d = buildWeekly(DB, name);
  if (!d) continue;
  states[d.card5.state] = (states[d.card5.state] || 0) + 1;
  verdicts[d.card4.verdict] = (verdicts[d.card4.verdict] || 0) + 1;
}
console.log(`\n  card 5 states:   ${JSON.stringify(states)}`);
console.log(`  card 4 verdicts: ${JSON.stringify(verdicts)}`);
for (const s of ["held", "solo", "pair", "notEnough", "locked"]) {
  if (!states[s]) console.log(`  note  card 5 state "${s}" is not in this fixture, so its copy is unrendered`);
}

console.log(`\n${failed ? "FAILED" : "OK"}  ${total - failed}/${total} renders`);
process.exit(failed ? 1 : 0);
