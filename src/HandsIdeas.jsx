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
  { n: 5, name: "Possession strip",
    line: "Faces stay neutral. A four-cell strip under each row shows who holds him, in column order.",
    why: "Separates identity from ownership entirely. A face is a driver, never a claim, and the strip is a tally you read like a scoreboard. It survives any number of hands, where colouring the face stops working past two teams." },
];

function Ring({ name, size, shares, idea, force }) {
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
  return url
    ? <img src={url} alt="" style={{ ...solid, border: `3px solid ${ring || tone}` }} />
    : <span style={{ ...solid, border: `3px solid ${ring || tone}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: FD, fontWeight: 700, fontSize: size * 0.3, color: ring || tone }}>
        {lastName(name).slice(0, 3).toUpperCase()}</span>;
}

function Board({ idea, cols, spots }) {
  const wrap = useRef(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const read = () => setW(el.clientWidth);
    read();
    const ro = new ResizeObserver(read); ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const colW = w ? w / 4 : 0;
  const cx = (c) => colW * (c + 0.5);
  const FACE = 44, HEAD = 62, ROW = 78;
  const cy = (r) => HEAD + ROW * r + ROW / 2 - 10;
  const H = HEAD + ROW * 5;

  const groups = Object.entries(spots).map(([name, at]) => {
    const mine = at.filter(p => p.ours).length, net = mine - (at.length - mine);
    return { name, at, mine, net, tone: net > 0 ? MINE : net < 0 ? THEIRS : LEVEL };
  });

  // Idea 1: pair one of yours with one of theirs and grey both off.
  const cancelled = {};
  if (idea === 1) {
    groups.forEach(g => {
      const ours = g.at.filter(p => p.ours), th = g.at.filter(p => !p.ours);
      const pairs = Math.min(ours.length, th.length);
      ours.slice(0, pairs).concat(th.slice(0, pairs))
        .forEach(p => { cancelled[`${g.name}-${p.c}`] = true; });
    });
  }

  const seen = new Set();
  return (
    <div ref={wrap} style={{ position: "relative", height: H }}>
      {w > 0 && (
        <svg width="100%" height={H} style={{ position: "absolute", inset: 0, zIndex: 1 }}>
          {groups.filter(g => g.at.length > 1).map(g => {
            const pts = g.at.slice().sort((a, b) => a.c - b.c)
              .map(p => `${cx(p.c)},${cy(p.r)}`).join(" ");
            const grey = idea === 3 ? g.net === 0 : idea === 1 ? g.net === 0 : false;
            const col = idea === 2 ? V.border2 : idea === 5 ? V.border2 : (grey ? LEVEL : g.tone);
            const width = idea === 3 ? (g.net === 0 ? 2 : 3 + Math.abs(g.net) * 2) : 4;
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
        {cols.flatMap((h, c) => h.order.map((name, r) => {
          const g = groups.find(x => x.name === name);
          const key = `${name}-${c}`;
          const dim = idea === 1 && cancelled[key];
          const shares = g.at.map(p => p.ours);
          const badge = idea === 2 && g.at.length > 1 && !seen.has(name) && (seen.add(name), true);
          return (
            <div key={key} style={{
              position: "absolute", left: cx(c) - FACE / 2, top: cy(r) - FACE / 2,
              width: FACE, textAlign: "center",
            }}>
              <span style={{ position: "relative", display: "inline-block" }}>
                <Ring name={name} size={FACE} idea={idea}
                      force={dim ? LEVEL : (idea === 2 || idea === 3) ? (h.ours ? MINE : THEIRS) : undefined}
                      shares={idea === 2 || idea === 3 ? [h.ours] : shares} />
                {dim && <span style={{
                  position: "absolute", inset: 0, borderRadius: "50%",
                  background: "rgba(7,7,12,0.45)",
                }} />}
              </span>
              <div style={{
                marginTop: -7, display: "inline-block", position: "relative",
                padding: "2px 5px", borderRadius: 7, background: "#000",
                border: `1px solid ${dim ? V.border : (idea === 2 || idea === 3)
                  ? (h.ours ? MINE : THEIRS) : idea === 5 ? V.border2 : g.tone}`,
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
        const spots = {};
        cols.forEach((h, c) => h.order.forEach((n, r) => { (spots[n] ||= []).push({ r, c, ours: h.ours }); }));
        setS({ loading: false, cols, spots, race, myTeam, opp });
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
          Idea {meta.n} of 5 &middot; round 11
        </div>
        <h1 style={{ ...display("h2"), color: V.text, margin: "0 0 6px" }}>{meta.name}</h1>
        <p style={{ ...body("body"), color: V.text2, margin: "0 0 16px" }}>{meta.line}</p>

        <div style={{ ...card({ padding: "14px 10px", marginBottom: 16 }) }}>
          <Board idea={meta.n} cols={s.cols} spots={s.spots} />
        </div>

        <div style={{ ...card({ padding: 16, marginBottom: 18 }) }}>
          <div style={{ ...labelType(), color: V.blue, marginBottom: 8 }}>Why this way</div>
          <p style={{ ...body("body"), color: V.text2, margin: 0 }}>{meta.why}</p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {IDEAS.map(i => (
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
