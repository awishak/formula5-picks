// Load every card and every stage in a real browser and fail on any console
// error.
//
// scripts/smoke-weekly.jsx renders through react-dom/server against an esbuild
// bundle, and esbuild reorders module-level constants. So a `const` read before
// its declaration passes the smoke run and throws on load in the browser, which
// is exactly what happened on 2026-08-24 with RACE_STAGES. The bundle is not
// the browser; this checks the browser.
//
//   npm run dev            # in another shell
//   node scripts/check-weekly.mjs [player]
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const run = promisify(execFile);

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.F5_BASE || "http://localhost:5173";
const PLAYER = process.argv[2] || "Andrew Ishak";
const STAGES = [1, 5, 1, 1];

let failed = 0;
for (let card = 0; card < STAGES.length; card++) {
  for (let st = 1; st <= STAGES[card]; st++) {
    const url = `${BASE}/week?card=${card + 1}&stage=${st}&player=${encodeURIComponent(PLAYER)}`;
    let out = "";
    try {
      const r = await run(CHROME, ["--headless=new", "--disable-gpu", "--virtual-time-budget=6000",
        "--enable-logging=stderr", "--v=0", "--dump-dom", url], { maxBuffer: 40 * 1024 * 1024 });
      out = `${r.stdout}\n${r.stderr}`;
    } catch (e) {
      out = `${e.stdout || ""}\n${e.stderr || ""}`;
    }
    const errs = out.split("\n").filter(l => /CONSOLE.*(Uncaught|Error)/i.test(l));
    // A card that painted nothing is a failure even with a clean console.
    const text = out.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ");
    const thin = text.replace(/\s+/g, " ").trim().length < 120;
    const label = STAGES[card] > 1 ? `card ${card + 1} stage ${st}` : `card ${card + 1}`;
    if (errs.length || thin) {
      failed++;
      console.log(`  FAIL  ${label}${thin ? "  (rendered almost nothing)" : ""}`);
      errs.slice(0, 2).forEach(l => console.log(`        ${l.trim().slice(0, 160)}`));
    } else {
      console.log(`  ok    ${label}`);
    }
  }
}
console.log(`\n${failed ? "FAILED" : "OK"}  ${PLAYER}`);
process.exit(failed ? 1 : 0);
