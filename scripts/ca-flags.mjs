// Writes the Canadian province and territory flags into public/flags/ as SVG.
//
//   node scripts/ca-flags.mjs
//
// Same shape as the US state flags and for the same reason: a provincial flag
// is a shield on a field, so these are files fetched when shown rather than
// bytes in the bundle every player downloads. Extracted once and committed;
// nothing at runtime fetches Wikimedia.
//
// There is no package for these the way us-state-flags supplies the states, and
// adding a dependency needs asking, so the artwork comes from Wikimedia Commons
// through Special:FilePath, which redirects to the current upload. The files are
// the standard flags of Canadian subdivisions and are free to use.
import { mkdirSync, writeFileSync, existsSync } from "node:fs";

const OUT = "public/flags";
mkdirSync(OUT, { recursive: true });

// ISO 3166-2:CA code -> the Commons filename.
const FLAGS = {
  AB: "Flag_of_Alberta.svg",
  BC: "Flag_of_British_Columbia.svg",
  MB: "Flag_of_Manitoba.svg",
  NB: "Flag_of_New_Brunswick.svg",
  NL: "Flag_of_Newfoundland_and_Labrador.svg",
  NS: "Flag_of_Nova_Scotia.svg",
  NT: "Flag_of_the_Northwest_Territories.svg",
  NU: "Flag_of_Nunavut.svg",
  ON: "Flag_of_Ontario.svg",
  PE: "Flag_of_Prince_Edward_Island.svg",
  QC: "Flag_of_Quebec.svg",
  SK: "Flag_of_Saskatchewan.svg",
  YT: "Flag_of_Yukon.svg",
};

// Wikimedia answers 429 to an unpaced run and to a client with no identity on
// it, so the run is paced, identified, and backs off rather than giving up. A
// file already on disk is skipped, so a rerun after a rate limit resumes rather
// than starting over.
const UA = "formula5-picks/1.0 (league app; one-off asset fetch)";
const sleep = ms => new Promise(r => setTimeout(r, ms));

const get = async url => {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { redirect: "follow", headers: { "User-Agent": UA } });
    if (res.ok) return res.text();
    if (res.status !== 429) throw new Error(`HTTP ${res.status}`);
    await sleep(2000 * (attempt + 1));
  }
  throw new Error("rate limited after four tries");
};

let total = 0, failed = 0, skipped = 0;
for (const [code, file] of Object.entries(FLAGS)) {
  const out = `${OUT}/ca-${code.toLowerCase()}.svg`;
  if (existsSync(out)) { skipped++; console.log(`  ${code}  already here`); continue; }
  const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${file}`;
  try {
    const svg0 = await get(url);
    const svg = svg0;
    // A redirect to an HTML error page is still a 200, so check the payload is
    // actually a drawing before writing it over anything.
    // Some of these open on a DOCTYPE rather than the xml declaration or the
    // svg tag, which is still a drawing. Saskatchewan is one.
    if (!/^\s*(<\?xml|<!DOCTYPE\s+svg|<svg)/i.test(svg)) throw new Error("not an SVG");
    writeFileSync(out, svg);
    total += svg.length;
    console.log(`  ${code}  ${(svg.length / 1024).toFixed(0)}KB  ${file}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL ${code}  ${e.message}`);
  }
  await sleep(1200);
}
console.log(`\n${failed ? "FAILED" : "OK"}  ${Object.keys(FLAGS).length - failed - skipped} fetched, ${skipped} already here, ${(total / 1024).toFixed(0)}KB`);
process.exit(failed ? 1 : 0);
