// Load every Paddock screen in a real browser and fail on any console error.
//
// scripts/smoke-paddock.jsx renders through react-dom/server against an esbuild
// bundle, and esbuild reorders module-level constants. So a `const` read before
// its declaration passes the smoke run and throws on load in the browser, which
// is exactly what happened on 2026-08-24 with RACE_STAGES in the deck. The
// bundle is not the browser; this checks the browser.
//
// It also catches an animation that never ends. A page with an infinite CSS
// animation never settles, so --dump-dom hangs rather than failing: if this
// script stops printing partway through, look for `infinite` in the styles
// before looking at the network.
//
//   npm run dev              # in another shell
//   node scripts/check-paddock.mjs [player]
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const run = promisify(execFile);

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.F5_BASE || "http://localhost:5173";
const PLAYER = process.argv[2] || "Andrew Ishak";
const STORIES = 9;
// Story 1 is the lead and carries the most frames; four apiece covers every
// frame type the paper can draw.
const FRAMES = 4;

const screens = [{ label: "front page", q: "" }];
for (let s = 1; s <= STORIES; s++) screens.push({ label: `story ${s}`, q: `&story=${s}` });
for (let s = 1; s <= STORIES; s++)
  for (let f = 1; f <= FRAMES; f++)
    screens.push({ label: `story ${s} frame ${f}`, q: `&story=${s}&frame=${f}&mode=reel` });

const check = async ({ label, q }) => {
  const url = `${BASE}/week2?player=${encodeURIComponent(PLAYER)}${q}`;
  let out = "";
  try {
    // A hard timeout, because --virtual-time-budget alone does not bound this.
    // Chrome holds virtual time while a network fetch is outstanding, and the
    // page pulls player photos and driver headshots off two external CDNs, so
    // one slow image hangs --dump-dom forever rather than failing.
    const r = await run(CHROME, ["--headless=new", "--disable-gpu", "--virtual-time-budget=6000",
      "--enable-logging=stderr", "--v=0", "--dump-dom", url],
      { maxBuffer: 40 * 1024 * 1024, timeout: 40000, killSignal: "SIGKILL" });
    out = `${r.stdout}\n${r.stderr}`;
  } catch (e) {
    if (e.killed) return { label, errs: ["timed out waiting for the page"], thin: false };
    out = `${e.stdout || ""}\n${e.stderr || ""}`;
  }
  const errs = out.split("\n").filter(l => /CONSOLE.*(Uncaught|Error)/i.test(l));
  // A screen that painted nothing is a failure even with a clean console.
  const text = out.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ");
  const thin = text.replace(/\s+/g, " ").trim().length < 120;
  return { label, errs, thin };
};

// Four at a time. One Chrome launch a screen is minutes of waiting otherwise.
let failed = 0;
for (let i = 0; i < screens.length; i += 4) {
  const batch = await Promise.all(screens.slice(i, i + 4).map(check));
  for (const r of batch) {
    if (r.errs.length || r.thin) {
      failed++;
      console.log(`  FAIL  ${r.label}${r.thin ? "  (rendered almost nothing)" : ""}`);
      r.errs.slice(0, 2).forEach(l => console.log(`        ${l.trim().slice(0, 160)}`));
    } else {
      console.log(`  ok    ${r.label}`);
    }
  }
}
console.log(`\n${failed ? "FAILED" : "OK"}  ${PLAYER}, ${screens.length} screens`);
process.exit(failed ? 1 : 0);
