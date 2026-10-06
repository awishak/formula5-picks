import { useEffect, useState } from "react";
import { V, display, numeric, body, label, card, textGlow, VEGAS_CSS } from "./theme.vegas";
import { useLeague } from "./useLeague";
import { buildTeamTable, FIRST_H2_ROUND } from "./teamTable";
import { shortOf } from "./teams";
import { DRIVER_HEADSHOTS, TEAM_BY_NAME } from "./drivers";
import { F1_TEAM_COLORS } from "./theme";
import { PlayerTap, TeamTap } from "./PlayerCard.jsx";

// Around the league, at /league. The round from everybody else's side: every
// matchup's result, the champ points the round paid, and what the field picked.
// Reached from the scored home page, which since 2026-10-06 carries only the
// two billboards and this door. The champ points board moved here off
// /schedule the same day.
//
// Computes nothing new. The matchups come off buildTeamTable for the one round,
// the same as /schedule, and the field is useLeague's.
const MINE = V.green, THEIRS = V.pink, OTHER = V.blue;
const DIV_LABEL = { championship: "Championship Division", second: "Second Division" };
const short = (n) => shortOf(n) || n;
const lastName = (n) => (n || "").split(" ").slice(-1)[0];
const dColor = (name) => F1_TEAM_COLORS[TEAM_BY_NAME[name]] || V.text3;
// Scores run to three digits, so every number column is tabular and sized for
// 104, not for 64. The old board set 52px for "104-98" and ran into the points.
const TAB = { fontVariantNumeric: "tabular-nums" };

export default function LeaguePage({ currentUser }) {
  const asked = typeof window === "undefined" ? null
    : Number(new URLSearchParams(window.location.search).get("round")) || null;
  const [round, setRound] = useState(asked);
  const week = useLeague(currentUser || null, { round });

  // No round asked for, and the current one has not been scored: open on the
  // last one that has, because this page is about a round that happened.
  const scoredRounds = (() => {
    if (!week.db) return [];
    const ids = new Set(week.db.scores.map(x => x.race_id));
    return week.db.races.filter(r => ids.has(r.id)).map(r => r.round).sort((a, b) => a - b);
  })();
  useEffect(() => {
    if (round == null && !week.loading && week.race && !week.scored && scoredRounds.length) {
      setRound(scoredRounds[scoredRounds.length - 1]);
    }
  }, [round, week.loading, week.race, week.scored, scoredRounds.length]);
  useEffect(() => {
    if (!week.loading && week.race) window.history.replaceState(null, "", `/league?round=${week.race.round}`);
  }, [week.loading, week.race && week.race.round]);

  const wrap = { maxWidth: 480, margin: "0 auto", padding: "18px 18px 90px" };
  const shell = (children) => (
    <div style={{ background: V.bg, minHeight: "100vh" }}>
      <style>{VEGAS_CSS}</style>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Monoton&family=Encode+Sans+Semi+Condensed:wght@400;600;700&family=Chakra+Petch:wght@600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');`}</style>
      <div style={wrap}>{children}</div>
    </div>
  );
  if (!currentUser) return shell(<p style={{ ...body("body"), color: V.text2 }}>Pick who you are first.</p>);
  if (week.loading || week.error) return shell(
    <p style={{ ...body("body"), color: V.text2 }}>{week.error ? "This round did not load." : "Loading"}</p>
  );

  const race = week.race;
  const idx = scoredRounds.indexOf(race.round);
  const go = (d) => { const r = scoredRounds[idx + d]; if (r != null) setRound(r); };

  return shell(
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <Arrow dir="left" on={idx > 0} onClick={() => go(-1)} />
        <div style={{ flex: 1, textAlign: "center", minWidth: 0 }}>
          <p style={{ fontFamily: "'Monoton', cursive", fontSize: 25, lineHeight: 1.15,
                      margin: 0, textTransform: "uppercase", ...textGlow(V.purple) }}>
            Around the league
          </p>
          <p style={{ ...display("chip"), fontSize: 13, color: V.gold, margin: "8px 0 0",
                      letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Round {race.round} &middot; {race.race_name || race.name}
          </p>
        </div>
        <Arrow dir="right" on={idx >= 0 && idx < scoredRounds.length - 1} onClick={() => go(1)} />
      </div>

      {week.scored
        ? <Results db={week.db} race={race} currentUser={currentUser} />
        : <p style={{ ...body("body"), color: V.text2, textAlign: "center" }}>Not scored yet.</p>}
      <Field field={week.field} scored={week.scored} stop={week.boxBox && week.boxBox.stop} />
    </>
  );
}

function Arrow({ dir, on, onClick }) {
  return (
    <button onClick={on ? onClick : undefined} disabled={!on} style={{
      width: 38, height: 38, flexShrink: 0, borderRadius: 10, cursor: on ? "pointer" : "default",
      background: "transparent", border: `1px solid ${on ? V.border2 : "transparent"}`,
      color: on ? OTHER : V.bg3, ...numeric("h3"), fontSize: 20, lineHeight: 1,
    }}>{dir === "left" ? "‹" : "›"}</button>
  );
}

function Logo({ t, size = 26 }) {
  return t && t.logo_url
    ? <img src={t.logo_url} alt="" style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }} />
    : <div style={{ width: size, height: size, borderRadius: 6, flexShrink: 0,
                    background: V.bg3, border: `1px solid ${V.border}` }} />;
}

function Section({ children, color = V.blue }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "26px 0 12px" }}>
      <span style={{ ...display("h3"), fontSize: 19, color, ...textGlow(color, 0.5),
                     textTransform: "uppercase", letterSpacing: "0.06em",
                     whiteSpace: "nowrap" }}>{children}</span>
      <div style={{ flex: 1, height: 1, background: `${color}44` }} />
    </div>
  );
}

function DivHead({ d }) {
  const c = d === "championship" ? V.gold : V.silver;
  return (
    <p style={{ ...display("chip"), fontSize: 12, color: c, letterSpacing: "0.1em",
                textTransform: "uppercase", margin: "14px 0 8px" }}>
      {DIV_LABEL[d] || d}
    </p>
  );
}

// ── Every matchup, and the champ points it paid ──────────────────────────
function Results({ db, race, currentUser }) {
  const rows = buildTeamTable(db, { fromRound: race.round, toRound: race.round });
  const byId = Object.fromEntries(rows.map(r => [r.id, r]));
  const teamById = Object.fromEntries(db.teams.map(t => [t.id, t]));
  const me = db.players.find(p => p.name === currentUser);
  const myTeam = me && db.teams.find(t => t.player1_id === me.id || t.player2_id === me.id);
  const divOf = (t) => (race.round >= FIRST_H2_ROUND ? t.division_h2 : t.division) || t.division;
  const wkOf = (id) => byId[id] && byId[id].weeks.find(w => w.raceId === race.id);

  const fixtures = db.schedule.filter(m => m.race_id === race.id).map(m => {
    // The UNDER on top, the way home puts it on the left.
    const sides = [m.away_team_id, m.home_team_id].map(id => ({
      t: teamById[id], wk: wkOf(id), mine: Boolean(myTeam && id === myTeam.id),
    }));
    return { id: m.id || `${m.home_team_id}-${m.away_team_id}`, sides,
             division: divOf(teamById[m.home_team_id] || {}),
             mine: sides.some(x => x.mine) };
  }).filter(f => f.sides.every(x => x.t && x.wk));
  const myDiv = myTeam ? divOf(myTeam) : null;
  const divs = [...new Set(fixtures.map(f => f.division))]
    .sort((a, b) => (a === myDiv ? -1 : b === myDiv ? 1 : a === "championship" ? -1 : 1));

  return (
    <>
      <Section color={V.pink}>Results</Section>
      {divs.map(d => (
        <div key={d}>
          <DivHead d={d} />
          <div style={{ display: "grid", gap: 8 }}>
            {fixtures.filter(f => f.division === d)
              .sort((a, b) => (b.mine ? 1 : 0) - (a.mine ? 1 : 0))
              .map(f => <Matchup key={f.id} f={f} />)}
          </div>
        </div>
      ))}

      <Section color={V.gold}>Champ points this round</Section>
      {divs.map(d => {
        const board = fixtures.filter(f => f.division === d).flatMap(f => f.sides)
          .map(x => ({ id: x.t.id, t: x.t, mine: x.mine, won: x.wk.won,
                       score: x.wk.score, opp: x.wk.oppScore, pts: x.wk.teamPts }))
          .sort((a, b) => b.pts - a.pts || b.score - a.score ||
                          short(a.t.name).localeCompare(short(b.t.name)));
        return (
          <div key={d}>
            <DivHead d={d} />
            <ChampBoard rows={board} />
          </div>
        );
      })}
    </>
  );
}

// Two lines, one a team, so a name gets the width of the card and a score of
// any length sits in its own column. Yours is green against pink; everybody
// else's winner is green and the other blue, the /schedule rule.
function Matchup({ f }) {
  return (
    <div style={{ ...card({ padding: "8px 12px" }),
                  ...(f.mine ? { border: `1.5px solid ${MINE}66`, background: `${MINE}0c` } : {}) }}>
      {f.sides.map((x, i) => {
        const won = x.wk.won === true;
        const c = f.mine ? (x.mine ? MINE : THEIRS) : (won ? MINE : OTHER);
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0",
                                ...(i ? { borderTop: `1px solid ${V.border}` } : {}) }}>
            <Logo t={x.t} size={28} />
            <span style={{ ...display("h3"), fontSize: 16, flex: "1 1 0", minWidth: 0,
                           whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                           color: won ? V.text : V.text2 }}><TeamTap id={x.t.id}>{short(x.t.name)}</TeamTap></span>
            <span style={{ ...display("chip"), fontSize: 11, color: V.text3, width: 40,
                           textAlign: "right", flexShrink: 0 }}>{i ? "OVER" : "UNDER"}</span>
            <span style={{ ...numeric("h2"), ...TAB, fontSize: 24, width: 52, textAlign: "right",
                           flexShrink: 0, color: won || f.mine ? c : V.text3,
                           ...(won ? textGlow(c, 0.6) : {}) }}>{x.wk.score}</span>
          </div>
        );
      })}
    </div>
  );
}

function ChampBoard({ rows }) {
  return (
    <div style={{ ...card({ padding: "6px 12px" }) }}>
      {rows.map((r, i) => (
        <div key={r.id} style={{
          display: "flex", alignItems: "center", gap: 8, padding: "6px 0",
          ...(i ? { borderTop: `1px solid ${V.border}` } : {}),
        }}>
          <Logo t={r.t} size={22} />
          <span style={{ ...display("chip"), fontSize: 14, flex: "1 1 0", minWidth: 0,
                         whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                         color: r.mine ? MINE : V.text }}><TeamTap id={r.id}>{short(r.t.name)}</TeamTap></span>
          <span style={{ ...display("chip"), fontSize: 13, width: 16, textAlign: "center",
                         flexShrink: 0,
                         color: r.won === true ? MINE : r.won === false ? V.text3 : V.amber }}>
            {r.won === true ? "W" : r.won === false ? "L" : "D"}
          </span>
          <span style={{ ...numeric("chip"), ...TAB, fontSize: 13, color: V.text2, width: 78,
                         textAlign: "right", flexShrink: 0, whiteSpace: "nowrap" }}>
            {r.score}&ndash;{r.opp}
          </span>
          <span style={{ ...numeric("h3"), ...TAB, fontSize: 17, width: 40, textAlign: "right",
                         flexShrink: 0, color: r.pts > 0 ? V.gold : V.text3 }}>
            +{r.pts}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── The field ────────────────────────────────────────────────────────────
function DriverFace({ name, size = 34, ring }) {
  const [bad, setBad] = useState(false);
  const c = ring || dColor(name);
  const url = DRIVER_HEADSHOTS[name];
  const base = { width: size, height: size, borderRadius: "50%", flexShrink: 0,
                 border: `2px solid ${c}`, background: V.bg3 };
  if (!url || bad) return (
    <div style={{ ...base, display: "flex", alignItems: "center", justifyContent: "center",
                  ...display("chip"), fontSize: 11, color: c }}>
      {lastName(name).slice(0, 3).toUpperCase()}
    </div>
  );
  return <img src={url} alt="" onError={() => setBad(true)}
              style={{ ...base, objectFit: "cover", objectPosition: "top" }} />;
}

function PlayerFace({ name, photo, size = 30, ring = V.border2 }) {
  const initials = (name || "").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0,
                  border: `2px solid ${ring}`, overflow: "hidden",
                  background: photo ? `center/cover url(${photo})` : V.bg3,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  ...display("chip"), fontSize: Math.round(size * 0.36), color: V.text2 }}>
      {photo ? "" : initials}
    </div>
  );
}

function Sub({ children }) {
  return (
    <p style={{ ...label({ fontSize: 13, color: V.text2 }), margin: "0 0 10px",
                letterSpacing: "0.08em" }}>{children}</p>
  );
}

function Field({ field, scored, stop }) {
  if (!field) return null;
  const MY = field.mine || {};
  return (
    <>
      <Section color={V.blue}>The field</Section>
      <p style={{ ...body("bodySm"), color: V.text3, margin: "-4px 0 14px" }}>
        {field.in} of {field.of} in
      </p>
      {field.needle && <NeedleStrip field={field} stop={stop} />}
      <div style={{ ...card({ padding: 14, marginBottom: 12 }) }}>
        <Sub>Top pick</Sub>
        <DriverBars rows={field.topPick} isMine={k => k === MY.topPick} />
      </div>
      {field.mid && field.mid.length > 0 && (
        <div style={{ ...card({ padding: 14, marginBottom: 12 }) }}>
          <Sub>Midfield</Sub>
          <DriverBars rows={field.mid} isMine={k => (MY.mid || []).includes(k)} />
        </div>
      )}
      <div style={{ ...card({ padding: 14, marginBottom: 12 }) }}>
        <Sub>Best finish</Sub>
        <Columns rows={field.bestFinish} isMine={k => k === MY.bestFinish} />
      </div>
      {scored && field.earned && field.earned.length > 0 && <Paid rows={field.earned} />}
      {field.stops && field.stops.length > 0 && <Stops rows={field.stops} />}
    </>
  );
}

// Every guess as a tick, yours tall and green, the stop in gold once there is one.
function NeedleStrip({ field, stop }) {
  const N = field.needle, MIN = 1.5, MAX = 4.5;
  const pc = (v) => ((Math.min(MAX, Math.max(MIN, v)) - MIN) / (MAX - MIN)) * 100;
  const tag = (v, text, color, top) => (
    <div style={{ position: "absolute", top, width: 70, textAlign: "center",
                  left: `clamp(0px, calc(${pc(v)}% - 35px), calc(100% - 70px))`,
                  ...display("chip"), fontSize: 12, color, ...TAB }}>{text}</div>
  );
  return (
    <div style={{ ...card({ padding: "14px 16px 10px", marginBottom: 12 }) }}>
      <Sub>Pit stop guesses</Sub>
      <div style={{ position: "relative", height: 92 }}>
        {stop != null && tag(stop, `Stop ${stop.toFixed(2)}`, V.gold, 0)}
        <div style={{ position: "absolute", left: 0, right: 0, top: 46, height: 2,
                      borderRadius: 2, background: V.border2 }} />
        {[1.5, 2, 2.5, 3, 3.5, 4, 4.5].map(t => (
          <div key={t}>
            <div style={{ position: "absolute", left: `${pc(t)}%`, top: 43, width: 1,
                          height: 8, background: V.border2 }} />
          </div>
        ))}
        {field.guesses.map((v, i) => (
          <div key={i} style={{ position: "absolute", left: `${pc(v)}%`, top: 28, width: 3,
                                height: 18, marginLeft: -1.5, borderRadius: 2,
                                background: V.blue, opacity: 0.45 }} />
        ))}
        {stop != null && (
          <div style={{ position: "absolute", left: `${pc(stop)}%`, top: 18, width: 3,
                        height: 40, marginLeft: -1.5, borderRadius: 2, background: V.gold,
                        boxShadow: `0 0 10px ${V.gold}` }} />
        )}
        {N.mine != null && (
          <div style={{ position: "absolute", left: `${pc(N.mine)}%`, top: 22, width: 5,
                        height: 30, marginLeft: -2.5, borderRadius: 3, background: MINE,
                        boxShadow: `0 0 9px ${MINE}` }} />
        )}
        {tag(N.median, `Field ${N.median.toFixed(1)}`, V.text2, 60)}
        {N.mine != null && tag(N.mine, `You ${N.mine.toFixed(1)}`, MINE, 76)}
      </div>
    </div>
  );
}

function DriverBars({ rows, isMine }) {
  const top = rows.reduce((a, r) => Math.max(a, r.n), 1);
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {rows.map(r => {
        const on = isMine(r.k), c = dColor(r.k);
        return (
          <div key={r.k} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <DriverFace name={r.k} ring={on ? MINE : c}
                        size={34} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ ...display("chip"), fontSize: 14, flex: 1, minWidth: 0,
                               color: on ? MINE : V.text, whiteSpace: "nowrap",
                               overflow: "hidden", textOverflow: "ellipsis" }}>{lastName(r.k)}</span>
                <span style={{ ...numeric("chip"), ...TAB, fontSize: 15,
                               color: on ? MINE : V.text }}>{r.n}</span>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: V.bg3, marginTop: 4,
                            overflow: "hidden" }}>
                <div style={{ width: `${(r.n / top) * 100}%`, height: "100%", borderRadius: 4,
                              background: c, boxShadow: on ? `0 0 8px ${MINE}` : "none",
                              outline: on ? `1.5px solid ${MINE}` : "none" }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// P1 to P10 as columns: it is a scale, so it reads left to right.
function Columns({ rows, isMine }) {
  const top = rows.reduce((a, r) => Math.max(a, r.n), 1);
  const H = 90;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: H + 40 }}>
      {rows.map(r => {
        const on = isMine(r.k), c = on ? MINE : V.purple;
        return (
          <div key={r.k} style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
            <div style={{ ...numeric("chip"), ...TAB, fontSize: 13, color: on ? MINE : V.text2,
                          marginBottom: 3 }}>{r.n}</div>
            <div style={{ height: Math.max(3, (r.n / top) * H), borderRadius: "5px 5px 2px 2px",
                          background: c, opacity: on ? 1 : 0.8,
                          boxShadow: on ? `0 0 10px ${MINE}` : "none" }} />
            <div style={{ ...display("chip"), fontSize: 12, color: on ? MINE : V.text2,
                          marginTop: 5 }}>{r.k}</div>
          </div>
        );
      })}
    </div>
  );
}

// Places share on a tie, the way the trophies count a week.
function withPlaces(rows) {
  let p = 0, prev = null;
  return rows.map((r, i) => {
    if (r.total !== prev) { p = i + 1; prev = r.total; }
    return { ...r, place: p };
  });
}

function Paid({ rows }) {
  const [all, setAll] = useState(false);
  const ranked = withPlaces(rows);
  const podium = ranked.slice(0, 3);
  const rest = all ? ranked.slice(3) : ranked.slice(3, 10);
  const me = ranked.find(r => r.mine);
  const pinMe = !all && me && me.place > 10 && !ranked.slice(0, 10).includes(me);
  const METAL = [V.gold, V.silver, V.bronze];
  // P1 in the middle and raised, the way a podium stands.
  const order = podium.length === 3 ? [podium[1], podium[0], podium[2]] : podium;
  return (
    <div style={{ ...card({ padding: "14px 14px 10px", marginBottom: 12 }) }}>
      <Sub>What the week paid</Sub>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 8,
                    marginBottom: 12 }}>
        {order.map(r => {
          const first = r === podium[0], c = METAL[Math.min(2, r.place - 1)];
          return (
            <PlayerTap key={r.name} name={r.name} block style={{ flex: 1, minWidth: 0 }}>
              <div style={{ textAlign: "center", paddingBottom: first ? 14 : 0 }}>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <PlayerFace name={r.name} photo={r.photo} size={first ? 74 : 58}
                              ring={r.mine ? MINE : c} />
                </div>
                <div style={{ ...display("chip"), fontSize: 12, color: c, marginTop: 6 }}>
                  P{r.place}
                </div>
                <div style={{ ...body("bodySm"), fontSize: 13, color: r.mine ? MINE : V.text,
                              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {r.name}
                </div>
                <div style={{ ...numeric("h2"), ...TAB, fontSize: first ? 30 : 24, color: c,
                              ...textGlow(c, 0.5) }}>{r.total}</div>
              </div>
            </PlayerTap>
          );
        })}
      </div>
      {rest.map(r => <PaidRow key={r.name} r={r} />)}
      {pinMe && (
        <>
          <div style={{ textAlign: "center", color: V.text3, ...display("chip"), fontSize: 12 }}>&middot; &middot; &middot;</div>
          <PaidRow r={me} />
        </>
      )}
      {ranked.length > 10 && (
        <ShowAll open={all} onClick={() => setAll(a => !a)} n={ranked.length} />
      )}
    </div>
  );
}

function PaidRow({ r }) {
  return (
    <PlayerTap name={r.name} block>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 8px",
                    borderRadius: 10,
                    background: r.mine ? `${MINE}14` : "transparent",
                    border: `1px solid ${r.mine ? `${MINE}88` : "transparent"}` }}>
        <span style={{ ...numeric("chip"), ...TAB, fontSize: 13, color: V.text3, width: 24,
                       flexShrink: 0 }}>{r.place}</span>
        <PlayerFace name={r.name} photo={r.photo} size={30} ring={r.mine ? MINE : V.border2} />
        <span style={{ ...body("body"), fontSize: 15, flex: 1, minWidth: 0,
                       color: r.mine ? MINE : V.text, whiteSpace: "nowrap", overflow: "hidden",
                       textOverflow: "ellipsis", textAlign: "left" }}>{r.name}</span>
        <span style={{ ...numeric("h3"), ...TAB, fontSize: 17, width: 40, textAlign: "right",
                       flexShrink: 0, color: r.mine ? MINE : V.blue }}>{r.total}</span>
      </div>
    </PlayerTap>
  );
}

function ShowAll({ open, onClick, n }) {
  return (
    <button onClick={onClick} style={{
      display: "block", margin: "8px auto 4px", padding: "8px 18px", borderRadius: 100,
      background: "transparent", border: `1px solid ${V.border2}`, cursor: "pointer",
      ...display("chip"), fontSize: 13, color: V.blue, letterSpacing: "0.06em",
      textTransform: "uppercase",
    }}>{open ? "Show fewer" : `Show all ${n}`}</button>
  );
}

function Stops({ rows }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ ...card({ padding: "14px 14px 10px", marginBottom: 12 }) }}>
      <Sub>The needle, lowest first</Sub>
      {open && rows.map((r, i) => (
        <PlayerTap key={`${r.name}-${i}`} name={r.name} block>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 8px",
                        borderRadius: 10,
                        background: r.mine ? `${MINE}14` : "transparent",
                        border: `1px solid ${r.mine ? `${MINE}88` : "transparent"}` }}>
            <PlayerFace name={r.name} photo={r.photo} size={28} ring={r.mine ? MINE : V.border2} />
            <span style={{ ...body("body"), fontSize: 15, flex: 1, minWidth: 0, textAlign: "left",
                           color: r.mine ? MINE : V.text, whiteSpace: "nowrap", overflow: "hidden",
                           textOverflow: "ellipsis" }}>{r.name}</span>
            {r.side && (
              <span style={{ ...display("chip"), fontSize: 11, padding: "2px 8px", borderRadius: 100,
                             flexShrink: 0,
                             color: r.side === "OVER" ? V.gold : V.purple,
                             border: `1px solid ${r.side === "OVER" ? V.gold : V.purple}88` }}>
                {r.side}
              </span>
            )}
            <span style={{ ...numeric("h3"), ...TAB, fontSize: 17, width: 40, textAlign: "right",
                           flexShrink: 0, color: r.mine ? MINE : V.text }}>{r.guess.toFixed(1)}</span>
          </div>
        </PlayerTap>
      ))}
      <ShowAll open={open} onClick={() => setOpen(o => !o)} n={rows.length} />
    </div>
  );
}
