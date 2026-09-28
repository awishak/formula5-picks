// The theme song, outside React. One Audio object for the whole app, so a
// song started on the deck's last card keeps playing on the picker after the
// deck has unmounted. Andrew, 2026-09-27: the Bahlaysian song plays over the
// picker, not over the recap.
//
// play() has to run inside a tap, so callers pass the src at the tap and this
// swaps it and plays in the same call. Nothing here preloads: the tap is what
// starts the download, the same as the <audio> element did.
let audio = null;
const listeners = new Set();

const get = () => {
  if (audio || typeof window === "undefined") return audio;
  audio = new Audio();
  audio.preload = "none";
  audio.loop = true;
  const tell = () => listeners.forEach(fn => fn(!audio.paused));
  audio.addEventListener("play", tell);
  audio.addEventListener("pause", tell);
  audio.addEventListener("ended", tell);
  return audio;
};

/** The src playing right now, or null. */
export const songSrc = () => (audio && !audio.paused ? audio.getAttribute("src") : null);
export const songPlaying = () => Boolean(audio && !audio.paused);

/** Start a song. Same src while playing is a no-op; a different src swaps and plays. */
export function playSong(src) {
  const el = get();
  if (!el) return Promise.resolve();
  if (el.getAttribute("src") !== src) { el.pause(); el.src = src; }
  else if (!el.paused) return Promise.resolve();
  listeners.forEach(fn => fn(true));
  return el.play().catch(() => { listeners.forEach(fn => fn(false)); });
}

export function pauseSong() { if (audio && !audio.paused) audio.pause(); }

/** Pause if playing, else play the given src (or whatever is loaded). */
export function toggleSong(src) {
  const el = get();
  if (!el) return;
  if (!el.paused) el.pause();
  else playSong(src || el.getAttribute("src"));
}

/** Called with true/false whenever play state changes. Returns the unsubscribe. */
export function onSong(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
