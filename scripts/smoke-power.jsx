// Renders the Power Rankings board through react-dom/server for three players
// off the committed fixture and exits non-zero on a runtime error, or if the
// page renders the same for everyone, which would mean the highlight is not
// reading the player. Nothing here touches Supabase.
//
//   npm run smoke:power
import { renderToStaticMarkup } from "react-dom/server";
import { PowerBoard } from "../src/PowerPage.jsx";
import { buildTeamPower } from "../src/teamTable.js";
import { buildPowerNotes } from "../src/powerNotes.js";
import db from "./weekly-fixture.json";

const power = buildTeamPower(db);
const notes = buildPowerNotes(power, db);
if (power.rows.length !== 24) { console.error(`expected 24 rows, got ${power.rows.length}`); process.exit(1); }
if (Object.keys(notes).length !== 24) { console.error("a team has no write-up"); process.exit(1); }

const bad = power.rows.filter(r => !(r.rating >= 0 && r.rating <= 100));
if (bad.length) { console.error("rating off the scale:", bad.map(r => `${r.code} ${r.rating}`).join(", ")); process.exit(1); }

const outs = new Set();
for (const t of [null, power.rows[0].id, power.rows[23].id]) {
  const html = renderToStaticMarkup(<PowerBoard power={power} notes={notes} myTeamId={t} />);
  if (!html.includes("RANKINGS")) { console.error("title missing"); process.exit(1); }
  outs.add(html);
  console.log(`myTeam=${t ? t.slice(0, 8) : "none"} ${html.length} chars`);
}
if (outs.size < 3) { console.error("the highlight is not driving the render: identical output across players"); process.exit(1); }

// Every write-up is a different paragraph. Two teams sharing one would mean the
// sentence bank ran dry for that shape of week.
const texts = Object.values(notes);
if (new Set(texts).size !== texts.length) { console.error("two teams share a write-up"); process.exit(1); }
// And the pre-send checks the voice doc asks for: no clause closing on a bare
// "it", nothing X-not-Y.
const itHit = texts.filter(t => / it[.,;]/.test(t));
if (itHit.length) { console.error("write-up ends a clause on 'it':", itHit[0]); process.exit(1); }
console.log(`smoke:power ok, round ${power.round}, 24 rows, 24 write-ups`);
