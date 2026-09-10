// Prints the Power Rankings board and every write-up under it, so the
// paragraphs get read as copy rather than reviewed as template strings.
//
//   npm run peek:power                 the committed fixture
//   F5_DB=path/to/dir npm run peek:power   a directory of teams/races/scores/schedule/players .json
import { readFileSync } from "node:fs";
import { buildTeamPower } from "../src/teamTable.js";
import { buildPowerNotes } from "../src/powerNotes.js";

let db;
if (process.env.F5_DB) {
  db = {};
  for (const t of ["teams", "races", "scores", "schedule", "players"]) db[t] = JSON.parse(readFileSync(`${process.env.F5_DB}/${t}.json`, "utf8"));
} else {
  db = JSON.parse(readFileSync(new URL("./weekly-fixture.json", import.meta.url), "utf8"));
}
const power = buildTeamPower(db);
const notes = buildPowerNotes(power, db);
console.log(`Power Rankings after round ${power.round}\n`);
console.log(`    ${"".padEnd(16)} grade   raw  move\n`);
for (const r of power.rows) {
  const mv = r.move == null ? "new" : r.move > 0 ? `+${r.move}` : String(r.move);
  console.log(`${String(r.place).padStart(2)}  ${r.short.padEnd(16)} ${String(r.rating).padStart(5)} ${String(r.raw).padStart(5)}  ${mv.padStart(4)}  ${r.division === "championship" ? "CHAMP" : "2ND  "}  ${r.w}-${r.l}-${r.d}`);
  console.log(`    ${notes[r.id]}\n`);
}
