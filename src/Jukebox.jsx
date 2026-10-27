// The jukebox: every F5 song, newest first, anywhere in the app. A round
// button in the shell header beside "Viewing as" opens a sheet listing
// songs.js top to bottom; tap a row to play it, tap again to pause, and a song
// with lyrics written down has ENGLISH LYRICS under its title, which opens them
// in the same sheet. Andrew, 2026-10-27: "a little song popup where people can
// always choose which music they want to listen to, in reverse chrono order",
// with an option to see the English lyrics.
//
// The button is always there, so the music is never a control the reader has
// to find (deck rule 9). While something plays it glows and the icon turns to
// an equaliser, which is the only thing separating "my phone is muted" from
// "this button is broken". It replaced NowPlaying's STOP THE SONG, which lives
// on inside the sheet.
//
// Audio is themeSong.js, the one Audio object outside React; this file never
// touches an <audio> element. Sleeve is exported so the deck's advert can draw
// a song that has no album art.
import { useState, useEffect } from "react";
import { SONGS, songBySrc } from "./songs.js";
import { songSrc, songPlaying, onSong, playSong, pauseSong } from "./themeSong.js";
import { V, FD, display, body, label, textGlow, edgeGlow, card as vcard } from "./theme.vegas";

// A drawn record sleeve for a song with no artwork: a disc with a lit label
// carrying the song's initials, in the colour the row is given.
export function Sleeve({ song, size = 56, color = V.pink, style }) {
  const initials = song.name.replace(/\(.*?\)/g, "").trim().split(/\s+/)
    .map(w => w[0]).filter(Boolean).slice(0, 3).join("").toUpperCase();
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img"
      aria-label={`${song.name} record`}
      style={{ display: "block", borderRadius: 8, flex: "none", ...style }}>
      <rect width="100" height="100" rx="8" fill={V.bg3} />
      <circle cx="50" cy="50" r="42" fill="#0b0b12" stroke={V.border2} />
      {[36, 30, 24].map(r => <circle key={r} cx="50" cy="50" r={r} fill="none" stroke={V.bg4} strokeWidth="1" />)}
      <circle cx="50" cy="50" r="17" fill={color} />
      <circle cx="50" cy="50" r="2.6" fill="#0b0b12" />
      <text x="50" y="47" textAnchor="middle" fontFamily={FD} fontWeight="700" fontSize="11"
        fill={V.bg} letterSpacing="1">{initials}</text>
    </svg>
  );
}

const Note = ({ color, size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9 18.5V5.6l10-2.3v12.4" fill="none" stroke={color} strokeWidth="2.1" strokeLinejoin="round" />
    <circle cx="6.5" cy="18.5" r="2.7" fill={color} />
    <circle cx="16.5" cy="15.7" r="2.7" fill={color} />
  </svg>
);

// Three bars that bounce while a song plays, and stand still under
// prefers-reduced-motion. Pure CSS, so a screenshot sees a lit control.
const Bars = ({ color, size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    {[5, 10.5, 16].map((x, i) => (
      <rect key={x} className="jb-bar" x={x} y="4" width="3.4" height="16" rx="1.2" fill={color}
        style={{ animationDelay: `${i * 140}ms`, transformOrigin: "50% 100%" }} />
    ))}
  </svg>
);

const Play = ({ color, size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 5.2v13.6l10.5-6.8z" fill={color} />
  </svg>
);
const Pause = ({ color, size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <rect x="6.4" y="4.8" width="4.1" height="14.4" rx="1.3" fill={color} />
    <rect x="13.5" y="4.8" width="4.1" height="14.4" rx="1.3" fill={color} />
  </svg>
);

const CSS = `
  @keyframes jb-bounce { 0%, 100% { transform: scaleY(0.35); } 50% { transform: scaleY(1); } }
  .jb-bar { animation: jb-bounce 900ms ease-in-out infinite; }
  @keyframes jb-up { from { transform: translateY(40px); opacity: 0; } to { transform: none; opacity: 1; } }
  .jb-sheet { animation: jb-up 260ms cubic-bezier(.2,.85,.3,1) both; }
  .jb-scroll::-webkit-scrollbar { width: 0; }
  @media (prefers-reduced-motion: reduce) { .jb-bar, .jb-sheet { animation: none !important; } }
`;

/** The state of the one Audio object, as React sees it. */
function useSong() {
  const [on, setOn] = useState(() => songPlaying());
  const [src, setSrc] = useState(() => songSrc());
  useEffect(() => onSong(playing => { setOn(playing); setSrc(songSrc()); }), []);
  return { playing: on, song: on ? songBySrc(src) : null };
}

export default function Jukebox() {
  const [open, setOpen] = useState(false);
  const { playing, song } = useSong();
  const color = playing ? V.blue : V.text2;
  return (
    <>
      <style>{CSS}</style>
      <button onClick={() => setOpen(true)}
        aria-label={playing && song ? `Music: ${song.name} is playing` : "Music"}
        title={playing && song ? song.name : "Music"}
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 40, height: 40, flexShrink: 0, borderRadius: 999, cursor: "pointer",
          background: V.bg3,
          ...(playing ? edgeGlow(V.blue, 0.7) : { border: `1px solid ${V.border2}` }),
        }}>
        {playing ? <Bars color={color} size={22} /> : <Note color={color} size={22} />}
      </button>
      {open && <JukeboxSheet onClose={() => setOpen(false)} />}
    </>
  );
}

/** The sheet itself. Mounted by the button above and by nothing else. */
export function JukeboxSheet({ onClose }) {
  const { playing, song } = useSong();
  const [lyricsOf, setLyricsOf] = useState(null);
  // Esc closes, and the page under the sheet stops scrolling while it is up.
  useEffect(() => {
    const key = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", key); document.body.style.overflow = prev; };
  }, [onClose]);

  const tap = s => { if (playing && song && song.key === s.key) pauseSong(); else playSong(s.src); };

  return (
    <div onClick={onClose} role="dialog" aria-modal="true" aria-label="The jukebox" style={{
      position: "fixed", inset: 0, zIndex: 2000, background: "rgba(3,3,8,0.78)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Encode+Sans+Semi+Condensed:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>
      <div className="jb-sheet" onClick={e => e.stopPropagation()} style={{
        ...vcard({ width: "100%", maxWidth: 480, borderRadius: "22px 22px 0 0" }),
        ...edgeGlow(V.blue, 0.5), borderBottom: "none",
        maxHeight: "88dvh", display: "flex", flexDirection: "column",
        paddingBottom: "max(14px, env(safe-area-inset-bottom))",
      }}>
        {lyricsOf
          ? <Lyrics song={lyricsOf} onBack={() => setLyricsOf(null)} onClose={onClose} />
          : (
            <>
              <div style={{ padding: "18px 18px 10px", display: "flex", alignItems: "flex-end",
                justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "grid", gap: 3 }}>
                  <div style={{ ...display("h2", { fontSize: 28 }), ...textGlow(V.pink, 0.8) }}>THE JUKEBOX</div>
                  <div style={{ ...body("bodySm", { color: V.text2 }) }}>Every F5 song, newest first. Tap one to play it.</div>
                </div>
                <CloseButton onClick={onClose} />
              </div>
              <div className="jb-scroll" style={{ overflowY: "auto", padding: "0 12px", display: "grid", gap: 8 }}>
                {SONGS.map((s, i) => {
                  const live = playing && song && song.key === s.key;
                  return (
                    <div key={s.key} style={{
                      ...vcard({ padding: 10, borderRadius: 14, background: live ? V.bg3 : V.bg2 }),
                      ...(live ? edgeGlow(V.blue, 0.6) : {}),
                      display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: "8px 12px",
                    }}>
                      <button onClick={() => tap(s)} aria-label={live ? `Pause ${s.name}` : `Play ${s.name}`} style={{
                        display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0,
                        background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left",
                      }}>
                        {s.cover
                          ? <img src={s.cover} alt="" width={56} height={56}
                              style={{ display: "block", width: 56, height: 56, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                          : <Sleeve song={s} size={56} color={i === 0 ? V.pink : i % 2 ? V.blue : V.purple} />}
                        <span style={{ display: "grid", gap: 3, minWidth: 0 }}>
                          <span style={{ ...display("h3", { fontSize: 20, color: live ? V.blue : V.text }),
                            ...(live ? textGlow(V.blue, 0.5) : {}), overflowWrap: "anywhere" }}>
                            {s.name}
                            {i === 0 && (
                              <span style={{ ...label({ fontSize: 13, color: V.pink }), verticalAlign: "middle",
                                marginLeft: 8, border: `1px solid ${V.pink}`, borderRadius: 999, padding: "1px 7px" }}>NEW</span>
                            )}
                          </span>
                          {s.line && (
                            <span style={{ ...body("bodySm", { fontSize: 13, color: V.text2, lineHeight: 1.3 }) }}>{s.line}</span>
                          )}
                        </span>
                      </button>
                      <button onClick={() => tap(s)} aria-hidden="true" tabIndex={-1} style={{
                        width: 44, height: 44, borderRadius: 999, cursor: "pointer", flexShrink: 0,
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        background: live ? V.blue : V.bg4, border: `1px solid ${live ? V.blue : V.border2}`,
                        boxShadow: live ? `0 0 12px ${V.blue}88` : "none",
                      }}>
                        {live ? <Pause color={V.bg} size={20} /> : <Play color={V.text} size={20} />}
                      </button>
                      {s.lyrics && (
                        // Under the whole row, so the title keeps its width.
                        <button onClick={() => setLyricsOf(s)} style={{
                          ...label({ fontSize: 13, color: V.gold }), background: "none", cursor: "pointer",
                          border: `1px solid ${V.gold}`, borderRadius: 999, padding: "6px 12px", minHeight: 32,
                          gridColumn: "1 / -1", justifySelf: "start", marginLeft: 68,
                        }}>English lyrics</button>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{ padding: "12px 12px 0", display: "flex", gap: 10, justifyContent: "center" }}>
                {playing && (
                  <button onClick={pauseSong} style={{
                    ...display("chip", { color: V.pink }), background: V.bg3, cursor: "pointer",
                    border: `1px solid ${V.pink}`, borderRadius: 999, padding: "10px 18px", minHeight: 44,
                    boxShadow: `0 0 10px ${V.pink}55`,
                  }}>STOP THE SONG</button>
                )}
                <button onClick={onClose} style={{
                  ...display("chip", { color: V.bg }), background: V.blue, cursor: "pointer",
                  border: "none", borderRadius: 999, padding: "10px 22px", minHeight: 44,
                  boxShadow: `0 0 14px ${V.blue}77`,
                }}>CLOSE</button>
              </div>
            </>
          )}
      </div>
    </div>
  );
}

function CloseButton({ onClick }) {
  return (
    <button onClick={onClick} aria-label="Close" style={{
      width: 40, height: 40, borderRadius: 999, flexShrink: 0, cursor: "pointer",
      background: V.bg3, border: `1px solid ${V.border2}`, color: V.text, fontSize: 18, lineHeight: 1,
    }}>×</button>
  );
}

/** The English lyrics of one song, a block a section, scrolling inside the sheet. */
function Lyrics({ song, onBack, onClose }) {
  const { playing, song: now } = useSong();
  const live = playing && now && now.key === song.key;
  return (
    <>
      <div style={{ padding: "18px 18px 10px", display: "flex", alignItems: "flex-start",
        justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
          <button onClick={onBack} style={{ ...label({ fontSize: 13, color: V.blue }), background: "none",
            border: "none", padding: 0, cursor: "pointer", textAlign: "left", minHeight: 24 }}>&lsaquo; All songs</button>
          <div style={{ ...display("h2", { fontSize: 26 }), ...textGlow(V.pink, 0.8) }}>{song.name}</div>
          {song.lyricsNote && <div style={{ ...body("bodySm", { color: V.text2 }) }}>{song.lyricsNote}</div>}
        </div>
        <CloseButton onClick={onClose} />
      </div>
      <div className="jb-scroll" style={{ overflowY: "auto", padding: "4px 18px 8px", display: "grid", gap: 16 }}>
        {song.lyrics.map(([head, lines], i) => (
          <div key={i} style={{ display: "grid", gap: 4 }}>
            <div style={{ ...label({ fontSize: 13, color: V.gold }) }}>{head}</div>
            {lines.map((l, j) => (
              <div key={j} style={{ ...body("body", { fontSize: 16, color: V.text, lineHeight: 1.45 }),
                ...(/^\(.*\)$/.test(l) ? { color: V.text2, fontStyle: "italic" } : {}) }}>{l}</div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ padding: "12px 12px 0", display: "flex", gap: 10, justifyContent: "center" }}>
        <button onClick={() => (live ? pauseSong() : playSong(song.src))} style={{
          ...display("chip", { color: V.bg }), background: live ? V.pink : V.blue, cursor: "pointer",
          border: "none", borderRadius: 999, padding: "10px 22px", minHeight: 44,
          boxShadow: `0 0 14px ${live ? V.pink : V.blue}77`,
        }}>{live ? "PAUSE THE SONG" : "PLAY THE SONG"}</button>
      </div>
    </>
  );
}
