import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { V, display, numeric, body, label, card, textGlow, VEGAS_CSS } from "./theme.vegas";
import { buildTeamTable, FIRST_H2_ROUND, ordinal } from "./teamTable";
import { buildPlayerTable, placesBy } from "./playerTable";
import { shortOf } from "./teams";
import { raceTimePT, currentRace } from "./raceTimes";

// The round, every matchup in it.
//
// Same shape as the scoreboard on the home page, twelve times: a team either
// side and the winner lit. Two colour rules, and the second one is the reason
// this page is readable at a glance.
//
// Yours is green against pink, the way it is on your own screen all week.
// Everybody else's is green for the winner and blue for the one who did not,
// because pink means a team that beat YOU, and on a page of twelve matchups
// you are only in one of them. Pink everywhere would be twelve teams looking
// like they had done something to you.
const MINE = V.green, THEIRS = V.pink, OTHER = V.blue;

// shortOf keys on the canonical name, so it has to be handed the raw one.
// Running it through displayOf first meant Scuderia Iskandaraya arrived as
// "Scud. Iskandaraya", matched nothing, and came back too long to fit.
const short = (n) => shortOf(n) || n;

export default function SchedulePage({ currentUser }) {
  const [s, setS] = useState({ loading: true });
  const [round, setRound] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [players, teams, races, scores, schedule] = await Promise.all([
        supabase.from("players").select("id,name"),
        supabase.from("teams").select("*"),
        supabase.from("races").select("*").order("round"),
        supabase.from("scores").select("*"),
        supabase.from("schedule").select("*"),
      ]).then(rs => rs.map(r => r.data || []));
      if (!alive) return;
      // Every needle guess in the season, so each matchup can carry its own
      // BOX BOX line: the line is the average of the four in it.
      const picks = (await supabase.from("picks").select("race_id,player_id,pit_guess")).data || [];
      if (!alive) return;

      const db = { players, teams, races, scores, schedule };
      const me = players.find(p => p.name === currentUser) || null;
      const myTeam = me
        ? teams.find(t => t.player1_id === me.id || t.player2_id === me.id) || null
        : null;

      // Rounds that have a fixture at all. Round 23 is deliberately undrawn
      // until 22 is scored, so it is simply not here yet.
      const drawn = races
        .filter(r => schedule.some(m => m.race_id === r.id))
        .sort((a, b) => a.round - b.round);
      const scored = new Set(scores.map(x => x.race_id));
      // The week the app is on, not the last one scored. Between the deadline
      // and the race there are two days where this round is the whole point,
      // and opening on the last scored round skips straight past them.
      const cur = currentRace(drawn, scored);
      const latest = cur || drawn[drawn.length - 1];

      setS({ loading: false, db, teams, races, schedule, drawn, scored, picks,
             myTeamId: myTeam ? myTeam.id : null, playersById:
               Object.fromEntries(players.map(p => [p.id, p.name])) });
      // ?round=12 opens on that round. It makes an unscored week checkable
      // before it is the current one, and it makes a matchup linkable.
      const asked = typeof window === "undefined" ? null
        : Number(new URLSearchParams(window.location.search).get("round"));
      const start = asked && drawn.some(r => r.round === asked) ? asked
        : (latest ? latest.round : null);
      setRound(r => (r == null ? start : r));
    })();
    return () => { alive = false; };
  }, [currentUser]);

  const wrap = { maxWidth: 480, margin: "0 auto", padding: "18px 18px 90px" };
  if (s.loading || round == null) {
    return (
      <div style={{ background: V.bg, minHeight: "100vh", ...wrap }}>
        <p style={{ ...body("body"), color: V.text2 }}>Loading the schedule…</p>
      </div>
    );
  }

  // v3 is the card: name over the score, logo out in the outer corner, both
  // teams reading in to the midline, and a championship-points board at the
  // head of each division. ?v=1 is the old centred block and ?v=2 the mirrored
  // one, both kept so a layout question can still be answered side by side.
  const qp = typeof window === "undefined" ? new URLSearchParams()
    : new URLSearchParams(window.location.search);
  const askedV = Number(qp.get("v"));
  const variant = askedV === 1 ? 1 : askedV === 2 ? 2 : 3;
  // Nothing live is wired up yet, so ?demo=live renders a scored round in the
  // live treatment. It is a mockup of the state, off real numbers.
  const demoLive = qp.get("demo") === "live";
  const race = s.races.find(r => r.round === round);
  const isScored = race ? s.scored.has(race.id) : false;
  // The table is built for this round alone, so a week reads as itself rather
  // than as a slice of a running total.
  const rows = buildTeamTable(s.db, { fromRound: round, toRound: round });
  const byId = Object.fromEntries(rows.map(r => [r.id, r]));
  const teamById = Object.fromEntries(s.teams.map(t => [t.id, t]));

  // The individual game runs all 23 races, so a player's place is not windowed
  // the way the round table above is.
  const pRows = buildPlayerTable(s.db);
  const pPlace = placesBy(pRows, r => r.avg);

  const guessOf = {};
  s.picks.filter(p => p.race_id === race.id)
    .forEach(p => { const v = Number(p.pit_guess); if (!Number.isNaN(v)) guessOf[p.player_id] = v; });
  // The line is the average of the four guesses in the matchup, same as the
  // week computes it, so a matchup with a card missing still has a line off
  // whoever did guess.
  const lineOf = (a, b) => {
    const g = [a, b].filter(Boolean)
      .flatMap(t => [t.player1_id, t.player2_id])
      .map(id => guessOf[id]).filter(v => v != null);
    return g.length ? Math.round((g.reduce((x, y) => x + y, 0) / g.length) * 100) / 100 : null;
  };
  const myDiv = (() => {
    const t = teamById[s.myTeamId];
    if (!t) return null;
    return (round >= FIRST_H2_ROUND ? t.division_h2 : t.division) || t.division;
  })();

  const fixtures = s.schedule.filter(m => m.race_id === race.id).map(m => {
    const home = byId[m.home_team_id], away = byId[m.away_team_id];
    const wk = home && home.weeks.find(x => x.raceId === race.id);
    const awk = away && away.weeks.find(x => x.raceId === race.id);
    const div = (teamById[m.home_team_id] || {});
    return {
      id: m.id || `${m.home_team_id}-${m.away_team_id}`,
      // home_team_id IS the OVER seat, and the home page always puts the UNDER
      // on the left, so this page does too.
      left: { t: teamById[m.away_team_id], wk: awk, side: "UNDER",
              yours: m.away_team_id === s.myTeamId },
      right: { t: teamById[m.home_team_id], wk: wk, side: "OVER",
               yours: m.home_team_id === s.myTeamId },
      division: (round >= FIRST_H2_ROUND ? div.division_h2 : div.division) || div.division,
      mine: m.home_team_id === s.myTeamId || m.away_team_id === s.myTeamId,
      margin: wk && awk ? Math.abs(wk.score - awk.score) : null,
      // Put BOX BOX the other way and see who wins. Not the tiebreak chain's
      // decidedByBoxBox, which is true whenever the other result was available
      // at all: at a driver margin of exactly six the week turns into a draw,
      // and a draw is not "a win and a loss for the opposite teams". This is a
      // strict flip.
      boxBoxDecided: (() => {
        if (!wk || !awk) return false;
        const dh = wk.parts.p1 + wk.parts.p2, da = awk.parts.p1 + awk.parts.p2;
        const sh = dh + (wk.parts.boxBox > 0 ? -1 : 5);
        const sa = da + (awk.parts.boxBox > 0 ? -1 : 5);
        const before = Math.sign(wk.score - awk.score), after = Math.sign(sh - sa);
        return before !== 0 && after !== 0 && before !== after;
      })(),
      line: lineOf(teamById[m.home_team_id], teamById[m.away_team_id]),
      players: {
        away: rosterOf(teamById[m.away_team_id], away, race.id, s.playersById, pPlace),
        home: rosterOf(teamById[m.home_team_id], home, race.id, s.playersById, pPlace),
      },
    };
  });
  // Your division first, and inside a division the closest week first, so the
  // top of the page is the one still in the balance rather than the one that
  // happened to be drawn first. Yours stays at the head of its own division:
  // you are in one of twelve and it should not be a hunt.
  fixtures.sort((a, b) =>
    (a.division === myDiv ? 0 : 1) - (b.division === myDiv ? 0 : 1) ||
    (b.mine ? 1 : 0) - (a.mine ? 1 : 0) ||
    ((a.margin == null ? 999 : a.margin) - (b.margin == null ? 999 : b.margin)));

  // Championship gold, Second Division silver, and the header carries the same
  // colour the matchups under it are outlined in.
  const DIV_LABEL = { championship: "Championship Division", second: "Second Division" };
  const seen = [];
  fixtures.forEach(f => { if (!seen.includes(f.division)) seen.push(f.division); });
  const groups = seen.map(d => {
    const rows = fixtures.filter(f => f.division === d);
    // Every team in the division on one card, ranked on what the round paid.
    // Both sides of every fixture, so it is twelve rows off six matchups.
    const board = rows
      .flatMap(f => [f.left, f.right])
      .filter(x => x.t && x.wk)
      .map(x => ({
        id: x.t.id, short: short(x.t.name), mine: x.t.id === s.myTeamId,
        won: x.wk.won, score: x.wk.score, oppScore: x.wk.oppScore,
        pts: x.wk.teamPts,
      }))
      // Level on points, the better week goes above. Name last so the order is
      // decided by a rule rather than by whatever came back from the database.
      .sort((a, b) => b.pts - a.pts || b.score - a.score ||
                      a.short.localeCompare(b.short));
    return {
      division: d,
      label: DIV_LABEL[d] || (d ? String(d) : "Division"),
      accent: d === "championship" ? V.gold : V.silver,
      rows, board,
    };
  });

  const idx = s.drawn.findIndex(r => r.round === round);
  const go = (d) => {
    const next = s.drawn[idx + d];
    if (next) setRound(next.round);
  };

  return (
    <div style={{ background: V.bg, minHeight: "100vh" }}>
      <style>{VEGAS_CSS}</style>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Monoton&family=Encode+Sans+Semi+Condensed:wght@400;600;700&family=Chakra+Petch:wght@600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');`}</style>
      <div style={wrap}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <Arrow dir="left" on={idx > 0} onClick={() => go(-1)} />
          <div style={{ flex: 1, textAlign: "center", minWidth: 0 }}>
            <p style={{ ...display("h2"), fontSize: 26, color: THEIRS, margin: 0,
                        ...textGlow(THEIRS, 0.7), textTransform: "uppercase" }}>
              Round {round}
            </p>
            <p style={{ ...display("chip"), fontSize: 12, color: OTHER, margin: "3px 0 0",
                        letterSpacing: "0.05em" }}>
              {race ? race.race_name : ""}
            </p>
          </div>
          <Arrow dir="right" on={idx < s.drawn.length - 1} onClick={() => go(1)} />
        </div>
        {/* Same gold line the home page carries, set the same way. */}
        <p style={{ ...display("chip"), fontSize: 11, color: V.gold, textAlign: "center",
                    margin: "0 0 16px", letterSpacing: "0.05em",
                    textTransform: "uppercase" }}>
          {isScored ? "Final" : (raceTimePT(round) || "")}
        </p>

        {groups.map(g => (
          <div key={g.division}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "6px 0 10px" }}>
              <span style={{ ...display("chip"), fontSize: 12, color: g.accent,
                             letterSpacing: "0.08em", whiteSpace: "nowrap" }}>{g.label}</span>
              <div style={{ flex: 1, height: 1, background: `${g.accent}44` }} />
            </div>
            {(() => {
              const fx = (f) => (
                <Fixture key={f.id} f={f} scored={isScored} variant={variant}
                         live={demoLive && isScored} />
              );
              // Your own game goes above the board. It is the one of the six
              // you came for, and a table of twelve is what you read after it.
              const mine = variant === 3 ? g.rows.filter(f => f.mine) : [];
              const rest = g.rows.filter(f => !mine.includes(f));
              const board = variant === 3 && isScored && g.board.length > 0 && (
                <DivisionScorecard key="board" rows={g.board} live={demoLive} />
              );
              return <>{mine.map(fx)}{board}{rest.map(fx)}</>;
            })()}
          </div>
        ))}
      </div>
    </div>
  );
}

// First initial and last name, because two numbers under a total with nothing
// attached to them are just two numbers.
const initialLast = (full) => {
  const bits = String(full || "").trim().split(/\s+/);
  return bits.length < 2 ? bits[0] || "" : `${bits[0][0]} ${bits[bits.length - 1]}`;
};

// The two players in score order, highest first. Reading the bigger number
// first is how anyone reads a scoreline.
function rosterOf(team, row, raceId, namesById, placeById = {}) {
  if (!team) return [];
  const one = (id, pts) => ({ name: namesById[id], pts, place: placeById[id] });
  const wk = row && row.weeks.find(x => x.raceId === raceId);
  // Before the race there is no week to sort on, so they stay in roster order.
  if (!wk) return [one(team.player1_id, null), one(team.player2_id, null)];
  return [one(team.player1_id, wk.parts.p1), one(team.player2_id, wk.parts.p2)]
    .sort((a, b) => b.pts - a.pts);
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

// The width a string actually inks, so a name can be fitted to its column
// rather than truncated. Canvas has no letter-spacing, so the tracking the
// Name style carries is added back by hand.
let _ctx = null;
function textWidth(text, px, weight = 600, tracking = 0.08) {
  if (typeof document === "undefined") return 0;
  if (!_ctx) _ctx = document.createElement("canvas").getContext("2d");
  _ctx.font = `${weight} ${px}px 'Encode Sans Semi Condensed', sans-serif`;
  return _ctx.measureText(text).width + tracking * px * text.length;
}

// A little air between the two teams, so the names and scores stop short of
// the divider instead of meeting on it.
const MIDLINE_GAP = 8;
// Half a card is about 156px; the logo takes 38 and the midline gap 8, so this
// is what a team name has before it would touch the logo.
const NAME_ROOM = 156 - 38 - MIDLINE_GAP;
const NAME_MAX = 15, NAME_MIN = 13;
function fitTo(text, room, max, min, tracking) {
  const w = textWidth(text, max, 600, tracking);
  if (!w || w <= room) return max;
  return Math.max(min, Math.floor((max * room / w) * 10) / 10);
}
const fitName = (text) => fitTo(text, NAME_ROOM, NAME_MAX, NAME_MIN, 0.08);

// One column, so a scorecard row is the full width of the card: about 309px,
// of which the result, scoreline and points take 83. Every name in the league
// clears that at full size, HomeworkTubes included, so nothing here wraps and
// nothing here shrinks. The fit stays as a backstop for a longer name later.
const ROW_NAME_ROOM = 220;
const fitRowName = (text) => fitTo(text, ROW_NAME_ROOM, 13, 11, 0.01);

// What the round paid, every team in the division on one card.
//
// Two columns of six. The first column is the six that scored best, so the
// card reads top to bottom then over, the way a results sheet does. It sits at
// the head of its division, under your own matchup, because your own week is
// the thing you came to look at and a table of twelve is what you look at next.
function DivisionScorecard({ rows, live }) {
  const Row = ({ r }) => (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "2.5px 0" }}>
      <span style={{ ...display("chip"), fontSize: fitRowName(r.short),
                     letterSpacing: "0.01em", flex: "1 1 0", minWidth: 0,
                     whiteSpace: "nowrap",
                     color: r.mine ? OTHER : V.text }}>{r.short}</span>
      <span style={{ ...display("chip"), fontSize: 13, letterSpacing: 0, flexShrink: 0,
                     width: 12, textAlign: "center",
                     color: r.won === true ? MINE : r.won === false ? V.text3 : V.amber }}>
        {r.won === true ? "W" : r.won === false ? "L" : "D"}
      </span>
      {/* Fixed width so the scorelines stack into a column instead of ragging
          off the back of names that are all different lengths. */}
      <span style={{ ...numeric("chip"), fontSize: 13, color: V.text2, flexShrink: 0,
                     width: 52, textAlign: "right" }}>
        {r.score}&ndash;{r.oppScore}
      </span>
      <span style={{ ...numeric("chip"), fontSize: 15, flexShrink: 0, width: 30,
                     textAlign: "right",
                     color: r.pts > 0 ? OTHER : V.text3 }}>+{r.pts}</span>
    </div>
  );

  return (
    <div style={{ ...card({ padding: "9px 12px 11px", marginBottom: 12 }) }}>
      <p style={{ ...label({ fontSize: 13, color: V.text3 }), margin: "0 0 4px",
                  letterSpacing: "0.08em" }}>
        {live ? "Champ points as it stands" : "Champ points this round"}
      </p>
      {rows.map(r => <Row key={r.id} r={r} />)}
    </div>
  );
}

// One matchup, itemised.
//
// The card mirrors around the divider: the two totals meet in the middle and
// everything else runs outward from them, so the comparison is between two
// numbers side by side rather than two numbers a card apart.
function Fixture({ f, scored, variant = 1, live = false }) {
  const lw = f.left.wk, rw = f.right.wk;
  // Three states, and the middle one is the reason this is a phase and not a
  // boolean. Nothing is decided while a race is running, so live shows the
  // numbers and withholds the verdict.
  const phase = live ? "live" : scored ? "final" : "upcoming";
  const shown = phase !== "upcoming";
  const lWon = phase === "final" && lw && rw && lw.score > rw.score;
  const rWon = phase === "final" && rw && lw && rw.score > lw.score;

  // In your own matchup the colour is whose team it is and not who won, which
  // is the rule the home page runs on all week: green is your side, pink is
  // theirs, and losing does not turn your team into somebody else's. Winning is
  // said by the glow. Everywhere else there is no "yours", so green is the
  // winner and blue is the one who is not.
  const colour = (s2, won) => {
    if (phase === "upcoming") return V.text2;
    // Mid-race it is blue against pink and nothing is green: green is a result
    // and there is not one yet.
    if (phase === "live") return f.mine ? (s2.yours ? OTHER : THEIRS) : OTHER;
    if (f.mine) return s2.yours ? MINE : THEIRS;
    return won ? MINE : OTHER;
  };

  const Logo = ({ t, size = 24 }) => (t && t.logo_url
    ? <img src={t.logo_url} alt="" style={{ width: size, height: size, objectFit: "contain",
                                            flexShrink: 0 }} />
    : <div style={{ width: size, height: size, borderRadius: 6, flexShrink: 0,
                    background: V.bg2, border: `1px solid ${V.border}` }} />);

  const Name = ({ t, align }) => (
    <p style={{ ...display("chip"), fontSize: 15, color: V.text, margin: 0, minWidth: 0,
                textAlign: align, whiteSpace: "nowrap", overflow: "hidden",
                textOverflow: "ellipsis", flex: "1 1 0" }}>
      {t ? short(t.name) : "\u2014"}
    </p>
  );

  // mirror: this side is the right of the card, so it runs inward-out.
  const Side = ({ s, won, roster, mirror }) => {
    const c = colour(s, won);
    const box = s.wk ? s.wk.parts.boxBox : null;
    const row = (leftEl, rightEl) => (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {mirror ? rightEl : leftEl}{mirror ? leftEl : rightEl}
      </div>
    );

    // v3: the name over the score down the middle of the half, with the logo
    // out in the card's outer corner and the standings place in the inner one.
    // Both are positioned out of flow, so the bigger logo does not push the
    // name line taller than the type in it.
    const LOGO = 32;
    const nm = s.t ? short(s.t.name) : "\u2014";
    // Everything that names or scores this team runs to the midline and stops
    // a little short of it, which leaves the outer edge to the logo and gives
    // the name the width it needs to be written out rather than cut.
    const inward = mirror ? "left" : "right";
    const v3head = (
      <div style={{ position: "relative",
                    paddingLeft: mirror ? MIDLINE_GAP : LOGO + 6,
                    paddingRight: mirror ? LOGO + 6 : MIDLINE_GAP }}>
        <div style={{ position: "absolute", top: -1, [mirror ? "right" : "left"]: 0 }}>
          <Logo t={s.t} size={LOGO} />
        </div>
        {/* Fitted, never cut. A long name grows outward from the midline and
            steps the type down a little rather than losing its own end. */}
        <p style={{ ...display("chip"), fontSize: fitName(nm), color: V.text, margin: 0,
                    lineHeight: "22px", textAlign: inward, whiteSpace: "nowrap" }}>
          {nm}
        </p>
        <p style={{ ...numeric("hero"), fontSize: 32, color: shown ? c : V.text3,
                    textAlign: inward, margin: "2px 0 0",
                    ...(won ? textGlow(c, 0.9) : {}) }}>
          {shown && s.wk ? s.wk.score : "\u2013"}
        </p>
        <p style={{ ...display("chip"), fontSize: 13, color: c, margin: "1px 0 0",
                    letterSpacing: "0.06em", textAlign: inward }}>{s.side}</p>
      </div>
    );

    const head = variant === 3 ? v3head : variant === 2 ? (
      // Logo out on the edge, name beside it, total against the divider.
      <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0,
                    flexDirection: mirror ? "row-reverse" : "row" }}>
        <Logo t={s.t} />
        <Name t={s.t} align={mirror ? "right" : "left"} />
        <p style={{ ...numeric("hero"), fontSize: 34, color: scored ? c : V.text3,
                    margin: 0, flexShrink: 0, ...(won ? textGlow(c, 0.9) : {}) }}>
          {shown && s.wk ? s.wk.score : "\u2013"}
        </p>
      </div>
    ) : (
      <>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
                      gap: 7, minWidth: 0 }}>
          <Logo t={s.t} />
          <Name t={s.t} align="left" />
        </div>
        <p style={{ ...numeric("hero"), fontSize: 36, color: scored ? c : V.text3,
                    textAlign: "center", margin: "2px 0 0",
                    ...(won ? textGlow(c, 0.9) : {}) }}>
          {shown && s.wk ? s.wk.score : "\u2013"}
        </p>
      </>
    );

    return (
      <div style={{ flex: 1, minWidth: 0 }}>
        {head}
        {/* Under the score, not over the name: the side is a fact about the
            week, and the team is the thing being named. v3 carries its own,
            inside the head, so it lines up with the score it belongs to. */}
        {variant !== 3 && (
          <p style={{ ...display("chip"), fontSize: 11, color: c, margin: "2px 0 0",
                      letterSpacing: "0.06em", textAlign: variant === 2
                        ? (mirror ? "left" : "right") : "center" }}>{s.side}</p>
        )}

        {/* Names outward, scores against the divider, so the four numbers form
            two columns down the middle of the card. */}
        <div style={{ display: "grid", gap: 3, marginTop: 9 }}>
          {(roster.length ? roster : [{ name: null }, { name: null }]).map((r, i) => (
            <div key={i}>{row(
              // v3 hangs the player's place off the outer edge, so the names
              // start on one line down each side instead of ragging against
              // a place that changes width.
              variant === 3 ? (
                <span key="n" style={{ display: "flex", alignItems: "baseline", gap: 6,
                               flex: "1 1 0", minWidth: 0,
                               flexDirection: mirror ? "row-reverse" : "row" }}>
                  <span style={{ ...display("chip"), fontSize: 13, color: V.text3,
                                 letterSpacing: "0.02em", flexShrink: 0, width: 30,
                                 textAlign: mirror ? "right" : "left" }}>
                    {r.place != null ? ordinal(r.place) : ""}
                  </span>
                  <span style={{ ...body("bodySm"), fontSize: 14, color: V.text2,
                                 flex: "1 1 0", minWidth: 0, whiteSpace: "nowrap",
                                 overflow: "hidden", textOverflow: "ellipsis",
                                 textAlign: mirror ? "right" : "left" }}>
                    {r.name ? initialLast(r.name) : "\u2014"}
                  </span>
                </span>
              ) : (
                <span key="n" style={{ ...body("bodySm"), fontSize: 14, color: V.text2,
                               flex: "1 1 0", minWidth: 0, whiteSpace: "nowrap",
                               overflow: "hidden", textOverflow: "ellipsis",
                               textAlign: mirror ? "right" : "left" }}>
                  {r.name ? initialLast(r.name) : "\u2014"}
                </span>
              ),
              <span key="v" style={{ ...numeric("chip"), fontSize: 15, color: V.text,
                             flexShrink: 0 }}>
                {shown && r.pts != null ? r.pts : "\u2013"}
              </span>)}</div>
          ))}
          <div>{row(
            <span key="n" style={{ ...display("chip"), fontSize: 14, color: V.text3,
                           flex: "1 1 0", minWidth: 0, letterSpacing: "0.04em",
                           textAlign: mirror ? "right" : "left" }}>BOX BOX</span>,
            // Green for whoever took it, whichever matchup this is. BOX BOX is
            // won outright and six points change hands on it.
            <span key="v" style={{ ...numeric("chip"), fontSize: 15, flexShrink: 0,
                           color: phase !== "final" || box == null ? V.text3
                             : box > 0 ? MINE : V.text2 }}>
              {phase !== "final" || box == null ? "\u2013" : box > 0 ? `+${box}` : box}
            </span>)}</div>
        </div>
      </div>
    );
  };

  const MIN = 1.5, MAX = 4.5;
  const pc = (v) => ((Math.min(MAX, Math.max(MIN, v)) - MIN) / (MAX - MIN)) * 100;
  // Gold for the Championship, silver for the Second Division, and green when
  // BOX BOX was the difference: the same week with the stop on the other side
  // of the line is a win and a loss the other way round.
  const outline = f.boxBoxDecided && scored ? MINE
    : f.division === "championship" ? V.gold : V.silver;

  return (
    <div style={{
      ...card({ padding: "10px 12px 14px", marginBottom: 12 }),
      position: "relative",
      border: `1px solid ${outline}${f.boxBoxDecided && scored ? "cc" : "55"}`,
      // Yours gets its own ground, not just a line around it.
      ...(f.mine ? { background: `${MINE}12` } : {}),
    }}>
      {phase === "live" && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
                      gap: 7, marginBottom: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: 4, background: V.red,
                         boxShadow: `0 0 6px ${V.red}` }} />
          <span style={{ ...display("chip"), fontSize: 13, color: V.red,
                         letterSpacing: "0.1em" }}>LIVE</span>
          {lw && rw && lw.score !== rw.score && (
            <span style={{ ...display("chip"), fontSize: 13, color: V.text2,
                           letterSpacing: "0.05em" }}>
              {short((lw.score > rw.score ? f.left : f.right).t.name)} ahead by{" "}
              {Math.abs(lw.score - rw.score)}
            </span>
          )}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <Side s={f.left} won={lWon} roster={f.players.away} mirror={false} />
        <div style={{ width: 1, alignSelf: "stretch", background: V.border }} />
        <Side s={f.right} won={rWon} roster={f.players.home} mirror />
      </div>

      {/* The BOX BOX line, sitting on the bottom edge where it fell between 1.5
          and 4.5. Twelve cards down the page it reads as a scatter of where the
          league set its lines this week. */}
      {f.line != null && (
        <div style={{
          position: "absolute", left: `${pc(f.line)}%`, bottom: -4, width: 8, height: 8,
          marginLeft: -4, borderRadius: 4, background: V.blue,
          boxShadow: `0 0 6px ${V.blue}`,
        }} title={`BOX BOX line ${f.line.toFixed(2)}`} />
      )}
    </div>
  );
}
