import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";
import Schedule from "./Schedule.jsx";
import Rules from "./Rules.jsx";
import Admin from "./Admin.jsx";
import RaceResults from "./RaceResults.jsx";
import MyPicks, { PickHistory } from "./MyPicks.jsx";
import PlayerStandings from "./PlayerStandings.jsx";
import TeamStandings from "./TeamStandings.jsx";
import TeamsPage from "./TeamsPage.jsx";
import PlayersPage from "./PlayersPage.jsx";
import DivisionTrends from "./DivisionTrends.jsx";
import Strategy from "./Strategy.jsx";
import F1Calendar from "./F1Calendar.jsx";
import Players from "./Players.jsx";
import PracticePicks from "./PracticePicks.jsx";
import PickIntel from "./PickIntel.jsx";
import Recaps from "./Recaps.jsx";
import VegasHome from "./VegasHome.jsx";
import ViewingAs from "./ViewingAs.jsx";
import MorePage from "./MorePage.jsx";
import ComingSoon from "./ComingSoon.jsx";
import DashboardPage from "./DashboardPage.jsx";
import VegasNav from "./VegasNav.jsx";
import Recap from "./Recap.jsx";
import { NEWS } from "./news";


import { BG, BG2, DARK, BLUE, BLUEDARK, GREEN, RED, ORANGE, TEXT, TEXT2, BORDER, avatarColor } from "./theme";
const LOGO_B64 = "data:image/png;base64,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";

// ── Circuit data (same as F1Calendar) ────────────────────
const CIRCUITS = {
  1:  { city: "Melbourne",   country: "🇦🇺", circuit: "Albert Park" },
  2:  { city: "Shanghai",    country: "🇨🇳", circuit: "Shanghai International" },
  3:  { city: "Suzuka",      country: "🇯🇵", circuit: "Suzuka Circuit" },
  4:  { city: "Miami",       country: "🇺🇸", circuit: "Miami International" },
  5:  { city: "Montréal",    country: "🇨🇦", circuit: "Circuit Gilles Villeneuve" },
  6:  { city: "Monaco",      country: "🇲🇨", circuit: "Circuit de Monaco" },
  7:  { city: "Barcelona",   country: "🇪🇸", circuit: "Circuit de Barcelona-Catalunya" },
  8:  { city: "Spielberg",   country: "🇦🇹", circuit: "Red Bull Ring" },
  9:  { city: "Silverstone", country: "🇬🇧", circuit: "Silverstone Circuit" },
  10: { city: "Spa",         country: "🇧🇪", circuit: "Spa-Francorchamps" },
  11: { city: "Budapest",    country: "🇭🇺", circuit: "Hungaroring" },
  12: { city: "Zandvoort",   country: "🇳🇱", circuit: "Circuit Zandvoort" },
  13: { city: "Monza",       country: "🇮🇹", circuit: "Autodromo di Monza" },
  14: { city: "Madrid",      country: "🇪🇸", circuit: "Madrid Street Circuit" },
  15: { city: "Baku",        country: "🇦🇿", circuit: "Baku City Circuit" },
  16: { city: "Kuala Lumpur", country: "🇲🇾", circuit: "Sepang International" },
  17: { city: "Singapore",   country: "🇸🇬", circuit: "Marina Bay" },
  18: { city: "Austin",      country: "🇺🇸", circuit: "COTA" },
  19: { city: "Mexico City", country: "🇲🇽", circuit: "Autódromo Hermanos Rodríguez" },
  20: { city: "São Paulo",   country: "🇧🇷", circuit: "Interlagos" },
  21: { city: "Las Vegas",   country: "🇺🇸", circuit: "Las Vegas Strip" },
  22: { city: "Lusail",      country: "🇶🇦", circuit: "Lusail International" },
  23: { city: "Abu Dhabi",   country: "🇦🇪", circuit: "Yas Marina" }
};

// ── Season Preview Carousel ──────────────────────────────
const PREVIEW_SLIDES = [
  { title: "Welcome to 2026", emoji: "🏁", body: "New season, new rules, new app. Everything about Formula 5 has been rebuilt from the ground up. 24 races. Two championships. Let's go racing." },
  { title: "Brand New App", emoji: "📱", body: "No more Google Forms and Sheets. We've built a full web app — make your picks, check standings, view results, and track your team all in one place." },
  { title: "Two-Player Teams", emoji: "👥", body: "Teams are now two players instead of four. Nowhere to hide. Every point matters. Every bad pick is exposed. Head-to-head matchups every single race." },
  { title: "How You Score", emoji: "🎯", body: "Pick 5 drivers each race: 1 Top Pick from the top 5 in F1, plus 4 Midfield picks from P6–P15. Earn real F1 points — P1 = 25 pts, P2 = 18, all the way down. DNF = −1." },
  { title: "Finishing Order Bonus", emoji: "📊", body: "Arrange your 5 drivers in predicted finishing order. Nail the exact order → +6 bonus points. Miss it → you keep your driver points, just no bonus." },
  { title: "Best Finish Bonus", emoji: "🏅", body: "Predict the exact finishing position of your best driver. Get it right → +3 bonus points." },
  { title: "The Needle 🪡", emoji: "⏱️", body: "NEW: Guess a designated pit stop time in seconds. Exact = +5 pts. Within ±0.1s = +4, ±0.2s = +3, ±0.3s = +2, ±0.4s = +1. This also drives the team game." },
  { title: "Teams: Then vs Now", emoji: "🔄", body: "Last year: 4-player teams, no head-to-head matchups. Your team score was just everyone's individual points added up. Best players = best team. Not much strategy.\n\nThis year: 2-player teams. Head-to-head matchups every race, like fantasy football. Win = 3 championship pts, Tie = 1, Loss = 0." },
  { title: "How Matchups Work", emoji: "⚔️", body: "Each race, your team faces another team. Your Matchup Score = your combined driver points (yours + teammate's, no Needle) + the BOX BOX result. Higher score wins.\n\nThe Needle does NOT count toward the matchup — it only scores individually. But it determines the BOX BOX Line, which is worth +5 or −1 for your team." },
  { title: "Example: Playing for You", emoji: "🅰️", body: "Ferrari's first pit stop. Realistic time: ~2.4s. Your team is UNDER.\n\nYou guess 2.4s. Others guess ~2.4s too. BOX BOX Line = 2.45s. Actual stop = 2.6s.\n\nYour Needle score? Great — 2.4 was close. But 2.6 is OVER the 2.45 line, so the OVER team wins the +5 bonus. You got your individual points. Your team lost the matchup." },
  { title: "Example: Playing for Team", emoji: "🅱️", body: "Same scenario — your team is UNDER. But this time you guess 4.0s to push the average up.\n\nBOX BOX Line jumps to 2.8s. Actual stop = 2.6s. 2.6 is UNDER 2.8 — your team wins +5!\n\nYour Needle score? Zero — 4.0 was nowhere near 2.6. But you sacrificed your individual points to win the matchup for your team." },
  { title: "That's the Game", emoji: "💡", body: "Every week you choose: guess accurately for yourself, or guess strategically for your team. It depends on your matchup, your read on the pit stop, and how much you trust your teammate.\n\nThere's no objectively right answer. That tension is what makes the Needle interesting." },
  { title: "The BOX BOX Line", emoji: "📦", body: "Each matchup has a BOX BOX Line — the average of all 4 players' pit guesses. One team is OVER, one is UNDER. Right side = +5 team pts. Wrong side = −1. Six-point swing." },
  { title: "The Tension", emoji: "🤔", body: "Guess accurately → maximize your individual score. Guess strategically → shift the BOX BOX Line for your team. You can't always do both. That's what makes it fun." },
  { title: "Two Divisions", emoji: "↕️", body: "12 teams in Championship, 12 in Second Division. After Race 12: top 3 in Second get promoted, bottom 3 in Championship get relegated. Playoff spots for 4th/5th and 8th/9th." },
  { title: "Two Halves", emoji: "📅", body: "Races 1–12 set your division. Races 13–24 are the Team Championship — standings reset, and the team with the most points in the second half wins it all. Individual standings never reset." },
  { title: "Weekly Top 10", emoji: "🏆", body: "Top 10 scorers each week earn bonus points: 1st = +10, 2nd = +9 … 10th = +1. Theoretical max per race: 114 points. Last year's max was ~35. The scale is completely different." },
  { title: "What To Do Now", emoji: "✅", body: "Log in and set your name. Try Practice Picks to learn the flow. First race is Melbourne — picks open Tuesday at noon, lock Friday at noon. Read the rules. Talk to your teammate. Let's go." },
];

function SeasonPreview() {
  const [idx, setIdx] = useState(0);
  const scrollRef = useRef(null);
  const total = PREVIEW_SLIDES.length;

  const scrollTo = (i) => {
    setIdx(i);
    if (scrollRef.current) {
      const card = scrollRef.current.children[i];
      if (card) card.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const cardWidth = container.children[0]?.offsetWidth || 1;
    const gap = 12;
    const newIdx = Math.round(container.scrollLeft / (cardWidth + gap));
    if (newIdx !== idx && newIdx >= 0 && newIdx < total) setIdx(newIdx);
  };

  return (
    <div style={{ padding: "20px 20px 100px" }}>
      <p style={{ fontFamily: "'Geologica', sans-serif", fontWeight: 900, fontSize: 22, color: "#1e1e2a", textTransform: "uppercase", letterSpacing: "0.03em", margin: "0 0 4px" }}>Season Preview</p>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#6b6b80", marginBottom: 20 }}>Swipe through everything new in 2026</p>

      <div ref={scrollRef} onScroll={handleScroll} style={{
        display: "flex", gap: 12, overflowX: "auto", scrollSnapType: "x mandatory",
        scrollbarWidth: "none", paddingBottom: 4
      }}>
        {PREVIEW_SLIDES.map((s, i) => (
          <div key={i} style={{
            flex: "0 0 85%", scrollSnapAlign: "center",
            background: "#fff", borderRadius: 16, border: "1px solid #d8d2c4",
            padding: "20px 18px", minHeight: 180,
            display: "flex", flexDirection: "column"
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{s.emoji}</div>
            <p style={{ fontFamily: "'Geologica', sans-serif", fontWeight: 900, fontSize: 16, color: "#1e1e2a", textTransform: "uppercase", letterSpacing: "0.02em", margin: "0 0 8px" }}>{s.title}</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#6b6b80", lineHeight: 1.55, margin: 0, flex: 1 }}>{s.body}</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "#d8d2c4", margin: "10px 0 0", textAlign: "right" }}>{i + 1} / {total}</p>
          </div>
        ))}
      </div>
      {/* Dots */}
      <div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 10 }}>
        {PREVIEW_SLIDES.map((_, i) => (
          <button key={i} onClick={() => scrollTo(i)} style={{
            width: idx === i ? 18 : 6, height: 6, borderRadius: 3,
            background: idx === i ? "#6cb8e0" : "#d8d2c4",
            border: "none", padding: 0, cursor: "pointer",
            transition: "all 0.2s"
          }} />
        ))}
      </div>
    </div>
  );
}

// ── News Feed ────────────────────────────────────────────
const TONE = { good: GREEN, warn: ORANGE, bad: RED, dead: TEXT2 };

function NewsAvatar({ story, playerPhoto }) {
  const size = 32;
  const base = { width: size, height: size, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" };
  if (story.authorType === "auto") {
    return (
      <div style={{ ...base, background: DARK }}>
        <img src={LOGO_B64} alt="Formula 5" style={{ width: "80%", objectFit: "contain", filter: "brightness(0) invert(1)" }} />
      </div>
    );
  }
  if (playerPhoto) return <img src={playerPhoto} alt={story.author} style={{ ...base, objectFit: "cover" }} />;
  const color = avatarColor(story.author);
  return (
    <div style={{ ...base, background: `${color}20`, border: `2px solid ${color}50`, fontFamily: "'Geologica', sans-serif", fontWeight: 800, fontSize: 11, color }}>
      {getInitials(story.author)}
    </div>
  );
}

// One player: avatar over name, sized for a half-width column.
function PlayerChip({ name, playersByName }) {
  const photo = playersByName[name]?.photo_url;
  const color = avatarColor(name);
  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      {photo ? (
        <img src={photo} alt={name} style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover", border: `1.5px solid ${color}40` }} />
      ) : (
        <div style={{ width: 30, height: 30, borderRadius: "50%", background: `${color}20`, border: `1.5px solid ${color}50`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Geologica', sans-serif", fontWeight: 800, fontSize: 10, color }}>
          {getInitials(name)}
        </div>
      )}
      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9.5, color: TEXT, textAlign: "center", lineHeight: 1.15, wordBreak: "break-word" }}>{name}</span>
    </div>
  );
}

// Hero box: team name, logo, place + points, status chip. Border carries the tone.
// Grid stretches both columns; the box flexes so paired boxes match height.
function TeamHero({ x, teamsByName, playersByName }) {
  const c = TONE[x.tone] || TEXT2;
  const logo = teamsByName[x.name]?.logo_url;
  return (
    <div style={{ display: "flex", flexDirection: "column", minWidth: 0, height: "100%" }}>
      <div style={{ flex: 1, border: `2px solid ${c}`, background: `${c}0c`, borderRadius: 12, padding: "10px 5px 12px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", gap: 6, textAlign: "center" }}>
        <p style={{ fontFamily: "'Geologica', sans-serif", fontWeight: 900, fontSize: 12, color: DARK, margin: 0, lineHeight: 1.2 }}>{x.label || x.name}</p>
        {logo ? (
          <img src={logo} alt={x.label || x.name} style={{ width: 52, height: 52, objectFit: "contain" }} />
        ) : (
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: `${c}20`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Geologica', sans-serif", fontWeight: 900, fontSize: 16, color: c }}>
            {getInitials(x.label || x.name)}
          </div>
        )}
        <p style={{ fontFamily: "'Geologica', sans-serif", fontWeight: 700, fontSize: 11, color: TEXT2, margin: 0 }}>{x.meta}</p>
        <span style={{ fontFamily: "'Geologica', sans-serif", fontWeight: 800, fontSize: 8.5, letterSpacing: "0.06em", textTransform: "uppercase", color: c, background: `${c}22`, padding: "3px 7px", borderRadius: 5, lineHeight: 1.3 }}>{x.tag}</span>
      </div>
      <div style={{ display: "flex", gap: 3, marginTop: 8 }}>
        {x.players.map(n => <PlayerChip key={n} name={n} playersByName={playersByName} />)}
      </div>
    </div>
  );
}

// Ranked dot plot. Averages cluster in a narrow band, so a zero-baseline bar
// would flatten every difference — dots on a zoomed scale carry position
// without implying length. Blue/orange validated for CVD separation.
const DIV_COLOR = { C: "#2a6fa8", "2": "#e08a2e" };
const DIV_LABEL = { C: "Championship", "2": "Second Division" };

function AvgChart({ b }) {
  const vals = b.rows.map(r => r.avg);
  const lo = Math.floor(Math.min(...vals)) - 2, hi = Math.ceil(Math.max(...vals)) + 2;
  const pct = v => ((v - lo) / (hi - lo)) * 100;
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", gap: 14, marginBottom: 10 }}>
        {["C", "2"].map(d => (
          <span key={d} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: DIV_COLOR[d] }} />
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: TEXT2 }}>{DIV_LABEL[d]}</span>
          </span>
        ))}
      </div>
      {b.rows.map(r => (
        <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <span style={{ flex: "0 0 42%", fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: TEXT, lineHeight: 1.2 }}>{r.name}</span>
          <div style={{ flex: 1, position: "relative", height: 14 }}>
            <div style={{ position: "absolute", top: 6, left: 0, right: 0, height: 2, background: BORDER, borderRadius: 1 }} />
            <div style={{ position: "absolute", top: 1, left: `${pct(r.avg)}%`, transform: "translateX(-50%)", width: 12, height: 12, borderRadius: "50%", background: DIV_COLOR[r.div], border: "2px solid #fff" }} />
          </div>
          <span style={{ flex: "0 0 32px", textAlign: "right", fontFamily: "'Geologica', sans-serif", fontWeight: 700, fontSize: 12, color: TEXT }}>{r.avg.toFixed(1)}</span>
        </div>
      ))}
      {b.note && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: TEXT2, lineHeight: 1.5, margin: "10px 0 0" }}>{b.note}</p>}
    </div>
  );
}

// Standings dot plot with the cut line drawn in. Zone colors validated for
// CVD separation (blue/orange/red, worst normal-vision pair dE 23.7); every row
// also carries its position, name and value as text, so color is never alone.
const ZONE = { ok: "#2a6fa8", mp: "#e08a2e", drop: "#b02525", none: "#8a8a9a" };

function StandingsChart({ b }) {
  const vals = b.rows.map(r => r.pts);
  const lo = Math.min(...vals) - 12, hi = Math.max(...vals) + 8;
  const pct = v => ((v - lo) / (hi - lo)) * 100;
  return (
    <div style={{ marginTop: 14 }}>
      {b.rows.map(r => (
        <div key={r.name}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ flex: "0 0 15px", textAlign: "right", fontFamily: "'Geologica', sans-serif", fontWeight: 700, fontSize: 11, color: TEXT2 }}>{r.pos}</span>
            <span style={{ flex: "0 0 28%", fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: TEXT, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
            <span style={{ flex: "0 0 88px", textAlign: "right" }}>
              <span style={{ display: "inline-block", fontFamily: "'Geologica', sans-serif", fontWeight: 800, fontSize: 8.5, letterSpacing: "0.04em", textTransform: "uppercase", color: TONE[r.ctone], background: `${TONE[r.ctone]}1e`, padding: "2px 5px", borderRadius: 3, whiteSpace: "nowrap" }}>{r.chip}</span>
            </span>
            <div style={{ flex: 1, minWidth: 28, position: "relative", height: 16 }}>
              <div style={{ position: "absolute", top: 6, left: 0, right: 0, height: 2, background: BORDER, borderRadius: 1 }} />
              <div style={{ position: "absolute", top: 1, left: `${pct(r.pts)}%`, transform: "translateX(-50%)", width: 12, height: 12, borderRadius: "50%", background: ZONE[r.zone], border: "2px solid #fff" }} />
            </div>
            <span style={{ flex: "0 0 28px", textAlign: "right", fontFamily: "'Geologica', sans-serif", fontWeight: 700, fontSize: 12, color: TEXT }}>{r.pts}</span>
          </div>
          {r.badge && (
            <div style={{ display: "flex", justifyContent: "flex-end", margin: "1px 30px 2px 0" }}>
              <span style={{ fontFamily: "'Geologica', sans-serif", fontWeight: 800, fontSize: 8.5, letterSpacing: "0.07em", textTransform: "uppercase", color: ZONE.mp, background: `${ZONE.mp}22`, padding: "2px 5px", borderRadius: 4 }}>{r.badge}</span>
            </div>
          )}
          {r.pos === b.lineAfter && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "5px 0 6px" }}>
              <span style={{ flex: 1, height: 2, background: ZONE.drop, opacity: 0.5, borderRadius: 1 }} />
              <span style={{ fontFamily: "'Geologica', sans-serif", fontWeight: 800, fontSize: 9.5, letterSpacing: "0.09em", textTransform: "uppercase", color: ZONE.drop }}>{b.lineLabel}</span>
              <span style={{ flex: 1, height: 2, background: ZONE.drop, opacity: 0.5, borderRadius: 1 }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Odds bars. Probability has a true zero and length is the whole point, so a
// bar from a zero baseline is correct here (unlike the points/average dot plots).
function OddsChart({ b }) {
  return (
    <div style={{ marginTop: 16 }}>
      <p style={{ fontFamily: "'Geologica', sans-serif", fontWeight: 800, fontSize: 12.5, color: DARK, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 1px" }}>{b.title}</p>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: TEXT2, margin: "0 0 9px" }}>{b.sub}</p>
      {b.rows.map(r => {
        const c = r.p >= 95 ? ZONE.ok : r.p >= 20 ? ZONE.mp : ZONE.drop;
        const label = r.p === 100 ? ">99.9%" : r.p === 0 ? "0%" : `${r.p}%`;
        return (
          <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <span style={{ flex: "0 0 40%", fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
            <div style={{ flex: 1, height: 12, background: BG2, borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${Math.max(r.p, 0.6)}%`, height: "100%", background: c, borderRadius: 3 }} />
            </div>
            <span style={{ flex: "0 0 44px", textAlign: "right", fontFamily: "'Geologica', sans-serif", fontWeight: 700, fontSize: 12, color: TEXT }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function NewsBlock({ b, teamsByName, playersByName }) {
  if (b.t === "h") return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "26px 0 0" }}>
      <span style={{ fontFamily: "'Geologica', sans-serif", fontWeight: 900, fontSize: 15, color: DARK, textTransform: "uppercase", letterSpacing: "0.04em" }}>{b.text}</span>
      <span style={{ flex: 1, height: 2, background: BLUE }} />
    </div>
  );
  if (b.t === "sub") return (
    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.08em", margin: "3px 0 0" }}>{b.text}</p>
  );
  if (b.t === "note") return (
    <div style={{ background: `${BLUE}0e`, border: `1px solid ${BLUE}35`, borderRadius: 10, padding: "10px 12px", margin: "12px 0 0" }}>
      {b.title && <p style={{ fontFamily: "'Geologica', sans-serif", fontWeight: 800, fontSize: 10, color: BLUEDARK, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>{b.title}</p>}
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12.5, color: TEXT, lineHeight: 1.6, margin: 0 }}>{b.text}</p>
    </div>
  );
  if (b.t === "chart") return <AvgChart b={b} />;
  if (b.t === "standings") return <StandingsChart b={b} />;
  if (b.t === "odds") return <OddsChart b={b} />;
  if (b.t === "m") return (
    <div style={{ marginTop: 22 }}>
      <p style={{ fontFamily: "'Geologica', sans-serif", fontWeight: 800, fontSize: 11, color: BLUEDARK, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>{b.title}</p>
      {b.story && (
        <div style={{ background: `${BLUE}12`, borderRadius: 10, padding: "9px 11px", marginBottom: 12 }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12.5, color: TEXT, lineHeight: 1.55, margin: 0, fontStyle: "italic" }}>
            {b.story.text}
            {b.story.href && (
              <> <a href={b.story.href} target="_blank" rel="noopener noreferrer" style={{ color: BLUEDARK, fontWeight: 600 }}>{b.story.hrefLabel}</a></>
            )}
          </p>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, alignItems: "stretch" }}>
        {b.teams.map(x => <TeamHero key={x.name} x={x} teamsByName={teamsByName} playersByName={playersByName} />)}
      </div>
      {b.teams.map(x => {
        const c = TONE[x.tone] || TEXT2;
        return (
          <div key={x.name} style={{ marginTop: 14, borderLeft: `3px solid ${c}`, paddingLeft: 9 }}>
            <p style={{ fontFamily: "'Geologica', sans-serif", fontWeight: 900, fontSize: 13, color: DARK, margin: 0, lineHeight: 1.35 }}>
              {x.label || x.name}: {x.playing}
            </p>
            <p style={{ fontFamily: "'Geologica', sans-serif", fontWeight: 800, fontSize: 11.5, color: c, textTransform: "uppercase", letterSpacing: "0.08em", margin: "10px 0 0" }}>
              {x.tone === "dead" ? "What's left to play for" : "How they can do it"}
            </p>
            {x.notes.map((n, i) => (
              <p key={i} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, color: TEXT, lineHeight: 1.6, margin: "6px 0 0" }}>{n}</p>
            ))}
          </div>
        );
      })}
    </div>
  );
  return <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: TEXT, lineHeight: 1.65, margin: "12px 0 0" }}>{b.text}</p>;
}

function NewsFeed({ playersByName, teamsByName, stories }) {
  const list = stories && stories.length ? stories : NEWS;
  const [openId, setOpenId] = useState(null);
  const activeId = openId ?? list[0]?.id ?? null;
  if (list.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ flex: 1, height: 1, background: BORDER }} />
        <span style={{ fontFamily: "'Geologica', sans-serif", fontWeight: 800, fontSize: 9, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.12em" }}>News</span>
        <span style={{ flex: 1, height: 1, background: BORDER }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {list.map(story => {
          const isOpen = activeId === story.id;
          const byline = story.authorType === "auto" ? "Formula 5" : story.author;
          const photo = story.authorType !== "auto" ? playersByName[story.author]?.photo_url : null;
          const dateLabel = new Date(story.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
          return (
            <div key={story.id} style={{ background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, overflow: "hidden", margin: isOpen ? "0 -12px" : 0 }}>
              <button onClick={() => setOpenId(isOpen ? "" : story.id)} style={{
                width: "100%", padding: isOpen ? "14px 12px" : "14px 16px", border: "none", background: "transparent",
                cursor: "pointer", textAlign: "left", display: "block"
              }}>
                <p style={{ fontFamily: "'Geologica', sans-serif", fontWeight: 900, fontSize: 16, color: DARK, lineHeight: 1.25, margin: "0 0 6px" }}>{story.headline}</p>
                {story.dek && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: TEXT2, lineHeight: 1.5, margin: "0 0 10px" }}>{story.dek}</p>}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <NewsAvatar story={story} playerPhoto={photo} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: "'Geologica', sans-serif", fontWeight: 700, fontSize: 12, color: TEXT, margin: 0 }}>{byline}</p>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: TEXT2, margin: 0 }}>{dateLabel}</p>
                  </div>
                  <span style={{ fontSize: 11, color: TEXT2, transform: isOpen ? "rotate(180deg)" : "none" }}>▼</span>
                </div>
              </button>
              {isOpen && (
                <div style={{ padding: "12px 8px 18px", borderTop: `1px solid ${BORDER}` }}>
                  {story.body.map((b, i) => <NewsBlock key={i} b={b} teamsByName={teamsByName} playersByName={playersByName} />)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Home Page ────────────────────────────────────────────
function HomePage({ currentUser, onNavigate, onChangeName, onSelectName }) {
  const [nextRace, setNextRace] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [playerPhoto, setPlayerPhoto] = useState(null);
  const [showChooser, setShowChooser] = useState(false);
  const [allPlayers, setAllPlayers] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [stories, setStories] = useState([]);
  const [chooserSearch, setChooserSearch] = useState("");

  useEffect(() => {
    setHasSubmitted(false);
    setPlayerPhoto(null);
    async function load() {
      try {
        const today = new Date().toISOString().split("T")[0];
        const [{ data: raceData }, { data: latestScore }, { data: playerData }, { data: playersAll }, { data: teamsAll }] = await Promise.all([
          supabase.from("races").select("*").gte("race_date", today).order("race_date", { ascending: true }).limit(1).maybeSingle(),
          supabase.from("scores").select("calculated_at").order("calculated_at", { ascending: false }).limit(1).maybeSingle(),
          supabase.from("players").select("id, name, photo_url").eq("name", currentUser).maybeSingle(),
          supabase.from("players").select("name, photo_url").order("name"),
          supabase.from("teams").select("name, logo_url")
        ]);
        if (raceData) setNextRace(raceData);
        if (latestScore?.calculated_at) setLastUpdated(latestScore.calculated_at);
        if (playerData?.photo_url) setPlayerPhoto(playerData.photo_url);
        if (playersAll) setAllPlayers(playersAll);
        if (teamsAll) setAllTeams(teamsAll);
        // News lives in Supabase; if the table is missing or the fetch fails we
        // keep serving the story compiled into news.js rather than an empty feed.
        const { data: newsRows } = await supabase.from("news").select("*")
          .eq("is_published", true).order("published_date", { ascending: false });
        if (newsRows && newsRows.length) {
          setStories(newsRows.map(n => ({
            id: n.slug, headline: n.headline, dek: n.dek, author: n.author,
            authorType: n.author_type, date: n.published_date, body: n.body || []
          })));
        }
        if (raceData && playerData) {
          const { data: existing } = await supabase.from("picks").select("id").eq("player_id", playerData.id).eq("race_id", raceData.id).maybeSingle();
          setHasSubmitted(!!existing);
        }
      } catch (e) { /* silent */ }
    }
    load();
  }, [currentUser]);

  const links = [
    { id: "practice", label: "Practice Picks", desc: "Try the pick process — nothing saved", icon: "🏎️" },
    { id: "results", label: "Race Results", desc: "Detailed scoring breakdowns", icon: "📊" },
    { id: "rules", label: "Rules", desc: "Complete scoring & format guide", icon: "📋" },
    { id: "strategy", label: "Strategy", desc: "Pit stop & BOX BOX tactics", icon: "🎯" },
    { id: "players", label: "Players", desc: "All players & team rosters", icon: "🏅" },
    { id: "f1-calendar", label: "F1 Calendar", desc: "Full 2026 race schedule", icon: "🗓️" },
    { id: "season-preview", label: "Season Preview", desc: "2026 rules & what's new", icon: "🎬" },
    { id: "admin", label: "Admin", desc: "Score races & manage data", icon: "⚙️" },
  ];

  const raceName = nextRace ? nextRace.race_name : "—";
  const raceRound = nextRace ? `Round ${nextRace.round}` : "";
  const raceDate = nextRace ? new Date(nextRace.race_date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" }) : "";
  const pickDeadline = nextRace?.pick_deadline ? new Date(nextRace.pick_deadline).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }) : null;
  const circuitInfo = nextRace?.round ? CIRCUITS[nextRace.round] : null;

  // Avatar helpers
  const initials = currentUser ? currentUser.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "?";
  const avatarBg = avatarColor(currentUser);
  const playersByName = {};
  allPlayers.forEach(p => { playersByName[p.name] = p; });
  const teamsByName = {};
  allTeams.forEach(t => { teamsByName[t.name] = t; });

  return (
    <div style={{ padding: "20px 20px 100px" }}>
      {/* The logo and the viewing-as picker moved into the app shell, so they
          are on every page rather than only on this one. */}
      {lastUpdated && (
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: TEXT2, textAlign: "center", marginBottom: 10 }}>
          Last updated {new Date(lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
        </p>
      )}

      <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, padding: "12px 14px", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: "'Geologica', sans-serif", fontWeight: 800, fontSize: 9, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 2px" }}>Next Race · {raceRound}</p>
            <p style={{ fontFamily: "'Geologica', sans-serif", fontWeight: 900, fontSize: 14, color: DARK, margin: 0, lineHeight: 1.2 }}>{raceName}</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: TEXT2, margin: "2px 0 0" }}>
              {circuitInfo ? `${circuitInfo.country} ${circuitInfo.city} · ` : ""}<span style={{ color: BLUE, fontWeight: 600 }}>{raceDate}</span>
            </p>
          </div>
          {hasSubmitted ? (
            <div style={{ flexShrink: 0, padding: "10px 14px", borderRadius: 10, background: `${GREEN}15`, textAlign: "center", fontFamily: "'Geologica', sans-serif", fontWeight: 700, fontSize: 12, color: GREEN }}>Picks In</div>
          ) : (
            <button onClick={() => onNavigate("picks")} style={{ flexShrink: 0, padding: "10px 16px", borderRadius: 10, border: "none", background: BLUE, fontFamily: "'Geologica', sans-serif", fontWeight: 700, fontSize: 12, color: "#fff", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.03em" }}>Make Picks</button>
          )}
        </div>
        {pickDeadline && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: TEXT2, marginTop: 8 }}>Due by <span style={{ fontWeight: 700, color: DARK }}>{pickDeadline}</span></p>}
      </div>

      <NewsFeed playersByName={playersByName} teamsByName={teamsByName} stories={stories} />

      {/* All navigation — unified 3-across grid */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ flex: 1, height: 1, background: BORDER }} />
        <span style={{ fontFamily: "'Geologica', sans-serif", fontWeight: 800, fontSize: 9, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.12em" }}>Explore</span>
        <span style={{ flex: 1, height: 1, background: BORDER }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {links.map(item => (
          <button key={item.id} onClick={() => onNavigate(item.id)} style={{
            padding: "16px 6px", borderRadius: 12,
            border: `1px solid ${BORDER}`, background: "#fff",
            cursor: "pointer", textAlign: "center",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <span style={{ fontFamily: "'Geologica', sans-serif", fontWeight: 700, fontSize: 11, color: DARK, textTransform: "uppercase", letterSpacing: "0.03em", lineHeight: 1.3, whiteSpace: "pre-line" }}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── My Picks Page wrapper ────────────────────────────────
function MyPicksPage({ currentUser, onNavigate }) {
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [nextRace, setNextRace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pastDeadline, setPastDeadline] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminInput, setAdminInput] = useState("");

  useEffect(() => {
    async function check() {
      try {
        const today = new Date().toISOString().split("T")[0];
        const { data: raceData } = await supabase.from("races").select("*").gte("race_date", today).order("race_date", { ascending: true }).limit(1).maybeSingle();
        if (raceData) setNextRace(raceData);
        if (raceData?.pick_deadline && new Date() >= new Date(raceData.pick_deadline)) setPastDeadline(true);
        if (raceData && currentUser) {
          const { data: player } = await supabase.from("players").select("id").eq("name", currentUser).maybeSingle();
          if (player) { const { data: existing } = await supabase.from("picks").select("id").eq("player_id", player.id).eq("race_id", raceData.id).maybeSingle(); if (existing) setHasSubmitted(true); }
        }
      } catch (e) { /* silent */ }
      setLoading(false);
    }
    check();
  }, [currentUser]);

  if (loading) return <div style={{ padding: "60px 20px", textAlign: "center" }}><p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: TEXT2 }}>Loading…</p></div>;

  // Show PickIntel if past deadline OR admin unlocked
  var showIntel = pastDeadline || adminUnlocked;

  // SUBMITTED — show their picks, then Intel below if unlocked
  if (hasSubmitted) {
    const dl = nextRace?.pick_deadline ? new Date(nextRace.pick_deadline).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }) : null;
    return (
      <div style={{ padding: "20px 20px 100px" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏁</div>
          <p style={{ fontFamily: "'Geologica', sans-serif", fontWeight: 900, fontSize: 20, color: DARK, textTransform: "uppercase", marginBottom: 6 }}>Picks Locked In</p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: TEXT2, marginBottom: 16 }}>{nextRace?.race_name} — Round {nextRace?.round}</p>
          <div style={{ maxWidth: 320, margin: "0 auto", padding: "14px 0", borderRadius: 12, background: `${GREEN}15`, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 15, color: GREEN }}>✓ Picks Submitted</div>
          {!showIntel && dl && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: TEXT2, marginTop: 16 }}>Everyone's picks visible after:<br/><span style={{ fontWeight: 600, color: DARK }}>{dl}</span></p>}
        </div>

        {/* Admin unlock — only show before deadline, only for Andrew */}
        {currentUser === "Andrew Ishak" && !showIntel && (
          <div style={{ maxWidth: 280, margin: "0 auto 24px", textAlign: "center" }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="password"
                placeholder="Admin password"
                value={adminInput}
                onChange={function(e) { setAdminInput(e.target.value); }}
                style={{
                  flex: 1, padding: "10px 12px", borderRadius: 10,
                  border: "1px solid " + BORDER, fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13, color: DARK, background: "#fff", outline: "none"
                }}
              />
              <button
                onClick={function() { if (adminInput.toLowerCase() === "stroll") setAdminUnlocked(true); }}
                style={{
                  padding: "10px 16px", borderRadius: 10, border: "none",
                  background: BLUEDARK, color: "#fff",
                  fontFamily: "'Geologica', sans-serif", fontWeight: 700, fontSize: 12,
                  cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.06em"
                }}
              >Unlock</button>
            </div>
          </div>
        )}

        {/* Pick Intel — shows after deadline or admin unlock */}
        {showIntel && (
          <div style={{ margin: "0 -20px" }}>
            <PickIntel currentUser={currentUser} />
          </div>
        )}

        <PickHistory currentUser={currentUser} />
      </div>
    );
  }

  // NOT SUBMITTED but past deadline → show Intel (they missed the window)
  if (pastDeadline && nextRace) {
    return (
      <div style={{ padding: "20px 20px 100px" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <p style={{ fontFamily: "'Geologica', sans-serif", fontWeight: 900, fontSize: 18, color: RED, textTransform: "uppercase", marginBottom: 4 }}>No Picks Submitted</p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: TEXT2 }}>{nextRace.race_name} — Round {nextRace.round}</p>
        </div>
        <div style={{ margin: "0 -20px" }}>
          <PickIntel currentUser={currentUser} />
        </div>
        <PickHistory currentUser={currentUser} />
      </div>
    );
  }

  // NOT SUBMITTED, before deadline → pick wizard
  const dl2 = nextRace?.pick_deadline ? new Date(nextRace.pick_deadline).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }) : null;
  return (
    <div>
      <div style={{ padding: "10px 20px", background: `${BLUE}10`, borderBottom: `1px solid ${BLUE}25`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: DARK, margin: 0 }}>Picking as <span style={{ fontWeight: 600 }}>{currentUser}</span></p>
        {dl2 && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: TEXT2, margin: 0 }}>⏰ {dl2}</p>}
      </div>
      <MyPicks currentUser={currentUser} onNavigate={onNavigate} />
    </div>
  );
}

// ── Welcome Screen ───────────────────────────────────────
const ALL_PLAYERS = ["Aditya Satish","Alicia Cho","Andrew Ishak","Andy Thompson","Anthony Carnesecca","Anthony Zamary","Brett Dillon","Brian Dong","Chris Fondacaro","Chris Malek","Dan Patry","Danny Bowers","Evie Ishak","Francisco Soldavini","George Fahmy","Grant Wong","Harold Gutmann","Heather Ishak","Jack Civitts","Joe Hanna","Joe McGlynn","Kerolos Nakhla","Kevin Coolidge","Krista Nabil","Larry Noel","Lucia Thompson","Maggie Ball","Maggie Mudge","Martin Nobar","Matilda Luton","Matteo Thompson","Max Reisinger","Mena Yousef","Moses Abdelshaid","Nick Brody","Paul Kohli","Pavly Attalah","Rafik Zarifa","Ramy Stephanos","Ronnie Nobar","Ryan Kohli","Sam Bottoms","Scott Schertler","Stacy Michaelsen","Theo Ishak","TJ Donato","Zack Girgis"];

// ── Avatar color palette (deterministic per name) ────────
function getInitials(name) { const parts = name.split(" "); return (parts[0]?.[0] || "") + (parts[parts.length - 1]?.[0] || ""); }

function WelcomeScreen({ onSelect }) {
  const [search, setSearch] = useState("");
  const [players, setPlayers] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);

  useEffect(() => {
    async function loadPlayers() {
      try {
        const { data, error } = await supabase
          .from("players")
          .select("name, photo_url")
          .order("name", { ascending: true });
        if (!error && data) setPlayers(data);
        else setPlayers(ALL_PLAYERS.map(n => ({ name: n, photo_url: null })));
      } catch (e) {
        setPlayers(ALL_PLAYERS.map(n => ({ name: n, photo_url: null })));
      }
      setLoadingPlayers(false);
    }
    loadPlayers();
  }, []);

  const filtered = players.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Geologica:wght@300;400;700;900&family=DM+Sans:wght@300;400;500;600;700&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; } body { background: ${DARK}; }`}</style>
      <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: DARK, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "48px 24px 32px", textAlign: "center" }}>
          <img src={LOGO_B64} alt="Formula 5" style={{ height: 120, objectFit: "contain", marginBottom: 16, filter: "brightness(0) invert(1)" }} />
          <div style={{ fontFamily: "'Geologica', sans-serif", fontWeight: 900, fontSize: 34, textTransform: "uppercase", color: "#fff", lineHeight: 1.1 }}>Welcome to<br/><span style={{ color: BLUE }}>Formula 5</span></div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 300, fontSize: 14, color: "rgba(255,255,255,0.4)", marginTop: 10 }}>Tap your name to get started</div>
        </div>
        <div style={{ flex: 1, background: BG, borderRadius: "24px 24px 0 0", padding: "24px 16px 40px" }}>
          <p style={{ fontFamily: "'Geologica', sans-serif", fontWeight: 300, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: TEXT2, marginBottom: 12, paddingLeft: 4 }}>Select your name</p>
          <input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} autoFocus style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: `1px solid ${BORDER}`, background: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: TEXT, marginBottom: 14, outline: "none", boxSizing: "border-box" }} />
          {loadingPlayers ? (
            <p style={{ textAlign: "center", fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: TEXT2, padding: 20 }}>Loading…</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, maxHeight: 460, overflowY: "auto", paddingBottom: 8 }}>
              {filtered.map(({ name, photo_url }) => {
                const color = avatarColor(name);
                const initials = getInitials(name);
                const firstName = name.split(" ")[0];
                const lastName = name.split(" ").slice(1).join(" ");
                return (
                  <button key={name} onClick={() => onSelect(name)} style={{
                    padding: "14px 6px 12px", borderRadius: 12,
                    border: `1px solid ${BORDER}`, background: "#fff",
                    cursor: "pointer", textAlign: "center",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    transition: "all 0.15s",
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%", overflow: "hidden",
                      background: photo_url ? "#eee" : `${color}20`,
                      border: `2px solid ${photo_url ? `${color}40` : `${color}50`}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      {photo_url ? (
                        <img src={photo_url} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.parentNode.innerHTML = `<span style="font-family:'Geologica',sans-serif;font-weight:800;font-size:14px;color:${color}">${initials}</span>`;
                          }} />
                      ) : (
                        <span style={{ fontFamily: "'Geologica', sans-serif", fontWeight: 800, fontSize: 14, color: color }}>{initials}</span>
                      )}
                    </div>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: 11, color: TEXT2, lineHeight: 1.2 }}>{firstName}</span>
                    <span style={{ fontFamily: "'Geologica', sans-serif", fontWeight: 700, fontSize: 12, color: TEXT, lineHeight: 1.2 }}>{lastName}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Bottom Nav ───────────────────────────────────────────
function BottomNav({ active, onChange, hasSubmittedPicks }) {
  const tabs = [
    { id: "home", label: "Garage" },
    { id: "player-standings", label: "Player\nTable" },
    { id: "picks", label: "My Picks", big: true },
    { id: "team-standings", label: "Team\nTable" },
    { id: "schedule", label: "Schedule" },
  ];
  return (
    <>
      <style>{`.bnav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:480px;background:#fff;border-top:1px solid ${BORDER};display:flex;justify-content:space-around;align-items:center;padding:0 4px;padding-bottom:max(8px,env(safe-area-inset-bottom));z-index:100}`}</style>
      <div className="bnav">
        {tabs.map(t => {
          const a = active === t.id;
          const isPicksTab = t.big;
          // Light color logic
          let lightBg, glowShadow, borderColor;
          if (isPicksTab && hasSubmittedPicks) {
            // Submitted picks: always green, brighter when active
            lightBg = a
              ? `radial-gradient(circle at 40% 35%, #44ee88 0%, ${GREEN} 50%, #0a3a1a 100%)`
              : `radial-gradient(circle at 40% 35%, ${GREEN} 0%, #1a5a30 80%, #0a2a14 100%)`;
            glowShadow = a
              ? `0 0 14px 5px ${GREEN}60, 0 0 5px 2px ${GREEN}90`
              : `0 0 10px 3px ${GREEN}50, 0 0 3px 1px ${GREEN}80`;
            borderColor = a ? GREEN : "#1a6a30";
          } else if (a) {
            // Active (non-submitted picks or other tabs): red
            lightBg = "radial-gradient(circle at 40% 35%, #ff4040 0%, #e00000 60%, #1a0000 100%)";
            glowShadow = "0 0 12px 4px rgba(224,0,0,0.5), 0 0 4px 1px rgba(224,0,0,0.8)";
            borderColor = "#8a0000";
          } else {
            // Inactive: dark
            lightBg = "radial-gradient(circle at 40% 35%, #5a5a68 0%, #3a3a48 50%, #1e1e28 100%)";
            glowShadow = "none";
            borderColor = "#2a2a38";
          }
          // Label color
          const labelColor = (isPicksTab && hasSubmittedPicks) ? GREEN : a ? "#e00000" : TEXT2;
          return (
            <button key={t.id} onClick={() => onChange(t.id)} style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "flex-start",
              padding: "10px 0 4px", background: "none", border: "none",
              cursor: "pointer", minWidth: 56, gap: 5
            }}>
              <div style={{
                width: 24, height: 24,
                borderRadius: "50%",
                background: lightBg,
                boxShadow: glowShadow,
                border: `2px solid ${borderColor}`,
                transition: "all 0.2s ease"
              }} />
              <span style={{
                fontFamily: "'Geologica', sans-serif",
                fontWeight: a ? 800 : 600,
                fontSize: 10,
                textTransform: "uppercase", letterSpacing: "0.04em",
                color: labelColor,
                lineHeight: 1.2, whiteSpace: "pre-line", textAlign: "center"
              }}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

// ── Main App ─────────────────────────────────────────────
// Every page the state-driven nav can reach. Kept so ?page= still works for
// the pages that have no path of their own yet.
const PAGES = new Set([
  "home", "picks", "practice", "schedule", "results", "player-standings",
  "dashboard", "home-v1", "schedule-v1", "team-standings", "team-standings-v1", "player-standings-v1", "division-trends", "players", "rules", "strategy",
  "f1-calendar", "season-preview", "recaps", "admin",
]);

// ── Routing ──────────────────────────────────────────────
//
// Hand-rolled on the History API rather than a router dependency: the pages are
// flat, and vercel.json already serves the app for any path so a direct hit or a
// refresh lands correctly.
//
// Every page here has a real URL, which means it can be linked, bookmarked,
// shared and reloaded into. Before this the whole app rendered at "/" and none
// of that was possible.
const ROUTES = [
  { path: "/", page: "vegas" },
  { path: "/more", page: "home" },
  { path: "/dashboard", page: "dashboard" },
  { path: "/picks", page: "picks" },
  { path: "/teams", page: "team-standings" },
  { path: "/players", page: "player-standings" },
  { path: "/schedule", page: "schedule" },
  { path: "/results", page: "results" },
  { path: "/rules", page: "rules" },
  { path: "/calendar", page: "f1-calendar" },
  { path: "/admin", page: "admin" },
  { path: "/deck", page: "recap" },

];
const PATH_FOR = Object.fromEntries(ROUTES.map(r => [r.page, r.path]));

// Pages rebuilt on the Vegas look. They set their own ground and their own
// header, so the light shell's logo bar and background have to get out of the
// way or a dark page opens under a white block.
const VEGAS_PAGES = new Set(["home", "vegas", "dashboard", "schedule", "team-standings", "player-standings"]);

// A path in, a page and any parameter out.
function readPath(pathname) {
  const clean = (pathname || "/").replace(/\/+$/, "") || "/";
  const hit = ROUTES.find(r => r.path === clean);
  if (hit) return { page: hit.page, round: null };
  // /results/12 is the only parameterised route so far.
  const m = clean.match(/^\/results\/(\d+)$/);
  if (m) return { page: "results", round: Number(m[1]) };
  return null;
}

export default function App() {
  // ?player=Andrew%20Ishak overrides the signed-in name for one load, without
  // writing to localStorage. It is how any page gets checked as any player,
  // which fit.html needs and which the deck already relied on.
  const [currentUser, setCurrentUser] = useState(() =>
    new URLSearchParams(window.location.search).get("player") || localStorage.getItem("f1_user") || null);
  // ?vegas opens the second-half mockup. Query param rather than #vegas because
  // Vercel's SSO redirect on protected previews drops the fragment, which lands
  // you back on the normal app. Hash still works when there's no auth in the way.
  //
  // /deck is a real path, which needs the SPA rewrite in vercel.json or a direct
  // hit 404s before the app ever loads. Paths survive the SSO redirect that
  // eats fragments, so this is the shareable one.
  const [routeRound, setRouteRound] = useState(() => readPath(window.location.pathname)?.round ?? null);
  const [activePage, setActivePage] = useState(() => {
    const q = new URLSearchParams(window.location.search);
    const path = window.location.pathname.replace(/\/+$/, "");
    // ?page=practice opens any page directly, and it goes first because it is
    // an explicit request. Behind readPath it was dead on "/": the root is a
    // route now, so the path matched and the parameter was never read.
    //
    // It exists because several pages are only reachable from inside another
    // one, which makes them impossible to screenshot or link to. The rebuild
    // gives every page a real path; this is the stopgap until it does.
    const page = q.get("page");
    if (page && PAGES.has(page)) return page;
    // Then paths. The hash and query entries below are the old ways in and
    // still work, so nothing anyone has bookmarked breaks mid-season.
    const routed = readPath(window.location.pathname);
    if (routed) return routed.page;
    if (path === "/deck" || window.location.hash === "#recap" || q.has("recap")) return "recap";
    // /newui is the shareable path for the second-half look. ?vegas and #vegas
    // still work, and the query param is what the mockup's own controls use.
    if (path === "/newui" || window.location.hash === "#vegas" || q.has("vegas")) return "vegas";
    return "home";
  });
  const [scheduleInitialView, setScheduleInitialView] = useState(null);

  // Back and forward move through the app rather than off it.
  useEffect(() => {
    const onPop = () => {
      const r = readPath(window.location.pathname);
      if (!r) return;
      setActivePage(r.page);
      setRouteRound(r.round);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function navigateTo(page) {
    if (page === "schedule-recap") {
      setScheduleInitialView("recap");
      setActivePage("schedule");
      // Same page, so it gets the same URL.
      if (window.location.pathname !== "/schedule") window.history.pushState(null, "", "/schedule");
    } else {
      setScheduleInitialView(null);
      setActivePage(page);
      const to = PATH_FOR[page];
      if (to && window.location.pathname !== to) window.history.pushState(null, "", to);
    }
  }
  const [hasSubmittedPicks, setHasSubmittedPicks] = useState(false);
  // null until the check has run, so the deck does not flash up for someone who
  // has already picked.
  const [picksChecked, setPicksChecked] = useState(null);
  const [deckSeen, setDeckSeen] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminCode, setAdminCode] = useState("");
  const handleSelectName = (name) => { localStorage.setItem("f1_user", name); setCurrentUser(name); };
  const handleChangeName = () => { localStorage.removeItem("f1_user"); setCurrentUser(null); };

  // Check pick status for bottom nav color
  useEffect(() => {
    setHasSubmittedPicks(false); // reset immediately on user change
    if (!currentUser) return;
    async function checkPicks() {
      try {
        const today = new Date().toISOString().split("T")[0];
        const { data: race } = await supabase.from("races").select("id,round").gte("race_date", today).order("race_date", { ascending: true }).limit(1).maybeSingle();
        if (!race) return;
        const { data: player } = await supabase.from("players").select("id").eq("name", currentUser).maybeSingle();
        if (!player) return;
        const { data: existing } = await supabase.from("picks").select("id").eq("player_id", player.id).eq("race_id", race.id).maybeSingle();
        setHasSubmittedPicks(!!existing);
        setPicksChecked({ round: race.round, has: !!existing });
      } catch (e) { /* silent */ }
    }
    checkPicks();
  }, [currentUser, activePage]);

  // The recap deck renders outside .app-wrap for the same reason the Vegas mockup
  // does: it sets its own ground and turns dark halfway, so the light theme's
  // background and bottom nav must not be underneath it.
  //
  // /deck, ?recap or #recap all land here. ?player=Andrew%20Ishak overrides the
  // signed-in name, so any deck can be checked without switching users.
  //
  // With no signed-in player it falls through to WelcomeScreen below, and once a
  // name is picked this branch catches the re-render and opens the deck. So a
  // cold visit to /deck is: pick your name, then your recap.
  if (activePage === "recap") {
    const q = new URLSearchParams(window.location.search);
    const override = q.get("player");
    const who = override || currentUser;
    // ?card=7 opens the deck on that card. It exists so every card can be
    // screenshotted at phone size without clicking through, which is how the
    // no-scrolling rule gets checked.
    const card = Math.max(1, parseInt(q.get("card") || "1", 10) || 1) - 1;
    if (who) return (
      <Recap
        playerName={who}
        initialCard={card}
        onChangeName={handleChangeName}
        // Back to the root, not to the current path: leaving the deck from
        // /deck has to drop the path or it reopens on the next load.
        onExit={() => { window.history.replaceState(null, "", "/"); navigateTo("home"); }}
      />
    );
  }

  // Every page starts at the top.
  //
  // Two things put you in the middle otherwise. The browser restores the scroll
  // position on a reload, which it does after the page has painted, so telling
  // it not to has to happen up front. And a page that loads its data grows
  // after this effect runs, so scrolling once at mount lands on a page that is
  // still short. Hence manual restoration, and a second scroll on the frame
  // after the first.
  useEffect(() => {
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
    const r = requestAnimationFrame(() => window.scrollTo(0, 0));
    return () => cancelAnimationFrame(r);
  }, [activePage]);

  if (!currentUser) return <WelcomeScreen onSelect={handleSelectName} />;

  // The deck, as a gate. Anyone who has not put picks in for the next race gets
  // it over the app once, and closing it is remembered for that round.
  //
  // Remembered in localStorage rather than a column on players: a seen flag in
  // Supabase is a migration and a write, and this is a per-person, per-round
  // "you have watched it" that costs nothing to lose. The worst case is that a
  // new device shows it again.
  const deckKey = picksChecked ? `f5_deck_seen_r${picksChecked.round}_${currentUser}` : null;
  const showDeckGate =
    activePage !== "recap" &&
    picksChecked && !picksChecked.has && !deckSeen &&
    (!deckKey || localStorage.getItem(deckKey) !== "1");

  // The gate returns the deck rather than laying it over the app. A fixed
  // overlay meant the window scrolled underneath it while the deck stayed put,
  // so the cards that scroll could not be scrolled. This is how /deck renders
  // too, so it behaves identically.
  if (showDeckGate) return (
    <Recap
      playerName={currentUser}
      initialCard={0}
      onChangeName={handleChangeName}
      onExit={() => {
        if (deckKey) { try { localStorage.setItem(deckKey, "1"); } catch (e) {} }
        setDeckSeen(true);
      }}
    />
  );

  const onVegas = VEGAS_PAGES.has(activePage);



  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Geologica:wght@300;400;700;900&family=DM+Sans:wght@300;400;500;600;700&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; } body { background: ${BG}; } .app-wrap { max-width: 480px; margin: 0 auto; min-height: 100vh; background: ${BG}; padding-bottom: 80px; }`}</style>
      {/* The dashboard is the one page that is not a phone. .app-wrap caps
          everything at 480px, which is the point everywhere else. */}
      <div className="app-wrap" style={{
        ...(onVegas ? { background: "#07070c" } : {}),
        ...(activePage === "dashboard" ? { maxWidth: "none" } : {}),
      }}>
        {/* One header for every page: logo left, who you are looking as right.
            The picker used to be inside HomePage, which made switching player
            something you could only do by going home first. */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 12, padding: "12px 16px 8px",
        }}>
          <img src={LOGO_B64} alt="Formula 5" style={{ height: 40, maxWidth: "36%", objectFit: "contain", objectPosition: "left", flexShrink: 1, minWidth: 0 }} />
          <ViewingAs currentUser={currentUser} onSelect={handleSelectName} />
        </div>
        {/* The Home tab. It used to render outside .app-wrap as a standalone
            mockup; now it is a tab, so it sits in the shell with the nav under
            it like every other page. */}
        {activePage === "vegas" && (
          <VegasHome
            onNavigate={navigateTo}
            currentUser={currentUser}
            {...(() => {
              // ?state=final&lap=1&tab=kit deep-links a state, so a screenshot
              // or a shared link can land on one without clicking the controls.
              const q = new URLSearchParams(window.location.search);
              const state = q.get("state"), tab = q.get("tab"), lap = q.get("lap");
              return {
                ...(["open", "submitted", "locked", "live", "final"].includes(state) ? { initialState: state } : {}),
                ...(["home", "kit"].includes(tab) ? { initialTab: tab } : {}),
                ...(lap === "0" || lap === "1" ? { initialLap: Number(lap) } : {}),
              };
            })()}
          />
        )}
        {activePage === "home" && <MorePage onNavigate={navigateTo} />}
        {/* The old home page: next race, season summary, week by week and the
            league news. Unrouted while the second half is being built. */}
        {activePage === "home-v1" && <HomePage currentUser={currentUser} onNavigate={navigateTo} onChangeName={handleChangeName} onSelectName={handleSelectName} />}
        {activePage === "player-standings" && <PlayersPage currentUser={currentUser} />}
        {/* The first-half individual table, unrouted. */}
        {activePage === "player-standings-v1" && <PlayerStandings currentUser={currentUser} />}
        {activePage === "picks" && <MyPicksPage currentUser={currentUser} onNavigate={navigateTo} />}
        {activePage === "team-standings" && <TeamsPage currentUser={currentUser} />}
        {/* The first-half team table, kept reachable while the second-half page
            is still thin. It is the only place the 1-11 standings render. */}
        {activePage === "team-standings-v1" && <TeamStandings currentUser={currentUser} onNavigate={navigateTo} />}
        {activePage === "division-trends" && <DivisionTrends currentUser={currentUser} onNavigate={navigateTo} />}
        {activePage === "dashboard" && <DashboardPage currentUser={currentUser} onNavigate={navigateTo} />}
        {activePage === "schedule" && <ComingSoon title="Schedule" />}
        {/* The first-half schedule page, unrouted. */}
        {activePage === "schedule-v1" && <Schedule currentUser={currentUser} onNavigate={navigateTo} initialView={scheduleInitialView} />}
        {activePage === "rules" && <Rules />}
        {activePage === "admin" && (adminUnlocked ? <Admin /> : (
          <div style={{ padding: "60px 20px", textAlign: "center" }}>
            <p style={{ fontFamily: "'Geologica', sans-serif", fontWeight: 900, fontSize: 20, color: "#1e1e2a", textTransform: "uppercase", marginBottom: 8 }}>Admin Access</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#6b6b80", marginBottom: 20 }}>Enter the access code to continue</p>
            <input type="password" placeholder="Enter code…" value={adminCode}
              onChange={e => { const val = e.target.value; setAdminCode(val); if (val.toLowerCase() === "stroll") setAdminUnlocked(true); }}
              style={{ width: "100%", maxWidth: 240, padding: "12px 16px", borderRadius: 10, border: "1px solid #d8d2c4", fontFamily: "'DM Sans', sans-serif", fontSize: 14, textAlign: "center", outline: "none" }}
            />
            {adminCode.length > 0 && adminCode.toLowerCase() !== "stroll" && (
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#e04a4a", marginTop: 10 }}>Incorrect code</p>
            )}
          </div>
        ))}
        {activePage === "results" && <RaceResults currentUser={currentUser} initialRound={routeRound} />}
        {activePage === "strategy" && <Strategy />}
        {activePage === "f1-calendar" && <F1Calendar />}
        {activePage === "players" && <Players currentUser={currentUser} />}
        {activePage === "practice" && <PracticePicks />}
        {activePage === "season-preview" && <SeasonPreview />}
        {activePage === "recaps" && <Recaps />}
      </div>
      {/* The phone nav is a phone's. On the desktop mockup it would float in
          the middle of the page. */}
      {activePage !== "dashboard" && (
        <VegasNav active={activePage} onChange={navigateTo} hasSubmittedPicks={hasSubmittedPicks} />
      )}
    </>
  );
}
