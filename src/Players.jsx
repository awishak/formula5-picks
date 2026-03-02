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

// Previous seasons participation
const PLAYED_2023 = new Set(["Minatte Matta Garcia","George Fahmy","Anthony Carnesecca","Heather Brackett","Joe Hanna","Theodore Ishak","Sam Bottoms","Rafik Zarifa","Andrew Ishak","Zack Girgis","Stacy Michaelsen","Maggie Mudge","Evie Ishak","Kerolos Nakhla","Heather Ishak","Anthony Zamary","Harold Gutmann","Scott Schertler","Lucia Thompson","Kevin Coolidge","Kristin Eskind","Grant Wong","Ramy Stephanos","Joe McGlynn","Jacob Ford","Chris Fondacaro","Ryan Kohli","Dan Patry","Jeremiah Yassa","Brian Dong","Paul Kohli","Josh Masdary"]);
const PLAYED_2024 = new Set(["Kevin Coolidge","Ronnie Nobar","Kerolos Nakhla","Mena Yousef","Martin Nobar","Paul Kohli","Zack Girgis","Nick Brody","Andrew Ishak","Ryan Kohli","Sam Bottoms","Jacob Ford","Rafik Zarifa","Maggie Mudge","Scott Schertler","Joe Hanna","Harold Gutmann","Joe McGlynn","Chris Fondacaro","Theodore Ishak","Minatte Matta Garcia","Dan Patry","George Fahmy","Anthony Carnesecca","Aditya Satish","Stacy Michaelsen","Heather Ishak","Heather Brackett","Anthony Zamary","Andy Thompson","Chris Malek","Evie Ishak","Kristin Eskind","Grant Wong","Ramy Stephanos","Lucia Thompson","Brian Dong"]);
const PLAYED_2025 = new Set(["Andrew Ishak","George Fahmy","Krista Nabil","Rafik Zarifa","Mena Yousef","Aditya Satish","Heather Ishak","Martin Nobar","Moses Abdelshaid","Alicia Cho","Kerolos Nakhla","Joe McGlynn","Scott Schertler","Anthony Carnesecca","Evie Ishak","Jack Civitts","Nick Brody","Harold Gutmann","Ryan Kohli","Theo Ishak","Joe Hanna","Kevin Coolidge","Zack Girgis","Lucia Thompson","Paul Kohli","Brett Dillon","Sam Bottoms","Andy Thompson","Chris Fondacaro","Maggie Mudge","Jacob Ford","Ronnie Nobar","Anthony Zamary","Dan Patry","Grant Wong","Chris Malek","Ramy Stephanos","Brian Dong","Kristin Eskind","Pavly Attalah"]);

function getYearDescriptor(name) {
  // Map some name variations
  const n = name;
  let years = 0;
  // Check aliases for Theo/Theodore
  const check23 = PLAYED_2023.has(n) || (n === "Theo Ishak" && PLAYED_2023.has("Theodore Ishak"));
  const check24 = PLAYED_2024.has(n) || (n === "Theo Ishak" && PLAYED_2024.has("Theodore Ishak")) || (n === "Stacy Michaelsen" && PLAYED_2024.has("Stacy Michaelsen"));
  const check25 = PLAYED_2025.has(n) || (n === "Theo Ishak" && PLAYED_2025.has("Theo Ishak"));
  if (check23) years++;
  if (check24) years++;
  if (check25) years++;
  // 2026 is current season, so total seasons = years + 1
  if (years === 0) return "Rookie";
  return `${years + 1}${years + 1 === 2 ? "nd" : years + 1 === 3 ? "rd" : "th"} Year`;
}

function PlayerAvatar({ name, size = 56, photoUrl }) {
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

function TeamLogo({ name, size = 24, division, logoUrl }) {
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

export default function Players({ currentUser }) {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [scores, setScores] = useState([]);
  const [races, setRaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      const [{ data: playersData }, { data: teamsData }, { data: scoresData }, { data: racesData }] = await Promise.all([
        supabase.from("players").select("*"),
        supabase.from("teams").select("*"),
        supabase.from("scores").select("*"),
        supabase.from("races").select("id, race_name, round").order("round", { ascending: true })
      ]);
      setPlayers(playersData || []);
      setTeams(teamsData || []);
      setScores(scoresData || []);
      setRaces(racesData || []);
      setLoading(false);
    }
    load();
  }, []);

  const raceMap = {};
  races.forEach(r => { raceMap[r.id] = r; });

  // Per-race totals for all players (for ranking)
  const raceTotals = {};
  scores.forEach(s => {
    if (!raceTotals[s.race_id]) raceTotals[s.race_id] = [];
    const t = (s.top_pick_pts || 0) + (s.midfield_pts || 0) + (s.order_bonus || 0) + (s.best_finish_bonus || 0) + (s.pit_individual_pts || 0) + (s.weekly_bonus_pts || 0);
    raceTotals[s.race_id].push({ pid: s.player_id, total: t });
  });
  Object.values(raceTotals).forEach(arr => arr.sort((a, b) => b.total - a.total));

  const playerStats = players.map(p => {
    const team = teams.find(t => t.player1_id === p.id || t.player2_id === p.id);
    const teammateId = team ? (team.player1_id === p.id ? team.player2_id : team.player1_id) : null;
    const teammate = teammateId ? players.find(pl => pl.id === teammateId) : null;
    const division = team?.division || "second";
    const myScores = scores.filter(s => s.player_id === p.id);
    let totalPts = 0, bestFinish = 99, raceResults = [];
    const trophies = [];

    myScores.forEach(s => {
      const total = (s.top_pick_pts || 0) + (s.midfield_pts || 0) + (s.order_bonus || 0) + (s.best_finish_bonus || 0) + (s.pit_individual_pts || 0) + (s.weekly_bonus_pts || 0);
      totalPts += total;
      const ranked = raceTotals[s.race_id] || [];
      const rank = ranked.findIndex(r => r.pid === p.id) + 1;
      if (rank > 0 && rank < bestFinish) bestFinish = rank;
      if (rank === 1) trophies.push("🏆");
      else if (rank === 2) trophies.push("🥈");
      else if (rank === 3) trophies.push("🥉");
      else if (rank <= 10) trophies.push("●");
      raceResults.push({ raceId: s.race_id, round: raceMap[s.race_id]?.round || 0, raceName: raceMap[s.race_id]?.race_name || "Race", total, rank });
    });

    raceResults.sort((a, b) => a.round - b.round);
    const yearDesc = getYearDescriptor(p.name);

    return {
      ...p, team, teammate, division, totalPts,
      raceCount: myScores.length,
      bestFinish: bestFinish < 99 ? bestFinish : null,
      trophies, raceResults, yearDesc,
      isMe: p.name === currentUser
    };
  }).sort((a, b) => a.name.localeCompare(b.name)); // Sort by first name alpha

  const filtered = search ? playerStats.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.team?.name?.toLowerCase().includes(search.toLowerCase())) : playerStats;

  const ps = (n) => n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th";

  if (loading) return <div style={{ padding: "60px 20px", textAlign: "center" }}><p style={{ fontFamily: FB, fontSize: 14, color: TEXT2 }}>Loading players…</p></div>;

  return (
    <div style={{ padding: "20px 20px 100px" }}>
      <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 22, color: DARK, textTransform: "uppercase", letterSpacing: "0.03em", margin: "0 0 4px" }}>Players</p>
      <p style={{ fontFamily: FB, fontSize: 13, color: TEXT2, marginBottom: 16 }}>{players.length} players across {teams.length} teams</p>

      <input
        placeholder="Search players or teams…"
        value={search} onChange={e => setSearch(e.target.value)}
        style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${BORDER}`, fontFamily: FB, fontSize: 13, color: TEXT, marginBottom: 16, boxSizing: "border-box", outline: "none" }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map(p => {
          const isExpanded = expanded === p.id;
          return (
            <div key={p.id}>
              <button onClick={() => setExpanded(isExpanded ? null : p.id)} style={{
                width: "100%", padding: "12px 14px", borderRadius: 14,
                border: `2px solid ${p.isMe ? BLUE : BORDER}`,
                background: p.isMe ? `${BLUE}06` : "#fff",
                cursor: "pointer", textAlign: "left",
                display: "flex", alignItems: "center", gap: 10
              }}>
                <PlayerAvatar name={p.name} size={44} photoUrl={p.photo_url} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Name + trophies on same line */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <p style={{ fontFamily: FB, fontWeight: 600, fontSize: 13, color: p.isMe ? BLUEDARK : TEXT, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.name}{p.isMe ? " (you)" : ""}
                    </p>
                    {p.trophies.length > 0 && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                        {p.trophies.map((t, i) => <span key={i} style={{ fontSize: t === "●" ? 8 : 13, lineHeight: 1 }}>{t}</span>)}
                      </span>
                    )}
                  </div>
                  {/* Team logo + name — bigger */}
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                    {p.team && <TeamLogo name={p.team.name} size={20} division={p.division} logoUrl={p.team.logo_url} />}
                    <span style={{ fontFamily: FB, fontSize: 12, fontWeight: 500, color: TEXT2 }}>{p.team?.name || "No team"}</span>
                  </div>
                  {/* Year descriptor */}
                  <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 9, color: p.yearDesc === "Rookie" ? GREEN : TEXT2, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2, display: "inline-block" }}>
                    {p.yearDesc}
                  </span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 18, color: BLUEDARK }}>{p.totalPts}</span>
                  <p style={{ fontFamily: FB, fontSize: 9, color: TEXT2, margin: 0 }}>pts</p>
                </div>
                <span style={{ fontSize: 11, color: TEXT2, transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
              </button>

              {isExpanded && (
                <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderTop: "none", borderRadius: "0 0 14px 14px", padding: "14px", marginTop: -2 }}>
                  {/* Quick stats */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                    <StatBox label="Races" value={p.raceCount} />
                    <StatBox label="Total Pts" value={p.totalPts} color={BLUEDARK} />
                    <StatBox label="Best Finish" value={p.bestFinish ? `${p.bestFinish}${ps(p.bestFinish)}` : "—"} color={p.bestFinish === 1 ? GOLD : TEXT} />
                    <StatBox label="Avg Pts" value={p.raceCount > 0 ? (p.totalPts / p.raceCount).toFixed(1) : "—"} />
                  </div>

                  {/* Team info */}
                  {p.team && (
                    <div style={{ marginBottom: 14 }}>
                      <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 9, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 6px" }}>Team</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <TeamLogo name={p.team.name} size={28} division={p.division} logoUrl={p.team.logo_url} />
                        <span style={{ fontFamily: FB, fontSize: 14, fontWeight: 600, color: TEXT }}>{p.team.name}</span>
                        <span style={{ fontFamily: FB, fontSize: 11, color: TEXT2 }}>
                          ({p.division === "championship" ? "Championship" : "Second Division"})
                        </span>
                      </div>
                      {p.teammate && (
                        <p style={{ fontFamily: FB, fontSize: 11, color: TEXT2, margin: "4px 0 0" }}>
                          Teammate: <strong style={{ color: TEXT }}>{p.teammate.name}</strong>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Race results */}
                  {p.raceResults.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 9, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 6px" }}>This Season</p>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {p.raceResults.map(rr => (
                          <div key={rr.raceId} style={{ padding: "6px 8px", borderRadius: 8, background: `${DARK}03`, border: `1px solid ${BORDER}30`, textAlign: "center", minWidth: 60 }}>
                            <p style={{ fontFamily: FD, fontWeight: 700, fontSize: 9, color: TEXT2, margin: 0 }}>R{rr.round}</p>
                            <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 14, color: BLUEDARK, margin: "2px 0" }}>{rr.total}</p>
                            <p style={{ fontFamily: FD, fontWeight: 700, fontSize: 9, color: rr.rank <= 3 ? GOLD : TEXT2, margin: 0 }}>{rr.rank}{ps(rr.rank)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Experience */}
                  <div>
                    <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 9, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 4px" }}>Experience</p>
                    <p style={{ fontFamily: FB, fontSize: 12, color: TEXT, margin: 0 }}>
                      {p.yearDesc === "Rookie" ? "First season in Formula 5" : p.yearDesc + " in Formula 5"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div style={{ padding: "6px 10px", borderRadius: 8, background: `${DARK}04`, textAlign: "center", minWidth: 60 }}>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 8, color: "#6b6b80", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>{label}</p>
      <p style={{ fontFamily: "'Geologica', sans-serif", fontWeight: 900, fontSize: 15, color: color || "#1e1e2a", margin: "2px 0 0" }}>{value}</p>
    </div>
  );
}
