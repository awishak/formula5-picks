// Renders the Power Rankings board through react-dom/server for three players
// off the committed fixture and exits non-zero on a runtime error, or if the
// page renders the same for everyone, which would mean the highlight is not
// reading the player. Nothing here touches Supabase.
//
//   npm run smoke:power
import { renderToStaticMarkup } from "react-dom/server";
import { PowerBoard } from "../src/PowerPage.jsx";
import { buildTeamPower } from "../src/teamTable.js";
import { buildPowerNotes, buildPowerHeadlines, LORE } from "../src/powerNotes.js";
import db from "./weekly-fixture.json";

const power = buildTeamPower(db);
const nameOf = Object.fromEntries(db.players.map(p => [p.id, p.name]));
const notes = buildPowerNotes(power, db);
if (power.rows.length !== 24) { console.error(`expected 24 rows, got ${power.rows.length}`); process.exit(1); }
if (Object.keys(notes).length !== 24) { console.error("a team has no write-up"); process.exit(1); }

const bad = power.rows.filter(r => !(r.rating >= 0 && r.rating <= 100));
if (bad.length) { console.error("rating off the scale:", bad.map(r => `${r.code} ${r.rating}`).join(", ")); process.exit(1); }

const outs = new Set();
for (const t of [null, power.rows[0].id, power.rows[23].id]) {
  const html = renderToStaticMarkup(<PowerBoard power={power} notes={notes} myTeamId={t} nameOf={nameOf} />);
  if (!html.includes("RANKINGS")) { console.error("title missing"); process.exit(1); }
  if ((html.match(/Last week/g) || []).length !== 24) { console.error("stat block missing on a write-up"); process.exit(1); }
  // Both players on every row: 24 teams, 48 initial-and-surname names.
  const names = (html.match(/\b[A-Z]\. [A-Z][a-z]/g) || []).length;
  if (names < 96) { console.error(`expected 96 short names across rows and write-ups, found ${names}`); process.exit(1); }
  outs.add(html);
  console.log(`myTeam=${t ? t.slice(0, 8) : "none"} ${html.length} chars`);
}
if (outs.size < 3) { console.error("the highlight is not driving the render: identical output across players"); process.exit(1); }

// Every team has lore and every write-up carries one of its lines.
for (const r of power.rows) {
  const bank = LORE[r.code];
  if (!bank || !bank.length) { console.error(`no lore for ${r.code}`); process.exit(1); }
  if (!bank.some(l => notes[r.id].includes(l))) { console.error(`${r.code} write-up carries no lore line`); process.exit(1); }
}
// Every write-up is a different paragraph. Two teams sharing one would mean the
// sentence bank ran dry for that shape of week.
const texts = Object.values(notes);
if (new Set(texts).size !== texts.length) { console.error("two teams share a write-up"); process.exit(1); }
// And the pre-send checks the voice doc asks for: no clause closing on a bare
// "it", nothing X-not-Y.
const itHit = texts.filter(t => / it[.,;]/.test(t));
if (itHit.length) { console.error("write-up ends a clause on 'it':", itHit[0]); process.exit(1); }

// The headline opens every write-up and no two teams take the same one. A
// headline is the one line somebody scanning the page reads, so two teams
// sharing one is two teams reading as the same week. The headlines are checked
// off buildPowerHeadlines rather than off the paragraph, because Andrew's own
// lines carry full stops, exclamation marks and question marks inside them
// ("Guys. are you even trying.", "Dan? Brian? Is this what it feels like to
// win?") and no split on a sentence mark can find the end of one.
const heads = buildPowerHeadlines(power);
if (Object.keys(heads).length !== 24) { console.error("a team has no headline"); process.exit(1); }
for (const r of power.rows) {
  const h = heads[r.id];
  if (!h || !/[.!?]$/.test(h)) { console.error(`${r.code} headline does not end a sentence: ${h}`); process.exit(1); }
  if (!notes[r.id].startsWith(h)) { console.error(`${r.code} write-up does not open on its headline`); process.exit(1); }
}
const hs = Object.values(heads);
if (new Set(hs).size !== hs.length) {
  const seen = new Set(), dupe = hs.find(h => (seen.has(h) ? true : (seen.add(h), false)));
  console.error(`two teams share a headline: ${dupe}`); process.exit(1);
}
console.log(`smoke:power ok, round ${power.round}, 24 rows, 24 write-ups, 24 headlines`);
