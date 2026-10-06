// The team card: tap a team on /schedule and this comes up the way a player's
// card does. The logo and the name, both drivers out of their circles, who
// carried what share, the season's numbers, every round played and to come,
// and where the team came from.
//
// Presentational only. buildTeamCard in teamCard.js computes it, the provider
// in PlayerCard.jsx owns opening and closing it, and scripts/smoke-card.jsx
// renders all 24 without a network. A face opens that player's card through
// `onPlayer`, handed in rather than imported, so this file and PlayerCard.jsx
// do not import each other.
import { Flagged } from "./Flag.jsx";
import { V, FD, display, numeric, label, body, textGlow } from "./theme.vegas";
import { DIV_NAME } from "./teamCard.js";

// The player card's photo treatment, half the width: no circle, faded out at
// the bottom and the sides into whatever the card is drawn on.
const fade = "linear-gradient(to bottom, #000 0%, #000 80%, transparent 100%), linear-gradient(to right, transparent 0%, #000 10%, #000 90%, transparent 100%)";

const initialsOf = n => (n || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
const hueOf = n => { let h = 0; for (let i = 0; i < (n || "").length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0; return h % 360; };

function Seat({ s, onPlayer }) {
  const box = { display: "block", width: "100%", aspectRatio: "1 / 1",
    WebkitMaskImage: fade, maskImage: fade, WebkitMaskComposite: "source-in", maskComposite: "intersect" };
  const open = () => onPlayer && onPlayer(s.name);
  return (
    <div role="button" tabIndex={0} onClick={open} title={`${s.name}'s card`}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } }}
      style={{ flex: "1 1 0", minWidth: 0, textAlign: "center", cursor: "pointer" }}>
      {s.photo
        ? <img src={s.photo} alt="" style={{ ...box, objectFit: "cover", objectPosition: "center top" }} />
        : <div style={{ ...box, display: "flex", alignItems: "center", justifyContent: "center",
            background: `hsl(${hueOf(s.name)} 62% 46%)`, fontFamily: FD, fontWeight: 700,
            fontSize: 48, color: "#fff" }}>{initialsOf(s.name)}</div>}
      <div style={{ display: "flex", justifyContent: "center", marginTop: 4 }}>
        <Flagged name={s.name} nation={s.nation} size={18} wrap style={display("h3", {
          fontSize: 17, lineHeight: 1.15, color: V.text, textAlign: "center" })} />
      </div>
      {/* What share of the two of them this one is. Blue is the score colour. */}
      <div style={{ ...numeric("hero", { fontSize: 30, color: V.blue }), ...textGlow(V.blue, 0.7),
        marginTop: 4 }}>{s.share != null ? `${s.share}%` : "–"}</div>
      <div style={label({ fontSize: 13, color: V.text2 })}>
        {s.pts} {s.pts === 1 ? "point" : "points"}
      </div>
    </div>
  );
}

function Stat({ k, v, sub }) {
  return (
    <div style={{ flex: 1, minWidth: 0, textAlign: "center", padding: "8px 4px",
      background: V.bg3, borderRadius: 12, border: `1px solid ${V.border}` }}>
      <div style={{ ...numeric("stat", { fontSize: 22, color: V.blue }), ...textGlow(V.blue, 0.5),
        whiteSpace: "nowrap" }}>{v}</div>
      <div style={label({ fontSize: 13, color: V.text2, marginTop: 2 })}>{k}</div>
      {sub && <div style={{ fontFamily: FD, fontWeight: 600, fontSize: 13, color: V.text, marginTop: 1,
        whiteSpace: "nowrap" }}>{sub}</div>}
    </div>
  );
}

const ord = n => {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

// "Oct 12", read as the date it is written, not shifted a day by the zone.
const dateOf = d => {
  if (!d) return "";
  const t = new Date(`${String(d).slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(t.getTime()) ? "" : t.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
};

function Game({ g, next, onMatchup }) {
  const c = !g.played ? V.text2 : g.won === true ? V.green : g.won === false ? V.pink : V.amber;
  const tap = g.played && onMatchup ? () => onMatchup(g.round) : null;
  return (
    <div onClick={tap || undefined} role={tap ? "button" : undefined} style={{
      display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 10,
      cursor: tap ? "pointer" : "default",
      background: next ? `${V.blue}14` : "transparent",
      border: `1px solid ${next ? `${V.blue}88` : "transparent"}`,
      borderBottom: next ? `1px solid ${V.blue}88` : `1px solid ${V.border}`,
    }}>
      <span style={{ ...numeric("chip", { fontSize: 14, color: V.text2 }), width: 30, flexShrink: 0 }}>R{g.round}</span>
      {g.opp && g.opp.logo
        ? <img src={g.opp.logo} alt="" style={{ width: 22, height: 22, objectFit: "contain", flexShrink: 0 }} />
        : <span style={{ width: 22, flexShrink: 0 }} />}
      <span style={{ fontFamily: FD, fontWeight: 600, fontSize: 15, color: V.text, flex: 1, minWidth: 0,
        lineHeight: 1.2 }}>
        {g.opp ? g.opp.short : "—"}
      </span>
      <span style={{ ...label({ fontSize: 13, color: V.text2 }), width: 44, flexShrink: 0, textAlign: "center" }}>
        {g.side}
      </span>
      {g.played ? (
        <span style={{ display: "flex", alignItems: "baseline", gap: 6, flexShrink: 0, width: 92, justifyContent: "flex-end" }}>
          <span style={{ ...numeric("chip", { fontSize: 15, color: V.text }), whiteSpace: "nowrap" }}>{g.score}&ndash;{g.oppScore}</span>
          <span style={{ ...display("chip", { fontSize: 14, color: c }), width: 14, textAlign: "center" }}>
            {g.won === true ? "W" : g.won === false ? "L" : "D"}
          </span>
        </span>
      ) : (
        <span style={{ fontFamily: FD, fontWeight: 600, fontSize: 14, color: next ? V.blue : V.text2,
          flexShrink: 0, width: 92, textAlign: "right" }}>{next ? "Next" : dateOf(g.date)}</span>
      )}
    </div>
  );
}

/** The card's content. Pure render of buildTeamCard's output. */
export function TeamCardBody({ data, onClose, onPlayer, onMatchup }) {
  const { name, logo, division, seats, season, half, games, history } = data;
  const accent = division === "championship" ? V.gold : V.silver;
  const nextRound = (games.find(g => !g.played) || {}).round;
  const section = (t) => <div style={label({ fontSize: 13, color: V.text2, marginTop: 18, marginBottom: 6 })}>{t}</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={onClose} aria-label="Close" style={{
          ...label({ fontSize: 13, color: V.text }), background: "rgba(4,4,9,0.72)",
          border: `1px solid ${V.border2}`, borderRadius: 999, cursor: "pointer", padding: "7px 12px",
        }}>CLOSE</button>
      </div>

      {/* The team, lit: the logo on a glow in the division's colour, the name
          under it, the division under that. */}
      <div style={{ textAlign: "center", marginTop: -8 }}>
        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 104, height: 104, borderRadius: 24, background: V.bg3,
          border: `1.5px solid ${accent}aa`, boxShadow: `0 0 22px ${accent}55, inset 0 0 18px ${accent}22` }}>
          {logo
            ? <img src={logo} alt="" style={{ width: 82, height: 82, objectFit: "contain" }} />
            : <span style={display("h2", { fontSize: 34, color: accent })}>{data.code}</span>}
        </div>
        <div style={{ ...display("h2", { fontSize: "clamp(24px, 7.6vw, 30px)", lineHeight: 1.1, color: V.text }),
          marginTop: 10 }}>{name}</div>
        {division && (
          <div style={{ ...label({ fontSize: 13, letterSpacing: "0.12em", color: accent }), marginTop: 6 }}>
            {DIV_NAME[division] || division}
          </div>
        )}
      </div>

      {/* The two of them, out of the circle, and who carried what. */}
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        {seats.map(s => <Seat key={s.id} s={s} onPlayer={onPlayer} />)}
      </div>
      <div style={body("bodySm", { fontSize: 13, color: V.text2, textAlign: "center", marginTop: 6 })}>
        Share of the team's points this season, BOX BOX left out.
      </div>

      {/* The season in four numbers. */}
      <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
        <Stat k="Record" v={season.record} sub={half ? `${half.record} 2nd half` : null} />
        <Stat k="Avg" v={season.avg.toFixed(1)} sub={season.avgRank ? `${ord(season.avgRank)} of ${season.teams}` : null} />
        <Stat k="BOX BOX" v={`${season.bb.won}-${season.bb.lost}`}
          sub={season.bb.push ? `${season.bb.push} ${season.bb.push === 1 ? "push" : "pushes"}` : "won-lost"} />
        <Stat k="Champ pts" v={half ? half.pts : 0} sub={half && half.place ? `P${half.place}` : null} />
      </div>

      {section("Results and schedule")}
      <div>
        {games.map(g => <Game key={g.round} g={g} next={g.round === nextRound} onMatchup={onMatchup} />)}
      </div>

      {section("History")}
      {history.firstHalf && (
        <div style={{ fontFamily: FD, fontWeight: 600, fontSize: 15, color: V.text, lineHeight: 1.4 }}>
          2026 first half: {ord(history.firstHalf.place)} in the {DIV_NAME[history.firstHalf.division] || "league"},{" "}
          {history.firstHalf.pts} points, {history.firstHalf.record}.
          {history.moved === "promoted" && <span style={{ color: V.green }}> Promoted.</span>}
          {history.moved === "relegated" && <span style={{ color: V.pink }}> Relegated.</span>}
        </div>
      )}
      {history.lore && (
        <div style={body("body", { fontSize: 15, color: V.text2, lineHeight: 1.5, marginTop: 8 })}>
          {history.lore}
        </div>
      )}
    </div>
  );
}
