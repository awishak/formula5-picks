/**
 * Two looks over one paper.
 *
 * The Paddock's structure lives in wire.js and its pager lives in Paddock.jsx.
 * Neither knows what colour anything is. This file is the only place that does,
 * so the same nine stories and the same 21 pages render as newsprint or as
 * neon without a second copy of the deck.
 *
 * Three faces, three jobs, the same split the Vegas theme already makes:
 *
 *   SERIF  headlines, standfirsts and body copy on the paper skin
 *   NUM    big numbers only: a score, a stat, a place
 *   SANS   chrome: kickers, captions, buttons, metadata
 *
 * Adding a skin means adding an entry here. It does not mean touching a
 * component, and a component that reaches past this file for a colour is a bug.
 */

import { createContext, useContext } from "react";
import { V, FD, FN, FB, textGlow } from "./theme.vegas.js";

const NO_GLOW = color => ({ color });

// The Athletic at night: near-black ground, one red, a serif that holds a 36px
// headline on a phone.
const PAPER = {
  id: "paper",
  P: {
    bg: "#0d0e12", surface: "#16171d", surface2: "#1d1f26",
    ink: "#ffffff", ink2: "#a7abb8", ink3: "#767b88",
    rule: "#24262e", accent: "#e8384f", accentSoft: "#ff9d5c",
    good: "#2fbf71", bad: "#e8384f",
    track: "#1c1e25", trackFill: "#3a3d47", foe: "#6b6e7a",
  },
  SERIF: "'Source Serif 4', Georgia, 'Times New Roman', serif",
  NUM: "'Source Serif 4', Georgia, 'Times New Roman', serif",
  SANS: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  radius: 4,
  headCase: "none",
  headWeight: 700,
  headTracking: "-0.02em",
  numTracking: "-0.035em",
  glowText: NO_GLOW,
  ringGradient: "conic-gradient(from 210deg, #e8384f, #ff9d5c, #ffffff, #e8384f)",
};

// The second-half Vegas kit, straight off theme.vegas.js. Display type is
// Encode Sans Semi Condensed, the glowing numbers are Chakra Petch and nothing
// else, and body copy stays in DM Sans.
const VEGAS = {
  id: "vegas",
  P: {
    bg: V.bg, surface: V.bg2, surface2: V.bg3,
    ink: V.text, ink2: V.text2, ink3: V.text3,
    rule: V.border, accent: V.blue, accentSoft: V.purple,
    good: V.green, bad: V.pink,
    track: V.bg3, trackFill: V.bg4, foe: V.pinkDim,
  },
  SERIF: FD,
  NUM: FN,
  SANS: FB,
  radius: 18,
  // Display type on this look is set in caps. The face was chosen because it
  // still reads at 15px uppercase, which is the whole reason it beat Bebas.
  headCase: "uppercase",
  headWeight: 600,
  headTracking: "0.01em",
  numTracking: "0.01em",
  glowText: (color, strength = 0.9) => textGlow(color, strength),
  ringGradient: `conic-gradient(from 210deg, ${V.blue}, ${V.purple}, ${V.pink}, ${V.blue})`,
};

export const SKINS = { paper: PAPER, vegas: VEGAS };

const SkinCtx = createContext(PAPER);
export const SkinProvider = SkinCtx.Provider;
export const useSkin = () => useContext(SkinCtx);

// The stylesheet is a function of the skin, because the two looks disagree
// about the ground, the rule colour and which face carries a paragraph.
export const skinCSS = S => `
.pd * { box-sizing: border-box; }
.pd { font-family: ${S.SERIF}; color: ${S.P.ink}; background: ${S.P.bg}; }
.pd button { font-family: ${S.SANS}; cursor: pointer; color: inherit; }
.pd-kicker { font-family: ${S.SANS}; font-weight: 700; font-size: 13px; letter-spacing: .14em;
  text-transform: uppercase; color: ${S.P.accent}; }
.pd-meta { font-family: ${S.SANS}; font-size: 13px; color: ${S.P.ink3}; }
.pd-h { font-weight: ${S.headWeight}; line-height: 1.06; letter-spacing: ${S.headTracking};
  text-transform: ${S.headCase}; }
.pd-body p { font-size: 18px; line-height: 1.6; margin: 0 0 20px; color: ${S.P.ink}; }
.pd-row:active { background: ${S.P.surface}; }
.pd-fade { animation: pdFade .3s ease both; }
@keyframes pdFade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.pd-grow { animation: pdGrow .55s cubic-bezier(.2,.7,.3,1) both; }
@keyframes pdGrow { from { transform: scaleX(0) } to { transform: scaleX(1) } }
@media (prefers-reduced-motion: reduce) {
  .pd-fade, .pd-grow { animation: none !important; }
}
`;
