// The sleeve for "F5 Theme Song featuring Tubey the Worm". No artwork exists,
// so the deck draws one, the way the Paddock draws Velvet Thunder's. Four
// options, drawn 2026-09-13 for Andrew to choose between; `TUBEY_COVER` in
// Weekly.jsx is the one that runs and `?cover=` swaps it for a look.
//
// Tubey is HomeworkTubes.com's mascot, banned from speaking after a
// de-escalation incident. Every option is one square SVG on a 200 unit grid,
// colours off theme.vegas.js. The only words on a sleeve are the title, and
// the title is set large, because the cover lands around 120px on a phone.
import { V, FM, FD, FN } from "./theme.vegas";

export const COVERS = ["neon", "notebook", "advisory", "grid"];
export const COVER_NAMES = {
  neon: "Neon",
  notebook: "Homework",
  advisory: "Explicit",
  grid: "Grid",
};

// The worm: one fat stroke with its rings cut in by a dashed stroke over the top,
// and a face at the end of the path. `d` is the body, `head` where it ends.
function Worm({ d, head, color, ring, eye = V.text, pupil = V.bg, shades = false, width = 22, glow }) {
  const [hx, hy] = head;
  return (
    <g style={glow ? { filter: `drop-shadow(0 0 6px ${color})` } : undefined}>
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" />
      <path d={d} fill="none" stroke={ring} strokeWidth={width} strokeLinecap="butt"
        strokeDasharray="1.6 11" opacity="0.55" />
      <circle cx={hx} cy={hy} r={width * 0.78} fill={color} />
      {shades ? (
        <g>
          <rect x={hx - 15} y={hy - 7} width="13" height="8" rx="2.5" fill={V.bg} />
          <rect x={hx + 2} y={hy - 7} width="13" height="8" rx="2.5" fill={V.bg} />
          <path d={`M${hx - 2} ${hy - 4} h4`} stroke={V.bg} strokeWidth="2" />
        </g>
      ) : (
        <g>
          <circle cx={hx - 6} cy={hy - 4} r="4.6" fill={eye} />
          <circle cx={hx + 6} cy={hy - 4} r="4.6" fill={eye} />
          <circle cx={hx - 5} cy={hy - 3.4} r="2.2" fill={pupil} />
          <circle cx={hx + 7} cy={hy - 3.4} r="2.2" fill={pupil} />
        </g>
      )}
      {/* The mouth, shut. He is not allowed to speak. */}
      <path d={`M${hx - 6} ${hy + 7} h12`} stroke={ring} strokeWidth="2.4" strokeLinecap="round" />
    </g>
  );
}

function Neon() {
  return (
    <>
      <rect width="200" height="200" fill={V.bg} />
      <circle cx="100" cy="112" r="66" fill="none" stroke={V.pink} strokeWidth="5"
        style={{ filter: `drop-shadow(0 0 7px ${V.pink})` }} />
      <Worm d="M52 150 C 70 110, 92 170, 110 128 S 136 96, 142 104" head={[146, 100]}
        color={V.green} ring={V.bg} glow />
      <text x="100" y="40" textAnchor="middle" fontFamily={FM} fontSize="34" fill={V.blue}
        style={{ filter: `drop-shadow(0 0 5px ${V.blue})` }}>TUBEY</text>
    </>
  );
}

function Notebook() {
  const lines = Array.from({ length: 9 }, (_, i) => 30 + i * 20);
  return (
    <>
      <rect width="200" height="200" fill={V.text} />
      {lines.map(y => <path key={y} d={`M0 ${y} H200`} stroke={V.blue} strokeWidth="1.2" opacity="0.55" />)}
      <path d="M34 0 V200" stroke={V.pink} strokeWidth="2" />
      {/* The tube, on its side, with Tubey coming out of the open end. */}
      <g transform="rotate(-18 120 150)">
        <rect x="96" y="132" width="96" height="36" rx="18" fill={V.blue} opacity="0.28" />
        <rect x="96" y="132" width="96" height="36" rx="18" fill="none" stroke={V.bg} strokeWidth="3" />
        <path d="M104 140 h70" stroke={V.text} strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      </g>
      <Worm d="M104 146 C 84 150, 70 128, 82 112 S 70 88, 58 96" head={[54, 92]}
        color={V.pink} ring={V.bg} />
      <text x="116" y="62" textAnchor="middle" fontFamily={FD} fontWeight="700" fontSize="36"
        fill={V.bg} transform="rotate(-4 116 62)">TUBEY</text>
    </>
  );
}

function Advisory() {
  return (
    <>
      <defs>
        <linearGradient id="tubey-adv" x1="0" y1="0" x2="1" y2="1">
          {/* Dark behind the title, so the white clears 4.5:1; the purple
              is down where only the worm sits. */}
          <stop offset="0.25" stopColor={V.bg} />
          <stop offset="1" stopColor={V.purple} />
        </linearGradient>
      </defs>
      <rect width="200" height="200" fill="url(#tubey-adv)" />
      <Worm d="M36 176 C 40 130, 96 150, 96 112 S 112 70, 120 74" head={[124, 70]}
        color={V.amber} ring={V.bg} shades width={24} />
      <text x="16" y="44" fontFamily={FD} fontWeight="700" fontSize="40" fill={V.text}
        letterSpacing="1">TUBEY</text>
      {/* The sticker. Black and white, like the real one, and too big to miss. */}
      <rect x="112" y="150" width="78" height="40" fill={V.text} />
      <rect x="115" y="153" width="72" height="34" fill={V.bg} />
      <text x="151" y="177" textAnchor="middle" fontFamily={FD} fontWeight="700" fontSize="20"
        fill={V.text}>WORM</text>
    </>
  );
}

function Grid() {
  const sq = 14;
  const flag = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 15; c++) {
    if ((r + c) % 2 === 0) flag.push(<rect key={`${r}-${c}`} x={c * sq} y={158 + r * sq} width={sq} height={sq} fill={V.text} />);
  }
  return (
    <>
      <rect width="200" height="200" fill={V.bg2} />
      <rect y="158" width="200" height="42" fill={V.bg} />
      {flag}
      {/* The racing line, and Tubey on it. */}
      <path d="M-10 140 C 50 60, 150 170, 214 70" fill="none" stroke={V.text3} strokeWidth="30" />
      <path d="M-10 140 C 50 60, 150 170, 214 70" fill="none" stroke={V.text} strokeWidth="2"
        strokeDasharray="10 10" opacity="0.6" />
      <Worm d="M58 108 C 80 96, 104 124, 126 118" head={[132, 114]}
        color={V.pink} ring={V.bg} />
      <text x="100" y="48" textAnchor="middle" fontFamily={FN} fontWeight="700" fontSize="40"
        fontStyle="italic" fill={V.amber} letterSpacing="2">TUBEY</text>
    </>
  );
}

const ART = { neon: Neon, notebook: Notebook, advisory: Advisory, grid: Grid };

export default function TubeyCover({ variant = "neon", size = 120, style }) {
  const Art = ART[variant] || Neon;
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" role="img"
      aria-label="Album cover: F5 Theme Song featuring Tubey the Worm"
      style={{ display: "block", borderRadius: 8, flex: "none", ...style }}>
      <Art />
    </svg>
  );
}
