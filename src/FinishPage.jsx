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
              <div style={{ ...display("chip", { fontSize: it.me ? 16 : 14, color: V.text }), maxWidth: "100%", whiteSpace: "nowrap",
                overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>{it.name}</div>
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
        textTransform: "uppercase", display: "inline-block", padding: "8px 14px", borderRadius: 14,
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

// The legend is a real row, the reader's own team where they have one, drawn
// big, with each part of it pointed at and named.
function Legend({ divKey, row, now, rg, f }) {
  const likely = f.dist.indexOf(Math.max(...f.dist)) + 1;
  const at = p => `${((p - 0.5) / 12) * 100}%`;
  const tag = (p, text, color, side, lane, d) => (
    <span key={text} className="fr-rise" style={{ "--d": `${d}s`, position: "absolute", left: at(p),
      [side === "top" ? "bottom" : "top"]: "100%", display: "grid", justifyItems: "center",
      transform: `translateX(${p <= 2 ? "-12px" : p >= 11 ? "calc(-100% + 12px)" : "-50%"})` }}>
      {side === "bottom" && <span className="fr-stem" style={{ "--d": `${d}s`, "--o": "top", width: 2, height: 8 + lane * 22, background: color,
        justifySelf: p <= 2 ? "start" : p >= 11 ? "end" : "center", marginLeft: p <= 2 ? 11 : 0, marginRight: p >= 11 ? 11 : 0 }} />}
      <span style={{ ...label({ fontSize: 12, color }), whiteSpace: "nowrap", padding: "1px 0" }}>{text}</span>
      {side === "top" && <span className="fr-stem" style={{ "--d": `${d}s`, "--o": "bottom", width: 2, height: 8 + lane * 22, background: color,
        justifySelf: p <= 2 ? "start" : p >= 11 ? "end" : "center", marginLeft: p <= 2 ? 11 : 0, marginRight: p >= 11 ? 11 : 0 }} />}
    </span>
  );
  const same = likely === now;
  const tags = [
    tag(now, same ? "Now, and most likely" : "Now", V.text, "top", 0, 0.9),
    !same && tag(likely, "Most likely", V.blue, "top", Math.abs(likely - now) < 4 ? 1 : 0, 1.1),
    rg && rg.best === rg.worst && tag(rg.best, `Locked in at P${rg.best}`, V.text2, "bottom", 0, 1.3),
    rg && rg.best !== rg.worst && tag(rg.best, `Best P${rg.best}`, V.text2, "bottom", 0, 1.3),
    rg && rg.best !== rg.worst && tag(rg.worst, `Worst P${rg.worst}`, V.text2, "bottom", rg.worst - rg.best < 5 ? 1 : 0, 1.5),
  ].filter(Boolean);
  const keys = [
    divKey === "second" && [V.green, "Goes up"],
    divKey === "championship" && [V.pink, "Goes down"],
    [V.gold, divKey === "championship" ? "8th, against 5th in Second" : "5th, against 8th in Champ"],
  ].filter(Boolean);
  return (
    <div style={{ ...card({ padding: "12px 14px 12px" }), ...edgeGlow(V.green, 0.6), marginTop: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Logo src={row.logo} name={row.name} size={26} />
        <span style={{ ...display("chip", { fontSize: 16, color: V.green }) }}>{row.short}</span>
      </div>
      <div style={{ position: "relative", margin: "58px 4px 58px" }}>
        <Track divKey={divKey} row={row} now={now} rg={rg} f={f} height={44} delay={0.2} />
        {tags}
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {keys.map(([c, t]) => (
          <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 6, ...label({ fontSize: 12, color: V.text2 }) }}>
            <span style={{ width: 14, height: 14, borderRadius: 4, background: c, boxShadow: `0 0 8px ${c}` }} />{t}
          </span>
        ))}
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
function Bars({ items, color }) {
  const shown = items.filter(x => x.v >= 0.005).sort((a, b) => b.v - a.v);
  if (!shown.length) return null;
  return (
    <div style={{ ...card({ padding: "10px 12px" }), display: "grid", gap: 7 }}>
      {shown.map((x, i) => (
        <div key={x.id} style={{ display: "grid", gridTemplateColumns: "26px 92px minmax(0, 1fr) 46px", alignItems: "center", gap: 7,
          ...(x.mine ? { margin: "-3px -6px", padding: "3px 6px", borderRadius: 10, background: `${V.green}1c`,
            boxShadow: `0 0 0 1.5px ${V.green}, 0 0 10px ${V.green}66` } : {}) }}>
          {x.pic}
          <span style={{ ...display("chip", { fontSize: 14, color: x.mine ? V.green : V.text }), whiteSpace: "nowrap",
            overflow: "hidden", textOverflow: "ellipsis" }}>{x.name}</span>
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
            <tr key={r.id} style={{ borderTop: `1px solid ${V.border}`,
              ...(r.id === mineId ? { background: `${V.green}1c`, boxShadow: `inset 0 0 0 1.5px ${V.green}` } : {}) }}>
              <td style={{ ...td, textAlign: "left", fontFamily: "inherit", ...display("chip", { fontSize: 14,
                color: r.id === mineId ? V.green : V.text }) }}>{r.short}</td>
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

// Every player: the gap to the leader, and on a track of all 48 places where
// they are now (the dot) and where the forecast puts them (the band).
function FieldChart({ rows, me, fc }) {
  const N = rows.length, top = rows[0].pts;
  return (
    <div style={{ ...card({ padding: "10px 12px" }), display: "grid", gap: 6 }}>
      {rows.map((r, i) => {
        const mine = me && r.id === me.id;
        const c = i === 0 ? V.gold : mine ? V.green : V.blue;
        const f = fc[r.id];
        return (
          <div key={r.id} className={mine ? "fr-mine" : undefined} style={{ borderRadius: 10,
            ...(mine ? { margin: "-3px -6px", padding: "3px 6px", background: `${V.green}1c`, boxShadow: `0 0 0 1.5px ${V.green}` } : {}) }}>
          <PlayerTap name={r.name} block style={{ display: "grid",
            gridTemplateColumns: "22px 26px 84px minmax(0, 1fr) 40px", alignItems: "center", gap: 6 }}>
            <span style={{ ...numeric("chip", { fontSize: 13, color: V.text2 }) }}>{i + 1}</span>
            <Face src={r.photo} name={r.name} size={26} ring={c} glow={mine || i === 0} />
            <span style={{ ...display("chip", { fontSize: 13, color: mine ? V.green : V.text }), whiteSpace: "nowrap",
              overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</span>
            <span style={{ position: "relative", height: 12, borderRadius: 6, background: V.bg3 }}>
              <span className="fr-open" style={{ "--d": `${Math.min(i, 20) * 0.03}s`, position: "absolute", top: 1, bottom: 1,
                left: `${((f.lo - 1) / N) * 100}%`, width: `${Math.max(2, ((f.hi - f.lo + 1) / N) * 100)}%`, borderRadius: 5,
                background: c, opacity: 0.55 }} />
              <span style={{ position: "absolute", top: "50%", left: `${((i + 0.5) / N) * 100}%`, width: 8, height: 8, margin: "-4px 0 0 -4px",
                borderRadius: "50%", background: V.text, boxShadow: `0 0 6px ${c}` }} />
            </span>
            <span style={{ ...numeric("chip", { fontSize: 13, color: i === 0 ? V.gold : V.text }), textAlign: "right" }}>
              {i === 0 ? r.pts : `−${top - r.pts}`}
            </span>
          </PlayerTap>
          </div>
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
    return { scored, left, divisions, range, forecast, playerRows, playerForecast, roundOf };
  }, [state.db]);

  const shell = inner => (
    <div style={{ background: V.bg, minHeight: "100vh" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Monoton&family=Encode+Sans+Semi+Condensed:wght@400;600;700&family=Chakra+Petch:wght@600;700&display=swap');${CSS}`}</style>
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

  const { scored, left, divisions, range, forecast, playerRows, playerForecast, roundOf } = built;
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
  const leader = playerRows[0];
  const myWeeks = meP ? Object.keys(meP.byRace).map(id => ({ round: roundOf[id], score: meP.byRace[id], place: meP.placeByRace[id] }))
    .sort((a, b) => a.round - b.round) : [];
  const myF = meP ? playerForecast[meP.id] : null;
  const wk = (pick) => myWeeks.reduce((a, w) => (a == null || pick(w, a) ? w : a), null);
  const bestW = wk((w, a) => w.score > a.score), worstW = wk((w, a) => w.score < a.score);
  const places = myWeeks.map(w => w.place).filter(x => x != null);

  const section = (divKey, name, color) => {
    const rows = divisions[divKey];
    if (!rows.length) return null;
    const champ = divKey === "championship";
    return (
      <>
        <Head color={color}>{name}</Head>
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
      <div style={{ ...label({ fontSize: 13, color: V.text2 }), marginBottom: 4 }}>
        {left > 0 ? `Through round ${scored} \u00b7 ${left === 1 ? "1 round" : `${left} rounds`} left` : `Final \u00b7 round ${scored}`}
      </div>

      {teamLadder && (
        <>
          <Head color={V.green}>Your team</Head>
          <Ladder items={teamLadder} />
          <Legend divKey={myDiv} row={divisions[myDiv][ti]} now={ti + 1} rg={myRange} f={forecast.teams[mineId]} />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
            {[myRange && [`Can finish P${myRange.best}${myRange.best === myRange.worst ? "" : ` to P${myRange.worst}`}`, V.text],
              left > 0 && [`${myDiv === "championship" ? "Title" : "First"} ${pct(forecast.teams[mineId].title)}`, V.gold],
              left > 0 && [`${myDiv === "championship" ? "Stays up" : "Goes up"} ${pct(forecast.teams[mineId].up)}`, V.green],
            ].filter(Boolean).map(([t, c]) => (
              <span key={t} style={{ ...display("chip", { fontSize: 14, color: c }), padding: "6px 11px", borderRadius: 999,
                background: V.bg3, border: `1px solid ${c}66` }}>{t}</span>
            ))}
          </div>
        </>
      )}

      {section("championship", "Championship", V.gold)}
      {section("second", "Second Division", V.silver)}

      {c8 && s5 && (
        <>
          <Head color={V.gold}>8th against 5th</Head>
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

      <Head color={V.blue}>Player championship</Head>
      {playerLadder && (
        <>
          <Ladder items={playerLadder} />
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
          <div style={{ ...label({ fontSize: 13, color: V.text2 }), margin: "4px 0 6px" }}>Your chance of each place, %</div>
          <PlaceBars dist={myF.dist} now={k + 1} />
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <Tile k="Title" v={pct(myF.title)} color={V.gold} />
            <Tile k="Top 3" v={pct(myF.podium)} color={V.green} />
            <Tile k="Top 5" v={pct(myF.top5)} />
            <Tile k="Top 10" v={pct(myF.top10)} />
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <Tile k="Most likely" v={`P${myF.likely}`} color={V.blue} />
            <Tile k="Likely range" v={myF.lo === myF.hi ? `P${myF.lo}` : `P${myF.lo}–${myF.hi}`} />
          </div>
        </>
      )}
      {meP && myWeeks.length > 0 && (
        <>
          <div style={{ ...label({ fontSize: 13, color: V.text2 }), margin: "16px 0 6px" }}>Your season, round by round</div>
          <SeasonBars weeks={myWeeks} avg={meP.avg} />
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <Tile k="Best week" v={bestW.score} sub={`R${bestW.round}${bestW.place ? `, P${bestW.place}` : ""}`} color={V.green} />
            <Tile k="Worst week" v={worstW.score} sub={`R${worstW.round}${worstW.place ? `, P${worstW.place}` : ""}`} color={V.pink} />
            <Tile k="Average" v={meP.avg.toFixed(1)} color={V.gold} />
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            {places.length > 0 && <Tile k="Weekly places" v={`P${Math.min(...places)}–${Math.max(...places)}`} />}
            <Tile k={`Last ${meP.formRaces}`} v={meP.formAvg.toFixed(1)} sub={meP.formRank ? `P${meP.formRank}` : null} />
            <Tile k="Top tens" v={meP.top10 + meP.p1 + meP.p2 + meP.p3} sub={`${meP.p1 + meP.p2 + meP.p3} ${meP.p1 + meP.p2 + meP.p3 === 1 ? "podium" : "podiums"}`} />
          </div>
        </>
      )}
      {left > 0 && (
        <>
          <div style={{ ...label({ fontSize: 13, color: V.text2 }), margin: "16px 0 6px" }}>Chance of the title</div>
          <Bars items={playerRows.map(r => ({ id: r.id, name: r.name, v: playerForecast[r.id].title, mine: meP && r.id === meP.id,
            pic: <Face src={r.photo} name={r.name} size={26} ring={V.gold} /> }))} color={V.gold} />
          <div style={{ ...label({ fontSize: 13, color: V.text2 }), margin: "16px 0 6px" }}>Chance of the top 3</div>
          <Bars items={playerRows.map(r => ({ id: r.id, name: r.name, v: playerForecast[r.id].podium, mine: meP && r.id === meP.id,
            pic: <Face src={r.photo} name={r.name} size={26} ring={V.green} /> }))} color={V.green} />
        </>
      )}
      <div style={{ ...label({ fontSize: 13, color: V.text2 }), margin: "16px 0 6px" }}>Everyone: likely finish, and points behind the leader</div>
      <FieldChart rows={playerRows} me={meP} fc={playerForecast} />

      {left > 0 && (
        <div style={{ ...label({ fontSize: 12, color: V.text3, lineHeight: 1.6 }), margin: "18px 0 0" }}>
          Best and worst: every result still possible<br />
          Chances: the last {left === 1 ? "round" : `${left} rounds`} played {forecast.sims.toLocaleString("en-US")} times
        </div>
      )}
    </>
  );
}
