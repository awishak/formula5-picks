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
import { buildTeamTable, ordinal, FIRST_H2_ROUND } from "./teamTable";
import { buildPlayerTable } from "./playerTable";
import { ranges, project, projectPlayers, ZONES, LAST_ROUND } from "./finishRange";
import { PlayerTap, TeamTap } from "./PlayerCard.jsx";
import Loading from "./Loading.jsx";

const WRAP = { maxWidth: 480, margin: "0 auto", padding: "0 16px 96px" };
const TITLE_SIZE = titleFit("TWO WEEKS LEFT", { fill: 0.95, min: 15 });
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
        textTransform: "uppercase" }}>The last two weeks</span>
    </a>
  );
}

const initials = n => String(n || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
function Face({ src, name, size = 22, ring = V.border2, glow = false }) {
  const box = { width: size, height: size, borderRadius: "50%", flexShrink: 0, boxSizing: "border-box",
    border: `${size > 40 ? 2.5 : 1.5}px solid ${ring}`, boxShadow: glow ? `0 0 14px ${ring}` : "none" };
  if (src) return <img src={src} alt="" style={{ ...box, objectFit: "cover", objectPosition: "center top", background: V.bg3 }} />;
  return <span style={{ ...box, display: "inline-flex", alignItems: "center", justifyContent: "center", background: V.bg4,
    ...display("chip", { fontSize: Math.max(10, size * 0.36), color: V.text2 }) }}>{initials(name)}</span>;
}
function Logo({ src, name, size = 22, glow = null }) {
  if (!src) return <Face name={name} size={size} />;
  return <img src={src} alt="" style={{ width: size, height: size, objectFit: "contain", flexShrink: 0,
    filter: glow ? `drop-shadow(0 0 8px ${glow})` : "none" }} />;
}

// Who is ahead of you and who is behind: the three in a row, you in the
// middle and biggest. Each item is { key, wrap, pic, place, name, line, tone }.
function Ladder({ items }) {
  return (
    <div style={{ ...card({ padding: "14px 8px 12px" }), display: "flex", alignItems: "flex-end", gap: 4 }}>
      {items.map(it => (
        <div key={it.key} className={it.me ? "fr-pop" : "fr-rise"} style={{ "--d": it.me ? "0.1s" : "0.35s", flex: it.me ? 1.25 : 1, minWidth: 0 }}>
          {it.wrap(
            <div style={{ display: "grid", justifyItems: "center", gap: 3, textAlign: "center" }}>
              <div style={{ ...numeric("chip", { fontSize: it.me ? 22 : 16, color: it.tone }), ...(it.me ? textGlow(it.tone, 0.8) : {}) }}>P{it.place}</div>
              {it.pic}
              {it.under}
              <div style={{ ...display("chip", { fontSize: it.me ? 16 : 14, color: V.text }), maxWidth: "100%", lineHeight: 1.1,
                minHeight: "2.2em", display: "grid", alignItems: "center", marginTop: 2 }}>{it.name}</div>
              <div style={{ ...numeric("chip", { fontSize: it.me ? 17 : 15, color: it.tone }) }}>{it.line}</div>
              <div style={{ ...label({ fontSize: 11, color: V.text2 }) }}>{it.sub}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Head({ children, color = V.pink }) {
  return (
    <div style={{ margin: "26px 0 10px" }}>
      <span style={{ ...display("h2", { fontSize: 22, letterSpacing: "0.05em" }), ...textGlow(color, 0.8),
        textTransform: "uppercase", display: "inline-block", padding: "8px 14px", borderRadius: 14, lineHeight: 1.15, maxWidth: "100%", boxSizing: "border-box",
        ...edgeGlow(color, 0.7) }}>{children}</span>
    </div>
  );
}
const Note = ({ children }) => <p style={{ ...body("bodySm", { fontSize: 14, color: V.text2, lineHeight: 1.45 }), margin: "0 0 12px" }}>{children}</p>;

// The motion on this page. Rows land, each bracket opens out from where the
// team is now, the fills come up left to right, the bars grow, and your own
// team's row breathes. Reduced motion turns all of it off.
const CSS = `
@keyframes frOpen { from { transform: scaleX(0); opacity: 0; } }
@keyframes frFill { from { opacity: 0; transform: scale(.4); } }
@keyframes frPop { 0% { transform: scale(0); } 70% { transform: scale(1.35); } }
@keyframes frGrow { from { transform: scaleX(0); } }
@keyframes frUp { from { transform: scaleY(0); } }
@keyframes frRise { from { transform: translateY(18px); opacity: 0; } }
@keyframes frBreathe { 50% { box-shadow: inset 0 0 14px ${V.green}55, 0 0 16px ${V.green}aa; } }
@keyframes frStem { from { transform: scaleY(0); opacity: 0; } }
.fr-open { animation: frOpen .7s cubic-bezier(.3, 1.3, .5, 1) var(--d, 0s) backwards; }
.fr-fill { animation: frFill .4s ease-out var(--d, 0s) backwards; }
.fr-pop { animation: frPop .5s cubic-bezier(.3, 1.6, .5, 1) var(--d, 0s) backwards; }
.fr-grow { transform-origin: left; animation: frGrow .9s cubic-bezier(.2, .9, .3, 1) var(--d, 0s) backwards; }
.fr-up { transform-origin: bottom; animation: frUp .7s cubic-bezier(.3, 1.4, .5, 1) var(--d, 0s) backwards; }
.fr-rise { animation: frRise .5s cubic-bezier(.2, .9, .3, 1.3) var(--d, 0s) backwards; }
.fr-mine { animation: frBreathe 2.6s ease-in-out infinite; }
.fr-stem { transform-origin: var(--o, top); animation: frStem .35s ease-out var(--d, 0s) backwards; }
@media (prefers-reduced-motion: reduce) {
  .fr-open, .fr-fill, .fr-pop, .fr-grow, .fr-up, .fr-rise, .fr-mine, .fr-stem { animation: none !important; }
}
`;

const zoneTone = (divKey, p) => {
  const z = ZONES[divKey];
  return z.up && z.up.includes(p) ? V.green : z.down && z.down.includes(p) ? V.pink : z.playoff === p ? V.gold : null;
};

// Twelve places across for one team: the fill is how likely each place is,
// the bracket is every place still possible, the logo is where it is now.
function Track({ divKey, row, now, rg, f, height = 30, delay = 0 }) {
  const peak = Math.max(...f.dist);
  const logo = Math.round(height * 0.8);
  return (
    <span style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", height }}>
      {Array.from({ length: 12 }, (_, p) => {
        const c = zoneTone(divKey, p + 1) || V.blue, share = f.dist[p];
        return (
          <span key={p} title={`P${p + 1}: ${pct(share)}`} style={{ position: "relative" }}>
            {share > 0 && <span className="fr-fill" style={{ "--d": `${delay + 0.25 + p * 0.03}s`, position: "absolute", inset: 3,
              borderRadius: 4, background: c, opacity: 0.12 + 0.88 * (share / peak),
              boxShadow: share === peak ? `0 0 8px ${c}` : "none" }} />}
          </span>
        );
      })}
      {rg && <span className="fr-open" style={{ "--d": `${delay + 0.1}s`, position: "absolute", top: 0, bottom: 0,
        left: `${((rg.best - 1) / 12) * 100}%`, width: `${((rg.worst - rg.best + 1) / 12) * 100}%`,
        transformOrigin: `${rg.worst === rg.best ? 50 : ((now - rg.best + 0.5) / (rg.worst - rg.best + 1)) * 100}% 50%`,
        boxSizing: "border-box", border: `1.5px solid ${V.text2}`, borderRadius: 8, pointerEvents: "none" }} />}
      <span className="fr-pop" style={{ "--d": `${delay + 0.5}s`, position: "absolute", top: "50%",
        left: `${((now - 0.5) / 12) * 100}%`, width: logo, height: logo, margin: `${-logo / 2}px 0 0 ${-logo / 2}px` }}>
        {row.logo
          ? <img src={row.logo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain",
              filter: "drop-shadow(0 0 3px #000) drop-shadow(0 0 2px #000)" }} />
          : <span style={{ display: "block", width: 10, height: 10, margin: (logo - 10) / 2, boxSizing: "border-box",
              borderRadius: "50%", border: `2px solid ${V.text}`, background: V.bg }} />}
      </span>
    </span>
  );
}

// The legend is the reader's own row from the chart below, blown up: only the
// places the team can still finish, each big enough to carry its number. The
// same three marks as the chart (logo, bracket, fill), each named once.
function Legend({ divKey, row, now, rg, f, rows }) {
  const live = f.dist.map((v, i) => (v >= 0.005 ? i + 1 : 0)).filter(Boolean);
  const lo = Math.min(now, rg ? rg.best : Math.min(...live)), hi = Math.max(now, rg ? rg.worst : Math.max(...live));
  const places = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  const n = places.length, peak = Math.max(...f.dist);
  const big = n <= 5 ? 22 : n <= 8 ? 15 : 11, logo = n <= 5 ? 40 : n <= 8 ? 28 : 20;
  const zones = [
    places.some(p => zoneTone(divKey, p) === V.green) && [V.green, "Goes up"],
    places.some(p => zoneTone(divKey, p) === V.gold) && [V.gold, divKey === "championship" ? "Plays 5th in Second" : "Plays 8th in Champ"],
    places.some(p => zoneTone(divKey, p) === V.pink) && [V.pink, "Goes down"],
  ].filter(Boolean);
  const key = { display: "inline-flex", alignItems: "center", gap: 6, ...label({ fontSize: 12, color: V.text2 }) };
  return (
    <div style={{ ...card({ padding: "12px 12px 12px" }), ...edgeGlow(V.green, 0.6), marginTop: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, gap: n > 8 ? 3 : 8, alignItems: "end", height: 150,
        padding: "0 5px", borderBottom: `1.5px solid ${V.border2}` }}>
        {places.map((p, i) => {
          const c = zoneTone(divKey, p) || V.blue, share = f.dist[p - 1], top = share === peak;
          return (
            <span key={p} style={{ display: "grid", justifyItems: "center", alignContent: "end", height: "100%", gap: 4 }}>
              <span style={{ ...numeric("chip", { fontSize: big, color: top ? V.text : V.text2 }), whiteSpace: "nowrap" }}>{pct(share)}</span>
              <span className="fr-up" style={{ "--d": `${0.2 + i * 0.07}s`, width: "100%", height: `${Math.max(3, (share / peak) * 112)}px`,
                borderRadius: "7px 7px 0 0", background: c, opacity: top ? 1 : 0.7, boxShadow: top ? `0 0 14px ${c}` : "none" }} />
            </span>
          );
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, gap: n > 8 ? 3 : 8, padding: "5px 5px 0" }}>
        {places.map(p => (
          <span key={p} style={{ ...numeric("chip", { fontSize: n > 8 ? 13 : 16, color: p === now ? V.green : zoneTone(divKey, p) || V.text2 }), textAlign: "center" }}>P{p}</span>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, gap: n > 8 ? 3 : 8, padding: "6px 5px 0", justifyItems: "center", alignItems: "center" }}>
        {places.map((p, i) => {
          const t = rows[p - 1], me = p === now;
          return (
            <TeamTap key={p} id={t.id} className="fr-pop" style={{ "--d": `${0.7 + i * 0.06}s`, display: "block", opacity: me ? 1 : 0.8 }}>
              <Logo src={t.logo} name={t.name} size={me ? logo + 8 : logo} glow={me ? V.green : null} />
            </TeamTap>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: "6px 14px", flexWrap: "wrap", marginTop: 10 }}>
        <span style={key}><Logo src={row.logo} name={row.name} size={16} />In that place now</span>
        {zones.map(([c, t]) => (
          <span key={t} style={key}><span style={{ width: 14, height: 14, borderRadius: 4, background: c, boxShadow: `0 0 8px ${c}` }} />{t}</span>
        ))}
      </div>
    </div>
  );
}

// The next round for the reader's team: who it plays, and the season split on
// how that matchup goes. Each side is the forecast again, given that result.
function Fork({ divKey, me, opp, oppPlace, f, round, raceName, places }) {
  const champ = divKey === "championship";
  const side = (b, word, c, d) => {
    const peak = Math.max(...b.dist);
    return (
      <div className="fr-rise" style={{ "--d": `${d}s`, flex: 1, minWidth: 0, padding: "10px 10px 10px", borderRadius: 14, background: V.bg3,
        border: `1.5px solid ${c}`, boxShadow: `0 0 12px ${c}55` }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 6 }}>
          <span style={{ ...display("h3", { fontSize: 17, color: c }), ...textGlow(c, 0.7), textTransform: "uppercase", whiteSpace: "nowrap" }}>{word}</span>
          <span style={{ ...numeric("chip", { fontSize: 15, color: V.text2 }) }}>{pct(b.p)}</span>
        </div>
        <div style={{ ...numeric("hero", { fontSize: 44, color: V.text }), lineHeight: 1, marginTop: 8 }}>P{b.likely}</div>
        <div style={{ ...label({ fontSize: 11, color: V.text2 }), marginTop: 2 }}>Most likely</div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${places.length}, minmax(0, 1fr))`, gap: 2, marginTop: 10 }}>
          {places.map(p => {
            const z = zoneTone(divKey, p) || V.blue, v = b.dist[p - 1];
            return (
              <span key={p} style={{ display: "grid", gap: 2, justifyItems: "center" }}>
                <span style={{ position: "relative", width: "100%", height: 22, borderRadius: 4, overflow: "hidden", border: `1px solid ${z}44` }}>
                  <span className="fr-fill" style={{ "--d": `${d + 0.3}s`, position: "absolute", inset: 0, background: z, opacity: v > 0 ? 0.1 + 0.9 * (v / peak) : 0.03 }} />
                </span>
                {places.length <= 8 && <span style={{ ...numeric("chip", { fontSize: 11, color: V.text2 }) }}>{p}</span>}
              </span>
            );
          })}
        </div>
        {[[champ ? "Title" : "First", b.title, V.gold], [champ ? "Stays up" : "Goes up", b.up, V.green]].map(([k, v, bc], i) => (
          <div key={k} style={{ marginTop: 9 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ ...label({ fontSize: 11, color: V.text2 }) }}>{k}</span>
              <span style={{ ...numeric("chip", { fontSize: 16, color: bc }) }}>{pct(v)}</span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: V.bg, overflow: "hidden", marginTop: 3 }}>
              <span className="fr-grow" style={{ "--d": `${d + 0.4 + i * 0.1}s`, display: "block", height: "100%", width: `${Math.max(2, v * 100)}%`,
                borderRadius: 4, background: bc, boxShadow: `0 0 8px ${bc}` }} />
            </div>
          </div>
        ))}
      </div>
    );
  };
  return (
    <div style={{ ...card({ padding: "12px 12px 12px" }), marginTop: 10 }}>
      <div style={{ ...label({ fontSize: 12, color: V.text2 }), textAlign: "center" }}>Round {round}{raceName ? ` · ${raceName}` : ""}</div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)", alignItems: "center", gap: 8, margin: "10px 0 12px" }}>
        <TeamTap id={me.id} className="fr-rise" style={{ display: "grid", justifyItems: "center", gap: 4, textAlign: "center" }}>
          <Logo src={me.logo} name={me.name} size={58} glow={V.green} />
          <span style={{ ...display("chip", { fontSize: 15, color: V.green }), lineHeight: 1.1 }}>{me.short}</span>
        </TeamTap>
        <span style={{ ...display("h3", { fontSize: 18, color: V.text3 }) }}>V</span>
        <TeamTap id={opp.id} className="fr-rise" style={{ "--d": "0.15s", display: "grid", justifyItems: "center", gap: 4, textAlign: "center" }}>
          <Logo src={opp.logo} name={opp.name} size={58} glow={V.pink} />
          <span style={{ ...display("chip", { fontSize: 15, color: V.text }), lineHeight: 1.1 }}>{opp.short}</span>
          <span style={{ ...numeric("chip", { fontSize: 13, color: V.text2 }) }}>P{oppPlace} · {opp.pts} pts</span>
        </TeamTap>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {side(f.win, "If you win", V.green, 0.3)}
        {side(f.lose, "If you lose", V.pink, 0.45)}
      </div>
    </div>
  );
}

function RangeChart({ divKey, rows, range, forecast, mineId }) {
  const cols = "20px 38px minmax(0, 1fr)";
  return (
    <div style={{ ...card({ padding: "12px 10px 10px" }) }}>
      <div style={{ display: "grid", gridTemplateColumns: cols, alignItems: "end", marginBottom: 6 }}>
        <span /><span />
        <span style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))" }}>
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i} style={{ ...numeric("chip", { fontSize: 13, color: zoneTone(divKey, i + 1) || V.text3 }), textAlign: "center" }}>{i + 1}</span>
          ))}
        </span>
      </div>
      <div className="v-land">
        {rows.map((r, i) => {
          const mine = r.id === mineId;
          return (
            <div key={r.id} className={mine ? "fr-mine" : undefined} style={{ borderRadius: 10, margin: "0 -4px 2px" }}>
            <TeamTap id={r.id} style={{ display: "grid", gridTemplateColumns: cols, alignItems: "center",
              padding: "3px 4px", borderRadius: 10,
              ...(mine ? { background: `${V.green}1c`, border: `1.5px solid ${V.green}`, boxShadow: `0 0 10px ${V.green}66` }
                       : { border: "1.5px solid transparent", borderTopColor: V.border }) }}>
              <span style={{ ...numeric("chip", { fontSize: 14, color: mine ? V.green : V.text2 }) }}>{i + 1}</span>
              <span style={{ ...display("chip", { fontSize: 13, color: mine ? V.green : V.text }) }}>{r.code}</span>
              <Track divKey={divKey} row={r} now={i + 1} rg={range ? range[r.id] : null} f={forecast[r.id]} delay={i * 0.05} />
            </TeamTap>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Horizontal bars, biggest first, a share to each, growing in.
function Bars({ items, color, all }) {
  const shown = items.filter(x => all || x.v >= 0.005).sort((a, b) => b.v - a.v);
  if (!shown.length) return null;
  return (
    <div style={{ ...card({ padding: "10px 12px" }), display: "grid", gap: 7 }}>
      {shown.map((x, i) => (
        <div key={x.id} style={{ display: "grid", gridTemplateColumns: "26px 104px minmax(0, 1fr) 46px", alignItems: "center", gap: 7,
          ...(x.mine ? { margin: "-3px -6px", padding: "3px 6px", borderRadius: 10, background: `${V.green}1c`,
            boxShadow: `0 0 0 1.5px ${V.green}, 0 0 10px ${V.green}66` } : {}) }}>
          {x.pic}
          <span style={{ ...display("chip", { fontSize: 14, color: x.mine ? V.green : V.text }), lineHeight: 1.1, overflowWrap: "anywhere" }}>{x.name}</span>
          <span style={{ height: 14, borderRadius: 7, background: V.bg3, overflow: "hidden" }}>
            <span className="fr-grow" style={{ "--d": `${i * 0.06}s`, display: "block", height: "100%", width: `${Math.max(2, x.v * 100)}%`,
              borderRadius: 7, background: color, boxShadow: `0 0 10px ${color}` }} />
          </span>
          <span style={{ ...numeric("chip", { fontSize: 15, color: V.text }), textAlign: "right" }}>{pct(x.v)}</span>
        </div>
      ))}
    </div>
  );
}

// Your own finish: one bar a place, as tall as the forecast makes it likely,
// for every place with a real chance. Where you are now is lit.
function PlaceBars({ dist, now }) {
  const live = dist.map((v, i) => [i + 1, v]).filter(([, v]) => v >= 0.005);
  if (!live.length) return null;
  const first = live[0][0], last = live[live.length - 1][0], peak = Math.max(...dist);
  const span = Array.from({ length: last - first + 1 }, (_, i) => first + i);
  return (
    <div style={{ ...card({ padding: "12px 10px 8px" }) }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${span.length}, minmax(0, 1fr))`, gap: 3, alignItems: "end", height: 132 }}>
        {span.map((p, i) => {
          const v = dist[p - 1], c = p === now ? V.green : V.blue;
          return (
            <div key={p} style={{ display: "grid", justifyItems: "center", alignContent: "end", height: "100%", gap: 3 }}>
              {(v >= 0.04 || p === now) && <span style={{ ...numeric("chip", { fontSize: span.length > 14 ? 10 : 12, color: V.text }) }}>{Math.round(v * 100)}</span>}
              <span className="fr-up" style={{ "--d": `${i * 0.04}s`, width: "100%", height: `${Math.max(2, (v / peak) * 96)}px`,
                transformOrigin: "bottom", borderRadius: "5px 5px 0 0", background: c, opacity: p === now ? 1 : 0.75,
                boxShadow: p === now ? `0 0 10px ${c}` : "none" }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${span.length}, minmax(0, 1fr))`, gap: 3, marginTop: 4,
        borderTop: `1px solid ${V.border2}`, paddingTop: 4 }}>
        {span.map(p => (
          <span key={p} style={{ ...numeric("chip", { fontSize: span.length > 14 ? 10 : 12, color: p === now ? V.green : V.text2 }), textAlign: "center" }}>
            {span.length > 20 && p % 2 === 0 && p !== now ? "" : p}
          </span>
        ))}
      </div>
    </div>
  );
}

// Your season, round by round: every score as a bar, the best and the worst
// lit, your average as a line, and the week's place under the two extremes.
function SeasonBars({ weeks, avg }) {
  if (!weeks.length) return null;
  const hi = Math.max(...weeks.map(w => w.score)), lo = Math.min(...weeks.map(w => w.score));
  const top = Math.max(hi, 1);
  return (
    <div style={{ ...card({ padding: "12px 10px 8px" }) }}>
      <div style={{ position: "relative", display: "grid", gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))`, gap: 3,
        alignItems: "end", height: 110 }}>
        {weeks.map((w, i) => {
          const c = w.score === hi ? V.green : w.score === lo ? V.pink : V.blue;
          return <span key={w.round} className="fr-up" title={`Round ${w.round}: ${w.score}`} style={{ "--d": `${i * 0.03}s`,
            transformOrigin: "bottom", height: `${Math.max(2, (w.score / top) * 100)}%`, borderRadius: "4px 4px 0 0", background: c,
            opacity: c === V.blue ? 0.7 : 1, boxShadow: c === V.blue ? "none" : `0 0 10px ${c}` }} />;
        })}
        <span style={{ position: "absolute", left: 0, right: 0, bottom: `${(avg / top) * 100}%`, borderTop: `1.5px dashed ${V.gold}` }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))`, gap: 3, marginTop: 3 }}>
        {weeks.map(w => <span key={w.round} style={{ ...numeric("chip", { fontSize: 9, color: V.text3 }), textAlign: "center" }}>{w.round}</span>)}
      </div>
    </div>
  );
}

const Tile = ({ k, v, sub, color = V.text }) => (
  <div className="fr-rise" style={{ flex: "1 1 0", minWidth: 0, textAlign: "center", padding: "9px 4px", borderRadius: 12,
    background: V.bg3, border: `1px solid ${color === V.text ? V.border : `${color}66`}` }}>
    <div style={{ ...numeric("stat", { fontSize: 24, color }), ...(color === V.text ? {} : textGlow(color, 0.6)) }}>{v}</div>
    <div style={{ ...label({ fontSize: 11, color: V.text2 }), marginTop: 3 }}>{k}</div>
    {sub && <div style={{ ...numeric("chip", { fontSize: 13, color: V.text }), marginTop: 1 }}>{sub}</div>}
  </div>
);

// What the reader is fighting for, one lit line each, the chance beside it.
function Fights({ items }) {
  return (
    <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
      {items.map(([c, t, v, pic], i) => (
        <div key={t} className="fr-rise" style={{ "--d": `${0.3 + i * 0.15}s`, display: "flex", alignItems: "center", gap: 12, padding: "14px 14px", borderRadius: 16,
          background: V.bg3, border: `2px solid ${c}`, boxShadow: `0 0 16px ${c}66` }}>
          {pic}
          <span style={{ flex: 1, ...display("h2", { fontSize: 22, color: c }), ...textGlow(c, 0.7), lineHeight: 1.15 }}>{t}</span>
          {v && <span style={{ ...numeric("hero", { fontSize: 32, color: V.text }) }}>{v}</span>}
        </div>
      ))}
    </div>
  );
}

// One fight on /fights: everyone in it in table order, each with a picture,
// where they stand, and the chance. The dashed line is the cut the fight is
// about, drawn between the last place in and the first place out.
function FightRows({ items, color, cut, cutLabel }) {
  if (!items.length) return null;
  const at = cut == null ? -1 : (() => { const i = items.findIndex(x => x.place > cut); return i < 0 ? items.length : i; })();
  const line = (
    <div key="cut" style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ flex: 1, borderTop: `2px dashed ${color}` }} />
      <span style={{ ...label({ fontSize: 12, color }), ...textGlow(color, 0.6) }}>{cutLabel}</span>
      <span style={{ flex: 1, borderTop: `2px dashed ${color}` }} />
    </div>
  );
  const out = [];
  items.forEach((x, i) => {
    if (i === at) out.push(line);
    out.push(
      <div key={x.id} className={x.mine ? "fr-mine" : "fr-rise"} style={{ "--d": `${i * 0.05}s`, borderRadius: 12,
        ...(x.mine ? { margin: "-4px -6px", padding: "4px 6px", background: `${V.green}1c`, boxShadow: `0 0 0 1.5px ${V.green}, 0 0 10px ${V.green}66` } : {}) }}>
        {x.wrap(
          <span style={{ display: "grid", gridTemplateColumns: x.v == null ? "40px minmax(0, 1fr)" : "40px minmax(0, 1fr) 58px", alignItems: "center", gap: 10 }}>
            {x.pic}
            <span style={{ display: "grid", gap: 5, minWidth: 0 }}>
              <span style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                <span style={{ ...display("chip", { fontSize: 16, color: x.mine ? V.green : V.text }), lineHeight: 1.1 }}>{x.name}</span>
                <span style={{ ...numeric("chip", { fontSize: 13, color: V.text2 }), whiteSpace: "nowrap" }}>{ordinal(x.place)} · {x.pts} pts</span>
              </span>
              {x.v != null && (
                <span style={{ height: 12, borderRadius: 6, background: V.bg3, overflow: "hidden" }}>
                  <span className="fr-grow" style={{ "--d": `${0.15 + i * 0.05}s`, display: "block", height: "100%", width: `${Math.max(2, x.v * 100)}%`,
                    borderRadius: 6, background: color, boxShadow: `0 0 10px ${color}` }} />
                </span>
              )}
            </span>
            {x.v != null && <span style={{ ...numeric("stat", { fontSize: 22, color: V.text }), textAlign: "right" }}>{pct(x.v)}</span>}
          </span>
        )}
      </div>
    );
  });
  if (at === items.length) out.push(line);
  return <div style={{ ...card({ padding: "12px 12px" }), display: "grid", gap: 10 }}>{out}</div>;
}

// How the last two weeks work, at the top, drawn. Two numbered weeks and the
// promotion ladder. The sentences are Andrew's, from his messages of
// 2026-11-23, typos fixed.
function Explainer({ left, names, me, myPlace, opp, oppPlace, divKey, rows, all }) {
  const txt = { ...body("body", { fontSize: 16, color: V.text, lineHeight: 1.35 }) };
  const versus = (a, aPlace, b, bPlace, bName) => (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)", alignItems: "center", gap: 8, margin: "12px 0 10px" }}>
      <div className="fr-rise" style={{ display: "grid", justifyItems: "center", gap: 3, textAlign: "center" }}>
        <Logo src={a.logo} name={a.name} size={56} glow={V.green} />
        <span style={{ ...display("chip", { fontSize: 14, color: V.green }), lineHeight: 1.1 }}>{a.short}</span>
        {aPlace != null && <span style={{ ...numeric("chip", { fontSize: 20, color: V.text }) }}>{ordinal(aPlace)}</span>}
      </div>
      <span style={{ ...display("h3", { fontSize: 18, color: V.text3 }) }}>V</span>
      <div className="fr-rise" style={{ "--d": "0.15s", display: "grid", justifyItems: "center", gap: 3, textAlign: "center" }}>
        {b ? <Logo src={b.logo} name={b.name} size={56} glow={V.pink} />
          : <span style={{ width: 56, height: 56, borderRadius: 12, border: `2px dashed ${V.pink}`, display: "grid", placeItems: "center",
              ...numeric("hero", { fontSize: 30, color: V.pink }) }}>?</span>}
        <span style={{ ...display("chip", { fontSize: 14, color: V.text }), lineHeight: 1.1 }}>{bName}</span>
        {bPlace != null && <span style={{ ...numeric("chip", { fontSize: 20, color: V.text }) }}>{ordinal(bPlace)}</span>}
      </div>
    </div>
  );
  const week = (n, c, when, name, kids, d) => (
    <div className="fr-rise" style={{ "--d": `${d}s`, padding: "12px 14px", borderRadius: 16, background: V.bg3, border: `1.5px solid ${c}`, boxShadow: `0 0 12px ${c}44` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 40, height: 40, borderRadius: "50%", flex: "0 0 auto", display: "grid", placeItems: "center", background: c,
          boxShadow: `0 0 14px ${c}`, ...numeric("hero", { fontSize: 24, color: V.bg }) }}>{n}</span>
        <span>
          <span style={{ display: "block", ...label({ fontSize: 12, color: c }) }}>{when}</span>
          <span style={{ display: "block", ...display("h3", { fontSize: 20, color: V.text }), textTransform: "uppercase", lineHeight: 1.1 }}>{name}</span>
        </span>
      </div>
      {kids}
    </div>
  );
  const N = rows ? rows.length : 12;
  const seedOpp = me && rows ? rows[N - myPlace] : null;
  const pairs = Array.from({ length: N / 2 }, (_, i) => [i + 1, N - i]);
  const z = ZONES;
  // One division as it stands: every team's logo in table order, outlined in
  // the colour of what that place means, the place under it.
  const ladder = (key, name) => (
    <div style={{ marginTop: 12 }}>
      <div style={{ ...label({ fontSize: 12, color: V.text }), marginBottom: 5 }}>{name}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: 3 }}>
        {(all[key] || []).map((t, i) => {
          const c = zoneTone(key, i + 1), mine = me && t.id === me.id;
          return (
            <TeamTap key={t.id} id={t.id} style={{ display: "grid", justifyItems: "center", gap: 2 }}>
              <span className="fr-pop" style={{ "--d": `${0.3 + i * 0.04}s`, width: "100%", aspectRatio: "1", boxSizing: "border-box", borderRadius: 7, overflow: "hidden",
                display: "grid", placeItems: "center", background: V.bg, border: `2px solid ${c || V.border2}`,
                boxShadow: mine ? `0 0 0 2px ${V.text}, 0 0 12px ${V.text}` : c ? `0 0 8px ${c}aa` : "none" }}>
                {t.logo ? <img src={t.logo} alt={t.short} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  : <span style={{ ...display("chip", { fontSize: 9, color: V.text2 }) }}>{t.code}</span>}
              </span>
              <span style={{ ...numeric("chip", { fontSize: 12, color: c || (mine ? V.text : V.text3) }) }}>{i + 1}</span>
            </TeamTap>
          );
        })}
      </div>
    </div>
  );
  const key = (c, t) => <span style={{ display: "inline-flex", alignItems: "center", gap: 6, ...label({ fontSize: 12, color: V.text }) }}>
    <span style={{ width: 14, height: 14, boxSizing: "border-box", borderRadius: 4, border: `2px solid ${c}`, boxShadow: `0 0 8px ${c}` }} />{t}</span>;
  return (
    <div style={{ display: "grid", gap: 10, marginTop: 4 }}>
      {left === 2 && week(1, V.blue, "This week", names[0] || "Week 1", <>
        {me && opp && versus(me, myPlace, opp, oppPlace, opp.short)}
        <div style={{ ...txt, marginTop: me && opp ? 0 : 10 }}>At the start of the second half, I chose for you to play a team this week that I hoped would be close to you in the standings.
          {me && opp ? ` And you're playing ${opp.short}, who is in ${ordinal(oppPlace)} (you are in ${ordinal(myPlace)}). ` : " "}
          {me && opp && <strong>{Math.abs(oppPlace - myPlace) <= 2 ? "So it worked out!" : "Oh well, close enough."}</strong>}</div>
      </>, 0.05)}
      {left === 2 && <div style={{ justifySelf: "center", width: 3, height: 16, borderRadius: 2, background: V.border2, margin: "-4px 0" }} />}
      {week(left === 2 ? 2 : 1, V.pink, left === 2 ? "Next week, the last week" : "This week, the last week", names[left === 2 ? 1 : 0] || "The last week", <>
        {me && left === 2 && versus(me, null, null, null, "Decided after this week")}
        {me && left === 1 && opp && versus(me, myPlace, opp, oppPlace, opp.short)}
        <div style={{ ...txt, marginTop: me ? 0 : 10 }}>{left === 2 ? "Your opponent is determined by where you are after this week. " : ""}#1 vs #12, #2 vs #11 in each division, giving the advantage to top teams. We're still live, and the points count as any other.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6, marginTop: 10 }}>
          {pairs.map(([a, b]) => {
            const mine = me && left === 2 && (a === myPlace || b === myPlace);
            return <span key={a} style={{ ...numeric("chip", { fontSize: 16, color: V.text }), textAlign: "center", padding: "5px 4px", borderRadius: 9,
              background: mine ? `${V.green}22` : V.bg, border: `1.5px solid ${mine ? V.green : V.border2}`, boxShadow: mine ? `0 0 10px ${V.green}88` : "none" }}>
              {a} <span style={{ color: V.text3 }}>v</span> {b}</span>;
          })}
        </div>
        {me && left === 2 && seedOpp && seedOpp.id !== me.id && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, ...label({ fontSize: 12, color: V.text }) }}>
            <Logo src={seedOpp.logo} name={seedOpp.name} size={24} />
            As it stands: {ordinal(myPlace)} v {ordinal(N + 1 - myPlace)}, {seedOpp.short}</div>
        )}
      </>, 0.2)}
      <div className="fr-rise" style={{ "--d": "0.35s", padding: "12px 14px", borderRadius: 16, background: V.bg3, border: `1.5px solid ${V.gold}`, boxShadow: `0 0 12px ${V.gold}44` }}>
        <div style={{ ...display("h3", { fontSize: 20, color: V.gold }), ...textGlow(V.gold, 0.6), textTransform: "uppercase", lineHeight: 1.1 }}>Promotion and relegation</div>
        <div style={{ ...txt, marginTop: 6 }}>The same as the first half.</div>
        {ladder("championship", "Championship")}
        {ladder("second", "Second Division")}
        <div style={{ display: "flex", gap: "6px 14px", flexWrap: "wrap", marginTop: 10 }}>
          {key(V.green, "Top 4 go up")}{key(V.pink, "Bottom 4 go down")}{key(V.gold, "8th against 5th, on scoring average")}
        </div>
      </div>
    </div>
  );
}

// Two teammates, season points. a leads. The strip is every round: who took it.
function Duel({ a, b, team, pA, rounds, mine, big, compact }) {
  const ca = mine === a.name ? V.green : V.blue, cb = mine === b.name ? V.green : V.pink;
  const aw = rounds.filter(r => r.a > r.b).length, bw = rounds.filter(r => r.b > r.a).length, lv = rounds.length - aw - bw;
  const fs = big ? 64 : 40;
  // The short form, for a battle that is all but over: the two faces, the
  // gap, and the split.
  if (compact) {
    const side = (r, c, right) => (
      <PlayerTap name={r.name} block style={{ display: "flex", flexDirection: right ? "row-reverse" : "row", alignItems: "center", gap: 7, minWidth: 0, textAlign: right ? "right" : "left" }}>
        <Face src={r.photo} name={r.name} size={32} ring={c} glow={mine === r.name} />
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", ...display("chip", { fontSize: 13, color: mine === r.name ? V.green : V.text }), lineHeight: 1.1 }}>{r.name}</span>
          <span style={{ display: "block", ...numeric("chip", { fontSize: 14, color: c }) }}>{r.pts}</span>
        </span>
      </PlayerTap>
    );
    return (
      <div className="fr-rise" style={{ padding: "8px 0", borderTop: `1px solid ${V.border}` }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 44px minmax(0, 1fr)", alignItems: "center", gap: 6 }}>
          {side(a, ca, false)}
          <TeamTap id={team.id} style={{ display: "grid", justifyItems: "center", gap: 1 }}>
            <Logo src={team.logo} name={team.name} size={24} />
            <span style={{ ...numeric("chip", { fontSize: 14, color: V.text }) }}>{a.pts - b.pts}</span>
          </TeamTap>
          {side(b, cb, true)}
        </div>
        {pA != null && (
          <div style={{ display: "flex", height: 16, borderRadius: 8, overflow: "hidden", marginTop: 6, background: cb }}>
            <span style={{ width: `${Math.min(88, Math.max(12, pA * 100))}%`, background: ca, display: "flex", alignItems: "center", paddingLeft: 7,
              ...numeric("chip", { fontSize: 12, color: V.bg }), whiteSpace: "nowrap" }}>{pct(pA)}</span>
            <span style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 7,
              ...numeric("chip", { fontSize: 12, color: V.bg }), whiteSpace: "nowrap" }}>{pct(1 - pA)}</span>
          </div>
        )}
      </div>
    );
  }
  const who = (r, c, right) => (
    <PlayerTap name={r.name} block style={{ display: "grid", justifyItems: right ? "end" : "start", gap: 3, textAlign: right ? "right" : "left", minWidth: 0 }}>
      <Face src={r.photo} name={r.name} size={fs} ring={c} glow={mine === r.name} />
      <span style={{ ...display("chip", { fontSize: big ? 16 : 14, color: mine === r.name ? V.green : V.text }), lineHeight: 1.1 }}>{r.name}</span>
      <span style={{ ...numeric("chip", { fontSize: big ? 22 : 17, color: c }) }}>{r.pts}</span>
    </PlayerTap>
  );
  return (
    <div className={big ? "fr-mine" : "fr-rise"} style={{ ...card({ padding: "12px 12px" }), ...(big ? edgeGlow(V.green, 0.6) : {}) }}>
      <TeamTap id={team.id} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
        <Logo src={team.logo} name={team.name} size={big ? 30 : 22} />
        <span style={{ ...display("chip", { fontSize: big ? 16 : 14, color: V.text }) }}>{team.short}</span>
      </TeamTap>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)", alignItems: "center", gap: 8 }}>
        {who(a, ca, false)}
        <div style={{ textAlign: "center" }}>
          <div style={{ ...numeric("hero", { fontSize: big ? 34 : 24, color: V.text }), lineHeight: 1 }}>{a.pts - b.pts}</div>
          <div style={{ ...label({ fontSize: 11, color: V.text2 }), marginTop: 2 }}>points apart</div>
          <div style={{ ...numeric("chip", { fontSize: 14, color: V.text }), marginTop: 6 }}>
            <span style={{ color: ca }}>{aw}</span> · {lv} · <span style={{ color: cb }}>{bw}</span></div>
          <div style={{ ...label({ fontSize: 11, color: V.text2 }) }}>weeks won</div>
        </div>
        {who(b, cb, true)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${rounds.length}, minmax(0, 1fr))`, gap: 2, marginTop: 10 }}>
        {rounds.map((r, i) => (
          <span key={r.round} className="fr-fill" title={`Round ${r.round}: ${r.a} to ${r.b}`} style={{ "--d": `${i * 0.03}s`, height: big ? 16 : 10, borderRadius: 3,
            background: r.a > r.b ? ca : r.b > r.a ? cb : V.border2, opacity: r.a === r.b ? 1 : 0.9 }} />
        ))}
      </div>
      {pA != null && (
        <div style={{ display: "flex", height: 24, borderRadius: 12, overflow: "hidden", marginTop: 10, background: cb }}>
          <span className="fr-grow" style={{ width: `${Math.min(92, Math.max(8, pA * 100))}%`, background: ca, display: "flex", alignItems: "center", paddingLeft: 9,
            ...numeric("chip", { fontSize: 14, color: V.bg }), whiteSpace: "nowrap" }}>{pct(pA)}</span>
          <span style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 9,
            ...numeric("chip", { fontSize: 14, color: V.bg }), whiteSpace: "nowrap" }}>{pct(1 - pA)}</span>
        </div>
      )}
      {pA != null && <div style={{ ...label({ fontSize: 11, color: V.text2 }), textAlign: "center", marginTop: 4 }}>Chance of finishing ahead</div>}
    </div>
  );
}

// Everyone's odds: first, top 3 and top 10, one row a player.
function OddsTable({ rows, fc, me }) {
  const cols = "20px 26px minmax(0, 1fr) 40px 42px 46px 46px";
  const cell = (v, c) => <span style={{ ...numeric("chip", { fontSize: 14, color: v < 0.005 ? V.text3 : c }), textAlign: "right" }}>{pct(v)}</span>;
  const th = t => <span style={{ ...label({ fontSize: 11, color: V.text2 }), textAlign: "right" }}>{t}</span>;
  return (
    <div style={{ ...card({ padding: "10px 10px" }), display: "grid", gap: 5 }}>
      <div style={{ display: "grid", gridTemplateColumns: cols, gap: 5, alignItems: "end" }}>
        <span /><span /><span />{th("Pts")}{th("1st")}{th("Top 3")}{th("Top 12")}
      </div>
      {rows.map((r, i) => {
        const mine = me && r.id === me.id, f = fc[r.id];
        return (
          <div key={r.id} className={mine ? "fr-mine" : undefined} style={{ borderRadius: 10,
            ...(mine ? { margin: "-2px -5px", padding: "2px 5px", background: `${V.green}1c`, boxShadow: `0 0 0 1.5px ${V.green}` } : {}) }}>
            <PlayerTap name={r.name} block style={{ display: "grid", gridTemplateColumns: cols, gap: 5, alignItems: "center" }}>
              <span style={{ ...numeric("chip", { fontSize: 13, color: V.text2 }) }}>{i + 1}</span>
              <Face src={r.photo} name={r.name} size={26} ring={mine ? V.green : V.border2} glow={mine} />
              <span style={{ ...display("chip", { fontSize: 13, color: mine ? V.green : V.text }), lineHeight: 1.1 }}>{r.name}</span>
              <span style={{ ...numeric("chip", { fontSize: 14, color: V.text }), textAlign: "right" }}>{r.pts}</span>
              {cell(f.title, V.gold)}{cell(f.podium, V.green)}{cell(f.top12, V.pink)}
            </PlayerTap>
          </div>
        );
      })}
    </div>
  );
}

// Teams by a score: the top five, and the reader's own team if it is not one.
function ScoreBars({ items, color, mineId, fmt = v => v.toFixed(2) }) {
  // The top five, and anyone level with fifth.
  const top = items.filter((x, i) => i < 5 || x.v === items[4].v), mi = mineId ? items.findIndex(x => x.id === mineId) : -1;
  const shown = mi >= top.length ? [...top, items[mi]] : top;
  const max = Math.max(...items.map(x => x.v), 1), min = Math.min(...items.map(x => x.v));
  const base = min - (max - min) * 0.35;
  return (
    <div style={{ ...card({ padding: "10px 12px" }), display: "grid", gap: 7 }}>
      {shown.map((x, i) => {
        const mine = x.id === mineId;
        return (
          <TeamTap key={x.key || x.id} id={x.id} style={{ display: "grid", gridTemplateColumns: "20px 26px 104px minmax(0, 1fr) 52px", alignItems: "center", gap: 7,
            ...(mine ? { margin: "-3px -6px", padding: "3px 6px", borderRadius: 10, background: `${V.green}1c`, boxShadow: `0 0 0 1.5px ${V.green}, 0 0 10px ${V.green}66` } : {}) }}>
            <span style={{ ...numeric("chip", { fontSize: 13, color: V.text2 }) }}>{items.findIndex(y => y.v === x.v) + 1}</span>
            <Logo src={x.logo} name={x.name} size={24} />
            <span style={{ ...display("chip", { fontSize: 14, color: mine ? V.green : V.text }), lineHeight: 1.1 }}>{x.name}
              {x.sub && <span style={{ display: "block", ...label({ fontSize: 11, color: V.text2 }) }}>{x.sub}</span>}</span>
            <span style={{ height: 14, borderRadius: 7, background: V.bg3, overflow: "hidden" }}>
              <span className="fr-grow" style={{ "--d": `${i * 0.06}s`, display: "block", height: "100%", width: `${Math.max(4, ((x.v - base) / (max - base)) * 100)}%`,
                borderRadius: 7, background: color, boxShadow: `0 0 10px ${color}` }} />
            </span>
            <span style={{ ...numeric("chip", { fontSize: 15, color: V.text }), textAlign: "right" }}>{fmt(x.v)}</span>
          </TeamTap>
        );
      })}
    </div>
  );
}

export default function FinishPage({ currentUser, view }) {
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
    const mates = {};
    db.teams.forEach(t => { if (t.player1_id && t.player2_id) { mates[t.player1_id] = t.player2_id; mates[t.player2_id] = t.player1_id; } });
    const playerForecast = projectPlayers(playerRows, { left, mates });
    const season = buildTeamTable(db);
    return { scored, left, divisions, range, forecast, playerRows, playerForecast, roundOf, pairsFor, season, table };
  }, [state.db]);

  const shell = inner => (
    <div style={{ background: V.bg, minHeight: "100vh" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Monoton&family=Encode+Sans+Semi+Condensed:wght@400;600;700&family=Chakra+Petch:wght@600;700&display=swap');${CSS}`}</style>
      <div style={WRAP}>
        <div className="v-pull" style={titleBox({ padding: "14px 0 14px" })}>
          <div className="v-wet" style={{ fontFamily: FM, fontWeight: 400, fontSize: TITLE_SIZE, lineHeight: 1.15,
            letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
            {view === "fights" ? <><span style={textGlow(V.pink)}>THE</span>{" "}<span style={textGlow(V.blue)}>FIGHTS</span></> : <><span style={textGlow(V.pink)}>{built && built.left === 1 ? "ONE WEEK" : built && built.left <= 0 ? "FINAL" : "TWO WEEKS"}</span>{" "}<span style={textGlow(V.blue)}>{built && built.left <= 0 ? "TABLE" : "LEFT"}</span></>}
          </div>
        </div>
        {inner}
      </div>
    </div>
  );
  if (state.loading) return shell(<Loading rows={6} />);
  if (state.error || !built) return shell(<p style={body("body", { color: V.text2 })}>This page did not load.</p>);

  const { scored, left, divisions, range, forecast, playerRows, playerForecast, roundOf, pairsFor, season, table } = built;
  const meP = playerRows.find(r => r.name === currentUser) || null;
  const mineId = meP ? meP.teamId : null;
  const c8 = divisions.championship[7], s5 = divisions.second[4];
  const k = meP ? playerRows.indexOf(meP) : -1;
  const named = (rows, key, f) => rows.map(r => ({ id: r.id, name: r.short || r.name, v: f(r), mine: r.id === mineId,
    pic: <Logo src={r.logo} name={r.name} size={24} /> }));

  // The three around you: one place up, you, one place down.
  const around = (rows, i) => [i - 1, i, i + 1].filter(j => j >= 0 && j < rows.length);
  const myDiv = Object.keys(divisions).find(d => divisions[d].some(r => r.id === mineId));
  const ti = myDiv ? divisions[myDiv].findIndex(r => r.id === mineId) : -1;
  const teamLadder = ti < 0 ? null : around(divisions[myDiv], ti).map(j => {
    const r = divisions[myDiv][j], me = j === ti, gap = r.pts - divisions[myDiv][ti].pts;
    return { key: r.id, me, place: j + 1, name: r.short, tone: me ? V.green : j < ti ? V.pink : V.blue,
      wrap: kids => <TeamTap id={r.id} style={{ display: "block" }}>{kids}</TeamTap>,
      pic: <Logo src={r.logo} name={r.name} size={me ? 84 : 56} glow={me ? V.green : null} />,
      under: me ? (
        <div style={{ display: "flex", justifyContent: "center", marginTop: -16 }}>
          {playerRows.filter(p => p.teamId === r.id).map((p, n) => (
            <span key={p.id} className="fr-pop" style={{ "--d": `${0.5 + n * 0.12}s`, marginLeft: n ? -8 : 0 }}>
              <Face src={p.photo} name={p.name} size={36} ring={V.green} glow={p.name === currentUser} /></span>
          ))}
        </div>
      ) : null,
      line: me ? `${r.pts} pts` : gap === 0 ? "level" : `${Math.abs(gap)} pts`,
      sub: me ? "your team" : gap === 0 ? "with you" : j < ti ? "ahead of you" : "behind you" };
  });
  const playerLadder = k < 0 ? null : around(playerRows, k).map(j => {
    const r = playerRows[j], me = j === k, gap = r.pts - meP.pts;
    return { key: r.id, me, place: j + 1, name: r.name, tone: me ? V.green : j < k ? V.pink : V.blue,
      wrap: kids => <PlayerTap name={r.name} block>{kids}</PlayerTap>,
      pic: <Face src={r.photo} name={r.name} size={me ? 88 : 60} ring={me ? V.green : j < k ? V.pink : V.blue} glow={me} />,
      line: me ? `${r.pts} pts` : gap === 0 ? "level" : `${Math.abs(gap)} pts`,
      sub: me ? "you" : gap === 0 ? "with you" : j < k ? "ahead of you" : "behind you" };
  });
  const myRange = myDiv && range[myDiv] ? range[myDiv][mineId] : null;
  // Who the reader's team plays next: the drawn matchup, or 1 v 12 off the table.
  let next = null;
  if (ti >= 0 && left > 0) {
    const n = divisions[myDiv].length;
    const ps = pairsFor(myDiv, scored + 1) || Array.from({ length: n / 2 }, (_, j) => [j, n - 1 - j]);
    const pr = ps.find(q => q[0] === ti || q[1] === ti);
    const oi = pr ? (pr[0] === ti ? pr[1] : pr[0]) : -1;
    const race = state.db.races.find(r => r.round === scored + 1);
    const f = forecast.teams[mineId];
    const live = f.dist.map((v, i) => (v >= 0.005 ? i + 1 : 0)).filter(Boolean);
    const lo = Math.min(ti + 1, myRange ? myRange.best : Math.min(...live)), hi = Math.max(ti + 1, myRange ? myRange.worst : Math.max(...live));
    if (oi >= 0) next = { opp: divisions[myDiv][oi], oppPlace: oi + 1, round: scored + 1,
      raceName: race ? race.race_name || race.name || "" : "", places: Array.from({ length: hi - lo + 1 }, (_, i) => lo + i) };
  }
  const leader = playerRows[0];
  const myWeeks = meP ? Object.keys(meP.byRace).map(id => ({ round: roundOf[id], score: meP.byRace[id], place: meP.placeByRace[id] }))
    .sort((a, b) => a.round - b.round) : [];
  const myF = meP ? playerForecast[meP.id] : null;
  const wk = (pick) => myWeeks.reduce((a, w) => (a == null || pick(w, a) ? w : a), null);
  const bestW = wk((w, a) => w.score > a.score), worstW = wk((w, a) => w.score < a.score);
  const places = myWeeks.map(w => w.place).filter(x => x != null);

  // What the reader's team is fighting for. Certain things come from the true
  // best and worst place; without those, from a forecast under 1% or over 99%.
  const teamKeys = (divKey, rg, f) => {
    const out = [];
    if (divKey === "championship") {
      if (rg ? rg.best === 1 : f.title >= 0.01) out.push("title");
      if (rg ? rg.worst < 8 : f.up > 0.99) { if (!out.length) out.push("safe"); }
      else if (rg ? rg.best >= 9 : f.up < 0.01) out.push("down");
      else out.push("stay");
    } else if (rg ? rg.worst <= 4 : f.up > 0.99) out.push("up");
    else if (rg ? rg.best >= 6 : f.up < 0.01) out.push("stuck");
    else out.push("promo");
    return out;
  };
  const TEAM_LINE = {
    title: [V.gold, "You're fighting for the overall championship.", f => pct(f.title)],
    safe: [V.green, "You're staying up in the Championship Division.", null],
    down: [V.pink, "You're going down to the Second Division.", null],
    stay: [V.pink, "You're fighting to stay up in the Championship Division.", f => pct(f.up)],
    up: [V.green, "You're going up to the Championship Division.", null],
    stuck: [V.text2, "You're staying in the Second Division.", null],
    promo: [V.green, "You're fighting to be promoted.", f => pct(f.up)],
  };
  const fights = ti >= 0 && left > 0
    ? teamKeys(myDiv, myRange, forecast.teams[mineId]).map(k => [TEAM_LINE[k][0], TEAM_LINE[k][1], TEAM_LINE[k][2] ? TEAM_LINE[k][2](forecast.teams[mineId]) : null])
    : [];

  // The same for the reader as a player. There is no true range here, so a
  // fight is a forecast chance that is neither nothing nor certain.
  const myFights = [];
  if (meP && myF && left > 0) {
    const live = v => v >= 0.03 && v <= 0.97;
    if (myF.title >= 0.01) myFights.push([V.gold, "You're fighting for the player championship.", pct(myF.title)]);
    if (live(myF.podium)) myFights.push([V.green, "You're fighting for a top 3 finish.", pct(myF.podium)]);
    if (live(myF.top12)) myFights.push([V.pink, "You're fighting for a top 12 finish.", pct(myF.top12)]);
    const mate = playerRows.find(r => r.teamId === meP.teamId && r.id !== meP.id);
    const first = mate ? mate.name.split(" ")[0] : null;
    if (mate && myF.aheadOfMate != null && (myF.aheadOfMate >= 0.15 && myF.aheadOfMate <= 0.85 || !myFights.length))
      myFights.push([V.blue, `You're fighting to finish ahead of ${first}.`, pct(myF.aheadOfMate)]);
  }

  // Every pair of teammates on season points, closest first.
  const teamById = Object.fromEntries(table.map(t => [t.id, t]));
  const duels = Object.values(playerRows.reduce((m, r) => { if (r.teamId) (m[r.teamId] = m[r.teamId] || []).push(r); return m; }, {}))
    .filter(v => v.length === 2 && teamById[v[0].teamId]).map(([x, y]) => {
      const [a, b] = playerRows.indexOf(x) < playerRows.indexOf(y) ? [x, y] : [y, x];
      const rounds = Object.keys(a.byRace).filter(id => b.byRace[id] != null)
        .map(id => ({ round: roundOf[id], a: a.byRace[id], b: b.byRace[id] })).sort((p, q) => p.round - q.round);
      return { a, b, team: teamById[a.teamId], rounds, pA: left > 0 ? playerForecast[a.id].aheadOfMate : null };
    }).sort((p, q) => (p.a.pts - p.b.pts) - (q.a.pts - q.b.pts));
  const myDuel = meP ? duels.find(d => d.a.id === meP.id || d.b.id === meP.id) : null;
  const otherDuels = duels.filter(d => d !== myDuel).slice(0, 4);
  // A fight for a line: everyone the forecast has neither in nor out, and the reader.
  const fight = (key, color) => playerRows.map((r, i) => ({ id: r.id, name: r.name, v: playerForecast[r.id][key], mine: meP && r.id === meP.id,
    pic: <Face src={r.photo} name={r.name} size={26} ring={color} />, i }))
    .filter(x => (x.v > 0.03 && x.v < 0.97) || (x.mine && x.v >= 0.005));
  const byAvg = rows => rows.filter(r => r.weeks.length).slice().sort((x, y) => y.avgRaw - x.avgRaw)
    .map(r => ({ id: r.id, name: r.short, logo: r.logo, v: r.avgRaw }));
  const bigWeeks = season.flatMap(r => r.weeks.map(w => ({ id: r.id, key: `${r.id}_${w.round}`, name: r.short, logo: r.logo, v: w.score, sub: `Round ${w.round}` })))
    .sort((x, y) => y.v - x.v).filter((x, i, all) => i < 5 || x.v === all[4].v);
  const nextRace = state.db.races.find(r => r.round === scored + 1);

  const sub = { ...label({ fontSize: 13, color: V.text }), margin: "0 0 6px" };
  const section = (divKey, name, color) => {
    const rows = divisions[divKey];
    if (!rows.length) return null;
    const champ = divKey === "championship";
    return (
      <>
        <Head color={color}>{champ ? "Race for the Team Championship" : "Race for Promotion"}</Head>
        <div style={sub}>{name}: where each team can finish</div>
        <RangeChart divKey={divKey} rows={rows} range={range[divKey]} forecast={forecast.teams} mineId={mineId} />
        <div style={{ ...sub, marginTop: 14 }}>{champ ? "Chance of winning the title" : "Chance of going up"}</div>
        <Bars items={named(rows, "t", r => (champ ? forecast.teams[r.id].title : forecast.teams[r.id].up))} color={champ ? V.gold : V.green} />
        {champ && (
          <>
            <Head color={V.pink}>Race to Avoid Relegation</Head>
            <div style={sub}>Chance of going down</div>
            <Bars items={named(rows, "d", r => 1 - forecast.teams[r.id].up)} color={V.pink} />
          </>
        )}
      </>
    );
  };

  if (view === "fights") {
    // Everyone in a fight, in table order, so the cut line falls where it is.
    const tItems = (key, val) => Object.keys(divisions).flatMap(d => divisions[d].map((r, i) => ({ r, d, i })))
      .filter(x => teamKeys(x.d, range[x.d] ? range[x.d][x.r.id] : null, forecast.teams[x.r.id]).includes(key))
      .map(x => ({ id: x.r.id, name: x.r.short, place: x.i + 1, pts: x.r.pts, v: val ? val(forecast.teams[x.r.id]) : null, mine: x.r.id === mineId,
        wrap: kids => <TeamTap id={x.r.id} style={{ display: "block" }}>{kids}</TeamTap>,
        pic: <Logo src={x.r.logo} name={x.r.name} size={40} glow={x.r.id === mineId ? V.green : null} /> }));
    const live = v => v >= 0.03 && v <= 0.97;
    const pItems = (key, test, color) => playerRows.map((r, i) => ({ r, i })).filter(x => test(playerForecast[x.r.id][key]))
      .map(({ r, i }) => ({ id: r.id, name: r.name, place: i + 1, pts: r.pts, v: playerForecast[r.id][key], mine: !!meP && r.id === meP.id,
        wrap: kids => <PlayerTap name={r.name} block>{kids}</PlayerTap>,
        pic: <Face src={r.photo} name={r.name} size={40} ring={meP && r.id === meP.id ? V.green : color} glow={!!meP && r.id === meP.id} /> }));
    const group = (title, color, items, what, cut, cutLabel) => items.length
      ? <><Head color={color}>{title}</Head>{what && <div style={sub}>{what}</div>}<FightRows items={items} color={color} cut={cut} cutLabel={cutLabel} /></> : null;
    const myTeam = ti >= 0 ? divisions[myDiv][ti] : null;
    const mine = [
      ...fights.map(f => [...f, myTeam && <Logo src={myTeam.logo} name={myTeam.name} size={40} />]),
      ...myFights.map(f => [...f, meP && <Face src={meP.photo} name={meP.name} size={40} ring={f[0]} />]),
    ];
    const close = d => d.pA != null && d.pA >= 0.15 && d.pA <= 0.85;
    const rest = duels.filter(d => d !== myDuel);
    const closeDuels = rest.filter(close), doneDuels = rest.filter(d => !close(d));
    return shell(
      <>
        {myTeam && mine.length > 0 && (
          <div className="fr-mine" style={{ ...card({ padding: "16px 12px 12px" }), ...edgeGlow(V.green, 0.6), marginTop: 4 }}>
            <TeamTap id={myTeam.id} style={{ display: "grid", justifyItems: "center", gap: 3, textAlign: "center" }}>
              <Logo src={myTeam.logo} name={myTeam.name} size={88} glow={V.green} />
              <span style={{ display: "flex", justifyContent: "center", marginTop: -16 }}>
                {playerRows.filter(p => p.teamId === myTeam.id).map((p, n) => (
                  <span key={p.id} style={{ marginLeft: n ? -8 : 0 }}>
                    <Face src={p.photo} name={p.name} size={38} ring={V.green} glow={p.name === currentUser} /></span>
                ))}
              </span>
              <span style={{ ...display("h2", { fontSize: 22, color: V.green }), ...textGlow(V.green, 0.7), lineHeight: 1.1, marginTop: 2 }}>{myTeam.short}</span>
              <span style={{ ...numeric("chip", { fontSize: 14, color: V.text2 }) }}>{ordinal(ti + 1)} · {myTeam.pts} pts</span>
            </TeamTap>
            <Fights items={mine} />
          </div>
        )}
        {left > 0 && (
          <>
            {group("Fighting for the Team Championship", V.gold, tItems("title", f => f.title), "Chance of winning the title")}
            {group("Fighting to Stay Up", V.pink, tItems("stay", f => f.up), "Chance of staying up", 8, "\u2193 Relegated")}
            {group("Fighting to Be Promoted", V.green, tItems("promo", f => f.up), "Chance of going up", 4, "\u2191 Promoted")}
            {group("Staying Up", V.blue, tItems("safe"))}
            {group("Going Up", V.green, tItems("up"))}
            {group("Going Down", V.pink, tItems("down"))}
            {group("Staying in the Second Division", V.silver, tItems("stuck"))}
            {group("Fighting for the Player Championship", V.gold, pItems("title", v => v >= 0.01, V.gold), "Chance of finishing 1st")}
            {group("Fighting for a Top 3 Finish", V.green, pItems("podium", live, V.green), "Chance of a top 3 finish", 3, "\u2191 Top 3")}
            {group("Fighting for a Top 12 Finish", V.pink, pItems("top12", live, V.pink), "Chance of a top 12 finish", 12, "\u2191 Top 12")}
          </>
        )}
        <Head color={V.blue}>Fighting to Beat a Teammate</Head>
        <div style={{ display: "grid", gap: 8 }}>
          {myDuel && <Duel {...myDuel} mine={currentUser} big />}
          {closeDuels.map(d => <Duel key={d.team.id} {...d} mine={currentUser} />)}
        </div>
        {doneDuels.length > 0 && (
          <div style={{ ...card({ padding: "2px 12px 6px" }), marginTop: 8 }}>
            {doneDuels.map(d => <Duel key={d.team.id} {...d} mine={currentUser} compact />)}
          </div>
        )}
      </>
    );
  }

  return shell(
    <>
      {left > 0 && left <= 2
        ? <Explainer left={left} names={[1, 2].map(n => { const r = state.db.races.find(x => x.round === scored + n); return r ? r.race_name || r.name || "" : ""; })}
            me={ti >= 0 ? divisions[myDiv][ti] : null} myPlace={ti + 1} opp={next ? next.opp : null} oppPlace={next ? next.oppPlace : null}
            divKey={myDiv} rows={myDiv ? divisions[myDiv] : null} all={divisions} />
        : <div style={{ ...numeric("hero", { fontSize: 26, color: V.text }) }}>{left > 0 ? `${left} WEEKS LEFT` : `FINAL \u00b7 ROUND ${scored}`}</div>}

      {teamLadder && (
        <>
          <Head color={V.green}>Your team</Head>
          <Ladder items={teamLadder} />
          <Fights items={fights} />
          <div style={{ ...sub, marginTop: 12 }}>{divisions[myDiv][ti].short}: chance of each place</div>
          <Legend divKey={myDiv} row={divisions[myDiv][ti]} now={ti + 1} rg={myRange} f={forecast.teams[mineId]} rows={divisions[myDiv]} />
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {left > 0 && <Tile k={myDiv === "championship" ? "Win the title" : "Finish first"} v={pct(forecast.teams[mineId].title)} color={V.gold} />}
            {left > 0 && <Tile k={myDiv === "championship" ? "Stay up" : "Go up"} v={pct(forecast.teams[mineId].up)} color={V.green} />}
            {myRange && <Tile k="Best finish" v={`P${myRange.best}`} />}
            {myRange && <Tile k="Worst finish" v={`P${myRange.worst}`} />}
          </div>
          {next && <div style={{ ...sub, marginTop: 14 }}>This week's matchup, and what it changes</div>}
          {next && <Fork divKey={myDiv} me={divisions[myDiv][ti]} f={forecast.teams[mineId]} {...next} />}
        </>
      )}

      {section("championship", "Championship", V.gold)}
      {section("second", "Second Division", V.silver)}

      {c8 && s5 && (
        <>
          <Head color={V.gold}>8th against 5th</Head>
          <div style={{ display: "flex", gap: 10 }}>
            {[[c8, "8th, Championship", c8.avgRaw >= s5.avgRaw], [s5, "5th, Second Division", s5.avgRaw > c8.avgRaw]].map(([t, where, ahead]) => (
              <TeamTap key={t.id} id={t.id} style={{ flex: 1, minWidth: 0, display: "block", textAlign: "center", padding: "12px 8px",
                borderRadius: 14, background: V.bg3, border: `2px solid ${ahead ? V.green : V.border2}`,
                ...(ahead ? edgeGlow(V.green, 0.8) : {}) }}>
                {t.logo && <img src={t.logo} alt="" style={{ width: 40, height: 40, objectFit: "contain" }} />}
                <div style={{ ...display("h3", { fontSize: 16, color: V.text }), marginTop: 4, lineHeight: 1.1 }}>{t.short}</div>
                <div style={{ ...label({ fontSize: 12, color: V.text2 }), marginTop: 2 }}>{where}</div>
                <div style={{ ...numeric("hero", { fontSize: 34, color: ahead ? V.green : V.text2 }), marginTop: 6,
                  ...(ahead ? textGlow(V.green, 0.8) : {}) }}>{t.avg.toFixed(1)}</div>
              </TeamTap>
            ))}
          </div>
          <div style={{ ...label({ fontSize: 12, color: V.text2 }), textAlign: "center", margin: "8px 0 0" }}>Second-half scoring average</div>
          {left > 0 && (
            <div style={{ display: "flex", height: 26, borderRadius: 13, overflow: "hidden", marginTop: 10, background: V.bg3 }}>
              <span className="fr-grow" style={{ width: `${(1 - forecast.swap) * 100}%`, background: V.gold, display: "flex", alignItems: "center",
                paddingLeft: 10, ...numeric("chip", { fontSize: 14, color: V.bg }), whiteSpace: "nowrap" }}>8th stays {pct(1 - forecast.swap)}</span>
              <span style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 10,
                ...numeric("chip", { fontSize: 14, color: V.text }), whiteSpace: "nowrap" }}>5th goes up {pct(forecast.swap)}</span>
            </div>
          )}
        </>
      )}

      <Head color={V.pink}>Highest Scoring Teams</Head>
      <div style={{ ...label({ fontSize: 13, color: V.text }), margin: "0 0 6px" }}>Season average</div>
      <ScoreBars items={byAvg(season)} color={V.blue} mineId={mineId} />
      <div style={{ ...label({ fontSize: 13, color: V.text }), margin: "14px 0 6px" }}>Second-half average</div>
      <ScoreBars items={byAvg(table)} color={V.pink} mineId={mineId} />
      <div style={{ ...label({ fontSize: 13, color: V.text }), margin: "14px 0 6px" }}>Best single week</div>
      <ScoreBars items={bigWeeks} color={V.gold} mineId={null} fmt={v => String(v)} />

      <Head color={V.blue}>{meP ? "Your Chances of a Strong Finish" : "Player Championship"}</Head>
      {playerLadder && (
        <>
          <Ladder items={playerLadder} />
          <Fights items={myFights} />
          {k > 0 && (
            <PlayerTap name={leader.name} block style={{ display: "flex", alignItems: "center", gap: 10, margin: "8px 0 12px",
              padding: "8px 12px", borderRadius: 14, background: V.bg3, border: `1px solid ${V.gold}66` }}>
              <Face src={leader.photo} name={leader.name} size={40} ring={V.gold} glow />
              <span style={{ flex: 1, minWidth: 0, ...display("chip", { fontSize: 15, color: V.text }) }}>{leader.name}</span>
              <span style={{ textAlign: "right" }}>
                <span style={{ display: "block", ...numeric("chip", { fontSize: 17, color: V.gold }) }}>{leader.pts - meP.pts} pts</span>
                <span style={{ display: "block", ...label({ fontSize: 11, color: V.text2 }) }}>the leader, ahead of you</span>
              </span>
            </PlayerTap>
          )}
        </>
      )}
      {meP && myF && left > 0 && (
        <>
          <div style={{ ...sub, marginTop: 4 }}>Your chance of each place, %</div>
          <PlaceBars dist={myF.dist} now={k + 1} />
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <Tile k="Finish 1st" v={pct(myF.title)} color={V.gold} />
            <Tile k="Top 3" v={pct(myF.podium)} color={V.green} />
            <Tile k="Top 12" v={pct(myF.top12)} color={V.pink} />
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <Tile k="Most likely finish" v={`P${myF.likely}`} color={V.blue} />
            <Tile k="Likely range" v={myF.lo === myF.hi ? `P${myF.lo}` : `P${myF.lo}–${myF.hi}`} />
          </div>
        </>
      )}
      {meP && myWeeks.length > 0 && (
        <>
          <div style={{ ...sub, marginTop: 16 }}>Your score, week by week</div>
          <SeasonBars weeks={myWeeks} avg={meP.avg} />
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <Tile k="Best week" v={bestW.score} sub={`R${bestW.round}${bestW.place ? `, P${bestW.place}` : ""}`} color={V.green} />
            <Tile k="Worst week" v={worstW.score} sub={`R${worstW.round}${worstW.place ? `, P${worstW.place}` : ""}`} color={V.pink} />
            <Tile k="Average" v={meP.avg.toFixed(1)} color={V.gold} />
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            {places.length > 0 && <Tile k="Weekly finishes" v={`P${Math.min(...places)}–${Math.max(...places)}`} />}
            <Tile k={`Last ${meP.formRaces} average`} v={meP.formAvg.toFixed(1)} sub={meP.formRank ? `P${meP.formRank}` : null} />
            <Tile k="Top-ten weeks" v={meP.top10 + meP.p1 + meP.p2 + meP.p3} sub={`${meP.p1 + meP.p2 + meP.p3} ${meP.p1 + meP.p2 + meP.p3 === 1 ? "podium" : "podiums"}`} />
          </div>
        </>
      )}
      {left > 0 && (
        <>
          <Head color={V.gold}>Race for the Top 3</Head>
          <Bars items={fight("podium", V.green)} color={V.green} />
          <Head color={V.pink}>Race for the Top 12</Head>
          <div style={{ ...body("body", { fontSize: 16, color: V.text, lineHeight: 1.35 }), margin: "0 0 10px" }}>
            Those who finish in the top 12 get a special status, to be revealed going into the offseason.</div>
          <Bars items={fight("top12", V.pink)} color={V.pink} />
        </>
      )}

      {(myDuel || otherDuels.length > 0) && <Head color={V.green}>Best Teammate Battles</Head>}
      {myDuel && <Duel {...myDuel} mine={currentUser} big />}
      <div style={{ display: "grid", gap: 8, marginTop: myDuel ? 8 : 0 }}>
        {otherDuels.map(d => <Duel key={d.team.id} {...d} mine={currentUser} />)}
      </div>

      <Head color={V.silver}>Everyone's Chances</Head>
      <OddsTable rows={playerRows} fc={playerForecast} me={meP} />

      {left > 0 && (
        <div style={{ ...label({ fontSize: 12, color: V.text3, lineHeight: 1.6 }), margin: "18px 0 0" }}>
          Best and worst: every result still possible<br />
          Chances: the last {left === 1 ? "round" : `${left} rounds`} played {forecast.sims.toLocaleString("en-US")} times
        </div>
      )}
    </>
  );
}
