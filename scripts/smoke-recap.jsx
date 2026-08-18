// Render every recap card for every player and fail loudly on any runtime error.
//
// `vite build` does not catch undefined identifiers: a missing helper compiles
// clean and throws in the browser. This deck has 48 decks x 10 cards and six
// stake branches, so most of it is never on screen at once.
//
// Coverage here is per (player, card), not per player. A card index that is not
// in the loop is silently untested, so adding a card means raising CARDS.

import { renderToString } from "react-dom/server";
import Recap from "../src/Recap.jsx";
import DATA from "../src/recapData.json";

const names = Object.keys(DATA.players);
const CARDS = 18;

// Compare CONTENT, not output length. The highlighted row on the team board
// moves between teams without changing the byte count, so counting distinct
// lengths scores a personalised card as a flat one. This bit the recap pipeline
// once already.
const hash = s => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h;
};

let failed = 0, total = 0;
const seen = new Map();

for (const name of names) {
  for (let i = 0; i < CARDS; i++) {
    // No card holds anything behind a click any more: the round 11 result is
    // its own card. The loop is kept so a future gated card is easy to add.
    for (const reveal of [false]) {
      total++;
      try {
        const html = renderToString(<Recap playerName={name} initialCard={i} initialReveal={reveal} />);
        if (!html || html.length < 200) throw new Error(`suspiciously short: ${html.length} chars`);
        seen.set(`${name}|${i}${reveal ? "r" : ""}`, hash(html));
      } catch (e) {
        failed++;
        console.log(`  FAIL  ${name} card ${i + 1}${reveal ? " (revealed)" : ""}\n        ${e.message}`);
      }
    }
  }
}

// An unknown player must degrade to the fallback screen, not throw.
try {
  const html = renderToString(<Recap playerName="Nobody At All" initialCard={0} />);
  if (!/No recap/.test(html)) throw new Error("missing player did not hit the fallback");
  console.log("  ok    unknown player falls back");
} catch (e) {
  failed++;
  console.log(`  FAIL  unknown player\n        ${e.message}`);
}

// One identical render for all 48 means the card is not reading the player at
// all, EXCEPT where a card is deliberately not personal.
//
//   Cards 5, 11, 12 and 15 are league-wide, rules copy, or the doorway into the
//   second half. Identical by design.
//   Cards 3, 4, 6, 7, 13 and 16 are about the team, so they top out at 24:
//   teammates share a team and correctly get the same screen.
//
// Everything else has to differ across all 48.
const EXPECTED_MIN = {
  3: 20, 4: 20, 5: 1, 6: 20, 7: 20,
  11: 1, 12: 1, 13: 20, 14: 20, 16: 1, 17: 20,
};
const perCard = {};
for (const [k, v] of seen) {
  const i = parseInt(k.split("|")[1], 10);
  (perCard[i] ||= new Set()).add(v);
}
console.log("\n  card  distinct renders across 48 players");
const flat = [];
for (let i = 0; i < CARDS; i++) {
  const n = perCard[i]?.size ?? 0;
  const min = EXPECTED_MIN[i + 1] ?? 40;
  const bad = n < min;
  if (bad) flat.push(`${i + 1} (${n}, expected ${min}+)`);
  console.log(`  ${String(i + 1).padStart(4)}  ${String(n).padStart(3)}${bad ? "   <-- too flat" : ""}`);
}
if (flat.length) {
  failed++;
  console.log(`\n  cards not personalised: ${flat.join(", ")}`);
}

console.log(failed ? `\n${failed} of ${total} failed` : `\nall ${total} rendered`);
process.exit(failed ? 1 : 0);
