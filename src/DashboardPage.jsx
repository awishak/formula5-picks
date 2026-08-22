import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { V, FD, FN, FB, display, numeric, label, body, card, textGlow, edgeGlow } from "./theme.vegas";
import { buildTeamTable, rankByAverage, nextFixtures, ordinal, FIRST_H2_ROUND } from "./teamTable";
import { buildPlayerTable, placesBy } from "./playerTable";
import { displayOf } from "./teams";
import { currentRace } from "./raceTimes";
import VegasHome from "./VegasHome.jsx";

// Desktop mockup. Everything the phone spreads over five tabs, on one screen.
//
// Three columns. The left one IS the phone's home page, the same component
// rendering the same states, so the week never has two implementations that
// drift apart. The other two are the standings, side by side, which is the
// thing a phone can never do.

const MAX = 1360;

const Panel = ({ title, accent = V.blue, children, style }) => (
  <section style={{ ...card({ padding: 16 }), display: "flex", flexDirection: "column", minWidth: 0, ...style }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <span style={{ width: 10, height: 10, borderRadius: 5, background: accent, flexShrink: 0 }} />
      <h2 style={{ fontFamily: FD, fontWeight: 700, fontSize: 16, letterSpacing: "0.08em",
        textTransform: "uppercase", color: accent, margin: 0 }}>{title}</h2>
    </div>
    {children}
  </section>
);

// picked: a green ring and a tick. auto: the same, in amber, because Fernolo
// filled them in and that is not the same as turning up.
const Face = ({ name, photo, size = 30, picked = null, auto = false }) => {
  const ring = picked == null ? null : auto ? V.amber : picked ? V.green : V.text2;
  const inner = { width: size, height: size, borderRadius: "50%", flexShrink: 0,
    ...(ring ? { border: `2px solid ${ring}`, boxSizing: "border-box" } : {}),
    ...(picked === false ? { filter: "grayscale(0.8) brightness(0.7)" } : {}) };
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const body = photo
    ? <img src={photo} alt="" style={{ ...inner, objectFit: "cover" }} />
    : <div style={{ ...inner, background: `hsl(${h % 360} 62% 52%)`, display: "flex",
        alignItems: "center", justifyContent: "center", fontFamily: FD, fontWeight: 700,
        fontSize: size * 0.38, color: "#fff" }}>
        {(name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}</div>;
  if (picked !== true && !auto) return body;
  return (
    <span style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
      {body}
      <span style={{
        position: "absolute", right: -3, bottom: -3, width: 14, height: 14, borderRadius: "50%",
        background: auto ? V.amber : V.green, color: V.bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: FD, fontWeight: 700, fontSize: 10, lineHeight: 1,
        border: `1.5px solid ${V.bg2}`,
      }}>{auto ? "F" : "\u2713"}</span>
    </span>
  );
};

// ── tables ───────────────────────────────────────────────
function TeamTable({ rows, posOf, myTeamId, avgRank, fixtures, byId }) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      {rows.map(r => {
        const mine = r.id === myTeamId;
        const opp = fixtures.opponentOf[r.id] ? byId[fixtures.opponentOf[r.id]] : null;
        return (
          <div key={r.id} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 10,
            background: mine ? "rgba(0,217,255,0.08)" : "transparent",
            border: `1px solid ${mine ? V.blue : "transparent"}`,
          }}>
            <span style={{ ...numeric("chip"), fontSize: 15, color: V.text2, width: 26 }}>P{posOf[r.id]}</span>
            {r.logo && <img src={r.logo} alt="" style={{ width: 26, height: 26, objectFit: "contain" }} />}
            <span style={{ flex: 1, minWidth: 0, fontFamily: FD, fontWeight: 600, fontSize: 15,
              color: mine ? V.blue : V.text, whiteSpace: "nowrap", overflow: "hidden",
              textOverflow: "ellipsis" }}>{displayOf(r.name)}</span>
            <span style={{ ...body("bodySm"), fontSize: 13, color: V.text2, width: 44,
              fontVariantNumeric: "tabular-nums" }}>{r.w}-{r.l}{r.d ? `-${r.d}` : ""}</span>
            <span style={{ fontFamily: FD, fontSize: 12, color: V.text2, width: 74,
              whiteSpace: "nowrap", overflow: "hidden" }}>
              {opp ? `vs #${avgRank[opp.id]} ${opp.code}` : ""}
            </span>
            <span style={{ ...numeric("chip"), fontSize: 17, width: 34, textAlign: "right",
              ...textGlow(V.blue, 0.5) }}>{r.pts}</span>
          </div>
        );
      })}
    </div>
  );
}

function PlayerTable({ rows, place, meId, limit, pickState = {} }) {
  const shown = limit ? rows.slice(0, limit) : rows;
  return (
    <div style={{ display: "grid", gap: 4 }}>
      {shown.map(r => {
        const mine = r.id === meId;
        return (
          <div key={r.id} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", borderRadius: 10,
            background: mine ? "rgba(0,217,255,0.08)" : "transparent",
            border: `1px solid ${mine ? V.blue : "transparent"}`,
          }}>
            <span style={{ ...numeric("chip"), fontSize: 15, color: V.text2, width: 30 }}>P{place[r.id]}</span>
            <Face name={r.name} photo={r.photo} size={26}
                  picked={pickState[r.id] ? true : pickState[r.id] === undefined ? false : false}
                  auto={Boolean(pickState[r.id] && pickState[r.id].auto)} />
            <span style={{ flex: 1, minWidth: 0, fontFamily: FD, fontWeight: 600, fontSize: 15,
              color: mine ? V.blue : V.text, whiteSpace: "nowrap", overflow: "hidden",
              textOverflow: "ellipsis" }}>{r.name}</span>
            <span style={{ fontFamily: FD, fontSize: 12, color: V.text2, width: 92,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.teamName}</span>
            <span style={{ display: "flex", gap: 3, width: 62 }}>
              {Array(r.p1).fill("\u{1F3C6}").concat(Array(r.p2).fill("\u{1F948}"), Array(r.p3).fill("\u{1F949}"))
                .slice(0, 3).map((m, i) => <span key={i} style={{ fontSize: 13 }}>{m}</span>)}
            </span>
            <span style={{ ...numeric("chip"), fontSize: 17, width: 42, textAlign: "right",
              ...textGlow(V.blue, 0.5) }}>{r.avg.toFixed(1)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── page ─────────────────────────────────────────────────
export default function DashboardPage({ currentUser, onNavigate }) {
  const [s, setS] = useState({ loading: true });

  useEffect(() => {
    (async () => {
      try {
        const [players, teams, races, scores, schedule] = await Promise.all([
          supabase.from("players").select("id,name,photo_url"),
          supabase.from("teams").select("*"),
          supabase.from("races").select("*").order("round"),
          supabase.from("scores").select("*"),
          supabase.from("schedule").select("*"),
        ]).then(r => r.map(x => x.data || []));

        const db = { teams, races, scores, schedule };
        const season = buildTeamTable(db, { fromRound: 1, toRound: 99 });
        const avgRank = Object.fromEntries(rankByAverage(season).map(r => [r.id, r.avgRank]));
        const seed = Object.fromEntries(season.map(r => [r.id, r.avg]));
        const half = buildTeamTable(db, { fromRound: FIRST_H2_ROUND, toRound: 99, seed });
        const fixtures = nextFixtures(db);

        const now = new Date().toISOString();
        const race = currentRace(races, new Set((scores || []).map(x => x.race_id)))
          || races[races.length - 1];
        const me = players.find(p => p.name === currentUser);
        const myTeam = me ? teams.find(t => t.player1_id === me.id || t.player2_id === me.id) : null;
        const mateId = myTeam ? [myTeam.player1_id, myTeam.player2_id].find(i => i !== me.id) : null;
        const fx = myTeam ? schedule.find(m => m.race_id === race.id &&
          (m.home_team_id === myTeam.id || m.away_team_id === myTeam.id)) : null;
        const oppRow = fx ? teams.find(t => t.id === (fx.home_team_id === myTeam.id ? fx.away_team_id : fx.home_team_id)) : null;
        const ids = [myTeam, oppRow].filter(Boolean).flatMap(t => [t.player1_id, t.player2_id]);
        const picks = ids.length ? (await supabase.from("picks").select("player_id")
          .eq("race_id", race.id).in("player_id", ids)).data || [] : [];
        const has = new Set(picks.map(p => p.player_id));

        // Every player's status for this round, for the admin view of who has
        // and has not turned up. auto is selected separately so the page still
        // works before that column exists.
        let all = (await supabase.from("picks").select("player_id,auto").eq("race_id", race.id)).data;
        if (!all) all = (await supabase.from("picks").select("player_id").eq("race_id", race.id)).data || [];
        const pickState = Object.fromEntries(all.map(p => [p.player_id, { auto: Boolean(p.auto) }]));

        const pt = buildPlayerTable({ players, teams, races, scores });

        setS({
          loading: false, half, season, avgRank, fixtures,
          byId: Object.fromEntries(half.map(r => [r.id, r])),
          myTeamId: myTeam ? myTeam.id : null,
          players: pt, place: placesBy(pt, r => r.avg), meId: me ? me.id : null, pickState,
          week: {
            me: currentUser, teammate: mateId ? (players.find(p => p.id === mateId) || {}).name : null,
            race: { round: race.round, name: race.race_name, deadline: race.pick_deadline,
                    pitQuestion: race.pit_stop_question },
            pools: { top: race.top_drivers || [], mid: race.mid_drivers || [] },
            picksIn: { me: me ? has.has(me.id) : false, mate: mateId ? has.has(mateId) : false },
            side: fx && myTeam ? (fx.home_team_id === myTeam.id ? "OVER" : "UNDER") : null,
            myTeam: myTeam ? { name: displayOf(myTeam.name), logo: myTeam.logo_url } : null,
            opp: oppRow ? { name: displayOf(oppRow.name), logo: oppRow.logo_url } : null,
          },
        });
      } catch (e) { console.error(e); setS({ loading: false, error: true }); }
    })();
  }, [currentUser]);

  const wrap = { maxWidth: MAX, margin: "0 auto", padding: "18px 20px 60px" };
  if (s.loading || s.error) return (
    <div style={{ background: V.bg, minHeight: "100vh", ...wrap }}>
      <p style={{ ...body("body"), color: V.text2 }}>{s.error ? "Did not load." : "Loading"}</p>
    </div>
  );

  const posOf = {};
  ["championship", "second"].forEach(d => {
    const list = s.half.filter(r => r.division === d);
    list.forEach((r, i) => { posOf[r.id] = (i > 0 && list[i - 1].pts === r.pts) ? posOf[list[i - 1].id] : i + 1; });
  });

  const teamPanels = ["championship", "second"].map(d => (
    <Panel key={d} title={d === "championship" ? "Championship Division" : "Second Division"}
           accent={d === "championship" ? V.gold : V.silver}>
      <TeamTable rows={s.half.filter(r => r.division === d)} posOf={posOf} myTeamId={s.myTeamId}
                 avgRank={s.avgRank} fixtures={s.fixtures} byId={s.byId} />
    </Panel>
  ));

  return (
    <div style={{ background: V.bg, minHeight: "100vh" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Monoton&family=Encode+Sans+Semi+Condensed:wght@400;600;700&family=Chakra+Petch:wght@600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');`}</style>
      <div style={wrap}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "minmax(340px, 0.95fr) minmax(340px, 1.1fr) minmax(340px, 1.1fr)",
          gap: 14, alignItems: "start",
        }}>
          {/* The phone's home page, exactly as it is. It brings its own dark
              ground and its own 480px cap, which is a column here. */}
          <div style={{ ...card({ padding: 0, overflow: "hidden" }), minWidth: 0 }}>
            <VegasHome currentUser={currentUser} onNavigate={onNavigate} />
          </div>
          <div style={{ display: "grid", gap: 14 }}>{teamPanels}</div>
          <Panel title={`Players — ${Object.keys(s.pickState).length} of ${s.players.length} in`} accent={V.blue}>
            <PlayerTable rows={s.players} place={s.place} meId={s.meId} pickState={s.pickState} />
          </Panel>
        </div>

        <p style={{ ...body("bodySm"), color: V.text2, textAlign: "center", marginTop: 20 }}>
          Desktop mockup. The left column is the phone home page itself.
        </p>
      </div>
    </div>
  );
}
