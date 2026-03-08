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

function TeamLogo({ name, size = 22, division, logoUrl }) {
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) hash = (name || "").charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  const bg = `hsl(${hue}, 45%, 55%)`;
  const initials = (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const outlineColor = division === "championship" ? GOLD : SILVER;
  if (logoUrl) return (
    <img src={logoUrl} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `1.5px solid ${outlineColor}`, boxSizing: "border-box" }} />
  );
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: FD, fontWeight: 900, fontSize: size * 0.36, color: "#fff", border: `1.5px solid ${outlineColor}`, boxSizing: "border-box" }}>{initials}</div>
  );
}

export default function Recap() {
  const [recaps, setRecaps] = useState([]);
  const [races, setRaces] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeRound, setActiveRound] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [{ data: recapsData, error: e1 }, { data: racesData, error: e2 }, { data: teamsData, error: e3 }] = await Promise.all([
          supabase.from("recaps").select("*").order("round", { ascending: false }),
          supabase.from("races").select("id, race_name, round, race_date").order("round"),
          supabase.from("teams").select("id, name, division, logo_url"),
        ]);
        if (e1) setLoadError("Recaps table error: " + e1.message);
        setRecaps(recapsData || []);
        setRaces(racesData || []);
        setTeams(teamsData || []);
        if ((recapsData || []).length > 0) setActiveRound(recapsData[0].round);
      } catch (e) {
        console.error("Recap load error:", e);
        setLoadError(e.message);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div style={{ padding: "60px 20px", textAlign: "center" }}><p style={{ fontFamily: FB, fontSize: 14, color: TEXT2 }}>Loading recaps…</p></div>;

  if (loadError) return (
    <div style={{ padding: "20px 20px 100px" }}>
      <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 22, color: DARK, textTransform: "uppercase", letterSpacing: "0.03em", margin: "0 0 4px" }}>Race Recaps</p>
      <div style={{ padding: "20px", background: "#fff", borderRadius: 14, border: `1px solid ${RED}30` }}>
        <p style={{ fontFamily: FB, fontSize: 13, color: RED, margin: 0 }}>{loadError}</p>
        <p style={{ fontFamily: FB, fontSize: 12, color: TEXT2, margin: "8px 0 0" }}>Make sure the recaps table has been created in Supabase.</p>
      </div>
    </div>
  );

  const roundsWithRecaps = new Set(recaps.map(r => r.round));
  const activeRecap = recaps.find(r => r.round === activeRound);
  const activeRace = races.find(r => r.round === activeRound);
  const matchupRecaps = activeRecap?.matchup_recaps || [];
  const getTeam = (name) => teams.find(t => t.name === name);

  if (recaps.length === 0) {
    return (
      <div style={{ padding: "20px 20px 100px" }}>
        <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 22, color: DARK, textTransform: "uppercase", letterSpacing: "0.03em", margin: "0 0 4px" }}>Race Recaps</p>
        <p style={{ fontFamily: FB, fontSize: 13, color: TEXT2, marginBottom: 20 }}>AI-powered race day recaps</p>
        <div style={{ padding: "40px 20px", textAlign: "center", background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}` }}>
          <p style={{ fontFamily: FD, fontWeight: 700, fontSize: 16, color: DARK, margin: "0 0 6px" }}>No Recaps Yet</p>
          <p style={{ fontFamily: FB, fontSize: 13, color: TEXT2, margin: 0 }}>Recaps will appear here after each scored race.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 20px 100px" }}>
      <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 22, color: DARK, textTransform: "uppercase", letterSpacing: "0.03em", margin: "0 0 4px" }}>Race Recaps</p>
      <p style={{ fontFamily: FB, fontSize: 13, color: TEXT2, marginBottom: 16 }}>AI-powered race day recaps</p>

      {/* Round pills */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none", marginBottom: 20 }}>
        {races.map(r => {
          const hasRecap = roundsWithRecaps.has(r.round);
          return (
            <button key={r.round} onClick={() => { if (hasRecap) setActiveRound(r.round); }} style={{
              flexShrink: 0, width: 36, height: 36, borderRadius: "50%",
              border: `1px solid ${activeRound === r.round ? DARK : hasRecap ? BORDER : BORDER + "50"}`,
              background: activeRound === r.round ? DARK : "transparent",
              color: activeRound === r.round ? "#fff" : hasRecap ? TEXT2 : BORDER,
              fontFamily: FD, fontWeight: 700, fontSize: 13,
              cursor: hasRecap ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              opacity: hasRecap ? 1 : 0.3, position: "relative",
            }}>
              {r.round}
              {hasRecap && activeRound !== r.round && (
                <span style={{ position: "absolute", bottom: 2, width: 4, height: 4, borderRadius: "50%", background: BLUEDARK }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Race header */}
      {activeRace && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontFamily: FB, fontSize: 11, color: BLUE, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 2px" }}>Round {activeRound}</p>
          <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 20, color: DARK, textTransform: "uppercase", margin: "0 0 4px" }}>{activeRace.race_name}</p>
          {activeRace.race_date && (
            <p style={{ fontFamily: FB, fontSize: 12, color: TEXT2, margin: 0 }}>
              {new Date(activeRace.race_date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          )}
        </div>
      )}

      {/* League recap */}
      {activeRecap && (
        <div style={{ marginBottom: 28 }}>
          <div style={{
            background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`,
            padding: "20px 18px", marginBottom: 24
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 18 }}>📝</span>
              <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 14, color: DARK, textTransform: "uppercase", letterSpacing: "0.04em", margin: 0 }}>League Recap</p>
            </div>
            {activeRecap.league_recap.split("\n\n").map((para, i) => (
              <p key={i} style={{
                fontFamily: FB, fontSize: 14, color: TEXT, lineHeight: 1.7,
                margin: i === 0 ? 0 : "12px 0 0"
              }}>{para}</p>
            ))}
          </div>

          {/* Matchup recaps */}
          {matchupRecaps.length > 0 && (
            <div>
              <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 12, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 12px" }}>Matchup Recaps</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {matchupRecaps.map((mr, i) => {
                  const ht = getTeam(mr.homeTeam);
                  const at = getTeam(mr.awayTeam);
                  return (
                    <div key={i} style={{
                      background: "#fff", borderRadius: 12, border: `1px solid ${BORDER}`,
                      padding: "14px 16px"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        {ht && <TeamLogo name={ht.name} size={24} division={ht.division} logoUrl={ht.logo_url} />}
                        <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 12, color: TEXT }}>
                          {mr.homeTeam}
                        </span>
                        <span style={{ fontFamily: FB, fontSize: 10, color: TEXT2 }}>vs</span>
                        {at && <TeamLogo name={at.name} size={24} division={at.division} logoUrl={at.logo_url} />}
                        <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 12, color: TEXT }}>
                          {mr.awayTeam}
                        </span>
                      </div>
                      <p style={{ fontFamily: FB, fontSize: 13, color: TEXT, lineHeight: 1.65, margin: 0 }}>{mr.recap}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Generated timestamp */}
          {activeRecap.generated_at && (
            <p style={{ fontFamily: FB, fontSize: 10, color: TEXT2, textAlign: "center", marginTop: 20 }}>
              Generated {new Date(activeRecap.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
