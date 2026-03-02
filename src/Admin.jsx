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
  const [adminTab, setAdminTab] = useState("scoring"); // "scoring" | "logos"
  const [teams, setTeams] = useState([]);
  const [uploading, setUploading] = useState(null);
  const [logoMsg, setLogoMsg] = useState(null);

  useEffect(() => {
    async function load() {
      const { data: racesData } = await supabase
        .from("races")
        .select("id, race_name, round")
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
        const bestFinishBonus = Number(pick.best_finish) === bestActualPos ? 3 : 0;

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
          bestFinishGuess: pick.best_finish
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
        {[{ id: "scoring", label: "Score Race" }, { id: "logos", label: "Team Logos" }].map(tab => (
          <button key={tab.id} onClick={() => setAdminTab(tab.id)} style={{
            flex: 1, padding: "10px 0", border: "none",
            background: adminTab === tab.id ? BLUEDARK : "#fff",
            fontFamily: FD, fontWeight: 700, fontSize: 12, textTransform: "uppercase",
            letterSpacing: "0.06em", color: adminTab === tab.id ? "#fff" : TEXT2,
            cursor: "pointer"
          }}>{tab.label}</button>
        ))}
      </div>

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
                  <th style={thStyle}>Best</th>
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
