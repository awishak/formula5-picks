import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { V, FM, FD, FN, FB, display, numeric, label, body, card, textGlow, edgeGlow, titleFit, titleBox } from "./theme.vegas";
import { buildTeamTable, rankByAverage, nextFixtures, ordinal, FIRST_H2_ROUND } from "./teamTable";
import { displayOf } from "./teams";

// The team standings, second half. Deliberately thin: position, who you are,
// your record, who you play next, and the number the title is won on.
// Everything else that used to be on this page moved to the team page, which
// does not exist yet.

const WRAP = { maxWidth: 480, margin: "0 auto", padding: "0 16px 96px" };

// The name column is whatever is left after P1, a 58px logo, the gaps and the
// points, which works out at roughly the viewport minus 218px. The longest name
// costs about 7.6px per point of type in Encode, so the size that just fits is
// (viewport - 218) / 7.6. Written as a clamp it holds 23px on a 393 phone and
// steps down rather than cutting "HomeworkTubes" in half on a narrower one.
// Below about 350px it gives up and ellipsises, which is the right trade for a
// phone almost nobody in the league is carrying.
// Same budget as the players page: full team names against the room a row
// leaves after the place, the logo and the number.
// Line one is the team name on its own now, so it has the room the old
// shared-with-the-record version did not.
const NAME_SIZE = "clamp(15px, calc(10.0vw - 21.0px), 19px)";

const TITLE_SIZE = titleFit("TEAM STANDINGS");

function Title() {
  return (
    <div style={titleBox({ padding: "14px 0 18px" })}>
      <div style={{
        fontFamily: FM, fontWeight: 400, fontSize: TITLE_SIZE,
        lineHeight: 1.15, letterSpacing: "0.02em", whiteSpace: "nowrap",
      }}>
        <span style={textGlow(V.pink)}>TEAM</span>{" "}
        <span style={textGlow(V.blue)}>STANDINGS</span>
      </div>
    </div>
  );
}

const DIV_NAME = { championship: "Championship Division", second: "Second Division" };

const initialsOf = name =>
  (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

const colorOf = (name) => {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 62% 52%)`;
};

function Face({ name, photo, size }) {
  const st = { width: size, height: size, borderRadius: "50%", flexShrink: 0 };
  if (photo) return <img src={photo} alt="" style={{ ...st, objectFit: "cover" }} />;
  return (
    <div style={{
      ...st, background: colorOf(name), display: "flex",
      alignItems: "center", justifyContent: "center",
      fontFamily: FD, fontWeight: 700, fontSize: size * 0.36, color: "#fff",
    }}>{initialsOf(name)}</div>
  );
}

// Form: the last five weeks, oldest first. A won week is blue, a lost one pink,
// a draw grey. A box around the letter means the week turned on BOX BOX: the
// drivers alone were within its six points of swing.
//
// Five rather than ten because ten wrapped onto a second line beside the
// teammate, and a run of results that wraps stops reading as a run.
function Form({ weeks }) {
  const last = weeks.slice(-5);
  if (!last.length) return null;
  return (
    <div style={{ display: "flex", gap: 5, marginTop: 6 }}>
      {last.map((w, i) => {
        const letter = w.won === true ? "W" : w.won === false ? "L" : "D";
        const color = w.won === true ? V.blue : w.won === false ? V.pink : V.silver;
        const boxed = w.decidedByBoxBox;
        return (
          <div key={i} title={`Round ${w.round}`} style={{
            width: 26, height: 26, borderRadius: 7,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: `1.5px solid ${boxed ? color : "transparent"}`,
            background: boxed ? `${color}18` : "transparent",
            fontFamily: FD, fontWeight: 700, fontSize: 15,
            ...textGlow(color, w.won === true ? 0.6 : 0.35),
          }}>{letter}</div>
        );
      })}
    </div>
  );
}

// The one personalised thing on the page: where your team stands, how it has
// been scoring, how the last ten weeks went, and who you are doing it with.
function YourTeam({ row, season, place, avgRank, teammate }) {
  if (!row) return null;
  return (
    <div style={{ ...card({ padding: 16, marginBottom: 20 }), ...edgeGlow(V.blue, 0.8) }}>
      <div style={label({ color: V.blue, fontSize: 15, marginBottom: 12 })}>Your team&rsquo;s season so far</div>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {row.logo && <img src={row.logo} alt="" style={{ width: 42, height: 42, objectFit: "contain", flexShrink: 0 }} />}
            <div style={display("h3", {
              fontSize: "clamp(17px, 5.1vw, 23px)", lineHeight: 1.3, color: V.text,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            })}>{displayOf(row.name)}</div>
          </div>
          <div style={body("bodySm", { fontSize: 15, color: V.text2, lineHeight: 1.55, marginTop: 8, whiteSpace: "nowrap" })}>
            Overall: <strong style={{ color: V.text }}>P{place}</strong> in {DIV_NAME[row.division] || "the league"}
          </div>
          <div style={body("bodySm", { fontSize: 15, color: V.text2, lineHeight: 1.55, whiteSpace: "nowrap" })}>
            Scoring average: <strong style={{ color: V.text }}>{ordinal(avgRank)}</strong> ({season.avg.toFixed(1)})
          </div>
          <div style={{ marginTop: 10 }}>
            <span style={{
              fontFamily: FD, fontWeight: 700, fontSize: 13, letterSpacing: "0.1em",
              textTransform: "uppercase", color: V.text2,
            }}>Form</span>
          </div>
          <Form weeks={season.weeks} />
        </div>

        {teammate && (
          <div style={{ flexShrink: 0, textAlign: "center", width: 74 }}>
            <div style={label({ color: V.blue, fontSize: 12, marginBottom: 6 })}>Teammate</div>
            <Face name={teammate.name} photo={teammate.photo_url} size={46} />
            <div style={{
              fontFamily: FD, fontWeight: 600, fontSize: 13, color: V.text2,
              lineHeight: 1.3, marginTop: 5,
            }}>{teammate.name.split(" ")[0]}<br />{teammate.name.split(" ").slice(1).join(" ")}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// A record with no draws does not need a third number. 6-5 carries the same as 6-5-0.
const rec = s => (s.d > 0 ? `${s.w}-${s.l}-${s.d}` : `${s.w}-${s.l}`);

function Row({ row, pos, mine, record, rank, nextOpp, nextOppRank }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "8px 10px", borderRadius: 14, marginBottom: 6,
      background: mine ? "rgba(0,217,255,0.07)" : V.bg2,
      border: `1px solid ${mine ? V.blue : V.border}`,
    }}>
      <div style={numeric("stat", { fontSize: 21, color: V.text2, flexShrink: 0 })}>P{pos}</div>
      {row.logo
        ? <img src={row.logo} alt="" style={{ width: 46, height: 46, objectFit: "contain", flexShrink: 0 }} />
        : <div style={{ width: 46, height: 46, flexShrink: 0 }} />}
      {/* Same shape as a player row: the name owns the first line, everything
          that supports it goes on the second. That is what gives a full team
          name the room to stay whole. */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={display("h3", {
          fontSize: NAME_SIZE, lineHeight: 1.35, color: mine ? V.blue : V.text,
          letterSpacing: "0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        })}>{displayOf(row.name)}</div>
        <div style={{
          display: "flex", gap: 8, alignItems: "baseline", marginTop: 1,
          whiteSpace: "nowrap", overflow: "hidden",
        }}>
          {/* Season record, not the half. The team game's points reset at the
              break; what a team has won across the year does not. */}
          <span style={body("bodySm", { color: V.text2, fontVariantNumeric: "tabular-nums", flexShrink: 0 })}>{record}</span>
          {nextOpp && (
            <span style={{
              fontFamily: FD, fontWeight: 600, fontSize: 13, letterSpacing: "0.04em",
              textTransform: "uppercase", color: V.text2, flexShrink: 0,
            }}>
              {/* Both ranks are on scoring average across all 24 teams, never
                  within a division. A place in this table is noise while
                  everybody is level on nought. */}
              #{rank} VS {nextOppRank ? `#${nextOppRank} ` : ""}{nextOpp}
            </span>
          )}
        </div>
      </div>
      <div style={numeric("stat", { fontSize: 28, color: V.text, flexShrink: 0, width: 56, textAlign: "center", ...textGlow(V.blue, 0.7) })}>{row.pts}</div>
    </div>
  );
}

export default function TeamsPage({ currentUser }) {
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    (async () => {
      try {
        const [teams, races, scores, schedule, players] = await Promise.all([
          supabase.from("teams").select("*"),
          supabase.from("races").select("*"),
          supabase.from("scores").select("*"),
          supabase.from("schedule").select("*"),
          supabase.from("players").select("id,name,photo_url"),
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
        // The other seat on your team.
        const mateId = myTeam ? [myTeam.player1_id, myTeam.player2_id].find(id => id !== me.id) : null;
        const teammate = mateId ? players.find(p => p.id === mateId) || null : null;

        setState({ loading: false, rows, seasonOf, avgRankOf, fixtures, teammate, myTeamId: myTeam ? myTeam.id : null, teams });
      } catch (e) {
        console.error(e);
        setState({ loading: false, error: true });
      }
    })();
  }, [currentUser]);

  // No auto scroll. The page opens at the top and stays there.

  if (state.loading) return <div style={{ ...WRAP, paddingTop: 60, ...body("body", { color: V.text2 }) }}>Loading</div>;
  if (state.error) return <div style={{ ...WRAP, paddingTop: 60, ...body("body", { color: V.text2 }) }}>Standings did not load.</div>;

  const { rows, seasonOf, avgRankOf, fixtures, teammate, myTeamId } = state;
  const byId = Object.fromEntries(rows.map(r => [r.id, r]));
  const mine = rows.find(r => r.id === myTeamId);

  // Positions share on level points, worked out once so the personal box and
  // the table cannot disagree. Everybody on nought is everybody in first.
  const posOf = {};
  ["championship", "second"].forEach(div => {
    const list = rows.filter(r => r.division === div);
    list.forEach((r, i) => {
      posOf[r.id] = (i > 0 && list[i - 1].pts === r.pts) ? posOf[list[i - 1].id] : i + 1;
    });
  });

  const groups = [
    { key: "championship", name: "Championship", color: V.gold },
    { key: "second", name: "Second Division", color: V.silver },
  ];

  return (
    <div style={{ background: V.bg, minHeight: "100vh" }}>
      {/* The Vegas faces load here rather than in the app shell, so the pages
          still on the light theme do not pay for families they never set. */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Monoton&family=Encode+Sans+Semi+Condensed:wght@400;600;700&family=Chakra+Petch:wght@600;700&display=swap');`}</style>
      <div style={WRAP}>
        <Title />

        <YourTeam
          row={mine}
          season={mine ? seasonOf[mine.id] : null}
          place={mine ? posOf[mine.id] : 0}
          avgRank={mine ? avgRankOf[mine.id] : 0}
          teammate={teammate}
        />

        {groups.map(g => {
          const list = rows.filter(r => r.division === g.key);
          if (!list.length) return null;
          return (
            <div key={g.key} style={{ marginBottom: 26 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 2px 12px" }}>
                <span style={{ width: 13, height: 13, borderRadius: 7, background: g.color, flexShrink: 0 }} />
                <span style={{
                  fontFamily: FD, fontWeight: 700, fontSize: 22, lineHeight: 1.3,
                  letterSpacing: "0.05em", textTransform: "uppercase", color: g.color,
                }}>{g.name}</span>
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
          <div style={body("bodySm", { color: V.text2, textAlign: "center", padding: "2px 0 10px" })}>
            No second-half race scored yet, so everyone is level and the order is scoring average.
          </div>
        )}

        {fixtures.race && (
          <div style={body("bodySm", { color: V.text2, textAlign: "center", padding: "0 0 8px" })}>
            Next up: round {fixtures.race.round}, {fixtures.race.race_name}.
          </div>
        )}
      </div>
    </div>
  );
}
