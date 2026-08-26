// The flag picker, rendered server-side, so the list is checked rather than
// assumed. 323 options is too many to eyeball in a browser.
import { renderToString } from "react-dom/server";
import FlagPicker, { FlagRow } from "../src/FlagPicker.jsx";
import Flag from "../src/Flag.jsx";
import { ALL, GROUPS, COUNTRIES, STATES, TERRITORIES } from "../src/nationList.js";

let failed = 0;
const ok = (name, cond) => {
  if (!cond) failed++;
  console.log(`  ${cond ? "ok  " : "FAIL"}  ${name}`);
};

const html = renderToString(<FlagPicker value="EG" onPick={() => {}} onClose={() => {}} />);
ok(`picker renders (${html.length} chars)`, html.length > 5000);
for (const c of ["Egypt", "Texas", "Washington, D.C.", "Puerto Rico", "No flag",
  "Brazil", "Philippines", "United States", "India"]) {
  ok(`"${c}" is in the list`, html.includes(c));
}

ok("unset row says so",
  /Not chosen yet/.test(renderToString(<FlagRow who="A" nation={null} onOpen={() => {}} />)));
ok("chosen row names the place",
  /Egypt/.test(renderToString(<FlagRow who="A" nation="EG" onOpen={() => {}} />)));
ok("no-flag row says No flag",
  /No flag/.test(renderToString(<FlagRow who="A" nation="" onOpen={() => {}} />)));

// Every option must draw something, or a picker row is an empty hole.
let blank = 0;
for (const it of ALL) {
  if (it.code === "") continue;   // no flag draws nothing, on purpose
  const s = renderToString(<Flag nation={it.code} size={20} />);
  if (!s || s.length < 10) { blank++; if (blank < 4) console.log(`  FAIL  ${it.code} drew nothing`); }
}
ok(`all ${ALL.length - 1} flags draw something`, blank === 0);
ok("no flag draws nothing", renderToString(<Flag nation="" size={20} />) === "");

// Every hand-drawn flag must emit valid path data. "MM0,0" got through for a
// week because the only one on screen was the US, which is all rectangles.
const DRAWN = ["US", "GB", "CA", "MX", "BR", "NL", "IT", "FR", "DE", "ES", "AU", "JP", "EG", "IN", "PH"];
let badPath = 0;
for (const code of DRAWN) {
  const svg = renderToString(<Flag nation={code} size={30} />);
  const ds = [...svg.matchAll(/ d="([^"]*)"/g)].map(m => m[1]);
  for (const d of ds) {
    if (/^\s*M\s*M/.test(d) || /[A-Za-z]{2,}/.test(d.replace(/[MLZQCA]/g, x => x))) {
      if (/^\s*MM/.test(d)) { badPath++; console.log(`  FAIL  ${code} path starts "${d.slice(0, 12)}"`); }
    }
  }
  if (!svg.includes("<svg")) { badPath++; console.log(`  FAIL  ${code} did not draw an svg`); }
}
ok(`all ${DRAWN.length} drawn flags emit valid paths`, badPath === 0);

// Every state must point at a file that exists on disk, or the picker shows a
// broken image where a flag should be.
import { existsSync } from "node:fs";
let missingArt = 0;
for (const it of [...STATES, ...TERRITORIES]) {
  const svg = renderToString(<Flag nation={it.code} size={20} />);
  const m = svg.match(/src="([^"]+)"/);
  if (!m) { missingArt++; console.log(`  FAIL  ${it.code} did not render an image`); continue; }
  if (!existsSync(`public${m[1]}`)) {
    missingArt++;
    console.log(`  FAIL  ${it.code} points at public${m[1]}, which is not there`);
  }
}
ok(`all ${STATES.length + TERRITORIES.length} state and territory flags have a file`, missingArt === 0);

console.log(`\n  countries ${COUNTRIES.length}, states ${STATES.length}, territories ${TERRITORIES.length}, groups ${GROUPS.length}`);
console.log(`\n${failed ? "FAILED" : "OK"}  flag picker`);
process.exit(failed ? 1 : 0);
