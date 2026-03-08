import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const DARK = "#1e1e2a";
const BLUE = "#6cb8e0";
const BLUEDARK = "#2a6fa8";
const RED = "#e04a4a";
const TEXT = "#1e1e2a";
const TEXT2 = "#6b6b80";
const BORDER = "#d8d2c4";
const GOLD = "#c9a820";
const SILVER = "#a0a0a0";
const FD = "'Geologica', sans-serif";
const FB = "'DM Sans', sans-serif";

function TeamLogo({ name, size, division, logoUrl }) {
  var s = size || 22;
  var hash = 0;
  for (var i = 0; i < (name || "").length; i++) hash = (name || "").charCodeAt(i) + ((hash << 5) - hash);
  var hue = Math.abs(hash) % 360;
  var bg = "hsl(" + hue + ", 45%, 55%)";
  var initials = (name || "?").split(" ").map(function(w) { return w[0]; }).join("").slice(0, 2).toUpperCase();
  var outlineColor = division === "championship" ? GOLD : SILVER;
  if (logoUrl) return (
    <img src={logoUrl} alt={name} style={{ width: s, height: s, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1.5px solid " + outlineColor, boxSizing: "border-box" }} />
  );
  return (
    <div style={{ width: s, height: s, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: FD, fontWeight: 900, fontSize: s * 0.36, color: "#fff", border: "1.5px solid " + outlineColor, boxSizing: "border-box" }}>{initials}</div>
  );
}

export default function Recap() {
  var [recaps, setRecaps] = useState([]);
  var [races, setRaces] = useState([]);
  var [teams, setTeams] = useState([]);
  var [loading, setLoading] = useState(true);
  var [activeRound, setActiveRound] = useState(null);
  var [err, setErr] = useState(null);

  useEffect(function() {
    async function load() {
      try {
        var r1 = await supabase.from("recaps").select("*").order("round", { ascending: false });
        var r2 = await supabase.from("races").select("id, race_name, round, race_date").order("round");
        var r3 = await supabase.from("teams").select("id, name, division, logo_url");
        if (r1.error) { setErr("Recaps table: " + r1.error.message); setLoading(false); return; }
        setRecaps(r1.data || []);
        setRaces(r2.data || []);
        setTeams(r3.data || []);
        if (r1.data && r1.data.length > 0) setActiveRound(r1.data[0].round);
      } catch (e) {
        setErr(e.message);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center" }}>
        <p style={{ fontFamily: FB, fontSize: 14, color: TEXT2 }}>Loading recaps...</p>
      </div>
    );
  }

  if (err) {
    return (
      <div style={{ padding: "20px 20px 100px" }}>
        <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 22, color: DARK, textTransform: "uppercase", margin: "0 0 8px" }}>Race Recaps</p>
        <div style={{ padding: "16px", background: RED + "10", border: "1px solid " + RED + "30", borderRadius: 12 }}>
          <p style={{ fontFamily: FB, fontSize: 13, color: RED, margin: 0 }}>{err}</p>
        </div>
      </div>
    );
  }

  var roundsWithRecaps = {};
  recaps.forEach(function(r) { roundsWithRecaps[r.round] = true; });

  var activeRecap = null;
  for (var i = 0; i < recaps.length; i++) { if (recaps[i].round === activeRound) { activeRecap = recaps[i]; break; } }

  var activeRace = null;
  for (var j = 0; j < races.length; j++) { if (races[j].round === activeRound) { activeRace = races[j]; break; } }

  var matchupRecaps = activeRecap && activeRecap.matchup_recaps ? activeRecap.matchup_recaps : [];

  var getTeam = function(name) {
    for (var k = 0; k < teams.length; k++) { if (teams[k].name === name) return teams[k]; }
    return null;
  };

  if (recaps.length === 0) {
    return (
      <div style={{ padding: "20px 20px 100px" }}>
        <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 22, color: DARK, textTransform: "uppercase", letterSpacing: "0.03em", margin: "0 0 4px" }}>Race Recaps</p>
        <p style={{ fontFamily: FB, fontSize: 13, color: TEXT2, marginBottom: 20 }}>AI-powered race day recaps</p>
        <div style={{ padding: "40px 20px", textAlign: "center", background: "#fff", borderRadius: 14, border: "1px solid " + BORDER }}>
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

      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none", marginBottom: 20 }}>
        {races.map(function(r) {
          var hasRecap = roundsWithRecaps[r.round];
          return (
            <button key={r.round} onClick={function() { if (hasRecap) setActiveRound(r.round); }} style={{
              flexShrink: 0, width: 36, height: 36, borderRadius: "50%",
              border: "1px solid " + (activeRound === r.round ? DARK : hasRecap ? BORDER : BORDER + "50"),
              background: activeRound === r.round ? DARK : "transparent",
              color: activeRound === r.round ? "#fff" : hasRecap ? TEXT2 : BORDER,
              fontFamily: FD, fontWeight: 700, fontSize: 13,
              cursor: hasRecap ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              opacity: hasRecap ? 1 : 0.3, position: "relative",
            }}>
              {r.round}
              {hasRecap && activeRound !== r.round ? (
                <span style={{ position: "absolute", bottom: 2, width: 4, height: 4, borderRadius: "50%", background: BLUEDARK }} />
              ) : null}
            </button>
          );
        })}
      </div>

      {activeRace ? (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontFamily: FB, fontSize: 11, color: BLUE, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 2px" }}>Round {activeRound}</p>
          <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 20, color: DARK, textTransform: "uppercase", margin: "0 0 4px" }}>{activeRace.race_name}</p>
          {activeRace.race_date ? (
            <p style={{ fontFamily: FB, fontSize: 12, color: TEXT2, margin: 0 }}>
              {new Date(activeRace.race_date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          ) : null}
        </div>
      ) : null}

      {activeRecap ? (
        <div style={{ marginBottom: 28 }}>
          <div style={{
            background: "#fff", borderRadius: 14, border: "1px solid " + BORDER,
            padding: "20px 18px", marginBottom: 24
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 18 }}>📝</span>
              <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 14, color: DARK, textTransform: "uppercase", letterSpacing: "0.04em", margin: 0 }}>League Recap</p>
            </div>
            {activeRecap.league_recap.split("\n\n").map(function(para, idx) {
              return (
                <p key={idx} style={{
                  fontFamily: FB, fontSize: 14, color: TEXT, lineHeight: 1.7,
                  margin: idx === 0 ? 0 : "12px 0 0"
                }}>{para}</p>
              );
            })}
          </div>

          {matchupRecaps.length > 0 ? (
            <div>
              <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 12, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 12px" }}>Matchup Recaps</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {matchupRecaps.map(function(mr, idx) {
                  var ht = getTeam(mr.homeTeam);
                  var at = getTeam(mr.awayTeam);
                  return (
                    <div key={idx} style={{
                      background: "#fff", borderRadius: 12, border: "1px solid " + BORDER,
                      padding: "14px 16px"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        {ht ? <TeamLogo name={ht.name} size={24} division={ht.division} logoUrl={ht.logo_url} /> : null}
                        <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 12, color: TEXT }}>
                          {mr.homeTeam}
                        </span>
                        <span style={{ fontFamily: FB, fontSize: 10, color: TEXT2 }}>vs</span>
                        {at ? <TeamLogo name={at.name} size={24} division={at.division} logoUrl={at.logo_url} /> : null}
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
          ) : null}

          {activeRecap.generated_at ? (
            <p style={{ fontFamily: FB, fontSize: 10, color: TEXT2, textAlign: "center", marginTop: 20 }}>
              Generated {new Date(activeRecap.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
