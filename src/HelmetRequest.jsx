// Asking for a different helmet.
//
// Two halves. HelmetRequestBox is the offer and the text box: it sits on the
// More page under your flag and on your own player card, and a send writes
// one row to helmet_requests. HelmetInbox is Andrew's side: when he opens the
// app with requests he has not read, they come up on a card, one block a
// request, and GOT IT stamps seen_at so it does not come up again.
//
// The table lands with scripts/helmet_requests.sql. Until it does, the box
// says so on a send rather than looking broken, and the inbox stays quiet.
import { useEffect, useState } from "react";
import { V, FD, FB, display, label, body, card, edgeGlow, VEGAS_CSS } from "./theme.vegas";
import { supabase } from "./supabaseClient";

export const HELMET_OFFER =
  "Hope you like your helmet, but I would love to make you a different one. Tell me your ideas or your inspiration.";

const ADMIN = "Andrew Ishak";

const noTable = e => /helmet_requests/.test(String(e && e.message || e)) || (e && e.code === "PGRST205");

/**
 * The offer and the text box.
 * @param playerId    the player's uuid, when the page has it
 * @param playerName  who is asking; the row carries the name
 * @param tight       true on the player card, where there is less room
 */
export function HelmetRequestBox({ playerId, playerName, tight = false }) {
  const [text, setText] = useState("");
  const [state, setState] = useState("idle");   // idle | sending | sent | error
  const [err, setErr] = useState(null);

  const send = async () => {
    const message = text.trim();
    if (!message || !playerName) return;
    setState("sending");
    try {
      // Always .select() on a write: an RLS mismatch swallows it with no
      // error otherwise, which this project has lost changes to before.
      const { data, error } = await supabase.from("helmet_requests")
        .insert({ player_id: playerId || null, player_name: playerName, message }).select();
      if (error) throw error;
      if (!data || !data.length) throw new Error("nothing was written");
      setState("sent");
      setText("");
    } catch (e) {
      setErr(noTable(e) ? "Requests are not switched on yet. Run scripts/helmet_requests.sql." : String(e.message || e));
      setState("error");
    }
  };

  const pad = tight ? "10px 12px" : "12px 14px";
  return (
    <div style={{ background: V.bg3, border: `1px solid ${V.border2}`, borderRadius: 12, padding: pad }}>
      <div style={{ fontFamily: FB, fontSize: tight ? 14 : 15, lineHeight: 1.45, color: V.text }}>
        {HELMET_OFFER}
      </div>
      {state === "sent" ? (
        <div style={{ ...label({ fontSize: 13, color: V.green }), marginTop: 10 }}>
          SENT. ANDREW WILL SEE IT.
        </div>
      ) : (
        <>
          <textarea value={text} onChange={e => setText(e.target.value)}
            placeholder="A colour, a driver, a team, a film, anything"
            rows={tight ? 2 : 3} disabled={state === "sending"}
            style={{
              display: "block", width: "100%", boxSizing: "border-box", marginTop: 10,
              padding: "10px 12px", borderRadius: 10, resize: "vertical",
              background: V.bg2, border: `1px solid ${V.border2}`, color: V.text,
              fontFamily: FB, fontSize: 15, lineHeight: 1.4, outline: "none",
            }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 8 }}>
            {err
              ? <span style={{ ...body("bodySm", { fontSize: 13, color: V.pink }), minWidth: 0 }}>{err}</span>
              : <span />}
            <button onClick={send} disabled={!text.trim() || state === "sending"} style={{
              ...label({ fontSize: 13, color: text.trim() ? V.bg : V.text3, letterSpacing: "0.1em" }),
              background: text.trim() ? V.pink : V.bg4, border: "none", borderRadius: 999,
              padding: "10px 18px", cursor: text.trim() ? "pointer" : "default", flexShrink: 0,
              opacity: state === "sending" ? 0.6 : 1,
            }}>{state === "sending" ? "SENDING" : "SEND TO ANDREW"}</button>
          </div>
        </>
      )}
    </div>
  );
}

const when = iso => {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles",
    });
  } catch (e) { return ""; }
};

/**
 * Andrew's card. Renders nothing for anyone else, and nothing when there is
 * no unread request. CLOSE puts it away for now; it comes back next load
 * until every request has had GOT IT.
 */
export function HelmetInbox({ currentUser }) {
  const [rows, setRows] = useState([]);
  const [shown, setShown] = useState(true);

  useEffect(() => {
    if (currentUser !== ADMIN) return;
    let alive = true;
    (async () => {
      const { data, error } = await supabase.from("helmet_requests")
        .select("id,player_name,message,created_at").is("seen_at", null)
        .order("created_at", { ascending: true });
      if (error) { if (!noTable(error)) console.warn("helmet requests", error); return; }
      if (alive) { setRows(data || []); setShown(true); }
    })();
    return () => { alive = false; };
  }, [currentUser]);

  const gotIt = async row => {
    const { data, error } = await supabase.from("helmet_requests")
      .update({ seen_at: new Date().toISOString() }).eq("id", row.id).select();
    if (error || !data || !data.length) { console.warn("helmet request not marked", error); return; }
    setRows(rs => rs.filter(r => r.id !== row.id));
  };

  if (currentUser !== ADMIN || !shown || !rows.length) return null;
  const close = () => setShown(false);

  return (
    <div onClick={close} style={{
      position: "fixed", inset: 0, zIndex: 290, background: "rgba(4,4,9,0.88)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 12,
      animation: "v-fade 160ms ease-out",
    }}>
      <style>{VEGAS_CSS}</style>
      <div onClick={e => e.stopPropagation()} className="v-scroll" style={{
        ...card({ width: "100%", maxWidth: 380, maxHeight: "90dvh", padding: "14px 16px 18px" }),
        ...edgeGlow(V.pink, 0.7), overflowY: "auto", color: V.text,
        animation: "v-rise 220ms ease-out",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={display("h3", { fontSize: 22, color: V.text })}>
            {rows.length === 1 ? "A HELMET REQUEST" : `${rows.length} HELMET REQUESTS`}
          </div>
          <button onClick={close} aria-label="Close" style={{
            ...label({ fontSize: 13, color: V.text }), background: "rgba(4,4,9,0.72)",
            border: `1px solid ${V.border2}`, borderRadius: 999, cursor: "pointer", padding: "7px 12px",
          }}>CLOSE</button>
        </div>
        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          {rows.map(r => (
            <div key={r.id} style={{ background: V.bg3, border: `1px solid ${V.border2}`, borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 17, color: V.pink }}>{r.player_name}</div>
                <div style={label({ fontSize: 13, color: V.text2 })}>{when(r.created_at)}</div>
              </div>
              <div style={{ fontFamily: FB, fontSize: 15, lineHeight: 1.45, color: V.text, marginTop: 6, whiteSpace: "pre-wrap" }}>
                {r.message}
              </div>
              <button onClick={() => gotIt(r)} style={{
                ...label({ fontSize: 13, color: V.green, letterSpacing: "0.1em" }),
                background: "transparent", border: `1px solid ${V.green}`, borderRadius: 999,
                padding: "8px 14px", marginTop: 10, cursor: "pointer",
              }}>GOT IT</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
