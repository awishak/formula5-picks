// A note from Andrew to the whole league, on a card, once a player.
//
// It comes up over the app the first time each player opens it after the note
// goes in, and GOT IT is remembered under `f5_note_{id}_{name}` in
// localStorage, the way the weekly deck remembers being closed. The words are
// Andrew's, as he wrote them. To send another, change NOTE: a new id shows
// the new one to everybody once. Set NOTE to null and nothing is drawn.
//
// The dev harnesses (fit.html, check.html, check-nav) mark every note seen by
// setting `f5_notes_off`, because a card over the page blocks the taps and
// the measurements they exist to make.
import { useEffect, useState } from "react";
import { V, FB, label, card, edgeGlow, VEGAS_CSS } from "./theme.vegas";

export const NOTE = {
  id: "r20-tiebreak",
  text: "Hey folks, the machine scored our Brazil GP in a weird way. Specifically, it was not breaking ties correctly, which was especially important this week with a 16-way tie for first place, which means 16 people fighting for up to 10 bonus points for a top 10 finish. I made the fix, and now you'll see slightly different standings. Sorry about that! This does not affect the team game.",
};

export function LeagueNote({ currentUser }) {
  const [open, setOpen] = useState(false);
  const key = NOTE && currentUser ? `f5_note_${NOTE.id}_${currentUser}` : null;

  useEffect(() => {
    if (!key) { setOpen(false); return; }
    try {
      setOpen(!localStorage.getItem(key) && !localStorage.getItem("f5_notes_off"));
    } catch (e) { setOpen(false); }
  }, [key]);

  if (!open || !NOTE) return null;
  const gotIt = () => {
    try { localStorage.setItem(key, "1"); } catch (e) { /* private window: closes for this visit */ }
    setOpen(false);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 295, background: "rgba(4,4,9,0.88)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      animation: "v-fade 160ms ease-out",
    }}>
      <style>{VEGAS_CSS}</style>
      <div className="v-scroll" style={{
        ...card({ width: "100%", maxWidth: 380, maxHeight: "90dvh", padding: "22px 20px 20px" }),
        ...edgeGlow(V.blue, 0.8), overflowY: "auto", color: V.text, textAlign: "center",
        animation: "v-rise 220ms ease-out",
      }}>
        <p style={{ fontFamily: FB, fontSize: 17, lineHeight: 1.5, color: V.text, margin: 0, textAlign: "left" }}>
          {NOTE.text}
        </p>
        <button onClick={gotIt} style={{
          ...label({ fontSize: 15, color: V.bg, letterSpacing: "0.1em" }),
          background: V.blue, border: "none", borderRadius: 999,
          padding: "12px 28px", marginTop: 18, cursor: "pointer",
          boxShadow: `0 0 18px ${V.blue}88`,
        }}>GOT IT</button>
      </div>
    </div>
  );
}
