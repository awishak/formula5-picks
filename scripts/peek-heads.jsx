// Every headline in the deck, for every player, as text. A headline is a
// sentence and gets read as one.
import { renderToString } from "react-dom/server";
import { WeeklyDeck } from "../src/Weekly.jsx";
import { buildWeekly } from "../src/weekly.js";
import DB from "./weekly-fixture.json";

const text = h => h.replace(/<[^>]*>/g, "\n").replace(/&#x27;/g, "'").replace(/&[a-z]+;/g, " ")
  .split("\n").map(s => s.trim()).filter(Boolean);

const KICKERS = [/^YOUR RACE$/, /^YOUR MATCHUP$/, /^WHAT WAS ON THE TABLE$/, /^WHERE YOU STAND$/];
const seen = new Map();
for (const p of DB.players) {
  const data = buildWeekly(DB, p.name);
  if (!data) continue;
  for (const [card, stage] of [[1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [2, 0]]) {
    const t = text(renderToString(
      <WeeklyDeck data={data} initialCard={card} initialStage={stage} />));
    const i = t.findIndex(x => KICKERS.some(k => k.test(x)));
    if (i < 0) continue;
    const head = t[i + 1];
    const key = `card ${card + 1}.${stage + 1}`;
    if (!seen.has(key)) seen.set(key, new Set());
    seen.get(key).add(head);
  }
}
for (const [k, set] of seen) {
  console.log(`\n${k}  (${set.size} distinct)`);
  for (const h of [...set].sort()) console.log(`   ${h}`);
}
