// The motion pieces that need a component: a canvas, an SVG, or a little
// state. The CSS and the pure helpers are in src/motion.js. Nothing in here
// computes a score; each one draws a number it is handed.
import { useEffect, useRef, useState } from "react";
import { V, FN } from "./theme.vegas";
import { burst, tone } from "./motion.js";

const still = () => typeof window !== "undefined" && window.matchMedia
  && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Neon confetti out of a result. Fills its parent, which must be positioned.
export function Confetti({ sound = true }) {
  const ref = useRef(null);
  useEffect(() => {
    if (still() || !ref.current) return;
    const t = setTimeout(() => { burst(ref.current); if (sound) tone("win"); }, 700);
    return () => clearTimeout(t);
  }, []);
  return <canvas ref={ref} aria-hidden="true" style={{ position: "absolute", inset: 0,
    width: "100%", height: "100%", pointerEvents: "none", zIndex: 3 }} />;
}

// A charge running round the edge of its parent, which must be positioned.
export function LiveWire({ color = V.green, radius = 14 }) {
  return (
    <svg className="v-wire" aria-hidden="true" style={{ filter: `drop-shadow(0 0 6px ${color})` }}>
      <rect width="100%" height="100%" rx={radius} pathLength="100" stroke={color} />
    </svg>
  );
}

// Places to flip through on the way to `place`, three at most.
export const flapSteps = (before, place) => {
  if (before == null || before === place) return [place];
  const dir = Math.sign(place - before);
  return Math.abs(place - before) > 1 ? [before, place - dir, place] : [before, place];
};

// A place that flips over like an airport board, one step at a time. The
// server render and reduced motion both get the last step and nothing else.
export function Flap({ steps, format = v => v }) {
  const last = steps[steps.length - 1];
  const ref = useRef(null);
  const [shown, setShown] = useState(last);
  useEffect(() => {
    const e = ref.current;
    if (still() || steps.length < 2 || !e || !e.animate) { setShown(last); return; }
    let dead = false, timer = 0, i = 0;
    setShown(steps[0]);
    const step = () => {
      if (dead || ++i >= steps.length) return;
      e.animate([{ transform: "rotateX(0)" }, { transform: "rotateX(90deg)" }], { duration: 170, easing: "ease-in" })
        .finished.then(() => {
          if (dead) return null;
          setShown(steps[i]);
          return e.animate([{ transform: "rotateX(-90deg)" }, { transform: "rotateX(0)" }],
            { duration: 240, easing: "cubic-bezier(.3, 1.7, .5, 1)" }).finished;
        }).then(() => { timer = setTimeout(step, 260); }).catch(() => {});
    };
    timer = setTimeout(step, 700);
    return () => { dead = true; clearTimeout(timer); };
  }, [steps.join(",")]);
  return <span ref={ref} style={{ display: "inline-block" }}>{format(shown)}</span>;
}

// The pit stop on a gauge, 1.5 to 4.5 seconds, the needle sweeping to it.
export function Gauge({ stop, color = V.gold }) {
  const v = Math.max(1.5, Math.min(4.5, stop));
  const rot = ((v - 3) / 1.5) * 90, a = (rot * Math.PI) / 180;
  const x = 100 + 80 * Math.sin(a), y = 105 - 80 * Math.cos(a);
  return (
    <svg viewBox="0 0 200 126" role="img" aria-label={`Stop ${stop.toFixed(2)}`}
      style={{ display: "block", width: "100%", maxWidth: 250, margin: "0 auto" }}>
      <path d="M20 105A80 80 0 0 1 180 105" fill="none" stroke={V.bg4} strokeWidth="10" strokeLinecap="round" />
      <path d={`M20 105A80 80 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}`} fill="none" stroke={V.blue}
        strokeWidth="10" strokeLinecap="round" />
      <g fill={V.text2} fontFamily={FN} fontWeight="700" fontSize="13" textAnchor="middle">
        <text x="20" y="124">1.5</text><text x="100" y="14">3.0</text><text x="180" y="124">4.5</text>
      </g>
      <g className="v-ndl" style={{ "--r": `${rot}deg` }}>
        <line x1="100" y1="105" x2="100" y2="36" stroke={color} strokeWidth="4" strokeLinecap="round" />
      </g>
      <circle cx="100" cy="105" r="7" fill={color} />
    </svg>
  );
}

// Strip lights in the distance. Sits behind the content of its parent, which
// must be positioned, clipped, and set to isolate.
export function Bokeh() {
  const lights = [[V.blue, "4%", "6%"], [V.pink, "58%", "34%"], [V.purple, "28%", "52%"], [V.blue, "76%", "-12%"]];
  return (
    <div className="v-bokeh" aria-hidden="true">
      {lights.map(([c, l, t], i) => (
        <i key={i} style={{ background: c, left: l, top: t, animationDelay: `${i * -4.3}s` }} />
      ))}
    </div>
  );
}

// A sign's letters, lit one at a time with a stutter, once.
export function Lit({ text }) {
  useEffect(() => { if (!still()) tone("sign"); }, []);
  return [...String(text)].map((ch, i) => (
    <span key={i} className="v-lit" style={{ "--i": i, whiteSpace: "pre" }}>{ch}</span>
  ));
}
