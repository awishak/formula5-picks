// Print every headline the paper can write, for all 48 players, off the
// committed fixture. Headlines are the whole point of this UI and they get read
// as copy, not reviewed as template strings. Same reason `npm run peek` exists.
//
//   node scripts/peek-wire.mjs            every player, headlines only
//   node scripts/peek-wire.mjs "Name"     one player, the whole paper

import { readFileSync } from "node:fs";
import { buildWeekly } from "../src/weekly.js";
import { buildWire } from "../src/wire.js";

const DB = JSON.parse(readFileSync(new URL("./weekly-fixture.json", import.meta.url)));
const who = process.argv[2];
const names = who ? [who] : DB.players.map(p => p.name).sort();

const seen = new Map();
for (const name of names) {
  const data = buildWeekly(DB, name);
  if (!data) { console.log(`\n${name}: no score for the round`); continue; }
  const wire = buildWire(data);
  console.log(`\n\x1b[1m${name}\x1b[0m  ·  round ${wire.round}, ${wire.raceName}`);
  for (const s of wire.stories) {
    console.log(`  ${s.kicker.padEnd(20)} ${s.headline}`);
    console.log(`  ${" ".repeat(20)} \x1b[2m↳ ${s.angle || s.kind}: ${s.why}\x1b[0m`);
    seen.set(s.id, (seen.get(s.id) || new Set()).add(s.headline));
    if (who) {
      console.log(`  ${" ".repeat(20)} \x1b[2m${s.standfirst}\x1b[0m`);
      if (s.byline) console.log(`  ${" ".repeat(20)} \x1b[2mBy ${s.byline} · ${s.read}\x1b[0m`);
      s.body.forEach(p => console.log(`\n      ${p}`));
      console.log("");
    }
  }
}

if (!who) {
  console.log("\n\x1b[1mDISTINCT HEADLINES PER STORY\x1b[0m");
  for (const [id, set] of seen) console.log(`  ${id.padEnd(10)} ${set.size}`);
}
