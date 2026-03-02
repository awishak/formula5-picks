import { useState, useEffect, useRef } from "react";

const DARK = "#1e1e2a", BLUE = "#6cb8e0", BLUEDARK = "#2a6fa8",
  GREEN = "#22cc66", RED = "#e04a4a", ORANGE = "#e08a2e",
  TEXT = "#1e1e2a", TEXT2 = "#6b6b80", BORDER = "#d8d2c4",
  BG2 = "#ededef";
const FD = "'Geologica', sans-serif";
const FB = "'DM Sans', sans-serif";

// Sample drivers
const SAMPLE_TOP = ["Max Verstappen", "Lando Norris", "George Russell"];
const SAMPLE_MID = ["Carlos Sainz", "Andrea Kimi Antonelli", "Alex Albon", "Fernando Alonso", "Pierre Gasly", "Yuki Tsunoda", "Nico Hülkenberg"];

// ── Shared UI (copied from MyPicks) ─────────────────────
const F1_TEAMS = {
  "Max Verstappen": "Red Bull", "Liam Lawson": "Red Bull",
  "Lando Norris": "McLaren", "Oscar Piastri": "McLaren",
  "Charles Leclerc": "Ferrari", "Lewis Hamilton": "Ferrari",
  "George Russell": "Mercedes", "Andrea Kimi Antonelli": "Mercedes",
  "Carlos Sainz": "Williams", "Alex Albon": "Williams",
  "Fernando Alonso": "Aston Martin", "Lance Stroll": "Aston Martin",
  "Pierre Gasly": "Alpine", "Jack Doohan": "Alpine",
  "Yuki Tsunoda": "Racing Bulls", "Isack Hadjar": "Racing Bulls",
  "Nico Hulkenberg": "Sauber", "Gabriel Bortoleto": "Sauber",
  "Oliver Bearman": "Haas", "Esteban Ocon": "Haas",
};

function Pts({ children, negative, team }) {
  const c = negative ? RED : team ? GREEN : ORANGE;
  return <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 12, color: c, background: `${c}12`, padding: "2px 7px", borderRadius: 6, whiteSpace: "nowrap" }}>{children}</span>;
}

function RuleCard({ children }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "12px 14px", marginBottom: 20, lineHeight: 1.55 }}>
      <div style={{ fontFamily: FD, fontWeight: 800, fontSize: 12, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>
        Scoring
      </div>
      <div style={{ fontFamily: FB, fontSize: 13, color: TEXT2 }}>{children}</div>
    </div>
  );
}

function StepBar({ current, total }) {
  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= current ? BLUE : `${BORDER}60` }} />
      ))}
    </div>
  );
}

function StepHeading({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 20, color: DARK, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.02em" }}>{title}</p>
      <p style={{ fontFamily: FB, fontSize: 13, color: TEXT2, margin: 0 }}>{subtitle}</p>
    </div>
  );
}

// ── Step 1: Top Pick (3 drivers) ────────────────────────
function StepTopPick({ drivers, selected, onSelect }) {
  return (
    <div>
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
      <div style={{ display: "flex", gap: 8 }}>
        {drivers.map(d => {
          const a = selected === d;
          const parts = d.split(" ");
          const firstName = parts[0];
          const lastName = parts.slice(1).join(" ");
          const team = F1_TEAMS[d] || "";
          return (
            <button key={d} onClick={() => onSelect(d)} style={{
              flex: 1, padding: "14px 8px", borderRadius: 12,
              border: `2px solid ${a ? BLUE : BORDER}`,
              background: a ? "rgba(108,184,224,0.1)" : "#fff",
              cursor: "pointer", textAlign: "center", transition: "all 0.15s",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2, position: "relative"
            }}>
              <span style={{ fontFamily: FB, fontWeight: 400, fontSize: 12, color: a ? BLUEDARK : TEXT2 }}>{firstName}</span>
              <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 15, color: a ? BLUEDARK : TEXT }}>{lastName}</span>
              {team && <span style={{ fontFamily: FB, fontWeight: 500, fontSize: 10, color: TEXT2, marginTop: 2 }}>{team}</span>}
              {a && <span style={{ color: BLUE, fontSize: 16, position: "absolute", top: 6, right: 8 }}>✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Step 2: Midfield Picks (4 of 7) ────────────────────
function StepMidPicks({ drivers, selected, onToggle }) {
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
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {drivers.map(d => {
          const a = selected.includes(d);
          const dis = !a && count >= 4;
          const parts = d.split(" ");
          const firstName = parts[0];
          const lastName = parts.slice(1).join(" ");
          const team = F1_TEAMS[d] || "";
          return (
            <button key={d} onClick={() => !dis && onToggle(d)} style={{
              width: "calc(33.33% - 6px)", padding: "14px 6px", borderRadius: 12,
              border: `2px solid ${a ? BLUE : BORDER}`,
              background: a ? "rgba(108,184,224,0.1)" : dis ? "#f0ede5" : "#fff",
              cursor: dis ? "default" : "pointer",
              textAlign: "center", transition: "all 0.15s",
              opacity: dis ? 0.5 : 1,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2, position: "relative"
            }}>
              <span style={{ fontFamily: FB, fontWeight: 400, fontSize: 11, color: a ? BLUEDARK : dis ? TEXT2 : TEXT2 }}>{firstName}</span>
              <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 13, color: a ? BLUEDARK : dis ? TEXT2 : TEXT }}>{lastName}</span>
              {team && <span style={{ fontFamily: FB, fontWeight: 500, fontSize: 9, color: TEXT2, marginTop: 1 }}>{team}</span>}
              {a && <span style={{ color: BLUE, fontSize: 14, position: "absolute", top: 4, right: 6 }}>✓</span>}
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
              width: "calc(33.33% - 6px)", height: 56, borderRadius: 12,
              border: `2px solid ${a ? BLUE : BORDER}`,
              background: a ? BLUE : "#fff",
              fontFamily: FD, fontWeight: 800, fontSize: 18,
              color: a ? "#fff" : TEXT, cursor: "pointer", transition: "all 0.15s"
            }}>{p}</button>
          );
        })}
      </div>
    </div>
  );
}

// ── Step 5: Pit Stop Speedometer (The Needle) ───────────
function StepPitStop({ value, onChange, teamSide }) {
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

  const indivLabels = [];
  if (needleAngle > 0.08 && needleAngle < Math.PI - 0.08)
    indivLabels.push({ label: "+5", angle: needleAngle, size: 14 });
  for (let i = 1; i <= 4; i++) {
    const aL = needleAngle + i * SEG_ANGLE;
    if (aL > 0.08 && aL < Math.PI - 0.08) indivLabels.push({ label: `+${5 - i}`, angle: aL, size: 11 });
    const aR = needleAngle - i * SEG_ANGLE;
    if (aR > 0.08 && aR < Math.PI - 0.08) indivLabels.push({ label: `+${5 - i}`, angle: aR, size: 11 });
  }

  const clamp = (a) => Math.min(Math.PI - 0.2, Math.max(0.2, a));
  const goodAngle = isUnder ? clamp(needleAngle + 7 * SEG_ANGLE) : clamp(needleAngle - 7 * SEG_ANGLE);
  const badAngle = isUnder ? clamp(needleAngle - 7 * SEG_ANGLE) : clamp(needleAngle + 7 * SEG_ANGLE);
  const goodPos = polar(CX, CY, R - 48, goodAngle);
  const goodSubPos = polar(CX, CY, R - 72, goodAngle);
  const badPos = polar(CX, CY, R - 48, badAngle);
  const badSubPos = polar(CX, CY, R - 72, badAngle);

  const needleTip = polar(CX, CY, R - 16, needleAngle);
  const needleBase1 = polar(CX, CY, 16, needleAngle + 0.14);
  const needleBase2 = polar(CX, CY, 16, needleAngle - 0.14);

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
  const sideColor = isUnder ? "#7B2D8E" : "#C5A000";
  const UNDER_CHIP = { fontFamily: FD, fontWeight: 800, fontSize: 11, color: "#7B2D8E", background: "#7B2D8E14", border: "1.5px solid #7B2D8E30", padding: "2px 10px", borderRadius: 20, display: "inline-block" };
  const OVER_CHIP = { fontFamily: FD, fontWeight: 800, fontSize: 11, color: "#C5A000", background: "#C5A00014", border: "1.5px solid #C5A00030", padding: "2px 10px", borderRadius: 20, display: "inline-block" };
  const sideDirection = isUnder ? "under" : "over";

  let displayValue;
  if (value <= min) displayValue = `${min.toFixed(1)} or below`;
  else if (value >= max) displayValue = `${max.toFixed(1)} or above`;
  else displayValue = value.toFixed(1);

  return (
    <div>
      <StepHeading title="The Needle" subtitle="Guess the pit stop time" />


      <RuleCard>
        <p style={{ margin: "0 0 8px" }}>Okay, here's where it gets interesting.</p>
        <p style={{ margin: "0 0 8px" }}>
          Every race has a pit stop question. You're guessing a time in seconds, and how close you get determines your individual points: <Pts>+5</Pts> for nailing it, down to <Pts>+1</Pts> if you're within 0.4 seconds.
        </p>
        <p style={{ margin: "0 0 8px" }}>
          But here's the twist — this is also where the <strong>team game</strong> lives. Your guess doesn't just score you individual points. It also moves something called the <strong>BOX BOX Line</strong>, which is the average of all 4 guesses in your matchup (you + your teammate + the two people you're playing this week).
        </p>
        <p style={{ margin: "0 0 8px" }}>
          Each week, your team is assigned either{" "}
          <span style={isUnder ? UNDER_CHIP : OVER_CHIP}>{isUnder ? "UNDER" : "OVER"}</span>
          {" "}or{" "}
          <span style={isUnder ? OVER_CHIP : UNDER_CHIP}>{isUnder ? "OVER" : "UNDER"}</span>
          . If the actual pit stop time lands on your team's side of the line: <Pts team>+5 for your team</Pts>. Wrong side? <Pts negative>−1 for your team</Pts>.
        </p>
        <p style={{ margin: "0 0 8px" }}>
          So do you guess what you actually think the answer is and maximize your own points? Or do you sacrifice accuracy to push the BOX BOX Line in your team's favor? That tension is what makes The Needle fun.
        </p>
        <p style={{ margin: 0 }}>
          {isUnder
            ? "Your team is the Under this week. Guessing HIGH pushes the line up — giving the actual time more room to come in under it."
            : "Your team is the Over this week. Guessing LOW pulls the line down — giving the actual time more room to come in over it."
          }
        </p>
      </RuleCard>

      <div style={{ textAlign: "center", marginBottom: 20, padding: "14px 16px", background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}` }}>
        <p style={{ fontFamily: FB, fontSize: 12, color: TEXT2, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.08em" }}>For practice, your team is</p>
        <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 16, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          <span style={isUnder ? { ...UNDER_CHIP, fontSize: 14, padding: "4px 16px" } : { ...OVER_CHIP, fontSize: 14, padding: "4px 16px" }}>{isUnder ? "UNDER" : "OVER"}</span>
        </p>
        <p style={{ fontFamily: FB, fontSize: 12, color: TEXT2, margin: 0, lineHeight: 1.6 }}>
          To score team points, you need{" "}
          <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 11, color: BLUEDARK, background: `${BLUE}18`, padding: "2px 8px", borderRadius: 6, whiteSpace: "nowrap" }}>Ferrari's 1st Pit Stop</span>
          {" "}to be {sideDirection} the average of your matchup's guesses.
        </p>
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

// ── Main Practice Picks Component ───────────────────────
export default function PracticePicks() {
  const [step, setStep] = useState(0);
  const [topPick, setTopPick] = useState(null);
  const [midPicks, setMidPicks] = useState([]);
  const [order, setOrder] = useState([]);
  const [bestFinish, setBestFinish] = useState(null);
  const [pitGuess, setPitGuess] = useState(2.5);
  const [teamSide] = useState(Math.random() > 0.5 ? "UNDER" : "OVER");
  const [done, setDone] = useState(false);

  const TOTAL_STEPS = 6;

  const toggleMidPick = (d) => {
    setMidPicks(prev => prev.includes(d) ? prev.filter(x => x !== d) : prev.length < 4 ? [...prev, d] : prev);
  };

  useEffect(() => {
    if (topPick && midPicks.length === 4) {
      const all = [topPick, ...midPicks];
      const newOrder = [];
      for (const d of order) { if (all.includes(d)) newOrder.push(d); }
      for (const d of all) { if (!newOrder.includes(d)) newOrder.push(d); }
      setOrder(newOrder);
    }
  }, [topPick, midPicks]);

  const canAdvance = () => {
    if (step === 0) return topPick !== null;
    if (step === 1) return midPicks.length === 4;
    if (step === 2) return order.length === 5;
    if (step === 3) return bestFinish !== null;
    if (step === 4) return true;
    if (step === 5) return true;
    return false;
  };

  const handleNext = () => {
    if (step === 5) { setDone(true); return; }
    setStep(s => Math.min(s + 1, TOTAL_STEPS - 1));
  };

  const reset = () => {
    setStep(0); setTopPick(null); setMidPicks([]); setOrder([]); setBestFinish(null); setPitGuess(2.5); setDone(false);
  };

  if (done) {
    return (
      <div style={{ padding: "20px 20px 100px" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
          <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 22, color: DARK, textTransform: "uppercase", marginBottom: 6 }}>Practice Complete!</p>
          <p style={{ fontFamily: FB, fontSize: 13, color: TEXT2, marginBottom: 20 }}>Nice work — you're ready for race week.</p>
        </div>
        <div style={{ maxWidth: 360, margin: "0 auto" }}>
          <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, padding: 16, marginBottom: 12 }}>
            <p style={{ fontFamily: FD, fontWeight: 700, fontSize: 11, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px" }}>Your Practice Picks</p>
            {order.map((d, i) => (
              <div key={d} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0", borderBottom: i < order.length - 1 ? `1px solid ${BG2}` : "none" }}>
                <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 14, color: BLUE, minWidth: 20 }}>{i + 1}</span>
                <span style={{ fontFamily: FB, fontSize: 14, color: TEXT }}>{d}</span>
                {d === topPick && <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 9, color: BLUEDARK, background: `${BLUE}15`, padding: "1px 6px", borderRadius: 4 }}>TOP PICK</span>}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, padding: 16 }}>
              <p style={{ fontFamily: FD, fontWeight: 700, fontSize: 11, color: TEXT2, textTransform: "uppercase", margin: "0 0 6px" }}>Best Finish</p>
              <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 22, color: DARK, margin: 0 }}>{bestFinish}</p>
            </div>
            <div style={{ flex: 1, background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, padding: 16 }}>
              <p style={{ fontFamily: FD, fontWeight: 700, fontSize: 11, color: TEXT2, textTransform: "uppercase", margin: "0 0 6px" }}>Pit Stop</p>
              <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 22, color: DARK, margin: 0 }}>{pitGuess.toFixed(1)}s</p>
            </div>
          </div>
          <p style={{ fontFamily: FB, fontSize: 12, color: TEXT2, textAlign: "center", marginBottom: 16 }}>
            This was just practice — nothing was saved. When picks open for the next race, you'll do this for real!
          </p>
          <button onClick={reset} style={{
            width: "100%", padding: "14px 0", borderRadius: 12, border: "none", background: BLUE,
            fontFamily: FB, fontWeight: 600, fontSize: 14, color: "#fff", cursor: "pointer"
          }}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 20px 100px" }}>
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontFamily: FB, fontSize: 11, color: ORANGE, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 2px" }}>Practice Mode</p>
        <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 20, color: DARK, textTransform: "uppercase", margin: "0 0 4px" }}>Practice Picks</p>
        <p style={{ fontFamily: FB, fontSize: 12, color: TEXT2 }}>Try the pick process with sample drivers — nothing gets saved</p>
      </div>

      <StepBar current={step} total={TOTAL_STEPS} />

      {step === 0 && <StepTopPick drivers={SAMPLE_TOP} selected={topPick} onSelect={setTopPick} />}
      {step === 1 && <StepMidPicks drivers={SAMPLE_MID} selected={midPicks} onToggle={toggleMidPick} />}
      {step === 2 && <StepFinishingOrder order={order} onReorder={setOrder} />}
      {step === 3 && <StepBestFinish selected={bestFinish} onSelect={setBestFinish} />}
      {step === 4 && <StepPitStop value={pitGuess} onChange={setPitGuess} teamSide={teamSide} />}
      {step === 5 && <StepReview topPick={topPick} order={order} bestFinish={bestFinish} pitGuess={pitGuess} />}

      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} style={{
            flex: 1, padding: "14px 0", borderRadius: 12,
            border: `1px solid ${BORDER}`, background: "#fff",
            fontFamily: FB, fontWeight: 600, fontSize: 14, color: TEXT2, cursor: "pointer"
          }}>Back</button>
        )}
        <button onClick={handleNext} disabled={!canAdvance()} style={{
          flex: 2, padding: "14px 0", borderRadius: 12, border: "none",
          background: canAdvance() ? (step === 5 ? GREEN : BLUE) : `${BORDER}80`,
          fontFamily: FB, fontWeight: 600, fontSize: 14,
          color: canAdvance() ? "#fff" : TEXT2, cursor: canAdvance() ? "pointer" : "default"
        }}>{step === 5 ? "Finish Practice ✓" : "Next →"}</button>
      </div>
    </div>
  );
}
