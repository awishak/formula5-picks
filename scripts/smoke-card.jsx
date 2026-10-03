// Renders the player card for all 48 through react-dom/server off the committed
// fixture and exits non-zero on a runtime error, if any card is missing a part,
// or if two players render the same card. Nothing here touches Supabase.
//
//   npm run smoke:card
import { renderToStaticMarkup } from "react-dom/server";
import { PlayerCardBody } from "../src/PlayerCard.jsx";
import { buildPlayerCard } from "../src/playerCard.js";
import { buildDrivingStyles, STYLE_NAMES } from "../src/drivingStyle.js";
import { SLOGAN_BANK, SLOGAN_OF } from "../src/slogans.js";
import db from "./weekly-fixture.json";

let failed = 0;
const fail = m => { console.error(`  FAIL  ${m}`); failed++; };

// The hundred, and the 48 out of it.
if (SLOGAN_BANK.length !== 100) fail(`slogan bank holds ${SLOGAN_BANK.length}, not 100`);
if (new Set(SLOGAN_BANK).size !== SLOGAN_BANK.length) fail("a slogan repeats in the bank");
const chosen = Object.values(SLOGAN_OF);
if (new Set(chosen).size !== chosen.length) fail("two players share a slogan");
chosen.forEach(s => { if (!SLOGAN_BANK.includes(s)) fail(`chosen slogan not in the bank: ${s}`); });

// Every type has a name.
Object.values(STYLE_NAMES).forEach(b => Object.values(b).forEach(s => Object.values(s).forEach(n => { if (!n) fail("a style has no name"); })));

const styles = buildDrivingStyles(db);
const seen = new Set();
const types = {};
for (const p of db.players) {
  const data = buildPlayerCard(db, p.name);
  if (!data) { fail(`${p.name}: no card`); continue; }
  if (!data.style || !data.style.type) fail(`${p.name}: no driving style`);
  if (!data.slogan) fail(`${p.name}: no slogan`);
  if (!data.career || !data.career.seasons.length) fail(`${p.name}: no career`);
  if (data.career.seasons[data.career.seasons.length - 1].year !== 2026) fail(`${p.name}: career does not end on 2026`);
  // Podiums are first, second and third only, listed once each, and every
  // prior year's points a race is on the 2026 footing.
  const listed = data.career.podiums.length;
  const counted = data.career.seasons.reduce((a, s) => a + s.podiums, 0);
  if (listed !== counted) fail(`${p.name}: ${listed} podiums listed, ${counted} counted`);
  if (data.career.podiums.some(f => f.place > 3)) fail(`${p.name}: a podium past third`);
  data.career.seasons.forEach(s => {
    if (s.year < 2026 && !(s.adjusted && Number.isFinite(s.pprAdj))) fail(`${p.name}: ${s.year} PPR not adjusted`);
    if (s.year === 2026 && s.adjusted) fail(`${p.name}: 2026 marked adjusted`);
  });
  types[data.style.type] = (types[data.style.type] || 0) + 1;
  // Opened, so the list is in the markup; then folded, which must carry one
  // mark a podium and no Grand Prix.
  const html = renderToStaticMarkup(<PlayerCardBody data={data} onClose={() => {}} openPodiums />);
  const folded = renderToStaticMarkup(<PlayerCardBody data={data} onClose={() => {}} />);
  const marks = (folded.match(/\u{1F3C6}|\u{1F948}|\u{1F949}/gu) || []).length;
  // The stat tile carries no mark, so every one in the folded card is the case.
  if (marks !== data.career.podiums.length) fail(`${p.name}: folded case shows ${marks} marks for ${data.career.podiums.length} podiums`);
  if (data.career.podiums.length && folded.includes("Grand Prix")) fail(`${p.name}: folded card lists podiums`);
  for (const part of [p.name, "Driving style", "Podiums", "Career", "PPR", ">2026<", data.style.type, ...(data.career.podiums.length ? ["Grand Prix"] : [])]) {
    // react-dom/server writes an apostrophe as an entity.
    if (!html.includes(part.replace(/'/g, "&#x27;"))) fail(`${p.name}: card missing "${part}"`);
  }
  if (seen.has(html)) fail(`${p.name}: identical to another player's card`);
  seen.add(html);
}
// The titles: one a prior season, and the loo is never a chip.
const champions = db.players.map(p => buildPlayerCard(db, p.name)).filter(d => d.career.titles.length);
if (!champions.some(d => d.name === "Andrew Ishak" && d.career.titles.includes(2025))) fail("Andrew Ishak is not the 2025 World Champion");
if (!champions.some(d => d.name === "Kevin Coolidge" && d.career.titles.includes(2024))) fail("Kevin Coolidge is not the 2024 World Champion");
db.players.forEach(p => { const d = buildPlayerCard(db, p.name); if (d.career.extras.some(x => x.mark === "\u{1F6BE}")) fail(`${p.name}: the loo is drawn as a trophy`); });
console.log(`${seen.size} cards, ${Object.keys(types).length} of 12 types in use`);
Object.entries(types).sort((a, b) => b[1] - a[1]).forEach(([t, n]) => console.log(`  ${String(n).padStart(2)}  ${t}`));
console.log(`league medians: pit deviation ${styles.league.pitDev?.toFixed(2)}s, popularity ${styles.league.popularity?.toFixed(2)}`);
if (failed) { console.error(`\nFAILED ${failed}`); process.exit(1); }
console.log("OK");
