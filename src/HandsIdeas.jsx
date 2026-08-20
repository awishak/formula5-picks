import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import { V, FD, display, numeric, body, label as labelType, card, textGlow } from "./theme.vegas";
import { DRIVER_HEADSHOTS } from "./drivers";
import { F1_TEAM_COLORS } from "./theme";

// Five answers to one problem, each on its own page.
//
// The problem: a driver can sit in three of the four hands. Two of yours and one
// of theirs. Colouring all three green says the opponent's card is yours, which
// it is not; greying all three says nobody gains, which is also untrue. The net
// is +1 to you, and the question is where to put that fact.
//
// Each page below answers it from a different place: the net, the holder, the
// relationship, the node, or the tally.

const MINE = V.green, THEIRS = V.pink, LEVEL = V.text2;
const lastName = (n) => (n || "").split(" ").slice(-1)[0];

const IDEAS = [
  { n: 1, name: "Cancel out",
    line: "Pair one of yours against one of theirs and grey both. What is left over is the advantage.",
    why: "Treats the board as arithmetic. Every driver either nets somebody a point or nets nobody anything, and the greyed pairs are the ones that cancel. The advantage is the only thing in colour, so the board shows you the margin rather than the inventory." },
  { n: 2, name: "Holder, with a net badge",
    line: "Every circle is the colour of whoever holds it. The net advantage is stated once, on the line.",
    why: "Refuses to let a colour mean two things. Green always means it is on your card and nothing else, so nothing on your opponent's row is ever green. The net is real information but it belongs to the group, not to the face, so it goes on the line as a number." },
  { n: 3, name: "Weight the line",
    line: "Faces stay in their holder's colour. The line carries the advantage: thick and coloured for a net, thin and grey for a wash.",
    why: "Says the relationship is the story. A driver in three hands is not three facts, it is one fact about a group, and the thing joining them is where that fact should live. Reading down a column you see who you have; reading across you see who it beats." },
  { n: 4, name: "Split ring",
    line: "Each ring is divided into arcs, one per holder. Two green arcs and one pink means two of yours and one of theirs.",
    why: "Puts the whole picture on every node. You never have to trace a line to know a driver is contested, because his ring already says so wherever you look at him. The cost is a smaller, busier mark." },
  { n: 8, name: "Tint the surplus",
    line: "Picks in the order each player made them. Every circle is the colour of whoever holds him, a shared driver's line fades between the two, and the one copy that is not cancelled out is tinted.",
    why: "Three facts, three channels, and none of them fighting. The ring says who holds him, so it is green on your rows and pink on theirs and never the other way round. The line says he is contested and fades from your end to theirs. The tint says who actually gained: two of yours against one of theirs is one pair that cancels and one copy that does not, so exactly one face fills with colour and the rest stay photographs." },
  { n: 7, name: "One row per driver",
    line: "A row is a driver, not a pick slot. His circle says whether you want him to score; the four cells say who has him and where they ranked him.",
    why: "Two different facts stopped fighting over one colour. Rooting is a net: you want Hamilton to score even though they have one of him, so his circle is green wherever he appears. Holding is a fact about a card, so it lives in the cells. And a row is a driver rather than a pick position, which is the only way the board survives two people ranking the same driver differently: no diagonals, no crossings, and a name appears exactly once." },
  { n: 6, name: "Gradient line",
    line: "Faces are just drivers. The line joining them runs green where you hold him and pink where they do, and the middle column says what he was worth.",
    why: "Puts the split on the thing that is actually shared. A face is a person and never a claim, so nothing on your opponent's row can look like yours; the line is the only thing that spans both teams, so it is the only thing that should be two colours. And because every copy scores, the number is the real one: two of yours at 25 and one of theirs is 50 against 25, which the middle column says outright instead of leaving you to work out." },
  { n: 5, name: "Possession strip",
    line: "Faces stay neutral. A four-cell strip under each row shows who holds him, in column order.",
    why: "Separates identity from ownership entirely. A face is a driver, never a claim, and the strip is a tally you read like a scoreboard. It survives any number of hands, where colouring the face stops working past two teams." },
];

function Ring({ name, size, shares, idea, force, tint }) {
  const url = DRIVER_HEADSHOTS[name];
  const mine = shares.filter(Boolean).length, theirs = shares.length - mine;
  const net = mine - theirs;
  const tone = net > 0 ? MINE : net < 0 ? THEIRS : LEVEL;
  const solid = { width: size, height: size, borderRadius: "50%", objectFit: "cover",
    objectPosition: "top", background: V.bg2, display: "block" };

  // Idea 4 draws the ring as arcs, one per holder, so the mark itself carries
  // the split.
  if (idea === 4) {
    const R = size / 2, C = 2 * Math.PI * (R - 2);
    const seg = C / shares.length;
    return (
      <span style={{ position: "relative", display: "inline-block", width: size, height: size }}>
        {url ? <img src={url} alt="" style={{ ...solid, padding: 3 }} />
             : <span style={{ ...solid, border: `1px solid ${V.border}` }} />}
        <svg width={size} height={size} style={{ position: "absolute", inset: 0 }}>
          {shares.map((isMine, i) => (
            <circle key={i} cx={R} cy={R} r={R - 2} fill="none"
              stroke={isMine ? MINE : THEIRS} strokeWidth="3"
              strokeDasharray={`${seg - 3} ${C - seg + 3}`}
              strokeDashoffset={-i * seg} transform={`rotate(-90 ${R} ${R})`} />
          ))}
        </svg>
      </span>
    );
  }

  // force wins: idea 1 needs a cancelled cell grey even though the group nets
  // somebody a point, which is the whole point of cancelling it.
  const ring = force || (idea === 5 ? V.border2 : undefined);
  // A tinted face carries the advantage further than a ring does. mix-blend
  // keeps the photo's shading and only moves its colour.
  if (tint && url) return (
    <span style={{ position: "relative", display: "inline-block", width: size, height: size,
                   borderRadius: "50%", overflow: "hidden", border: `3px solid ${tint}`,
                   boxSizing: "border-box" }}>
      <img src={url} alt="" style={{ ...solid, border: "none" }} />
      <span style={{ position: "absolute", inset: 0, background: tint,
                     mixBlendMode: "color", opacity: 0.85 }} />
    </span>
  );
  return url
    ? <img src={url} alt="" style={{ ...solid, border: `3px solid ${ring || tone}` }} />
    : <span style={{ ...solid, border: `3px solid ${ring || tone}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: FD, fontWeight: 700, fontSize: size * 0.3, color: ring || tone }}>
        {lastName(name).slice(0, 3).toUpperCase()}</span>;
}


// One row per driver. Columns are the four players, a cell says whether that
// player has him and where they put him.
function DriverRows({ cols, pts }) {
  const names = [...new Set(cols.flatMap(h => h.order))];
  const rows = names.map(name => {
    const at = cols.map((h, c) => ({ c, ours: h.ours, at: h.order.indexOf(name) }))
      .filter(z => z.at >= 0);
    const p = pts[name] ?? 0;
    const mine = at.filter(z => z.ours).length, th = at.length - mine;
    return { name, at, p, forUs: mine * p, forThem: th * p, net: (mine - th) * p };
  }).sort((a, b) => b.net - a.net || b.p - a.p);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, padding: "0 0 8px" }}>
        <div style={{ width: 96 }} />
        {cols.map(h => (
          <div key={h.name} style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
            {/* No ellipsis. A first name spills a couple of pixels into the
                empty space beside it rather than losing letters. */}
            <div style={{ ...display("chip"), fontSize: 11, letterSpacing: "0.02em",
              color: h.ours ? MINE : THEIRS, whiteSpace: "nowrap" }}>{h.first}</div>
          </div>
        ))}
        <div style={{ width: 56, textAlign: "center", ...display("chip"),
                      fontSize: 11, color: V.blue }}>WORTH</div>
      </div>

      {rows.map(r => {
        const tone = r.net > 0 ? MINE : r.net < 0 ? THEIRS : LEVEL;
        return (
          <div key={r.name} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "5px 0",
            borderTop: `1px solid ${V.border}`,
          }}>
            <div style={{ width: 96, display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
              <Ring name={r.name} size={34} idea={7} force={tone} shares={[]} />
              <span style={{
                fontFamily: FD, fontWeight: 700, fontSize: 13, color: V.text,
                whiteSpace: "nowrap",
              }}>{lastName(r.name)}</span>
            </div>
            {cols.map(h => {
              const z = r.at.find(y => y.c === cols.indexOf(h));
              return (
                <div key={h.name} style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
                  {z ? (
                    <span style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      width: 26, height: 26, borderRadius: 8,
                      background: h.ours ? `${MINE}22` : `${THEIRS}22`,
                      border: `1.5px solid ${h.ours ? MINE : THEIRS}`,
                      ...numeric("chip"), fontSize: 13, color: h.ours ? MINE : THEIRS,
                    }}>{z.at + 1}</span>
                  ) : (
                    <span style={{ display: "inline-block", width: 26, height: 3,
                                   borderRadius: 2, background: V.bg3 }} />
                  )}
                </div>
              );
            })}
            <div style={{ width: 56, textAlign: "center" }}>
              <span style={{ ...numeric("chip"), fontSize: 14, color: tone }}>
                {r.forUs}&ndash;{r.forThem}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Board({ idea, cols, spots, pts }) {
  const wrap = useRef(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const read = () => setW(el.clientWidth);
    read();
    const ro = new ResizeObserver(read); ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // A gutter down the middle, so the per-driver number has somewhere to live
  // that is not on top of a face.
  const GUT = idea === 6 ? 62 : 0;
  const colW = w ? (w - GUT) / 4 : 0;
  const cx = (c) => (c < 2 ? colW * (c + 0.5) : GUT + colW * (c + 0.5));
  const FACE = 44, HEAD = 62, ROW = 78;
  const cy = (r) => HEAD + ROW * r + ROW / 2 - 10;
  const H = HEAD + ROW * 5;

  const groups = Object.entries(spots).map(([name, at]) => {
    const mine = at.filter(p => p.ours).length, net = mine - (at.length - mine);
    return { name, at, mine, net, tone: net > 0 ? MINE : net < 0 ? THEIRS : LEVEL };
  });

  // Idea 1: pair one of yours with one of theirs and grey both off.
  const cancelled = {};
  if (idea === 1 || idea === 8) {
    groups.forEach(g => {
      const ours = g.at.filter(p => p.ours), th = g.at.filter(p => !p.ours);
      const pairs = Math.min(ours.length, th.length);
      ours.slice(0, pairs).concat(th.slice(0, pairs))
        .forEach(p => { cancelled[`${g.name}-${p.c}`] = true; });
    });
  }

  // Every copy scores, so a driver in two of your hands pays twice. This is the
  // real difference he made, not a count of who holds more.
  const worth = (g) => {
    const p = pts[g.name];
    if (p == null) return null;
    const mine = g.at.filter(z => z.ours).length, th = g.at.length - mine;
    return { mine: mine * p, theirs: th * p, net: (mine - th) * p };
  };

  const seen = new Set();
  return (
    <div ref={wrap} style={{ position: "relative", height: H }}>
      {w > 0 && (
        <svg width="100%" height={H} style={{ position: "absolute", inset: 0, zIndex: 1 }}>
          <defs>
            {groups.filter(g => g.at.length > 1).map(g => {
              const at = g.at.slice().sort((a, b) => a.c - b.c);
              const x1 = cx(at[0].c), x2 = cx(at[at.length - 1].c);
              return (
                <linearGradient key={g.name} id={`grad-${g.name.replace(/\W/g, "")}`}
                  gradientUnits="userSpaceOnUse" x1={x1} y1="0" x2={x2} y2="0">
                  {at.map((p, i) => (
                    <stop key={i} offset={x2 === x1 ? 0 : (cx(p.c) - x1) / (x2 - x1)}
                          stopColor={p.ours ? MINE : THEIRS} />
                  ))}
                </linearGradient>
              );
            })}
          </defs>
          {groups.filter(g => g.at.length > 1).map(g => {
            const pts = g.at.slice().sort((a, b) => a.c - b.c)
              .map(p => `${cx(p.c)},${cy(p.r)}`).join(" ");
            const grey = (idea === 3 || idea === 1 || idea === 8) ? g.net === 0 : false;
            // A shared driver is held at both ends, so the line says so: green
            // where you have him, pink where they do.
            const col = (idea === 6 || idea === 8) ? `url(#grad-${g.name.replace(/\W/g, "")})`
              : idea === 2 ? V.border2 : idea === 5 ? V.border2
              : (grey ? LEVEL : g.tone);
            const width = idea === 3 ? (g.net === 0 ? 2 : 3 + Math.abs(g.net) * 2)
              : (idea === 6 || idea === 8) ? 5 : 4;
            return <polyline key={g.name} points={pts} fill="none" stroke={col}
              strokeWidth={width} strokeLinecap="round" strokeLinejoin="round"
              opacity={col === V.border2 || col === LEVEL ? 0.6 : 1} />;
          })}
        </svg>
      )}

      <div style={{ position: "absolute", inset: 0, zIndex: 2 }}>
        {cols.map((h, c) => (
          <div key={h.name} style={{
            position: "absolute", left: cx(c) - colW / 2, top: 0, width: colW,
            display: "flex", flexDirection: "column", alignItems: "center",
          }}>
            <div style={{ ...display("chip"), fontSize: 13,
              color: h.ours ? MINE : THEIRS }}>{h.first}</div>
            <div style={{ ...numeric("chip"), fontSize: 17,
              color: h.ours ? MINE : THEIRS }}>{h.total}</div>
          </div>
        ))}
        {idea === 6 && groups.map(g => {
          const wv = worth(g);
          if (!wv || g.at.length < 2) return null;
          const r = g.at[0].r;
          return (
            // Centred on its own row and on the gutter between the two teams,
            // which is where the line it labels crosses.
            <div key={`w-${g.name}`} style={{
              position: "absolute", left: 0, right: 0, top: cy(r) - 11,
              textAlign: "center", pointerEvents: "none", zIndex: 3,
            }}>
              <span style={{
                ...numeric("chip"), fontSize: 14,
                color: wv.net > 0 ? MINE : wv.net < 0 ? THEIRS : LEVEL,
                background: "#000", borderRadius: 7, padding: "3px 8px",
                border: `1px solid ${wv.net > 0 ? MINE : wv.net < 0 ? THEIRS : V.border}`,
              }}>{wv.mine}&ndash;{wv.theirs}</span>
            </div>
          );
        })}
        {cols.flatMap((h, c) => h.order.map((name, r) => {
          const g = groups.find(x => x.name === name);
          const key = `${name}-${c}`;
          const dim = (idea === 1 || idea === 8) && cancelled[key];
          const shares = g.at.map(p => p.ours);
          const badge = idea === 2 && g.at.length > 1 && !seen.has(name) && (seen.add(name), true);
          return (
            <div key={key} style={{
              position: "absolute", left: cx(c) - FACE / 2, top: cy(r) - FACE / 2,
              width: FACE, textAlign: "center",
            }}>
              <span style={{ position: "relative", display: "inline-block" }}>
                <Ring name={name} size={FACE} idea={idea}
                      tint={idea === 8 && !dim && g.net !== 0 ? g.tone : undefined}
                      force={idea === 8 ? (h.ours ? MINE : THEIRS)
                        : dim ? LEVEL : idea === 6 ? V.border2
                        : (idea === 2 || idea === 3) ? (h.ours ? MINE : THEIRS) : undefined}
                      shares={idea === 2 || idea === 3 ? [h.ours] : shares} />
                {dim && idea !== 8 && <span style={{
                  position: "absolute", inset: 0, borderRadius: "50%",
                  background: "rgba(7,7,12,0.45)",
                }} />}
              </span>
              <div style={{
                marginTop: -7, display: "inline-block", position: "relative",
                padding: "2px 5px", borderRadius: 7, background: "#000",
                border: `1px solid ${idea === 8 ? (h.ours ? MINE : THEIRS)
                  : dim ? V.border
                  : idea === 6 ? V.border2
                  : (idea === 2 || idea === 3) ? (h.ours ? MINE : THEIRS)
                  : idea === 5 ? V.border2 : g.tone}`,
                fontFamily: FD, fontWeight: 700, fontSize: 11, lineHeight: 1.35,
                color: dim ? V.text2 : "#fff", whiteSpace: "nowrap",
              }}>{lastName(name)}</div>
              {badge && g.net !== 0 && (
                <div style={{
                  position: "absolute", top: -8, right: -14,
                  ...numeric("chip"), fontSize: 12, color: g.tone,
                  background: "#000", borderRadius: 6, padding: "1px 4px",
                  border: `1px solid ${g.tone}`,
                }}>{g.net > 0 ? `+${g.net}` : g.net}</div>
              )}
              {idea === 5 && (
                <div style={{ display: "flex", gap: 2, justifyContent: "center", marginTop: 3 }}>
                  {cols.map((cc, i) => {
                    const has = g.at.some(p => p.c === i);
                    return <span key={i} style={{
                      width: 8, height: 5, borderRadius: 2,
                      background: has ? (cc.ours ? MINE : THEIRS) : V.bg3,
                    }} />;
                  })}
                </div>
              )}
            </div>
          );
        }))}
      </div>
    </div>
  );
}

export default function HandsIdeas({ idea = 1 }) {
  const [s, setS] = useState({ loading: true });
  const meta = IDEAS.find(i => i.n === idea) || IDEAS[0];

  useEffect(() => {
    (async () => {
      try {
        const [players, teams, races, scores, schedule, picks] = await Promise.all([
          supabase.from("players").select("id,name,photo_url"),
          supabase.from("teams").select("*"),
          supabase.from("races").select("*"),
          supabase.from("scores").select("*"),
          supabase.from("schedule").select("*"),
          supabase.from("picks").select("*"),
        ]).then(r => r.map(x => x.data || []));

        const race = races.find(r => r.round === 11);
        const me = players.find(p => p.name === "Andrew Ishak");
        const myTeam = teams.find(t => t.player1_id === me.id || t.player2_id === me.id);
        const fx = schedule.find(m => m.race_id === race.id &&
          (m.home_team_id === myTeam.id || m.away_team_id === myTeam.id));
        const opp = teams.find(t => t.id === (fx.home_team_id === myTeam.id ? fx.away_team_id : fx.home_team_id));

        const seatOf = (t, ours) => [t.player1_id, t.player2_id].map(id => {
          const p = players.find(x => x.id === id);
          const pk = picks.find(x => x.race_id === race.id && x.player_id === id);
          const sc = scores.find(x => x.race_id === race.id && x.player_id === id);
          return {
            name: p.name, first: p.name.split(" ")[0], ours,
            order: (pk ? pk.finishing_order : []).slice(0, 5),
            total: sc ? (sc.top_pick_pts || 0) + (sc.midfield_pts || 0) +
                        (sc.best_finish_bonus || 0) + (sc.order_bonus || 0) : 0,
          };
        });
        const cols = [...seatOf(myTeam, true), ...seatOf(opp, false)];
        // What each driver scored this round, which is the same for everyone
        // who picked him.
        const pts = {};
        const anyScore = scores.find(x => x.race_id === race.id && x.driver_pts);
        if (anyScore) {
          scores.filter(x => x.race_id === race.id).forEach(x => {
            try { Object.entries(JSON.parse(x.driver_pts || "{}"))
              .forEach(([d, v]) => { pts[d] = v; }); } catch (e) {}
          });
        }
        const spots = {};
        cols.forEach((h, c) => h.order.forEach((n, r) => { (spots[n] ||= []).push({ r, c, ours: h.ours }); }));
        setS({ loading: false, cols, spots, pts, race, myTeam, opp });
      } catch (e) { console.error(e); setS({ loading: false, error: true }); }
    })();
  }, []);

  const wrap = { maxWidth: 520, margin: "0 auto", padding: "18px 16px 60px" };
  if (s.loading || s.error) return (
    <div style={{ background: V.bg, minHeight: "100vh", ...wrap }}>
      <p style={{ ...body("body"), color: V.text2 }}>{s.error ? "Did not load." : "Loading"}</p>
    </div>
  );

  return (
    <div style={{ background: V.bg, minHeight: "100vh" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Encode+Sans+Semi+Condensed:wght@400;600;700&family=Chakra+Petch:wght@600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');`}</style>
      <div style={wrap}>
        <div style={{ ...labelType(), color: V.text2, marginBottom: 6 }}>
          Idea {meta.n} of {IDEAS.length} &middot; round 11
        </div>
        <h1 style={{ ...display("h2"), color: V.text, margin: "0 0 6px" }}>{meta.name}</h1>
        <p style={{ ...body("body"), color: V.text2, margin: "0 0 16px" }}>{meta.line}</p>

        <div style={{ ...card({ padding: "14px 12px", marginBottom: 16 }) }}>
          {meta.n === 7
            ? <DriverRows cols={s.cols} pts={s.pts} />
            : <Board idea={meta.n} cols={s.cols} spots={s.spots} pts={s.pts} />}
        </div>

        <div style={{ ...card({ padding: 16, marginBottom: 18 }) }}>
          <div style={{ ...labelType(), color: V.blue, marginBottom: 8 }}>Why this way</div>
          <p style={{ ...body("body"), color: V.text2, margin: 0 }}>{meta.why}</p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[...IDEAS].sort((a, b) => a.n - b.n).map(i => (
            <a key={i.n} href={`/hands/${i.n}`} style={{
              padding: "8px 12px", borderRadius: 10, textDecoration: "none",
              background: i.n === meta.n ? "rgba(47,255,155,0.12)" : V.bg3,
              border: `1px solid ${i.n === meta.n ? MINE : V.border}`,
              fontFamily: FD, fontWeight: 600, fontSize: 14,
              color: i.n === meta.n ? MINE : V.text2,
            }}>{i.n}. {i.name}</a>
          ))}
        </div>
      </div>
    </div>
  );
}
