import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const DARK = "#1e1e2a", BLUE = "#6cb8e0", BLUEDARK = "#2a6fa8",
  GREEN = "#22cc66", RED = "#e04a4a", ORANGE = "#e08a2e",
  TEXT = "#1e1e2a", TEXT2 = "#6b6b80", BORDER = "#d8d2c4",
  GOLD = "#c9a820";
const FD = "'Geologica', sans-serif";
const FB = "'DM Sans', sans-serif";

const SPRINT_ROUNDS = [2, 4, 5, 9, 12, 16];
const SATURDAY_ROUNDS = [15, 20];

// Race start times in UTC (from official FIA announcements)
// Local times → UTC: Australia 3pm AEDT (UTC+11)=04:00, China 3pm CST (UTC+8)=07:00,
// Japan 2pm JST (UTC+9)=05:00, Bahrain 6pm AST (UTC+3)=15:00, Saudi 8pm AST (UTC+3)=17:00,
// Miami 4pm EDT (UTC-4)=20:00, Canada 4pm EDT (UTC-4)=20:00, Monaco 3pm CEST (UTC+2)=13:00,
// Barcelona 3pm CEST=13:00, Austria 3pm CEST=13:00, Britain 3pm BST (UTC+1)=14:00,
// Belgium 3pm CEST=13:00, Hungary 3pm CEST=13:00, Netherlands 3pm CEST=13:00,
// Italy 3pm CEST=13:00, Spain/Madrid 3pm CEST=13:00, Azerbaijan 3pm AZT (UTC+4)=11:00,
// Singapore 8pm SGT (UTC+8)=12:00, USA/Austin 3pm CDT (UTC-5)=20:00,
// Mexico 2pm CDT (UTC-5)=19:00, Brazil 2pm BRT (UTC-3)=17:00,
// Las Vegas 8pm PST (UTC-8)=04:00(+1day), Qatar 7pm AST (UTC+3)=16:00,
// Abu Dhabi 5pm GST (UTC+4)=13:00
const RACE_UTC = {
  1:  "2026-03-08T04:00:00Z",
  2:  "2026-03-15T07:00:00Z",
  3:  "2026-03-29T05:00:00Z",
  4:  "2026-05-03T20:00:00Z",
  5:  "2026-05-24T20:00:00Z",
  6:  "2026-06-07T13:00:00Z",
  7:  "2026-06-14T13:00:00Z",
  8:  "2026-06-28T13:00:00Z",
  9:  "2026-07-05T14:00:00Z",
  10: "2026-07-19T13:00:00Z",
  11: "2026-07-26T13:00:00Z",
  12: "2026-08-23T13:00:00Z",
  13: "2026-09-06T13:00:00Z",
  14: "2026-09-13T13:00:00Z",
  15: "2026-09-26T11:00:00Z",  // Saturday
  16: "2026-10-11T12:00:00Z",
  17: "2026-10-25T20:00:00Z",
  18: "2026-11-01T19:00:00Z",
  19: "2026-11-08T17:00:00Z",
  20: "2026-11-22T04:00:00Z",  // Saturday night, technically Sunday UTC
  21: "2026-11-29T16:00:00Z",
  22: "2026-12-06T13:00:00Z"
};

const CIRCUITS = {
  1:  { city: "Melbourne",   country: "\u{1F1E6}\u{1F1FA}", circuit: "Albert Park" },
  2:  { city: "Shanghai",    country: "\u{1F1E8}\u{1F1F3}", circuit: "Shanghai International" },
  3:  { city: "Suzuka",      country: "\u{1F1EF}\u{1F1F5}", circuit: "Suzuka Circuit" },
  4:  { city: "Miami",       country: "\u{1F1FA}\u{1F1F8}", circuit: "Miami International" },
  5:  { city: "Montr\u00e9al",    country: "\u{1F1E8}\u{1F1E6}", circuit: "Circuit Gilles Villeneuve" },
  6:  { city: "Monaco",      country: "\u{1F1F2}\u{1F1E8}", circuit: "Circuit de Monaco" },
  7:  { city: "Barcelona",   country: "\u{1F1EA}\u{1F1F8}", circuit: "Circuit de Barcelona-Catalunya" },
  8:  { city: "Spielberg",   country: "\u{1F1E6}\u{1F1F9}", circuit: "Red Bull Ring" },
  9:  { city: "Silverstone", country: "\u{1F1EC}\u{1F1E7}", circuit: "Silverstone Circuit" },
  10: { city: "Spa",         country: "\u{1F1E7}\u{1F1EA}", circuit: "Spa-Francorchamps" },
  11: { city: "Budapest",    country: "\u{1F1ED}\u{1F1FA}", circuit: "Hungaroring" },
  12: { city: "Zandvoort",   country: "\u{1F1F3}\u{1F1F1}", circuit: "Circuit Zandvoort" },
  13: { city: "Monza",       country: "\u{1F1EE}\u{1F1F9}", circuit: "Autodromo di Monza" },
  14: { city: "Madrid",      country: "\u{1F1EA}\u{1F1F8}", circuit: "Madrid Street Circuit" },
  15: { city: "Baku",        country: "\u{1F1E6}\u{1F1FF}", circuit: "Baku City Circuit" },
  16: { city: "Singapore",   country: "\u{1F1F8}\u{1F1EC}", circuit: "Marina Bay" },
  17: { city: "Austin",      country: "\u{1F1FA}\u{1F1F8}", circuit: "COTA" },
  18: { city: "Mexico City", country: "\u{1F1F2}\u{1F1FD}", circuit: "Aut\u00f3dromo Hermanos Rodr\u00edguez" },
  19: { city: "S\u00e3o Paulo",   country: "\u{1F1E7}\u{1F1F7}", circuit: "Interlagos" },
  20: { city: "Las Vegas",   country: "\u{1F1FA}\u{1F1F8}", circuit: "Las Vegas Strip" },
  21: { city: "Lusail",      country: "\u{1F1F6}\u{1F1E6}", circuit: "Lusail International" },
  22: { city: "Abu Dhabi",   country: "\u{1F1E6}\u{1F1EA}", circuit: "Yas Marina" }
};

export default function F1Calendar() {
  const [races, setRaces] = useState([]);
  const [scoredRaces, setScoredRaces] = useState(new Set());
  const [winners, setWinners] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: racesData }, { data: scoresData }, { data: playersData }] = await Promise.all([
        supabase.from("races").select("*").eq("season", 2026).order("round"),
        supabase.from("scores").select("*"),
        supabase.from("players").select("id, name")
      ]);

      const playerMap = {};
      (playersData || []).forEach(p => { playerMap[p.id] = p.name; });

      // Find scored race IDs
      const scored = new Set();
      // Find winner per race (highest individual total)
      const raceScores = {};
      (scoresData || []).forEach(s => {
        scored.add(s.race_id);
        const total = (s.top_pick_pts || 0) + (s.midfield_pts || 0) + (s.order_bonus || 0) + (s.best_finish_bonus || 0) + (s.pit_individual_pts || 0) + (s.weekly_bonus_pts || 0);
        if (!raceScores[s.race_id] || total > raceScores[s.race_id].total) {
          raceScores[s.race_id] = { total, playerId: s.player_id };
        }
      });

      const winnerMap = {};
      Object.entries(raceScores).forEach(([raceId, { playerId, total }]) => {
        winnerMap[raceId] = { name: playerMap[playerId] || "?", total };
      });

      setRaces(racesData || []);
      setScoredRaces(scored);
      setWinners(winnerMap);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div style={{ padding: "60px 20px", textAlign: "center" }}><p style={{ fontFamily: FB, fontSize: 14, color: TEXT2 }}>Loading calendar…</p></div>;

  const today = new Date();
  const pastCount = races.filter(rx => new Date(rx.race_date + "T00:00:00") < today).length;

  return (
    <div style={{ padding: "20px 20px 100px" }}>
      <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 22, color: DARK, textTransform: "uppercase", letterSpacing: "0.03em", margin: "0 0 4px" }}>F1 Calendar</p>
      <p style={{ fontFamily: FB, fontSize: 13, color: TEXT2, marginBottom: 20 }}>2026 Season — 22 Grands Prix</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {races.map(r => {
          const info = CIRCUITS[r.round] || {};
          const raceDate = new Date(r.race_date + "T00:00:00");
          const isPast = raceDate < today;
          const isScored = scoredRaces.has(r.id);
          const isSprint = SPRINT_ROUNDS.includes(r.round);
          const isSaturday = SATURDAY_ROUNDS.includes(r.round);
          const isNext = !isPast && pastCount + 1 === r.round;
          const winner = winners[r.id];
          const showBreak = r.round === 12;

          // Local time from UTC
          const utcStr = RACE_UTC[r.round];
          const raceStartUTC = utcStr ? new Date(utcStr) : null;
          const localTimeStr = raceStartUTC
            ? raceStartUTC.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
            : null;
          // Just the time part
          const localTime = raceStartUTC
            ? raceStartUTC.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
            : null;
          // Day of week short
          const localDay = raceStartUTC
            ? raceStartUTC.toLocaleDateString(undefined, { weekday: "short" })
            : null;

          return (
            <div key={r.round}>
              {showBreak && (
                <div style={{ padding: "12px 0", textAlign: "center" }}>
                  <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 10, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.1em", background: `${BORDER}40`, padding: "4px 12px", borderRadius: 100 }}>
                    ☀️ Summer Break
                  </span>
                </div>
              )}
              <div style={{
                padding: "10px 14px", borderRadius: 12,
                background: isNext ? `${BLUE}08` : "#fff",
                border: `1px solid ${isNext ? BLUE : isScored ? `${GREEN}30` : BORDER}`,
                opacity: isPast && !isScored ? 0.5 : 1
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {/* Round */}
                  <div style={{ minWidth: 28, textAlign: "center" }}>
                    <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 16, color: isNext ? BLUEDARK : TEXT2 }}>{r.round}</span>
                  </div>

                  {/* Flag + info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 16 }}>{info.country || "🏁"}</span>
                      <p style={{ fontFamily: FD, fontWeight: 700, fontSize: 13, color: TEXT, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.race_name}
                      </p>
                    </div>
                    <p style={{ fontFamily: FB, fontSize: 10, color: TEXT2, margin: "1px 0 0" }}>
                      {info.circuit || ""}
                    </p>
                  </div>

                  {/* Date + time + badges */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
                    <span style={{ fontFamily: FB, fontSize: 10, color: TEXT2 }}>
                      {raceDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    {localTime && (
                      <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 11, color: isNext ? BLUEDARK : TEXT }}>
                        {localDay} {localTime}
                      </span>
                    )}
                    <div style={{ display: "flex", gap: 3 }}>
                      {isSprint && <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 8, color: ORANGE, background: `${ORANGE}12`, padding: "1px 5px", borderRadius: 4, textTransform: "uppercase" }}>Sprint</span>}
                      {isSaturday && <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 8, color: "#7c5cbf", background: "#7c5cbf12", padding: "1px 5px", borderRadius: 4, textTransform: "uppercase" }}>Sat Race</span>}
                      {isScored && <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 8, color: GREEN, background: `${GREEN}12`, padding: "1px 5px", borderRadius: 4 }}>✓</span>}
                      {isNext && <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 8, color: BLUEDARK, background: `${BLUE}15`, padding: "1px 5px", borderRadius: 4, textTransform: "uppercase" }}>Next</span>}
                    </div>
                  </div>
                </div>

                {/* Game winner row */}
                {winner && (
                  <div style={{ marginTop: 6, marginLeft: 38, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12 }}>🏆</span>
                    <span style={{ fontFamily: FB, fontSize: 11, fontWeight: 600, color: GOLD }}>{winner.name}</span>
                    <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 11, color: TEXT2 }}>{winner.total} pts</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
