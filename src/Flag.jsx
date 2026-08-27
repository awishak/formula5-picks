// A flag, drawn rather than fetched or set as an emoji.
//
// Three sources, best first:
//
//   1. art in this file        the 15 simple ones, theme-consistent and animatable
//   2. /flags/us-xx.svg        states, D.C. and territories, real artwork as files
//   3. the emoji flag          every other country
//   4. the code on a plate     nothing should reach this, but a hole is worse
//
// States are files rather than anything bundled because a state flag is a seal
// on blue: Pennsylvania alone is 119KB.
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
// How much of an emoji's font size the flag artwork actually occupies. Measured
// by painting a glyph to a canvas and reading the non-transparent bounds, on
// 2026-08-26: every flag came back identical at 0.880 x 0.640, a 1.38 ratio
// rather than the 3:2 the drawn ones use.
const EMOJI_ART_W = 0.880;

const emojiFlag = code => (/^[A-Z]{2}$/.test(code)
  ? String.fromCodePoint(...[...code].map(ch => 0x1f1e6 + ch.charCodeAt(0) - 65))
  : null);

/**
 * A name with its flag after it.
 *
 * Inline rather than in a column of its own. A third of the league has not
 * picked one, and a flag column would be a third empty holes, which reads as a
 * bug. Inline, a missing flag is simply absence.
 *
 * The name truncates and the flag does not, so a long name gives way rather
 * than pushing the flag off the row.
 */
export function Flagged({ name, nation, size = "1.5em", style, gap = 7, wrap = false }) {
  // The font size moves to the wrapper so an em-sized flag resolves against the
  // name rather than against whatever the row happens to be set in. Default
  // 1.5em is a 3:2 flag exactly one line of text tall.
  const { fontSize, ...rest } = style || {};
  // wrap: a name too long for one line takes a second one instead of losing
  // its end. Shortening a name is the other way out and Andrew ruled it out on
  // 2026-08-26: a name gets fitted, not cut and not abbreviated. Sizing the
  // whole column to the longest name is the third, and it costs every other
  // row four points of type to rescue one.
  const line = wrap
    ? { minWidth: 0, overflowWrap: "anywhere" }
    : { minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
  return (
    <span style={{ display: "flex", alignItems: "center", gap, minWidth: 0, fontSize }}>
      <span style={{ ...line, ...rest }}>{name}</span>
      {nation ? (
        <span style={{ flexShrink: 0, display: "inline-flex", lineHeight: 0 }}>
          <Flag nation={nation} size={size} />
        </span>
      ) : null}
    </span>
  );
}

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
  // A number is pixels. A string is any CSS length, so a caller can ask for
  // "1.5em" and get a flag the height of the text beside it whatever that text
  // resolves to. The 3:2 field holds either way.
  const px = typeof size === "number";
  const h = px ? (size / 30) * 20 : `calc(${size} * 0.6667)`;
  const emojiSize = px ? size / EMOJI_ART_W : `calc(${size} / ${EMOJI_ART_W})`;

  // No flag is a real choice, and it draws nothing.
  if (want === "") return null;

  if (!ART[want]) {
    const emoji = emojiFlag(want);
    const label = title || NATION_NAME[want] || want;
    if (emoji) {
      // An emoji flag's artwork is 0.880 of the font size wide and 0.640 tall,
      // measured off a rendered glyph rather than assumed. Sizing the font to
      // the box height painted them at 66% the width of a drawn flag, which is
      // why Argentina looked smaller than Brazil in the same list.
      //
      // So the font is sized to fill the width, the box is the same 3:2 every
      // other flag gets, and the 4% of extra height is cropped. A flag is the
      // one picture where losing a sliver top and bottom costs nothing.
      return (
        <span title={label} aria-label={label} role="img"
          className={wave ? "v-wave" : undefined}
          style={{ display: "inline-block", position: "relative", overflow: "hidden",
            width: size, height: h, borderRadius: 1.5, verticalAlign: "middle" }}>
          <span style={{
            position: "absolute", left: "50%", top: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: emojiSize, lineHeight: 1, whiteSpace: "nowrap",
          }}>{emoji}</span>
        </span>
      );
    }
    // States, D.C. and the territories: real artwork, served as a file.
    //
    // A file rather than a bundled component because a state flag is a seal on
    // blue. Pennsylvania is 119KB and the 56 together are 2.5MB, which nobody
    // should download to see one of them. Extracted by scripts/state-flags.mjs.
    if (/^US-[A-Z]{2}$/.test(want)) {
      return (
        <span title={label} style={{ display: "inline-block", lineHeight: 0 }}>
          <img src={`/flags/${want.toLowerCase()}.svg`} alt={label}
            className={wave ? "v-wave" : undefined}
            style={{ width: size, height: h, objectFit: "cover", display: "block",
              borderRadius: 1.5, background: "#1d1d2b",
              border: "1px solid rgba(255,255,255,0.28)", boxSizing: "border-box" }} />
        </span>
      );
    }

    // Anything else with no artwork at all: its own code on a plate.
    const short = want.replace(/^US-/, "");
    return (
      <span title={label} aria-label={label}
        className={wave ? "v-wave" : undefined}
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: size, height: h, borderRadius: 2, background: "#1d1d2b",
          border: "1px solid rgba(255,255,255,0.22)",
          fontFamily: "'Encode Sans Semi Condensed', sans-serif", fontWeight: 700,
          fontSize: px ? Math.max(8, h * 0.62) : `calc(${size} * 0.41)`,
          letterSpacing: "0.02em", color: "#a8a8c0",
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
