// Assign a constructor to each remaining race's pit stop question.
//
//   node scripts/pit_questions.mjs            print the assignment
//   node scripts/pit_questions.mjs --write    save it
//
// Rounds 1-11 used all eleven constructors, one apiece. Rounds 12-22 are eleven
// races, so the same again: a shuffle, not a draw with replacement, and nobody
// gets asked about twice in a half.
//
// Round 23 is left alone. It only happens if the FIA holds it, which is why the
// schedule leaves it undrawn too.
import { seededRandom } from "../src/pools.js";

const TEAMS = [
  "Ferrari", "McLaren", "Racing Bulls", "Mercedes", "Audi", "Cadillac",
  "Haas", "Red Bull", "Williams", "Aston Martin", "Alpine",
];

// Mercedes', Williams', Haas', Racing Bulls'. Everyone else takes 's.
const possessive = t => (t.endsWith("s") ? `${t}'` : `${t}'s`);
const question = t => `${possessive(t)} first pit stop`;

const url = process.env.VITE_SUPABASE_URL, key = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error("set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
const H = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json",
            Prefer: "return=representation" };

const seedArg = process.argv.indexOf("--seed");
const rand = seedArg > -1 ? seededRandom(Number(process.argv[seedArg + 1])) : Math.random;

const shuffled = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const races = (await (await fetch(
  `${url}/rest/v1/races?select=id,round,race_name,pit_stop_question&round=gte.12&round=lte.22&order=round`,
  { headers: H })).json());

if (races.length !== TEAMS.length) {
  throw new Error(`${races.length} races for ${TEAMS.length} teams; the one-each assumption is off`);
}

const draw = shuffled(TEAMS);
const plan = races.map((r, i) => ({ ...r, team: draw[i], q: question(draw[i]) }));

plan.forEach(p => console.log(
  `  ${String(p.round).padStart(2)}  ${p.race_name.replace(" Grand Prix", "").padEnd(14)} ${p.q}` +
  (p.pit_stop_question ? `   (was "${p.pit_stop_question}")` : "")));

if (!process.argv.includes("--write")) {
  console.log(`\nNothing was written. Add --write to save it.`);
} else {
  for (const p of plan) {
    // .select() on the way back: a policy mismatch swallows a write here with
    // no error at all.
    const back = await (await fetch(`${url}/rest/v1/races?id=eq.${p.id}`, {
      method: "PATCH", headers: H, body: JSON.stringify({ pit_stop_question: p.q }),
    })).json();
    if (!back.length) throw new Error(`round ${p.round} came back with nothing: check the RLS policy`);
  }
  console.log(`\nWritten to rounds 12-22. Round 23 left empty, same as the schedule.`);
}
