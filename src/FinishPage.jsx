// The close races, at /finish. Built 2026-11-23 for the last two rounds.
//
// Where every team can still finish in its division (the true range, from
// src/finishRange.js), where it probably will (the forecast, same file), who
// goes up and who goes down, the 8th against 5th comparison, and the player
// championship as a gap chart. Linked from the top of /teams and /players.
// Nothing here scores anything: the tables come from teamTable.js and
// playerTable.js like every other page.
import { useEffect, useMemo, useState } from "react";
import { supabase, selectAll } from "./supabaseClient";
import { V, FM, FN, display, numeric, label, body, card, textGlow, edgeGlow, titleFit, titleBox } from "./theme.vegas";
import { buildTeamTable, FIRST_H2_ROUND } from "./teamTable";
import { buildPlayerTable } from "./playerTable";
import { ranges, project, projectPlayers, ZONES, LAST_ROUND } from "./finishRange";
import { PlayerTap, TeamTap } from "./PlayerCard.jsx";
import Loading from "./Loading.jsx";

const WRAP = { maxWidth: 480, margin: "0 auto", padding: "0 16px 96px" };
const TITLE_SIZE = titleFit("CLOSE RACES", { fill: 0.95, min: 15 });
const pct = p => (p <= 0 ? "0%" : p < 0.01 ? "<1%" : p > 0.99 && p < 1 ? ">99%" : `${Math.round(p * 100)}%`);

// A link to this page, for the top of /teams and /players.
export function FinishLink() {
  const go = e => {
    e.preventDefault();
    window.history.pushState(null, "", "/finish");
    window.dispatchEvent(new PopStateEvent("popstate"));
    window.scrollTo(0, 0);
  };
  return (
    <a href="/finish" onClick={go} className="v-follow" data-ring={V.gold} style={{
      "--fc": V.gold, display: "block", textAlign: "center", textDecoration: "none",
      padding: "12px 14px", borderRadius: 14, marginBottom: 18, background: `${V.gold}12`,
      ...edgeGlow(V.gold, 0.8),
    }}>
      <span style={{ ...display("h3", { fontSize: 17, letterSpacing: "0.06em" }), ...textGlow(V.gold, 0.8),
        textTransform: "uppercase" }}>Where you can finish</span>
    </a>
  );
}

function Head({ children, color = V.pink }) {
  return (
    <div style={{ margin: "26px 0 10px" }}>
      <span style={{ ...display("h2", { fontSize: 22, letterSpacing: "0.05em" }), ...textGlow(color, 0.8),
        textTransform: "uppercase", display: "inline-block", padding: "8px 14px", borderRadius: 14,
        ...edgeGlow(color, 0.7) }}>{children}</span>
    </div>
  );
}
const Note = ({ children }) => <p style={{ ...body("bodySm", { fontSize: 14, color: V.text2, lineHeight: 1.45 }), margin: "0 0 12px" }}>{children}</p>;

// One row a team, twelve places across. The bracket is every place still
// possible, the fill is how likely the forecast makes each one, and the ring
// is where the team is now.
function RangeChart({ divKey, rows, range, forecast, mineId }) {
  const zone = ZONES[divKey];
  const tone = p => (zone.up && zone.up.includes(p) ? V.green : zone.down && zone.down.includes(p) ? V.pink : zone.playoff === p ? V.gold : null);
  const cols = "22px 52px repeat(12, minmax(0, 1fr))";
  return (
    <div style={{ ...card({ padding: "12px 10px 10px" }) }}>
      <div style={{ display: "grid", gridTemplateColumns: cols, alignItems: "end", marginBottom: 6 }}>
        <span /><span />
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} style={{ ...numeric("chip", { fontSize: 13, color: tone(i + 1) || V.text3 }), textAlign: "center" }}>{i + 1}</span>
        ))}
      </div>
      {rows.map((r, i) => {
        const rg = range ? range[r.id] : null;
        const f = forecast[r.id];
        const peak = Math.max(...f.dist);
        const mine = r.id === mineId;
        return (
          <TeamTap key={r.id} id={r.id} style={{ display: "grid", gridTemplateColumns: cols, alignItems: "center",
            padding: "3px 0", borderTop: `1px solid ${V.border}`, background: mine ? `${V.blue}12` : "transparent" }}>
            <span style={{ ...numeric("chip", { fontSize: 14, color: V.text2 }) }}>{i + 1}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
              {r.logo && <img src={r.logo} alt="" style={{ width: 18, height: 18, objectFit: "contain", flexShrink: 0 }} />}
              <span style={{ ...display("chip", { fontSize: 13, color: mine ? V.blue : V.text }) }}>{r.code}</span>
            </span>
            {Array.from({ length: 12 }, (_, p) => {
              const place = p + 1;
              const can = rg ? place >= rg.best && place <= rg.worst : f.dist[p] > 0;
              const first = rg && place === rg.best, last = rg && place === rg.worst;
              const c = tone(place) || V.blue;
              const share = f.dist[p];
              return (
                <span key={p} title={`P${place}: ${pct(share)}`} style={{
                  height: 24, position: "relative", boxSizing: "border-box",
                  borderTop: can && rg ? `1.5px solid ${V.text2}` : "1.5px solid transparent",
                  borderBottom: can && rg ? `1.5px solid ${V.text2}` : "1.5px solid transparent",
                  borderLeft: first ? `1.5px solid ${V.text2}` : "none",
                  borderRight: last ? `1.5px solid ${V.text2}` : "none",
                  borderRadius: `${first ? 7 : 0}px ${last ? 7 : 0}px ${last ? 7 : 0}px ${first ? 7 : 0}px`,
                }}>
                  {share > 0 && <span style={{ position: "absolute", inset: 2, borderRadius: 4, background: c,
                    opacity: 0.12 + 0.88 * (share / peak), boxShadow: share === peak ? `0 0 8px ${c}` : "none" }} />}
                  {place === i + 1 && <span style={{ position: "absolute", left: "50%", top: "50%", width: 10, height: 10,
                    margin: -5, boxSizing: "border-box", borderRadius: "50%", border: `2px solid ${V.text}`, background: V.bg }} />}
                </span>
              );
            })}
          </TeamTap>
        );
      })}
    </div>
  );
}

// Horizontal bars, biggest first, a share to each.
function Bars({ items, color }) {
  const shown = items.filter(x => x.v >= 0.005).sort((a, b) => b.v - a.v);
  if (!shown.length) return null;
  return (
    <div style={{ ...card({ padding: "10px 12px" }), display: "grid", gap: 7 }}>
      {shown.map(x => (
        <div key={x.id} style={{ display: "grid", gridTemplateColumns: "104px minmax(0, 1fr) 46px", alignItems: "center", gap: 8 }}>
          <span style={{ ...display("chip", { fontSize: 14, color: x.mine ? V.blue : V.text }), whiteSpace: "nowrap",
            overflow: "hidden", textOverflow: "ellipsis" }}>{x.name}</span>
          <span style={{ height: 14, borderRadius: 7, background: V.bg3, overflow: "hidden" }}>
            <span style={{ display: "block", height: "100%", width: `${Math.max(2, x.v * 100)}%`, borderRadius: 7,
              background: color, boxShadow: `0 0 10px ${color}` }} />
          </span>
          <span style={{ ...numeric("chip", { fontSize: 15, color: V.text }), textAlign: "right" }}>{pct(x.v)}</span>
        </div>
      ))}
    </div>
  );
}

function RangeTable({ rows, range, forecast, divKey, mineId }) {
  const th = { ...label({ fontSize: 12, color: V.text2 }), padding: "4px 4px", textAlign: "right", whiteSpace: "nowrap" };
  const td = { ...numeric("chip", { fontSize: 15, color: V.text }), padding: "5px 4px", textAlign: "right", whiteSpace: "nowrap" };
  const champ = divKey === "championship";
  return (
    <div style={{ ...card({ padding: "8px 10px" }), marginTop: 10 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...th, textAlign: "left" }}>Team</th><th style={th}>Pts</th>
            {range && <th style={th}>Best</th>}{range && <th style={th}>Worst</th>}
            <th style={th}>{champ ? "Title" : "First"}</th><th style={th}>{champ ? "Stays up" : "Goes up"}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} style={{ borderTop: `1px solid ${V.border}` }}>
              <td style={{ ...td, textAlign: "left", fontFamily: "inherit", ...display("chip", { fontSize: 14,
                color: r.id === mineId ? V.blue : V.text }) }}>{r.short}</td>
              <td style={td}>{r.pts}</td>
              {range && <td style={td}>P{range[r.id].best}</td>}
              {range && <td style={td}>P{range[r.id].worst}</td>}
              <td style={td}>{pct(forecast[r.id].title)}</td>
              <td style={td}>{pct(forecast[r.id].up)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Every player against the leader. The bar is total points, drawn from the
// lowest total on the page so the gaps are what the eye reads.
function GapChart({ rows, me }) {
  const top = rows[0].pts, low = rows[rows.length - 1].pts, span = Math.max(1, top - low);
  return (
    <div style={{ ...card({ padding: "10px 12px" }), display: "grid", gap: 4 }}>
      {rows.map((r, i) => {
        const mine = me && r.id === me.id;
        const c = i === 0 ? V.gold : mine ? V.green : V.blue;
        return (
          <PlayerTap key={r.id} name={r.name} block style={{ display: "grid",
            gridTemplateColumns: "24px 104px minmax(0, 1fr) 44px", alignItems: "center", gap: 6 }}>
            <span style={{ ...numeric("chip", { fontSize: 13, color: V.text2 }) }}>{i + 1}</span>
            <span style={{ ...display("chip", { fontSize: 13, color: mine ? V.green : V.text }), whiteSpace: "nowrap",
              overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</span>
            <span style={{ height: 10, borderRadius: 5, background: V.bg3, overflow: "hidden" }}>
              <span style={{ display: "block", height: "100%", borderRadius: 5, background: c,
                width: `${6 + 94 * ((r.pts - low) / span)}%`, opacity: mine || i === 0 ? 1 : 0.7,
                boxShadow: mine || i === 0 ? `0 0 8px ${c}` : "none" }} />
            </span>
            <span style={{ ...numeric("chip", { fontSize: 14, color: i === 0 ? V.gold : V.text }), textAlign: "right" }}>
              {i === 0 ? r.pts : `−${top - r.pts}`}
            </span>
          </PlayerTap>
        );
      })}
    </div>
  );
}

export default function FinishPage({ currentUser }) {
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    (async () => {
      try {
        const [teams, races, scores, schedule, players] = await Promise.all([
          supabase.from("teams").select("*"),
          supabase.from("races").select("*"),
          selectAll("scores", "*"),
          supabase.from("schedule").select("*"),
          supabase.from("players").select("id,name,photo_url,nation"),
        ]).then(rs => rs.map(r => r.data || []));
        setState({ loading: false, db: { teams, races, scores, schedule, players } });
      } catch (e) {
        setState({ loading: false, error: true });
      }
    })();
  }, []);

  const built = useMemo(() => {
    if (!state.db) return null;
    const { db } = state;
    const roundOf = Object.fromEntries(db.races.map(r => [r.id, r.round]));
    const rounds = db.scores.map(s => roundOf[s.race_id]).filter(Boolean);
    if (!rounds.length) return null;
    const scored = Math.max(...rounds);
    const table = buildTeamTable(db, { fromRound: FIRST_H2_ROUND });
    const divisions = {
      championship: table.filter(r => r.division === "championship"),
      second: table.filter(r => r.division === "second"),
    };
    const pairsFor = (k, round) => {
      const idx = Object.fromEntries(divisions[k].map((r, i) => [r.id, i]));
      const ps = db.schedule.filter(m => roundOf[m.race_id] === round
        && idx[m.home_team_id] != null && idx[m.away_team_id] != null)
        .map(m => [idx[m.home_team_id], idx[m.away_team_id]]);
      return ps.length === divisions[k].length / 2 ? ps : null;
    };
    const range = {};
    Object.keys(divisions).forEach(k => { range[k] = ranges(divisions[k], { scored, pairs: pairsFor(k, scored + 1) }); });
    const forecast = project(divisions, { scored, pairsFor });
    const playerRows = buildPlayerTable(db);
    const left = Math.max(0, LAST_ROUND - scored);
    const playerForecast = projectPlayers(playerRows, { left });
    return { scored, left, divisions, range, forecast, playerRows, playerForecast };
  }, [state.db]);

  const shell = inner => (
    <div style={{ background: V.bg, minHeight: "100vh" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Monoton&family=Encode+Sans+Semi+Condensed:wght@400;600;700&family=Chakra+Petch:wght@600;700&display=swap');`}</style>
      <div style={WRAP}>
        <div className="v-pull" style={titleBox({ padding: "14px 0 14px" })}>
          <div className="v-wet" style={{ fontFamily: FM, fontWeight: 400, fontSize: TITLE_SIZE, lineHeight: 1.15,
            letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
            <span style={textGlow(V.pink)}>CLOSE</span>{" "}<span style={textGlow(V.blue)}>RACES</span>
          </div>
        </div>
        {inner}
      </div>
    </div>
  );
  if (state.loading) return shell(<Loading rows={6} />);
  if (state.error || !built) return shell(<p style={body("body", { color: V.text2 })}>This page did not load.</p>);

  const { scored, left, divisions, range, forecast, playerRows, playerForecast } = built;
  const meP = playerRows.find(r => r.name === currentUser) || null;
  const mineId = meP ? meP.teamId : null;
  const c8 = divisions.championship[7], s5 = divisions.second[4];
  const k = meP ? playerRows.indexOf(meP) : -1;
  const named = (rows, key, f) => rows.map(r => ({ id: r.id, name: r.short || r.name, v: f(r), mine: r.id === mineId || (meP && r.id === meP.id) }));

  const section = (divKey, name, color) => {
    const rows = divisions[divKey];
    if (!rows.length) return null;
    const champ = divKey === "championship";
    return (
      <>
        <Head color={color}>{name}</Head>
        <Note>
          {range[divKey]
            ? "The bracket is every place a team can still finish. The fill is how likely each place is, and the ring is where the team is now."
            : "The fill is how likely each place is, and the ring is where the team is now."}
          {champ ? " Pink places go down. 8th, in gold, is compared with 5th in the Second Division."
                 : " Green places go up. 5th, in gold, is compared with 8th in the Championship."}
        </Note>
        <RangeChart divKey={divKey} rows={rows} range={range[divKey]} forecast={forecast.teams} mineId={mineId} />
        <RangeTable rows={rows} range={range[divKey]} forecast={forecast.teams} divKey={divKey} mineId={mineId} />
        <div style={{ ...label({ fontSize: 13, color: V.text2 }), margin: "14px 0 6px" }}>{champ ? "Chance of the title" : "Chance of going up"}</div>
        <Bars items={named(rows, "t", r => (champ ? forecast.teams[r.id].title : forecast.teams[r.id].up))} color={champ ? V.gold : V.green} />
        {champ && (
          <>
            <div style={{ ...label({ fontSize: 13, color: V.text2 }), margin: "14px 0 6px" }}>Chance of going down</div>
            <Bars items={named(rows, "d", r => 1 - forecast.teams[r.id].up)} color={V.pink} />
          </>
        )}
      </>
    );
  };

  return shell(
    <>
      <Note>
        {left > 0
          ? `Through round ${scored}, with ${left === 1 ? "one round" : `${left} rounds`} left. The top four of the Second Division go up and the bottom four of the Championship go down.`
          : `Final, through round ${scored}.`}
      </Note>

      {section("championship", "Championship", V.gold)}
      {section("second", "Second Division", V.silver)}

      {c8 && s5 && (
        <>
          <Head color={V.gold}>8th against 5th</Head>
          <Note>If 5th in the Second Division has the higher second-half scoring average, it takes the Championship place of 8th.</Note>
          <div style={{ display: "flex", gap: 10 }}>
            {[[c8, "8th, Championship", c8.avg >= s5.avg], [s5, "5th, Second Division", s5.avg > c8.avg]].map(([t, where, ahead]) => (
              <TeamTap key={t.id} id={t.id} style={{ flex: 1, minWidth: 0, display: "block", textAlign: "center", padding: "12px 8px",
                borderRadius: 14, background: V.bg3, border: `2px solid ${ahead ? V.green : V.border2}`,
                ...(ahead ? edgeGlow(V.green, 0.8) : {}) }}>
                {t.logo && <img src={t.logo} alt="" style={{ width: 40, height: 40, objectFit: "contain" }} />}
                <div style={{ ...display("h3", { fontSize: 16, color: V.text }), marginTop: 4, whiteSpace: "nowrap",
                  overflow: "hidden", textOverflow: "ellipsis" }}>{t.short}</div>
                <div style={{ ...label({ fontSize: 12, color: V.text2 }), marginTop: 2 }}>{where}</div>
                <div style={{ ...numeric("hero", { fontSize: 34, color: ahead ? V.green : V.text2 }), marginTop: 6,
                  ...(ahead ? textGlow(V.green, 0.8) : {}) }}>{t.avg.toFixed(1)}</div>
              </TeamTap>
            ))}
          </div>
          {left > 0 && <Note><span style={{ display: "block", marginTop: 10 }}>The forecast has whoever finishes 5th in the Second Division taking the place {pct(forecast.swap)} of the time.</span></Note>}
        </>
      )}

      <Head color={V.blue}>Player championship</Head>
      {meP && k >= 0 && (
        <div style={{ ...card({ padding: "12px 14px", marginBottom: 10 }), ...edgeGlow(V.green, 0.7) }}>
          <div style={{ ...display("h3", { fontSize: 20, color: V.text }) }}>
            You are <span style={textGlow(V.green, 0.8)}>P{k + 1}</span> on {meP.pts} points
          </div>
          <div style={{ ...body("body", { fontSize: 16, color: V.text2 }), marginTop: 4, lineHeight: 1.5 }}>
            {k > 0 && <div>{playerRows[k - 1].pts - meP.pts} behind {playerRows[k - 1].name} in P{k}</div>}
            {k < playerRows.length - 1 && <div>{meP.pts - playerRows[k + 1].pts} ahead of {playerRows[k + 1].name} in P{k + 2}</div>}
            {k > 0 && <div>{playerRows[0].pts - meP.pts} behind the leader, {playerRows[0].name}</div>}
          </div>
        </div>
      )}
      {left > 0 && (
        <>
          <div style={{ ...label({ fontSize: 13, color: V.text2 }), margin: "4px 0 6px" }}>Chance of the title</div>
          <Bars items={playerRows.map(r => ({ id: r.id, name: r.name, v: playerForecast[r.id].title, mine: meP && r.id === meP.id }))} color={V.gold} />
          <div style={{ ...label({ fontSize: 13, color: V.text2 }), margin: "14px 0 6px" }}>Points behind the leader</div>
        </>
      )}
      <GapChart rows={playerRows} me={meP} />

      {left > 0 && (
        <p style={{ ...body("bodySm", { fontSize: 14, color: V.text2, lineHeight: 1.45 }), margin: "18px 0 0" }}>
          Best and worst are every result that is still mathematically possible. The chances are a forecast: the {left === 1 ? "last round" : `last ${left} rounds`} played {forecast.sims.toLocaleString("en-US")} times on each team&rsquo;s and each player&rsquo;s scoring so far. Drawn matchups are left out of both.
        </p>
      )}
    </>
  );
}
