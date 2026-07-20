import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "./supabaseClient";
import { computeDivisionTrends } from "./divisionTrends";
import { DARK, BLUEDARK, GREEN, RED, ORANGE, TEXT, TEXT2, BORDER, FD, FB } from "./theme";

// Plot geometry, in viewBox units. The container scales this to its own width.
const VW = 340, VH = 210;
const PAD = { top: 16, right: 52, bottom: 26, left: 32 };
const PLOT_W = VW - PAD.left - PAD.right;
const PLOT_H = VH - PAD.top - PAD.bottom;

function niceStep(range) {
  if (range <= 0) return 10;
  const raw = range / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  return [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) || mag * 10;
}

function TeamMark({ name, logoUrl, size = 20 }) {
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) hash = (name || "").charCodeAt(i) + ((hash << 5) - hash);
  const bg = `hsl(${Math.abs(hash) % 360}, 45%, 55%)`;
  const initials = (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  if (logoUrl) return <img src={logoUrl} alt="" style={{ width: size, height: size, borderRadius: size * 0.3, objectFit: "cover", flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.3, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: FD, fontWeight: 900, fontSize: size * 0.4, color: "#fff" }}>{initials}</div>
  );
}

/**
 * Emphasis line chart: every team is drawn, one is highlighted, the rest recede.
 * Y is distance to the cut line in championship points, so y=0 IS the boundary —
 * above it you survive, below it you drop (or vice versa for promotion).
 */
function CutChart({ division, rounds, tone, zoneLabel, safeLabel, highlightId, onHighlight }) {
  const svgRef = useRef(null);
  const [hoverRound, setHoverRound] = useState(null);

  const teams = division.teams;
  const allGaps = teams.flatMap(t => t.series.map(p => p.gap));
  const maxAbs = Math.max(Math.abs(Math.min(...allGaps, 0)), Math.max(...allGaps, 0), 1);
  const yMax = maxAbs * 1.12;
  const step = niceStep(yMax * 2);

  const xOf = (round) => {
    const i = rounds.findIndex(r => r.round === round);
    const n = Math.max(rounds.length - 1, 1);
    return PAD.left + (i / n) * PLOT_W;
  };
  const yOf = (gap) => PAD.top + (1 - (gap + yMax) / (2 * yMax)) * PLOT_H;
  const zeroY = yOf(0);

  const ticks = [];
  for (let v = 0; v <= yMax; v += step) { ticks.push(v); if (v !== 0) ticks.push(-v); }

  const pathFor = (t) => t.series.map((p, i) => `${i === 0 ? "M" : "L"}${xOf(p.round).toFixed(1)},${yOf(p.gap).toFixed(1)}`).join(" ");

  const hi = teams.find(t => t.id === highlightId) || null;
  const hoverIdx = hoverRound != null ? rounds.findIndex(r => r.round === hoverRound) : -1;
  const hoverPoint = hi && hoverIdx >= 0 ? hi.series[hoverIdx] : null;

  // Pointer → nearest round. Converts client px into viewBox units.
  function handleMove(e) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const vx = ((clientX - rect.left) / rect.width) * VW;
    const n = Math.max(rounds.length - 1, 1);
    const i = Math.round(((vx - PAD.left) / PLOT_W) * n);
    const clamped = Math.min(Math.max(i, 0), rounds.length - 1);
    setHoverRound(rounds[clamped].round);
  }

  const zoneFill = tone === "danger" ? RED : GREEN;
  const zoneY = tone === "danger" ? zeroY : PAD.top;
  const zoneH = tone === "danger" ? PAD.top + PLOT_H - zeroY : zeroY - PAD.top;

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VW} ${VH}`}
        style={{ width: "100%", height: "auto", display: "block", touchAction: "pan-y" }}
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverRound(null)}
        onTouchStart={handleMove}
        onTouchMove={handleMove}
        onTouchEnd={() => setHoverRound(null)}
      >
        {/* The zone you do not want to be in (or do, for promotion) */}
        <rect x={PAD.left} y={zoneY} width={PLOT_W} height={Math.max(zoneH, 0)} fill={zoneFill} opacity={0.07} />

        {/* Gridlines — hairline, solid, recessive */}
        {ticks.map(v => (
          <line key={v} x1={PAD.left} x2={PAD.left + PLOT_W} y1={yOf(v)} y2={yOf(v)}
            stroke={BORDER} strokeWidth={0.5} opacity={v === 0 ? 0 : 0.7} />
        ))}
        {ticks.map(v => (
          <text key={`t${v}`} x={PAD.left - 5} y={yOf(v) + 2.6} textAnchor="end"
            style={{ fontFamily: FD, fontWeight: 700, fontSize: 7, fill: TEXT2 }}>
            {v > 0 ? `+${v}` : v}
          </text>
        ))}

        {/* Round ticks along the bottom */}
        {rounds.map((r, i) => (
          (rounds.length <= 12 || i % 2 === 0) && (
            <text key={r.round} x={xOf(r.round)} y={VH - 8} textAnchor="middle"
              style={{ fontFamily: FD, fontWeight: 700, fontSize: 7, fill: TEXT2 }}>{r.round}</text>
          )
        ))}

        {/* The cut line itself */}
        <line x1={PAD.left} x2={PAD.left + PLOT_W} y1={zeroY} y2={zeroY} stroke={zoneFill} strokeWidth={1.5} />
        <text x={PAD.left + PLOT_W + 4} y={zeroY + 2.6}
          style={{ fontFamily: FD, fontWeight: 800, fontSize: 6.5, fill: TEXT2 }}>CUT</text>

        {/* Crosshair */}
        {hoverRound != null && (
          <line x1={xOf(hoverRound)} x2={xOf(hoverRound)} y1={PAD.top} y2={PAD.top + PLOT_H}
            stroke={TEXT2} strokeWidth={0.75} opacity={0.5} />
        )}

        {/* Context lines — every team that isn't highlighted */}
        {teams.filter(t => t.id !== highlightId).map(t => (
          <path key={t.id} d={pathFor(t)} fill="none" stroke={TEXT2} strokeWidth={1.25}
            strokeOpacity={highlightId ? 0.16 : 0.3} strokeLinejoin="round" strokeLinecap="round" />
        ))}

        {/* The highlighted team, drawn last so it sits on top */}
        {hi && (
          <>
            <path d={pathFor(hi)} fill="none" stroke={BLUEDARK} strokeWidth={2}
              strokeLinejoin="round" strokeLinecap="round" />
            {hi.series.map(p => (
              <circle key={p.round} cx={xOf(p.round)} cy={yOf(p.gap)} r={2.6}
                fill={BLUEDARK} stroke="#fff" strokeWidth={1.2} />
            ))}
            {/* Direct end-label — the one label on the chart */}
            <text x={PAD.left + PLOT_W + 4} y={yOf(hi.series[hi.series.length - 1].gap) + 2.6}
              style={{ fontFamily: FD, fontWeight: 900, fontSize: 8, fill: BLUEDARK }}>
              {hi.series[hi.series.length - 1].gap > 0 ? "+" : ""}
              {Math.round(hi.series[hi.series.length - 1].gap * 10) / 10}
            </text>
          </>
        )}

        {/* Hover marker on the highlighted line */}
        {hoverPoint && (
          <circle cx={xOf(hoverPoint.round)} cy={yOf(hoverPoint.gap)} r={4}
            fill={BLUEDARK} stroke="#fff" strokeWidth={1.5} />
        )}
      </svg>

      {/* Tooltip lives outside the SVG so it can wrap and stay legible */}
      <div style={{ minHeight: 34, marginTop: 2 }}>
        {hoverPoint && hi ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, background: "#fff", border: `1px solid ${BORDER}` }}>
            <TeamMark name={hi.name} logoUrl={hi.logo_url} size={18} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 10, color: TEXT, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                R{hoverPoint.round} · {hoverPoint.raceName}
              </p>
              <p style={{ fontFamily: FB, fontSize: 10, color: TEXT2, margin: 0 }}>
                P{hoverPoint.position} · {hoverPoint.cum} pts · {hoverPoint.gap > 0 ? "+" : ""}{Math.round(hoverPoint.gap * 10) / 10} to cut
              </p>
            </div>
          </div>
        ) : (
          <p style={{ fontFamily: FB, fontSize: 10, color: TEXT2, margin: "6px 0 0", textAlign: "center" }}>
            Drag across the chart to read any round. Tap a team below to trace it.
          </p>
        )}
      </div>

      {/* Legend / picker — also the accessible read of where everyone sits now */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 8 }}>
        {teams.map((t) => {
          const last = t.series[t.series.length - 1];
          const safe = tone === "danger" ? last.gap >= 0 : last.gap > 0;
          const isHi = t.id === highlightId;
          const boundary = last.position === division.cutRank;
          return (
            <button key={t.id} onClick={() => onHighlight(isHi ? null : t.id)}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left",
                padding: "6px 8px", borderRadius: 8, cursor: "pointer",
                background: isHi ? "rgba(42,111,168,0.10)" : "#fff",
                border: `1px solid ${isHi ? BLUEDARK : BORDER}`,
                borderBottom: boundary ? `2px solid ${tone === "danger" ? RED : GREEN}` : `1px solid ${isHi ? BLUEDARK : BORDER}`,
              }}>
              <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 10, color: TEXT2, minWidth: 16 }}>{last.position}</span>
              <TeamMark name={t.name} logoUrl={t.logo_url} size={18} />
              <span style={{ flex: 1, minWidth: 0, fontFamily: FB, fontWeight: isHi ? 700 : 500, fontSize: 11, color: TEXT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</span>
              <span style={{ fontFamily: FD, fontWeight: 700, fontSize: 10, color: TEXT2, fontVariantNumeric: "tabular-nums" }}>{last.cum}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, minWidth: 44, justifyContent: "flex-end" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: safe ? GREEN : RED, flexShrink: 0 }} />
                <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 10, color: TEXT, fontVariantNumeric: "tabular-nums" }}>
                  {last.gap > 0 ? "+" : ""}{Math.round(last.gap * 10) / 10}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <p style={{ fontFamily: FB, fontSize: 10, color: TEXT2, margin: "8px 0 0", lineHeight: 1.5 }}>
        The line marks the {zoneLabel}. Teams above it are {safeLabel}; the shaded band is the other side.
      </p>
    </div>
  );
}

/** Matchup Position: two series, so this one gets a real legend. */
function MatchupPositionChart({ rows }) {
  if (rows.length === 0) return null;
  const vals = rows.flatMap(r => [r.champ8Avg, r.second5Avg]).filter(v => typeof v === "number");
  if (vals.length === 0) return null;
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const padY = Math.max((hi - lo) * 0.18, 2);
  const yMin = lo - padY, yMax = hi + padY;

  const xOf = (i) => PAD.left + (i / Math.max(rows.length - 1, 1)) * PLOT_W;
  const yOf = (v) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * PLOT_H;
  const line = (key) => rows.map((r, i) => `${i === 0 ? "M" : "L"}${xOf(i).toFixed(1)},${yOf(r[key]).toFixed(1)}`).join(" ");

  const last = rows[rows.length - 1];
  const secondLeads = last.second5Avg > last.champ8Avg;

  return (
    <div>
      <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {[0, 0.25, 0.5, 0.75, 1].map(f => {
          const v = yMin + f * (yMax - yMin);
          return (
            <g key={f}>
              <line x1={PAD.left} x2={PAD.left + PLOT_W} y1={yOf(v)} y2={yOf(v)} stroke={BORDER} strokeWidth={0.5} opacity={0.7} />
              <text x={PAD.left - 5} y={yOf(v) + 2.6} textAnchor="end" style={{ fontFamily: FD, fontWeight: 700, fontSize: 7, fill: TEXT2 }}>{Math.round(v)}</text>
            </g>
          );
        })}
        {rows.map((r, i) => (
          (rows.length <= 12 || i % 2 === 0) && (
            <text key={r.round} x={xOf(i)} y={VH - 8} textAnchor="middle" style={{ fontFamily: FD, fontWeight: 700, fontSize: 7, fill: TEXT2 }}>{r.round}</text>
          )
        ))}
        <path d={line("champ8Avg")} fill="none" stroke={BLUEDARK} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <path d={line("second5Avg")} fill="none" stroke={ORANGE} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={xOf(rows.length - 1)} cy={yOf(last.champ8Avg)} r={3} fill={BLUEDARK} stroke="#fff" strokeWidth={1.2} />
        <circle cx={xOf(rows.length - 1)} cy={yOf(last.second5Avg)} r={3} fill={ORANGE} stroke="#fff" strokeWidth={1.2} />
        <text x={PAD.left + PLOT_W + 4} y={yOf(last.champ8Avg) + 2.6} style={{ fontFamily: FD, fontWeight: 900, fontSize: 8, fill: TEXT2 }}>{last.champ8Avg.toFixed(1)}</text>
        <text x={PAD.left + PLOT_W + 4} y={yOf(last.second5Avg) + 2.6} style={{ fontFamily: FD, fontWeight: 900, fontSize: 8, fill: TEXT2 }}>{last.second5Avg.toFixed(1)}</text>
      </svg>

      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 14, height: 2.5, borderRadius: 2, background: BLUEDARK, flexShrink: 0 }} />
          <span style={{ fontFamily: FB, fontSize: 11, color: TEXT }}>Championship 8th — {last.champ8Name}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 14, height: 2.5, borderRadius: 2, background: ORANGE, flexShrink: 0 }} />
          <span style={{ fontFamily: FB, fontSize: 11, color: TEXT }}>Second Division 5th — {last.second5Name}</span>
        </div>
      </div>

      <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 8, background: secondLeads ? "rgba(224,138,46,0.10)" : "#fff", border: `1px solid ${secondLeads ? ORANGE : BORDER}` }}>
        <p style={{ fontFamily: FB, fontSize: 11, color: TEXT2, margin: 0, lineHeight: 1.5 }}>
          {secondLeads
            ? <>As it stands the swap is <strong style={{ color: ORANGE }}>on</strong> — {last.second5Name} is outscoring {last.champ8Name} on average.</>
            : <>As it stands the swap is <strong style={{ color: TEXT }}>off</strong> — {last.champ8Name} still holds the higher scoring average.</>}
        </p>
      </div>
    </div>
  );
}

function Card({ title, subtitle, children }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, padding: "14px 12px", marginBottom: 16 }}>
      <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 13, color: DARK, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 2px" }}>{title}</p>
      <p style={{ fontFamily: FB, fontSize: 11, color: TEXT2, margin: "0 0 10px", lineHeight: 1.5 }}>{subtitle}</p>
      {children}
    </div>
  );
}

function TableView({ trends }) {
  const { rounds, divisions } = trends;
  return (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      {["championship", "second"].map(key => (
        <div key={key} style={{ marginBottom: 20 }}>
          <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 12, color: DARK, textTransform: "uppercase", margin: "0 0 8px" }}>
            {key === "championship" ? "Championship" : "Second Division"} — points to cut, by round
          </p>
          <table style={{ borderCollapse: "collapse", fontFamily: FB, fontSize: 11, minWidth: 320 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "4px 8px 4px 0", fontFamily: FD, fontWeight: 700, fontSize: 9, color: TEXT2, textTransform: "uppercase", position: "sticky", left: 0, background: "#fff" }}>Team</th>
                {rounds.map(r => (
                  <th key={r.round} style={{ padding: "4px 6px", fontFamily: FD, fontWeight: 700, fontSize: 9, color: TEXT2 }}>R{r.round}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {divisions[key].teams.map(t => (
                <tr key={t.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                  <td style={{ padding: "5px 8px 5px 0", color: TEXT, whiteSpace: "nowrap", position: "sticky", left: 0, background: "#fff" }}>{t.name}</td>
                  {t.series.map(p => (
                    <td key={p.round} style={{ padding: "5px 6px", textAlign: "center", color: TEXT2, fontVariantNumeric: "tabular-nums" }}>
                      {p.gap > 0 ? "+" : ""}{Math.round(p.gap * 10) / 10}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

export default function DivisionTrends({ currentUser, onNavigate }) {
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("championship");
  const [highlight, setHighlight] = useState({ championship: null, second: null });
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [{ data: teams }, { data: players }, { data: scores }, { data: schedule }, { data: races }] = await Promise.all([
          supabase.from("teams").select("*"),
          supabase.from("players").select("id, name"),
          supabase.from("scores").select("*"),
          supabase.from("schedule").select("*"),
          supabase.from("races").select("id, race_name, round, race_date").order("round", { ascending: true }),
        ]);
        setRaw({ teams, players, scores, schedule, races });
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    load();
  }, []);

  const trends = useMemo(() => (raw ? computeDivisionTrends(raw) : null), [raw]);

  // Default the emphasis to the viewer's own team — the line they came to find.
  useEffect(() => {
    if (!trends || !currentUser) return;
    ["championship", "second"].forEach(div => {
      const mine = trends.divisions[div].teams.find(t => t.p1Name === currentUser || t.p2Name === currentUser);
      if (mine) setHighlight(h => (h[div] ? h : { ...h, [div]: mine.id }));
    });
  }, [trends, currentUser]);

  if (loading) return <div style={{ padding: "60px 20px", textAlign: "center" }}><p style={{ fontFamily: FB, fontSize: 14, color: TEXT2 }}>Loading trends…</p></div>;
  if (!trends || trends.rounds.length === 0) return (
    <div style={{ padding: "60px 20px", textAlign: "center" }}>
      <p style={{ fontFamily: FB, fontSize: 14, color: TEXT2 }}>No scored races yet — trends appear once results are in.</p>
    </div>
  );

  const { rounds, divisions, matchupPosition } = trends;
  const isChamp = tab === "championship";
  const div = divisions[tab];

  return (
    <div style={{ padding: "0 16px 30px" }}>
      {onNavigate && (
        <button onClick={() => onNavigate("team-standings")}
          style={{ background: "none", border: "none", padding: "0 0 10px", cursor: "pointer", fontFamily: FD, fontWeight: 800, fontSize: 11, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          ← Team Standings
        </button>
      )}

      <p style={{ fontFamily: FD, fontWeight: 900, fontSize: 20, color: DARK, textTransform: "uppercase", letterSpacing: "0.02em", margin: "0 0 4px" }}>Division Trends</p>
      <p style={{ fontFamily: FB, fontSize: 12, color: TEXT2, margin: "0 0 16px", lineHeight: 1.55 }}>
        How close every team has been to promotion or relegation after each of the first {rounds.length} rounds.
        Zero is the cut line, measured in championship points.
      </p>

      {/* Division switch — one filter row above the charts it scopes */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {[["championship", "Championship"], ["second", "Second Division"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{
              flex: 1, padding: "9px 8px", borderRadius: 10, cursor: "pointer",
              fontFamily: FD, fontWeight: 800, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em",
              background: tab === key ? DARK : "#fff", color: tab === key ? "#fff" : TEXT2,
              border: `1px solid ${tab === key ? DARK : BORDER}`,
            }}>{label}</button>
        ))}
      </div>

      <Card
        title={isChamp ? "Distance to relegation" : "Distance to promotion"}
        subtitle={isChamp
          ? "Bottom four (9th–12th) go down. Above the line is safety; the red band is the drop zone."
          : "Top four (1st–4th) go up. Above the line is a promotion place; the green band is where you want to be."}
      >
        <CutChart
          key={tab}
          division={div}
          rounds={rounds}
          tone={isChamp ? "danger" : "good"}
          zoneLabel={isChamp ? "relegation cut, between 8th and 9th" : "promotion cut, between 4th and 5th"}
          safeLabel={isChamp ? "safe" : "in a promotion place"}
          highlightId={highlight[tab]}
          onHighlight={(id) => setHighlight(h => ({ ...h, [tab]: id }))}
        />
      </Card>

      <Card
        title="Matchup Position"
        subtitle="The extra swap: if Second Division 5th outscores Championship 8th on average, they trade places too."
      >
        <MatchupPositionChart rows={matchupPosition} />
      </Card>

      <button onClick={() => setShowTable(v => !v)}
        style={{ width: "100%", padding: "10px", borderRadius: 10, background: "#fff", border: `1px solid ${BORDER}`, cursor: "pointer", fontFamily: FD, fontWeight: 800, fontSize: 11, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {showTable ? "Hide table view" : "Show table view"}
      </button>
      {showTable && (
        <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, padding: "14px 12px", marginTop: 12 }}>
          <TableView trends={trends} />
        </div>
      )}
    </div>
  );
}
