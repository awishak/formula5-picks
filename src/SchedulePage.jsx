import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { V, display, numeric, body, card, textGlow, VEGAS_CSS } from "./theme.vegas";
import { buildTeamTable, FIRST_H2_ROUND } from "./teamTable";
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

  // ?v=2 mirrors the whole card around the divider: logos to the outer edges
  // and both totals meeting in the middle. ?v=1 keeps the team block centred.
  const variant = typeof window === "undefined" ? 1
    : (Number(new URLSearchParams(window.location.search).get("v")) === 2 ? 2 : 1);
  const race = s.races.find(r => r.round === round);
  const isScored = race ? s.scored.has(race.id) : false;
  // The table is built for this round alone, so a week reads as itself rather
  // than as a slice of a running total.
  const rows = buildTeamTable(s.db, { fromRound: round, toRound: round });
  const byId = Object.fromEntries(rows.map(r => [r.id, r]));
  const teamById = Object.fromEntries(s.teams.map(t => [t.id, t]));

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
        away: rosterOf(teamById[m.away_team_id], away, race.id, s.playersById),
        home: rosterOf(teamById[m.home_team_id], home, race.id, s.playersById),
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
  const groups = seen.map(d => ({
    division: d,
    label: DIV_LABEL[d] || (d ? String(d) : "Division"),
    accent: d === "championship" ? V.gold : V.silver,
    rows: fixtures.filter(f => f.division === d),
  }));

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
            {g.rows.map(f => (
              <Fixture key={f.id} f={f} scored={isScored} variant={variant} />
            ))}
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
function rosterOf(team, row, raceId, namesById) {
  if (!team || !row) return [];
  const wk = row.weeks.find(x => x.raceId === raceId);
  if (!wk) return [];
  return [
    { name: namesById[team.player1_id], pts: wk.parts.p1 },
    { name: namesById[team.player2_id], pts: wk.parts.p2 },
  ].sort((a, b) => b.pts - a.pts);
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

// One matchup, itemised.
//
// The card mirrors around the divider: the two totals meet in the middle and
// everything else runs outward from them, so the comparison is between two
// numbers side by side rather than two numbers a card apart.
function Fixture({ f, scored, variant = 1 }) {
  const lw = f.left.wk, rw = f.right.wk;
  const lWon = scored && lw && rw && lw.score > rw.score;
  const rWon = scored && lw && rw && rw.score > lw.score;

  // In your own matchup the colour is whose team it is and not who won, which
  // is the rule the home page runs on all week: green is your side, pink is
  // theirs, and losing does not turn your team into somebody else's. Winning is
  // said by the glow. Everywhere else there is no "yours", so green is the
  // winner and blue is the one who is not.
  const colour = (s2, won) => {
    if (!scored) return V.text2;
    if (f.mine) return s2.yours ? MINE : THEIRS;
    return won ? MINE : OTHER;
  };

  const Logo = ({ t }) => (t && t.logo_url
    ? <img src={t.logo_url} alt="" style={{ width: 24, height: 24, objectFit: "contain",
                                            flexShrink: 0 }} />
    : <div style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0,
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

    const head = variant === 2 ? (
      // Logo out on the edge, name beside it, total against the divider.
      <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0,
                    flexDirection: mirror ? "row-reverse" : "row" }}>
        <Logo t={s.t} />
        <Name t={s.t} align={mirror ? "right" : "left"} />
        <p style={{ ...numeric("hero"), fontSize: 34, color: scored ? c : V.text3,
                    margin: 0, flexShrink: 0, ...(won ? textGlow(c, 0.9) : {}) }}>
          {scored && s.wk ? s.wk.score : "\u2013"}
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
          {scored && s.wk ? s.wk.score : "\u2013"}
        </p>
      </>
    );

    return (
      <div style={{ flex: 1, minWidth: 0 }}>
        {head}
        {/* Under the score, not over the name: the side is a fact about the
            week, and the team is the thing being named. */}
        <p style={{ ...display("chip"), fontSize: 11, color: c, margin: "2px 0 0",
                    letterSpacing: "0.06em", textAlign: variant === 2
                      ? (mirror ? "left" : "right") : "center" }}>{s.side}</p>

        {/* Names outward, scores against the divider, so the four numbers form
            two columns down the middle of the card. */}
        <div style={{ display: "grid", gap: 3, marginTop: 9 }}>
          {(roster.length ? roster : [{ name: null }, { name: null }]).map((r, i) => (
            <div key={i}>{row(
              <span key="n" style={{ ...body("bodySm"), fontSize: 14, color: V.text2,
                             flex: "1 1 0", minWidth: 0, whiteSpace: "nowrap",
                             overflow: "hidden", textOverflow: "ellipsis",
                             textAlign: mirror ? "right" : "left" }}>
                {r.name ? initialLast(r.name) : "\u2014"}
              </span>,
              <span key="v" style={{ ...numeric("chip"), fontSize: 15, color: V.text,
                             flexShrink: 0 }}>
                {scored && r.pts != null ? r.pts : "\u2013"}
              </span>)}</div>
          ))}
          <div>{row(
            <span key="n" style={{ ...display("chip"), fontSize: 14, color: V.text3,
                           flex: "1 1 0", minWidth: 0, letterSpacing: "0.04em",
                           textAlign: mirror ? "right" : "left" }}>BOX BOX</span>,
            // Green for whoever took it, whichever matchup this is. BOX BOX is
            // won outright and six points change hands on it.
            <span key="v" style={{ ...numeric("chip"), fontSize: 15, flexShrink: 0,
                           color: !scored || box == null ? V.text3 : box > 0 ? MINE : V.text2 }}>
              {!scored || box == null ? "\u2013" : box > 0 ? `+${box}` : box}
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
