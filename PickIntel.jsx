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

function useOpenF1Drivers() {
  const [driverMap, setDriverMap] = useState(new Map());
  useEffect(function () {
    var cancelled = false;
    async function fetchDrivers() {
      try {
        var res = await fetch("https://api.openf1.org/v1/drivers?session_key=latest");
        if (!res.ok) throw new Error("OpenF1 request failed");
        var data = await res.json();
        if (cancelled || !Array.isArray(data)) return;
        var map = new Map();
        var seen = new Set();
        for (var i = 0; i < data.length; i++) {
          var d = data[i];
          if (seen.has(d.driver_number)) continue;
          seen.add(d.driver_number);
          var fullName = ((d.first_name || "") + " " + (d.last_name || "")).trim();
          map.set(fullName, {
            team: d.team_name || "",
            headshot: d.headshot_url || null,
            teamColor: d.team_colour ? "#" + d.team_colour : null,
          });
        }
        setDriverMap(map);
      } catch (err) {
        var fallbackMap = new Map();
        Object.entries(F1_TEAMS_FALLBACK).forEach(function (entry) {
          fallbackMap.set(entry[0], { team: entry[1], headshot: null, teamColor: null });
        });
        setDriverMap(fallbackMap);
      }
    }
    fetchDrivers();
    return function () { cancelled = true; };
  }, []);
  return driverMap;
}

function findDriver(driverMap, name) {
  if (!name || driverMap.size === 0) return { team: F1_TEAMS_FALLBACK[name] || "", headshot: null, teamColor: BLUE };
  if (driverMap.has(name)) return driverMap.get(name);
  var nameLast = name.split(" ").pop().toLowerCase();
  for (var entry of driverMap) {
    if (entry[0].split(" ").pop().toLowerCase() === nameLast) return entry[1];
  }
  for (var entry2 of driverMap) {
    if (entry2[0].toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(entry2[0].toLowerCase())) return entry2[1];
  }
  return { team: F1_TEAMS_FALLBACK[name] || "", headshot: null, teamColor: BLUE };
}

function shortName(name) {
  if (!name) return "?";
  var parts = name.split(" ");
  return parts.length < 2 ? name : parts[0][0] + ". " + parts.slice(1).join(" ");
}

function lastName(name) {
  if (!name) return "?";
  return name.split(" ").pop();
}

function SideChip({ side }) {
  var isOver = side === "OVER";
  return (
    <span style={{
      fontFamily: FD, fontWeight: 800, fontSize: 9, letterSpacing: "0.08em",
      color: isOver ? GOLD : PURPLE,
      background: isOver ? GOLD + "15" : PURPLE + "15",
      border: "1.5px solid " + (isOver ? GOLD + "30" : PURPLE + "30"),
      padding: "2px 8px", borderRadius: 20, textTransform: "uppercase", whiteSpace: "nowrap"
    }}>{side}</span>
  );
}

var thStyle = {
  padding: "6px 8px", textAlign: "left", fontFamily: FD,
  fontWeight: 700, fontSize: 9, color: TEXT2, textTransform: "uppercase",
  letterSpacing: "0.06em", borderBottom: "1px solid " + BORDER
};
var tdStyle = { padding: "5px 8px", fontSize: 10 };

export default function PickIntel({ currentUser }) {
  var [races, setRaces] = useState([]);
  var [players, setPlayers] = useState([]);
  var [picks, setPicks] = useState([]);
  var [teams, setTeams] = useState([]);
  var [schedule, setSchedule] = useState([]);
  var [loading, setLoading] = useState(true);
  var [activeRound, setActiveRound] = useState(null);
  var [activeSection, setActiveSection] = useState("picks");

  var driverMap = useOpenF1Drivers();

  useEffect(function () {
    async function load() {
      var results = await Promise.all([
        supabase.from("races").select("*").order("round"),
        supabase.from("players").select("id, name"),
        supabase.from("picks").select("*"),
        supabase.from("teams").select("*"),
        supabase.from("schedule").select("*"),
      ]);
      var racesData = results[0].data || [];
      var playersData = results[1].data || [];
      var picksData = results[2].data || [];
      var teamsData = results[3].data || [];
      var scheduleData = results[4].data || [];
      setRaces(racesData);
      setPlayers(playersData);
      setPicks(picksData);
      setTeams(teamsData);
      setSchedule(scheduleData);

      var isA = currentUser === "Andrew Ishak";
      var now = new Date();

      // Find which rounds have picks
      var roundsWithPicks = new Set();
      picksData.forEach(function (pk) { roundsWithPicks.add(pk.race_id); });
      var raceIdToRound = {};
      racesData.forEach(function (r) { raceIdToRound[r.id] = r.round; });

      // Default to the latest round that has picks and is accessible
      var available = racesData.filter(function (r) {
        return (isA || (r.pick_deadline && new Date(r.pick_deadline) <= now)) && roundsWithPicks.has(r.id);
      }).sort(function (a, b) { return b.round - a.round; });

      // Fallback: latest accessible round even without picks
      if (available.length === 0) {
        available = racesData.filter(function (r) {
          return isA || (r.pick_deadline && new Date(r.pick_deadline) <= now);
        }).sort(function (a, b) { return b.round - a.round; });
      }

      if (available.length > 0) setActiveRound(available[0].round);
      else if (racesData.length > 0) setActiveRound(racesData[0].round);
      setLoading(false);
    }
    load();
  }, [currentUser]);

  var currentRace = races.find(function (r) { return r.round === activeRound; });
  var isAdmin = currentUser === "Andrew Ishak";
  var isPastDeadline = isAdmin || (currentRace && currentRace.pick_deadline && new Date() >= new Date(currentRace.pick_deadline));
  var racePicks = currentRace ? picks.filter(function (pk) { return pk.race_id === currentRace.id; }) : [];
  var playerMap = {};
  players.forEach(function (p) { playerMap[p.id] = p.name; });
  var totalPickers = racePicks.length;

  // Track which races have picks
  var raceIdsWithPicks = new Set();
  picks.forEach(function (pk) { raceIdsWithPicks.add(pk.race_id); });

  // Over/Under map
  var playerSideMap = {};
  if (currentRace) {
    schedule.filter(function (s) { return s.race_id === currentRace.id; }).forEach(function (m) {
      var ht = teams.find(function (t) { return t.id === m.home_team_id; });
      var at = teams.find(function (t) { return t.id === m.away_team_id; });
      if (ht) { playerSideMap[ht.player1_id] = "OVER"; playerSideMap[ht.player2_id] = "OVER"; }
      if (at) { playerSideMap[at.player1_id] = "UNDER"; playerSideMap[at.player2_id] = "UNDER"; }
    });
  }

  // Find current user's pick for this round
  var myPlayer = players.find(function (p) { return p.name === currentUser; });
  var myPick = myPlayer ? racePicks.find(function (pk) { return pk.player_id === myPlayer.id; }) : null;
  var myDrivers = myPick ? (myPick.finishing_order || []) : [];
  var myTopPick = myPick ? myPick.top_pick : null;
  var myBestFinish = myPick ? parseInt(String(myPick.best_finish || "").replace(/[^0-9]/g, ""), 10) : null;
  var myComboKey = myDrivers.length > 0 ? myDrivers.slice().sort().join(", ") : null;
  var myOrderKey = myDrivers.length > 0 ? myDrivers.join(" > ") : null;

  function YourPickBadge() {
    return <span style={{ fontFamily: FB, fontWeight: 600, fontSize: 9, color: BLUEDARK, background: BLUE + "15", border: "1px solid " + BLUE + "30", padding: "2px 6px", borderRadius: 6, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 3 }}>{"\u2B50"} your pick</span>;
  }

  // ── PICKS TAB ──────────────────────────────────────
  function PicksTab() {
    var topCounts = {}, midCounts = {}, bfCounts = {};
    racePicks.forEach(function (pk) {
      if (pk.top_pick) topCounts[pk.top_pick] = (topCounts[pk.top_pick] || 0) + 1;
      (pk.finishing_order || []).forEach(function (d) {
        if (d !== pk.top_pick) midCounts[d] = (midCounts[d] || 0) + 1;
      });
      if (pk.best_finish != null && pk.best_finish !== "") {
        var bfRaw = String(pk.best_finish);
        var bfNum = parseInt(bfRaw.replace(/[^0-9]/g, ""), 10);
        if (!isNaN(bfNum) && bfNum >= 1 && bfNum <= 20) bfCounts[bfNum] = (bfCounts[bfNum] || 0) + 1;
      }
    });
    var topSorted = Object.entries(topCounts).sort(function (a, b) { return b[1] - a[1]; });
    var midSorted = Object.entries(midCounts).sort(function (a, b) { return b[1] - a[1]; });

    function Card({ name, count, isMine }) {
      var info = findDriver(driverMap, name);
      var tc = info.teamColor || BLUE;
      var parts = name.split(" ");
      var first = parts[0], last = parts.slice(1).join(" ");
      return (
        <div style={{ width: "calc(33.33% - 6px)", padding: "10px 6px 12px", borderRadius: 12, border: "2px solid " + tc + (isMine ? "" : "40"), background: tc + (isMine ? "14" : "08"), textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, position: "relative" }}>
          {isMine && <div style={{ position: "absolute", top: 5, left: 0, right: 0, display: "flex", justifyContent: "center" }}><YourPickBadge /></div>}
          <div style={{ width: 44, height: 44, borderRadius: "50%", overflow: "hidden", background: info.headshot ? tc + "18" : BORDER + "40", marginBottom: 3, marginTop: isMine ? 14 : 0, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid " + tc + "60" }}>
            {info.headshot ? (
              <img src={info.headshot} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={function (e) { e.target.style.display = "none"; }} />
            ) : (
              <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 14, color: TEXT2 }}>{first[0]}{(last[0] || "")}</span>
            )}
          </div>
          <span style={{ fontFamily: FB, fontWeight: 400, fontSize: 10, color: TEXT2 }}>{first}</span>
          <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 13, color: TEXT }}>{last}</span>
          {info.team && <span style={{ fontFamily: FB, fontWeight: 500, fontSize: 9, color: tc, background: tc + "12", padding: "1px 6px", borderRadius: 4 }}>{info.team}</span>}
          <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 18, color: BLUEDARK, marginTop: 4 }}>{count}</span>
          <span style={{ fontFamily: FB, fontSize: 9, color: TEXT2 }}>{totalPickers > 0 ? Math.round((count / totalPickers) * 100) : 0}% owned</span>
        </div>
      );
    }

    return (
      <div>
        <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 11, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px" }}>Top Driver Selections</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {topSorted.map(function (entry) { return <Card key={entry[0]} name={entry[0]} count={entry[1]} isMine={entry[0] === myTopPick} />; })}
        </div>
        <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 11, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px" }}>Midfield Selections</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {midSorted.map(function (entry) { return <Card key={entry[0]} name={entry[0]} count={entry[1]} isMine={myDrivers.indexOf(entry[0]) >= 0 && entry[0] !== myTopPick} />; })}
        </div>
        <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 11, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px" }}>Best Finish Predictions</p>
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid " + BORDER, padding: "12px 14px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (pos) {
              var isMyBf = myBestFinish === pos;
              return (
                <div key={pos} style={{ textAlign: "center", width: "calc(20% - 7px)", flexShrink: 0 }}>
                  <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 28, color: bfCounts[pos] ? BLUEDARK : BORDER + "80", display: "block" }}>{bfCounts[pos] || 0}</span>
                  <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 13, color: isMyBf ? BLUEDARK : TEXT2 }}>P{pos}</span>
                  {isMyBf && <span style={{ display: "block", fontSize: 10, marginTop: 2 }}>{"\u2B50"}</span>}
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
    var combos = {};
    racePicks.forEach(function (pk) {
      var d = (pk.finishing_order || []).slice().sort().join(", ");
      if (d) combos[d] = (combos[d] || 0) + 1;
    });
    var comboSorted = Object.entries(combos).sort(function (a, b) { return b[1] - a[1]; });
    var combosFiltered = comboSorted.filter(function (entry) { return entry[1] >= 2; });

    var orders = {};
    racePicks.forEach(function (pk) {
      var k = (pk.finishing_order || []).join(" > ");
      if (k) orders[k] = (orders[k] || 0) + 1;
    });
    var consensus = Object.entries(orders).filter(function (entry) { return entry[1] >= 2; }).sort(function (a, b) { return b[1] - a[1]; });

    return (
      <div>
        <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 11, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px" }}>Most Popular Driver Combos</p>
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid " + BORDER, padding: "12px 14px", marginBottom: 20 }}>
          {combosFiltered.length === 0 && <p style={{ fontFamily: FB, fontSize: 12, color: TEXT2, margin: 0 }}>No shared combos — everyone picked different drivers!</p>}
          {combosFiltered.map(function (entry, i) {
            var isMyCombo = myComboKey === entry[0];
            return (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: i < combosFiltered.length - 1 ? "1px solid " + BORDER + "15" : "none", background: isMyCombo ? BLUE + "08" : "transparent", margin: isMyCombo ? "0 -14px" : 0, padding: isMyCombo ? "7px 14px" : "7px 0", borderRadius: isMyCombo ? 8 : 0 }}>
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: FB, fontSize: 11, color: TEXT }}>{entry[0].split(", ").map(function (d) { return lastName(d); }).join(", ")}</span>
                  {isMyCombo && <YourPickBadge />}
                </div>
                <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 12, color: i === 0 ? GOLD : BLUEDARK, background: i === 0 ? GOLD + "15" : BLUE + "12", padding: "4px 10px", borderRadius: 8, flexShrink: 0 }}>{entry[1]} {entry[1] === 1 ? "pick" : "picks"}</span>
              </div>
            );
          })}
        </div>

        <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 11, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px" }}>Consensus Orders (2+ Players)</p>
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid " + BORDER, padding: "12px 14px" }}>
          {consensus.length === 0 && <p style={{ fontFamily: FB, fontSize: 12, color: TEXT2, margin: 0 }}>No matching orders — everyone went their own way!</p>}
          {consensus.map(function (entry, i) {
            var isMyOrder = myOrderKey === entry[0];
            return (
              <div key={i} style={{ padding: "8px 0", borderBottom: i < consensus.length - 1 ? "1px solid " + BORDER + "15" : "none", background: isMyOrder ? BLUE + "08" : "transparent", margin: isMyOrder ? "0 -14px" : 0, padding: isMyOrder ? "8px 14px" : "8px 0", borderRadius: isMyOrder ? 8 : 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 10, color: i === 0 ? GOLD : TEXT2 }}>{i === 0 ? "MOST POPULAR" : "#" + (i + 1)}</span>
                    {isMyOrder && <YourPickBadge />}
                  </div>
                  <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 12, color: BLUEDARK, background: BLUE + "12", padding: "4px 10px", borderRadius: 8 }}>{entry[1]} {entry[1] === 1 ? "pick" : "picks"}</span>
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {entry[0].split(" > ").map(function (d, j) {
                    return <span key={j} style={{ fontFamily: FD, fontWeight: 700, fontSize: 10, color: j === 0 ? ORANGE : TEXT, background: j === 0 ? ORANGE + "10" : DARK + "04", padding: "3px 6px", borderRadius: 6 }}>{j + 1}. {lastName(d)}</span>;
                  })}
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
    var guesses = racePicks.map(function (pk) {
      return { name: playerMap[pk.player_id] || "?", guess: pk.pit_guess != null ? Number(pk.pit_guess) : null, side: playerSideMap[pk.player_id] || null };
    }).filter(function (g) { return g.guess !== null; }).sort(function (a, b) { return a.guess - b.guess; });

    if (guesses.length === 0) return <p style={{ fontFamily: FB, fontSize: 13, color: TEXT2 }}>No pit stop guesses yet.</p>;

    function calcStats(arr) {
      if (arr.length === 0) return { avg: null, low: null, high: null };
      var vals = arr.map(function (g) { return g.guess; });
      return {
        avg: (vals.reduce(function (a, b) { return a + b; }, 0) / vals.length).toFixed(2),
        low: Math.min.apply(null, vals).toFixed(1),
        high: Math.max.apply(null, vals).toFixed(1),
      };
    }

    var all = calcStats(guesses);
    var overGuesses = guesses.filter(function (g) { return g.side === "OVER"; });
    var underGuesses = guesses.filter(function (g) { return g.side === "UNDER"; });
    var overs = calcStats(overGuesses);
    var unders = calcStats(underGuesses);
    var spread = (overs.avg !== null && unders.avg !== null) ? Math.abs(parseFloat(overs.avg) - parseFloat(unders.avg)).toFixed(2) : null;

    function StatRow({ label, stats, color, chipSide }) {
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid " + BORDER + "15" }}>
          <div style={{ minWidth: 80, display: "flex", alignItems: "center", gap: 6 }}>
            {chipSide ? <SideChip side={chipSide} /> : <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 11, color: TEXT }}>{label}</span>}
          </div>
          <div style={{ flex: 1, display: "flex", gap: 12 }}>
            {[{ l: "Low", v: stats.low }, { l: "Avg", v: stats.avg }, { l: "High", v: stats.high }].map(function (s) {
              return (
                <div key={s.l} style={{ textAlign: "center", flex: 1 }}>
                  <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 16, color: color || BLUEDARK, display: "block" }}>{s.v != null ? s.v + "s" : "\u2014"}</span>
                  <span style={{ fontFamily: FB, fontSize: 8, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.l}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div>
        {currentRace && currentRace.pit_stop_question && (
          <p style={{ fontFamily: FB, fontSize: 13, color: TEXT2, margin: "0 0 14px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
            <span>This week's pit stop:</span>
            <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 13, color: BLUEDARK, background: BLUE + "12", border: "1.5px solid " + BLUE + "30", padding: "4px 12px", borderRadius: 8, whiteSpace: "nowrap" }}>{currentRace.pit_stop_question}</span>
          </p>
        )}
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid " + BORDER, padding: "4px 14px", marginBottom: 20 }}>
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
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid " + BORDER, padding: "10px 14px" }}>
          {guesses.map(function (g, i) {
            var isMe = g.name === currentUser;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: i < guesses.length - 1 ? "1px solid " + BORDER + "15" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: FB, fontSize: 12, fontWeight: isMe ? 700 : 400, color: isMe ? BLUEDARK : TEXT }}>{shortName(g.name)}{isMe ? " \u2B50" : ""}</span>
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

  // ── ALL PICKS TAB (sortable) ───────────────────────
  function AllPicksTab() {
    var [sortCol, setSortCol] = useState("name");
    var [sortAsc, setSortAsc] = useState(true);

    function handleSort(col) {
      if (sortCol === col) { setSortAsc(!sortAsc); }
      else { setSortCol(col); setSortAsc(true); }
    }

    var rows = racePicks.map(function (pk) {
      return { player_id: pk.player_id, playerName: playerMap[pk.player_id] || "?", top_pick: pk.top_pick, fo: pk.finishing_order || [], best_finish: pk.best_finish, pit_guess: pk.pit_guess };
    });

    rows.sort(function (a, b) {
      var va, vb;
      if (sortCol === "name") { va = a.playerName; vb = b.playerName; }
      else if (sortCol === "top") { va = a.top_pick || ""; vb = b.top_pick || ""; }
      else if (sortCol === "best") { va = typeof a.best_finish === "string" ? parseInt(a.best_finish.replace(/\D/g, ""), 10) || 99 : (a.best_finish || 99); vb = typeof b.best_finish === "string" ? parseInt(b.best_finish.replace(/\D/g, ""), 10) || 99 : (b.best_finish || 99); return sortAsc ? va - vb : vb - va; }
      else if (sortCol === "pit") { va = a.pit_guess != null ? a.pit_guess : 99; vb = b.pit_guess != null ? b.pit_guess : 99; return sortAsc ? va - vb : vb - va; }
      else { va = a.playerName; vb = b.playerName; }
      if (typeof va === "string") return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortAsc ? va - vb : vb - va;
    });

    function arrow(col) { return sortCol === col ? (sortAsc ? " \u2191" : " \u2193") : ""; }

    return (
      <div>
        <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 11, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px" }}>Everyone's Picks — Round {activeRound}</p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", fontFamily: FB, fontSize: 10, whiteSpace: "nowrap", width: "100%" }}>
            <thead>
              <tr style={{ background: DARK + "08" }}>
                <th style={Object.assign({}, thStyle, { cursor: "pointer" })} onClick={function () { handleSort("name"); }}>Player{arrow("name")}</th>
                <th style={Object.assign({}, thStyle, { color: ORANGE, cursor: "pointer" })} onClick={function () { handleSort("top"); }}>Top{arrow("top")}</th>
                <th style={thStyle}>2nd</th>
                <th style={thStyle}>3rd</th>
                <th style={thStyle}>4th</th>
                <th style={thStyle}>5th</th>
                <th style={Object.assign({}, thStyle, { color: BLUEDARK, cursor: "pointer" })} onClick={function () { handleSort("best"); }}>Best{arrow("best")}</th>
                <th style={Object.assign({}, thStyle, { color: BLUEDARK, cursor: "pointer" })} onClick={function () { handleSort("pit"); }}>Pit{arrow("pit")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(function (pk, i) {
                var isMe = pk.playerName === currentUser;
                return (
                  <tr key={pk.player_id} style={{ background: isMe ? BLUE + "10" : i % 2 === 0 ? "#fff" : DARK + "03", borderBottom: "1px solid " + BORDER + "30" }}>
                    <td style={Object.assign({}, tdStyle, { fontWeight: isMe ? 700 : 500, color: isMe ? BLUEDARK : TEXT, minWidth: 80 })}>{shortName(pk.playerName)}{isMe ? " \u2B50" : ""}</td>
                    <td style={Object.assign({}, tdStyle, { fontWeight: 700, color: ORANGE })}>{lastName(pk.top_pick)}</td>
                    <td style={Object.assign({}, tdStyle, { color: TEXT2 })}>{pk.fo[1] ? lastName(pk.fo[1]) : "\u2014"}</td>
                    <td style={Object.assign({}, tdStyle, { color: TEXT2 })}>{pk.fo[2] ? lastName(pk.fo[2]) : "\u2014"}</td>
                    <td style={Object.assign({}, tdStyle, { color: TEXT2 })}>{pk.fo[3] ? lastName(pk.fo[3]) : "\u2014"}</td>
                    <td style={Object.assign({}, tdStyle, { color: TEXT2 })}>{pk.fo[4] ? lastName(pk.fo[4]) : "\u2014"}</td>
                    <td style={Object.assign({}, tdStyle, { fontFamily: FD, fontWeight: 700, color: BLUEDARK })}>{pk.best_finish != null ? (String(pk.best_finish).match(/^\d+$/) ? "P" + pk.best_finish : pk.best_finish) : "\u2014"}</td>
                    <td style={Object.assign({}, tdStyle, { fontFamily: FD, fontWeight: 700, color: BLUEDARK })}>{pk.pit_guess != null ? Number(pk.pit_guess).toFixed(1) : "\u2014"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── MAIN RENDER ────────────────────────────────────
  if (loading) {
    return <div style={{ padding: "60px 20px", textAlign: "center" }}><p style={{ fontFamily: FB, fontSize: 14, color: TEXT2 }}>Loading...</p></div>;
  }

  var sections = [
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
        {races.map(function (r) {
          var dl = r.pick_deadline ? new Date(r.pick_deadline) : null;
          var locked = isAdmin || (dl && new Date() >= dl);
          var hasPicks = raceIdsWithPicks.has(r.id);
          return (
            <button key={r.round} onClick={function () { if (locked) setActiveRound(r.round); }} style={{
              flexShrink: 0, width: 36, height: 36, borderRadius: "50%",
              border: "1px solid " + (activeRound === r.round ? DARK : locked && hasPicks ? BORDER : BORDER + "50"),
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
        <div style={{ padding: "40px 20px", textAlign: "center", background: "#fff", borderRadius: 14, border: "1px solid " + BORDER }}>
          <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 16, color: DARK, margin: "0 0 6px" }}>Picks Still Open</p>
          <p style={{ fontFamily: FB, fontSize: 13, color: TEXT2, margin: 0 }}>
            Pick data will be available after the deadline
            {currentRace && currentRace.pick_deadline && (
              <span style={{ display: "block", fontWeight: 600, color: DARK, marginTop: 4 }}>
                {new Date(currentRace.pick_deadline).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </span>
            )}
          </p>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", gap: 0, marginBottom: 20, borderRadius: 10, overflow: "hidden", border: "1px solid " + BORDER }}>
            {sections.map(function (s) {
              return (
                <button key={s.id} onClick={function () { setActiveSection(s.id); }} style={{
                  flex: 1, padding: "10px 0", border: "none",
                  background: activeSection === s.id ? BLUEDARK : "#fff",
                  fontFamily: FD, fontWeight: 700, fontSize: 10, textTransform: "uppercase",
                  letterSpacing: "0.04em", color: activeSection === s.id ? "#fff" : TEXT2,
                  cursor: "pointer",
                }}>{s.label}</button>
              );
            })}
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
