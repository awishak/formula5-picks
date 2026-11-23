// Touch motion for the whole app, mounted once from main.jsx.
//
// One delegated listener, so no button or row has to opt in: a neon ring
// spreads from where the thumb landed, and whatever was pressed sinks and
// brightens until the finger lifts. The ring is drawn on the page, fixed, not
// inside the button, so nothing's layout, overflow or position is touched.
//
// The opt-in classes live here too, so they exist on every page including the
// deck, which returns before the shell renders:
//   v-follow  a pool of light under the pointer (set --fc for the colour)
//   v-ignite  the tube stutters on once, and again on a tap
//   v-shine   a band of light crosses the button every few seconds
//   v-conic   blue, pink and purple run around the edge
//   v-land    on a list: its rows rise into place one after another
//   v-bloom   a nav light pops when its page is picked
//   v-record  the jukebox button turns as a record while a song plays
//   v-lts, v-sk  the loading lights and rows, drawn by src/Loading.jsx
//
// Rules the plan set, 2026-11-23: one thing moves at rest per screen, nothing
// changes a card's height, and reduced motion turns all of it off. v-shine and
// v-conic are the only two here that move at rest; do not put either on a
// screen that already has a flicker.
import { V } from "./theme.vegas";

const CSS = `
@property --va { syntax: '<angle>'; inherits: true; initial-value: 0deg; }
@keyframes vRing { to { transform: scale(7); opacity: 0; } }
@keyframes vIgnite {
  0%  { opacity: .15; filter: brightness(.4); }
  10% { opacity: 1;   filter: brightness(1.7); }
  14% { opacity: .2;  filter: brightness(.4); }
  24% { opacity: 1;   filter: none; }
  28% { opacity: .35; }
  34% { opacity: 1;   filter: brightness(1.9); }
  52% { opacity: .6;  filter: none; }
  56% { opacity: 1; }
}
@keyframes vShine {
  0%, 45% { transform: translateX(-160%) skewX(-18deg); }
  100%    { transform: translateX(420%) skewX(-18deg); }
}
@keyframes vSpinA { to { --va: 360deg; } }
.v-ring {
  position: fixed; left: 0; top: 0; width: 14px; height: 14px; margin: -7px;
  border-radius: 50%; border: 2px solid var(--rc);
  box-shadow: 0 0 10px var(--rc), inset 0 0 6px var(--rc);
  pointer-events: none; z-index: 9999; animation: vRing .55s ease-out forwards;
}
.v-press { scale: .97; filter: brightness(1.25); }
.v-follow { position: relative; isolation: isolate; }
.v-follow::before {
  content: ""; position: absolute; inset: 0; border-radius: inherit; z-index: -1;
  background: radial-gradient(130px circle at var(--vx, 50%) var(--vy, 50%), color-mix(in srgb, var(--fc, ${V.blue}) 38%, transparent), transparent 65%);
  opacity: 0; transition: opacity .25s; pointer-events: none;
}
.v-follow.v-live::before { opacity: 1; }
.v-ignite { animation: vIgnite 1.2s steps(1, end) 1; }
.v-shine { position: relative; overflow: hidden; }
.v-shine::after {
  content: ""; position: absolute; top: -20%; bottom: -20%; left: 0; width: 38%;
  background: linear-gradient(100deg, transparent, #fffc, transparent);
  animation: vShine 3s ease-in-out infinite; pointer-events: none;
}
.v-conic {
  border: 2px solid transparent;
  background: linear-gradient(${V.bg2}, ${V.bg2}) padding-box,
              conic-gradient(from var(--va), ${V.blue}, ${V.pink}, ${V.purple}, ${V.blue}) border-box;
  box-shadow: 0 0 22px ${V.purple}55;
  animation: vSpinA 3s linear infinite;
}
@keyframes vLt0 { 0%, 11% { background: #1d1d2b; box-shadow: none; } 12%, 72% { background: ${V.red}; box-shadow: 0 0 14px ${V.red}; } 73%, 100% { background: #1d1d2b; box-shadow: none; } }
.v-lts i:nth-child(1) { animation: vLt0 3.2s infinite; }
@keyframes vLt1 { 0%, 22% { background: #1d1d2b; box-shadow: none; } 23%, 72% { background: ${V.red}; box-shadow: 0 0 14px ${V.red}; } 73%, 100% { background: #1d1d2b; box-shadow: none; } }
.v-lts i:nth-child(2) { animation: vLt1 3.2s infinite; }
@keyframes vLt2 { 0%, 33% { background: #1d1d2b; box-shadow: none; } 34%, 72% { background: ${V.red}; box-shadow: 0 0 14px ${V.red}; } 73%, 100% { background: #1d1d2b; box-shadow: none; } }
.v-lts i:nth-child(3) { animation: vLt2 3.2s infinite; }
@keyframes vLt3 { 0%, 44% { background: #1d1d2b; box-shadow: none; } 45%, 72% { background: ${V.red}; box-shadow: 0 0 14px ${V.red}; } 73%, 100% { background: #1d1d2b; box-shadow: none; } }
.v-lts i:nth-child(4) { animation: vLt3 3.2s infinite; }
@keyframes vLt4 { 0%, 55% { background: #1d1d2b; box-shadow: none; } 56%, 72% { background: ${V.red}; box-shadow: 0 0 14px ${V.red}; } 73%, 100% { background: #1d1d2b; box-shadow: none; } }
.v-lts i:nth-child(5) { animation: vLt4 3.2s infinite; }
.v-lts { display: flex; justify-content: center; gap: 12px; padding: 8px 0 22px; }
.v-lts i { width: 24px; height: 24px; border-radius: 50%; background: #1d1d2b; border: 1px solid ${V.border2}; }
@keyframes vShim { from { background-position: 100% 0; } to { background-position: 0 0; } }
.v-sk { height: 56px; margin: 0 0 10px; border-radius: 14px; background: linear-gradient(100deg, ${V.bg2} 35%, ${V.blue}3d 50%, ${V.bg2} 65%) 0 0 / 300% 100%; animation: vShim 1.5s linear infinite; }
@keyframes vLand { from { transform: translateY(22px); opacity: 0; } }
.v-land > * { animation: vLand .5s cubic-bezier(.2, .9, .3, 1.3) backwards; }
.v-land > :nth-child(2) { animation-delay: 45ms; }
.v-land > :nth-child(3) { animation-delay: 90ms; }
.v-land > :nth-child(4) { animation-delay: 135ms; }
.v-land > :nth-child(5) { animation-delay: 180ms; }
.v-land > :nth-child(6) { animation-delay: 225ms; }
.v-land > :nth-child(7) { animation-delay: 270ms; }
.v-land > :nth-child(8) { animation-delay: 315ms; }
.v-land > :nth-child(9) { animation-delay: 360ms; }
.v-land > :nth-child(10) { animation-delay: 405ms; }
.v-land > :nth-child(11) { animation-delay: 450ms; }
.v-land > :nth-child(12) { animation-delay: 495ms; }
.v-land > :nth-child(n+13) { animation-delay: 540ms; }
@keyframes vBloom { 0% { transform: scale(.5); } 50% { transform: scale(1.5); } }
.v-bloom { animation: vBloom .5s cubic-bezier(.3, 1.8, .5, 1); }
@keyframes vRot { to { transform: rotate(360deg); } }
.v-record { position: relative; overflow: hidden; isolation: isolate; }
.v-record::before { content: ""; position: absolute; inset: 0; border-radius: 50%; z-index: -1; animation: vRot 2.2s linear infinite;
  background: radial-gradient(circle, ${V.pink} 0 12%, transparent 13%), conic-gradient(#fff3, transparent 18%, transparent 50%, #fff3 56%, transparent 72%), repeating-radial-gradient(circle, #101016 0 2px, #22222e 2px 4px); }
@keyframes vFoil { to { background-position: 100% 0; } }
.v-foil { color: #1a1200 !important; text-shadow: none !important; border-color: transparent !important; box-shadow: 0 0 18px #ffc93c66;
  background: linear-gradient(115deg, #ffc93c, #fff3b0, #ff9ad5, #9ae8ff, #ffc93c, #fff3b0, #ff9ad5, #9ae8ff, #ffc93c) 0 0 / 200% 100% !important;
  animation: vFoil 3.5s linear infinite; }
.v-tilt { transform: perspective(600px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)); transition: transform .15s; }
@keyframes vRun { to { stroke-dashoffset: -100; } }
.v-wire { position: absolute; inset: -2px; width: calc(100% + 4px); height: calc(100% + 4px); overflow: visible; pointer-events: none; }
.v-wire rect { fill: none; stroke-width: 3; stroke-linecap: round; stroke-dasharray: 22 78; animation: vRun 1.6s linear infinite; }
@keyframes vFlash { 30% { filter: brightness(2.2); transform: scale(1.12); } }
.v-flash { display: inline-block; animation: vFlash .5s; }
@keyframes vWipe { from { transform: translateX(-140%) skewX(-18deg); } to { transform: translateX(140%) skewX(-18deg); } }
.v-wipe { position: fixed; inset: -10% -20%; z-index: 400; pointer-events: none; transform: translateX(140%) skewX(-18deg);
  background: repeating-conic-gradient(#f2f2f7 0 25%, #07070c 0 50%) 0 0 / 30px 30px; animation: vWipe 1.1s cubic-bezier(.6, 0, .3, 1); }
@keyframes vLit { 0% { opacity: .12; text-shadow: none; } 30% { opacity: 1; } 40% { opacity: .2; text-shadow: none; } 55% { opacity: 1; } }
.v-lit { animation: vLit .9s steps(1, end) calc(var(--i, 0) * 90ms) backwards; }
@keyframes vDrive { from { transform: translateX(170%); } }
.v-drive { animation: vDrive 1.3s cubic-bezier(.1, .75, .2, 1) var(--d, 0s) backwards; }
.v-pass { scale: 1.12; filter: brightness(1.35); }
@keyframes vDrift { from { transform: translate(-30px, 12px) scale(.8); } to { transform: translate(40px, -16px) scale(1.25); } }
.v-bokeh { position: absolute; inset: 0; z-index: -1; pointer-events: none; }
.v-bokeh i { position: absolute; width: 110px; height: 110px; border-radius: 50%; filter: blur(30px); opacity: .38; animation: vDrift 16s ease-in-out infinite alternate; }
.v-wet { -webkit-box-reflect: below -0.3em linear-gradient(transparent 55%, #0006); }
.v-pull { position: sticky; top: 0; z-index: 20; }
.v-pull::before { content: ""; position: absolute; left: -16px; right: -16px; top: 0; z-index: -1; pointer-events: none;
  height: calc(100% * (1 - .45 * var(--vs, 0))); background: linear-gradient(${V.bg} 82%, transparent); opacity: var(--vs, 0); }
.v-pull > * { transform-origin: left top; transform: scale(calc(1 - .45 * var(--vs, 0))); }
@keyframes vSheet { from { transform: translateY(105%); } }
.v-sheet { animation: vSheet .5s cubic-bezier(.3, 1.2, .5, 1) backwards; }
@keyframes vBack { from { opacity: 0; } }
.v-back { animation: vBack .3s ease-out; -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px); }
.v-flipbox { perspective: 700px; cursor: pointer; }
.v-flip { display: grid; transform-style: preserve-3d; transition: transform .7s cubic-bezier(.3, 1.3, .5, 1); }
.v-flip > * { grid-area: 1 / 1; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
.v-flip > :last-child { transform: rotateY(180deg); }
.v-flip[data-s="1"] { transform: rotateY(180deg); }
.v-fly { position: fixed; z-index: 500; pointer-events: none; margin: 0; }
@keyframes vNdl { from { transform: rotate(-90deg); } }
.v-ndl { transform-origin: 100px 105px; transform: rotate(var(--r, 0deg)); animation: vNdl 1.4s cubic-bezier(.3, 1.6, .4, 1); }
@media (prefers-reduced-motion: reduce) {
  .v-foil, .v-wire rect, .v-flash, .v-lit, .v-drive, .v-bokeh i, .v-sheet, .v-back, .v-ndl { animation: none !important; }
  .v-wipe, .v-pull::before { display: none; }
  .v-tilt, .v-pull > * { transform: none; }
  .v-flip { transition: none; }
  .v-pass { scale: none; filter: none; }
}
@media (prefers-reduced-motion: reduce) {
  .v-lts i, .v-sk, .v-land > *, .v-bloom, .v-record::before { animation: none !important; }
  .v-lts i { background: ${V.red}; }
  .v-ring { display: none; }
  .v-press { scale: none; filter: none; }
  .v-follow::before, .v-shine::after { display: none; }
  .v-ignite, .v-conic { animation: none !important; }
}
`;

const TAP = 'button, [role="button"], a[href]';

export function startMotion() {
  if (typeof document === "undefined" || document.getElementById("v-motion")) return;
  const style = document.createElement("style");
  style.id = "v-motion";
  style.textContent = CSS;
  document.head.appendChild(style);

  const still = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  let pressed = null;
  const release = () => { if (pressed) { pressed.classList.remove("v-press"); pressed = null; } };

  document.addEventListener("pointerdown", (e) => {
    if (still.matches || !(e.target instanceof Element)) return;
    const el = e.target.closest(TAP);
    if (!el || el.disabled || el.closest("[data-nomotion]")) return;
    const ring = document.createElement("i");
    ring.className = "v-ring";
    ring.style.left = e.clientX + "px";
    ring.style.top = e.clientY + "px";
    ring.style.setProperty("--rc", el.dataset.ring || V.blue);
    ring.addEventListener("animationend", () => ring.remove());
    document.body.appendChild(ring);
    release();
    pressed = el;
    el.classList.add("v-press");
    if (el.classList.contains("v-ignite")) {
      el.classList.remove("v-ignite");
      void el.offsetWidth;
      el.classList.add("v-ignite");
    }
  }, { passive: true });
  ["pointerup", "pointercancel", "scroll", "blur"].forEach((t) =>
    window.addEventListener(t, release, { passive: true, capture: true }));

  let lit = null;
  const dim = () => { if (lit) { lit.classList.remove("v-live"); lit = null; } };
  document.addEventListener("pointermove", (e) => {
    if (still.matches || !(e.target instanceof Element)) return;
    const el = e.target.closest(".v-follow");
    if (el !== lit) dim();
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--vx", e.clientX - r.left + "px");
    el.style.setProperty("--vy", e.clientY - r.top + "px");
    el.classList.add("v-live");
    lit = el;
  }, { passive: true });
  ["pointerup", "pointercancel"].forEach((t) =>
    window.addEventListener(t, (e) => { if (e.pointerType !== "mouse") dim(); }, { passive: true }));
  document.addEventListener("pointerleave", dim, { passive: true });

  // Title that pulls back: --vs runs 0 to 1 over the first 90px of scroll.
  let queued = false;
  window.addEventListener("scroll", () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      document.documentElement.style.setProperty("--vs", Math.min(1, window.scrollY / 90).toFixed(3));
    });
  }, { passive: true });

  // Tilting card: whatever carries v-tilt leans toward the pointer.
  let leaning = null;
  const level = () => { if (leaning) { leaning.style.removeProperty("--rx"); leaning.style.removeProperty("--ry"); leaning = null; } };
  document.addEventListener("pointermove", (e) => {
    if (still.matches || !(e.target instanceof Element)) return;
    const el = e.target.closest(".v-tilt");
    if (el !== leaning) level();
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--ry", (((e.clientX - r.left) / r.width) - 0.5) * 26 + "deg");
    el.style.setProperty("--rx", (0.5 - ((e.clientY - r.top) / r.height)) * 26 + "deg");
    leaning = el;
  }, { passive: true });
  ["pointerup", "pointercancel"].forEach((t) => window.addEventListener(t, level, { passive: true }));

  // Sound needs a gesture before a browser will play it, so every press wakes it.
  document.addEventListener("pointerdown", () => { if (sfxOn()) wake(); }, { passive: true });
}

// Rows that trade places. Call from a layout effect with the list element and
// a ref that holds the last positions: each child marked data-flip slides
// from where it was to where it is. offsetTop, not the viewport, so a scroll
// between two sorts does not read as a move.
export function flipRows(el, seen) {
  if (!el) return;
  const still = typeof window !== "undefined" && window.matchMedia
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const next = {};
  for (const c of el.children) {
    const id = c.dataset.flip;
    if (!id) continue;
    next[id] = c.offsetTop;
    const was = seen.current[id];
    if (!still && was != null && Math.abs(was - next[id]) > 1 && c.animate) {
      c.animate([{ transform: `translateY(${was - next[id]}px)` }, { transform: "none" }],
        { duration: 600, easing: "cubic-bezier(.3, 1.25, .4, 1)" });
    }
  }
  seen.current = next;
}

const reduced = () => typeof window !== "undefined" && window.matchMedia
  && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Pick that flies to your hand: a copy of `from` travels to `to` and goes.
export function flyTo(from, to) {
  if (!from || !to || reduced() || !from.animate) return;
  const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
  const ghost = from.cloneNode(true);
  ghost.classList.add("v-fly");
  ghost.style.left = a.left + "px";
  ghost.style.top = a.top + "px";
  ghost.style.width = a.width + "px";
  document.body.appendChild(ghost);
  const done = () => ghost.remove();
  ghost.animate([
    { transform: "none", opacity: 1 },
    { transform: `translate(${b.left - a.left + 8}px, ${b.top - a.top + (b.height - a.height) / 2}px) scale(.9)`, opacity: 0.35 },
  ], { duration: 420, easing: "cubic-bezier(.5, 0, .3, 1)" }).finished.then(done, done);
}

// Face that travels: PlayerTap remembers where the tapped face was, and the
// card's own face arrives from there.
let tapped = null;
export function rememberTap(el) {
  if (!el || !el.getBoundingClientRect) return;
  const face = el.querySelector("img") || el;
  tapped = { rect: face.getBoundingClientRect(), at: Date.now() };
}
export function arriveFrom(el) {
  const from = tapped;
  tapped = null;
  if (!el || !from || Date.now() - from.at > 2500 || reduced() || !el.animate) return;
  const r = el.getBoundingClientRect();
  if (!r.width || !from.rect.width) return;
  el.animate([
    { transformOrigin: "0 0", transform: `translate(${from.rect.left - r.left}px, ${from.rect.top - r.top}px) scale(${from.rect.width / r.width})`, opacity: 0.7 },
    { transformOrigin: "0 0", transform: "none", opacity: 1 },
  ], { duration: 520, easing: "cubic-bezier(.3, 1.3, .5, 1)" });
}

// Neon confetti, drawn on the canvas it is handed.
export function burst(cv) {
  if (!cv || !cv.getContext) return;
  const r = cv.getBoundingClientRect(), d = window.devicePixelRatio || 1;
  cv.width = r.width * d; cv.height = r.height * d;
  const x = cv.getContext("2d");
  x.scale(d, d);
  const C = [V.blue, V.pink, V.purple, V.green, V.gold];
  const P = Array.from({ length: 90 }, () => ({ x: r.width / 2, y: r.height * 0.7,
    vx: (Math.random() - 0.5) * 10, vy: -Math.random() * 8 - 3, s: 5 + Math.random() * 5,
    c: C[Math.random() * 5 | 0], a: Math.random() * 6, va: (Math.random() - 0.5) * 0.4 }));
  let t = 0;
  cancelAnimationFrame(cv._id);
  (function frame() {
    x.clearRect(0, 0, r.width, r.height);
    P.forEach(p => {
      p.vy += 0.2; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va;
      x.save(); x.translate(p.x, p.y); x.rotate(p.a);
      x.fillStyle = p.c; x.shadowColor = p.c; x.shadowBlur = 8; x.globalAlpha = Math.max(0, 1 - t / 120);
      x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); x.restore();
    });
    if (++t < 120) cv._id = requestAnimationFrame(frame);
    else x.clearRect(0, 0, r.width, r.height);
  })();
}

// Sound on the big moments. Off until someone turns it on in the jukebox
// (Andrew, 2026-11-23), remembered under f5_sfx.
export const sfxOn = () => { try { return localStorage.getItem("f5_sfx") === "1"; } catch (e) { return false; } };
export const setSfx = (on) => { try { localStorage.setItem("f5_sfx", on ? "1" : "0"); } catch (e) {} };
let AC = null;
function wake() {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === "suspended") AC.resume();
  } catch (e) {}
  return AC;
}
export function tone(kind) {
  if (!sfxOn()) return;
  try {
    const ac = wake();
    if (!ac) return;
    const t = ac.currentTime;
    const v = (type, f0, f1, at, len, vol) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.connect(g); g.connect(ac.destination);
      o.frequency.setValueAtTime(f0, t + at);
      if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + at + len);
      g.gain.setValueAtTime(vol, t + at);
      g.gain.exponentialRampToValueAtTime(0.001, t + at + len);
      o.start(t + at); o.stop(t + at + len + 0.02);
    };
    if (kind === "lock") v("sine", 190, 48, 0, 0.2, 0.6);
    if (kind === "sign") { v("sawtooth", 118, 0, 0, 0.05, 0.12); v("sawtooth", 118, 0, 0.1, 0.08, 0.12); v("sawtooth", 118, 0, 0.26, 0.7, 0.12); }
    if (kind === "win") [523, 659, 784, 1047].forEach((f, i) => v("triangle", f, 0, i * 0.09, 0.25, 0.25));
  } catch (e) {}
}
