/**
 * The Paddock. The week as a newspaper, and as a run of stories.
 *
 * An alternate to the Vegas weekly deck, not a replacement. Same round, same
 * numbers, opposite register: a dark front page you read at your own pace, and
 * a tap-through that plays the same nine stories full-bleed the way Instagram
 * does.
 *
 *   src/weekly.js   the maths. Shared with the Vegas deck. Never forked.
 *   src/wire.js     the writing. Which story runs, why, and in what words.
 *   this file       the paper. Nothing in here computes a score.
 *
 * Rendered by <Paddock> at /week2, which loads the round and hands the built
 * wire to <PaddockPaper>. The presentational half is split out for the same
 * reason WeeklyDeck is: the smoke script renders all 48 papers without a
 * network.
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "./supabaseClient";
import { buildWeekly } from "./weekly.js";
import { buildWire } from "./wire.js";
import { shortOf } from "./teams.js";
import Flag from "./Flag.jsx";
import FlagPicker, { FlagRow } from "./FlagPicker.jsx";
import { SKINS, SkinProvider, useSkin, skinCSS } from "./paddockSkin.js";

/* --------------------------------------------------------------- the kit */

// Colour and type come from paddockSkin.js and nowhere else, so the same paper
// renders as newsprint or as neon. A hardcoded hex in here is a bug.

const ONE = { maxWidth: 480, margin: "0 auto" };
const PAD = 20;

/* ------------------------------------------------------------- the parts */

const initials = name => String(name || "?").split(/\s+/).map(w => w[0]).slice(0, 2).join("");

function Face({ photo, name, size = 44, radius = 999 }) {
  const { P, SERIF, NUM, SANS, glowText } = useSkin();
  if (photo) return (
    <img src={photo} alt={name || ""} width={size} height={size} loading="lazy"
      style={{ width: size, height: size, borderRadius: radius, objectFit: "cover",
        background: P.surface2, flex: "none" }} />
  );
  return (
    <div style={{ width: size, height: size, borderRadius: radius, flex: "none",
      background: P.surface2, color: P.ink3, display: "grid", placeItems: "center",
      fontFamily: SANS, fontWeight: 700, fontSize: Math.round(size * 0.34) }}>{initials(name)}</div>
  );
}

const Logo = ({ src, name, size = 40 }) => src
  ? <img src={src} alt={name || ""} width={size} height={size} loading="lazy"
      style={{ width: size, height: size, objectFit: "contain", flex: "none" }} />
  : <Face name={name} size={size} radius={8} />;

// The record sleeve. No artwork exists for the album, so the paper draws one:
// a soft compound, which is the red-walled tyre, and the title set in the same
// serif as the headlines.
function Sleeve({ size = 200, spin = false }) {
  const { P, SERIF, NUM, SANS, radius, glowText, numTracking } = useSkin();
  const r = size / 2;
  return (
    <div style={{ width: size, height: size, position: "relative", flex: "none" }}>
      <div className={spin ? "pd-spin" : undefined} style={{ width: size, height: size,
        borderRadius: 999, background: "#0a0a0c",
        border: `${Math.max(6, size * 0.055)}px solid ${P.accent}`,
        boxShadow: `0 0 ${size * 0.2}px rgba(232,56,79,.35)`,
        display: "grid", placeItems: "center" }}>
        <div style={{ width: size * 0.44, height: size * 0.44, borderRadius: 999,
          border: `1px solid ${P.rule}`, display: "grid", placeItems: "center" }}>
          <div style={{ width: size * 0.09, height: size * 0.09, borderRadius: 999, background: P.rule }} />
        </div>
      </div>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center",
        pointerEvents: "none" }}>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: size * 0.115, lineHeight: 1.08,
          textAlign: "center", width: size * 0.78, textShadow: "0 2px 14px rgba(0,0,0,.9)" }}>
          THE HARDEST COMPOUND
        </div>
      </div>
    </div>
  );
}

// The art at the top of a story. Every kind lands in the same box, so a
// headshot, a pair of crests, a flag and a record sleeve all crop the same way.
function Art({ art, h = 220, round = 0, bleed = false }) {
  const { P, SERIF, NUM, SANS, radius, glowText, numTracking } = useSkin();
  // The cover of a story is drawn at "100%", and the same art also runs at 30px
  // inside a ring, so anything sized off the height needs a real number and a
  // floor. Sizing straight off `h` gave a NaN width on the cover.
  const hn = typeof h === "number" ? h : 460;
  const fit = (max, pad) => Math.max(20, Math.min(max, hn - pad));
  const box = {
    height: h, borderRadius: round, overflow: "hidden", position: "relative",
    background: P.surface, display: "grid", placeItems: "center",
  };
  if (!art) return <div style={box} />;

  if ((art.kind === "player" || art.kind === "album") && art.photo) return (
    <div style={box}>
      <img src={art.photo} alt={art.alt || ""} loading="lazy"
        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%" }} />
    </div>
  );
  if (art.kind === "album") return (
    <div style={{ ...box, background: "radial-gradient(120% 90% at 50% 30%, #24151b 0%, #0d0e12 70%)" }}>
      <Sleeve size={fit(260, 40)} />
    </div>
  );
  if (art.kind === "player") return <div style={box}><Face name={art.name} size={fit(140, 40)} /></div>;
  if (art.kind === "driver") return (
    <div style={{ ...box, background: "linear-gradient(160deg, #1b1d24 0%, #0d0e12 100%)" }}>
      {art.photo
        ? <img src={art.photo} alt={art.alt || ""} loading="lazy"
            style={{ height: "100%", objectFit: "contain", objectPosition: "center bottom" }} />
        : <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 22, color: P.ink3 }}>{art.driver || ""}</div>}
    </div>
  );
  if (art.kind === "drivers") return (
    <div style={{ ...box, display: "flex", alignItems: "flex-end", justifyContent: "center",
      background: "linear-gradient(160deg, #1b1d24 0%, #0d0e12 100%)" }}>
      {(art.drivers || []).slice(0, hn < 110 ? 1 : 5).map((dr, i) => (
        <div key={i} style={{ height: "86%", display: "grid", placeItems: "end center" }}>
          {dr.photo
            ? <img src={dr.photo} alt={dr.driver} loading="lazy" style={{ height: "100%", objectFit: "contain" }} />
            : <Face name={dr.driver} size={56} />}
        </div>
      ))}
    </div>
  );
  if (art.kind === "duel") {
    // Two crests need room. In a ring, or any box too small to hold both, the
    // first team stands for the story.
    const solo = hn < 110;
    return (
      <div style={{ ...box, display: "flex", alignItems: "center", justifyContent: "center",
        gap: solo ? 0 : 26 }}>
        <Logo src={art.left && art.left.logo} name={art.left && art.left.name}
          size={solo ? fit(56, 4) : fit(110, 90)} />
        {!solo && <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 15, color: P.ink3 }}>v</div>}
        {!solo && <Logo src={art.right && art.right.logo} name={art.right && art.right.name} size={fit(110, 90)} />}
      </div>
    );
  }
  if (art.kind === "flag") return (
    <div style={box}><Flag nation={art.nation} size={fit(130, 70)} /></div>
  );
  return (
    <div style={{ ...box, background: "radial-gradient(120% 90% at 50% 35%, #1e2027 0%, #0d0e12 72%)" }}>
      <div style={{ fontFamily: NUM, fontWeight: 700, fontSize: fit(72, 120),
        letterSpacing: numTracking, ...glowText(P.ink) }}>{art.label || ""}</div>
    </div>
  );
}

const Byline = ({ s, style }) => {
  const { P, SANS } = useSkin();
  return (
  <div className="pd-meta" style={{ display: "flex", gap: 8, alignItems: "center", ...style }}>
    <span style={{ fontWeight: 600, color: P.ink2 }}>By {s.byline}</span>
    {s.read && <><span style={{ color: P.rule }}>|</span><span>{s.read}</span></>}
  </div>
  );
};

/* ------------------------------------------------------------- the frames */

// The album ad. `public/velvet-thunder.mp3` already ships with the deck, so the
// advertisement plays the record rather than describing it. Nothing autoplays:
// every browser blocks sound until a gesture, so the tap on the button IS the
// gesture, and the sleeve turns while the track runs so a muted phone is
// distinguishable from a broken button.
function AlbumFrame({ f, big }) {
  const { P, SERIF, NUM, SANS, radius, glowText, numTracking } = useSkin();
  const [playing, setPlaying] = useState(false);
  const audio = useRef(null);
  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) { a.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); }
    else { a.pause(); setPlaying(false); }
  };
  return (
    <div style={{ display: "grid", justifyItems: "center", gap: big ? 22 : 16 }}>
      <Sleeve size={big ? 230 : 150} spin={playing} />
      <div style={{ display: "grid", gap: 6, justifyItems: "center", textAlign: "center" }}>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: big ? 30 : 23, lineHeight: 1.1 }}>
          {f.artist}</div>
        <div style={{ fontFamily: SANS, fontSize: big ? 15 : 13, color: P.ink2, maxWidth: 300 }}>
          Featuring {f.track}, the Formula 5 theme</div>
        <div className="pd-kicker" style={{ marginTop: 6 }}>{f.cap}</div>
      </div>
      <button onClick={toggle} style={{ display: "flex", alignItems: "center", gap: 10,
        padding: big ? "15px 28px" : "12px 22px", borderRadius: 999, border: "none",
        background: playing ? P.accent : P.surface2, color: P.ink,
        fontWeight: 700, fontSize: big ? 16 : 14 }}>
        <span style={{ fontSize: big ? 15 : 13 }}>{playing ? "❚❚" : "▶"}</span>
        {playing ? `PLAYING ${f.track.toUpperCase()}` : `PLAY ${f.track.toUpperCase()}`}
      </button>
      <audio ref={audio} src={f.src} preload="none" loop onEnded={() => setPlaying(false)} />
    </div>
  );
}

// The flag. Same write and the same precedence as the deck's card 4: null is
// never chosen and falls through, "" is chose no flag and is an answer.
function FlagFrame({ f, big }) {
  const { P, SERIF, NUM, SANS, radius, glowText, numTracking } = useSkin();
  const [nation, setNation] = useState(f.nation);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const save = async code => {
    setPicking(false);
    if (!f.id) return;
    setSaving(true);
    // .select() or an RLS mismatch swallows the write and returns no error.
    const { error } = await supabase.from("players").update({ nation: code }).eq("id", f.id).select();
    setSaving(false);
    if (error) setErr(error.message);
    else { setErr(null); setNation(code); }
  };
  return (
    <div style={{ display: "grid", gap: 16, justifyItems: "center", width: "100%" }}>
      <Flag nation={nation} size={big ? 130 : 84} />
      <div style={{ width: "100%", maxWidth: 340 }}>
        <FlagRow cap="YOUR FLAG" who={f.name} nation={nation} disabled={saving}
          onOpen={() => setPicking(true)} note="Tap to choose" />
      </div>
      {err && (
        <div style={{ fontFamily: SANS, fontSize: 13, color: P.accent, textAlign: "center" }}>
          {/^column .* does not exist/.test(err)
            ? "Flags are not switched on yet. Run scripts/nations.sql." : err}
        </div>
      )}
      {picking && (
        <FlagPicker title={`${f.name}'s flag`} value={nation}
          onPick={save} onClose={() => setPicking(false)} />
      )}
    </div>
  );
}

// One frame, drawn small for a figure inside an article and large for a story.
// Both render the same data, so nothing in a story is missing from the article
// and nothing has to be written twice.
function Frame({ f, big = false, onPicks }) {
  const { P, SERIF, NUM, SANS, radius, glowText, numTracking } = useSkin();
  if (!f) return null;
  const title = (t, colour) => t ? (
    <div className="pd-kicker" style={{ marginBottom: 12, color: colour || undefined }}>{t}</div>
  ) : null;
  const cap = f.cap && f.type !== "album" ? (
    <div style={{ fontFamily: SANS, fontSize: big ? 15 : 13, color: P.ink3, marginTop: 12 }}>{f.cap}</div>
  ) : null;

  if (f.type === "album") return <AlbumFrame f={f} big={big} />;
  if (f.type === "flagpick") return <FlagFrame f={f} big={big} />;

  if (f.type === "stat") return (
    <div>
      {title(f.title)}
      <div style={{ fontFamily: NUM, fontWeight: 700, letterSpacing: numTracking,
        fontSize: big ? 112 : 64, lineHeight: 1, ...glowText(P.ink) }}>{f.big}</div>
      <div className="pd-kicker" style={{ marginTop: 10 }}>{f.cap}</div>
      {f.sub && <div style={{ fontFamily: SANS, fontSize: big ? 17 : 15, color: P.ink2, marginTop: 8 }}>{f.sub}</div>}
    </div>
  );

  if (f.type === "duel") {
    // Our side goes green when won and grey when lost; theirs lights up only if
    // they beat us. Nothing is coloured that way until the round is scored,
    // which by the time a paper exists it always is.
    const won = f.result === "won", lost = f.result === "lost";
    const colourOf = t => t.me
      ? (won ? P.good : lost ? P.ink3 : P.accent)
      : (lost ? P.bad : P.ink);
    return (
    <div>
      {title(f.title || f.cap, won ? P.good : lost ? P.bad : P.accent)}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12 }}>
        {[f.left, f.right].map((t, i) => (
          <div key={i} style={{ order: i === 0 ? 0 : 2, display: "grid", justifyItems: "center", gap: 8 }}>
            <Logo src={t.logo} name={t.name} size={big ? 88 : 54} />
            <div style={{ fontFamily: NUM, fontWeight: 700, fontSize: big ? 66 : 42, lineHeight: 1,
              letterSpacing: numTracking, ...glowText(colourOf(t)) }}>{t.score}</div>
            <div style={{ fontFamily: SANS, fontSize: big ? 14 : 12, fontWeight: 600, color: P.ink3,
              textAlign: "center" }}>{t.code || shortOf(t.name)}</div>
          </div>
        ))}
        <div style={{ order: 1, fontFamily: SANS, fontSize: 13, color: P.ink3 }}>v</div>
      </div>
      {f.sub && <div style={{ fontFamily: SANS, fontSize: big ? 16 : 14, color: P.ink2, marginTop: 14,
        textAlign: "center" }}>{f.sub}</div>}
    </div>
    );
  }

  if (f.type === "bars") {
    const rows = f.rows || [];
    const max = Math.max(1, ...rows.map(r => Math.abs(r.v)));
    const tight = rows.length >= 10;
    return (
      <div>
        {title(f.title)}
        <div style={{ display: "grid", gap: tight ? 4 : (big ? 7 : 5) }}>
          {rows.map((r, i) => {
            // A break in the list, where the rows below are not the rows above.
            if (r.spacer) return (
              <div key={i} style={{ height: 10, borderTop: `1px dashed ${P.rule}`, margin: "3px 0" }} />
            );
            const w = (Math.abs(r.v) / max) * (f.signedBars ? 50 : 100);
            const fill = r.me ? P.accent : r.foe ? "#6b6e7a"
              : f.signedBars ? (r.good ? P.good : P.bad) : "#3a3d47";
            return (
              <div key={i} style={{ display: "grid",
                gridTemplateColumns: big ? "94px 1fr 44px" : "74px 1fr 34px",
                alignItems: "center", gap: 8 }}>
                <div style={{ fontFamily: SANS, fontSize: big ? 14 : 12, fontWeight: r.me ? 700 : 500,
                  color: r.me ? P.ink : P.ink3, overflow: "hidden",
                  textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</div>
                <div style={{ height: big ? 16 : 12, background: "#1c1e25", borderRadius: 3,
                  position: "relative", overflow: "hidden" }}>
                  <div className="pd-grow" style={{ position: "absolute", top: 0, bottom: 0,
                    left: f.signedBars ? (r.v >= 0 ? "50%" : `${50 - w}%`) : 0,
                    width: `${w}%`, background: fill, borderRadius: 3,
                    transformOrigin: f.signedBars && r.v < 0 ? "right" : "left",
                    animationDelay: `${Math.min(i * 0.03, 0.5)}s` }} />
                </div>
                <div style={{ fontFamily: SANS, fontSize: big ? 14 : 12, fontWeight: r.me ? 700 : 500,
                  color: r.me ? P.ink : P.ink3, textAlign: "right" }}>{r.v}</div>
              </div>
            );
          })}
        </div>
        {cap}
      </div>
    );
  }

  if (f.type === "list" || f.type === "faces") {
    const withArt = f.type === "faces";
    // Ten rows and three rows cannot carry the same padding: at ten the card
    // runs past the screen and every row shrinks to fit.
    const tight = (f.rows || []).length >= 8;
    const face = tight ? 32 : (big ? 44 : 34);
    const pad = tight ? "6px 0" : (big ? "11px 0" : "9px 0");
    const rowFont = tight ? 16 : (big ? 17 : 15);
    return (
      <div>
        {title(f.title)}
        <div style={{ display: "grid" }}>
          {(f.rows || []).map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12,
              padding: pad, borderTop: i ? `1px solid ${P.rule}` : "none" }}>
              {r.rank != null && (
                <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: big ? 15 : 13, width: 22,
                  color: r.me ? P.accent : P.ink3 }}>{r.rank}</div>
              )}
              {withArt && <Face photo={r.photo} name={r.label} size={face} />}
              {!withArt && r.logo && <Logo src={r.logo} name={r.label} size={tight ? 26 : 30} />}
              {!withArt && !r.logo && r.photo && <Face photo={r.photo} name={r.label} size={face} />}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontFamily: SANS, fontWeight: r.me ? 700 : 500, fontSize: rowFont,
                  color: P.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.label}</div>
                {(r.sub || r.best) && (
                  <div style={{ fontFamily: SANS, fontSize: big ? 13 : 12,
                    color: r.best ? P.good : P.ink3, marginTop: 2 }}>
                    {r.best ? `${r.sub || ""}${r.sub ? " · " : ""}best available` : r.sub}</div>
                )}
              </div>
              {r.move != null && r.move !== 0 && (
                <div style={{ fontFamily: SANS, fontSize: big ? 13 : 12, fontWeight: 600,
                  color: r.move > 0 ? P.good : P.bad }}>
                  {r.move > 0 ? `▲${r.move}` : `▼${Math.abs(r.move)}`}</div>
              )}
              <div style={{ fontFamily: NUM, fontWeight: 700, fontSize: big ? 22 : 18,
                color: r.me ? P.accent : P.ink }}>{r.right}</div>
            </div>
          ))}
        </div>
        {cap}
      </div>
    );
  }

  if (f.type === "needle") {
    const four = (f.four || []).filter(x => x.guess != null);
    const vals = [...four.map(x => x.guess), f.line, f.pit].filter(v => v != null);
    const lo = Math.min(...vals, 1.5), hi = Math.max(...vals, 4.5);
    const at = v => ((v - lo) / (hi - lo || 1)) * 100;
    return (
      <div>
        {title(f.title || "THE LINE")}
        <div style={{ position: "relative", height: big ? 200 : 156, marginTop: 8 }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: big ? 100 : 78, height: 2,
            background: P.rule }} />
          {f.line != null && (
            <div style={{ position: "absolute", left: `${at(f.line)}%`, top: big ? 78 : 60, bottom: 26,
              width: 2, background: P.ink3, transform: "translateX(-1px)" }}>
              <div style={{ position: "absolute", top: -20, left: "50%", transform: "translateX(-50%)",
                fontFamily: SANS, fontSize: 11, fontWeight: 700, color: P.ink3, whiteSpace: "nowrap" }}>LINE</div>
            </div>
          )}
          {f.pit != null && (
            <div style={{ position: "absolute", left: `${at(f.pit)}%`, top: big ? 62 : 46, bottom: 12,
              width: 3, background: P.accent, transform: "translateX(-1.5px)" }}>
              <div style={{ position: "absolute", bottom: -22, left: "50%", transform: "translateX(-50%)",
                fontFamily: SANS, fontSize: 12, fontWeight: 700, color: P.accent, whiteSpace: "nowrap" }}>
                {f.pit.toFixed(2)}s</div>
            </div>
          )}
          {four.map((x, i) => (
            <div key={i} style={{ position: "absolute", left: `${at(x.guess)}%`,
              top: (big ? 100 : 78) - (big ? 30 : 24) - (i % 3) * (big ? 28 : 24),
              transform: "translateX(-50%)", display: "grid", justifyItems: "center", gap: 3 }}>
              <div style={{ fontFamily: SANS, fontSize: big ? 12 : 11, fontWeight: x.me ? 700 : 500,
                color: x.me ? P.ink : P.ink3, whiteSpace: "nowrap" }}>
                {x.me ? "You" : String(x.name || "").split(/\s+/)[0]}</div>
              <div style={{ width: x.me ? 12 : 9, height: x.me ? 12 : 9, borderRadius: 999,
                background: x.me ? P.accent : x.mine ? P.ink : "#5a5d69" }} />
            </div>
          ))}
        </div>
        {cap}
      </div>
    );
  }

  if (f.type === "swap") return (
    <div>
      {title(f.title || "THE ONE CHANGE")}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "end", gap: 10 }}>
        {[{ d: f.out, photo: f.outPhoto, tag: "YOU TOOK", tone: P.ink3 },
          { d: f.in, photo: f.inPhoto, tag: "WAS FREE", tone: P.good }].map((x, i) => (
          <div key={i} style={{ order: i * 2, display: "grid", justifyItems: "center", gap: 6 }}>
            {x.photo
              ? <img src={x.photo} alt={x.d.driver} loading="lazy"
                  style={{ height: big ? 140 : 88, objectFit: "contain" }} />
              : <Face name={x.d.driver} size={big ? 78 : 56} />}
            <div className="pd-kicker" style={{ color: x.tone }}>{x.tag}</div>
            <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: big ? 15 : 13, textAlign: "center" }}>
              {x.d.driver}</div>
            <div style={{ fontFamily: NUM, fontWeight: 700, fontSize: big ? 36 : 26 }}>{x.d.pts}</div>
          </div>
        ))}
        <div style={{ order: 1, fontFamily: SANS, fontWeight: 700, fontSize: big ? 20 : 16,
          color: P.good, paddingBottom: 26 }}>+{f.gain}</div>
      </div>
      {cap}
    </div>
  );

  if (f.type === "points") return (
    <div>
      {title(f.title)}
      <div style={{ display: "grid", gap: big ? 13 : 10 }}>
        {(f.rows || []).map((r, i) => (
          <div key={i} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
            <div style={{ width: 6, height: 6, borderRadius: 999, background: P.accent,
              marginTop: big ? 9 : 7, flex: "none" }} />
            <div style={{ fontFamily: SERIF, fontSize: big ? 19 : 16, lineHeight: 1.38,
              color: "#e9eaee" }}>{r}</div>
          </div>
        ))}
      </div>
      {cap}
    </div>
  );

  if (f.type === "cta") return (
    <div style={{ display: "grid", gap: 16, justifyItems: big ? "center" : "start" }}>
      {title(f.cap)}
      <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: big ? 42 : 30, lineHeight: 1.1,
        textAlign: big ? "center" : "left" }}>
        {f.race ? f.race.name : "That is the season"}</div>
      {f.deadline && (
        <div style={{ fontFamily: SANS, fontSize: big ? 16 : 15, color: P.ink2,
          textAlign: big ? "center" : "left" }}>Picks close {f.deadline}</div>
      )}
      {f.race && (
        <button onClick={onPicks} disabled={!f.poolReady} style={{
          fontFamily: SANS, fontWeight: 700, fontSize: big ? 17 : 15, letterSpacing: ".02em",
          padding: big ? "17px 36px" : "15px 28px", borderRadius: 999, border: "none",
          background: f.poolReady ? P.accent : P.surface2,
          color: f.poolReady ? "#fff" : P.ink3, cursor: f.poolReady ? "pointer" : "default",
        }}>{f.poolReady ? "MAKE YOUR PICKS" : "POOLS OPEN TUESDAY"}</button>
      )}
    </div>
  );

  return null;
}

/* ----------------------------------------------------------------- a page */

// Nothing scrolls. Every page is a fixed frame that measures its own content
// and scales down to fit, floored so type cannot fall off a cliff.
//
// The trap the recap deck already paid for: measure with the transform
// released, or the content is measured through its own constraint and the
// scale converges on whatever it read first. And re-measure after the fonts
// and the images land, because a logo has no intrinsic size until it loads.
const MIN_SCALE = 0.74;

function Page({ children, dep }) {
  const wrap = useRef(null), inner = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    let alive = true;
    let last = -1;
    const measure = () => {
      if (!alive || !wrap.current || !inner.current) return;
      const have = wrap.current.clientHeight;
      // A CSS transform is a paint-time operation, so scrollHeight already
      // reports the untransformed content height and nothing has to be
      // released to read it.
      const need = inner.current.scrollHeight;
      if (!have || !need) return;
      const next = need > have ? Math.max(MIN_SCALE, have / need) : 1;
      try {
        const el = document.documentElement;
        el.dataset.fit = String(Math.round(next * 100) / 100);
        el.dataset.natural = String(need);
        el.dataset.have = String(have);
      } catch (e) {}
      if (next !== last) { last = next; setScale(next); }
    };

    measure();
    // Content grows after the first measure and there is no timer that
    // reliably covers it: a headshot off a CDN has no height until it lands,
    // and measuring early under-measures a page full of faces by hundreds of
    // pixels. Watch the box instead of guessing at when it settles.
    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => measure());
      if (inner.current) ro.observe(inner.current);
      if (wrap.current) ro.observe(wrap.current);
    }
    const t1 = setTimeout(measure, 200), t2 = setTimeout(measure, 900);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure).catch(() => {});
    window.addEventListener("resize", measure);
    return () => {
      alive = false;
      if (ro) ro.disconnect();
      clearTimeout(t1); clearTimeout(t2);
      window.removeEventListener("resize", measure);
    };
  }, [dep]);

  return (
    <div ref={wrap} style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex",
      flexDirection: "column", justifyContent: "center" }}>
      <div ref={inner} style={{ transform: `scale(${scale})`, transformOrigin: "center center",
        width: "100%" }}>
        {children}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- the cards */

// One story, one card, and one button. Nothing scrolls and nothing branches:
// the reader taps NEXT nine times and the week is told.
//
// The photograph sits behind the card rather than above it, so the words and
// the graphic stay in one column and the card does not grow a second block to
// hold a picture.
function Card({ s, onPicks }) {
  const { P, SERIF, SANS, radius, glowText } = useSkin();
  const photo = s.art && (s.art.kind === "player" || s.art.kind === "driver") ? s.art : null;
  const board = !!(s.card.frame && (s.card.frame.rows || []).length >= 8);

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
      {photo && (
        <div style={{ position: "absolute", inset: 0 }}>
          <Art art={photo} h="100%" bleed />
          <div style={{ position: "absolute", inset: 0, background:
            `linear-gradient(180deg, ${P.bg}cc 0%, ${P.bg}e6 42%, ${P.bg} 68%)` }} />
        </div>
      )}
      <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex",
        flexDirection: "column", justifyContent: "center", padding: `10px ${PAD}px` }}>
        <Page dep={s.id}>
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <div className="pd-kicker">{s.kicker}</div>
              <div className="pd-h" style={{ fontFamily: SERIF, fontSize: 32, margin: "10px 0 10px",
                ...glowText(P.ink, 0.7) }}>{s.headline}</div>
              {!board && (
                <div style={{ fontFamily: SERIF, fontSize: 17, lineHeight: 1.4, color: P.ink2 }}>
                  {s.standfirst}</div>
              )}
            </div>
            {s.card.frame && (
              <div style={{ background: photo ? "transparent" : "transparent" }}>
                <Frame f={s.card.frame} onPicks={onPicks} />
              </div>
            )}
            {s.card.para && (
              <p style={{ fontFamily: SERIF, fontSize: 16, lineHeight: 1.5, color: P.ink2,
                margin: 0 }}>{s.card.para}</p>
            )}
            {s.byline && <Byline s={s} />}
          </div>
        </Page>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- the deck */

export function PaddockPaper({ wire, onExit, onPicks, initialStory = null, initialFrame = 0,
  initialMode = "front", skin = "paper" }) {
  const S = SKINS[skin] || SKINS.paper;
  return (
    <SkinProvider value={S}>
      <Paper wire={wire} onExit={onExit} onPicks={onPicks} initialStory={initialStory}
        initialFrame={initialFrame} initialMode={initialMode} />
    </SkinProvider>
  );
}

function Paper({ wire, onExit, onPicks, initialStory, initialFrame, initialMode }) {
  const S = useSkin();
  const { P, SANS, radius } = S;
  const cards = wire.stories;
  const [at, setAt] = useState(() =>
    initialStory != null ? Math.max(0, Math.min(cards.length - 1, initialStory)) : 0);
  const s = cards[at];
  const last = at >= cards.length - 1;

  return (
    <div className="pd" style={{ position: "fixed", inset: 0, background: P.bg,
      overflow: "hidden", overscrollBehavior: "none" }}>
      <style>{skinCSS(S)}</style>
      <div style={{ ...ONE, height: "100%", display: "flex", flexDirection: "column",
        position: "relative" }}>

        {/* Where you are in the nine, and the way out. */}
        <div style={{ padding: `10px ${PAD}px 0`, flex: "none", zIndex: 6 }}>
          <div style={{ display: "flex", gap: 3, height: 3 }}>
            {cards.map((_, i) => (
              <div key={i} style={{ flex: 1, borderRadius: 3,
                background: i <= at ? P.accent : `${P.ink3}55` }} />
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 10, marginTop: 11 }}>
            <span className="pd-meta" style={{ fontWeight: 600, color: P.ink2, minWidth: 0,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              Round {wire.round} · {wire.raceName}</span>
            {onExit && (
              <button onClick={onExit} style={{ background: "none", border: "none", fontSize: 21,
                lineHeight: 1, padding: "2px 4px", flex: "none" }}>×</button>
            )}
          </div>
        </div>

        <div key={at} className="pd-fade" style={{ position: "relative", flex: 1, minHeight: 0 }}>
          <Card s={s} onPicks={onPicks} />
        </div>

        {/* One button. */}
        <div style={{ flex: "none", padding: `10px ${PAD}px 18px`, zIndex: 6 }}>
          <button onClick={() => (last ? onExit && onExit() : setAt(at + 1))}
            style={{ width: "100%", padding: "16px 20px", borderRadius: 999, border: "none",
              background: P.accent, color: P.bg, fontWeight: 700, fontSize: 16,
              letterSpacing: ".02em" }}>
            {last ? "DONE" : "NEXT"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Paddock({ playerName, round = null, onExit, onPicks,
  initialStory = null, initialFrame = 0, initialMode = "front", skin = "paper" }) {
  const S = SKINS[skin] || SKINS.paper;
  const [db, setDb] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [players, teams, races, scores, picks, results, schedule] = await Promise.all([
          supabase.from("players").select("*"),
          supabase.from("teams").select("*"),
          supabase.from("races").select("*").eq("season", 2026),
          supabase.from("scores").select("*"),
          supabase.from("picks").select("*"),
          supabase.from("results").select("*"),
          supabase.from("schedule").select("*"),
        ]);
        if (!alive) return;
        setDb({
          players: players.data || [], teams: teams.data || [], races: races.data || [],
          scores: scores.data || [], picks: picks.data || [], results: results.data || [],
          schedule: schedule.data || [],
        });
      } catch (e) {
        if (alive) setErr(String(e.message || e));
      }
    })();
    return () => { alive = false; };
  }, []);

  const wire = useMemo(() => (db ? buildWire(buildWeekly(db, playerName, round)) : null),
    [db, playerName, round]);

  if (err || (db && !wire)) return (
    <div className="pd" style={{ minHeight: "100dvh", display: "grid", placeItems: "center",
      padding: 30, textAlign: "center", background: S.P.bg }}>
      <style>{skinCSS(S)}</style>
      <div style={{ display: "grid", gap: 14, justifyItems: "center" }}>
        <div className="pd-h" style={{ fontFamily: S.SERIF, fontSize: 30 }}>Nothing to print</div>
        <div style={{ fontFamily: S.SANS, fontSize: 16, color: S.P.ink2 }}>
          {err ? "Something went wrong loading the round." : "This week hasn't been scored yet."}
        </div>
        {onExit && <button onClick={onExit} style={{ background: S.P.accent, color: S.P.bg,
          border: "none", borderRadius: 999, padding: "14px 32px", fontWeight: 700,
          fontSize: 15 }}>DONE</button>}
      </div>
    </div>
  );

  if (!db) return (
    <div className="pd" style={{ minHeight: "100dvh", display: "grid", placeItems: "center",
      background: S.P.bg }}>
      <style>{skinCSS(S)}</style>
      <div className="pd-kicker" style={{ color: S.P.ink3 }}>LOADING</div>
    </div>
  );

  return <PaddockPaper wire={wire} onExit={onExit} onPicks={onPicks} skin={skin}
    initialStory={initialStory} initialFrame={initialFrame} initialMode={initialMode} />;
}
