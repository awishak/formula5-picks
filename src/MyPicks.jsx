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
// ── F1 Driver → Team fallback map ───────────────────────
const F1_TEAMS_FALLBACK = {
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

const F1_TEAM_COLORS = {
  "Red Bull": "#3671C6", "McLaren": "#FF8000", "Ferrari": "#E8002D",
  "Mercedes": "#27F4D2", "Williams": "#64C4FF", "Aston Martin": "#229971",
  "Alpine": "#0093CC", "Racing Bulls": "#6692FF", "Sauber": "#52E252",
  "Haas": "#B6BABD",
};

// ── OpenF1 API: fetch driver data (name, team, headshot) ─
// Returns a Map keyed by full name → { team, headshot, teamColor, acronym, number }
function useOpenF1Drivers() {
  const [driverMap, setDriverMap] = useState(new Map());

  useEffect(() => {
    let cancelled = false;
    async function fetchDrivers() {
      try {
        // Fetch the latest session's drivers for current-season headshots
        const res = await fetch("https://api.openf1.org/v1/drivers?session_key=latest");
        if (!res.ok) throw new Error(`OpenF1 request failed: ${res.status}`);
        const data = await res.json();

        if (cancelled || !Array.isArray(data)) return;

        console.log("[OpenF1] Fetched", data.length, "driver entries");

        const map = new Map();
        // OpenF1 can return duplicate driver entries (one per session); dedupe by driver_number
        const seen = new Set();
        for (const d of data) {
          if (seen.has(d.driver_number)) continue;
          seen.add(d.driver_number);

          // Build a normalized full name to match Supabase driver names
          const first = d.first_name || "";
          const last = d.last_name || "";
          const fullName = `${first} ${last}`.trim();

          map.set(fullName, {
            team: d.team_name || "",
            headshot: d.headshot_url || null,
            teamColor: d.team_colour ? `#${d.team_colour}` : null,
            acronym: d.name_acronym || "",
            number: d.driver_number || null,
          });
        }
        console.log("[OpenF1] Driver map keys:", [...map.keys()]);
        setDriverMap(map);
      } catch (err) {
        console.warn("OpenF1 fetch failed, using fallback data:", err);
        // Populate with fallback data (no headshots)
        const map = new Map();
        Object.entries(F1_TEAMS_FALLBACK).forEach(([name, team]) => {
          map.set(name, { team, headshot: null, teamColor: F1_TEAM_COLORS[team] || null, acronym: "", number: null });
        });
        setDriverMap(map);
      }
    }
    fetchDrivers();
    return () => { cancelled = true; };
  }, []);

  return driverMap;
}

// Helper: find a driver in the OpenF1 map using fuzzy matching
// (handles cases where Supabase names might differ slightly from OpenF1 names)
function findDriver(driverMap, name) {
  if (!name || driverMap.size === 0) {
    const team = F1_TEAMS_FALLBACK[name] || "";
    return { team, headshot: null, teamColor: F1_TEAM_COLORS[team] || null, acronym: "", number: null };
  }
  // Exact match first
  if (driverMap.has(name)) return driverMap.get(name);
  // Try matching by last name
  const nameParts = name.split(" ");
  const lastName = nameParts[nameParts.length - 1].toLowerCase();
  for (const [key, val] of driverMap) {
    if (key.split(" ").pop().toLowerCase() === lastName) return val;
  }
  // Try matching by first name (for edge cases like "Andrea Kimi Antonelli" vs "Kimi Antonelli")
  for (const [key, val] of driverMap) {
    const keyFirst = key.split(" ")[0].toLowerCase();
    if (nameParts.some(p => p.toLowerCase() === keyFirst)) return val;
  }
  // Try partial / contains match
  const nameLower = name.toLowerCase();
  for (const [key, val] of driverMap) {
    if (nameLower.includes(key.toLowerCase()) || key.toLowerCase().includes(nameLower)) return val;
  }
  console.log("[OpenF1] No match for:", name, "| Available:", [...driverMap.keys()]);
  // Fallback
  const fallbackTeam = F1_TEAMS_FALLBACK[name] || "";
  return { team: fallbackTeam, headshot: null, teamColor: F1_TEAM_COLORS[fallbackTeam] || null, acronym: "", number: null };
}

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
function StepTopPick({ drivers, selected, onSelect, driverMap }) {
  const shown = drivers.slice(0, 3);
  return (
    <div>
      {/* Intro explainer */}
      <div style={{ background: `${BLUE}08`, border: `1px solid ${BLUE}25`, borderRadius: 14, padding: "14px 16px", marginBottom: 20, lineHeight: 1.6 }}>
        <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 11, color: BLUEDARK, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px" }}>Welcome to Formula 5</p>
        <p style={{ fontFamily: FB, fontSize: 12.5, color: TEXT, margin: "0 0 8px" }}>
          In Formula 5, your goal is to get as many points as possible to win the individual <strong>Players Championship</strong> as well as the <strong>Team Championship</strong> at the end of the season.
        </p>
        <p style={{ fontFamily: FB, fontSize: 12.5, color: TEXT, margin: "0 0 8px" }}>
          How do you do this? By guessing questions right, which gives you points. The more points, the better, just like in F1. And you can earn points each race, just like in F1.
        </p>
        <p style={{ fontFamily: FB, fontSize: 12.5, color: TEXT, margin: "0 0 8px" }}>
          Winning the individual game is simple: guess right, accumulate points, and whoever has the most points at the end of our season is the Players Champion!
        </p>
        <p style={{ fontFamily: FB, fontSize: 12.5, color: TEXT, margin: 0 }}>
          Winning the team game is actually pretty simple, too: guess right, win each week, and make sure you rise to the top of the standings so you can be one of the top two teams who play for the championship!
        </p>
      </div>

      <p style={{ fontFamily: FB, fontSize: 12, color: TEXT2, fontStyle: "italic", marginBottom: 16 }}>There are some other things to explain, but let's get to the simple stuff first.</p>

      <StepHeading title="Top Pick" subtitle={<>Choose <strong>1 driver</strong> from the top of the pack</>} />
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
        {shown.map(d => {
          const a = selected === d;
          const parts = d.split(" ");
          const firstName = parts[0];
          const lastName = parts.slice(1).join(" ");
          const driverInfo = findDriver(driverMap, d);
          const team = driverInfo?.team || "";
          const teamColor = driverInfo?.teamColor || BLUE;
          const headshot = driverInfo?.headshot || null;
          return (
            <button key={d} onClick={() => onSelect(d)} style={{
              flex: 1, padding: "10px 8px 14px", borderRadius: 12,
              border: `2px solid ${a ? teamColor : BORDER}`,
              background: a ? `${teamColor}14` : "#fff",
              cursor: "pointer", textAlign: "center", transition: "all 0.15s",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2, position: "relative"
            }}>
              {/* Driver headshot */}
              <div style={{
                width: 52, height: 52, borderRadius: "50%", overflow: "hidden",
                background: headshot ? `${teamColor}18` : `${BORDER}40`,
                marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "center",
                border: a ? `2px solid ${teamColor}60` : "2px solid transparent",
                transition: "border 0.15s"
              }}>
                {headshot ? (
                  <img src={headshot} alt={d} style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => { e.target.style.display = "none"; }} />
                ) : (
                  <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 16, color: TEXT2 }}>
                    {firstName[0]}{lastName[0] || ""}
                  </span>
                )}
              </div>
              <span style={{ fontFamily: FB, fontWeight: 400, fontSize: 12, color: a ? BLUEDARK : TEXT2 }}>{firstName}</span>
              <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 15, color: a ? BLUEDARK : TEXT }}>{lastName}</span>
              {team && (
                <span style={{
                  fontFamily: FB, fontWeight: 500, fontSize: 10, marginTop: 2,
                  color: teamColor || TEXT2,
                  background: `${teamColor}10`,
                  padding: "1px 6px", borderRadius: 4,
                }}>{team}</span>
              )}
              {a && <span style={{ color: teamColor, fontSize: 16, position: "absolute", top: 6, right: 8 }}>✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Step 2: Midfield Picks (7 of 10) ────────────────────
function StepMidPicks({ drivers, selected, onToggle, driverMap }) {
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
        <p style={{ margin: "8px 0 0", fontSize: 11.5, color: BLUEDARK, fontWeight: 600 }}>Don't worry about order right now — you'll order your drivers on the next page.</p>
      </RuleCard>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {shown.map(d => {
          const a = selected.includes(d);
          const dis = !a && count >= 4;
          const parts = d.split(" ");
          const firstName = parts[0];
          const lastName = parts.slice(1).join(" ");
          const driverInfo = findDriver(driverMap, d);
          const team = driverInfo?.team || "";
          const teamColor = driverInfo?.teamColor || BLUE;
          const headshot = driverInfo?.headshot || null;
          return (
            <button key={d} onClick={() => !dis && onToggle(d)} style={{
              width: "calc(33.33% - 6px)", padding: "10px 6px 14px", borderRadius: 12,
              border: `2px solid ${a ? teamColor : BORDER}`,
              background: a ? `${teamColor}14` : dis ? "#f0ede5" : "#fff",
              cursor: dis ? "default" : "pointer",
              textAlign: "center", transition: "all 0.15s",
              opacity: dis ? 0.5 : 1,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2, position: "relative"
            }}>
              {/* Driver headshot */}
              <div style={{
                width: 40, height: 40, borderRadius: "50%", overflow: "hidden",
                background: headshot ? `${teamColor}18` : `${BORDER}40`,
                marginBottom: 3, display: "flex", alignItems: "center", justifyContent: "center",
                border: a ? `2px solid ${teamColor}60` : "2px solid transparent",
                transition: "border 0.15s"
              }}>
                {headshot ? (
                  <img src={headshot} alt={d} style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => { e.target.style.display = "none"; }} />
                ) : (
                  <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 13, color: TEXT2 }}>
                    {firstName[0]}{lastName[0] || ""}
                  </span>
                )}
              </div>
              <span style={{ fontFamily: FB, fontWeight: 400, fontSize: 11, color: a ? BLUEDARK : dis ? TEXT2 : TEXT2 }}>{firstName}</span>
              <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 13, color: a ? BLUEDARK : dis ? TEXT2 : TEXT }}>{lastName}</span>
              {team && (
                <span style={{
                  fontFamily: FB, fontWeight: 500, fontSize: 9, marginTop: 1,
                  color: teamColor || TEXT2,
                  background: `${teamColor}10`,
                  padding: "0px 4px", borderRadius: 3,
                }}>{team}</span>
              )}
              {a && <span style={{ color: teamColor, fontSize: 14, position: "absolute", top: 4, right: 6 }}>✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Step 3: Finishing Order ─────────────────────────────
function StepFinishingOrder({ order, onReorder, driverMap }) {
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
        {order.map((d, idx) => {
          const parts = d.split(" ");
          const firstName = parts[0];
          const lastName = parts.slice(1).join(" ");
          const driverInfo = findDriver(driverMap, d);
          const team = driverInfo?.team || "";
          const teamColor = driverInfo?.teamColor || BLUE;
          const headshot = driverInfo?.headshot || null;
          const isDragging = dragging === idx;
          return (
            <div key={d}>
              <div draggable onDragStart={() => ds(idx)} onDragOver={(e) => dov(e, idx)} onDragEnd={de}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12,
                  border: `2px solid ${isDragging ? teamColor : BORDER}`,
                  background: isDragging ? `${teamColor}0a` : "#fff",
                  cursor: "grab", transition: "all 0.15s", userSelect: "none",
                  borderLeft: `4px solid ${teamColor}`,
                }}>
                {/* Position number */}
                <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 16, color: BLUE, minWidth: 22, textAlign: "center" }}>{idx + 1}</span>

                {/* Driver headshot */}
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", overflow: "hidden", flexShrink: 0,
                  background: headshot ? `${teamColor}18` : `${BORDER}40`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {headshot ? (
                    <img src={headshot} alt={d} style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => { e.target.style.display = "none"; }} />
                  ) : (
                    <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 12, color: TEXT2 }}>
                      {firstName[0]}{lastName[0] || ""}
                    </span>
                  )}
                </div>

                {/* Name + team */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: FB, fontWeight: 600, fontSize: 14, color: TEXT, display: "block", lineHeight: 1.2 }}>{d}</span>
                  {team && (
                    <span style={{
                      fontFamily: FB, fontWeight: 500, fontSize: 10, color: teamColor,
                    }}>{team}</span>
                  )}
                </div>

                {/* Up/down arrows */}
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <button onClick={() => mv(idx, -1)} disabled={idx === 0} style={{ background: "none", border: "none", cursor: idx === 0 ? "default" : "pointer", color: idx === 0 ? BORDER : TEXT2, fontSize: 14, padding: "2px 6px", lineHeight: 1 }}>▲</button>
                  <button onClick={() => mv(idx, 1)} disabled={idx === order.length - 1} style={{ background: "none", border: "none", cursor: idx === order.length - 1 ? "default" : "pointer", color: idx === order.length - 1 ? BORDER : TEXT2, fontSize: 14, padding: "2px 6px", lineHeight: 1 }}>▼</button>
                </div>
              </div>
              {idx < order.length - 1 && <div style={{ textAlign: "center", padding: "6px 0", fontFamily: FB, fontSize: 11, color: TEXT2, fontStyle: "italic" }}>will finish ahead of</div>}
            </div>
          );
        })}
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

// ── Step 5: Pit Stop Speedometer ────────────────────────
function StepPitStop({ question, value, onChange, teamSide }) {
  const [scoringOpen, setScoringOpen] = useState(true);
  const [pitDataOpen, setPitDataOpen] = useState(false);
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
  const sideColor = isUnder ? "#7B2D8E" : "#C5A000";
  const UNDER_CHIP = { fontFamily: FD, fontWeight: 800, fontSize: 11, color: "#7B2D8E", background: "#7B2D8E14", border: "1.5px solid #7B2D8E30", padding: "2px 10px", borderRadius: 20, display: "inline-block" };
  const OVER_CHIP = { fontFamily: FD, fontWeight: 800, fontSize: 11, color: "#C5A000", background: "#C5A00014", border: "1.5px solid #C5A00030", padding: "2px 10px", borderRadius: 20, display: "inline-block" };
  const sideExplainParts = { direction: isUnder ? "under" : "over" };

  let displayValue;
  if (value <= min) displayValue = `${min.toFixed(1)} or below`;
  else if (value >= max) displayValue = `${max.toFixed(1)} or above`;
  else displayValue = value.toFixed(1);

  return (
    <div>
      <StepHeading title="The Needle" subtitle="Guess the pit stop time" />

      {/* Scoring dropdown — starts open */}
      <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>
        <button onClick={() => setScoringOpen(!scoringOpen)} style={{
          width: "100%", padding: "12px 14px", background: "none", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "space-between", textAlign: "left"
        }}>
          <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 12, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.12em" }}>Scoring</span>
          <span style={{ fontSize: 11, color: TEXT2, transform: scoringOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
        </button>
        {scoringOpen && (
          <div style={{ padding: "0 14px 12px", fontFamily: FB, fontSize: 13, color: TEXT2, lineHeight: 1.55 }}>
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
          </div>
        )}
      </div>

      {/* 2025 Pit Stop Data dropdown — starts closed */}
      <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, marginBottom: 20, overflow: "hidden" }}>
        <button onClick={() => setPitDataOpen(!pitDataOpen)} style={{
          width: "100%", padding: "12px 14px", background: "none", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "space-between", textAlign: "left"
        }}>
          <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 12, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.12em" }}>View 2025 Pit Stop Data</span>
          <span style={{ fontSize: 11, color: TEXT2, transform: pitDataOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
        </button>
        {pitDataOpen && (
          <div style={{ padding: "0 4px 4px" }}>
            <img src="/pit-stop-data.png" alt="2025 Pit Stop Data by Team" style={{ width: "100%", display: "block", borderRadius: 8 }} />
          </div>
        )}
      </div>

      {/* Team side card */}
      <div style={{ textAlign: "center", marginBottom: 20, padding: "14px 16px", background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}` }}>
        <p style={{ fontFamily: FB, fontSize: 12, color: TEXT2, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.08em" }}>This week, your team is</p>
        <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 16, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          <span style={isUnder ? { ...UNDER_CHIP, fontSize: 14, padding: "4px 16px" } : { ...OVER_CHIP, fontSize: 14, padding: "4px 16px" }}>{isUnder ? "UNDER" : "OVER"}</span>
        </p>
        <p style={{ fontFamily: FB, fontSize: 12, color: TEXT2, margin: 0, lineHeight: 1.6 }}>
          To score team points, you need{" "}
          <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 11, color: BLUEDARK, background: `${BLUE}18`, padding: "2px 8px", borderRadius: 6, whiteSpace: "nowrap" }}>{question}</span>
          {" "}to be {sideExplainParts.direction} the average of your matchup's guesses.
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

          {/* Tick marks at 2.0, 2.5, 3.0, 3.5 */}
          {[2.0, 2.5, 3.0, 3.5].map(v => {
            const a = valToAngle(v);
            const inner = polar(CX, CY, ROUTER + 2, a);
            const outer = polar(CX, CY, ROUTER + 10, a);
            const labelPos = polar(CX, CY, ROUTER + 20, a);
            return (
              <g key={`tick-${v}`}>
                <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke={TEXT2} strokeWidth="1.5" strokeLinecap="round" />
                <text x={labelPos.x} y={labelPos.y} textAnchor="middle" dominantBaseline="middle" style={{ fontFamily: FD, fontSize: 9, fill: TEXT2, fontWeight: 700 }}>{v.toFixed(1)}</text>
              </g>
            );
          })}

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
function PickHistory({ currentUser, driverMap: externalDriverMap }) {
  const [history, setHistory] = useState([]);
  const [seasonStats, setSeasonStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const internalDriverMap = useOpenF1Drivers();
  const driverMap = (externalDriverMap && externalDriverMap.size > 0) ? externalDriverMap : internalDriverMap;

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
            teamResult = { myScore: myTS, oppScore: oppTS, oppName: opp?.name || "?", won, lost, isOver: matchup.home_team_id === myTeam.id };
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
                display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, marginBottom: 8,
                background: h.teamResult.won ? `${GREEN}08` : h.teamResult.lost ? `${RED}08` : `${DARK}04`,
                border: `1px solid ${h.teamResult.won ? `${GREEN}20` : h.teamResult.lost ? `${RED}20` : `${BORDER}40`}`
              }}>
                <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 14, color: h.teamResult.won ? GREEN : h.teamResult.lost ? RED : TEXT2 }}>
                  {h.teamResult.won ? "W" : h.teamResult.lost ? "L" : "T"}
                </span>
                <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 12, color: TEXT }}>
                  {h.teamResult.myScore} – {h.teamResult.oppScore}
                </span>
                <span style={{ fontFamily: FB, fontSize: 11, color: TEXT2 }}>vs {h.teamResult.oppName}</span>
                <span style={{
                  fontFamily: FD, fontWeight: 800, fontSize: 9, letterSpacing: "0.08em",
                  color: h.teamResult.isOver ? "#c9a820" : "#7c5cbf",
                  background: h.teamResult.isOver ? "#c9a82015" : "#7c5cbf15",
                  border: `1.5px solid ${h.teamResult.isOver ? "#c9a82030" : "#7c5cbf30"}`,
                  padding: "2px 8px", borderRadius: 20, textTransform: "uppercase", marginLeft: "auto"
                }}>{h.teamResult.isOver ? "OVER" : "UNDER"}</span>
              </div>
            )}

            {/* Drivers */}
            <div style={{ display: "flex", gap: 4, marginBottom: 8, overflow: "auto" }}>
              {(h.pick.finishing_order || []).map((d, i) => {
                const isTop = d === h.pick.top_pick;
                const pts = h.driverPts[d];
                const pc = pts === undefined ? TEXT2 : pts < 0 ? RED : pts > 0 ? ORANGE : TEXT2;
                const info = findDriver(driverMap, d);
                const teamName = info.team || F1_TEAMS_FALLBACK[d] || "";
                const tc = info.teamColor || F1_TEAM_COLORS[teamName] || BLUE;
                const parts = d.split(" ");
                const first = parts[0], last = parts.slice(1).join(" ");
                return (
                  <div key={d} style={{
                    flex: "1 1 0", minWidth: 58, textAlign: "center",
                    background: isTop ? `${BLUEDARK}08` : `${DARK}02`,
                    borderRadius: 10, padding: "6px 4px 8px",
                    border: isTop ? `1.5px solid ${BLUEDARK}30` : `1px solid ${BORDER}30`
                  }}>
                    {isTop && <p style={{ fontFamily: FD, fontWeight: 700, fontSize: 7, color: BLUEDARK, textTransform: "uppercase", margin: "0 0 2px", letterSpacing: "0.08em" }}>TOP</p>}
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", overflow: "hidden",
                      background: `${tc}25`,
                      margin: "0 auto 3px", display: "flex", alignItems: "center", justifyContent: "center",
                      border: `2px solid ${tc}`, position: "relative"
                    }}>
                      <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 11, color: "#fff" }}>{first[0]}{(last[0] || "")}</span>
                      {info.headshot && (
                        <img src={info.headshot} alt={d} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                      )}
                    </div>
                    <p style={{ fontFamily: FD, fontWeight: 700, fontSize: 9, color: TEXT, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{last}</p>
                    {teamName && <p style={{ fontFamily: FB, fontSize: 7, color: tc, margin: "1px 0 0" }}>{teamName}</p>}
                    {pts !== undefined && (
                      <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 11, color: pc, background: `${pc}12`, padding: "1px 5px", borderRadius: 4, display: "inline-block", marginTop: 3 }}>
                        {pts > 0 ? `+${pts}` : pts}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Bonuses */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span style={{ padding: "5px 10px", borderRadius: 8, background: `${DARK}04`, fontFamily: FB, fontSize: 13, fontWeight: 600, color: TEXT2 }}>
                Best {String(h.pick.best_finish || "").startsWith("P") ? h.pick.best_finish : `P${h.pick.best_finish}`}
                {h.score && <span style={{ color: h.score.best_finish_bonus > 0 ? ORANGE : TEXT2, marginLeft: 4 }}>{h.score.best_finish_bonus > 0 ? "✓+3" : "✗"}</span>}
              </span>
              <span style={{ padding: "5px 10px", borderRadius: 8, background: `${DARK}04`, fontFamily: FB, fontSize: 13, fontWeight: 600, color: TEXT2 }}>
                Pit {Number(h.pick.pit_guess).toFixed(1)}s
                {h.score && <span style={{ color: h.score.pit_individual_pts > 0 ? ORANGE : TEXT2, marginLeft: 4 }}>+{h.score.pit_individual_pts || 0}</span>}
              </span>
              {h.score && <span style={{ padding: "5px 10px", borderRadius: 8, background: h.score.order_bonus > 0 ? `${ORANGE}10` : `${DARK}04`, fontFamily: FB, fontSize: 13, fontWeight: 600, color: h.score.order_bonus > 0 ? ORANGE : TEXT2 }}>{h.score.order_bonus > 0 ? "Order ✓+6" : "Order ✗"}</span>}
              {h.score?.weekly_bonus_pts > 0 && <span style={{ padding: "5px 10px", borderRadius: 8, background: `${GREEN}10`, fontFamily: FB, fontSize: 13, fontWeight: 600, color: GREEN }}>Top 10 +{h.score.weekly_bonus_pts}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export { PickHistory };

export default function MyPicks({ currentUser, onNavigate }) {
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

  const [teamSide, setTeamSide] = useState("UNDER"); // Updated from schedule: home=OVER, away=UNDER

  // OpenF1 driver data (headshots, teams, colors)
  const driverMap = useOpenF1Drivers();

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

        // Get next upcoming race (or the most recently started race if all have passed)
        const today = new Date().toISOString().split("T")[0];
        let raceData = null;
        
        // First try: upcoming race
        const { data: upcomingRace } = await supabase
          .from("races")
          .select("*")
          .gte("race_date", today)
          .order("race_date", { ascending: true })
          .limit(1)
          .maybeSingle();
        
        if (upcomingRace) {
          raceData = upcomingRace;
        } else {
          // Fallback: most recent race (picks window may still be open)
          const { data: lastRace } = await supabase
            .from("races")
            .select("*")
            .order("race_date", { ascending: false })
            .limit(1)
            .maybeSingle();
          raceData = lastRace;
        }
        
        if (!raceData) {
          setLoading(false);
          return;
        }
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

        // Fetch team side from schedule
        const { data: myTeamData } = await supabase
          .from("teams")
          .select("id")
          .or(`player1_id.eq.${player.id},player2_id.eq.${player.id}`)
          .maybeSingle();

        if (myTeamData) {
          const { data: matchup } = await supabase
            .from("schedule")
            .select("home_team_id, away_team_id")
            .eq("race_id", raceData.id)
            .or(`home_team_id.eq.${myTeamData.id},away_team_id.eq.${myTeamData.id}`)
            .maybeSingle();

          if (matchup) {
            // Home team = Over, Away team = Under
            setTeamSide(matchup.home_team_id === myTeamData.id ? "OVER" : "UNDER");
          }
        }

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
    if (race.round === 1) return false; // First race — picks open immediately
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
        <PickHistory currentUser={currentUser} driverMap={driverMap} />
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
          <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 20, color: DARK, textTransform: "uppercase", marginBottom: 6 }}>Picks Locked In</p>
          <p style={{ fontFamily: FB, fontSize: 13, color: TEXT2, marginBottom: 16 }}>{race.race_name} — Round {race.round}</p>
        </div>
        <div style={{ maxWidth: 360, margin: "0 auto 24px" }}>
          <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, padding: 16, marginBottom: 12 }}>
            <p style={{ fontFamily: FD, fontWeight: 700, fontSize: 11, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px" }}>Your Drivers</p>
            {(pick.finishing_order || []).map((d, i) => (
              <div key={d} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0", borderBottom: i < (pick.finishing_order || []).length - 1 ? `1px solid ${BG2}` : "none" }}>
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
              <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 22, color: DARK, margin: 0 }}>{pick.pit_guess != null ? Number(pick.pit_guess).toFixed(1) + "s" : "—"}</p>
            </div>
          </div>
        </div>

        {/* Last Race Results */}
        <LastRaceResults currentUser={currentUser} />

        {/* Want to know more? */}
        <div style={{ background: `${BLUE}06`, border: `1px solid ${BLUE}20`, borderRadius: 14, padding: "16px 16px", marginBottom: 24, lineHeight: 1.6 }}>
          <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 13, color: BLUEDARK, margin: "0 0 10px" }}>Want to know a little more?</p>
          <p style={{ fontFamily: FB, fontSize: 12.5, color: TEXT, margin: "0 0 8px" }}>
            <strong>Individual vs. Team:</strong> Every point you earn counts toward your individual standing in the Players Championship. But points from your driver picks (not The Needle) also count toward your team's weekly matchup. Each week, your team faces another team — the team with more combined driver points (plus the BOX BOX result) wins the matchup.
          </p>
          <p style={{ fontFamily: FB, fontSize: 12.5, color: TEXT, margin: "0 0 8px" }}>
            <strong>How the Team Championship works:</strong> Teams earn 3 championship points for a win, 1 for a tie, and 0 for a loss — just like soccer. At the end of the season, the top two teams in the Championship Division face off for the title.
          </p>
          <p style={{ fontFamily: FB, fontSize: 12.5, color: TEXT, margin: "0 0 8px" }}>
            <strong>Promotion and Relegation:</strong> There are two divisions — Championship and Second Division. After 11 races (the midpoint of the season), the bottom 3 teams in Championship get relegated to Second Division, and the top 3 teams in Second Division get promoted up. So even if you start in the lower division, you can fight your way to the top.
          </p>
          <button onClick={() => onNavigate && onNavigate("rules")} style={{
            width: "100%", padding: "12px", borderRadius: 10,
            border: `1px solid ${BLUE}40`, background: "#fff",
            fontFamily: FD, fontWeight: 700, fontSize: 12, color: BLUEDARK,
            cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 4
          }}>Take me to the rulebook</button>
        </div>

        {/* Full Pick History */}
        <PickHistory currentUser={currentUser} driverMap={driverMap} />
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
        <PickHistory currentUser={currentUser} driverMap={driverMap} />
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

        {step === 0 && <StepTopPick drivers={race.top_drivers} selected={topPick} onSelect={setTopPick} driverMap={driverMap} />}
        {step === 1 && <StepMidPicks drivers={race.mid_drivers} selected={midPicks} onToggle={toggleMidPick} driverMap={driverMap} />}
        {step === 2 && <StepFinishingOrder order={order} onReorder={setOrder} driverMap={driverMap} />}
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
