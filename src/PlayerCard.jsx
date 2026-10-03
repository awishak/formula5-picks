// The player card: tap a player anywhere and this comes up in the middle of the
// screen. Big face, big name, team and logo, driving style, slogan, this
// season's numbers and the career underneath.
//
// Three parts. PlayerCardProvider sits around the whole app in main.jsx and
// owns which card is open, so a tap inside the deck, the home page or a
// standings row all reach the same modal. usePlayerCard() hands a page the
// opener, and PlayerTap wraps anything that should open one. PlayerCardBody is
// the presentational half, split out so scripts/smoke-card.jsx can render all
// 48 without a network.
//
// The data loads once, on the first open, and is kept for the session: the
// whole league is five reads and the card for anybody is computed out of them.
//
// ?player_card=Andrew%20Ishak opens one on load, so every card can be
// photographed.
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { Flagged } from "./Flag.jsx";
import { V, FD, display, numeric, label, body, card, textGlow, edgeGlow, VEGAS_CSS } from "./theme.vegas";
import { buildPlayerCard } from "./playerCard.js";

const Ctx = createContext(null);

/** The opener. Safe without a provider: it then does nothing. */
export function usePlayerCard() {
  const c = useContext(Ctx);
  return c ? c.open : () => {};
}

/** Wrap anything that should open a player's card when tapped. */
export function PlayerTap({ name, children, style, title, block = false }) {
  const open = usePlayerCard();
  if (!name) return children;
  return (
    <span role="button" tabIndex={0} title={title || `${name}'s card`}
      onClick={e => { e.stopPropagation(); open(name); }}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(name); } }}
      style={{ cursor: "pointer", display: block ? "block" : "inline-flex", alignItems: "center",
        minWidth: 0, ...style }}>
      {children}
    </span>
  );
}

async function loadLeague() {
  const [players, teams, races, scores, picks] = await Promise.all([
    supabase.from("players").select("id,name,photo_url,nation"),
    supabase.from("teams").select("*"),
    supabase.from("races").select("*"),
    supabase.from("scores").select("*"),
    supabase.from("picks").select("*"),
  ]).then(rs => rs.map(r => r.data || []));
  return { players, teams, races, scores, picks };
}

export function PlayerCardProvider({ children }) {
  const [name, setName] = useState(() => {
    try { return new URLSearchParams(window.location.search).get("player_card") || null; } catch (e) { return null; }
  });
  const [db, setDb] = useState(null);
  const [failed, setFailed] = useState(false);
  const open = useCallback(n => setName(n), []);
  const close = useCallback(() => setName(null), []);

  useEffect(() => {
    if (!name || db || failed) return;
    let alive = true;
    loadLeague().then(d => { if (alive) setDb(d); }).catch(e => { console.error(e); if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [name, db, failed]);

  return (
    <Ctx.Provider value={{ open }}>
      {children}
      {name && <PlayerCardModal name={name} db={db} failed={failed} onClose={close} />}
    </Ctx.Provider>
  );
}

const initialsOf = n => (n || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
const hueOf = n => { let h = 0; for (let i = 0; i < (n || "").length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0; return h % 360; };

function Face({ name, photo, size }) {
  const ring = { border: `3px solid ${V.blue}`, boxShadow: `0 0 18px ${V.blue}77, 0 0 46px ${V.blue}33` };
  if (photo) {
    return <img src={photo} alt="" style={{ width: size, height: size, borderRadius: "50%",
      objectFit: "cover", display: "block", background: V.bg3, ...ring }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", display: "flex",
      alignItems: "center", justifyContent: "center", background: `hsl(${hueOf(name)} 62% 46%)`,
      fontFamily: FD, fontWeight: 700, fontSize: size * 0.36, color: "#fff", ...ring }}>
      {initialsOf(name)}
    </div>
  );
}

function TeamMark({ team, size = 30 }) {
  if (!team) return null;
  if (team.logo) return <img src={team.logo} alt="" style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.3, flexShrink: 0,
      background: `hsl(${hueOf(team.name)} 45% 42%)`, border: `1.5px solid ${V.border2}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      ...display("chip"), fontSize: 13, color: "#fff" }}>{initialsOf(team.name)}</div>
  );
}

// One trait. Lit in its colour when the player has it, dim when they do not, so
// the three read as a profile and not as three badges somebody earned.
function Trait({ text, on, color, hint }) {
  return (
    <span title={hint} style={{
      ...label({ fontSize: 13, letterSpacing: "0.08em" }),
      padding: "6px 11px", borderRadius: 999,
      color: on ? color : V.text3,
      border: `1px solid ${on ? color : V.border2}`,
      background: on ? `${color}1a` : "transparent",
      boxShadow: on ? `0 0 10px ${color}55` : "none",
      textDecoration: on ? "none" : "line-through",
    }}>{text}</span>
  );
}

function Stat({ k, v, sub }) {
  return (
    <div style={{ flex: 1, minWidth: 0, textAlign: "center", padding: "8px 4px",
      background: V.bg3, borderRadius: 12, border: `1px solid ${V.border}` }}>
      <div style={numeric("stat", { fontSize: 26, color: V.text, ...textGlow(V.blue, 0.6) })}>{v}</div>
      <div style={label({ fontSize: 13, color: V.text2, marginTop: 4 })}>{k}</div>
      {sub && <div style={body("bodySm", { fontSize: 13, color: V.text3, marginTop: 1, whiteSpace: "nowrap" })}>{sub}</div>}
    </div>
  );
}

const HINTS = {
  good: "Where they sit in the individual standings, on points a race.",
  selfless: "Pit guesses further from the field than most, which is what moves the team's line.",
  daring: "Picks the field picks less often.",
};

/** The card's content. Pure render of buildPlayerCard's output. */
export function PlayerCardBody({ data, onClose }) {
  const { name, photo, nation, team, style, slogan, stats, career } = data;
  const cell = (extra = {}) => ({ ...body("bodySm", { fontSize: 14, color: V.text2 }), padding: "5px 4px",
    textAlign: "right", whiteSpace: "nowrap", ...extra });
  const head = (extra = {}) => cell({ ...label({ fontSize: 13, color: V.text3, letterSpacing: "0.05em" }),
    fontWeight: 700, ...extra });
  const dash = "–";
  return (
    <div>
      {/* Close, top right. A card you cannot see how to leave is a trap. */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: -6 }}>
        <button onClick={onClose} aria-label="Close" style={{
          ...label({ fontSize: 13, color: V.text2 }), background: "transparent",
          border: "none", cursor: "pointer", padding: "8px 6px",
        }}>CLOSE</button>
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
        <Face name={name} photo={photo} size={110} />
      </div>

      <Flagged name={name} nation={nation} size={24} style={display("h2", {
        fontSize: "clamp(24px, 7.6vw, 32px)", lineHeight: 1.1, color: V.text,
        textAlign: "center", justifyContent: "center",
      })} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, marginTop: 8 }}>
        <TeamMark team={team} size={30} />
        <div style={{ fontFamily: FD, fontWeight: 600, fontSize: 15, letterSpacing: "0.02em",
          textTransform: "uppercase", color: V.text2, whiteSpace: "nowrap", overflow: "hidden",
          textOverflow: "ellipsis" }}>{team ? team.name : "No team"}</div>
      </div>

      {/* Driving style: the type, then the three axes it came from. */}
      {style && (
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <div style={label({ fontSize: 13, color: V.text3 })}>Driving style</div>
          <div style={display("h3", { fontSize: 24, marginTop: 3, ...textGlow(V.pink, 0.8) })}>{style.type}</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
            <Trait text={style.bandLabel} on color={V.blue} hint={HINTS.good} />
            <Trait text="Selfless" on={style.selfless} color={V.green} hint={HINTS.selfless} />
            <Trait text="Daring" on={style.daring} color={V.amber} hint={HINTS.daring} />
          </div>
        </div>
      )}

      <div style={body("body", { fontSize: 15, fontStyle: "italic", color: V.text2, textAlign: "center",
        margin: "11px 6px 0", lineHeight: 1.4 })}>
        {"“"}{slogan}{"”"}
      </div>

      {/* This season. The same four numbers /players ranks and shows. */}
      <div style={{ display: "flex", gap: 6, marginTop: 13 }}>
        <Stat k="Points" v={stats.pts} />
        <Stat k="Rank" v={`P${stats.place}`} sub={`of ${stats.field}`} />
        <Stat k="PPR" v={stats.avg.toFixed(1)} />
        <Stat k="Podiums" v={stats.podiums} sub={`${stats.wins} ${stats.wins === 1 ? "win" : "wins"}`} />
      </div>

      {/* Career. One row a season, oldest first; 2023 is a year they were here
          and nothing more, because that is all that was kept. */}
      <div style={{ marginTop: 13 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
          <div style={label({ fontSize: 13, color: V.text3 })}>Career</div>
          <div style={body("bodySm", { fontSize: 13, color: V.text2 })}>
            {career.years}{career.seasons.length > 1 ? ` · since ${career.firstYear}` : ""}
          </div>
        </div>
        {/* Fixed layout, so the trophies wrap inside their column rather than
            pushing the table past the card's edge, which a row of seven emoji
            did on a 375px phone. The year in play is blue, like every live
            number on the Vegas pages. */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 4, tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: 46 }} /><col style={{ width: 40 }} /><col style={{ width: 54 }} />
            <col style={{ width: 46 }} /><col style={{ width: 40 }} /><col />
          </colgroup>
          <thead>
            <tr style={{ borderBottom: `1px solid ${V.border2}` }}>
              <th style={head({ textAlign: "left" })}>Year</th>
              <th style={head()}>Pts</th>
              <th style={head()}>Place</th>
              <th style={head()}>Wins</th>
              <th style={head()}>Pod</th>
              <th style={head({ textAlign: "left", paddingLeft: 10 })}>Trophies</th>
            </tr>
          </thead>
          <tbody>
            {career.seasons.map(s => (
              <tr key={s.year} style={{ borderBottom: `1px solid ${V.border}` }}>
                <td title={s.live ? "This season so far" : undefined}
                    style={cell({ textAlign: "left", fontFamily: FD, fontWeight: 600, color: s.live ? V.blue : V.text })}>
                  {s.year}{s.shared ? "*" : ""}
                </td>
                <td style={cell({ color: V.text })}>{s.pts != null ? s.pts : dash}</td>
                <td style={cell()}>{s.place != null ? `P${s.place}` : dash}</td>
                <td style={cell()}>{s.wins != null ? s.wins : dash}</td>
                <td style={cell()}>{s.podiums != null ? s.podiums : dash}</td>
                <td style={cell({ textAlign: "left", paddingLeft: 10, fontSize: 14, lineHeight: 1.3,
                  whiteSpace: "normal", wordBreak: "break-all" })}>
                  {s.trophies || (s.live && s.topTens ? `${s.topTens} top ten${s.topTens === 1 ? "" : "s"}` : dash)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {career.seasons.some(s => s.shared) && (
          <div style={body("bodySm", { fontSize: 13, color: V.text3, marginTop: 6 })}>
            * Shared seat with {name === "Stacy Michaelsen" ? "Heather Ishak" : "Stacy Michaelsen"}.
          </div>
        )}
      </div>
    </div>
  );
}

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Encode+Sans+Semi+Condensed:wght@400;600;700&family=Chakra+Petch:wght@600;700&family=DM+Sans:ital,wght@0,400;0,600;0,700;1,400&display=swap');`;

function PlayerCardModal({ name, db, failed, onClose }) {
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    // The page behind must not scroll while the card is up.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const data = db ? buildPlayerCard(db, name) : null;

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 300, background: "rgba(4,4,9,0.88)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 12,
      animation: "v-fade 160ms ease-out",
    }}>
      <style>{FONTS}{VEGAS_CSS}</style>
      <div onClick={e => e.stopPropagation()} className="v-scroll" style={{
        ...card({ width: "100%", maxWidth: 380, maxHeight: "94dvh", padding: "10px 16px 18px" }),
        ...edgeGlow(V.blue, 0.7), overflowY: "auto", color: V.text,
        animation: "v-rise 220ms ease-out",
      }}>
        {data
          ? <PlayerCardBody data={data} onClose={onClose} />
          : (
            <div style={{ padding: "40px 0", textAlign: "center" }}>
              <div style={display("h3", { color: V.text })}>{name}</div>
              <div style={body("body", { color: V.text2, marginTop: 8 })}>
                {failed ? "The card did not load." : db ? "No card for this name." : "Loading"}
              </div>
              <button onClick={onClose} style={{ ...label({ fontSize: 13, color: V.blue }), background: "transparent",
                border: `1px solid ${V.blue}`, borderRadius: 999, padding: "8px 16px", marginTop: 16, cursor: "pointer" }}>CLOSE</button>
            </div>
          )}
      </div>
    </div>
  );
}

export default PlayerCardModal;
