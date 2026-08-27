import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import Flag, { Flagged } from "./Flag.jsx";
import { V, FM, FD, FB, display, numeric, label, body, card, textGlow, edgeGlow, titleFit, titleBox } from "./theme.vegas";
import { buildPlayerTable, placesBy } from "./playerTable";
import { ordinal } from "./teamTable";

// The individual standings. Built to the same pattern as TeamsPage on purpose:
// same header, same row shape, same rules about what scales and what does not.
// What differs is what a player is: an average rather than a points total, a
// team rather than an opponent, and trophies.

const WRAP = { maxWidth: 480, margin: "0 auto", padding: "0 16px 96px" };
// Two characters longer than the team page's title, so it takes less of
// the width rather than stretching to the same edges.
const TITLE_SIZE = titleFit("PLAYER STANDINGS", { fill: 0.95, min: 15 });
const TEAM_SIZE = "clamp(13px, 3.5vw, 14px)";
// Real names are longer than team short names, and 48 of them set the budget:
// at 19px two of them run past the column and at 21px ten do. Measured across
// all 48 rather than eyeballed off the top of the table.
// Tuned against the row as it is now. It was set when a trophy column shared
// the width; that column came off and this size never went back up.
const NAME_SIZE = "clamp(15px, calc(10.4vw - 22.0px), 19px)";

function Title() {
  return (
    <div style={titleBox({ padding: "14px 0 18px" })}>
      <div style={{
        fontFamily: FM, fontWeight: 400, fontSize: TITLE_SIZE,
        lineHeight: 1.15, letterSpacing: "0.02em", whiteSpace: "nowrap",
      }}>
        <span style={textGlow(V.pink)}>PLAYER</span>{" "}
        <span style={textGlow(V.blue)}>STANDINGS</span>
      </div>
    </div>
  );
}

const initialsOf = name =>
  (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

const colorOf = (name) => {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 62% 52%)`;
};

function Face({ name, photo, size }) {
  const s = { width: size, height: size, borderRadius: "50%", flexShrink: 0 };
  if (photo) return <img src={photo} alt="" style={{ ...s, objectFit: "cover" }} />;
  return (
    <div style={{
      ...s, background: colorOf(name), display: "flex",
      alignItems: "center", justifyContent: "center",
      fontFamily: FD, fontWeight: 700, fontSize: size * 0.36, color: "#fff",
    }}>{initialsOf(name)}</div>
  );
}

// Emoji carry their own padding, so they read smaller than a drawn dot set to
// the same size. 22 next to an 11px dot looks level.
//
// The mark a finish earns. Anything in the top ten is worth showing; only the
// first three get metal.
// The four ways to read this table.
//
// Spot 1 is the big blue number on the right. Spot 2 is the line under it.
// `sort` is what the table is ordered by and what P1 counts; trophies
// deliberately does not re-sort, because a trophy count is a thing you look up
// against the order you already know rather than a second ranking.
const MODES = [
  {
    id: "ppr", label: "PPR", sort: r => r.avg,
    spot1: r => r.avg.toFixed(1),
    spot2: r => (r.last != null ? `Last ${r.last}` : null),
  },
  {
    id: "last", label: "Last race", sort: r => (r.last == null ? -1 : r.last),
    spot1: r => (r.last == null ? "\u2013" : r.last),
    spot2: r => `Total ${r.pts}`,
  },
  {
    id: "overall", label: "Overall", sort: r => r.pts,
    spot1: r => r.pts,
    spot2: r => (r.last != null ? `Last ${r.last}` : null),
  },
  {
    id: "trophies", label: "Trophies", sort: null,
    spot1: null,                                    // drawn, not a number
    spot2: r => `${r.avg.toFixed(1)} PPR`,
  },
];

const markFor = place =>
  place === 1 ? "\u{1F3C6}" : place === 2 ? "\u{1F948}" : place === 3 ? "\u{1F949}" : null;

function Stat({ k, place, v }) {
  return (
    <div style={body("bodySm", { fontSize: 15, color: V.text2, lineHeight: 1.55, whiteSpace: "nowrap" })}>
      {k}: <strong style={{ color: V.text }}>{ordinal(place)}</strong> ({v})
    </div>
  );
}

function YouAre({ row, place, total }) {
  if (!row) return null;
  return (
    <div style={{ ...card({ padding: 16, marginBottom: 20 }), ...edgeGlow(V.blue, 0.8) }}>
      <div style={label({ color: V.blue, fontSize: 15, marginBottom: 12 })}>Your season so far</div>
      {/* No face. The avatar is already on your row in the table below and in
          the header, and this box has four lines and a trophy case to fit. */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Flagged name={row.name} nation={row.nation} size={19}
            style={display("h3", {
              // The trophy case takes a fixed column, so the name is what gives
              // on a narrow phone rather than being clipped.
              fontSize: "clamp(18px, 5.1vw, 23px)",
              lineHeight: 1.3, color: V.text,
            })} />
          {/* Place first on every line, since that is the comparison. */}
          <Stat k="Overall" place={place} v={`${row.avg.toFixed(1)} avg`} />
          {row.lastPlace != null && (
            <Stat k="Last race" place={row.lastPlace} v={`${row.last} pts`} />
          )}
          {row.formRaces > 0 && (
            <Stat k={`Last ${row.formRaces}`} place={row.formRank} v={`${row.formAvg.toFixed(1)} avg`} />
          )}
        </div>

        {/* The trophy case, in the order the finishes happened. */}
        {row.finishes.length > 0 && (
          <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 5 }}>
            <div style={label({ color: V.blue, fontSize: 12, marginBottom: 2 })}>Trophy case</div>
            {row.finishes.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
                {markFor(f.place)
                  ? <span style={{ fontSize: 22, lineHeight: 1.1, width: 24, textAlign: "center" }}>{markFor(f.place)}</span>
                  : <span style={{ width: 24, display: "flex", justifyContent: "center" }}>
                      <span style={{ width: 11, height: 11, borderRadius: "50%", background: V.blue, boxShadow: `0 0 6px ${V.blue}90` }} />
                    </span>}
                <span style={{
                  fontFamily: FD, fontWeight: 700, fontSize: 15, color: V.text,
                  minWidth: 26,
                }}>P{f.place}</span>
                <span style={{
                  fontFamily: FD, fontWeight: 600, fontSize: 15, color: V.text2,
                }}>{f.where}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// What the last scored race did to this place. Up is green, down is pink, and
// a place that held still says nothing at all rather than printing a zero.
function Move({ n }) {
  if (!n) return null;
  const up = n > 0;
  const c = up ? V.green : V.pink;
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center", gap: 2,
      marginTop: 1,
    }}>
      <span style={{ fontSize: 9, lineHeight: 1, color: c }}>{up ? "\u25B2" : "\u25BC"}</span>
      <span style={numeric("chip", { fontSize: 12, color: c })}>{Math.abs(n)}</span>
    </div>
  );
}

// Every trophy a player has, in the column where a number usually sits. Gold,
// silver and bronze get their mark; a top ten that was not a podium gets a dot,
// so nothing is counted twice.
function TrophyRow({ row }) {
  const marks = row.finishes.map((f, i) => (
    markFor(f.place)
      ? <span key={i} title={`P${f.place} ${f.where}`}
          style={{ fontSize: 15, lineHeight: 1 }}>{markFor(f.place)}</span>
      : <span key={i} title={`P${f.place} ${f.where}`}
          style={{ width: 8, height: 8, borderRadius: "50%", background: V.blue,
            boxShadow: `0 0 5px ${V.blue}90`, display: "inline-block" }} />
  ));
  if (!marks.length) {
    return <div style={{ ...body("bodySm", { fontSize: 13, color: V.text3 }) }}>&ndash;</div>;
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center",
      alignItems: "center", minHeight: 26 }}>{marks}</div>
  );
}

function Row({ row, place, mine, move, mode }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "8px 10px", borderRadius: 14, marginBottom: 6,
      background: mine ? "rgba(0,217,255,0.07)" : V.bg2,
      border: `1px solid ${mine ? V.blue : V.border}`,
    }}>
      <div style={{ flexShrink: 0, textAlign: "center" }}>
        <div style={numeric("stat", { fontSize: 21, color: V.text2 })}>P{place}</div>
        <Move n={move} />
      </div>
      <Face name={row.name} photo={row.photo} size={42} />

      {/* Who they are. */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Flagged name={row.name} nation={row.nation}
          style={display("h3", {
            fontSize: NAME_SIZE, lineHeight: 1.35, color: mine ? V.blue : V.text,
            letterSpacing: "0.01em",
          })} />
        <div style={{
          fontFamily: FD, fontWeight: 600, fontSize: TEAM_SIZE, letterSpacing: "0.01em",
          textTransform: "uppercase", color: V.text2, marginTop: 1, minWidth: 0,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{row.teamName || "No team"}</div>
      </div>

      {/* How they are scoring, in whichever way the table is being read.
          Right aligned against the edge of the row rather than centred in a box
          of its own. A centred number leaves dead space on its right that no
          name can use, and the names are what needed the room. */}
      <div style={{ flexShrink: 0, textAlign: "right",
        minWidth: mode.id === "trophies" ? 92 : 40 }}>
        {mode.id === "trophies"
          ? <TrophyRow row={row} />
          : <div style={numeric("stat", { fontSize: 26, color: V.text,
              ...textGlow(V.blue, 0.7) })}>{mode.spot1(row)}</div>}
        {mode.spot2(row) && (
          <div style={{
            fontFamily: FD, fontWeight: 600, fontSize: 13, letterSpacing: "0.04em",
            textTransform: "uppercase", color: V.text2, marginTop: 1, whiteSpace: "nowrap",
          }}>{mode.spot2(row)}</div>
        )}
      </div>

    </div>
  );
}

export default function PlayersPage({ currentUser }) {
  const [state, setState] = useState({ loading: true });
  const [modeId, setModeId] = useState("ppr");

  useEffect(() => {
    (async () => {
      try {
        const [players, teams, races, scores] = await Promise.all([
          supabase.from("players").select("id,name,photo_url,nation"),
          supabase.from("teams").select("*"),
          supabase.from("races").select("*"),
          supabase.from("scores").select("*"),
        ]).then(rs => rs.map(r => r.data || []));

        const rows = buildPlayerTable({ players, teams, races, scores });
        const place = placesBy(rows, r => r.avg);

        // Where everyone stood before the last scored race, so the row can say
        // what that race moved. The same table built without it: two orders out
        // of one set of rules rather than a second copy of the ranking.
        const roundOf = Object.fromEntries(races.map(r => [r.id, r.round]));
        const scoredIds = [...new Set(scores.map(s => s.race_id))]
          .filter(id => roundOf[id] != null).sort((a, b) => roundOf[a] - roundOf[b]);
        // One scored race is nothing to have moved from. The table before it has
        // all 48 level on nought, so everybody would read as climbing.
        const move = {};
        if (scoredIds.length > 1) {
          const lastId = scoredIds[scoredIds.length - 1];
          const wasPlace = placesBy(
            buildPlayerTable({ players, teams, races, scores: scores.filter(s => s.race_id !== lastId) }),
            r => r.avg);
          rows.forEach(r => { move[r.id] = (wasPlace[r.id] || place[r.id]) - place[r.id]; });
        }
        setState({ loading: false, rows, place, move });
      } catch (e) {
        console.error(e);
        setState({ loading: false, error: true });
      }
    })();
  }, []);

  // No auto scroll. The page opens at the top and stays there.

  if (state.loading) return <div style={{ ...WRAP, paddingTop: 60, ...body("body", { color: V.text2 }) }}>Loading</div>;
  if (state.error) return <div style={{ ...WRAP, paddingTop: 60, ...body("body", { color: V.text2 }) }}>Standings did not load.</div>;

  const { rows, place, move } = state;
  const me = rows.find(r => r.name === currentUser);
  const mode = MODES.find(m => m.id === modeId) || MODES[0];

  // Trophies keeps the PPR order and the PPR places on purpose. Every other
  // mode re-sorts on what it is showing, and P1 is whoever leads that column.
  const shown = mode.sort
    ? [...rows].sort((a, b) => mode.sort(b) - mode.sort(a) || a.name.localeCompare(b.name))
    : rows;
  const shownPlace = mode.sort ? placesBy(shown, mode.sort) : place;

  return (
    <div style={{ background: V.bg, minHeight: "100vh" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Monoton&family=Encode+Sans+Semi+Condensed:wght@400;600;700&family=Chakra+Petch:wght@600;700&display=swap');`}</style>
      <div style={WRAP}>
        <Title />
        <YouAre row={me} place={me ? place[me.id] : 0} total={rows.length} />

        {/* How to read the table. Same pill as the toggles everywhere else, and
            it sits above P1 because it changes what P1 means. */}
        <div className="v-scroll" style={{ display: "flex", gap: 6, overflowX: "auto",
          padding: "0 0 10px" }}>
          {MODES.map(m => (
            <button key={m.id} onClick={() => setModeId(m.id)} style={{
              flexShrink: 0, ...label({ fontSize: 11,
                color: modeId === m.id ? V.bg : V.blue }),
              background: modeId === m.id ? V.blue : "transparent",
              border: `1px solid ${V.blue}`, borderRadius: 999,
              padding: "6px 13px", cursor: "pointer",
            }}>{m.label}</button>
          ))}
        </div>

        {shown.map(r => (
          <Row key={r.id} row={r} place={shownPlace[r.id]} mine={me && r.id === me.id}
               move={mode.id === "ppr" ? move[r.id] : undefined} mode={mode} />
        ))}

        <div style={body("bodySm", { color: V.text2, textAlign: "center", padding: "6px 0 0" })}>
          {mode.id === "trophies"
            ? "Trophies, in the order they happened, against the points-a-race order."
            : mode.id === "last"
              ? "Ranked on the last race that was scored."
              : mode.id === "overall"
                ? "Ranked on total points across all 23 rounds."
                : "Ranked on points a race. The individual game runs all 23 rounds and does not reset at the half."}
        </div>
      </div>
    </div>
  );
}
