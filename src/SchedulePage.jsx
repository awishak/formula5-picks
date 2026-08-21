import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { V, display, numeric, body, card, textGlow, VEGAS_CSS } from "./theme.vegas";
import { buildTeamTable, FIRST_H2_ROUND } from "./teamTable";
import { displayOf, shortOf } from "./teams";
import { raceTimePT } from "./raceTimes";

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

const short = (n) => shortOf(displayOf(n)) || n;

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
      const latest = [...drawn].reverse().find(r => scored.has(r.id)) || drawn[drawn.length - 1];

      setS({ loading: false, db, teams, races, schedule, drawn, scored,
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

  const race = s.races.find(r => r.round === round);
  const isScored = race ? s.scored.has(race.id) : false;
  // The table is built for this round alone, so a week reads as itself rather
  // than as a slice of a running total.
  const rows = buildTeamTable(s.db, { fromRound: round, toRound: round });
  const byId = Object.fromEntries(rows.map(r => [r.id, r]));
  const teamById = Object.fromEntries(s.teams.map(t => [t.id, t]));

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
    };
  });
  // Yours first. You are in one of twelve and it should not be a hunt.
  fixtures.sort((a, b) => (b.mine ? 1 : 0) - (a.mine ? 1 : 0));

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

        {fixtures.map(f => <Fixture key={f.id} f={f} scored={isScored} />)}
      </div>
    </div>
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

// One matchup. The totals are the loud thing and the three numbers under each
// are what they are made of, in the order the score is built: the two players,
// then BOX BOX.
function Fixture({ f, scored }) {
  const lw = f.left.wk, rw = f.right.wk;
  const lWon = scored && lw && rw && lw.score > rw.score;
  const rWon = scored && lw && rw && rw.score > lw.score;
  // In your own matchup the colour is whose team it is, not who won, which is
  // the rule the home page runs on all week: green is your side, pink is
  // theirs, and losing does not turn your team into somebody else's. Winning is
  // said by the glow. Everywhere else there is no "yours", so green is the
  // winner and blue is the other one.
  const colour = (s2, won) => {
    if (!scored) return V.text2;
    if (f.mine) return s2.yours ? MINE : THEIRS;
    return won ? MINE : OTHER;
  };

  const Side = ({ s, won }) => {
    const c = colour(s, won);
    const p = s.wk ? s.wk.parts : null;
    return (
      <div style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
        <p style={{ ...display("chip"), fontSize: 13, color: V.text, margin: 0,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {s.t ? short(s.t.name) : "—"}
        </p>
        <p style={{ ...display("chip"), fontSize: 10, color: c, margin: "1px 0 0",
                    letterSpacing: "0.06em" }}>{s.side}</p>
        <p style={{ ...numeric("hero"), fontSize: 34, color: scored ? c : V.text3,
                    margin: "2px 0 0", ...(won ? textGlow(c, 0.9) : {}) }}>
          {scored && s.wk ? s.wk.score : "–"}
        </p>
        {/* Player, player, BOX BOX. Lined up under the total they add to. */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 2 }}>
          {(p ? [p.p1, p.p2, p.boxBox] : [null, null, null]).map((v, i) => (
            <span key={i} style={{
              ...numeric("chip"), fontSize: 12, minWidth: 22,
              color: i === 2 ? OTHER : V.text2,
            }}>
              {v == null || !scored ? "–" : i === 2 && v > 0 ? `+${v}` : v}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      ...card({ padding: "10px 10px 12px", marginBottom: 10 }),
      display: "flex", alignItems: "flex-start", gap: 6,
      // Only yours is bordered. Glowing every card green because somebody won
      // it made all twelve look like the result.
      ...(f.mine ? { borderColor: `${MINE}55` } : {}),
    }}>
      <Side s={f.left} won={lWon} />
      <div style={{ width: 1, alignSelf: "stretch", background: V.border, marginTop: 6 }} />
      <Side s={f.right} won={rWon} />
    </div>
  );
}
