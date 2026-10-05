// The second weekly deck. Six cards, one takeaway each, and more air than the
// first. Andrew, 2026-10-05: "more white space and have each card have a clear
// action or takeaway."
//
//   1  The result. Your team won or lost, the two cars, the two scores, and
//      three ways on: with the music, without it, or skip the recap.
//   2  The podium. P1 raised between P2 and P3 like three peaks, then P4 to P7
//      in a row, then P8 to P10 and you (or your teammate, or P11).
//   3  Your box score. Your five drivers with what each was worth, then every
//      other line of the week's score.
//   4  The matchup taken apart. What the two teams did differently, the line,
//      and a grey box of everything both teams had.
//   5  Where you stand. Both tables.
//   6  Next race, picks and the flag, the same last card as the first deck.
//
// Data is buildWeeklyV2(buildWeekly(...)), computed in the browser from the
// round's rows. The shell, faces, tables and the last card come from
// Weekly.jsx so the two decks cannot drift apart on those. Mounted at
// /week?v=2 with the same ?player=, ?card= and ?round= overrides.
import { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabaseClient";
import { buildWeekly } from "./weekly.js";
import { buildWeeklyV2 } from "./weeklyV2.js";
import { shortName } from "./names.js";
import { DRIVER_HEADSHOTS, TEAM_BY_NAME } from "./drivers.js";
import { Flagged } from "./Flag.jsx";
import { shortOf } from "./teams.js";
import { playSong, pauseSong, toggleSong, songPlaying, onSong } from "./themeSong.js";
import { F1_TEAM_COLORS, av } from "./theme";
import {
  V, FD, FB, display, numeric, body, label, edgeGlow, textGlow,
  card as vcard, VEGAS_CSS,
} from "./theme.vegas";
import {
  Card, Head, Kicker, Line, Panel, Face, Logo, Count, StandingsTable,
  CardNext, TRACKS, RACE_NAME, PauseIcon, SpeakerIcon,
} from "./Weekly.jsx";

// The songs, newest first. Card 1's CONTINUE WITH MUSIC starts the first and
// the pill's next arrow walks down the list and round again. Andrew,
// 2026-10-05: "a music player that defaults to the newest song, and then has a
// next button and it plays the songs in order."
const PLAYLIST = ["bahlaysia", "tubey", "velvet"];

const MINE_C = V.green, THEIRS_C = V.pink;
const ordinal = n => {
  if (n == null) return "-";
  const t = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (t[(v - 20) % 10] || t[v] || t[0]);
};
const lastName = s => String(s || "").split(/\s+/).slice(-1)[0];
const dColor = name => F1_TEAM_COLORS[TEAM_BY_NAME[name]] || V.text3;
const two = n => (n == null ? "-" : Number(n).toFixed(2));
const signed = n => (n > 0 ? `+${n}` : String(n));

/* --------------------------------------------------------------- pieces */

// A car. The side and top views live in public/cars by team code, Hedra
// renders Andrew made on 2026-10-05, shrunk to 800 wide. A team with no car
// yet gets its logo on a plate so nothing is ever blank.
function CarImg({ code, view = "side", logo, style = {} }) {
  const [bad, setBad] = useState(false);
  if (!code || bad) {
    return (
      <div style={{ ...style, display: "flex", alignItems: "center", justifyContent: "center",
        background: V.bg3 }}>
        <Logo src={logo} size={48} />
      </div>
    );
  }
  return (
    <img src={`/cars/${code}-${view}.jpg`} alt="" onError={() => setBad(true)}
      style={{ display: "block", objectFit: "cover", ...style }} />
  );
}

// The two cars, the winner's nose ahead. Side views all face left, so ahead is
// further left and lower, in front of the other car.
function CarRace({ myTeam, oppTeam, outcome }) {
  const won = outcome === "won", lost = outcome === "lost";
  const ahead = lost ? oppTeam : myTeam, behind = lost ? myTeam : oppTeam;
  const aheadC = lost ? THEIRS_C : won ? MINE_C : V.blue;
  const behindC = lost ? V.text3 : won ? V.text3 : V.pink;
  const plate = (t, c, pos) => (
    <div style={{ position: "absolute", width: "76%", ...pos, borderRadius: 14,
      overflow: "hidden", border: `1.5px solid ${c}`,
      boxShadow: `0 10px 30px #000a, 0 0 18px ${c}44` }}>
      <CarImg code={t.code} logo={t.logo} style={{ width: "100%", aspectRatio: "16 / 9" }} />
      <div style={{ position: "absolute", left: 8, bottom: 6, display: "flex",
        alignItems: "center", gap: 6, padding: "3px 8px 3px 4px", borderRadius: 999,
        background: "#000c", border: `1px solid ${c}66` }}>
        <Logo src={t.logo} size={18} />
        <span style={{ ...display("chip", { fontSize: 13, color: V.text }) }}>
          {shortOf(t.name)}
        </span>
      </div>
    </div>
  );
  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 10.4" }}>
      {plate(behind, behindC, { right: 0, top: 0, zIndex: 1, filter: "brightness(0.78)" })}
      {plate(ahead, aheadC, { left: 0, bottom: 0, zIndex: 2 })}
    </div>
  );
}

// A tile with the light behind the shoulders: a radial glow in the accent at
// the top, falling to the card colour, so a face reads as lit from above.
const shoulder = (accent, strong = false) => ({
  ...vcard({}),
  background: `radial-gradient(120% 80% at 50% 0%, ${accent}${strong ? "44" : "2a"} 0%, ${V.bg2} 62%)`,
  border: `1px solid ${accent}${strong ? "88" : "44"}`,
});

const Big = ({ label: text, color = V.text, size = 30, glow = null, delay = 0 }) => (
  <div style={{ ...numeric("stat", { fontSize: size, color }), ...(glow ? textGlow(glow, 0.7) : {}) }}>
    {typeof text === "number" ? <Count to={text} delay={delay} dur={700} /> : text}
  </div>
);

function Peak({ r, rank, accent, me, tall = false, delay = 0 }) {
  if (!r) return <div style={{ flex: 1 }} />;
  const face = tall ? av(84) : av(62);
  return (
    <div className="v-pop" style={{ flex: 1, minWidth: 0, ...shoulder(me ? V.amber : accent, tall),
      padding: tall ? "16px 6px 12px" : "12px 6px 10px", marginTop: tall ? 0 : 34,
      display: "grid", gap: 4, justifyItems: "center", animationDelay: `${delay}ms` }}>
      <div style={{ ...numeric("chip", { fontSize: tall ? 20 : 17, color: accent }),
        ...textGlow(accent, 0.5) }}>P{rank}</div>
      <Face src={r.photo} size={face} ring={me ? V.amber : accent} width={3} />
      <Flagged name={shortName(r.name)} nation={r.nation} wrap gap={5}
        style={{ ...display("h3", { fontSize: tall ? 17 : 15, lineHeight: 1.2,
          color: me ? V.amber : V.text }), textAlign: "center" }} />
      <div style={{ ...display("chip", { fontSize: 13, color: V.text2 }), lineHeight: 1.2,
        overflowWrap: "anywhere" }}>{r.team ? shortOf(r.team) : ""}</div>
      <Big label={r.pts} size={tall ? 34 : 27} color={V.text} glow={V.blue} delay={700 + delay} />
    </div>
  );
}

function Small({ r, delay = 0 }) {
  if (!r) return <div style={{ flex: 1 }} />;
  const me = r.me, kind = r.kind || null;
  const accent = me ? V.amber : kind === "mate" ? V.blue : V.border2;
  const tag = me ? "YOU" : kind === "mate" ? "TEAMMATE" : null;
  return (
    <div className="v-pop" style={{ flex: 1, minWidth: 0, ...shoulder(me ? V.amber : kind === "mate" ? V.blue : V.text3),
      padding: "9px 4px 8px", display: "grid", gap: 3, justifyItems: "center",
      animationDelay: `${delay}ms` }}>
      <div style={{ ...numeric("chip", { fontSize: 15, color: me ? V.amber : V.text2 }) }}>
        P{r.place}
      </div>
      <Face src={r.photo} size={av(44)} ring={accent} width={2} />
      <div style={{ ...display("chip", { fontSize: 13, color: me ? V.amber : V.text }),
        lineHeight: 1.15, textAlign: "center", overflowWrap: "anywhere", letterSpacing: "0.02em" }}>
        {shortName(r.name)}
      </div>
      <div style={{ ...body("bodySm", { fontSize: 13, color: V.text3 }), lineHeight: 1.15,
        textAlign: "center", overflowWrap: "anywhere" }}>{r.team ? shortOf(r.team) : ""}</div>
      <Big label={r.pts} size={22} color={V.text} glow={V.blue} delay={900 + delay} />
      {tag && <div style={{ ...label({ fontSize: 11, color: accent }) }}>{tag}</div>}
    </div>
  );
}

// A driver's face, ringed in his team's colour, with the points he was worth.
function DriverTile({ name, pts, tag = null, dim = false, copies = 1, size = av(50) }) {
  const c = dColor(name);
  const url = DRIVER_HEADSHOTS[name];
  return (
    <div style={{ display: "grid", gap: 3, justifyItems: "center", minWidth: 0,
      filter: dim ? "grayscale(0.85) brightness(0.75)" : "none" }}>
      <div style={{ position: "relative" }}>
        <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden",
          border: `2px solid ${c}`, background: V.bg3, boxShadow: dim ? "none" : `0 0 12px ${c}55` }}>
          {url && <img src={url} alt="" style={{ width: "100%", height: "100%",
            objectFit: "cover", objectPosition: "top" }} />}
        </div>
        {copies > 1 && (
          <span style={{ position: "absolute", right: -6, top: -4, ...numeric("chip", { fontSize: 13, color: V.bg }),
            background: V.text, borderRadius: 999, padding: "0 6px" }}>x{copies}</span>
        )}
      </div>
      <div style={{ ...display("chip", { fontSize: 13, color: V.text }), lineHeight: 1.1 }}>
        {lastName(name)}
      </div>
      <div style={{ ...numeric("chip", { fontSize: 18, color: dim ? V.text3 : V.blue }) }}>{pts}</div>
      {tag && <div style={{ ...label({ fontSize: 11, color: V.amber }) }}>{tag}</div>}
    </div>
  );
}

const Button = ({ children, onClick, kind = "fill", color = V.blue }) => (
  <button onClick={onClick} style={{
    ...display("h3", { fontSize: 17, color: kind === "fill" ? V.bg : color }),
    background: kind === "fill" ? color : "transparent",
    border: kind === "ghost" ? "none" : `1.5px solid ${color}`,
    borderRadius: 999, padding: kind === "ghost" ? "8px 10px" : "14px 20px", cursor: "pointer",
    width: "100%", maxWidth: 340,
    ...(kind === "fill" ? { boxShadow: `0 0 18px ${color}77` } : {}),
    ...(kind === "ghost" ? { ...body("bodySm", { fontSize: 14, fontWeight: 600, color: V.text2 }),
      textDecoration: "underline", textUnderlineOffset: 3 } : {}),
  }}>{children}</button>
);

/* ---------------------------------------------------------------- music */

// Play or pause, the song's name, and the next song. One row, so it fits
// beside NEXT in the bottom bar and parks in the top chrome on the last card.
function MusicPill({ playing, name, onToggle, onNext, chrome = false }) {
  const color = playing ? V.blue : V.text2;
  const Icon = playing ? PauseIcon : SpeakerIcon;
  const [title] = name.split(" (feat. ");
  return (
    <div style={{
      ...(chrome ? { position: "fixed", top: 18, right: 62, zIndex: 31 } : { flexShrink: 1, minWidth: 0 }),
      display: "inline-flex", alignItems: "center", background: V.bg2,
      border: `1px solid ${playing ? V.blue : V.border2}`, borderRadius: 999,
      ...(playing ? edgeGlow(V.blue, 0.5) : {}), overflow: "hidden",
    }}>
      <button onClick={onToggle} aria-label={playing ? `Pause ${name}` : `Play ${name}`}
        aria-pressed={playing} style={{ display: "inline-flex", alignItems: "center", gap: 7,
        background: "transparent", border: "none", cursor: "pointer",
        padding: "9px 10px 9px 12px", minWidth: 0 }}>
        <span className={playing ? "v-pulse" : undefined} style={{ lineHeight: 0, flexShrink: 0 }}>
          <Icon color={color} size={17} />
        </span>
        <span style={{ ...body("bodySm", { fontSize: 13, fontWeight: 600, color, lineHeight: 1.2 }),
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 128 }}>{title}</span>
      </button>
      <button onClick={onNext} aria-label="Next song" style={{ background: "transparent",
        border: "none", borderLeft: `1px solid ${V.border}`, cursor: "pointer",
        padding: "9px 11px 9px 9px", lineHeight: 0 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
          <polygon points="4,4 14,12 4,20" fill={color} />
          <rect x="16" y="4" width="3.5" height="16" fill={color} />
        </svg>
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------- cards */

function CardResult({ v, onMusic, onNoMusic, onSkip }) {
  const r = v.result;
  const won = r.outcome === "won", lost = r.outcome === "lost";
  const c = won ? MINE_C : lost ? V.pink : V.blue;
  const mineC = won ? MINE_C : V.text2, theirsC = lost ? THEIRS_C : V.text2;
  return (
    <>
      <Kicker>ROUND {v.round} RECAP</Kicker>
      <Head color={c} glow={won} size="h1">
        {won ? "Your team won!" : lost ? "Your team lost." : "Your team drew."}
      </Head>
      <CarRace myTeam={r.myTeam} oppTeam={r.oppTeam} outcome={r.outcome} />
      <div style={{ display: "flex", width: "100%", gap: 10, marginTop: 4 }}>
        {[[r.myTeam, r.myTotal, mineC, won], [r.oppTeam, r.oppTotal, theirsC, lost]].map(([t, n, col, lit]) => (
          <div key={t.code} style={{ flex: 1, minWidth: 0, display: "grid", gap: 2, justifyItems: "center" }}>
            <div style={{ ...numeric("hero", { fontSize: 50, color: col }), ...(lit ? textGlow(col, 0.8) : {}) }}>
              <Count to={n} dur={800} delay={500} />
            </div>
            <div style={{ ...display("chip", { fontSize: 14, color: V.text2 }), textAlign: "center",
              overflowWrap: "anywhere" }}>{shortOf(t.name)}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gap: 10, width: "100%", justifyItems: "center", marginTop: 6 }}>
        <Button onClick={onMusic}>CONTINUE WITH MUSIC</Button>
        <Button onClick={onNoMusic} kind="line">CONTINUE WITHOUT MUSIC</Button>
        <Button onClick={onSkip} kind="ghost">Skip the recap</Button>
      </div>
    </>
  );
}

function CardPodium({ v }) {
  const p = v.podium;
  const [p1, p2, p3] = p.top3;
  const medal = [V.gold, V.silver, V.bronze];
  return (
    <>
      <Kicker>ROUND {v.round} · {String(v.raceName).toUpperCase()}</Kicker>
      <Head size="h2">This week&rsquo;s podium</Head>
      <div style={{ display: "flex", gap: 7, width: "100%", alignItems: "flex-start" }}>
        <Peak r={p2} rank={2} accent={medal[1]} me={p2 && p2.me} delay={220} />
        <Peak r={p1} rank={1} accent={medal[0]} me={p1 && p1.me} tall delay={0} />
        <Peak r={p3} rank={3} accent={medal[2]} me={p3 && p3.me} delay={440} />
      </div>
      <div style={{ display: "flex", gap: 6, width: "100%" }}>
        {p.row2.map((r, i) => <Small key={r.id} r={r} delay={700 + i * 90} />)}
      </div>
      <div style={{ display: "flex", gap: 6, width: "100%" }}>
        {p.row3.map((r, i) => <Small key={r.id} r={r} delay={1100 + i * 90} />)}
      </div>
    </>
  );
}

function CardBoxScore({ v }) {
  const b = v.boxScore;
  return (
    <>
      <Kicker>YOUR WEEK</Kicker>
      <Head size="h1" color={V.blue} glow>
        <Count to={b.ind} dur={700} /> points
      </Head>
      <Line color={V.text}>{ordinal(b.place)} of {b.field} this week{b.auto ? ", with picks the randomizer made" : ""}.</Line>
      <Panel pad={12}>
        <div style={{ ...label({ fontSize: 12, color: V.text3 }), marginBottom: 10 }}>YOUR DRIVERS</div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 4 }}>
          {b.drivers.map(x => (
            <DriverTile key={x.driver} name={x.driver} pts={x.pts}
              tag={x.top ? "TOP PICK" : null} />
          ))}
        </div>
      </Panel>
      <Panel pad={12}>
        <div style={{ display: "grid", gap: 6 }}>
          {b.lines.map(l => (
            <div key={l.key} style={{ display: "flex", alignItems: "baseline", gap: 8,
              padding: "4px 2px", borderBottom: `1px solid ${V.border}` }}>
              <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                <div style={{ ...body("bodyMd", { fontSize: 15, color: V.text }) }}>
                  {l.label}{l.who ? <span style={{ color: V.text2, fontWeight: 400 }}> · {lastName(l.who)}</span> : null}
                </div>
                {l.note && <div style={{ ...body("bodySm", { fontSize: 13, color: V.text3 }) }}>{l.note}</div>}
              </div>
              <div style={{ ...numeric("chip", { fontSize: 20, color: l.pts > 0 ? V.blue : V.text3 }) }}>
                {l.pts}
              </div>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "6px 2px 0" }}>
            <div style={{ flex: 1, textAlign: "left", ...display("h3", { fontSize: 18, color: V.text }) }}>Total</div>
            <div style={{ ...numeric("stat", { fontSize: 28, color: V.blue }), ...textGlow(V.blue, 0.6) }}>{b.ind}</div>
          </div>
        </div>
      </Panel>
    </>
  );
}

function reasonLine(m) {
  const r = m.reason, won = m.outcome === "won", drew = m.outcome === "drew";
  const mineW = r.side === "mine";
  if (r.kind === "boxbox") return mineW ? "The line won it for you." : "The line is what beat you.";
  if (r.kind === "driver") return `${lastName(r.driver)} was the difference, ${r.pts} points ${mineW ? "your way" : "theirs"}.`;
  if (r.kind === "order") return `The finishing order bonus ${mineW ? "won it" : "beat you"}.`;
  if (r.kind === "best") return `The best finish bonus ${mineW ? "won it" : "beat you"}.`;
  return drew ? "Level, all the way down." : won ? "A little of everything went your way." : "A little of everything went theirs.";
}

function CardMatchup({ v }) {
  const m = v.matchup;
  const won = m.outcome === "won", lost = m.outcome === "lost";
  const mineC = won ? MINE_C : V.text2, theirsC = lost ? THEIRS_C : V.text2;
  const ours = m.diffs.filter(x => x.side === "mine"), theirs = m.diffs.filter(x => x.side === "theirs");
  const bb = m.bb;
  const bbLit = bb.decided;
  const bbC = bb.won === "mine" ? MINE_C : bb.won === "theirs" ? THEIRS_C : V.blue;
  const rows = Math.max(ours.length, theirs.length);
  const Side = ({ x, color }) => x ? (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      <DriverTile name={x.driver} pts={signed(x.total)} copies={x.copies} size={av(40)} />
    </div>
  ) : <div />;
  return (
    <>
      <Kicker>YOUR MATCHUP</Kicker>
      <Head size="h2" color={won ? MINE_C : lost ? THEIRS_C : V.text} glow={won}>
        {won ? `Won ${m.myTotal} to ${m.oppTotal}` : lost ? `Lost ${m.oppTotal} to ${m.myTotal}` : `Drew ${m.myTotal} all`}
      </Head>
      <Line color={V.text}>{reasonLine(m)}</Line>

      <Panel pad={12}>
        <div style={{ ...label({ fontSize: 12, color: V.text3 }), marginBottom: 8 }}>WHAT SEPARATED YOU</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "center",
          paddingBottom: 6, borderBottom: `1px solid ${V.border}` }}>
          {[[m.myTeam, mineC], [m.oppTeam, theirsC]].map(([t, col]) => (
            <div key={t.code} style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
              <Logo src={t.logo} size={22} />
              <span style={{ ...display("chip", { fontSize: 13, color: col }) }}>{shortOf(t.name)}</span>
            </div>
          ))}
        </div>
        {rows === 0 && (
          <div style={{ ...body("bodySm", { fontSize: 14, color: V.text2 }), padding: "10px 0" }}>
            Same drivers on both sides.
          </div>
        )}
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
            padding: "8px 0", borderBottom: `1px solid ${V.border}` }}>
            <div style={{ display: "flex", justifyContent: "center" }}><Side x={ours[i]} color={MINE_C} /></div>
            <div style={{ display: "flex", justifyContent: "center" }}><Side x={theirs[i]} color={THEIRS_C} /></div>
          </div>
        ))}
        {m.bonuses.map(b => (
          <div key={b.key} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
            padding: "8px 0", borderBottom: `1px solid ${V.border}`, alignItems: "center",
            background: b.decided ? `${V.amber}12` : "transparent" }}>
            <div style={{ gridColumn: "1 / -1", ...body("bodySm", { fontSize: 13, color: b.decided ? V.amber : V.text2 }) }}>
              {b.label}{b.decided ? " decided it" : ""}
            </div>
            <div style={{ ...numeric("chip", { fontSize: 20, color: b.mine > b.theirs ? MINE_C : V.text3 }) }}>{b.mine}</div>
            <div style={{ ...numeric("chip", { fontSize: 20, color: b.theirs > b.mine ? THEIRS_C : V.text3 }) }}>{b.theirs}</div>
          </div>
        ))}
        <div style={{ display: "grid", gap: 4, padding: "10px 6px 4px", borderRadius: 10, marginTop: 4,
          ...(bbLit ? { border: `1.5px solid ${bbC}`, boxShadow: `0 0 14px ${bbC}55`, background: `${bbC}10` } : {}) }}>
          <div style={{ ...label({ fontSize: 12, color: bbLit ? bbC : V.text3 }) }}>
            BOX BOX{bbLit ? " · THIS DECIDED IT" : ""}
          </div>
          <div style={{ ...body("bodySm", { fontSize: 14, color: V.text }) }}>
            {bb.pit == null
              ? "No pit stop this week, so the line paid nobody."
              : <>Your Matchup&rsquo;s Line <b style={{ color: V.blue }}>{two(bb.line)}</b>, the stop was <b style={{ color: bbC }}>{two(bb.pit)}</b>.</>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ ...numeric("chip", { fontSize: 20, color: bb.mine > 0 ? MINE_C : V.text3 }) }}>{signed(bb.mine)}</div>
            <div style={{ ...numeric("chip", { fontSize: 20, color: bb.theirs > 0 ? THEIRS_C : V.text3 }) }}>{signed(bb.theirs)}</div>
          </div>
        </div>
      </Panel>

      {(m.shared.length > 0 || m.sharedBonus.length > 0) && (
        <Panel pad={12} style={{ opacity: 0.72 }}>
          <div style={{ ...label({ fontSize: 12, color: V.text3 }), marginBottom: 8 }}>BOTH TEAMS HAD</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
            {m.shared.map(x => (
              <DriverTile key={x.driver} name={x.driver} pts={x.pts} copies={x.copies} dim size={av(38)} />
            ))}
          </div>
          {m.sharedBonus.map(b => (
            <div key={b.key} style={{ ...body("bodySm", { fontSize: 13, color: V.text3 }), marginTop: 8 }}>
              {b.label}, {b.pts} each
            </div>
          ))}
        </Panel>
      )}
    </>
  );
}

function CardStandings({ v }) {
  const c = v.standings;
  const t = c.team, ind = c.individual;
  const divName = t && t.division === "championship" ? "Championship" : "Second Division";
  const iMove = ind && c.individualBefore ? c.individualBefore.place - ind.place : null;
  // teamBefore is { place, pts }, not a number.
  const tMove = t && c.teamBefore ? c.teamBefore.place - t.place : null;
  const moveWord = m => (m == null || m === 0 ? "" : m > 0 ? `, up ${m}` : `, down ${-m}`);
  return (
    <>
      <Kicker>WHERE YOU STAND</Kicker>
      <div style={{ display: "flex", width: "100%", gap: 10 }}>
        {ind && (
          <div style={{ flex: 1, ...shoulder(V.blue), padding: "12px 8px", display: "grid", gap: 2 }}>
            <div style={{ ...numeric("stat", { fontSize: 38, color: V.blue }), ...textGlow(V.blue, 0.6) }}>P{ind.place}</div>
            <div style={{ ...label({ fontSize: 12, color: V.text2 }) }}>YOU, OF {ind.of}{moveWord(iMove)}</div>
          </div>
        )}
        {t && (
          <div style={{ flex: 1, ...shoulder(V.pink), padding: "12px 8px", display: "grid", gap: 2 }}>
            <div style={{ ...numeric("stat", { fontSize: 38, color: V.pink }), ...textGlow(V.pink, 0.6) }}>P{t.place}</div>
            <div style={{ ...label({ fontSize: 12, color: V.text2 }) }}>{shortOf(t.name)}, {divName}{moveWord(tMove)}</div>
          </div>
        )}
      </div>
      {ind && (
        <Panel pad={12}>
          <div style={{ ...label({ fontSize: 12, color: V.text3 }), marginBottom: 8, textAlign: "left" }}>
            PLAYERS · POINTS A RACE
          </div>
          <StandingsTable rows={c.indAll} kind="player" value={r => r.avg} unit="AVG" />
        </Panel>
      )}
      {t && (
        <Panel pad={12}>
          <div style={{ ...label({ fontSize: 12, color: V.text3 }), marginBottom: 8, textAlign: "left" }}>
            {divName.toUpperCase()} · {t.w}-{t.l}{t.d ? `-${t.d}` : ""}
          </div>
          <StandingsTable rows={c.teamAll} kind="team" />
        </Panel>
      )}
    </>
  );
}

/* ----------------------------------------------------------------- deck */

export function WeeklyDeckV2({ data: given, onExit, onPicks, initialCard = 0 }) {
  const data = given && RACE_NAME[given.round] ? { ...given, raceName: RACE_NAME[given.round] } : given;
  const v = useMemo(() => buildWeeklyV2(data), [data]);
  const cards = [
    { kind: "result", Body: CardResult },
    { kind: "podium", Body: CardPodium },
    { kind: "box", Body: CardBoxScore },
    { kind: "matchup", Body: CardMatchup },
    { kind: "standings", Body: CardStandings, scrolls: true },
    { kind: "next", Body: CardNext },
  ];
  const [i, setI] = useState(Math.min(cards.length - 1, Math.max(0, initialCard)));

  // The music. themeSong.js holds the one Audio object outside React; leaving
  // the deck stops it, the way the first deck does on every ordinary round.
  const [track, setTrack] = useState(0);
  const [playing, setPlaying] = useState(() => songPlaying());
  useEffect(() => onSong(setPlaying), []);
  useEffect(() => () => pauseSong(), []);
  const play = idx => { setTrack(idx); setPlaying(true); playSong(TRACKS[PLAYLIST[idx]].src); };
  const toggle = () => { setPlaying(!playing); toggleSong(TRACKS[PLAYLIST[track]].src); };
  const next = () => play((track + 1) % PLAYLIST.length);
  const name = TRACKS[PLAYLIST[track]].name;

  useEffect(() => { window.scrollTo(0, 0); }, [i]);
  const advance = () => setI(Math.min(cards.length - 1, i + 1));
  const back = () => setI(Math.max(0, i - 1));

  if (!data || !v) return null;
  const { kind, Body, scrolls } = cards[i];
  const last = i === cards.length - 1;
  const bar = kind !== "result" && !last;

  return (
    <div style={{ background: V.bg, minHeight: "100dvh", position: "relative", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Monoton&family=Encode+Sans+Semi+Condensed:wght@400;600;700&family=Chakra+Petch:wght@600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${V.bg}; overflow-x: hidden; }
        html { overflow-x: hidden; }
        .f5card > * { max-width: 100% !important; flex-shrink: 0 !important; position: relative; }
        @keyframes v-enter { from { opacity: 0; transform: translateY(15px); }
                             to { opacity: 1; transform: none; } }
        .f5card > * { animation: v-enter 400ms cubic-bezier(.2,.85,.3,1) both; }
        .f5card > *:nth-child(2) { animation-delay: 70ms; }
        .f5card > *:nth-child(3) { animation-delay: 140ms; }
        .f5card > *:nth-child(4) { animation-delay: 210ms; }
        .f5card > *:nth-child(n+5) { animation-delay: 280ms; }
        @keyframes v-pop { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .v-pop { animation: v-pop 420ms cubic-bezier(.2,.85,.3,1) both; }
        @media (prefers-reduced-motion: reduce) {
          .f5card > *, .v-pop { animation: none !important; }
        }
        .v-scroll::-webkit-scrollbar { height: 0; width: 0; }
        ${VEGAS_CSS}
      `}</style>

      {/* Progress. One light a card. */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 30,
        display: "flex", gap: 4, padding: "14px 16px 10px",
        background: `linear-gradient(${V.bg} 60%, transparent)` }}>
        {cards.map((c, ci) => (
          <div key={c.kind} style={{ flex: 1, height: 3, borderRadius: 2, background: V.bg4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: ci <= i ? "100%" : "0%", borderRadius: 2,
              background: V.blue, boxShadow: ci === i ? `0 0 8px ${V.blue}` : "none",
              transition: "width 420ms cubic-bezier(.2,.85,.3,1)" }} />
          </div>
        ))}
      </div>

      {i > 0 && (
        <button onClick={back} aria-label="Back" style={{
          position: "fixed", top: 20, left: 12, zIndex: 31, background: "transparent",
          border: "none", cursor: "pointer", padding: "8px 10px", lineHeight: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <polyline points="15,4 7,12 15,20" fill="none" stroke={V.text3}
              strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      {/* Skip goes home and counts as seen. Not on card 1, which offers it in
          the body, and not on the last card, which is the way out. */}
      {kind !== "result" && !last && (
        <button onClick={onExit} style={{ position: "fixed", top: 26, right: 14, zIndex: 31,
          ...label({ fontSize: 12, color: V.text3 }), background: "transparent",
          border: "none", cursor: "pointer", padding: "6px 4px" }}>SKIP</button>
      )}

      {last && <MusicPill chrome playing={playing} name={name} onToggle={toggle} onNext={next} />}

      <Card dep={`v2-${i}-${data.player.name}`} bottom={0} scrolls={Boolean(scrolls)}>
        <Body v={v} d={data} onPicks={onPicks} onExit={onExit}
          onMusic={() => { play(0); advance(); }}
          onNoMusic={advance}
          onSkip={onExit} />
      </Card>

      {bar && (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 30,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          padding: "16px 16px 26px", background: `linear-gradient(transparent, ${V.bg} 46%)` }}>
          <MusicPill playing={playing} name={name} onToggle={toggle} onNext={next} />
          <button onClick={advance} style={{
            ...display("h3", { color: V.bg }), background: V.blue, border: "none",
            borderRadius: 999, padding: "13px 28px", cursor: "pointer", flexShrink: 0,
            boxShadow: `0 0 18px ${V.blue}77` }}>NEXT</button>
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- loader */

export default function WeeklyV2({ playerName, round = null, onExit, onPicks, initialCard = 0 }) {
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

  const data = useMemo(() => (db ? buildWeekly(db, playerName, round) : null), [db, playerName, round]);

  if (err || (db && !data)) return (
    <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 30,
      background: V.bg, color: V.text, fontFamily: FB, textAlign: "center" }}>
      <div style={{ display: "grid", gap: 14, justifyItems: "center" }}>
        <div style={{ ...display("h2") }}>Nothing here yet</div>
        <div style={{ ...body("body", { color: V.text2 }) }}>
          {err ? "Something went wrong loading the round." : "This week hasn't been scored yet."}
        </div>
        {onExit && <button onClick={onExit} style={{
          ...display("h3", { color: V.bg }), background: V.blue, border: "none",
          borderRadius: 999, padding: "12px 32px", cursor: "pointer" }}>DONE</button>}
      </div>
    </div>
  );

  if (!db) return (
    <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center",
      background: V.bg, color: V.text3, fontFamily: FB }}>
      <div style={{ ...label({ color: V.text3 }) }} className="v-pulse">LOADING</div>
    </div>
  );

  return <WeeklyDeckV2 data={data} onExit={onExit} onPicks={onPicks} initialCard={initialCard} />;
}
