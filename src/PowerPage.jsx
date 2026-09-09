import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { Flagged } from "./Flag.jsx";
import { V, FM, FD, FN, FB, display, numeric, label, body, card, textGlow, edgeGlow, titleFit, titleBox } from "./theme.vegas";
import { buildTeamPower, ordinal } from "./teamTable";
import { buildPowerNotes } from "./powerNotes";

// The team Power Rankings, at /power, on the Vegas look. The same skeleton as
// /teams: one row a team, then the write-ups underneath, one short paragraph
// each, the way ESPN runs theirs.
//
// The maths is buildTeamPower in teamTable.js and the words are powerNotes.js.
// Nothing in here computes a score. PowerBoard is the presentational half,
// split out so scripts/smoke-power.jsx can render the page without a network.

const WRAP = { maxWidth: 480, margin: "0 auto", padding: "0 16px 96px" };

// Same rule as /teams: names are never cut, so the size is set by how many of
// the 24 have to take a second line at each phone width. A point under the
// /teams size, because this row also carries the move under the place and a
// wider rating on the right, and at the /teams size "HomeworkTubes.Com" broke
// mid-word at 393.
const NAME_SIZE = "clamp(13px, calc(11.1vw - 28px), 19px)";

const TITLE_SIZE = titleFit("POWER RANKINGS");

function Title() {
  return (
    <div style={titleBox({ padding: "14px 0 14px" })}>
      <div style={{
        fontFamily: FM, fontWeight: 400, fontSize: TITLE_SIZE,
        lineHeight: 1.15, letterSpacing: "0.02em", whiteSpace: "nowrap",
      }}>
        <span style={textGlow(V.pink)}>POWER</span>{" "}
        <span style={textGlow(V.blue)}>RANKINGS</span>
      </div>
    </div>
  );
}

// The division is a dot, gold for the Championship and silver for the Second
// Division, the same two marks /teams uses for its section headers. It was a
// dot and a word, and "CHAMP" beside a team name read as somebody being the
// champion. Andrew, 2026-09-09. The legend above the table says what the dots
// mean.
const DIV = {
  championship: { name: "Championship", color: V.gold },
  second: { name: "Second Division", color: V.silver },
};

// Both players, as initial and surname, so a team card says who is on it.
const shortName = n => {
  const parts = (n || "").trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0][0]}. ${parts.slice(1).join(" ")}` : (n || "");
};

function Dot({ color, size = 9 }) {
  return <span style={{ width: size, height: size, borderRadius: size / 2, background: color, flexShrink: 0, display: "inline-block" }} />;
}

const rec = r => (r.d > 0 ? `${r.w}-${r.l}-${r.d}` : `${r.w}-${r.l}`);

// Up is green, down is pink, level is the dim text. A team with no place last
// week, which only happens in round 1, gets NEW.
function Move({ move }) {
  if (move == null) return <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 13, color: V.text3, letterSpacing: "0.06em" }}>NEW</span>;
  if (move === 0) return <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 13, color: V.text3 }}>&ndash;</span>;
  const up = move > 0;
  const color = up ? V.green : V.pink;
  return (
    <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 13, letterSpacing: "0.02em", ...textGlow(color, 0.4), whiteSpace: "nowrap" }}>
      {up ? "▲" : "▼"}{Math.abs(move)}
    </span>
  );
}

// The last five, oldest first. Won is blue, lost is pink, a draw is grey, the
// same colours the form row on /teams uses. Smaller here because the row also
// has to fit the division tag and the record on the same line.
function Form({ form }) {
  if (!form.length) return null;
  return (
    <span style={{ display: "inline-flex", gap: 3, flexShrink: 0 }}>
      {form.map((f, i) => {
        const color = f.won === true ? V.blue : f.won === false ? V.pink : V.silver;
        const letter = f.won === true ? "W" : f.won === false ? "L" : "D";
        return (
          <span key={i} title={`Round ${f.round}`} style={{
            fontFamily: FD, fontWeight: 700, fontSize: 13, lineHeight: 1,
            ...textGlow(color, f.won === true ? 0.5 : 0.3),
          }}>{letter}</span>
        );
      })}
    </span>
  );
}

function Row({ row, mine, nameOf }) {
  const div = DIV[row.division] || DIV.second;
  const who = [row.p1Id, row.p2Id].map(id => nameOf[id]).filter(Boolean).map(shortName).join(" \u00b7 ");
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "8px 10px", borderRadius: 14, marginBottom: 6,
      background: mine ? "rgba(0,217,255,0.07)" : V.bg2,
      border: `1px solid ${mine ? V.blue : V.border}`,
    }}>
      {/* Place over move, in one narrow column, so the name keeps its width. */}
      <div style={{ width: 36, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
        <div style={numeric("stat", { fontSize: 20, color: V.text2 })}>{row.place}</div>
        <Move move={row.move} />
      </div>
      {row.logo
        ? <img src={row.logo} alt="" style={{ width: 42, height: 42, objectFit: "contain", flexShrink: 0 }} />
        : <div style={{ width: 42, height: 42, flexShrink: 0 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Flagged name={row.name} nation={row.nation} wrap
          style={display("h3", {
            fontSize: NAME_SIZE, lineHeight: 1.35, color: mine ? V.blue : V.text,
            letterSpacing: "0.01em", overflowWrap: "normal",
          })} />
        <div style={{
          display: "flex", gap: 8, alignItems: "center", marginTop: 2,
          whiteSpace: "nowrap", overflow: "hidden",
        }}>
          <Dot color={div.color} />
          <span style={body("bodySm", { fontSize: 13, color: V.text2, fontVariantNumeric: "tabular-nums", flexShrink: 0 })}>{rec(row)}</span>
          <Form form={row.form} />
        </div>
        {/* Wraps rather than clips: "A. Thompson · M. Thompson" is 5px over at
            393 and 38px over at 360, and a name cut short is a name wrong. */}
        {who && (
          <div style={body("bodySm", { fontSize: 13, color: V.text2, marginTop: 1, lineHeight: 1.3 })}>{who}</div>
        )}
      </div>
      {/* The rating, out of 100, right against the edge. Blue is the score
          colour; green and pink mean won and lost and are taken. */}
      <div style={numeric("stat", { fontSize: 28, color: V.text, flexShrink: 0, minWidth: 44, textAlign: "right", ...textGlow(V.blue, 0.7) })}>
        {Math.round(row.rating)}
      </div>
    </div>
  );
}

// The five parts of the rating, each with the team's rank on it across the
// league, and last week's result above them. Data, set as data: a label, a
// number, a place.
const rankText = rk => (rk.tied ? `T-${ordinal(rk.place)}` : ordinal(rk.place));
function Facts({ row, byId }) {
  const last = row.last;
  const opp = last ? byId[last.oppId] : null;
  const lastColor = !last ? V.text2 : last.won === true ? V.green : last.won === false ? V.pink : V.silver;
  const lastText = !last ? "" : `${last.won === true ? "W" : last.won === false ? "L" : "D"} ${last.score}\u2013${last.oppScore} v ${opp ? opp.short : "?"}`;
  const lines = [
    { k: "Season avg", v: row.season.toFixed(1), r: rankText(row.ranks.season) },
    { k: "Last 5 avg", v: row.last5.toFixed(1), r: rankText(row.ranks.last5) },
    { k: "Last 2 avg", v: row.last2.toFixed(1), r: rankText(row.ranks.last2) },
    { k: "Last 5 wins", v: Number.isInteger(row.wins) ? String(row.wins) : row.wins.toFixed(1), r: rankText(row.ranks.wins) },
    { k: "Schedule", v: row.schedule.toFixed(1), r: `${rankText(row.ranks.schedule)} hardest` },
  ];
  const cell = extra => ({ ...body("bodySm", { fontSize: 13, lineHeight: 1.5 }), ...extra });
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "auto 1fr auto", columnGap: 12, rowGap: 0,
      padding: "8px 12px", borderRadius: 12, background: V.bg3, marginBottom: 10,
    }}>
      <span style={cell({ color: V.text3, fontWeight: 600 })}>Last week</span>
      <span style={cell({ color: lastColor, fontWeight: 600, fontVariantNumeric: "tabular-nums", gridColumn: "2 / 4" })}>{lastText}</span>
      {lines.map(l => (
        <div key={l.k} style={{ display: "contents" }}>
          <span style={cell({ color: V.text3, fontWeight: 600 })}>{l.k}</span>
          <span style={cell({ color: V.text, fontVariantNumeric: "tabular-nums" })}>{l.v}</span>
          <span style={cell({ color: V.blue, fontWeight: 600, textAlign: "right", fontVariantNumeric: "tabular-nums" })}>{l.r}</span>
        </div>
      ))}
    </div>
  );
}

// One team's write-up: the row's facts in a header, the stat block, then the
// paragraph.
function Note({ row, text, mine, nameOf, byId }) {
  const div = DIV[row.division] || DIV.second;
  const who = [row.p1Id, row.p2Id].map(id => nameOf[id]).filter(Boolean).map(shortName).join(" \u00b7 ");
  return (
    <div style={{ ...card({ padding: "14px 16px 16px", marginBottom: 10 }), ...(mine ? edgeGlow(V.blue, 0.6) : {}) }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div style={numeric("stat", { fontSize: 22, color: V.text2, flexShrink: 0, minWidth: 28 })}>{row.place}</div>
        {row.logo && <img src={row.logo} alt="" style={{ width: 34, height: 34, objectFit: "contain", flexShrink: 0 }} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={display("h3", { fontSize: 18, lineHeight: 1.25, color: mine ? V.blue : V.text })}>{row.name}</div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2, whiteSpace: "nowrap" }}>
            <Dot color={div.color} />
            <span style={body("bodySm", { fontSize: 13, color: V.text2, fontVariantNumeric: "tabular-nums", flexShrink: 0 })}>{rec(row)}</span>
          </div>
          {who && <div style={body("bodySm", { fontSize: 13, color: V.text2, lineHeight: 1.3 })}>{who}</div>}
        </div>
        <div style={numeric("stat", { fontSize: 22, color: V.text, flexShrink: 0, ...textGlow(V.blue, 0.6) })}>{Math.round(row.rating)}</div>
      </div>
      <Facts row={row} byId={byId} />
      <p style={body("body", { fontSize: 15, lineHeight: 1.55, color: V.text, margin: 0 })}>{text}</p>
    </div>
  );
}

export function PowerBoard({ power, notes, myTeamId, nameOf = {} }) {
  const { rows, round, weights, perfect } = power;
  const byId = Object.fromEntries(rows.map(r => [r.id, r]));
  return (
    <div style={WRAP}>
      <Title />

      <div style={body("bodySm", { color: V.text2, margin: "0 2px 14px", lineHeight: 1.5 })}>
        Who you would least like to draw next week, across all 24 teams. After round {round}.
        A perfect week is {perfect} points.
      </div>

      {/* What the dots mean, once, above the table. */}
      <div style={{ display: "flex", gap: 14, alignItems: "center", margin: "0 2px 10px" }}>
        {Object.values(DIV).map(d => (
          <span key={d.name} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Dot color={d.color} size={11} />
            <span style={label({ fontSize: 13, color: d.color })}>{d.name}</span>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "0 10px 4px" }}>
        <span style={label({ fontSize: 13, color: V.text3 })}>LAST 5</span>
        <span style={label({ fontSize: 13, color: V.blue })}>RATING</span>
      </div>
      {rows.map(r => <Row key={r.id} row={r} mine={r.id === myTeamId} nameOf={nameOf} />)}

      {/* The system, printed rather than hidden: a ranking nobody can check is a
          ranking nobody believes. */}
      <div style={{ ...card({ padding: "12px 16px", margin: "14px 0 26px" }) }}>
        <div style={label({ color: V.text3, fontSize: 13, marginBottom: 8 })}>HOW THE RATING IS BUILT</div>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 12, rowGap: 4 }}>
          {weights.map(w => (
            <div key={w.key} style={{ display: "contents" }}>
              <span style={numeric("chip", { fontSize: 14, color: V.blue, textAlign: "right" })}>{Math.round(w.weight * 100)}%</span>
              <span style={body("bodySm", { fontSize: 14, color: V.text2 })}>{w.label}</span>
            </div>
          ))}
        </div>
        <div style={body("bodySm", { fontSize: 13, color: V.text3, marginTop: 8, lineHeight: 1.5 })}>
          Scoring is the matchup score, drivers plus BOX BOX. A draw counts as half a win.
          Strength of schedule is what the last five opponents average a week, with the
          easiest run in the league at 0 and the hardest at 10.
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 2px 12px" }}>
        <span style={{ width: 13, height: 13, borderRadius: 7, background: V.pink, flexShrink: 0 }} />
        <span style={{
          fontFamily: FD, fontWeight: 700, fontSize: 22, lineHeight: 1.3,
          letterSpacing: "0.05em", textTransform: "uppercase", color: V.pink,
        }}>The write-ups</span>
      </div>
      {rows.map(r => <Note key={r.id} row={r} text={notes[r.id] || ""} mine={r.id === myTeamId} nameOf={nameOf} byId={byId} />)}
    </div>
  );
}

export default function PowerPage({ currentUser }) {
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    (async () => {
      try {
        const [teams, races, scores, schedule, players] = await Promise.all([
          supabase.from("teams").select("*"),
          supabase.from("races").select("*"),
          supabase.from("scores").select("*"),
          supabase.from("schedule").select("*"),
          supabase.from("players").select("id,name,photo_url,nation"),
        ]).then(rs => rs.map(r => r.data || []));

        const db = { teams, races, scores, schedule, players };
        const power = buildTeamPower(db);
        const notes = buildPowerNotes(power, db);

        const me = players.find(p => p.name === currentUser);
        const myTeam = me ? teams.find(t => t.player1_id === me.id || t.player2_id === me.id) : null;

        const nameOf = Object.fromEntries(players.map(p => [p.id, p.name]));
        setState({ loading: false, power, notes, nameOf, myTeamId: myTeam ? myTeam.id : null });
      } catch (e) {
        console.error(e);
        setState({ loading: false, error: true });
      }
    })();
  }, [currentUser]);

  if (state.loading) return <div style={{ ...WRAP, paddingTop: 60, ...body("body", { color: V.text2 }) }}>Loading</div>;
  if (state.error) return <div style={{ ...WRAP, paddingTop: 60, ...body("body", { color: V.text2 }) }}>Power rankings did not load.</div>;

  return (
    <div style={{ background: V.bg, minHeight: "100vh" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Monoton&family=Encode+Sans+Semi+Condensed:wght@400;600;700&family=Chakra+Petch:wght@600;700&family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>
      <PowerBoard power={state.power} notes={state.notes} myTeamId={state.myTeamId} nameOf={state.nameOf} />
    </div>
  );
}
