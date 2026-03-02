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

  const getDiv = (teamName) => {
    const t = teams.find(t => t.name === teamName);
    return t?.division || "second";
  };

  const myPlayer = players.find(p => p.name === currentUser);
  const myTeamId = myPlayer ? teams.find(t => t.player1_id === myPlayer.id || t.player2_id === myPlayer.id)?.id : null;

  const currentRace = races.find(r => r.round === activeRound);
  const raceHasScores = currentRace && scores.some(s => s.race_id === currentRace.id);
  const picksExist = currentRace && picks.some(pk => pk.race_id === currentRace.id);

  function playerMatchupScore(pid, raceId) {
    const s = scoreMap[sk(pid, raceId)];
    if (!s) return 0;
    return (s.top_pick_pts || 0) + (s.midfield_pts || 0) + (s.order_bonus || 0) + (s.best_finish_bonus || 0);
  }

  function computeBoxBoxLine(homeTeam, awayTeam, raceId) {
    if (!homeTeam || !awayTeam) return null;
    const guesses = [homeTeam.player1_id, homeTeam.player2_id, awayTeam.player1_id, awayTeam.player2_id]
      .map(pid => pickMap[`${pid}_${raceId}`]?.pit_guess).filter(g => g != null);
    return guesses.length > 0 ? guesses.reduce((a, b) => a + b, 0) / guesses.length : null;
  }

  // Check if the matchup was within BOX BOX line range: score without BOX BOX was within 6
  function withinBoxBoxRange(homeTotal, awayTotal, homeBoxBox, awayBoxBox) {
    if (!raceHasScores) return false;
    const homeWithout = homeTotal - homeBoxBox;
    const awayWithout = awayTotal - awayBoxBox;
    return Math.abs(homeWithout - awayWithout) <= 6;
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

    function teamRow(team, isOver, p1Score, p2Score, boxBonus, total, won) {
      if (!team) return null;
      const div = getDiv(team.name);
      const p1Name = playerMap[team.player1_id] || "P1";
      const p2Name = playerMap[team.player2_id] || "P2";
      const isMyTeam = team.id === myTeamId;
      const higher = p1Score >= p2Score;
      const name1 = higher ? p1Name : p2Name;
      const score1 = higher ? p1Score : p2Score;
      const name2 = higher ? p2Name : p1Name;
      const score2 = higher ? p2Score : p1Score;
      const lineLabel = isOver
        ? (showBoxLine ? `Over ${boxLine.toFixed(1)}` : "Over")
        : (showBoxLine ? `Under ${boxLine.toFixed(1)}` : "Under");
      const lineColor = isOver ? GOLD : "#7c5cbf";

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
            <span style={{ fontFamily: FD, fontWeight: 400, fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", padding: "1px 6px", borderRadius: 100, color: lineColor, background: `${lineColor}15` }}>
              {lineLabel}
            </span>
          </div>

          {hasScoresForMatch ? (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ textAlign: "center", minWidth: 38 }}>
                <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 15, color: DARK }}>{score1}</span>
                <p style={{ fontFamily: FB, fontSize: 9.5, color: TEXT2, margin: 0 }}>
                  {shortName(name1)}
                </p>
              </div>
              <div style={{ textAlign: "center", minWidth: 38 }}>
                <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 15, color: TEXT2 }}>{score2}</span>
                <p style={{ fontFamily: FB, fontSize: 9.5, color: TEXT2, margin: 0 }}>
                  {shortName(name2)}
                </p>
              </div>
              <div style={{
                textAlign: "center", minWidth: 32, padding: "3px 5px", borderRadius: 6,
                background: boxBonus > 0 ? `${GREEN}10` : boxBonus < 0 ? `${RED}10` : `${DARK}04`
              }}>
                <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 14, color: boxBonus > 0 ? GREEN : boxBonus < 0 ? RED : TEXT2 }}>
                  {boxBonus > 0 ? "+5" : boxBonus < 0 ? "−1" : "0"}
                </span>
                <p style={{ fontFamily: FD, fontWeight: 700, fontSize: 8, color: TEXT2, margin: 0 }}>BOX BOX</p>
              </div>
              <div style={{ textAlign: "center", minWidth: 36, padding: "4px 6px", borderRadius: 8, background: won ? `${GREEN}12` : `${DARK}06` }}>
                <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 19, color: won ? DARK : TEXT2 }}>{total}</span>
              </div>
            </div>
          ) : (
            <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 22, color: BORDER }}>—</span>
          )}
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
        <div style={{ height: 1, background: BORDER, margin: "0 12px" }} />
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

      {/* Outline legend */}
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
