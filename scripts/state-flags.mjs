// Writes the US state, D.C. and territory flags into public/flags/ as plain SVG.
//
//   node scripts/state-flags.mjs
//
// They are extracted once and committed, rather than bundled. A state flag is a
// seal on blue: New York's is 80KB and the 57 together are 2.5MB, which has no
// business in a JavaScript bundle every player downloads to see one of them.
// As files they are fetched only when shown and cached by the browser after.
//
// us-state-flags is a devDependency and nothing at runtime imports it.
import { mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

const DIR = "node_modules/us-state-flags/src/components/flags";
const OUT = "public/flags";
mkdirSync(OUT, { recursive: true });

const files = readdirSync(DIR).filter(f => /^Flag[A-Z]{2}\.js$/.test(f));
let total = 0;
const written = [];

for (const file of files) {
  const code = file.slice(4, 6);
  const mod = await import(`../${DIR}/${file}`);
  const Comp = mod.default || mod[`Flag${code}`];
  if (typeof Comp !== "function") { console.log(`  skip ${code}: no component`); continue; }
  let svg = renderToStaticMarkup(createElement(Comp, { width: 300, height: 200 }));
  // The component hardcodes a width and height. Strip them so the <img> that
  // shows it can be any size, and keep the viewBox doing the work.
  svg = svg.replace(/\swidth="\d+"/, "").replace(/\sheight="\d+"/, "");
  if (!/^<svg/.test(svg)) { console.log(`  skip ${code}: not an svg`); continue; }
  const path = `${OUT}/us-${code.toLowerCase()}.svg`;
  writeFileSync(path, svg);
  total += svg.length;
  written.push([code, svg.length]);
}

written.sort((a, b) => b[1] - a[1]);
console.log(`${written.length} flags, ${(total / 1024).toFixed(0)}KB total`);
console.log("largest:", written.slice(0, 4).map(([c, n]) => `${c} ${(n / 1024).toFixed(0)}KB`).join(", "));
console.log("smallest:", written.slice(-3).map(([c, n]) => `${c} ${(n / 1024).toFixed(1)}KB`).join(", "));
