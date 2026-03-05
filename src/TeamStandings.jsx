import { useState, useEffect, useRef } from "react";
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
const TEAM_PTS_TABLE = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1, 0, 0];

// 2025 individual points — used as preseason tiebreaker when all teams have 0 pts
const PTS_2025 = {
  "Andrew Ishak": 473, "George Fahmy": 459, "Krista Nabil": 457, "Rafik Zarifa": 438,
  "Mena Yousef": 436, "Aditya Satish": 431, "Heather Ishak": 421, "Martin Nobar": 416,
  "Moses Abdelshaid": 410, "Alicia Cho": 404, "Kerolos Nakhla": 401, "Joe McGlynn": 398,
  "Scott Schertler": 392, "Anthony Carnesecca": 392, "Evie Ishak": 390, "Jack Civitts": 388,
  "Nick Brody": 381, "Ryan Kohli": 378, "Harold Gutmann": 378, "Theo Ishak": 376,
  "Joe Hanna": 376, "Kevin Coolidge": 375, "Zack Girgis": 375, "Lucia Thompson": 373,
  "Paul Kohli": 366, "Brett Dillon": 362, "Sam Bottoms": 349, "Andy Thompson": 344,
  "Chris Fondacaro": 339, "Maggie Mudge": 334, "Jacob Ford": 322, "Ronnie Nobar": 319,
  "Anthony Zamary": 313, "Dan Patry": 313, "Grant Wong": 309, "Chris Malek": 303,
  "Ramy Stephanos": 280, "Brian Dong": 275, "Kristin Eskind": 267, "Pavly Attalah": 210
};

function TeamLogo({ name, size = 36, division, logoUrl }) {
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
    <div style={{ width: size, height: size, borderRadius: size * 0.3, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: FD, fontWeight: 900, fontSize: size * 0.38, color: "#fff", border: `2px solid ${outlineColor}`, boxSizing: "border-box" }}>{initials}</div>
  );
}

function shortName(fullName) {
  if (!fullName) return "?";
  const parts = fullName.split(" ");
  return parts.length < 2 ? fullName : `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
}

export default function TeamStandings({ currentUser }) {
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [racesCompleted, setRacesCompleted] = useState(0);
  const [allSchedule, setAllSchedule] = useState([]);
  const [allRaces, setAllRaces] = useState([]);
  const [promoOpen, setPromoOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [playerScoreTotals, setPlayerScoreTotals] = useState({});
  const secondDivRef = useRef(null);

  useEffect(() => {
    async function load() {
      try {
        const [{ data: teams }, { data: players }, { data: scores }, { data: schedule }, { data: races }] = await Promise.all([
          supabase.from("teams").select("*"),
          supabase.from("players").select("id, name"),
          supabase.from("scores").select("*"),
          supabase.from("schedule").select("*"),
          supabase.from("races").select("id, race_name, round, race_date").order("round", { ascending: true })
        ]);
        if (!teams || !players || !races) { setLoading(false); return; }
        setAllSchedule(schedule || []);
        setAllRaces(races || []);

        const playerMap = {};
        (players || []).forEach(p => { playerMap[p.id] = p.name; });
        const raceMap = {};
        (races || []).forEach(r => { raceMap[r.id] = r; });
        const scoreKey = (pid, rid) => `${pid}_${rid}`;
        const scoreMap = {};
        (scores || []).forEach(s => { scoreMap[scoreKey(s.player_id, s.race_id)] = s; });

        const racesWithScores = new Set();
        (scores || []).forEach(s => racesWithScores.add(s.race_id));
        setRacesCompleted(racesWithScores.size);

        const timestamps = (scores || []).map(s => s.calculated_at).filter(Boolean).sort().reverse();
        if (timestamps.length > 0) setLastUpdated(timestamps[0]);

        // Per-player cumulative matchup score (no needle) for contribution %
        const pScoreTotals = {};
        (players || []).forEach(p => { pScoreTotals[p.id] = 0; });

        const teamData = (teams || []).map(team => {
          const p1 = team.player1_id, p2 = team.player2_id;
          const p1Name = playerMap[p1] || "?", p2Name = playerMap[p2] || "?";
          const division = team.division || "second";
          let totalWins = 0, totalMatchupScore = 0, matchupCount = 0;
          let p1Total = 0, p2Total = 0;
          const weeklyResults = [];

          racesWithScores.forEach(raceId => {
            const s1 = scoreMap[scoreKey(p1, raceId)], s2 = scoreMap[scoreKey(p2, raceId)];
            if (!s1 || !s2) return;
            const p1Score = (s1.top_pick_pts || 0) + (s1.midfield_pts || 0) + (s1.order_bonus || 0) + (s1.best_finish_bonus || 0);
            const p2Score = (s2.top_pick_pts || 0) + (s2.midfield_pts || 0) + (s2.order_bonus || 0) + (s2.best_finish_bonus || 0);
            p1Total += p1Score;
            p2Total += p2Score;
            const boxBoxBonus = (s1.pit_matchup_pts || 0);
            const matchupScore = p1Score + p2Score + boxBoxBonus;
            const boxBoxCorrect = boxBoxBonus > 0;

            const matchup = (schedule || []).find(m => m.race_id === raceId && (m.home_team_id === team.id || m.away_team_id === team.id));
            let opponentId = null, opponentName = null, opponentMatchupScore = null, won = null;
            if (matchup) {
              opponentId = matchup.home_team_id === team.id ? matchup.away_team_id : matchup.home_team_id;
              const opp = (teams || []).find(t => t.id === opponentId);
              if (opp) {
                opponentName = opp.name;
                const os1 = scoreMap[scoreKey(opp.player1_id, raceId)], os2 = scoreMap[scoreKey(opp.player2_id, raceId)];
                if (os1 && os2) {
                  opponentMatchupScore = (os1.top_pick_pts || 0) + (os1.midfield_pts || 0) + (os1.order_bonus || 0) + (os1.best_finish_bonus || 0) +
                    (os2.top_pick_pts || 0) + (os2.midfield_pts || 0) + (os2.order_bonus || 0) + (os2.best_finish_bonus || 0) +
                    (os1.pit_matchup_pts || 0);
                }
              }
              if (opponentMatchupScore !== null) won = matchupScore > opponentMatchupScore ? true : matchupScore < opponentMatchupScore ? false : null;
            }
            totalMatchupScore += matchupScore;
            matchupCount += 1;
            if (won === true) totalWins += 1;
            // Check if BOX BOX decided the matchup: score without it was within 6
            const scoreWithoutBB = p1Score + p2Score;
            const oppWithoutBB = opponentMatchupScore !== null ? opponentMatchupScore - ((teams || []).find(t => t.id === opponentId) ? (scoreMap[scoreKey(((teams || []).find(t => t.id === opponentId)).player1_id, raceId)]?.pit_matchup_pts || 0) : 0) : null;
            const decidedByBoxBox = opponentMatchupScore !== null && Math.abs(scoreWithoutBB - (oppWithoutBB || 0)) <= 6;

            weeklyResults.push({ raceId, raceName: raceMap[raceId]?.race_name || "Race", round: raceMap[raceId]?.round || 0, matchupScore, won, boxBoxCorrect, opponentId, opponentName, opponentMatchupScore, p1Score, p2Score, decidedByBoxBox });
          });

          pScoreTotals[p1] = p1Total;
          pScoreTotals[p2] = p2Total;

          // Compute DOTD (Driver of the Day) per player:
          // Highest individual scorer on the winning team earns DOTD for that week
          let p1Dotd = 0, p2Dotd = 0;
          weeklyResults.forEach(wr => {
            if (wr.won !== true) return; // only winning team gets a DOTD
            if (wr.p1Score > wr.p2Score) p1Dotd++;
            else if (wr.p2Score > wr.p1Score) p2Dotd++;
            else p1Dotd++; // tie goes to p1 by convention
          });

          // BOX BOX win %: how often the team landed on the correct side
          const boxBoxTotal = weeklyResults.length;
          const boxBoxWins = weeklyResults.filter(wr => wr.boxBoxCorrect).length;
          const boxBoxPct = boxBoxTotal > 0 ? Math.round((boxBoxWins / boxBoxTotal) * 100) : null;

          return {
            id: team.id, name: team.name, division, p1Name, p2Name, p1Id: p1, p2Id: p2,
            logo_url: team.logo_url,
            totalTeamPts: 0, totalWins, totalMatchupScore, matchupCount,
            avgMatchupScore: matchupCount > 0 ? (totalMatchupScore / matchupCount) : 0,
            weeklyResults: weeklyResults.sort((a, b) => a.round - b.round),
            isMyTeam: p1Name === currentUser || p2Name === currentUser,
            p1Total, p2Total,
            p1Dotd, p2Dotd, boxBoxPct
          };
        });

        setPlayerScoreTotals(pScoreTotals);

        // Calculate team points per race within each division
        racesWithScores.forEach(raceId => {
          ["championship", "second"].forEach(div => {
            const divTeams = teamData.filter(t => t.division === div);
            const raceResults = divTeams.map(t => { const wr = t.weeklyResults.find(w => w.raceId === raceId); return wr ? { teamId: t.id, ...wr } : null; }).filter(Boolean);
            const winners = raceResults.filter(r => r.won === true).sort((a, b) => b.matchupScore - a.matchupScore);
            const ties = raceResults.filter(r => r.won === null).sort((a, b) => { if (a.boxBoxCorrect && !b.boxBoxCorrect) return -1; if (!a.boxBoxCorrect && b.boxBoxCorrect) return 1; return b.matchupScore - a.matchupScore; });
            const losers = raceResults.filter(r => r.won === false).sort((a, b) => b.matchupScore - a.matchupScore);
            [...winners, ...ties, ...losers].forEach((r, idx) => {
              const pts = idx < TEAM_PTS_TABLE.length ? TEAM_PTS_TABLE[idx] : 0;
              const team = teamData.find(t => t.id === r.teamId);
              if (team) { team.totalTeamPts += pts; const wr = team.weeklyResults.find(w => w.raceId === raceId); if (wr) wr.teamPtsEarned = pts; }
            });
          });
        });

        teamData.forEach(t => { t.avgMatchupScore = t.matchupCount > 0 ? Math.round((t.totalMatchupScore / t.matchupCount) * 10) / 10 : 0; });
        // Preseason tiebreaker: combined 2025 individual points of both players
        teamData.forEach(t => { t.combined2025 = (PTS_2025[t.p1Name] || 0) + (PTS_2025[t.p2Name] || 0); });
        teamData.sort((a, b) => b.totalTeamPts - a.totalTeamPts || b.totalWins - a.totalWins || b.avgMatchupScore - a.avgMatchupScore || b.combined2025 - a.combined2025);
        setStandings(teamData);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    load();
  }, [currentUser]);

  const getUpcomingMatchups = (teamId) => {
    const completedRaceIds = new Set();
    standings.forEach(t => t.weeklyResults.forEach(wr => completedRaceIds.add(wr.raceId)));
    return allSchedule
      .filter(m => (m.home_team_id === teamId || m.away_team_id === teamId) && !completedRaceIds.has(m.race_id))
      .map(m => {
        const race = allRaces.find(r => r.id === m.race_id);
        const oppId = m.home_team_id === teamId ? m.away_team_id : m.home_team_id;
        const opp = standings.find(t => t.id === oppId);
        const isOver = m.home_team_id === teamId;
        // Find opponent rank in their division
        const oppDiv = standings.filter(t => t.division === opp?.division);
        const oppRank = oppDiv.findIndex(t => t.id === oppId) + 1;
        return { round: race?.round || 99, raceName: race?.race_name || "TBD", opponentName: opp?.name || "TBD", isOver, oppRank };
      })
      .sort((a, b) => a.round - b.round).slice(0, 3);
  };

  if (loading) return <div style={{ padding: "60px 20px", textAlign: "center" }}><p style={{ fontFamily: FB, fontSize: 14, color: TEXT2 }}>Loading standings…</p></div>;

  const champTeams = standings.filter(t => t.division === "championship");
  const secondTeams = standings.filter(t => t.division === "second");
  const hasData = racesCompleted > 0;

  function renderDivision(divTeams, divName, divLabel, divColor) {
    return (
      <div style={{ marginBottom: 30 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ width: 12, height: 12, borderRadius: "50%", background: divColor, flexShrink: 0 }} />
          <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 16, color: DARK, textTransform: "uppercase", letterSpacing: "0.04em" }}>{divLabel}</span>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", padding: "0 14px 6px", fontFamily: FD, fontWeight: 700, fontSize: 8, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.08em", lineHeight: 1.3 }}>
          <span style={{ minWidth: 24 }} /><span style={{ width: 34 }} /><span style={{ flex: 1, paddingLeft: 8 }} />
          <span style={{ minWidth: 50, textAlign: "center" }}><span style={{ display: "block" }}>Champ</span><span style={{ display: "block" }}>Pts</span></span>
          <span style={{ minWidth: 36, textAlign: "center" }}>Wins</span>
          <span style={{ minWidth: 48, textAlign: "center" }}><span style={{ display: "block" }}>Scoring</span><span style={{ display: "block" }}>Avg</span></span>
          <span style={{ width: 16 }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {divTeams.map((t, idx) => {
            const rank = idx + 1;
            const isExpanded = expanded === t.id;
            const upcoming = isExpanded ? getUpcomingMatchups(t.id) : [];
            const pos = idx + 1;

            const inRelegation = divName === "championship" && pos >= 10;
            const inPlayoff = divName === "championship" && (pos === 8 || pos === 9);
            const inPromotion = divName === "second" && pos <= 3;
            const inMedPlayoff = divName === "second" && (pos === 4 || pos === 5);

            let zoneBorder = BORDER;
            if (inRelegation) zoneBorder = `${RED}60`;
            else if (inPlayoff || inMedPlayoff) zoneBorder = `${ORANGE}50`;
            else if (inPromotion) zoneBorder = `${GREEN}60`;

            let zoneBg = "#fff";
            if (inRelegation) zoneBg = `${RED}06`;
            else if (inPlayoff || inMedPlayoff) zoneBg = `${ORANGE}06`;
            else if (inPromotion) zoneBg = `${GREEN}06`;

            // Your team gets a distinct style that doesn't conflict with zones
            const myTeamStyle = t.isMyTeam ? {
              boxShadow: `inset 0 0 0 2px ${BLUE}`,
              background: `rgba(108,184,224,0.06)`
            } : {};

            // Player contribution
            const combined = t.p1Total + t.p2Total;
            const p1Pct = combined > 0 ? Math.round((t.p1Total / combined) * 100) : 50;
            const p2Pct = 100 - p1Pct;

            return (
              <div key={t.id}>
                {divName === "championship" && pos === 8 && <ZoneSep label="Playoff Zone" color={ORANGE} />}
                {divName === "championship" && pos === 10 && <ZoneSep label="Relegation Zone" color={RED} />}
                {divName === "second" && pos === 1 && <ZoneSep label="Promotion Zone" color={GREEN} />}
                {divName === "second" && pos === 4 && <ZoneSep label="Playoff Zone" color={ORANGE} />}
                {divName === "second" && pos === 6 && <div style={{ padding: "6px 14px" }}><div style={{ height: 1, background: BORDER }} /></div>}

                <button onClick={() => setExpanded(isExpanded ? null : t.id)} style={{
                  width: "100%", padding: "10px 14px", borderRadius: 12,
                  border: `2px solid ${zoneBorder}`, background: zoneBg,
                  display: "flex", alignItems: "center", gap: 0, cursor: "pointer", textAlign: "left",
                  ...myTeamStyle
                }}>
                  <div style={{ minWidth: 24, textAlign: "center", fontFamily: FD, fontWeight: 900, fontSize: 13, color: TEXT2 }}>{rank}</div>
                  <div style={{ marginLeft: 8 }}><TeamLogo name={t.name} size={44} division={t.division} logoUrl={t.logo_url} /></div>
                  <div style={{ flex: 1, minWidth: 0, marginLeft: 8 }}>
                    <p style={{ fontFamily: FD, fontWeight: 700, fontSize: 15, color: t.isMyTeam ? BLUEDARK : TEXT, margin: 0 }}>
                      {t.name}{t.isMyTeam ? " ⭐" : ""}
                    </p>
                    <div style={{ display: "flex", gap: 8, marginTop: 3 }}>
                      {[{ name: t.p1Name }, { name: t.p2Name }].map((p, i) => {
                        const initials = (p.name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                        let hash = 0;
                        for (let c = 0; c < (p.name || "").length; c++) hash = (p.name || "").charCodeAt(c) + ((hash << 5) - hash);
                        const hue = (Math.abs(hash) * 137) % 360;
                        const bg = `hsl(${hue}, 50%, 60%)`;
                        return (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                            <div style={{ width: 18, height: 18, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: FD, fontWeight: 900, fontSize: 7, color: "#fff" }}>{initials}</div>
                            <span style={{ fontFamily: FB, fontSize: 10, color: TEXT }}>{shortName(p.name)}</span>
                          </div>
                        );
                      })}
                    </div>
                    {t.weeklyResults.length > 0 && (
                      <div style={{ display: "flex", gap: 3, marginTop: 3 }}>
                        {t.weeklyResults.slice(-5).map((wr, i) => {
                          const letter = wr.won === true ? "W" : wr.won === false ? "L" : "D";
                          const color = wr.won === true ? GREEN : wr.won === false ? RED : TEXT2;
                          const hasBBBorder = wr.decidedByBoxBox;
                          return (
                            <span key={i} style={{
                              fontFamily: FD, fontWeight: 800, fontSize: 10, color,
                              width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center",
                              borderRadius: 4,
                              border: hasBBBorder ? `2px solid ${color}` : "none",
                              background: hasBBBorder ? `${color}12` : "transparent"
                            }}>{letter}</span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div style={{ minWidth: 50, textAlign: "center" }}>
                    <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 20, color: BLUEDARK }}>{t.totalTeamPts}</span>
                  </div>
                  <div style={{ minWidth: 36, textAlign: "center" }}>
                    <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 13, color: TEXT2 }}>{t.totalWins}</span>
                  </div>
                  <div style={{ minWidth: 48, textAlign: "center" }}>
                    <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 13, color: TEXT2 }}>{t.avgMatchupScore.toFixed(1)}</span>
                  </div>
                  <span style={{ fontSize: 11, color: TEXT2, transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", width: 16, textAlign: "center" }}>▼</span>
                </button>

                {isExpanded && (
                  <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderTop: "none", borderRadius: "0 0 12px 12px", padding: "12px 14px", marginTop: -2 }}>
                    {/* Player contribution */}
                    <div style={{ marginBottom: 12 }}>
                      <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 9, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 6px" }}>Season Contribution</p>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <span style={{ fontFamily: FB, fontSize: 10, fontWeight: 600, color: TEXT }}>{shortName(t.p1Name)}</span>
                            <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 11, color: BLUEDARK }}>{p1Pct}%</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 3, background: `${BORDER}40`, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${p1Pct}%`, background: BLUEDARK, borderRadius: 3 }} />
                          </div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <span style={{ fontFamily: FB, fontSize: 10, fontWeight: 600, color: TEXT }}>{shortName(t.p2Name)}</span>
                            <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 11, color: ORANGE }}>{p2Pct}%</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 3, background: `${BORDER}40`, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${p2Pct}%`, background: ORANGE, borderRadius: 3 }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Upcoming matchups */}
                    {upcoming.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 9, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 6px" }}>Upcoming</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {upcoming.map((u, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", borderRadius: 8, background: "#ededef" }}>
                              <span style={{ fontFamily: FB, fontSize: 11, color: TEXT2 }}>R{u.round} — {u.raceName}</span>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontFamily: FD, fontWeight: 300, fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", padding: "1px 5px", borderRadius: 100, color: u.isOver ? GOLD : "#7c5cbf", background: u.isOver ? `${GOLD}15` : "#7c5cbf15" }}>
                                  {u.isOver ? "Over" : "Under"}
                                </span>
                                <span style={{ fontFamily: FB, fontSize: 11, fontWeight: 600, color: TEXT }}>
                                  vs {u.opponentName} <span style={{ color: TEXT2, fontWeight: 400 }}>({u.oppRank}{u.oppRank === 1 ? "st" : u.oppRank === 2 ? "nd" : u.oppRank === 3 ? "rd" : "th"})</span>
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Past results */}
                    {t.weeklyResults.length > 0 && (
                      <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 9, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 6px" }}>Results</p>
                    )}
                    {t.weeklyResults.length === 0 && upcoming.length === 0 ? (
                      <p style={{ fontFamily: FB, fontSize: 12, color: TEXT2, margin: 0 }}>No race results yet</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {t.weeklyResults.map(wr => (
                          <div key={wr.raceId} style={{
                            padding: "10px 12px", borderRadius: 10,
                            background: wr.won === true ? `${GREEN}08` : wr.won === false ? `${RED}08` : `${BORDER}30`,
                            border: `1px solid ${wr.won === true ? `${GREEN}25` : wr.won === false ? `${RED}25` : BORDER}`
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                              <div>
                                <p style={{ fontFamily: FD, fontWeight: 700, fontSize: 11, color: TEXT, margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                  R{wr.round} — {wr.raceName}
                                </p>
                                <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 11, color: wr.won === true ? GREEN : wr.won === false ? RED : TEXT2, textTransform: "uppercase" }}>
                                  {wr.won === true ? "WIN" : wr.won === false ? "LOSS" : "TIE"}
                                </span>
                              </div>
                              {/* Champ Pts right-aligned */}
                              <div style={{ textAlign: "right" }}>
                                <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 20, color: BLUEDARK }}>{wr.teamPtsEarned ?? "—"}</span>
                                <p style={{ fontFamily: FD, fontWeight: 600, fontSize: 7, color: TEXT2, margin: 0, textTransform: "uppercase" }}>Champ Pts</p>
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <StatBadge label="Score" value={wr.matchupScore} />
                              <StatBadge label="vs" value={`${wr.opponentName || "—"} (${wr.opponentMatchupScore ?? "—"})`} text />
                              {wr.boxBoxCorrect && (
                                <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 10, color: GREEN, background: `${GREEN}12`, padding: "4px 8px", borderRadius: 8 }}>✓ BOX BOX</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 20px 100px" }}>
      <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 22, color: DARK, textTransform: "uppercase", letterSpacing: "0.03em", margin: "0 0 4px" }}>Team Standings</p>
      <p style={{ fontFamily: FB, fontSize: 13, color: TEXT2, marginBottom: 16 }}>
        {hasData ? `${racesCompleted} race${racesCompleted !== 1 ? "s" : ""} completed` : "No race results yet"}
      </p>

      <button onClick={() => secondDivRef.current?.scrollIntoView({ behavior: "smooth" })} style={{
        display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8,
        border: `1px solid ${BORDER}`, background: "#fff", cursor: "pointer", marginBottom: 16,
        fontFamily: FB, fontSize: 11, fontWeight: 600, color: TEXT2
      }}>↓ Jump to Second Division</button>

      {/* Promo/Rel dropdown */}
      <div style={{ marginBottom: 20 }}>
        <button onClick={() => setPromoOpen(!promoOpen)} style={{
          width: "100%", padding: "12px 14px", borderRadius: 12, border: `1px solid ${BORDER}`,
          background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, textAlign: "left"
        }}>
          <span style={{ fontSize: 14 }}>🔄</span>
          <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 11, color: TEXT, textTransform: "uppercase", letterSpacing: "0.08em", flex: 1 }}>Promotion & Relegation</span>
          <span style={{ fontSize: 11, color: TEXT2, transform: promoOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
        </button>
        {promoOpen && (
          <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderTop: "none", borderRadius: "0 0 12px 12px", padding: "12px 14px", marginTop: -2, fontFamily: FB, fontSize: 12, color: TEXT2, lineHeight: 1.55 }}>
            <p style={{ margin: "0 0 4px" }}>After 11 races, the <strong style={{ color: TEXT }}>bottom 3 teams</strong> (10th–12th) in Championship are <strong style={{ color: RED }}>relegated</strong> to Second Division. The <strong style={{ color: TEXT }}>top 3 teams</strong> in Second Division are <strong style={{ color: GREEN }}>promoted</strong> to Championship.</p>
            <p style={{ margin: "0 0 4px" }}><strong style={{ color: TEXT }}>8th and 9th</strong> in Championship face a <strong style={{ color: BLUEDARK }}>one-race playoff</strong> to keep their spot.</p>
            <p style={{ margin: 0 }}><strong style={{ color: TEXT }}>4th and 5th</strong> in Second Division face a <strong style={{ color: BLUEDARK }}>one-race playoff</strong> for the chance to move up.</p>
          </div>
        )}
      </div>

      {renderDivision(champTeams, "championship", "Championship", GOLD)}
      <div ref={secondDivRef}>{renderDivision(secondTeams, "second", "Second Division", SILVER)}</div>

      {lastUpdated && (
        <p style={{ fontFamily: FB, fontSize: 10, color: TEXT2, textAlign: "center", marginTop: 20 }}>
          Last updated {new Date(lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
        </p>
      )}
    </div>
  );
}

function ZoneSep({ label, color }) {
  return (
    <div style={{ fontFamily: "'Geologica', sans-serif", fontWeight: 700, fontSize: 9, color, textTransform: "uppercase", letterSpacing: "0.1em", padding: "10px 14px 4px", display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ flex: 1, height: 1, background: `${color}30` }} />
      <span>{label}</span>
      <span style={{ flex: 1, height: 1, background: `${color}30` }} />
    </div>
  );
}

function StatBadge({ label, value, color, text }) {
  const c = color || "#6b6b80";
  return (
    <div style={{ padding: "4px 8px", borderRadius: 8, background: `${c}10`, display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9.5, color: "#6b6b80" }}>{label}</span>
      <span style={{ fontFamily: text ? "'DM Sans', sans-serif" : "'Geologica', sans-serif", fontWeight: text ? 600 : 800, fontSize: text ? 10 : 11, color: text ? "#1e1e2a" : c }}>{value}</span>
    </div>
  );
}
