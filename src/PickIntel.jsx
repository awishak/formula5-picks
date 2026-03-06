import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const DARK = "#1e1e2a", BLUE = "#6cb8e0", BLUEDARK = "#2a6fa8",
  GREEN = "#22cc66", RED = "#e04a4a", ORANGE = "#e08a2e",
  TEXT = "#1e1e2a", TEXT2 = "#6b6b80", BORDER = "#d8d2c4",
  GOLD = "#c9a820", PURPLE = "#7c5cbf";
const FD = "'Geologica', sans-serif";
const FB = "'DM Sans', sans-serif";

// ── EXACT COPY from MyPicks.jsx ─────────────────────────
const F1_TEAMS_FALLBACK = {
  "Max Verstappen": "Red Bull", "Liam Lawson": "Red Bull",
  "Lando Norris": "McLaren", "Oscar Piastri": "McLaren",
  "Charles Leclerc": "Ferrari", "Lewis Hamilton": "Ferrari",
  "George Russell": "Mercedes", "Andrea Kimi Antonelli": "Mercedes",
  "Carlos Sainz": "Williams", "Alex Albon": "Williams",
  "Fernando Alonso": "Aston Martin", "Lance Stroll": "Aston Martin",
  "Pierre Gasly": "Alpine", "Jack Doohan": "Alpine",
  "Yuki Tsunoda": "Racing Bulls", "Isack Hadjar": "Racing Bulls",
  "Nico Hulkenberg": "Sauber", "Gabriel Bortoleto": "Sauber",
  "Oliver Bearman": "Haas", "Esteban Ocon": "Haas",
};

const F1_TEAM_COLORS = {
  "Red Bull": "#3671C6", "McLaren": "#FF8000", "Ferrari": "#E8002D",
  "Mercedes": "#27F4D2", "Williams": "#64C4FF", "Aston Martin": "#229971",
  "Alpine": "#0093CC", "Racing Bulls": "#6692FF", "Sauber": "#52E252",
  "Haas": "#B6BABD",
};

function useOpenF1Drivers() {
  const [driverMap, setDriverMap] = useState(new Map());

  useEffect(() => {
    let cancelled = false;
    async function fetchDrivers() {
      try {
        const res = await fetch("https://api.openf1.org/v1/drivers?session_key=latest");
        if (!res.ok) throw new Error(`OpenF1 request failed: ${res.status}`);
        const data = await res.json();

        if (cancelled || !Array.isArray(data)) return;

        console.log("[OpenF1] Fetched", data.length, "driver entries");

        const map = new Map();
        const seen = new Set();
        for (const d of data) {
          if (seen.has(d.driver_number)) continue;
          seen.add(d.driver_number);

          const first = d.first_name || "";
          const last = d.last_name || "";
          const fullName = `${first} ${last}`.trim();

          map.set(fullName, {
            team: d.team_name || "",
            headshot: d.headshot_url || null,
            teamColor: d.team_colour ? `#${d.team_colour}` : null,
            acronym: d.name_acronym || "",
            number: d.driver_number || null,
          });
        }
        console.log("[OpenF1] Driver map keys:", [...map.keys()]);
        setDriverMap(map);
      } catch (err) {
        console.warn("OpenF1 fetch failed, using fallback data:", err);
        const map = new Map();
        Object.entries(F1_TEAMS_FALLBACK).forEach(([name, team]) => {
          map.set(name, { team, headshot: null, teamColor: F1_TEAM_COLORS[team] || null, acronym: "", number: null });
        });
        setDriverMap(map);
      }
    }
    fetchDrivers();
    return () => { cancelled = true; };
  }, []);

  return driverMap;
}

function findDriver(driverMap, name) {
  if (!name || driverMap.size === 0) {
    const team = F1_TEAMS_FALLBACK[name] || "";
    return { team, headshot: null, teamColor: F1_TEAM_COLORS[team] || null, acronym: "", number: null };
  }
  if (driverMap.has(name)) return driverMap.get(name);
  const nameParts = name.split(" ");
  const nameLast = nameParts[nameParts.length - 1].toLowerCase();
  for (const [key, val] of driverMap) {
    if (key.split(" ").pop().toLowerCase() === nameLast) return val;
  }
  for (const [key, val] of driverMap) {
    const keyFirst = key.split(" ")[0].toLowerCase();
    if (nameParts.some(p => p.toLowerCase() === keyFirst)) return val;
  }
  const nameLower = name.toLowerCase();
  for (const [key, val] of driverMap) {
    if (nameLower.includes(key.toLowerCase()) || key.toLowerCase().includes(nameLower)) return val;
  }
  console.log("[OpenF1] No match for:", name, "| Available:", [...driverMap.keys()]);
  const team = F1_TEAMS_FALLBACK[name] || "";
  return { team, headshot: null, teamColor: F1_TEAM_COLORS[team] || null, acronym: "", number: null };
}
// ── END COPY from MyPicks.jsx ───────────────────────────

function shortName(name) {
  if (!name) return "?";
  const parts = name.split(" ");
  return parts.length < 2 ? name : `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
}

function lastName(name) {
  if (!name) return "?";
  return name.split(" ").pop();
}

function SideChip({ side }) {
  const isOver = side === "OVER";
  return (
    <span style={{
      fontFamily: FD, fontWeight: 800, fontSize: 9, letterSpacing: "0.08em",
      color: isOver ? GOLD : PURPLE,
      background: isOver ? `${GOLD}15` : `${PURPLE}15`,
      border: `1.5px solid ${isOver ? `${GOLD}30` : `${PURPLE}30`}`,
      padding: "2px 8px", borderRadius: 20, textTransform: "uppercase", whiteSpace: "nowrap"
    }}>{side}</span>
  );
}

function YourPickBadge() {
  return (
    <span style={{
      fontFamily: FB, fontWeight: 700, fontSize: 10, color: GREEN,
      background: `${GREEN}15`, border: `1.5px solid ${GREEN}30`,
      padding: "3px 8px", borderRadius: 8, whiteSpace: "nowrap",
      display: "inline-flex", alignItems: "center", gap: 3
    }}>⭐ Your Pick</span>
  );
}

const thStyle = {
  padding: "6px 8px", textAlign: "left", fontFamily: FD,
  fontWeight: 700, fontSize: 9, color: TEXT2, textTransform: "uppercase",
  letterSpacing: "0.06em", borderBottom: `1px solid ${BORDER}`
};
const tdStyle = { padding: "5px 8px", fontSize: 10 };

export default function PickIntel({ currentUser }) {
  const [races, setRaces] = useState([]);
  const [players, setPlayers] = useState([]);
  const [picks, setPicks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeRound, setActiveRound] = useState(null);
  const [activeSection, setActiveSection] = useState("picks");
  const driverMap = useOpenF1Drivers();

  useEffect(() => {
    async function load() {
      const [{ data: racesData }, { data: playersData }, { data: picksData }, { data: teamsData }, { data: scheduleData }] = await Promise.all([
        supabase.from("races").select("*").order("round"),
        supabase.from("players").select("id, name"),
        supabase.from("picks").select("*"),
        supabase.from("teams").select("*"),
        supabase.from("schedule").select("*"),
      ]);
      setRaces(racesData || []);
      setPlayers(playersData || []);
      setPicks(picksData || []);
      setTeams(teamsData || []);
      setSchedule(scheduleData || []);

      const isA = currentUser === "Andrew Ishak";
      const now = new Date();
      const roundsWithPicks = new Set();
      (picksData || []).forEach(pk => roundsWithPicks.add(pk.race_id));
      let available = (racesData || []).filter(r => (isA || (r.pick_deadline && new Date(r.pick_deadline) <= now)) && roundsWithPicks.has(r.id)).sort((a, b) => b.round - a.round);
      if (available.length === 0) {
        available = (racesData || []).filter(r => isA || (r.pick_deadline && new Date(r.pick_deadline) <= now)).sort((a, b) => b.round - a.round);
      }
      if (available.length > 0) setActiveRound(available[0].round);
      else if ((racesData || []).length > 0) setActiveRound(racesData[0].round);
      setLoading(false);
    }
    load();
  }, [currentUser]);

  const currentRace = races.find(r => r.round === activeRound);
  const isAdmin = currentUser === "Andrew Ishak";
  const isPastDeadline = isAdmin || (currentRace?.pick_deadline && new Date() >= new Date(currentRace.pick_deadline));
  const racePicks = currentRace ? picks.filter(pk => pk.race_id === currentRace.id) : [];
  const playerMap = {};
  players.forEach(p => { playerMap[p.id] = p.name; });
  const totalPickers = racePicks.length;

  const raceIdsWithPicks = new Set();
  picks.forEach(pk => raceIdsWithPicks.add(pk.race_id));

  // Over/Under map
  const playerSideMap = {};
  if (currentRace) {
    schedule.filter(s => s.race_id === currentRace.id).forEach(m => {
      const ht = teams.find(t => t.id === m.home_team_id);
      const at = teams.find(t => t.id === m.away_team_id);
      if (ht) { playerSideMap[ht.player1_id] = "OVER"; playerSideMap[ht.player2_id] = "OVER"; }
      if (at) { playerSideMap[at.player1_id] = "UNDER"; playerSideMap[at.player2_id] = "UNDER"; }
    });
  }

  // Current user's pick
  const myPlayer = players.find(p => p.name === currentUser);
  const myPick = myPlayer ? racePicks.find(pk => pk.player_id === myPlayer.id) : null;
  const myDrivers = myPick ? (myPick.finishing_order || []) : [];
  const myTopPick = myPick ? myPick.top_pick : null;
  const myBestFinishRaw = myPick ? String(myPick.best_finish || "").replace(/[^0-9]/g, "") : "";
  const myBestFinish = myBestFinishRaw ? parseInt(myBestFinishRaw, 10) : null;
  const myComboKey = myDrivers.length > 0 ? myDrivers.slice().sort().join(", ") : null;
  const myOrderKey = myDrivers.length > 0 ? myDrivers.join(" > ") : null;

  // ── PICKS TAB ──────────────────────────────────────
  function PicksTab() {
    const topCounts = {}, midCounts = {}, bfCounts = {};
    racePicks.forEach(pk => {
      if (pk.top_pick) topCounts[pk.top_pick] = (topCounts[pk.top_pick] || 0) + 1;
      (pk.finishing_order || []).forEach(d => {
        if (d !== pk.top_pick) midCounts[d] = (midCounts[d] || 0) + 1;
      });
      if (pk.best_finish != null && pk.best_finish !== "") {
        const bfNum = parseInt(String(pk.best_finish).replace(/[^0-9]/g, ""), 10);
        if (!isNaN(bfNum) && bfNum >= 1 && bfNum <= 20) bfCounts[bfNum] = (bfCounts[bfNum] || 0) + 1;
      }
    });
    const topSorted = Object.entries(topCounts).sort((a, b) => b[1] - a[1]);
    const midSorted = Object.entries(midCounts).sort((a, b) => b[1] - a[1]);

    function Card({ name, count, isMine }) {
      const info = findDriver(driverMap, name);
      const tc = info.teamColor || F1_TEAM_COLORS[info.team] || F1_TEAM_COLORS[F1_TEAMS_FALLBACK[name]] || BLUE;
      const parts = name.split(" ");
      const first = parts[0], last = parts.slice(1).join(" ");
      return (
        <div style={{
          width: "calc(33.33% - 6px)", padding: "10px 6px 12px", borderRadius: 12,
          border: `2px solid ${tc}40`, background: `${tc}08`,
          textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 2
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%", overflow: "hidden",
            background: `${tc}25`,
            marginBottom: 3, display: "flex", alignItems: "center", justifyContent: "center",
            border: `2px solid ${tc}`, position: "relative"
          }}>
            <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 14, color: "#fff" }}>{first[0]}{(last[0] || "")}</span>
            {info.headshot && (
              <img src={info.headshot} alt={name} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
            )}
          </div>
          <span style={{ fontFamily: FB, fontWeight: 400, fontSize: 10, color: TEXT2 }}>{first}</span>
          <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 13, color: TEXT }}>{last}</span>
          {info.team && (
            <span style={{
              fontFamily: FB, fontWeight: 500, fontSize: 9, marginTop: 2,
              color: tc, background: `${tc}10`, padding: "1px 6px", borderRadius: 4,
            }}>{info.team}</span>
          )}
          <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 18, color: BLUEDARK, marginTop: 4 }}>{count}</span>
          <span style={{ fontFamily: FB, fontSize: 9, color: TEXT2 }}>{totalPickers > 0 ? Math.round((count / totalPickers) * 100) : 0}% owned</span>
          {isMine && <div style={{ marginTop: 4 }}><YourPickBadge /></div>}
        </div>
      );
    }

    return (
      <div>
        <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 11, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px" }}>Top Driver Selections</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {topSorted.map(([d, c]) => <Card key={d} name={d} count={c} isMine={d === myTopPick} />)}
        </div>
        <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 11, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px" }}>Midfield Selections</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {midSorted.map(([d, c]) => <Card key={d} name={d} count={c} isMine={myDrivers.includes(d) && d !== myTopPick} />)}
        </div>
        <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 11, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px" }}>Best Finish Predictions</p>
        <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, padding: "14px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(pos => {
              const isMyBf = myBestFinish === pos;
              return (
                <div key={pos} style={{ textAlign: "center", width: "calc(20% - 7px)", flexShrink: 0 }}>
                  <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 28, color: bfCounts[pos] ? BLUEDARK : `${BORDER}80`, display: "block" }}>{bfCounts[pos] || 0}</span>
                  <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 13, color: isMyBf ? GREEN : TEXT2 }}>P{pos}</span>
                  {isMyBf && <span style={{ display: "block", fontFamily: FB, fontWeight: 700, fontSize: 9, color: GREEN, marginTop: 2 }}>⭐ You</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── LINEUPS TAB ────────────────────────────────────
  function LineupsTab() {
    const combos = {};
    racePicks.forEach(pk => {
      const d = (pk.finishing_order || []).slice().sort().join(", ");
      if (d) combos[d] = (combos[d] || 0) + 1;
    });
    const comboSorted = Object.entries(combos).sort((a, b) => b[1] - a[1]);
    const combosFiltered = comboSorted.filter(([_, c]) => c >= 2);

    const orders = {};
    racePicks.forEach(pk => {
      const k = (pk.finishing_order || []).join(" > ");
      if (k) orders[k] = (orders[k] || 0) + 1;
    });
    const consensus = Object.entries(orders).filter(([_, c]) => c >= 2).sort((a, b) => b[1] - a[1]);

    return (
      <div>
        <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 11, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px" }}>Most Popular Driver Combos</p>
        <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, padding: "12px 14px", marginBottom: 20 }}>
          {combosFiltered.length === 0 && <p style={{ fontFamily: FB, fontSize: 12, color: TEXT2, margin: 0 }}>No shared combos — everyone picked different drivers!</p>}
          {combosFiltered.map(([combo, count], i) => {
            const isMyComboRow = myComboKey === combo;
            return (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: i < combosFiltered.length - 1 ? `1px solid ${BORDER}15` : "none" }}>
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: FB, fontSize: 11, color: TEXT }}>{combo.split(", ").map(d => lastName(d)).join(", ")}</span>
                  {isMyComboRow && <YourPickBadge />}
                </div>
                <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 12, color: i === 0 ? GOLD : BLUEDARK, background: i === 0 ? `${GOLD}15` : `${BLUE}12`, padding: "4px 10px", borderRadius: 8, flexShrink: 0 }}>{count} {count === 1 ? "pick" : "picks"}</span>
              </div>
            );
          })}
        </div>

        <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 11, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px" }}>Consensus Orders (2+ Players)</p>
        <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, padding: "12px 14px" }}>
          {consensus.length === 0 && <p style={{ fontFamily: FB, fontSize: 12, color: TEXT2, margin: 0 }}>No matching orders — everyone went their own way!</p>}
          {consensus.map(([order, count], i) => {
            const isMyOrderRow = myOrderKey === order;
            return (
              <div key={i} style={{ padding: "8px 0", borderBottom: i < consensus.length - 1 ? `1px solid ${BORDER}15` : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 10, color: i === 0 ? GOLD : TEXT2 }}>{i === 0 ? "MOST POPULAR" : `#${i + 1}`}</span>
                    {isMyOrderRow && <YourPickBadge />}
                  </div>
                  <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 12, color: BLUEDARK, background: `${BLUE}12`, padding: "4px 10px", borderRadius: 8 }}>{count} {count === 1 ? "pick" : "picks"}</span>
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {order.split(" > ").map((d, j) => (
                    <span key={j} style={{ fontFamily: FD, fontWeight: 700, fontSize: 10, color: j === 0 ? ORANGE : TEXT, background: j === 0 ? `${ORANGE}10` : `${DARK}04`, padding: "3px 6px", borderRadius: 6 }}>{j + 1}. {lastName(d)}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── PIT STOPS TAB ──────────────────────────────────
  function PitStopsTab() {
    const guesses = racePicks.map(pk => ({
      name: playerMap[pk.player_id] || "?",
      guess: pk.pit_guess != null ? Number(pk.pit_guess) : null,
      side: playerSideMap[pk.player_id] || null,
    })).filter(g => g.guess !== null).sort((a, b) => a.guess - b.guess);

    if (guesses.length === 0) return <p style={{ fontFamily: FB, fontSize: 13, color: TEXT2 }}>No pit stop guesses yet.</p>;

    const calcStats = (arr) => {
      if (arr.length === 0) return { avg: null, low: null, high: null };
      const vals = arr.map(g => g.guess);
      return {
        avg: (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2),
        low: Math.min(...vals).toFixed(1),
        high: Math.max(...vals).toFixed(1),
      };
    };

    const all = calcStats(guesses);
    const overGuesses = guesses.filter(g => g.side === "OVER");
    const underGuesses = guesses.filter(g => g.side === "UNDER");
    const overs = calcStats(overGuesses);
    const unders = calcStats(underGuesses);
    const spread = (overs.avg !== null && unders.avg !== null) ? Math.abs(parseFloat(overs.avg) - parseFloat(unders.avg)).toFixed(2) : null;

    function StatRow({ label, stats, color, chipSide }) {
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${BORDER}15` }}>
          <div style={{ minWidth: 80, display: "flex", alignItems: "center", gap: 6 }}>
            {chipSide ? <SideChip side={chipSide} /> : <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 11, color: TEXT }}>{label}</span>}
          </div>
          <div style={{ flex: 1, display: "flex", gap: 12 }}>
            {[{ l: "Low", v: stats.low }, { l: "Avg", v: stats.avg }, { l: "High", v: stats.high }].map(s => (
              <div key={s.l} style={{ textAlign: "center", flex: 1 }}>
                <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 16, color: color || BLUEDARK, display: "block" }}>{s.v != null ? `${s.v}s` : "—"}</span>
                <span style={{ fontFamily: FB, fontSize: 8, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.l}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div>
        {currentRace?.pit_stop_question && (
          <p style={{ fontFamily: FB, fontSize: 13, color: TEXT2, margin: "0 0 14px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
            <span>This week's pit stop:</span>
            <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 13, color: BLUEDARK, background: `${BLUE}12`, border: `1.5px solid ${BLUE}30`, padding: "4px 12px", borderRadius: 8, whiteSpace: "nowrap" }}>{currentRace.pit_stop_question}</span>
          </p>
        )}
        <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, padding: "4px 14px", marginBottom: 20 }}>
          <StatRow label="Everyone" stats={all} color={BLUEDARK} />
          <StatRow stats={overs} color={GOLD} chipSide="OVER" />
          <StatRow stats={unders} color={PURPLE} chipSide="UNDER" />
          {spread !== null && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0" }}>
              <div style={{ minWidth: 80 }}><span style={{ fontFamily: FD, fontWeight: 700, fontSize: 11, color: TEXT }}>Difference</span></div>
              <div style={{ flex: 1, display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }} />
                <div style={{ textAlign: "center", flex: 1 }}>
                  <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 16, color: ORANGE, display: "block" }}>{spread}s</span>
                  <span style={{ fontFamily: FB, fontSize: 8, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.06em" }}>Spread</span>
                </div>
                <div style={{ flex: 1 }} />
              </div>
            </div>
          )}
        </div>
        <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 11, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px" }}>All Guesses (Low to High)</p>
        <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, padding: "10px 14px" }}>
          {guesses.map((g, i) => {
            const isMe = g.name === currentUser;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: i < guesses.length - 1 ? `1px solid ${BORDER}15` : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: FB, fontSize: 12, fontWeight: isMe ? 700 : 400, color: isMe ? BLUEDARK : TEXT }}>{shortName(g.name)}{isMe ? " ⭐" : ""}</span>
                  {g.side && <SideChip side={g.side} />}
                </div>
                <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 13, color: BLUEDARK, minWidth: 38, textAlign: "right", flexShrink: 0 }}>{g.guess.toFixed(1)}s</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── ALL PICKS TAB ──────────────────────────────────
  function AllPicksTab() {
    const [sortCol, setSortCol] = useState("name");
    const [sortAsc, setSortAsc] = useState(true);

    const handleSort = (col) => {
      if (sortCol === col) setSortAsc(!sortAsc);
      else { setSortCol(col); setSortAsc(true); }
    };

    const rows = racePicks.map(pk => ({
      player_id: pk.player_id, playerName: playerMap[pk.player_id] || "?",
      top_pick: pk.top_pick, fo: pk.finishing_order || [],
      best_finish: pk.best_finish, pit_guess: pk.pit_guess
    }));

    rows.sort((a, b) => {
      if (sortCol === "name") return sortAsc ? a.playerName.localeCompare(b.playerName) : b.playerName.localeCompare(a.playerName);
      if (sortCol === "top") return sortAsc ? (a.top_pick || "").localeCompare(b.top_pick || "") : (b.top_pick || "").localeCompare(a.top_pick || "");
      if (sortCol === "best") {
        const va = parseInt(String(a.best_finish || "99").replace(/[^0-9]/g, ""), 10) || 99;
        const vb = parseInt(String(b.best_finish || "99").replace(/[^0-9]/g, ""), 10) || 99;
        return sortAsc ? va - vb : vb - va;
      }
      if (sortCol === "pit") {
        const pa = a.pit_guess != null ? Number(a.pit_guess) : 99;
        const pb = b.pit_guess != null ? Number(b.pit_guess) : 99;
        return sortAsc ? pa - pb : pb - pa;
      }
      return 0;
    });

    const arrow = (col) => sortCol === col ? (sortAsc ? " ↑" : " ↓") : "";

    const formatBf = (val) => {
      if (val == null) return "—";
      const s = String(val);
      if (s.match(/^[0-9]+$/)) return `P${s}`;
      return s;
    };

    return (
      <div>
        <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 11, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px" }}>Everyone's Picks — Round {activeRound}</p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", fontFamily: FB, fontSize: 10, whiteSpace: "nowrap", width: "100%" }}>
            <thead>
              <tr style={{ background: `${DARK}08` }}>
                <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => handleSort("name")}>Player{arrow("name")}</th>
                <th style={{ ...thStyle, color: ORANGE, cursor: "pointer" }} onClick={() => handleSort("top")}>Top{arrow("top")}</th>
                <th style={thStyle}>2nd</th>
                <th style={thStyle}>3rd</th>
                <th style={thStyle}>4th</th>
                <th style={thStyle}>5th</th>
                <th style={{ ...thStyle, color: BLUEDARK, cursor: "pointer" }} onClick={() => handleSort("best")}>Best{arrow("best")}</th>
                <th style={{ ...thStyle, color: BLUEDARK, cursor: "pointer" }} onClick={() => handleSort("pit")}>Pit{arrow("pit")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((pk, i) => {
                const isMe = pk.playerName === currentUser;
                return (
                  <tr key={pk.player_id} style={{ background: isMe ? `${BLUE}10` : i % 2 === 0 ? "#fff" : `${DARK}03`, borderBottom: `1px solid ${BORDER}30` }}>
                    <td style={{ ...tdStyle, fontWeight: isMe ? 700 : 500, color: isMe ? BLUEDARK : TEXT, minWidth: 80 }}>{shortName(pk.playerName)}{isMe ? " ⭐" : ""}</td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: ORANGE }}>{lastName(pk.top_pick)}</td>
                    <td style={{ ...tdStyle, color: TEXT2 }}>{pk.fo[1] ? lastName(pk.fo[1]) : "—"}</td>
                    <td style={{ ...tdStyle, color: TEXT2 }}>{pk.fo[2] ? lastName(pk.fo[2]) : "—"}</td>
                    <td style={{ ...tdStyle, color: TEXT2 }}>{pk.fo[3] ? lastName(pk.fo[3]) : "—"}</td>
                    <td style={{ ...tdStyle, color: TEXT2 }}>{pk.fo[4] ? lastName(pk.fo[4]) : "—"}</td>
                    <td style={{ ...tdStyle, fontFamily: FD, fontWeight: 700, color: BLUEDARK }}>{formatBf(pk.best_finish)}</td>
                    <td style={{ ...tdStyle, fontFamily: FD, fontWeight: 700, color: BLUEDARK }}>{pk.pit_guess != null ? Number(pk.pit_guess).toFixed(1) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── MAIN ───────────────────────────────────────────
  if (loading) return <div style={{ padding: "60px 20px", textAlign: "center" }}><p style={{ fontFamily: FB, fontSize: 14, color: TEXT2 }}>Loading...</p></div>;

  const sections = [
    { id: "picks", label: "Picks" },
    { id: "lineups", label: "Lineups" },
    { id: "pitstops", label: "Pit Stops" },
    { id: "allpicks", label: "All Picks" },
  ];

  return (
    <div style={{ padding: "20px 20px 100px" }}>
      <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 22, color: DARK, textTransform: "uppercase", letterSpacing: "0.03em", margin: "0 0 4px" }}>Pick Intel</p>
      <p style={{ fontFamily: FB, fontSize: 13, color: TEXT2, marginBottom: 16 }}>See what everyone picked after the deadline</p>

      <p style={{ fontFamily: FD, fontWeight: 300, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: TEXT2, marginBottom: 8 }}>Race Round</p>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none", marginBottom: 16 }}>
        {races.map(r => {
          const dl = r.pick_deadline ? new Date(r.pick_deadline) : null;
          const locked = isAdmin || (dl && new Date() >= dl);
          const hasPicks = raceIdsWithPicks.has(r.id);
          return (
            <button key={r.round} onClick={() => { if (locked) setActiveRound(r.round); }} style={{
              flexShrink: 0, width: 36, height: 36, borderRadius: "50%",
              border: `1px solid ${activeRound === r.round ? DARK : locked && hasPicks ? BORDER : `${BORDER}50`}`,
              background: activeRound === r.round ? DARK : "transparent",
              color: activeRound === r.round ? "#fff" : locked && hasPicks ? TEXT2 : BORDER,
              fontFamily: FD, fontWeight: 700, fontSize: 13,
              cursor: locked ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              opacity: locked && hasPicks ? 1 : locked ? 0.5 : 0.3,
              position: "relative",
            }}>
              {r.round}
              {hasPicks && activeRound !== r.round && (
                <span style={{ position: "absolute", bottom: 2, width: 4, height: 4, borderRadius: "50%", background: BLUEDARK }} />
              )}
            </button>
          );
        })}
      </div>

      {currentRace && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontFamily: FD, fontWeight: 700, fontSize: 16, color: DARK, margin: 0 }}>{currentRace.race_name}</p>
          <p style={{ fontFamily: FB, fontSize: 12, color: TEXT2, margin: "2px 0 0" }}>{totalPickers} player{totalPickers !== 1 ? "s" : ""} submitted picks</p>
        </div>
      )}

      {!isPastDeadline ? (
        <div style={{ padding: "40px 20px", textAlign: "center", background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}` }}>
          <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 16, color: DARK, margin: "0 0 6px" }}>Picks Still Open</p>
          <p style={{ fontFamily: FB, fontSize: 13, color: TEXT2, margin: 0 }}>
            Pick data will be available after the deadline
            {currentRace?.pick_deadline && (
              <span style={{ display: "block", fontWeight: 600, color: DARK, marginTop: 4 }}>
                {new Date(currentRace.pick_deadline).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </span>
            )}
          </p>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", gap: 0, marginBottom: 20, borderRadius: 10, overflow: "hidden", border: `1px solid ${BORDER}` }}>
            {sections.map(s => (
              <button key={s.id} onClick={() => setActiveSection(s.id)} style={{
                flex: 1, padding: "10px 0", border: "none",
                background: activeSection === s.id ? BLUEDARK : "#fff",
                fontFamily: FD, fontWeight: 700, fontSize: 10, textTransform: "uppercase",
                letterSpacing: "0.04em", color: activeSection === s.id ? "#fff" : TEXT2,
                cursor: "pointer",
              }}>{s.label}</button>
            ))}
          </div>
          {activeSection === "picks" && <PicksTab />}
          {activeSection === "lineups" && <LineupsTab />}
          {activeSection === "pitstops" && <PitStopsTab />}
          {activeSection === "allpicks" && <AllPicksTab />}
        </div>
      )}
    </div>
  );
}
