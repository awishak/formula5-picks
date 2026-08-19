import { V, FD } from "./theme.vegas";

// The bottom nav, on the Vegas look.
//
// Still five F1 starting lights, because that is what the app has always been
// and 48 people have the positions in their thumbs mid-season. Same five slots
// in the same order; the names and the colour are what changed.
//
// Colour follows the house rules: blue is normal, green is good to go, pink
// needs attention. So the middle light is not just a tab, it is the answer to
// "have I done my picks this week" from anywhere in the app.
//
//   picks in       green
//   picks not in   pink, and it pulses
//   any other tab  blue when you are on it, grey when you are not
const TABS = [
  { id: "home", label: "More" },
  { id: "player-standings", label: "Players" },
  { id: "picks", label: "Picks", middle: true },
  { id: "team-standings", label: "Teams" },
  { id: "schedule", label: "Schedule" },
];

function Light({ color, lit, big, pulse }) {
  const size = big ? 26 : 20;
  return (
    <div className={pulse ? "v-pulse" : undefined} style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: lit
        ? `radial-gradient(circle at 38% 32%, #fff 0%, ${color} 45%, ${color}90 100%)`
        : "radial-gradient(circle at 38% 32%, #3a3a48 0%, #23232f 60%, #14141c 100%)",
      border: `1.5px solid ${lit ? color : "rgba(255,255,255,0.10)"}`,
      boxShadow: lit ? `0 0 8px ${color}, 0 0 20px ${color}70` : "none",
      transition: "box-shadow .2s ease, background .2s ease",
    }} />
  );
}

export default function VegasNav({ active, onChange, hasSubmittedPicks }) {
  return (
    <>
      <style>{`.vnav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);
        width:100%;max-width:480px;z-index:100;
        background:${V.bg2};border-top:1px solid ${V.border2};
        box-shadow:0 -8px 26px rgba(0,0,0,0.55);
        display:flex;justify-content:space-around;align-items:flex-start;
        padding:9px 2px max(9px,env(safe-area-inset-bottom));}`}</style>
      <div className="vnav">
        {TABS.map(t => {
          const on = active === t.id;
          // The middle light reports the week, not the route.
          const color = t.middle
            ? (hasSubmittedPicks ? V.green : V.pink)
            : V.blue;
          const lit = t.middle || on;
          return (
            <button key={t.id} onClick={() => onChange(t.id)} style={{
              flex: 1, minWidth: 0, display: "flex", flexDirection: "column",
              alignItems: "center", gap: 5, padding: "2px 0 0",
              background: "none", border: "none", cursor: "pointer",
            }}>
              <Light color={color} lit={lit} big={t.middle}
                     pulse={t.middle && !hasSubmittedPicks} />
              {/* No glow on the label. Neon bloom on 14px uppercase turns the
                  letterforms to mush, and the glow already has somewhere to
                  live: the light above it. The text stays flat and bright, and
                  the inactive ones sit at text2 rather than the dimmest step,
                  because a nav label is a target, not a caption. */}
              <span style={{
                fontFamily: FD, fontWeight: on || t.middle ? 700 : 600,
                // Five labels across a 320px phone is what sets the ceiling.
                // The tracking is off for the same reason.
                fontSize: "clamp(13px, 3.9vw, 15px)",
                lineHeight: 1.2, letterSpacing: "0.02em", textTransform: "uppercase",
                whiteSpace: "nowrap",
                color: on || t.middle ? color : V.text2,
              }}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
