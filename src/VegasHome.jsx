// Vegas second-half mockup: the neon kit plus the new state-driven Home.
//
// Data is a hardcoded snapshot of the real league at round 11 (Hungary), pulled
// 2026-07-25. Real teams, real players, real picks, real qualifying grid. The
// only invented numbers are in the live-projection panel, because the race has
// not run yet; that panel is marked MOCK in the UI so nobody reads it as real.
//
// Nothing here touches Supabase. It is a design surface, reachable at #vegas.

import { useState, useRef, useEffect , createContext, useContext } from "react";
import { V, FD, display, numeric, body, label as labelType, marquee, textGlow, edgeGlow, card, VEGAS_CSS } from "./theme.vegas";
import { supabase } from "./supabaseClient";
import { useLeague } from "./useLeague";
import { lockedDemo } from "./lockedDemo";
import { raceTimePT } from "./raceTimes";
import { ordinal } from "./teamTable";
import { DRIVER_HEADSHOTS, TEAM_BY_NAME } from "./drivers";
import { F1_TEAM_COLORS } from "./theme";

// ── Real league snapshot, round 11 ───────────────────────
const PLAYER_PHOTOS = {
  "Andrew Ishak": "https://fhtwjpohfomnhxjefjwq.supabase.co/storage/v1/object/public/player-photos/74e68847-70fe-4eaf-9075-f4cfaa642cdd.png?t=1772682494867",
  "Kevin Coolidge": "https://fhtwjpohfomnhxjefjwq.supabase.co/storage/v1/object/public/player-photos/719da11a-6cd8-42f4-aba5-a3bd95742a1a.png?t=1772503404813",
  "Brett Dillon": "https://fhtwjpohfomnhxjefjwq.supabase.co/storage/v1/object/public/player-photos/d9e8e2f9-ddb4-4aca-a67e-43264d19751c.png?t=1772428753985",
  "Stacy Michaelsen": "https://fhtwjpohfomnhxjefjwq.supabase.co/storage/v1/object/public/player-photos/0f599d2b-a7e8-4407-8a48-7bb08e1bd446.png?t=1772503349191",
};

// The week. Real data comes through this; the object below is what the page
// was built against and is now only a shape reference plus the pieces that have
// no source: the circuit's character, a running order, a lap count.
// The snapshot the page was built against, exported for the smoke test so it
// can render every state without a database.
export const SNAP_FOR_SMOKE = () => SNAP;
const Week = createContext(null);
const useWeek = () => useContext(Week) || SNAP;

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
  // INVENTED 2026 championship points. There is no standings source in the app
  // and OpenF1 has no standings endpoint, which is the same blocker holding up
  // automated pools. Consistent with the pools: the top three sit inside
  // positions 1-5 and the seven midfielders inside 6-15.
  teamBoxBox: { mine: 5, theirs: -1 },
  driverPts: { "Lewis Hamilton": 15, "Max Verstappen": 10, "Isack Hadjar": 6,
    "Liam Lawson": 2, "Arvid Lindblad": 0, "Lando Norris": 18, "Pierre Gasly": 1,
    "Oliver Bearman": -1 },
  f1Points: {
    "Lando Norris": 241, "Oscar Piastri": 219, "George Russell": 198,
    "Lewis Hamilton": 176, "Charles Leclerc": 165, "Andrea Kimi Antonelli": 149,
    "Max Verstappen": 132, "Isack Hadjar": 96, "Liam Lawson": 74,
    "Arvid Lindblad": 61, "Franco Colapinto": 48, "Pierre Gasly": 37,
    "Oliver Bearman": 29, "Nico Hulkenberg": 24, "Gabriel Bortoleto": 18,
  },
  pools: {
    top: ["Lando Norris", "Lewis Hamilton", "George Russell"],
    mid: ["Max Verstappen", "Isack Hadjar", "Liam Lawson", "Arvid Lindblad", "Franco Colapinto", "Oliver Bearman", "Gabriel Bortoleto"],
  },
  myPick: {
    topPick: "Lewis Hamilton",
    order: ["Lewis Hamilton", "Max Verstappen", "Isack Hadjar", "Liam Lawson", "Arvid Lindblad"],
    bestFinish: "P3",
    pitGuess: 1.5,
  },
  matePick: {
    order: ["Lewis Hamilton", "Max Verstappen", "Isack Hadjar", "Liam Lawson", "Arvid Lindblad"],
    bestFinish: "P3",
    pitGuess: 1.5,
  },
  // team is the F1 constructor the stop belongs to, from race.pitQuestion.
  boxBox: { side: "OVER", line: 2.48, waitingOn: 0, team: "Alpine", guesses: { "Andrew Ishak": 1.5, "Kevin Coolidge": 1.5, "Brett Dillon": 3.5, "Stacy Michaelsen": 3.4 } },
  picksIn: { me: true, teammate: true, mate: true },
  // The four seats in the matchup, the shape useLeague returns.
  seats: [
    { id: "a", name: "Andrew Ishak", photo: null, ours: true, mine: true, picked: true,
      score: { top: 15, mid: 17, best: 0, order: 0, total: 32 },
      pick: { topPick: "Lewis Hamilton", order: ["Lewis Hamilton", "Max Verstappen", "Isack Hadjar", "Liam Lawson", "Arvid Lindblad"], bestFinish: "P3", pitGuess: 1.5 } },
    { id: "b", name: "Kevin Coolidge", photo: null, ours: true, mine: false, picked: true,
      score: { top: 18, mid: 10, best: 0, order: 0, total: 28 },
      pick: { topPick: "Lewis Hamilton", order: ["Lewis Hamilton", "Max Verstappen", "Isack Hadjar", "Liam Lawson", "Arvid Lindblad"], bestFinish: "P3", pitGuess: 1.5 } },
    { id: "c", name: "Brett Dillon", photo: null, ours: false, mine: false, picked: true,
      score: { top: 15, mid: 18, best: 0, order: 6, total: 39 },
      pick: { topPick: "Lando Norris", order: ["Lando Norris", "Isack Hadjar", "Liam Lawson", "Pierre Gasly", "Oliver Bearman"], bestFinish: "P1", pitGuess: 3.5 } },
    { id: "d", name: "Stacy Michaelsen", photo: null, ours: false, mine: false, picked: true,
      score: { top: 18, mid: 17, best: 3, order: 0, total: 38 },
      pick: { topPick: "Lando Norris", order: ["Lando Norris", "Isack Hadjar", "Liam Lawson", "Pierre Gasly", "Oliver Bearman"], bestFinish: "P2", pitGuess: 3.4 } },
  ],
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
// Derived per render: the pool is this round's, not a constant.
const poolSet = (pools) => new Set([...(pools.top || []), ...(pools.mid || [])]);

// One pass over the running order produces everything the board needs: each
// driver's side, what he is worth to each team, and both team totals. Deriving
// it means the column numbers and the total can never disagree.
function readBoard(order) {
  const { counts, pools } = useWeek();
  const POOL = poolSet(pools);
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
// The marquee carries the place, not the words "Grand Prix", which sit on the line below.
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

// blank: something is going to be printed on top of this face, so a driver with
// no headshot shows an empty disc rather than initials fighting it. Lindblad's
// AL behind a 6 read as ".6.". The photograph is covered by the caller rather
// than filtered here, because a filter would take the ring down with it: the
// ring is this element's border.
function Face({ name, size = 40, ring, glow = 1, drained = false, edge = 2, blank = false }) {
  const [bad, setBad] = useState(false);
  const c = ring || dColor(name);
  const url = DRIVER_HEADSHOTS[name] || PLAYER_PHOTOS[name];
  if (!url || bad) {
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%", flexShrink: 0,
        // Opaque. A translucent disc let the connecting lines run through the
        // face of any driver without a headshot.
        background: V.bg2, border: `${edge}px solid ${c}`,
        boxShadow: glow ? `0 0 ${12 * glow}px ${c}66` : "none",
        display: "flex", alignItems: "center", justifyContent: "center",
        ...display("chip"), color: c,
      }}>{blank ? "" : PLAYER_PHOTOS[name] !== undefined || !DRIVER_HEADSHOTS[name]
        ? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
        : lastName(name).slice(0, 3).toUpperCase()}</div>
    );
  }
  return (
    <img src={url} alt={name} onError={() => setBad(true)} style={{
      width: size, height: size, borderRadius: "50%", objectFit: "cover", objectPosition: "top",
      flexShrink: 0, background: V.bg3, border: `${edge}px solid ${c}`,
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
        <div style={{ width: 46, flexShrink: 0, textAlign: "center" }}>
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
  // Three of these across a phone leaves about 90px of content each. "4.38" at
  // the stat step plus "km" is wider than that, and the unit was being cut off,
  // so a tile carrying a unit drops a step and the unit drops with the number.
  return (
    <div style={{ ...card({ padding: "14px 9px", flex: 1, minWidth: 0 }) }}>
      <Label>{label}</Label>
      <p style={{
        ...(unit ? numeric("h2", { fontSize: 26 }) : display("stat")),
        ...(glow ? textGlow(color) : { color }),
        margin: "6px 0 0", whiteSpace: "nowrap",
      }}>
        {value}{unit && (
          <span style={{ ...body("bodySm"), fontSize: 12, color: V.text3, marginLeft: 2 }}>{unit}</span>
        )}
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
function PlayerBadge({ name, picked, size = 38, photo: given, dim = !picked, ring }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const c = ring || (picked ? V.green : V.text3);
  // A photo can be handed in now that the page has real players; the map is
  // the fallback for the ones it does not carry.
  const photo = given || PLAYER_PHOTOS[name];
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
        filter: dim ? "grayscale(0.7) brightness(0.75)" : "none",
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
          {/* Just the round. Whether there are 22 or 23 is up to the FIA. */}
          <Chip color={V.blue}>Round {race.round}</Chip>
        </div>
        {/* No names. It is your own team, two people, and their faces are right
            there; the ring and the tick say which of them is in. */}
        {players.length > 0 && (
          <div style={{ marginLeft: "auto", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              {players.map(p => (
                <PlayerBadge key={p.name} name={p.name} picked={p.picked} />
              ))}
            </div>
            {allIn && (
              <p style={{ ...labelType(), color: V.green, margin: "6px 0 0",
                          textAlign: "center" }}>Picks in</p>
            )}
          </div>
        )}
      </div>

      <p style={{
        ...marquee(shortRace(race.name)), lineHeight: 1.02, ...textGlow(V.pink),
        textAlign: "center", textTransform: "uppercase", margin: "6px 0 0",
      }}>{shortRace(race.name)}</p>
      {/* On the same face as the race name and two thirds its size, set tight
          under it, so the two lines read as one sign rather than a title and a
          caption with air between them. */}
      <p style={{
        ...marquee("Grand Prix"), fontSize: `calc(${marquee(shortRace(race.name)).fontSize}px * 0.62)`,
        lineHeight: 1.02, ...textGlow(V.blue), textAlign: "center",
        textTransform: "uppercase", margin: "2px 0 0",
      }}>Grand Prix</p>

      {/* Only when the make-your-picks sign is not up, since that carries the
          deadline itself. With the picks in, this is the only place left that
          says how long you have to change them. */}
      {status && (
        <>
          <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${V.blue}55, transparent)`, margin: "16px 0 12px" }} />
          <p style={{
            ...display("h3"), fontSize: 18, color: status.color, textAlign: "center", margin: 0,
            textTransform: "uppercase", letterSpacing: "0.06em",
          }}>{status.text}</p>
        </>
      )}
    </div>
  );
}

// One place to decide what the event is doing, so a red flag or a delay only has
// to be added here.
function eventStatus({ settled, live, lapInfo, race, closesAt }) {
  if (settled) return { text: "Race over", color: V.text2 };
  if (live) return { text: `Live · Lap ${lapInfo.lap} of ${lapInfo.total ?? SNAP.totalLaps}`, color: V.pink };
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
function HomeOpen({ onNav, submitted = false }) {
  const week = useWeek();
  const { race, track, myTeam, opp, pools } = week;
  const status = eventStatus({ settled: false, live: false, lapInfo: null, race, closesAt: race.deadline });
  const [editing, setEditing] = useState(false);
  const showPicker = !submitted || editing;
  // The real deadline, which is the whole point of the clock.
  return (
    <>
      <Marquee
        race={race}
        status={showPicker ? null : status}
        players={[
          { name: week.me, picked: week.picksIn.me },
          { name: week.teammate, picked: week.picksIn.mate },
        ]}
      />

      {showPicker ? (
        <>
          <PickSign status={status} />
          <PickFlow />
        </>
      ) : (
        <HomeSubmitted onEdit={() => setEditing(true)} />
      )}

      <SectionHead accent={V.pink}>This week's opponent</SectionHead>
      <OpponentCard />

      {/* Circuit character has no source. The snapshot had it written by hand
          for the Hungaroring; there is nothing like it for Zandvoort, and a
          page that invents the character is worse than a page with none. */}
      {track && (
      <>
      <SectionHead accent={V.blue}>{race.circuit || race.name} intel</SectionHead>
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
      )}
    </>
  );
}

// ── Picking ──────────────────────────────────────────────

// A neon sign that points down at the thing it is talking about, because on this
// screen the picker is right underneath it rather than a page away.
function PickSign({ status }) {
  return (
    <div style={{ textAlign: "center", marginBottom: 18 }}>
      <div className="v-flicker" style={{
        display: "inline-block", padding: "14px 26px 12px", borderRadius: 14,
        border: `2px solid ${V.blue}`, ...edgeGlow(V.blue, 1),
      }}>
        <p style={{ ...display("h2"), ...textGlow(V.blue), margin: 0, textTransform: "uppercase" }}>
          Make your picks
        </p>
        {/* The deadline belongs to the thing it is a deadline for. */}
        {status && (
          <p style={{
            ...display("h3"), fontSize: 15, ...textGlow(V.pink), margin: "8px 0 0",
            textTransform: "uppercase", letterSpacing: "0.05em",
          }}>{status.text}</p>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: -2 }}>
        <svg width="34" height="30" viewBox="0 0 34 30" aria-hidden style={{ overflow: "visible" }}>
          <path d="M17 2 L17 20 M8 13 L17 22 L26 13" fill="none" stroke={V.blue} strokeWidth="3"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ filter: `drop-shadow(0 0 6px ${V.blue}) drop-shadow(0 0 14px ${V.blue}99)` }} />
        </svg>
      </div>
    </div>
  );
}

// One driver, one row. Tapping picks them; tapping again puts them back. When a
// pool is full the rest of that pool goes quiet rather than disappearing, so you
// can still see who you passed on.
function DriverPickRow({ name, picked, muted, onTap }) {
  // Championship points, from the standings the Monday cron writes. A dash
  // when that table is empty, rather than a number nobody earned.
  const { f1Points } = useWeek();
  const c = dColor(name);
  return (
    <button
      onClick={onTap}
      disabled={muted}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 12,
        padding: "10px 12px", borderRadius: 12, cursor: muted ? "default" : "pointer",
        background: picked ? `${V.green}14` : V.bg3,
        border: `1px solid ${picked ? V.green : V.border}`,
        opacity: muted ? 0.32 : 1,
        boxShadow: picked ? `0 0 16px ${V.green}44` : "none",
        transform: picked ? "scale(1.015)" : "scale(1)",
        transition: "background .18s ease, border-color .18s ease, opacity .25s ease, transform .18s ease, box-shadow .18s ease",
        textAlign: "left",
      }}
    >
      <Face name={name} size={52} ring={picked ? V.green : c} glow={picked ? 1.4 : 0.6} />
      <div style={{ flex: "1 1 0", minWidth: 0 }}>
        <p style={{ ...body("bodyMd"), fontSize: 19, color: V.text, margin: 0,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</p>
        <p style={{ ...body("bodySm"), color: c, margin: "1px 0 0" }}>{dTeam(name)}</p>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <p style={{ ...numeric("h3"), color: V.text2, margin: 0 }}>{f1Points[name] ?? "-"}</p>
        <Label color={V.text3}>pts</Label>
      </div>
      <span style={{
        width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: picked ? V.green : "transparent",
        border: `2px solid ${picked ? V.green : V.border2}`,
        color: V.bg, fontSize: 15, fontWeight: 900, lineHeight: 1,
        transform: picked ? "scale(1)" : "scale(0.85)",
        transition: "background .18s ease, transform .18s ease, border-color .18s ease",
      }}>{picked ? "\u2713" : ""}</span>
    </button>
  );
}

function NeedleYou() {
  const steps = [["+5", "exact"], ["+4", "0.1s"], ["+3", "0.2s"], ["+2", "0.3s"], ["+1", "0.4s"]];
  return (
    <>
      <Label color={V.blue} style={{ margin: "14px 0 8px" }}>For you</Label>
      <div style={{ display: "flex", gap: 6 }}>
        {steps.map(([pts, off]) => (
          <div key={off} style={{
            flex: 1, minWidth: 0, padding: "7px 4px", borderRadius: 9, textAlign: "center",
            background: `${V.blue}12`, border: `1px solid ${V.blue}44`,
          }}>
            <p style={{ ...numeric("h3"), fontSize: 17, color: V.blue, margin: 0 }}>{pts}</p>
            <p style={{ ...body("bodySm"), fontSize: 12, color: V.text3, margin: "1px 0 0" }}>{off}</p>
          </div>
        ))}
      </div>
    </>
  );
}

function NeedleSides({ side }) {
  const winsHigh = side === "OVER";
  const Half = ({ win, text, arrow }) => (
    <div style={{
      flex: 1, padding: "7px 10px", borderRadius: 9,
      background: win ? `${V.green}14` : `${V.pink}12`,
      border: `1px solid ${win ? V.green : V.pink}44`,
      display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
    }}>
      <span style={{ ...numeric("h3"), fontSize: 17, color: win ? V.green : V.pink }}>
        {win ? "+5" : "\u22121"}
      </span>
      <span style={{ ...body("bodySm"), fontSize: 13, color: win ? V.green : V.pink }}>
        {arrow} {text}
      </span>
    </div>
  );
  return (
    <>
      <Label color={V.gold} style={{ margin: "2px 0 8px" }}>For your team</Label>
      <div style={{ display: "flex", gap: 8 }}>
        <Half win={!winsHigh} text="under the line" arrow={"\u2190"} />
        <Half win={winsHigh} text="over the line" arrow={"\u2192"} />
      </div>
    </>
  );
}

// Left-to-right wheel. Scroll snapping does the feel; tapping does the choosing,
// because reading a value off scroll position is unreliable on a phone.
//
// The track is padded to half the width at both ends so the first and last
// options can actually reach the middle. Centring uses scrollIntoView rather
// than offsetLeft arithmetic, which was measuring against the wrong parent and
// left the selection hanging off the left edge.
function Wheel({ options, value, onChange, format = (v) => v, accent = V.purple, tone, depth = "wheel" }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const on = el.querySelector("[data-on='1']");
    if (on && on.scrollIntoView) on.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [value]);

  const idx = options.indexOf(value);

  return (
    <div style={{ position: "relative" }}>
      <div ref={ref} style={{
        display: "flex", gap: 8, overflowX: "auto",
        padding: "16px calc(50% - 44px) 18px",
        scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
      }}>
        {options.map((o, i) => {
          const on = o === value;
          const d = Math.abs(i - idx);
          // Two steps up for the selection, one for its neighbours, and a step
          // down for everything else. That is the wheel.
          const scale = on ? 1.22 : depth === "flat" ? 1 : d === 1 ? 1.06 : 0.9;
          const t = on ? null : tone ? tone(o) : null;
          const edge = t === "win" ? V.green : t === "lose" ? V.pink : null;
          return (
            <button key={o} data-on={on ? "1" : "0"} onClick={() => onChange(o)} style={{
              flexShrink: 0, scrollSnapAlign: "center", cursor: "pointer",
              padding: "12px 18px", borderRadius: 12,
              background: on ? `${accent}1f` : edge ? `${edge}0f` : V.bg3,
              border: `1px solid ${on ? accent : edge ? `${edge}55` : V.border}`,
              ...(on ? { boxShadow: `0 0 18px ${accent}55` } : {}),
              transform: `scale(${scale})`,
              opacity: on ? 1 : depth === "flat" ? 0.8 : d === 1 ? 0.95 : 0.62,
              // The raised one sits over its neighbours rather than under them.
              position: "relative", zIndex: on ? 2 : 1,
              transition: "transform .22s cubic-bezier(0.2,0.9,0.3,1), opacity .22s ease, background .16s ease, border-color .16s ease, box-shadow .16s ease",
            }}>
              <span style={{ ...numeric("h3"),
                ...(on ? textGlow(accent, 0.7) : { color: edge || V.text2 }) }}>
                {format(o)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Both edges fade, so it reads as a strip that keeps going. */}
      {["left", "right"].map(sideName => (
        <div key={sideName} aria-hidden style={{
          position: "absolute", top: 0, bottom: 0, [sideName]: 0, width: 46,
          pointerEvents: "none",
          background: `linear-gradient(to ${sideName === "left" ? "right" : "left"}, ${V.bg2}, ${V.bg2}00)`,
        }} />
      ))}
      <div aria-hidden style={{
        position: "absolute", top: "50%", left: 4, transform: "translateY(-50%)",
        pointerEvents: "none", color: V.text3, fontSize: 20, lineHeight: 1,
      }}>&lsaquo;</div>
      <div aria-hidden style={{
        position: "absolute", top: "50%", right: 4, transform: "translateY(-50%)",
        pointerEvents: "none", color: V.text3, fontSize: 20, lineHeight: 1,
      }}>&rsaquo;</div>
    </div>
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

// Shut by default. The needle is the one part of the game that pays you and your
// team differently, and the two payoffs pull against each other, so the
// explanation has to be available without being in the way.
function NeedleExplainer({ side }) {
  const [open, setOpen] = useState(false);
  const other = side === "OVER" ? "UNDER" : "OVER";
  const nudge = side === "OVER" ? "low" : "high";
  const dir = side === "OVER" ? "down" : "up";
  return (
    <div style={{ marginTop: 6 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
        background: "transparent", border: "none", padding: "6px 0",
      }}>
        <span style={{
          ...numeric("h3"), fontSize: 18, color: V.purple, lineHeight: 1,
          transform: open ? "rotate(90deg)" : "rotate(0deg)",
          transition: "transform .2s ease", display: "inline-block",
        }}>&rsaquo;</span>
        <span style={{ ...body("bodyMd"), fontSize: 15, color: V.purple }}>
          See how the needle points work
        </span>
      </button>

      <div style={{
        maxHeight: open ? 1200 : 0, opacity: open ? 1 : 0, overflow: "hidden",
        transition: "max-height .4s ease, opacity .3s ease",
      }}>
        <div style={{ paddingTop: 8 }}>
          {/* The two side panels live in here now. They were the loudest thing
              on a card whose job is to set one number, and this is the part of
              the page that exists to explain the scoring. */}
          <NeedleSides side={side} />
          <NeedleYou />
          <Label color={V.blue} style={{ marginBottom: 8, marginTop: 14 }}>For you</Label>
          <p style={{ ...body("body"), color: V.text2, margin: "0 0 10px" }}>
            You score on how close your guess lands, and it counts toward your individual
            score only. It never touches the matchup.
          </p>
          <div style={{ display: "grid", gap: 4, marginBottom: 18 }}>
            {[["Exact", "+5"], ["Within 0.1s", "+4"], ["Within 0.2s", "+3"],
              ["Within 0.3s", "+2"], ["Within 0.4s", "+1"], ["Further out", "0"]].map(([l, v]) => (
              <div key={l} style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ ...body("bodySm"), color: V.text2, flex: 1 }}>{l}</span>
                <span style={{ ...numeric("h3"), fontSize: 17, color: v === "0" ? V.text3 : V.blue }}>{v}</span>
              </div>
            ))}
          </div>

          <Label color={V.gold} style={{ marginBottom: 8 }}>For your team</Label>
          <p style={{ ...body("body"), color: V.text2, margin: "0 0 10px" }}>
            All four guesses in the matchup are averaged into the BOX BOX line. Your team has
            the <span style={{ color: V.gold }}>{side}</span> and theirs has the {other}. If the
            real stop lands on your side, your team takes +5 and theirs loses 1.
          </p>
          <p style={{ ...body("body"), color: V.text2, margin: 0 }}>
            Your own guess moves that line. Guessing {nudge} drags it {dir} and gives your team
            more room, which is not always the guess that wins you needle points. That is the
            whole tension.
          </p>
        </div>
      </div>
    </div>
  );
}

// Everything read back before it goes anywhere: the five in order, where the
// best one lands, and the Needle guess with the side it affects.
function PickReview({ order, finish, needle, sent, onBack, onSubmit, saving, error }) {
  // Everything it reads off the week, taken off the week. Reaching for these
  // without this is what threw on submit, twice.
  const { boxBox, race } = useWeek();
  return (
    <div
      onClick={onBack}
      style={{
        // Above the bottom nav, which sits at 100. At 40 the review modal came
        // up behind it and the submit button was under the tab bar.
        position: "fixed", inset: 0, zIndex: 300, display: "flex",
        alignItems: "flex-end", justifyContent: "center",
        background: "rgba(3,3,8,0.78)", backdropFilter: "blur(3px)",
        animation: "v-fade .2s ease",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 480, maxHeight: "88vh", overflowY: "auto",
          background: V.bg2, borderTopLeftRadius: 20, borderTopRightRadius: 20,
          border: `1px solid ${V.border2}`, borderBottom: "none",
          padding: "22px 18px 26px", animation: "v-rise .28s cubic-bezier(0.2,0.9,0.3,1)",
        }}
      >
        <div style={{ width: 42, height: 4, borderRadius: 4, background: V.border2, margin: "0 auto 18px" }} />

        {sent ? (
          <div style={{ textAlign: "center", padding: "10px 0 4px" }}>
            <p style={{ ...display("h1"), ...textGlow(V.green), margin: "0 0 8px" }}>You&rsquo;re in</p>
            <p style={{ ...body("body"), color: V.text2, margin: "0 0 22px" }}>
              Picks are locked for the {race.name}. You can change them until the deadline.
            </p>
            <button onClick={onBack} style={{
              width: "100%", padding: "14px", borderRadius: 12, cursor: "pointer",
              background: "transparent", border: `1px solid ${V.border2}`,
              ...body("bodyMd"), fontSize: 16, color: V.text2,
            }}>Close</button>
          </div>
        ) : (
          <>
            <p style={{ ...body("bodyMd"), fontSize: 21, color: V.text, margin: "0 0 4px" }}>
              Check your picks
            </p>
            <p style={{ ...body("body"), fontSize: 16, color: V.text2, margin: "0 0 18px" }}>
              Nothing is sent until you confirm.
            </p>

            <Label color={V.blue} style={{ marginBottom: 10 }}>Your finishing order</Label>
            <div style={{ display: "grid", gap: 6, marginBottom: 20 }}>
              {order.map((d, i) => (
                <div key={d} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                  borderRadius: 10, background: V.bg3, border: `1px solid ${V.border}`,
                }}>
                  <span style={{ ...numeric("h3"), color: V.blue, width: 46, flexShrink: 0 }}>{ordinal(i + 1)}</span>
                  <Face name={d} size={30} ring={dColor(d)} glow={0} />
                  <span style={{ ...body("bodyMd"), fontSize: 16, color: V.text }}>{d}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 22 }}>
              <div style={{ flex: 1, padding: "12px 14px", borderRadius: 12, background: V.bg3, border: `1px solid ${V.border}` }}>
                <Label color={V.text3} style={{ marginBottom: 6 }}>Best finish</Label>
                <p style={{ ...numeric("h2"), ...textGlow(V.blue, 0.6), margin: 0 }}>{finish}</p>
              </div>
              <div style={{ flex: 1, padding: "12px 14px", borderRadius: 12, background: V.bg3, border: `1px solid ${V.border}` }}>
                <Label color={V.text3} style={{ marginBottom: 6 }}>The Needle</Label>
                <p style={{ ...numeric("h2"), ...textGlow(V.purple, 0.6), margin: 0 }}>{needle.toFixed(1)}s</p>
              </div>
            </div>

            <p style={{ ...body("bodySm"), color: V.text3, margin: "0 0 18px" }}>
              Your guess of {needle.toFixed(1)}s moves the BOX BOX line, and your team has the{" "}
              <span style={{ color: V.gold }}>{boxBox.side}</span>.
            </p>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onBack} style={{
                flex: 1, padding: "15px", borderRadius: 12, cursor: "pointer",
                background: "transparent", border: `1px solid ${V.border2}`,
                ...body("bodyMd"), fontSize: 16, color: V.text2,
              }}>Go back</button>
              <button onClick={onSubmit} disabled={saving} style={{
                flex: 2, padding: "15px", borderRadius: 12, cursor: saving ? "default" : "pointer",
                background: V.green, border: `1px solid ${V.green}`,
                boxShadow: `0 0 22px ${V.green}66`,
                opacity: saving ? 0.6 : 1,
                ...body("bodyMd"), fontSize: 17, color: V.bg,
              }}>{saving ? "Saving" : "Submit picks"}</button>
            </div>
            {error && (
              <p style={{ ...body("bodySm"), fontSize: 15, color: V.pink, textAlign: "center", margin: "12px 0 0" }}>
                {error}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── The pick flow ────────────────────────────────────────

const TOP_PICKS = 1, MID_PICKS = 4;
// P1 to P20. Rules.jsx:127 says the best-finish call runs the whole field, and
// real picks have used P1 through P10 already.
const FINISH_OPTIONS = Array.from({ length: 20 }, (_, i) => `P${i + 1}`);
// 1.5 to 4.5 in tenths. The first half stopped at 4.0 and the second-half rules
// card told the league it now goes to 4.5, so this has to.
const NEEDLE_OPTIONS = Array.from({ length: 31 }, (_, i) => +(1.5 + i * 0.1).toFixed(1));

function PickFlow() {
  const { pools, f1Points, boxBox, race, playerId } = useWeek();
  const [picked, setPicked] = useState([]);
  const [order, setOrder] = useState([]);
  const [finish, setFinish] = useState("P5");
  const [needle, setNeedle] = useState(3.0);
  const [review, setReview] = useState(false);
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Actually save them. This was onSubmit={() => setSent(true)}: the flow said
  // "picks submitted" and wrote nothing, so a whole week's picks went nowhere.
  const submit = async () => {
    if (saving || sent) return;
    setSaveError(null);
    if (!playerId) { setSaveError("No player is signed in."); return; }
    if (race.deadline && new Date() >= new Date(race.deadline)) {
      setSaveError("The deadline has passed. This race is locked.");
      return;
    }
    setSaving(true);
    try {
      const row = {
        player_id: playerId,
        race_id: race.id,
        top_pick: order[0],
        finishing_order: order,
        best_finish: finish,
        pit_guess: needle,
        submitted_at: new Date().toISOString(),
      };

      // picks has a unique key on (race_id, player_id), so a second insert for
      // the same race is a constraint violation rather than an edit. Upsert is
      // refused outright by the policy, so this looks first and then updates or
      // inserts accordingly.
      const { data: existing } = await supabase.from("picks")
        .select("id").eq("player_id", playerId).eq("race_id", race.id).maybeSingle();

      // .select() on both, because an update that the policy does not match
      // returns 200 with an empty body: no error, and nothing saved.
      const { data, error } = existing
        ? await supabase.from("picks").update(row).eq("id", existing.id).select()
        : await supabase.from("picks").insert(row).select();

      if (error) throw error;
      if (!data || !data.length) {
        throw new Error(existing
          ? "Changing picks is not enabled yet. Your original picks are still in."
          : "Your picks did not save. Try again.");
      }
      setSent(true);
    } catch (e) {
      // The picks stay on screen, so a retry costs nothing.
      setSaveError(e.message || "Something went wrong. Your picks are still here.");
    } finally {
      setSaving(false);
    }
  };

  const topPicked = picked.filter(d => pools.top.includes(d));
  const midPicked = picked.filter(d => pools.mid.includes(d));
  const full = topPicked.length === TOP_PICKS && midPicked.length === MID_PICKS;

  const toggle = (name, inTop) => {
    setPicked(prev => {
      if (prev.includes(name)) {
        setOrder(o => o.filter(x => x !== name));
        return prev.filter(x => x !== name);
      }
      const cap = inTop ? TOP_PICKS : MID_PICKS;
      const same = prev.filter(d => (inTop ? pools.top : pools.mid).includes(d));
      if (same.length >= cap) return prev;
      return [...prev, name];
    });
  };

  const place = (name) => setOrder(o => (o.includes(name) ? o.filter(x => x !== name) : [...o, name]));
  const unplaced = picked.filter(d => !order.includes(d));
  const ready = full && order.length === 5;

  const Group = ({ title, cap, chosen, accent, names, inTop }) => (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
        <p style={{ ...body("bodyMd"), fontSize: 17, color: V.text, margin: 0 }}>{title}</p>
        <p style={{ ...body("bodySm"), color: chosen.length === cap ? V.green : accent, margin: 0 }}>
          {chosen.length} of {cap}
        </p>
      </div>
      <div style={{ display: "grid", gap: 8, marginBottom: 22 }}>
        {names.map(d => (
          <DriverPickRow
            key={d}
            name={d}
            picked={picked.includes(d)}
            muted={!picked.includes(d) && chosen.length >= cap}
            onTap={() => toggle(d, inTop)}
          />
        ))}
      </div>
    </>
  );

  return (
    <>
      <div style={{ ...card({ padding: "20px 18px", marginBottom: 22 }) }}>
        <p style={{ ...body("bodyMd"), fontSize: 21, color: V.text, margin: "0 0 18px" }}>
          This week's driver pool
        </p>
        <Group title="Top drivers" cap={TOP_PICKS} chosen={topPicked} accent={V.gold} names={pools.top} inTop />
        <Group title="Midfield drivers" cap={MID_PICKS} chosen={midPicked} accent={V.silver} names={pools.mid} />
      </div>

      {/* Everything below opens only once all five are in. */}
      <div style={{
        maxHeight: full ? 2000 : 0, opacity: full ? 1 : 0,
        overflow: "hidden",
        transition: "max-height .6s ease, opacity .45s ease",
      }}>
        <div style={{ ...card({ padding: "20px 18px", marginBottom: 22 }) }}>
          <p style={{ ...body("bodyMd"), fontSize: 21, color: V.text, margin: "0 0 6px" }}>Order your drivers</p>
          <p style={{ ...body("body"), fontSize: 16, color: V.text2, margin: "0 0 16px" }}>
            Tap a driver to put them in order, and tap them again in the order to take them back out.
          </p>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {unplaced.map(d => (
              <button key={d} onClick={() => place(d)} style={{
                display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
                padding: "8px 12px 8px 8px", borderRadius: 999,
                background: V.bg3, border: `1px solid ${dColor(d)}55`,
              }}>
                <Face name={d} size={28} ring={dColor(d)} glow={0} />
                <span style={{ ...body("bodySm"), fontSize: 15, color: V.text }}>{lastName(d)}</span>
              </button>
            ))}
            {unplaced.length === 0 && (
              <p style={{ ...body("bodySm"), color: V.green, margin: 0 }}>That's your order.</p>
            )}
          </div>

          <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
            {[0, 1, 2, 3, 4].map(i => {
              const name = order[i];
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 12, minHeight: 58,
                  padding: "8px 12px", borderRadius: 12,
                  background: name ? `${V.blue}12` : V.bg3,
                  border: `1px dashed ${name ? "transparent" : V.border2}`,
                  borderStyle: name ? "solid" : "dashed",
                  borderColor: name ? V.blue : V.border2,
                  transition: "background .25s ease, border-color .25s ease",
                }}>
                  <span style={{ ...numeric("h3"), color: name ? V.blue : V.text3, width: 46, flexShrink: 0 }}>
                    {ordinal(i + 1)}
                  </span>
                  {name ? (
                    <button onClick={() => place(name)} style={{
                      flex: 1, display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                      background: "transparent", border: "none", padding: 0, textAlign: "left",
                    }}>
                      <Face name={name} size={36} ring={dColor(name)} glow={0.6} />
                      <span style={{ ...body("bodyMd"), fontSize: 16, color: V.text }}>{name}</span>
                    </button>
                  ) : (
                    <span style={{ ...body("bodySm"), color: V.text3 }}>Tap a driver above</span>
                  )}
                </div>
              );
            })}
          </div>

        </div>

        <div style={{ ...card({ padding: "20px 18px", marginBottom: 22 }) }}>
          <p style={{ ...body("bodyMd"), fontSize: 21, color: V.text, margin: "0 0 4px" }}>Best finish</p>
          <p style={{ ...body("body"), fontSize: 16, color: V.text2, margin: "0 0 12px" }}>
            Where will your best driver finish this week?
          </p>
          <Wheel options={FINISH_OPTIONS} value={finish} onChange={setFinish} accent={V.blue} depth="flat" />
        </div>

        <div style={{ ...card({ padding: "20px 18px", marginBottom: 22 }), borderColor: `${V.purple}33` }}>
          <p style={{ ...body("bodyMd"), fontSize: 21, color: V.text, margin: "0 0 8px" }}>The Needle</p>
          <p style={{ ...body("body"), fontSize: 16, color: V.text, margin: "0 0 14px", fontWeight: 600 }}>
            This week, we are predicting{" "}
            <span style={{ color: V.purple }}>{boxBox.team}&rsquo;s first pit stop</span>, and your
            team has the <span style={{ color: V.gold }}>{boxBox.side}</span>.
          </p>
          <Wheel options={NEEDLE_OPTIONS} value={needle} onChange={setNeedle}
            format={v => v.toFixed(1)} accent={V.purple}
            tone={v => ((v > needle) === (boxBox.side === "OVER") ? "win" : "lose")} />
          <NeedleExplainer side={boxBox.side} />
        </div>

        <div style={{ marginBottom: 34 }}>
          <NeonBtn
            color={ready ? V.green : V.text3}
            flicker={ready && !sent}
            onClick={() => ready && setReview(true)}
          >
            {sent ? "Picks submitted" : "Submit your picks"}
          </NeonBtn>
          {!ready && (
            <p style={{ ...body("bodySm"), color: V.text3, textAlign: "center", margin: "10px 0 0" }}>
              Put all five drivers in order first.
            </p>
          )}
        </div>
      </div>

      {review && (
        <PickReview
          order={order}
          finish={finish}
          needle={needle}
          sent={sent}
          onBack={() => setReview(false)}
          onSubmit={submit}
          saving={saving}
          error={saveError}
        />
      )}
    </>
  );
}

// ── Submitted, deadline still open ───────────────────────

// The window most people sit in: your entry is in, you can still change those
// picks, and nobody outside your team can see them. PickIntel.jsx:110 gates
// picks on the deadline, so there is nothing of theirs to show yet.
function HomeSubmitted({ onEdit }) {
  const { myPick, matePick, teammate, race, boxBox } = useWeek();
  const [compare, setCompare] = useState(false);
  // A teammate who has not picked yet is the normal case for most of the week,
  // and there is no pick of theirs to read until they do.
  const mate1 = teammate ? teammate.split(" ")[0] : "your teammate";
  const same = matePick ? myPick.order.every((d, i) => matePick.order[i] === d) : false;

  const Row = ({ n, name }) => (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
      borderRadius: 10, background: V.bg3, border: `1px solid ${V.border}`,
    }}>
      <span style={{ ...numeric("h3"), color: V.blue, width: 46, flexShrink: 0 }}>{ordinal(n)}</span>
      <Face name={name} size={30} ring={dColor(name)} glow={0} />
      <span style={{ ...body("bodyMd"), fontSize: 16, color: V.text }}>{name}</span>
    </div>
  );

  return (
    <>
      <div style={{ ...card({ padding: "20px 18px", marginBottom: 22 }), borderColor: `${V.green}33` }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
          <p style={{ ...body("bodyMd"), fontSize: 21, color: V.text, margin: 0 }}>Your picks are in</p>
        </div>
        <p style={{ ...body("body"), fontSize: 16, color: V.text2, margin: "0 0 18px" }}>
          Nobody outside your team sees them until the deadline. You can change them until then.
        </p>

        <div style={{ display: "grid", gap: 6, marginBottom: 16 }}>
          {myPick.order.map((d, i) => <Row key={d} n={i + 1} name={d} />)}
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, padding: "12px 14px", borderRadius: 12, background: V.bg3, border: `1px solid ${V.border}` }}>
            <Label color={V.text3} style={{ marginBottom: 6 }}>Best finish</Label>
            <p style={{ ...numeric("h2"), ...textGlow(V.blue, 0.6), margin: 0 }}>{myPick.bestFinish}</p>
          </div>
          <div style={{ flex: 1, padding: "12px 14px", borderRadius: 12, background: V.bg3, border: `1px solid ${V.border}` }}>
            <Label color={V.text3} style={{ marginBottom: 6 }}>The Needle</Label>
            <p style={{ ...numeric("h2"), ...textGlow(V.purple, 0.6), margin: 0 }}>{myPick.pitGuess.toFixed(1)}s</p>
          </div>
        </div>

        <button onClick={onEdit} style={{
          width: "100%", padding: "13px", borderRadius: 12, cursor: "pointer",
          background: "transparent", border: `1px solid ${V.blue}`,
          ...body("bodyMd"), fontSize: 16, color: V.blue,
        }}>Edit picks</button>
      </div>

      {/* Quiet by design. You two already coordinate; the app just saves a text. */}
      <div style={{ ...card({ padding: "16px 18px", marginBottom: 22 }) }}>
        {matePick ? (
        <>
        <button onClick={() => setCompare(c => !c)} style={{
          display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
          background: "transparent", border: "none", padding: 0, width: "100%",
        }}>
          <span style={{
            ...numeric("h3"), fontSize: 18, color: V.blue, lineHeight: 1,
            transform: compare ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform .2s ease", display: "inline-block",
          }}>&rsaquo;</span>
          <span style={{ ...body("bodyMd"), fontSize: 16, color: V.blue }}>Compare our picks</span>
        </button>

        <div style={{
          maxHeight: compare ? 700 : 0, opacity: compare ? 1 : 0, overflow: "hidden",
          transition: "max-height .4s ease, opacity .3s ease",
        }}>
          <div style={{ paddingTop: 14 }}>
            <p style={{ ...body("body"), color: V.text2, margin: "0 0 14px" }}>
              {same
                ? `You and ${mate1} picked the same five, in the same order.`
                : `You and ${mate1} are not on the same five.`}
            </p>
            <Label color={V.text3} style={{ marginBottom: 8 }}>{mate1}&rsquo;s order</Label>
            <div style={{ display: "grid", gap: 6, marginBottom: 14 }}>
              {matePick.order.map((d, i) => <Row key={d} n={i + 1} name={d} />)}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1, padding: "10px 12px", borderRadius: 10, background: V.bg3, border: `1px solid ${V.border}` }}>
                <Label color={V.text3} style={{ marginBottom: 4 }}>Their best finish</Label>
                <p style={{ ...numeric("h3"), color: V.text, margin: 0 }}>{matePick.bestFinish}</p>
              </div>
              <div style={{ flex: 1, padding: "10px 12px", borderRadius: 10, background: V.bg3, border: `1px solid ${V.border}` }}>
                <Label color={V.text3} style={{ marginBottom: 4 }}>Their Needle</Label>
                <p style={{ ...numeric("h3"), color: V.text, margin: 0 }}>{matePick.pitGuess.toFixed(1)}s</p>
              </div>
            </div>
            <p style={{ ...body("bodySm"), color: V.text3, margin: "12px 0 0" }}>
              Both your guesses go into the BOX BOX line, and your team has the{" "}
              <span style={{ color: V.gold }}>{boxBox.side}</span>.
            </p>
          </div>
        </div>
        </>
        ) : (
          <p style={{ ...body("body"), color: V.text2, margin: 0 }}>
            {mate1} has not picked yet.
          </p>
        )}
      </div>
    </>
  );
}

// ── This week's opponent ─────────────────────────────────

// The big number is the opponent's scoring-average rank out of all 24 teams
// while the second half has no rounds on the board. Once it does, divRank takes
// over and the label under it changes to match.
// The opponent, in the same shape as "your team's season so far" on the team
// standings: logo and name, where they stand, how they score, ten weeks of
// form. Both of their players sit where your teammate does on your own card,
// because on this page they are the two people you are playing.
function OpponentCard() {
  const { opp, oppWeeks = [] } = useWeek();
  if (!opp) return null;
  const DIV = { championship: "Championship Division", second: "Second Division" };
  const last = oppWeeks.slice(-10);
  return (
    <div style={{ ...card({ padding: 16, marginBottom: 22 }), borderColor: `${V.pink}2a` }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {opp.logo
              ? <img src={opp.logo} alt="" style={{ width: 42, height: 42, objectFit: "contain", flexShrink: 0 }} />
              : <TeamBadge name={opp.name} size={42} ring={V.pink} />}
            <p style={{
              ...display("h3"), fontSize: "clamp(17px, 5.1vw, 23px)", lineHeight: 1.3,
              color: V.text, margin: 0,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{opp.name}</p>
          </div>
          <p style={{ ...body("bodySm"), fontSize: 15, color: V.text2, lineHeight: 1.55, margin: "8px 0 0", whiteSpace: "nowrap" }}>
            Overall: <strong style={{ color: V.text }}>P{opp.place}</strong> in {DIV[opp.division] || "the league"}
          </p>
          <p style={{ ...body("bodySm"), fontSize: 15, color: V.text2, lineHeight: 1.55, margin: 0, whiteSpace: "nowrap" }}>
            Scoring average: <strong style={{ color: V.text }}>{ordinal(opp.avgRank)}</strong> ({opp.avg.toFixed(1)})
          </p>
          {last.length > 0 && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 10 }}>
              {last.map((w, i) => {
                const letter = w.won === true ? "W" : w.won === false ? "L" : "D";
                const color = w.won === true ? V.blue : w.won === false ? V.pink : V.silver;
                return (
                  <div key={i} title={`Round ${w.round}`} style={{
                    width: 26, height: 26, borderRadius: 7,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: `1.5px solid ${w.decidedByBoxBox ? color : "transparent"}`,
                    background: w.decidedByBoxBox ? `${color}18` : "transparent",
                    ...display("chip"), fontSize: 15, ...textGlow(color, 0.5),
                  }}>{letter}</div>
                );
              })}
            </div>
          )}

          {/* The two people you are playing, under the run of results rather
              than beside the results, and ranked rather than averaged: in a rank you can see where
              they sit without you having to know what a good average is. */}
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            {opp.players.map(pl => (
              <div key={pl.name} style={{
                flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 9,
                padding: "9px 11px", borderRadius: 12,
                background: V.bg3, border: `1px solid ${V.border}`,
              }}>
                <PlayerBadge name={pl.name} picked={false} dim={false} ring={V.pink}
                             photo={pl.photo} size={34} />
                <div style={{ minWidth: 0 }}>
                  <p style={{
                    ...display("chip"), fontSize: 14, color: V.text, margin: 0,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>{pl.name.split(" ")[0]}</p>
                  <p style={{ ...numeric("chip"), fontSize: 15, ...textGlow(V.pink, 0.5), margin: "1px 0 0" }}>
                    {pl.rank ? ordinal(pl.rank) : "-"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MatchupCard({ compact = false }) {
  const { myTeam, opp, me, teammate } = useWeek();
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
  const { boxBox, race } = useWeek();
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
          <p style={{ ...numeric("h1"), color: V.text, margin: "6px 0 0", fontVariantNumeric: "tabular-nums" }}>{boxBox.line}</p>
        </div>
      </div>
      <p style={{ ...body("body"), color: V.text2, margin: 0 }}>
        {race.pitQuestion} · <span style={{ color: c, fontWeight: 600 }}>{over ? "above" : "below"} {boxBox.line}s</span> · +5 or −1
      </p>
    </div>
  );
}

// ── States B, C and D: locked pre-race, race live, race final ────


// The BOX BOX line, drawn.
//
// The four guesses sit along the needle's own range, 1.5 to 4.5, so you can see
// who pulled the average where. Blue is your side, pink is theirs. The line is
// the mean of the four, which is what the whole thing turns on.
//
// Underneath, each team stands on its side of the boundary with an arrow
// pointing at it: your side wins if the real stop lands there.
function BoxBoxLine({ seats, boxBox, myTeam, opp }) {
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

  const MIN = 1.5, MAX = 4.5, PAD = 22;
  const span = Math.max(0, w - PAD * 2);
  const x = (v) => PAD + ((Math.min(MAX, Math.max(MIN, v)) - MIN) / (MAX - MIN)) * span;

  // Faces pack to the face, so two guesses at the same tenth end up almost
  // touching, which is the truth about them. The plates are what would collide,
  // so they drop a step instead of pushing the faces apart.
  const FACE = 42, GAP = 3, STEP = 45;
  const guessed = seats.filter(s => s.pick && typeof s.pick.pitGuess === "number");

  // One lane, always. Two guesses at the same tenth sit shoulder to shoulder
  // rather than one dropping behind the other: pack right, then push back left
  // off the far edge, which settles a cluster around where it actually is.
  const packed = (() => {
    const a = guessed.map(s => ({ s, want: x(s.pick.pitGuess), px: x(s.pick.pitGuess) }))
      .sort((p, q) => p.want - q.want);
    const step = STEP;
    for (let i = 1; i < a.length; i++) a[i].px = Math.max(a[i].px, a[i - 1].px + step);
    const over = a.length ? a[a.length - 1].px - (w - FACE / 2) : 0;
    if (over > 0) {
      for (let i = a.length - 1; i >= 0; i--) a[i].px -= over;
      for (let i = 1; i < a.length; i++) a[i].px = Math.max(a[i].px, a[i - 1].px + step);
    }
    a.forEach(p => { p.px = Math.max(FACE / 2, p.px); });
    return a;
  })();

  // A plate wider than its slot drops a line rather than shoving the face off
  // the value it belongs to. Each one takes the highest line it fits on, so a
  // run of three in a row alternates instead of piling onto the same step:
  // the old rule asked whether the previous plate had dropped by reading a
  // field that did not exist yet, so the answer was always no and Coolidge and
  // Wong were printed on top of each other.
  const plateW = (s) => Math.max(38, lastName(s.name).length * 6.4 + 16);
  const staggered = (() => {
    const rightOf = [];
    return packed.map(p => {
      const half = plateW(p.s) / 2;
      let lvl = 0;
      while (rightOf[lvl] != null && p.px - half < rightOf[lvl] + 4) lvl++;
      rightOf[lvl] = p.px + half;
      return { ...p, lvl };
    });
  })();
  const levels = staggered.reduce((n, p) => Math.max(n, p.lvl), 0);

  const line = boxBox.line;
  const ours = boxBox.side === "UNDER" ? "left" : "right";
  // Which side the stop actually landed, which is the whole result.
  const stop = boxBox.stop != null ? Math.min(MAX, Math.max(MIN, boxBox.stop)) : null;
  const wonBox = stop != null && line != null &&
    ((stop > line) === (boxBox.side === "OVER"));
  const stopColor = wonBox ? MINE : THEIRS;
  const cColor = F1_TEAM_COLORS[boxBox.team] || V.purple;
  const TICKS = [1.5, 2, 2.5, 3, 3.5, 4, 4.5];
  // The lane grows with the deepest plate, so a crowded week pushes the scale
  // down rather than printing a name over it.
  const LANE = 84 + levels * 20, AXIS = LANE + 18, HEIGHT = AXIS + 50;

  const Marker = ({ dir, color }) => (
    <svg width="40" height="16" style={{ display: "block", overflow: "visible" }}>
      <line x1={dir === "left" ? 38 : 2} y1="8" x2={dir === "left" ? 13 : 27} y2="8"
            stroke={color} strokeWidth="5" strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 5px ${color})` }} />
      <path d={dir === "left" ? "M 2 8 L 13 2 L 13 14 z" : "M 38 8 L 27 2 L 27 14 z"} fill={color}
            style={{ filter: `drop-shadow(0 0 5px ${color})` }} />
    </svg>
  );

  const under = ours === "left" ? myTeam : opp;
  const over = ours === "left" ? opp : myTeam;

  return (
    <div style={{ ...card({ padding: "16px 14px 16px", marginBottom: 18 }), borderColor: `${V.gold}33` }}>
      <div ref={wrap} style={{ position: "relative", height: HEIGHT, minWidth: 0 }}>
        {w > 0 && (
          <>
            <svg width="100%" height={HEIGHT} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
              {/* The scale, so a position on it means something. */}
              <line x1={PAD} y1={AXIS} x2={w - PAD} y2={AXIS}
                    stroke={V.border2} strokeWidth="3" strokeLinecap="round" />
              {TICKS.map(t => (
                <line key={t} x1={x(t)} y1={AXIS - 5} x2={x(t)} y2={AXIS + 5}
                      stroke={V.border2} strokeWidth="2" strokeLinecap="round" />
              ))}
              {/* A guess is joined to the point on the scale it belongs to,
                  since packing moves the face off its own value. */}
              {staggered.map(p => (
                <line key={p.s.id} x1={p.px} y1={LANE - 6} x2={p.want} y2={AXIS - 5}
                      stroke={p.s.ours ? MINE : THEIRS} strokeWidth="2" opacity="0.7" />
              ))}
            </svg>

            {TICKS.map(t => (
              <div key={t} style={{
                position: "absolute", left: x(t) - 16, top: AXIS + 32, width: 32,
                textAlign: "center", ...numeric("chip"), fontSize: 11, color: V.text2,
              }}>{t.toFixed(1)}</div>
            ))}

            {staggered.map(({ s, px, lvl }) => {
              const c = s.ours ? MINE : THEIRS;
              return (
                <div key={s.id} style={{
                  position: "absolute", left: px - FACE / 2, top: 0,
                  width: FACE, textAlign: "center",
                }}>
                  <PlayerBadge name={s.name} picked={false} dim={false} ring={c}
                               photo={s.photo} size={FACE} />
                  <div style={{
                    // The faces stay on one level and the plate is what steps
                    // down, so the row reads as four people at four guesses
                    // rather than two rows of two.
                    marginTop: -6 + lvl * 20, display: "inline-block", position: "relative",
                    padding: "2px 5px", borderRadius: 7, background: "#000",
                    border: `1px solid ${c}`, fontFamily: FD, fontWeight: 700,
                    fontSize: 11, lineHeight: 1.35, color: "#fff", whiteSpace: "nowrap",
                  }}>{lastName(s.name)}</div>
                  <div style={{ ...numeric("chip"), fontSize: 12, color: c, marginTop: 2 }}>
                    {s.pick.pitGuess.toFixed(1)}
                  </div>
                </div>
              );
            })}

            {/* Drawn last so it is drawn over. The line and the stop are the
                whole mechanic, and a name plate is only a label: a marker
                buried behind one says the stop never happened. */}
            <svg width="100%" height={HEIGHT} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
              {/* The guesses sit above the line and the result sits below it,
                  pointing up at where it landed. Above the line there is no
                  clear space: a stop can land under any name plate, and it did
                  here. Below the line nothing lives but the scale. */}
              {stop != null && line != null && (
                <g>
                  <line x1={x(stop)} y1={AXIS - 6} x2={x(stop)} y2={AXIS + 18}
                        stroke={stopColor} strokeWidth="4" strokeLinecap="round"
                        style={{ filter: `drop-shadow(0 0 7px ${stopColor})` }} />
                  <circle cx={x(stop)} cy={AXIS + 22} r="6" fill={stopColor}
                          style={{ filter: `drop-shadow(0 0 7px ${stopColor})` }} />
                </g>
              )}
              {line != null && (
                <line x1={x(line)} y1={AXIS - 16} x2={x(line)} y2={AXIS + 16}
                      stroke={DIVIDE} strokeWidth="5" strokeLinecap="round"
                      style={{ filter: `drop-shadow(0 0 8px ${DIVIDE})` }} />
              )}
            </svg>
          </>
        )}
      </div>

      {/* The number under the line it labels, the two teams either side of it,
          and the arrows outside them running to the ends of the range: your
          side wins anywhere in that direction. */}
      {w > 0 && line != null && (() => {
        const GW = 190, GAP = 8;
        const gl = Math.min(Math.max(x(line) - GW / 2, PAD), Math.max(PAD, w - PAD - GW));
        const Side = ({ t, mine, word }) => (
          <div style={{ textAlign: "center", width: 46 }}>
            {t && t.logo
              ? <img src={t.logo} alt="" style={{ width: 32, height: 32, objectFit: "contain" }} />
              : <div style={{ width: 32, height: 32, borderRadius: 7, margin: "0 auto",
                              background: V.bg3, border: `2px solid ${mine ? MINE : THEIRS}` }} />}
            <div style={{ ...display("chip"), fontSize: 11, color: mine ? MINE : THEIRS, marginTop: 2 }}>
              {word}
            </div>
          </div>
        );
        const arrows = [
          { dir: "left", c: ours === "left" ? MINE : THEIRS, from: gl - GAP, to: PAD },
          { dir: "right", c: ours === "right" ? MINE : THEIRS, from: gl + GW + GAP, to: w - PAD },
        ];
        return (
          <div style={{ position: "relative", height: 56, marginTop: 2 }}>
            <svg width="100%" height="56" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
              {arrows.map(a => (
                <g key={a.dir}>
                  <line x1={a.from} y1="16" x2={a.dir === "left" ? a.to + 11 : a.to - 11} y2="16"
                        stroke={a.c} strokeWidth="5" strokeLinecap="round"
                        style={a.c === THEIRS ? { filter: `drop-shadow(0 0 5px ${a.c})` } : undefined} />
                  <path d={a.dir === "left"
                    ? `M ${a.to} 16 L ${a.to + 12} 9 L ${a.to + 12} 23 z`
                    : `M ${a.to} 16 L ${a.to - 12} 9 L ${a.to - 12} 23 z`}
                    fill={a.c} style={a.c === THEIRS ? { filter: `drop-shadow(0 0 5px ${a.c})` } : undefined} />
                </g>
              ))}
            </svg>
            <div style={{
              position: "absolute", top: 0, left: gl, width: GW,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            }}>
              <Side t={under} mine={ours === "left"} word="UNDER" />
              <div style={{ textAlign: "center" }}>
                <div style={{ ...numeric("h1"), fontSize: 26, ...textGlow(DIVIDE, 0.8), lineHeight: 1 }}>
                  {line.toFixed(2)}
                </div>
                <div style={{ ...display("chip"), fontSize: 10, color: DIVIDE, marginTop: 3,
                              letterSpacing: "0.12em" }}>BOX BOX LINE</div>
              </div>
              <Side t={over} mine={ours === "right"} word="OVER" />
            </div>
          </div>
        );
      })()}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: 6 }}>
        <span style={{ ...body("bodyMd"), fontSize: 15, color: V.text2 }}>
          {/* Mercedes', Williams', Haas'. Everyone else takes 's. No colour
              swatch: a blue mark beside a blue team reads as ownership. */}
          {boxBox.team
            ? `${boxBox.team}${boxBox.team.endsWith("s") ? "\u2019" : "\u2019s"} first pit stop`
            : "The first pit stop"}
        </span>
      </div>
      {stop != null && (
        <p style={{ ...body("bodyMd"), fontSize: 15, color: stopColor, textAlign: "center", margin: "6px 0 0" }}>
          Stopped at {boxBox.stop.toFixed(2)}s. {wonBox ? "Your side." : "Theirs."}
        </p>
      )}
    </div>
  );
}




// The locked and scored screen, in four cards.
//
// One colour rule runs through all of them: green is your side, because green
// means go. Pink is theirs. Blue is only ever a divider, which is why the BOX
// BOX line itself is blue and nothing else is.
//
// And one layout rule: the UNDER team is always on the left, the OVER team
// always on the right. So your green is on the left in a week you have the
// under and on the right in a week you have the over, and the side you are on
// is readable without reading a word.
const MINE = V.green, THEIRS = V.pink, DIVIDE = V.blue;

// Where the BOX BOX points went. It is six of swing and it is already inside
// the two numbers above, so the only question this answers is which team took
// it, and the box is that team's colour.
function BoxBoxScore({ myTeam, opp, bb, under, boxBox }) {
  if (!bb || (bb.mine === 0 && bb.theirs === 0)) return null;
  const mineWon = bb.mine > bb.theirs;
  const c = mineWon ? MINE : THEIRS;
  const left = under === "mine" ? { t: myTeam, v: bb.mine, won: mineWon }
                                : { t: opp, v: bb.theirs, won: !mineWon };
  const right = under === "mine" ? { t: opp, v: bb.theirs, won: !mineWon }
                                 : { t: myTeam, v: bb.mine, won: mineWon };
  const Side = ({ t, v, won, align }) => (
    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 7,
                  justifyContent: align, minWidth: 0 }}>
      <span style={{ ...display("chip"), fontSize: 13, color: V.text2 }}>
        {t ? (t.code || t.short || t.name) : "\u2014"}
      </span>
      <span style={{ ...numeric("chip"), fontSize: 22, color: won ? c : V.text2,
                     ...(won ? textGlow(c, 0.9) : {}) }}>
        {v > 0 ? `+${v}` : v < 0 ? `\u2212${Math.abs(v)}` : v}
      </span>
    </div>
  );
  // The line and the stop, on the scale they were called against. Nothing else
  // goes in here: the full card lower down is where the guesses and the teams
  // live, and this is only the two numbers that decided it.
  const MIN = 1.5, MAX = 4.5;
  const pct = (v) => ((Math.min(MAX, Math.max(MIN, v)) - MIN) / (MAX - MIN)) * 100;
  const TICKS = [1.5, 2, 2.5, 3, 3.5, 4, 4.5];
  const line = boxBox && boxBox.line, stop = boxBox && boxBox.stop;
  const Tick = ({ v, color, wide }) => (
    <div style={{
      position: "absolute", left: `${pct(v)}%`, top: wide ? 0 : 4,
      width: wide ? 4 : 2, height: wide ? 16 : 8, marginLeft: wide ? -2 : -1,
      borderRadius: 2, background: color,
      ...(wide ? { boxShadow: `0 0 6px ${color}` } : {}),
    }} />
  );
  // Clamped, so a stop out on the 4.5 end keeps its number inside the box.
  const Value = ({ v, text, color }) => (
    <div style={{
      position: "absolute", top: 18, width: 44, textAlign: "center",
      left: `clamp(0px, calc(${pct(v)}% - 22px), calc(100% - 44px))`,
      ...numeric("chip"), fontSize: 12, color,
    }}>{text}</div>
  );

  return (
    <div style={{
      padding: "9px 14px 10px", marginBottom: 14,
      borderRadius: 14, background: `${c}14`, border: `2px solid ${c}`,
    }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <Side {...left} align="flex-start" />
        <span style={{ ...display("chip"), fontSize: 12, color: c,
                       letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Box box
        </span>
        <Side {...right} align="flex-end" />
      </div>
      {line != null && stop != null && (
        <div style={{ position: "relative", height: 32, margin: "8px 4px 0" }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 7,
                        height: 2, borderRadius: 2, background: V.border2 }} />
          {TICKS.map(t => <Tick key={t} v={t} color={V.border2} />)}
          <Tick v={line} color={DIVIDE} wide />
          <Tick v={stop} color={c} wide />
          <Value v={line} text={line.toFixed(2)} color={DIVIDE} />
          <Value v={stop} text={stop.toFixed(2)} color={c} />
        </div>
      )}
    </div>
  );
}

// The two teams and where the week stands.
function Scoreboard({ myTeam, opp, mineTotal, theirTotal, under, scored = true }) {
  // Only the team in front glows. Green on its own is the resting state, so a
  // lit card means something happened rather than "this one is yours".
  const Card = ({ t, total, c, side, won }) => (
    <div style={{
      flex: 1, minWidth: 0, textAlign: "center", padding: "14px 10px",
      borderRadius: 14, background: V.bg3, border: `2px solid ${c}`,
      ...(won ? edgeGlow(c, 0.9) : {}),
    }}>
      {t && t.logo
        ? <img src={t.logo} alt="" style={{ width: 46, height: 46, objectFit: "contain" }} />
        : <div style={{ width: 46, height: 46, borderRadius: 10, margin: "0 auto",
                        background: V.bg2, border: `2px solid ${c}` }} />}
      {/* The type stays put and the name gives way. Anything longer than
          "Cal Aggie Racing" drops to the short name teams.js already keeps for
          tight spots, which is a name the team answers to rather than a
          truncation or a size nobody else on the screen is set in. */}
      <div style={{
        ...display("h3"), fontSize: 16, color: V.text, marginTop: 6,
        lineHeight: 1.25, whiteSpace: "nowrap",
      }}>{!t ? "\u2014" : t.name.length > 16 && t.short ? t.short : t.name}</div>
      <div style={{ ...display("chip"), fontSize: 11, color: c, marginTop: 2 }}>{side}</div>
      <div style={{ ...numeric("hero"), fontSize: 44, color: scored ? c : V.text3,
                    marginTop: 6, ...(won ? textGlow(c, 0.9) : {}) }}>
        {scored ? total : "\u2013"}
      </div>
    </div>
  );
  // Nothing is won before it is scored, so nothing lights up.
  const mineWon = scored && mineTotal > theirTotal, theirsWon = scored && theirTotal > mineTotal;
  const left = under === "mine"
    ? { t: myTeam, total: mineTotal, c: MINE, side: "UNDER", won: mineWon }
    : { t: opp, total: theirTotal, c: THEIRS, side: "UNDER", won: theirsWon };
  const right = under === "mine"
    ? { t: opp, total: theirTotal, c: THEIRS, side: "OVER", won: theirsWon }
    : { t: myTeam, total: mineTotal, c: MINE, side: "OVER", won: mineWon };
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
      <Card {...left} /><Card {...right} />
    </div>
  );
}

// Who you want, and which way you want the stop to go.
function RootingCard({ seats, boxBox }) {
  const [open, setOpen] = useState(true);
  const mineHas = {}, theirsHas = {};
  seats.forEach(s => (s.pick ? s.pick.order : []).forEach(d => {
    const bag = s.ours ? mineHas : theirsHas;
    bag[d] = (bag[d] || 0) + 1;
  }));
  const forUs = Object.keys(mineHas).filter(d => (mineHas[d] || 0) > (theirsHas[d] || 0));
  const against = Object.keys(theirsHas).filter(d => (theirsHas[d] || 0) > (mineHas[d] || 0));

  const Strip = ({ names, c }) => (
    // Wraps rather than scrolls. A third face off the right edge is a rooting
    // interest nobody knows they have.
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, rowGap: 10, padding: "2px 0" }}>
      {names.length === 0
        ? <span style={{ ...body("bodySm"), color: V.text2 }}>Nobody</span>
        : names.map(n => (
          <div key={n} style={{ textAlign: "center", flexShrink: 0, width: 52 }}>
            <Face name={n} size={48} ring={c} edge={3} glow={c === THEIRS ? 1 : 0} />
            <div style={{
              marginTop: -6, display: "inline-block", position: "relative",
              padding: "2px 5px", borderRadius: 7, background: "#000", border: `1px solid ${c}`,
              fontFamily: FD, fontWeight: 700, fontSize: 10, lineHeight: 1.35, color: "#fff",
              whiteSpace: "nowrap",
            }}>{lastName(n)}</div>
          </div>
        ))}
    </div>
  );

  return (
    <div style={{ ...card({ padding: "14px 14px 16px", marginBottom: 14 }) }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: "flex", alignItems: "center", gap: 8, width: "100%",
        background: "transparent", border: "none", cursor: "pointer", padding: 0,
      }}>
        <span style={{
          ...numeric("h3"), fontSize: 17, color: MINE, lineHeight: 1,
          transform: open ? "rotate(90deg)" : "none", transition: "transform .2s ease",
          display: "inline-block",
        }}>&rsaquo;</span>
        <Label color={MINE}>Rooting interests</Label>
      </button>
      <div style={{
        maxHeight: open ? 900 : 0, opacity: open ? 1 : 0, overflow: "hidden",
        transition: "max-height .4s ease, opacity .3s ease",
      }}>
        <div style={{ paddingTop: 12, display: "flex", gap: 12 }}>
          {/* Your side on the left, theirs on the right, the same way every
              other card on this screen is arranged. */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <Label color={MINE} style={{ fontSize: 11, marginBottom: 6 }}>Root for</Label>
            <Strip names={forUs} c={MINE} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Label color={THEIRS} style={{ fontSize: 11, marginBottom: 6 }}>Root against</Label>
            <Strip names={against} c={THEIRS} />
          </div>
        </div>
        <div>
          {boxBox.line != null && (
            <p style={{ ...body("body"), color: V.text, margin: "14px 0 0" }}>
              And you want the stop{" "}
              <span style={{ color: MINE, fontWeight: 700 }}>
                {boxBox.side === "UNDER" ? "under" : "over"} {boxBox.line.toFixed(2)}
              </span>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// The four hands, scored.
//
// Players across, their five down, and the week's points under each name. The
// score rows share a label column down the middle, so a number on the left is
// read against the number on the right without a legend.
//
// UNDER on the left, OVER on the right, always.
function HandsColumns({ seats, under, driverPts = {}, scored = true }) {
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
        // Once the week is scored, what he paid goes on his face. Same size as
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


// Four hands, five drivers each, in the order that player put them.
//
// Row one is you, row two your teammate, rows three and four the other team.
// A driver on more than one card is joined by a line through every place he
// appears, and the colour is who owns him:
//
//   your side has more   blue, lit
//   their side has more  pink, lit
//   level                grey, and it sits behind everything
//
// Back to front: grey lines, grey drivers, pink lines, blue lines, then the
// blue and pink drivers on top. So a contested driver is never buried under a
// line for a driver nobody is fighting over.
function HandsBoard({ seats }) {

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

  const hands = seats.slice(0, 4);
  // Everything scales off the measured width. On a phone the column is the
  // phone; on anything wider there is room for bigger faces and a bigger name,
  // and shrinking them to match the narrowest case wastes it.
  const big = w >= 430;
  const LABEL = big ? 66 : 58;
  const FACE = big ? 50 : 42;
  const ROW = big ? 90 : 78;
  const PLATE = big ? 12 : 10;
  const EDGE = big ? 4 : 3;
  const cols = 5;
  const cellW = w > LABEL ? (w - LABEL) / cols : 0;
  const cx = (c) => LABEL + cellW * (c + 0.5);
  const cy = (r) => ROW * r + ROW / 2;
  const height = ROW * hands.length;

  // Where each driver sits, and who owns him.
  const spots = {};
  hands.forEach((h, r) => {
    const order = h.pick ? h.pick.order : [];
    order.slice(0, cols).forEach((name, c) => {
      (spots[name] ||= []).push({ r, c, ours: h.ours });
    });
  });
  const tone = (name) => {
    const at = spots[name] || [];
    const mine = at.filter(p => p.ours).length;
    const theirs = at.length - mine;
    return mine > theirs ? "mine" : theirs > mine ? "theirs" : "level";
  };
  const COLOR = { mine: V.blue, theirs: V.pink, level: V.text2 };

  const lines = Object.entries(spots)
    .filter(([, at]) => at.length > 1)
    .map(([name, at]) => ({
      name, t: tone(name),
      d: at.slice().sort((a, b) => a.r - b.r).map(p => `${cx(p.c)},${cy(p.r)}`).join(" "),
    }));

  const Layer = ({ which, z }) => (
    <svg width="100%" height={height} style={{ position: "absolute", inset: 0, zIndex: z, pointerEvents: "none" }}>
      {lines.filter(l => l.t === which).map(l => (
        <polyline key={l.name} points={l.d} fill="none"
          stroke={COLOR[which]} strokeWidth={which === "level" ? (big ? 4 : 3.5) : (big ? 6 : 5)}
          strokeLinecap="round" strokeLinejoin="round"
          opacity={which === "level" ? 0.5 : 1}
          style={which === "level" ? undefined : { filter: `drop-shadow(0 0 6px ${COLOR[which]})` }} />
      ))}
    </svg>
  );

  const Drivers = ({ which, z }) => (
    <div style={{ position: "absolute", inset: 0, zIndex: z, pointerEvents: "none" }}>
      {hands.flatMap((h, r) => {
        const order = h.pick ? h.pick.order : [];
        return order.slice(0, cols).map((name, c) => {
          const t = tone(name);
          if (which === "level" ? t !== "level" : t === "level") return null;
          return (
            <div key={`${r}-${c}`} style={{
              position: "absolute", left: cx(c) - FACE / 2, top: cy(r) - FACE / 2 - 7,
              width: FACE, height: FACE,
            }}>
              {/* Level drivers are drained: nobody is fighting over them, and a
                  full-colour face says the opposite. */}
              <Face name={name} size={FACE} ring={COLOR[t]} edge={EDGE}
                    glow={t === "level" ? 0 : 1.1} drained={t === "level"} />
              {/* The name plate is the top layer, so it is never crossed by a
                  line. Black behind it for the same reason. */}
              <div style={{
                position: "absolute", left: "50%", top: FACE - 5, transform: "translateX(-50%)",
                // A plate may run a little wider than its cell. It is the top
                // layer, so a name is never sitting under a neighbour, and
                // "Verstappen" whole beats "Verst..." tidy.
                maxWidth: Math.max(56, cellW + 13),
                padding: big ? "3px 7px" : "2px 5px", borderRadius: 7, background: "#000",
                border: `1px solid ${t === "level" ? V.border : COLOR[t]}`,
                fontFamily: FD, fontWeight: 700, fontSize: PLATE, lineHeight: 1.35,
                color: t === "level" ? V.text2 : "#fff",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                textAlign: "center",
              }}>{lastName(name)}</div>
            </div>
          );
        });
      })}
    </div>
  );

  return (
    <div style={{ ...card({ padding: "14px 12px", marginBottom: 18 }) }}>
      <Label color={V.blue} style={{ marginBottom: 10 }}>The four hands</Label>
      <div ref={wrap} style={{ position: "relative", height, minWidth: 0 }}>
        {/* Row labels sit under everything and never move. */}
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          {hands.map((h, r) => (
            <div key={h.id} style={{
              position: "absolute", left: 0, top: cy(r) - 16, width: LABEL - 8,
              display: "flex", flexDirection: "column", justifyContent: "center",
            }}>
              <span style={{
                ...display("chip"), fontSize: big ? 15 : 13, lineHeight: 1.2,
                color: h.mine ? V.blue : h.ours ? V.text : V.text2,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>{h.mine ? "You" : h.name.split(" ")[0]}</span>
              <span style={{ ...body("bodySm"), fontSize: 11, color: V.text2, whiteSpace: "nowrap" }}>
                {h.pick ? `${h.pick.bestFinish} · ${h.pick.pitGuess.toFixed(1)}s` : "no picks"}
              </span>
            </div>
          ))}
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

      <div style={{ display: "flex", gap: 14, marginTop: 12, flexWrap: "wrap" }}>
        {[["You have more", V.blue], ["They have more", V.pink], ["Level", V.text2]].map(([t, c]) => (
          <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 16, height: 3, borderRadius: 2, background: c }} />
            <span style={{ ...body("bodySm"), fontSize: 13, color: V.text2 }}>{t}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// Locked: the deadline has gone and the race has not run.
//
// Everything on it exists without a running order, which is the point: this is
// the state the app is in for two days every week, and it cannot depend on live
// timing that may not be reachable.
//
// Three ways a week arrives here, and the screen has to say which:
//   you did not pick        nothing of yours to show, and nothing to be done
//   someone else is missing the line is an average, so the number can still move
//   all four are in         the line is final and the week is set
function HomeLocked({ scored: scoredWeek = true }) {
  const week = useWeek();
  const { race, seats = [], boxBox, myTeam, opp } = week;
  const mine = seats.filter(s => s.ours);
  const theirs = seats.filter(s => !s.ours);
  const you = seats.find(s => s.mine);
  const missed = you && !you.picked;
  const waiting = boxBox.waitingOn;

  const Pick = ({ seat }) => (
    <div style={{
      padding: "11px 13px", borderRadius: 12, marginBottom: 8,
      background: seat.mine ? "rgba(0,217,255,0.07)" : V.bg3,
      border: `1px solid ${seat.mine ? V.blue : V.border}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: seat.pick ? 9 : 0 }}>
        <PlayerBadge name={seat.name} picked={seat.picked} dim={!seat.picked}
                     photo={seat.photo} size={30} />
        <span style={{ ...body("bodyMd"), fontSize: 16, color: seat.mine ? V.blue : V.text }}>
          {seat.name}
        </span>
        {!seat.picked && (
          <span style={{ ...display("chip"), fontSize: 13, color: V.pink, marginLeft: "auto" }}>
            No picks
          </span>
        )}
      </div>
      {seat.pick && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {seat.pick.order.map((d, i) => (
              <span key={d} style={{
                padding: "4px 8px", borderRadius: 100, background: V.bg2,
                border: `1px solid ${i === 0 ? V.gold : V.border}`,
                ...display("chip"), fontSize: 13, color: i === 0 ? V.gold : V.text2,
              }}>{i + 1}. {d.split(" ").slice(-1)[0]}</span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
            <span style={{ ...body("bodySm"), fontSize: 14, color: V.text2 }}>
              Best finish <strong style={{ color: V.text }}>{seat.pick.bestFinish}</strong>
            </span>
            <span style={{ ...body("bodySm"), fontSize: 14, color: V.text2 }}>
              Needle <strong style={{ color: V.text }}>{seat.pick.pitGuess.toFixed(1)}s</strong>
            </span>
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      <Marquee
        race={race}
        // Locked is already said twice above: the chips read PICKS IN and the
        // lights are green. What nobody knows yet is when the thing runs.
        status={{ text: raceTimePT(race.round) || "Picks are locked", color: V.gold }}
        players={mine.map(s => ({ name: s.name, picked: s.picked }))}
      />

      {missed && (
        <div style={{ ...card({ padding: 16, marginBottom: 18 }), ...edgeGlow(V.pink, 0.7) }}>
          <p style={{ ...display("h3"), color: V.pink, margin: 0 }}>You did not get picks in</p>
          <p style={{ ...body("body"), color: V.text2, margin: "8px 0 0" }}>
            The deadline has gone, so this week scores you nothing. Everything below is
            what the rest of the matchup is running.
          </p>
        </div>
      )}

      {(() => {
        // Scored is one fact about the week, asked once. It used to be worked
        // out seven times over from whether some piece of data happened to be
        // there, and one of those decided whether the race had run by checking
        // whether a points value was zero.
        const scored = scoredWeek;
        const bb = week.teamBoxBox || { mine: 0, theirs: 0 };
        const tot = (ours) => seats.filter(s => s.ours === ours)
          .reduce((a, s) => a + (s.score ? s.score.total : 0), 0)
          + (ours ? bb.mine : bb.theirs);
        const under = boxBox.side === "UNDER" ? "mine" : "theirs";
        return (
          <>
            <Scoreboard myTeam={myTeam} opp={opp} under={under} scored={scored}
                        mineTotal={tot(true)} theirTotal={tot(false)} />
            {scored && <BoxBoxScore myTeam={myTeam} opp={opp} bb={bb} under={under} boxBox={boxBox} />}
            <HandsColumns seats={seats} under={under} scored={scored}
                          driverPts={week.driverPts || {}} />
            <BoxBoxLine seats={seats} boxBox={boxBox} myTeam={myTeam} opp={opp} />
            <RootingCard seats={seats} boxBox={boxBox} />
          </>
        );
      })()}

    </>
  );
}


function RootingBoard({ order, live, lapInfo, settled = false }) {
  const { myTeam, opp, boxBox } = useWeek();
  const boxSide = boxBox.side;
  // Before lights out nothing has pitted; during the race the snapshot has it.
  const pitted = settled ? true : live ? lapInfo.alpineStopped : false;
  const { rows, totalMine, totalTheirs } = readBoard(order);
  const winning = totalMine > totalTheirs;
  const margin = Math.abs(totalMine - totalTheirs);

  // A value cell reads as a lit dot at a glance and as a number on inspection.
  // The ring count is the pick count: one ring means one teammate has him, two
  // concentric rings mean both do and he scores twice. Two real nested elements
  // rather than stacked box-shadows, so the gap shows the row's own background
  // instead of an approximation. "both" keeps the number but drops the
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
            {settled ? "Final" : live ? `Live · lap ${lapInfo.lap} of ${SNAP.totalLaps}` : "Championship order"}
          </Label>
          {(live || settled) && <span style={{ marginLeft: "auto" }}><Chip color={V.amber}>Mock</Chip></span>}
        </div>

        <Label color={V.text3}>{settled ? "Result" : live ? "If this holds" : "If the season order holds"}</Label>

        {/* Box Box on the left, team totals on the right, sitting over the same
            two columns the driver values run down. */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, margin: "12px 0 0" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Label color={V.gold}>Box Box</Label>
            <div style={{ display: "flex", alignItems: "baseline", gap: 9, margin: "5px 0 0" }}>
              <p style={{ ...numeric("h1"), color: V.text, margin: 0, fontVariantNumeric: "tabular-nums" }}>{boxBox.line}</p>
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
        {settled
          ? "Below are the finishing positions."
          : "Below is the championship as it stands. The grid replaces it once qualifying is in."}
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
              // Five or six faces in half a phone's width runs off the edge. It
              // scrolls sideways rather than shrinking them: these are the
              // drivers the week turns on and they have to stay recognisable.
              <div className="v-scroll" style={{
                display: "flex", justifyContent: "flex-start", gap: 9,
                overflowX: "auto", padding: "0 2px",
                scrollbarWidth: "none",
              }}>
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
export default function VegasHome({ onNavigate, currentUser, week: given, initialTab = "home", initialState = null, initialLap = 0 }) {
  // A week can be handed in. scripts/smoke.jsx does that to render every state
  // server-side, which it cannot do against a database.
  // ?demo=locked|waiting|missed renders the locked screen on made-up data. It
  // does not treat the real week as locked, because that would show everyone
  // their opponents' picks before the deadline.
  // The smoke test renders this through react-dom/server, where there is no
  // window at all.
  const q = typeof window === "undefined" ? null : new URLSearchParams(window.location.search);
  const kind = q ? q.get("demo") : null;
  // ?demo=r11 is the same screen on a week that actually happened: real logos,
  // real faces, the picks people made and the points they scored.
  const pinned = /^r\d+$/.test(kind || "") ? Number((kind || "").slice(1)) : null;
  const demo = ["all", "waiting", "missed", "pending"].includes(kind) ? lockedDemo(kind) : null;
  const loaded = useLeague(given || demo ? null : currentUser, { round: pinned });
  const week = given || demo || loaded;

  // The page triples in height the moment the week arrives. Whatever the
  // scroll position was against the short version is meaningless against the
  // tall one, so it goes back to the top when the content is actually there.
  useEffect(() => {
    if (!week.loading) window.scrollTo(0, 0);
  }, [week.loading]);
  const [tab, setTab] = useState(initialTab);
  const [lapIdx, setLapIdx] = useState(initialLap);

  // The state is the week, not a control. Before the deadline it is whether the
  // picks are in; after the deadline, they are locked. Live and final need a running
  // order, which has no source yet, so nothing reaches them.
  // locked is the deadline having gone; final is the race having been run and
  // scored. They render the same screen, because they are the same week at two
  // moments, but they are not the same state and the screen asks which.
  const locked = pinned || week.locked;
  const state = initialState
    || (locked ? (week.scored ? "final" : "locked")
      : week.picksIn && week.picksIn.me ? "submitted" : "open");
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

  if (week.loading || week.error) return (
    <div style={{ background: V.bg, minHeight: "100vh", padding: "40px 18px" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Encode+Sans+Semi+Condensed:wght@400;600;700&display=swap');`}</style>
      <p style={{ ...body("body"), color: V.text2 }}>{week.error ? "This week did not load." : "Loading"}</p>
    </div>
  );

  return (
    <Week.Provider value={week}>
    <div style={{ background: V.bg, minHeight: "100vh" }}>
      {/* The faces load with the page. This used to come from a branch in
          App.jsx that rendered VegasHome outside the shell; when it became a
          tab the import went with the branch, and FM fell back to the browser's cursive,
          which is why the race name turned into handwriting. */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Monoton&family=Encode+Sans+Semi+Condensed:wght@400;600;700&family=Chakra+Petch:wght@600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');`}</style>
      <style>{VEGAS_CSS}</style>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "18px 18px 60px" }}>

        {tab === "kit" ? <NeonKit /> : (
          state === "open" || state === "submitted"
            ? <HomeOpen onNav={nav} submitted={state === "submitted"} />
            : <HomeLocked scored={state === "final"} />
        )}
      </div>
    </div>
    </Week.Provider>
  );
}
