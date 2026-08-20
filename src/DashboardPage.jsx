import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { V, FM, FD, FN, FB, display, numeric, label, body, card, textGlow, edgeGlow } from "./theme.vegas";
import { buildTeamTable, rankByAverage, nextFixtures, ordinal, FIRST_H2_ROUND } from "./teamTable";
import { buildPlayerTable, placesBy } from "./playerTable";
import { displayOf } from "./teams";

// Desktop mockup. Everything the phone spreads over five tabs, on one screen.
//
// Two layouts, switchable at the top:
//   Pit wall   three columns. The week on the left, the two tables beside it.
//              Nothing is more than a glance away and nothing is hero-sized.
//   Broadcast  the week across the top at full width, tables underneath. Reads
//              like a race graphic: one thing you are looking at, then detail.
//
// It runs on the same modules the phone does, so the numbers are the real ones.

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

const Face = ({ name, photo, size = 30 }) => {
  const s = { width: size, height: size, borderRadius: "50%", flexShrink: 0 };
  if (photo) return <img src={photo} alt="" style={{ ...s, objectFit: "cover" }} />;
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return <div style={{ ...s, background: `hsl(${h % 360} 62% 52%)`, display: "flex",
    alignItems: "center", justifyContent: "center", fontFamily: FD, fontWeight: 700,
    fontSize: size * 0.38, color: "#fff" }}>
    {(name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}</div>;
};

// ── the week ─────────────────────────────────────────────
function WeekPanel({ w, wide }) {
  const { race, picksIn, myTeam, opp, side, pools } = w;
  const closes = race.deadline ? new Date(race.deadline) - new Date() : null;
  const hrs = closes != null ? Math.max(0, Math.floor(closes / 3600e3)) : null;
  return (
    <Panel title={`Round ${race.round}`} accent={V.pink} style={{ gap: 14 }}>
      <div style={{ textAlign: wide ? "left" : "center" }}>
        <div style={{ fontFamily: FM, fontSize: wide ? 52 : 38, lineHeight: 1.1,
          ...textGlow(V.pink) }}>{race.name.replace(" Grand Prix", "").toUpperCase()}</div>
        <div style={{ fontFamily: FM, fontSize: wide ? 30 : 22, lineHeight: 1.2, marginTop: 4,
          ...textGlow(V.blue) }}>GRAND PRIX</div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {[{ k: "Picks close", v: hrs != null ? `${hrs}h` : "—", c: V.pink },
          { k: "Your side", v: side || "—", c: V.gold },
          { k: "The needle", v: race.pitQuestion ? race.pitQuestion.split("'")[0] : "—", c: V.purple }]
          .map(s => (
          <div key={s.k} style={{ flex: "1 1 120px", padding: "10px 12px", borderRadius: 12,
            background: V.bg3, border: `1px solid ${V.border}` }}>
            <div style={label({ color: V.text2, fontSize: 11 })}>{s.k}</div>
            <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 18, color: s.c, marginTop: 3,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px",
        borderRadius: 12, background: V.bg3, border: `1px solid ${V.border}` }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={label({ color: V.text2, fontSize: 11, marginBottom: 4 })}>You play</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {opp && opp.logo && <img src={opp.logo} alt="" style={{ width: 30, height: 30, objectFit: "contain" }} />}
            <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 17, color: V.text,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{opp ? opp.name : "—"}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {[{ n: w.me, in: picksIn.me }, { n: w.teammate, in: picksIn.mate }].filter(p => p.n).map(p => (
            <div key={p.n} style={{ textAlign: "center" }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%",
                border: `2px solid ${p.in ? V.green : V.text2}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: FD, fontWeight: 700, fontSize: 13,
                color: p.in ? V.green : V.text2 }}>{p.in ? "✓" : "·"}</div>
              <div style={{ fontFamily: FD, fontSize: 12, color: p.in ? V.green : V.text2, marginTop: 3 }}>
                {p.n.split(" ")[0]}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div style={label({ color: V.text2, fontSize: 11, marginBottom: 8 })}>This week&rsquo;s pool</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {[...pools.top, ...pools.mid].map((d, i) => (
            <span key={d} style={{ padding: "5px 9px", borderRadius: 100,
              background: V.bg3, border: `1px solid ${i < pools.top.length ? V.gold : V.border}`,
              fontFamily: FD, fontWeight: 600, fontSize: 13,
              color: i < pools.top.length ? V.gold : V.text2 }}>{d.split(" ").slice(-1)[0]}</span>
          ))}
        </div>
      </div>
    </Panel>
  );
}

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

function PlayerTable({ rows, place, meId, limit }) {
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
            <Face name={r.name} photo={r.photo} size={26} />
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
export default function DashboardPage({ currentUser }) {
  const [s, setS] = useState({ loading: true });
  // ?lay=cast opens on the other one, so either can be sent as a link.
  const [lay, setLay] = useState(() =>
    new URLSearchParams(window.location.search).get("lay") === "cast" ? "cast" : "wall");

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
        const race = races.find(r => r.pick_deadline && r.pick_deadline > now) || races[races.length - 1];
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

        const pt = buildPlayerTable({ players, teams, races, scores });

        setS({
          loading: false, half, season, avgRank, fixtures,
          byId: Object.fromEntries(half.map(r => [r.id, r])),
          myTeamId: myTeam ? myTeam.id : null,
          players: pt, place: placesBy(pt, r => r.avg), meId: me ? me.id : null,
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

  const wall = lay === "wall";
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
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
          <div style={{ fontFamily: FM, fontSize: 26, ...textGlow(V.blue) }}>FORMULA 5</div>
          <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
            {[["wall", "Pit wall"], ["cast", "Broadcast"]].map(([id, t]) => (
              <button key={id} onClick={() => setLay(id)} style={{
                padding: "8px 14px", borderRadius: 10, cursor: "pointer",
                background: lay === id ? "rgba(0,217,255,0.12)" : V.bg3,
                border: `1px solid ${lay === id ? V.blue : V.border}`,
                fontFamily: FD, fontWeight: 600, fontSize: 14,
                color: lay === id ? V.blue : V.text2,
              }}>{t}</button>
            ))}
          </div>
        </div>

        {wall ? (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 1fr) minmax(340px, 1.15fr) minmax(340px, 1.15fr)", gap: 14, alignItems: "start" }}>
            <WeekPanel w={s.week} wide={false} />
            <div style={{ display: "grid", gap: 14 }}>{teamPanels}</div>
            <Panel title="Players" accent={V.blue}>
              <PlayerTable rows={s.players} place={s.place} meId={s.meId} limit={20} />
            </Panel>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            <WeekPanel w={s.week} wide />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, alignItems: "start" }}>
              {teamPanels}
              <Panel title="Players" accent={V.blue}>
                <PlayerTable rows={s.players} place={s.place} meId={s.meId} limit={14} />
              </Panel>
            </div>
          </div>
        )}

        <p style={{ ...body("bodySm"), color: V.text2, textAlign: "center", marginTop: 20 }}>
          Desktop mockup. Real numbers, same modules as the phone.
        </p>
      </div>
    </div>
  );
}
