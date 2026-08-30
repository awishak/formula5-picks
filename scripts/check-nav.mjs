// Walks the app the way a person does: in-app taps, not page loads.
//
//   npm run dev            # in another shell
//   node scripts/check-nav.mjs
//
// This exists because every other check missed React #300. A cold load of any
// page renders a consistent set of hooks, so loading each URL in turn proves
// nothing. The bug only appears when activePage changes WITHOUT a remount, and
// the component returns early above a hook. Reloading is not tapping.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFileSync, unlinkSync } from "node:fs";
const run = promisify(execFile);

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.F5_BASE || "http://localhost:5173";
const PLAYER = process.argv[2] || "Andrew Ishak";

// Each walk is a list of button labels to tap in order, from a cold "/".
const WALKS = [
  ["WEEK IN REVIEW"],
  ["WEEK IN REVIEW", "SKIP"],
  ["WEEK IN REVIEW", "SKIP", "PLAYERS"],
  ["PLAYERS", "TEAMS", "MORE", "HOME"],
  ["TEAMS", "SCHEDULE", "HOME", "WEEK IN REVIEW"],
];

const page = walk => `<meta charset="utf-8"><body style="margin:0">
<iframe id="f" style="width:393px;height:820px;border:0"></iframe>
<script>
try{localStorage.setItem("f1_user",${JSON.stringify(PLAYER)});
localStorage.setItem("f5_week_seen_r12_"+${JSON.stringify(PLAYER)},"1")}catch(e){}
const steps=${JSON.stringify(walk)};
const f=document.getElementById("f"); f.src="/";
let i=0;
const tap=()=>{
  if(i>=steps.length) return;
  const d=f.contentDocument;
  const want=steps[i];
  const b=[...d.querySelectorAll("button")].find(x=>new RegExp(want,"i").test(x.textContent));
  if(b) b.click(); else console.log("NOTFOUND "+want);
  i++; setTimeout(tap,2200);
};
setTimeout(tap,4200);
</script>`;

let failed = 0;
for (const walk of WALKS) {
  const tmp = `public/__nav.html`;
  writeFileSync(tmp, page(walk));
  let out = "";
  try {
    const r = await run(CHROME, ["--headless=new", "--disable-gpu",
      `--virtual-time-budget=${5000 + walk.length * 2600}`,
      "--enable-logging=stderr", "--v=0", `${BASE}/__nav.html`],
      // A hard timeout, because --virtual-time-budget alone does not bound
      // this. Chrome holds virtual time while a network fetch is outstanding,
      // and the app pulls photos and logos off two external CDNs, so one slow
      // image hangs the run rather than failing it.
      { maxBuffer: 40 * 1024 * 1024, timeout: 90000, killSignal: "SIGKILL" });
    out = `${r.stdout}\n${r.stderr}`;
  } catch (e) {
    if (e.killed) { console.log(`  FAIL  ${walk.join(" -> ")}  (timed out)`); failed++; continue; }
    out = `${e.stdout || ""}\n${e.stderr || ""}`;
  }
  finally { try { unlinkSync(tmp); } catch (e) {} }

  const errs = out.split("\n").filter(l => /CONSOLE.*(Uncaught|Error|Rendered (fewer|more) hooks)/i.test(l));
  const notFound = out.split("\n").filter(l => /NOTFOUND/.test(l));
  const label = walk.join(" -> ");
  if (errs.length) {
    failed++;
    console.log(`  FAIL  ${label}`);
    console.log(`        ${errs[0].trim().slice(0, 150)}`);
  } else if (notFound.length) {
    console.log(`  warn  ${label}  (${notFound[0].trim()})`);
  } else {
    console.log(`  ok    ${label}`);
  }
}
console.log(`\n${failed ? "FAILED" : "OK"}  ${WALKS.length} walks`);
process.exit(failed ? 1 : 0);
