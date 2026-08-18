// Vegas second-half mockup: the neon kit plus the new state-driven Home.
//
// Data is a hardcoded snapshot of the real league at round 11 (Hungary), pulled
// 2026-07-25. Real teams, real players, real picks, real qualifying grid. The
// only invented numbers are in the live-projection panel, because the race has
// not run yet; that panel is marked MOCK in the UI so nobody reads it as real.
//
// Nothing here touches Supabase. It is a design surface, reachable at #vegas.

import { useState } from "react";
import { V, display, body, label as labelType, marquee, textGlow, edgeGlow, card, VEGAS_CSS } from "./theme.vegas";
import { DRIVER_HEADSHOTS, TEAM_BY_NAME } from "./drivers";
import { F1_TEAM_COLORS } from "./theme";

// ── Real league snapshot, round 11 ───────────────────────
const PLAYER_PHOTOS = {
  "Andrew Ishak": "https://fhtwjpohfomnhxjefjwq.supabase.co/storage/v1/object/public/player-photos/74e68847-70fe-4eaf-9075-f4cfaa642cdd.png?t=1772682494867",
  "Kevin Coolidge": "https://fhtwjpohfomnhxjefjwq.supabase.co/storage/v1/object/public/player-photos/719da11a-6cd8-42f4-aba5-a3bd95742a1a.png?t=1772503404813",
  "Brett Dillon": "https://fhtwjpohfomnhxjefjwq.supabase.co/storage/v1/object/public/player-photos/d9e8e2f9-ddb4-4aca-a67e-43264d19751c.png?t=1772428753985",
  "Stacy Michaelsen": "https://fhtwjpohfomnhxjefjwq.supabase.co/storage/v1/object/public/player-photos/0f599d2b-a7e8-4407-8a48-7bb08e1bd446.png?t=1772503349191",
};

const SNAP = {
  me: "Andrew Ishak",
  myTeam: { name: "Cal Aggie Racing", division: "second", rank: 4, champPts: 108, record: "6-5", avg: 79.1, avgRank: 5 },
  teammate: "Kevin Coolidge",
  // avgRank is out of all 24 teams. divRank is null until the second half has
  // rounds on the board; once it does, that becomes the big number instead.
  opp: {
    name: "Peloton Aubergine", rank: 5, champPts: 99, record: "5-6",
    avg: 76.3, avgRank: 11, divRank: null,
    players: [
      { name: "Brett Dillon", ppr: 33.5, rank: 40 },
      { name: "Stacy Michaelsen", ppr: 42.5, rank: 5 },
    ],
    p1: "Brett Dillon", p2: "Stacy Michaelsen",
  },
  race: {
    round: 11, name: "Hungarian Grand Prix", circuit: "Hungaroring", location: "Budapest",
    date: "2026-07-26", lightsOut: "2026-07-26T13:00:00Z", deadline: "2026-07-25T00:00:00Z",
    pitQuestion: "Alpine's first pit stop",
  },
  // Hungaroring character. This is the "what kind of track is this" answer.
  track: {
    headline: "This track is tight, twisty, and nearly impossible to pass on.",
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
  // team is the F1 constructor whose stop settles it, from race.pitQuestion.
  boxBox: { side: "OVER", line: 2.48, team: "Alpine", guesses: { "Andrew Ishak": 1.5, "Kevin Coolidge": 1.5, "Brett Dillon": 3.5, "Stacy Michaelsen": 3.4 } },
  picksIn: { me: true, teammate: true },
  // Real qualifying result, session_key 11338.
  grid: {
    "Lando Norris": 1, "Lewis Hamilton": 2, "Charles Leclerc": 3, "Andrea Kimi Antonelli": 4,
    "Oscar Piastri": 5, "Max Verstappen": 6, "George Russell": 7, "Isack Hadjar": 8,
    "Arvid Lindblad": 9, "Nico Hulkenberg": 10, "Liam Lawson": 11, "Pierre Gasly": 12,
    "Franco Colapinto": 13, "Gabriel Bortoleto": 14, "Esteban Ocon": 15, "Fernando Alonso": 16,
    "Oliver Bearman": 17, "Carlos Sainz": 18, "Alex Albon": 19, "Lance Stroll": 20,
    "Valtteri Bottas": 21, "Sergio Perez": 22,
  },
  // How many of the team's two cards each driver appears on. Straight from the
  // real round-11 picks: Andrew and Kevin submitted identical fives, Stacy
  // matched them exactly, and Brett is the only one off-script, which is why the
  // edges land where they do. Everything the board shows is derived from this.
  counts: {
    mine: {
      "Lewis Hamilton": 2, "Max Verstappen": 2, "Isack Hadjar": 2,
      "Liam Lawson": 2, "Arvid Lindblad": 2,
    },
    theirs: {
      "George Russell": 1, "Lewis Hamilton": 1, "Max Verstappen": 2, "Isack Hadjar": 2,
      "Franco Colapinto": 1, "Oliver Bearman": 1, "Liam Lawson": 1, "Arvid Lindblad": 1,
    },
  },
  // INVENTED running orders. The race has not run, so both are marked MOCK.
  // Two laps so the board can be seen changing and the projection seen flipping.
  laps: [
    {
      lap: 30, alpineStopped: false, updatedAgo: 40,
      order: ["Lando Norris", "Lewis Hamilton", "Charles Leclerc", "Max Verstappen", "Oscar Piastri",
        "Andrea Kimi Antonelli", "Isack Hadjar", "George Russell", "Arvid Lindblad", "Liam Lawson",
        "Nico Hulkenberg", "Pierre Gasly", "Franco Colapinto", "Gabriel Bortoleto", "Esteban Ocon",
        "Fernando Alonso", "Oliver Bearman", "Carlos Sainz", "Alex Albon", "Lance Stroll",
        "Valtteri Bottas", "Sergio Perez"],
    },
    {
      lap: 52, alpineStopped: true, updatedAgo: 75,
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

// F5 driver scoring, same table as Admin.jsx:9. P11 and back score nothing, and
// a DNF is −1. The top pick is NOT doubled: Admin.jsx adds top_pick_pts once and
// Rules.jsx:98 says straight F1 points.
const F1_PTS = { 1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1 };
const ptsForPos = (pos) => (pos === -1 ? -1 : F1_PTS[pos] || 0);

// This week's ten. The pool is three top and seven midfield; you pick one and
// four of them. Nobody else
// on the grid can score for anyone in F5 this round. That split drives row
// height: the ten get a full row, the other twelve stay as thin context so you
// can still find a driver by position without them competing for attention.
const POOL = new Set([...SNAP.pools.top, ...SNAP.pools.mid]);

// One pass over the running order produces everything the board needs: each
// driver's side, what he is worth to each team, and both team totals. Deriving
// it means the column numbers and the total can never disagree.
function readBoard(order) {
  const { counts } = SNAP;
  let totalMine = 0, totalTheirs = 0;
  const rows = order.map((name, i) => {
    const pos = i + 1;
    const pts = ptsForPos(pos);
    const cMine = counts.mine[name] || 0;
    const cTheirs = counts.theirs[name] || 0;
    const valMine = cMine * pts;
    const valTheirs = cTheirs * pts;
    totalMine += valMine;
    totalTheirs += valTheirs;
    const side = cMine > cTheirs ? "mine" : cTheirs > cMine ? "theirs" : cMine > 0 ? "both" : null;
    return { name, pos, pts, cMine, cTheirs, valMine, valTheirs, side, inPool: POOL.has(name) };
  });
  return { rows, totalMine, totalTheirs };
}

const dColor = (name) => F1_TEAM_COLORS[TEAM_BY_NAME[name]] || V.text3;
const dTeam = (name) => TEAM_BY_NAME[name] || "";
const lastName = (n) => (n || "").split(" ").slice(-1)[0];
// First three of the surname matches the real F1 acronym for every driver on the
// 2026 grid, so no lookup table is needed here.
const code3 = (n) => lastName(n).slice(0, 3).toUpperCase();
// The marquee says the place, not the words "Grand Prix", which sit under it.
const shortRace = (n) => (n || "").replace(/\s*Grand Prix\s*/i, "").trim();

// ── Primitives ───────────────────────────────────────────

function Label({ children, color = V.text3, style }) {
  return <p style={{ ...labelType(), color, margin: 0, ...style }}>{children}</p>;
}

function SectionHead({ children, accent = V.blue, sub }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 4, height: 18, borderRadius: 2, background: accent, boxShadow: `0 0 10px ${accent}` }} />
        <p style={{ ...labelType(), color: V.text, margin: 0 }}>{children}</p>
      </div>
      {sub && <p style={{ ...body("bodySm"), color: V.text3, margin: "6px 0 0 14px" }}>{sub}</p>}
    </div>
  );
}

// Color carries meaning, so it defaults rather than being passed every time:
// blue is normal, green is good to go, pink is needs attention or a problem.
function NeonBtn({ children, color = V.blue, onClick, flicker = false, full = true, sub }) {
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

function Face({ name, size = 40, ring, glow = 1, drained = false }) {
  const [bad, setBad] = useState(false);
  const c = ring || dColor(name);
  const url = DRIVER_HEADSHOTS[name] || PLAYER_PHOTOS[name];
  if (!url || bad) {
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%", flexShrink: 0,
        background: `${c}22`, border: `2px solid ${c}`,
        boxShadow: glow ? `0 0 ${12 * glow}px ${c}66` : "none",
        display: "flex", alignItems: "center", justifyContent: "center",
        ...display("chip"), color: c,
      }}>{PLAYER_PHOTOS[name] !== undefined || !DRIVER_HEADSHOTS[name]
        ? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
        : lastName(name).slice(0, 3).toUpperCase()}</div>
    );
  }
  return (
    <img src={url} alt={name} onError={() => setBad(true)} style={{
      width: size, height: size, borderRadius: "50%", objectFit: "cover", objectPosition: "top",
      flexShrink: 0, background: V.bg3, border: `2px solid ${c}`,
      boxShadow: glow ? `0 0 ${12 * glow}px ${c}${glow > 1 ? "aa" : "55"}` : "none",
      // Draining the color is what makes a driver you are rooting against read as
      // bad rather than merely as theirs. Faces are the loudest thing in the row.
      filter: drained ? "grayscale(0.85) brightness(0.8)" : "none",
    }} />
  );
}

// The verdict as a thumb. Drawn rather than an emoji so it takes the accent
// color and glows with the rest of the board, and so it costs 20px of row
// instead of the 85px a worded chip was eating out of the name column.
function Thumb({ down = false, color, size = 21 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"
      style={{
        flexShrink: 0, transform: down ? "rotate(180deg)" : "none",
        filter: `drop-shadow(0 0 5px ${color}) drop-shadow(0 0 12px ${color}88)`,
      }}>
      <path d="M8 21.2V9.9l4.9-6.6a1.7 1.7 0 0 1 2.9 1.5L14.8 9.6h4.3a2 2 0 0 1 1.95 2.5l-1.7 7.05a2.3 2.3 0 0 1-2.25 1.75H8Z"
        fill={`${color}30`} stroke={color} strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M8 9.9H5.2A1.6 1.6 0 0 0 3.6 11.5v8.1a1.6 1.6 0 0 0 1.6 1.6H8"
        fill={`${color}30`} stroke={color} strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
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

// F5 team mark. Same hashed-hue initials the light app uses in Schedule.jsx, so
// a team looks like itself here without needing logo_url in the snapshot.
function TeamBadge({ name, size = 28, ring }) {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = (name || "").charCodeAt(i) + ((h << 5) - h);
  const hue = Math.abs(h) % 360;
  const initials = (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.3, margin: "0 auto",
      background: `hsl(${hue}, 45%, 42%)`,
      border: `1.5px solid ${ring || V.border2}`,
      boxShadow: ring ? `0 0 9px ${ring}66` : "none",
      display: "flex", alignItems: "center", justifyContent: "center",
      ...display("chip"), fontSize: 13, color: "#fff",
    }}>{initials}</div>
  );
}

// A player, ringed green with a check once their picks are in. Sits in the
// marquee so "am I done" is answered by the same box that names the race.
function PlayerBadge({ name, picked, size = 38 }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const c = picked ? V.green : V.text3;
  const photo = PLAYER_PHOTOS[name];
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: "50%", overflow: "hidden",
        background: photo ? `center/cover url(${photo})` : picked ? `${V.green}1a` : V.bg3,
        border: `2px solid ${c}`,
        boxShadow: picked ? `0 0 12px ${V.green}77` : "none",
        display: "flex", alignItems: "center", justifyContent: "center",
        ...display("chip"), color: c,
        // A photo that has not loaded should still show the ring, so the badge
        // never reads as an empty hole.
        filter: picked ? "none" : "grayscale(0.7) brightness(0.75)",
      }}>{photo ? "" : initials}</div>
      {picked && (
        <span style={{
          position: "absolute", right: -3, bottom: -3,
          width: 17, height: 17, borderRadius: "50%",
          background: V.green, border: `2px solid ${V.bg2}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 900, color: V.bg, lineHeight: 1,
        }}>✓</span>
      )}
    </div>
  );
}

// ── Race marquee. The one piece of pure Vegas on every state. ──
// Carries the round, the race, who has picked, and what the event is doing right
// now. The circuit name used to sit at the bottom; event status is what people
// actually open the app for.
function Marquee({ race, status, players = [] }) {
  const inCount = players.filter(p => p.picked).length;
  const allIn = players.length > 0 && inCount === players.length;
  return (
    <div style={{
      ...card({ padding: "18px 20px 20px", marginBottom: 18, position: "relative", overflow: "hidden" }),
      background: `radial-gradient(120% 100% at 50% 0%, ${V.blue}14 0%, ${V.bg2} 60%)`,
      borderColor: `${V.blue}33`,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
        <div style={{ paddingTop: 4 }}>
          <Chip color={V.blue}>Round {race.round} of 23</Chip>
        </div>
        {players.length > 0 && (
          <div style={{ marginLeft: "auto", textAlign: "right", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              {players.map(p => (
                <div key={p.name} style={{ textAlign: "center" }}>
                  <PlayerBadge name={p.name} picked={p.picked} />
                  <p style={{ ...display("chip"), fontSize: 13, color: p.picked ? V.green : V.text3, margin: "5px 0 0" }}>
                    {p.name.split(" ")[0]}
                  </p>
                </div>
              ))}
            </div>
            {allIn && (
              <p style={{ ...labelType(), color: V.green, margin: "6px 0 0" }}>Picks in</p>
            )}
          </div>
        )}
      </div>

      <p style={{
        ...marquee(shortRace(race.name)), ...textGlow(V.blue), textAlign: "center",
        textTransform: "uppercase", margin: "6px 0 0",
      }}>{shortRace(race.name)}</p>
      <p style={{ ...labelType(), color: V.text2, textAlign: "center", margin: "10px 0 0" }}>Grand Prix</p>
      <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${V.blue}55, transparent)`, margin: "16px 0 12px" }} />
      <p style={{ ...display("h3"), color: status.color, textAlign: "center", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {status.text}
      </p>
    </div>
  );
}

// One place to decide what the event is doing, so a red flag or a delay only has
// to be added here.
function eventStatus({ settled, live, lapInfo, race, closesAt }) {
  if (settled) return { text: "Race over", color: V.text2 };
  if (live) return { text: `Live · Lap ${lapInfo.lap} of ${SNAP.totalLaps}`, color: V.pink };
  if (closesAt) {
    const ms = new Date(closesAt) - Date.now();
    if (ms > 0) {
      const h = Math.floor(ms / 3600e3), m = Math.floor((ms % 3600e3) / 60e3);
      return { text: `Picks close in ${h}h ${m}m`, color: V.blue };
    }
  }
  const t = new Date(race.lightsOut).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return { text: `Lights out ${t}`, color: V.blue };
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
      <Marquee
        race={race}
        status={eventStatus({ settled: false, live: false, lapInfo: null, race, closesAt: demoDeadline })}
        players={[
          { name: SNAP.me, picked: false },
          { name: SNAP.teammate, picked: false },
        ]}
      />

      <div style={{ marginBottom: 22 }}>
        <NeonBtn flicker onClick={() => onNav("picks")}>
          Make your picks
        </NeonBtn>
      </div>

      <DriverPoolCard />

      <SectionHead accent={V.purple}>The Needle</SectionHead>
      <div style={{ ...card({ padding: "18px 20px", marginBottom: 22 }), borderColor: `${V.purple}33` }}>
        <p style={{ ...body("body"), color: V.text2, margin: "0 0 6px" }}>Guess the time of</p>
        <p style={{ ...display("h2"), ...textGlow(V.purple, 0.8), margin: 0 }}>{race.pitQuestion}</p>
      </div>

      <SectionHead accent={V.pink}>This week's opponent</SectionHead>
      <OpponentCard />

      <SectionHead accent={V.blue}>{race.circuit} intel</SectionHead>
      <div style={{ ...card({ padding: "18px 20px", marginBottom: 22 }) }}>
        <p style={{ ...body("body"), color: V.text, margin: "0 0 14px" }}>{track.headline}</p>
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
    </>
  );
}

// ── This week's driver pool ──────────────────────────────

function DriverCard({ name }) {
  const c = dColor(name);
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
      padding: "12px 6px", borderRadius: 12, background: V.bg3,
      border: `1px solid ${c}44`, minWidth: 0,
    }}>
      <Face name={name} size={48} ring={c} glow={0.7} />
      <div style={{ textAlign: "center", minWidth: 0, width: "100%" }}>
        <p style={{ ...body("bodyMd"), fontSize: 15, color: V.text, margin: 0, lineHeight: 1.2 }}>
          {lastName(name)}
        </p>
        <p style={{ ...body("bodySm"), fontSize: 13, color: c, margin: "2px 0 0",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{dTeam(name)}</p>
      </div>
    </div>
  );
}

// You pick ONE of the three top drivers and FOUR of the seven midfielders. The
// pool sizes and the pick counts are different numbers and this said the pool
// sizes for a while.
function DriverPoolCard() {
  const { pools } = SNAP;
  const Group = ({ title, pick, accent, names }) => (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
        <p style={{ ...body("bodyMd"), fontSize: 17, color: V.text, margin: 0 }}>{title}</p>
        <p style={{ ...body("bodySm"), color: accent, margin: 0 }}>pick {pick}</p>
      </div>
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(92px, 1fr))",
        gap: 8, marginBottom: 22,
      }}>
        {names.map(d => <DriverCard key={d} name={d} />)}
      </div>
    </>
  );
  return (
    <div style={{ ...card({ padding: "20px 18px", marginBottom: 22 }) }}>
      <p style={{ ...body("bodyMd"), fontSize: 21, color: V.text, margin: "0 0 18px" }}>
        This week's driver pool
      </p>
      <Group title="Top drivers" pick={1} accent={V.gold} names={pools.top} />
      <Group title="Midfield drivers" pick={4} accent={V.silver} names={pools.mid} />
    </div>
  );
}

// ── This week's opponent ─────────────────────────────────

// The big number is the opponent's scoring-average rank out of all 24 teams
// while the second half has no rounds on the board. Once it does, divRank takes
// over and the label under it changes to match.
function OpponentCard() {
  const { opp } = SNAP;
  const usingDiv = opp.divRank != null;
  const big = usingDiv ? opp.divRank : opp.avgRank;
  const bigLabel = usingDiv ? "Division rank" : "Scoring average rank";
  return (
    <div style={{ ...card({ padding: "20px 18px", marginBottom: 22 }), borderColor: `${V.pink}2a` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
        <TeamBadge name={opp.name} size={44} ring={V.pink} />
        <p style={{ ...display("h2"), color: V.text, margin: 0 }}>{opp.name}</p>
      </div>

      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <p style={{ ...display("stat"), ...textGlow(V.pink, 0.85), margin: 0, fontSize: 66, lineHeight: 1 }}>
          {ordinal(big)}
        </p>
        <Label color={V.text2} style={{ marginTop: 6 }}>{bigLabel}</Label>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        <StatTile label="Championship points" value={opp.champPts} />
        <StatTile label="Record" value={opp.record} />
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        {opp.players.map(pl => (
          <div key={pl.name} style={{
            flex: 1, minWidth: 0, textAlign: "center", padding: "12px 8px",
            borderRadius: 12, background: V.bg3, border: `1px solid ${V.border}`,
          }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
              <Face name={pl.name} size={44} />
            </div>
            <p style={{ ...body("bodySm"), color: V.text, margin: "0 0 4px",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pl.name}</p>
            <p style={{ ...display("h3"), ...textGlow(V.pink, 0.5), margin: 0 }}>{ordinal(pl.rank)}</p>
            <Label color={V.text3} style={{ marginTop: 2 }}>Scoring average</Label>
          </div>
        ))}
      </div>
    </div>
  );
}

const ordinal = (n) => n + (["th", "st", "nd", "rd"][(n % 100 - 20) % 10] || ["th", "st", "nd", "rd"][n % 100] || "th");

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
          <p style={{ ...labelType(), color: V.text3, margin: 0 }}>vs</p>
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
        {race.pitQuestion} · <span style={{ color: c, fontWeight: 600 }}>{over ? "above" : "below"} {boxBox.line}s</span> · +5 or −1
      </p>
    </div>
  );
}

// ── States B, C and D: locked pre-race, race live, race final ────
function HomeLocked({ live = false, settled = false, lapIdx = 0 }) {
  const { race, myPick, grid, standings, laps } = SNAP;
  const lapInfo = live ? laps[lapIdx] : null;
  // Grid order before the race, running order during it, finishing order after.
  // The two lap snapshots double as the two possible results, so the settled
  // state needs no separate invented order.
  const gridOrder = Object.entries(grid).sort((a, b) => a[1] - b[1]).map(([n]) => n);
  const order = live || settled ? laps[lapIdx].order : gridOrder;
  return (
    <>
      <Marquee
        race={race}
        status={eventStatus({ settled, live, lapInfo, race })}
        players={[
          { name: SNAP.me, picked: SNAP.picksIn.me },
          { name: SNAP.teammate, picked: SNAP.picksIn.teammate },
        ]}
      />

      <RootingBoard order={order} live={live} lapInfo={lapInfo} settled={settled} />

      <SectionHead accent={V.blue} sub={`Your points, not the matchup · P${standings.myRank} of ${standings.of}`}>
        Your own card
      </SectionHead>
      <div style={{ ...card({ padding: "16px 18px", marginBottom: 22 }) }}>
        <Label color={V.gold} style={{ marginBottom: 12 }}>Top pick · from the top pool</Label>
        <DriverRow name={myPick.topPick} accent={V.gold} grid={grid[myPick.topPick]}
          why={`Grid ${grid[myPick.topPick]} · ${F1_PTS[grid[myPick.topPick]]} pts`} />
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

      <SectionHead accent={V.blue}>The matchup</SectionHead>
      <MatchupCard />
    </>
  );
}

// ── The rooting board ────────────────────────────────────
//
// The whole race on one screen. Every driver in running order, two narrow
// columns for the two teams, and in each column what that driver is currently
// worth to that team. Values bunched near the top of the US column means you
// are winning, and you read that without counting. The number matters as much
// as the mark: a driver you are rooting against in P13 is worth zero, which a
// plain dot cannot tell you.
// `settled` means the race is over and the real numbers are in. Only then does
// the board commit to a verdict in color. While a race is running nothing is
// decided, so both sides keep their neutral ownership colors and the language
// stays provisional: ahead and behind, not won and lost.
function RootingBoard({ order, live, lapInfo, settled = false }) {
  const { myTeam, opp, boxBox } = SNAP;
  const boxSide = boxBox.side;
  // Before lights out nothing has pitted; during the race the snapshot says.
  const pitted = settled ? true : live ? lapInfo.alpineStopped : false;
  const { rows, totalMine, totalTheirs } = readBoard(order);
  const winning = totalMine > totalTheirs;
  const margin = Math.abs(totalMine - totalTheirs);

  // A value cell reads as a lit dot at a glance and as a number on inspection.
  // The ring count is the pick count: one ring means one teammate has him, two
  // concentric rings mean both do and he scores twice. Two real nested elements
  // rather than stacked box-shadows, so the gap shows the row's own background
  // instead of an approximation of it. "both" keeps the number but drops the
  // glow, since a driver on both cards moves nothing.
  const Val = ({ v, count, color, muted }) => {
    if (v == null) return null;
    const ring = muted ? V.border2 : color;
    const inner = (
      <span style={{
        minWidth: 30, height: 30, borderRadius: "50%", padding: "0 5px",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: muted ? "transparent" : `${color}1f`,
        border: `1.5px solid ${ring}`,
        boxShadow: muted ? "none" : `0 0 9px ${color}88`,
        ...display("chip"),
        color: muted ? V.text3 : color,
      }}>{v}</span>
    );
    if (count < 2) return inner;
    return (
      <span style={{
        display: "inline-flex", borderRadius: "50%", padding: 2.5,
        border: `1.5px solid ${ring}`,
        boxShadow: muted ? "none" : `0 0 13px ${color}55`,
      }}>{inner}</span>
    );
  };

  // Wide enough for a team name to sit over each column in the header without
  // truncating. The header blocks and the table columns share this width so the
  // totals line up over the values that produce them.
  const COL = 76;
  const ROW_IN = 56;   // one of this week's ten
  const ROW_OUT = 30;  // not in a pool this week, context only

  // Once settled, our side answers won or lost by color alone: green up, grey
  // down. Theirs lights up only if they actually beat us. Before that, blue and
  // pink just mean us and them.
  //
  // Kept separate from the row-level thumbs, which say who to root for and never
  // change. So a lost board shows green thumbs on grey numbers: still your
  // drivers, still did not work.
  const level = margin === 0;
  const usColor = !settled ? V.blue : level ? V.blue : winning ? V.green : V.text3;
  const themColor = !settled ? V.pink : level ? V.pink : winning ? V.pinkDim : V.pink;
  const themLit = settled && !winning && !level;

  return (
    <div style={{
      ...card({ marginBottom: 24, overflow: "hidden" }),
      borderColor: settled
        ? (level ? V.border : winning ? `${V.green}44` : `${V.pink}44`)
        : live ? `${V.pink}3a` : V.border,
    }}>

      {/* Status and the answer */}
      <div style={{
        padding: "16px 18px",
        background: `radial-gradient(130% 100% at 50% 0%, ${(settled ? usColor : live ? V.pink : V.blue)}12 0%, ${V.bg2} 62%)`,
        borderBottom: `1px solid ${V.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
          {live && <span className="v-pulse" style={{ width: 10, height: 10, borderRadius: "50%", background: V.pink, boxShadow: `0 0 12px ${V.pink}` }} />}
          <Label color={settled ? usColor : live ? V.pink : V.blue}>
            {settled ? "Final" : live ? `Live · lap ${lapInfo.lap} of ${SNAP.totalLaps}` : "Starting grid"}
          </Label>
          {(live || settled) && <span style={{ marginLeft: "auto" }}><Chip color={V.amber}>Mock</Chip></span>}
        </div>

        <Label color={V.text3}>{settled ? "Result" : live ? "If this holds" : "On the grid"}</Label>

        {/* Box Box on the left, team totals on the right, sitting over the same
            two columns the driver values run down. */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, margin: "12px 0 0" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Label color={V.gold}>Box Box</Label>
            <div style={{ display: "flex", alignItems: "baseline", gap: 9, margin: "5px 0 0" }}>
              <p style={{ ...display("h1"), color: V.text, margin: 0, fontVariantNumeric: "tabular-nums" }}>{boxBox.line}</p>
              <Chip color={boxSide === "OVER" ? V.gold : V.purple}>{boxSide}</Chip>
            </div>
            <p style={{ ...body("bodySm"), color: pitted ? V.text2 : V.text3, margin: "5px 0 0" }}>
              {boxBox.team} · {pitted ? "pitted" : "not pitted yet"}
            </p>
          </div>

          {[
            { team: myTeam.name, total: totalMine, c: usColor, glow: settled && winning },
            { team: opp.name, total: totalTheirs, c: themColor, glow: themLit },
          ].map((s, i) => (
            <div key={i} style={{ width: COL, flexShrink: 0, textAlign: "center" }}>
              <TeamBadge name={s.team} size={26} ring={s.c} />
              <p style={{
                ...display("chip"), fontSize: 13, color: V.text2, margin: "4px 0 0", lineHeight: 1.1,
              }}>{s.team}</p>
              <p style={{
                ...display("stat"), margin: "3px 0 0", fontVariantNumeric: "tabular-nums",
                ...(s.glow ? textGlow(s.c) : { color: s.c }),
              }}>{s.total}</p>
            </div>
          ))}
        </div>

        <p style={{ ...body("bodySm"), color: V.text3, margin: "12px 0 0" }}>
          These are driver points only and does not account for the box box line.
        </p>
        {live && (
          <p style={{ ...body("bodySm"), color: V.text3, margin: "5px 0 0" }}>
            Updated {lapInfo.updatedAgo}s ago · Every 2 min
          </p>
        )}
      </div>

      {/* The answer, side by side, before anyone reads a table. Three-letter codes
          rather than surnames: Colapinto truncates at a third of a phone width. */}
      <p style={{ ...body("bodySm"), color: V.text3, margin: 0, padding: "12px 16px 0" }}>
        {settled ? "Below are your driver's finishing positions." : "Below are your driver's most recent positions."}
      </p>
      <div style={{ display: "flex", borderBottom: `1px solid ${V.border}` }}>
        {[
          { kind: "mine", good: true, c: V.green, text: "Root for", list: rows.filter(r => r.side === "mine") },
          { kind: "theirs", good: false, c: V.pink, text: "Root against", list: rows.filter(r => r.side === "theirs") },
        ].map((g, gi) => (
          <div key={g.kind} style={{
            flex: 1, minWidth: 0, padding: "14px 8px 15px",
            background: `${g.c}0d`,
            borderLeft: gi === 1 ? `1px solid ${V.border}` : "none",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginBottom: 13 }}>
              <Thumb down={!g.good} color={g.c} size={19} />
              <Label color={g.c}>{g.text}</Label>
            </div>
            {g.list.length === 0 ? (
              <p style={{ ...body("bodySm"), color: V.text3, textAlign: "center", margin: 0 }}>Nobody</p>
            ) : (
              <div style={{ display: "flex", justifyContent: "center", gap: 9 }}>
                {g.list.map(r => (
                  <div key={r.name} style={{ textAlign: "center" }}>
                    <Face name={r.name} size={46} ring={g.c} glow={g.good ? 1.7 : 1} drained={!g.good} />
                    <p style={{ ...display("chip"), color: V.text2, margin: "5px 0 0" }}>{code3(r.name)}</p>
                    <p style={{
                      ...display("h3"), margin: "1px 0 0", fontVariantNumeric: "tabular-nums",
                      ...(g.good ? textGlow(g.c, 0.7) : { color: g.c }),
                    }}>P{r.pos}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Column header */}
      <div style={{ display: "flex", alignItems: "center", padding: "9px 12px", borderBottom: `1px solid ${V.border}`, background: V.bg3 }}>
        <span style={{ width: 26, flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: 0 }}><Label color={V.text3}>Driver</Label></span>
        <span style={{ width: COL, flexShrink: 0, textAlign: "center" }}><Label color={usColor}>Us</Label></span>
        <span style={{ width: COL, flexShrink: 0, textAlign: "center" }}><Label color={themColor}>Them</Label></span>
      </div>

      {/* 22 rows on two fixed heights: this week's ten, and everyone else */}
      {rows.map((r, i) => {
        // Good is green, bad is pink with the color drained out of the face, and
        // the thumb says which. Neutral rows stay plain: nothing to decide.
        const good = r.side === "mine";
        const bad = r.side === "theirs";
        const vColor = good ? V.green : bad ? V.pink : null;
        const lit = !!vColor;
        const last = i === rows.length - 1;

        if (!r.inPool) return (
          <div key={r.name} style={{
            display: "flex", alignItems: "center", height: ROW_OUT, boxSizing: "border-box",
            padding: "0 12px 0 9px",
            borderBottom: last ? "none" : `1px solid ${V.border}`,
            borderLeft: "3px solid transparent",
          }}>
            <span style={{ width: 23, flexShrink: 0 }}>
              <p style={{ ...body("bodySm"), fontSize: 13, color: V.text3, margin: 0, fontVariantNumeric: "tabular-nums" }}>{r.pos}</p>
            </span>
            <span style={{ width: 3, height: 12, borderRadius: 2, background: dColor(r.name), opacity: 0.5, flexShrink: 0, marginRight: 9 }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                ...body("bodySm"), fontSize: 13, color: V.text3, margin: 0,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{r.name}</p>
            </span>
          </div>
        );

        return (
          <div key={r.name} style={{
            display: "flex", alignItems: "center", height: ROW_IN, boxSizing: "border-box",
            padding: "0 12px 0 9px",
            borderBottom: last ? "none" : `1px solid ${V.border}`,
            background: vColor ? `${vColor}12` : "transparent",
            borderLeft: `4px solid ${vColor || "transparent"}`,
            boxShadow: good ? `inset 0 0 26px ${V.green}1a` : bad ? `inset 0 0 26px ${V.pink}14` : "none",
          }}>
            <span style={{ width: 23, flexShrink: 0 }}>
              <p style={{
                ...display("h3"), margin: 0, fontVariantNumeric: "tabular-nums",
                ...(good ? textGlow(V.green, 0.6) : { color: bad ? V.pink : V.text2 }),
              }}>{r.pos}</p>
            </span>
            <span style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 9 }}>
              <Face name={r.name} size={32}
                ring={vColor || undefined}
                glow={good ? 1.6 : bad ? 1 : 1}
                drained={bad} />
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                  <p style={{
                    ...body("bodyMd"), lineHeight: 1.15,
                    color: lit ? V.text : V.text2, margin: 0,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{r.name}</p>
                  {vColor && <Thumb down={bad} color={vColor} size={19} />}
                </span>
                <p style={{
                  ...body("bodySm"), fontSize: 13, lineHeight: 1.2, margin: "2px 0 0",
                  color: dColor(r.name), opacity: lit ? 0.95 : 0.7,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{dTeam(r.name)}</p>
              </span>
            </span>
            <span style={{ width: COL, flexShrink: 0, display: "flex", justifyContent: "center" }}>
              {r.cMine > 0 && <Val v={r.valMine} count={r.cMine} color={usColor} muted={r.side === "both"} />}
            </span>
            <span style={{ width: COL, flexShrink: 0, display: "flex", justifyContent: "center" }}>
              {r.cTheirs > 0 && <Val v={r.valTheirs} count={r.cTheirs} color={themColor} muted={r.side === "both"} />}
            </span>
          </div>
        );
      })}

      {/* Legend */}
      <div style={{ padding: "13px 16px", background: V.bg3, borderTop: `1px solid ${V.border}` }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {[[false, V.green, "Root for"],
            [true, V.pink, "Root against"]].map(([down, c, text], i) => (
            <div key={`t${i}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 18, display: "flex", justifyContent: "center", flexShrink: 0 }}>
                <Thumb down={down} color={c} size={16} />
              </span>
              <p style={{ ...body("bodySm"), color: V.text3, margin: 0 }}>{text}</p>
            </div>
          ))}
          {[
            [usColor, false, `Worth to ${myTeam.name}`],
            [themColor, false, `Worth to ${opp.name}`],
            [V.text3, true, "Cancels out"],
          ].map(([c, muted, text], i) => (
            <div key={`c${i}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 18, display: "flex", justifyContent: "center", flexShrink: 0 }}>
                <span style={{
                  width: 15, height: 15, borderRadius: "50%",
                  background: muted ? "transparent" : `${c}1f`,
                  border: `1.5px solid ${muted ? V.border2 : c}`,
                  boxShadow: muted ? "none" : `0 0 8px ${c}88`,
                }} />
              </span>
              <p style={{ ...body("bodySm"), color: V.text3, margin: 0 }}>{text}</p>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 18, display: "flex", justifyContent: "center", flexShrink: 0 }}>
              <span style={{
                width: 11, height: 11, borderRadius: "50%", boxSizing: "content-box",
                border: `1.5px solid ${V.blue}`, padding: 2,
                boxShadow: `0 0 0 1.5px ${V.blue}, 0 0 8px ${V.blue}66`,
              }} />
            </span>
            <p style={{ ...body("bodySm"), color: V.text3, margin: 0 }}>Both teammates picked him</p>
          </div>
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
            <p style={{ ...display("chip"), color: V.blue, margin: 0 }}>marquee</p>
            <p style={{ ...body("bodySm"), color: V.text3, margin: 0 }}>Monoton</p>
          </div>
          <p style={{ ...marquee("Hungarian"), ...textGlow(V.blue, 0.8), color: V.text, margin: 0 }}>HUNGARIAN</p>
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

      <SectionHead accent={V.blue} sub="Blue is normal and can flicker. Green means good to go. Pink means needs attention, a problem, or the other team.">Buttons</SectionHead>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
        <NeonBtn flicker sub="Normal. The primary action, and the one that flickers.">Make your picks</NeonBtn>
        <NeonBtn color={V.green} sub="Good to go.">Picks submitted</NeonBtn>
        <NeonBtn color={V.pink} sub="Needs attention.">Deadline in 20 minutes</NeonBtn>
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

      <SectionHead accent={V.blue}>A cleaner standings row</SectionHead>
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
// initialTab/State/Lap exist so scripts/smoke.jsx can render every branch. The
// app never passes them.
export default function VegasHome({ onNavigate, initialTab = "home", initialState = "live", initialLap = 0 }) {
  const [tab, setTab] = useState(initialTab);
  const [state, setState] = useState(initialState);
  const [lapIdx, setLapIdx] = useState(initialLap);
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

        {tab === "kit" ? <NeonKit /> : (
          state === "open"
            ? <HomeOpen onNav={nav} />
            : <HomeLocked live={state === "live"} settled={state === "final"} lapIdx={lapIdx} />
        )}
        {/* Mockup controls. Not part of the design, so they sit under it. */}
        <div style={{ border: `1px dashed ${V.border2}`, borderRadius: 14, padding: 12, marginTop: 34 }}>
          <Label color={V.text3} style={{ marginBottom: 10 }}>Mockup controls</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Toggle val={tab} set={setTab} opts={[{ id: "home", label: "Home" }, { id: "kit", label: "Neon kit" }]} />
            {tab === "home" && (
              <Toggle val={state} set={setState} opts={[
                { id: "open", label: "No picks" },
                { id: "locked", label: "Locked" },
                { id: "live", label: "Live" },
                { id: "final", label: "Final" },
              ]} />
            )}
            {tab === "home" && state === "live" && (
              <Toggle val={lapIdx} set={setLapIdx} opts={[
                { id: 0, label: "Lap 30 · ahead" },
                { id: 1, label: "Lap 52 · behind" },
              ]} />
            )}
            {tab === "home" && state === "final" && (
              <Toggle val={lapIdx} set={setLapIdx} opts={[
                { id: 0, label: "Won by 17" },
                { id: 1, label: "Lost by 7" },
              ]} />
            )}
          </div>
          <button onClick={() => nav("home")} style={{
            marginTop: 10, width: "100%", padding: "9px", borderRadius: 9, cursor: "pointer",
            background: "transparent", border: `1px solid ${V.border2}`, ...display("chip"), color: V.text3,
          }}>Back to the real app</button>
        </div>

      </div>
    </div>
  );
}
