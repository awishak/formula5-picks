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

function PlayerAvatar({ name, size = 30, photoUrl }) {
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) hash = (name || "").charCodeAt(i) + ((hash << 5) - hash);
  const hue = (Math.abs(hash) * 137) % 360;
  const bg = `hsl(${hue}, 50%, 60%)`;
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

  useEffect(() => {
    async function load() {
      try {
        const [{ data: players }, { data: teamData }, { data: scores }, { data: raceData }, { data: picksData }] = await Promise.all([
          supabase.from("players").select("id, name, photo_url"),
          supabase.from("teams").select("*"),
          supabase.from("scores").select("*"),
          supabase.from("races").select("id, race_name, round, pick_deadline").order("round", { ascending: true }),
          supabase.from("picks").select("*")
        ]);
        if (teamData) setTeams(teamData);
        if (raceData) setRaces(raceData);

        const picksMap = {};
        (picksData || []).forEach(pk => {
          if (!picksMap[pk.player_id]) picksMap[pk.player_id] = {};
          picksMap[pk.player_id][pk.race_id] = pk;
        });
        setRacePicks(picksMap);

        const playerMap = {};
        (players || []).forEach(p => { playerMap[p.id] = { id: p.id, name: p.name, totalPts: 0, raceCount: 0, trophies: [] }; });

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
            if (place === 1) playerMap[entry.pid].trophies.push("🏆");
            else if (place === 2) playerMap[entry.pid].trophies.push("🥈");
            else if (place === 3) playerMap[entry.pid].trophies.push("🥉");
            else if (place <= 10) playerMap[entry.pid].trophies.push("●");
            if (!rankings[raceId]) rankings[raceId] = {};
            rankings[raceId][entry.pid] = place;
          });
        });
        setRaceRankings(rankings);

        const sorted = Object.values(playerMap).sort((a, b) => b.totalPts - a.totalPts);
        setStandings(sorted);
        const ts = (scores || []).map(s => s.calculated_at).filter(Boolean).sort().reverse();
        if (ts.length > 0) setLastUpdated(ts[0]);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    load();
  }, []);

  const getTeamInfo = (pid) => {
    const t = teams.find(t => t.player1_id === pid || t.player2_id === pid);
    if (!t) return { name: null, division: "second", teammateId: null, logoUrl: null };
    const mateId = t.player1_id === pid ? t.player2_id : t.player1_id;
    return { name: t.name, division: t.division || "second", teammateId: mateId, logoUrl: t.logo_url || null };
  };

  const getRaceName = (raceId) => { const r = races.find(r => r.id === raceId); return r ? `R${r.round} – ${r.race_name}` : "Race"; };
  const getRaceRound = (raceId) => { const r = races.find(r => r.id === raceId); return r ? r.round : 0; };
  const placeSuffix = (p) => p === 1 ? "st" : p === 2 ? "nd" : p === 3 ? "rd" : "th";

  if (loading) return <div style={{ padding: "60px 20px", textAlign: "center" }}><p style={{ fontFamily: FB, fontSize: 14, color: TEXT2 }}>Loading standings…</p></div>;

  const hasScores = standings.some(s => s.raceCount > 0);
  const myPlayerId = standings.find(s => s.name === currentUser)?.id;

  return (
    <div style={{ padding: "20px 20px 100px" }}>
      <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 22, color: DARK, textTransform: "uppercase", letterSpacing: "0.03em", margin: "0 0 4px" }}>Player Standings</p>
      <p style={{ fontFamily: FB, fontSize: 13, color: TEXT2, marginBottom: 16 }}>
        {hasScores ? `${standings[0]?.raceCount || 0} race${(standings[0]?.raceCount || 0) !== 1 ? "s" : ""} completed` : "No race results yet"}
      </p>

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
      <p style={{ fontFamily: FB, fontSize: 9, color: TEXT2, margin: "0 0 16px" }}>
        Total Pts = sum of all individual race scores + weekly top-10 bonuses
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {standings.map((p, idx) => {
          const rank = idx + 1;
          const isMe = p.name === currentUser;
          const isExpanded = expanded === p.id;
          const { name: teamName, division, teammateId, logoUrl } = getTeamInfo(p.id);
          const isMyTeammate = myPlayerId && teammateId === myPlayerId;
          const playerRaceScoresList = (raceScores[p.id] || []).sort((a, b) => getRaceRound(a.race_id) - getRaceRound(b.race_id));
          const last3 = playerRaceScoresList.slice(-3).reverse();

          return (
            <div key={p.id}>
              <button onClick={() => setExpanded(isExpanded ? null : p.id)} style={{
                width: "100%", padding: "10px 14px", borderRadius: 12,
                border: `2px solid ${isMe ? BLUE : BORDER}`,
                background: isMe ? "rgba(108,184,224,0.08)" : "#fff",
                display: "flex", alignItems: "center", gap: 0, cursor: "pointer", textAlign: "left"
              }}>
                <div style={{ minWidth: 28, textAlign: "center", fontFamily: FD, fontWeight: 900, fontSize: 16, color: TEXT2 }}>{rank}</div>
                <div style={{ marginLeft: 8 }}><TeamLogo name={teamName} size={28} division={division} logoUrl={logoUrl} /></div>
                <div style={{ marginLeft: 6 }}><PlayerAvatar name={p.name} size={30} photoUrl={p.photo_url} /></div>
                <div style={{ flex: 1, minWidth: 0, marginLeft: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <p style={{ fontFamily: FB, fontWeight: isMe ? 700 : 500, fontSize: 12.5, color: isMe ? BLUEDARK : TEXT, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.name}{isMe ? " (you)" : ""}{isMyTeammate ? " (your teammate)" : ""}
                    </p>
                    {p.trophies.length > 0 && (
                      <span style={{ letterSpacing: "2px", lineHeight: 1, flexShrink: 0 }}>
                        {p.trophies.map((t, i) => (
                          <span key={i} style={{ fontSize: t === "●" ? 12 : 18 }}>{t}</span>
                        ))}
                      </span>
                    )}
                  </div>
                  <p style={{ fontFamily: FB, fontSize: 9.5, color: TEXT2, margin: "1px 0 0" }}>{teamName || ""}</p>
                </div>
                <div style={{ minWidth: 50, textAlign: "center" }}>
                  <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 17, color: p.totalPts > 0 ? DARK : TEXT2 }}>{p.totalPts}</span>
                </div>
                <span style={{ fontSize: 11, color: TEXT2, transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", width: 16, textAlign: "center" }}>▼</span>
              </button>

              {isExpanded && (
                <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderTop: "none", borderRadius: "0 0 12px 12px", padding: "12px 14px", marginTop: -2 }}>
                  {last3.length > 0 ? (
                    <div>
                      <p style={{ fontFamily: FD, fontWeight: 700, fontSize: 10, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Recent Races</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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

                          return (
                            <div key={s.race_id} style={{ padding: "10px", borderRadius: 10, background: `${DARK}03`, border: `1px solid ${BORDER}30` }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                <p style={{ fontFamily: FD, fontWeight: 700, fontSize: 11, color: TEXT, margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                  {getRaceName(s.race_id)}
                                </p>
                                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                  <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 15, color: BLUEDARK }}>{total} pts</span>
                                  {place && <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 12, color: place <= 3 ? GOLD : TEXT2 }}>({place}{placeSuffix(place)})</span>}
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: 3, marginBottom: 6, overflow: "auto" }}>
                                {allDrivers.map(([driver, pts]) => {
                                  const isTop = topEntry && driver === topEntry[0];
                                  const pc = pts < 0 ? RED : pts > 0 ? ORANGE : BLUEDARK;
                                  const pbg = pts < 0 ? `${RED}10` : pts > 0 ? `${ORANGE}10` : `${BLUE}08`;
                                  return (
                                    <div key={driver} style={{ flex: "1 1 0", minWidth: 48, textAlign: "center", background: isTop ? `${BLUEDARK}08` : `${DARK}02`, borderRadius: 6, padding: "4px 3px", border: isTop ? `1px solid ${BLUEDARK}25` : "1px solid transparent" }}>
                                      {isTop && <p style={{ fontFamily: FD, fontWeight: 700, fontSize: 8, color: BLUEDARK, textTransform: "uppercase", margin: "0 0 1px" }}>TOP</p>}
                                      <p style={{ fontFamily: FB, fontWeight: 600, fontSize: 10, color: TEXT, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ln(driver)}</p>
                                      <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 10, color: pc, background: pbg, padding: "0px 4px", borderRadius: 3, display: "inline-block", marginTop: 2 }}>
                                        {pts > 0 ? `+${pts}` : `${pts}`}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", fontSize: 10 }}>
                                <span style={{ padding: "2px 5px", borderRadius: 4, background: `${DARK}04`, fontFamily: FB, color: TEXT2 }}>
                                  Order {s.order_bonus > 0 ? <span style={{ color: ORANGE }}>✓+6</span> : "✗"}
                                </span>
                                <span style={{ padding: "2px 5px", borderRadius: 4, background: `${DARK}04`, fontFamily: FB, color: TEXT2 }}>
                                  Best P{pick?.best_finish || "?"} {s.best_finish_bonus > 0 ? <span style={{ color: ORANGE }}>✓+3</span> : "✗"}
                                </span>
                                <span style={{ padding: "2px 5px", borderRadius: 4, background: `${DARK}04`, fontFamily: FB, color: TEXT2 }}>
                                  Pit Stop {pick?.pit_guess ? `${Number(pick.pit_guess).toFixed(1)}s` : "—"} <span style={{ color: s.pit_individual_pts > 0 ? ORANGE : TEXT2 }}>+{s.pit_individual_pts || 0}</span>
                                </span>
                                {(s.weekly_bonus_pts || 0) > 0 && (
                                  <span style={{ padding: "2px 5px", borderRadius: 4, background: `${GREEN}08`, fontFamily: FB, color: GREEN, fontWeight: 600 }}>
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

      {lastUpdated && (
        <p style={{ fontFamily: FB, fontSize: 10, color: TEXT2, textAlign: "center", marginTop: 20 }}>
          Last updated {new Date(lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
        </p>
      )}
    </div>
  );
}
