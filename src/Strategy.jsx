import { useState, useEffect } from "react";

const DARK = "#1e1e2a", BLUE = "#6cb8e0", BLUEDARK = "#2a6fa8",
  GREEN = "#22cc66", RED = "#e04a4a", ORANGE = "#e08a2e",
  TEXT = "#1e1e2a", TEXT2 = "#6b6b80", BORDER = "#d8d2c4",
  GOLD = "#c9a820";
const FD = "'Geologica', sans-serif";
const FB = "'DM Sans', sans-serif";

// 2025 driver numbers → team
const DRIVER_TEAM_2025 = {
  1: "Red Bull", 11: "Red Bull",
  4: "McLaren", 81: "McLaren",
  16: "Ferrari", 55: "Ferrari",
  44: "Mercedes", 63: "Mercedes",
  14: "Aston Martin", 18: "Aston Martin",
  23: "Williams", 2: "Williams",
  10: "Alpine", 31: "Alpine",
  22: "Racing Bulls", 30: "Racing Bulls",
  27: "Haas", 20: "Haas",
  77: "Sauber", 24: "Sauber",
};

// Team colors
const TEAM_COLORS = {
  "Red Bull": "#1E41FF", "McLaren": "#FF8700", "Ferrari": "#DC0000",
  "Mercedes": "#00D2BE", "Aston Martin": "#006F62", "Williams": "#005AFF",
  "Alpine": "#0090FF", "Racing Bulls": "#2B4562", "Haas": "#B6BABD",
  "Sauber": "#52E252",
};

function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function PitStopReference() {
  const [pitData, setPitData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");

  async function fetchPitData() {
    setLoading(true);
    setError(null);
    setStatusMsg("Finding 2025 race sessions...");

    try {
      const sessResp = await fetch("https://api.openf1.org/v1/sessions?year=2025&session_name=Race");
      const sessions = await sessResp.json();
      if (!Array.isArray(sessions) || sessions.length === 0) {
        throw new Error("No 2025 race sessions found");
      }

      const teamStops = {};

      for (let i = 0; i < sessions.length; i++) {
        const s = sessions[i];
        setStatusMsg(`Fetching pit stops: ${s.country_name || s.circuit_short_name} (${i + 1}/${sessions.length})`);

        const pitResp = await fetch(`https://api.openf1.org/v1/pit?session_key=${s.session_key}`);
        const pits = await pitResp.json();
        if (!Array.isArray(pits)) continue;

        pits.forEach(p => {
          if (!p.stop_duration || p.stop_duration > 10) return;
          const team = DRIVER_TEAM_2025[p.driver_number];
          if (!team) return;
          if (!teamStops[team]) teamStops[team] = [];
          teamStops[team].push(p.stop_duration);
        });

        if (i < sessions.length - 1) {
          await new Promise(r => setTimeout(r, 400));
        }
      }

      const teamStats = Object.entries(teamStops).map(([team, stops]) => ({
        team,
        avg: stops.reduce((a, b) => a + b, 0) / stops.length,
        median: percentile(stops, 50),
        fastest: Math.min(...stops),
        slowest: Math.max(...stops),
        p25: percentile(stops, 25),
        p75: percentile(stops, 75),
        count: stops.length,
        color: TEAM_COLORS[team] || TEXT2,
        stops,
      })).sort((a, b) => a.avg - b.avg);

      setPitData({ teamStats, totalStops: Object.values(teamStops).flat().length, totalRaces: sessions.length });
      setStatusMsg("");
    } catch (e) {
      console.error(e);
      setError(e.message);
      setStatusMsg("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, padding: 16, marginBottom: 20 }}>
      <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 12, color: TEXT, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>
        2025 Pit Stop Data
      </p>
      <p style={{ fontFamily: FB, fontSize: 11, color: TEXT2, margin: "0 0 12px" }}>
        Pit stop times by team from last season — use this to calibrate your Needle guesses.
      </p>

      {!pitData && !loading && (
        <button onClick={fetchPitData} style={{
          width: "100%", padding: "12px", borderRadius: 10,
          border: "none", background: BLUEDARK, fontFamily: FD,
          fontWeight: 700, fontSize: 12, color: "#fff", cursor: "pointer",
          textTransform: "uppercase", letterSpacing: "0.06em"
        }}>
          Load 2025 Pit Stop Data
        </button>
      )}

      {loading && (
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <p style={{ fontFamily: FD, fontWeight: 700, fontSize: 12, color: BLUEDARK, margin: "0 0 4px" }}>Loading...</p>
          <p style={{ fontFamily: FB, fontSize: 11, color: TEXT2, margin: 0 }}>{statusMsg}</p>
        </div>
      )}

      {error && (
        <p style={{ fontFamily: FB, fontSize: 11, color: RED, margin: "8px 0 0" }}>{error}</p>
      )}

      {pitData && (
        <div>
          <p style={{ fontFamily: FB, fontSize: 11, color: TEXT2, margin: "0 0 10px" }}>
            {pitData.totalStops} pit stops across {pitData.totalRaces} races
          </p>

          {/* Stats table */}
          <div>
            <div style={{ display: "flex", padding: "0 4px 6px", borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ width: 80 }}>
                <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 10, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.08em" }}>Team</span>
              </div>
              {["Best", "P25", "Med", "Avg", "P75", "Worst"].map(h => (
                <div key={h} style={{ flex: 1, textAlign: "center" }}>
                  <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 10, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
                </div>
              ))}
            </div>

            {pitData.teamStats.map((t, i) => (
              <div key={t.team} style={{
                display: "flex", alignItems: "center", padding: "7px 4px",
                borderBottom: i < pitData.teamStats.length - 1 ? `1px solid ${BORDER}20` : "none",
                background: i % 2 === 0 ? `${DARK}03` : "transparent"
              }}>
                <div style={{ width: 80, display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 3, height: 14, borderRadius: 1.5, background: t.color }} />
                  <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 12, color: TEXT }}>{t.team}</span>
                </div>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 11, color: GREEN }}>{t.fastest.toFixed(2)}</span>
                </div>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <span style={{ fontFamily: FD, fontWeight: 600, fontSize: 11, color: TEXT2 }}>{t.p25.toFixed(2)}</span>
                </div>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 11, color: BLUEDARK }}>{t.median.toFixed(2)}</span>
                </div>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 12, color: DARK }}>{t.avg.toFixed(2)}</span>
                </div>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <span style={{ fontFamily: FD, fontWeight: 600, fontSize: 11, color: TEXT2 }}>{t.p75.toFixed(2)}</span>
                </div>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 11, color: RED }}>{t.slowest.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>

          <button onClick={() => setPitData(null)} style={{
            marginTop: 12, padding: "6px 12px", borderRadius: 8,
            border: `1px solid ${BORDER}`, background: "#fff",
            fontFamily: FB, fontSize: 11, color: TEXT2, cursor: "pointer"
          }}>
            Clear data
          </button>
        </div>
      )}
    </div>
  );
}

function Pts({ children, type }) {
  const c = type === "negative" ? RED : type === "team" ? GREEN : ORANGE;
  return <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 12, color: c, background: `${c}12`, padding: "2px 7px", borderRadius: 6, whiteSpace: "nowrap" }}>{children}</span>;
}

export default function Strategy() {
  const [expanded, setExpanded] = useState(null);

  function StrategyIndividual() {
    return (
      <div style={{ fontFamily: FB, fontSize: 13, color: TEXT2, lineHeight: 1.7 }}>
        <p style={{ margin: 0 }}>Your pit stop guess directly affects your individual Needle score (<Pts>0–5 pts</Pts>). The closer your guess is to the actual pit stop time, the more points you earn. If you're chasing the Players Championship, this is your priority.</p>
        <p style={{ margin: "10px 0 0" }}>How it works: Guess the exact pit stop time → <Pts>+5</Pts>. Within ±0.1s → <Pts>+4</Pts>. Within ±0.2s → <Pts>+3</Pts>. Within ±0.3s → <Pts>+2</Pts>. Within ±0.4s → <Pts>+1</Pts>. More than ±0.4s off → <Pts type="negative">0</Pts>.</p>
        <p style={{ margin: "10px 0 0" }}>The selfish play: Research typical pit stop times for the circuit, look at practice data, and make your most accurate guess regardless of what your teammate or opponents guess. Every point counts in the individual standings.</p>
      </div>
    );
  }

  function StrategyTeam() {
    return (
      <div style={{ fontFamily: FB, fontSize: 13, color: TEXT2, lineHeight: 1.7 }}>
        <p style={{ margin: 0 }}>The BOX BOX line is the average of all four players' pit stop guesses in your matchup. Your team is assigned either Over or Under. If the actual pit stop time lands on your team's side of the line, your team gets <Pts type="team">+5 team</Pts>. If not, you get <Pts type="negative">−1 team</Pts>. That's a 6-point swing.</p>
        <p style={{ margin: "10px 0 0" }}>The team play: If your team has the Over, you want the line to be as LOW as possible — so guess low. If your team has the Under, guess HIGH to push the line up. You're trying to shift the average in your favor.</p>
        <p style={{ margin: "10px 0 0" }}>The tradeoff: Deliberately guessing away from the actual time will cost you Needle points individually. But the <Pts type="team">+5</Pts> team bonus (vs <Pts type="negative">−1</Pts>) is a massive 6-point swing that can decide your matchup.</p>
      </div>
    );
  }

  function StrategyBalanced() {
    return (
      <div style={{ fontFamily: FB, fontSize: 13, color: TEXT2, lineHeight: 1.7 }}>
        <p style={{ margin: 0 }}>Most experienced players try to find a sweet spot. They estimate the actual pit stop time, then nudge their guess slightly in the direction that helps their team's BOX BOX side.</p>
        <p style={{ margin: "10px 0 0" }}>Example: You think the pit stop will be 2.5 seconds. Your team has the Over. Instead of guessing exactly 2.5, you guess 2.2 or 2.3 — still close enough to earn <Pts>+2</Pts> or <Pts>+3</Pts> Needle points, but pulling the BOX BOX line down to give your team a better shot at the <Pts type="team">+5 team bonus</Pts>.</p>
        <p style={{ margin: "10px 0 0" }}>When to lean individual: You're in a tight race for the Players Championship, or your team matchup is already a blowout either way. When to lean team: Your team matchup is close and the <Pts type="team">+5</Pts> / <Pts type="negative">−1</Pts> swing could decide it. Check the Schedule page — matchups outlined in green were decided by the BOX BOX line.</p>
      </div>
    );
  }

  const strategies = [
    {
      id: "individual", title: "Optimize for Yourself",
      subtitle: "Maximize your individual score", color: BLUEDARK,
      component: StrategyIndividual
    },
    {
      id: "team", title: "Optimize for Your Team",
      subtitle: "Swing the BOX BOX line in your favor", color: GREEN,
      component: StrategyTeam
    },
    {
      id: "balanced", title: "The Balanced Approach",
      subtitle: "A bit of both worlds", color: ORANGE,
      component: StrategyBalanced
    }
  ];

  return (
    <div style={{ padding: "20px 20px 100px" }}>
      <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 22, color: DARK, textTransform: "uppercase", letterSpacing: "0.03em", margin: "0 0 4px" }}>Strategy Guide</p>
      <p style={{ fontFamily: FB, fontSize: 13, color: TEXT2, marginBottom: 20 }}>
        How to approach the pit stop guess — your most strategic decision each week
      </p>

      <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, padding: 16, marginBottom: 20 }}>
        <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 12, color: TEXT, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>How It Works</p>
        <p style={{ fontFamily: FB, fontSize: 13, color: TEXT2, lineHeight: 1.6, margin: "0 0 10px" }}>
          Every week you guess the pit stop time. This guess does <strong style={{ color: TEXT }}>two things</strong>:
        </p>
        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1, padding: 10, borderRadius: 10, background: `${BLUEDARK}06`, border: `1px solid ${BLUEDARK}15` }}>
            <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 11, color: BLUEDARK, margin: "0 0 4px" }}>1. NEEDLE SCORE</p>
            <p style={{ fontFamily: FB, fontSize: 12, color: TEXT2, margin: "0 0 6px" }}>How close your guess is to the actual time → <Pts>0 to 5 pts</Pts></p>
            <p style={{ fontFamily: FB, fontSize: 10, color: BLUEDARK, margin: 0, fontStyle: "italic" }}>Only counts towards individual standings</p>
          </div>
          <div style={{ flex: 1, padding: 10, borderRadius: 10, background: `${GREEN}06`, border: `1px solid ${GREEN}15` }}>
            <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 11, color: GREEN, margin: "0 0 4px" }}>2. BOX BOX LINE</p>
            <p style={{ fontFamily: FB, fontSize: 12, color: TEXT2, margin: "0 0 6px" }}>Avg of all 4 guesses in your matchup → <Pts type="team">+5</Pts> or <Pts type="negative">−1</Pts></p>
            <p style={{ fontFamily: FB, fontSize: 10, color: GREEN, margin: 0, fontStyle: "italic" }}>Only counts towards your team's matchup</p>
          </div>
        </div>
        <p style={{ fontFamily: FB, fontSize: 13, color: TEXT2, lineHeight: 1.6, margin: 0 }}>
          The tension: guessing accurately helps <em>you</em>, but guessing strategically can help your <em>team</em>.
        </p>
      </div>

      {/* Pit Stop Historical Data */}
      <PitStopReference />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {strategies.map(s => {
          const Comp = s.component;
          return (
            <div key={s.id}>
              <button onClick={() => setExpanded(expanded === s.id ? null : s.id)} style={{
                width: "100%", padding: "14px 16px", borderRadius: 14,
                border: `2px solid ${expanded === s.id ? s.color : BORDER}`,
                background: expanded === s.id ? `${s.color}06` : "#fff",
                cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12
              }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 14, color: TEXT, margin: 0 }}>{s.title}</p>
                  <p style={{ fontFamily: FB, fontSize: 12, color: TEXT2, margin: "2px 0 0" }}>{s.subtitle}</p>
                </div>
                <span style={{ fontSize: 12, color: TEXT2, transform: expanded === s.id ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
              </button>
              {expanded === s.id && (
                <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderTop: "none", borderRadius: "0 0 14px 14px", padding: "14px 16px", marginTop: -2 }}>
                  <Comp />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ background: `${GOLD}08`, borderRadius: 14, border: `1px solid ${GOLD}20`, padding: "14px 16px", marginTop: 20 }}>
        <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 12, color: GOLD, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px" }}>Pro Tip</p>
        <p style={{ fontFamily: FB, fontSize: 13, color: TEXT2, lineHeight: 1.6, margin: 0 }}>
          Check the Schedule page after each race — matchups with a <strong style={{ color: GREEN }}>green outline</strong> were decided by the BOX BOX line. Use that to decide how aggressively to play the team angle.
        </p>
      </div>
    </div>
  );
}
