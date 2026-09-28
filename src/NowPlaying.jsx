// The stop button for a song a deck left playing. Sits beside "Viewing as" in
// the app shell, and only while something is playing, so on a quiet app it is
// nothing at all. Round 15's send-off is what starts a song that outlives its
// deck; see themeSong.js.
import { useState, useEffect } from "react";
import { songPlaying, onSong, pauseSong } from "./themeSong.js";
import { V, display } from "./theme.vegas";

export default function NowPlaying() {
  const [on, setOn] = useState(() => songPlaying());
  useEffect(() => onSong(setOn), []);
  if (!on) return null;
  return (
    <button onClick={pauseSong} aria-label="Stop the song" style={{
      display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0,
      ...display("chip"), fontSize: 13, color: V.blue, letterSpacing: "0.06em",
      background: V.bg3, border: `1px solid ${V.blue}`, borderRadius: 999,
      padding: "8px 12px", minHeight: 36, cursor: "pointer",
      boxShadow: `0 0 10px ${V.blue}55`,
    }}>
      <span aria-hidden="true" style={{ width: 10, height: 10, background: V.blue, borderRadius: 2 }} />
      STOP THE SONG
    </button>
  );
}
