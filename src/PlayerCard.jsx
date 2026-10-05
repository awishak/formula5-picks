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
import { MARK } from "./history.js";

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

// The face, full width of the card and fading into it from the bottom, not in
// a circle (Andrew, 2026-10-04): the helmets are the picture. Bled to the
// card's edges by its own padding; the card's overflow clips the top corners.
// The mask fades into whatever the card is drawn on, so no colour is repeated
// here. Cropped from the top, so what goes is the suit, which is fading anyway.
const HERO_BLEED = "-10px -16px 0";
const heroFade = "linear-gradient(to bottom, #000 0%, #000 52%, transparent 100%)";

function Hero({ name, photo }) {
  const box = { display: "block", width: "calc(100% + 32px)", margin: HERO_BLEED, aspectRatio: "1 / 0.92",
    WebkitMaskImage: heroFade, maskImage: heroFade };
  if (photo) {
    return <img src={photo} alt="" style={{ ...box, objectFit: "cover", objectPosition: "center top" }} />;
  }
  return (
    <div style={{ ...box, display: "flex", alignItems: "center", justifyContent: "center",
      background: `hsl(${hueOf(name)} 62% 46%)`,
      fontFamily: FD, fontWeight: 700, fontSize: 96, color: "#fff" }}>
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

// No small gray numbers anywhere on this card (Andrew, 2026-10-02). A number
// is white and at least 15px; the gray is for the words that label it.
function Stat({ k, v, sub }) {
  return (
    <div style={{ flex: 1, minWidth: 0, textAlign: "center", padding: "8px 4px",
      background: V.bg3, borderRadius: 12, border: `1px solid ${V.border}` }}>
      <div style={numeric("stat", { fontSize: 26, color: V.text, ...textGlow(V.blue, 0.6) })}>{v}</div>
      <div style={label({ fontSize: 13, color: V.text2, marginTop: 4 })}>{k}</div>
      {sub && <div style={{ fontFamily: FD, fontWeight: 600, fontSize: 15, color: V.text, marginTop: 1, whiteSpace: "nowrap" }}>{sub}</div>}
    </div>
  );
}

// One podium, one line, the way a driver's record is written: the place in
// its metal, then the year and the Grand Prix. Andrew, 2026-10-02: not chips,
// make it regal. "Winner 2026 Bahrain Grand Prix", "P2 2025 Monaco Grand Prix".
const METAL = { 1: V.gold, 2: V.silver, 3: V.bronze };
function Podium({ f }) {
  const c = METAL[f.place];
  const place = f.place === 1 ? "Winner" : `P${f.place}`;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 2px",
      borderBottom: `1px solid ${V.border}` }}>
      <span style={{ fontSize: 15, lineHeight: 1, flexShrink: 0 }}>{MARK[f.place]}</span>
      <span style={{ ...numeric("chip", { fontSize: 14, letterSpacing: "0.04em" }), ...textGlow(c, 0.5),
        width: 58, flexShrink: 0, textTransform: "uppercase" }}>{place}</span>
      <span style={{ fontFamily: FD, fontWeight: 600, fontSize: 15, color: V.text, minWidth: 0,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.2 }}>
        {f.year} {f.race || (f.where ? `${f.where} Grand Prix` : "")}
      </span>
    </div>
  );
}

// The podiums, folded by default: the count and the whole trophy case as
// marks on one wrapping line, and a tap opens the list, one line a podium.
// Andrew, 2026-10-02: expandable, and smaller. `open` is the smoke script's
// way in, since a server render cannot tap.
function Podiums({ career, open = false }) {
  const [shown, setShown] = useState(open);
  const n = career.podiums.length + career.extras.length;
  const marks = [...career.podiums.map(f => MARK[f.place]), ...career.extras.map(x => x.mark)];
  return (
    <div style={{ marginTop: 14 }}>
      <button onClick={() => setShown(s => !s)} aria-expanded={shown} style={{
        display: "flex", alignItems: "center", gap: 8, width: "100%",
        background: "transparent", border: "none", padding: 0, cursor: n ? "pointer" : "default",
        textAlign: "left",
      }}>
        <span style={label({ fontSize: 13, color: V.text2 })}>Podiums</span>
        {n > 0 && (
          <span style={{ fontSize: 13, color: V.text2, lineHeight: 1, transform: shown ? "rotate(180deg)" : "none",
            transition: "transform 160ms ease-out" }}>{"▼"}</span>
        )}
        <span style={{ fontFamily: FD, fontWeight: 600, fontSize: 15, color: V.text, marginLeft: "auto" }}>
          {career.total} {career.total === 1 ? "podium" : "podiums"}, {career.wins} {career.wins === 1 ? "win" : "wins"}
        </span>
      </button>
      {n === 0 ? (
        <div style={body("bodySm", { fontSize: 15, color: V.text2, marginTop: 4 })}>None yet.</div>
      ) : shown ? (
        <div style={{ marginTop: 4, borderTop: `1px solid ${V.border2}` }}>
          {career.podiums.map((f, i) => <Podium key={i} f={f} />)}
          {/* The trophies that are not a podium, on their own line after. */}
          {career.extras.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 2px" }}>
              <span style={{ fontSize: 15, lineHeight: 1 }}>{career.extras.map(x => x.mark).join(" ")}</span>
              <span style={{ fontFamily: FD, fontWeight: 600, fontSize: 15, color: V.text }}>
                {[...new Set(career.extras.map(x => x.year))].join(", ")}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div onClick={() => setShown(true)} title="Show every podium" style={{
          fontSize: 17, lineHeight: 1.35, letterSpacing: "0.06em", marginTop: 5, cursor: "pointer",
          wordBreak: "break-all",
        }}>{marks.join("")}</div>
      )}
    </div>
  );
}

const HINTS = {
  good: "Where they sit in the individual standings, on points a race.",
  selfless: "Pit guesses further from the field than most, which is what moves the team's line.",
  independent: "Pit guesses closer to the field than most: their own best guess, not the team's line.",
  daring: "Picks the field picks less often.",
  conservative: "Picks the field picks more often.",
};

/** The card's content. Pure render of buildPlayerCard's output. */
export function PlayerCardBody({ data, onClose, openPodiums = false }) {
  const { name, photo, nation, team, style, slogan, stats, career } = data;
  // Table numbers are white, 15px and in the numbers face. The gray is for
  // the headers, which are words.
  const cell = (extra = {}) => ({ ...numeric("chip", { fontSize: 15, letterSpacing: 0, color: V.text }), padding: "6px 4px",
    textAlign: "right", whiteSpace: "nowrap", ...extra });
  const head = (extra = {}) => ({ ...label({ fontSize: 13, color: V.text2, letterSpacing: "0.05em" }),
    padding: "5px 4px", textAlign: "right", whiteSpace: "nowrap", ...extra });
  const dash = "–";
  return (
    <div>
      <div style={{ position: "relative" }}>
        <Hero name={name} photo={photo} />
        {/* Close, top right, over the picture. A card you cannot see how to
            leave is a trap, so it sits on a dark chip the photo cannot swallow. */}
        <button onClick={onClose} aria-label="Close" style={{
          ...label({ fontSize: 13, color: V.text }), position: "absolute", top: 0, right: -6,
          background: "rgba(4,4,9,0.72)", border: `1px solid ${V.border2}`, borderRadius: 999,
          cursor: "pointer", padding: "7px 12px",
        }}>CLOSE</button>
      </div>

      {/* Flagged is a flex row sized to its content, so centring is the
          wrapper's job. The name rides up onto the fade. */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: -34, position: "relative" }}>
        <Flagged name={name} nation={nation} size={24} style={display("h2", {
          fontSize: "clamp(24px, 7.6vw, 32px)", lineHeight: 1.1, color: V.text,
        })} />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, marginTop: 8 }}>
        <TeamMark team={team} size={30} />
        <div style={{ fontFamily: FD, fontWeight: 600, fontSize: 15, letterSpacing: "0.02em",
          textTransform: "uppercase", color: V.text2, whiteSpace: "nowrap", overflow: "hidden",
          textOverflow: "ellipsis" }}>{team ? team.name : "No team"}</div>
      </div>

      {/* The title, under the team name, in gold. The sheets' loo mark means
          World Champion (Andrew, 2026-10-02). */}
      {career.titles.length > 0 && (
        <div style={{ textAlign: "center", marginTop: 7 }}>
          <span style={{
            ...label({ fontSize: 14, letterSpacing: "0.12em" }), ...textGlow(V.gold, 0.7),
            padding: "5px 12px", borderRadius: 999, border: `1px solid ${V.gold}88`,
            background: `${V.gold}14`, display: "inline-block",
          }}>
            {career.titles.join(", ")} World Champion
          </span>
        </div>
      )}

      {/* Driving style: the type, then the three axes it came from. */}
      {style && (
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <div style={label({ fontSize: 13, color: V.text3 })}>Driving style</div>
          <div style={display("h3", { fontSize: 24, marginTop: 3, ...textGlow(V.pink, 0.8) })}>{style.type}</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
            <Trait text={style.bandLabel} on color={V.blue} hint={HINTS.good} />
            {/* Each axis names the side the player is on (Andrew, 2026-10-03):
                not selfless is independent, not daring is conservative. Those
                two are blue, so green keeps meaning good. */}
            <Trait text={style.selfless ? "Selfless" : "Independent"} on color={style.selfless ? V.green : V.blue}
              hint={style.selfless ? HINTS.selfless : HINTS.independent} />
            <Trait text={style.daring ? "Daring" : "Conservative"} on color={style.daring ? V.amber : V.blue}
              hint={style.daring ? HINTS.daring : HINTS.conservative} />
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

      {/* Every podium of their career, oldest first. First, second and third
          only: the sheets' top tens are not here. Then the trophies that are
          not a podium. */}
      <Podiums career={career} open={openPodiums} />

      {/* Career. One row a season, oldest first. */}
      <div style={{ marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
          <div style={label({ fontSize: 13, color: V.text2 })}>Career</div>
          <div style={{ fontFamily: FD, fontWeight: 600, fontSize: 15, color: V.text }}>
            {career.years}{career.seasons.length > 1 ? ` · since ${career.firstYear}` : ""}
          </div>
        </div>
        {/* Fixed layout, so the trophies wrap inside their column rather than
            pushing the table past the card's edge, which a row of seven emoji
            did on a 375px phone. The year in play is blue, like every live
            number on the Vegas pages. */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 4 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${V.border2}` }}>
              <th style={head({ textAlign: "left" })}>Year</th>
              <th style={head()}>PPR</th>
              <th style={head()}>Place</th>
              <th style={head()}>Wins</th>
              <th style={head()}>Podiums</th>
            </tr>
          </thead>
          <tbody>
            {career.seasons.map(s => (
              <tr key={s.year} style={{ borderBottom: `1px solid ${V.border}` }}>
                <td title={s.live ? "This season so far" : undefined}
                    style={cell({ textAlign: "left", color: s.live ? V.blue : V.text })}>
                  {s.year}{s.shared ? "*" : ""}
                </td>
                <td title={s.adjusted ? `${s.ppr.toFixed(1)} on the ${s.year} scale, ${s.pts} points over ${s.races} races` : undefined}
                    style={cell()}>{s.pprAdj != null ? s.pprAdj.toFixed(1) : dash}</td>
                <td style={cell()}>{s.place != null ? `P${s.place}` : dash}</td>
                <td style={cell()}>{s.wins}</td>
                <td style={cell()}>{s.podiums}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {career.seasons.some(s => s.adjusted) && (
          <div style={body("bodySm", { fontSize: 14, color: V.text2, marginTop: 6 })}>
            2023 to 2025 PPR are adjusted to 2026 scoring.
          </div>
        )}
        {career.seasons.some(s => s.shared) && (
          <div style={body("bodySm", { fontSize: 14, color: V.text2, marginTop: 6 })}>
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
