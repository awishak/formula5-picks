import { useState } from "react";

const DARK = "#1e1e2a", BLUE = "#6cb8e0", BLUEDARK = "#2a6fa8",
  GREEN = "#22cc66", RED = "#e04a4a", ORANGE = "#e08a2e",
  TEXT = "#1e1e2a", TEXT2 = "#6b6b80", BORDER = "#d8d2c4",
  GOLD = "#c9a820";
const FD = "'Geologica', sans-serif";
const FB = "'DM Sans', sans-serif";

export default function Strategy() {
  const [expanded, setExpanded] = useState(null);

  const strategies = [
    {
      id: "individual", icon: "🎯", title: "Optimize for Yourself",
      subtitle: "Maximize your individual score", color: BLUEDARK,
      content: `Your pit stop guess directly affects your individual Needle score (0–5 points). The closer your guess is to the actual fastest pit stop time, the more points you earn. If you're chasing the Players Championship, this is your priority.\n\nHow it works: Guess the exact pit stop time → 5 pts. Within ±0.1s → 4 pts. Within ±0.2s → 3 pts. Within ±0.3s → 2 pts. Within ±0.4s → 1 pt. More than ±0.4s off → 0 pts.\n\nThe selfish play: Research typical pit stop times for the circuit, look at practice data, and make your most accurate guess regardless of what your teammate or opponents guess. Every point counts in the individual standings.`
    },
    {
      id: "team", icon: "🤝", title: "Optimize for Your Team",
      subtitle: "Swing the BOX BOX line in your favor", color: GREEN,
      content: `The BOX BOX line is the average of all four players' pit stop guesses in your matchup. Your team is assigned either Over or Under. If the actual pit stop time lands on your team's side of the line, your team gets +5. If not, you get -1. That's a 6-point swing.\n\nThe team play: If your team has the Over, you want the line to be as LOW as possible — so guess low. If your team has the Under, guess HIGH to push the line up. You're trying to shift the average in your favor.\n\nThe tradeoff: Deliberately guessing away from the actual time will cost you Needle points individually. But the +5 team bonus (vs -1) is a massive 6-point swing that can decide your matchup.`
    },
    {
      id: "balanced", icon: "⚖️", title: "The Balanced Approach",
      subtitle: "A bit of both worlds", color: ORANGE,
      content: `Most experienced players try to find a sweet spot. They estimate the actual pit stop time, then nudge their guess slightly in the direction that helps their team's BOX BOX side.\n\nExample: You think the fastest pit stop will be 2.5 seconds. Your team has the Over. Instead of guessing exactly 2.5, you guess 2.2 or 2.3 — still close enough to earn 2–3 Needle points, but pulling the BOX BOX line down to give your team a better shot at the +5 bonus.\n\nWhen to lean individual: You're in a tight race for the Players Championship, or your team matchup is already a blowout either way. When to lean team: Your team matchup is close and the +5/-1 swing could decide it. Check the Schedule page — matchups outlined in green were decided by the BOX BOX line.`
    }
  ];

  return (
    <div style={{ padding: "20px 20px 100px" }}>
      <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 22, color: DARK, textTransform: "uppercase", letterSpacing: "0.03em", margin: "0 0 4px" }}>Strategy Guide</p>
      <p style={{ fontFamily: FB, fontSize: 13, color: TEXT2, marginBottom: 20 }}>
        How to approach the pit stop guess — your most strategic decision each week
      </p>

      <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, padding: 16, marginBottom: 20 }}>
        <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 11, color: TEXT, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>How It Works</p>
        <p style={{ fontFamily: FB, fontSize: 12, color: TEXT2, lineHeight: 1.6, margin: "0 0 10px" }}>
          Every week you guess the fastest pit stop time. This guess does <strong style={{ color: TEXT }}>two things</strong>:
        </p>
        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1, padding: 10, borderRadius: 10, background: `${BLUEDARK}06`, border: `1px solid ${BLUEDARK}15` }}>
            <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 10, color: BLUEDARK, margin: "0 0 4px" }}>1. NEEDLE SCORE</p>
            <p style={{ fontFamily: FB, fontSize: 11, color: TEXT2, margin: 0 }}>How close your guess is to the actual time → 0 to 5 individual points</p>
          </div>
          <div style={{ flex: 1, padding: 10, borderRadius: 10, background: `${GREEN}06`, border: `1px solid ${GREEN}15` }}>
            <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 10, color: GREEN, margin: "0 0 4px" }}>2. BOX BOX LINE</p>
            <p style={{ fontFamily: FB, fontSize: 11, color: TEXT2, margin: 0 }}>Avg of all 4 guesses in your matchup → your team gets +5 or -1</p>
          </div>
        </div>
        <p style={{ fontFamily: FB, fontSize: 12, color: TEXT2, lineHeight: 1.6, margin: 0 }}>
          The tension: guessing accurately helps <em>you</em>, but guessing strategically can help your <em>team</em>.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {strategies.map(s => (
          <div key={s.id}>
            <button onClick={() => setExpanded(expanded === s.id ? null : s.id)} style={{
              width: "100%", padding: "14px 16px", borderRadius: 14,
              border: `2px solid ${expanded === s.id ? s.color : BORDER}`,
              background: expanded === s.id ? `${s.color}06` : "#fff",
              cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12
            }}>
              <span style={{ fontSize: 24 }}>{s.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 14, color: TEXT, margin: 0 }}>{s.title}</p>
                <p style={{ fontFamily: FB, fontSize: 11, color: TEXT2, margin: "2px 0 0" }}>{s.subtitle}</p>
              </div>
              <span style={{ fontSize: 12, color: TEXT2, transform: expanded === s.id ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
            </button>
            {expanded === s.id && (
              <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderTop: "none", borderRadius: "0 0 14px 14px", padding: "14px 16px", marginTop: -2, fontFamily: FB, fontSize: 12.5, color: TEXT2, lineHeight: 1.7 }}>
                {s.content.split("\\n\\n").map((para, i) => (
                  <p key={i} style={{ margin: i === 0 ? 0 : "10px 0 0" }}>{para}</p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ background: `${GOLD}08`, borderRadius: 14, border: `1px solid ${GOLD}20`, padding: "14px 16px", marginTop: 20 }}>
        <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 11, color: GOLD, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px" }}>💡 Pro Tip</p>
        <p style={{ fontFamily: FB, fontSize: 12, color: TEXT2, lineHeight: 1.6, margin: 0 }}>
          Check the Schedule page after each race — matchups with a <strong style={{ color: GREEN }}>green outline</strong> were decided by the BOX BOX line. Use that to decide how aggressively to play the team angle.
        </p>
      </div>
    </div>
  );
}
