// The weekly deck. Eight cards, one player, the round that was just scored.
//
// Same format as the midseason deck in Recap.jsx and the same five rules, so
// read that file's header first. What is different here:
//
//   1. THE DATA IS LIVE. Recap.jsx imports a 521KB JSON built by hand from an
//      export. This one is computed in the browser by src/weekly.js from the
//      round's rows, so a deck exists the moment Admin writes the scores and it
//      changes if a round is rescored. Nothing is generated ahead of time.
//   2. EVERY CHART CARRIES AN ACTION. A button that changes what the chart
//      shows, because the reader should be able to do the thing that reveals
//      the answer rather than read a caption saying what it is.
//   3. VEGAS THROUGHOUT. No light half and no turn, so there is no theme
//      branch: color and type come from theme.vegas.js and nowhere else.
//
// Color carries fixed meaning and never decorates: blue is good, green is
// really good, pink is bad. Green and pink are 1.6 apart under deuteranopia, so
// they never encode the two halves of the same comparison. Wins and losses are
// blue against pink, and amber marks you.
import { useState, useEffect, useMemo, useRef, Fragment } from "react";
import { supabase } from "./supabaseClient";
import { buildWeekly, PIT_FLOOR, PIT_CEIL } from "./weekly.js";
import { shortName } from "./names.js";
import { DRIVER_HEADSHOTS, TEAM_BY_NAME, canonicalName } from "./drivers.js";
import Flag, { Flagged } from "./Flag.jsx";
// The same board the home page draws, from the same file.
import HandsColumns from "./HandsColumns.jsx";
import { F1_TEAM_COLORS } from "./theme";
import {
  V, FM, FD, FN, FB, TYPE, display, numeric, body, label,
  edgeGlow, textGlow, card as vcard, titleFit, titleBox, VEGAS_CSS,
} from "./theme.vegas";

const CARDS = 4;
// Nothing needs a scroll.
const SCROLLS = new Set();
// How many presses a card takes before the deck moves on. Card 2 plays itself
// out in five, everything else is one.
//
// Declared here rather than beside the card, because `const` does not hoist:
// reading a constant defined further down the file throws on load in the
// browser while the bundled smoke run reorders it and passes.
// The presses of card 2, named. Renumbering these by hand across a dozen
// comparisons is how an off-by-one gets into a deck.
const S_RACE = 0, S_COLOR = 1, S_TEAM = 2, S_BB = 3, S_POOL = 4;
const RACE_STAGES = 5;
const CARD_STAGES = [1, RACE_STAGES, 1, 1];
const PAD = h => (h < 740 ? { t: 54, b: 92 } : { t: 64, b: 104 });
const MIN_SCALE = 0.72;

// Wins against losses. Never green against pink: those two are the pair a
// deuteranope cannot separate, and this comparison is the whole of card 2.
const RESULT_COLOR = { won: V.blue, lost: V.pink, drew: V.text3 };
const RESULT_WORD = { won: "WON", lost: "LOST", drew: "DREW" };

const one = n => (n == null ? "-" : Math.round(n * 10) / 10);
const two = n => (n == null ? "-" : Number(n).toFixed(2));
const signed = n => (n > 0 ? `+${n}` : String(n));
const firstName = s => String(s || "").split(/\s+/)[0];
// Drivers only. A person gets shortName; see src/names.js for why.
const lastName = s => String(s || "").split(/\s+/).slice(-1)[0];
// AP style: one through nine spelled out, figures from 10 up. Same for
// ordinals in prose. Table cells and stat tiles keep figures throughout, which
// is also AP.
const AP_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven",
  "eight", "nine"];
const AP_ORDS = ["", "first", "second", "third", "fourth", "fifth", "sixth",
  "seventh", "eighth", "ninth"];
const apNum = n => (n >= 0 && n < 10 ? AP_WORDS[n] : String(n));
const apOrdinal = n => (n > 0 && n < 10 ? AP_ORDS[n] : ordinal(n));

const ordinal = n => {
  if (n == null) return "-";
  const t = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (t[(v - 20) % 10] || t[v] || t[0]);
};

/* ------------------------------------------------------------------ shell */

// Measured fit, lifted from Recap.jsx because every trap it documents applies
// here too. The wrapper has to be released before reading offsetHeight, or the
// card is measured through the constraint left by the previous measurement and
// converges on whatever it read first.
function Card({ children, dep, scrolls }) {
  const inner = useRef(null);
  const wrap = useRef(null);
  const [h, setH] = useState(null);
  const [fit, setFit] = useState(1);
  const [pad, setPad] = useState(PAD(900));

  useEffect(() => {
    const el = inner.current;
    if (!el || typeof window === "undefined") return;
    const measure = () => {
      const p = PAD(window.innerHeight);
      setPad(p);
      const w = wrap.current;
      const held = w ? w.style.height : "";
      if (w) w.style.height = "auto";
      el.style.transform = "none";
      const natural = el.offsetHeight;
      if (w) w.style.height = held;
      const avail = window.innerHeight - p.t - p.b - 4;
      const k = scrolls || natural <= avail ? 1 : Math.max(MIN_SCALE, avail / natural);
      el.style.transform = k < 1 ? `scale(${k})` : "";
      setH(natural * k);
      setFit(k);
      // Published so a headless run can read how far each card had to shrink
      // and whether anything crossed the edge. These must come out equal.
      const de = document.documentElement;
      de.dataset.fit = k.toFixed(3);
      de.dataset.natural = String(natural);
      de.dataset.wide = `${de.scrollWidth}/${de.clientWidth}`;
    };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (ro) ro.observe(el);
    // The display faces arrive after first paint and change every text height,
    // so the first measurement is against fallback metrics and is wrong.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure).catch(() => {});
    // And once more after logos and photos land, since an image has no
    // intrinsic size until it loads.
    const late = setTimeout(measure, 700);
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      clearTimeout(late);
      if (ro) ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, [dep, scrolls]);

  return (
    <div style={{
      minHeight: "100dvh", width: "100%", display: "flex",
      // Centred when the card fits, top justified when the card scrolls.
      // A short card top justified leaves half a phone of black under the last
      // line and reads as something that failed to load. Centring a scrolling
      // card is the other mistake: the top goes off the screen with no way
      // back, so the one card that scrolls keeps its top edge.
      alignItems: scrolls ? "flex-start" : "center", justifyContent: "center",
      padding: `${pad.t}px 14px ${pad.b}px`, margin: "0 auto", maxWidth: 560,
      position: "relative", color: V.text, fontFamily: FB,
    }}>
      <div ref={wrap} data-fit={fit.toFixed(3)} style={{
        width: "100%", height: scrolls ? undefined : h ?? undefined,
        display: "flex", justifyContent: "center",
      }}>
        <div ref={inner} className="f5card" style={{
          width: "100%", maxWidth: "100%", transformOrigin: "top center",
          display: "flex", flexDirection: "column", alignItems: "center",
          textAlign: "center", gap: 12,
        }}>{children}</div>
      </div>
    </div>
  );
}

// Headline first, every card. The takeaway, then whatever supports it.
const Head = ({ children, color = V.text, glow = false, size = "h2", lines = 0 }) => (
  <div style={{
    ...display(size), ...(glow ? textGlow(color) : { color }), textWrap: "balance",
    // `lines` reserves that many lines of height. On a card whose headline
    // changes between presses, the reservation is what stops everything below
    // it sliding up and down on the click.
    ...(lines ? { minHeight: TYPE[size].fontSize * TYPE[size].lineHeight * lines,
                  display: "flex", alignItems: "center", justifyContent: "center" } : {}),
  }}>
    {children}
  </div>
);

const Kicker = ({ children, color = V.text3 }) => (
  <div style={{ ...label({ color }) }}>{children}</div>
);

// The question a card hands to the next one. Quieter than the body, and always
// in the same place, so it reads as a turn of the page rather than as content.
const Ask = ({ children }) => (
  <div style={{ ...body("bodyMd", { fontSize: 14, color: V.blue }),
    textAlign: "center", opacity: 0.92 }}>{children}</div>
);

const Line = ({ children, color = V.text2 }) => (
  <div style={{ ...body("body", { color }), maxWidth: 460, textWrap: "pretty" }}>{children}</div>
);

// The number every card is really about.
// A number that counts when it is one, and sits still when it is a word.
const Stat = ({ n, cap, color = V.blue, size = 36, count = true, delay = 0 }) => (
  <div style={{ display: "grid", gap: 3, justifyItems: "center", padding: "0 4px" }}>
    <div style={{ ...numeric("stat", { fontSize: size }), ...textGlow(color) }}>
      {count && typeof n === "number" ? <Count to={n} delay={delay} dur={720} /> : n}
    </div>
    {/* Three of these sit side by side, and with no gap the captions read as one
        run-on sentence. Hence the padding above and the gap on the row. */}
    {cap && <div style={{ ...label({ color: V.text3, fontSize: 12, lineHeight: 1.25 }) }}>{cap}</div>}
  </div>
);

const Panel = ({ children, glow = null, pad = 14, style = {} }) => (
  <div style={{
    ...vcard({ padding: pad, width: "100%" }),
    ...(glow ? edgeGlow(glow, 0.7) : {}), ...style,
  }}>{children}</div>
);

// Every chart carries its number, so a chart can be named in conversation.
const ChartHead = ({ n, title, action, onAction }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", marginBottom: 10 }}>
    <span style={{ ...numeric("chip", { fontSize: 15, color: V.bg, background: V.blue,
      borderRadius: 5, padding: "1px 7px", lineHeight: 1.5 }) }}>{n}</span>
    <span style={{ ...display("h3", { fontSize: 17, color: V.text, textAlign: "left", flex: 1 }) }}>
      {title || ""}
    </span>
    {action && (
      <button onClick={onAction} style={{
        ...label({ color: V.blue }), background: "transparent", cursor: "pointer",
        border: `1px solid ${V.blue}`, borderRadius: 999, padding: "5px 11px",
        whiteSpace: "nowrap", fontSize: 13,
      }}>{action}</button>
    )}
  </div>
);

/* ------------------------------------------------------------------ charts */

// Chart 2. Every player as a dot: their own score against what their team put
// up, with four people called out on the chart itself.
//
// Both axes start at zero, so a distance on screen is a distance in points.
// Nobody's team scored near zero, which leaves the bottom of the plot empty,
// and that is where the callouts go.
//
// A callout is an avatar with the last name on a pill under the chin, the way
// the rooting board draws a driver. Small, so it fits in a real gap.
//
// The viewBox is 340 wide because that is about the pixel width of the panel on
// a phone. A wider box scales every label down: 13px inside a 440-wide viewBox
// renders near 10px, under the floor the type scale exists to hold.
const VB_W = 340, VB_H = 348;

function Scatter({ c, focus, onFocus }) {
  const L = 32, B = 38, T = 12, R = 10;
  const x1 = c.xMax * 1.08, y1 = c.yMax * 1.1;
  const px = v => L + (v / x1) * (VB_W - L - R);
  const py = v => VB_H - B - (v / y1) * (VB_H - B - T);
  const ticks = m => {
    const st = Math.max(5, Math.ceil(m / 4 / 10) * 10), out = [];
    for (let v = 0; v <= m; v += st) out.push(v);
    return out;
  };

  // The four named players, plus whoever is reading, so you can always find
  // yourself without hunting through 48 dots. If you are already one of the
  // four you get one callout, not two.
  const list = c.corners.some(k => k.who.me) || !c.you
    ? c.corners
    : [...c.corners, { q: "you", label: "YOU", who: c.you }];

  // Lay each callout out first, so its height is known before a slot is chosen.
  const cards = list.map(k => {
    const words = k.label.split(" ");
    const lines = k.label.length <= 9 ? [k.label]
      : k.label.length <= 17 ? [words.slice(0, 2).join(" "), words.slice(2).join(" ")]
      : [words.slice(0, 3).join(" "), words.slice(3).join(" ")];
    return { ...k, lines, w: 76, h: lines.length * 10 + 54 };
  });

  // Find real blank space. Every position on a coarse grid gets scored on how
  // many dots it would cover, whether it lands on a callout already placed, and
  // how far it sits from its own player. Lowest score wins, so a callout moves
  // week to week instead of sitting in a fixed corner.
  const placed = [];
  cards.forEach(k => {
    const dot = { x: px(k.who.x), y: py(k.who.y) };
    let best = null;
    for (let bx = L + 2; bx + k.w <= VB_W - R - 2; bx += 14) {
      for (let by = T + 2; by + k.h <= VB_H - B - 2; by += 14) {
        const covered = c.points.filter(p => {
          const cx = px(p.x), cy = py(p.y);
          return cx > bx - 5 && cx < bx + k.w + 5 && cy > by - 5 && cy < by + k.h + 5;
        }).length;
        const clash = placed.filter(q =>
          bx < q.box.x + q.w + 6 && bx + k.w + 6 > q.box.x &&
          by < q.box.y + q.h + 6 && by + k.h + 6 > q.box.y).length;
        const dist = Math.hypot(bx + k.w / 2 - dot.x, by + k.h / 2 - dot.y);
        const score = covered * 900 + clash * 9000 + dist;
        if (!best || score < best.score) best = { box: { x: bx, y: by }, score };
      }
    }
    if (best) placed.push({ ...k, box: best.box, dot });
  });

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" role="img"
      aria-label="Every player's own score against their team's score">
      {ticks(y1).map(v => (
        <g key={`y${v}`}>
          <line x1={L} x2={VB_W - R} y1={py(v)} y2={py(v)} stroke={V.border} strokeWidth="1" />
          <text x={L - 5} y={py(v) + 4} textAnchor="end"
            style={{ ...numeric("chip", { fontSize: 12 }) }} fill={V.text3}>{v}</text>
        </g>
      ))}
      {ticks(x1).map(v => (
        <text key={`x${v}`} x={px(v)} y={VB_H - B + 15} textAnchor="middle"
          style={{ ...numeric("chip", { fontSize: 12 }) }} fill={V.text3}>{v}</text>
      ))}
      <line x1={L} x2={VB_W - R} y1={VB_H - B} y2={VB_H - B} stroke={V.border2} strokeWidth="1" />
      <line x1={L} x2={L} y1={T} y2={VB_H - B} stroke={V.border2} strokeWidth="1" />
      <text x={(L + VB_W - R) / 2} y={VB_H - 5} textAnchor="middle"
        style={{ ...label({ fontSize: 11 }) }} fill={V.text2}>YOUR POINTS</text>
      <text x={9} y={(VB_H - B + T) / 2} textAnchor="middle"
        transform={`rotate(-90 9 ${(VB_H - B + T) / 2})`}
        style={{ ...label({ fontSize: 11 }) }} fill={V.text2}>TEAM SCORE</text>

      <line x1={px(c.xSplit)} x2={px(c.xSplit)} y1={T} y2={VB_H - B}
        stroke={V.text3} strokeWidth="1" strokeDasharray="3 3" />
      <rect x={px(c.xSplit) + 3} y={T} width="92" height="12" rx="2" fill={V.bg2} />
      <text x={px(c.xSplit) + 6} y={T + 9} style={{ ...label({ fontSize: 10 }) }} fill={V.text3}>
        LEAGUE AVERAGE {c.xSplit}
      </text>

      {c.points.map((p, i) => {
        const owner = list.some(k => k.who.id === p.id);
        const dim = focus && focus !== p.id;
        return (
          <circle key={p.id} className="v-pop"
            cx={px(p.x)} cy={py(p.y)} r={p.me ? 7.5 : owner ? 6 : 4}
            fill={p.me ? V.amber : RESULT_COLOR[p.result]}
            stroke={p.me ? V.amber : owner ? V.text : "none"} strokeWidth={p.me ? 2.5 : owner ? 1.5 : 0}
            style={{
              opacity: dim ? 0.12 : p.me || owner ? 1 : 0.7,
              animationDelay: `${Math.min(600, i * 11)}ms`,
              transition: "opacity 300ms ease",
              filter: p.me ? `drop-shadow(0 0 6px ${V.amber})` : "none",
            }} />
        );
      })}

      {/* Leader lines under the callouts, so a card always covers its own line. */}
      {placed.map(k => (
        <line key={`l${k.q}`} x1={k.box.x + k.w / 2} y1={k.box.y + k.h / 2}
          x2={k.dot.x} y2={k.dot.y} stroke={V.text3} strokeWidth="1"
          style={{ opacity: focus && focus !== k.who.id ? 0.12 : 0.5, transition: "opacity 300ms ease" }} />
      ))}

      {placed.map(k => {
        const w = k.who, b = k.box, mine = w.me;
        const dim = focus && focus !== w.id;
        const cx = b.x + k.w / 2;
        const titleH = k.lines.length * 10;
        const avCy = b.y + titleH + 18;
        const pillW = Math.max(30, shortName(w.name).length * 6 + 10);
        const tone = w.result === "won" ? V.green : w.result === "lost" ? V.pink : V.text2;
        return (
          <g key={k.q} onClick={() => onFocus(focus === w.id ? null : w.id)}
            style={{ cursor: "pointer", opacity: dim ? 0.28 : 1, transition: "opacity 300ms ease" }}>
            <text x={cx} y={b.y + 8} textAnchor="middle" style={{ ...label({ fontSize: 9 }) }}
              fill={mine ? V.amber : V.text3}>
              {k.lines.map((ln, i) => <tspan key={i} x={cx} dy={i ? 10 : 0}>{ln}</tspan>)}
            </text>
            <clipPath id={`av-${k.q}`}><circle cx={cx} cy={avCy} r="15" /></clipPath>
            <circle cx={cx} cy={avCy} r="15" fill={V.bg3}
              stroke={mine ? V.amber : tone} strokeWidth="1.5" />
            {w.photo && (
              <image href={w.photo} x={cx - 15} y={avCy - 15} width="30" height="30"
                preserveAspectRatio="xMidYMid slice" clipPath={`url(#av-${k.q})`} />
            )}
            {/* Last name on a pill under the chin, the way the board draws one. */}
            <rect x={cx - pillW / 2} y={avCy + 8} width={pillW} height="14" rx="7"
              fill="#000" stroke={mine ? V.amber : tone} strokeWidth="1" />
            <text x={cx} y={avCy + 18} textAnchor="middle"
              style={{ fontFamily: FD, fontWeight: 700, fontSize: 11 }}
              fill={mine ? V.amber : "#fff"}>{shortName(w.name)}</text>
            <text x={cx} y={avCy + 35} textAnchor="middle"
              style={{ ...numeric("chip", { fontSize: 11 }) }} fill={V.text2}>
              <tspan fill={V.text}>{w.x}</tspan>
              <tspan> </tspan>
              <tspan fill={tone}>{w.result === "won" ? "W" : w.result === "lost" ? "L" : "D"}</tspan>
              <tspan> {w.y}-{w.opp}</tspan>
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// Chart 3. Which drivers separated the two teams, as a diverging bar. Bars to
// the right are points only your side had.
function GapBars({ gaps }) {
  const max = Math.max(...gaps.map(g => Math.abs(g.gap)), 1);
  return (
    <div style={{ display: "grid", gap: 9, width: "100%" }}>
      {gaps.map((g, i) => {
        const pos = g.gap > 0;
        const w = (Math.abs(g.gap) / max) * 50;
        return (
          <div key={g.driver} style={{ display: "grid", gap: 3 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ ...body("bodySm", { color: V.text, fontWeight: 600 }) }}>{g.driver}</span>
              <span style={{ ...numeric("chip", { fontSize: 15, color: pos ? V.blue : V.pink }) }}>
                {signed(g.gap)}
              </span>
            </div>
            <div style={{ position: "relative", height: 12, background: V.bg3, borderRadius: 3 }}>
              <div style={{ position: "absolute", left: "50%", top: -2, bottom: -2,
                width: 1, background: V.border2 }} />
              <div className="v-grow" style={{
                position: "absolute", top: 0, bottom: 0, borderRadius: 3,
                left: pos ? "50%" : `${50 - w}%`, width: `${w}%`,
                background: pos ? V.blue : V.pink,
                boxShadow: `0 0 8px ${pos ? V.blue : V.pink}88`,
                // Grows out of the centre line, so the bar reads as a gap
                // opening rather than a value sliding in from the edge.
                transformOrigin: pos ? "left center" : "right center",
                animationDelay: `${i * 110}ms`,
              }} />
            </div>
          </div>
        );
      })}
      <div style={{ display: "flex", justifyContent: "space-between", ...label({ fontSize: 12, color: V.text3 }) }}>
        <span>THEIRS</span><span>YOURS</span>
      </div>
    </div>
  );
}

// Charts 4 and 5. The pit guess range, 1.5 to 4.5, with the guesses in the
// matchup, the line they averaged to, and where the stop actually landed.
//
// Names do not hang off the dots. Two people guessing 2.7 put their labels on
// top of each other and on top of the actual marker, which is what the first
// version did. Dots stack upwards when they share a value and the names go in a
// list underneath, where nothing can collide.
function PitLine({ four, line, pit, need = null, wantLow = null, showNames = true }) {
  const LO = 1.5, HI = 4.5, W = 440, H = 132;
  const px = v => 30 + ((Math.min(HI, Math.max(LO, v)) - LO) / (HI - LO)) * (W - 60);
  const axis = 84;

  // Stack anything sharing a value, so four guesses are always four dots.
  const seen = new Map();
  const dots = [...four].filter(f => f.guess != null)
    .sort((a, b) => a.guess - b.guess)
    .map(f => {
      const k = Math.round(f.guess * 20);
      const n = seen.get(k) || 0;
      seen.set(k, n + 1);
      return { ...f, tier: n };
    });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img"
      aria-label="Pit guesses between 1.5 and 4.5 seconds, the BOX BOX line, and the actual stop">
      {/* The stretch of the range your side needs the stop to land in. */}
      {need != null && (
        <rect x={wantLow ? 30 : px(need)} y={axis - 46}
          width={Math.max(0, wantLow ? px(need) - 30 : W - 30 - px(need))} height={52}
          fill={V.green} opacity="0.12" className="v-pop" />
      )}

      <line x1={30} x2={W - 30} y1={axis} y2={axis} stroke={V.border2} strokeWidth="1.5" />
      {[1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5].map(v => (
        <g key={v}>
          <line x1={px(v)} x2={px(v)} y1={axis - 4} y2={axis + 4} stroke={V.text3} strokeWidth="1" />
          <text x={px(v)} y={axis + 20} textAnchor="middle"
            style={{ ...numeric("chip", { fontSize: 13 }) }} fill={V.text3}>{v.toFixed(1)}</text>
        </g>
      ))}

      {/* The line the guesses averaged to. Below the axis, so it cannot land on
          top of the actual marker when the two are close. */}
      {line != null && (
        <g className="v-pop" style={{ animationDelay: "500ms" }}>
          <line x1={px(line)} x2={px(line)} y1={axis} y2={axis + 30}
            stroke={V.blue} strokeWidth="2" strokeDasharray="4 3" />
          <rect x={px(line) - 30} y={axis + 30} width="60" height="18" rx="4" fill={V.bg} />
          {/* Two decimals, the way Admin prints the line. Rounding 2.75 to 2.8
              against a 2.8 stop reads as a push when the OVER actually won. */}
          <text x={px(line)} y={axis + 43} textAnchor="middle"
            style={{ ...numeric("chip", { fontSize: 13 }) }} fill={V.blue}>
            LINE {two(line)}
          </text>
        </g>
      )}

      {/* Where the stop landed. Everything else is measured against this. */}
      <g className="v-pop" style={{ animationDelay: "300ms" }}>
        <line x1={px(pit)} x2={px(pit)} y1={axis - 62} y2={axis + 6}
          stroke={V.amber} strokeWidth="2.5" />
        <rect x={px(pit) - 30} y={axis - 80} width="60" height="19" rx="4" fill={V.bg} />
        <text x={px(pit)} y={axis - 66} textAnchor="middle"
          style={{ ...numeric("chip", { fontSize: 14 }) }} fill={V.amber}>
          STOP {pit}
        </text>
      </g>

      {dots.map((f, i) => (
        <circle key={f.id} className="v-pop"
          cx={px(f.guess)} cy={axis - 12 - f.tier * 13} r={f.me ? 7 : 5}
          fill={f.mine ? V.blue : V.pink}
          stroke={f.me ? V.amber : "none"} strokeWidth={f.me ? 2.5 : 0}
          style={{ animationDelay: `${i * 70}ms`,
            filter: f.me ? `drop-shadow(0 0 6px ${V.amber})` : "none" }} />
      ))}
    </svg>
  );
}

// The four names under chart 4, where a label cannot collide with anything.
function GuessList({ four }) {
  const rows = [...four].filter(f => f.guess != null).sort((a, b) => a.guess - b.guess);
  return (
    <div style={{ display: "grid", gap: 6, width: "100%", marginTop: 4 }}>
      {rows.map(f => (
        <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", flexShrink: 0,
            background: f.mine ? V.blue : V.pink,
            outline: f.me ? `2px solid ${V.amber}` : "none", outlineOffset: 1 }} />
          <span style={{ ...body("bodySm", { color: f.me ? V.amber : V.text,
            fontWeight: f.me ? 700 : 500, flex: 1, textAlign: "left" }) }}>
            {f.me ? "You" : f.name}
          </span>
          <span style={{ ...numeric("chip", { fontSize: 15, color: V.text }) }}>{f.guess}</span>
          <span style={{ ...label({ fontSize: 12, color: f.pts > 0 ? V.green : V.text3, width: 34,
            textAlign: "right" }) }}>{f.pts > 0 ? `+${f.pts}` : "0"}</span>
        </div>
      ))}
    </div>
  );
}

// Chart 6. What each driver's pickers averaged against everyone else. Only
// drivers with a real sample on both sides appear, so a driver picked by 46 of
// 48 is left off rather than compared against two people.
function EdgeBars({ rows, sortKey }) {
  const list = [...rows].sort((a, b) => (sortKey === "swing" ? b.swing - a.swing : b.edge - a.edge));
  const max = Math.max(...list.map(r => Math.abs(sortKey === "swing" ? r.swing : r.edge)), 1);
  return (
    <div style={{ display: "grid", gap: 8, width: "100%" }}>
      {list.map((r, i) => {
        const v = sortKey === "swing" ? r.swing : r.edge;
        const pos = v >= 0;
        const w = (Math.abs(v) / max) * (sortKey === "swing" ? 100 : 50);
        return (
          <div key={r.driver} style={{ display: "grid", gap: 3 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
              <span style={{ ...body("bodySm", { color: r.mine ? V.amber : V.text, fontWeight: 600 }) }}>
                {r.driver}{r.mine ? " \u00b7" : ""}
              </span>
              <span style={{ ...numeric("chip", { fontSize: 14, color: pos ? V.blue : V.pink }) }}>
                {sortKey === "swing" ? `worth ${r.swing}` : `${signed(v)} a person`}
              </span>
            </div>
            <div style={{ position: "relative", height: 10, background: V.bg3, borderRadius: 3 }}>
              {sortKey === "edge" && <div style={{ position: "absolute", left: "50%", top: -2,
                bottom: -2, width: 1, background: V.border2 }} />}
              <div className="v-grow" style={{
                position: "absolute", top: 0, bottom: 0, borderRadius: 3,
                left: sortKey === "swing" ? 0 : pos ? "50%" : `${50 - w}%`,
                width: `${w}%`,
                background: pos ? V.blue : V.pink,
                boxShadow: `0 0 7px ${pos ? V.blue : V.pink}77`,
                transformOrigin: pos ? "left center" : "right center",
                animationDelay: `${i * 70}ms`,
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const Logo = ({ src, size = 36 }) => src
  ? <img src={src} alt="" style={{ width: size, height: size, objectFit: "contain" }} />
  : <div style={{ width: size, height: size, borderRadius: 6, background: V.bg3 }} />;

const Face = ({ src, size = 34, ring = V.border2, width = 2 }) => (
  <div style={{
    width: size, height: size, borderRadius: "50%", overflow: "hidden",
    border: `${width}px solid ${ring}`, background: V.bg3, flexShrink: 0,
  }}>
    {src && <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
  </div>
);

// "Your race", in six presses.
//
//   0  your bar, then the other 47. The podium alongside.
//   1  everyone recoloured by whether their team won.
//   2  zoomed to you and the five either side, faces over the bars.
//   3  team mode. Everyone else goes, the needle and the weekly bonus peel off
//      because a matchup counts neither, then the four bars slide to their
//      seats and the two on each team stack into one.
//   4  the drivers. A driver both teams picked is worth the same to both, so those
//      pair off and go quiet. Whatever is left is what split the two teams.
//   5  BOX BOX lands, and the week finishes on the board the home page uses.
//
// Every stage renders complete. Movement is CSS, so react-dom/server sees the
// finished picture and a reader on reduced motion gets there without the trip.
// The beats each self-playing stage walks through once you arrive.
const TEAM_BEATS = [0, 700, 1400, 2100, 2850];
const HAND_BEATS = [0, 900, 1750];

const MINE_C = V.green, THEIRS_C = V.pink;

// Wider bar for you, on the stages where the field is on screen.
const b0Wide = (r, stage) => r.me && stage <= S_COLOR;

// Every one of the 48 bars is rendered on every stage and never unmounted, so a
// bar that is on screen twice in a row moves between the two rather than
// vanishing and being redrawn somewhere else. A bar with no place in the
// current stage slides off the side it belongs on and the container clips it.
//
// Heights: tall while the field is up, shorter once it is two team bars, and
// shorter again on the drivers stage to make room for the board underneath.
const CHART_H = 170;

function raceLayout(c, stage, beat) {
  const lad = c.ladder;
  const M = c.matchup;
  const mineSet = new Set(M.mineIds), oppSet = new Set(M.oppIds);
  const teamMode = stage >= S_TEAM;

  // One scale for every press, taken from the tallest thing the card will ever
  // draw. A team bar and a player bar are then directly comparable, which they
  // were not when the scale moved under them.
  const maxInd = Math.max(...lad.map(r => r.pts), 1);
  const maxTeam = Math.max(M.myTotal, M.oppTotal, M.myPreBB, M.oppPreBB, 1);
  const H = CHART_H;
  const unit = H / (Math.max(maxInd, maxTeam) * 1.08);

  // Which players have a place on screen, and in what order.
  let shown, n;
  if (stage <= S_COLOR) { shown = lad.map(r => r.id); n = lad.length; }
  // Only the zoom press. This was a `<=` against the pool press, and moving the
  // pool press to the end quietly widened it to catch team mode as well, which
  // drew the matchup with 11 bars. A range test whose meaning depends on the
  // order of the constants is the bug the named constants were meant to stop.
 else {
    // The UNDER seat goes left and the OVER seat goes right, so which side of
    // the chart is yours depends on the seat you were in.
    const myLeft = M.seat === "UNDER";
    shown = myLeft ? [...M.mineIds, ...M.oppIds] : [...M.oppIds, ...M.mineIds];
    n = 4;
  }
  const slotOf = {};
  shown.forEach((id, k) => { slotOf[id] = k; });
  const slot = 100 / n;

  const stripped = teamMode && beat >= 2;
  const moved = teamMode && beat >= 3;
  const merged = teamMode && beat >= 4;
  // Where the on-screen block starts, so a bar leaving knows which way to go.
  const firstPlace = Math.min(...shown.map(id => lad.find(r => r.id === id).place));

  const bars = lad.map(r => {
    const k = slotOf[r.id];
    const on = k != null;
    const isMine = mineSet.has(r.id);
    const pairIdx = on ? k % 2 : 0;
    const groupStart = on ? k - pairIdx : 0;
    const centre = !on ? 0
      : merged ? groupStart + 0.5
      : moved ? groupStart + pairIdx * 0.8 + 0.1
      : k;
    const wide = b0Wide(r, stage);
    // Until the matchup, a bar is one solid block: the points you scored. The
    // split only appears when it starts to matter, which is also when it gets
    // explained. A dim cap on every bar three stages before anyone says what it
    // is just reads as a rendering fault.
    const teamH = teamMode ? r.teamPart * unit : r.pts * unit;
    const indH = teamMode && !stripped ? r.indPart * unit : 0;
    const partnerH = on && merged && pairIdx === 1
      ? (lad.find(x => x.id === shown[groupStart]).teamPart * unit) : 0;

    let color = V.blue;
    if (stage >= S_COLOR) color = r.result === "won" ? MINE_C : r.result === "lost" ? THEIRS_C : V.text3;
    if (teamMode) color = isMine ? MINE_C : THEIRS_C;

    // Off-screen bars park just outside, on the side they came from, at the
    // width they would have had. They keep their height so the slide reads as
    // the field moving rather than the field shrinking.
    const off = r.place < firstPlace ? -1 : 1;
    // Width follows how many bars are actually on screen. Two merged team bars
    // sized for a four-slot grid left a quarter of the column empty, and 48
    // bars sized generously would run into each other.
    const w = merged ? Math.min(30, slot * 1.15)
      : Math.min(18, slot * (wide ? 0.96 : 0.74));
    const left = on ? centre * slot + (slot - w) / 2
      : off < 0 ? -14 - (firstPlace - r.place) * 1.2
      : 104 + (r.place - firstPlace) * 0.6;

    return {
      id: r.id, name: r.name, photo: r.photo, pts: r.pts, place: r.place,
      me: r.me, isMine, on,
      left, width: w,
      teamH, indH, bottom: partnerH, color,
      opacity: on ? 1 : 0,
      // Stage 0 draws you first and then sweeps the field. After that nothing
      // is drawn again; it only moves.
      delay: stage === S_RACE ? (r.me ? 60 : 1150 + r.place * 24)
        : stage === S_COLOR ? r.place * 26
        : on ? 0 : 60,
    };
  });

  return { bars, unit, merged, stripped, moved, n, slot, H, shown, maxInd, maxTeam };
}

function RaceChart({ c, stage, beat }) {
  const { bars, unit, merged, H, maxInd, maxTeam } = raceLayout(c, stage, beat);
  const M = c.matchup;
  // Faces stay with the four bars all the way through the slide, so you can
  // follow who is who. They only give way once two players have become one team
  // and the team plate takes over.
  const showFaces = stage >= S_TEAM && stage < S_POOL && !merged;
  const TOP = 36, BOTTOM = 32;
  const avg = c.averages;
  const refY = v => BOTTOM + (v / (Math.max(maxInd, maxTeam) * 1.08)) * H;
  // A scale, so a bar is worth a number rather than a height. Natural steps of
  // 10, 20, 25 or 50 rather than whatever divides the maximum evenly.
  const top = Math.max(maxInd, maxTeam) * 1.08;
  const step = [10, 20, 25, 50].find(v => top / v <= 4) || 100;
  const gridY = v => BOTTOM + (v / top) * H;
  const grid = [];
  for (let v = step; v < top; v += step) grid.push(v);

  // The axis gets its own gutter. Numbers printed over the first few bars are
  // not a scale, they are noise on top of the data.
  const GUTTER = 24;

  return (
    <div style={{ position: "relative", width: "100%", overflow: "hidden",
      height: H + TOP + BOTTOM,
      transition: "height 560ms cubic-bezier(.3,.7,.3,1)" }}>

      {/* The scale sits behind everything, in the dimmest line the palette has,
          with its numbers out in the gutter where no bar can cover them. */}
      {grid.map(v => (
        <div key={`g${v}`} className="v-move" style={{
          position: "absolute", left: 0, right: 0, bottom: gridY(v), height: 1,
          background: V.border, pointerEvents: "none",
        }}>
          <span style={{ position: "absolute", left: 0, bottom: -6, width: GUTTER - 5,
            textAlign: "right",
            ...numeric("chip", { fontSize: 11, color: V.text3 }) }}>{v}</span>
        </div>
      ))}

      <div style={{ position: "absolute", left: GUTTER, right: 0, top: 0, bottom: 0 }}>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: BOTTOM,
        height: 1, background: V.border2,
        transition: "bottom 560ms cubic-bezier(.3,.7,.3,1)" }} />

      {/* The best score of the week, named on the chart. Whether that player
          won or lost is the whole point of recolouring, and two averages a
          point apart never was the finding. */}
      {stage === S_COLOR && bars.filter(b => b.place === 1).map(b => (
        <div key="best" className="v-pop" style={{
          position: "absolute", left: `${b.left + b.width / 2}%`,
          bottom: BOTTOM + b.teamH + 8, animationDelay: "600ms", pointerEvents: "none",
        }}>
          <span style={{ display: "block", transform: "translateX(-8%)",
            padding: "2px 7px", borderRadius: 7, background: "#000",
            border: `1px solid ${b.color}`, whiteSpace: "nowrap",
            fontFamily: FD, fontWeight: 700, fontSize: 11, color: b.color }}>
            {shortName(b.name)} {b.pts} · {b.color === MINE_C ? "WON" : "LOST"}
          </span>
        </div>
      ))}

      {bars.map(b => (
        <div key={b.id} className="v-move" style={{
          position: "absolute", bottom: BOTTOM + b.bottom, left: `${b.left}%`,
          width: `${b.width}%`, opacity: b.opacity, transitionDelay: `${b.delay}ms`,
          // A bar parked off the side is clipped by the container and carries
          // nothing anyone can read or touch. Saying so keeps it out of the
          // overflow scan, which walks boxes rather than what is visible.
          pointerEvents: b.on ? undefined : "none",
        }}>
          <div className="v-seg" style={{ position: "absolute", bottom: "100%",
            left: "50%", transform: "translateX(-50%)", marginBottom: 7,
            opacity: showFaces ? 1 : 0, pointerEvents: "none" }}>
            <Face src={b.photo} size={b.me ? 30 : 23} ring={b.me ? V.amber : V.border2}
              width={b.me ? 3 : 2} />
          </div>
          {stage >= S_TEAM && !merged && (
            <div className="v-seg" style={{ position: "absolute", top: "100%",
              left: "50%", transform: "translateX(-50%)", marginTop: 6,
              ...label({ fontSize: 10, color: b.color }), whiteSpace: "nowrap" }}>
              {shortName(b.name)}
            </div>
          )}
          {/* Only the first showing is drawn. After that every change is a move. */}
          <div className={stage === S_RACE ? "v-rise" : undefined}
            style={{ transformOrigin: "bottom", animationDelay: `${b.delay}ms` }}>
            <div className="v-seg" style={{
              height: b.indH, borderRadius: "3px 3px 0 0",
              background: beat >= 1 && stage >= S_TEAM ? V.amber : b.color,
              opacity: b.indH ? (beat >= 1 && stage >= S_TEAM ? 1 : 0.5) : 0,
            }} />
            <div className={`v-seg${b.me && stage === S_COLOR ? " v-flash" : ""}`} style={{
              height: b.teamH, borderRadius: b.indH ? 0 : "3px 3px 0 0",
              background: b.color,
              transitionDelay: `${b.delay}ms`,
              outline: b.me && stage < S_TEAM ? `2px solid ${V.amber}` : "none",
              outlineOffset: -1,
              boxShadow: b.me && stage < S_TEAM ? `0 0 12px ${V.amber}aa` : "none",
            }} />
          </div>
        </div>
      ))}

      {/* The same reading as the team strip on card one: everyone to the right
          of your bar is somebody you outscored. */}
      {stage === S_RACE && (() => {
        const mine = c.ladder.find(r => r.me);
        const beat = c.ladder.filter(r => !r.me && mine.pts > r.pts).length;
        const lost = c.ladder.filter(r => !r.me && mine.pts < r.pts).length;
        const at = ((mine.place - 0.5) / c.ladder.length) * 100;
        return (
          <div className="v-pop" style={{ position: "absolute", left: 0, right: 0,
            bottom: BOTTOM - 20, height: 14, animationDelay: "2400ms",
            pointerEvents: "none" }}>
            <span style={{ position: "absolute", left: 0, ...label({ fontSize: 10,
              color: V.text3 }) }}>OUTSCORED BY {lost}</span>
            {at > 26 && at < 72 && (
              <span style={{ position: "absolute", left: `${at}%`,
                transform: "translateX(-50%)", ...label({ fontSize: 10, color: V.amber }) }}>
                YOU
              </span>
            )}
            <span style={{ position: "absolute", right: 0, ...label({ fontSize: 10,
              color: V.blue }) }}>YOU BEAT {beat}</span>
          </div>
        );
      })()}

      {stage === S_RACE && bars.filter(b => b.me).map(b => (
        <div key="you" className="v-pop" style={{
          position: "absolute", left: `${b.left + b.width / 2}%`,
          bottom: BOTTOM + b.teamH + b.indH + 8, transform: "translateX(-50%)",
          animationDelay: "260ms", pointerEvents: "none",
        }}>
          <span style={{ padding: "2px 7px", borderRadius: 7, background: "#000",
            border: `1px solid ${V.amber}`, whiteSpace: "nowrap",
            fontFamily: FD, fontWeight: 700, fontSize: 11, color: V.amber }}>
            YOU {b.pts}
          </span>
        </div>
      ))}

      {stage >= S_BB && merged && bars.filter(b => b.on && b.bottom > 0).map(b => {
        const won = b.isMine ? M.myBB > 0 : M.oppBB > 0;
        const v = b.isMine ? M.myBB : M.oppBB;
        const h = Math.max(5, Math.abs(v) * unit);
        return (
          <div key={`bb-${b.id}`} className="v-drop" style={{
            position: "absolute", left: `${b.left}%`, width: `${b.width}%`,
            bottom: BOTTOM + b.bottom + b.teamH,
          }}>
            {/* The five belongs to whichever bar it lands on, so it takes that
                bar's colour. A green block on the other team's bar would fight
                the rule that green is your side. */}
            <div style={{ height: h, borderRadius: "3px 3px 0 0",
              background: won ? b.color : "transparent",
              border: won ? "none" : `1.5px dashed ${V.text2}`, boxSizing: "border-box",
              boxShadow: won ? `0 0 12px ${b.color}` : "none" }} />
            <div style={{ position: "absolute", bottom: h + 5, left: "50%",
              transform: "translateX(-50%)",
              ...numeric("chip", { fontSize: 16, color: won ? b.color : V.text2 }),
              ...textGlow(won ? b.color : V.text2, 0.8), whiteSpace: "nowrap" }}>
              {v > 0 ? `+${v}` : `\u2212${Math.abs(v)}`}
            </div>
          </div>
        );
      })}

      {stage >= S_TEAM && merged && bars.filter(b => b.on && b.bottom > 0).map(b => {
        const t = b.isMine ? M.myTeam : M.oppTeam;
        const col = b.isMine ? MINE_C : THEIRS_C;
        return (
          <div key={`nm-${b.id}`} className="v-pop" style={{
            position: "absolute", left: `${b.left + b.width / 2}%`, bottom: 4,
            transform: "translateX(-50%)",
          }}>
            <span style={{ padding: "3px 8px", borderRadius: 7, background: "#000",
              border: `1px solid ${col}`, whiteSpace: "nowrap",
              fontFamily: FD, fontWeight: 700, fontSize: 12, color: col }}>
              {t.code || t.short || t.name}
            </span>
          </div>
        );
      })}
      </div>
    </div>
  );
}

// Every driver the pools offered, in the order they finished, with what each
// was worth. Yours are ringed; the ones worth more than yours are marked.
//
// Drivers are drawn the way the rest of the app draws them: headshot ringed in
// the constructor colour, last name, constructor underneath in the same colour.
const dColor = n => F1_TEAM_COLORS[TEAM_BY_NAME[canonicalName(n)]] || V.text3;
const dTeam = n => TEAM_BY_NAME[canonicalName(n)] || "";
const dShot = n => DRIVER_HEADSHOTS[canonicalName(n)] || null;

function PoolBoard({ rows }) {
  // Split by pool, because the rule is the point: one from the top three, four
  // from the seven midfielders. A flat list of ten hides the constraint that
  // decides whether leaving points behind was a mistake or was never on offer.
  const groups = [
    { k: "top", head: "TOP POOL", take: 1 },
    { k: "mid", head: "MIDFIELD", take: 4 },
  ];
  const Row = ({ r, i }) => {
    const col = dColor(r.driver);
    return (
      <div className="v-pop" style={{
        display: "grid", gridTemplateColumns: "24px 26px 1fr 42px 32px", gap: 7,
        alignItems: "center", padding: "2px 6px", borderRadius: 7,
        background: r.mine ? V.bg4 : "transparent",
        border: `1px solid ${r.mine ? V.amber : "transparent"}`,
        animationDelay: `${i * 55}ms`,
      }}>
        <span style={{ textAlign: "right",
          ...numeric("chip", { fontSize: 13, color: V.text3 }) }}>
          {r.pos ? `P${r.pos}` : "\u2013"}
        </span>
        <Face src={dShot(r.driver)} size={23} ring={col} />
        <span style={{ minWidth: 0, textAlign: "left" }}>
          <span style={{ display: "block", ...body("bodySm", { fontSize: 12,
            lineHeight: 1.2, color: r.mine ? V.text : V.text2,
            fontWeight: r.mine ? 700 : 500 }),
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {lastName(r.driver)}
          </span>
          <span style={{ display: "block", ...body("bodySm", { fontSize: 10,
            lineHeight: 1.2, color: col }),
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {dTeam(r.driver)}
          </span>
        </span>
        <span style={{ textAlign: "right",
          ...numeric("chip", { fontSize: 14, color: V.blue }),
          ...(r.mine ? textGlow(V.blue, 0.5) : {}) }}>
          {r.pts > 0 ? `+${r.pts}` : r.pts}
        </span>
        <span style={{ textAlign: "right", ...label({ fontSize: 9,
          color: r.mine ? V.amber : r.best ? MINE_C : V.border2 }) }}>
          {r.mine ? "YOURS" : r.best ? "BEST" : ""}
        </span>
      </div>
    );
  };
  let n = 0;
  return (
    <div style={{ display: "grid", gap: 2, width: "100%" }}>
      {groups.map(g => {
        const list = rows.filter(r => r.pool === g.k);
        if (!list.length) return null;
        return (
          <Fragment key={g.k}>
            <div style={{ display: "flex", justifyContent: "space-between",
              alignItems: "baseline", padding: "6px 6px 3px",
              borderBottom: `1px solid ${V.border}` }}>
              <span style={{ ...label({ fontSize: 10, color: V.text2 }) }}>{g.head}</span>
              <span style={{ ...label({ fontSize: 10, color: V.text3 }) }}>
                PICK {g.take} OF {list.length}
              </span>
            </div>
            {list.map(r => <Row key={r.driver} r={r} i={n++} />)}
          </Fragment>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------- the matchup, horizontal */

// Four players, then two teams, as horizontal bars. Horizontal because these
// rows carry names and logos, and a label belongs beside its bar rather than
// rotated under a column.
function TeamBarsH({ M, hands, merged, bb = false }) {
  const max = Math.max(M.myTotal, M.oppTotal, M.myPreBB, M.oppPreBB, 1) * 1.06;
  const myLeftFirst = [...hands].sort((a, b) => (a.ours === b.ours ? 0 : a.ours ? -1 : 1));
  const rows = merged
    ? [{ key: "us", ours: true, name: M.myTeam.name, code: M.myTeam.code,
         logo: M.myTeam.logo, v: bb ? M.myTotal : M.myPreBB, add: bb ? M.myBB : 0 },
       { key: "them", ours: false, name: M.oppTeam.name, code: M.oppTeam.code,
         logo: M.oppTeam.logo, v: bb ? M.oppTotal : M.oppPreBB, add: bb ? M.oppBB : 0 }]
    : myLeftFirst.map(h => ({
        key: h.id, ours: h.ours, name: h.name, photo: h.photo,
        v: h.drivers.reduce((a, d) => a + d.pts, 0), add: 0,
      }));

  return (
    <div style={{ display: "grid", gap: merged ? 12 : 7, width: "100%" }}>
      {rows.map((r, i) => {
        const col = r.ours ? MINE_C : THEIRS_C;
        const base = Math.max(0, r.v - (r.add > 0 ? r.add : 0));
        return (
          <div key={r.key} style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ width: merged ? 30 : 26, flexShrink: 0 }}>
              {merged ? <Logo src={r.logo} size={28} />
                : <Face src={r.photo} size={24} ring={col} />}
            </span>
            {/* 78px, not 62: the initial and its stop cost three characters and
                the column was cutting them off. The bar loses the same 16px. */}
            <span style={{ width: merged ? 40 : 78, flexShrink: 0, textAlign: "left",
              ...label({ fontSize: merged ? 12 : 10, color: col }),
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {merged ? r.code : shortName(r.name)}
            </span>
            <span style={{ flex: 1, height: merged ? 22 : 13, borderRadius: 5,
              background: V.bg2, position: "relative", overflow: "hidden" }}>
              <span className="v-seg" style={{ position: "absolute", left: 0, top: 0,
                bottom: 0, width: `${(base / max) * 100}%`, borderRadius: 5,
                background: col, boxShadow: merged ? `0 0 10px ${col}88` : "none",
                transitionDelay: `${i * 90}ms` }} />
              {/* BOX BOX arrives on the end of the bar it belongs to. */}
              {bb && r.add > 0 && (
                <span className="v-pop" style={{ position: "absolute", top: 0, bottom: 0,
                  left: `${(base / max) * 100}%`, width: `${(r.add / max) * 100}%`,
                  borderRadius: "0 5px 5px 0", background: col, filter: "brightness(1.5)",
                  boxShadow: `0 0 12px ${col}` }} />
              )}
              {bb && r.add < 0 && (
                <span className="v-pop" style={{ position: "absolute", top: 0, bottom: 0,
                  left: `${(r.v / max) * 100}%`, width: `${(Math.abs(r.add) / max) * 100}%`,
                  borderRadius: "0 5px 5px 0", border: `1.5px dashed ${V.text2}`,
                  boxSizing: "border-box" }} />
              )}
            </span>
            {bb && r.add !== 0 && (
              <span style={{ width: 24, textAlign: "right",
                ...numeric("chip", { fontSize: 13, color: r.add > 0 ? col : V.text2 }) }}>
                {r.add > 0 ? `+${r.add}` : `\u2212${Math.abs(r.add)}`}
              </span>
            )}
            <span style={{ width: 30, textAlign: "right",
              ...numeric("stat", { fontSize: merged ? 24 : 17, color: col }),
              ...(merged ? textGlow(col, 0.5) : {}) }}>{r.v}</span>
          </div>
        );
      })}
    </div>
  );
}


/* -------------------------------------------------- the drivers, paired off */

// A driver both teams picked is worth the same to both, so those copies pair off
// and count for nobody. Whatever is left over is what actually split the two.
function handRows(M) {
  const count = ours => {
    const out = {};
    M.hands.filter(h => h.ours === ours).forEach(h =>
      h.drivers.forEach(d => {
        out[d.driver] = out[d.driver] || { n: 0, pts: d.pts };
        out[d.driver].n += 1;
      }));
    return out;
  };
  const a = count(true), b = count(false);
  const names = [...new Set([...Object.keys(a), ...Object.keys(b)])];
  return names.map(driver => {
    const mine = a[driver] || { n: 0, pts: (b[driver] || {}).pts || 0 };
    const theirs = b[driver] || { n: 0, pts: mine.pts };
    const paired = Math.min(mine.n, theirs.n);
    const net = (mine.n - theirs.n) * mine.pts;
    return { driver, pts: mine.pts, mineN: mine.n, theirsN: theirs.n, paired, net };
  }).sort((x, y) => Math.abs(y.net) - Math.abs(x.net) || y.pts - x.pts);
}

const Pip = ({ n, live, color, pts, beat }) => (
  <span style={{ display: "inline-flex", gap: 3 }}>
    {Array.from({ length: n }, (_, i) => (
      <span key={i} className="v-seg" style={{
        minWidth: 24, textAlign: "center", padding: "1px 5px", borderRadius: 6,
        border: `1px solid ${live ? color : V.border}`,
        background: live ? `${color}22` : "transparent",
        color: live ? color : V.text3,
        opacity: live || beat < 1 ? 1 : 0.4,
        ...numeric("chip", { fontSize: 12 }),
        ...(live && beat >= 2 ? textGlow(color, 0.6) : {}),
      }}>{pts > 0 ? `+${pts}` : pts}</span>
    ))}
  </span>
);

function HandBoard({ M, beat }) {
  const all = handRows(M);
  const net = all.reduce((a, r) => a + r.net, 0);
  // Bounded, so the board cannot outgrow the card. Rows are already sorted by
  // how much they moved, and a driver worth nothing to anybody moved nothing,
  // so the tail is a count rather than eight more lines of zeroes.
  const MAX_ROWS = 5;
  const rows = all.slice(0, MAX_ROWS);
  const hidden = all.length - rows.length;
  // Same seats as the bars above: the UNDER on the left, the OVER on the right.
  // Two boards on one card cannot disagree about which side a team is on.
  const myLeft = M.seat === "UNDER";
  const leftTeam = myLeft ? M.myTeam : M.oppTeam;
  const rightTeam = myLeft ? M.oppTeam : M.myTeam;
  const leftC = myLeft ? MINE_C : THEIRS_C;
  const rightC = myLeft ? THEIRS_C : MINE_C;

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 78px 1fr", gap: 6,
        alignItems: "center", marginBottom: 8 }}>
        <span style={{ ...label({ fontSize: 11, color: leftC, textAlign: "right" }) }}>
          {leftTeam.code || leftTeam.short}
        </span>
        <span />
        <span style={{ ...label({ fontSize: 11, color: rightC, textAlign: "left" }) }}>
          {rightTeam.code || rightTeam.short}
        </span>
      </div>
      <div style={{ display: "grid", gap: 3 }}>
        {rows.map((r, i) => {
          const leftN = myLeft ? r.mineN : r.theirsN;
          const rightN = myLeft ? r.theirsN : r.mineN;
          return (
            <div key={r.driver} className="v-pop" style={{
              display: "grid", gridTemplateColumns: "1fr 78px 1fr", gap: 6,
              alignItems: "center", animationDelay: `${i * 70}ms`,
            }}>
              <span style={{ textAlign: "right" }}>
                <Pip n={r.paired} live={false} color={leftC} pts={r.pts} beat={beat} />
                {leftN > r.paired && (
                  <Pip n={leftN - r.paired} live={beat >= 1 && r.pts !== 0}
                    color={leftC} pts={r.pts} beat={beat} />
                )}
              </span>
              <span style={{ ...body("bodySm", { fontSize: 12, color: V.text2,
                textAlign: "center", lineHeight: 1.2 }) }}>{lastName(r.driver)}</span>
              <span style={{ textAlign: "left" }}>
                <Pip n={r.paired} live={false} color={rightC} pts={r.pts} beat={beat} />
                {rightN > r.paired && (
                  <Pip n={rightN - r.paired} live={beat >= 1 && r.pts !== 0}
                    color={rightC} pts={r.pts} beat={beat} />
                )}
              </span>
            </div>
          );
        })}
      </div>
      {hidden > 0 && (
        <div style={{ ...body("bodySm", { fontSize: 11, color: V.text3, marginTop: 5,
          textAlign: "center" }) }}>
          {apNum(hidden)} more cancelled out.
        </div>
      )}
      {beat >= 2 && (
        <div className="v-pop" style={{ marginTop: 7, textAlign: "center" }}>
          <span style={{ ...label({ fontSize: 11, color: V.text3 }) }}>DRIVERS, NET</span>
          <div style={{ ...numeric("stat", { fontSize: 22 }),
            ...textGlow(net > 0 ? MINE_C : net < 0 ? THEIRS_C : V.text2) }}>
            {net > 0 ? `+${net}` : net}
          </div>
        </div>
      )}
    </div>
  );
}

// The BOX BOX line, drawn the way the home page draws one: the line on a plate,
// the actual stop on another, and colour spreading out of the line so the half
// your side needs is obvious.
function BoxBoxStrip({ M, mine = null, needlePts = 0 }) {
  const MIN = PIT_FLOOR, MAX = PIT_CEIL;
  const pct = v => ((Math.min(MAX, Math.max(MIN, v)) - MIN) / (MAX - MIN)) * 100;
  const c = M.myBB > 0 ? MINE_C : THEIRS_C;
  const leftC = M.seat === "UNDER" ? MINE_C : THEIRS_C;
  const rightC = M.seat === "OVER" ? MINE_C : THEIRS_C;
  return (
    <div style={{ width: "100%" }}>
      <div style={{ position: "relative", height: 74, margin: "6px 2px 0" }}>
        <div style={{ position: "absolute", left: 0, width: `${pct(M.line)}%`, top: 42,
          height: 14, borderRadius: "7px 0 0 7px",
          background: `linear-gradient(to left, ${leftC}4d, transparent)` }} />
        <div style={{ position: "absolute", left: `${pct(M.line)}%`, right: 0, top: 42,
          height: 14, borderRadius: "0 7px 7px 0",
          background: `linear-gradient(to right, ${rightC}4d, transparent)` }} />
        <div style={{ position: "absolute", left: `${pct(M.line)}%`, top: 36, width: 2,
          height: 26, background: V.blue, transform: "translateX(-1px)" }} />
        <div style={{ position: "absolute", top: 22, left: `${pct(M.line)}%`,
          transform: "translateX(-50%)", padding: "2px 6px", borderRadius: 7,
          background: "#000", border: `1px solid ${V.blue}`, whiteSpace: "nowrap",
          fontFamily: FD, fontWeight: 700, fontSize: 11, color: V.blue }}>
          LINE {one(M.line)}
        </div>
        {mine != null && (
          <div className="v-pop" style={{ position: "absolute", top: 20,
            left: `${pct(mine)}%`, transform: "translateX(-50%)",
            animationDelay: "250ms" }}>
            <span style={{ display: "block", width: 2, height: 18,
              background: V.amber, margin: "0 auto" }} />
          </div>
        )}
        {mine != null && (
          <div className="v-pop" style={{ position: "absolute", top: 0,
            left: `${pct(mine)}%`, transform: "translateX(-50%)",
            animationDelay: "250ms", padding: "2px 6px", borderRadius: 7,
            background: "#000", border: `1px solid ${V.amber}`, whiteSpace: "nowrap",
            fontFamily: FD, fontWeight: 700, fontSize: 11, color: V.amber }}>
            YOU {mine}
          </div>
        )}
        <div className="v-drop" style={{ position: "absolute", top: 62, left: `${pct(M.pit)}%`,
          transform: "translateX(-50%)", padding: "2px 6px", borderRadius: 7,
          background: "#000", border: `1px solid ${c}`, whiteSpace: "nowrap",
          fontFamily: FD, fontWeight: 700, fontSize: 11, color: c }}>
          STOP {M.pit}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4,
        ...label({ fontSize: 11, color: V.text3 }) }}>
        <span>{MIN}</span><span>{MAX}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------- the finished board */

// The board the home page finishes a scored week on. Only the team in front
// lights up, because green on its own is the resting state.
// Ours is green when we won and grey when we lost. Theirs is pink either way:
// the other team is the other team whatever the score did, and greying them out
// on a loss made our own defeat look like something that happened to nobody.
function Scoreboard({ M }) {
  const mineWon = M.myTotal > M.oppTotal, theirsWon = M.oppTotal > M.myTotal;
  const mineC = mineWon ? MINE_C : V.text2;
  const theirsC = THEIRS_C;
  const Card = ({ t, total, c, side, won }) => (
    <div className={won ? "v-flicker" : undefined} style={{
      flex: 1, minWidth: 0, textAlign: "center", padding: "10px 8px", borderRadius: 13,
      background: V.bg3, border: `2px solid ${c}`, ...(won ? edgeGlow(c, 0.9) : {}),
    }}>
      {t.logo
        ? <img src={t.logo} alt="" style={{ width: 36, height: 36, objectFit: "contain" }} />
        : <div style={{ width: 36, height: 36, borderRadius: 10, margin: "0 auto",
            background: V.bg2, border: `2px solid ${c}` }} />}
      <div style={{ ...display("h3", { fontSize: 17, color: V.text, marginTop: 5,
        lineHeight: 1.25, whiteSpace: "nowrap" }) }}>
        {t.name.length > 16 && t.short ? t.short : t.name}
      </div>
      <div style={{ ...label({ fontSize: 13, color: c, marginTop: 2 }) }}>{side}</div>
      <div style={{ ...numeric("hero", { fontSize: 44, color: c, marginTop: 3 }),
        ...(won ? textGlow(c, 0.9) : {}) }}>{total}</div>
    </div>
  );
  const meCard = { t: M.myTeam, total: M.myTotal, c: mineC, side: M.seat, won: mineWon };
  const themCard = { t: M.oppTeam, total: M.oppTotal, c: theirsC,
    side: M.seat === "OVER" ? "UNDER" : "OVER", won: theirsWon };
  const left = M.seat === "UNDER" ? meCard : themCard;
  const right = M.seat === "UNDER" ? themCard : meCard;
  return (
    <div style={{ display: "flex", gap: 9, width: "100%" }}>
      <Card {...left} /><Card {...right} />
    </div>
  );
}

// An actual podium: second on the left, the winner raised in the middle, third
// on the right, on steps. Flags fly over each. The winner gets the cup and the
// spray. Every driver carries their team's logo, and so does the team that
// outscored the rest, because the week has two winners and only one is a person.
const STEP = [{ h: 34, o: 1 }, { h: 56, o: 0 }, { h: 24, o: 2 }];  // left, middle, right

const Cup = ({ color, size = 38 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <defs>
      <linearGradient id={`cup-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
        <stop offset="1" stopColor={color} stopOpacity="0.2" />
      </linearGradient>
    </defs>
    <path d="M7 2.6h10v5.6a5 5 0 0 1-10 0Z" fill={`url(#cup-${color.replace("#", "")})`}
      stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M7 4.2H4.1v1.9A3.4 3.4 0 0 0 7 9.4M17 4.2h2.9v1.9A3.4 3.4 0 0 1 17 9.4"
      fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M12 13.2v3.4M9.4 20.6h5.2M10.2 16.6h3.6l.7 4H9.5Z"
      fill={`${color}44`} stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

// The spray, not a bottle. Three arcs of droplets thrown up and out, which is
// what the moment actually looks like and what an icon of a bottle does not.
const Spray = ({ color, side = 1, size = 46 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true"
    style={{ transform: side < 0 ? "scaleX(-1)" : undefined }}>
    {[0, 1, 2].map(k => (
      <path key={k}
        d={`M4,${34 - k * 3} C${10 + k * 2},${16 - k * 5} ${24 + k * 2},${10 - k * 4} ${36},${16 - k * 5}`}
        fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round"
        opacity={0.75 - k * 0.18} />
    ))}
    {[[13, 17], [21, 12], [29, 13], [33, 20], [17, 24], [25, 20]].map(([cx, cy], k) => (
      <circle key={k} cx={cx} cy={cy} r={1.9 - k * 0.15} fill={color}
        opacity={0.85 - k * 0.09} />
    ))}
  </svg>
);

const TeamChip = ({ logo, name, size = 20 }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, minWidth: 0 }}>
    <Logo src={logo} size={size} />
    {name && (
      <span style={{ ...body("bodySm", { fontSize: 11, color: V.text3 }),
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
    )}
  </span>
);

const Podium = ({ top3, meId, topTeam }) => {
  const medal = [V.gold, V.silver, V.bronze];
  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center",
        gap: 5 }}>
        {STEP.map((step, col) => {
          const p = top3[step.o];
          if (!p) return <div key={col} style={{ flex: 1 }} />;
          const c = medal[step.o];
          const first = step.o === 0;
          const mine = p.id === meId;
          return (
            <div key={p.id} className="v-pop" style={{ flex: first ? 1.25 : 1,
              display: "grid", justifyItems: "center", gap: 4, position: "relative",
              animationDelay: `${1400 + col * 190}ms` }}>
              {first && (
                <>
                  <span style={{ position: "absolute", left: -18, top: 26, opacity: 0.9 }}>
                    <Spray color={c} side={-1} />
                  </span>
                  <span style={{ position: "absolute", right: -18, top: 26, opacity: 0.9 }}>
                    <Spray color={c} side={1} />
                  </span>
                </>
              )}
              <Flag nation={p.nation} size={first ? 32 : 24} wave />
              {first && <Cup color={c} size={34} />}
              <Face src={p.photo} size={first ? 64 : 48} ring={mine ? V.amber : c}
                width={first ? 3.5 : 2.5} />
              <div style={{ marginTop: -9, padding: "3px 8px", borderRadius: 8,
                background: "#000", border: `1px solid ${mine ? V.amber : c}`,
                whiteSpace: "nowrap", fontFamily: FD, fontWeight: 700,
                fontSize: first ? 15 : 12, lineHeight: 1.3,
                color: mine ? V.amber : "#fff" }}>{shortName(p.name)}</div>
              <TeamChip logo={p.teamLogo} size={first ? 22 : 18} />
              <div style={{ ...numeric("stat", { fontSize: first ? 26 : 19, color: V.blue }),
                ...textGlow(V.blue, first ? 0.8 : 0.5) }}>{p.pts}</div>
              <div style={{ width: "100%", height: step.h, borderRadius: "8px 8px 0 0",
                background: `linear-gradient(${c}3d, ${c}0f)`,
                border: `1.5px solid ${c}77`, borderBottom: "none",
                display: "grid", placeItems: "center" }}>
                <span style={{ ...display("h1", { fontSize: first ? 30 : 22, color: c }),
                  ...textGlow(c, first ? 0.7 : 0.4) }}>{p.place}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ height: 4, background: V.border2, borderRadius: 2 }} />

      {topTeam && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
          gap: 8, marginTop: 9 }}>
          <span style={{ ...label({ fontSize: 10, color: V.text3 }) }}>TOP TEAM</span>
          <Flag nation={topTeam.nation} size={20} />
          <Logo src={topTeam.logo} size={26} />
          <span style={{ ...body("bodySm", { fontSize: 14, color: V.text, fontWeight: 600 }),
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {topTeam.name}
          </span>
          <span style={{ ...numeric("chip", { fontSize: 17, color: V.blue }) }}>{topTeam.v}</span>
        </div>
      )}
    </div>
  );
};

// The handoff. Each card and each press closes on a question the next one
// answers, so the deck reads as one thing rather than a stack of screens.
// Indexed by the press it sits under, and answered by the press after it.
const ASK = [
  "Who won and who lost?",
  "So what happened in your own matchup?",
  "What settled it?",
  "Could you have done any better?",
  "Where does that leave you for the season?",
];

// What each chart is showing, in one line. The headline says what happened;
// this says what you are looking at.
const CHART_NOTE = [
  "One bar for each of the 48 players. Height is points scored this week.",
  "The same bars, now coloured by whether that player's team won.",
  "Four players, then two teams. Shared drivers cancel out.",
  "The matchup score, after BOX BOX.",
  "Both pools, split by the rule, each in the order they finished.",
];

function CardRace({ d, stage = 0 }) {
  const c = d.card2;
  const x = d.context;
  const M = c.matchup;
  const me = c.ladder.find(r => r.me);
  const top = c.ladder[0];
  const [beat, setBeat] = useState(0);

  // Stages 3 and 4 play themselves out. Arriving from later leaves them settled.
  useEffect(() => {
    const beats = stage === S_TEAM ? TEAM_BEATS : null;
    if (!beats) { setBeat(stage > S_TEAM ? 4 : 0); return; }
    setBeat(0);
    const t = beats.slice(1).map((ms, i) => setTimeout(() => setBeat(i + 1), ms));
    return () => t.forEach(clearTimeout);
  }, [stage]);

  const teamBeat = stage === S_TEAM ? beat : stage > S_TEAM ? 4 : 0;
  const rows = handRows(M);
  const split = rows.find(r => r.net !== 0);
  const netDrivers = rows.reduce((a, r) => a + r.net, 0);
  // How unusual your own result is, measured against every round so far rather
  // than asserted. A place in the bottom 12 winning its matchup happens about a
  // quarter of the time, so "rare" has to be earned.
  const h = x.history;
  const bandPct = h.band.played ? Math.round((h.band.won / h.band.played) * 100) : null;
  const iWon = me.result === "won";
  const rarity = (() => {
    if (top.result === "lost" && me.id === top.id) {
      return `You outscored all ${c.ladder.length} and still lost. That has happened ${apNum(h.topScorerLost)} times in ${apNum(h.rounds)} rounds.`;
    }
    if (bandPct == null) return "Green won their matchup this week. Pink lost.";
    const band = `${apOrdinal(h.band.lo)} to ${apOrdinal(h.band.hi)}`;
    return iWon
      ? `You finished ${apOrdinal(me.place)} and won anyway. Players in the ${band} band win ${bandPct} percent of the time.`
      : `You finished ${apOrdinal(me.place)} and lost. Players in the ${band} band win ${bandPct} percent of the time.`;
  })();

  const preLevel = M.myPreBB === M.oppPreBB;
  const preLead = M.myPreBB > M.oppPreBB;

  const beatN = c.ladder.filter(r => !r.me && me.pts > r.pts).length;
  const lostN = c.ladder.filter(r => !r.me && me.pts < r.pts).length;
  const head = stage === S_RACE
      ? `You scored ${me.pts} points, good for ${apOrdinal(me.place)} out of ${c.ladder.length}.`
    // A sentence is not a label, so it gets the whole name. And the team it
    // belongs to rather than a pronoun: half the league is women and this line
    // said "his" for all of them.
    : stage === S_COLOR ? (top.result === "lost"
        ? `${top.name} scored the most and still lost.`
        : `${top.name} scored the most, and the team won.`)
    : stage === S_POOL ? (x.bestSwap
        ? `You should have taken ${lastName(x.bestSwap.in.driver)} over ${lastName(x.bestSwap.out.driver)}.`
        : "You took the best hand available.")
    : stage === S_TEAM ? (netDrivers === 0
        ? "You picked the same race as they did."
        : split ? `${lastName(split.driver)} is what split you.`
        : preLead ? `${M.myPreBB} to ${M.oppPreBB}, your way.`
        : `${M.oppPreBB} to ${M.myPreBB}, their way.`)
    : M.myBB > 0 ? "BOX BOX came your way." : "BOX BOX went to them.";

  return (
    <>
      <Kicker>{stage >= S_TEAM ? "YOUR MATCHUP" : stage === S_POOL ? "WHAT WAS ON THE TABLE" : "YOUR RACE"}</Kicker>
      <Head lines={2}>{head}</Head>

      {/* One panel, always mounted. The chart shrinks to make room for the
          driver board rather than being swapped out for it, so the two team
          bars are the same two bars the whole way through. */}
      <Panel>
        {stage >= S_TEAM && stage < S_POOL && (
          <div style={{ paddingTop: 4 }}>
            <TeamBarsH M={M} hands={M.hands} merged={stage > S_TEAM || teamBeat >= 4}
              bb={stage === S_BB} />
            {stage === S_TEAM && (
              <div style={{ marginTop: 4, marginLeft: -10, marginRight: -10 }}>
                <HandsColumns seats={M.seats} under={M.seat === "UNDER" ? "mine" : "theirs"}
                  driverPts={M.driverPtsMap} scored />
              </div>
            )}
            {stage !== S_TEAM && (
              <div style={{ ...body("bodySm", { fontSize: 12, color: V.text3, marginTop: 10,
                textAlign: "left", minHeight: 34 }) }}>{CHART_NOTE[stage]}</div>
            )}
          </div>
        )}
        {stage < S_TEAM && (
          <>
            <RaceChart c={c} stage={stage} beat={teamBeat} />
            {/* Two lines reserved. A caption that is one line on one press and
                two on the next changes the card height, which changes the scale,
                which moves the chart. */}
            <div style={{ ...body("bodySm", { fontSize: 12, color: V.text3, marginTop: 8,
              textAlign: "left", minHeight: 34 }) }}>{CHART_NOTE[stage]}</div>
          </>
        )}
        {stage === S_POOL && (
          <div className="v-pop" style={{ marginTop: 2 }}>
            <PoolBoard rows={x.poolBoard} />
          </div>
        )}
      </Panel>

      {/* A floor under the panel, set to the tallest press. Every press of this
          card is then the same height, so the card scales by the same amount
          every time and the chart above sits in exactly the same place. Without
          it the card rescaled on each click and every bar appeared to jump. */}
      <Panel pad={12} style={{ minHeight: stage <= S_COLOR ? 292 : undefined,
        display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {stage === S_RACE && <Podium top3={c.top3} meId={me.id} topTeam={x.leagueScores[0]} />}

        {stage === S_COLOR && (
          <>
            <div style={{ display: "flex", gap: 18, justifyContent: "center",
              marginBottom: 8 }}>
              {[["GREEN, TEAM WON", MINE_C], ["PINK, TEAM LOST", THEIRS_C]].map(([t, col]) => (
                <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: col }} />
                  <span style={{ ...label({ fontSize: 11, color: V.text2 }) }}>{t}</span>
                </span>
              ))}
            </div>
            <Line color={V.text}>{rarity}</Line>
          </>
        )}

        {stage === S_TEAM && (
          <>
            <Line color={V.text2}>
              The needle and the weekly bonus are yours, not your team's. They come
              off here, which is why these numbers are smaller than the ones you just saw.
            </Line>
          </>
        )}

        {false && (
          <div style={{ display: "grid", gap: 7, marginBottom: 6 }}>
            {[{ t: "PERFECT PICKS", v: x.perfect.total, col: V.blue },
              { t: "YOU GOT", v: x.myHaul, col: V.amber }].map((r, i) => (
              <div key={r.t} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ width: 92, flexShrink: 0, textAlign: "left",
                  ...label({ fontSize: 10, color: V.text3 }) }}>{r.t}</span>
                <span style={{ flex: 1, height: 12, borderRadius: 5, background: V.bg4,
                  position: "relative" }}>
                  <span className="v-seg" style={{ display: "block", height: "100%",
                    width: `${Math.max(0, (r.v / Math.max(1, x.perfect.total)) * 100)}%`,
                    borderRadius: 5, background: r.col,
                    boxShadow: `0 0 8px ${r.col}88`,
                    transitionDelay: `${300 + i * 260}ms` }} />

                </span>
                <span style={{ width: 26, textAlign: "right",
                  ...numeric("chip", { fontSize: 15, color: r.col }) }}>{r.v}</span>
              </div>
            ))}
          </div>
        )}

        {stage === S_POOL && (
          <div style={{ display: "grid", gap: 6, marginTop: 2 }}>
            {[
              { t: "PERFECT PICKS", v: x.perfect.total, col: V.blue },
              { t: `BEST, ${shortName(x.bestHaul.name).toUpperCase()}`, v: x.bestHaul.haul, col: V.text2 },
              { t: "YOU", v: x.myHaul, col: V.amber },
              ...(x.mateHaul != null
                ? [{ t: x.mateFirst.toUpperCase(), v: x.mateHaul, col: V.text2 }] : []),
              { t: `LOWEST, ${shortName(x.worstHaul.name).toUpperCase()}`, v: x.worstHaul.haul, col: V.text3 },
            ].map((r, i) => (
              <div key={r.t} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ width: 106, flexShrink: 0, textAlign: "left",
                  ...label({ fontSize: 10, color: V.text3, lineHeight: 1.2 }) }}>{r.t}</span>
                <span style={{ flex: 1, height: 13, borderRadius: 5, background: V.bg4 }}>
                  <span className="v-seg" style={{ display: "block", height: "100%",
                    width: `${Math.max(2, (r.v / Math.max(1, x.perfect.total)) * 100)}%`,
                    borderRadius: 5, background: r.col,
                    boxShadow: r.col === V.amber ? `0 0 8px ${V.amber}` : "none",
                    transitionDelay: `${240 + i * 150}ms` }} />
                </span>
                <span style={{ width: 26, textAlign: "right",
                  ...numeric("chip", { fontSize: 16, color: r.col }) }}>{r.v}</span>
              </div>
            ))}
          </div>
        )}

        {stage === S_BB && (
          <>
            <div style={{ display: "flex", justifyContent: "space-around", gap: 12,
              marginBottom: 4 }}>
              <Stat n={M.myTotal} cap={M.myTeam.code || M.myTeam.short}
                color={M.myTotal > M.oppTotal ? MINE_C : V.text2} size={32} />
              <Stat n={M.oppTotal} cap={M.oppTeam.code || M.oppTeam.short}
                color={M.oppTotal > M.myTotal ? THEIRS_C : V.text2} size={32} />
            </div>
            <BoxBoxStrip M={M} mine={d.card4.guess} needlePts={d.card4.needlePts} />
            <Line color={V.text2}>
              {M.myBB > 0
                ? `The stop came in at ${M.pit}, above the line. Your side takes five and theirs drops one.`
                : `The stop came in at ${M.pit}, below the line. Their side takes five and yours drops one.`}
              {d.card4.guess != null && (d.card4.needlePts > 0
                ? ` You guessed ${d.card4.guess} and scored ${apNum(d.card4.needlePts)} on the needle.`
                : ` You guessed ${d.card4.guess}, ${one(d.card4.off)} out, so you scored nothing on the needle.`)}
            </Line>
          </>
        )}
      </Panel>

      <Ask>{ASK[stage] || "Where does that leave you for the season?"}</Ask>


    </>
  );
}

// "Where you landed". All 48 in six boxes: won or lost, by which third of the
// league you scored in. Each box is named for the kind of week it holds.
//
// Rings: green for your side of the matchup, pink for the two you played, and
// your own face is the one with the thicker ring and the glow.
const BOXES = [
  { k: "top_W", t: "TOP PERFORMERS", win: true },
  { k: "top_L", t: "UNLUCKY", win: false },
  { k: "mid_W", t: "GOT THE WIN", win: true },
  { k: "mid_L", t: "NEEDED MORE", win: false },
  { k: "bottom_W", t: "LUCKY", win: true },
  { k: "bottom_L", t: "PENALTY BOX", win: false },
];
const ROWLABEL = ["TOP THIRD", "MIDDLE THIRD", "BOTTOM THIRD"];

const ringOf = p => (p.ours ? V.green : p.theirs ? V.pink : V.border2);

// One face. Tapping or hovering blows it up into a card with the last name, the
// score and the matchup, anchored to the avatar so a box stays small.
function GridFace({ p, open, onOpen, below = false }) {
  const tone = p.result === "won" ? V.green : p.result === "lost" ? V.pink : V.text2;
  const ring = ringOf(p);
  return (
    <span
      onClick={e => { e.stopPropagation(); onOpen(open ? null : p.id); }}
      onMouseEnter={() => onOpen(p.id)}
      onMouseLeave={() => onOpen(null)}
      style={{ position: "relative", display: "block", cursor: "pointer",
        zIndex: open ? 60 : 1 }}>
      <span style={{ display: "block",
        filter: p.me ? `drop-shadow(0 0 7px ${V.green})` : "none" }}>
        <Face src={p.photo} size={p.me ? 34 : 30} ring={ring} width={p.me ? 3 : 2} />
      </span>
      {open && (
        <span style={{
          position: "absolute", left: "50%", transform: "translateX(-50%)",
          ...(below ? { top: "100%", marginTop: 6 } : { bottom: "100%", marginBottom: 6 }),
          display: "grid", justifyItems: "center", gap: 2, zIndex: 70,
          padding: "8px 10px 9px", borderRadius: 10, background: "#000",
          border: `1px solid ${ring === V.border2 ? tone : ring}`, whiteSpace: "nowrap",
          boxShadow: `0 0 18px #000e, 0 0 12px ${(ring === V.border2 ? tone : ring)}55`,
        }}>
          <Face src={p.photo} size={44} ring={ring === V.border2 ? tone : ring} />
          <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 13, lineHeight: 1.3,
            color: p.me ? V.green : "#fff" }}>{shortName(p.name)}</span>
          <span style={{ ...numeric("chip", { fontSize: 12, color: V.text2 }) }}>
            {p.pts}{" "}
            <span style={{ color: tone }}>
              {p.result === "won" ? "W" : p.result === "lost" ? "L" : "D"}
            </span>{" "}
            {p.teamPts}-{p.oppPts}
          </span>
        </span>
      )}
    </span>
  );
}

function CardGrid({ d }) {
  const [open, setOpen] = useState(null);
  const c = d.card2;
  const x = d.context;
  const g = c.grid;
  const line = verdictLine(c, c.you ? c.you.id : "", d.round);

  return (
    <>
      <Kicker>WHERE YOU LANDED</Kicker>
      <Head>{line || "Here is the week."}</Head>
      <Line color={V.text3}>
        All 48 players. Down the side, how you scored. Across, whether your team won.
      </Line>

      {/* Lifted while a face is open, or a later panel paints over the popup. */}
      <Panel pad={9} style={{ overflow: "visible", zIndex: open ? 50 : undefined }}>
        <div onClick={() => setOpen(null)}
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {BOXES.map((b, i) => {
            const people = g.members[b.k] || [];
            const yours = g.yours === b.k;
            const tone = b.win ? V.green : V.pink;
            return (
              <div key={b.k} style={{
                borderRadius: 10, padding: "7px 7px 8px", overflow: "visible",
                background: yours ? V.bg3 : V.bg,
                ...(yours ? edgeGlow(V.green, 0.55) : { border: `1px solid ${V.border}` }),
              }}>
                <div style={{ ...label({ fontSize: 10, color: tone, marginBottom: 6,
                  textAlign: "left" }) }}>{b.t}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4,
                  alignContent: "flex-start" }}>
                  {people.length === 0 && (
                    <span style={{ ...label({ fontSize: 10, color: V.border2 }) }}>&mdash;</span>
                  )}
                  {people.map((p, j) => (
                    <span key={p.id} className="v-pop"
                      style={{ animationDelay: `${i * 90 + j * 26}ms` }}>
                      <GridFace p={p} open={open === p.id} onOpen={setOpen} below={i < 2} />
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
        {[["Your team", V.green], ["Who you played", V.pink]].map(([t, col]) => (
          <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 11, height: 11, borderRadius: "50%",
              border: `2px solid ${col}` }} />
            <span style={{ ...label({ fontSize: 11, color: V.text2 }) }}>{t}</span>
          </span>
        ))}
      </div>

      <Panel pad={11}>
        <div style={{ display: "grid", gap: 6 }}>
          {[{ k: "CLOSEST", m: x.closest }, { k: "BIGGEST", m: x.biggest }].map(r => (
            <div key={r.k} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ ...label({ fontSize: 10, color: V.text3, width: 54,
                textAlign: "left" }) }}>{r.k}</span>
              <span style={{ flex: 1, textAlign: "left",
                ...body("bodySm", { fontSize: 12, color: V.text2 }),
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {r.m.home.code || r.m.home.short} {r.m.homeTotal}
                {" \u2013 "}{r.m.awayTotal} {r.m.away.code || r.m.away.short}
              </span>
              <span style={{ ...numeric("chip", { fontSize: 13, color: V.blue }) }}>
                by {r.m.margin}
              </span>
            </div>
          ))}
        </div>
      </Panel>
      <Line color={V.text3}>Tap a face for the details.</Line>

      <Ask>Where does that leave you for the season?</Ask>
    </>
  );
}

/* ------------------------------------------------------------------- cards */

// A number that counts up to itself.
//
// The server render starts at the final value, so react-dom/server sees the
// real number and the smoke run still tells 48 decks apart. Only a browser
// starts at zero and climbs.
function Count({ to, dur = 900, delay = 0, format = v => v }) {
  const [n, setN] = useState(() => (typeof window === "undefined" ? to : 0));
  useEffect(() => {
    if (typeof window === "undefined") return;
    let raf = 0, start = 0;
    const reduce = window.matchMedia
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setN(to); return; }
    setN(0);
    const t = setTimeout(() => {
      const tick = ts => {
        if (!start) start = ts;
        const k = Math.min(1, (ts - start) / dur);
        // Ease out, so it arrives rather than stops.
        setN(to * (1 - Math.pow(1 - k, 3)));
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); };
  }, [to, dur, delay]);
  return <>{format(Math.round(n))}</>;
}

// The week's scores as a distribution, with your own marked on it.
//
// The old version of this drew 48 identical ticks in finishing order, which
// encodes rank and throws the scores away: it cannot show that most of the
// league landed within a few points of each other. This bins every score, so
// the shape of the week is the graphic and your marker sits in it.
function ScoreSpread({ spread, mine, low, high, mid, delay = 0 }) {
  const BIN = 5;
  const lo = Math.floor(low / BIN) * BIN;
  const hi = Math.ceil((high + 1) / BIN) * BIN;
  const bins = [];
  for (let v = lo; v < hi; v += BIN) bins.push({ v, n: 0 });
  spread.forEach(p => {
    const i = Math.min(bins.length - 1, Math.floor((p - lo) / BIN));
    bins[i].n += 1;
  });
  const tall = Math.max(...bins.map(b => b.n), 1);
  const pct = v => ((v - lo) / (hi - lo)) * 100;
  const myBin = Math.min(bins.length - 1, Math.floor((mine - lo) / BIN));

  return (
    <div style={{ width: "100%" }}>
      <div style={{ position: "relative", height: 52, display: "flex",
        alignItems: "flex-end", gap: 2 }}>
        {bins.map((b, i) => (
          <div key={b.v} className="v-rise" style={{
            // A floor in pixels, not percent: against a bin holding 22 people a
            // bin holding one is a fraction of a pixel and reads as empty.
            flex: 1, height: `${(b.n / tall) * 100}%`,
            minHeight: b.n ? 6 : 0, borderRadius: "2px 2px 0 0",
            background: i === myBin ? V.amber : b.n ? V.bg4 : "transparent",
            boxShadow: i === myBin ? `0 0 9px ${V.amber}88` : "none",
            transformOrigin: "bottom", animationDelay: `${delay + i * 55}ms`,
          }} />
        ))}
        {/* The middle of the league, named on the line it marks. */}
        <div style={{ position: "absolute", left: `${pct(mid)}%`, top: -4, bottom: 0,
          width: 1, background: V.text3, opacity: 0.7 }} />
        <div style={{ position: "absolute", left: `${pct(mid)}%`, top: -14,
          transform: "translateX(-50%)", whiteSpace: "nowrap",
          ...label({ fontSize: 9, color: V.text3 }) }}>AVG {mid}</div>
      </div>
      <div style={{ position: "relative", height: 15, marginTop: 3 }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 1,
          background: V.border2 }} />
        <span style={{ position: "absolute", left: 0, top: 3,
          ...numeric("chip", { fontSize: 10, color: V.text3 }) }}>{lo}</span>
        <span style={{ position: "absolute", right: 0, top: 3,
          ...numeric("chip", { fontSize: 10, color: V.text3 }) }}>{hi}</span>
        <span style={{ position: "absolute", left: `${pct(mine)}%`, top: 2,
          transform: "translateX(-50%)", whiteSpace: "nowrap",
          ...numeric("chip", { fontSize: 11, color: V.amber }) }}>
          YOU {mine}
        </span>
      </div>
    </div>
  );
}

// The season standings as a track, with where you were and where you are now.
// The marker walks from one to the other, which is the whole point of the row.
function SeasonTrack({ was, now, of, delay = 300 }) {
  const [at, setAt] = useState(() => (typeof window === "undefined" ? now : (was ?? now)));
  useEffect(() => {
    if (typeof window === "undefined" || was == null) return;
    const reduce = window.matchMedia
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setAt(now); return; }
    setAt(was);
    const t = setTimeout(() => setAt(now), delay);
    return () => clearTimeout(t);
  }, [was, now, delay]);
  const pct = v => ((v - 1) / Math.max(1, of - 1)) * 100;
  const up = was != null && now < was;
  const flat = was == null || now === was;
  const col = flat ? V.text2 : up ? V.green : V.pink;
  return (
    <div style={{ position: "relative", width: "100%", height: 34, marginTop: 4 }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 16, height: 3,
        borderRadius: 2, background: V.bg4 }} />
      {was != null && !flat && (
        <div className="v-seg" style={{
          position: "absolute", top: 16, height: 3, borderRadius: 2, background: col,
          left: `${Math.min(pct(was), pct(now))}%`,
          width: `${Math.abs(pct(now) - pct(was))}%`,
          boxShadow: `0 0 8px ${col}`,
        }} />
      )}
      {was != null && !flat && (
        <div style={{ position: "absolute", top: 12, left: `${pct(was)}%`,
          transform: "translateX(-50%)", width: 11, height: 11, borderRadius: "50%",
          border: `2px solid ${V.text3}`, boxSizing: "border-box" }} />
      )}
      <div className="v-move" style={{ position: "absolute", top: 9,
        left: `${pct(at)}%`, transform: "translateX(-50%)" }}>
        <div style={{ width: 17, height: 17, borderRadius: "50%", background: col,
          boxShadow: `0 0 12px ${col}` }} />
      </div>
      <div style={{ position: "absolute", left: 0, bottom: -2,
        ...label({ fontSize: 10, color: V.text3 }) }}>1ST</div>
      <div style={{ position: "absolute", right: 0, bottom: -2,
        ...label({ fontSize: 10, color: V.text3 }) }}>{of}TH</div>
    </div>
  );
}


const Chevron = ({ dir, color, size = 26 }) => {
  const c = size / 2, w = size * 0.3;
  const up = dir === "up";
  const y = k => (up ? c + k : c - k);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      {[0, 1].map(i => (
        <polyline key={i}
          points={`${c - w},${y(w * 0.35 + i * w * 0.72)} ${c},${y(-w * 0.35 + i * w * 0.72)} ${c + w},${y(w * 0.35 + i * w * 0.72)}`}
          fill="none" stroke={color} strokeWidth={size * 0.1}
          strokeLinecap="round" strokeLinejoin="round" opacity={i ? 0.5 : 1} />
      ))}
    </svg>
  );
};



// What to name as the reason, in the player's own review. The kinds are worked
// out in weekly.js, strongest reason first.
function because(c) {
  const k = c.cause;
  if (k.kind === "boxbox") {
    return c.outcome === "won" ? "That was down to a good call on the BOX BOX line."
      : c.outcome === "lost" ? "That came down to losing the BOX BOX line."
      : "BOX BOX is what levelled the two of you.";
  }
  if (k.kind === "driver") {
    return k.yours
      ? `${k.driver} was worth ${k.gap} more to you than to them.`
      : `${k.driver} was worth ${k.gap} more to them than to you.`;
  }
  if (k.kind === "mate") return `${firstName(k.who)} did most of your team's scoring.`;
  if (k.kind === "you") return "You did most of your team's scoring.";
  return "Nothing in particular separated the two teams.";
}


// The five things a team score is made of, laid out as rows so the two sides
// can be read against each other. Two views of the same five rows:
//
//   scores   what each side scored on that part, one bar each
//   gaps     the difference alone, from a centre line, and the five add to the
//            margin on the scoreboard
//
// Same rows, same order, same height in both, so the toggle animates rather
// than redraws. Everything is in the DOM at full size and CSS does the
// moving — a chart drawn by slicing data renders identically for all 48
// under react-dom/server, which is what smoke:weekly exists to catch.
// Round 12 is where the second half starts, which is the one round that gets
// its own line.
const FIRST_H2 = 12;

// Where the season stands, in one line, chosen by what actually happened.
//
// Read in order and the first match wins, so a run of three or more overrides
// whatever this week did: a team on five straight wins does not need telling
// that this one was close. Inside a group the line comes off a hash of the
// player and the round, the same trick VERDICTS uses, so two teammates read
// different lines and the same person sees the same one all week.
//
// {team} {opp} {n} {margin} are filled in. Numbers are AP: one through nine
// spelled out, figures from 10 up.
const SEASON_LINES = [
  { k: "win5", when: f => f.run.wins >= 5, lines: [
    "{n} wins in a row. Nobody else in the division is doing that.",
    "That is {n} straight. Whatever you two are doing, keep doing it.",
    "{n} on the bounce. This is a run now.",
  ] },
  { k: "loss5", when: f => f.run.losses >= 5, lines: [
    "{n} straight losses. Something has to change.",
    "That is {n} in a row gone.",
    "{n} losses running. Time to pick differently.",
  ] },
  { k: "bbWon", when: f => f.bbDecided && f.won, lines: [
    "You won on the BOX BOX line, which takes both of you guessing well.",
    "The line won that one. Take the line away and you lose.",
    "BOX BOX decided that, your way. That is teamwork and nothing else.",
  ] },
  { k: "bbLost", when: f => f.bbDecided && f.lost, lines: [
    "You lost on the BOX BOX line. Take the line away and you win.",
    "The line beat you, and nothing else did.",
    "BOX BOX decided that one, their way.",
  ] },
  { k: "win3", when: f => f.run.wins >= 3, lines: [
    "That is a {n} match winning streak.",
    "{n} in a row, and nobody has stopped you yet.",
    "{n} straight wins. You are the team nobody wants right now.",
    "Three has a way of becoming five. Keep going.",
  ] },
  { k: "loss3", when: f => f.run.losses >= 3, lines: [
    "{n} in a row now. Rough patch.",
    "That is {n} straight losses.",
    "{n} weeks without a win. Next one matters.",
  ] },
  { k: "blowWin", when: f => f.won && f.margin >= 20, lines: [
    "{pts}. That was a formality.",
    "You beat {opp} by {pts}. They may want the week back.",
    "{margin} clear. {opp} never got going.",
    "Nothing close about that. {pts}.",
  ] },
  { k: "blowLoss", when: f => f.lost && f.margin >= 20, lines: [
    "Down {pts}. Nobody needs to see the details.",
    "{opp} beat you by {pts}. That one goes in the book.",
    "{pts}. Everything that could go their way did.",
    "{pts}. Some weeks you take the loss and go again.",
  ] },
  { k: "closeWin", when: f => f.won && f.margin <= 3, lines: [
    "{pts} in that one. You will take that.",
    "Won by {pts}. Those are the weeks that decide a season.",
    "{pts}, and they went your way. A win counts the same either way.",
    "That was tight. {pts}.",
  ] },
  { k: "closeLoss", when: f => f.lost && f.margin <= 3, lines: [
    "{pts} short. That one stings.",
    "Lost by {pts}. Nothing in that all day.",
    "{pts}, and no points for close.",
  ] },
  { k: "openWin", when: f => f.round === FIRST_H2 && f.won, lines: [
    "That is a great way to start the second half.",
    "One from one in the second half.",
  ] },
  { k: "openLoss", when: f => f.round === FIRST_H2 && f.lost, lines: [
    "Not the start to the second half you wanted.",
    "The second half runs 11 more races. Plenty of time.",
  ] },
  { k: "hot10", when: f => f.run.played >= 10 && f.run.last10.w >= 8, lines: [
    "{n} wins in your last 10. Nobody is having a better season.",
    "{n} from your last 10. That is a season, not a run.",
  ] },
  { k: "cold10", when: f => f.run.played >= 10 && f.run.last10.w <= 2, lines: [
    "{n} wins in your last 10. Long stretch.",
    "{n} from 10. This season has been hard work.",
  ] },
  { k: "bounce", when: f => f.won && f.run.prev && f.run.prev.lost, lines: [
    "Back to winning after last week.",
    "You answered last week's loss.",
    "A win straight after a loss. That is how a season stays alive.",
  ] },
  { k: "slip", when: f => f.lost && f.run.prev && f.run.prev.won, lines: [
    "Winning last week, losing this one.",
    "That run ended.",
    "One week up, one week down.",
  ] },
  { k: "draw", when: f => f.drew, lines: [
    "A draw. Neither of you deserved to lose that.",
    "Dead level. That happens about once a season.",
  ] },
  { k: "win", when: f => f.won, lines: [
    "A win, and the table looks better this morning.",
    "You won. On to the next one.",
    "Won this week. Good.",
    "A win over {opp}, and they are not an easy week.",
  ] },
  { k: "loss", when: f => f.lost, lines: [
    "A loss this week. The next race is a fresh start.",
    "You lost this week. That happens.",
    "Lost this week. Go again next race.",
  ] },
];

function seasonLine(c, run, round, playerId) {
  const f = {
    won: c.outcome === "won", lost: c.outcome === "lost", drew: c.outcome === "drew",
    margin: Math.abs(c.margin), bbDecided: c.cause && c.cause.kind === "boxbox",
    round, run,
  };
  const group = SEASON_LINES.find(g => g.when(f));
  if (!group) return "";
  let h = 5381;
  const key = `${playerId}|${round}|${group.k}`;
  for (let i = 0; i < key.length; i++) h = ((h * 33) ^ key.charCodeAt(i)) >>> 0;
  // Whichever number the line is about. Every group names at most one.
  const n = group.k === "hot10" || group.k === "cold10" ? run.last10.w
    : group.k.startsWith("loss") ? run.losses
    : run.wins;
  const out = group.lines[h % group.lines.length]
    .replace(/\{team\}/g, c.myTeam.name)
    .replace(/\{opp\}/g, c.oppTeam.name)
    // A margin of one is one point, not one points.
    .replace(/\{pts\}/g, `${apNum(f.margin)} ${f.margin === 1 ? "point" : "points"}`)
    .replace(/\{margin\}/g, apNum(f.margin))
    .replace(/\{n\}/g, apNum(n));
  // A spelled number that lands at the start of a sentence still takes a
  // capital, and apNum has no way to know where the word ended up.
  return out.charAt(0).toUpperCase() + out.slice(1);
}

function CardResult({ d }) {
  const c = d.card1;
  const won = c.outcome === "won", lost = c.outcome === "lost";
  const mColor = won ? MINE_C : lost ? V.text2 : V.text2;
  const me = d.card2.you;
  const line = seasonLine(c, d.context.teamRun, d.round, me ? me.id : "");

  return (
    <>
      <Kicker>ROUND {d.round} · {d.raceName.toUpperCase()}</Kicker>
      <Head color={mColor} glow={won} size="h1">
        {won ? `${c.myTeam.name} won! Congrats!`
          : lost ? `${c.myTeam.name} lost this week. Tough one.`
          : `${c.myTeam.name} drew this week.`}
      </Head>

      <Scoreboard M={d.card2.matchup} />

      {line && <Line color={V.text}>{line}</Line>}

      <Ask>And how did you do yourself?</Ask>
    </>
  );
}

// Twelve ways a week can go: your own score in thirds across the 48, by what
// your team did. A drawn matchup reads as a win, since a draw is nobody's
// disaster.
//
// Each cell carries three or four lines in different shapes, because twelve
// lines all built the same way read as twelve lines all built the same way.
// Some are only offered when the teammate's week says something worth naming,
// and {mate} is their first name.
//
// Which line a player gets comes off a hash of their id and the round: the same
// person sees the same line all week, two teammates see different ones, and it
// changes next race. Same trick as the coin-flip tiebreak in teamTable.js.
const MATE_TOP = m => m && m.band === "top";
const MATE_BOT = m => m && m.band === "bottom";

const VERDICTS = {
  top_W_high: [
    { t: "you had a big week and helped your team to victory" },
    { t: "big week for you, and a win for the team" },
    { t: "your score is a big reason your team won" },
    { t: "good week all around, for you and your team" },
  ],
  top_W_low: [
    { t: "big week for you, and just enough for the win" },
    { t: "you finished near the top, and your team got over the line. That one is on you" },
    { t: "you were the difference. Your team won a low-scoring one" },
    { t: "big week for you, but {mate} had a quiet one. You carried that win", when: MATE_BOT },
    { t: "you did the scoring and {mate} never got going. You won anyway", when: MATE_BOT },
  ],
  top_L_high: [
    { t: "big week for you, a good team score, and you still lost" },
    { t: "you finished near the top and so did your team. The other team was better" },
    { t: "you did your part and so did your team. The other side did more" },
    { t: "you and {mate} both had big weeks, and you still came up short", when: MATE_TOP },
    { t: "nothing wrong with either of you this week. The other team just scored more", when: MATE_TOP },
  ],
  top_L_low: [
    { t: "big week for you, and a loss anyway" },
    { t: "you scored well and got no help" },
    { t: "one of the best scores in the league, and your team still lost" },
    { t: "you finished near the top, but {mate} had a rough week. You can't win without help", when: MATE_BOT },
    { t: "you did your bit, but {mate} couldn't get going. You can't win alone", when: MATE_BOT },
  ],

  mid_W_high: [
    { t: "steady week from you, and a good win for the team" },
    { t: "you did your bit and your team won" },
    { t: "nothing flashy from you, and one of the better team scores. You won" },
    { t: "solid enough from you, and {mate} was excellent. Good week for the team", when: MATE_TOP },
    { t: "middle of the pack for you, and {mate} was quiet. You won anyway", when: MATE_BOT },
  ],
  mid_W_low: [
    { t: "a scrappy one. You won without anybody scoring much" },
    { t: "middle of the pack for you, and a low-scoring win" },
    { t: "nobody scored much and you took the matchup anyway" },
    { t: "steady from you, quiet from {mate}, and a win regardless", when: MATE_BOT },
  ],
  mid_L_high: [
    { t: "steady week from you, a good team score, and a loss anyway" },
    { t: "your team scored well enough to win most weeks. Not this one" },
    { t: "middle of the pack for you, and your team still lost" },
    { t: "{mate} had a big week and you were steady. The other team was better", when: MATE_TOP },
  ],
  mid_L_low: [
    { t: "quiet week all around, and a loss" },
    { t: "middle of the pack for you, and your team came up short" },
    { t: "nothing much from anyone, and you lost" },
    { t: "a flat week for you and a flat week for your team" },
    { t: "steady from you, quiet from {mate}, and a loss to go with the two of you", when: MATE_BOT },
  ],

  bottom_W_high: [
    { t: "quiet race from you, but {mate} turned up. That's a good week to have a teammate", when: MATE_TOP },
    { t: "you finished near the bottom, but {mate} covered for you. The win still counts" },
    { t: "not your week, and your team won anyway" },
    { t: "{mate} carried this one. You'll get the next one" },
  ],
  bottom_W_low: [
    { t: "not your week, but your team got the win" },
    { t: "near the bottom for you, and your team scraped a win" },
    { t: "quiet from you, quiet from everyone, and you still won" },
    { t: "neither of you scored much and you won anyway", when: MATE_BOT },
  ],
  bottom_L_high: [
    { t: "quiet race from you, but {mate} kept the score respectable. You lost anyway" },
    { t: "not your week, and your team lost even with a good score" },
    { t: "you were quiet, your team scored well, and you lost anyway" },
    { t: "{mate} had a big week, and the team still lost", when: MATE_TOP },
    { t: "{mate} carried the score and you were quiet. The other team was just better", when: MATE_TOP },
  ],
  bottom_L_low: [
    { t: "rough race for you and your team" },
    { t: "you had a rough race and your team went down with you" },
    { t: "quiet race from you, and your team came up short" },
    { t: "you finished near the bottom and your team lost" },
  ],
};

// Stable per person per round, so a reload does not reshuffle the wording.
function verdictLine(c, playerId, round) {
  const all = VERDICTS[c.verdict] || [];
  const open = all.filter(v => !v.when || v.when(c.mate));
  if (!open.length) return "";
  let h = 5381;
  const key = `${playerId}|${round}`;
  for (let i = 0; i < key.length; i++) h = ((h * 33) ^ key.charCodeAt(i)) >>> 0;
  const pick = open[h % open.length];
  return pick.t.replace(/\{mate\}/g, c.mate ? c.mate.first : "your teammate");
}

function CardScatter({ d }) {
  const [focus, setFocus] = useState(null);
  const c = d.card2;
  const me = c.you;

  return (
    <>
      <Kicker>HOW DID EVERYONE DO?</Kicker>
      <Head>{verdictLine(c, me ? me.id : "", d.round) || "Here is the week."}</Head>

      <Panel pad={12}>
        <div style={{ ...label({ color: V.text3, textAlign: "left", marginBottom: 10 }) }}>
          TOP THREE THIS WEEK
        </div>
        <div style={{ display: "flex", justifyContent: "space-around", gap: 8 }}>
          {c.top3.map((p, i) => {
            const mine = me && p.id === me.id;
            const medal = [V.gold, V.silver, V.bronze][i];
            return (
              <div key={p.id} className="v-pop" style={{ display: "grid", justifyItems: "center",
                gap: 0, animationDelay: `${i * 120}ms` }}>
                <Face src={p.photo} size={34} ring={mine ? V.amber : medal} />
                {/* Last name on a pill under the chin. */}
                <div style={{
                  marginTop: -8, padding: "2px 6px", borderRadius: 7, background: "#000",
                  border: `1px solid ${mine ? V.amber : medal}`, whiteSpace: "nowrap",
                  fontFamily: FD, fontWeight: 700, fontSize: 12, lineHeight: 1.3,
                  color: mine ? V.amber : "#fff",
                }}>{shortName(p.name)}</div>
                <div style={{ ...numeric("chip", { fontSize: 16, color: V.text, marginTop: 3 }) }}>
                  {p.pts}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel>
        <ChartHead n={2} action={focus ? "Show all 48" : null} onAction={() => setFocus(null)} />
        <Scatter c={c} focus={focus} onFocus={setFocus} />
        <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 6, flexWrap: "wrap" }}>
          {[["Won", V.blue], ["Lost", V.pink], ["You", V.amber]].map(([t, col]) => (
            <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: col }} />
              <span style={{ ...label({ fontSize: 12, color: V.text2 }) }}>{t}</span>
            </span>
          ))}
        </div>
      </Panel>
    </>
  );
}

function CardDecided({ d }) {
  const [bb, setBb] = useState(true);
  const c = d.card3;
  const shown = bb ? c.margin : c.marginNoBB;
  const color = shown > 0 ? V.green : shown < 0 ? V.pink : V.text2;
  return (
    <>
      <Kicker>YOUR MATCHUP</Kicker>
      <Head color={c.bbDecided ? V.blue : V.text} glow={c.bbDecided}>
        {c.bbDecided
          ? (c.margin > 0 ? "You won this on BOX BOX." : "You lost this on BOX BOX.")
          : c.identical ? "The four of you picked the same race."
          : `${c.gaps[0].driver} was worth ${Math.abs(c.gaps[0].gap)} more to ${c.gaps[0].gap > 0 ? "you" : "them"}.`}
      </Head>

      <Panel glow={c.bbDecided ? V.blue : null}>
        <ChartHead n={3} title="The margin" action={bb ? "Remove BOX BOX" : "Put it back"}
          onAction={() => setBb(!bb)} />
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 10 }}>
          <div style={{ ...numeric("stat", { fontSize: 52 }), ...textGlow(color),
            transition: "color 300ms ease" }}>{signed(shown)}</div>
          <div style={{ ...label({ color: V.text3 }) }}>
            {shown > 0 ? "YOU WIN" : shown < 0 ? "YOU LOSE" : "LEVEL"}
          </div>
        </div>
        <div style={{ ...body("bodySm", { color: V.text3, marginTop: 6 }) }}>
          {bb ? "with the BOX BOX result" : "driver points only"}
        </div>
      </Panel>

      {c.identical ? (
        <Panel>
          <Line color={V.text2}>
            You and your opponents picked the same drivers, and every one of them was
            worth exactly the same to both teams. So the week came down to BOX BOX.
          </Line>
        </Panel>
      ) : (
        <Panel>
          <div style={{ ...label({ color: V.text3, textAlign: "left", marginBottom: 10 }) }}>
            WHAT EACH DRIVER WAS WORTH
          </div>
          <GapBars gaps={c.gaps} />
        </Panel>
      )}

      <Panel pad={11}>
        <div style={{ ...label({ color: V.text3, textAlign: "left", marginBottom: 9 }) }}>
          TAKE ONE AWAY
        </div>
        <div style={{ display: "flex", justifyContent: "space-around", gap: 8 }}>
          {[["BOX BOX", c.bbDecided], ["Order bonus", c.orderDecided], ["Best finish", c.bestDecided]].map(([t, hit]) => (
            <div key={t} style={{ display: "grid", justifyItems: "center", gap: 3 }}>
              <span style={{ ...label({ fontSize: 12, color: hit ? V.blue : V.text3 }) }}>{t}</span>
              <span style={{ ...body("bodySm", { color: hit ? V.blue : V.text3, fontWeight: 600 }) }}>
                {hit ? (c.margin > 0 ? "you lose" : "you win") : "same result"}
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}

const VERDICT = {
  both: { head: "Both. The needle and the line.", color: V.green, glow: true },
  needle: { head: "Your guess scored. You lost the line.", color: V.blue, glow: false },
  line: { head: "You won the line. Your guess scored nothing.", color: V.blue, glow: false },
  neither: { head: "Neither the needle nor the line.", color: V.pink, glow: false },
};

function CardNeedle({ d }) {
  const [all, setAll] = useState(false);
  const c = d.card4;
  const v = VERDICT[c.verdict];
  return (
    <>
      <Kicker>THE NEEDLE</Kicker>
      <Head color={v.color} glow={v.glow}>{v.head}</Head>

      <Panel>
        <ChartHead n={4} title={all ? "Every guess" : "The four guesses"} action={all ? "Your matchup" : "Whole league"}
          onAction={() => setAll(!all)} />
        <PitLine four={all ? c.leagueFour : c.four} line={all ? null : c.line} pit={c.pit} />
        {!all && <GuessList four={c.four} />}
        {all && (
          <div style={{ ...body("bodySm", { color: V.text3, marginTop: 6 }) }}>
            All {c.leagueFour.length} guesses this week. Yours is the ringed one.
          </div>
        )}
      </Panel>

      <Panel pad={12}>
        <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", gap: 12 }}>
          <Stat n={c.guess} cap="YOUR GUESS" color={V.amber} size={30} />
          <Stat n={two(c.off)} cap="OFF BY" color={c.needlePts > 0 ? V.blue : V.text2} size={30} />
          <Stat n={c.needlePts} cap="YOU SCORED" color={c.needlePts > 0 ? V.green : V.text2} size={30} />
          <Stat n={c.bb === "won" ? "W" : c.bb === "lost" ? "L" : "P"} cap="BOX BOX"
            color={c.bb === "won" ? V.green : c.bb === "lost" ? V.pink : V.text2} size={30} />
        </div>
      </Panel>

      <Panel pad={12}>
        <div style={{ display: "flex", justifyContent: "space-around", gap: 12 }}>
          <Stat n={c.toFloor} cap="ABOVE 1.5" color={V.text2} size={26} />
          <Stat n={c.toCeil} cap="BELOW 4.5" color={V.text2} size={26} />
          <Stat n={`${c.leagueScored}/${c.field}`} cap="GOT POINTS" color={V.text2} size={26} />
        </div>
      </Panel>
    </>
  );
}

const STATE = {
  held: { head: "You had room to spare.", color: V.green },
  solo: { head: "You could have won this one on your own.", color: V.pink },
  pair: { head: "The two of you together could have won the line.", color: V.pink },
  notEnough: { head: "You could have won the line and still lost.", color: V.text2 },
  locked: { head: "No guess in the range would have saved you.", color: V.text2 },
};

function CardWhatIf({ d }) {
  const [play, setPlay] = useState(false);
  const c = d.card5;
  const s = STATE[c.state];
  const four = d.card4.four;
  // Playing it out moves your guess, and on the pair states your teammate's
  // too, to the end of the range that helps your side.
  const moved = useMemo(() => {
    if (!play) return four;
    const end = c.wantLow ? 1.5 : 4.5;
    return four.map(f => (f.mine && (c.state === "pair" || f.me) ? { ...f, guess: end } : f));
  }, [play, four, c.wantLow, c.state]);
  const movedLine = useMemo(() => {
    const gs = moved.map(f => f.guess).filter(x => x != null);
    return gs.length ? gs.reduce((a, b) => a + b, 0) / gs.length : null;
  }, [moved]);
  const wouldWin = movedLine != null && (c.wantLow ? d.card4.pit > movedLine : d.card4.pit < movedLine);

  return (
    <>
      <Kicker>{c.state === "held" ? "YOUR GUESS" : "THE GUESS YOU COULD HAVE MADE"}</Kicker>
      <Head color={s.color} glow={c.state === "held"}>{s.head}</Head>

      <Panel glow={play && wouldWin ? V.green : null}>
        <ChartHead n={5} title={play ? "Both of you at the end of the range" : "Where the line sat"}
          action={c.state === "held" ? null : play ? "Put it back" : "Show me"}
          onAction={() => setPlay(!play)} />
        <PitLine four={moved} line={play ? movedLine : d.card4.line} pit={d.card4.pit}
          need={c.need} wantLow={c.wantLow} />
      </Panel>

      <Panel pad={12}>
        <div style={{ display: "grid", gap: 8 }}>
          <Row k="Your guess" v={c.guess} />
          <Row k={c.state === "held" ? "You'd have lost the line at" : "You needed"}
            v={`${c.wantLow ? "under" : "over"} ${one(c.need)}`}
            color={c.state === "held" ? V.green : V.pink} />
          {c.state !== "held" && !c.soloPossible && (
            <div style={{ ...body("bodySm", { color: V.text3, textAlign: "left" }) }}>
              {c.wantLow ? `${PIT_FLOOR} is the lowest you can guess` : `${PIT_CEIL} is the highest you can guess`}, so on
              your own you couldn't get there.
            </div>
          )}
          {c.state !== "held" && (
            <Row k={`With ${firstName(c.mateName)} moving too`}
              v={c.pairPossible ? "you win it" : "still not enough"}
              color={c.pairPossible ? V.green : V.text3} />
          )}
          {c.state === "held" && <Row k="Room to spare" v={`${one(c.room)}s`} color={V.green} />}
          {c.state !== "held" && (
            <Row k="Matchup if you'd won the line" v={signed(c.flippedMargin)}
              color={c.flippedMargin > 0 ? V.green : V.pink} />
          )}
        </div>
      </Panel>

      <Line>
        {c.state === "solo"
          ? `Guess ${c.wantLow ? "under" : "over"} ${one(c.need)} and you win the line, and you win the matchup too. Winning BOX BOX is worth 12 points of margin.`
          : c.state === "pair"
            ? `On your own you couldn't get the line far enough. Both of you at ${c.wantLow ? "1.5" : "4.5"} gets there, and then you win the matchup.`
            : c.state === "notEnough"
              ? "Winning BOX BOX is worth 12 points of margin, and you lost by more than that."
              : c.state === "locked"
                ? `Even with both of you at ${c.wantLow ? "1.5" : "4.5"}, the line still lands on the wrong side. Your opponents guessed too far the other way.`
                : `You'd have had to guess ${c.wantLow ? "over" : "under"} ${one(c.need)} to lose the line. You were ${one(c.room)} clear of that.`}
      </Line>
    </>
  );
}

const Row = ({ k, v, color = V.text }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
    <span style={{ ...body("bodySm", { color: V.text2, textAlign: "left" }) }}>{k}</span>
    <span style={{ ...numeric("chip", { fontSize: 16, color }) }}>{v}</span>
  </div>
);

function CardDifference({ d }) {
  const [sortKey, setSortKey] = useState("swing");
  const c = d.card6;
  return (
    <>
      <Kicker>ROUND {d.round} · THE DIFFERENCE MAKER</Kicker>
      <Head color={V.blue} glow>
        {c.hero ? `${c.hero.driver} was worth ${c.hero.swing} points.` : "Everybody picked the same drivers."}
      </Head>

      {c.hero && (
        <Panel glow={V.blue}>
          <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", gap: 12 }}>
            <Stat n={c.hero.pts} cap="HE SCORED" color={V.blue} size={30} />
            <Stat n={`${c.hero.picks}/${c.field}`} cap="PICKED HIM" color={V.text2} size={30} />
            <Stat n={c.hero.decided} cap="CAME DOWN TO HIM" color={c.hero.decided ? V.green : V.text2} size={30} />
          </div>
        </Panel>
      )}

      {c.mostDecisive && (
        <Panel pad={12}>
          <Line color={V.text2}>
            <b style={{ color: V.text }}>{c.mostDecisive.driver}</b> was worth less overall, and
            more matchups came down to him: {apNum(c.mostDecisive.decided)} of 12.
          </Line>
        </Panel>
      )}

      {c.trap && (
        <Panel glow={V.pink}>
          <div style={{ ...label({ color: V.pink, textAlign: "left", marginBottom: 8 }) }}>THE WORST PICK OF THE WEEK</div>
          <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", gap: 12 }}>
            <Stat n={c.trap.driver.split(" ").pop()} cap={`${c.trap.picks} PICKED HIM`} color={V.pink} size={26} />
            <Stat n={c.trap.pickerAvg} cap="THEY AVERAGED" color={V.pink} size={30} />
            <Stat n={c.trap.otherAvg} cap="EVERYONE ELSE" color={V.text2} size={30} />
          </div>
        </Panel>
      )}

      <Panel>
        <ChartHead n={6} title={sortKey === "swing" ? "Worth to the team that had him" : "What his pickers averaged"}
          action={sortKey === "swing" ? "Per person" : "Worth to the team"}
          onAction={() => setSortKey(sortKey === "swing" ? "edge" : "swing")} />
        <EdgeBars rows={c.compared} sortKey={sortKey} />
        {c.excluded > 0 && (
          <div style={{ ...body("bodySm", { color: V.text3, marginTop: 10 }) }}>
            {c.excluded} driver{c.excluded === 1 ? "" : "s"} left off. Nearly everyone picked
            them, so there's nobody left to compare them with.
          </div>
        )}
      </Panel>
    </>
  );
}

// A standings table: column headings, every row in the table, and the reader's
// row lit and scrolled to. Bigger type than a table usually gets, because this
// is a phone and the deck's floor is 13px.
const MoveMark = ({ m }) => {
  if (m == null || m === 0) {
    return <span style={{ ...label({ fontSize: 13, color: V.text3 }) }}>&ndash;</span>;
  }
  const up = m > 0, col = up ? MINE_C : THEIRS_C;
  return (
    <span style={{ ...numeric("chip", { fontSize: 14, color: col }), whiteSpace: "nowrap" }}>
      {up ? "\u25b2" : "\u25bc"}{Math.abs(m)}
    </span>
  );
};

function StandingsTable({ rows, kind, value = r => r.pts, unit = "PTS" }) {
  const box = useRef(null);
  // Open on the reader's row rather than at the top of 48.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const row = el.querySelector("[data-me='1']");
    if (row) el.scrollTop = Math.max(0, row.offsetTop - el.clientHeight / 2 + row.clientHeight / 2);
  }, [rows, unit]);

  // The name column is what is left, so everything beside it is only as wide as
  // it has to be and the gaps are 6 rather than 8. Names still wrap rather than
  // lose their end: at 360 this table was cutting 29 of them, "Cascadia
  // Motorsport" by 60px. A grid puts the header in one grid and every row in
  // another, so these have to be fixed widths; auto would size each row on its
  // own contents and the columns would not line up.
  const cols = "26px 24px 1fr 44px 28px";
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: cols, gap: 6,
        padding: "0 8px 6px", borderBottom: `1px solid ${V.border}` }}>
        <span style={{ ...label({ fontSize: 11, color: V.text3, textAlign: "right" }) }}>POS</span>
        <span />
        <span style={{ ...label({ fontSize: 11, color: V.text3, textAlign: "left" }) }}>
          {kind === "team" ? "TEAM" : "PLAYER"}
        </span>
        <span style={{ ...label({ fontSize: 11, color: V.text3, textAlign: "right" }) }}>{unit}</span>
        <span style={{ ...label({ fontSize: 11, color: V.text3, textAlign: "right" }) }}>+/&minus;</span>
      </div>
      <div ref={box} className="v-scroll" style={{ maxHeight: 196, overflowY: "auto",
        marginTop: 4 }}>
        <div style={{ display: "grid", gap: 3 }}>
          {rows.map(r => (
            <div key={r.id} data-me={r.me ? "1" : "0"} style={{
              display: "grid", gridTemplateColumns: cols, gap: 6, alignItems: "center",
              padding: "5px 8px", borderRadius: 8,
              background: r.me ? V.bg4 : "transparent",
              border: `1px solid ${r.me ? V.amber : "transparent"}`,
            }}>
              <span style={{ textAlign: "right",
                ...numeric("chip", { fontSize: 16, color: r.me ? V.amber : V.text3 }) }}>
                {r.place}
              </span>
              {kind === "team"
                ? <Logo src={r.logo} size={22} />
                : <Face src={r.photo} size={22} ring={r.me ? V.amber : V.border2} />}
              <Flagged name={r.name} nation={r.nation} size={15} gap={6} wrap
                style={{ ...body("bodySm", { fontSize: 15,
                  color: r.me ? V.text : V.text2, fontWeight: r.me ? 700 : 400 }) }} />
              <span style={{ textAlign: "right",
                ...numeric("chip", { fontSize: 16, color: V.blue }),
                ...(r.me ? textGlow(V.blue, 0.6) : {}) }}>{value(r)}</span>
              <span style={{ textAlign: "right" }}><MoveMark m={r.move} /></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CardStandings({ d }) {
  const [metric, setMetric] = useState("avg");
  const c = d.card7;
  const t = c.team, ind = c.individual;
  const divName = t && t.division === "championship" ? "Championship" : "Second Division";
  const iMove = ind && c.individualBefore ? c.individualBefore.place - ind.place : null;

  return (
    <>
      <Kicker>WHERE YOU STAND</Kicker>
      <Head lines={2}>
        {iMove > 0 ? `Up ${apNum(iMove)} to ${apOrdinal(ind.place)}.`
          : iMove < 0 ? `Down ${apNum(-iMove)} to ${apOrdinal(ind.place)}.`
          : ind ? `Still ${apOrdinal(ind.place)} of ${ind.of}.` : "Where you stand."}
      </Head>

      {ind && (
        <Panel pad={13}>
          <div style={{ display: "flex", justifyContent: "space-between",
            alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ ...label({ fontSize: 12, color: V.text3 }) }}>
              YOU · {ind.races} ROUNDS
            </span>
            <div style={{ display: "flex", gap: 5 }}>
              {[["avg", "PER RACE"], ["pts", "TOTAL"]].map(([k, tx]) => (
                <button key={k} onClick={() => setMetric(k)} style={{
                  ...label({ fontSize: 11, color: metric === k ? V.bg : V.blue }),
                  background: metric === k ? V.blue : "transparent",
                  border: `1px solid ${V.blue}`, borderRadius: 999,
                  padding: "4px 10px", cursor: "pointer",
                }}>{tx}</button>
              ))}
            </div>
          </div>
          <StandingsTable rows={c.indAll} kind="player"
            value={r => (metric === "avg" ? r.avg : r.pts)}
            unit={metric === "avg" ? "AVG" : "TOTAL"} />
        </Panel>
      )}

      {t && (
        <Panel pad={13}>
          <div style={{ display: "flex", justifyContent: "space-between",
            alignItems: "baseline", marginBottom: 8 }}>
            <span style={{ ...label({ fontSize: 12, color: V.text3 }) }}>
              {divName.toUpperCase()} · {c.half.toUpperCase()}
            </span>
            <span style={{ ...numeric("chip", { fontSize: 15, color: V.text2 }) }}>
              {t.w}-{t.l}-{t.d}
            </span>
          </div>
          <StandingsTable rows={c.teamAll} kind="team" />
        </Panel>
      )}

      <Ask>So what is next?</Ask>
    </>
  );
}


function CardNext({ d, onPicks, onExit }) {
  const c = d.card8;
  const r = c.race;
  const when = r && r.date
    ? new Date(r.date + "T12:00:00Z").toLocaleDateString(undefined,
      { weekday: "long", month: "long", day: "numeric" })
    : null;
  return (
    <>
      <Kicker>NEXT</Kicker>
      <div style={titleBox({ width: "100%" })}>
        <div style={{ fontFamily: FM, fontWeight: 400, lineHeight: 1.25,
          fontSize: titleFit(r ? r.name : "SEASON", { min: 18, max: 38, fill: 0.96 }),
          ...textGlow(V.pink, 0.9) }}>
          {r ? r.name : "That is the season"}
        </div>
      </div>
      {r && (
        <Panel glow={V.pink}>
          <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", gap: 12 }}>
            <Stat n={r.round} cap="ROUND" color={V.pink} size={30} count={false} />
            <div style={{ display: "grid", gap: 2, justifyItems: "center" }}>
              <div style={{ ...body("bodyMd", { color: V.text }) }}>{when}</div>
              <div style={{ ...label({ color: V.text3 }) }}>RACE DAY</div>
            </div>
          </div>
        </Panel>
      )}
      <Line>
        {c.poolReady
          ? "The driver pools are up. Get your picks in."
          : "Picks aren't open yet. Check back on the Tuesday before the race."}
      </Line>
      <button onClick={c.poolReady ? onPicks : onExit} className="v-pulse" style={{
        ...display("h3", { color: V.bg }), background: c.poolReady ? V.green : V.blue,
        border: "none", borderRadius: 999, padding: "15px 40px", cursor: "pointer",
        boxShadow: `0 0 22px ${c.poolReady ? V.green : V.blue}88`,
      }}>
        {c.poolReady ? "MAKE YOUR PICKS" : "DONE"}
      </button>
    </>
  );
}

/* -------------------------------------------------------------------- deck */

/**
 * The deck itself, given data from buildWeekly. Split from the loader so the
 * smoke script can render all 48 without a network.
 */
export function WeeklyDeck({ data, onExit, onPicks, initialCard = 0, initialStage = 0 }) {
  const [i, setI] = useState(Math.min(CARDS - 1, Math.max(0, initialCard)));
  const [stage, setStage] = useState(initialStage);

  useEffect(() => { window.scrollTo(0, 0); }, [i]);

  const stages = CARD_STAGES[i] || 1;
  const lastStage = stage >= stages - 1;
  // The reset belongs here rather than in an effect on `i`: an effect also runs
  // on mount, which threw away the stage that ?stage= had just opened on.
  const advance = () => {
    if (lastStage) { setI(i + 1); setStage(0); }
    else setStage(stage + 1);
  };
  // Back steps through presses first, then to the last press of the card before.
  const back = () => {
    if (stage > 0) { setStage(stage - 1); return; }
    if (i === 0) return;
    setI(i - 1);
    setStage((CARD_STAGES[i - 1] || 1) - 1);
  };

  if (!data) return null;

  // The grid card is cut: card 2 already puts every player on screen.
  const bodies = [CardResult, CardRace, CardStandings, CardNext];
  const Body = bodies[i];
  const last = i === CARDS - 1;

  return (
    <div style={{ background: V.bg, minHeight: "100dvh", position: "relative", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Monoton&family=Encode+Sans+Semi+Condensed:wght@400;600;700&family=Chakra+Petch:wght@600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${V.bg}; overflow-x: hidden; }
        html { overflow-x: hidden; }
        /* Nothing inside a card may be wider than the card, and DOM order
           decides what paints on top. Both of these bit on the midseason deck:
           a nowrap row pushed its panel past the edge, and a positioned board
           painted over the button below it. */
        .f5card > * { max-width: 100% !important; flex-shrink: 0 !important; position: relative; }
        /* Every card arrives the same way: its blocks rise in order, so the deck
           has a rhythm instead of a cut between presses. */
        @keyframes v-enter { from { opacity: 0; transform: translateY(15px); }
                             to { opacity: 1; transform: none; } }
        .f5card > * { animation: v-enter 400ms cubic-bezier(.2,.85,.3,1) both; }
        .f5card > *:nth-child(1) { animation-delay: 0ms; }
        .f5card > *:nth-child(2) { animation-delay: 70ms; }
        .f5card > *:nth-child(3) { animation-delay: 140ms; }
        .f5card > *:nth-child(4) { animation-delay: 210ms; }
        .f5card > *:nth-child(5) { animation-delay: 280ms; }
        .f5card > *:nth-child(6) { animation-delay: 350ms; }
        .f5card > *:nth-child(n+7) { animation-delay: 420ms; }
        /* Charts draw themselves in. The full geometry is always in the DOM and
           only the transform moves, so react-dom/server sees a complete chart
           and a renderer that does not run animations shows a complete chart
           too. Toggling a width from state instead left every bar at zero for
           anything that does not animate, which is how these first shipped. */
        @keyframes v-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        @keyframes v-pop  { from { opacity: 0; } to { opacity: 1; } }
        .v-grow { animation: v-grow 560ms cubic-bezier(.2,.8,.3,1) both; }
        /* Bars sliding to their seats, and bars growing or shrinking. */
        .v-move { transition: left 620ms cubic-bezier(.3,.7,.3,1),
                              width 620ms cubic-bezier(.3,.7,.3,1),
                              bottom 620ms cubic-bezier(.3,.7,.3,1),
                              opacity 420ms ease; }
        .v-seg  { transition: height 560ms cubic-bezier(.3,.7,.3,1),
                              background 400ms ease, opacity 400ms ease; }
        /* A bar coming up out of the axis, with a little overshoot at the top. */
        @keyframes v-rise-up { from { transform: scaleY(0); } 70% { transform: scaleY(1.06); }
                               to { transform: scaleY(1); } }
        .v-rise { animation: v-rise-up 520ms cubic-bezier(.2,.9,.3,1) both; }
        /* BOX BOX arriving from above rather than fading in where it lands. */
        @keyframes v-drop-in { from { transform: translateY(-26px); opacity: 0; }
                               to { transform: none; opacity: 1; } }
        .v-drop { animation: v-drop-in 480ms cubic-bezier(.2,.9,.3,1) both; }
        /* One flash on your own bar as the field recolours, so you find
           yourself again the moment the colours stop meaning what they did. */
        @keyframes v-flash-once {
          0%, 100% { filter: none; }
          40% { filter: brightness(1.9); }
        }
        .v-flash { animation: v-flash-once 700ms ease-out 900ms 1 both; }
        /* A flag on a pole, moving the way one does. */
        @keyframes v-wave-flag {
          0%, 100% { transform: skewY(0deg) scaleY(1); }
          30%      { transform: skewY(-2.6deg) scaleY(1.03); }
          65%      { transform: skewY(2.2deg) scaleY(0.98); }
        }
        .v-wave { animation: v-wave-flag 2.8s ease-in-out infinite;
                  transform-origin: left center; }
        @keyframes v-grow-up { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        /* SVG rects need the origin in user units, and the box bottom is where
           a bar should grow from. */
        .v-grow-up { animation: v-grow-up 380ms cubic-bezier(.2,.8,.3,1) both;
                     transform-origin: center bottom; transform-box: fill-box; }
        .v-pop  { animation: v-pop 380ms ease both; }
        @media (prefers-reduced-motion: reduce) {
          .v-grow, .v-grow-up, .v-pop { animation: none !important; }
          .v-move, .v-seg { transition: none !important; }
          .v-flash, .v-wave { animation: none !important; }
          .v-rise, .v-drop { animation: none !important; }
          .f5card > * { animation: none !important; }
        }
        ${VEGAS_CSS}
      `}</style>

      {/* Progress. Eight lights, and the one you are on is lit. */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 30,
        display: "flex", gap: 4, padding: "14px 16px 10px", background:
          `linear-gradient(${V.bg} 60%, transparent)` }}>
        {CARD_STAGES.map((n, ci) =>
          Array.from({ length: n }, (_, si) => {
            const done = ci < i || (ci === i && si <= stage);
            const here = ci === i && si === stage;
            return (
              <div key={`${ci}-${si}`} style={{
                flex: 1, height: 3, borderRadius: 2, background: V.bg4,
                overflow: "hidden",
              }}>
                <div style={{
                  height: "100%", width: done ? "100%" : "0%", borderRadius: 2,
                  background: V.blue,
                  boxShadow: here ? `0 0 8px ${V.blue}` : "none",
                  transition: "width 420ms cubic-bezier(.2,.85,.3,1)",
                }} />
              </div>
            );
          })
        )}
      </div>

      {/* Back, opposite skip. Hidden on the first press, where there is nothing
          to go back to. */}
      {!(i === 0 && stage === 0) && (
        <button onClick={back} aria-label="Back" style={{
          position: "fixed", top: 20, left: 12, zIndex: 31,
          background: "transparent", border: "none", cursor: "pointer",
          padding: "8px 10px", lineHeight: 0,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <polyline points="15,4 7,12 15,20" fill="none" stroke={V.text3}
              strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      {/* Skip. Subtle, on every card, and it counts as seen. */}
      <button onClick={onExit} style={{
        position: "fixed", top: 26, right: 14, zIndex: 31,
        ...label({ fontSize: 12, color: V.text3 }), background: "transparent",
        border: "none", cursor: "pointer", padding: "6px 4px",
      }}>SKIP</button>

      <Card dep={`${i}-${stage}-${data.player.name}`}
        scrolls={SCROLLS.has(i) || (i === 1 && stage === S_TEAM)}>
        <Body d={data} stage={stage} onPicks={onPicks} onExit={onExit} />
      </Card>

      {!last && (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 30,
          display: "flex", justifyContent: "center", padding: "16px 16px 26px",
          background: `linear-gradient(transparent, ${V.bg} 46%)` }}>
          <button onClick={advance} style={{
            ...display("h3", { color: V.bg }), background: V.blue, border: "none",
            borderRadius: 999, padding: "13px 44px", cursor: "pointer",
            boxShadow: `0 0 18px ${V.blue}77`,
          }}>NEXT</button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ loader */

const EMPTY = { players: [], teams: [], races: [], scores: [], picks: [], results: [], schedule: [] };

/**
 * The weekly deck for one player, loaded from Supabase.
 *
 * @param round optional, for looking at an earlier week. Defaults to the most
 *              recently scored round, which is what makes this automatic:
 *              scoring a round in Admin publishes that week's decks.
 */
export default function Weekly({ playerName, round = null, onExit, onPicks, initialCard = 0, initialStage = 0 }) {
  const [db, setDb] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [players, teams, races, scores, picks, results, schedule] = await Promise.all([
          supabase.from("players").select("*"),
          supabase.from("teams").select("*"),
          supabase.from("races").select("*").eq("season", 2026),
          supabase.from("scores").select("*"),
          supabase.from("picks").select("*"),
          supabase.from("results").select("*"),
          supabase.from("schedule").select("*"),
        ]);
        if (!alive) return;
        setDb({
          players: players.data || [], teams: teams.data || [], races: races.data || [],
          scores: scores.data || [], picks: picks.data || [], results: results.data || [],
          schedule: schedule.data || [],
        });
      } catch (e) {
        if (alive) setErr(String(e.message || e));
      }
    })();
    return () => { alive = false; };
  }, []);

  const data = useMemo(
    () => (db ? buildWeekly(db, playerName, round) : null),
    [db, playerName, round]
  );

  if (err || (db && !data)) return (
    <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 30,
      background: V.bg, color: V.text, fontFamily: FB, textAlign: "center" }}>
      <div style={{ display: "grid", gap: 14, justifyItems: "center" }}>
        <div style={{ ...display("h2") }}>Nothing here yet</div>
        <div style={{ ...body("body", { color: V.text2 }) }}>
          {err ? "Something went wrong loading the round." : "This week hasn't been scored yet."}
        </div>
        {onExit && <button onClick={onExit} style={{
          ...display("h3", { color: V.bg }), background: V.blue, border: "none",
          borderRadius: 999, padding: "12px 32px", cursor: "pointer",
        }}>DONE</button>}
      </div>
    </div>
  );

  if (!db) return (
    <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center",
      background: V.bg, color: V.text3, fontFamily: FB }}>
      <div style={{ ...label({ color: V.text3 }) }} className="v-pulse">LOADING</div>
    </div>
  );

  return <WeeklyDeck data={data} onExit={onExit} onPicks={onPicks} initialCard={initialCard} initialStage={initialStage} />;
}
