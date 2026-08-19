// Render the Vegas surfaces in Node and fail loudly on any runtime error.
// Catches what `vite build` cannot: undefined identifiers, bad property access,
// anything that only explodes when a component actually runs.
import { renderToString } from "react-dom/server";
import VegasHome, { SNAP_FOR_SMOKE } from "../src/VegasHome.jsx";

const cases = [];
for (const tab of ["home", "kit"]) {
  for (const state of ["open", "submitted", "locked", "live", "final"]) {
    for (const lapIdx of [0, 1]) {
      cases.push({ tab, state, lapIdx });
    }
  }
}

let failed = 0;
for (const c of cases) {
  const label = `${c.tab}/${c.state}/lap${c.lapIdx}`;
  try {
    const html = renderToString(<VegasHome week={SNAP_FOR_SMOKE()} initialTab={c.tab} initialState={c.state} initialLap={c.lapIdx} />);
    if (!html || html.length < 200) throw new Error(`suspiciously short output: ${html.length} chars`);
    console.log(`  ok    ${label}  (${html.length} chars)`);
  } catch (e) {
    failed++;
    console.log(`  FAIL  ${label}\n        ${e.message}`);
  }
}
console.log(failed ? `\n${failed} of ${cases.length} failed` : `\nall ${cases.length} rendered`);
process.exit(failed ? 1 : 0);
