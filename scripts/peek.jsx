// Print the rendered TEXT of recap cards, so copy gets read as copy.
//
// The voice mistakes on this deck all happened because the prose lives inside
// template strings in cards.mjs and JSX in Recap.jsx, and got reviewed as code.
// This renders the cards and strips the markup so the sentences can be read.
//
//   npm run peek                                   cards 1,2,3,4,6,11,13,14
//   PEEK_CARDS=5,9 npm run peek                    just those
//   PEEK_PLAYER="Evie Ishak" npm run peek          somebody else's deck

import { renderToString } from "react-dom/server";
import Recap from "../src/Recap.jsx";
const strip = h => h.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const who = process.env.PEEK_PLAYER || "Andrew Ishak";
for (const c of (process.env.PEEK_CARDS || "1,2,3,4,6,11,13,14").split(",").map(Number)) {
  const html = renderToString(<Recap playerName={who} initialCard={c - 1} />);
  console.log(`\n=== CARD ${c} ===\n` + strip(html).slice(0, 760));
}
