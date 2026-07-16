import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";


import { DARK, BLUE, BLUEDARK, TEXT, TEXT2, BORDER, FD, FB } from "./theme";

export default function Recaps() {
  const [recaps, setRecaps] = useState([]); // [{ round, name }] latest first
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [{ data: races }, { data: scores }] = await Promise.all([
          supabase.from("races").select("id, round, race_name").eq("season", 2026).order("round", { ascending: true }),
          supabase.from("scores").select("race_id").limit(2000),
        ]);
        const scoredIds = new Set((scores || []).map(s => s.race_id));
        const avail = (races || [])
          .filter(r => scoredIds.has(r.id))
          .map(r => ({ round: r.round, name: r.race_name }))
          .sort((a, b) => b.round - a.round);
        setRecaps(avail);
        if (avail.length) setSelected(avail[0].round);
      } catch (e) { /* silent */ } finally { setLoading(false); }
    }
    load();
  }, []);

  const fileFor = (round) => `/recaps/round${round}.html`;

  if (loading) {
    return <div style={{ padding: "60px 20px", textAlign: "center" }}><p style={{ fontFamily: FB, fontSize: 14, color: TEXT2 }}>Loading recaps…</p></div>;
  }

  if (!recaps.length) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center" }}>
        <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 20, color: DARK, textTransform: "uppercase", marginBottom: 8 }}>Commissioner's Reports</p>
        <p style={{ fontFamily: FB, fontSize: 13, color: TEXT2 }}>No recaps yet. Check back after the next race.</p>
      </div>
    );
  }

  const current = recaps.find(r => r.round === selected) || recaps[0];

  return (
    <div style={{ padding: "8px 16px 24px" }}>
      <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 20, color: DARK, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 4 }}>Commissioner's Reports</p>
      <p style={{ fontFamily: FB, fontSize: 13, color: TEXT2, marginBottom: 14 }}>The weekly recap, one tap away.</p>

      {/* Round selector */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6, marginBottom: 12, WebkitOverflowScrolling: "touch" }}>
        {recaps.map(r => {
          const active = r.round === selected;
          return (
            <button key={r.round} onClick={() => setSelected(r.round)} style={{
              flex: "0 0 auto", padding: "8px 14px", borderRadius: 10, cursor: "pointer",
              border: active ? `2px solid ${BLUEDARK}` : `1.5px solid ${BORDER}`,
              background: active ? BLUEDARK : "#fff",
              color: active ? "#fff" : TEXT2,
              fontFamily: FD, fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em",
              whiteSpace: "nowrap"
            }}>
              Round {r.round}
            </button>
          );
        })}
      </div>

      {/* Selected race name + open-in-new-tab */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
        <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 14, color: BLUEDARK }}>Round {current.round} -- {current.name}</span>
        <button onClick={() => window.open(fileFor(current.round), "_blank")} style={{
          flex: "0 0 auto", padding: "6px 10px", borderRadius: 8, cursor: "pointer",
          border: `1.5px solid ${BORDER}`, background: "#fff", color: BLUEDARK,
          fontFamily: FD, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em"
        }}>Open in new tab ↗</button>
      </div>

      {/* The recap itself, rendered in-app */}
      <iframe
        key={current.round}
        title={`Round ${current.round} Recap`}
        src={fileFor(current.round)}
        style={{ width: "100%", height: "78vh", border: `1px solid ${BORDER}`, borderRadius: 14, background: "#fff" }}
      />
    </div>
  );
}
