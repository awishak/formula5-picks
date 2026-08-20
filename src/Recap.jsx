// First-half recap: a tap-through deck, personalised to whoever is signed in.
//
// Sixteen cards, forward only, one next button. Content is centred on both axes
// on every card, so the deck reads the same on a phone and a laptop.
//
// Five rules this file exists to hold:
//
//   1. HEADLINE FIRST. Every card opens with the one sentence that is its
//      takeaway, then supports it underneath. Never build up to the point.
//      These are real sentences, not UI fragments: the deck is narration.
//   2. THE F5 MARK SITS ON EVERY CARD until the deck turns, where SECOND HALF
//      replaces it. That swap is the only signal the half has changed.
//   3. Nothing below MICRO, which is 15px light and 17px Vegas. The old 13px
//      floor was raised on 2026-08-17: it was too small to read on a phone.
//   4. Animation is CSS, never sliced data. Every chart renders its full path on
//      the server and then draws itself in the browser. Slicing by a timer would
//      make all 48 decks render identically under react-dom/server, which is
//      exactly what scripts/smoke-recap.jsx exists to catch.
//   5. Charts carry a legend and both axis labels. A line nobody can name is
//      decoration.
//
// Cards 1-11 are the first half in the light look. Card 12 turns Vegas, with a
// deliberately slow flash, and cards 12-16 are the second half.
//
// All data comes from src/recapData.json, built by scripts/recap/cards.mjs.
// Nothing here touches Supabase.

import { useState, useEffect, useMemo, useRef } from "react";
import DATA from "./recapData.json";
import { BG, BLUE, TEXT, TEXT2, BORDER, avatarColor } from "./theme";
import { V, FM, FD as VFD, FB, edgeGlow, textGlow, VEGAS_CSS } from "./theme.vegas";

const FD_LIGHT = "'Geologica', sans-serif";
const CARDS = 18;
const VEGAS_FROM = 12;             // 0-based: card 13 is the first Vegas card
const SCROLLS = new Set([10, 12, 15, 16]);  // 0-based: card 11 (midfield drivers),
                                            // 13 (the division), 16 (the rules)
                                            // and 17 (every fixture)
const LOGO = "/formula5_logo.png";

/* ------------------------------------------------------------- tokens */

// One token object per look, so a card body never branches on the theme. The
// Vegas steps are deliberately a notch larger than the light ones.
function tokens(vegas) {
  return vegas
    ? { bg: V.bg, panel: V.bg2, panel2: V.bg3, text: V.text, dim: V.text2,
        faint: V.text3, line: V.border, good: V.blue, great: V.green,
        bad: V.pink, fd: VFD, fb: FB, glow: true,
        head: 33, line1: 29, small: 26, micro: 23,
        win: V.green, loss: V.red, draw: V.text2,
        band: [V.amber, "#e8734a", "#5b8db8"] }
    : { bg: BG, panel: "#fff", panel2: "#f0f0f3", text: TEXT, dim: TEXT2,
        faint: "#7a7a8e", line: BORDER, good: BLUE, great: "#1aa855",
        bad: "#d4507a", fd: FD_LIGHT, fb: "'DM Sans', sans-serif", glow: false,
        head: 23, line1: 20, small: 18, micro: 16,
        // Andrew asked for green wins and red losses. Red and green are the
        // pair colourblind readers cannot separate, so the result is carried by
        // a W, L or D letter and the colour only reinforces it.
        win: "#1aa855", loss: "#d33a2c", draw: "#5f5f72",
        // Categorical, not semantic: top pool, midfield, everything else. The
        // three are separated by lightness as well as hue so they survive CVD.
        band: ["#e8b33c", "#e8734a", "#4a86b8"] };
}

// Card 9's headline names whichever part of your game ranks best, so each one
// carries a subject and the verb that agrees with it.
const SHINE = {
  top_pick_pts: ["Your top driver", "is"],
  midfield_pts: ["Your midfield picks", "are"],
  order_bonus: ["Your finishing order", "is"],
  best_finish_bonus: ["Your best finish call", "is"],
  pit_individual_pts: ["The needle", "is"],
  weekly_bonus_pts: ["Your weekly bonus", "is"],
};

// Keeps a single word from falling onto its own line at the end of a sentence.
// CSS text-wrap: pretty does most of this; the hard space guarantees the last two.
const noOrphan = s => String(s).replace(/\s+(\S+)$/, " $1");

/* -------------------------------------------------------------- pieces */

function Avatar({ name, photo, size = 96, ring, T }) {
  const initials = (name || "").split(/\s+/).map(w => w[0]).slice(0, 2).join("");
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: photo ? `center/cover url(${photo})` : avatarColor(name),
      display: "grid", placeItems: "center", overflow: "hidden",
      color: "#fff", fontFamily: T.fd, fontSize: Math.max(15, size * 0.34),
      letterSpacing: "0.02em",
      border: ring ? `2px solid ${ring}` : `2px solid ${T.line}`,
      ...(ring && T.glow ? { boxShadow: `0 0 14px ${ring}66` } : {}),
    }}>{photo ? "" : initials}</div>
  );
}

function Logo({ src, name, size = 64, T }) {
  if (!src) return (
    <div style={{ width: size, height: size, borderRadius: 12, background: T.panel2,
      display: "grid", placeItems: "center", fontFamily: T.fd,
      fontSize: Math.max(15, size * 0.3), color: T.dim }}>{(name || "?")[0]}</div>
  );
  return <img src={src} alt="" style={{ width: size, height: size, objectFit: "contain" }} />;
}

// Nothing in this deck is allowed to scroll, in either direction. Two things
// enforce that:
//
//   Horizontally, the root sets overflow-x hidden and every wide element is
//   capped to the column width.
//
//   Vertically, Card measures its own content against the space between the
//   header and the nav, and scales it down if it does not fit. The cards are
//   laid out to the iPhone 15 budget (353x529) so the scaler stays at 1 on a
//   normal phone; it only bites on an SE, where 383px of height cannot hold a
//   twelve-team board at full size no matter how it is written.
// The shell's padding has to clear the fixed header and the fixed nav, and the
// scaler has to know exactly what that padding is or it leaves the difference
// overflowing. On a short screen the standard 168px is a quarter of the display,
// so it tightens to what the header and nav actually occupy.
// The bottom value has to clear the fixed nav AND the gradient above it, or
// the last line of a long card reads through the fade.
const PAD = h => (h < 740 ? { t: 56, b: 96 } : { t: 66, b: 108 });
const MIN_SCALE = 0.72;

function Card({ children, T, wide, dep, scrolls }) {
  const inner = useRef(null);
  const wrap = useRef(null);
  const [h, setH] = useState(null);
  const [fit, setFit] = useState(1);
  const [pad, setPad] = useState(PAD(900));
  const [lead, setLead] = useState(0);

  useEffect(() => {
    const el = inner.current;
    if (!el || typeof window === "undefined") return;
    const measure = () => {
      const p = PAD(window.innerHeight);
      setPad(p);
      // The wrapper carries the height from the LAST measurement, and the
      // content is a flex child inside it, so reading offsetHeight now returns
      // the constrained height rather than the real one. It converges on
      // whatever it happened to measure first, which is how the board ended up
      // squashed on a short screen. Release the wrapper before reading.
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
      // Top justified. Anything else leaves a gap above the headline.
      setLead(0);
      // Published on the element so a headless screenshot run can read how much
      // each card had to shrink. 1 means it fitted as written.
      document.documentElement.dataset.fit = k.toFixed(3);
      document.documentElement.dataset.natural = String(natural);
      // Sideways overflow is the other half of the no-scrolling rule, so it
      // gets published too. These must come out equal.
      const de = document.documentElement;
      document.documentElement.dataset.wide = `${de.scrollWidth}/${de.clientWidth}`;
    };
    measure();
    // The reserved height used to be measured once per card, so when card 6's
    // play-out added two paragraphs the content grew past its box and the board
    // sat on top of the text below. Transform does not affect the observed
    // border box, so re-measuring here cannot loop.
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (ro) ro.observe(el);
    // Geologica and DM Sans arrive after first paint and change every text
    // height, so the first measurement is against fallback metrics and is wrong.
    // Measure again once the real fonts are in.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure).catch(() => {});
    // And once more after images settle, since logos and photos have no
    // intrinsic size until they load.
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
      minHeight: "100dvh", width: "100%",
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      padding: `${pad.t}px 14px ${pad.b}px`, margin: "0 auto",
      maxWidth: wide ? 760 : 560, position: "relative",
      color: T.text, fontFamily: T.fb,
    }}>
      <div ref={wrap} data-fit={fit.toFixed(3)} style={{ width: "100%",
        height: scrolls ? undefined : h ?? undefined,
        marginTop: scrolls ? 0 : lead, display: "flex", justifyContent: "center" }}>
        <div ref={inner} className="f5card" style={{
          width: "100%", maxWidth: "100%", transformOrigin: "top center",
          display: "flex", flexDirection: "column",
          alignItems: "center", textAlign: "center", gap: 10,
        }}>{children}</div>
      </div>
    </div>
  );
}

// The takeaway. First element on every card, no exceptions.
const Head = ({ children, T, color }) => (
  <div style={{
    fontFamily: T.fb, fontWeight: 600, fontSize: T.head, lineHeight: 1.28,
    letterSpacing: "-0.01em", maxWidth: 520, textWrap: "balance",
    color: color || T.text,
    ...(T.glow && color ? textGlow(color, 0.55) : {}),
  }}>{children}</div>
);

const Line = ({ children, T, dim, size }) => (
  <div style={{ fontFamily: T.fb, fontSize: size || T.line1, lineHeight: 1.5,
    fontWeight: 400, color: dim ? T.dim : T.text, maxWidth: 480,
    textWrap: "pretty" }}>{children}</div>
);

const Kicker = ({ children, T }) => (
  <div style={{ fontFamily: T.fb, fontSize: T.micro, fontWeight: 700,
    letterSpacing: "0.12em", textTransform: "uppercase", color: T.faint }}>{children}</div>
);

// Fires once the card lands, so CSS transitions have a state to move to. Every
// animation in this file hangs off this, never off sliced data.
function useDrawn(live, delay = 90) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!live) { setOn(false); return; }
    const t = setTimeout(() => setOn(true), delay);
    return () => clearTimeout(t);
  }, [live, delay]);
  return on;
}

/* ------------------------------------------------------- card 2: the quote */

// Real team radio, picked by where you finished, plus a plain verdict so the
// joke has something to land on. No race or year is printed: these are all
// well-known lines, but pinning each to a specific Grand Prix is precision I
// cannot stand behind for every one of them.
const QUOTES = [
  { upTo: 6,  who: "Lewis Hamilton",  line: "Get in there!", verdict: "Pretty good." },
  { upTo: 18, who: "Carlos Sainz",    line: "Smooth operator.", verdict: "Not bad at all." },
  { upTo: 36, who: "Kimi Raikkonen",  line: "Leave me alone, I know what I'm doing.", verdict: "Right in the mix." },
  { upTo: 48, who: "Fernando Alonso", line: "GP2 engine. GP2!", verdict: "Not the best, but there's half a season to go." },
];
const quoteFor = rank => QUOTES.find(q => rank <= q.upTo) || QUOTES[QUOTES.length - 1];

/* -------------------------------------------------- card 2: the flythrough */

// Starts at the top of the table and travels down to the viewer, passing every
// player between. Two seconds whether you are 3rd or 48th, so the trip reads the
// same for everybody.
function Ladder({ me, T, live, big }) {
  const rows = DATA.league.ladder;
  const H = 50;
  const [VIEW, setView] = useState(350);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const fit = () => setView(Math.max(200, Math.min(350, Math.round(window.innerHeight * 0.41))));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  const MAX = Math.max(0, rows.length * H - VIEW);
  const idx = rows.findIndex(r => r.name === me.name);

  // Where the trip ends: your row, centred.
  const target = Math.max(0, Math.min(idx * H - VIEW / 2 + H / 2, MAX));

  // Where it starts. Scrolling from the top down to your row is no trip at all
  // if you finished 4th: three rows, about 25px, and nobody sees it move. So the
  // start is a fixed distance away instead, and everyone travels the same
  // twenty-odd rows in the same two seconds. Above the halfway point the list
  // comes up to meet you; below it, it falls to you.
  const TRIP = 22 * H;
  const from = target >= TRIP ? target - TRIP : Math.min(target + TRIP, MAX);

  const [y, setY] = useState(from);
  // Once the trip has finished, the column becomes an ordinary scroller so you
  // can go and look at anyone else.
  const [free, setFree] = useState(false);
  const box = useRef(null);
  useEffect(() => {
    if (!live) { setY(from); setFree(false); return; }
    const go = setTimeout(() => setY(target), 420);
    const hand = setTimeout(() => {
      setFree(true);
      if (box.current) box.current.scrollTop = target;
    }, 2600);
    return () => { clearTimeout(go); clearTimeout(hand); };
  }, [live, from, target]);

  return (
    <div ref={box} style={{ height: VIEW, width: "100%", maxWidth: big ? 560 : 340,
      overflowY: free ? "auto" : "hidden", overflowX: "hidden",
      WebkitOverflowScrolling: "touch",
      position: "relative", borderRadius: 16, background: T.panel,
      border: `1px solid ${T.line}` }}>
      <div style={{ transform: free ? "none" : `translateY(${-y}px)`,
        transition: free ? "none" : "transform 2s cubic-bezier(0.34, 0.02, 0.2, 1)" }}>
        {rows.map(r => {
          const you = r.name === me.name;
          return (
            <div key={r.name} style={{
              height: H, display: "flex", alignItems: "center", gap: big ? 12 : 8,
              padding: big ? "0 14px" : "0 10px",
              opacity: you ? 1 : 0.4,
              background: you ? (T.glow ? "rgba(0,217,255,0.10)" : "rgba(108,184,224,0.16)") : "transparent",
            }}>
              <div style={{ fontFamily: T.fd, fontSize: big ? 21 : 17, width: big ? 28 : 20,
                textAlign: "right", flexShrink: 0,
                color: you ? T.good : T.faint }}>{r.rank}</div>
              <Avatar name={r.name} photo={r.photo} size={big ? 36 : 30} T={T}
                ring={you ? T.good : null} />
              <div style={{ fontFamily: T.fb, fontSize: big ? 18 : 14, fontWeight: you ? 700 : 400,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                flex: "1 1 0", minWidth: 0, textAlign: "left" }}>{r.name}</div>
              <div style={{ fontFamily: T.fd, fontSize: big ? 24 : 18, flexShrink: 0,
                color: you ? T.good : T.dim }}>{r.ppr.toFixed(1)}</div>
            </div>
          );
        })}
      </div>
      {/* Fades top and bottom so the column reads as moving past a window. */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
        background: `linear-gradient(${T.panel}, transparent 22%, transparent 78%, ${T.panel})` }} />
    </div>
  );
}

/* ------------------------------------------- card 6: the promotion board */

// One absolutely-positioned layer for all 24 teams. Changing `mode` changes each
// team's coordinates, and the transition does the travelling.
//
// The card walks the board through four modes on the button:
//   before   where every team stood after round 10
//   settled  round 11 applied, teams reordered INSIDE their own division
//   marked   the ten that swap are lit up, nothing has moved yet
//   swapped  the five and five cross the gap
function Board({ mode, meTeam, T }) {
  const { newDiv } = DATA.league;
  const H = 25, COL = 160, GAP = 12;
  const marked = mode === "marked";
  const crossing = new Set(
    [...newDiv.champ, ...newDiv.second].filter(t => t.moved !== "stay").map(t => t.name),
  );

  const layout = useMemo(() => {
    const pos = {};
    const place = (rows, x) => rows.forEach((t, i) => (pos[t.name] = { x, y: i * H }));
    const all = [...newDiv.champ, ...newDiv.second];
    if (mode === "before" || mode === "settled" || mode === "marked") {
      const key = mode === "before" ? "pos10" : "pos11";
      const old = { champ: [], second: [] };
      all.forEach(t => old[t.oldDiv].push(t));
      old.champ.sort((a, b) => (a[key] ?? a.oldPos) - (b[key] ?? b.oldPos));
      old.second.sort((a, b) => (a[key] ?? a.oldPos) - (b[key] ?? b.oldPos));
      place(old.champ, 0); place(old.second, COL + GAP);
    } else if (mode === "swapped") {
      place(newDiv.champ, 0); place(newDiv.second, COL + GAP);
    } else {
      place([...newDiv.champ].sort((a, b) => b.avg - a.avg), 0);
      place([...newDiv.second].sort((a, b) => b.avg - a.avg), COL + GAP);
    }
    return pos;
  }, [mode, newDiv, H]);

  const all = [...newDiv.champ, ...newDiv.second];
  const sorry = new Set(DATA.league.sorry.map(s => s.name));

  return (
    <div style={{ position: "relative", width: COL * 2 + GAP, height: 12 * H + 24,
      margin: "0 auto", maxWidth: "100%", isolation: "isolate", flexShrink: 0 }}>
      <div style={{ display: "flex", gap: GAP, marginBottom: 5 }}>
        {["Championship", "Second"].map(d => (
          <div key={d} style={{ width: COL, fontFamily: T.fb, fontSize: T.micro,
            fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase",
            color: T.faint }}>{d}</div>
        ))}
      </div>
      {all.map(t => {
        const p = layout[t.name] || { x: 0, y: 0 };
        const mine = t.name === meTeam;
        const moving = crossing.has(t.name);
        const flag = mode === "byAvg" && sorry.has(t.name);
        const lit = marked && moving;
        const tint = flag ? T.bad : lit ? T.great : moving && mode === "swapped" ? T.good : null;
        return (
          <div key={t.name} style={{
            position: "absolute", left: 0, top: 22, width: COL, height: H - 3,
            transform: `translate(${p.x}px, ${p.y}px) scale(${lit ? 1.04 : 1})`,
            // Slow on purpose. The point of this card is watching it happen.
            transition: "transform 1.8s cubic-bezier(0.45, 0, 0.2, 1)",
            display: "flex", alignItems: "center", gap: 7, padding: "0 8px",
            borderRadius: 8, boxSizing: "border-box", zIndex: lit ? 2 : 1,
            background: mine ? (T.glow ? "rgba(0,217,255,0.14)" : "rgba(108,184,224,0.2)") : T.panel,
            border: `1px solid ${mine ? T.good : tint || T.line}`,
            boxShadow: lit ? `0 0 0 2px ${T.great}55` : "none",
          }}>
            <Logo src={t.logo} name={t.name} size={15} T={T} />
            <div style={{ fontFamily: T.fb, fontSize: mode === "byAvg" ? 12 : 13,
              fontWeight: mine ? 700 : 400,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1,
              textAlign: "left", color: tint || T.text }}>{t.short || t.name}</div>
            {mode === "byAvg" && (
              <div style={{ fontFamily: T.fd, fontSize: 12, flexShrink: 0, color: tint || T.dim }}>{t.avg.toFixed(1)}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------ chart plumbing */

// Bigger than the first draft in every direction: taller box, more room for the
// axes, and type that survives a phone.
const CW = 400, CH = 162, PL = 46, PR = 10, PT = 10, PB = 46;
const px = (i, n) => PL + (n < 2 ? 0 : (i / (n - 1)) * (CW - PL - PR));
const py = (v, max) => PT + (1 - v / (max || 1)) * (CH - PT - PB);
const path = (vals, max) => vals.map((v, i) => `${i ? "L" : "M"}${px(i, vals.length)},${py(v, max)}`).join(" ");

// Lines draw themselves with a dash offset rather than by adding points, so the
// full geometry is in the `d` attribute even before anything animates. 4000 just
// has to exceed any real path length.
const DASH = 4000;
const draw = (on, delay, dur = 2.6) => ({
  strokeDasharray: DASH, strokeDashoffset: on ? 0 : DASH,
  transition: `stroke-dashoffset ${dur}s ease ${delay}s`,
});

function Axes({ max, n, T, yLabel, xLabel }) {
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  return (
    <>
      {ticks.map(f => (
        <line key={f} x1={PL} x2={CW - PR} y1={py(max * f, max)} y2={py(max * f, max)}
          stroke={T.line} strokeWidth="1" opacity={f === 0 ? 1 : 0.6} />
      ))}
      {ticks.map(f => (
        <text key={`t${f}`} x={PL - 7} y={py(max * f, max) + 5} textAnchor="end"
          fontFamily={T.fd} fontSize="13" fill={T.faint}>{Math.round(max * f)}</text>
      ))}
      {Array.from({ length: n }, (_, i) => (
        <text key={`r${i}`} x={px(i, n)} y={CH - PB + 18} textAnchor="middle"
          fontFamily={T.fd} fontSize="13" fill={T.faint}>{i + 1}</text>
      ))}
      <text x={(PL + CW - PR) / 2} y={CH - 6} textAnchor="middle"
        fontFamily={T.fb} fontSize="14" fontWeight="600" fill={T.dim}>{xLabel}</text>
      <text x={13} y={(PT + CH - PB) / 2} textAnchor="middle"
        transform={`rotate(-90 13 ${(PT + CH - PB) / 2})`}
        fontFamily={T.fb} fontSize="14" fontWeight="600" fill={T.dim}>{yLabel}</text>
    </>
  );
}

function Legend({ items, T }) {
  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap",
      marginTop: 2 }}>
      {items.map(it => (
        <div key={it.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: it.dash ? 14 : 10, height: it.dash ? 3 : 10, flexShrink: 0,
            borderRadius: it.dash ? 2 : 3, background: it.col, opacity: it.faded ? 0.45 : 1 }} />
          <span style={{ fontFamily: T.fb, fontSize: 14, color: T.text,
            whiteSpace: "nowrap" }}>{it.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------- card 8: the two charts */

function Charts({ deck, T, live }) {
  const on = useDrawn(live, 150);
  const mate1 = deck.team.mate.split(/\s+/)[0];
  const mine = deck.series.map(s => s.pts);
  const mate = deck.mateSeries.map(s => s.pts);
  const wk = deck.teamSeries;
  const maxP = Math.max(10, ...mine, ...mate);
  const maxT = Math.max(10, ...wk.map(w => Math.max(w.us || 0, w.them || 0)));

  return (
    <div style={{ width: "100%", maxWidth: 500, display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 6 }}>
      <div>
        <Kicker T={T}>You and {mate1}, round by round</Kicker>
        <svg viewBox={`0 0 ${CW} ${CH}`} style={{ width: "100%", height: "auto" }}>
          <Axes max={maxP} n={mine.length} T={T} yLabel="Points" xLabel="Round" />
          {/* Teammate underneath and muted, so the eye stays on your line. */}
          <path d={path(mate, maxP)} fill="none" stroke={T.dim} strokeWidth="2.5"
            opacity="0.45" style={draw(on, 2.8)} />
          <path d={path(mine, maxP)} fill="none" stroke={T.good} strokeWidth="3.5"
            strokeLinejoin="round" style={draw(on, 0)} />
          {mine.map((v, i) => (
            <circle key={i} cx={px(i, mine.length)} cy={py(v, maxP)} r="4.5" fill={T.good}
              style={{ opacity: on ? 1 : 0, transition: `opacity .3s ease ${i * 0.22}s` }} />
          ))}
        </svg>
        <Legend T={T} items={[
          { label: "You", col: T.good, dash: true },
          { label: mate1, col: T.dim, dash: true, faded: true },
        ]} />
      </div>

      <div>
        <Kicker T={T}>{deck.team.name}, week by week</Kicker>
        <svg viewBox={`0 0 ${CW} ${CH}`} style={{ width: "100%", height: "auto" }}>
          <Axes max={maxT} n={wk.length} T={T} yLabel="Points" xLabel="Round" />
          <path d={path(wk.map(w => w.them || 0), maxT)} fill="none" stroke={T.dim}
            strokeWidth="2.5" opacity="0.4" style={draw(on, 6.2)} />
          <path d={path(wk.map(w => w.us || 0), maxT)} fill="none" stroke={T.good}
            strokeWidth="3.5" strokeLinejoin="round" style={draw(on, 5.8)} />
          {wk.map((w, i) => {
            const col = w.result === "W" ? T.win : w.result === "L" ? T.loss : T.draw;
            const y = py(w.us || 0, maxT);
            return (
              <g key={i}
                style={{ opacity: on ? 1 : 0, transition: `opacity .3s ease ${6 + i * 0.2}s` }}>
                {/* A ring means the BOX BOX line is what decided the week. */}
                {w.decided && <circle cx={px(i, wk.length)} cy={y} r="13" fill="none"
                  stroke={col} strokeWidth="2" />}
                <circle cx={px(i, wk.length)} cy={y} r="9.5" fill={T.panel}
                  stroke={col} strokeWidth="1.5" />
                <text x={px(i, wk.length)} y={y + 5} textAnchor="middle"
                  fontFamily={T.fd} fontSize="14" fontWeight="700" fill={col}>{w.result}</text>
              </g>
            );
          })}
        </svg>
        <Legend T={T} items={[
          { label: "Us", col: T.good, dash: true },
          { label: "Them", col: T.dim, dash: true, faded: true },
          { label: "Won", col: T.win },
          { label: "Lost", col: T.loss },
          { label: "Ring = BOX BOX decided it", col: T.draw },
        ]} />
      </div>
    </div>
  );
}

/* ------------------------------------------------ card 9: where it came from */

function Stacked({ deck, T, live }) {
  const on = useDrawn(live, 150);
  const rows = deck.stack;
  const n = rows.length;
  const max = Math.max(10, ...rows.map(r => r.top + r.mid + r.rest));
  const bands = [
    { key: "top", label: "Top driver", col: T.band[0] },
    { key: "mid", label: "Midfield drivers", col: T.band[1] },
    { key: "rest", label: "Order, best finish, needle, bonus", col: T.band[2] },
  ];

  // Cumulative from the bottom up, so each band is the area between two lines.
  const areas = bands.map((b, bi) => {
    const under = rows.map(r => bands.slice(0, bi).reduce((s, x) => s + r[x.key], 0));
    const over = rows.map((r, i) => under[i] + r[b.key]);
    const top = over.map((v, i) => `${i ? "L" : "M"}${px(i, n)},${py(v, max)}`).join(" ");
    const bottom = under.map((_, i) => `L${px(n - 1 - i, n)},${py(under[n - 1 - i], max)}`).join(" ");
    return { ...b, d: `${top} ${bottom} Z` };
  });

  return (
    <div style={{ width: "100%", maxWidth: 500 }}>
      <svg viewBox={`0 0 ${CW} ${CH}`} style={{ width: "100%", height: "auto" }}>
        <Axes max={max} n={n} T={T} yLabel="Points" xLabel="Round" />
        {/* The bands wipe in from the left under a clip, so the whole shape is
            in the DOM from the first render and only the reveal is animated. */}
        <clipPath id="recap-wipe">
          <rect x="0" y="0" width={CW} height={CH}
            style={{ transformBox: "fill-box", transformOrigin: "left center",
              transform: on ? "scaleX(1)" : "scaleX(0)",
              transition: "transform 2.8s ease" }} />
        </clipPath>
        <g clipPath="url(#recap-wipe)">
          {areas.map(a => <path key={a.key} d={a.d} fill={a.col} opacity="0.9" />)}
          <path d={path(rows.map(r => r.top + r.mid + r.rest), max)} fill="none"
            stroke={T.text} strokeWidth="2.5" opacity="0.6" />
        </g>
      </svg>
      <Legend T={T} items={bands.map(b => ({ label: b.label, col: b.col }))} />
    </div>
  );
}

/* ------------------------------------------------ card 10: how you stack up */

function Ranks({ deck, T }) {
  return (
    <div style={{ width: "100%", maxWidth: 500, display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 6 }}>
      {deck.comps.map(c => {
        const hot = c.rank <= 12, cold = c.rank >= 37;
        const col = hot ? T.great : cold ? T.bad : T.good;
        return (
          <div key={c.key} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "6px 12px",
            borderRadius: 10, background: T.panel, border: `1px solid ${T.line}`,
          }}>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ fontFamily: T.fb, fontSize: T.small, fontWeight: 600 }}>{c.label}</div>
              <div style={{ fontFamily: T.fb, fontSize: T.micro, color: T.dim }}>
                league {c.league.toFixed(1)}
              </div>
            </div>
            <div style={{ fontFamily: T.fd, fontSize: 27, fontWeight: 600, color: col,
              ...(T.glow ? textGlow(col, 0.5) : {}) }}>{c.you.toFixed(1)}</div>
            <div style={{ width: 58, textAlign: "right" }}>
              <div style={{ fontFamily: T.fd, fontSize: 19, color: col }}>{ordinal(c.rank)}</div>
              <div style={{ fontFamily: T.fb, fontSize: T.micro, color: T.faint }}>of 48</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------- card 4: the reaction */

// Sixteen pieces on fixed paths. A win sends them up in the good colours; a
// loss drops them slowly in the bad one. No randomness, so every render of a
// given deck is identical and the smoke check stays meaningful.
function Confetti({ tone, T, live }) {
  const on = useDrawn(live, 120);
  const good = tone === "good";
  const cols = good ? [T.win, T.good, T.band[0]] : [T.loss, T.dim];
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden",
      pointerEvents: "none", borderRadius: 16 }}>
      {Array.from({ length: 16 }, (_, n) => {
        const left = 6 + ((n * 37) % 89);
        const delay = ((n * 13) % 90) / 100;
        const size = 5 + (n % 3) * 3;
        return (
          <span key={n} style={{
            position: "absolute", left: `${left}%`, top: good ? "78%" : "-8%",
            width: size, height: size + (n % 2) * 4,
            borderRadius: n % 2 ? 2 : "50%",
            background: cols[n % cols.length],
            opacity: on ? 1 : 0,
            animation: on
              ? `${good ? "f5pop" : "f5drop"} ${good ? 1.5 : 2.6}s ease-out ${delay}s both`
              : "none",
          }} />
        );
      })}
    </div>
  );
}

/* ------------------------------------------------- card 12: the doorway */

// Two dice that tumble and settle. Drawn rather than emoji so they glow with
// the rest of the deck and keep their shape at any size.
const PIPS = {
  1: [[50, 50]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 26], [72, 26], [28, 50], [72, 50], [28, 74], [72, 74]],
};

function Die({ face, T, delay }) {
  return (
    <svg viewBox="0 0 100 100" width="66" height="66"
      style={{ animation: `f5roll 1.9s cubic-bezier(0.28, 1.5, 0.45, 1) ${delay}s both` }}>
      <rect x="4" y="4" width="92" height="92" rx="20" fill={T.panel}
        stroke={T.good} strokeWidth="3" />
      {(PIPS[face] || PIPS[1]).map(([cx, cy], n) => (
        <circle key={n} cx={cx} cy={cy} r="9" fill={T.good} />
      ))}
    </svg>
  );
}

const Dice = ({ T, live }) => (
  <div key={live ? "on" : "off"} style={{ position: "relative", display: "flex",
    gap: 14, alignItems: "center", justifyContent: "center", padding: "10px 0" }}>
    <div style={{ position: "absolute", inset: "-18px -34px", borderRadius: 999,
      background: `radial-gradient(circle, ${T.good}22, transparent 70%)`,
      animation: "f5halo 2.2s ease-in-out infinite" }} />
    <Die face={5} T={T} delay={0.05} />
    <Die face={1} T={T} delay={0.22} />
    <Die face={6} T={T} delay={0.39} />
  </div>
);

/* -------------------------------------------- card 13: the new division */

function DivisionGrid({ teams, meTeam, T }) {
  // Ordered by where each team sits against all 24 on scoring average, so the
  // list reads as a ranking rather than an alphabet.
  const rows = useMemo(() => [...teams].sort((a, b) => a.avgRank - b.avgRank), [teams]);
  return (
    <div style={{ width: "100%", maxWidth: 500, display: "grid",
      gridTemplateColumns: "minmax(0, 1fr)", gap: 5 }}>
      {rows.map(t => {
        const mine = t.name === meTeam;
        return (
          <div key={t.name} style={{
            display: "flex", alignItems: "center", gap: 7, padding: "5px 9px",
            borderRadius: 10, background: T.panel,
            border: `1px solid ${mine ? T.good : T.line}`,
            ...(mine ? edgeGlow(V.blue, 0.5) : {}),
          }}>
            <div style={{ fontFamily: T.fd, fontSize: T.micro - 3, width: 92, flexShrink: 0,
              whiteSpace: "nowrap", textAlign: "left",
              color: mine ? T.good : T.faint }}>Ranked #{t.avgRank}</div>
            <Logo src={t.logo} name={t.name} size={24} T={T} />
            <div style={{ flex: "1 1 0", minWidth: 0, textAlign: "left",
              fontFamily: T.fb, fontSize: T.micro, fontWeight: mine ? 700 : 400,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              color: mine ? T.good : T.text }}>{t.short || t.name}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------- card 14: everything to zero */

// Your new division as it finished the first half, places and records and
// points, and then the points count down to nothing and the places drop away.
function ResetBoard({ teams, meTeam, T, live }) {
  const rows = useMemo(() => [...teams].sort((a, b) => b.pts - a.pts), [teams]);
  const [zero, setZero] = useState(false);
  useEffect(() => {
    if (!live) { setZero(false); return; }
    const t = setTimeout(() => setZero(true), 1500);
    return () => clearTimeout(t);
  }, [live]);

  return (
    <div style={{ width: "100%", maxWidth: 460, display: "grid",
      gridTemplateColumns: "minmax(0, 1fr)", gap: 3 }}>
      {rows.map((r, n) => {
        const mine = r.name === meTeam;
        return (
          <div key={r.name} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "4px 10px",
            borderRadius: 8, background: T.panel,
            border: `1px solid ${mine ? T.good : T.line}`,
          }}>
            <div style={{ width: zero ? 0 : 20, overflow: "hidden", flexShrink: 0,
              transition: "width .5s ease", fontFamily: T.fd, fontSize: T.micro,
              color: T.faint, textAlign: "right" }}>{n + 1}</div>
            <Logo src={r.logo} name={r.name} size={20} T={T} />
            <div style={{ flex: "1 1 0", minWidth: 0, textAlign: "left",
              fontFamily: T.fb, fontSize: T.micro - 3, fontWeight: mine ? 700 : 400,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              color: mine ? T.good : T.text }}>{r.short || r.name}</div>
            <div style={{ fontFamily: T.fd, fontSize: T.micro - 3, color: T.faint,
              flexShrink: 0 }}>{r.record.w}-{r.record.l}{r.record.d ? `-${r.record.d}` : ""}</div>
            <Counter to={zero ? 0 : r.pts} T={T} />
          </div>
        );
      })}
    </div>
  );
}

// Counts down rather than cutting, so the wipe is watched rather than found.
function Counter({ to, T }) {
  const [n, setN] = useState(to);
  useEffect(() => {
    if (n === to) return;
    const step = Math.max(1, Math.ceil(Math.abs(n - to) / 22));
    const id = setInterval(() => {
      setN(v => {
        if (v === to) { clearInterval(id); return v; }
        return v > to ? Math.max(to, v - step) : Math.min(to, v + step);
      });
    }, 45);
    return () => clearInterval(id);
  }, [to, n]);
  return (
    <div style={{ width: 42, textAlign: "right", flexShrink: 0, fontFamily: T.fd,
      fontSize: 20, color: n === 0 ? T.bad : T.good,
      ...(T.glow ? textGlow(n === 0 ? V.pink : V.blue, 0.7) : {}) }}>{n}</div>
  );
}

/* --------------------------------------------------- card 18: the calendar */

// The fixtures list gets the same short forms as the board. Built from the
// division rows, which already carry them.
const SHORT_BY_NAME = Object.fromEntries(
  [...DATA.league.newDiv.champ, ...DATA.league.newDiv.second].map(t => [t.name, t.short]),
);

function Fixtures({ deck, T }) {
  const f = deck.fixtures;
  if (!f) return <Line T={T} dim>Your fixtures land as soon as the draw is published.</Line>;
  return (
    <div style={{ width: "100%", maxWidth: 500, display: "grid",
      gridTemplateColumns: "minmax(0, 1fr)", gap: 6 }}>
      {f.weeks.map(w => (
        <div key={w.round} style={{
          display: "flex", alignItems: "center", gap: 8, padding: "5px 10px",
          borderRadius: 10, background: T.panel, border: `1px solid ${T.line}`,
        }}>
          <div style={{ fontFamily: T.fd, fontSize: 17, width: 30, textAlign: "left",
            flexShrink: 0, color: T.good }}>R{w.round}</div>
          <Logo src={w.oppLogo} name={w.opp} size={26} T={T} />
          <div style={{ flex: "1 1 0", textAlign: "left", minWidth: 0 }}>
            <div style={{ fontFamily: T.fb, fontSize: T.micro - 3, fontWeight: 600,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {SHORT_BY_NAME[w.opp] || w.opp}
            </div>
            {w.oppRank && (
              <div style={{ fontFamily: T.fb, fontSize: T.micro - 6, color: T.faint,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                Ranked #{w.oppRank}
              </div>
            )}
          </div>
          <div style={{ fontFamily: T.fd, fontSize: T.micro - 2, letterSpacing: "0.07em",
            padding: "3px 9px", borderRadius: 999, flexShrink: 0,
            color: w.side === "over" ? T.good : T.bad,
            border: `1px solid ${w.side === "over" ? T.good : T.bad}` }}>
            {w.side === "over" ? "OVER" : "UNDER"}
          </div>
        </div>
      ))}
      <div style={{ textAlign: "left", padding: "10px 12px", borderRadius: 10,
        background: T.panel2, border: `1px solid ${T.line}`, marginTop: 4 }}>
        <div style={{ fontFamily: T.fb, fontSize: T.micro - 4, color: T.dim,
          lineHeight: 1.45 }}>
          If the FIA holds a 23rd race, it will be seeded as follows:
          <br />1st place plays 12th place
          <br />2nd place plays 11th place
          <br />and so on.
          <br /><br />If there happens to be a round 24, the format will be announced then.
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- deck */

// initialCard exists for scripts/smoke-recap.jsx, which has to reach every card
// without being able to click.
export default function Recap({ playerName, onExit, onPicks, onChangeName, initialCard = 0 }) {
  const [i, setI] = useState(initialCard);
  const [phase, setPhase] = useState(0);          // card 6's play-out stages
  const [boardMode, setBoardMode] = useState("before");
  const deck = DATA.players[playerName];
  const vegas = i >= VEGAS_FROM;
  const T = tokens(vegas);

  // Card 6 waits for the button and then walks four stages, slowly, because the
  // point of the card is watching it happen. Card 7 sorts itself on arrival.
  useEffect(() => {
    if (i === 5) { setBoardMode("before"); setPhase(0); return; }
    if (i === 6) { setBoardMode("swapped"); const t = setTimeout(() => setBoardMode("byAvg"), 800); return () => clearTimeout(t); }
  }, [i]);

  useEffect(() => { window.scrollTo(0, 0); }, [i]);

  if (!deck) return (
    <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 30,
      background: BG, color: TEXT, fontFamily: "'DM Sans', sans-serif", textAlign: "center" }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 14 }}>
        <div style={{ fontFamily: FD_LIGHT, fontSize: 26 }}>No recap for {playerName || "you"}</div>
        <div style={{ color: TEXT2, fontSize: 16 }}>This deck covers the 48 players with a first-half team.</div>
        {onExit && <button onClick={onExit} style={btn(tokens(false))}>Back to the app</button>}
      </div>
    </div>
  );

  const t = deck.team;
  const first = deck.name.split(/\s+/)[0];
  const mate1 = t.mate.split(/\s+/)[0];
  const { sorry, fairCount, highlights, promotion, prep } = DATA.league;
  const leader = DATA.league.ladder[0];
  const q = quoteFor(deck.rank);
  const myDivision = DATA.league.newDiv[t.dest];
  const bestSpot = prep.bestSpot[0];

  const playOut = () => {
    setPhase(1); setBoardMode("settled");
    setTimeout(() => { setPhase(2); setBoardMode("marked"); }, 2600);
    setTimeout(() => { setPhase(3); setBoardMode("swapped"); }, 5200);
  };

  const cards = [
    // 1 ───────────────────────────────────────────────────────────── title
    () => (
      <Card T={T} dep={i}>
        <Head T={T}>The first half of the season is over. Let's take a look at how you're doing so far.</Head>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20 }}>
          <Avatar name={deck.name} photo={deck.photo} size={116} T={T} ring={T.good} />
          <Logo src={t.logo} name={t.name} size={92} T={T} />
        </div>
        <Line T={T} dim size={T.small}>{first}, of {t.name}</Line>
        <div style={{ display: "grid", gap: 3 }}>
          {deck.notes.map(n => (
            <div key={n} style={{ fontFamily: T.fb, fontSize: T.small, fontWeight: 500,
              color: T.band[1] }}>{n}</div>
          ))}
        </div>
        {/* The deck opens on whoever the app thinks you are, and on a shared
            phone or a fresh browser that is a guess. Quiet enough to ignore if
            it guessed right. */}
        {onChangeName && (
          <button onClick={onChangeName} style={{
            background: "none", border: "none", padding: "2px 0 0", cursor: "pointer",
            fontFamily: T.fb, fontSize: T.small, color: T.dim,
            textDecoration: "underline", textUnderlineOffset: 3,
          }}>Not you?</button>
        )}
      </Card>
    ),
    // 2 ─────────────────────────────────────────────────── you, and the field
    () => (
      <Card T={T} dep={i}>
        <Head T={T}>
          You scored {deck.ppr} points a race, which puts you {ordinal(deck.rank)} out of 48.
        </Head>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 1, padding: "7px 14px", borderRadius: 12,
          background: T.panel, border: `1px solid ${T.line}`, maxWidth: 340 }}>
          <div style={{ fontFamily: T.fb, fontSize: T.micro, color: T.faint }}>
            As {q.who} would say:
          </div>
          <div style={{ fontFamily: T.fb, fontSize: T.line1, fontWeight: 600,
            fontStyle: "italic", lineHeight: 1.3 }}>"{q.line}"</div>
          <div style={{ fontFamily: T.fb, fontSize: T.small, color: T.good,
            fontWeight: 600 }}>{q.verdict}</div>
        </div>
        <Ladder me={deck} T={T} live={i === 1} />
        {/* Three numbers instead of four sentences. The card was all prose. */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8,
          width: "100%", maxWidth: 340 }}>
          {[
            { n: deck.ppr, l: "You", col: T.good },
            { n: DATA.league.ppr, l: "League", col: T.dim },
            { n: leader.ppr, l: leader.name === deck.name ? "Nobody higher" : leader.name, col: T.text },
          ].map(x => (
            <div key={x.l} style={{ display: "grid", gap: 2, justifyItems: "center",
              padding: "5px 4px", borderRadius: 10, background: T.panel,
              border: `1px solid ${T.line}` }}>
              <div style={{ fontFamily: T.fd, fontSize: 26, lineHeight: 1, color: x.col }}>{x.n}</div>
              {/* The leader's full name needs two lines in a third of the row,
                  so every tile reserves them and the three stay level. */}
              <div style={{ fontFamily: T.fb, fontSize: 13, color: T.faint,
                lineHeight: 1.2, minHeight: 32, display: "flex", alignItems: "center",
                justifyContent: "center", textAlign: "center", maxWidth: "100%",
                overflowWrap: "anywhere" }}>{x.l}</div>
            </div>
          ))}
        </div>

      </Card>
    ),
    // 3 ───────────────────────────────────────────── the team, and the stake
    () => (
      <Card T={T} dep={i}>
        <Head T={T}>As for the team competition, things got a little spicy in round 11.</Head>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20 }}>
          <Logo src={t.logo} name={t.name} size={84} T={T} />
          <div style={{ fontFamily: T.fd, fontSize: 24, color: T.faint }}>v</div>
          <Logo src={t.oppLogo} name={t.opp} size={84} T={T} />
        </div>
        <Head T={T}>You were playing {deck.stake.goal}.</Head>
        <Line T={T} size={T.small}>{deck.stake.condition}</Line>
      </Card>
    ),
    // 4 ──────────────────────────────────────────────────────── the result
    () => (
      <Card T={T} dep={i}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <Confetti tone={deck.result.tone} T={T} live={i === 3} />
        </div>
        <Kicker T={T}>Round 11</Kicker>
        <Head T={T}>How did it go?</Head>
        <Head T={T} color={deck.result.tone === "good" ? T.win : deck.result.tone === "bad" ? T.loss : null}>
          Well, {deck.result.word}!
        </Head>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <Logo src={t.logo} name={t.name} size={54} T={T} />
          <div style={{ fontFamily: T.fd, fontSize: 46,
            color: deck.result.tone === "good" ? T.win : deck.result.tone === "bad" ? T.loss : T.text }}>
            {t.score}–{t.oppScore}
          </div>
          <Logo src={t.oppLogo} name={t.opp} size={54} T={T} />
        </div>
        <Line T={T}>{deck.result.consequence}</Line>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          {[[`+${t.earned}`, "points"], [t.ptsAfter, "total"], [ordinal(t.posAfter), t.div === "champ" ? "in Championship Division" : "in Second Division"]]
            .map(([n, l]) => (
            <div key={l} style={{ display: "grid", gap: 1, justifyItems: "center",
              padding: "6px 13px", borderRadius: 10, background: T.panel,
              border: `1px solid ${T.line}` }}>
              <div style={{ fontFamily: T.fd, fontSize: 22, lineHeight: 1, color: T.good }}>{n}</div>
              <div style={{ fontFamily: T.fb, fontSize: 13, color: T.faint }}>{l}</div>
            </div>
          ))}
        </div>
      </Card>
    ),
    // 5 ──────────────────────────────────────────── round 11 across the league
    () => (
      <Card T={T} dep={i}>
        <Head T={T}>{highlights.headline}</Head>
        <div style={{ width: "100%", maxWidth: 500, display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 12 }}>
          {highlights.items.map(h => (
            <div key={h.key} style={{
              display: "flex", alignItems: "flex-start", gap: 11, padding: "10px 13px",
              borderRadius: 10, background: T.panel, border: `1px solid ${T.line}`, textAlign: "left",
            }}>
              <Logo src={h.logo} name={h.key} size={34} T={T} />
              <div style={{ fontFamily: T.fb, fontSize: T.micro, lineHeight: 1.45 }}>{h.text}</div>
            </div>
          ))}
        </div>
      </Card>
    ),
    // 6 ─────────────────────────────────────────── promotion and relegation
    () => (
      <Card T={T} wide dep={i}>
        <Head T={T}>So who got promoted and relegated for the second half?</Head>
        {phase > 0 && (
          <Kicker T={T}>
            {phase === 1 ? "Round 11 applied" : phase === 2 ? "Five up, five down" : "The second half"}
          </Kicker>
        )}
        <Board mode={boardMode} meTeam={t.name} T={T} />
        {phase === 0 && (
          <button onClick={playOut} style={{ ...btn(T), background: T.good, color: "#fff",
            animation: "f5pulse 1.7s ease-in-out infinite" }}>
            Play out round 11
          </button>
        )}
        {phase === 3 && (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 8 }}>
            <Line T={T} size={T.small}>
              Four teams went up by finishing in the promotion spots: {promotion.byRule.map(p => p.name).join(", ")}.
            </Line>
            <Line T={T} size={T.small}>
              And {promotion.swap.up.name}, in the precarious matchup spot, had a higher scoring
              average than {promotion.swap.down.name}, {promotion.swap.up.avg.toFixed(1)} against{" "}
              {promotion.swap.down.avg.toFixed(1)}, which sent them up and sent {promotion.swap.down.name} down.
            </Line>
          </div>
        )}
      </Card>
    ),
    // 7 ────────────────────────────────────────────────── did the swap work
    () => (
      <Card T={T} wide dep={i}>
        <Head T={T}>Did promotion and relegation work?</Head>
        <Line T={T}>
          {fairCount} of the 12 best scoring averages are in the Championship Division.
        </Line>
        <Board mode={boardMode} meTeam={t.name} T={T} />
        <Line T={T} size={T.small}>
          {noOrphan(`If we went solely by scoring average, you would ${t.avgDiv === t.dest ? "still " : ""}be in the ${t.avgDiv === "champ" ? "Championship" : "Second"} Division.`)}
        </Line>
      </Card>
    ),
    // 8 ─────────────────────────────────────────────── your rounds, week by week
    () => (
      <Card T={T} dep={i}>
        <Head T={T}>Your rounds, and your team's weeks.</Head>
        <Charts deck={deck} T={T} live={i === 7} />
        {deck.mateTotal != null && (
          <Line T={T} size={T.small}>
            {deck.total > deck.mateTotal * 1.15
              ? `You've been carrying this team.`
              : deck.mateTotal > deck.total * 1.15
                ? `${mate1} has been carrying you.`
                : `You and ${mate1} have been balanced teammates.`}
          </Line>
        )}
      </Card>
    ),
    // 9 ──────────────────────────────────────── where the points came from
    () => (
      <Card T={T} dep={i}>
        <Head T={T}>
          {SHINE[deck.strong][0]} {SHINE[deck.strong][1]} where you shine, based on the rankings.
        </Head>
        <Stacked deck={deck} T={T} live={i === 8} />
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 4 }}>
          <Line T={T} size={T.small}>{noOrphan(`Your midfield picks brought ${deck.comps[1].you.toFixed(1)} a race.`)}</Line>
          {deck.favourite && (
            <Line T={T} size={T.small}>{noOrphan(`You picked ${deck.favourite.name} most, ${deck.favourite.cards} times for ${deck.favourite.pts} points.`)}</Line>
          )}
          {deck.star && (
            <Line T={T} size={T.small}>{noOrphan(`Your best return was ${deck.star.name}, who paid ${deck.star.pts}.`)}</Line>
          )}
          <Line T={T} dim size={T.micro}>{noOrphan(`Order ${deck.comps[2].you.toFixed(1)}, best finish ${deck.comps[3].you.toFixed(1)}, needle ${deck.comps[4].you.toFixed(1)}, weekly bonus ${deck.comps[5].you.toFixed(1)}.`)}</Line>
        </div>
      </Card>
    ),
    // 10 ─────────────────────────────────────────────────── how you stack up
    () => (
      <Card T={T} dep={i}>
        <Head T={T}>Here's how you scored in each component of the game so far.</Head>
        <Ranks deck={deck} T={T} />
      </Card>
    ),
    // 11 ────────────────────────────────────────── what to do about it
    () => (
      <Card T={T} dep={i} scrolls>
        <Head T={T}>What will you do in the second half to be even better?</Head>
        <Line T={T} dim size={T.small}>Scroll to see more.</Line>
        <div style={{ width: "100%", maxWidth: 500, display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 7 }}>
          <Panel T={T} title="Every top driver, per pick">
            {prep.drivers.top.map(d => (
              <Row key={d.name} T={T} label={d.name} value={d.per} sub={`${d.rounds} ${d.rounds === 1 ? "round" : "rounds"}`} />
            ))}
          </Panel>
          <Panel T={T} title="Best midfield drivers, per pick">
            {prep.drivers.mid.map(d => (
              <Row key={d.name} T={T} label={d.name} value={d.per} sub={`${d.rounds} ${d.rounds === 1 ? "round" : "rounds"}`} />
            ))}
          </Panel>
          <Panel T={T} title="Best finish: which call landed">
            {prep.bestSpot.filter(b => b.guesses >= 50).map(b => (
              <Row key={b.pos} T={T} label={`P${b.pos}`} value={`${b.pct}%`} sub={`${b.hits} of ${b.guesses}`} />
            ))}
          </Panel>
        </div>
        {prep.drivers.trap && (
          <Line T={T} size={T.small}>
            {noOrphan(`And the one to avoid: ${prep.drivers.trap.name} was picked ${prep.drivers.trap.picks} times and returned ${prep.drivers.trap.per} a pick.`)}
          </Line>
        )}
      </Card>
    ),
    // 12 ──────────────────────────────── the door into the second half
    () => (
      <Card T={T} dep={i}>
        <Head T={T}>Are you ready to start the second half of the season?</Head>
        <Dice T={T} live={i === 11} />
        <button onClick={() => setI(i + 1)} style={{ ...btn(T), fontSize: 19,
          padding: "17px 34px", background: T.good, color: "#fff",
          animation: "f5shine 1.8s ease-in-out infinite" }}>
          Let's roll the dice
        </button>
      </Card>
    ),
    // 13 ──────────────────────────────── VEGAS. your division for the half
    () => (
      <Card T={T} wide dep={i} scrolls>
        <Head T={T}>
          The second half is where it gets really interesting.
        </Head>
        <Line T={T} size={T.micro}>
          Teams in the Championship Division fight for the season title, and teams in the Second
          Division look to win and get promoted for 2027.
        </Line>
        <Line T={T} size={T.line1}>
          You're in the {t.dest === "champ" ? "Championship" : "Second"} Division.
        </Line>
        <Line T={T} dim size={T.micro}>Scroll to see more (ranked by scoring average).</Line>
        <DivisionGrid teams={myDivision} meTeam={t.name} T={T} />
      </Card>
    ),
    // 14 ────────────────────────────────────────────── the team game resets
    () => (
      <Card T={T} dep={i}>
        <Head T={T}>All teams start the second half on the same level.</Head>
        <Line T={T} size={T.small}>Every team championship point is wiped clean.</Line>
        <ResetBoard teams={myDivision} meTeam={t.name} T={T} live={i === 13} />
      </Card>
    ),
    // 15 ─────────────────────────────────────── VEGAS. the individual game
    () => (
      <Card T={T} dep={i}>
        <Head T={T}>And the individual game runs all season.</Head>
        <Line T={T} size={T.small}>
          The individual title goes to whoever has the highest scoring average over the entire season.
        </Line>
        <Ladder me={deck} T={T} live={i === 14} big />
        <Line T={T} dim size={T.micro}>
          {noOrphan(`Small change: scores now show as a season-long average, not a total.`)}
        </Line>
      </Card>
    ),
    // 17 ──────────────────────────────────────────── three things to know
    () => (
      <Card T={T} dep={i} scrolls>
        <Head T={T}>Most of the rules are the same, but you should know a few things.</Head>
        <Line T={T} dim size={T.small}>Scroll to see more.</Line>
        <div style={{ width: "100%", maxWidth: 500, display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 12 }}>
          {[
            "When you're choosing a pit stop time, you will now be able to choose all the way up to 4.5 seconds. It stopped at 4.0 in the first half.",
            "There will be 11 or 12 races in the second half, depending on what happens with the F1 calendar.",
            "Anyone who does not pick on time will have their picks made at random by Formula 5 Bot's less popular cousin, Fernolo 5 Bort, who is not very good at making picks.",
            "We'll crown a champion at the end, but promotion and relegation still applies. Keep driving all the way to the finish, wherever you are in the standings.",
          ].map((s, n) => (
            <div key={n} style={{ display: "flex", gap: 14, alignItems: "flex-start",
              padding: "11px 14px", borderRadius: 10, background: T.panel,
              border: `1px solid ${T.line}`, textAlign: "left" }}>
              <div style={{ fontFamily: T.fd, fontSize: 24, color: T.good, lineHeight: 1,
                ...textGlow(V.blue, 0.7) }}>{n + 1}</div>
              <div style={{ fontFamily: T.fb, fontSize: T.micro - 2, lineHeight: 1.5 }}>{s}</div>
            </div>
          ))}
        </div>
      </Card>
    ),
    // 18 ───────────────────────────────────────────────────── the calendar
    () => (
      <Card T={T} dep={i} scrolls>
        <Head T={T}>And here is who you play.</Head>
        <Line T={T} dim size={T.small}>Scroll to see more (ranked by scoring average).</Line>
        <Fixtures deck={deck} T={T} />
      </Card>
    ),
    // 19 ────────────────────────────────────────────────────────── send-off
    () => (
      <Card T={T} dep={i}>
        <Avatar name={deck.name} photo={deck.photo} size={104} T={T} ring={V.blue} />
        <div style={{ fontFamily: FM, fontSize: 46, lineHeight: 1.3, ...textGlow(V.blue, 1) }}>
          Good luck
        </div>
        <Line T={T}>See you in round 12, {first}.</Line>
        <button onClick={onPicks || onExit} style={{ ...btn(T), fontSize: 19,
          padding: "17px 34px", animation: "f5shine 2.2s ease-in-out infinite" }}>
          Make your picks
        </button>
      </Card>
    ),
  ];

  const nextLabel = {
    3: "Around the league",
    4: "Who went up and down",
    6: "See your season",
    10: "To the second half",
    11: null,               // card 12 has its own button and no nav one
  }[i];
  const showNext = nextLabel !== null;

  return (
    <div style={{ background: T.bg, minHeight: "100dvh", position: "relative",
      overflowX: "hidden", transition: "background 1.6s ease" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Monoton&family=Bebas+Neue&family=Geologica:wght@300;400;500;600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        /* Nothing inside a card may be wider than the card. Without this a
           nowrap flex row pushes its panel past the edge and the text is
           clipped rather than wrapped. */
        .f5card > * {
          max-width: 100% !important;
          flex-shrink: 0 !important;
          position: relative;
        }
        body { background: ${T.bg}; transition: background 1.6s ease; overflow-x: hidden; }
        html { overflow-x: hidden; }
        @keyframes f5pulse {
          0%, 100% { box-shadow: 0 0 0 0 ${T.good}55, 0 6px 18px ${T.good}44; }
          50%      { box-shadow: 0 0 0 12px ${T.good}00, 0 6px 26px ${T.good}88; }
        }
        @keyframes f5shine {
          0%, 100% { box-shadow: 0 0 14px ${V.blue}77, 0 0 40px ${V.blue}33; }
          50%      { box-shadow: 0 0 26px ${V.blue}dd, 0 0 74px ${V.blue}66; }
        }
        /* The turn into Vegas. Slow, and it only runs once. */
        @keyframes f5flash {
          0%   { opacity: 0; }
          10%  { opacity: 0.95; }
          26%  { opacity: 0.30; }
          42%  { opacity: 0.85; }
          58%  { opacity: 0.25; }
          72%  { opacity: 0.55; }
          100% { opacity: 0; }
        }
        /* A band of light crossing the screen, once, behind the content. */
        @keyframes f5sweep {
          0%   { transform: translateX(-130%) skewX(-18deg); opacity: 0; }
          12%  { opacity: 0.85; }
          88%  { opacity: 0.85; }
          100% { transform: translateX(130%) skewX(-18deg); opacity: 0; }
        }
        /* Headlights running left to right along the bottom, on a loop. */
        @keyframes f5car {
          0%   { transform: translateX(-14vw); opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { transform: translateX(114vw); opacity: 0; }
        }
        /* A real tumble: three full turns coming in, an overshoot, then settle. */
        @keyframes f5roll {
          0%   { transform: translateY(-120px) rotate(-1080deg) scale(0.2); opacity: 0; }
          30%  { opacity: 1; }
          62%  { transform: translateY(14px) rotate(28deg) scale(1.16); }
          80%  { transform: translateY(-6px) rotate(-9deg) scale(0.96); }
          100% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
        }
        @keyframes f5pop {
          0%   { transform: translateY(0) scale(0.4) rotate(0deg); opacity: 0; }
          18%  { opacity: 1; }
          100% { transform: translateY(-190px) scale(1) rotate(220deg); opacity: 0; }
        }
        @keyframes f5drop {
          0%   { transform: translateY(0) rotate(0deg); opacity: 0; }
          14%  { opacity: 0.75; }
          100% { transform: translateY(230px) rotate(90deg); opacity: 0; }
        }
        @keyframes f5halo {
          0%, 100% { transform: scale(0.9); opacity: 0.5; }
          50%      { transform: scale(1.08); opacity: 1; }
        }
        ${VEGAS_CSS}
      `}</style>

      {i === VEGAS_FROM && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 9, pointerEvents: "none",
            background: `radial-gradient(circle at 50% 45%, ${V.pink}cc, ${V.purple}66 42%, transparent 72%)`,
            animation: "f5flash 3.2s ease-out forwards" }} />
          <div style={{ position: "fixed", inset: "0 -40%", zIndex: 9, pointerEvents: "none",
            background: `linear-gradient(90deg, transparent, ${V.blue}55, #fff9, ${V.pink}55, transparent)`,
            animation: "f5sweep 2.6s ease-in-out forwards" }} />
        </>
      )}

      {/* Headlights crossing the bottom of every Vegas card. */}
      {vegas && (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: 96, height: 3,
          zIndex: 1, pointerEvents: "none", overflow: "hidden" }}>
          {[{ c: V.blue, d: 0, s: 7 }, { c: V.pink, d: 3.4, s: 9 }].map(l => (
            <div key={l.c} style={{ position: "absolute", top: 0, width: "13vw", height: 3,
              borderRadius: 3, background: `linear-gradient(90deg, transparent, ${l.c})`,
              boxShadow: `0 0 14px ${l.c}`,
              animation: `f5car ${l.s}s linear ${l.d}s infinite` }} />
          ))}
        </div>
      )}

      {/* The F5 mark rides every card until the deck turns. */}
      <div style={{ position: "fixed", top: 14, left: 0, right: 0, zIndex: 6,
        display: "grid", justifyItems: "center", gap: 9, padding: "0 20px" }}>
        {vegas ? (
          <div style={{ fontFamily: FM, fontSize: 24, lineHeight: 1.1, color: V.pink,
            ...textGlow(V.pink, 1) }}>Second half</div>
        ) : (
          <img src={LOGO} alt="Formula 5" style={{ height: 24, objectFit: "contain",
            filter: "brightness(0)", opacity: 0.78 }} />
        )}
        <div style={{ display: "flex", gap: 3, justifyContent: "center", width: "100%",
          maxWidth: 460 }}>
          {Array.from({ length: CARDS }, (_, n) => (
            <div key={n} style={{ height: 3, flex: 1, borderRadius: 2,
              background: n <= i ? T.good : T.line, transition: "background 0.3s ease" }} />
          ))}
        </div>
      </div>

      {cards[i]()}

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 5,
        padding: "14px 20px 22px", display: "flex", gap: 10,
        justifyContent: "center", alignItems: "center",
        background: `linear-gradient(transparent, ${T.bg} 42%)` }}>
        {i > 0 && (
          <button onClick={() => setI(i - 1)} aria-label="Back"
            style={{ ...btn(T), padding: "13px 17px", background: "transparent",
              color: T.dim, border: `1px solid ${T.line}`, boxShadow: "none" }}>←</button>
        )}
        {i < CARDS - 1 && showNext && (
          <button onClick={() => setI(i + 1)} style={btn(T)}>{nextLabel || "Next"}</button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- card 11 bits */

const Panel = ({ children, T, title }) => (
  <div style={{ padding: "9px 12px", borderRadius: 10, background: T.panel, maxWidth: "100%",
    border: `1px solid ${T.line}`, textAlign: "left", display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 4 }}>
    <div style={{ fontFamily: T.fb, fontSize: 14, fontWeight: 700,
      letterSpacing: "0.07em", textTransform: "uppercase", color: T.faint }}>{title}</div>
    {children}
  </div>
);

// One line per fact. The supporting number rides on the same row rather than
// under it, because four panels of two-line rows do not fit a phone.
const Row = ({ T, label, value, sub }) => (
  <div style={{ display: "flex", alignItems: "baseline", gap: 8, maxWidth: "100%" }}>
    <div style={{ fontFamily: T.fb, fontSize: T.micro, fontWeight: 600, minWidth: 0,
      flexShrink: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
    <div style={{ flex: "1 1 0", minWidth: 0, fontFamily: T.fb, fontSize: 14, color: T.faint,
      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>
    <div style={{ fontFamily: T.fd, fontSize: 19, color: T.good, whiteSpace: "nowrap",
      flexShrink: 0 }}>{value}</div>
  </div>
);

function btn(T) {
  return {
    fontFamily: T.fb, fontSize: 17, fontWeight: 700, letterSpacing: "0.03em",
    padding: "15px 30px", borderRadius: 999, cursor: "pointer",
    border: `1px solid ${T.good}`, background: T.glow ? "transparent" : T.good,
    color: T.glow ? T.good : "#fff",
    ...(T.glow ? edgeGlow(V.blue, 0.7) : {}),
  };
}

const ordinal = n => n + (["th", "st", "nd", "rd"][(n % 100 - 20) % 10] || ["th", "st", "nd", "rd"][n % 100] || "th");
