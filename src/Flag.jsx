// A flag, drawn rather than fetched or set as an emoji.
//
// Drawn because the deck needs one at 16px on a dark card and again at 34px
// waving over a podium, and because an emoji flag renders as two letters on
// some platforms and as somebody else's artwork on the rest.
//
// Nationality comes from nations.js. Anything without an entry there flies the
// default, so a new player never renders a hole.
import { NATIONS, DEFAULT_NATION } from "./nations.js";
import { NAME_OF as NATION_NAME } from "./nationList.js";

// Each flag is a list of plain shapes on a 30x20 field, so they all share one
// aspect ratio and one drawing routine.
const ART = {
  US: [
    { r: [0, 0, 30, 20], f: "#fff" },
    ...Array.from({ length: 7 }, (_, i) => ({ r: [0, i * 3.08 + 1.54, 30, 1.54], f: "#b22234" })),
    { r: [0, 0, 13, 10.8], f: "#3c3b6e" },
  ],
  GB: [
    { r: [0, 0, 30, 20], f: "#012169" },
    { p: "M0,0 30,20 M30,0 0,20", s: "#fff", w: 4 },
    { p: "M0,0 30,20 M30,0 0,20", s: "#c8102e", w: 2 },
    { p: "M15,0 15,20 M0,10 30,10", s: "#fff", w: 6 },
    { p: "M15,0 15,20 M0,10 30,10", s: "#c8102e", w: 3.4 },
  ],
  CA: [
    { r: [0, 0, 30, 20], f: "#fff" },
    { r: [0, 0, 7.5, 20], f: "#d80621" },
    { r: [22.5, 0, 7.5, 20], f: "#d80621" },
    { p: "M15,5 16.6,9 20,8 18,12 21,13 16.6,13.6 17,16 15,14.6 13,16 13.4,13.6 9,13 12,12 10,8 13.4,9 Z", f: "#d80621" },
  ],
  MX: [
    { r: [0, 0, 10, 20], f: "#006847" },
    { r: [10, 0, 10, 20], f: "#fff" },
    { r: [20, 0, 10, 20], f: "#ce1126" },
  ],
  BR: [
    { r: [0, 0, 30, 20], f: "#009c3b" },
    { p: "M15,2.4 27.5,10 15,17.6 2.5,10 Z", f: "#ffdf00" },
    { c: [15, 10, 4.4], f: "#002776" },
  ],
  NL: [
    { r: [0, 0, 30, 6.67], f: "#ae1c28" },
    { r: [0, 6.67, 30, 6.66], f: "#fff" },
    { r: [0, 13.33, 30, 6.67], f: "#21468b" },
  ],
  IT: [
    { r: [0, 0, 10, 20], f: "#009246" },
    { r: [10, 0, 10, 20], f: "#fff" },
    { r: [20, 0, 10, 20], f: "#ce2b37" },
  ],
  FR: [
    { r: [0, 0, 10, 20], f: "#002395" },
    { r: [10, 0, 10, 20], f: "#fff" },
    { r: [20, 0, 10, 20], f: "#ed2939" },
  ],
  DE: [
    { r: [0, 0, 30, 6.67], f: "#000" },
    { r: [0, 6.67, 30, 6.66], f: "#dd0000" },
    { r: [0, 13.33, 30, 6.67], f: "#ffce00" },
  ],
  ES: [
    { r: [0, 0, 30, 5], f: "#aa151b" },
    { r: [0, 5, 30, 10], f: "#f1bf00" },
    { r: [0, 15, 30, 5], f: "#aa151b" },
  ],
  AU: [
    { r: [0, 0, 30, 20], f: "#012169" },
    { r: [0, 0, 15, 10], f: "#00247d" },
    { p: "M0,0 15,10 M15,0 0,10", s: "#fff", w: 2.6 },
    { p: "M7.5,0 7.5,10 M0,5 15,5", s: "#fff", w: 3.4 },
    { p: "M7.5,0 7.5,10 M0,5 15,5", s: "#c8102e", w: 1.8 },
  ],
  JP: [
    { r: [0, 0, 30, 20], f: "#fff" },
    { c: [15, 10, 6], f: "#bc002d" },
  ],
  EG: [
    { r: [0, 0, 30, 6.67], f: "#ce1126" },
    { r: [0, 6.67, 30, 6.66], f: "#fff" },
    { r: [0, 13.33, 30, 6.67], f: "#000" },
  ],
  IN: [
    { r: [0, 0, 30, 6.67], f: "#ff9933" },
    { r: [0, 6.67, 30, 6.66], f: "#fff" },
    { r: [0, 13.33, 30, 6.67], f: "#138808" },
    { c: [15, 10, 2.6], f: "none", s: "#000080", w: 0.9 },
  ],
  PH: [
    { r: [0, 0, 30, 10], f: "#0038a8" },
    { r: [0, 10, 30, 10], f: "#ce1126" },
    { p: "M0,0 13,10 0,20 Z", f: "#fff" },
  ],
};

// A country code as its emoji flag. Two regional indicator letters, which every
// phone in this league renders as real artwork.
//
// This is the only emoji in the app and it is a picture, not writing: there is
// no other way to get 266 flags without shipping 266 files or a dependency.
const emojiFlag = code => (/^[A-Z]{2}$/.test(code)
  ? String.fromCodePoint(...[...code].map(ch => 0x1f1e6 + ch.charCodeAt(0) - 65))
  : null);

/**
 * @param nation  a code from nationList.js: "EG", "US-TX", or "" for no flag
 * @param size    width in px; the flag keeps a 3:2 field
 * @param wave    draws it on a pole with a slow ripple, for the podium
 *
 * Three ways to draw one, best first: art in this file, then the emoji flag,
 * then the code on a chip. US states have no emoji, so they land on the chip
 * until somebody supplies artwork.
 */
export default function Flag({ nation, size = 20, wave = false, title }) {
  const want = nation == null ? DEFAULT_NATION : nation;
  const h = (size / 30) * 20;

  // No flag is a real choice, and it draws nothing.
  if (want === "") return null;

  if (!ART[want]) {
    const emoji = emojiFlag(want);
    const label = title || NATION_NAME[want] || want;
    if (emoji) {
      return (
        <span title={label} aria-label={label} role="img"
          className={wave ? "v-wave" : undefined}
          style={{ display: "inline-block", fontSize: h * 1.12, lineHeight: 1,
            width: size, textAlign: "center" }}>{emoji}</span>
      );
    }
    // A state, or anything else with no artwork: its own code on a plate.
    const short = want.replace(/^US-/, "");
    return (
      <span title={label} aria-label={label}
        className={wave ? "v-wave" : undefined}
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: size, height: h, borderRadius: 2, background: "#1d1d2b",
          border: "1px solid rgba(255,255,255,0.22)",
          fontFamily: "'Encode Sans Semi Condensed', sans-serif", fontWeight: 700,
          fontSize: Math.max(8, h * 0.62), letterSpacing: "0.02em", color: "#a8a8c0",
        }}>{short}</span>
    );
  }

  const code = want;
  const art = ART[code];
  const id = `flagclip-${code}-${wave ? "w" : "s"}`;

  const shapes = art.map((s, i) => {
    if (s.r) return <rect key={i} x={s.r[0]} y={s.r[1]} width={s.r[2]} height={s.r[3]} fill={s.f} />;
    if (s.c) return <circle key={i} cx={s.c[0]} cy={s.c[1]} r={s.c[2]} fill={s.f || "none"}
      stroke={s.s} strokeWidth={s.w} />;
    // The path data already starts with its own M. Prefixing another gave
    // "MM0,0" and every flag drawn from paths emitted invalid SVG. Implicit
    // linetos become explicit so the shorthand in ART stays readable.
    return <path key={i} d={s.p.replace(/ (\d)/g, " L$1")} fill={s.f || "none"}
      stroke={s.s} strokeWidth={s.w} />;
  });

  return (
    <span style={{ display: "inline-block", lineHeight: 0 }}
      title={title || NATION_NAME[code] || code}>
      <svg width={size} height={h} viewBox="0 0 30 20" role="img"
        aria-label={title || NATION_NAME[code] || code}
        className={wave ? "v-wave" : undefined}
        style={{ borderRadius: 1.5, overflow: "hidden", display: "block" }}>
        <defs>
          <clipPath id={id}><rect x="0" y="0" width="30" height="20" rx="1.5" /></clipPath>
        </defs>
        <g clipPath={`url(#${id})`}>{shapes}</g>
        <rect x="0" y="0" width="30" height="20" rx="1.5" fill="none"
          stroke="rgba(255,255,255,0.28)" strokeWidth="1" />
      </svg>
    </span>
  );
}
