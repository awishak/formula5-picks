import { useState } from "react";

const DARK = "#1e1e2a", BLUE = "#6cb8e0", BLUEDARK = "#2a6fa8",
  ORANGE = "#e08a2e", GREEN = "#22cc66", RED = "#e04a4a",
  TEXT = "#1e1e2a", TEXT2 = "#6b6b80", BORDER = "#d8d2c4",
  GOLD = "#c9a820", PURPLE = "#7c5cbf";
const FD = "'Geologica', sans-serif";
const FB = "'DM Sans', sans-serif";

// Collapsible section
function Section({ title, icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      background: "#fff", borderRadius: 14, overflow: "hidden",
      border: `1px solid ${BORDER}`, marginBottom: 10,
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", padding: "14px 16px",
          display: "flex", alignItems: "center", gap: 10,
          background: "transparent", border: "none", cursor: "pointer",
          textAlign: "left"
        }}
      >
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{
          fontFamily: FD, fontWeight: 800, fontSize: 14, color: DARK,
          flex: 1, textTransform: "uppercase", letterSpacing: "0.04em"
        }}>{title}</span>
        <span style={{
          fontSize: 12, color: TEXT2, transition: "transform 0.2s",
          transform: open ? "rotate(180deg)" : "rotate(0deg)"
        }}>▼</span>
      </button>
      {open && (
        <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${BORDER}40` }}>
          {children}
        </div>
      )}
    </div>
  );
}

// Points table row
function PtsRow({ left, right, highlight }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "4px 0", borderBottom: `1px solid ${BORDER}20`
    }}>
      <span style={{ fontFamily: FB, fontSize: 12, color: TEXT }}>{left}</span>
      <span style={{
        fontFamily: FD, fontWeight: 800, fontSize: 12,
        color: highlight === "red" ? RED : highlight === "orange" ? ORANGE : BLUEDARK
      }}>{right}</span>
    </div>
  );
}

// Inline badge
function Badge({ text, color = BLUEDARK, bg }) {
  return (
    <span style={{
      fontFamily: FD, fontWeight: 700, fontSize: 10, color,
      background: bg || `${color}15`, padding: "2px 7px", borderRadius: 5,
      display: "inline-block", verticalAlign: "middle", marginLeft: 3
    }}>{text}</span>
  );
}

function P({ children, style }) {
  return (
    <p style={{
      fontFamily: FB, fontSize: 12.5, color: TEXT, lineHeight: 1.65,
      margin: "8px 0", ...style
    }}>{children}</p>
  );
}

function Label({ children }) {
  return (
    <p style={{
      fontFamily: FD, fontWeight: 700, fontSize: 11, color: BLUEDARK,
      textTransform: "uppercase", letterSpacing: "0.06em",
      margin: "14px 0 4px"
    }}>{children}</p>
  );
}

export default function Rules() {
  return (
    <div style={{ padding: "20px 20px 100px" }}>
      <p style={{
        fontFamily: FD, fontWeight: 900, fontSize: 22, color: DARK,
        textTransform: "uppercase", letterSpacing: "0.03em", margin: "0 0 4px"
      }}>
        Rules & Scoring
      </p>
      <p style={{ fontFamily: FB, fontSize: 13, color: TEXT2, marginBottom: 20 }}>
        Everything you need to know about Formula Pick'em
      </p>

      {/* SCHEDULE */}
      <Section title="Weekly Schedule" icon="📅" defaultOpen={true}>
        <P>Picks open every <strong>Tuesday at noon</strong> and lock on <strong>Friday at noon</strong>. If you don't submit by the deadline, you receive <Badge text="0 PTS" color={RED} /> for that race.</P>
        <P>The season runs <strong>24 races</strong> split into two halves of 12. Team standings reset between halves. Individual (Formula 50) standings run all 24 races.</P>
      </Section>

      {/* HOW TO WIN */}
      <Section title="How to Win" icon="🏆" defaultOpen={true}>
        <Label>Players Championship</Label>
        <P>Your Individual Score each race is your total points. The player with the most total points after 24 races wins. Additionally, the <strong>top 10 players each week</strong> earn bonus points: 1st gets <Badge text="+10" color={ORANGE} />, 2nd <Badge text="+9" color={ORANGE} />, down to 10th getting <Badge text="+1" color={ORANGE} />.</P>

        <Label>Team Championship</Label>
        <P>Win your weekly matchup against another team. Accumulate Team Points across each 12-race half. The team with the most points in the <strong>second half</strong> is the overall season champion. The first half determines your division for the second half.</P>
      </Section>

      {/* THE PICKS */}
      <Section title="The Picks" icon="🎯">
        <Label>1. Top Pick</Label>
        <P>Choose <strong>1 driver</strong> from the top 5 in the F1 championship standings. You earn the F1 points they score in the race:</P>
        <div style={{
          background: `${DARK}04`, borderRadius: 10, padding: "8px 12px", margin: "8px 0"
        }}>
          <PtsRow left="P1" right="+25" highlight="orange" />
          <PtsRow left="P2" right="+18" highlight="orange" />
          <PtsRow left="P3" right="+15" highlight="orange" />
          <PtsRow left="P4" right="+12" highlight="orange" />
          <PtsRow left="P5" right="+10" highlight="orange" />
          <PtsRow left="P6" right="+8" />
          <PtsRow left="P7" right="+6" />
          <PtsRow left="P8" right="+4" />
          <PtsRow left="P9" right="+2" />
          <PtsRow left="P10" right="+1" />
          <PtsRow left="P11+" right="0" />
          <PtsRow left="DNF" right="−1" highlight="red" />
        </div>

        <Label>2. Midfield Picks</Label>
        <P>Choose <strong>4 drivers</strong> from positions P6–P15 in the championship standings. You earn each driver's F1 race points using the same table above. Midfield picks can finish anywhere in the race — they're only restricted by championship standing at selection time.</P>

        <Label>3. Finishing Order</Label>
        <P>Arrange all 5 of your drivers in predicted finishing order. Get it exactly right: <Badge text="+6 BONUS" color={ORANGE} />. Wrong order? You keep all driver points — you just miss the bonus.</P>
        <P style={{ fontSize: 11.5, color: TEXT2 }}>
          <strong>DNF rule:</strong> All DNFs are tied past P22. If you predicted DNF drivers at the back, they're interchangeable — you can still earn the bonus as long as non-DNF drivers are in the correct order.
        </P>

        <Label>4. Best Finish</Label>
        <P>Predict where your single best-finishing driver will place (P1–P20). Exactly right: <Badge text="+3 BONUS" color={ORANGE} />.</P>
      </Section>

      {/* THE NEEDLE */}
      <Section title="The Needle 🏎️" icon="⏱️">
        <P>Each race designates a specific pit stop to bet on (e.g. "Red Bull Racing's 1st pit stop"). Guess the duration in seconds using the dial (1.5s – 4.0s).</P>
        <div style={{
          background: `${DARK}04`, borderRadius: 10, padding: "8px 12px", margin: "8px 0"
        }}>
          <PtsRow left="Exact" right="+5" highlight="orange" />
          <PtsRow left="±0.1s" right="+4" highlight="orange" />
          <PtsRow left="±0.2s" right="+3" highlight="orange" />
          <PtsRow left="±0.3s" right="+2" />
          <PtsRow left="±0.4s" right="+1" />
          <PtsRow left="Beyond ±0.4s" right="0" />
        </div>
        <P style={{ fontSize: 11.5, color: TEXT2 }}>
          <strong>Important:</strong> The needle only counts toward your Individual Score. It does <strong>not</strong> count toward your Matchup Score.
        </P>
      </Section>

      {/* INDIVIDUAL SCORE */}
      <Section title="Individual Score" icon="👤">
        <P>Your Individual Score each week is the sum of:</P>
        <div style={{
          background: `${DARK}04`, borderRadius: 10, padding: "10px 12px", margin: "8px 0"
        }}>
          <PtsRow left="Top Pick (F1 points)" right="0–25" />
          <PtsRow left="4 Midfield Picks (F1 points)" right="0–72" />
          <PtsRow left="Finishing Order bonus" right="0 or +6" />
          <PtsRow left="Best Finish bonus" right="0 or +3" />
          <PtsRow left="Pit Stop needle" right="0–5" />
          <div style={{
            display: "flex", justifyContent: "space-between", padding: "6px 0 2px",
            marginTop: 4, borderTop: `1px solid ${BORDER}`
          }}>
            <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 13, color: DARK }}>Theoretical Maximum</span>
            <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 13, color: ORANGE }}>114 pts</span>
          </div>
        </div>
      </Section>

      {/* FORMULA 50 */}
      <Section title="Player Standings" icon="📊">
        <P>After each race, all players across both divisions are ranked by Individual Score on a single unified leaderboard.</P>
        <P>The <strong>top 10 players</strong> each week earn bonus points: 1st gets <Badge text="+10" color={ORANGE} />, 2nd gets <Badge text="+9" color={ORANGE} />, and so on down to 10th getting <Badge text="+1" color={ORANGE} />. Non-submitters get <Badge text="0 PTS" color={RED} />.</P>
        <P>Player standings accumulate across <strong>all 24 races</strong> and never reset.</P>

        <Label>Weekly Tiebreakers (in order)</Label>
        <div style={{
          background: `${DARK}04`, borderRadius: 10, padding: "8px 12px", margin: "8px 0"
        }}>
          <PtsRow left="1. Score without the needle" right="" />
          <PtsRow left="2. Got finishing order right?" right="" />
          <PtsRow left="3. Earlier submission time" right="" />
        </div>

        <Label>Season Tiebreaker</Label>
        <P>If tied at season's end, the tiebreaker is total <strong>Prediction Index</strong> — the raw sum of all Individual Scores earned across every race.</P>
      </Section>

      {/* TEAMS & BOX BOX */}
      <Section title="Teams & The BOX BOX Line" icon="📦">
        <P>Players are organized into <strong>2-player teams</strong>. Each race, your team faces another team in a round-robin schedule. There are two divisions — <Badge text="CHAMPIONSHIP" color={GOLD} bg={`${GOLD}15`} /> and <Badge text="SECOND DIVISION" color={PURPLE} bg={`${PURPLE}15`} /> — each with 12 teams.</P>

        <Label>The BOX BOX Line</Label>
        <P>Each matchup has a BOX BOX Line: the <strong>average of all 4 players' pit stop guesses</strong> that week. One team is assigned OVER and the other UNDER. If the actual pit stop lands on your side, your team earns the bonus.</P>

        <Label>Strategy</Label>
        <P>Your guess moves the line. If you're the <Badge text="UNDER" color={PURPLE} bg={`${PURPLE}15`} />, guessing <strong>high</strong> pushes the line up and gives your team more room. If you're the <Badge text="OVER" color={GOLD} bg={`${GOLD}15`} />, guessing <strong>low</strong> pulls it down. You're always choosing between hunting needle points and gaming the line for your team.</P>
      </Section>

      {/* MATCHUP SCORE */}
      <Section title="Matchup Score" icon="⚔️">
        <P><strong>Matchup Score</strong> = Player 1's score (no needle) + Player 2's score (no needle) + BOX BOX Line bonus</P>
        <div style={{
          background: `${DARK}04`, borderRadius: 10, padding: "8px 12px", margin: "8px 0"
        }}>
          <PtsRow left="Correct side of the line" right="+5" highlight="orange" />
          <PtsRow left="Wrong side of the line" right="−1" highlight="red" />
        </div>
        <P>The team with the higher Matchup Score wins the week.</P>
      </Section>

      {/* TEAM STANDINGS */}
      <Section title="Team Championship" icon="🏁">
        <P>Each division has its own standings. After each race, the 6 winning teams are ranked by Matchup Score, then the 6 losing teams by Matchup Score. Points are awarded:</P>
        <div style={{
          background: `${DARK}04`, borderRadius: 10, padding: "8px 12px", margin: "8px 0"
        }}>
          <PtsRow left="1st (best winner)" right="25" highlight="orange" />
          <PtsRow left="2nd" right="18" highlight="orange" />
          <PtsRow left="3rd" right="15" highlight="orange" />
          <PtsRow left="4th" right="12" />
          <PtsRow left="5th" right="10" />
          <PtsRow left="6th" right="8" />
          <PtsRow left="7th (best loser)" right="6" />
          <PtsRow left="8th" right="4" />
          <PtsRow left="9th" right="2" />
          <PtsRow left="10th" right="1" />
          <PtsRow left="11th" right="0" />
          <PtsRow left="12th" right="0" />
        </div>
        <P style={{ fontSize: 11.5, color: TEXT2 }}>If two teams tie their matchup, they're placed between winners and losers at 6th and 7th. The team with the correct BOX BOX side is ranked ahead.</P>

        <Label>Weekly Tiebreakers (within winners or losers)</Label>
        <div style={{
          background: `${DARK}04`, borderRadius: 10, padding: "8px 12px", margin: "8px 0"
        }}>
          <PtsRow left="1. Got BOX BOX Line correct" right="" />
          <PtsRow left="2. Lower player's individual matchup score" right="" />
          <PtsRow left="3. How many got finishing order right" right="" />
          <PtsRow left="4. Earlier average submission time" right="" />
        </div>

        <Label>Season Tiebreaker</Label>
        <P>1. Total wins → 2. Average Matchup Score to one decimal place.</P>
      </Section>

      {/* SEASON STRUCTURE */}
      <Section title="Season Structure" icon="📆">
        <P>Each half is <strong>12 races</strong>. Team standings reset between halves. Formula 50 does <strong>not</strong> reset.</P>
        <P>The second half champion — the team with the most Team Points in the second half — is the <strong>overall season champion</strong>. The first half determines your division for the second half.</P>

        <Label>Final Race of Each Half</Label>
        <P>Standings going into the last race determine matchups: #1 vs #12, #2 vs #11, #3 vs #10, and so on. Every team has something to play for on the final weekend.</P>
      </Section>

      {/* PROMOTION & RELEGATION */}
      <Section title="Promotion & Relegation" icon="↕️">
        <P>Race Week 12 serves as both the regular season finale and the promotion/relegation playoff weekend.</P>

        <Label>Automatic</Label>
        <div style={{
          background: `${GREEN}08`, borderRadius: 10, padding: "10px 12px", margin: "8px 0",
          border: `1px solid ${GREEN}25`
        }}>
          <P style={{ margin: "0 0 4px" }}>⬆️ <strong>Top 3 in Second Division</strong> → automatically promoted to Championship</P>
          <P style={{ margin: 0 }}>⬇️ <strong>Bottom 3 in Championship</strong> (10th, 11th, 12th) → automatically relegated to Second Division</P>
        </div>

        <Label>Playoff Matches</Label>
        <div style={{
          background: `${ORANGE}08`, borderRadius: 10, padding: "10px 12px", margin: "8px 0",
          border: `1px solid ${ORANGE}25`
        }}>
          <P style={{ margin: "0 0 4px" }}>🔥 <strong>#4 and #5 in Second Division</strong> play a promotion playoff during Race Week 12</P>
          <P style={{ margin: 0 }}>🔥 <strong>#8 and #9 in Championship</strong> play a relegation playoff during Race Week 12</P>
        </div>

        <P style={{ fontSize: 11.5, color: TEXT2 }}>
          The other 20 teams play Race Week 12 normally. All 4 playoff teams still earn Formula 50 points that week.
        </P>

        <Label>Playoff Scoring</Label>
        <P>No OVER/UNDER in the playoff. The higher-ranked team automatically gets <Badge text="+5 PTS" color={ORANGE} /> as a seeding advantage. Unlike normal weeks, <strong>pit stop needle points are included</strong> in the matchup score. If tied, the higher seed advances.</P>
      </Section>
    </div>
  );
}
