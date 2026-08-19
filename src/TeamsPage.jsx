import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { V, FM, FD, FN, FB, display, numeric, label, body, card, textGlow, edgeGlow } from "./theme.vegas";
import { buildTeamTable, rankByAverage, nextFixtures, ordinal, FIRST_H2_ROUND } from "./teamTable";

// The team standings, second half. Deliberately thin: position, who you are,
// your record, who you play next, and the number that decides the title.
// Everything else that used to be on this page moved to the team page, which
// does not exist yet.

const WRAP = { maxWidth: 480, margin: "0 auto", padding: "0 16px 96px" };

// TEMPORARY. A font picker so the display face can be judged on the real page
// with the real names, rather than in a specimen. Delete FACES, FacePicker and
// every f5d className once the face is chosen and FD is set in theme.vegas.js.
const FACES = [
  ["Saira Semi Condensed", "the one you liked"],
  ["Saira Condensed", "narrower sibling"],
  ["Kanit", "sporty, heavier"],
  ["Encode Sans Semi Condensed", "closest cousin"],
  ["Fira Sans Condensed", "warmer"],
  ["IBM Plex Sans Condensed", "engineered"],
  ["Roboto Condensed", "the default one"],
  ["Asap Condensed", "softer corners"],
  ["Archivo Narrow", "narrow grotesque"],
  ["Oxanium", "technical"],
  ["Bai Jamjuree", "squared, like Chakra"],
];
const FACE_IMPORT = FACES.map(([f]) => `family=${f.replace(/ /g, "+")}:wght@600;700`).join("&");

function FacePicker({ face, onPick }) {
  return (
    <div style={{ ...card({ padding: 14, marginTop: 8 }), border: `1px dashed ${V.border2}` }}>
      <div style={label({ color: V.amber, marginBottom: 10 })}>Font picker (temporary)</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        {FACES.map(([f, note]) => {
          const on = f === face;
          return (
            <button key={f} onClick={() => onPick(f)} style={{
              padding: "7px 11px", borderRadius: 10, cursor: "pointer",
              background: on ? "rgba(0,217,255,0.12)" : V.bg3,
              border: `1px solid ${on ? V.blue : V.border}`,
              fontFamily: `'${f}', sans-serif`, fontWeight: 600, fontSize: 15,
              lineHeight: 1.35, color: on ? V.blue : V.text2,
            }}>{f}</button>
          );
        })}
      </div>
      <div style={body("bodySm", { color: V.text3, marginTop: 10 })}>
        Showing <strong style={{ color: V.text2 }}>{face}</strong>. It changes the team names and the rank line, which is where the face has to work hardest.
      </div>
    </div>
  );
}

// Monoton is the marquee face and gets wide fast, so the title sets one word
// per line rather than wrapping mid-word at phone width.
function Title() {
  return (
    <div style={{ padding: "26px 0 18px" }}>
      {["TEAM", "STANDINGS"].map((word, i) => (
        <div key={word} style={{
          fontFamily: FM, fontWeight: 400, lineHeight: 1.12,
          fontSize: i === 0 ? 42 : 34, letterSpacing: "0.02em",
          ...textGlow(i === 0 ? V.blue : V.pink),
        }}>{word}</div>
      ))}
    </div>
  );
}

// The one personalised thing on the page. Before a second-half race is scored
// there is no place and no points to report, so it falls back to where the team
// ranks on first-half scoring average, which is the only form line that exists.
function YourTeam({ row, place, avgRank, played }) {
  if (!row) return null;
  const started = played > 0;
  return (
    <div style={{ ...card({ padding: 16, marginBottom: 20 }), ...edgeGlow(V.blue, 0.8) }}>
      <div style={label({ color: V.blue, marginBottom: 8 })}>Your team</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {row.logo && <img src={row.logo} alt="" style={{ width: 44, height: 44, objectFit: "contain", flexShrink: 0 }} />}
        <div style={{ minWidth: 0 }}>
          <div className="f5d" style={display("h3", { lineHeight: 1.35, color: V.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" })}>{row.name}</div>
          <div style={body("bodySm", { color: V.text2, marginTop: 3 })}>
            {started ? (
              <>Sitting <strong style={{ color: V.text }}>{ordinal(place)}</strong> with <strong style={{ color: V.text }}>{row.pts}</strong> {row.pts === 1 ? "point" : "points"}.</>
            ) : (
              <>Ranked <strong style={{ color: V.text }}>{ordinal(avgRank)}</strong> of 24 on scoring average.</>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// A record with no draws does not need a third number. 6-5 says what 6-5-0 says.
const rec = s => (s.d > 0 ? `${s.w}-${s.l}-${s.d}` : `${s.w}-${s.l}`);

function Row({ row, pos, mine, record, rank, nextOpp, nextOppRank }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 9,
      padding: "8px 11px", borderRadius: 14, marginBottom: 6,
      background: mine ? "rgba(0,217,255,0.07)" : V.bg2,
      border: `1px solid ${mine ? V.blue : V.border}`,
    }}>
      <div style={numeric("stat", { fontSize: 22, color: V.text2, flexShrink: 0 })}>P{pos}</div>
      {row.logo
        ? <img src={row.logo} alt="" style={{ width: 58, height: 58, objectFit: "contain", flexShrink: 0 }} />
        : <div style={{ width: 58, height: 58, flexShrink: 0 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 7, alignItems: "baseline" }}>
          {/* lineHeight has to clear the descenders. TYPE.h3 sets 1.05, which is
              fine for a heading and wrong inside overflow:hidden: the box is
              shorter than the glyphs and the tail of every g and y gets cut. */}
          <span className="f5d" style={display("h3", { fontSize: 21, lineHeight: 1.35, color: mine ? V.blue : V.text, letterSpacing: "0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" })}>{row.short}</span>
          {/* Season record, not the half. The team game's points reset at the
              break; what a team has won across the year does not. */}
          <span style={body("body", { color: V.text2, fontVariantNumeric: "tabular-nums", flexShrink: 0 })}>{record}</span>
        </div>
        {nextOpp && (
          <div className="f5d" style={{ fontFamily: FD, fontWeight: 600, fontSize: 15, letterSpacing: "0.04em", color: V.text3, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {/* Both ranks are on scoring average across all 24 teams, never
                within a division. A place in this table is noise while
                everybody is level on nought. */}
            <span style={{ color: V.text2 }}>#{rank}</span> VS {nextOppRank ? `#${nextOppRank} ` : ""}{nextOpp}
          </div>
        )}
      </div>
      <div style={numeric("stat", { fontSize: 32, color: V.text, flexShrink: 0, ...(row.pts > 0 ? textGlow(V.blue, 0.7) : {}) })}>{row.pts}</div>
    </div>
  );
}

export default function TeamsPage({ currentUser }) {
  const [state, setState] = useState({ loading: true });
  // TEMPORARY, goes with FacePicker.
  // ?face=Oswald opens on one, so a look can be shared as a link.
  const [face, setFace] = useState(() => {
    const q = new URLSearchParams(window.location.search).get("face");
    return FACES.some(([f]) => f === q) ? q : FACES[0][0];
  });

  useEffect(() => {
    (async () => {
      try {
        const [teams, races, scores, schedule, players] = await Promise.all([
          supabase.from("teams").select("*"),
          supabase.from("races").select("*"),
          supabase.from("scores").select("*"),
          supabase.from("schedule").select("*"),
          supabase.from("players").select("id,name"),
        ]).then(rs => rs.map(r => r.data || []));

        const db = { teams, races, scores, schedule };

        // Two tables, because the two halves of the page count different things.
        // Championship points are the second half only: the team game resets at
        // the break. Records and scoring average run the whole season, because
        // what a team has won across the year does not reset.
        const season = buildTeamTable(db, { fromRound: 1, toRound: 99 });
        const seasonOf = Object.fromEntries(season.map(r => [r.id, r]));

        // Scoring-average rank is across all 24 teams, never within a division.
        const avgRankOf = Object.fromEntries(rankByAverage(season).map(r => [r.id, r.avgRank]));

        // Seeded on season average so the table has a real order on the morning
        // of round 12, when every team is on nought points.
        const seed = Object.fromEntries(season.map(r => [r.id, r.avg]));
        const rows = buildTeamTable(db, { fromRound: FIRST_H2_ROUND, toRound: 99, seed });
        const fixtures = nextFixtures(db);

        const me = players.find(p => p.name === currentUser);
        const myTeam = me ? teams.find(t => t.player1_id === me.id || t.player2_id === me.id) : null;

        setState({ loading: false, rows, seasonOf, avgRankOf, fixtures, myTeamId: myTeam ? myTeam.id : null, teams });
      } catch (e) {
        console.error(e);
        setState({ loading: false, error: true });
      }
    })();
  }, [currentUser]);

  if (state.loading) return <div style={{ ...WRAP, paddingTop: 60, ...body("body", { color: V.text3 }) }}>Loading</div>;
  if (state.error) return <div style={{ ...WRAP, paddingTop: 60, ...body("body", { color: V.text3 }) }}>Standings did not load.</div>;

  const { rows, seasonOf, avgRankOf, fixtures, myTeamId } = state;
  const byId = Object.fromEntries(rows.map(r => [r.id, r]));
  const mine = rows.find(r => r.id === myTeamId);

  const groups = [
    { key: "championship", name: "Championship", color: V.gold },
    { key: "second", name: "Second Division", color: V.silver },
  ];

  return (
    <div style={{ background: V.bg, minHeight: "100vh" }}>
      {/* The Vegas faces load here rather than in the app shell, so the pages
          still on the light theme do not pay for three families they never set. */}
      {/* The candidate faces load with the page while the picker is up. When it
          goes, this comes back to Monoton plus whichever face won. */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Monoton&${FACE_IMPORT}&display=swap');
        .f5d { font-family: '${face}', sans-serif !important; }`}</style>
      <div style={WRAP}>
        <Title />

        <YourTeam
          row={mine}
          place={mine ? rows.filter(r => r.division === mine.division).findIndex(r => r.id === mine.id) + 1 : 0}
          avgRank={mine ? avgRankOf[mine.id] : 0}
          played={mine ? mine.played : 0}
        />

        {groups.map(g => {
          const list = rows.filter(r => r.division === g.key);
          if (!list.length) return null;
          // Teams level on points share a position. Before a second-half race
          // is scored that is all 24 of them, and numbering them 1 to 12 down
          // the page claims an order nobody has played for.
          const posOf = {};
          list.forEach((r, i) => {
            posOf[r.id] = (i > 0 && list[i - 1].pts === r.pts) ? posOf[list[i - 1].id] : i + 1;
          });
          return (
            <div key={g.key} style={{ marginBottom: 26 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 2px 10px" }}>
                <span style={{ width: 10, height: 10, borderRadius: 5, background: g.color, flexShrink: 0 }} />
                <span style={label({ color: g.color })}>{g.name}</span>
              </div>
              {list.map((r, i) => {
                const oppId = fixtures.opponentOf[r.id];
                const opp = oppId ? byId[oppId] : null;
                return (
                  <Row
                    key={r.id} row={r} pos={posOf[r.id]} mine={r.id === myTeamId}
                    record={rec(seasonOf[r.id])}
                    rank={avgRankOf[r.id]}
                    nextOpp={opp ? opp.code : null}
                    nextOppRank={opp ? avgRankOf[opp.id] : null}
                  />
                );
              })}
            </div>
          );
        })}

        {rows.every(r => r.played === 0) && (
          <div style={body("bodySm", { color: V.text3, textAlign: "center", padding: "2px 0 10px" })}>
            No second-half race scored yet, so everyone is level and the order is scoring average.
          </div>
        )}

        <FacePicker face={face} onPick={setFace} />

        {fixtures.race && (
          <div style={body("bodySm", { color: V.text3, textAlign: "center", padding: "0 0 8px" })}>
            Next up: round {fixtures.race.round}, {fixtures.race.race_name}.
          </div>
        )}
      </div>
    </div>
  );
}
