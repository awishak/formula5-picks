import { useState, useEffect } from "react";
import { V, FM, FD, FB, label, body, card, textGlow, edgeGlow, titleFit, titleBox } from "./theme.vegas";
import { supabase } from "./supabaseClient";
import FlagPicker, { FlagRow } from "./FlagPicker.jsx";

// The fifth tab. Everything that does not have a page of its own yet ends up
// here, so for now it is your flag and the one link that has to work.
//
// The old home page is still in App.jsx, unrouted, at ?page=home-v1. It carried
// the next race, a season summary, a week by week and the league news; the news
// itself lives on in src/news.js and none of it is lost.

const WRAP = { maxWidth: 480, margin: "0 auto", padding: "0 16px 96px" };
const TITLE_SIZE = titleFit("MORE", { fill: 0.42 });

export default function MorePage({ onNavigate, currentUser }) {
  const [me, setMe] = useState(null);
  const [team, setTeam] = useState(null);
  const [picking, setPicking] = useState(null);   // "me" | "team" | null
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    if (!currentUser) return;
    (async () => {
      try {
        const { data: p, error } = await supabase.from("players")
          .select("id,name,nation").eq("name", currentUser).maybeSingle();
        if (error) throw error;
        if (!alive) return;
        setMe(p || null);
        if (!p) return;
        const { data: t } = await supabase.from("teams")
          .select("id,name,nation,player1_id,player2_id")
          .or(`player1_id.eq.${p.id},player2_id.eq.${p.id}`).maybeSingle();
        if (alive) setTeam(t || null);
      } catch (e) {
        // The columns land with scripts/nations.sql. Until they do, the page
        // says so rather than looking broken.
        if (alive) setErr(String(e.message || e));
      }
    })();
    return () => { alive = false; };
  }, [currentUser]);

  // Always .select() on a write: an RLS mismatch swallows the update with no
  // error otherwise, which is a known way to lose a change in this project.
  const save = async (what, code) => {
    setSaving(true);
    try {
      if (what === "me") {
        const { data, error } = await supabase.from("players")
          .update({ nation: code }).eq("id", me.id).select();
        if (error) throw error;
        if (!data || !data.length) throw new Error("nothing was written");
        setMe({ ...me, nation: code });
      } else {
        const { data, error } = await supabase.from("teams")
          .update({ nation: code }).eq("id", team.id).select();
        if (error) throw error;
        if (!data || !data.length) throw new Error("nothing was written");
        setTeam({ ...team, nation: code });
      }
      setErr(null);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ background: V.bg, minHeight: "100vh" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Monoton&family=Encode+Sans+Semi+Condensed:wght@400;600;700&family=Chakra+Petch:wght@600;700&family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>
      <div style={WRAP}>
        <div style={titleBox({ padding: "14px 0 18px" })}>
          <div style={{
            fontFamily: FM, fontWeight: 400, fontSize: TITLE_SIZE,
            lineHeight: 1.15, letterSpacing: "0.02em", whiteSpace: "nowrap",
            ...textGlow(V.pink),
          }}>MORE</div>
        </div>

        <div style={{ ...card({ padding: 16, marginBottom: 14 }) }}>
          <div style={{ ...label({ color: V.text3, fontSize: 11, marginBottom: 10 }) }}>
            YOUR FLAG
          </div>
          <div style={{ display: "grid", gap: 9 }}>
            <FlagRow cap="YOU" who={currentUser || "Nobody signed in"}
              nation={me ? me.nation : null}
              disabled={!me || saving}
              onOpen={() => setPicking("me")} />
            {team && (
              <FlagRow cap="YOUR TEAM" who={team.name} nation={team.nation}
                disabled={saving} onOpen={() => setPicking("team")}
                note="Either of you can set it" />
            )}
          </div>
          <p style={{ ...body("bodySm", { fontSize: 12, color: V.text3, marginTop: 10 }) }}>
            Your flag flies over the podium and next to your name in the week in review.
          </p>
          {err && (
            <p style={{ ...body("bodySm", { fontSize: 12, color: V.pink, marginTop: 8 }) }}>
              {/^column .* does not exist/.test(err)
                ? "Flags are not switched on yet. Run scripts/nations.sql."
                : err}
            </p>
          )}
        </div>

        <div style={{ ...card({ padding: 18, marginBottom: 14 }), ...edgeGlow(V.blue, 0.6) }}>
          <div style={label({ color: V.blue, fontSize: 15 })}>Coming soon</div>
        </div>

        <button onClick={() => onNavigate("admin")} style={{
          ...card({ padding: "16px 18px" }),
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          cursor: "pointer", border: `1px solid ${V.border2}`,
        }}>
          <span style={{
            fontFamily: FD, fontWeight: 700, fontSize: 18, letterSpacing: "0.04em",
            textTransform: "uppercase", color: V.text,
          }}>Admin</span>
          <span style={{ fontFamily: FB, fontSize: 18, color: V.text2 }}>&rsaquo;</span>
        </button>
      </div>

      {picking && (
        <FlagPicker
          title={picking === "me" ? `${currentUser}'s flag` : `${team.name}'s flag`}
          value={picking === "me" ? (me && me.nation) : (team && team.nation)}
          onPick={code => save(picking, code)}
          onClose={() => setPicking(null)} />
      )}
    </div>
  );
}
