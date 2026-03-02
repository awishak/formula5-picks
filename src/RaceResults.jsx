import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const DARK = "#1e1e2a", BLUE = "#6cb8e0", BLUEDARK = "#2a6fa8",
  GREEN = "#22cc66", RED = "#e04a4a", ORANGE = "#e08a2e",
  TEXT = "#1e1e2a", TEXT2 = "#6b6b80", BORDER = "#d8d2c4",
  GOLD = "#c9a820", SILVER = "#a0a0a0";
const FD = "'Geologica', sans-serif";
const FB = "'DM Sans', sans-serif";

const WEEKLY_BONUS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

function shortName(name) {
  if (!name) return "?";
  const parts = name.split(" ");
  return parts.length >= 2 ? `${parts[0][0]}. ${parts[parts.length - 1]}` : name;
}
function lastName(name) {
  if (!name) return "?";
  return name.split(" ").pop();
}

export default function RaceResults({ currentUser }) {
  const [races, setRaces] = useState([]);
  const [selectedRound, setSelectedRound] = useState(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("individual");

  useEffect(() => {
    async function loadRaces() {
      const { data: racesData } = await supabase
        .from("races").select("id, race_name, round").order("round", { ascending: true });
      
      // Find which races have scores
      const { data: scoresData } = await supabase.from("scores").select("race_id");
      const scoredRaceIds = new Set((scoresData || []).map(s => s.race_id));
      
      const scored = (racesData || []).filter(r => scoredRaceIds.has(r.id));
      setRaces(scored);
      if (scored.length > 0) setSelectedRound(scored[scored.length - 1].round);
      setLoading(false);
    }
    loadRaces();
  }, []);

  // Load data when round changes
  useEffect(() => {
    if (!selectedRound) return;
    async function loadRound() {
      const race = races.find(r => r.round === selectedRound);
      if (!race) return;

      const [
        { data: scores },
        { data: picks },
        { data: players },
        { data: teams },
        { data: schedule },
        { data: results }
      ] = await Promise.all([
        supabase.from("scores").select("*").eq("race_id", race.id),
        supabase.from("picks").select("*").eq("race_id", race.id),
        supabase.from("players").select("id, name"),
        supabase.from("teams").select("*"),
        supabase.from("schedule").select("id, race_id, home_team_id, away_team_id").eq("race_id", race.id),
        supabase.from("results").select("*").eq("race_id", race.id).single()
      ]);

      const playerMap = {};
      (players || []).forEach(p => { playerMap[p.id] = p.name; });

      const picksMap = {};
      (picks || []).forEach(pk => { picksMap[pk.player_id] = pk; });

      const scoresMap = {};
      (scores || []).forEach(s => { scoresMap[s.player_id] = s; });

      // Collect all picked drivers
      const allPickedDrivers = new Set();
      (picks || []).forEach(pk => {
        (pk.finishing_order || []).forEach(d => allPickedDrivers.add(d));
      });

      // Sort picked drivers by finishing position from results
      const finishOrder = results?.finishing_order || [];
      const topDriver = results?.top_driver;
      const pitTime = results?.pit_stop_time;

      // Build individual table
      const playerScores = (scores || []).map(s => {
        const pick = picksMap[s.player_id];
        const rawDP = s.driver_pts;
        const driverPts = typeof rawDP === "string" ? JSON.parse(rawDP) : (rawDP || {});
        const total = (s.top_pick_pts || 0) + (s.midfield_pts || 0) + (s.order_bonus || 0) +
          (s.best_finish_bonus || 0) + (s.pit_individual_pts || 0) + (s.weekly_bonus_pts || 0);

        return {
          playerId: s.player_id,
          playerName: playerMap[s.player_id] || "?",
          driverPts,
          topPickPts: s.top_pick_pts || 0,
          midfieldPts: s.midfield_pts || 0,
          orderBonus: s.order_bonus || 0,
          bestFinishBonus: s.best_finish_bonus || 0,
          pitIndividualPts: s.pit_individual_pts || 0,
          weeklyBonusPts: s.weekly_bonus_pts || 0,
          totalPts: total,
          topPick: pick?.top_pick,
          pitGuess: pick?.pit_guess,
          bestFinishGuess: pick?.best_finish
        };
      }).sort((a, b) => b.totalPts - a.totalPts);

      // Sort picked drivers by results order
      const sortedDrivers = [...allPickedDrivers].sort((a, b) => {
        const posA = finishOrder.indexOf(a);
        const posB = finishOrder.indexOf(b);
        return (posA === -1 ? 999 : posA) - (posB === -1 ? 999 : posB);
      });

      // Build team table
      const teamScores = (schedule || []).map(matchup => {
        const homeTeam = (teams || []).find(t => t.id === matchup.home_team_id);
        const awayTeam = (teams || []).find(t => t.id === matchup.away_team_id);
        if (!homeTeam || !awayTeam) return null;

        const scoreNoNeedle = (pid) => {
          const s = scoresMap[pid];
          if (!s) return 0;
          return (s.top_pick_pts || 0) + (s.midfield_pts || 0) + (s.order_bonus || 0) + (s.best_finish_bonus || 0);
        };

        const homeP1Score = scoreNoNeedle(homeTeam.player1_id);
        const homeP2Score = scoreNoNeedle(homeTeam.player2_id);
        const awayP1Score = scoreNoNeedle(awayTeam.player1_id);
        const awayP2Score = scoreNoNeedle(awayTeam.player2_id);

        const homeBoxBox = scoresMap[homeTeam.player1_id]?.pit_matchup_pts || 0;
        const awayBoxBox = scoresMap[awayTeam.player1_id]?.pit_matchup_pts || 0;

        const homeTotal = homeP1Score + homeP2Score + homeBoxBox;
        const awayTotal = awayP1Score + awayP2Score + awayBoxBox;

        // BOX BOX line
        const allFour = [homeTeam.player1_id, homeTeam.player2_id, awayTeam.player1_id, awayTeam.player2_id];
        const guesses = allFour.map(pid => picksMap[pid]?.pit_guess).filter(g => g != null);
        const boxLine = guesses.length > 0 ? guesses.reduce((a, b) => a + b, 0) / guesses.length : null;

        return {
          homeTeam: homeTeam.name, awayTeam: awayTeam.name,
          homeDiv: homeTeam.division || "second",
          awayDiv: awayTeam.division || "second",
          homeP1: playerMap[homeTeam.player1_id], homeP1Score,
          homeP2: playerMap[homeTeam.player2_id], homeP2Score,
          awayP1: playerMap[awayTeam.player1_id], awayP1Score,
          awayP2: playerMap[awayTeam.player2_id], awayP2Score,
          homeBoxBox, awayBoxBox, homeTotal, awayTotal,
          boxLine: boxLine ? boxLine.toFixed(2) : "N/A",
          homeWon: homeTotal > awayTotal,
          awayWon: awayTotal > homeTotal
        };
      }).filter(Boolean);

      setData({
        race, playerScores, teamScores, sortedDrivers,
        topDriver, pitTime, finishOrder
      });
    }
    loadRound();
  }, [selectedRound, races]);

  if (loading) return (
    <div style={{ padding: "60px 20px", textAlign: "center" }}>
      <p style={{ fontFamily: FB, fontSize: 14, color: TEXT2 }}>Loading…</p>
    </div>
  );

  if (races.length === 0) return (
    <div style={{ padding: "60px 20px", textAlign: "center" }}>
      <p style={{ fontFamily: FB, fontSize: 14, color: TEXT2 }}>No scored races yet</p>
    </div>
  );

  const selectedRace = races.find(r => r.round === selectedRound);

  return (
    <div style={{ padding: "20px 20px 100px" }}>
      <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 22, color: DARK, textTransform: "uppercase", letterSpacing: "0.03em", margin: "0 0 4px" }}>
        Race Results
      </p>
      <p style={{ fontFamily: FB, fontSize: 13, color: TEXT2, marginBottom: 16 }}>
        Detailed breakdown for each scored race
      </p>

      {/* Round pills */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none", marginBottom: 16 }}>
        {races.map(r => (
          <button key={r.round} onClick={() => setSelectedRound(r.round)} style={{
            flexShrink: 0, padding: "8px 14px", borderRadius: 20,
            border: `1px solid ${selectedRound === r.round ? DARK : BORDER}`,
            background: selectedRound === r.round ? DARK : "#fff",
            color: selectedRound === r.round ? "#fff" : TEXT2,
            fontFamily: FD, fontWeight: 700, fontSize: 12, cursor: "pointer"
          }}>
            R{r.round} — {r.race_name}
          </button>
        ))}
      </div>

      {/* Race info */}
      {data && (
        <div style={{
          background: "#fff", borderRadius: 12, border: `1px solid ${BORDER}`,
          padding: "12px 14px", marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap"
        }}>
          <div>
            <p style={{ fontFamily: FB, fontSize: 9, color: TEXT2, margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>Winner</p>
            <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 14, color: DARK, margin: "2px 0 0" }}>🏆 {data.topDriver}</p>
          </div>
          <div>
            <p style={{ fontFamily: FB, fontSize: 9, color: TEXT2, margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>Pit Stop</p>
            <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 14, color: DARK, margin: "2px 0 0" }}>🏎️ {data.pitTime}s</p>
          </div>
          <div>
            <p style={{ fontFamily: FB, fontSize: 9, color: TEXT2, margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>Top 5</p>
            <p style={{ fontFamily: FB, fontSize: 11, color: TEXT, margin: "2px 0 0" }}>
              {(data.finishOrder || []).slice(0, 5).map(d => lastName(d)).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[["individual", "Individual"], ["teams", "Team Matchups"]].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)} style={{
            flex: 1, padding: "10px 8px", borderRadius: 10,
            border: `2px solid ${activeTab === id ? BLUEDARK : BORDER}`,
            background: activeTab === id ? BLUEDARK : "#fff",
            fontFamily: FD, fontWeight: 700, fontSize: 12,
            color: activeTab === id ? "#fff" : TEXT2,
            cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.04em"
          }}>{label}</button>
        ))}
      </div>

      {/* Individual Table */}
      {data && activeTab === "individual" && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", fontFamily: FB, fontSize: 10, whiteSpace: "nowrap", width: "100%" }}>
            <thead>
              <tr style={{ background: `${DARK}08` }}>
                <th style={thStyle}>#</th>
                <th style={thStyle}>Player</th>
                <th style={{ ...thStyle, color: BLUEDARK }}>Total</th>
                {data.sortedDrivers.map(d => (
                  <th key={d} style={{ ...thStyle, maxWidth: 50 }}>{lastName(d)}</th>
                ))}
                <th style={thStyle}>Order</th>
                <th style={thStyle}>Best</th>
                <th style={thStyle}>Needle</th>
                <th style={{ ...thStyle, color: GREEN }}>Top 10</th>
              </tr>
            </thead>
            <tbody>
              {data.playerScores.map((s, i) => {
                const isMe = s.playerName === currentUser;
                return (
                  <tr key={s.playerId} style={{
                    background: isMe ? `${BLUE}10` : i % 2 === 0 ? "#fff" : `${DARK}03`,
                    borderBottom: `1px solid ${BORDER}30`
                  }}>
                    <td style={{ ...tdStyle, fontFamily: FD, fontWeight: 800, color: TEXT2 }}>{i + 1}</td>
                    <td style={{ ...tdStyle, fontWeight: isMe ? 700 : 500, color: isMe ? BLUEDARK : TEXT, minWidth: 90 }}>
                      {shortName(s.playerName)}{isMe ? " ⭐" : ""}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 800, color: BLUEDARK, fontFamily: FD, fontSize: 12 }}>
                      {s.totalPts}
                    </td>
                    {data.sortedDrivers.map(d => {
                      const pts = s.driverPts[d];
                      const isTop = d === s.topPick;
                      return (
                        <td key={d} style={{
                          ...tdStyle,
                          color: pts === undefined ? `${BORDER}` : pts < 0 ? RED : pts > 0 ? ORANGE : TEXT2,
                          fontWeight: pts !== undefined ? 700 : 400,
                          fontFamily: FD,
                          background: isTop && pts !== undefined ? `${BLUEDARK}08` : "transparent"
                        }}>
                          {pts !== undefined ? (pts > 0 ? `+${pts}` : pts) : "·"}
                        </td>
                      );
                    })}
                    <td style={{ ...tdStyle, color: s.orderBonus > 0 ? ORANGE : TEXT2, fontFamily: FD, fontWeight: 700 }}>
                      {s.orderBonus > 0 ? "+6" : "0"}
                    </td>
                    <td style={{ ...tdStyle, color: s.bestFinishBonus > 0 ? ORANGE : TEXT2, fontFamily: FD, fontWeight: 700 }}>
                      {s.bestFinishBonus > 0 ? "+3" : "0"}
                    </td>
                    <td style={{ ...tdStyle, color: s.pitIndividualPts > 0 ? ORANGE : TEXT2, fontFamily: FD, fontWeight: 700 }}>
                      {s.pitIndividualPts > 0 ? `+${s.pitIndividualPts}` : "0"}
                    </td>
                    <td style={{ ...tdStyle, color: s.weeklyBonusPts > 0 ? GREEN : TEXT2, fontFamily: FD, fontWeight: 700 }}>
                      {s.weeklyBonusPts > 0 ? `+${s.weeklyBonusPts}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Team Matchups Table */}
      {data && activeTab === "teams" && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", fontFamily: FB, fontSize: 10, whiteSpace: "nowrap", width: "100%" }}>
            <thead>
              <tr style={{ background: `${DARK}08` }}>
                <th style={thStyle}>Team</th>
                <th style={thStyle}>Total</th>
                <th style={thStyle}>BOX BOX</th>
                <th style={thStyle}>Line</th>
                <th style={thStyle}>P1</th>
                <th style={thStyle}>P2</th>
                <th style={thStyle}>vs</th>
              </tr>
            </thead>
            <tbody>
              {data.teamScores.flatMap((ts, i) => {
                const homeHigher = ts.homeP1Score >= ts.homeP2Score;
                const awayHigher = ts.awayP1Score >= ts.awayP2Score;
                return [
                  <tr key={`home-${i}`} style={{
                    background: ts.homeWon ? `${GREEN}08` : ts.awayWon ? `${RED}06` : `${DARK}03`,
                    borderBottom: `1px solid ${BORDER}20`
                  }}>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>
                      {ts.homeTeam}
                      <span style={{ fontSize: 8, color: GOLD, marginLeft: 4 }}>OVER</span>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 800, fontFamily: FD, color: BLUEDARK }}>
                      {ts.homeTotal}
                    </td>
                    <td style={{
                      ...tdStyle, fontWeight: 800, fontFamily: FD,
                      color: ts.homeBoxBox > 0 ? GREEN : ts.homeBoxBox < 0 ? RED : TEXT2
                    }}>
                      {ts.homeBoxBox > 0 ? "+5" : ts.homeBoxBox < 0 ? "−1" : "0"}
                    </td>
                    <td rowSpan={2} style={{
                      ...tdStyle, fontWeight: 700, fontFamily: FD, fontSize: 11,
                      color: BLUEDARK, textAlign: "center", verticalAlign: "middle",
                      background: `${BLUE}06`, borderLeft: `1px solid ${BORDER}30`,
                      borderRight: `1px solid ${BORDER}30`
                    }}>
                      {ts.boxLine}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 600 }}>{shortName(homeHigher ? ts.homeP1 : ts.homeP2)}</span>
                      <span style={{ fontFamily: FD, fontWeight: 700, marginLeft: 3 }}>
                        {homeHigher ? ts.homeP1Score : ts.homeP2Score}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 600 }}>{shortName(homeHigher ? ts.homeP2 : ts.homeP1)}</span>
                      <span style={{ fontFamily: FD, fontWeight: 700, marginLeft: 3 }}>
                        {homeHigher ? ts.homeP2Score : ts.homeP1Score}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: TEXT2, fontSize: 9 }}>{ts.awayTeam}</td>
                  </tr>,
                  <tr key={`away-${i}`} style={{
                    background: ts.awayWon ? `${GREEN}08` : ts.homeWon ? `${RED}06` : `${DARK}03`,
                    borderBottom: `1px solid ${BORDER}`
                  }}>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>
                      {ts.awayTeam}
                      <span style={{ fontSize: 8, color: "#7c5cbf", marginLeft: 4 }}>UNDER</span>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 800, fontFamily: FD, color: BLUEDARK }}>
                      {ts.awayTotal}
                    </td>
                    <td style={{
                      ...tdStyle, fontWeight: 800, fontFamily: FD,
                      color: ts.awayBoxBox > 0 ? GREEN : ts.awayBoxBox < 0 ? RED : TEXT2
                    }}>
                      {ts.awayBoxBox > 0 ? "+5" : ts.awayBoxBox < 0 ? "−1" : "0"}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 600 }}>{shortName(awayHigher ? ts.awayP1 : ts.awayP2)}</span>
                      <span style={{ fontFamily: FD, fontWeight: 700, marginLeft: 3 }}>
                        {awayHigher ? ts.awayP1Score : ts.awayP2Score}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 600 }}>{shortName(awayHigher ? ts.awayP2 : ts.awayP1)}</span>
                      <span style={{ fontFamily: FD, fontWeight: 700, marginLeft: 3 }}>
                        {awayHigher ? ts.awayP2Score : ts.awayP1Score}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: TEXT2, fontSize: 9 }}>{ts.homeTeam}</td>
                  </tr>
                ];
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const thStyle = {
  padding: "6px 8px", textAlign: "left",
  fontFamily: "'Geologica', sans-serif",
  fontWeight: 700, fontSize: 9,
  color: "#6b6b80", textTransform: "uppercase",
  letterSpacing: "0.06em", borderBottom: "1px solid #d8d2c4"
};

const tdStyle = {
  padding: "5px 8px", fontSize: 10
};
