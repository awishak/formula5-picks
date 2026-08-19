import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { V, FD, FB, label, body, card, edgeGlow } from "./theme.vegas";

// Who you are looking at the app as, top right of every page.
//
// It used to live inside HomePage, which meant switching player was something
// you could only do by going home first. The league has 48 people and a lot of
// looking at each other's weeks, so it belongs in the chrome.
//
// Closed it is an avatar and a name. Open it is all 48 with a search box.

const initialsOf = name =>
  (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

// Stable colour per name, so a player without a photo is still recognisable.
const colorOf = (name) => {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 62% 52%)`;
};

function Avatar({ name, photo, size }) {
  const s = { width: size, height: size, borderRadius: "50%", flexShrink: 0 };
  if (photo) return <img src={photo} alt="" style={{ ...s, objectFit: "cover" }} />;
  return (
    <div style={{
      ...s, background: colorOf(name), display: "flex",
      alignItems: "center", justifyContent: "center",
      fontFamily: FD, fontWeight: 700, fontSize: size * 0.4, color: "#fff",
    }}>{initialsOf(name)}</div>
  );
}

export default function ViewingAs({ currentUser, onSelect }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    supabase.from("players").select("id,name,photo_url").order("name")
      .then(({ data }) => setPlayers(data || []));
  }, []);

  // Escape closes it, because a 48-person grid over the page needs a way out
  // that is not hunting for the button again.
  useEffect(() => {
    if (!open) return;
    const onKey = e => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const me = players.find(p => p.name === currentUser);
  const shown = players.filter(p => p.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <>
      <button onClick={() => { setOpen(!open); setQ(""); }} style={{
        display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
        padding: "6px 10px 6px 6px", borderRadius: 100,
        background: V.bg3, border: `1px solid ${open ? V.blue : V.border2}`,
        // Shrinkable, or it pushes past the edge next to the logo on a 320px
        // phone. The name inside already ellipsises.
        maxWidth: "min(190px, 54vw)", minWidth: 0, flexShrink: 1,
      }}>
        <Avatar name={currentUser} photo={me && me.photo_url} size={30} />
        <div style={{ minWidth: 0, textAlign: "left" }}>
          <div style={label({ color: V.text3, fontSize: 9, letterSpacing: "0.14em", lineHeight: 1.2 })}>Viewing as</div>
          <div style={{
            fontFamily: FD, fontWeight: 600, fontSize: 14, lineHeight: 1.35, color: V.text,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{currentUser || "Pick a name"}</div>
        </div>
        <span style={{ color: V.text3, fontSize: 10, flexShrink: 0 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <>
          {/* Click anywhere else to close. Below the panel, above the page. */}
          <div onClick={() => setOpen(false)} style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 190,
          }} />
          <div style={{
            ...card({ padding: 14 }), ...edgeGlow(V.blue, 0.7),
            position: "fixed", zIndex: 200,
            top: 64, left: "50%", transform: "translateX(-50%)",
            width: "min(460px, calc(100vw - 24px))",
            maxHeight: "calc(100vh - 96px)", display: "flex", flexDirection: "column",
          }}>
            <input
              autoFocus placeholder="Search" value={q} onChange={e => setQ(e.target.value)}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 10, outline: "none",
                background: V.bg3, border: `1px solid ${V.border2}`, color: V.text,
                fontFamily: FB, fontSize: 15, marginBottom: 10, boxSizing: "border-box",
              }}
            />
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6,
              overflowY: "auto", minHeight: 0,
            }}>
              {shown.map(p => {
                const on = p.name === currentUser;
                const [first, ...rest] = p.name.split(" ");
                return (
                  <button key={p.id} onClick={() => { onSelect(p.name); setOpen(false); }} style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    padding: "10px 4px 8px", borderRadius: 12, cursor: "pointer",
                    background: on ? "rgba(0,217,255,0.10)" : V.bg3,
                    border: `1px solid ${on ? V.blue : V.border}`,
                  }}>
                    <Avatar name={p.name} photo={p.photo_url} size={38} />
                    <span style={body("bodySm", { color: V.text3, fontSize: 13, lineHeight: 1.25 })}>{first}</span>
                    <span style={{
                      fontFamily: FD, fontWeight: 600, fontSize: 13, lineHeight: 1.25,
                      color: on ? V.blue : V.text, textAlign: "center",
                    }}>{rest.join(" ")}</span>
                  </button>
                );
              })}
            </div>
            {!shown.length && (
              <div style={body("bodySm", { color: V.text3, padding: "10px 2px" })}>Nobody by that name.</div>
            )}
          </div>
        </>
      )}
    </>
  );
}
