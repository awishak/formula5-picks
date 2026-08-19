// Vegas design tokens for the second-half look. Black ground, neon blue and pink.
//
// Two rules this file exists to enforce:
//   1. Type comes from TYPE. Nothing below 13px, ever. The old app had 224
//      instances at 10px or smaller and 13 at 7px, which is why we are here.
//   2. Color comes from V. No hardcoded hex in Vegas components, so the next
//      re-skin is a change here and not a pass over 1,200 style objects.

export const V = {
  // Ground. Not pure black: a hair of blue reads as night rather than as "off".
  bg: "#07070c",
  bg2: "#0e0e17",     // card
  bg3: "#151521",     // raised card / input
  bg4: "#1d1d2b",     // hover, track fill

  // Neon. Saturated and light enough to glow convincingly on black.
  blue: "#00d9ff",
  blueDim: "#0a8ba8",
  pink: "#ff2d95",
  pinkDim: "#a81a5f",
  purple: "#b14aff",

  // Status. Tuned brighter than the light-theme equivalents so they survive glow.
  green: "#2fff9b",
  red: "#ff3b5c",
  amber: "#ffc93c",

  // Division marks, brightened for dark ground.
  gold: "#ffc93c",
  silver: "#c9ccd6",
  bronze: "#e08a52",

  // Text. text2 and text3 are both AA on bg2; nothing dimmer than text3 is allowed.
  text: "#f2f2f7",
  text2: "#a8a8c0",
  text3: "#7a7a94",

  border: "rgba(255,255,255,0.09)",
  border2: "rgba(255,255,255,0.16)",
};

// Three faces, three jobs.
//   FM  Monoton      the marquee, and nothing else. One weight, tube-outline
//                    letterforms. It is a neon sign, not a typeface for UI.
//   FD  Bebas Neue   all display: headers, stats, labels, chips. Tall condensed
//                    caps, so it reads big without eating width. Weight 400 only,
//                    so never set 700/900 on it or the browser fakes a bold.
//   FB  DM Sans      body copy, anything in real sentences or mixed case.
export const FM = "'Monoton', cursive";
// Two display faces, settled 2026-08-18. Bebas, Titillium, Archivo, Chakra
// Petch, Saira, Oswald, Rajdhani and eight more were run through a live picker
// on the standings page, set in the real team names at the real size.
//
//   FD  Encode Sans      titles, headings, labels, chips. Semi-condensed, so the
//       Semi Condensed   longest team name clears the column on a 360px phone,
//                        and it still reads at 15px uppercase, which is where
//                        Bebas Neue and Oswald both fall down.
//   FN  Chakra Petch     the big glowing numbers ONLY. Squared terminals read as
//                        motorsport instrumentation, which is what a stat is.
export const FD = "'Encode Sans Semi Condensed', sans-serif";
export const FN = "'Chakra Petch', sans-serif";
export const FB = "'DM Sans', sans-serif";

// Type scale. Floor is 13px and the labels sit at 15, which is where the old
// app's 9-11px micro-labels went. Bebas is condensed, so these run larger than
// the light theme's equivalents and still take less horizontal room.
export const TYPE = {
  hero:   { fontSize: 62, lineHeight: 0.9,  letterSpacing: "0.01em" },
  h1:     { fontSize: 42, lineHeight: 0.95, letterSpacing: "0.01em" },
  h2:     { fontSize: 30, lineHeight: 1.0,  letterSpacing: "0.02em" },
  h3:     { fontSize: 23, lineHeight: 1.05, letterSpacing: "0.02em" },
  stat:   { fontSize: 36, lineHeight: 0.95, letterSpacing: "0.01em" },
  chip:   { fontSize: 15, letterSpacing: "0.08em" },
  // Body steps stay in DM Sans and keep real weights.
  body:   { fontSize: 15, fontWeight: 400, lineHeight: 1.5 },
  bodyMd: { fontSize: 15, fontWeight: 600, lineHeight: 1.4 },
  bodySm: { fontSize: 14, fontWeight: 400, lineHeight: 1.45 },
};

// Bebas has one weight. Pinning 400 here means a stray fontWeight in a caller
// cannot trigger synthetic bold, which on a condensed face looks like a smudge.
const NUMERIC = new Set(["hero", "stat"]);
export const display = (step, extra = {}) => ({
  fontFamily: NUMERIC.has(step) ? FN : FD,
  // Bebas shipped one weight. Both of these have real ones, so headings sit at
  // 600 and the glowing numbers at 700, where the glow has something to cling to.
  fontWeight: NUMERIC.has(step) ? 700 : 600,
  ...TYPE[step], ...extra,
});
// For a number that is not on the hero or stat step but still wants the face.
export const numeric = (step, extra = {}) => ({ fontFamily: FN, fontWeight: 700, ...TYPE[step], ...extra });
export const body = (step, extra = {}) => ({ fontFamily: FB, ...TYPE[step], ...extra });

// Labels stay off the condensed face. Bebas at label size reads cramped, and
// these are the smallest text on screen, so they get the widest letterforms.
// Chips keep Bebas: they are short, boxed, and read as signage rather than text.
export const label = (extra = {}) => ({
  fontFamily: FB, fontSize: 13, fontWeight: 700,
  letterSpacing: "0.10em", textTransform: "uppercase", ...extra,
});

// The marquee. Monoton has no lowercase worth using and gets wide fast, so the
// size steps down as the race name gets longer rather than wrapping mid-word.
export const marquee = (text, extra = {}) => {
  const n = (text || "").length;
  const fontSize = n <= 7 ? 40 : n <= 10 ? 33 : n <= 14 ? 26 : 21;
  return { fontFamily: FM, fontWeight: 400, fontSize, lineHeight: 1.25, letterSpacing: "0.02em", ...extra };
};

// A Monoton page title, sized to fill the column at any width.
//
// Monoton runs about 0.74px wide per character per point of type, measured off
// a rendered element rather than a specimen: measuring a standalone span said
// 0.62 and the first title ran 49px off the page. So the size that fits is
// (viewport - 32) / (0.74 * characters), with enough slack that it is not flush
// to the edge: measured-to-the-pixel filled the line exactly and read as too
// big on a real phone. Passing the text means a longer title gets a smaller size on its
// own, instead of every page inheriting a number tuned for one of them.
export const titleFit = (text, { min = 22, max = 40, pad = 32 } = {}) => {
  const n = Math.max(1, (text || "").length);
  const per = 0.83 * n;           // px of width per point of type, plus slack
  return `clamp(${min}px, calc(${(100 / per).toFixed(2)}vw - ${(pad / per).toFixed(2)}px), ${max}px)`;
};

// Neon text: three stacked shadows. The tight one gives the tube, the wide one
// gives the bloom on the wall behind it.
export const textGlow = (color, strength = 1) => ({
  color,
  textShadow: [
    `0 0 ${2 * strength}px ${color}`,
    `0 0 ${10 * strength}px ${color}cc`,
    `0 0 ${28 * strength}px ${color}66`,
  ].join(", "),
});

// Neon edge: inner line + outer bloom, so the border reads as a lit tube.
export const edgeGlow = (color, strength = 1) => ({
  border: `1.5px solid ${color}`,
  boxShadow: [
    `inset 0 0 ${10 * strength}px ${color}33`,
    `0 0 ${8 * strength}px ${color}66`,
    `0 0 ${26 * strength}px ${color}33`,
  ].join(", "),
});

export const card = (extra = {}) => ({
  background: V.bg2,
  border: `1px solid ${V.border}`,
  borderRadius: 18,
  ...extra,
});

// Keyframes and the two motion rules. Injected once by VegasShell.
//
// Flicker is deliberately scoped to .v-flicker and used on ONE element per
// screen. A neon sign flickers because it is failing; on every button that
// reads as broken UI rather than as Vegas. prefers-reduced-motion kills all of
// it, which is not optional for an effect that pulses luminance this hard.
export const VEGAS_CSS = `
@keyframes v-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes v-rise { from { transform: translateY(26px); opacity: 0 } to { transform: none; opacity: 1 } }
@keyframes vFlicker {
  0%, 100%   { opacity: 1; }
  41%        { opacity: 1; }
  42%        { opacity: 0.55; }
  43%        { opacity: 1; }
  45%        { opacity: 0.7; }
  46%        { opacity: 1; }
  76%        { opacity: 1; }
  77%        { opacity: 0.42; }
  79%        { opacity: 1; }
}
@keyframes vPulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.62; }
}
@keyframes vSweep {
  0%   { transform: translateX(-110%); }
  100% { transform: translateX(110%); }
}
.v-flicker { animation: vFlicker 7s infinite steps(1, end); }
.v-pulse   { animation: vPulse 2.4s ease-in-out infinite; }
.v-sweep   { animation: vSweep 3.6s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .v-flicker, .v-pulse, .v-sweep { animation: none !important; }
}
.v-scroll::-webkit-scrollbar { height: 0; width: 0; }
`;
