// Every player's card 1, printed as text, so the copy gets read as copy rather
// than reviewed as code. Same reason scripts/peek.jsx exists for the recap.
//
//   node_modules/.bin/esbuild scripts/peek-lines.jsx --bundle ... && node ...
//
// Also fails if a {placeholder} ever reaches the screen.
import { renderToString } from "react-dom/server";
import { WeeklyDeck } from "../src/Weekly.jsx";
import { buildWeekly } from "../src/weekly.js";
import DB from "./weekly-fixture.json";

const text = h => h.replace(/<[^>]*>/g, "\n").replace(/&[a-z]+;/g, " ")
  .split("\n").map(s => s.trim()).filter(Boolean);

const seen = new Map();
for (const p of DB.players) {
  const data = buildWeekly(DB, p.name);
  if (!data) continue;
  const t = text(renderToString(<WeeklyDeck data={data} initialCard={0} initialStage={0} />));
  const i = t.findIndex(x => /how did you do yourself/i.test(x));
  const line = i > 0 ? t[i - 1] : "(none)";
  const head = t.find(x => /won!|lost this week|drew this week/.test(x)) || "(no headline)";
  console.log(`${p.name.padEnd(21)} ${head}`);
  console.log(`${" ".repeat(21)} ${line}`);
  seen.set(line, (seen.get(line) || 0) + 1);
}
console.log(`\n${seen.size} distinct lines across ${DB.players.length} players`);
const leaks = [...seen.keys()].filter(l => /[{}]/.test(l));
if (leaks.length) { console.log("PLACEHOLDER LEAK:", leaks); process.exit(1); }
