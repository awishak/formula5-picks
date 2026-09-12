// Render every recap card for every player and fail loudly on any runtime error.
//
// `vite build` does not catch undefined identifiers: a missing helper compiles
// clean and throws in the browser. This deck has 48 decks x 10 cards and six
// stake branches, so most of it is never on screen at once.
//
// Coverage here is per (player, card), not per player. A card index that is not
// in the loop is silently untested, so adding a card means raising DECK_CARDS.
//
// The deck can also carry a race clip in FRONT of the ten cards, which shifts
// every deck index by one. That is covered separately at the bottom.

import { renderToString } from "react-dom/server";
import Recap from "../src/Recap.jsx";
import DATA from "../src/recapData.json";

const names = Object.keys(DATA.players);
const DECK_CARDS = 10;

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
  for (let i = 0; i < DECK_CARDS; i++) {
    // Card 4 holds its outcome behind a click, so both halves need rendering.
    for (const reveal of i === 3 ? [false, true] : [false]) {
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
// all. Cards 4, 5 and 6 are about the team rather than the player, so they top
// out at 24: teammates share a team and correctly get the same screen.
const EXPECTED_MIN = { 4: 20, 5: 20, 6: 20 };
const perCard = {};
for (const [k, v] of seen) {
  const i = parseInt(k.split("|")[1], 10);
  (perCard[i] ||= new Set()).add(v);
}
console.log("\n  card  distinct renders across 48 players");
const flat = [];
for (let i = 0; i < DECK_CARDS; i++) {
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

// ── The race clip in front of the deck ───────────────────────────────────────
// The clip card itself is the same for all 48 and is not personalised, so it is
// deliberately outside the flatness check above.
//
// The real risk is the deck BEHIND it. The Vegas turn, the board travel and card
// 4's reveal are all index-driven, so a wrong offset moves them silently rather
// than throwing. Compare the card background either side of the turn to prove
// the deck still reads deck-relative.
const bgOf = html => (html.match(/background:\s*([^;"]+)/) || [, ""])[1].trim();

console.log("\n  race clip in front");

for (const name of names) {
  for (let i = 0; i < DECK_CARDS + 1; i++) {
    // Card 4 is deck index 3, which is index 4 once the clip is in front.
    for (const reveal of i === 4 ? [false, true] : [false]) {
      total++;
      try {
        const html = renderToString(
          <Recap playerName={name} initialCard={i} initialReveal={reveal} showRaceClip />
        );
        if (!html || html.length < 200) throw new Error(`suspiciously short: ${html.length} chars`);
      } catch (e) {
        failed++;
        console.log(`  FAIL  ${name} clip-on card ${i + 1}${reveal ? " (revealed)" : ""}\n        ${e.message}`);
      }
    }
  }
}

const check = (label, fn) => {
  try {
    if (fn() === false) throw new Error("returned false");
    console.log(`  ok    ${label}`);
  } catch (e) { failed++; console.log(`  FAIL  ${label}\n        ${e.message}`); }
};

const probe = Object.keys(DATA.players)[0];
const off = n => renderToString(<Recap playerName={probe} initialCard={n} />);
const on = n => renderToString(<Recap playerName={probe} initialCard={n} showRaceClip />);

check("clip card carries the video and its poster", () => {
  const html = on(0);
  if (!html.includes("/spanish-gp-2026.mp4")) throw new Error("no video source");
  if (!html.includes("/spanish-gp-2026-poster.jpg")) throw new Error("no poster");
  return true;
});

check("clip card is first, title card moves to second", () => {
  if (on(0).includes("first half,")) throw new Error("title card still first");
  if (!on(1).includes("first half,")) throw new Error("title card not at index 1");
  return true;
});

check("the deck turns Vegas one card later with the clip in front", () => {
  const lightOff = bgOf(off(5)), vegasOff = bgOf(off(6));
  if (lightOff === vegasOff) throw new Error("no turn in the plain deck — probe is wrong");
  if (bgOf(on(6)) !== lightOff) throw new Error(`clip-on card 7 should still be light, got ${bgOf(on(6))}`);
  if (bgOf(on(7)) !== vegasOff) throw new Error(`clip-on card 8 should be Vegas, got ${bgOf(on(7))}`);
  return true;
});

check("the clip card itself is light, not Vegas", () =>
  bgOf(on(0)) === bgOf(off(0)) || (() => { throw new Error("clip card is not on the light ground"); })());

console.log(failed ? `\n${failed} of ${total} failed` : `\nall ${total} rendered`);
process.exit(failed ? 1 : 0);
