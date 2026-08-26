// The four-hand board, shared.
//
// Lifted out of VegasHome.jsx unchanged so the home page and the weekly deck
// draw the same board from the same code. Two copies of a layout this specific
// is how they end up disagreeing about which driver cancelled, which is the same
// shape of bug as two pages computing standings two ways.
//
// The rule it encodes: a driver cancels COPY FOR COPY, not driver for driver.
// Two of theirs against one of ours is one pair that goes grey and one copy left
// over that still counts.
//
// seats: [{ id, name, photo, ours, mine, pick: { order:[driver], bestFinish },
//           score: { top, mid, best, order, total } }]
// under: "mine" or "theirs", which decides which pair sits on the left
// driverPts: { driver: points }, drawn on the faces once the week is scored
import { useState, useRef, useEffect } from "react";
import { V, FD, display, numeric, card } from "./theme.vegas";
import { DRIVER_HEADSHOTS, TEAM_BY_NAME } from "./drivers";
import { F1_TEAM_COLORS } from "./theme";

export const MINE = V.green, THEIRS = V.pink, DIVIDE = V.blue;

const dColor = (name) => F1_TEAM_COLORS[TEAM_BY_NAME[name]] || V.text3;
const lastName = (n) => (n || "").split(" ").slice(-1)[0];

// Drivers only in this file, so the headshot map is the whole lookup.
function Face({ name, size = 40, ring, glow = 1, drained = false, edge = 2, blank = false }) {
  const [bad, setBad] = useState(false);
  const c = ring || dColor(name);
  const url = DRIVER_HEADSHOTS[name];
  if (!url || bad) {
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%", flexShrink: 0,
        background: V.bg2, border: `${edge}px solid ${c}`,
        boxShadow: glow ? `0 0 ${12 * glow}px ${c}66` : "none",
        display: "flex", alignItems: "center", justifyContent: "center",
        ...display("chip"), color: c,
      }}>{blank ? "" : lastName(name).slice(0, 3).toUpperCase()}</div>
    );
  }
  return (
    <img src={url} alt={name} onError={() => setBad(true)} style={{
      width: size, height: size, borderRadius: "50%", objectFit: "cover", objectPosition: "top",
      flexShrink: 0, background: V.bg3, border: `${edge}px solid ${c}`,
      boxShadow: glow ? `0 0 ${12 * glow}px ${c}${glow > 1 ? "aa" : "55"}` : "none",
      filter: drained ? "grayscale(0.85) brightness(0.8)" : "none",
    }} />
  );
}

function PlayerBadge({ name, picked, size = 38, photo, dim = !picked, ring }) {
  const initials = (name || "").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const c = ring || (picked ? V.green : V.text3);
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: "50%", overflow: "hidden",
        background: photo ? `center/cover url(${photo})` : picked ? `${V.green}1a` : V.bg3,
        border: `2px solid ${c}`,
        boxShadow: picked ? `0 0 12px ${V.green}77` : "none",
        display: "flex", alignItems: "center", justifyContent: "center",
        ...display("chip"), color: c,
        filter: dim ? "grayscale(0.7) brightness(0.75)" : "none",
      }}>{photo ? "" : initials}</div>
    </div>
  );
}

export default function HandsColumns({ seats, under, driverPts = {}, scored = true }) {
  const wrap = useRef(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const read = () => setW(el.clientWidth);
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Left pair is whoever has the under.
  const ours = seats.filter(s => s.ours), theirs = seats.filter(s => !s.ours);
  const cols = under === "mine" ? [...ours, ...theirs] : [...theirs, ...ours];

  const MID = 62;
  const colW = w > 0 ? (w - MID) / 4 : 0;
  // Columns 0 and 1 sit left of the label strip, 2 and 3 right of it.
  const cx = (c) => (c < 2 ? colW * (c + 0.5) : MID + colW * (c + 0.5));
  const FACE = 46, HEAD = 96, ROW = 78;
  const cy = (r) => HEAD + ROW * r + ROW / 2 - 10;
  const boardH = HEAD + ROW * 5;

  const spots = {};
  cols.forEach((h, c) => (h.pick ? h.pick.order : []).slice(0, 5)
    .forEach((name, r) => { (spots[name] ||= []).push({ r, c, ours: h.ours }); }));
  const COLOR = { mine: MINE, theirs: THEIRS, level: V.text2 };

  // A driver cancels copy for copy, not driver for driver. Two of theirs
  // against one of ours is one pair that goes grey and one copy left over that
  // still counts, so pair them off and light only what is left. A driver both
  // teams hold evenly pairs out completely and the whole row goes quiet, which
  // is the same rule, not a special case.
  const cancelled = {};
  const pairs = [], surplus = [];
  Object.entries(spots).forEach(([name, at]) => {
    const free = at.filter(p => p.ours), open = at.filter(p => !p.ours);
    while (free.length && open.length) {
      // Pair the closest two, so the grey line is the short one and the copy
      // left over is not stranded across the board.
      let bi = 0, bj = 0, best = Infinity;
      open.forEach((o, j) => free.forEach((f, i) => {
        const d = Math.abs(o.c - f.c);
        if (d < best) { best = d; bi = i; bj = j; }
      }));
      const [f] = free.splice(bi, 1), [o] = open.splice(bj, 1);
      cancelled[`${f.c}-${f.r}`] = cancelled[`${o.c}-${o.r}`] = true;
      pairs.push({ key: `${name}-${f.c}-${o.c}`, at: [f, o] });
    }
    // Two copies left on one side are both live and both scoring, so they get
    // a lit line. One on its own has nothing to join.
    const left = [...free, ...open];
    if (left.length > 1) surplus.push({ key: name, ours: left[0].ours, at: left });
  });
  const toneAt = (p) => cancelled[`${p.c}-${p.r}`] ? "level" : p.ours ? "mine" : "theirs";
  const LINES = {
    level: pairs,
    mine: surplus.filter(s => s.ours),
    theirs: surplus.filter(s => !s.ours),
  };

  const Layer = ({ which, z }) => (
    <svg width="100%" height={boardH} style={{ position: "absolute", inset: 0, zIndex: z, pointerEvents: "none" }}>
      {LINES[which].map(l => (
        <polyline key={l.key} fill="none" stroke={COLOR[which]}
          points={l.at.slice().sort((a, b) => a.c - b.c).map(p => `${cx(p.c)},${cy(p.r)}`).join(" ")}
          strokeWidth={which === "level" ? 3.5 : 5} strokeLinecap="round" strokeLinejoin="round"
          opacity={which === "level" ? 0.5 : 1}
          style={which === "theirs" ? { filter: `drop-shadow(0 0 6px ${COLOR[which]})` } : undefined} />
      ))}
    </svg>
  );

  const Plate = ({ text, c, dim, size = 12, top = -7 }) => (
    <div style={{
      marginTop: top, display: "inline-block", position: "relative",
      // No max width and no ellipsis. A surname is never cut: the plate is the
      // top layer, so a wide one sits over its neighbour rather than losing
      // letters, and a name you cannot read is worse than one that overlaps.
      padding: "2px 5px", borderRadius: 7, background: "#000",
      border: `1px solid ${dim ? V.border : c}`,
      fontFamily: FD, fontWeight: 700, fontSize: size, lineHeight: 1.35,
      color: dim ? V.text2 : "#fff", whiteSpace: "nowrap",
    }}>{text}</div>
  );

  const Drivers = ({ which, z }) => (
    <div style={{ position: "absolute", inset: 0, zIndex: z, pointerEvents: "none" }}>
      {cols.flatMap((h, c) => (h.pick ? h.pick.order : []).slice(0, 5).map((name, r) => {
        const t = toneAt({ r, c, ours: h.ours });
        if (which === "level" ? t !== "level" : t === "level") return null;
        // Once the week is scored, what he scored goes on his face. Same size as
        // the totals underneath and the colour of his ring, so a column reads
        // down as five numbers and across as the same driver twice.
        const pts = scored ? driverPts[name] : undefined;
        return (
          <div key={`${c}-${r}`} style={{
            position: "absolute", left: cx(c) - FACE / 2, top: cy(r) - FACE / 2,
            width: FACE, textAlign: "center",
          }}>
            <div style={{ position: "relative", height: FACE }}>
              <Face name={name} size={FACE} ring={COLOR[t]} edge={3} blank={pts != null}
                    glow={t === "theirs" ? 1.1 : 0} drained={t === "level"} />
              {/* Inset by the ring width, so the photograph goes and the ring
                  stays. A face is the loudest thing on the board and the number
                  has to win. */}
              {pts != null && (
                <div style={{
                  position: "absolute", inset: 3, borderRadius: "50%",
                  background: "rgba(6,8,14,0.82)",
                }} />
              )}
              {pts != null && (
                <div style={{
                  position: "absolute", inset: 0, display: "flex",
                  alignItems: "center", justifyContent: "center",
                  ...numeric("chip"), fontSize: 20, color: COLOR[t],
                  // No plate behind it. The face is a photograph and the number
                  // has to sit on any part of one, so it carries its own dark.
                  textShadow: "0 0 3px #000, 0 0 6px #000, 0 1px 3px #000",
                }}>{pts}</div>
              )}
            </div>
            <Plate text={lastName(name)} c={COLOR[t]} dim={t === "level"} />
          </div>
        );
      }))}
    </div>
  );

  // Four numbers a side with the label between them.
  const ROWS = [
    { k: "Top", get: s => (s.score ? s.score.top : null) },
    { k: "Mid", get: s => (s.score ? s.score.mid : null) },
    { k: "Best\nfinish", get: s => (s.score ? s.score.best : null),
      sub: s => (s.pick ? s.pick.bestFinish : null) },
    { k: "Order", get: s => (s.score ? s.score.order : null) },
  ];

  return (
    <div style={{ ...card({ padding: "14px 10px 12px", marginBottom: 14 }) }}>
      <div ref={wrap} style={{ position: "relative", height: boardH, minWidth: 0 }}>
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          {cols.map((h, c) => {
            const col = h.ours ? MINE : THEIRS;
            return (
              <div key={h.id} style={{
                position: "absolute", left: cx(c) - colW / 2, top: 0, width: colW,
                display: "flex", flexDirection: "column", alignItems: "center",
              }}>
                <PlayerBadge name={h.name} picked={false} dim={false} ring={col}
                             photo={h.photo} size={54} />
                <Plate text={h.mine ? "You" : lastName(h.name)} c={col} size={13} top={-8} />
                {scored && (
                  <div style={{ ...numeric("h3"), fontSize: 22, color: col, marginTop: 4 }}>
                    {h.score ? h.score.total : "\u2014"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {w > 0 && (
          <>
            <Layer which="level" z={1} />
            <Drivers which="level" z={2} />
            <Layer which="theirs" z={3} />
            <Layer which="mine" z={4} />
            <Drivers which="owned" z={5} />
          </>
        )}
      </div>

      {/* Before the race there are no components to compare, but the best
          finish each player called is a pick and not a score, so that one line
          stays and the other three wait. */}
      {w > 0 && !scored && (
        <div style={{ marginTop: 6, display: "flex", alignItems: "center", padding: "5px 0",
                      borderTop: `1px solid ${V.border}` }}>
          {cols.map((h, c) => {
            const cell = (
              <div key={h.id} style={{ width: colW, textAlign: "center" }}>
                <div style={{ ...display("chip"), fontSize: 15, color: h.ours ? MINE : THEIRS }}>
                  {h.pick ? h.pick.bestFinish : "\u2014"}
                </div>
              </div>
            );
            return c === 2
              ? [<div key="lab" style={{
                  width: MID, textAlign: "center", ...display("chip"), fontSize: 13,
                  color: DIVIDE, letterSpacing: "0.04em", lineHeight: 1.15,
                }}><div>Best</div><div>finish</div></div>, cell]
              : cell;
          })}
        </div>
      )}

      {w > 0 && scored && (
        <div style={{ marginTop: 6 }}>
          {ROWS.map(row => (
            <div key={row.k} style={{ display: "flex", alignItems: "center", padding: "5px 0",
                                      borderTop: `1px solid ${V.border}` }}>
              {cols.map((h, c) => {
                const col = h.ours ? MINE : THEIRS;
                const v = row.get(h);
                const cell = (
                  <div key={h.id} style={{ width: colW, textAlign: "center" }}>
                    <div style={{ ...numeric("chip"), fontSize: 20, color: v ? col : V.text2 }}>
                      {v == null ? "\u2014" : v === 0 ? "\u2715" : v}
                    </div>
                    {row.sub && (
                      <div style={{ ...display("chip"), fontSize: 13, color: V.text2, marginTop: 1 }}>
                        {row.sub(h) || ""}
                      </div>
                    )}
                  </div>
                );
                // The label sits between the two pairs.
                return c === 2
                  ? [<div key="lab" style={{
                      width: MID, textAlign: "center", ...display("chip"), fontSize: 13,
                      color: DIVIDE, letterSpacing: "0.04em", lineHeight: 1.15,
                    }}>{row.k.split("\n").map(t => <div key={t}>{t}</div>)}</div>, cell]
                  : cell;
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
