import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ── Colors ──────────────────────────────────────────────
const BG2      = "#ededef";
const DARK     = "#1e1e2a";
const BLUE     = "#6cb8e0";
const BLUEDARK = "#2a6fa8";
const GREEN    = "#22cc66";
const RED      = "#e04a4a";
const ORANGE   = "#e08a2e";
const TEXT     = "#1e1e2a";
const TEXT2    = "#6b6b80";
const BORDER   = "#d8d2c4";
const FD       = "'Geologica', sans-serif";
const FB       = "'DM Sans', sans-serif";

// ── Shared UI ───────────────────────────────────────────
function Pts({ children, negative, team }) {
  const c = negative ? RED : team ? GREEN : ORANGE;
  return <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 12, color: c, background: `${c}12`, padding: "2px 7px", borderRadius: 6, whiteSpace: "nowrap" }}>{children}</span>;
}

function RuleCard({ children }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "12px 14px", marginBottom: 20, lineHeight: 1.55 }}>
      <div style={{ fontFamily: FD, fontWeight: 800, fontSize: 10, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 12 }}>📋</span> Scoring
      </div>
      <div style={{ fontFamily: FB, fontSize: 12.5, color: TEXT2 }}>{children}</div>
    </div>
  );
}

function StepBar({ current, total }) {
  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= current ? BLUE : BORDER, transition: "background 0.3s" }} />
      ))}
    </div>
  );
}

function StepHeading({ title, subtitle }) {
  return (
    <>
      <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 18, color: DARK, textTransform: "uppercase", letterSpacing: "0.03em", margin: 0 }}>{title}</p>
      <p style={{ fontFamily: FB, fontSize: 13, color: TEXT2, marginBottom: 14, marginTop: 4 }}>{subtitle}</p>
    </>
  );
}

// ── Step 1: Top Pick (3 of 5) ───────────────────────────
function StepTopPick({ drivers, selected, onSelect }) {
  const shown = drivers.slice(0, 3);
  return (
    <div>
      {/* Intro explainer */}
      <div style={{ background: `${BLUE}08`, border: `1px solid ${BLUE}25`, borderRadius: 14, padding: "14px 16px", marginBottom: 20, lineHeight: 1.6 }}>
        <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 11, color: BLUEDARK, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px" }}>👋 Welcome to Formula 5</p>
        <p style={{ fontFamily: FB, fontSize: 12.5, color: TEXT, margin: "0 0 8px" }}>
          Your goal is to earn as many points as possible — just like in F1. Points count toward both the <strong>Players Championship</strong> (individual) and the <strong>Team Championship</strong>.
        </p>
        <p style={{ fontFamily: FB, fontSize: 12.5, color: TEXT, margin: "0 0 8px" }}>
          How? By guessing questions right. The more you get right, the more points you earn. And you can earn points every single race.
        </p>
        <p style={{ fontFamily: FB, fontSize: 12.5, color: TEXT, margin: "0 0 8px" }}>
          <strong>Win the individual game:</strong> guess right, stack points, and whoever has the most at the end of the season is the Players Champion!
        </p>
        <p style={{ fontFamily: FB, fontSize: 12.5, color: TEXT, margin: 0 }}>
          <strong>Win the team game:</strong> guess right, win your weekly matchup, and rise to the top of the standings so your team can play for the championship!
        </p>
      </div>

      <p style={{ fontFamily: FB, fontSize: 12, color: TEXT2, fontStyle: "italic", marginBottom: 16 }}>Alright, let's get to the picks. There are a few easy ones first, and then one tricky one at the end.</p>

      <StepHeading title="Top Pick" subtitle={<>Choose <strong>1 driver</strong> from the top of the championship</>} />
      <RuleCard>
        <p style={{ margin: "0 0 8px" }}>Pick the driver you think will finish highest in this race. You'll earn whatever F1 points they score — just like the real championship.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
          <span>P1 = </span><Pts>+25</Pts><span>P2 = </span><Pts>+18</Pts><span>P3 = </span><Pts>+15</Pts><span>P4 = </span><Pts>+12</Pts><span>P5 = </span><Pts>+10</Pts>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center", marginTop: 4 }}>
          <span>P6 = </span><Pts>+8</Pts><span>P7 = </span><Pts>+6</Pts><span>P8 = </span><Pts>+4</Pts><span>P9 = </span><Pts>+2</Pts><span>P10 = </span><Pts>+1</Pts>
        </div>
        <p style={{ margin: "6px 0 0" }}>P11+ = <Pts>0</Pts>&ensp;DNF = <Pts negative>−1</Pts></p>
        <p style={{ margin: "8px 0 0", fontSize: 11.5, color: TEXT2 }}>These points count for both your individual score AND your team score.</p>
      </RuleCard>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {shown.map(d => {
          const a = selected === d;
          return (
            <button key={d} onClick={() => onSelect(d)} style={{
              width: "100%", padding: "14px 16px", borderRadius: 12,
              border: `2px solid ${a ? BLUE : BORDER}`,
              background: a ? "rgba(108,184,224,0.1)" : "#fff",
              fontFamily: FB, fontWeight: 500, fontSize: 15,
              color: a ? BLUEDARK : TEXT, cursor: "pointer",
              textAlign: "left", transition: "all 0.15s",
              display: "flex", alignItems: "center", justifyContent: "space-between"
            }}>
              {d}
              {a && <span style={{ color: BLUE, fontSize: 18 }}>✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Step 2: Midfield Picks (7 of 10) ────────────────────
function StepMidPicks({ drivers, selected, onToggle }) {
  const shown = drivers.slice(0, 7);
  const count = selected.length;
  return (
    <div>
      <StepHeading title="Midfield Picks" subtitle={<>Choose <strong>4 drivers</strong> from P6–P15 — <span style={{ color: count === 4 ? GREEN : BLUE, fontWeight: 600 }}>{count}/4</span></>} />
      <RuleCard>
        <p style={{ margin: "0 0 6px" }}>Now pick 4 more drivers from the midfield. Same scoring as your Top Pick — you earn whatever F1 points each driver scores.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
          <span>P1 = </span><Pts>+25</Pts><span> … </span><span>P10 = </span><Pts>+1</Pts><span> P11+ = </span><Pts>0</Pts><span> DNF = </span><Pts negative>−1</Pts>
        </div>
        <p style={{ margin: "8px 0 0", fontSize: 11.5, color: TEXT2 }}>These guys might be lower in the standings, but they can finish anywhere on race day. A smart midfield pick who lands on the podium is a huge point swing.</p>
      </RuleCard>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {shown.map(d => {
          const a = selected.includes(d);
          const dis = !a && count >= 4;
          return (
            <button key={d} onClick={() => !dis && onToggle(d)} style={{
              width: "100%", padding: "14px 16px", borderRadius: 12,
              border: `2px solid ${a ? BLUE : BORDER}`,
              background: a ? "rgba(108,184,224,0.1)" : dis ? "#f0ede5" : "#fff",
              fontFamily: FB, fontWeight: 500, fontSize: 15,
              color: a ? BLUEDARK : dis ? TEXT2 : TEXT,
              cursor: dis ? "default" : "pointer",
              textAlign: "left", transition: "all 0.15s",
              opacity: dis ? 0.5 : 1,
              display: "flex", alignItems: "center", justifyContent: "space-between"
            }}>
              {d}
              {a && <span style={{ color: BLUE, fontSize: 18 }}>✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Step 3: Finishing Order ─────────────────────────────
function StepFinishingOrder({ order, onReorder }) {
  const [dragging, setDragging] = useState(null);
  const ds = (i) => setDragging(i);
  const dov = (e, i) => { e.preventDefault(); if (dragging === null || dragging === i) return; const n = [...order]; const it = n.splice(dragging, 1)[0]; n.splice(i, 0, it); onReorder(n); setDragging(i); };
  const de = () => setDragging(null);
  const mv = (i, dir) => { const n = [...order]; const t = i + dir; if (t < 0 || t >= n.length) return; [n[i], n[t]] = [n[t], n[i]]; onReorder(n); };
  return (
    <div>
      <StepHeading title="Finishing Order" subtitle="Arrange your 5 drivers in predicted finishing order" />
      <RuleCard>
        <p style={{ margin: 0 }}>Now arrange all 5 of your drivers in the order you think they'll finish. This doesn't change the points they earn — you keep those no matter what. But if you nail the exact order of all 5? That's a <Pts>+6</Pts> bonus.</p>
        <p style={{ margin: "6px 0 0", fontSize: 11.5, color: TEXT2 }}>DNFs at the back of your order are interchangeable, so don't stress about that.</p>
      </RuleCard>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {order.map((d, idx) => (
          <div key={d}>
            <div draggable onDragStart={() => ds(idx)} onDragOver={(e) => dov(e, idx)} onDragEnd={de}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 12, border: `2px solid ${dragging === idx ? BLUE : BORDER}`, background: dragging === idx ? "rgba(108,184,224,0.08)" : "#fff", cursor: "grab", transition: "all 0.15s", userSelect: "none" }}>
              <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 16, color: BLUE, minWidth: 24, textAlign: "center" }}>{idx + 1}</span>
              <span style={{ flex: 1, fontFamily: FB, fontWeight: 500, fontSize: 15, color: TEXT }}>{d}</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <button onClick={() => mv(idx, -1)} disabled={idx === 0} style={{ background: "none", border: "none", cursor: idx === 0 ? "default" : "pointer", color: idx === 0 ? BORDER : TEXT2, fontSize: 14, padding: "2px 6px", lineHeight: 1 }}>▲</button>
                <button onClick={() => mv(idx, 1)} disabled={idx === order.length - 1} style={{ background: "none", border: "none", cursor: idx === order.length - 1 ? "default" : "pointer", color: idx === order.length - 1 ? BORDER : TEXT2, fontSize: 14, padding: "2px 6px", lineHeight: 1 }}>▼</button>
              </div>
            </div>
            {idx < order.length - 1 && <div style={{ textAlign: "center", padding: "6px 0", fontFamily: FB, fontSize: 11, color: TEXT2, fontStyle: "italic" }}>will finish ahead of</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Step 4: Best Finish (P1–P10) ────────────────────────
function StepBestFinish({ selected, onSelect }) {
  const positions = Array.from({ length: 10 }, (_, i) => `P${i + 1}`);
  return (
    <div>
      <StepHeading title="Best Finish" subtitle={<>Predict where your <strong>best-finishing driver</strong> will place</>} />
      <RuleCard><p style={{ margin: 0 }}>Out of all 5 of your drivers, one of them is going to finish highest. What position will that be? Guess exactly right and you earn a <Pts>+3</Pts> bonus. Simple as that.</p></RuleCard>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {positions.map(p => {
          const a = selected === p;
          return (
            <button key={p} onClick={() => onSelect(p)} style={{
              width: 56, height: 44, borderRadius: 10,
              border: `2px solid ${a ? BLUE : BORDER}`,
              background: a ? BLUE : "#fff",
              fontFamily: FD, fontWeight: 700, fontSize: 14,
              color: a ? "#fff" : TEXT, cursor: "pointer", transition: "all 0.15s"
            }}>{p}</button>
          );
        })}
      </div>
    </div>
  );
}

// ── Step 5: Pit Stop Speedometer ────────────────────────
function StepPitStop({ question, value, onChange, teamSide }) {
  const min = 1.5, max = 4.0, stepVal = 0.1;
  const svgRef = useRef(null);
  const draggingRef = useRef(false);
  const isUnder = teamSide === "UNDER";

  const CX = 180, CY = 175, R = 130;
  const TOTAL_RANGE = max - min;
  const SEG_ANGLE = Math.PI / (TOTAL_RANGE / 0.1);
  const GAP = 0.018;
  const RINNER = R - 30;
  const ROUTER = R;
  const ORANGE_INNER = R - 5;
  const ORANGE_OUTER = R + 3;

  const valToAngle = (v) => Math.PI - ((v - min) / TOTAL_RANGE) * Math.PI;
  const angleToVal = (angle) => {
    const pct = (Math.PI - angle) / Math.PI;
    return Math.round(Math.max(min, Math.min(max, min + pct * TOTAL_RANGE)) * 10) / 10;
  };
  const polar = (cx, cy, r, angle) => ({ x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) });

  const wedgePath = (cx, cy, ri, ro, a1, a2) => {
    if (a1 - a2 < 0.005) return "";
    const o1 = polar(cx, cy, ro, a1), o2 = polar(cx, cy, ro, a2);
    const i1 = polar(cx, cy, ri, a1), i2 = polar(cx, cy, ri, a2);
    const lg = (a1 - a2) > Math.PI ? 1 : 0;
    return `M ${o1.x} ${o1.y} A ${ro} ${ro} 0 ${lg} 1 ${o2.x} ${o2.y} L ${i2.x} ${i2.y} A ${ri} ${ri} 0 ${lg} 0 ${i1.x} ${i1.y} Z`;
  };

  const needleAngle = valToAngle(value);
  const goodColor = "#c8f5da", badColor = "#f5c8c8";
  const goodDark = GREEN, badDark = RED;
  const leftColor = isUnder ? goodColor : badColor;
  const rightColor = isUnder ? badColor : goodColor;

  // Left background segments (π down to needle)
  const leftBgSegs = [];
  if (Math.PI > needleAngle + 0.02) {
    const span = Math.PI - needleAngle;
    const n = Math.max(1, Math.round(span / SEG_ANGLE));
    for (let i = 0; i < n; i++) {
      const a1 = Math.PI - i * (span / n);
      const a2 = Math.PI - (i + 1) * (span / n);
      if (a1 - a2 > GAP) leftBgSegs.push({ a1: a1 - GAP / 2, a2: a2 + GAP / 2, color: leftColor });
    }
  }

  // Right background segments (needle down to 0)
  const rightBgSegs = [];
  if (needleAngle > 0.02) {
    const span = needleAngle;
    const n = Math.max(1, Math.round(span / SEG_ANGLE));
    for (let i = 0; i < n; i++) {
      const a1 = needleAngle - i * (span / n);
      const a2 = needleAngle - (i + 1) * (span / n);
      if (a1 - a2 > GAP) rightBgSegs.push({ a1: a1 - GAP / 2, a2: Math.max(0, a2 + GAP / 2), color: rightColor });
    }
  }

  // Thin orange scoring band at outer rim
  const orangeSegs = [];
  orangeSegs.push({ a1: Math.min(Math.PI, needleAngle + SEG_ANGLE / 2), a2: Math.max(0, needleAngle - SEG_ANGLE / 2), color: "#e08a2e" });
  for (let i = 1; i <= 4; i++) {
    const c = i <= 1 ? "#e89940" : i <= 2 ? "#eda855" : i <= 3 ? "#f2b86a" : "#f5c880";
    const la1 = Math.min(Math.PI, needleAngle + (i + 0.5) * SEG_ANGLE);
    const la2 = Math.max(0, needleAngle + (i - 0.5) * SEG_ANGLE);
    if (la1 - la2 > GAP) orangeSegs.push({ a1: la1 - GAP / 2, a2: la2 + GAP / 2, color: c });
    const ra1 = Math.min(Math.PI, needleAngle - (i - 0.5) * SEG_ANGLE);
    const ra2 = Math.max(0, needleAngle - (i + 0.5) * SEG_ANGLE);
    if (ra1 - ra2 > GAP) orangeSegs.push({ a1: ra1 - GAP / 2, a2: Math.max(0, ra2 + GAP / 2), color: c });
  }

  // Individual point labels (orange, above arc)
  const indivLabels = [];
  if (needleAngle > 0.08 && needleAngle < Math.PI - 0.08)
    indivLabels.push({ label: "+5", angle: needleAngle, size: 14 });
  for (let i = 1; i <= 4; i++) {
    const aL = needleAngle + i * SEG_ANGLE;
    if (aL > 0.08 && aL < Math.PI - 0.08) indivLabels.push({ label: `+${5 - i}`, angle: aL, size: 11 });
    const aR = needleAngle - i * SEG_ANGLE;
    if (aR > 0.08 && aR < Math.PI - 0.08) indivLabels.push({ label: `+${5 - i}`, angle: aR, size: 11 });
  }

  // Team labels
  const clamp = (a) => Math.min(Math.PI - 0.2, Math.max(0.2, a));
  const goodAngle = isUnder ? clamp(needleAngle + 7 * SEG_ANGLE) : clamp(needleAngle - 7 * SEG_ANGLE);
  const badAngle = isUnder ? clamp(needleAngle - 7 * SEG_ANGLE) : clamp(needleAngle + 7 * SEG_ANGLE);
  const goodPos = polar(CX, CY, R - 48, goodAngle);
  const goodSubPos = polar(CX, CY, R - 72, goodAngle);
  const badPos = polar(CX, CY, R - 48, badAngle);
  const badSubPos = polar(CX, CY, R - 72, badAngle);

  // Needle geometry
  const needleTip = polar(CX, CY, R - 16, needleAngle);
  const needleBase1 = polar(CX, CY, 16, needleAngle + 0.14);
  const needleBase2 = polar(CX, CY, 16, needleAngle - 0.14);

  // Pointer handling
  const handlePointer = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const svgW = 360, svgH = 230;
    const x = (clientX - rect.left) * (svgW / rect.width) - CX;
    const y = -((clientY - rect.top) * (svgH / rect.height) - CY);
    let angle = Math.atan2(y, x);
    angle = Math.max(0, Math.min(Math.PI, angle));
    onChange(angleToVal(angle));
  };
  const onDown = (e) => { e.preventDefault(); draggingRef.current = true; handlePointer(e); };
  const onMove = (e) => { if (!draggingRef.current) return; e.preventDefault(); handlePointer(e); };
  const onUp = () => { draggingRef.current = false; };
  useEffect(() => {
    const h = () => { draggingRef.current = false; };
    window.addEventListener("mouseup", h); window.addEventListener("touchend", h);
    return () => { window.removeEventListener("mouseup", h); window.removeEventListener("touchend", h); };
  }, []);

  const increment = () => { const n = Math.round((value + stepVal) * 10) / 10; if (n <= max) onChange(n); };
  const decrement = () => { const n = Math.round((value - stepVal) * 10) / 10; if (n >= min) onChange(n); };

  const sideLabel = isUnder ? "The Under" : "The Over";
  const sideExplain = isUnder
    ? `To score team points, you need "${question}" to be under the average of your matchup's guesses.`
    : `To score team points, you need "${question}" to be over the average of your matchup's guesses.`;

  let displayValue;
  if (value <= min) displayValue = `${min.toFixed(1)} or below`;
  else if (value >= max) displayValue = `${max.toFixed(1)} or above`;
  else displayValue = value.toFixed(1);

  return (
    <div>
      <StepHeading title="The Needle" subtitle="Guess the pit stop time" />
      {question && (
        <p style={{ fontFamily: FB, fontSize: 12, color: BLUEDARK, fontWeight: 600, marginBottom: 14, background: "rgba(108,184,224,0.1)", padding: "8px 12px", borderRadius: 8, display: "inline-block" }}>{question}</p>
      )}

      <RuleCard>
        <p style={{ margin: "0 0 8px", fontWeight: 500, color: TEXT }}>Okay, here's where it gets interesting.</p>
        <p style={{ margin: "0 0 8px" }}>
          Every race has a pit stop question. You're guessing a time in seconds, and how close you get determines your individual points: <Pts>+5</Pts> for nailing it, down to <Pts>+1</Pts> if you're within 0.4 seconds.
        </p>
        <p style={{ margin: "0 0 8px" }}>
          But here's the twist — this is also where the <strong>team game</strong> lives. Your guess doesn't just score you individual points. It also moves something called the <strong>BOX BOX Line</strong>, which is the average of all 4 guesses in your matchup (you + your teammate + the two people you're playing this week).
        </p>
        <p style={{ margin: "0 0 8px" }}>
          Each week, your team is assigned either <strong>"The Over"</strong> or <strong>"The Under."</strong> If the actual pit stop time lands on your team's side of the line: <Pts team>+5 for your team</Pts>. Wrong side? <Pts negative>−1 for your team</Pts>.
        </p>
        <p style={{ margin: "0 0 8px" }}>
          So do you guess what you actually think the answer is and maximize your own points? Or do you sacrifice accuracy to push the BOX BOX Line in your team's favor? That tension is what makes The Needle fun.
        </p>
        <p style={{ margin: 0, fontSize: 11.5, color: TEXT2 }}>
          {isUnder
            ? "Your team is the Under this week. Guessing HIGH pushes the line up — giving the actual time more room to come in under it."
            : "Your team is the Over this week. Guessing LOW pulls the line down — giving the actual time more room to come in over it."
          }
        </p>
      </RuleCard>

      {/* Team side card */}
      <div style={{ textAlign: "center", marginBottom: 20, padding: "14px 16px", background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}` }}>
        <p style={{ fontFamily: FB, fontSize: 12, color: TEXT2, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>This week, your team is</p>
        <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 28, color: DARK, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.04em" }}>"{sideLabel}"</p>
        <p style={{ fontFamily: FB, fontSize: 12, color: TEXT2, margin: 0, lineHeight: 1.5 }}>{sideExplain}</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <svg ref={svgRef} viewBox="0 0 360 230" width="360" height="230"
          style={{ touchAction: "none", cursor: "pointer", overflow: "visible" }}
          onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp}
          onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}>

          {leftBgSegs.map((s, i) => <path key={`lb${i}`} d={wedgePath(CX, CY, RINNER, ROUTER, s.a1, s.a2)} fill={s.color} />)}
          {rightBgSegs.map((s, i) => <path key={`rb${i}`} d={wedgePath(CX, CY, RINNER, ROUTER, s.a1, s.a2)} fill={s.color} />)}
          {orangeSegs.map((s, i) => <path key={`os${i}`} d={wedgePath(CX, CY, ORANGE_INNER, ORANGE_OUTER, s.a1, s.a2)} fill={s.color} />)}

          {indivLabels.map((pl, i) => {
            const pos = polar(CX, CY, R + 18, pl.angle);
            return <text key={`il${i}`} x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle" style={{ fontFamily: FD, fontSize: pl.size, fill: ORANGE, fontWeight: 800 }}>{pl.label}</text>;
          })}

          <text x={goodPos.x} y={goodPos.y} textAnchor="middle" dominantBaseline="middle" style={{ fontFamily: FD, fontSize: 22, fill: goodDark, fontWeight: 900 }}>+5</text>
          <text x={goodSubPos.x} y={goodSubPos.y} textAnchor="middle" dominantBaseline="middle" style={{ fontFamily: FD, fontSize: 8.5, fill: goodDark, fontWeight: 700, letterSpacing: "0.08em" }}>FOR TEAM</text>
          <text x={badPos.x} y={badPos.y} textAnchor="middle" dominantBaseline="middle" style={{ fontFamily: FD, fontSize: 22, fill: badDark, fontWeight: 900 }}>−1</text>
          <text x={badSubPos.x} y={badSubPos.y} textAnchor="middle" dominantBaseline="middle" style={{ fontFamily: FD, fontSize: 8.5, fill: badDark, fontWeight: 700, letterSpacing: "0.08em" }}>FOR TEAM</text>

          <polygon points={`${needleTip.x},${needleTip.y} ${needleBase1.x},${needleBase1.y} ${needleBase2.x},${needleBase2.y}`} fill="#3a3a4a" />
          <circle cx={CX} cy={CY} r="11" fill="#3a3a4a" />
          <circle cx={CX} cy={CY} r="5" fill="#eee" />
        </svg>

        <div style={{ marginTop: 2, textAlign: "center" }}>
          <div style={{ fontFamily: FD, fontWeight: 900, fontSize: 44, color: DARK, letterSpacing: "-0.02em", lineHeight: 1 }}>{displayValue}</div>
          <div style={{ fontFamily: FB, fontSize: 14, color: TEXT2, fontWeight: 500, marginTop: 2 }}>seconds</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 14 }}>
          <button onClick={decrement} style={{ width: 56, height: 44, borderRadius: 12, border: `2px solid ${BORDER}`, background: "#fff", fontFamily: FD, fontSize: 14, fontWeight: 700, color: TEXT, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>− 0.1</button>
          <button onClick={increment} style={{ width: 56, height: 44, borderRadius: 12, border: `2px solid ${BORDER}`, background: "#fff", fontFamily: FD, fontSize: 14, fontWeight: 700, color: TEXT, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+ 0.1</button>
        </div>
      </div>
    </div>
  );
}

// ── Step 6: Review ──────────────────────────────────────
function StepReview({ topPick, order, bestFinish, pitGuess }) {
  return (
    <div>
      <StepHeading title="Review Picks" subtitle="Double-check everything before locking in" />
      <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, padding: 16, marginBottom: 12 }}>
        <p style={{ fontFamily: FD, fontWeight: 700, fontSize: 11, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px" }}>Top Pick</p>
        <p style={{ fontFamily: FB, fontWeight: 600, fontSize: 16, color: DARK, margin: 0 }}>{topPick}</p>
      </div>
      <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, padding: 16, marginBottom: 12 }}>
        <p style={{ fontFamily: FD, fontWeight: 700, fontSize: 11, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px" }}>Finishing Order</p>
        {order.map((d, i) => (
          <div key={d} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: i < order.length - 1 ? `1px solid ${BG2}` : "none" }}>
            <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 14, color: BLUE, minWidth: 20 }}>{i + 1}</span>
            <span style={{ fontFamily: FB, fontSize: 14, color: TEXT }}>{d}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1, background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, padding: 16 }}>
          <p style={{ fontFamily: FD, fontWeight: 700, fontSize: 11, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 6px" }}>Best Finish</p>
          <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 22, color: DARK, margin: 0 }}>{bestFinish}</p>
        </div>
        <div style={{ flex: 1, background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, padding: 16 }}>
          <p style={{ fontFamily: FD, fontWeight: 700, fontSize: 11, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 6px" }}>Pit Stop</p>
          <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 22, color: DARK, margin: 0 }}>{pitGuess.toFixed(1)}s</p>
        </div>
      </div>
    </div>
  );
}

// ── Main MyPicks Component (Supabase-connected) ─────────
// ── Last Race Results ────────────────────────────────
function LastRaceResults({ currentUser }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: players }, { data: teams }, { data: scores }, { data: races }, { data: schedule }, { data: picks }] = await Promise.all([
        supabase.from("players").select("id, name"),
        supabase.from("teams").select("*"),
        supabase.from("scores").select("*"),
        supabase.from("races").select("id, race_name, round").order("round", { ascending: true }),
        supabase.from("schedule").select("*"),
        supabase.from("picks").select("*")
      ]);

      const playerMap = {};
      (players || []).forEach(p => { playerMap[p.id] = p.name; });
      const me = (players || []).find(p => p.name === currentUser);
      if (!me) { setLoading(false); return; }
      const myTeam = (teams || []).find(t => t.player1_id === me.id || t.player2_id === me.id);

      // Find last scored race
      const scoredRaceIds = [...new Set((scores || []).map(s => s.race_id))];
      const scoredRaces = (races || []).filter(r => scoredRaceIds.includes(r.id)).sort((a, b) => b.round - a.round);
      if (scoredRaces.length === 0) { setLoading(false); return; }
      const lastRace = scoredRaces[0];

      // My individual score
      const myScore = (scores || []).find(s => s.player_id === me.id && s.race_id === lastRace.id);
      const myTotal = myScore ? (myScore.top_pick_pts || 0) + (myScore.midfield_pts || 0) + (myScore.order_bonus || 0) + (myScore.best_finish_bonus || 0) + (myScore.pit_individual_pts || 0) + (myScore.weekly_bonus_pts || 0) : 0;

      // My rank
      const allTotals = (scores || []).filter(s => s.race_id === lastRace.id).map(s => ({
        pid: s.player_id,
        total: (s.top_pick_pts || 0) + (s.midfield_pts || 0) + (s.order_bonus || 0) + (s.best_finish_bonus || 0) + (s.pit_individual_pts || 0) + (s.weekly_bonus_pts || 0)
      })).sort((a, b) => b.total - a.total);
      const myRank = allTotals.findIndex(t => t.pid === me.id) + 1;

      // Team matchup
      let teamResult = null;
      if (myTeam) {
        const matchup = (schedule || []).find(m => m.race_id === lastRace.id && (m.home_team_id === myTeam.id || m.away_team_id === myTeam.id));
        if (matchup) {
          const sk = (pid) => (scores || []).find(s => s.player_id === pid && s.race_id === lastRace.id);
          const s1 = sk(myTeam.player1_id), s2 = sk(myTeam.player2_id);
          const noNeedle = (s) => s ? (s.top_pick_pts || 0) + (s.midfield_pts || 0) + (s.order_bonus || 0) + (s.best_finish_bonus || 0) : 0;
          const myTeamScore = noNeedle(s1) + noNeedle(s2) + (s1?.pit_matchup_pts || 0);
          const oppId = matchup.home_team_id === myTeam.id ? matchup.away_team_id : matchup.home_team_id;
          const opp = (teams || []).find(t => t.id === oppId);
          let oppScore = 0;
          if (opp) {
            const os1 = sk(opp.player1_id), os2 = sk(opp.player2_id);
            oppScore = noNeedle(os1) + noNeedle(os2) + (os1?.pit_matchup_pts || 0);
          }
          teamResult = {
            myScore: myTeamScore, oppScore, oppName: opp?.name || "?",
            won: myTeamScore > oppScore, lost: myTeamScore < oppScore
          };
        }
      }

      setData({ race: lastRace, myTotal, myRank, totalPlayers: allTotals.length, teamResult, myScore });
      setLoading(false);
    }
    load();
  }, [currentUser]);

  if (loading || !data) return null;
  const ps = (n) => n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th";

  return (
    <div style={{ marginBottom: 24 }}>
      <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 12, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>
        Last Race — {data.race.race_name}
      </p>
      <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
        <div style={{ flex: 1, background: "#fff", borderRadius: 12, border: `1px solid ${BORDER}`, padding: "12px 14px" }}>
          <p style={{ fontFamily: FB, fontSize: 9, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>Individual</p>
          <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 22, color: BLUEDARK }}>{data.myTotal}</span>
          <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 12, color: data.myRank <= 3 ? "#c9a820" : TEXT2, marginLeft: 6 }}>
            {data.myRank}{ps(data.myRank)} of {data.totalPlayers}
          </span>
        </div>
        {data.teamResult && (
          <div style={{
            flex: 1, background: "#fff", borderRadius: 12, padding: "12px 14px",
            border: `1px solid ${data.teamResult.won ? `${GREEN}40` : data.teamResult.lost ? `${RED}40` : BORDER}`
          }}>
            <p style={{ fontFamily: FB, fontSize: 9, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>Team Matchup</p>
            <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 18, color: data.teamResult.won ? GREEN : data.teamResult.lost ? RED : TEXT2 }}>
              {data.teamResult.won ? "WIN" : data.teamResult.lost ? "LOSS" : "TIE"}
            </span>
            <p style={{ fontFamily: FB, fontSize: 10, color: TEXT2, margin: "2px 0 0" }}>
              {data.teamResult.myScore} – {data.teamResult.oppScore} vs {data.teamResult.oppName}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Season History (picks + team results) ────────────
function PickHistory({ currentUser }) {
  const [history, setHistory] = useState([]);
  const [seasonStats, setSeasonStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: players }, { data: picks }, { data: scores }, { data: races }, { data: teams }, { data: schedule }] = await Promise.all([
        supabase.from("players").select("id, name"),
        supabase.from("picks").select("*"),
        supabase.from("scores").select("*"),
        supabase.from("races").select("id, race_name, round").order("round", { ascending: true }),
        supabase.from("teams").select("*"),
        supabase.from("schedule").select("*")
      ]);
      const me = (players || []).find(p => p.name === currentUser);
      if (!me) { setLoading(false); return; }

      const myTeam = (teams || []).find(t => t.player1_id === me.id || t.player2_id === me.id);
      const raceMap = {};
      (races || []).forEach(r => { raceMap[r.id] = r; });
      const scoreMap = {};
      (scores || []).forEach(s => { if (s.player_id === me.id) scoreMap[s.race_id] = s; });

      // All player totals per race for ranking
      const raceTotals = {};
      (scores || []).forEach(s => {
        if (!raceTotals[s.race_id]) raceTotals[s.race_id] = [];
        const total = (s.top_pick_pts || 0) + (s.midfield_pts || 0) + (s.order_bonus || 0) + (s.best_finish_bonus || 0) + (s.pit_individual_pts || 0) + (s.weekly_bonus_pts || 0);
        raceTotals[s.race_id].push({ pid: s.player_id, total });
      });
      Object.values(raceTotals).forEach(arr => arr.sort((a, b) => b.total - a.total));

      // Helper: compute team score for a given team + race
      const teamScore = (team, raceId) => {
        if (!team) return 0;
        const sk = (pid) => (scores || []).find(s => s.player_id === pid && s.race_id === raceId);
        const s1 = sk(team.player1_id), s2 = sk(team.player2_id);
        const base = (s) => s ? (s.top_pick_pts || 0) + (s.midfield_pts || 0) + (s.order_bonus || 0) + (s.best_finish_bonus || 0) : 0;
        return base(s1) + base(s2) + (s1?.pit_matchup_pts || 0);
      };

      const myPicks = (picks || []).filter(pk => pk.player_id === me.id);
      let totalSeasonPts = 0, wins = 0, losses = 0, ties = 0, teamWins = 0, teamLosses = 0, teamTies = 0;

      const entries = myPicks.map(pk => {
        const race = raceMap[pk.race_id];
        const score = scoreMap[pk.race_id];
        const driverPts = score?.driver_pts ? (typeof score.driver_pts === "string" ? JSON.parse(score.driver_pts) : score.driver_pts) : {};
        const total = score ? (score.top_pick_pts || 0) + (score.midfield_pts || 0) + (score.order_bonus || 0) + (score.best_finish_bonus || 0) + (score.pit_individual_pts || 0) + (score.weekly_bonus_pts || 0) : null;
        const ranked = raceTotals[pk.race_id] || [];
        const rank = ranked.findIndex(r => r.pid === me.id) + 1;
        if (total !== null) totalSeasonPts += total;
        if (rank === 1) wins++;

        // Team matchup for this race
        let teamResult = null;
        if (myTeam && score) {
          const matchup = (schedule || []).find(m => m.race_id === pk.race_id && (m.home_team_id === myTeam.id || m.away_team_id === myTeam.id));
          if (matchup) {
            const myTS = teamScore(myTeam, pk.race_id);
            const oppId = matchup.home_team_id === myTeam.id ? matchup.away_team_id : matchup.home_team_id;
            const opp = (teams || []).find(t => t.id === oppId);
            const oppTS = opp ? teamScore(opp, pk.race_id) : 0;
            const won = myTS > oppTS, lost = myTS < oppTS;
            teamResult = { myScore: myTS, oppScore: oppTS, oppName: opp?.name || "?", won, lost };
            if (won) teamWins++; else if (lost) teamLosses++; else teamTies++;
          }
        }

        return { pick: pk, race, score, driverPts, total, rank, totalPlayers: ranked.length, teamResult };
      }).filter(e => e.race).sort((a, b) => b.race.round - a.race.round);

      const scoredEntries = entries.filter(e => e.total !== null);

      // Player standings rank: sum all players' total pts, rank them
      const playerTotalPts = {};
      (scores || []).forEach(s => {
        const t = (s.top_pick_pts || 0) + (s.midfield_pts || 0) + (s.order_bonus || 0) + (s.best_finish_bonus || 0) + (s.pit_individual_pts || 0) + (s.weekly_bonus_pts || 0);
        playerTotalPts[s.player_id] = (playerTotalPts[s.player_id] || 0) + t;
      });
      const standingsArr = Object.entries(playerTotalPts).sort((a, b) => b[1] - a[1]);
      const myStandingsRank = standingsArr.findIndex(([pid]) => pid === me.id) + 1;
      const totalPlayersInStandings = standingsArr.length;

      // Team standings: compute championship points per team from schedule matchups
      let teamDivision = null, teamChampPts = 0, teamStandingsRank = null, totalTeamsInDiv = 0;
      if (myTeam) {
        teamDivision = myTeam.division === "championship" ? "Championship" : "Second Division";
        const divTeams = (teams || []).filter(t => t.division === myTeam.division);

        // Compute W/L record and champ pts for each team in division
        const teamStats = divTeams.map(team => {
          let w = 0, l = 0, t2 = 0, cp = 0;
          const teamMatchups = (schedule || []).filter(m => m.home_team_id === team.id || m.away_team_id === team.id);
          teamMatchups.forEach(m => {
            // Only count scored races
            const hasScores = (scores || []).some(s => s.race_id === m.race_id);
            if (!hasScores) return;
            const myTS = teamScore(team, m.race_id);
            const oppId = m.home_team_id === team.id ? m.away_team_id : m.home_team_id;
            const opp = (teams || []).find(t => t.id === oppId);
            const oppTS = opp ? teamScore(opp, m.race_id) : 0;
            if (myTS > oppTS) { w++; cp += 3; }
            else if (myTS === oppTS) { t2++; cp += 1; }
            else { l++; }
          });
          return { teamId: team.id, teamName: team.name, w, l, t: t2, cp };
        }).sort((a, b) => b.cp - a.cp);

        totalTeamsInDiv = teamStats.length;
        const myTeamStats = teamStats.find(ts => ts.teamId === myTeam.id);
        teamChampPts = myTeamStats?.cp || 0;
        teamStandingsRank = teamStats.findIndex(ts => ts.teamId === myTeam.id) + 1;
      }

      setSeasonStats({
        totalPts: totalSeasonPts,
        races: scoredEntries.length,
        avgPts: scoredEntries.length > 0 ? (totalSeasonPts / scoredEntries.length).toFixed(1) : "—",
        myStandingsRank,
        totalPlayersInStandings,
        teamName: myTeam?.name || null,
        teamDivision,
        teamChampPts,
        teamStandingsRank,
        totalTeamsInDiv,
        teamRecord: myTeam ? `${teamWins}-${teamLosses}${teamTies > 0 ? `-${teamTies}` : ""}` : null,
      });
      setHistory(entries);
      setLoading(false);
    }
    load();
  }, [currentUser]);

  if (loading) return null;
  if (history.length === 0) return <p style={{ fontFamily: FB, fontSize: 12, color: TEXT2 }}>No past picks yet</p>;
  const ps = (n) => n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th";
  const ln = (n) => n ? n.split(" ").pop() : "?";

  return (
    <div>
      {/* Season summary */}
      {seasonStats && seasonStats.races > 0 && (
        <div style={{ marginBottom: 24 }}>
          {/* Player Summary */}
          <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 12, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Player Summary</p>
          <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${BORDER}`, padding: "14px", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-around" }}>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontFamily: FB, fontSize: 9, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 2px" }}>Total Pts</p>
                <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 22, color: BLUEDARK, margin: 0 }}>{seasonStats.totalPts}</p>
              </div>
              <div style={{ width: 1, background: BORDER, margin: "0 4px" }} />
              <div style={{ textAlign: "center" }}>
                <p style={{ fontFamily: FB, fontSize: 9, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 2px" }}>Avg / Race</p>
                <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 22, color: TEXT, margin: 0 }}>{seasonStats.avgPts}</p>
              </div>
              <div style={{ width: 1, background: BORDER, margin: "0 4px" }} />
              <div style={{ textAlign: "center" }}>
                <p style={{ fontFamily: FB, fontSize: 9, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 2px" }}>Standings</p>
                <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 22, color: seasonStats.myStandingsRank <= 3 ? GOLD : TEXT, margin: 0 }}>
                  {seasonStats.myStandingsRank}{ps(seasonStats.myStandingsRank)}
                </p>
                <p style={{ fontFamily: FB, fontSize: 9, color: TEXT2, margin: 0 }}>of {seasonStats.totalPlayersInStandings}</p>
              </div>
            </div>
          </div>

          {/* Team Summary */}
          {seasonStats.teamName && (
            <>
              <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 12, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Team Summary — {seasonStats.teamName}</p>
              <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${BORDER}`, padding: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-around" }}>
                  <div style={{ textAlign: "center" }}>
                    <p style={{ fontFamily: FB, fontSize: 9, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 2px" }}>Division</p>
                    <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 13, color: seasonStats.teamDivision === "Championship" ? GOLD : TEXT, margin: 0 }}>{seasonStats.teamDivision}</p>
                  </div>
                  <div style={{ width: 1, background: BORDER, margin: "0 4px" }} />
                  <div style={{ textAlign: "center" }}>
                    <p style={{ fontFamily: FB, fontSize: 9, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 2px" }}>Standings</p>
                    <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 22, color: seasonStats.teamStandingsRank <= 3 ? GOLD : TEXT, margin: 0 }}>
                      {seasonStats.teamStandingsRank}{ps(seasonStats.teamStandingsRank)}
                    </p>
                    <p style={{ fontFamily: FB, fontSize: 9, color: TEXT2, margin: 0 }}>of {seasonStats.totalTeamsInDiv}</p>
                  </div>
                  <div style={{ width: 1, background: BORDER, margin: "0 4px" }} />
                  <div style={{ textAlign: "center" }}>
                    <p style={{ fontFamily: FB, fontSize: 9, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 2px" }}>Champ Pts</p>
                    <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 22, color: GREEN, margin: 0 }}>{seasonStats.teamChampPts}</p>
                  </div>
                  <div style={{ width: 1, background: BORDER, margin: "0 4px" }} />
                  <div style={{ textAlign: "center" }}>
                    <p style={{ fontFamily: FB, fontSize: 9, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 2px" }}>Record</p>
                    <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 18, color: TEXT, margin: 0 }}>{seasonStats.teamRecord}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Week by week */}
      <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 12, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>Week by Week</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {history.map(h => (
          <div key={h.race.id} style={{ background: "#fff", borderRadius: 12, border: `1px solid ${BORDER}`, padding: "12px 14px" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <p style={{ fontFamily: FD, fontWeight: 700, fontSize: 12, color: TEXT, margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                R{h.race.round} — {h.race.race_name}
              </p>
              {h.total !== null && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 16, color: BLUEDARK }}>{h.total} pts</span>
                  {h.rank > 0 && <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 11, color: h.rank <= 3 ? "#c9a820" : TEXT2 }}>({h.rank}{ps(h.rank)})</span>}
                </div>
              )}
            </div>

            {/* Team matchup result */}
            {h.teamResult && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, marginBottom: 8,
                background: h.teamResult.won ? `${GREEN}08` : h.teamResult.lost ? `${RED}08` : `${DARK}04`,
                border: `1px solid ${h.teamResult.won ? `${GREEN}20` : h.teamResult.lost ? `${RED}20` : `${BORDER}40`}`
              }}>
                <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 13, color: h.teamResult.won ? GREEN : h.teamResult.lost ? RED : TEXT2 }}>
                  {h.teamResult.won ? "W" : h.teamResult.lost ? "L" : "T"}
                </span>
                <span style={{ fontFamily: FB, fontSize: 11, color: TEXT2 }}>
                  {h.teamResult.myScore} – {h.teamResult.oppScore}
                </span>
                <span style={{ fontFamily: FB, fontSize: 10, color: TEXT2 }}>vs {h.teamResult.oppName}</span>
              </div>
            )}

            {/* Drivers */}
            <div style={{ display: "flex", gap: 3, marginBottom: 6, overflow: "auto" }}>
              {(h.pick.finishing_order || []).map((d, i) => {
                const isTop = d === h.pick.top_pick;
                const pts = h.driverPts[d];
                const pc = pts === undefined ? TEXT2 : pts < 0 ? RED : pts > 0 ? ORANGE : TEXT2;
                return (
                  <div key={d} style={{ flex: "1 1 0", minWidth: 48, textAlign: "center", background: isTop ? `${BLUEDARK}08` : `${DARK}02`, borderRadius: 6, padding: "4px 3px", border: isTop ? `1px solid ${BLUEDARK}25` : "1px solid transparent" }}>
                    {isTop && <p style={{ fontFamily: FD, fontWeight: 700, fontSize: 7, color: BLUEDARK, textTransform: "uppercase", margin: "0 0 1px" }}>TOP</p>}
                    <p style={{ fontFamily: FB, fontWeight: 600, fontSize: 9, color: TEXT, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ln(d)}</p>
                    {pts !== undefined && (
                      <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 10, color: pc, background: `${pc}12`, padding: "0 4px", borderRadius: 3, display: "inline-block", marginTop: 2 }}>
                        {pts > 0 ? `+${pts}` : pts}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Bonuses */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 10 }}>
              <span style={{ padding: "2px 6px", borderRadius: 4, background: `${DARK}04`, fontFamily: FB, color: TEXT2 }}>
                Best P{h.pick.best_finish}
                {h.score && <span style={{ color: h.score.best_finish_bonus > 0 ? ORANGE : TEXT2, marginLeft: 3 }}>{h.score.best_finish_bonus > 0 ? "✓+3" : "✗"}</span>}
              </span>
              <span style={{ padding: "2px 6px", borderRadius: 4, background: `${DARK}04`, fontFamily: FB, color: TEXT2 }}>
                Pit Stop {Number(h.pick.pit_guess).toFixed(1)}s
                {h.score && <span style={{ color: h.score.pit_individual_pts > 0 ? ORANGE : TEXT2, marginLeft: 3 }}>+{h.score.pit_individual_pts || 0}</span>}
              </span>
              {h.score && <span style={{ padding: "2px 6px", borderRadius: 4, background: h.score.order_bonus > 0 ? `${ORANGE}10` : `${DARK}04`, fontFamily: FB, color: h.score.order_bonus > 0 ? ORANGE : TEXT2 }}>{h.score.order_bonus > 0 ? "Order ✓+6" : "Order ✗"}</span>}
              {h.score?.weekly_bonus_pts > 0 && <span style={{ padding: "2px 6px", borderRadius: 4, background: `${GREEN}10`, fontFamily: FB, color: GREEN }}>Top 10 +{h.score.weekly_bonus_pts}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export { PickHistory };

export default function MyPicks({ currentUser }) {
  const [step, setStep] = useState(0);
  const [race, setRace] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [existingPick, setExistingPick] = useState(null);
  const [error, setError] = useState(null);

  // Pick state
  const [topPick, setTopPick] = useState(null);
  const [midPicks, setMidPicks] = useState([]);
  const [order, setOrder] = useState([]);
  const [bestFinish, setBestFinish] = useState(null);
  const [pitGuess, setPitGuess] = useState(2.5);

  // TODO: Fetch from your matchups/teams table based on currentUser + race
  // For now defaults to "UNDER". When you have a matchups table, query it here.
  const [teamSide, setTeamSide] = useState("UNDER");

  const TOTAL_STEPS = 6;

  // Load current race, player ID, check existing picks
  useEffect(() => {
    async function init() {
      try {
        // Get player ID
        const { data: player, error: pErr } = await supabase
          .from("players")
          .select("id")
          .eq("name", currentUser)
          .single();
        if (pErr) throw pErr;
        setPlayerId(player.id);

        // Get next upcoming race
        const today = new Date().toISOString().split("T")[0];
        const { data: raceData, error: rErr } = await supabase
          .from("races")
          .select("*")
          .gte("race_date", today)
          .order("race_date", { ascending: true })
          .limit(1)
          .single();
        if (rErr) throw rErr;
        setRace(raceData);

        // Check if already submitted
        const { data: existing } = await supabase
          .from("picks")
          .select("*")
          .eq("player_id", player.id)
          .eq("race_id", raceData.id)
          .maybeSingle();

        if (existing) {
          setExistingPick(existing);
          setSubmitted(true);
        }

        // TODO: Fetch team side from matchups table
        // const { data: matchup } = await supabase
        //   .from("matchups")
        //   .select("team_side")
        //   .eq("player_id", player.id)
        //   .eq("race_id", raceData.id)
        //   .single();
        // if (matchup) setTeamSide(matchup.team_side);

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [currentUser]);

  // Keep order in sync when picks change
  useEffect(() => {
    if (topPick && midPicks.length === 4) {
      const all = [topPick, ...midPicks];
      const newOrder = [];
      for (const d of order) { if (all.includes(d)) newOrder.push(d); }
      for (const d of all) { if (!newOrder.includes(d)) newOrder.push(d); }
      setOrder(newOrder);
    }
  }, [topPick, midPicks]);

  const toggleMidPick = (d) => {
    setMidPicks(prev =>
      prev.includes(d) ? prev.filter(x => x !== d)
      : prev.length < 4 ? [...prev, d] : prev
    );
  };

  const canAdvance = () => {
    switch (step) {
      case 0: return topPick !== null;
      case 1: return midPicks.length === 4;
      case 2: return order.length === 5;
      case 3: return bestFinish !== null;
      case 4: return true;
      case 5: return true;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    try {
      // Check deadline hasn't passed
      if (race.pick_deadline && new Date() >= new Date(race.pick_deadline)) {
        setError("Pick deadline has passed!");
        return;
      }
      setLoading(true);
      const { error: insertErr } = await supabase
        .from("picks")
        .insert({
          player_id: playerId,
          race_id: race.id,
          top_pick: topPick,
          finishing_order: order,
          best_finish: bestFinish,
          pit_guess: pitGuess,
          submitted_at: new Date().toISOString()
        });
      if (insertErr) throw insertErr;
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Loading / Error / No-race states ──────────────────
  if (loading) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center" }}>
        <p style={{ fontFamily: FB, fontSize: 14, color: TEXT2 }}>Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center" }}>
        <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 18, color: RED, marginBottom: 8 }}>Error</p>
        <p style={{ fontFamily: FB, fontSize: 13, color: TEXT2 }}>{error}</p>
      </div>
    );
  }

  if (!race) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center" }}>
        <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 18, color: DARK, marginBottom: 8 }}>No Race Available</p>
        <p style={{ fontFamily: FB, fontSize: 13, color: TEXT2 }}>Check back when the next race is announced.</p>
      </div>
    );
  }

  // ── Check if picks window is open ─────────────────────
  // Opens Tuesday 5pm Pacific of race week
  // Race date is Sunday (or Saturday for some), so Tuesday = race_date - 5 days (Sun) or - 4 (Sat)
  // Simplest: find the Tuesday before the race at 5pm Pacific (UTC-7 PDT / UTC-8 PST)
  const picksNotOpenYet = (() => {
    if (submitted) return false; // Already submitted, don't block
    if (!race.race_date) return false;
    const raceDate = new Date(race.race_date + "T00:00:00Z");
    const dayOfWeek = raceDate.getUTCDay(); // 0=Sun, 6=Sat
    // Days to go back to reach Tuesday (2)
    let daysBack = dayOfWeek >= 2 ? dayOfWeek - 2 : dayOfWeek + 5;
    const tuesday = new Date(raceDate);
    tuesday.setUTCDate(tuesday.getUTCDate() - daysBack);
    // Tuesday 5pm Pacific = Wed 00:00 UTC (during PDT)
    const openTime = new Date(tuesday);
    openTime.setUTCHours(0, 0, 0, 0); // Midnight UTC Wednesday = 5pm PDT Tuesday
    openTime.setUTCDate(openTime.getUTCDate() + 1); // Move to Wednesday 00:00 UTC
    return new Date() < openTime;
  })();

  if (picksNotOpenYet) {
    const raceDate = new Date(race.race_date + "T00:00:00Z");
    const dayOfWeek = raceDate.getUTCDay();
    let daysBack = dayOfWeek >= 2 ? dayOfWeek - 2 : dayOfWeek + 5;
    const tuesday = new Date(raceDate);
    tuesday.setUTCDate(tuesday.getUTCDate() - daysBack);
    const openTime = new Date(tuesday);
    openTime.setUTCHours(0, 0, 0, 0);
    openTime.setUTCDate(openTime.getUTCDate() + 1);
    const openStr = openTime.toLocaleString(undefined, { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    const deadlineStr = race.pick_deadline ? new Date(race.pick_deadline).toLocaleString(undefined, { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : null;
    return (
      <div style={{ padding: "40px 20px 100px", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
        <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 20, color: DARK, textTransform: "uppercase", marginBottom: 6 }}>Picks Not Open Yet</p>
        <p style={{ fontFamily: FB, fontSize: 13, color: TEXT2, marginBottom: 20 }}>{race.race_name} — Round {race.round}</p>
        <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, padding: "16px 20px", maxWidth: 320, margin: "0 auto" }}>
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontFamily: FB, fontSize: 10, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>Opens</p>
            <p style={{ fontFamily: FD, fontWeight: 700, fontSize: 14, color: BLUEDARK, margin: 0 }}>{openStr}</p>
          </div>
          {deadlineStr && (
            <div>
              <p style={{ fontFamily: FB, fontSize: 10, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>Closes</p>
              <p style={{ fontFamily: FD, fontWeight: 700, fontSize: 14, color: RED, margin: 0 }}>{deadlineStr}</p>
            </div>
          )}
        </div>
        <PickHistory currentUser={currentUser} />
      </div>
    );
  }

  // ── Already submitted ─────────────────────────────────
  if (submitted) {
    const pick = existingPick || { top_pick: topPick, finishing_order: order, best_finish: bestFinish, pit_guess: pitGuess };
    return (
      <div style={{ padding: "20px 20px 100px" }}>
        {/* Locked in picks */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏁</div>
          <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 20, color: DARK, textTransform: "uppercase", marginBottom: 6 }}>Picks Locked In</p>
          <p style={{ fontFamily: FB, fontSize: 13, color: TEXT2, marginBottom: 16 }}>{race.race_name} — Round {race.round}</p>
        </div>
        <div style={{ maxWidth: 360, margin: "0 auto 24px" }}>
          <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, padding: 16, marginBottom: 12 }}>
            <p style={{ fontFamily: FD, fontWeight: 700, fontSize: 11, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px" }}>Your Drivers</p>
            {pick.finishing_order.map((d, i) => (
              <div key={d} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0", borderBottom: i < pick.finishing_order.length - 1 ? `1px solid ${BG2}` : "none" }}>
                <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 14, color: BLUE, minWidth: 20 }}>{i + 1}</span>
                <span style={{ fontFamily: FB, fontSize: 14, color: TEXT }}>{d}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1, background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, padding: 16 }}>
              <p style={{ fontFamily: FD, fontWeight: 700, fontSize: 11, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 6px" }}>Best Finish</p>
              <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 22, color: DARK, margin: 0 }}>{pick.best_finish}</p>
            </div>
            <div style={{ flex: 1, background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, padding: 16 }}>
              <p style={{ fontFamily: FD, fontWeight: 700, fontSize: 11, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 6px" }}>Pit Stop</p>
              <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 22, color: DARK, margin: 0 }}>{Number(pick.pit_guess).toFixed(1)}s</p>
            </div>
          </div>
        </div>

        {/* Last Race Results */}
        <LastRaceResults currentUser={currentUser} />

        {/* Full Pick History */}
        <PickHistory currentUser={currentUser} />
      </div>
    );
  }

  // ── No drivers set yet ────────────────────────────────
  if (!race.top_drivers || race.top_drivers.length === 0) {
    return (
      <div style={{ padding: "20px 20px 100px" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 18, color: DARK, marginBottom: 8 }}>{race.race_name}</p>
          <p style={{ fontFamily: FB, fontSize: 13, color: TEXT2 }}>Picks open soon — driver pools haven't been set yet for this race.</p>
        </div>
        <LastRaceResults currentUser={currentUser} />
        <PickHistory currentUser={currentUser} />
      </div>
    );
  }

  // ── Pick wizard ───────────────────────────────────────
  return (
    <div style={{ paddingTop: 20, paddingBottom: 20 }}>
      <div style={{ padding: "0 20px", marginBottom: 20 }}>
        <p style={{ fontFamily: FB, fontSize: 11, color: BLUE, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 2px" }}>Round {race.round}</p>
        <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 22, color: DARK, textTransform: "uppercase", letterSpacing: "0.02em", margin: 0 }}>{race.race_name}</p>
      </div>

      <div style={{ padding: "0 20px" }}>
        <StepBar current={step} total={TOTAL_STEPS} />

        {step === 0 && <StepTopPick drivers={race.top_drivers} selected={topPick} onSelect={setTopPick} />}
        {step === 1 && <StepMidPicks drivers={race.mid_drivers} selected={midPicks} onToggle={toggleMidPick} />}
        {step === 2 && <StepFinishingOrder order={order} onReorder={setOrder} />}
        {step === 3 && <StepBestFinish selected={bestFinish} onSelect={setBestFinish} />}
        {step === 4 && <StepPitStop question={race.pit_stop_question} value={pitGuess} onChange={setPitGuess} teamSide={teamSide} />}
        {step === 5 && <StepReview topPick={topPick} order={order} bestFinish={bestFinish} pitGuess={pitGuess} />}

        {/* Navigation */}
        <div style={{ display: "flex", gap: 12, paddingTop: 24, justifyContent: "space-between" }}>
          {step > 0 ? (
            <button onClick={() => setStep(s => s - 1)} style={{
              padding: "12px 24px", borderRadius: 12,
              border: `1px solid ${BORDER}`, background: "#fff",
              fontFamily: FB, fontWeight: 500, fontSize: 14, color: TEXT2, cursor: "pointer"
            }}>Back</button>
          ) : <div />}

          {step < 5 ? (
            <button onClick={() => canAdvance() && setStep(s => s + 1)} style={{
              padding: "12px 32px", borderRadius: 12, border: "none",
              background: canAdvance() ? BLUE : BORDER,
              fontFamily: FB, fontWeight: 600, fontSize: 14,
              color: canAdvance() ? "#fff" : TEXT2,
              cursor: canAdvance() ? "pointer" : "default",
              transition: "all 0.2s"
            }}>Next</button>
          ) : (
            <button onClick={handleSubmit} style={{
              padding: "12px 32px", borderRadius: 12, border: "none",
              background: GREEN,
              fontFamily: FB, fontWeight: 600, fontSize: 14,
              color: "#fff", cursor: "pointer", transition: "all 0.2s"
            }}>Submit Picks 🏁</button>
          )}
        </div>
      </div>
    </div>
  );
}
