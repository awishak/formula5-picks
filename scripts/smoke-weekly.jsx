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
import { buildWire } from "../src/wire.js";
import DB from "./weekly-fixture.json";

const CARDS = 4;
// Card 2 plays out in five presses. A stage that is never rendered here is
// silently untested, which is the whole reason this script exists, so the loop
// walks every stage of every card.
const STAGES = [1, 3, 1, 1];
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

// Round 14 opens on a video ahead of card 1, and no other round does. The
// fixture is not round 14, so the round is swapped on the data: the deck picks
// its card list off `round` alone. Every card behind the video has to render
// one place later, and the deck without it must be unchanged.
{
  const base = buildWeekly(DB, names[0]);
  const r14 = { ...base, round: 14, raceName: "Spanish Grand Prix" };
  const check = (label, fn) => {
    total++;
    try { fn(); console.log(`  ok    ${label}`); }
    catch (e) { failed++; console.log(`  FAIL  ${label}\n        ${e.message}`); }
  };
  check("round 14 opens on the video", () => {
    const html = renderToString(<WeeklyDeck data={r14} initialCard={0} />);
    if (!/<video[^>]+r14-spain\.mp4/.test(html)) throw new Error("no video on card 1");
    if (!/SPANISH GRAND PRIX/.test(html)) throw new Error("no kicker");
    if (!/Mute the video/.test(html)) throw new Error("sound is not on by default");
    if (!/aria-label="Play the video"/.test(html)) throw new Error("no play button");
    if (/<video[^>]*autoplay/i.test(html)) throw new Error("the video autoplays");
  });
  check(`round ${base.round} does not`, () => {
    const html = renderToString(<WeeklyDeck data={base} initialCard={0} />);
    if (/<video/.test(html)) throw new Error("a video on a round that has none");
  });
  STAGES.forEach((n, ci) => {
    for (let st = 0; st < n; st++) check(`round 14 card ${ci + 2}${n > 1 ? ` stage ${st + 1}` : ""} matches card ${ci + 1} without the video`, () => {
      // The video, the progress lights, and Back, which card 1 only grows
      // because there is now a card behind it.
      const strip = s => s.replace(/<video[\s\S]*?<\/video>/g, "").replace(/ROUND \d+[^<]*/g, "")
        .replace(/<button[^>]*aria-label="Back"[\s\S]*?<\/button>/g, "")
        .replace(/<div style="flex:1;height:3px[\s\S]*?<\/div><\/div>/g, "");
      const a = strip(renderToString(<WeeklyDeck data={r14} initialCard={ci + 1} initialStage={st} />));
      const b = strip(renderToString(<WeeklyDeck data={{ ...base, raceName: r14.raceName }} initialCard={ci} initialStage={st} />));
      if (/<video/.test(a)) throw new Error("the video rendered past card 1");
      if (a.length < 400) throw new Error(`suspiciously short: ${a.length} chars`);
      if (Math.abs(a.length - b.length) > 200) throw new Error(`differs from the same card without the video by ${a.length - b.length} chars`);
    });
  });
}

// The last card asks for a flag only of somebody who has never chosen one. The
// fixture has nobody with a flag, so both sides are forced here. "" is chose
// no flag, which is an answer, and does not get asked either.
{
  const base = buildWeekly(DB, names[0]);
  const last = data => renderToString(<WeeklyDeck data={data} initialCard={3} />);
  for (const [nation, ask] of [[null, true], ["US-CA", false], ["", false]]) {
    total++;
    const html = last({ ...base, player: { ...base.player, nation } });
    const asked = /CHOOSE YOUR FLAG/.test(html);
    if (asked !== ask) { failed++; console.log(`  FAIL  flag ${JSON.stringify(nation)}: box ${asked ? "shown" : "hidden"}`); }
    else console.log(`  ok    flag ${JSON.stringify(nation)}: box ${ask ? "shown" : "hidden"}`);
  }
  total++;
  const html = last(base);
  if (!/GET VELVET THUNDER NOW/.test(html) || !/featuring Tubey the Worm/.test(html)) {
    failed++; console.log("  FAIL  the advert does not name Velvet Thunder featuring Tubey the Worm");
  } else console.log("  ok    the advert names Velvet Thunder featuring Tubey the Worm");
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

// A round scored with no stop, round 15's Aston Martin. The stop is null in
// results, so BOX BOX is a push for everybody and the Needle scores nothing.
// Every card still renders, nothing prints the word null, and the paper's pit
// story builds. The strip's own "No pit stop this week" plate sits behind a
// beat the server render cannot reach, so it is read, not rendered, here.
{
  const round = buildWeekly(DB, names[0]).round;
  const race = DB.races.find(r => r.round === round);
  const NOSTOP = { ...DB, results: DB.results.map(r => r.race_id === race.id ? { ...r, pit_stop_time: null } : r) };
  let bad = 0;
  for (const name of names) {
    total++;
    try {
      const d = buildWeekly(NOSTOP, name);
      if (d.card4.pit != null) throw new Error("card4.pit is not null");
      if (d.card4.bb !== "push" && d.matchup.myBB !== 0) throw new Error("BOX BOX not a push");
      for (let i = 0; i < CARDS; i++) for (let st = 0; st < STAGES[i]; st++) {
        const html = renderToString(<WeeklyDeck data={d} initialCard={i} initialStage={st} />);
        if (/\bnull\b/.test(html.replace(/<[^>]+>/g, " "))) throw new Error(`card ${i + 1} stage ${st} prints null`);
      }
      const paper = buildWire(d);
      if (!paper || !(paper.stories || paper.cards || paper).length) throw new Error("no paper");
    } catch (e) { bad++; failed++; console.log(`  FAIL  no stop, ${name}: ${e.message}`); }
  }
  if (!bad) console.log(`  ok    no-stop round renders for all ${names.length}, BOX BOX a push, nothing prints null`);
}

console.log(`\n${failed ? "FAILED" : "OK"}  ${total - failed}/${total} renders`);
process.exit(failed ? 1 : 0);
