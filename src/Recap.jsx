// First-half recap: a tap-through deck, personalised to whoever is signed in.
//
// Ten cards, forward only, one next button. Content is centred on both axes on
// every card, so the deck reads the same on a phone and a laptop.
//
// Two rules this file exists to hold:
//
//   1. HEADLINE FIRST. Every card opens with the one sentence that is its
//      takeaway, then supports it underneath. Never build up to the point.
//      These are real sentences, not UI fragments: the deck is narration.
//   2. Nothing below 13px, per theme.vegas.js. The Vegas half runs LARGER than
//      the light half, not smaller, because it is the half being read on a
//      phone at a race.
//
// The deck turns Vegas on card 7. That is the story beat, not decoration.
//
// All data comes from src/recapData.json, built by scripts/recap/cards.mjs.
// Nothing here touches Supabase.

import { useState, useEffect, useMemo } from "react";
import DATA from "./recapData.json";
import { BG, BLUE, TEXT, TEXT2, BORDER, avatarColor } from "./theme";
import { V, FM, FD as VFD, FB, edgeGlow, textGlow, VEGAS_CSS } from "./theme.vegas";

const FD_LIGHT = "'Geologica', sans-serif";
const CARDS = 10;
const VEGAS_FROM = 6;              // 0-based: card 7 is the first Vegas card

/* ------------------------------------------------------------- tokens */

// One token object per look, so a card body never branches on the theme. The
// Vegas steps are deliberately a notch larger than the light ones.
function tokens(vegas) {
  return vegas
    ? { bg: V.bg, panel: V.bg2, panel2: V.bg3, text: V.text, dim: V.text2,
        faint: V.text3, line: V.border, good: V.blue, great: V.green,
        bad: V.pink, fd: VFD, fb: FB, glow: true,
        head: 29, line1: 20, small: 16, stat: 30, micro: 14 }
    : { bg: BG, panel: "#fff", panel2: "#f0f0f3", text: TEXT, dim: TEXT2,
        faint: "#8a8a9e", line: BORDER, good: BLUE, great: "#1aa855",
        bad: "#d4507a", fd: FD_LIGHT, fb: "'DM Sans', sans-serif", glow: false,
        head: 26, line1: 18, small: 15, stat: 27, micro: 13 };
}

const COMP_LABEL = {
  top_pick_pts: "the top pool", midfield_pts: "the midfield", order_bonus: "order",
  best_finish_bonus: "best finish", pit_individual_pts: "the needle",
  weekly_bonus_pts: "weekly bonus",
};

/* -------------------------------------------------------------- pieces */

function Avatar({ name, photo, size = 96, ring, T }) {
  const initials = (name || "").split(/\s+/).map(w => w[0]).slice(0, 2).join("");
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: photo ? `center/cover url(${photo})` : avatarColor(name),
      display: "grid", placeItems: "center", overflow: "hidden",
      color: "#fff", fontFamily: T.fd, fontSize: Math.max(13, size * 0.34),
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
      fontSize: Math.max(13, size * 0.3), color: T.dim }}>{(name || "?")[0]}</div>
  );
  return <img src={src} alt="" style={{ width: size, height: size, objectFit: "contain" }} />;
}

// Every card is this shell, so centring is defined once.
function Card({ children, T, wide }) {
  return (
    <div style={{
      minHeight: "100dvh", width: "100%",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      textAlign: "center", gap: 20,
      padding: "84px 20px 112px",
      maxWidth: wide ? 720 : 540, margin: "0 auto",
      color: T.text, fontFamily: T.fb,
    }}>{children}</div>
  );
}

// The takeaway. First element on every card, no exceptions.
const Head = ({ children, T, color }) => (
  <div style={{
    fontFamily: T.fb, fontWeight: 600, fontSize: T.head, lineHeight: 1.28,
    letterSpacing: "-0.01em", maxWidth: 480,
    color: color || T.text,
    ...(T.glow && color ? textGlow(color, 0.55) : {}),
  }}>{children}</div>
);

const Stat = ({ children, T, size, color }) => (
  <div style={{ fontFamily: T.fd, fontWeight: T.glow ? 400 : 600,
    fontSize: size || (T.glow ? 66 : 60), lineHeight: 0.98, letterSpacing: "0.01em",
    color: color || T.good, ...(T.glow && color ? textGlow(color, 0.85) : {}) }}>{children}</div>
);

const Line = ({ children, T, dim, size }) => (
  <div style={{ fontFamily: T.fb, fontSize: size || T.line1, lineHeight: 1.45,
    fontWeight: 400, color: dim ? T.dim : T.text, maxWidth: 460 }}>{children}</div>
);

const Kicker = ({ children, T }) => (
  <div style={{ fontFamily: T.fb, fontSize: T.micro, fontWeight: 700,
    letterSpacing: "0.12em", textTransform: "uppercase", color: T.faint }}>{children}</div>
);

/* -------------------------------------------------- card 2: the flythrough */

// Starts at the top of the table and travels down to the viewer, passing every
// player between. The distance is the point, so the duration scales with rank.
function Ladder({ me, T, live }) {
  const rows = DATA.league.ladder;
  const H = 56, VIEW = 300;
  const idx = rows.findIndex(r => r.name === me.name);
  const target = Math.max(0, Math.min(idx * H - VIEW / 2 + H / 2, rows.length * H - VIEW));
  const [y, setY] = useState(0);

  useEffect(() => {
    if (!live) { setY(0); return; }
    const t = setTimeout(() => setY(target), 550);
    return () => clearTimeout(t);
  }, [live, target]);

  const dur = Math.min(1.1 + idx * 0.11, 4.2);

  return (
    <div style={{ height: VIEW, width: "100%", maxWidth: 420, overflow: "hidden",
      position: "relative", borderRadius: 16, background: T.panel,
      border: `1px solid ${T.line}` }}>
      <div style={{ transform: `translateY(${-y}px)`,
        transition: `transform ${dur}s cubic-bezier(0.4, 0.02, 0.2, 1)` }}>
        {rows.map(r => {
          const you = r.name === me.name;
          return (
            <div key={r.name} style={{
              height: H, display: "flex", alignItems: "center", gap: 11, padding: "0 13px",
              opacity: you ? 1 : 0.4,
              background: you ? (T.glow ? "rgba(0,217,255,0.10)" : "rgba(108,184,224,0.16)") : "transparent",
            }}>
              <div style={{ fontFamily: T.fd, fontSize: 19, width: 28, textAlign: "right",
                color: you ? T.good : T.faint }}>{r.rank}</div>
              <Avatar name={r.name} photo={r.photo} size={34} T={T} ring={you ? T.good : null} />
              <div style={{ fontFamily: T.fb, fontSize: T.micro + 2, fontWeight: you ? 700 : 400,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1,
                textAlign: "left" }}>{r.name}</div>
              <div style={{ fontFamily: T.fd, fontSize: 20,
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

/* ------------------------------------------- cards 5 and 6: the team board */

// One absolutely-positioned layer for all 24 teams. Changing `mode` changes each
// team's coordinates, and the transition does the travelling. Teams that swap
// divisions cross the gap on screen rather than cutting.
function Board({ mode, meTeam, T }) {
  const { newDiv } = DATA.league;
  const H = 32, COL = 158, GAP = 24;

  const layout = useMemo(() => {
    const pos = {};
    const place = (rows, x) => rows.forEach((t, i) => (pos[t.name] = { x, y: i * H }));
    if (mode === "before") {
      const old = { champ: [], second: [] };
      [...newDiv.champ, ...newDiv.second].forEach(t => old[t.oldDiv].push(t));
      old.champ.sort((a, b) => a.oldPos - b.oldPos);
      old.second.sort((a, b) => a.oldPos - b.oldPos);
      place(old.champ, 0); place(old.second, COL + GAP);
    } else if (mode === "swapped") {
      place(newDiv.champ, 0); place(newDiv.second, COL + GAP);
    } else {
      place([...newDiv.champ].sort((a, b) => b.avg - a.avg), 0);
      place([...newDiv.second].sort((a, b) => b.avg - a.avg), COL + GAP);
    }
    return pos;
  }, [mode, newDiv]);

  const all = [...newDiv.champ, ...newDiv.second];
  const sorry = new Set(DATA.league.sorry.map(s => s.name));

  return (
    <div style={{ position: "relative", width: COL * 2 + GAP, height: 12 * H + 26,
      margin: "0 auto", maxWidth: "100%" }}>
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
        const moving = t.moved !== "stay";
        const flag = mode === "byAvg" && sorry.has(t.name);
        const tint = flag ? T.bad : moving && mode !== "before" ? T.good : null;
        return (
          <div key={t.name} style={{
            position: "absolute", left: 0, top: 24, width: COL, height: H - 4,
            transform: `translate(${p.x}px, ${p.y}px)`,
            transition: "transform 1.05s cubic-bezier(0.5, 0, 0.2, 1)",
            display: "flex", alignItems: "center", gap: 6, padding: "0 7px",
            borderRadius: 7, boxSizing: "border-box",
            background: mine ? (T.glow ? "rgba(0,217,255,0.14)" : "rgba(108,184,224,0.2)") : T.panel,
            border: `1px solid ${mine ? T.good : tint || T.line}`,
            ...(tint && T.glow ? { boxShadow: `0 0 9px ${tint}44` } : {}),
          }}>
            <Logo src={t.logo} name={t.name} size={18} T={T} />
            <div style={{ fontFamily: T.fb, fontSize: 13, fontWeight: mine ? 700 : 400,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1,
              textAlign: "left", color: tint || T.text }}>{t.name}</div>
            {mode === "byAvg" && (
              <div style={{ fontFamily: T.fd, fontSize: 15, color: tint || T.dim }}>{t.avg.toFixed(1)}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------- card 7: the breakdown */

function Breakdown({ deck, T }) {
  const max = Math.max(...deck.comps.map(c => Math.max(c.you, c.league)));
  return (
    <div style={{ width: "100%", maxWidth: 440, display: "grid", gap: 15 }}>
      {deck.comps.map(c => {
        const hot = c.key === deck.strong, cold = c.key === deck.weak;
        const col = hot ? T.great : cold ? T.bad : T.good;
        return (
          <div key={c.key} style={{ display: "grid", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontFamily: T.fb, fontSize: T.micro + 1, fontWeight: 700,
                letterSpacing: "0.07em", textTransform: "uppercase", color: T.text }}>{c.label}</span>
              <span style={{ fontFamily: T.fd, fontSize: 24, color: col,
                ...(T.glow ? textGlow(col, 0.4) : {}) }}>
                {c.you.toFixed(1)}
                <span style={{ fontFamily: T.fb, fontSize: T.micro, fontWeight: 500,
                  color: T.dim, marginLeft: 9 }}>#{c.rank}</span>
              </span>
            </div>
            <div style={{ position: "relative", height: 10, borderRadius: 5,
              background: T.panel2, overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, width: `${(c.you / max) * 100}%`,
                background: col, borderRadius: 5,
                ...(T.glow ? { boxShadow: `0 0 9px ${col}88` } : {}) }} />
              {/* League average as a notch, so the bar is a comparison not a value. */}
              <div style={{ position: "absolute", top: -3, bottom: -3,
                left: `${(c.league / max) * 100}%`, width: 2, background: T.text, opacity: 0.6 }} />
            </div>
            <div style={{ fontFamily: T.fb, fontSize: T.micro, color: T.dim, textAlign: "left" }}>
              league {c.league.toFixed(1)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------- deck */

// initialCard and initialReveal exist for scripts/smoke-recap.jsx, which has to
// reach every card and both halves of card 4 without being able to click.
export default function Recap({ playerName, onExit, initialCard = 0, initialReveal = false }) {
  const [i, setI] = useState(initialCard);
  const [revealed, setRevealed] = useState(initialReveal);
  const [boardMode, setBoardMode] = useState("before");
  const deck = DATA.players[playerName];
  const vegas = i >= VEGAS_FROM;
  const T = tokens(vegas);

  // The board travels the moment its card lands, so the swap is seen not found.
  useEffect(() => {
    if (i === 4) { setBoardMode("before"); const t = setTimeout(() => setBoardMode("swapped"), 700); return () => clearTimeout(t); }
    if (i === 5) { setBoardMode("swapped"); const t = setTimeout(() => setBoardMode("byAvg"), 700); return () => clearTimeout(t); }
  }, [i]);

  useEffect(() => { window.scrollTo(0, 0); }, [i]);

  if (!deck) return (
    <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 30,
      background: BG, color: TEXT, fontFamily: "'DM Sans', sans-serif", textAlign: "center" }}>
      <div style={{ display: "grid", gap: 14 }}>
        <div style={{ fontFamily: FD_LIGHT, fontSize: 26 }}>No recap for {playerName || "you"}</div>
        <div style={{ color: TEXT2, fontSize: 15 }}>This deck covers the 48 players with a first-half team.</div>
        {onExit && <button onClick={onExit} style={btn(tokens(false))}>Back to the app</button>}
      </div>
    </div>
  );

  const t = deck.team;
  const first = deck.name.split(/\s+/)[0];
  const mate1 = t.mate.split(/\s+/)[0];
  const strongLabel = COMP_LABEL[deck.strong], weakLabel = COMP_LABEL[deck.weak];
  const strongRank = deck.comps.find(c => c.key === deck.strong).rank;
  const okAt = strongRank > 24;      // nothing to brag about, so do not brag
  const { boundary, sorry, fairCount } = DATA.league;
  const lead = deck.contenders[0];

  const cards = [
    // 1 ───────────────────────────────────────────────────────────── title
    () => (
      <Card T={T}>
        <Kicker T={T}>Formula 5 · First half</Kicker>
        <Avatar name={deck.name} photo={deck.photo} size={124} T={T} ring={T.good} />
        <Head T={T}>Let's take a look at your first half, {first}.</Head>
      </Card>
    ),
    // 2 ─────────────────────────────────────────────────── you, and the field
    () => (
      <Card T={T}>
        <Head T={T}>
          You scored {deck.ppr} points a race, which puts you {ordinal(deck.rank)} out of 48.
        </Head>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18 }}>
          <Avatar name={deck.name} photo={deck.photo} size={64} T={T} ring={T.good} />
          <Stat T={T}>{deck.ppr}</Stat>
        </div>
        <Ladder me={deck} T={T} live={i === 1} />
        <Line T={T} dim size={T.small}>League average is {DATA.league.ppr}.</Line>
      </Card>
    ),
    // 3 ──────────────────────────────────────────────────────────── the team
    () => (
      <Card T={T}>
        <Head T={T}>
          As for the team competition, you and {mate1} race as {t.name}.
        </Head>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
          <Avatar name={deck.name} photo={deck.photo} size={72} T={T} ring={T.good} />
          <Avatar name={t.mate} photo={t.matePhoto} size={72} T={T} />
        </div>
        <Logo src={t.logo} name={t.name} size={76} T={T} />
        <Line T={T}>
          You went into round 11 {t.posBefore === 1 ? "top of" : `${ordinal(t.posBefore)} in`}{" "}
          the {t.div === "champ" ? "Championship" : "Second"} Division.
        </Line>
      </Card>
    ),
    // 4 ──────────────────────────────────── round 11, in two beats with a click
    () => (
      <Card T={T}>
        <Kicker T={T}>Round 11</Kicker>
        <Head T={T}>You were playing for {deck.stake.was}.</Head>
        {revealed && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Logo src={t.logo} name={t.name} size={44} T={T} />
              <div style={{ fontFamily: T.fd, fontSize: 34,
                color: t.won ? T.great : T.bad }}>{t.score}–{t.oppScore}</div>
              <Logo src={t.oppLogo} name={t.opp} size={44} T={T} />
            </div>
            <Line T={T} dim size={T.small}>against {t.opp}</Line>
            <Head T={T} color={deck.stake.tone === "good" ? T.great : deck.stake.tone === "bad" ? T.bad : null}>
              {deck.stake.got}
            </Head>
            {t.moved !== "stay" && (
              <Line T={T}>
                {t.moved === "up"
                  ? "You're up to the Championship Division for the second half."
                  : "You drop to the Second Division for the second half."}
              </Line>
            )}
          </>
        )}
      </Card>
    ),
    // 5 ────────────────────────────────────────────────────────────── the swap
    () => (
      <Card T={T} wide>
        <Head T={T}>Five teams go up, and five come down.</Head>
        <Board mode={boardMode} meTeam={t.name} T={T} />
        <Line T={T} dim size={T.small}>
          The bottom five of the Championship Division change places with the top five of the Second.
        </Line>
      </Card>
    ),
    // 6 ────────────────────────────────────────────────────── the fairness check
    () => (
      <Card T={T} wide>
        <Head T={T}>
          {fairCount} of the 12 best scoring averages are in the Championship Division.
        </Head>
        <Board mode={boardMode} meTeam={t.name} T={T} />
        <Line T={T} size={T.small}>
          {sorry.map(s => s.name).join(" and ")} outscored the bottom of the top flight and went
          down anyway, {boundary.firstSecond.avg.toFixed(1)} against {boundary.lastChamp.avg.toFixed(1)}.
          That's how it goes sometimes.
        </Line>
      </Card>
    ),
    // 7 ──────────────────────────────────────── VEGAS. the second half, and you
    () => (
      <Card T={T}>
        <div style={{ fontFamily: FM, fontSize: 32, lineHeight: 1.3, ...textGlow(V.pink, 0.9) }}>
          Second half
        </div>
        <Head T={T}>Team scores reset, but your points carry.</Head>
        <Line T={T} dim size={T.small}>Here's where yours came from.</Line>
        <Breakdown deck={deck} T={T} />
        <Head T={T} color={okAt ? T.good : T.great}>
          {okAt
            ? <>You're okay at {strongLabel}, and {weakLabel} is where the room is.</>
            : <>You're killing it on {strongLabel}, but {weakLabel} is costing you.</>}
        </Head>
        <Line T={T} dim size={T.small}>Something to think about in the second half.</Line>
      </Card>
    ),
    // 8 ────────────────────────────────────────────────────── the two of you
    () => (
      <Card T={T}>
        <Head T={T}>You and {mate1} have a choice to make.</Head>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
          <Avatar name={deck.name} photo={deck.photo} size={78} T={T} ring={V.blue} />
          <Avatar name={t.mate} photo={t.matePhoto} size={78} T={T} ring={V.pink} />
        </div>
        <Line T={T}>Individual glory, or a team championship?</Line>
        <Line T={T} dim>Or find the gap and go for both.</Line>
      </Card>
    ),
    // 9 ──────────────────────────────────────────────────── the title race
    () => (
      <Card T={T}>
        <Head T={T}>
          {lead.name === deck.name
            ? <>Right now, you're in the driver's seat.</>
            : <>Right now, {lead.name} is in the driver's seat.</>}
        </Head>
        <div style={{ width: "100%", maxWidth: 420, display: "grid", gap: 9 }}>
          {deck.contenders.map(c => {
            const you = c.name === deck.name;
            return (
              <div key={c.name} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 13px",
                borderRadius: 12, background: T.panel,
                ...(you ? edgeGlow(V.blue, 0.7) : { border: `1px solid ${T.line}` }),
              }}>
                <div style={{ fontFamily: T.fd, fontSize: 21, width: 28,
                  color: you ? V.blue : T.faint }}>{c.rank}</div>
                <Avatar name={c.name} photo={c.photo} size={38} T={T} ring={you ? V.blue : null} />
                <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: T.fb, fontSize: T.micro + 2, fontWeight: you ? 700 : 500,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                  <div style={{ fontFamily: T.fb, fontSize: T.micro, color: T.dim }}>{c.role}</div>
                </div>
                <div style={{ fontFamily: T.fd, fontSize: 23,
                  color: you ? V.blue : T.dim }}>{c.ppr.toFixed(1)}</div>
              </div>
            );
          })}
        </div>
        {lead.name !== deck.name && <Line T={T} dim size={T.small}>Or it's you.</Line>}
      </Card>
    ),
    // 10 ────────────────────────────────────────────────────────── send-off
    () => (
      <Card T={T}>
        <Avatar name={deck.name} photo={deck.photo} size={104} T={T} ring={V.blue} />
        <div style={{ fontFamily: FM, fontSize: 42, lineHeight: 1.3, ...textGlow(V.blue, 1) }}>
          Good luck
        </div>
        <Line T={T} dim>See you in round 12, {first}.</Line>
        {onExit && <button onClick={onExit} style={btn(T)}>Back to the app</button>}
      </Card>
    ),
  ];

  // Card 4 holds its outcome back behind one click, so the stake lands first.
  const onCard4 = i === 3;
  const nextLabel = onCard4 && !revealed ? "What happened?"
    : { 3: "See who got promoted", 4: "See scoring averages", 5: "See the second half" }[i]
    || "Next";
  const advance = () => {
    if (onCard4 && !revealed) return setRevealed(true);
    setI(i + 1);
  };
  const back = () => {
    if (onCard4 && revealed) return setRevealed(false);
    setI(i - 1);
  };

  return (
    <div style={{ background: T.bg, minHeight: "100dvh", position: "relative",
      transition: "background 0.8s ease" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Monoton&family=Bebas+Neue&family=Geologica:wght@300;400;500;600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${T.bg}; transition: background 0.8s ease; }
        ${VEGAS_CSS}
      `}</style>

      {/* Progress pips. The next button is the tap target, so these are read-only. */}
      <div style={{ position: "fixed", top: 18, left: 0, right: 0, zIndex: 5,
        display: "flex", gap: 5, justifyContent: "center", padding: "0 20px" }}>
        {Array.from({ length: CARDS }, (_, n) => (
          <div key={n} style={{ height: 3, flex: 1, maxWidth: 34, borderRadius: 2,
            background: n <= i ? T.good : T.line, transition: "background 0.3s ease" }} />
        ))}
      </div>

      {cards[i]()}

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 5,
        padding: "14px 20px 22px", display: "flex", gap: 10,
        justifyContent: "center", alignItems: "center",
        background: `linear-gradient(transparent, ${T.bg} 42%)` }}>
        {(i > 0 || revealed) && (
          <button onClick={back} aria-label="Back"
            style={{ ...btn(T), padding: "13px 17px", background: "transparent",
              color: T.dim, border: `1px solid ${T.line}`, boxShadow: "none" }}>←</button>
        )}
        {(i < CARDS - 1 || (onCard4 && !revealed)) && (
          <button onClick={advance} style={btn(T)}>{nextLabel}</button>
        )}
      </div>
    </div>
  );
}

function btn(T) {
  return {
    fontFamily: T.fb, fontSize: 16, fontWeight: 700, letterSpacing: "0.03em",
    padding: "14px 28px", borderRadius: 999, cursor: "pointer",
    border: `1px solid ${T.good}`, background: T.glow ? "transparent" : T.good,
    color: T.glow ? T.good : "#fff",
    ...(T.glow ? edgeGlow(V.blue, 0.7) : {}),
  };
}

const ordinal = n => n + (["th", "st", "nd", "rd"][(n % 100 - 20) % 10] || ["th", "st", "nd", "rd"][n % 100] || "th");
