// Runs the recap's viewer-driven charts headlessly, once per player.
//
// Same reason src/../scripts/smoke.jsx exists: a missing helper compiles clean
// and throws in the browser. There is no DOM here and no dependency to add one,
// so this slices the helpers plus the chart 1/2 IIFE out of the built page and
// runs them against a stub. It proves the code path executes for all 48 seats
// and that the output actually differs between them.
//
// Distinct rendered content is the signal. If every viewer produces the same
// output, the select is not driving anything and this test is worthless.
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../../public/recaps/round11.html", import.meta.url), "utf8");
const script = html.match(/<script>([\s\S]*)<\/script>/)[1];

const START = "const D=";
const END = "/* ============ a generic two-column board";
const slice = script.slice(script.indexOf(START), script.indexOf(END));
if (!slice.includes("cYou")) { console.error("slice missed the chart 1/2 block"); process.exit(1); }

/* ------------------------------------------------------------- DOM stub */
function mkNode() {
  const n = {
    style: {}, dataset: {}, children: [], _html: "", textContent: "", value: "", src: "",
    className: "", _q: {},
    classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
                 contains(c) { return this._s.has(c); }, toggle(c) { this._s.has(c) ? this._s.delete(c) : this._s.add(c); } },
    set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; },
    appendChild(c) { this.children.push(c); return c; },
    addEventListener(ev, fn) { (this._ev ||= {})[ev] = fn; },
    fire(ev) { this._ev?.[ev]?.({ clientX: 0, clientY: 0 }); },
    setAttribute() {}, getAttribute() { return null; },
    getBoundingClientRect() { return { width: 0, height: 0, top: 0, left: 0 }; },
    get clientWidth() { return 700; },
    // stable per-selector children so makeCol's row lookups keep working
    querySelector(s) { return this._q[s] ||= mkNode(); },
    querySelectorAll() { return []; },
  };
  n.classList._s = new Set();
  return n;
}

const registry = {};
const doc = {
  body: { classList: { add() {}, remove() {}, contains() { return false; } } },
  createElement: mkNode, createElementNS: mkNode,
  querySelector: s => registry[s] ||= mkNode(),
  querySelectorAll: () => [],
};

globalThis.document = doc;
globalThis.window = globalThis;
globalThis.innerWidth = 800; globalThis.innerHeight = 900;
globalThis.addEventListener = () => {};
globalThis.setTimeout = fn => { fn(); return 0; };        // run choreography immediately
globalThis.requestAnimationFrame = fn => { fn(); return 0; };
globalThis.IntersectionObserver = class { observe() {} disconnect() {} };

/* ------------------------------------------------------------------ run */
try { new Function(slice)(); }
catch (e) { console.error("THREW on load:", e.message, "\n", e.stack.split("\n").slice(0, 4).join("\n")); process.exit(1); }

const sel = registry["#who"];
const players = sel.children.map(o => o.value);
console.log(`loaded: ${players.length} viewers in the picker`);

const fields = ["#yNeed", "#ySit", "#yOut", "#yOutSub", "#sPR", "#yWin", "#yMu", "#sTitle"];
const snap = () => fields.map(f => {
  const n = registry[f];
  return (n.textContent || "") + (n.innerHTML || "");
}).join("|");

const seen = new Map();
let failures = 0;
for (const name of players) {
  sel.value = name;
  try {
    sel.fire("change");
    // walk every reveal and both animated buttons, the way a reader would
    ["#yb1", "#yb2", "#sb2", "#sb3", "#sb1"].forEach(b => registry[b].fire("click"));
  } catch (e) {
    console.error(`  THREW for ${name}: ${e.message}`);
    failures++; continue;
  }
  const s = snap();
  seen.set(name, s);
  if (!registry["#yNeed"].textContent) { console.error(`  ${name}: empty stake headline`); failures++; }
  if (!registry["#yOut"].textContent) { console.error(`  ${name}: empty outcome`); failures++; }
}

// Compare content, not length. The "you" marker moves between the two rows of a
// team without changing the byte count, so teammates are byte-identical in
// length and only differ in content. Lengths alone would score that as a miss.
const bodies = new Set(seen.values());
const lens = [...seen.values()].map(s => s.length);
console.log(`rendered: ${seen.size} viewers, ${bodies.size} distinct renders (${Math.min(...lens)}-${Math.max(...lens)} bytes)`);

if (bodies.size < players.length) {
  console.error(`FAIL: ${bodies.size} distinct renders across ${players.length} viewers. Some seats render identically.`);
  process.exit(1);
}
if (failures) { console.error(`FAIL: ${failures} problems`); process.exit(1); }
console.log("ok");
