import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const DARK = "#1e1e2a", BLUE = "#6cb8e0", BLUEDARK = "#2a6fa8",
  GREEN = "#22cc66", RED = "#e04a4a", ORANGE = "#e08a2e",
  TEXT = "#1e1e2a", TEXT2 = "#6b6b80", BORDER = "#d8d2c4";
const FD = "'Geologica', sans-serif";
const FB = "'DM Sans', sans-serif";

// F1 points by finishing position
const F1_PTS = { 1:25, 2:18, 3:15, 4:12, 5:10, 6:8, 7:6, 8:4, 9:2, 10:1 };

// Needle scoring
function needleScore(guess, actual) {
  const diff = Math.abs(guess - actual);
  if (diff < 0.05) return 5;
  if (diff <= 0.15) return 4;
  if (diff <= 0.25) return 3;
  if (diff <= 0.35) return 2;
  if (diff <= 0.45) return 1;
  return 0;
}

// Weekly top-10 bonus
const WEEKLY_BONUS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

// OpenF1 driver number → name mapping (matches your picks database)
const DRIVER_NAMES = {
  1: "Max Verstappen", 4: "Lando Norris", 16: "Charles Leclerc",
  44: "Lewis Hamilton", 63: "George Russell", 81: "Oscar Piastri",
  55: "Carlos Sainz", 14: "Fernando Alonso", 12: "Andrea Kimi Antonelli",
  23: "Alex Albon", 18: "Lance Stroll", 10: "Pierre Gasly",
  22: "Yuki Tsunoda", 7: "Jack Doohan", 27: "Nico Hulkenberg",
  5: "Gabriel Bortoleto", 87: "Oliver Bearman", 31: "Esteban Ocon",
  30: "Liam Lawson", 6: "Isack Hadjar"
};

const DRIVER_TEAMS = {
  1: "Red Bull", 30: "Red Bull", 4: "McLaren", 81: "McLaren",
  16: "Ferrari", 44: "Ferrari", 63: "Mercedes", 12: "Mercedes",
  55: "Williams", 23: "Williams", 14: "Aston Martin", 18: "Aston Martin",
  10: "Alpine", 7: "Alpine", 22: "Racing Bulls", 6: "Racing Bulls",
  27: "Sauber", 5: "Sauber", 87: "Haas", 31: "Haas"
};

export default function Admin() {
  const [races, setRaces] = useState([]);
  const [selectedRound, setSelectedRound] = useState(null);
  const [finishOrderText, setFinishOrderText] = useState("");
  const [pitStopTime, setPitStopTime] = useState("");
  const [dnfText, setDnfText] = useState("");
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(false);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [existingScores, setExistingScores] = useState({});
  const [adminTab, setAdminTab] = useState("scoring"); // "scoring" | "logos" | "photos" | "missing"
  const [fetching, setFetching] = useState(false);
  const [fetchStatus, setFetchStatus] = useState("");
  const [teams, setTeams] = useState([]);
  const [uploading, setUploading] = useState(null);
  const [logoMsg, setLogoMsg] = useState(null);
  const [allPlayers, setAllPlayers] = useState([]);
  const [photoMsg, setPhotoMsg] = useState(null);
  const [allPicks, setAllPicks] = useState([]);
  const [missingRound, setMissingRound] = useState(null);
  const [allPitStops, setAllPitStops] = useState([]);
  const [selectedPitIdx, setSelectedPitIdx] = useState(null);

  useEffect(() => {
    async function load() {
      const { data: racesData } = await supabase
        .from("races")
        .select("id, race_name, round, race_date, pit_stop_question")
        .order("round", { ascending: true });
      setRaces(racesData || []);

      // Check which rounds already have scores
      const { data: scoresData } = await supabase
        .from("scores")
        .select("race_id");
      const scored = {};
      (scoresData || []).forEach(s => { scored[s.race_id] = true; });
      setExistingScores(scored);

      // Default to first unscored round
      const firstUnscored = (racesData || []).find(r => !scored[r.id]);
      if (firstUnscored) setSelectedRound(firstUnscored.round);
      else if (racesData?.length) setSelectedRound(racesData[0].round);

      // Load teams for logo management
      const { data: teamsData } = await supabase.from("teams").select("*").order("name");
      setTeams(teamsData || []);

      // Load players for photo management
      const { data: playersData } = await supabase.from("players").select("*").order("name");
      setAllPlayers(playersData || []);

      // Load all picks for missing picks tracker
      const { data: picksData } = await supabase.from("picks").select("player_id, race_id");
      setAllPicks(picksData || []);

      // Default missing picks round to first unscored or next upcoming
      const firstUnscoredRound = (racesData || []).find(r => !scored[r.id]);
      if (firstUnscoredRound) setMissingRound(firstUnscoredRound.round);
      else if (racesData?.length) setMissingRound(racesData[racesData.length - 1].round);

      setLoading(false);
    }
    load();
  }, []);

  const selectedRace = races.find(r => r.round === selectedRound);
  const isAlreadyScored = selectedRace && existingScores[selectedRace.id];

  // Parse finishing order from text
  function parseFinishOrder(text) {
    return text.split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        // Remove leading numbers/dots/dashes
        return line.replace(/^\d+[\.\)\-\s]+/, "").trim();
      });
  }

  function parseDNFs(text) {
    if (!text.trim()) return [];
    return text.split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => line.replace(/^\d+[\.\)\-\s]+/, "").trim());
  }

  // Fetch race data from OpenF1 API
  async function fetchFromF1API() {
    if (!selectedRace) return;
    setFetching(true);
    setFetchStatus("Looking up race session...");
    setError(null);

    try {
      // Step 1: Find the meeting for this race
      // Use the race name to search — e.g. "Australian Grand Prix" → country_name=Australia
      const raceName = selectedRace.race_name || "";
      const raceDate = selectedRace.race_date;
      const year = raceDate ? new Date(raceDate + "T00:00:00Z").getUTCFullYear() : 2026;

      // Get all 2026 sessions that are Races
      const sessionsResp = await fetch(
        `https://api.openf1.org/v1/sessions?year=${year}&session_name=Race`
      );
      const sessions = await sessionsResp.json();
      if (!Array.isArray(sessions) || sessions.length === 0) {
        throw new Error(`No ${year} race sessions found on OpenF1. The season may not have started yet, or try changing the year.`);
      }

      // Match session by date — find the Race session closest to our race_date
      let bestSession = null;
      let bestDiff = Infinity;
      for (const s of sessions) {
        if (!s.date_start) continue;
        const sessionDate = s.date_start.split("T")[0];
        const diff = Math.abs(new Date(sessionDate) - new Date(raceDate));
        if (diff < bestDiff) {
          bestDiff = diff;
          bestSession = s;
        }
      }

      if (!bestSession || bestDiff > 3 * 24 * 60 * 60 * 1000) {
        throw new Error(`No matching OpenF1 session found for ${raceName} (${raceDate}). The race may not have happened yet, or the API doesn't have it.`);
      }

      const sessionKey = bestSession.session_key;
      setFetchStatus(`Found session: ${bestSession.country_name} ${bestSession.session_name} (key: ${sessionKey})`);

      // Step 2: Get final positions
      setFetchStatus("Fetching final race positions...");
      const posResp = await fetch(
        `https://api.openf1.org/v1/position?session_key=${sessionKey}`
      );
      const positions = await posResp.json();
      if (!Array.isArray(positions) || positions.length === 0) throw new Error("Positions API returned no data. The race may not have finished yet.");

      // Get the last position entry for each driver (= final position)
      const lastPos = {};
      positions.forEach(p => {
        lastPos[p.driver_number] = p.position;
      });

      // Sort drivers by final position
      const sorted = Object.entries(lastPos)
        .sort((a, b) => a[1] - b[1]);

      // Step 3: Build finish order — all known drivers by position
      // Put everyone in position order; user manually moves DNFs
      const finishOrderNames = [];
      sorted.forEach(([numStr, pos]) => {
        const num = parseInt(numStr);
        const name = DRIVER_NAMES[num];
        if (name) finishOrderNames.push(name);
      });

      // Step 4: Get pit stops
      setFetchStatus("Fetching pit stop data...");
      const pitResp = await fetch(
        `https://api.openf1.org/v1/pit?session_key=${sessionKey}`
      );
      const pitStopsRaw = await pitResp.json();
      const pitStopsAll = Array.isArray(pitStopsRaw) ? pitStopsRaw : [];
      console.log("[Admin] Raw pit stops:", pitStopsAll.length, "| First entry keys:", pitStopsAll[0] ? Object.keys(pitStopsAll[0]) : "none");
      console.log("[Admin] First pit stop:", pitStopsAll[0]);
      
      // Debug: show first 3 stop_duration values
      const sampleVals = pitStopsAll.slice(0, 3).map(p => `stop_duration=${JSON.stringify(p.stop_duration)} (type: ${typeof p.stop_duration}), pit_duration=${JSON.stringify(p.pit_duration)} (type: ${typeof p.pit_duration})`);
      
      // Try stop_duration first, fall back to pit_duration
      let usedField = "stop_duration";
      let pitStops = pitStopsAll.filter(p => p.stop_duration != null && p.stop_duration > 0);
      if (pitStops.length === 0) {
        pitStops = pitStopsAll.filter(p => p.pit_duration != null && p.pit_duration > 0)
          .map(p => ({ ...p, stop_duration: p.pit_duration }));
        usedField = "pit_duration";
      }
      
      const firstKeys = pitStopsAll[0] ? Object.keys(pitStopsAll[0]).join(", ") : "none";
      setFetchStatus(prev => prev + ` | ${pitStopsAll.length} raw entries, ${pitStops.length} with valid ${usedField}. Sample: ${sampleVals[0] || "none"}`);

      // Sort chronologically by lap
      const pitStopsSorted = [...pitStops].sort((a, b) => {
        if ((a.lap_number || 0) !== (b.lap_number || 0)) return (a.lap_number || 0) - (b.lap_number || 0);
        return (a.stop_duration || 0) - (b.stop_duration || 0);
      });

      // Build chart data
      const chartData = pitStopsSorted.map((p, i) => ({
        idx: i,
        driver: DRIVER_NAMES[p.driver_number] || `Driver #${p.driver_number}`,
        team: DRIVER_TEAMS[p.driver_number] || "Unknown",
        lap: p.lap_number || "?",
        duration: p.stop_duration,
        driverNumber: p.driver_number,
      }));
      console.log("[Admin] Chart data:", chartData.length, "pit stops");
      setAllPitStops(chartData);

      // Find the pit stop matching the race's pit_stop_question
      // Default: use the fastest stop duration, or the first Ferrari stop, etc.
      // For now, grab all stops and let the user pick, but also try to auto-detect
      const question = (selectedRace.pit_stop_question || "").toLowerCase();

      let targetPitTime = null;

      // Try to find a matching pit stop based on the question
      if (question.includes("ferrari")) {
        const ferrariDrivers = [16, 44]; // Leclerc, Hamilton
        const ferrariStops = pitStops
          .filter(p => ferrariDrivers.includes(p.driver_number))
          .sort((a, b) => a.lap_number - b.lap_number);
        if (question.includes("1st") || question.includes("first")) {
          targetPitTime = ferrariStops[0]?.stop_duration;
        } else if (question.includes("fastest")) {
          targetPitTime = Math.min(...ferrariStops.map(p => p.stop_duration));
        } else {
          targetPitTime = ferrariStops[0]?.stop_duration;
        }
      } else if (question.includes("red bull")) {
        const rbDrivers = [1, 30]; // Verstappen, Lawson
        const rbStops = pitStops
          .filter(p => rbDrivers.includes(p.driver_number))
          .sort((a, b) => a.lap_number - b.lap_number);
        targetPitTime = rbStops[0]?.stop_duration;
      } else if (question.includes("mclaren")) {
        const mcDrivers = [4, 81]; // Norris, Piastri
        const mcStops = pitStops
          .filter(p => mcDrivers.includes(p.driver_number))
          .sort((a, b) => a.lap_number - b.lap_number);
        targetPitTime = mcStops[0]?.stop_duration;
      } else if (question.includes("mercedes")) {
        const merDrivers = [63, 12]; // Russell, Antonelli
        const merStops = pitStops
          .filter(p => merDrivers.includes(p.driver_number))
          .sort((a, b) => a.lap_number - b.lap_number);
        targetPitTime = merStops[0]?.stop_duration;
      } else if (question.includes("williams")) {
        const wilDrivers = [55, 23]; // Sainz, Albon
        const wilStops = pitStops
          .filter(p => wilDrivers.includes(p.driver_number))
          .sort((a, b) => a.lap_number - b.lap_number);
        targetPitTime = wilStops[0]?.stop_duration;
      } else if (question.includes("aston")) {
        const amDrivers = [14, 18]; // Alonso, Stroll
        const amStops = pitStops
          .filter(p => amDrivers.includes(p.driver_number))
          .sort((a, b) => a.lap_number - b.lap_number);
        targetPitTime = amStops[0]?.stop_duration;
      } else if (question.includes("alpine")) {
        const alpDrivers = [10, 7]; // Gasly, Doohan
        const alpStops = pitStops
          .filter(p => alpDrivers.includes(p.driver_number))
          .sort((a, b) => a.lap_number - b.lap_number);
        targetPitTime = alpStops[0]?.stop_duration;
      } else if (question.includes("racing bulls") || question.includes("rb") || question.includes("vcarb")) {
        const rbullsDrivers = [22, 6]; // Tsunoda, Hadjar
        const rbullsStops = pitStops
          .filter(p => rbullsDrivers.includes(p.driver_number))
          .sort((a, b) => a.lap_number - b.lap_number);
        targetPitTime = rbullsStops[0]?.stop_duration;
      } else if (question.includes("haas")) {
        const haasDrivers = [87, 31]; // Bearman, Ocon
        const haasStops = pitStops
          .filter(p => haasDrivers.includes(p.driver_number))
          .sort((a, b) => a.lap_number - b.lap_number);
        targetPitTime = haasStops[0]?.stop_duration;
      } else if (question.includes("sauber") || question.includes("kick") || question.includes("stake")) {
        const sauDrivers = [27, 5]; // Hulkenberg, Bortoleto
        const sauStops = pitStops
          .filter(p => sauDrivers.includes(p.driver_number))
          .sort((a, b) => a.lap_number - b.lap_number);
        targetPitTime = sauStops[0]?.stop_duration;
      } else if (question.includes("fastest")) {
        // Overall fastest pit stop
        const fastest = pitStops.reduce((best, p) =>
          p.stop_duration < best.stop_duration ? p : best
        , pitStops[0]);
        targetPitTime = fastest?.stop_duration;
      }

      // Fallback: fastest overall pit stop
      if (!targetPitTime && pitStops.length > 0) {
        targetPitTime = Math.min(...pitStops.map(p => p.stop_duration));
        setFetchStatus(prev => prev + " (couldn't match question, using fastest stop)");
      }

      // Fill in the form
      setFinishOrderText(finishOrderNames.join("\n"));
      setDnfText("");

      // Find the selected pit stop index in chartData
      let selectedIdx = null;
      if (targetPitTime && chartData.length > 0) {
        const match = chartData.find(p => Math.abs(p.duration - targetPitTime) < 0.01);
        if (match) selectedIdx = match.idx;
        setPitStopTime(targetPitTime.toFixed(1));
      }
      setSelectedPitIdx(selectedIdx);

      const matchedTeam = targetPitTime && chartData.find(p => Math.abs(p.duration - targetPitTime) < 0.01);
      const pitDesc = matchedTeam ? `${matchedTeam.driver} (${matchedTeam.team}) Lap ${matchedTeam.lap} — ${targetPitTime.toFixed(2)}s` : targetPitTime ? `${targetPitTime.toFixed(2)}s` : "none found";

      setFetchStatus(
        `✅ ${finishOrderNames.length} drivers classified. ` +
        `Selected pit stop: ${pitDesc}. ` +
        `${chartData.length} total stops in table below (using ${usedField}).`
      );

    } catch (e) {
      console.error(e);
      setError("OpenF1 fetch error: " + e.message);
    } finally {
      setFetching(false);
    }
  }

  // Main scoring function
  async function scoreRace() {
    setError(null);
    setScoring(true);
    setSaved(false);

    try {
      const finishOrder = parseFinishOrder(finishOrderText);
      const dnfs = parseDNFs(dnfText);
      const pitTime = parseFloat(pitStopTime);

      if (finishOrder.length < 5) {
        setError("Need at least 5 drivers in finishing order");
        setScoring(false);
        return;
      }
      if (isNaN(pitTime)) {
        setError("Invalid pit stop time");
        setScoring(false);
        return;
      }

      // Build position map
      const positionMap = {};
      finishOrder.forEach((driver, i) => {
        positionMap[driver.toLowerCase()] = i + 1;
      });
      dnfs.forEach(d => {
        positionMap[d.toLowerCase()] = -1;
      });

      function getPos(driverName) {
        const key = driverName?.toLowerCase();
        if (!key) return 99;
        if (positionMap[key] === -1) return -1;
        return positionMap[key] || 99;
      }

      function getPts(driverName) {
        const pos = getPos(driverName);
        if (pos === -1) return -1;
        return F1_PTS[pos] || 0;
      }

      // Fetch all picks for this race
      const { data: picks } = await supabase
        .from("picks")
        .select("*")
        .eq("race_id", selectedRace.id);

      // Fetch all players
      const { data: players } = await supabase
        .from("players")
        .select("id, name");

      // Fetch teams and schedule for BOX BOX
      const { data: teams } = await supabase
        .from("teams")
        .select("*");

      const { data: schedule } = await supabase
        .from("schedule")
        .select("*")
        .eq("race_id", selectedRace.id);

      const playerMap = {};
      (players || []).forEach(p => { playerMap[p.id] = p.name; });

      // Score each player
      const playerScores = [];
      const picksMap = {};
      (picks || []).forEach(pk => { picksMap[pk.player_id] = pk; });

      // Collect all picked drivers for column headers
      const allPickedDrivers = new Set();

      (players || []).forEach(player => {
        const pick = picksMap[player.id];
        if (!pick) {
          playerScores.push({
            playerId: player.id,
            playerName: player.name,
            topPick: null,
            midPicks: [],
            driverPts: {},
            topPickPts: 0,
            midfieldPts: 0,
            orderBonus: 0,
            bestFinishBonus: 0,
            pitIndividualPts: 0,
            weeklyBonusPts: 0,
            totalPts: 0,
            noPick: true
          });
          return;
        }

        const topPick = pick.top_pick;
        const allPicks = pick.finishing_order || [];
        const midPicks = allPicks.filter(d => d !== topPick);

        // Track picked drivers
        allPicks.forEach(d => allPickedDrivers.add(d));

        // Driver points
        const driverPts = {};
        const topPickPts = getPts(topPick);
        driverPts[topPick] = topPickPts;

        let midfieldPts = 0;
        midPicks.forEach(d => {
          const pts = getPts(d);
          driverPts[d] = pts;
          midfieldPts += pts;
        });

        // Finishing order bonus
        const actualOrder = [...allPicks].sort((a, b) => {
          const pa = getPos(a);
          const pb = getPos(b);
          const sa = pa === -1 ? 999 : pa;
          const sb = pb === -1 ? 999 : pb;
          return sa - sb;
        });

        // DNF rule: DNFs are interchangeable at the back
        let orderBonus = 0;
        const predictedNonDnf = allPicks.filter(d => getPos(d) !== -1);
        const actualNonDnf = actualOrder.filter(d => getPos(d) !== -1);
        if (predictedNonDnf.length === actualNonDnf.length &&
            predictedNonDnf.every((d, i) => d === actualNonDnf[i])) {
          orderBonus = 6;
        }

        // Best finish bonus
        const positions = allPicks
          .map(d => getPos(d))
          .filter(p => p > 0);
        const bestActualPos = positions.length > 0 ? Math.min(...positions) : 99;
        const bestFinishGuessRaw = String(pick.best_finish || "").replace(/[^0-9]/g, "");
        const bestFinishGuessNum = bestFinishGuessRaw ? parseInt(bestFinishGuessRaw, 10) : null;
        const bestFinishBonus = bestFinishGuessNum === bestActualPos ? 3 : 0;

        // Pit stop needle
        const pitIndividualPts = pick.pit_guess ? needleScore(pick.pit_guess, pitTime) : 0;

        const totalPts = topPickPts + midfieldPts + orderBonus + bestFinishBonus + pitIndividualPts;

        playerScores.push({
          playerId: player.id,
          playerName: player.name,
          topPick,
          midPicks,
          driverPts,
          topPickPts,
          midfieldPts,
          orderBonus,
          bestFinishBonus,
          pitIndividualPts,
          weeklyBonusPts: 0, // computed after ranking
          totalPts,
          noPick: false,
          pitGuess: pick.pit_guess,
          bestFinishGuess: pick.best_finish,
          bestActualPos,
          predictedOrder: allPicks,
          actualOrder
        });
      });

      // Rank players and assign weekly top-10 bonus
      const ranked = [...playerScores]
        .filter(s => !s.noPick)
        .sort((a, b) => b.totalPts - a.totalPts);

      ranked.forEach((s, i) => {
        if (i < WEEKLY_BONUS.length) {
          s.weeklyBonusPts = WEEKLY_BONUS[i];
          s.totalPts += s.weeklyBonusPts;
        }
      });

      // Compute BOX BOX line for each matchup
      const teamScores = [];
      (schedule || []).forEach(matchup => {
        const homeTeam = (teams || []).find(t => t.id === matchup.home_team_id);
        const awayTeam = (teams || []).find(t => t.id === matchup.away_team_id);
        if (!homeTeam || !awayTeam) return;

        const homePlayers = [homeTeam.player1_id, homeTeam.player2_id];
        const awayPlayers = [awayTeam.player1_id, awayTeam.player2_id];
        const allFour = [...homePlayers, ...awayPlayers];

        // BOX BOX line = average of 4 pit guesses
        const pitGuesses = allFour
          .map(pid => picksMap[pid]?.pit_guess)
          .filter(g => g != null);

        const boxBoxLine = pitGuesses.length > 0
          ? pitGuesses.reduce((a, b) => a + b, 0) / pitGuesses.length
          : null;

        // Home = Over, Away = Under (from schedule)
        const overTeam = homeTeam;
        const underTeam = awayTeam;

        // Determine who wins the BOX BOX
        let overBonus = 0, underBonus = 0;
        if (boxBoxLine !== null) {
          if (pitTime > boxBoxLine) {
            // Actual > line = OVER wins
            overBonus = 5;
            underBonus = -1;
          } else if (pitTime < boxBoxLine) {
            // Actual < line = UNDER wins
            overBonus = -1;
            underBonus = 5;
          } else {
            // Exact = push, no bonus
            overBonus = 0;
            underBonus = 0;
          }
        }

        // Team matchup scores (no needle)
        function teamPlayerScore(pid) {
          const s = playerScores.find(ps => ps.playerId === pid);
          if (!s || s.noPick) return 0;
          return s.topPickPts + s.midfieldPts + s.orderBonus + s.bestFinishBonus;
        }

        const homeP1Score = teamPlayerScore(homePlayers[0]);
        const homeP2Score = teamPlayerScore(homePlayers[1]);
        const awayP1Score = teamPlayerScore(awayPlayers[0]);
        const awayP2Score = teamPlayerScore(awayPlayers[1]);

        const homeTotal = homeP1Score + homeP2Score + overBonus;
        const awayTotal = awayP1Score + awayP2Score + underBonus;

        teamScores.push({
          homeTeam: homeTeam.name,
          awayTeam: awayTeam.name,
          homeP1: playerMap[homePlayers[0]], homeP1Score,
          homeP2: playerMap[homePlayers[1]], homeP2Score,
          awayP1: playerMap[awayPlayers[0]], awayP1Score,
          awayP2: playerMap[awayPlayers[1]], awayP2Score,
          homeBoxBox: overBonus,
          awayBoxBox: underBonus,
          homeTotal,
          awayTotal,
          boxBoxLine: boxBoxLine ? boxBoxLine.toFixed(2) : "N/A",
          homeWon: homeTotal > awayTotal,
          awayWon: awayTotal > homeTotal,
          // Store for saving
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          homePlayers,
          awayPlayers,
          overBonus,
          underBonus
        });
      });

      // Sort picked drivers for column display
      const sortedPickedDrivers = [...allPickedDrivers].sort((a, b) => {
        const pa = getPos(a);
        const pb = getPos(b);
        return (pa === -1 ? 999 : pa) - (pb === -1 ? 999 : pb);
      });

      setPreview({
        playerScores: playerScores.sort((a, b) => b.totalPts - a.totalPts),
        teamScores,
        pickedDrivers: sortedPickedDrivers,
        finishOrder,
        dnfs,
        pitTime,
        raceId: selectedRace.id
      });

    } catch (e) {
      console.error(e);
      setError("Scoring error: " + e.message);
    } finally {
      setScoring(false);
    }
  }

  // Save scores to database
  async function saveScores() {
    if (!preview) return;

    if (isAlreadyScored) {
      const confirmed = window.confirm(
        `Round ${selectedRound} already has scores. This will OVERWRITE them. Continue?`
      );
      if (!confirmed) return;

      // Delete existing scores for this race
      await supabase.from("scores").delete().eq("race_id", preview.raceId);
      await supabase.from("results").delete().eq("race_id", preview.raceId);
    }

    setSaving(true);
    setError(null);

    try {
      // Save results
      const top5 = preview.finishOrder.slice(0, 5);
      const { error: resultsErr } = await supabase.from("results").upsert({
        race_id: preview.raceId,
        top_driver: preview.finishOrder[0],
        finishing_order: top5,
        pit_stop_time: preview.pitTime
      }, { onConflict: "race_id" });
      if (resultsErr) {
        console.error("Results upsert error:", resultsErr);
        throw resultsErr;
      }

      // Save all player scores
      const scoresToInsert = preview.playerScores
        .filter(s => !s.noPick)
        .map(s => ({
          player_id: s.playerId,
          race_id: preview.raceId,
          top_pick_pts: s.topPickPts,
          midfield_pts: s.midfieldPts,
          order_bonus: s.orderBonus,
          best_finish_bonus: s.bestFinishBonus,
          pit_individual_pts: s.pitIndividualPts,
          pit_matchup_pts: 0,
          weekly_bonus_pts: s.weeklyBonusPts,
          total_pts: s.totalPts,
          driver_pts: JSON.stringify(s.driverPts)
        }));

      console.log("Inserting", scoresToInsert.length, "scores");
      console.log("Sample:", JSON.stringify(scoresToInsert[0]));

      // Insert scores
      const { data: insertData, error: insertErr } = await supabase.from("scores").insert(scoresToInsert).select();
      console.log("Insert result:", insertData?.length, "rows, error:", insertErr);
      if (insertErr) throw insertErr;
      if (!insertData || insertData.length === 0) {
        throw new Error("Insert returned no rows — possible RLS policy blocking writes");
      }

      // Update pit_matchup_pts for each team's player1
      for (const ts of preview.teamScores) {
        // Home team (Over): store bonus on player1
        await supabase.from("scores")
          .update({ pit_matchup_pts: ts.overBonus })
          .eq("player_id", ts.homePlayers[0])
          .eq("race_id", preview.raceId);

        // Away team (Under): store bonus on player1
        await supabase.from("scores")
          .update({ pit_matchup_pts: ts.underBonus })
          .eq("player_id", ts.awayPlayers[0])
          .eq("race_id", preview.raceId);
      }

      setSaved(true);
      setExistingScores(prev => ({ ...prev, [preview.raceId]: true }));
      setError(`✅ Success! Inserted ${insertData?.length || 0} scores and updated ${preview.teamScores.length} team matchups.`);
    } catch (e) {
      console.error(e);
      setError("Save error: " + (e?.message || JSON.stringify(e)));
    } finally {
      setSaving(false);
    }
  }

  function shortName(name) {
    if (!name) return "?";
    const parts = name.split(" ");
    return parts.length >= 2 ? `${parts[0][0]}. ${parts[parts.length - 1]}` : name;
  }

  function lastName(name) {
    if (!name) return "?";
    const parts = name.split(" ");
    return parts[parts.length - 1];
  }

  // Logo upload handler
  async function handleLogoUpload(teamId, teamName, file) {
    setUploading(teamId);
    setLogoMsg(null);
    try {
      const ext = file.name.split(".").pop().toLowerCase();
      const fileName = `${teamId}.${ext}`;

      // Upload to Supabase Storage
      const { error: uploadErr } = await supabase.storage
        .from("team-logos")
        .upload(fileName, file, { upsert: true, contentType: file.type });
      if (uploadErr) throw uploadErr;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("team-logos")
        .getPublicUrl(fileName);
      const logoUrl = urlData.publicUrl + "?t=" + Date.now(); // cache bust

      // Update team record
      const { error: updateErr } = await supabase
        .from("teams")
        .update({ logo_url: logoUrl })
        .eq("id", teamId);
      if (updateErr) throw updateErr;

      // Update local state
      setTeams(prev => prev.map(t => t.id === teamId ? { ...t, logo_url: logoUrl } : t));
      setLogoMsg(`✅ Logo uploaded for ${teamName}`);
    } catch (e) {
      setLogoMsg(`❌ Error: ${e.message}`);
    } finally {
      setUploading(null);
    }
  }

  async function removeLogo(teamId, teamName) {
    setUploading(teamId);
    setLogoMsg(null);
    try {
      await supabase.from("teams").update({ logo_url: null }).eq("id", teamId);
      setTeams(prev => prev.map(t => t.id === teamId ? { ...t, logo_url: null } : t));
      setLogoMsg(`Removed logo for ${teamName}`);
    } catch (e) {
      setLogoMsg(`❌ Error: ${e.message}`);
    } finally {
      setUploading(null);
    }
  }

  // Player photo upload
  async function handlePhotoUpload(playerId, playerName, file) {
    setUploading("p-" + playerId);
    setPhotoMsg(null);
    try {
      const ext = file.name.split(".").pop().toLowerCase();
      const fileName = `${playerId}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("player-photos")
        .upload(fileName, file, { upsert: true, contentType: file.type });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage
        .from("player-photos")
        .getPublicUrl(fileName);
      const photoUrl = urlData.publicUrl + "?t=" + Date.now();
      const { error: updateErr } = await supabase
        .from("players")
        .update({ photo_url: photoUrl })
        .eq("id", playerId);
      if (updateErr) throw updateErr;
      setAllPlayers(prev => prev.map(p => p.id === playerId ? { ...p, photo_url: photoUrl } : p));
      setPhotoMsg(`✅ Photo uploaded for ${playerName}`);
    } catch (e) {
      setPhotoMsg(`❌ Error: ${e.message}`);
    } finally {
      setUploading(null);
    }
  }

  async function removePhoto(playerId, playerName) {
    setUploading("p-" + playerId);
    setPhotoMsg(null);
    try {
      await supabase.from("players").update({ photo_url: null }).eq("id", playerId);
      setAllPlayers(prev => prev.map(p => p.id === playerId ? { ...p, photo_url: null } : p));
      setPhotoMsg(`Removed photo for ${playerName}`);
    } catch (e) {
      setPhotoMsg(`❌ Error: ${e.message}`);
    } finally {
      setUploading(null);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center" }}>
        <p style={{ fontFamily: FB, fontSize: 14, color: TEXT2 }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 20px 100px" }}>
      <p style={{
        fontFamily: FD, fontWeight: 900, fontSize: 22, color: DARK,
        textTransform: "uppercase", letterSpacing: "0.03em", margin: "0 0 16px"
      }}>
        Admin
      </p>

      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20, borderRadius: 10, overflow: "hidden", border: `1px solid ${BORDER}` }}>
        {[{ id: "scoring", label: "Score Race" }, { id: "missing", label: "Missing Picks" }, { id: "logos", label: "Logos" }, { id: "photos", label: "Photos" }].map(tab => (
          <button key={tab.id} onClick={() => setAdminTab(tab.id)} style={{
            flex: 1, padding: "10px 0", border: "none",
            background: adminTab === tab.id ? BLUEDARK : "#fff",
            fontFamily: FD, fontWeight: 700, fontSize: 12, textTransform: "uppercase",
            letterSpacing: "0.06em", color: adminTab === tab.id ? "#fff" : TEXT2,
            cursor: "pointer"
          }}>{tab.label}</button>
        ))}
      </div>

      {/* MISSING PICKS TAB */}
      {adminTab === "missing" && (() => {
        const missingRace = races.find(r => r.round === missingRound);
        const submittedPlayerIds = new Set(
          allPicks.filter(pk => missingRace && pk.race_id === missingRace.id).map(pk => pk.player_id)
        );
        const missingPlayers = allPlayers.filter(p => !submittedPlayerIds.has(p.id));
        const submittedPlayers = allPlayers.filter(p => submittedPlayerIds.has(p.id));
        const missingEmails = missingPlayers.map(p => p.email).filter(Boolean);
        const copied = () => {
          if (missingEmails.length === 0) return;
          navigator.clipboard.writeText(missingEmails.join(", "));
        };

        return (
          <div>
            <p style={{ fontFamily: FB, fontSize: 13, color: TEXT2, marginBottom: 12 }}>
              See who hasn't submitted picks for a given round.
            </p>

            {/* Round selector */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontFamily: FD, fontWeight: 700, fontSize: 11, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>
                Select Round
              </label>
              <select
                value={missingRound || ""}
                onChange={e => setMissingRound(parseInt(e.target.value))}
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: 10,
                  border: `1px solid ${BORDER}`, fontFamily: FB, fontSize: 13, color: TEXT,
                  background: "#fff"
                }}
              >
                {races.map(r => (
                  <option key={r.round} value={r.round}>
                    Round {r.round} — {r.race_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Summary */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <div style={{
                flex: 1, padding: "12px 14px", borderRadius: 12,
                background: `${GREEN}08`, border: `1px solid ${GREEN}25`, textAlign: "center"
              }}>
                <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 22, color: GREEN, margin: 0 }}>{submittedPlayers.length}</p>
                <p style={{ fontFamily: FB, fontSize: 10, color: TEXT2, margin: "2px 0 0" }}>Submitted</p>
              </div>
              <div style={{
                flex: 1, padding: "12px 14px", borderRadius: 12,
                background: `${RED}08`, border: `1px solid ${RED}25`, textAlign: "center"
              }}>
                <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 22, color: RED, margin: 0 }}>{missingPlayers.length}</p>
                <p style={{ fontFamily: FB, fontSize: 10, color: TEXT2, margin: "2px 0 0" }}>Missing</p>
              </div>
            </div>

            {/* Missing players table */}
            {missingPlayers.length > 0 ? (
              <>
                <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 12, color: DARK, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>
                  Haven't Submitted
                </p>
                <div style={{ overflowX: "auto", marginBottom: 16 }}>
                  <table style={{ borderCollapse: "collapse", width: "100%", fontFamily: FB, fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: `${DARK}08` }}>
                        <th style={{ ...thStyle, fontSize: 10 }}>Player</th>
                        <th style={{ ...thStyle, fontSize: 10 }}>Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {missingPlayers.map((p, i) => (
                        <tr key={p.id} style={{ background: i % 2 === 0 ? "#fff" : `${DARK}03`, borderBottom: `1px solid ${BORDER}30` }}>
                          <td style={{ padding: "8px 10px", fontWeight: 600, color: TEXT }}>{p.name}</td>
                          <td style={{ padding: "8px 10px", color: p.email ? TEXT2 : `${RED}80`, fontSize: 11 }}>
                            {p.email || "No email on file"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Copy emails button */}
                <button
                  onClick={copied}
                  disabled={missingEmails.length === 0}
                  style={{
                    width: "100%", padding: "12px", borderRadius: 12,
                    background: missingEmails.length > 0 ? BLUEDARK : BORDER,
                    border: "none", color: "#fff",
                    fontFamily: FD, fontWeight: 800, fontSize: 13,
                    textTransform: "uppercase", letterSpacing: "0.06em",
                    cursor: missingEmails.length > 0 ? "pointer" : "default",
                    marginBottom: 8
                  }}
                >
                  Copy {missingEmails.length} Email{missingEmails.length !== 1 ? "s" : ""} to Clipboard
                </button>
                {missingEmails.length === 0 && missingPlayers.length > 0 && (
                  <p style={{ fontFamily: FB, fontSize: 11, color: RED, textAlign: "center", margin: 0 }}>
                    No emails on file for missing players — add emails to the players table in Supabase.
                  </p>
                )}
              </>
            ) : (
              <div style={{ padding: "30px 0", textAlign: "center" }}>
                <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 16, color: GREEN, margin: "0 0 4px" }}>All Submitted!</p>
                <p style={{ fontFamily: FB, fontSize: 12, color: TEXT2, margin: 0 }}>Everyone has submitted picks for this round.</p>
              </div>
            )}
          </div>
        );
      })()}

      {/* LOGOS TAB */}
      {adminTab === "logos" && (
        <div>
          <p style={{ fontFamily: FB, fontSize: 13, color: TEXT2, marginBottom: 16 }}>
            Upload logos for each team. Use square images (PNG or JPG) for best results.
          </p>

          {logoMsg && (
            <div style={{ padding: "8px 12px", borderRadius: 8, background: logoMsg.startsWith("✅") ? `${GREEN}10` : logoMsg.startsWith("❌") ? `${RED}10` : `${BLUE}10`, marginBottom: 16 }}>
              <p style={{ fontFamily: FB, fontSize: 12, color: logoMsg.startsWith("✅") ? GREEN : logoMsg.startsWith("❌") ? RED : TEXT, margin: 0 }}>{logoMsg}</p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {teams.map(t => (
              <div key={t.id} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                borderRadius: 12, border: `1px solid ${BORDER}`, background: "#fff"
              }}>
                {/* Current logo or placeholder */}
                {t.logo_url ? (
                  <img src={t.logo_url} alt={t.name} style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover", flexShrink: 0, border: `1px solid ${BORDER}` }} />
                ) : (
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${BORDER}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: FD, fontWeight: 700, fontSize: 12, color: TEXT2 }}>
                    {(t.name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                )}

                {/* Team name */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: FB, fontWeight: 600, fontSize: 13, color: TEXT, margin: 0 }}>{t.name}</p>
                  <p style={{ fontFamily: FB, fontSize: 10, color: TEXT2, margin: "1px 0 0" }}>
                    {t.division === "championship" ? "Championship" : "Second Division"}
                    {t.logo_url ? " · ✅ Has logo" : " · No logo"}
                  </p>
                </div>

                {/* Upload / remove buttons */}
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <label style={{
                    padding: "6px 12px", borderRadius: 8,
                    background: BLUE, color: "#fff",
                    fontFamily: FD, fontWeight: 700, fontSize: 10, textTransform: "uppercase",
                    cursor: uploading === t.id ? "wait" : "pointer",
                    opacity: uploading === t.id ? 0.5 : 1
                  }}>
                    {uploading === t.id ? "..." : "Upload"}
                    <input type="file" accept="image/*" style={{ display: "none" }}
                      onChange={e => { if (e.target.files[0]) handleLogoUpload(t.id, t.name, e.target.files[0]); e.target.value = ""; }}
                      disabled={uploading === t.id}
                    />
                  </label>
                  {t.logo_url && (
                    <button onClick={() => removeLogo(t.id, t.name)} style={{
                      padding: "6px 10px", borderRadius: 8, border: `1px solid ${RED}30`,
                      background: `${RED}08`, color: RED,
                      fontFamily: FD, fontWeight: 700, fontSize: 10, textTransform: "uppercase",
                      cursor: "pointer"
                    }}>✕</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PHOTOS TAB */}
      {adminTab === "photos" && (
        <div>
          <p style={{ fontFamily: FB, fontSize: 13, color: TEXT2, marginBottom: 16 }}>
            Upload photos for each player. Square images (PNG or JPG) work best.
          </p>

          {photoMsg && (
            <div style={{ padding: "8px 12px", borderRadius: 8, background: photoMsg.startsWith("✅") ? `${GREEN}10` : photoMsg.startsWith("❌") ? `${RED}10` : `${BLUE}10`, marginBottom: 16 }}>
              <p style={{ fontFamily: FB, fontSize: 12, color: photoMsg.startsWith("✅") ? GREEN : photoMsg.startsWith("❌") ? RED : TEXT, margin: 0 }}>{photoMsg}</p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {allPlayers.map(p => (
              <div key={p.id} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                borderRadius: 12, border: `1px solid ${BORDER}`, background: "#fff"
              }}>
                {p.photo_url ? (
                  <img src={p.photo_url} alt={p.name} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${BORDER}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: FD, fontWeight: 700, fontSize: 13, color: TEXT2 }}>
                    {(p.name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: FB, fontWeight: 600, fontSize: 13, color: TEXT, margin: 0 }}>{p.name}</p>
                  <p style={{ fontFamily: FB, fontSize: 10, color: TEXT2, margin: "1px 0 0" }}>
                    {p.photo_url ? "✅ Has photo" : "No photo"}
                  </p>
                </div>

                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <label style={{
                    padding: "6px 12px", borderRadius: 8,
                    background: BLUE, color: "#fff",
                    fontFamily: FD, fontWeight: 700, fontSize: 10, textTransform: "uppercase",
                    cursor: uploading === "p-" + p.id ? "wait" : "pointer",
                    opacity: uploading === "p-" + p.id ? 0.5 : 1
                  }}>
                    {uploading === "p-" + p.id ? "..." : "Upload"}
                    <input type="file" accept="image/*" style={{ display: "none" }}
                      onChange={e => { if (e.target.files[0]) handlePhotoUpload(p.id, p.name, e.target.files[0]); e.target.value = ""; }}
                      disabled={uploading === "p-" + p.id}
                    />
                  </label>
                  {p.photo_url && (
                    <button onClick={() => removePhoto(p.id, p.name)} style={{
                      padding: "6px 10px", borderRadius: 8, border: `1px solid ${RED}30`,
                      background: `${RED}08`, color: RED,
                      fontFamily: FD, fontWeight: 700, fontSize: 10, textTransform: "uppercase",
                      cursor: "pointer"
                    }}>✕</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SCORING TAB */}
      {adminTab === "scoring" && (
        <div>

      {/* Round selector */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontFamily: FD, fontWeight: 700, fontSize: 11, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>
          Select Round
        </label>
        <select
          value={selectedRound || ""}
          onChange={e => { setSelectedRound(parseInt(e.target.value)); setPreview(null); setSaved(false); }}
          style={{
            width: "100%", padding: "10px 12px", borderRadius: 10,
            border: `1px solid ${BORDER}`, fontFamily: FB, fontSize: 13,
            color: TEXT, background: "#fff"
          }}
        >
          {races.map(r => (
            <option key={r.round} value={r.round}>
              R{r.round} — {r.race_name} {existingScores[r.id] ? "✅ Scored" : ""}
            </option>
          ))}
        </select>
        {isAlreadyScored && (
          <p style={{ fontFamily: FB, fontSize: 11, color: ORANGE, margin: "4px 0 0" }}>
            ⚠️ This round already has scores. Scoring again will overwrite.
          </p>
        )}
      </div>

      {/* Auto-fetch from OpenF1 */}
      <div style={{ marginBottom: 20, padding: "14px 16px", background: "#fff", borderRadius: 12, border: `1px solid ${BORDER}` }}>
        <button
          onClick={fetchFromF1API}
          disabled={fetching || !selectedRace}
          style={{
            width: "100%", padding: "12px", borderRadius: 10,
            border: "none", background: fetching ? BORDER : BLUEDARK,
            fontFamily: FD, fontWeight: 700, fontSize: 13, color: "#fff",
            cursor: fetching ? "wait" : "pointer", textTransform: "uppercase",
            letterSpacing: "0.06em", marginBottom: fetchStatus ? 10 : 0
          }}
        >
          {fetching ? "Fetching from OpenF1..." : "Auto-Fill from F1 API"}
        </button>
        {fetchStatus && (
          <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 8, background: `${BLUE}10`, border: `1px solid ${BLUE}20` }}>
            <p style={{ fontFamily: FB, fontSize: 13, color: BLUEDARK, margin: 0, lineHeight: 1.5 }}>{fetchStatus}</p>
          </div>
        )}
      </div>

      <p style={{ fontFamily: FB, fontSize: 10, color: TEXT2, margin: "0 0 12px", fontStyle: "italic" }}>
        Or enter manually below:
      </p>

      {/* Finishing order input */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontFamily: FD, fontWeight: 700, fontSize: 11, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>
          Finishing Order (P1 first, one driver per line)
        </label>
        <textarea
          value={finishOrderText}
          onChange={e => setFinishOrderText(e.target.value)}
          placeholder={"Max Verstappen\nLando Norris\nCharles Leclerc\n..."}
          rows={10}
          style={{
            width: "100%", padding: "10px 12px", borderRadius: 10,
            border: `1px solid ${BORDER}`, fontFamily: FB, fontSize: 12,
            color: TEXT, resize: "vertical", boxSizing: "border-box"
          }}
        />
      </div>

      {/* DNFs */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontFamily: FD, fontWeight: 700, fontSize: 11, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>
          DNFs (one per line, leave blank if none)
        </label>
        <textarea
          value={dnfText}
          onChange={e => setDnfText(e.target.value)}
          placeholder={"Sergio Perez\nLance Stroll"}
          rows={3}
          style={{
            width: "100%", padding: "10px 12px", borderRadius: 10,
            border: `1px solid ${BORDER}`, fontFamily: FB, fontSize: 12,
            color: TEXT, resize: "vertical", boxSizing: "border-box"
          }}
        />
      </div>

      {/* Pit stop time */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontFamily: FD, fontWeight: 700, fontSize: 11, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>
          Pit Stop Time (seconds)
        </label>
        <input
          type="number"
          step="0.1"
          value={pitStopTime}
          onChange={e => setPitStopTime(e.target.value)}
          placeholder="2.4"
          style={{
            width: 120, padding: "10px 12px", borderRadius: 10,
            border: `1px solid ${BORDER}`, fontFamily: FD, fontSize: 16,
            fontWeight: 700, color: TEXT, boxSizing: "border-box"
          }}
        />
      </div>

      {/* All Pit Stops Chart */}
      {allPitStops.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontFamily: FD, fontWeight: 700, fontSize: 11, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>
            All Pit Stops — Chronological ({allPitStops.length} stops)
          </label>
          <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${BORDER}`, overflow: "hidden", maxHeight: 500, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FB, fontSize: 11 }}>
              <thead>
                <tr style={{ background: `${DARK}08`, position: "sticky", top: 0 }}>
                  <th style={{ padding: "6px 8px", textAlign: "left", fontFamily: FD, fontWeight: 700, fontSize: 9, color: TEXT2, textTransform: "uppercase", borderBottom: `1px solid ${BORDER}` }}>#</th>
                  <th style={{ padding: "6px 8px", textAlign: "left", fontFamily: FD, fontWeight: 700, fontSize: 9, color: TEXT2, textTransform: "uppercase", borderBottom: `1px solid ${BORDER}` }}>Lap</th>
                  <th style={{ padding: "6px 8px", textAlign: "left", fontFamily: FD, fontWeight: 700, fontSize: 9, color: TEXT2, textTransform: "uppercase", borderBottom: `1px solid ${BORDER}` }}>Driver</th>
                  <th style={{ padding: "6px 8px", textAlign: "left", fontFamily: FD, fontWeight: 700, fontSize: 9, color: TEXT2, textTransform: "uppercase", borderBottom: `1px solid ${BORDER}` }}>Team</th>
                  <th style={{ padding: "6px 8px", textAlign: "right", fontFamily: FD, fontWeight: 700, fontSize: 9, color: TEXT2, textTransform: "uppercase", borderBottom: `1px solid ${BORDER}` }}>Duration</th>
                  <th style={{ padding: "6px 4px", textAlign: "center", borderBottom: `1px solid ${BORDER}` }}></th>
                </tr>
              </thead>
              <tbody>
                {allPitStops.map((p, i) => {
                  const isSelected = selectedPitIdx === p.idx;
                  return (
                    <tr key={i} style={{
                      background: isSelected ? `${GREEN}12` : i % 2 === 0 ? "#fff" : `${DARK}03`,
                      borderBottom: `1px solid ${BORDER}20`,
                      cursor: "pointer",
                    }} onClick={() => {
                      setPitStopTime(p.duration.toFixed(1));
                      setSelectedPitIdx(p.idx);
                    }}>
                      <td style={{ padding: "5px 8px", fontFamily: FD, fontWeight: 600, fontSize: 10, color: TEXT2 }}>{i + 1}</td>
                      <td style={{ padding: "5px 8px", fontFamily: FD, fontWeight: 700, fontSize: 11, color: TEXT2 }}>{p.lap}</td>
                      <td style={{ padding: "5px 8px", fontWeight: 600, fontSize: 11, color: TEXT }}>{p.driver}</td>
                      <td style={{ padding: "5px 8px", fontSize: 11, color: TEXT2 }}>{p.team}</td>
                      <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: FD, fontWeight: 800, fontSize: 12, color: isSelected ? GREEN : BLUEDARK }}>{p.duration.toFixed(2)}s</td>
                      <td style={{ padding: "5px 4px", textAlign: "center" }}>
                        {isSelected && <span style={{ fontSize: 10, color: GREEN }}>✓</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ fontFamily: FB, fontSize: 10, color: TEXT2, marginTop: 4 }}>Click a row to use that pit stop time</p>
        </div>
      )}

      {/* Score button */}
      <button
        onClick={scoreRace}
        disabled={scoring}
        style={{
          width: "100%", padding: "14px", borderRadius: 12,
          background: BLUEDARK, border: "none", color: "#fff",
          fontFamily: FD, fontWeight: 800, fontSize: 14,
          textTransform: "uppercase", letterSpacing: "0.06em",
          cursor: scoring ? "wait" : "pointer", opacity: scoring ? 0.6 : 1,
          marginBottom: 20
        }}
      >
        {scoring ? "Scoring..." : "Preview Scores"}
      </button>

      {error && (
        <div style={{
          padding: "10px 14px", borderRadius: 10,
          background: error.startsWith("✅") ? `${GREEN}10` : `${RED}10`,
          border: `1px solid ${error.startsWith("✅") ? `${GREEN}30` : `${RED}30`}`,
          marginBottom: 16
        }}>
          <p style={{ fontFamily: FB, fontSize: 12, color: error.startsWith("✅") ? GREEN : RED, margin: 0, wordBreak: "break-all" }}>{error}</p>
        </div>
      )}

      {/* PREVIEW */}
      {preview && (
        <div>
          {/* Individual scores table */}
          <p style={{
            fontFamily: FD, fontWeight: 800, fontSize: 14, color: DARK,
            textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 10px"
          }}>
            Individual Scores Preview
          </p>

          <div style={{ overflowX: "auto", marginBottom: 24 }}>
            <table style={{
              borderCollapse: "collapse", fontFamily: FB, fontSize: 10,
              whiteSpace: "nowrap", width: "100%"
            }}>
              <thead>
                <tr style={{ background: `${DARK}08` }}>
                  <th style={thStyle}>Player</th>
                  <th style={thStyle}>Total</th>
                  {preview.pickedDrivers.map(d => (
                    <th key={d} style={{ ...thStyle, maxWidth: 50 }}>{lastName(d)}</th>
                  ))}
                  <th style={thStyle}>Order</th>
                  <th style={thStyle}>Best Finish</th>
                  <th style={thStyle}>Pit Guess</th>
                  <th style={thStyle}>Needle</th>
                  <th style={thStyle}>Top 10</th>
                </tr>
              </thead>
              <tbody>
                {preview.playerScores.map((s, i) => (
                  <tr key={s.playerId} style={{
                    background: s.noPick ? `${RED}06` : i % 2 === 0 ? "#fff" : `${DARK}03`,
                    borderBottom: `1px solid ${BORDER}30`
                  }}>
                    <td style={{ ...tdStyle, fontWeight: 600, minWidth: 90 }}>
                      {shortName(s.playerName)}
                      {s.noPick && <span style={{ color: RED, fontSize: 9 }}> (no pick)</span>}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 800, color: BLUEDARK, fontFamily: FD }}>
                      {s.totalPts}
                    </td>
                    {preview.pickedDrivers.map(d => {
                      const pts = s.driverPts[d];
                      return (
                        <td key={d} style={{
                          ...tdStyle,
                          color: pts === undefined ? BORDER : pts < 0 ? RED : pts > 0 ? ORANGE : TEXT2,
                          fontWeight: pts !== undefined ? 700 : 400,
                          fontFamily: FD
                        }}>
                          {pts !== undefined ? (pts > 0 ? `+${pts}` : pts) : "·"}
                        </td>
                      );
                    })}
                    <td style={{ ...tdStyle, color: s.orderBonus > 0 ? ORANGE : TEXT2, fontFamily: FD, fontWeight: 700 }}>
                      {s.orderBonus > 0 ? "✓ +6" : "✗"}
                    </td>
                    <td style={{ ...tdStyle, fontFamily: FD, fontWeight: 700 }}>
                      {s.noPick ? "·" : (
                        <span>
                          <span style={{ color: TEXT2 }}>Guess {s.bestFinishGuess || "?"}</span>
                          <span style={{ color: TEXT2 }}> / Actual P{s.bestActualPos || "?"}</span>
                          {" "}
                          <span style={{ color: s.bestFinishBonus > 0 ? ORANGE : RED, fontWeight: 800 }}>{s.bestFinishBonus > 0 ? "✓ +3" : "✗"}</span>
                        </span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, fontFamily: FD, fontWeight: 700, color: TEXT2 }}>
                      {s.pitGuess != null ? `${Number(s.pitGuess).toFixed(1)}s` : "·"}
                    </td>
                    <td style={{ ...tdStyle, color: s.pitIndividualPts > 0 ? ORANGE : TEXT2, fontFamily: FD, fontWeight: 700 }}>
                      {s.pitIndividualPts > 0 ? `+${s.pitIndividualPts}` : "0"}
                    </td>
                    <td style={{ ...tdStyle, color: s.weeklyBonusPts > 0 ? GREEN : TEXT2, fontFamily: FD, fontWeight: 700 }}>
                      {s.weeklyBonusPts > 0 ? `+${s.weeklyBonusPts}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Team scores table */}
          <p style={{
            fontFamily: FD, fontWeight: 800, fontSize: 14, color: DARK,
            textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 10px"
          }}>
            Team Matchup Scores
          </p>

          <div style={{ overflowX: "auto", marginBottom: 24 }}>
            <table style={{
              borderCollapse: "collapse", fontFamily: FB, fontSize: 10,
              whiteSpace: "nowrap", width: "100%"
            }}>
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
                {preview.teamScores.flatMap((ts, i) => {
                  const homeHigher = ts.homeP1Score >= ts.homeP2Score;
                  const awayHigher = ts.awayP1Score >= ts.awayP2Score;
                  return [
                    <tr key={`home-${i}`} style={{
                      background: ts.homeWon ? `${GREEN}08` : `${RED}06`,
                      borderBottom: `1px solid ${BORDER}20`
                    }}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>
                        {ts.homeTeam}
                        <span style={{ fontSize: 8, color: TEXT2, marginLeft: 4 }}>OVER</span>
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
                        {ts.boxBoxLine}
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
                      background: ts.awayWon ? `${GREEN}08` : `${RED}06`,
                      borderBottom: `1px solid ${BORDER}`
                    }}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>
                        {ts.awayTeam}
                        <span style={{ fontSize: 8, color: TEXT2, marginLeft: 4 }}>UNDER</span>
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

          {/* Save button */}
          <button
            onClick={saveScores}
            disabled={saving || saved}
            style={{
              width: "100%", padding: "14px", borderRadius: 12,
              background: saved ? GREEN : ORANGE, border: "none", color: "#fff",
              fontFamily: FD, fontWeight: 800, fontSize: 14,
              textTransform: "uppercase", letterSpacing: "0.06em",
              cursor: saving || saved ? "default" : "pointer",
              opacity: saving ? 0.6 : 1
            }}
          >
            {saved ? "✓ Saved!" : saving ? "Saving..." : isAlreadyScored ? "⚠️ Overwrite & Save Scores" : "Save Scores"}
          </button>
        </div>
      )}
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
  letterSpacing: "0.06em", borderBottom: `1px solid #d8d2c4`
};

const tdStyle = {
  padding: "5px 8px", fontSize: 10
};
