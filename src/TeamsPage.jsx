import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { V, FM, FD, FN, FB, display, numeric, label, body, card, textGlow, edgeGlow } from "./theme.vegas";
import { buildTeamTable, rankByAverage, nextFixtures, ordinal, FIRST_H2_ROUND } from "./teamTable";

// The team standings, second half. Deliberately thin: position, who you are,
// your record, who you play next, and the number that decides the title.
// Everything else that used to be on this page moved to the team page, which
// does not exist yet.

const WRAP = { maxWidth: 480, margin: "0 auto", padding: "0 16px 96px" };

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
          <div style={display("h3", { color: V.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" })}>{row.name}</div>
          <div style={body("bodySm", { color: V.text2, marginTop: 3 })}>
            {started ? (
              <>Sitting <strong style={{ color: V.text }}>{ordinal(place)}</strong> with <strong style={{ color: V.text }}>{row.pts}</strong> {row.pts === 1 ? "point" : "points"}.</>
            ) : (
              <>Ranked <strong style={{ color: V.text }}>{ordinal(avgRank)}</strong> of 24 on first-half scoring average.</>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ row, pos, mine, nextOpp, nextOppPos }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 12px", borderRadius: 14, marginBottom: 6,
      background: mine ? "rgba(0,217,255,0.07)" : V.bg2,
      border: `1px solid ${mine ? V.blue : V.border}`,
    }}>
      <div style={numeric("chip", { fontSize: 17, color: V.text3, width: 26, flexShrink: 0 })}>P{pos}</div>
      {row.logo
        ? <img src={row.logo} alt="" style={{ width: 32, height: 32, objectFit: "contain", flexShrink: 0 }} />
        : <div style={{ width: 32, height: 32, flexShrink: 0 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={display("h3", { fontSize: 21, color: mine ? V.blue : V.text, letterSpacing: "0.06em" })}>{row.code}</div>
        <div style={{ display: "flex", gap: 8, marginTop: 2, alignItems: "baseline" }}>
          <span style={body("bodySm", { color: V.text2, fontVariantNumeric: "tabular-nums" })}>{row.w}-{row.l}-{row.d}</span>
          {nextOpp && (
            <span style={{ fontFamily: FD, fontWeight: 600, fontSize: 13, letterSpacing: "0.06em", color: V.text3 }}>
              VS {nextOppPos ? `#${nextOppPos} ` : ""}{nextOpp}
            </span>
          )}
        </div>
      </div>
      <div style={numeric("stat", { fontSize: 30, color: V.text, ...(row.pts > 0 ? textGlow(V.blue, 0.7) : {}) })}>{row.pts}</div>
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
          supabase.from("players").select("id,name"),
        ]).then(rs => rs.map(r => r.data || []));

        const db = { teams, races, scores, schedule };

        // Scoring-average rank is across all 24 teams, never within a division,
        // and it comes from the first half because the second has not run yet.
        const firstHalf = buildTeamTable(db, { fromRound: 1, toRound: FIRST_H2_ROUND - 1 });
        const avg = rankByAverage(firstHalf);
        const avgRankOf = Object.fromEntries(avg.map(r => [r.id, r.avgRank]));

        // Seeded on first-half average so the table has a real order on the
        // morning of round 12, when every team is on nought points.
        const seed = Object.fromEntries(firstHalf.map(r => [r.id, r.avg]));
        const rows = buildTeamTable(db, { fromRound: FIRST_H2_ROUND, toRound: 99, seed });
        const fixtures = nextFixtures(db);

        const me = players.find(p => p.name === currentUser);
        const myTeam = me ? teams.find(t => t.player1_id === me.id || t.player2_id === me.id) : null;

        setState({ loading: false, rows, avgRankOf, fixtures, myTeamId: myTeam ? myTeam.id : null, teams });
      } catch (e) {
        console.error(e);
        setState({ loading: false, error: true });
      }
    })();
  }, [currentUser]);

  if (state.loading) return <div style={{ ...WRAP, paddingTop: 60, ...body("body", { color: V.text3 }) }}>Loading</div>;
  if (state.error) return <div style={{ ...WRAP, paddingTop: 60, ...body("body", { color: V.text3 }) }}>Standings did not load.</div>;

  const { rows, avgRankOf, fixtures, myTeamId } = state;
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
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Monoton&family=Titillium+Web:wght@400;600;700&family=Chakra+Petch:wght@600;700&display=swap');`}</style>
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
          const posOf = Object.fromEntries(list.map((r, i) => [r.id, i + 1]));
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
                    key={r.id} row={r} pos={i + 1} mine={r.id === myTeamId}
                    nextOpp={opp ? opp.code : null}
                    nextOppPos={opp ? posOf[opp.id] : null}
                  />
                );
              })}
            </div>
          );
        })}

        {rows.every(r => r.played === 0) && (
          <div style={body("bodySm", { color: V.text3, textAlign: "center", padding: "2px 0 10px" })}>
            No second-half race scored yet, so the order is first-half scoring average.
          </div>
        )}

        {fixtures.race && (
          <div style={body("bodySm", { color: V.text3, textAlign: "center", padding: "0 0 8px" })}>
            Next up: round {fixtures.race.round}, {fixtures.race.race_name}.
          </div>
        )}
      </div>
    </div>
  );
}
