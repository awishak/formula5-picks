// Guard the BOX BOX line comparison.
//
// Players set their pit guess on a dial with a 0.1 step, so the average of four
// guesses always lands on a multiple of 0.025 and can never equal a pit time
// typed in hundredths. Compared at full precision the push branch in scoreRace
// was unreachable: a line of 2.575 shows as "2.58", and a 2.58 stop scored a
// win for OVER against a line everyone had just read as equal. That is a real
// result someone lost, so it gets a test.

import { toHundredths } from "../src/Admin.jsx";

let failed = 0;
const check = (label, fn) => {
  try {
    if (fn() === false) throw new Error("returned false");
    console.log(`  ok    ${label}`);
  } catch (e) { failed++; console.log(`  FAIL  ${label}\n        ${e.message}`); }
};

const line = guesses => guesses.reduce((a, b) => a + b, 0) / guesses.length;
const verdict = (guesses, pit) => {
  const l = toHundredths(line(guesses)), p = toHundredths(pit);
  return p > l ? "OVER" : p < l ? "UNDER" : "PUSH";
};
const shown = guesses => (toHundredths(line(guesses)) / 100).toFixed(2);

console.log("\nbox box line");

check("a line shown as 2.58 against a 2.58 stop is a push", () => {
  const g = [2.5, 2.6, 2.6, 2.6];          // raw 2.5749999999999997
  if (shown(g) !== "2.58") throw new Error(`line shows as ${shown(g)}, not 2.58`);
  const v = verdict(g, 2.58);
  if (v !== "PUSH") throw new Error(`scored ${v}, not PUSH`);
  return true;
});

check("a neighbouring line is not dragged into a push", () => {
  const g = [2.5, 2.6, 2.6, 2.7];          // raw 2.6 -> shows 2.60, not a push
  if (verdict(g, 2.58) !== "UNDER") throw new Error("2.60 line vs 2.58 stop should be UNDER");
  return true;
});

check("a stop clearly either side still resolves", () => {
  const g = [2.5, 2.6, 2.6, 2.6];
  if (verdict(g, 2.90) !== "OVER") throw new Error("2.90 should be OVER");
  if (verdict(g, 2.20) !== "UNDER") throw new Error("2.20 should be UNDER");
  return true;
});

check("rounding is half-up on every line four dial guesses can reach", () => {
  const bad = [];
  for (let q = 60; q <= 160; q++) {            // 1.500 .. 4.000 in 0.025 steps
    const L = q * 0.025;
    const milli = Math.round(L * 1000);
    const halfUp = Math.floor(milli / 10) + (milli % 10 >= 5 ? 1 : 0);
    if (toHundredths(L) !== halfUp) bad.push(`${L} -> ${toHundredths(L)}, want ${halfUp}`);
  }
  if (bad.length) throw new Error(bad.join("; "));
  return true;
});

check("the comparison is symmetric about the line", () => {
  const g = [2.5, 2.6, 2.6, 2.6];              // shows 2.58
  if (verdict(g, 2.59) !== "OVER") throw new Error("2.59 should be OVER");
  if (verdict(g, 2.57) !== "UNDER") throw new Error("2.57 should be UNDER");
  return true;
});

console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
