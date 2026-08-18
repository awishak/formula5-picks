import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";


import { DARK, BLUE, BLUEDARK, GREEN, RED, ORANGE, TEXT, TEXT2, BORDER, GOLD, SILVER, FD, FB, avatarColor } from "./theme";

// Players who played in prior F5 seasons but not 2025
const DID_NOT_PLAY_2025 = new Set(["Stacy Michaelsen"]);
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

// 2025 trophies — used for "2025 Trophies" sort
const TROPHIES_2025 = {
  "Andrew Ishak": "🚾🏆🥈🥈🥉🥉🛞", "George Fahmy": "🏆🏆🏆🏆🥉",
  "Krista Nabil": "🏆🥉", "Rafik Zarifa": "🏆🥈🥈🥈🥉",
  "Mena Yousef": "🏆🥈🥉", "Aditya Satish": "🏆🏆🥈",
  "Heather Ishak": "🏆🛞🏁", "Martin Nobar": "🥉🥉",
  "Moses Abdelshaid": "🏆", "Alicia Cho": "🥈🥉",
  "Kerolos Nakhla": "🥈🥉", "Joe McGlynn": "🥉",
  "Scott Schertler": "🏆🥈🛞", "Anthony Carnesecca": "🏆",
  "Evie Ishak": "🥈🥉", "Jack Civitts": "🏆🥈🥈",
  "Nick Brody": "🏆🥉🛞", "Ryan Kohli": "🥈🥈",
  "Harold Gutmann": "🥉", "Theo Ishak": "🥉",
  "Kevin Coolidge": "🏆🏆🥈🥉", "Zack Girgis": "🥈🛞",
  "Lucia Thompson": "🏆🥉", "Paul Kohli": "🥉🥉🛞",
  "Brett Dillon": "🏆", "Andy Thompson": "🥈🥈",
  "Chris Fondacaro": "🥈", "Maggie Mudge": "🥉",
  "Jacob Ford": "🏆", "Anthony Zamary": "🥉",
  "Grant Wong": "🏆🥈", "Chris Malek": "🏆",
  "Ramy Stephanos": "🥈🥈🥉", "Brian Dong": "🏆🥉",
  "Kristin Eskind": "🥈🥉"
};

function countTrophies2025(name) {
  const str = TROPHIES_2025[name];
  if (!str) return 0;
  return [...str].length;
}

// Standard competition ranking: tied players (equal key) share a rank, the next rank skips.
// Returns an array of { rank, tied } aligned with the input order.
function competitionRanks(sorted, keyFn) {
  const ranks = sorted.map((p, i) =>
    (i > 0 && keyFn(sorted[i]) === keyFn(sorted[i - 1])) ? null : i + 1
  );
  for (let i = 1; i < ranks.length; i++) if (ranks[i] === null) ranks[i] = ranks[i - 1];
  const counts = {};
  ranks.forEach(r => { counts[r] = (counts[r] || 0) + 1; });
  return ranks.map(r => ({ rank: r, tied: counts[r] > 1 }));
}

function PlayerAvatar({ name, size = 30, photoUrl }) {
  const bg = avatarColor(name);
  const parts = (name || "?").split(" ");
  const initials = parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0][0].toUpperCase();
  if (photoUrl) return (
    <img src={photoUrl} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
  );
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: FD, fontWeight: 900, fontSize: size * 0.36, color: "#fff" }}>{initials}</div>
  );
}

function TeamLogo({ name, size = 28, division, logoUrl }) {
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
function niceCeil(v) {
  if (v <= 0) return 10;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / mag;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * mag;
}

function ScatterView({ standings, getTeamInfo, currentUser, myPlayerId }) {
  const BRONZE = "#CD7F32";
  const scrollRef = useRef(null);
  const [selectedId, setSelectedId] = useState(null);
  const N = standings.length;

  // Tie-aware rank per player (standings arrives sorted by total points desc)
  const rankInfo = competitionRanks(standings, p => p.totalPts);

  // Layout
  const COL = 46, AV = 32, H = 340, PAD_TOP = 20, PAD_BOTTOM = 40, PAD_SIDE = COL / 2;
  const plotW = Math.max(N * COL, 300);
  const plotH = H - PAD_TOP - PAD_BOTTOM;
  const maxPts = Math.max(...standings.map(p => p.totalPts), 0);
  const yMax = niceCeil(maxPts);
  // Leader (rank 1) at far right → idx 0 rightmost
  const xOf = (idx) => plotW - PAD_SIDE - idx * COL;
  const yOf = (pts) => PAD_TOP + (1 - pts / yMax) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(yMax * f));

  // Auto-scroll to the right so the leaders are visible first
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
  }, [N]);

  if (maxPts <= 0) {
    return <p style={{ fontFamily: FB, fontSize: 13, color: TEXT2, padding: "30px 0", textAlign: "center" }}>No scores yet — the chart appears once races are scored.</p>;
  }

  const pts = standings.map((p, idx) => ({ x: xOf(idx), y: yOf(p.totalPts) }));
  const linePoints = [...pts].sort((a, b) => a.x - b.x).map(pt => `${pt.x},${pt.y}`).join(" ");

  const selected = standings.find(p => p.id === selectedId);
  const selIdx = selected ? standings.indexOf(selected) : -1;
  const selInfo = selIdx >= 0 ? rankInfo[selIdx] : null;
  const selTeam = selected ? getTeamInfo(selected.id) : null;

  return (
    <div>
      <div style={{ display: "flex" }}>
        {/* Y axis */}
        <div style={{ width: 32, height: H, position: "relative", flexShrink: 0 }}>
          {ticks.map(t => (
            <div key={t} style={{ position: "absolute", right: 4, top: yOf(t) - 6, fontFamily: FD, fontWeight: 700, fontSize: 9, color: TEXT2 }}>{t}</div>
          ))}
        </div>
        {/* Scrollable plot */}
        <div ref={scrollRef} style={{ overflowX: "auto", flex: 1, WebkitOverflowScrolling: "touch" }}>
          <div style={{ position: "relative", width: plotW, height: H }}>
            {/* Gridlines */}
            {ticks.map(t => (
              <div key={t} style={{ position: "absolute", left: 0, right: 0, top: yOf(t), height: 1, background: t === 0 ? BORDER : `${BORDER}55` }} />
            ))}
            {/* Connecting curve */}
            <svg width={plotW} height={H} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}>
              <polyline points={linePoints} fill="none" stroke={BLUE} strokeWidth={2} strokeOpacity={0.45} strokeLinejoin="round" />
            </svg>
            {/* Points — all players, each clickable */}
            {standings.map((p, idx) => {
              const { rank, tied } = rankInfo[idx];
              const isMe = p.name === currentUser;
              const isSel = p.id === selectedId;
              const ring = isSel ? BLUEDARK : rank === 1 ? GOLD : rank === 2 ? SILVER : rank === 3 ? BRONZE : isMe ? BLUE : "#fff";
              const cx = xOf(idx), cy = yOf(p.totalPts);
              return (
                <button key={p.id} onClick={() => setSelectedId(isSel ? null : p.id)}
                  title={`${tied ? "T" : ""}#${rank} ${p.name} — ${p.totalPts} pts`}
                  style={{ position: "absolute", left: cx - AV / 2, top: cy - AV / 2, width: AV, textAlign: "center", border: "none", background: "transparent", padding: 0, cursor: "pointer", zIndex: isSel ? 3 : 2 }}>
                  <div style={{ width: AV, height: AV, borderRadius: "50%", border: `${isSel ? 3 : 2.5}px solid ${ring}`, boxShadow: isSel ? `0 0 0 3px ${BLUE}44` : `0 1px 3px rgba(0,0,0,0.15)`, boxSizing: "border-box", overflow: "hidden" }}>
                    <PlayerAvatar name={p.name} size={AV - 5} photoUrl={p.photo_url} />
                  </div>
                  <div style={{ fontFamily: FD, fontWeight: 800, fontSize: 9, color: isMe ? BLUEDARK : TEXT2, marginTop: 2, whiteSpace: "nowrap" }}>
                    {p.name.split(" ")[0]}
                  </div>
                  <div style={{ fontFamily: FD, fontWeight: 900, fontSize: 9, color: TEXT2 }}>{tied ? `T${rank}` : `#${rank}`}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, paddingLeft: 32 }}>
        <span style={{ fontFamily: FB, fontSize: 10, color: TEXT2 }}>← lower ranked</span>
        <span style={{ fontFamily: FB, fontSize: 10, color: TEXT2 }}>higher ranked →</span>
      </div>

      {/* Tap-to-inspect detail card */}
      {selected ? (
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, border: `2px solid ${BLUE}`, background: "rgba(108,184,224,0.08)" }}>
          <PlayerAvatar name={selected.name} size={44} photoUrl={selected.photo_url} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: FB, fontWeight: 700, fontSize: 16, color: TEXT, margin: 0 }}>
              {selected.name}{selected.name === currentUser ? " (you)" : ""}
              {myPlayerId && selTeam?.teammateId === myPlayerId ? " (teammate)" : ""}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
              {selTeam?.logoUrl && <img src={selTeam.logoUrl} style={{ width: 14, height: 14, borderRadius: "50%", objectFit: "cover" }} />}
              <p style={{ fontFamily: FB, fontSize: 12, color: TEXT2, margin: 0 }}>{selTeam?.name || ""}</p>
              {selected.trophies.filter(t => t !== "●").length > 0 && (
                <span style={{ fontSize: 13 }}>{selected.trophies.filter(t => t !== "●").join("")}</span>
              )}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 22, color: BLUEDARK }}>{selected.totalPts}</span>
            <p style={{ fontFamily: FD, fontWeight: 700, fontSize: 10, color: TEXT2, margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {selInfo?.tied ? `Tied ${selInfo.rank}` : `Rank ${selInfo?.rank}`}
            </p>
            <p style={{ fontFamily: FB, fontSize: 10, color: TEXT2, margin: "2px 0 0" }}>
              Last race {selected.lastRacePts != null ? `${selected.lastRacePts} pts` : "—"} · T10: {selected.topTens || 0}
            </p>
          </div>
        </div>
      ) : (
        <p style={{ fontFamily: FB, fontSize: 10, color: TEXT2, textAlign: "center", marginTop: 8 }}>
          Total points (vertical) by rank (horizontal). Leader at far right. Tap any avatar for details.
        </p>
      )}
    </div>
  );
}

export default function PlayerStandings({ currentUser }) {
  const [standings, setStandings] = useState([]);
  const [teams, setTeams] = useState([]);
  const [races, setRaces] = useState([]);
  const [raceScores, setRaceScores] = useState({});
  const [racePicks, setRacePicks] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [raceRankings, setRaceRankings] = useState({});
  const [schedule, setSchedule] = useState([]);
  const [allScores, setAllScores] = useState([]);
  const [sortBy, setSortBy] = useState("points");
  const [lastRaceId, setLastRaceId] = useState(null);
  const [viewMode, setViewMode] = useState("list");

  useEffect(() => {
    async function load() {
      try {
        const [{ data: players }, { data: teamData }, { data: scores }, { data: raceData }, { data: picksData }, { data: scheduleData }] = await Promise.all([
          supabase.from("players").select("*"),
          supabase.from("teams").select("*"),
          supabase.from("scores").select("*"),
          supabase.from("races").select("id, race_name, round, pick_deadline").order("round", { ascending: true }),
          supabase.from("picks").select("*"),
          supabase.from("schedule").select("*")
        ]);
        if (teamData) setTeams(teamData);
        if (raceData) setRaces(raceData);
        setSchedule(scheduleData || []);
        setAllScores(scores || []);

        const picksMap = {};
        (picksData || []).forEach(pk => {
          if (!picksMap[pk.player_id]) picksMap[pk.player_id] = {};
          picksMap[pk.player_id][pk.race_id] = pk;
        });
        setRacePicks(picksMap);

        const playerMap = {};
        (players || []).forEach(p => { playerMap[p.id] = { id: p.id, name: p.name, photo_url: p.photo_url || null, totalPts: 0, raceCount: 0, trophies: [], wins: 0, podiums: 0, topTens: 0 }; });

        const raceScoresMap = {};
        const playerRaceTotals = {};
        (scores || []).forEach(s => {
          const total = (s.top_pick_pts || 0) + (s.midfield_pts || 0) + (s.order_bonus || 0) + (s.best_finish_bonus || 0) + (s.pit_individual_pts || 0) + (s.weekly_bonus_pts || 0);
          if (playerMap[s.player_id]) { playerMap[s.player_id].totalPts += total; playerMap[s.player_id].raceCount += 1; }
          if (!playerRaceTotals[s.player_id]) playerRaceTotals[s.player_id] = {};
          playerRaceTotals[s.player_id][s.race_id] = total;
          if (!raceScoresMap[s.player_id]) raceScoresMap[s.player_id] = [];
          raceScoresMap[s.player_id].push({ ...s, total_pts: total });
        });
        setRaceScores(raceScoresMap);

        // Compute last race pts for each player
        const scoredRaceIds = new Set((scores || []).map(s => s.race_id));
        const scoredRaces = (raceData || []).filter(r => scoredRaceIds.has(r.id));
        const maxRound = scoredRaces.length > 0 ? Math.max(...scoredRaces.map(r => r.round)) : 0;
        const lastScoredRaceId = scoredRaces.find(r => r.round === maxRound)?.id;
        setLastRaceId(lastScoredRaceId ?? null);
        Object.values(playerMap).forEach(p => {
          const lastScore = lastScoredRaceId ? (raceScoresMap[p.id] || []).find(s => s.race_id === lastScoredRaceId) : null;
          p.lastRacePts = lastScore ? lastScore.total_pts : null;
        });

        const racesWithScores = new Set();
        (scores || []).forEach(s => racesWithScores.add(s.race_id));
        const rankings = {};
        racesWithScores.forEach(raceId => {
          const entries = Object.keys(playerMap)
            .filter(pid => playerRaceTotals[pid]?.[raceId] !== undefined)
            .map(pid => ({ pid, score: playerRaceTotals[pid][raceId] }))
            .sort((a, b) => b.score - a.score);
          entries.forEach((entry, idx) => {
            const place = idx + 1;
            if (place === 1) { playerMap[entry.pid].trophies.push("🏆"); playerMap[entry.pid].wins++; playerMap[entry.pid].podiums++; playerMap[entry.pid].topTens++; }
            else if (place === 2) { playerMap[entry.pid].trophies.push("🥈"); playerMap[entry.pid].podiums++; playerMap[entry.pid].topTens++; }
            else if (place === 3) { playerMap[entry.pid].trophies.push("🥉"); playerMap[entry.pid].podiums++; playerMap[entry.pid].topTens++; }
            else if (place <= 10) { playerMap[entry.pid].trophies.push("●"); playerMap[entry.pid].topTens++; }
            if (!rankings[raceId]) rankings[raceId] = {};
            rankings[raceId][entry.pid] = place;
          });
        });
        setRaceRankings(rankings);

        const sorted = Object.values(playerMap);
        sorted.forEach(p => { p.pts2025 = PTS_2025[p.name] || 0; p.trophies2025 = TROPHIES_2025[p.name] || ""; p.trophyCount2025 = countTrophies2025(p.name); });
        sorted.sort((a, b) => b.totalPts - a.totalPts);
        setStandings(sorted);
        const ts = (scores || []).map(s => s.calculated_at).filter(Boolean).sort().reverse();
        if (ts.length > 0) setLastUpdated(ts[0]);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    load();
  }, []);

  // Individual points run all 23 races and never reset, so these standings
  // cover the whole season. The team badge still shows the division a team is
  // in right now, which changes at round 12.
  const scoredRaceIds = new Set(allScores.map(s => s.race_id));
  const inSecondHalf = races.some(r => r.round >= 12 && scoredRaceIds.has(r.id));

  const getTeamInfo = (pid) => {
    const t = teams.find(t => t.player1_id === pid || t.player2_id === pid);
    if (!t) return { name: null, division: "second", teammateId: null, logoUrl: null };
    const mateId = t.player1_id === pid ? t.player2_id : t.player1_id;
    const division = (inSecondHalf ? t.division_h2 : t.division) || t.division || "second";
    return { name: t.name, division, teammateId: mateId, logoUrl: t.logo_url || null };
  };

  const getRaceName = (raceId) => { const r = races.find(r => r.id === raceId); return r ? `R${r.round} – ${r.race_name}` : "Race"; };
  const getRaceRound = (raceId) => { const r = races.find(r => r.id === raceId); return r ? r.round : 0; };
  const placeSuffix = (p) => p === 1 ? "st" : p === 2 ? "nd" : p === 3 ? "rd" : "th";
  const BRONZE = "#CD7F32";

  // Get team matchup result for a player in a given race
  const getMatchupResult = (playerId, raceId) => {
    const myTeam = teams.find(t => t.player1_id === playerId || t.player2_id === playerId);
    if (!myTeam) return null;
    const matchup = schedule.find(m => m.race_id === raceId && (m.home_team_id === myTeam.id || m.away_team_id === myTeam.id));
    if (!matchup) return null;
    const oppId = matchup.home_team_id === myTeam.id ? matchup.away_team_id : matchup.home_team_id;
    const oppTeam = teams.find(t => t.id === oppId);
    const base = (pid) => {
      const s = allScores.find(sc => sc.player_id === pid && sc.race_id === raceId);
      return s ? (s.top_pick_pts || 0) + (s.midfield_pts || 0) + (s.order_bonus || 0) + (s.best_finish_bonus || 0) : 0;
    };
    const pitBonus = (teamId) => {
      const t = teams.find(t => t.id === teamId);
      if (!t) return 0;
      const s = allScores.find(sc => sc.player_id === t.player1_id && sc.race_id === raceId);
      return s?.pit_matchup_pts || 0;
    };
    const myScore = base(myTeam.player1_id) + base(myTeam.player2_id) + pitBonus(myTeam.id);
    const oppScore = base(oppTeam?.player1_id) + base(oppTeam?.player2_id) + pitBonus(oppId);
    const won = myScore > oppScore;
    const lost = myScore < oppScore;
    return { myScore, oppScore, oppName: oppTeam?.name || "?", won, lost };
  };

  if (loading) return <div style={{ padding: "60px 20px", textAlign: "center" }}><p style={{ fontFamily: FB, fontSize: 14, color: TEXT2 }}>Loading standings…</p></div>;

  const hasScores = standings.some(s => s.raceCount > 0);
  const myPlayerId = standings.find(s => s.name === currentUser)?.id;

  // Points-based rank (always, regardless of sort). Tie-aware: equal totals share a rank.
  const pointsRanked = [...standings].sort((a, b) => b.totalPts - a.totalPts);
  const pointsRank = {};
  const pointsTied = {};
  competitionRanks(pointsRanked, p => p.totalPts).forEach((r, i) => {
    pointsRank[pointsRanked[i].id] = r.rank;
    pointsTied[pointsRanked[i].id] = r.tied;
  });

  // Last-race rank (place each player earned in the most recent scored race)
  const lastRaceRank = lastRaceId ? (raceRankings[lastRaceId] || {}) : {};
  const byLastRace = sortBy === "lastrace";

  const sortedStandings = [...standings].sort((a, b) => {
    switch (sortBy) {
      case "points": return b.totalPts - a.totalPts || (b.lastRacePts || 0) - (a.lastRacePts || 0);
      case "lastrace": return (b.lastRacePts || 0) - (a.lastRacePts || 0) || b.totalPts - a.totalPts;
      case "first": return a.name.split(" ")[0].localeCompare(b.name.split(" ")[0]);
      case "last": return (a.name.split(" ").pop()).localeCompare(b.name.split(" ").pop());
      case "trophies": return b.trophies.length - a.trophies.length || b.totalPts - a.totalPts;
      default: return b.totalPts - a.totalPts;
    }
  });

  // Tie-aware rank for the displayed order. Name sorts have no meaningful ties.
  const rankKeyFn = {
    points: p => p.totalPts,
    lastrace: p => (p.lastRacePts ?? -Infinity),
    trophies: p => p.trophies.length,
    first: (_p, i) => i,
    last: (_p, i) => i,
  }[sortBy] || (p => p.totalPts);
  const listRanks = competitionRanks(sortedStandings, (p) => rankKeyFn(p, sortedStandings.indexOf(p)));

  return (
    <div style={{ padding: "20px 20px 100px" }}>
      <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 22, color: DARK, textTransform: "uppercase", letterSpacing: "0.03em", margin: "0 0 4px" }}>Player Standings</p>
      <p style={{ fontFamily: FB, fontSize: 13, color: TEXT2, marginBottom: 16 }}>
        {hasScores ? `${standings[0]?.raceCount || 0} race${(standings[0]?.raceCount || 0) !== 1 ? "s" : ""} completed` : "No race results yet"}
      </p>

      {/* View toggle */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {[
          { id: "list", label: "List" },
          { id: "chart", label: "Chart" },
        ].map(v => (
          <button key={v.id} onClick={() => setViewMode(v.id)} style={{
            padding: "6px 16px", borderRadius: 100, cursor: "pointer",
            border: `1px solid ${viewMode === v.id ? DARK : BORDER}`,
            background: viewMode === v.id ? DARK : "transparent",
            color: viewMode === v.id ? "#fff" : TEXT2,
            fontFamily: FD, fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em"
          }}>{v.label}</button>
        ))}
      </div>

      {viewMode === "chart" ? (
        <ScatterView standings={pointsRanked} getTeamInfo={getTeamInfo} currentUser={currentUser} myPlayerId={myPlayerId} />
      ) : (
      <>
      {/* Keys */}
      <div style={{ display: "flex", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <span style={{ fontSize: 16 }}>🏆</span>
          <span style={{ fontFamily: FB, fontSize: 9, color: TEXT2 }}>1st</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <span style={{ fontSize: 16 }}>🥈</span>
          <span style={{ fontFamily: FB, fontSize: 9, color: TEXT2 }}>2nd</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <span style={{ fontSize: 16 }}>🥉</span>
          <span style={{ fontFamily: FB, fontSize: 9, color: TEXT2 }}>3rd</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <span style={{ fontSize: 12 }}>●</span>
          <span style={{ fontFamily: FB, fontSize: 9, color: TEXT2 }}>Top 10</span>
        </div>
      </div>
      <p style={{ fontFamily: FB, fontSize: 9, color: TEXT2, margin: "0 0 12px" }}>
        Total Pts = sum of all individual race scores + weekly top-10 bonuses
      </p>

      {/* Sort options */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 9, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.06em", alignSelf: "center", marginRight: 2 }}>Sort</span>
        {[
          { id: "points", label: "Points" },
          { id: "lastrace", label: "Last Race" },
          { id: "first", label: "First Name" },
          { id: "last", label: "Last Name" },
          { id: "trophies", label: "Trophies" },
        ].map(s => (
          <button key={s.id} onClick={() => setSortBy(s.id)} style={{
            padding: "5px 10px", borderRadius: 100, cursor: "pointer",
            border: `1px solid ${sortBy === s.id ? DARK : BORDER}`,
            background: sortBy === s.id ? DARK : "transparent",
            color: sortBy === s.id ? "#fff" : TEXT2,
            fontFamily: FD, fontWeight: 700, fontSize: 10
          }}>{s.label}</button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {/* Column headers */}
        <div style={{ display: "flex", alignItems: "center", padding: "0 14px 4px", gap: 0 }}>
          <div style={{ minWidth: 28 }} />
          <div style={{ flex: 1, marginLeft: 50 }}>
            <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 9, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.08em" }}>Player</span>
          </div>
          <div style={{ width: 90, display: "flex", flexShrink: 0 }}>
            <div style={{ width: 45, textAlign: "center" }}>
              <span style={{ fontFamily: FD, fontWeight: byLastRace ? 700 : 900, fontSize: 9, color: byLastRace ? TEXT2 : BLUEDARK, textTransform: "uppercase", letterSpacing: "0.08em" }}>Total</span>
            </div>
            <div style={{ width: 45, textAlign: "center" }}>
              <span style={{ fontFamily: FD, fontWeight: byLastRace ? 900 : 700, fontSize: 9, color: byLastRace ? BLUEDARK : TEXT2, textTransform: "uppercase", letterSpacing: "0.08em" }}>Last</span>
            </div>
          </div>
          <div style={{ width: 44, textAlign: "center", flexShrink: 0 }} />
          <div style={{ width: 16 }} />
        </div>
        {sortedStandings.map((p, idx) => {
          const rank = listRanks[idx].rank;
          const isTied = listRanks[idx].tied;
          const isMe = p.name === currentUser;
          const isExpanded = expanded === p.id;
          const { name: teamName, division, teammateId, logoUrl } = getTeamInfo(p.id);
          const isMyTeammate = myPlayerId && teammateId === myPlayerId;
          const playerRaceScoresList = (raceScores[p.id] || []).sort((a, b) => getRaceRound(a.race_id) - getRaceRound(b.race_id));
          const last3 = playerRaceScoresList.slice(-3).reverse();
          // When sorting by last race, medals/border follow the last race's top 3; otherwise overall points.
          const badgeRank = byLastRace ? lastRaceRank[p.id] : pointsRank[p.id];
          const overallRank = pointsRank[p.id];

          return (
            <div key={p.id}>
              <button onClick={() => setExpanded(isExpanded ? null : p.id)} style={{
                width: "100%", padding: "10px 14px", borderRadius: 12,
                border: `2px solid ${
                  badgeRank === 1 ? GOLD
                  : badgeRank === 2 ? SILVER
                  : badgeRank === 3 ? BRONZE
                  : isMe ? BLUE : BORDER
                }`,
                background: isMe ? "rgba(108,184,224,0.08)" : "#fff",
                display: "flex", alignItems: "center", gap: 0, cursor: "pointer", textAlign: "left"
              }}>
                <div style={{ minWidth: 28, textAlign: "center", fontFamily: FD, fontWeight: 900, fontSize: isTied ? 13 : 16, color: TEXT2 }}>{isTied ? `T${rank}` : rank}</div>
                <div style={{ marginLeft: 8 }}><PlayerAvatar name={p.name} size={36} photoUrl={p.photo_url} /></div>
                <div style={{ flex: 1, minWidth: 0, marginLeft: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <p style={{ fontFamily: FB, fontWeight: isMe ? 700 : 500, fontSize: 16, color: isMe ? BLUEDARK : TEXT, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.name}{isMe ? " (you)" : ""}{isMyTeammate ? " (your teammate)" : ""}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                    {logoUrl && <img src={logoUrl} style={{ width: 14, height: 14, borderRadius: "50%", objectFit: "cover" }} />}
                    <p style={{ fontFamily: FB, fontSize: 11, color: TEXT2, margin: 0 }}>{teamName || ""}</p>
                    {byLastRace ? (
                      <>
                        {badgeRank === 1 && <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 9, color: GOLD, background: `${GOLD}15`, padding: "1px 6px", borderRadius: 4 }}>Last Race Winner</span>}
                        {badgeRank === 2 && <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 9, color: SILVER, background: `${SILVER}20`, padding: "1px 6px", borderRadius: 4 }}>Last P2</span>}
                        {badgeRank === 3 && <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 9, color: BRONZE, background: `${BRONZE}15`, padding: "1px 6px", borderRadius: 4 }}>Last P3</span>}
                        {overallRank <= 3 && <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 9, color: BLUEDARK, background: `${BLUE}18`, padding: "1px 6px", borderRadius: 4 }}>Overall P{overallRank}</span>}
                      </>
                    ) : (
                      <>
                        {badgeRank === 1 && <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 9, color: GOLD, background: `${GOLD}15`, padding: "1px 6px", borderRadius: 4 }}>Race Winner</span>}
                        {badgeRank === 2 && <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 9, color: SILVER, background: `${SILVER}20`, padding: "1px 6px", borderRadius: 4 }}>P2</span>}
                        {badgeRank === 3 && <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 9, color: BRONZE, background: `${BRONZE}15`, padding: "1px 6px", borderRadius: 4 }}>P3</span>}
                      </>
                    )}
                  </div>
                </div>
                <div style={{ width: 90, display: "flex", flexShrink: 0 }}>
                  <div style={{ width: 45, textAlign: "center" }}>
                    <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 20, color: p.totalPts > 0 ? BLUEDARK : TEXT2 }}>{p.totalPts}</span>
                  </div>
                  <div style={{ width: 45, textAlign: "center" }}>
                    <span style={{
                      fontFamily: FD, fontWeight: 900,
                      fontSize: byLastRace ? 20 : 17,
                      color: p.lastRacePts != null ? (byLastRace ? "#fff" : BLUEDARK) : TEXT2,
                      background: byLastRace && p.lastRacePts != null ? BLUEDARK : "transparent",
                      padding: byLastRace && p.lastRacePts != null ? "2px 8px" : 0,
                      borderRadius: 8, display: "inline-block"
                    }}>{p.lastRacePts != null ? p.lastRacePts : "—"}</span>
                  </div>
                </div>
                <div style={{ width: 44, textAlign: "center", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  {p.podiums > 0 && (
                    <div style={{ display: "flex", gap: 1, justifyContent: "center" }}>
                      {p.trophies.filter(t => t !== "●").map((t, i) => (
                        <span key={i} style={{ fontSize: 16 }}>{t}</span>
                      ))}
                    </div>
                  )}
                  {p.topTens > 0 && <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 10, color: TEXT2 }}>T10: {p.topTens}</span>}
                </div>
                <span style={{ fontSize: 11, color: TEXT2, transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", width: 16, textAlign: "center" }}>▼</span>
              </button>

              {isExpanded && (
                <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderTop: "none", borderRadius: "0 0 12px 12px", padding: "12px 14px", marginTop: -2 }}>
                  {last3.length > 0 ? (
                    <div>
                      <p style={{ fontFamily: FD, fontWeight: 700, fontSize: 11, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Recent Races</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {last3.map(s => {
                          const pick = racePicks[p.id]?.[s.race_id];
                          const topPick = pick?.top_pick;
                          const rawDP = s.driver_pts;
                          const driverPts = typeof rawDP === "string" ? JSON.parse(rawDP) : (rawDP || {});
                          const entries = Object.entries(driverPts);
                          const topEntry = entries.find(([d]) => d === topPick);
                          const midEntries = entries.filter(([d]) => d !== topPick).sort((a, b) => b[1] - a[1]);
                          const allDrivers = topEntry ? [topEntry, ...midEntries] : midEntries;
                          const ln = (n) => n ? n.split(" ").pop() : "?";
                          const place = raceRankings[s.race_id]?.[p.id];
                          const total = s.total_pts;
                          const matchup = getMatchupResult(p.id, s.race_id);
                          const bestFinishDisplay = pick?.best_finish ? (String(pick.best_finish).startsWith("P") ? pick.best_finish : `P${pick.best_finish}`) : "?";

                          return (
                            <div key={s.race_id} style={{ padding: "10px 12px", borderRadius: 10, background: `${DARK}03`, border: `1px solid ${BORDER}30` }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                <p style={{ fontFamily: FD, fontWeight: 700, fontSize: 13, color: TEXT, margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                  {getRaceName(s.race_id)}
                                </p>
                                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                  <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 18, color: BLUEDARK }}>{total} pts</span>
                                  {place && <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 13, color: place <= 3 ? GOLD : TEXT2 }}>({place}{placeSuffix(place)})</span>}
                                </div>
                              </div>

                              {/* Team matchup result */}
                              {matchup && (
                                <div style={{
                                  display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, marginBottom: 8,
                                  background: matchup.won ? `${GREEN}08` : matchup.lost ? `${RED}08` : `${DARK}04`,
                                  border: `1px solid ${matchup.won ? `${GREEN}20` : matchup.lost ? `${RED}20` : `${BORDER}40`}`
                                }}>
                                  <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 14, color: matchup.won ? GREEN : matchup.lost ? RED : TEXT2 }}>
                                    {matchup.won ? "W" : matchup.lost ? "L" : "T"}
                                  </span>
                                  <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 13, color: TEXT }}>
                                    {matchup.myScore} – {matchup.oppScore}
                                  </span>
                                  <span style={{ fontFamily: FB, fontSize: 12, color: TEXT2 }}>vs {matchup.oppName}</span>
                                </div>
                              )}

                              <div style={{ display: "flex", gap: 4, marginBottom: 8, overflow: "auto" }}>
                                {allDrivers.map(([driver, pts]) => {
                                  const isTop = topEntry && driver === topEntry[0];
                                  const pc = pts < 0 ? RED : pts > 0 ? ORANGE : BLUEDARK;
                                  const pbg = pts < 0 ? `${RED}10` : pts > 0 ? `${ORANGE}10` : `${BLUE}08`;
                                  return (
                                    <div key={driver} style={{ flex: "1 1 0", minWidth: 52, textAlign: "center", background: isTop ? `${BLUEDARK}08` : `${DARK}02`, borderRadius: 8, padding: "5px 3px", border: isTop ? `1px solid ${BLUEDARK}25` : "1px solid transparent" }}>
                                      {isTop && <p style={{ fontFamily: FD, fontWeight: 700, fontSize: 8, color: BLUEDARK, textTransform: "uppercase", margin: "0 0 1px" }}>TOP</p>}
                                      <p style={{ fontFamily: FB, fontWeight: 600, fontSize: 11, color: TEXT, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ln(driver)}</p>
                                      <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 12, color: pc, background: pbg, padding: "1px 5px", borderRadius: 4, display: "inline-block", marginTop: 2 }}>
                                        {pts > 0 ? `+${pts}` : `${pts}`}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                <span style={{ padding: "4px 8px", borderRadius: 6, background: `${DARK}04`, fontFamily: FB, fontSize: 12, fontWeight: 600, color: TEXT2 }}>
                                  Order {s.order_bonus > 0 ? <span style={{ color: ORANGE }}>✓+6</span> : "✗"}
                                </span>
                                <span style={{ padding: "4px 8px", borderRadius: 6, background: `${DARK}04`, fontFamily: FB, fontSize: 12, fontWeight: 600, color: TEXT2 }}>
                                  Best {bestFinishDisplay} {s.best_finish_bonus > 0 ? <span style={{ color: ORANGE }}>✓+3</span> : "✗"}
                                </span>
                                <span style={{ padding: "4px 8px", borderRadius: 6, background: `${DARK}04`, fontFamily: FB, fontSize: 12, fontWeight: 600, color: TEXT2 }}>
                                  Pit {pick?.pit_guess ? `${Number(pick.pit_guess).toFixed(1)}s` : "—"} <span style={{ color: s.pit_individual_pts > 0 ? ORANGE : TEXT2 }}>+{s.pit_individual_pts || 0}</span>
                                </span>
                                {(s.weekly_bonus_pts || 0) > 0 && (
                                  <span style={{ padding: "4px 8px", borderRadius: 6, background: `${GREEN}08`, fontFamily: FB, fontSize: 12, fontWeight: 600, color: GREEN }}>
                                    Top 10 +{s.weekly_bonus_pts}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontFamily: FB, fontSize: 12, color: TEXT2, margin: 0 }}>No race results yet</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
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
