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

function TeamLogo({ name, size = 32, division, logoUrl }) {
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) hash = (name || "").charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  const bg = `hsl(${hue}, 45%, 55%)`;
  const initials = (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const outlineColor = division === "championship" ? GOLD : SILVER;
  if (logoUrl) return (
    <img src={logoUrl} alt={name} style={{ width: size, height: size, borderRadius: size * 0.3, objectFit: "cover", flexShrink: 0, border: `2px solid ${outlineColor}`, boxSizing: "border-box" }} />
  );
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.3, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: FD, fontWeight: 900, fontSize: size * 0.36, color: "#fff", border: `2px solid ${outlineColor}`, boxSizing: "border-box" }}>{initials}</div>
  );
}

function shortName(fullName) {
  if (!fullName) return "?";
  const parts = fullName.split(" ");
  return parts.length < 2 ? fullName : `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
}

export default function Schedule({ currentUser }) {
  const [schedule, setSchedule] = useState([]);
  const [races, setRaces] = useState([]);
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState([]);
  const [picks, setPicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeRound, setActiveRound] = useState(1);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    async function load() {
      const [{ data: racesData }, { data: scheduleData }, { data: teamsData }, { data: playersData }, { data: scoresData }, { data: picksData }] = await Promise.all([
        supabase.from("races").select("*").eq("season", 2026).order("round"),
        supabase.from("schedule").select("id, race_id, home_team:home_team_id ( id, name, player1_id, player2_id, logo_url, division ), away_team:away_team_id ( id, name, player1_id, player2_id, logo_url, division )"),
        supabase.from("teams").select("*"),
        supabase.from("players").select("id, name"),
        supabase.from("scores").select("*"),
        supabase.from("picks").select("player_id, race_id, pit_guess")
      ]);
      setRaces(racesData || []);
      const normalized = (scheduleData || []).map(s => ({ ...s, home_team: Array.isArray(s.home_team) ? s.home_team[0] : s.home_team, away_team: Array.isArray(s.away_team) ? s.away_team[0] : s.away_team }));
      setSchedule(normalized);
      setTeams(teamsData || []);
      setPlayers(playersData || []);
      setScores(scoresData || []);
      setPicks(picksData || []);
      const ts = (scoresData || []).map(s => s.calculated_at).filter(Boolean).sort().reverse();
      if (ts.length > 0) setLastUpdated(ts[0]);
      setLoading(false);
    }
    load();
  }, []);

  const playerMap = {};
  players.forEach(p => { playerMap[p.id] = p.name; });
  const sk = (pid, rid) => `${pid}_${rid}`;
  const scoreMap = {};
  scores.forEach(s => { scoreMap[sk(s.player_id, s.race_id)] = s; });
  const pickMap = {};
  picks.forEach(pk => { pickMap[`${pk.player_id}_${pk.race_id}`] = pk; });

  // Compute player rankings by total points
  const playerTotals = {};
  scores.forEach(s => {
    const total = (s.top_pick_pts || 0) + (s.midfield_pts || 0) + (s.order_bonus || 0) + (s.best_finish_bonus || 0) + (s.pit_individual_pts || 0) + (s.weekly_bonus_pts || 0);
    if (!playerTotals[s.player_id]) playerTotals[s.player_id] = 0;
    playerTotals[s.player_id] += total;
  });
  const playerRankList = Object.entries(playerTotals).sort((a, b) => b[1] - a[1]);
  const playerRank = {};
  playerRankList.forEach(([pid, pts], i) => { playerRank[pid] = i + 1; });

  const shortNameInitial = (name) => {
    if (!name) return "?";
    const parts = name.split(" ");
    return parts.length >= 2 ? `${parts[0][0]}. ${parts[parts.length - 1]}` : name;
  };

  const getDiv = (teamName) => {
    const t = teams.find(t => t.name === teamName);
    return t?.division || "second";
  };

  const myPlayer = players.find(p => p.name === currentUser);
  const myTeamId = myPlayer ? teams.find(t => t.player1_id === myPlayer.id || t.player2_id === myPlayer.id)?.id : null;

  const currentRace = races.find(r => r.round === activeRound);
  const raceHasScores = currentRace && scores.some(s => s.race_id === currentRace.id);
  const picksExist = currentRace && picks.some(pk => pk.race_id === currentRace.id);

  // Determine if picks are locked (past deadline)
  const picksLocked = currentRace?.pick_deadline
    ? new Date() >= new Date(currentRace.pick_deadline)
    : false;

  function playerMatchupScore(pid, raceId) {
    const s = scoreMap[sk(pid, raceId)];
    if (!s) return 0;
    return (s.top_pick_pts || 0) + (s.midfield_pts || 0) + (s.order_bonus || 0) + (s.best_finish_bonus || 0);
  }

  function computeBoxBoxLine(homeTeam, awayTeam, raceId) {
    if (!homeTeam || !awayTeam) return null;
    const guesses = [homeTeam.player1_id, homeTeam.player2_id, awayTeam.player1_id, awayTeam.player2_id]
      .map(pid => pickMap[`${pid}_${raceId}`]?.pit_guess).filter(g => g != null);
    return guesses.length > 0 ?
      guesses.reduce((a, b) => a + b, 0) / guesses.length : null;
  }

  // Check if the matchup was within BOX BOX line range: score without BOX BOX was within 6
  function withinBoxBoxRange(homeTotal, awayTotal, homeBoxBox, awayBoxBox) {
    if (!raceHasScores) return false;
    const homeWithout = homeTotal - homeBoxBox;
    const awayWithout = awayTotal - awayBoxBox;
    return Math.abs(homeWithout - awayWithout) <= 6;
  }

  // Check if a specific player has submitted picks for a race
  function playerHasSubmitted(pid, raceId) {
    return pickMap[`${pid}_${raceId}`] != null;
  }

  const matchupsForRound = schedule.filter(s => s.race_id === currentRace?.id);
  const champMatchups = matchupsForRound.filter(m => getDiv(m.home_team?.name) === "championship");
  const secondMatchups = matchupsForRound.filter(m => getDiv(m.home_team?.name) !== "championship");

  function renderMatchup(m) {
    const homeTeam = m.home_team, awayTeam = m.away_team;
    const raceId = currentRace?.id;
    const homeDiv = getDiv(homeTeam?.name);

    const homeP1 = playerMatchupScore(homeTeam?.player1_id, raceId);
    const homeP2 = playerMatchupScore(homeTeam?.player2_id, raceId);
    const awayP1 = playerMatchupScore(awayTeam?.player1_id, raceId);
    const awayP2 = playerMatchupScore(awayTeam?.player2_id, raceId);
    const homeBoxBox = scoreMap[sk(homeTeam?.player1_id, raceId)]?.pit_matchup_pts || 0;
    const awayBoxBox = scoreMap[sk(awayTeam?.player1_id, raceId)]?.pit_matchup_pts || 0;
    const homeTotal = homeP1 + homeP2 + homeBoxBox;
    const awayTotal = awayP1 + awayP2 + awayBoxBox;
    const hasScoresForMatch = raceHasScores && scoreMap[sk(homeTeam?.player1_id, raceId)];
    const homeWon = hasScoresForMatch && homeTotal > awayTotal;
    const awayWon = hasScoresForMatch && awayTotal > homeTotal;
    const boxLine = computeBoxBoxLine(homeTeam, awayTeam, raceId);
    const showBoxLine = boxLine !== null && (raceHasScores || picksExist);

    // Determine the matchup state
    // State 3: scored
    // State 2.5: picks locked (past deadline) but not scored
    // State 2: some picks exist but not locked
    // State 1: no picks yet
    const isState3 = !!hasScoresForMatch;
    const isState25 = !isState3 && picksLocked && picksExist;
    const isState2 = !isState3 && !isState25 && picksExist;
    const isState1 = !isState3 && !isState25 && !isState2;

    // Per-player submission status (for State 2)
    const homeP1Submitted = playerHasSubmitted(homeTeam?.player1_id, raceId);
    const homeP2Submitted = playerHasSubmitted(homeTeam?.player2_id, raceId);
    const awayP1Submitted = playerHasSubmitted(awayTeam?.player1_id, raceId);
    const awayP2Submitted = playerHasSubmitted(awayTeam?.player2_id, raceId);

    // Determine outline
    let outlineColor, outlineWidth;
    if (!hasScoresForMatch) {
      outlineColor = BORDER;
      outlineWidth = 1;
    } else if (withinBoxBoxRange(homeTotal, awayTotal, homeBoxBox, awayBoxBox)) {
      outlineColor = GREEN;
      outlineWidth = 2;
    } else {
      outlineColor = homeDiv === "championship" ? GOLD : SILVER;
      outlineWidth = 2;
    }

    // Over/Under chip (bigger in all states)
    const overUnderChip = (isOver, size = "normal") => {
      const label = isOver ? "OVER" : "UNDER";
      const chipColor = isOver ? GOLD : "#7c5cbf";
      const fontSize = size === "large" ? 12 : 11;
      const padding = size === "large" ? "3px 10px" : "2px 8px";
      return (
        <span style={{
          fontFamily: FD, fontWeight: 700, fontSize, letterSpacing: "0.08em",
          textTransform: "uppercase", padding, borderRadius: 100,
          color: chipColor, background: `${chipColor}15`
        }}>
          {label}
        </span>
      );
    };

    // Score area for each player — shows differently per state
    function playerScoreCell(playerName, score, hasSubmitted) {
      if (isState3) {
        // Scored: show actual score
        return (
          <div style={{ textAlign: "center", minWidth: 38 }}>
            <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 15, color: DARK }}>{score}</span>
            <p style={{ fontFamily: FB, fontSize: 9.5, color: TEXT2, margin: 0 }}>{shortName(playerName)}</p>
          </div>
        );
      }
      if (isState2 && hasSubmitted) {
        // State 2: player submitted — green checkmark
        return (
          <div style={{ textAlign: "center", minWidth: 38 }}>
            <span style={{ fontSize: 16, color: GREEN }}>✓</span>
            <p style={{ fontFamily: FB, fontSize: 8, color: GREEN, margin: "1px 0 0", lineHeight: 1.1 }}>Picked</p>
          </div>
        );
      }
      // State 1, State 2 (not submitted), State 2.5: blank placeholder
      return (
        <div style={{ textAlign: "center", minWidth: 38 }}>
          <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 15, color: `${BORDER}80` }}>—</span>
          <p style={{ fontFamily: FB, fontSize: 9.5, color: `${BORDER}80`, margin: 0 }}>{shortName(playerName)}</p>
        </div>
      );
    }

    // BOX BOX cell — blank placeholder for non-scored states
    function boxBoxCell(boxBonus) {
      if (isState3) {
        return (
          <div style={{
            textAlign: "center", minWidth: 32, padding: "3px 5px", borderRadius: 6,
            background: boxBonus > 0 ? `${GREEN}10` : boxBonus < 0 ? `${RED}10` : `${DARK}04`
          }}>
            <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 14, color: boxBonus > 0 ? GREEN : boxBonus < 0 ? RED : TEXT2 }}>
              {boxBonus > 0 ? "+5" : boxBonus < 0 ? "−1" : "0"}
            </span>
            <p style={{ fontFamily: FD, fontWeight: 700, fontSize: 8, color: TEXT2, margin: 0 }}>BOX BOX</p>
          </div>
        );
      }
      // Blank placeholder
      return (
        <div style={{
          textAlign: "center", minWidth: 32, padding: "3px 5px", borderRadius: 6,
          background: `${DARK}04`
        }}>
          <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 14, color: `${BORDER}80` }}>—</span>
          <p style={{ fontFamily: FD, fontWeight: 700, fontSize: 8, color: `${BORDER}60`, margin: 0 }}>BOX BOX</p>
        </div>
      );
    }

    // Total cell
    function totalCell(total, won) {
      if (isState3) {
        return (
          <div style={{ textAlign: "center", minWidth: 36, padding: "4px 6px", borderRadius: 8, background: won ? `${GREEN}12` : `${DARK}06` }}>
            <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 19, color: won ? DARK : TEXT2 }}>{total}</span>
          </div>
        );
      }
      return (
        <div style={{ textAlign: "center", minWidth: 36, padding: "4px 6px", borderRadius: 8, background: `${DARK}04` }}>
          <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 19, color: `${BORDER}80` }}>—</span>
        </div>
      );
    }

    function teamRow(team, isOver, p1Score, p2Score, boxBonus, total, won) {
      if (!team) return null;
      const div = getDiv(team.name);
      const p1Name = playerMap[team.player1_id] || "P1";
      const p2Name = playerMap[team.player2_id] || "P2";
      const isMyTeam = team.id === myTeamId;
      const higher = p1Score >= p2Score;
      const name1 = higher ? p1Name : p2Name;
      const pid1 = higher ? team.player1_id : team.player2_id;
      const score1 = higher ? p1Score : p2Score;
      const name2 = higher ? p2Name : p1Name;
      const pid2 = higher ? team.player2_id : team.player1_id;
      const score2 = higher ? p2Score : p1Score;
      const p1Sub = playerHasSubmitted(team.player1_id, raceId);
      const p2Sub = playerHasSubmitted(team.player2_id, raceId);
      const sub1 = higher ? p1Sub : p2Sub;
      const sub2 = higher ? p2Sub : p1Sub;

      return (
        <div style={{ display: "flex", alignItems: "center", padding: "10px 12px", gap: 8 }}>
          <TeamLogo name={team.name} size={42} division={div} logoUrl={team.logo_url} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {isMyTeam && <span style={{ fontSize: 13 }}>⭐</span>}
              <p style={{ fontFamily: FD, fontWeight: 700, fontSize: 15.5, color: TEXT, margin: 0 }}>
                {team.name}
              </p>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 2, marginBottom: 3 }}>
              {[team.player1_id, team.player2_id].map(pid => {
                const name = playerMap[pid];
                const rank = playerRank[pid];
                const rankColor = rank <= 3 ? ORANGE : rank <= 10 ? BLUEDARK : TEXT2;
                return (
                  <span key={pid} style={{ fontFamily: FB, fontSize: 10, color: TEXT2 }}>
                    {shortNameInitial(name)}
                    {rank && <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 9, color: rankColor, marginLeft: 2 }}>({rank})</span>}
                  </span>
                );
              })}
            </div>
            {/* Over/Under chip — show in States 1, 2, and 3 team rows (not 2.5, which has the big center divider) */}
            {!isState25 && overUnderChip(isOver, "normal")}
          </div>

          {/* Score area — always show the structure */}
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {playerScoreCell(name1, score1, sub1)}
            {playerScoreCell(name2, score2, sub2)}
            {boxBoxCell(boxBonus)}
            {totalCell(total, won)}
          </div>
        </div>
      );
    }

    // State 2.5: Big centered Over/Under divider between team rows
    function overUnderDivider() {
      if (!isState25) return null;
      const lineStr = boxLine !== null ? boxLine.toFixed(1) : "—";
      return (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "10px 16px", gap: 12,
          background: `${DARK}04`
        }}>
          {/* Over side */}
          <div style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            gap: 6, padding: "8px 12px", borderRadius: 10,
            background: `${GOLD}08`, border: `1px solid ${GOLD}20`
          }}>
            <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase", color: GOLD }}>OVER</span>
            <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 17, color: GOLD }}>{lineStr}</span>
          </div>

          {/* Divider dot */}
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: BORDER, flexShrink: 0 }} />

          {/* Under side */}
          <div style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            gap: 6, padding: "8px 12px", borderRadius: 10,
            background: "#7c5cbf08", border: "1px solid #7c5cbf20"
          }}>
            <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase", color: "#7c5cbf" }}>UNDER</span>
            <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 17, color: "#7c5cbf" }}>{lineStr}</span>
          </div>
        </div>
      );
    }

    // State 3: Over/Under result divider showing which side won
    function overUnderResultDivider() {
      if (!isState3) return null;
      // Determine which side of the BOX BOX line won
      // homeTeam = Over, awayTeam = Under
      // homeBoxBox > 0 means Over won, awayBoxBox > 0 means Under won
      const overWon = homeBoxBox > 0;
      const underWon = awayBoxBox > 0;
      const push = homeBoxBox === 0 && awayBoxBox === 0;
      const lineStr = boxLine !== null ? boxLine.toFixed(1) : "—";

      const overColor = overWon ? GREEN : underWon ? RED : TEXT2;
      const underColor = underWon ? GREEN : overWon ? RED : TEXT2;
      const overBg = overWon ? `${GREEN}10` : underWon ? `${RED}06` : `${DARK}04`;
      const underBg = underWon ? `${GREEN}10` : overWon ? `${RED}06` : `${DARK}04`;
      const overBorder = overWon ? `${GREEN}30` : underWon ? `${RED}20` : `${BORDER}`;
      const underBorder = underWon ? `${GREEN}30` : overWon ? `${RED}20` : `${BORDER}`;

      return (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "8px 16px", gap: 10,
          background: `${DARK}03`
        }}>
          {/* Over side */}
          <div style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            gap: 6, padding: "6px 10px", borderRadius: 8,
            background: overBg, border: `1.5px solid ${overBorder}`
          }}>
            {overWon && <span style={{ fontSize: 12 }}>✓</span>}
            <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: overColor }}>OVER</span>
            <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 14, color: overColor }}>{lineStr}</span>
          </div>

          {/* Divider */}
          <span style={{ fontFamily: FD, fontWeight: 300, fontSize: 10, color: TEXT2 }}>vs</span>

          {/* Under side */}
          <div style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            gap: 6, padding: "6px 10px", borderRadius: 8,
            background: underBg, border: `1.5px solid ${underBorder}`
          }}>
            {underWon && <span style={{ fontSize: 12 }}>✓</span>}
            <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: underColor }}>UNDER</span>
            <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 14, color: underColor }}>{lineStr}</span>
          </div>
        </div>
      );
    }

    return (
      <div key={m.id} style={{
        background: "#fff", borderRadius: 14, overflow: "hidden",
        border: `${outlineWidth}px solid ${outlineColor}`,
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
      }}>
        {teamRow(homeTeam, true, homeP1, homeP2, homeBoxBox, homeTotal, homeWon)}

        {/* Divider between teams — changes based on state */}
        {isState25 ? (
          overUnderDivider()
        ) : isState3 ? (
          overUnderResultDivider()
        ) : (
          <div style={{ height: 1, background: BORDER, margin: "0 12px" }} />
        )}

        {teamRow(awayTeam, false, awayP1, awayP2, awayBoxBox, awayTotal, awayWon)}
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 20px 100px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 22, color: DARK, textTransform: "uppercase", letterSpacing: "0.03em", margin: 0 }}>Schedule</p>
        <span style={{ fontFamily: FD, fontWeight: 300, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: BLUE, background: `${BLUE}15`, border: `1px solid ${BLUE}30`, padding: "4px 10px", borderRadius: 100 }}>2026 Season</span>
      </div>

      {/* Round pills */}
      <p style={{ fontFamily: FD, fontWeight: 300, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: TEXT2, marginBottom: 10 }}>Race Round</p>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none", marginBottom: 12 }}>
        {races.map(r => (
          <button key={r.round} onClick={() => setActiveRound(r.round)} style={{
            flexShrink: 0, width: 36, height: 36, borderRadius: "50%",
            border: `1px solid ${activeRound === r.round ? DARK : BORDER}`,
            background: activeRound === r.round ? DARK : "transparent",
            color: activeRound === r.round ? "#fff" : TEXT2,
            fontFamily: FD, fontWeight: 700, fontSize: 13, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>{r.round}</button>
        ))}
      </div>

      {/* Race info */}
      {currentRace && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 22 }}>🏁</span>
          <div>
            <p style={{ fontFamily: FD, fontWeight: 700, fontSize: 16, color: DARK, margin: 0 }}>{currentRace.race_name}</p>
            <p style={{ fontFamily: FB, fontSize: 12, color: TEXT2, margin: "1px 0 0" }}>
              {new Date(currentRace.race_date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>
      )}

      {/* Outline legend — show for scored races */}
      {raceHasScores && (
        <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 14, height: 14, borderRadius: 4, border: `2px solid ${GOLD}`, display: "inline-block" }} />
            <span style={{ fontFamily: FB, fontSize: 9, color: TEXT2 }}>Championship</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 14, height: 14, borderRadius: 4, border: `2px solid ${SILVER}`, display: "inline-block" }} />
            <span style={{ fontFamily: FB, fontSize: 9, color: TEXT2 }}>Second Division</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 14, height: 14, borderRadius: 4, border: `2px solid ${GREEN}`, display: "inline-block" }} />
            <span style={{ fontFamily: FB, fontSize: 9, color: TEXT2 }}>Decided by BOX BOX Line</span>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: "60px 0", textAlign: "center" }}>
          <p style={{ fontFamily: FB, fontSize: 14, color: TEXT2 }}>Loading schedule…</p>
        </div>
      ) : matchupsForRound.length === 0 ? (
        <div style={{ padding: "60px 0", textAlign: "center" }}>
          <p style={{ fontFamily: FB, fontSize: 14, color: TEXT2 }}>No matchups found</p>
        </div>
      ) : (
        <>
          {/* Championship matchups */}
          {champMatchups.length > 0 && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: GOLD, flexShrink: 0 }} />
                <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 13, color: DARK, textTransform: "uppercase", letterSpacing: "0.04em" }}>Championship</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                {champMatchups.map(m => renderMatchup(m))}
              </div>
            </>
          )}

          {/* Second Division matchups */}
          {secondMatchups.length > 0 && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: SILVER, flexShrink: 0 }} />
                <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 13, color: DARK, textTransform: "uppercase", letterSpacing: "0.04em" }}>Second Division</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {secondMatchups.map(m => renderMatchup(m))}
              </div>
            </>
          )}
        </>
      )}

      {lastUpdated && (
        <p style={{ fontFamily: FB, fontSize: 10, color: TEXT2, textAlign: "center", marginTop: 20 }}>
          Last updated {new Date(lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
        </p>
      )}
    </div>
  );
}
