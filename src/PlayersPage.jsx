import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
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
const TITLE_SIZE = titleFit("PLAYER STANDINGS", { fill: 0.72, min: 15 });
const TEAM_SIZE = "clamp(13px, 3.5vw, 14px)";
// Real names are longer than team short names, and 48 of them set the budget:
// at 19px two of them run past the column and at 21px ten do. Measured across
// all 48 rather than eyeballed off the top of the table.
const NAME_SIZE = "clamp(15px, calc(9.55vw - 22.0px), 19px)";

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

// The mark a finish earns. Anything in the top ten is worth showing; only the
// first three get metal.
const markFor = place =>
  place === 1 ? "\u{1F3C6}" : place === 2 ? "\u{1F948}" : place === 3 ? "\u{1F949}" : null;

function YouAre({ row, place, total }) {
  if (!row) return null;
  return (
    <div style={{ ...card({ padding: 16, marginBottom: 20 }), ...edgeGlow(V.blue, 0.8) }}>
      <div style={label({ color: V.blue, marginBottom: 10 })}>Your season</div>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <Face name={row.name} photo={row.photo} size={44} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={display("h3", {
            lineHeight: 1.3, color: V.text,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          })}>{row.name}</div>
          <div style={body("bodySm", { fontSize: 13, color: V.text2, marginTop: 4, lineHeight: 1.55, whiteSpace: "nowrap" })}>
            You&rsquo;re <strong style={{ color: V.text }}>{ordinal(place)}</strong> of {total} overall
          </div>
          {row.last != null && (
            <div style={body("bodySm", { fontSize: 13, color: V.text2, lineHeight: 1.55, whiteSpace: "nowrap" })}>
              Last race: <strong style={{ color: V.text }}>{row.last}</strong>
              {row.lastPlace ? ` (P${row.lastPlace})` : ""}
            </div>
          )}
          {row.formRaces > 0 && (
            <div style={body("bodySm", { fontSize: 13, color: V.text2, lineHeight: 1.55, whiteSpace: "nowrap" })}>
              Last {row.formRaces}: <strong style={{ color: V.text }}>{row.formAvg.toFixed(1)}</strong>
              {row.formRank ? ` (P${row.formRank})` : ""}
            </div>
          )}
        </div>

        {/* The trophy case, in the order the finishes happened. */}
        {row.finishes.length > 0 && (
          <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: 3 }}>
            {row.finishes.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
                {markFor(f.place)
                  ? <span style={{ fontSize: 14, lineHeight: 1.2 }}>{markFor(f.place)}</span>
                  : <span style={{ width: 8, height: 8, borderRadius: "50%", background: V.text2 }} />}
                <span style={{
                  fontFamily: FD, fontWeight: 700, fontSize: 13, color: V.text,
                  minWidth: 22,
                }}>P{f.place}</span>
                <span style={{
                  fontFamily: FD, fontWeight: 600, fontSize: 13, color: V.text2,
                }}>{f.where}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ row, place, mine, innerRef }) {
  return (
    <div ref={innerRef} style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "8px 10px", borderRadius: 14, marginBottom: 6,
      background: mine ? "rgba(0,217,255,0.07)" : V.bg2,
      border: `1px solid ${mine ? V.blue : V.border}`,
    }}>
      <div style={numeric("stat", { fontSize: 21, color: V.text2, flexShrink: 0 })}>P{place}</div>
      <Face name={row.name} photo={row.photo} size={42} />

      {/* Who they are. */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={display("h3", {
          fontSize: NAME_SIZE, lineHeight: 1.35, color: mine ? V.blue : V.text,
          letterSpacing: "0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        })}>{row.name}</div>
        <div style={{
          fontFamily: FD, fontWeight: 600, fontSize: TEAM_SIZE, letterSpacing: "0.01em",
          textTransform: "uppercase", color: V.text2, marginTop: 1, minWidth: 0,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{row.teamName || "No team"}</div>
      </div>

      {/* How they are scoring. */}
      <div style={{ flexShrink: 0, width: 56, textAlign: "center" }}>
        <div style={numeric("stat", { fontSize: 26, color: V.text, ...textGlow(V.blue, 0.7) })}>{row.avg.toFixed(1)}</div>
        {row.last != null && (
          <div style={{
            fontFamily: FD, fontWeight: 600, fontSize: 13, letterSpacing: "0.04em",
            textTransform: "uppercase", color: V.text2, marginTop: 1, whiteSpace: "nowrap",
          }}>Last {row.last}</div>
        )}
      </div>

    </div>
  );
}

export default function PlayersPage({ currentUser }) {
  const [state, setState] = useState({ loading: true });
  const mineRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const [players, teams, races, scores] = await Promise.all([
          supabase.from("players").select("id,name,photo_url"),
          supabase.from("teams").select("*"),
          supabase.from("races").select("*"),
          supabase.from("scores").select("*"),
        ]).then(rs => rs.map(r => r.data || []));

        const rows = buildPlayerTable({ players, teams, races, scores });
        setState({ loading: false, rows, place: placesBy(rows, r => r.avg) });
      } catch (e) {
        console.error(e);
        setState({ loading: false, error: true });
      }
    })();
  }, []);

  // Land on your own row. In a list of 48 the thing you came to look at is
  // yourself, and it is usually below the fold.
  useEffect(() => {
    if (state.loading || !mineRef.current) return;
    const t = setTimeout(() => {
      mineRef.current && mineRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 260);
    return () => clearTimeout(t);
  }, [state.loading]);

  if (state.loading) return <div style={{ ...WRAP, paddingTop: 60, ...body("body", { color: V.text2 }) }}>Loading</div>;
  if (state.error) return <div style={{ ...WRAP, paddingTop: 60, ...body("body", { color: V.text2 }) }}>Standings did not load.</div>;

  const { rows, place } = state;
  const me = rows.find(r => r.name === currentUser);

  return (
    <div style={{ background: V.bg, minHeight: "100vh" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Monoton&family=Encode+Sans+Semi+Condensed:wght@400;600;700&family=Chakra+Petch:wght@600;700&display=swap');`}</style>
      <div style={WRAP}>
        <Title />
        <YouAre row={me} place={me ? place[me.id] : 0} total={rows.length} />

        {rows.map(r => (
          <Row key={r.id} row={r} place={place[r.id]} mine={me && r.id === me.id}
               innerRef={me && r.id === me.id ? mineRef : null} />
        ))}

        <div style={body("bodySm", { color: V.text2, textAlign: "center", padding: "6px 0 0" })}>
          Ranked on points a race. The individual game runs all 23 rounds and does not reset at the half.
        </div>
      </div>
    </div>
  );
}
