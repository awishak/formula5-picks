import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import { V, FM, FD, FN, FB, display, numeric, label, body, card, textGlow, edgeGlow, titleFit } from "./theme.vegas";
import { buildTeamTable, rankByAverage, nextFixtures, ordinal, FIRST_H2_ROUND } from "./teamTable";
import { displayOf } from "./teams";

// The team standings, second half. Deliberately thin: position, who you are,
// your record, who you play next, and the number that decides the title.
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
const NAME_SIZE = "clamp(15px, calc(9.55vw - 22.0px), 19px)";

const TITLE_SIZE = titleFit("TEAM STANDINGS");

function Title() {
  return (
    <div style={{ padding: "14px 0 18px" }}>
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

// The one personalised thing on the page. Before a second-half race is scored
// there is no place and no points to report, so it falls back to where the team
// ranks on scoring average, which is the only form line that exists.
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

function Row({ row, pos, mine, record, rank, nextOpp, nextOppRank, innerRef }) {
  return (
    <div ref={innerRef} style={{
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
  const mineRef = useRef(null);

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

  // Land on your own row. Two divisions of twelve puts most teams below the
  // fold, and the one you came to look at is yours.
  useEffect(() => {
    if (state.loading || !mineRef.current) return;
    const t = setTimeout(() => {
      mineRef.current && mineRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 260);
    return () => clearTimeout(t);
  }, [state.loading]);

  if (state.loading) return <div style={{ ...WRAP, paddingTop: 60, ...body("body", { color: V.text2 }) }}>Loading</div>;
  if (state.error) return <div style={{ ...WRAP, paddingTop: 60, ...body("body", { color: V.text2 }) }}>Standings did not load.</div>;

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
          still on the light theme do not pay for families they never set. */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Monoton&family=Encode+Sans+Semi+Condensed:wght@400;600;700&family=Chakra+Petch:wght@600;700&display=swap');`}</style>
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
                    innerRef={r.id === myTeamId ? mineRef : null}
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
