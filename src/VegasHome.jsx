// Vegas second-half mockup: the neon kit plus the new state-driven Home.
//
// Data is a hardcoded snapshot of the real league at round 11 (Hungary), pulled
// 2026-07-25. Real teams, real players, real picks, real qualifying grid. The
// only invented numbers are in the live-projection panel, because the race has
// not run yet; that panel is marked MOCK in the UI so nobody reads it as real.
//
// Nothing here touches Supabase. It is a design surface, reachable at #vegas.

import { useState } from "react";
import { V, display, body, marquee, textGlow, edgeGlow, card, VEGAS_CSS } from "./theme.vegas";
import { DRIVER_HEADSHOTS, TEAM_BY_NAME } from "./drivers";
import { F1_TEAM_COLORS } from "./theme";

// ── Real league snapshot, round 11 ───────────────────────
const SNAP = {
  me: "Andrew Ishak",
  myTeam: { name: "Cal Aggie Racing", division: "second", rank: 4, champPts: 105, record: "6-4" },
  teammate: "Kevin Coolidge",
  opp: { name: "Peloton Aubergine", rank: 5, champPts: 100, record: "5-5", p1: "Brett Dillon", p2: "Stacy Michaelsen" },
  race: {
    round: 11, name: "Hungarian Grand Prix", circuit: "Hungaroring", location: "Budapest",
    date: "2026-07-26", lightsOut: "2026-07-26T13:00:00Z", deadline: "2026-07-25T00:00:00Z",
    pitQuestion: "Alpine's first pit stop",
  },
  // Hungaroring character. This is the "what kind of track is this" answer.
  track: {
    headline: "Tight, twisty, and nearly impossible to pass on",
    turns: 14, km: 4.38, laps: 70,
    tags: ["High downforce", "Track position is king", "Safety car likely"],
    note: "Only one real overtaking spot, the run down to Turn 1. Grid position tends to hold, so qualifying is your best form guide this weekend.",
  },
  pools: {
    top: ["Lando Norris", "Lewis Hamilton", "George Russell"],
    mid: ["Max Verstappen", "Isack Hadjar", "Liam Lawson", "Arvid Lindblad", "Franco Colapinto", "Oliver Bearman", "Gabriel Bortoleto"],
  },
  myPick: {
    topPick: "Lewis Hamilton",
    order: ["Lewis Hamilton", "Max Verstappen", "Isack Hadjar", "Liam Lawson", "Arvid Lindblad"],
    pitGuess: 1.5,
  },
  boxBox: { side: "OVER", line: 2.48, guesses: { "Andrew Ishak": 1.5, "Kevin Coolidge": 1.5, "Brett Dillon": 3.5, "Stacy Michaelsen": 3.4 } },
  // Real qualifying result, session_key 11338.
  grid: {
    "Lando Norris": 1, "Lewis Hamilton": 2, "Charles Leclerc": 3, "Andrea Kimi Antonelli": 4,
    "Oscar Piastri": 5, "Max Verstappen": 6, "George Russell": 7, "Isack Hadjar": 8,
    "Arvid Lindblad": 9, "Nico Hulkenberg": 10, "Liam Lawson": 11, "Pierre Gasly": 12,
    "Franco Colapinto": 13, "Gabriel Bortoleto": 14, "Esteban Ocon": 15, "Fernando Alonso": 16,
    "Oliver Bearman": 17, "Carlos Sainz": 18, "Alex Albon": 19, "Lance Stroll": 20,
    "Valtteri Bottas": 21, "Sergio Perez": 22,
  },
  // Which side each driver moves. Derived from the real round-11 picks:
  //   mine   my team has more of him than theirs  → root for
  //   theirs their team has more than mine        → root against
  //   both   equal count, cannot move the matchup → cancels out
  // Every other driver is on nobody's card and gets no mark.
  sides: {
    "Lewis Hamilton": "mine", "Liam Lawson": "mine", "Arvid Lindblad": "mine",
    "George Russell": "theirs", "Franco Colapinto": "theirs", "Oliver Bearman": "theirs",
    "Max Verstappen": "both", "Isack Hadjar": "both",
  },
  // INVENTED. The race has not run. Both snapshots are marked MOCK in the UI.
  // Two laps so the table can be seen changing, and so the projection flips:
  // at lap 30 the edge drivers are ahead, by lap 52 theirs have come through.
  laps: [
    {
      lap: 30, projMine: 34, projTheirs: 27, alpineStopped: false, updatedAgo: 40,
      order: ["Lando Norris", "Lewis Hamilton", "Charles Leclerc", "Max Verstappen", "Oscar Piastri",
        "Andrea Kimi Antonelli", "Isack Hadjar", "George Russell", "Arvid Lindblad", "Liam Lawson",
        "Nico Hulkenberg", "Pierre Gasly", "Franco Colapinto", "Gabriel Bortoleto", "Esteban Ocon",
        "Fernando Alonso", "Oliver Bearman", "Carlos Sainz", "Alex Albon", "Lance Stroll",
        "Valtteri Bottas", "Sergio Perez"],
    },
    {
      lap: 52, projMine: 24, projTheirs: 31, alpineStopped: true, updatedAgo: 75,
      order: ["Lando Norris", "Charles Leclerc", "Max Verstappen", "Oscar Piastri", "George Russell",
        "Andrea Kimi Antonelli", "Lewis Hamilton", "Isack Hadjar", "Oliver Bearman", "Franco Colapinto",
        "Arvid Lindblad", "Liam Lawson", "Nico Hulkenberg", "Pierre Gasly", "Gabriel Bortoleto",
        "Esteban Ocon", "Fernando Alonso", "Carlos Sainz", "Alex Albon", "Lance Stroll",
        "Valtteri Bottas", "Sergio Perez"],
    },
  ],
  totalLaps: 70,
  standings: { myRank: 6, myPts: 446, of: 48, leader: "Joe McGlynn", leaderPts: 478 },
};

const dColor = (name) => F1_TEAM_COLORS[TEAM_BY_NAME[name]] || V.text3;
const lastName = (n) => (n || "").split(" ").slice(-1)[0];
// The marquee says the place, not the words "Grand Prix", which sit under it.
const shortRace = (n) => (n || "").replace(/\s*Grand Prix\s*/i, "").trim();

// ── Primitives ───────────────────────────────────────────

function Label({ children, color = V.text3, style }) {
  return <p style={{ ...display("label"), color, margin: 0, ...style }}>{children}</p>;
}

function SectionHead({ children, accent = V.blue, sub }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 4, height: 18, borderRadius: 2, background: accent, boxShadow: `0 0 10px ${accent}` }} />
        <p style={{ ...display("label"), color: V.text, margin: 0 }}>{children}</p>
      </div>
      {sub && <p style={{ ...body("bodySm"), color: V.text3, margin: "6px 0 0 14px" }}>{sub}</p>}
    </div>
  );
}

function NeonBtn({ children, color = V.pink, onClick, flicker = false, full = true, sub }) {
  const [hot, setHot] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHot(true)} onMouseLeave={() => setHot(false)}
      className={flicker ? "v-flicker" : undefined}
      style={{
        width: full ? "100%" : undefined, cursor: "pointer",
        background: hot ? `${color}1f` : `${color}12`,
        borderRadius: 14, padding: sub ? "16px 20px" : "18px 22px",
        ...edgeGlow(color, hot ? 1.5 : 1),
        display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
        transition: "background 160ms, box-shadow 160ms",
      }}
    >
      <span style={{ ...display("h3"), ...textGlow(color, hot ? 1.3 : 1), letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {children}
      </span>
      {sub && <span style={{ ...body("bodySm"), color: V.text2 }}>{sub}</span>}
    </button>
  );
}

function Chip({ children, color = V.blue, solid = false }) {
  return (
    <span style={{
      ...display("chip"), textTransform: "uppercase",
      padding: "5px 11px", borderRadius: 100, whiteSpace: "nowrap",
      color: solid ? V.bg : color,
      background: solid ? color : `${color}18`,
      border: `1px solid ${color}${solid ? "" : "44"}`,
    }}>{children}</span>
  );
}

function Face({ name, size = 40, ring }) {
  const [bad, setBad] = useState(false);
  const c = ring || dColor(name);
  const url = DRIVER_HEADSHOTS[name];
  if (!url || bad) {
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%", flexShrink: 0,
        background: `${c}22`, border: `2px solid ${c}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        ...display("chip"), color: c,
      }}>{lastName(name).slice(0, 3).toUpperCase()}</div>
    );
  }
  return (
    <img src={url} alt={name} onError={() => setBad(true)} style={{
      width: size, height: size, borderRadius: "50%", objectFit: "cover", objectPosition: "top",
      flexShrink: 0, background: V.bg3, border: `2px solid ${c}`, boxShadow: `0 0 12px ${c}55`,
    }} />
  );
}

// A driver line with grid slot, face, name, and a reason. The workhorse row of
// the rooting screen, so it carries the accent color rather than a tiny label.
function DriverRow({ name, accent, badge, why, grid, dim = false }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
      background: dim ? "transparent" : `${accent}0d`,
      border: `1px solid ${dim ? V.border : `${accent}33`}`,
      borderRadius: 14, opacity: dim ? 0.62 : 1,
    }}>
      {grid != null && (
        <div style={{ width: 34, flexShrink: 0, textAlign: "center" }}>
          <p style={{ ...display("h3"), color: dim ? V.text3 : V.text, margin: 0 }}>{grid}</p>
          <Label style={{ fontSize: 13, letterSpacing: "0.06em" }} color={V.text3}>Grid</Label>
        </div>
      )}
      <Face name={name} size={42} ring={dim ? V.text3 : undefined} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <p style={{ ...body("bodyMd"), color: V.text, margin: 0 }}>{name}</p>
          {badge && <Chip color={accent}>{badge}</Chip>}
        </div>
        {why && <p style={{ ...body("bodySm"), color: V.text3, margin: "3px 0 0" }}>{why}</p>}
      </div>
    </div>
  );
}

function StatTile({ label, value, unit, color = V.text, glow = false }) {
  return (
    <div style={{ ...card({ padding: "14px 16px", flex: 1, minWidth: 0 }) }}>
      <Label>{label}</Label>
      <p style={{ ...display("stat"), ...(glow ? textGlow(color) : { color }), margin: "6px 0 0" }}>
        {value}{unit && <span style={{ ...display("h3"), color: V.text3, marginLeft: 4 }}>{unit}</span>}
      </p>
    </div>
  );
}

function Countdown({ to, label }) {
  const ms = new Date(to) - new Date();
  const past = ms <= 0;
  const h = Math.floor(Math.abs(ms) / 3600000);
  const m = Math.floor((Math.abs(ms) % 3600000) / 60000);
  const c = past ? V.pink : V.blue;
  return (
    <div style={{ textAlign: "center" }}>
      <Label color={V.text3}>{past ? "Deadline passed" : label}</Label>
      <p style={{ ...display("hero"), ...textGlow(c), margin: "8px 0 0", fontVariantNumeric: "tabular-nums" }}>
        {h}<span style={{ ...display("h2"), color: V.text3 }}>h </span>{String(m).padStart(2, "0")}<span style={{ ...display("h2"), color: V.text3 }}>m</span>
      </p>
      {past && <p style={{ ...body("bodySm"), color: V.text3, margin: "6px 0 0" }}>ago</p>}
    </div>
  );
}

// ── Race marquee. The one piece of pure Vegas on every state. ──
function Marquee({ race }) {
  return (
    <div style={{
      ...card({ padding: "22px 20px 20px", marginBottom: 18, position: "relative", overflow: "hidden" }),
      background: `radial-gradient(120% 100% at 50% 0%, ${V.pink}14 0%, ${V.bg2} 60%)`,
      borderColor: `${V.pink}33`,
    }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
        <Chip color={V.blue}>Round {race.round} of 22</Chip>
      </div>
      <p style={{
        ...marquee(shortRace(race.name)), ...textGlow(V.pink), textAlign: "center",
        textTransform: "uppercase", margin: 0,
      }}>{shortRace(race.name)}</p>
      <p style={{ ...display("label"), color: V.blue, textAlign: "center", margin: "10px 0 0" }}>Grand Prix</p>
      <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${V.pink}55, transparent)`, margin: "16px 0 12px" }} />
      <p style={{ ...body("body"), color: V.text2, textAlign: "center", margin: 0 }}>
        {race.circuit} · {race.location}
      </p>
    </div>
  );
}

// ── State A: picks not in ────────────────────────────────
function HomeOpen({ onNav }) {
  const { race, track, myTeam, opp, pools } = SNAP;
  // Round 11's real deadline has already passed, so a live clock against it would
  // read "19h ago" in a state that only exists before the deadline. Stand-in
  // target keeps the countdown legible whenever this state is being reviewed.
  const demoDeadline = new Date(Date.now() + 18.7 * 3600e3).toISOString();
  return (
    <>
      <Marquee race={race} />

      <div style={{ ...card({ padding: "20px", marginBottom: 18 }), borderColor: `${V.blue}33` }}>
        <Countdown to={demoDeadline} label="Picks close in" />
      </div>

      <div style={{ marginBottom: 22 }}>
        <NeonBtn color={V.pink} flicker onClick={() => onNav("picks")} sub="22 drivers, 3 from the top pool, 7 from the mid">
          Make your picks
        </NeonBtn>
      </div>

      <SectionHead accent={V.blue} sub={track.headline}>What kind of track is this</SectionHead>
      <div style={{ ...card({ padding: "18px 20px", marginBottom: 22 }) }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <StatTile label="Turns" value={track.turns} />
          <StatTile label="Length" value={track.km} unit="km" />
          <StatTile label="Laps" value={track.laps} />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {track.tags.map(t => <Chip key={t} color={V.purple}>{t}</Chip>)}
        </div>
        <p style={{ ...body("body"), color: V.text2, margin: 0 }}>{track.note}</p>
      </div>

      <SectionHead accent={V.pink} sub={`${myTeam.name} sits ${myTeam.rank}th, they sit ${opp.rank}th. Five points apart.`}>Who you're playing</SectionHead>
      <MatchupCard />

      <SectionHead accent={V.blue} sub="Three from the top pool, seven from the mid pool.">Your driver pools</SectionHead>
      <div style={{ ...card({ padding: "16px 18px", marginBottom: 22 }) }}>
        <Label color={V.gold} style={{ marginBottom: 10 }}>Top pool · pick 3</Label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
          {pools.top.map(d => <Chip key={d} color={dColor(d)}>{d}</Chip>)}
        </div>
        <Label color={V.silver} style={{ marginBottom: 10 }}>Mid pool · pick 7</Label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {pools.mid.map(d => <Chip key={d} color={dColor(d)}>{d}</Chip>)}
        </div>
      </div>

      <SectionHead accent={V.purple}>The Needle</SectionHead>
      <div style={{ ...card({ padding: "18px 20px" }), borderColor: `${V.purple}33` }}>
        <p style={{ ...body("body"), color: V.text2, margin: "0 0 6px" }}>Guess the time of</p>
        <p style={{ ...display("h2"), ...textGlow(V.purple, 0.8), margin: 0 }}>{race.pitQuestion}</p>
      </div>
    </>
  );
}

// ── Shared: the matchup card ─────────────────────────────
function MatchupCard({ compact = false }) {
  const { myTeam, opp, me, teammate } = SNAP;
  const Side = ({ name, rank, pts, record, p1, p2, mine }) => (
    <div style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
      <p style={{ ...display("h3"), color: mine ? V.text : V.text2, margin: 0 }}>{name}</p>
      <p style={{ ...display("stat"), ...(mine ? textGlow(V.blue, 0.7) : { color: V.text3 }), margin: "8px 0 4px" }}>{pts}</p>
      <Label color={V.text3}>{rank}th · {record}</Label>
      {!compact && (
        <div style={{ marginTop: 10 }}>
          <p style={{ ...body("bodySm"), color: mine ? V.blue : V.text3, margin: 0 }}>{p1}</p>
          <p style={{ ...body("bodySm"), color: mine ? V.blue : V.text3, margin: 0 }}>{p2}</p>
        </div>
      )}
    </div>
  );
  return (
    <div style={{ ...card({ padding: "20px 16px", marginBottom: 22 }), borderColor: `${V.blue}2a` }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <Side name={myTeam.name} rank={myTeam.rank} pts={myTeam.champPts} record={myTeam.record} p1={me} p2={teammate} mine />
        <div style={{ flexShrink: 0, alignSelf: "center", padding: "0 4px" }}>
          <p style={{ ...display("label"), ...textGlow(V.pink, 0.8), margin: 0 }}>vs</p>
        </div>
        <Side name={opp.name} rank={opp.rank} pts={opp.champPts} record={opp.record} p1={opp.p1} p2={opp.p2} />
      </div>
    </div>
  );
}

// ── Shared: BOX BOX ──────────────────────────────────────
function BoxBoxCard() {
  const { boxBox, race } = SNAP;
  const over = boxBox.side === "OVER";
  const c = over ? V.gold : V.purple;
  return (
    <div style={{ ...card({ padding: "18px 20px", marginBottom: 22 }), borderColor: `${c}33` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <div>
          <Label color={V.text3}>Your side</Label>
          <p style={{ ...display("h1"), ...textGlow(c), margin: "6px 0 0" }}>{boxBox.side}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <Label color={V.text3}>The line</Label>
          <p style={{ ...display("h1"), color: V.text, margin: "6px 0 0", fontVariantNumeric: "tabular-nums" }}>{boxBox.line}</p>
        </div>
      </div>
      <p style={{ ...body("body"), color: V.text2, margin: 0 }}>
        You need <span style={{ color: V.text, fontWeight: 600 }}>{race.pitQuestion}</span> to come in{" "}
        <span style={{ color: c, fontWeight: 600 }}>above {boxBox.line}s</span>. Worth +5 to the matchup, or −1 if it goes the other way.
      </p>
    </div>
  );
}

// ── State B: locked, pre-race ────────────────────────────
function HomeLocked({ live = false, lapIdx = 0 }) {
  const { race, myPick, grid, standings, laps } = SNAP;
  const lapInfo = live ? laps[lapIdx] : null;
  // Before the race the board runs in grid order; during it, running order.
  const gridOrder = Object.entries(grid).sort((a, b) => a[1] - b[1]).map(([n]) => n);
  const order = live ? lapInfo.order : gridOrder;
  return (
    <>
      <Marquee race={race} />

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <div style={{ ...card({ padding: "14px 16px", flex: 1 }), borderColor: `${V.green}33`, background: `${V.green}0d` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ ...display("h3"), ...textGlow(V.green, 0.8) }}>✓</span>
            <div>
              <p style={{ ...body("bodyMd"), color: V.text, margin: 0 }}>Picks in</p>
              <p style={{ ...body("bodySm"), color: V.text3, margin: 0 }}>All 48 submitted</p>
            </div>
          </div>
        </div>
        <div style={{ ...card({ padding: "14px 16px", flex: 1 }) }}>
          <Label color={V.text3}>Lights out</Label>
          <p style={{ ...display("h3"), color: V.text, margin: "5px 0 0" }}>
            {new Date(race.lightsOut).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </p>
        </div>
      </div>

      <SectionHead accent={live ? V.red : V.green}
        sub={live
          ? "Every driver in running order. Dots near the top mean you are winning."
          : "Every driver in grid order. Dots near the top mean you start ahead."}>
        Who you're rooting for
      </SectionHead>
      <RootingBoard order={order} live={live} lapInfo={lapInfo} />

      <SectionHead accent={V.blue} sub={`For your own points, separate from the matchup. You are P${standings.myRank} of ${standings.of}.`}>
        Your own card
      </SectionHead>
      <div style={{ ...card({ padding: "16px 18px", marginBottom: 22 }) }}>
        <Label color={V.gold} style={{ marginBottom: 12 }}>Top pick · double points</Label>
        <DriverRow name={myPick.topPick} accent={V.gold} badge="2x" grid={grid[myPick.topPick]}
          why={`Starting P${grid[myPick.topPick]}. Best possible start for you.`} />
        <Label color={V.text3} style={{ margin: "18px 0 12px" }}>Then, in your order</Label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {myPick.order.slice(1).map((d, i) => (
            <div key={d} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: V.bg3, borderRadius: 12 }}>
              <p style={{ ...display("h3"), color: V.text3, margin: 0, width: 26 }}>{i + 2}</p>
              <Face name={d} size={34} />
              <p style={{ ...body("bodyMd"), color: V.text, margin: 0, flex: 1 }}>{d}</p>
              <Chip color={V.text3}>Grid {grid[d]}</Chip>
            </div>
          ))}
        </div>
      </div>

      <SectionHead accent={V.gold}>Box Box</SectionHead>
      <BoxBoxCard />

      <SectionHead accent={V.pink}>The matchup</SectionHead>
      <MatchupCard />
    </>
  );
}

// ── The rooting board ────────────────────────────────────
//
// The whole race on one screen. Every driver in running order, two narrow
// columns for the two teams, a dot where that driver moves the matchup. Dots
// bunched near the top means you are winning, and you read that without
// counting anything. Replaces three separate lists that made you hold the
// grid in your head to compare them.
function RootingBoard({ order, live, lapInfo }) {
  const { sides, myTeam, opp } = SNAP;
  const counts = order.reduce((a, n, i) => {
    const s = sides[n];
    if (s === "mine" || s === "theirs") a[s].push(i + 1);
    return a;
  }, { mine: [], theirs: [] });
  const winning = lapInfo ? lapInfo.projMine > lapInfo.projTheirs : null;

  const Dot = ({ kind, color }) => {
    if (kind === "solid") return (
      <span style={{
        width: 13, height: 13, borderRadius: "50%", background: color,
        boxShadow: `0 0 10px ${color}, 0 0 20px ${color}77`, display: "block", margin: "0 auto",
      }} />
    );
    return (
      <span style={{
        width: 11, height: 11, borderRadius: "50%", border: `1.5px solid ${V.text3}`,
        display: "block", margin: "0 auto", opacity: 0.55,
      }} />
    );
  };

  const COL = 52;
  return (
    <div style={{ ...card({ marginBottom: 24, overflow: "hidden" }), borderColor: live ? `${V.red}44` : V.border }}>

      {/* Status + the answer */}
      <div style={{
        padding: "16px 18px",
        background: live
          ? `radial-gradient(120% 100% at 50% 0%, ${V.red}14 0%, ${V.bg2} 60%)`
          : `radial-gradient(120% 100% at 50% 0%, ${V.blue}10 0%, ${V.bg2} 60%)`,
        borderBottom: `1px solid ${V.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
          {live && <span className="v-pulse" style={{ width: 10, height: 10, borderRadius: "50%", background: V.red, boxShadow: `0 0 12px ${V.red}` }} />}
          <Label color={live ? V.red : V.blue}>
            {live ? `Live · lap ${lapInfo.lap} of ${SNAP.totalLaps}` : "Starting grid"}
          </Label>
          <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            {live && <Chip color={V.amber}>Mock</Chip>}
          </span>
        </div>

        {live ? (
          <>
            <Label color={V.text3}>If this holds</Label>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 14, margin: "8px 0 6px" }}>
              <div>
                <p style={{ ...display("hero"), ...(winning ? textGlow(V.green) : { color: V.text2 }), margin: 0 }}>{lapInfo.projMine}</p>
                <Label color={V.text3}>Us</Label>
              </div>
              <p style={{ ...display("h2"), color: V.text3, margin: "0 0 14px" }}>–</p>
              <div>
                <p style={{ ...display("hero"), ...(!winning ? textGlow(V.pink) : { color: V.text2 }), margin: 0 }}>{lapInfo.projTheirs}</p>
                <Label color={V.text3}>Them</Label>
              </div>
              <p style={{
                ...display("h3"), margin: "0 0 16px auto", textAlign: "right",
                color: winning ? V.green : V.pink,
              }}>
                {winning ? `You win by ${lapInfo.projMine - lapInfo.projTheirs}` : `You lose by ${lapInfo.projTheirs - lapInfo.projMine}`}
              </p>
            </div>
            <p style={{ ...body("bodySm"), color: V.text3, margin: "8px 0 0" }}>
              Updated {lapInfo.updatedAgo}s ago · refreshes every 2 minutes ·{" "}
              {lapInfo.alpineStopped ? "Alpine has stopped, Box Box is settled" : "Alpine has not stopped, Box Box still live"}
            </p>
          </>
        ) : (
          <p style={{ ...body("body"), color: V.text2, margin: 0 }}>
            Your three start P{counts.mine.join(", P")}. Theirs start P{counts.theirs.join(", P")}.
          </p>
        )}
      </div>

      {/* Column header */}
      <div style={{ display: "flex", alignItems: "center", padding: "10px 14px 8px", borderBottom: `1px solid ${V.border}`, background: V.bg3 }}>
        <span style={{ width: 30, flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: 0 }}><Label color={V.text3}>Driver</Label></span>
        <span style={{ width: COL, flexShrink: 0, textAlign: "center" }}><Label color={V.green}>Us</Label></span>
        <span style={{ width: COL, flexShrink: 0, textAlign: "center" }}><Label color={V.pink}>Them</Label></span>
      </div>

      {/* 22 rows */}
      {order.map((name, i) => {
        const side = sides[name];
        const lit = side === "mine" || side === "theirs";
        const accent = side === "mine" ? V.green : side === "theirs" ? V.pink : null;
        return (
          <div key={name} style={{
            display: "flex", alignItems: "center", padding: "9px 14px",
            borderBottom: i === order.length - 1 ? "none" : `1px solid ${V.border}`,
            background: lit ? `${accent}0f` : "transparent",
            borderLeft: `3px solid ${lit ? accent : "transparent"}`,
          }}>
            <span style={{ width: 30, flexShrink: 0 }}>
              <p style={{ ...display("h3"), color: lit ? V.text : V.text3, margin: 0, fontVariantNumeric: "tabular-nums" }}>{i + 1}</p>
            </span>
            <span style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 3, height: 22, borderRadius: 2, background: dColor(name), flexShrink: 0, opacity: lit ? 1 : 0.5 }} />
              <p style={{
                ...body(lit ? "bodyMd" : "bodySm"),
                color: lit ? V.text : V.text3, margin: 0,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{name}</p>
            </span>
            <span style={{ width: COL, flexShrink: 0 }}>
              {side === "mine" && <Dot kind="solid" color={V.green} />}
              {side === "both" && <Dot kind="ring" />}
            </span>
            <span style={{ width: COL, flexShrink: 0 }}>
              {side === "theirs" && <Dot kind="solid" color={V.pink} />}
              {side === "both" && <Dot kind="ring" />}
            </span>
          </div>
        );
      })}

      {/* Legend */}
      <div style={{ padding: "14px 16px", background: V.bg3, borderTop: `1px solid ${V.border}` }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            [<Dot key="a" kind="solid" color={V.green} />, `Only ${myTeam.name} gains. Root for him.`],
            [<Dot key="b" kind="solid" color={V.pink} />, `Only ${opp.name} gains. Root against him.`],
            [<Dot key="c" kind="ring" />, "Both teams picked him. Cancels out either way."],
          ].map(([dot, text], i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 20, flexShrink: 0 }}>{dot}</span>
              <p style={{ ...body("bodySm"), color: V.text3, margin: 0 }}>{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── The neon kit ─────────────────────────────────────────
function NeonKit() {
  return (
    <>
      <SectionHead accent={V.blue} sub="Floor is 13px, labels sit at 15. The old app had 224 instances at 10px or smaller and 13 at 7px.">Type scale</SectionHead>
      <div style={{ ...card({ padding: "20px", marginBottom: 24 }) }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, padding: "6px 0 14px", borderBottom: `1px solid ${V.border}` }}>
          <div style={{ width: 92, flexShrink: 0 }}>
            <p style={{ ...display("chip"), color: V.pink, margin: 0 }}>marquee</p>
            <p style={{ ...body("bodySm"), color: V.text3, margin: 0 }}>Monoton</p>
          </div>
          <p style={{ ...marquee("Hungarian"), ...textGlow(V.pink, 0.8), color: V.text, margin: 0 }}>HUNGARIAN</p>
        </div>
        {[
          ["hero", "62", "18h 42m"],
          ["h1", "42", "Hungarian"],
          ["h2", "30", "If lap 30 holds"],
          ["h3", "23", "Cal Aggie Racing"],
          ["stat", "36", "446"],
          ["label", "15", "Your side"],
          ["chip", "15", "Over 2.48"],
          ["body", "15 · DM Sans", "Only one real overtaking spot."],
          ["bodyMd", "15 · DM Sans", "Lewis Hamilton"],
          ["bodySm", "14 · DM Sans", "Both teams have two."],
        ].map(([k, meta, sample]) => {
          const isBody = k.startsWith("body");
          return (
            <div key={k} style={{ display: "flex", alignItems: "baseline", gap: 14, padding: "10px 0", borderBottom: `1px solid ${V.border}` }}>
              <div style={{ width: 92, flexShrink: 0 }}>
                <p style={{ ...display("chip"), color: isBody ? V.text2 : V.blue, margin: 0 }}>{k}</p>
                <p style={{ ...body("bodySm"), color: V.text3, margin: 0 }}>{meta}</p>
              </div>
              <p style={{ ...(isBody ? body(k) : display(k)), color: V.text, margin: 0, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{sample}</p>
            </div>
          );
        })}
      </div>

      <SectionHead accent={V.pink} sub="Flicker is on one element per screen, and dies under prefers-reduced-motion.">Buttons</SectionHead>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
        <NeonBtn color={V.pink} flicker sub="The primary. This one flickers.">Make your picks</NeonBtn>
        <NeonBtn color={V.blue}>See the standings</NeonBtn>
        <NeonBtn color={V.green}>Confirm</NeonBtn>
      </div>

      <SectionHead accent={V.purple}>Palette</SectionHead>
      <div style={{ ...card({ padding: "18px 20px", marginBottom: 24 }) }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {[["blue", V.blue], ["pink", V.pink], ["purple", V.purple], ["green", V.green], ["red", V.red], ["gold", V.gold], ["silver", V.silver]].map(([n, c]) => (
            <div key={n} style={{ textAlign: "center" }}>
              <div style={{ width: 58, height: 58, borderRadius: 14, background: c, boxShadow: `0 0 18px ${c}88` }} />
              <p style={{ ...body("bodySm"), color: V.text2, margin: "6px 0 0" }}>{n}</p>
            </div>
          ))}
        </div>
        <div style={{ height: 1, background: V.border, margin: "18px 0" }} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Chip color={V.blue}>Chip</Chip>
          <Chip color={V.pink}>Chip</Chip>
          <Chip color={V.green} solid>Solid</Chip>
          <Chip color={V.gold}>Championship</Chip>
          <Chip color={V.text3}>Muted</Chip>
        </div>
      </div>

      <SectionHead accent={V.green} sub="Team colors come from the existing F1_TEAM_COLORS, so drivers stay recognizable.">Driver rows</SectionHead>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        <DriverRow name="Lewis Hamilton" accent={V.green} badge="+1" grid={2} why="Your top pick. They only have one of him." />
        <DriverRow name="George Russell" accent={V.pink} grid={7} why="Brett's top pick. Pure downside for you." />
        <DriverRow name="Max Verstappen" accent={V.text3} grid={6} why="Both teams have two. Cancels out." dim />
      </div>

      <SectionHead accent={V.blue}>Stat tiles</SectionHead>
      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        <StatTile label="Your rank" value="P6" color={V.blue} glow />
        <StatTile label="Points" value={446} />
        <StatTile label="The line" value={2.48} color={V.gold} />
      </div>

      <SectionHead accent={V.pink}>A cleaner standings row</SectionHead>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
        {[[1, "Joe McGlynn", 478, false], [5, "Sam Bottoms", 451, false], [6, "Andrew Ishak", 446, true], [7, "Stacy Michaelsen", 438, false]].map(([r, n, p, mine]) => (
          <div key={n} style={{
            display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 14,
            background: mine ? `${V.blue}12` : V.bg2,
            border: `1px solid ${mine ? V.blue : V.border}`,
            boxShadow: mine ? `0 0 16px ${V.blue}33` : "none",
          }}>
            <p style={{ ...display("h2"), color: r === 1 ? V.gold : mine ? V.blue : V.text3, margin: 0, width: 34 }}>{r}</p>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ ...body("bodyMd"), color: V.text, margin: 0 }}>{n}{mine ? " (you)" : ""}</p>
              <p style={{ ...body("bodySm"), color: V.text3, margin: 0 }}>{mine ? "Cal Aggie Racing" : ""}</p>
            </div>
            <p style={{ ...display("h2"), ...(mine ? textGlow(V.blue, 0.7) : { color: V.text }), margin: 0, fontVariantNumeric: "tabular-nums" }}>{p}</p>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Shell ────────────────────────────────────────────────
export default function VegasHome({ onNavigate }) {
  const [tab, setTab] = useState("home");
  const [state, setState] = useState("live");
  const [lapIdx, setLapIdx] = useState(0);
  const nav = onNavigate || (() => {});

  const Toggle = ({ opts, val, set }) => (
    <div style={{ display: "flex", gap: 6, background: V.bg3, padding: 5, borderRadius: 12 }}>
      {opts.map(o => (
        <button key={o.id} onClick={() => set(o.id)} style={{
          flex: 1, padding: "9px 12px", borderRadius: 9, cursor: "pointer", border: "none",
          background: val === o.id ? V.blue : "transparent",
          ...display("chip"), textTransform: "uppercase",
          color: val === o.id ? V.bg : V.text2,
          boxShadow: val === o.id ? `0 0 14px ${V.blue}66` : "none",
        }}>{o.label}</button>
      ))}
    </div>
  );

  return (
    <div style={{ background: V.bg, minHeight: "100vh" }}>
      <style>{VEGAS_CSS}</style>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "18px 18px 60px" }}>

        {/* Mockup controls. Not part of the design. */}
        <div style={{ border: `1px dashed ${V.border2}`, borderRadius: 14, padding: 12, marginBottom: 20 }}>
          <Label color={V.text3} style={{ marginBottom: 10 }}>Mockup controls</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Toggle val={tab} set={setTab} opts={[{ id: "home", label: "Home" }, { id: "kit", label: "Neon kit" }]} />
            {tab === "home" && (
              <Toggle val={state} set={setState} opts={[
                { id: "open", label: "No picks" },
                { id: "locked", label: "Locked" },
                { id: "live", label: "Race live" },
              ]} />
            )}
            {tab === "home" && state === "live" && (
              <Toggle val={lapIdx} set={setLapIdx} opts={[
                { id: 0, label: "Lap 30 · winning" },
                { id: 1, label: "Lap 52 · losing" },
              ]} />
            )}
          </div>
          <button onClick={() => nav("home")} style={{
            marginTop: 10, width: "100%", padding: "9px", borderRadius: 9, cursor: "pointer",
            background: "transparent", border: `1px solid ${V.border2}`, ...display("chip"), color: V.text3,
          }}>Back to the real app</button>
        </div>

        {tab === "kit" ? <NeonKit /> : (
          state === "open" ? <HomeOpen onNav={nav} /> : <HomeLocked live={state === "live"} lapIdx={lapIdx} />
        )}
      </div>
    </div>
  );
}
