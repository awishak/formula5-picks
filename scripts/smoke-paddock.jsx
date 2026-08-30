// Render every Paddock screen for every player and fail loudly on a runtime error.
//
// `vite build` does not catch undefined identifiers: a missing helper compiles
// clean and throws in the browser, which shipped once and crashed on a phone.
// The paper is 48 players x (a front page + 8 articles + every story frame),
// and almost none of that is ever on screen at once.
//
// Coverage is per screen. A story or a frame missing from the loop is silently
// untested, so the loop walks the frame list each story actually declares
// rather than a count written down here.

import { renderToString } from "react-dom/server";
import { PaddockPaper } from "../src/Paddock.jsx";
import { buildWeekly } from "../src/weekly.js";
import { buildWire, STORY_COUNT } from "../src/wire.js";
import DB from "./weekly-fixture.json";

const names = DB.players.map(p => p.name);

// Compare CONTENT, not output length. Two screens that differ only in which row
// is marked have the same byte count, so counting distinct lengths scores a
// personalised screen as a flat one.
const hash = s => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h;
};

let failed = 0, total = 0;
const byScreen = new Map();
const wireByPlayer = [];
const record = (key, html) => {
  if (!byScreen.has(key)) byScreen.set(key, new Set());
  byScreen.get(key).add(hash(html));
};

const render = (key, el) => {
  total++;
  try {
    const html = renderToString(el);
    if (!html || html.length < 400) throw new Error(`suspiciously short: ${html.length} chars`);
    record(key, html);
  } catch (e) {
    failed++;
    console.log(`  FAIL  ${key}\n        ${e.message}`);
  }
};

for (const name of names) {
  const data = buildWeekly(DB, name);
  if (!data) { failed++; console.log(`  FAIL  ${name}: buildWeekly returned null`); continue; }
  const wire = buildWire(data);
  if (!wire) { failed++; console.log(`  FAIL  ${name}: buildWire returned null`); continue; }
  if (wire.stories.length !== STORY_COUNT) {
    failed++;
    console.log(`  FAIL  ${name}: ${wire.stories.length} stories, expected ${STORY_COUNT}`);
  }
  // Every headline has to be a headline. An empty one means a branch fell
  // through, which reads as a blank front page rather than as an error.
  // The advertisement and the two closers carry no body copy on purpose: an ad
  // is a frame and a flag picker is a control. Everything else is reporting and
  // an empty body means a branch fell through.
  wire.stories.forEach((s, i) => {
    const needsBody = s.kind === "story";
    if (!s.headline || !s.standfirst || (needsBody && !s.body.length)) {
      failed++;
      console.log(`  FAIL  ${name} story ${i + 1} (${s.id}): empty headline, standfirst or body`);
    }
    if (!s.card || (!s.card.frame && !s.card.para)) {
      failed++;
      console.log(`  FAIL  ${name} story ${i + 1} (${s.id}): nothing on the card`);
    }
    if (!s.why) {
      failed++;
      console.log(`  FAIL  ${name} story ${i + 1} (${s.id}): no reason for being in the paper`);
    }
  });

  wireByPlayer.push({ name, wire });
  // One card a story, in both skins, because the skin decides every colour and
  // face on the page and a skin that throws is a blank screen.
  wire.stories.forEach((s, si) => {
    render(`card.${si}`, <PaddockPaper wire={wire} initialStory={si} />);
    render(`vegas.${si}`, <PaddockPaper wire={wire} initialStory={si} skin="vegas" />);
  });
}

// A player with no score for the round must come back null rather than throw,
// which is what the loader turns into the "nothing to print" screen.
try {
  if (buildWire(buildWeekly(DB, "Nobody At All")) !== null) throw new Error("unknown player did not return null");
  console.log("  ok    unknown player returns null");
} catch (e) { failed++; console.log(`  FAIL  unknown player\n        ${e.message}`); }

// Every story has to differ across players. Rendered HTML cannot be the test
// here: the reel is drawn over the front page, so a completely flat frame still
// comes out with a personalised page underneath it. The test is the story
// itself, headline and frames both.
//
// Two are flat on purpose and say why:
//   ad     one advertisement, one album, the same for all 48
//   flag   the reader's own flag, and the fixture predates the column
const FLAT_BY_DESIGN = new Set(["ad", "flag"]);
console.log("");
const byStory = new Map();
for (const { wire } of wireByPlayer) {
  wire.stories.forEach(s => {
    const key = s.id;
    if (!byStory.has(key)) byStory.set(key, new Set());
    byStory.get(key).add(hash(s.headline + JSON.stringify(s.card) + s.body.join("")));
  });
}
const flat = [];
for (const [key, set] of [...byStory.entries()].sort()) {
  if (set.size < 2 && !FLAT_BY_DESIGN.has(key)) flat.push(`${key} (${set.size})`);
}
if (flat.length) {
  failed += flat.length;
  console.log(`  FAIL  identical for all ${names.length} players: ${flat.join(", ")}`);
} else {
  console.log(`  ok    ${byStory.size - FLAT_BY_DESIGN.size} of ${byStory.size} stories differ across players`);
}
for (const [key, set] of [...byStory.entries()].sort()) {
  console.log(`        ${key.padEnd(12)} ${String(set.size).padStart(2)} distinct`);
}

console.log(`\n  ${total - failed}/${total} renders clean, ${names.length} players\n`);
process.exit(failed ? 1 : 0);
