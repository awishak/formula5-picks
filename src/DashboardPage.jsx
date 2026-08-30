import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { V, FD, FN, FB, display, numeric, label, body, card, textGlow, edgeGlow } from "./theme.vegas";
import { buildTeamTable, rankByAverage, nextFixtures, ordinal, FIRST_H2_ROUND } from "./teamTable";
import { buildPlayerTable, placesBy } from "./playerTable";
import { displayOf, shortOf } from "./teams";
import { shortName } from "./names";
import { canonicalName } from "./drivers";
import { currentRace } from "./raceTimes";
import VegasHome from "./VegasHome.jsx";
import PIT_TIMES from "./pitTimes.json";

// Desktop mockup. Everything the phone spreads over five tabs, on one screen.
//
// Three columns. The left one IS the phone's home page, the same component
// rendering the same states, so the week never has two implementations that
// drift apart. The other two are the standings, side by side, which is the
// thing a phone can never do.

const MAX = 1360;

// A panel. The header is the handle: grab it to move the panel between the
// three columns, click the caret to fold the panel away. Both are remembered
// per browser, so a dashboard somebody has arranged stays arranged.
//
// HTML5 drag rather than a library: three columns and a dozen panels is not
// worth a dependency, and dragging a section by its header is the one gesture
// this needs.
const Panel = ({ id, title, accent = V.blue, children, style, folded, onFold,
                 onDragStart, onDragEnd, dragging }) => (
  <section draggable={Boolean(id)}
    onDragStart={e => { if (onDragStart) { e.dataTransfer.effectAllowed = "move"; onDragStart(id); } }}
    onDragEnd={onDragEnd}
    style={{ ...card({ padding: 16 }), display: "flex", flexDirection: "column",
      minWidth: 0, opacity: dragging ? 0.4 : 1,
      cursor: id ? "grab" : undefined, ...style }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8,
      marginBottom: folded ? 0 : 12 }}>
      <span style={{ width: 10, height: 10, borderRadius: 5, background: accent, flexShrink: 0 }} />
      <h2 style={{ fontFamily: FD, fontWeight: 700, fontSize: 16, letterSpacing: "0.08em",
        textTransform: "uppercase", color: accent, margin: 0, flex: 1, minWidth: 0 }}>{title}</h2>
      {onFold && (
        <button onClick={() => onFold(id)} aria-label={folded ? "Open" : "Fold away"}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 6px",
            color: V.text3, fontSize: 15, lineHeight: 1, fontFamily: FB }}>
          {folded ? "+" : "\u2013"}
        </button>
      )}
    </div>
    {!folded && children}
  </section>
);

// picked: a green ring and a tick. auto: the same, in amber, because Fernolo
// filled them in and that is not the same as turning up.
const Face = ({ name, photo, size = 30, picked = null, auto = false }) => {
  const ring = picked == null ? null : auto ? V.amber : picked ? V.green : V.text2;
  const inner = { width: size, height: size, borderRadius: "50%", flexShrink: 0,
    ...(ring ? { border: `2px solid ${ring}`, boxSizing: "border-box" } : {}),
    ...(picked === false ? { filter: "grayscale(0.8) brightness(0.7)" } : {}) };
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const body = photo
    ? <img src={photo} alt="" style={{ ...inner, objectFit: "cover" }} />
    : <div style={{ ...inner, background: `hsl(${h % 360} 62% 52%)`, display: "flex",
        alignItems: "center", justifyContent: "center", fontFamily: FD, fontWeight: 700,
        fontSize: size * 0.38, color: "#fff" }}>
        {(name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}</div>;
  if (picked !== true && !auto) return body;
  return (
    <span style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
      {body}
      <span style={{
        position: "absolute", right: -3, bottom: -3, width: 14, height: 14, borderRadius: "50%",
        background: auto ? V.amber : V.green, color: V.bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: FD, fontWeight: 700, fontSize: 10, lineHeight: 1,
        border: `1.5px solid ${V.bg2}`,
      }}>{auto ? "F" : "\u2713"}</span>
    </span>
  );
};

// ── tables ───────────────────────────────────────────────
function TeamTable({ rows, posOf, myTeamId, avgRank, fixtures, byId }) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      {rows.map(r => {
        const mine = r.id === myTeamId;
        const opp = fixtures.opponentOf[r.id] ? byId[fixtures.opponentOf[r.id]] : null;
        return (
          <div key={r.id} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 10,
            background: mine ? "rgba(0,217,255,0.08)" : "transparent",
            border: `1px solid ${mine ? V.blue : "transparent"}`,
          }}>
            <span style={{ ...numeric("chip"), fontSize: 15, color: V.text2, width: 26 }}>P{posOf[r.id]}</span>
            {r.logo && <img src={r.logo} alt="" style={{ width: 26, height: 26, objectFit: "contain" }} />}
            <span style={{ flex: 1, minWidth: 0, fontFamily: FD, fontWeight: 600, fontSize: 15,
              color: mine ? V.blue : V.text, whiteSpace: "nowrap", overflow: "hidden",
              textOverflow: "ellipsis" }}>{displayOf(r.name)}</span>
            <span style={{ ...body("bodySm"), fontSize: 13, color: V.text2, width: 44,
              fontVariantNumeric: "tabular-nums" }}>{r.w}-{r.l}{r.d ? `-${r.d}` : ""}</span>
            <span style={{ fontFamily: FD, fontSize: 12, color: V.text2, width: 74,
              whiteSpace: "nowrap", overflow: "hidden" }}>
              {opp ? `vs #${avgRank[opp.id]} ${opp.code}` : ""}
            </span>
            <span style={{ ...numeric("chip"), fontSize: 17, width: 34, textAlign: "right",
              ...textGlow(V.blue, 0.5) }}>{r.pts}</span>
          </div>
        );
      })}
    </div>
  );
}

function PlayerTable({ rows, place, meId, limit, pickState = {} }) {
  const shown = limit ? rows.slice(0, limit) : rows;
  return (
    <div style={{ display: "grid", gap: 4 }}>
      {shown.map(r => {
        const mine = r.id === meId;
        return (
          <div key={r.id} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", borderRadius: 10,
            background: mine ? "rgba(0,217,255,0.08)" : "transparent",
            border: `1px solid ${mine ? V.blue : "transparent"}`,
          }}>
            <span style={{ ...numeric("chip"), fontSize: 15, color: V.text2, width: 30 }}>P{place[r.id]}</span>
            <Face name={r.name} photo={r.photo} size={26}
                  picked={pickState[r.id] ? true : pickState[r.id] === undefined ? false : false}
                  auto={Boolean(pickState[r.id] && pickState[r.id].auto)} />
            <span style={{ flex: 1, minWidth: 0, fontFamily: FD, fontWeight: 600, fontSize: 15,
              color: mine ? V.blue : V.text, whiteSpace: "nowrap", overflow: "hidden",
              textOverflow: "ellipsis" }}>{r.name}</span>
            <span style={{ fontFamily: FD, fontSize: 12, color: V.text2, width: 92,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.teamName}</span>
            <span style={{ display: "flex", gap: 3, width: 62 }}>
              {Array(r.p1).fill("\u{1F3C6}").concat(Array(r.p2).fill("\u{1F948}"), Array(r.p3).fill("\u{1F949}"))
                .slice(0, 3).map((m, i) => <span key={i} style={{ fontSize: 13 }}>{m}</span>)}
            </span>
            <span style={{ ...numeric("chip"), fontSize: 17, width: 42, textAlign: "right",
              ...textGlow(V.blue, 0.5) }}>{r.avg.toFixed(1)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── page ─────────────────────────────────────────────────
// The drivers' championship, as the Monday cron leaves it. Points come off the
// real season, not off F5 scoring: this is the table you look at to decide who
// is worth taking out of a pool.
function DriverTable({ rows }) {
  if (!rows.length) return (
    <p style={{ ...body("bodySm"), color: V.text2, margin: 0 }}>
      No standings yet. The Monday job writes them.
    </p>
  );
  const most = Math.max(...rows.map(r => r.points || 0), 1);
  return (
    <div style={{ display: "grid", gap: 3 }}>
      {rows.map((r, i) => (
        <div key={r.driver} style={{ display: "grid",
          gridTemplateColumns: "22px 1fr 64px 44px", alignItems: "center", gap: 8 }}>
          <span style={{ ...numeric("chip"), fontSize: 15, color: V.text3, textAlign: "right" }}>
            {r.position || i + 1}
          </span>
          <span style={{ fontFamily: FD, fontWeight: 600, fontSize: 15, color: V.text, minWidth: 0,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {r.driver}
          </span>
          <span style={{ height: 8, borderRadius: 4, background: V.bg4, overflow: "hidden" }}>
            <span style={{ display: "block", height: "100%", borderRadius: 4,
              width: `${Math.max(2, ((r.points || 0) / most) * 100)}%`, background: V.blue }} />
          </span>
          <span style={{ ...numeric("chip"), fontSize: 17, color: V.blue, textAlign: "right" }}>
            {r.points ?? "\u2013"}
          </span>
        </div>
      ))}
    </div>
  );
}

// What a stop has actually looked like per team this season, which is the
// reference the Needle guess wants. Cached by scripts/pit-times.mjs, because
// this is one request a race against an API that rate limits.
//
// The median, not the mean. Seven to fifteen stops a team is a small sample and
// one slow one moves a mean further than it should.
function PitTable({ data }) {
  if (!data || !data.teams.length) return null;
  const slowest = Math.max(...data.teams.map(t => t.median), 1);
  const races = parseInt(data.builtFrom, 10) || 0;
  const par = data.league ? data.league.median : null;
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <div style={{ ...body("bodySm"), fontSize: 14, color: V.amber, lineHeight: 1.45,
        marginBottom: 6, padding: "8px 10px", borderRadius: 8,
        background: `${V.amber}12`, border: `1px solid ${V.amber}33` }}>
        From {races} races only. F1 publishes a stationary stop time for some
        rounds and not others, so this is a sample, not the season.
      </div>
      {data.teams.map(t => (
        <div key={t.team} style={{ display: "grid",
          gridTemplateColumns: "1fr 70px 52px 42px", alignItems: "center", gap: 8,
          padding: "3px 0" }}>
          <span style={{ fontFamily: FD, fontWeight: 600, fontSize: 15, color: V.text,
            minWidth: 0, whiteSpace: "nowrap", overflow: "hidden",
            textOverflow: "ellipsis" }}>{t.team}</span>
          <span style={{ height: 8, borderRadius: 4, background: V.bg4, overflow: "hidden" }}>
            <span style={{ display: "block", height: "100%", borderRadius: 4,
              width: `${Math.max(4, (t.median / slowest) * 100)}%`,
              background: par == null || t.median <= par ? V.green : V.pink }} />
          </span>
          <span style={{ ...numeric("chip"), fontSize: 17, color: V.text, textAlign: "right" }}>
            {t.median.toFixed(2)}
          </span>
          <span style={{ ...body("bodySm"), fontSize: 13, color: V.text3, textAlign: "right" }}>
            {t.stops}
          </span>
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8,
        paddingTop: 8, borderTop: `1px solid ${V.border}` }}>
        <span style={{ ...body("bodySm"), fontSize: 13, color: V.text3 }}>
          Median stop, and how many stops it is off
        </span>
        {par != null && (
          <span style={{ ...body("bodySm"), fontSize: 13, color: V.text2 }}>
            League {par.toFixed(2)}
          </span>
        )}
      </div>
    </div>
  );
}

// What the same scores would have done against the whole league, beside what
// they actually did. A team can score the fourth best number of the week and
// lose, and over a season that is a table of its own.
//
// Both sides are win percentages, so they are the same measure and the gap
// between them means something: luck is real minus all-play, in points of win
// percentage. Plus twelve is a team winning twelve percent more often than its
// scores were worth.
//
// Sortable on all three, because which column you care about depends on the
// argument you are having.
function AllPlayTable({ rows, myTeamId }) {
  const [sort, setSort] = useState("ap");
  const dir = { ap: -1, real: -1, luck: -1 };
  const key = { ap: r => r.apPct, real: r => r.realPct, luck: r => r.luckWins };
  const sorted = [...rows].sort((a, b) => (key[sort](b) - key[sort](a)) * -dir[sort]);
  const pct = v => `${Math.round(v * 100)}%`;
  const Head = ({ id, children }) => (
    <button onClick={() => setSort(id)} style={{
      ...label({ fontSize: 12, color: sort === id ? V.blue : V.text3 }),
      background: "none", border: "none", padding: 0, cursor: "pointer",
      textAlign: "right", width: "100%" }}>{children}{sort === id ? " \u25be" : ""}</button>
  );
  return (
    <div style={{ display: "grid", gap: 3 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 74px 66px 62px", gap: 8,
        paddingBottom: 4 }}>
        <span style={{ ...label({ fontSize: 12, color: V.text3 }) }}>TEAM</span>
        <Head id="ap">ALL-PLAY</Head>
        <Head id="real">REAL</Head>
        <Head id="luck">LUCK</Head>
      </div>
      {sorted.map(r => (
        <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1fr 74px 66px 62px",
          gap: 8, alignItems: "center", padding: "5px 0",
          borderTop: `1px solid ${V.border}` }}>
          <span style={{ fontFamily: FD, fontWeight: 600, fontSize: 15,
            color: r.id === myTeamId ? V.blue : V.text, minWidth: 0,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {shortOf(r.name)}
          </span>
          <span style={{ ...numeric("chip"), fontSize: 17, color: V.text2, textAlign: "right" }}>
            {pct(r.apPct)}
          </span>
          <span style={{ ...numeric("chip"), fontSize: 17, color: V.text, textAlign: "right" }}>
            {pct(r.realPct)}
          </span>
          <span style={{ ...numeric("chip"), fontSize: 17, textAlign: "right",
            color: r.luckWins >= 1.5 ? V.green : r.luckWins <= -1.5 ? V.pink : V.text3 }}>
            {r.luckWins > 0 ? `+${r.luckWins.toFixed(1)}` : r.luckWins.toFixed(1)}
          </span>
        </div>
      ))}
      <p style={{ ...body("bodySm"), fontSize: 13, color: V.text3, marginTop: 8 }}>
        All-play is how often those scores would have beaten all 23 others. Luck
        is wins above what those scores were worth.
      </p>
    </div>
  );
}

// What a driver has been worth, per round he was in the pool. The denominator
// is the point: 48 people taking the same driver in one round is one race, not
// 48 samples.
function DriverValue({ rows }) {
  if (!rows.length) return null;
  const best = Math.max(...rows.map(r => Math.abs(r.per)), 1);
  return (
    <div style={{ display: "grid", gap: 3 }}>
      {rows.slice(0, 14).map(r => (
        <div key={r.driver} style={{ display: "grid", gridTemplateColumns: "1fr 56px 46px 30px",
          gap: 8, alignItems: "center", padding: "3px 0" }}>
          <span style={{ fontFamily: FD, fontWeight: 600, fontSize: 15, color: V.text, minWidth: 0,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.driver}</span>
          <span style={{ height: 8, borderRadius: 4, background: V.bg4, overflow: "hidden" }}>
            <span style={{ display: "block", height: "100%", borderRadius: 4,
              width: `${Math.max(3, (Math.abs(r.per) / best) * 100)}%`,
              background: r.per >= 0 ? V.blue : V.pink }} />
          </span>
          <span style={{ ...numeric("chip"), fontSize: 17, textAlign: "right",
            color: r.per >= 0 ? V.blue : V.pink }}>{r.per}</span>
          <span style={{ ...body("bodySm"), fontSize: 13, color: V.text3, textAlign: "right" }}>
            {r.pool}
          </span>
        </div>
      ))}
      <p style={{ ...body("bodySm"), fontSize: 13, color: V.text3, marginTop: 8 }}>
        Points a round in the pool. The last column is rounds offered, not picks.
      </p>
    </div>
  );
}

// Form, on the same 75/20/5 the weekly deck's index uses, so the two cannot
// disagree about who is in form.
function PowerTable({ rows, meId }) {
  return (
    <div style={{ display: "grid", gap: 3 }}>
      {rows.slice(0, 12).map(r => (
        <div key={r.id} style={{ display: "grid", gridTemplateColumns: "22px 1fr 48px 44px",
          gap: 8, alignItems: "center", padding: "4px 0" }}>
          <span style={{ ...numeric("chip"), fontSize: 15, color: V.text3, textAlign: "right" }}>
            {r.place}
          </span>
          <span style={{ fontFamily: FD, fontWeight: 600, fontSize: 15,
            color: r.id === meId ? V.blue : V.text, minWidth: 0,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</span>
          <span style={{ ...numeric("chip"), fontSize: 17, color: V.blue, textAlign: "right" }}>
            {r.rating}
          </span>
          <span style={{ ...body("bodySm"), fontSize: 13, color: V.text3, textAlign: "right" }}>
            {r.recent}
          </span>
        </div>
      ))}
      <p style={{ ...body("bodySm"), fontSize: 13, color: V.text3, marginTop: 8 }}>
        75% the season, 20% the last five, 5% the last two. Right column is the
        last five on its own.
      </p>
    </div>
  );
}

// Every round's podium, one row a race. Andrew, 2026-08-30: the top three
// across, twelve bars. The bar under each name is that score against the best
// of the same week, so a row reads as a week rather than as three numbers.
const MEDALS = [V.gold, V.silver, V.bronze];

function PodiumRuns({ rows, meId }) {
  if (!rows.length) return null;
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {rows.map(r => (
        <div key={r.round} style={{ display: "grid", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ ...numeric("chip"), fontSize: 13, color: V.text3 }}>R{r.round}</span>
            <span style={{ ...body("bodySm"), fontSize: 12, color: V.text3, minWidth: 0,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.race}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            {r.top.map((p, i) => (
              <div key={p.id} style={{ display: "grid", gap: 3, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 5, minWidth: 0 }}>
                  <span style={{ fontFamily: FD, fontWeight: 600, fontSize: 15,
                    color: p.id === meId ? V.blue : V.text, minWidth: 0,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {shortName(p.name)}
                  </span>
                  <span style={{ ...numeric("chip"), fontSize: 15, color: MEDALS[i],
                    flexShrink: 0 }}>{p.pts}</span>
                </div>
                <span style={{ height: 6, borderRadius: 3, background: V.bg4, overflow: "hidden" }}>
                  <span style={{ display: "block", height: "100%", borderRadius: 3,
                    width: `${Math.max(6, (p.pts / r.best) * 100)}%`, background: MEDALS[i] }} />
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Where the panels start, before anybody moves one.
const DEFAULT_LAYOUT = [
  ["home", "podiums"],
  ["championship", "second", "allplay", "drivers", "pits"],
  ["players", "power", "value"],
];
const STORE = "f5_dash_layout";

export default function DashboardPage({ currentUser, onNavigate }) {
  const [s, setS] = useState({ loading: true });
  // The reader's own arrangement, kept in this browser. A saved layout from
  // before a panel existed would silently hide the new one, so anything missing
  // is appended rather than dropped.
  const [layout, setLayout] = useState(DEFAULT_LAYOUT);
  const [folded, setFolded] = useState([]);
  const [drag, setDrag] = useState(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) || "null");
      if (!saved || !Array.isArray(saved.layout)) return;
      const seen = new Set(saved.layout.flat());
      const missing = DEFAULT_LAYOUT.flat().filter(id => !seen.has(id));
      const next = saved.layout.map(c => c.filter(Boolean));
      if (missing.length) next[next.length - 1].push(...missing);
      setLayout(next);
      setFolded(saved.folded || []);
      setDirty(true);
    } catch (e) {}
  }, []);

  const save = (next, foldedNext) => {
    setDirty(true);
    try {
      localStorage.setItem(STORE, JSON.stringify({
        layout: next || layout, folded: foldedNext || folded }));
    } catch (e) {}
  };
  const fold = id => {
    const next = folded.includes(id) ? folded.filter(x => x !== id) : [...folded, id];
    setFolded(next); save(null, next);
  };
  // Dropping on a panel puts the dragged one before it; dropping on the column
  // puts it at the end.
  const drop = (col, beforeId) => {
    if (!drag) return;
    const next = layout.map(c => c.filter(id => id !== drag));
    const at = beforeId ? next[col].indexOf(beforeId) : next[col].length;
    next[col].splice(at < 0 ? next[col].length : at, 0, drag);
    setLayout(next); setDrag(null); save(next);
  };
  const reset = () => {
    setLayout(DEFAULT_LAYOUT); setFolded([]); setDirty(false);
    try { localStorage.removeItem(STORE); } catch (e) {}
  };

  useEffect(() => {
    (async () => {
      try {
        const [players, teams, races, scores, schedule] = await Promise.all([
          supabase.from("players").select("id,name,photo_url"),
          supabase.from("teams").select("*"),
          supabase.from("races").select("*").order("round"),
          supabase.from("scores").select("*"),
          supabase.from("schedule").select("*"),
        ]).then(r => r.map(x => x.data || []));

        const db = { teams, races, scores, schedule };
        const season = buildTeamTable(db, { fromRound: 1, toRound: 99 });
        const avgRank = Object.fromEntries(rankByAverage(season).map(r => [r.id, r.avgRank]));
        const seed = Object.fromEntries(season.map(r => [r.id, r.avg]));
        const half = buildTeamTable(db, { fromRound: FIRST_H2_ROUND, toRound: 99, seed });
        const fixtures = nextFixtures(db);

        const now = new Date().toISOString();
        const race = currentRace(races, new Set((scores || []).map(x => x.race_id)))
          || races[races.length - 1];
        const me = players.find(p => p.name === currentUser);
        const myTeam = me ? teams.find(t => t.player1_id === me.id || t.player2_id === me.id) : null;
        const mateId = myTeam ? [myTeam.player1_id, myTeam.player2_id].find(i => i !== me.id) : null;
        const fx = myTeam ? schedule.find(m => m.race_id === race.id &&
          (m.home_team_id === myTeam.id || m.away_team_id === myTeam.id)) : null;
        const oppRow = fx ? teams.find(t => t.id === (fx.home_team_id === myTeam.id ? fx.away_team_id : fx.home_team_id)) : null;
        const ids = [myTeam, oppRow].filter(Boolean).flatMap(t => [t.player1_id, t.player2_id]);
        const picks = ids.length ? (await supabase.from("picks").select("player_id")
          .eq("race_id", race.id).in("player_id", ids)).data || [] : [];
        const has = new Set(picks.map(p => p.player_id));

        // Every player's status for this round, for the admin view of who has
        // and has not turned up. auto is selected separately so the page still
        // works before that column exists.
        let all = (await supabase.from("picks").select("player_id,auto").eq("race_id", race.id)).data;
        if (!all) all = (await supabase.from("picks").select("player_id").eq("race_id", race.id)).data || [];
        const pickState = Object.fromEntries(all.map(p => [p.player_id, { auto: Boolean(p.auto) }]));

        const pt = buildPlayerTable({ players, teams, races, scores });

        // ---- all-play, and what the schedule was worth -------------------
        //
        // Every team's score is already on the table row, round by round, with
        // BOX BOX in it. So this counts rather than scores: nothing here is a
        // second copy of the matchup rules.
        const byRound = {};
        season.forEach(r => r.weeks.forEach(w => {
          (byRound[w.round] = byRound[w.round] || []).push({ id: r.id, score: w.score });
        }));
        const allPlay = {};
        Object.values(byRound).forEach(list => list.forEach(a => {
          const rec = allPlay[a.id] = allPlay[a.id] || { w: 0, l: 0, d: 0 };
          list.forEach(b => {
            if (b.id === a.id) return;
            if (a.score > b.score) rec.w += 1;
            else if (a.score < b.score) rec.l += 1;
            else rec.d += 1;
          });
        }));
        const luck = season.map(r => {
          const ap = allPlay[r.id] || { w: 0, l: 0, d: 0 };
          const games = ap.w + ap.l + ap.d;
          // Both sides as win percentages, so the gap between them is one
          // number in one unit. A draw counts as half a win on both sides, or a
          // team that draws often looks worse than one that loses often.
          const apPct = games ? (ap.w + ap.d / 2) / games : 0;
          const realWins = r.w + r.d / 2;
          const realPct = r.played ? realWins / r.played : 0;
          return { id: r.id, name: r.name, code: r.code, logo: r.logo,
                   division: r.division, w: r.w, l: r.l, d: r.d, played: r.played,
                   ap, apPct, realPct,
                   // Wins above what those scores were worth. The rate is what
                   // the whole league would have done to them; times the games
                   // played, it is the wins they should have had.
                   luckWins: Math.round((realWins - apPct * r.played) * 10) / 10 };
        }).sort((a, b) => b.apPct - a.apPct);

        // ---- what a driver has been worth -------------------------------
        //
        // The denominator is rounds in the pool, not picks. Forty-eight people
        // taking the same driver in one round is one race, not forty-eight
        // samples, and points-per-pick read off picks was wrong on sight.
        const scoredIds = new Set(scores.map(x => x.race_id));
        const byRace = {};
        scores.forEach(x => { (byRace[x.race_id] = byRace[x.race_id] || []).push(x); });
        const driverRows = {};
        races.forEach(race => {
          if (!scoredIds.has(race.id)) return;
          const pool = [...(race.top_drivers || []).map(d => [d, "top"]),
                        ...(race.mid_drivers || []).map(d => [d, "mid"])];
          if (!pool.length) return;
          const rows = byRace[race.id] || [];
          // driver_pts is stored as a JSON string and has to be parsed.
          const parsed = rows.map(x => {
            try { return typeof x.driver_pts === "string" ? JSON.parse(x.driver_pts) : (x.driver_pts || {}); }
            catch (e) { return {}; }
          });
          pool.forEach(([raw, kind]) => {
            const driver = canonicalName(raw) || raw;
            const rec = driverRows[driver] = driverRows[driver] ||
              { driver, pool: 0, picks: 0, points: 0, kind };
            rec.pool += 1;
            rec.kind = kind;
            // Every picker gets the same number, so the first one who held him
            // is as good as an average.
            // Both spellings have to be looked for, since the column holds
            // whichever one Admin wrote that week.
            const keyIn = m => Object.keys(m).find(k => (canonicalName(k) || k) === driver);
            const held = parsed.map(m => ({ m, k: keyIn(m) })).filter(x => x.k);
            rec.picks += held.length;
            if (held.length) rec.points += held[0].m[held[0].k] || 0;
          });
        });
        const drivers2 = Object.values(driverRows)
          .map(r => ({ ...r, per: r.pool ? Math.round((r.points / r.pool) * 10) / 10 : 0 }))
          .sort((a, b) => b.per - a.per);

        // ---- form ---------------------------------------------------------
        //
        // The same 75/20/5 the weekly deck's index uses, so the two cannot
        // disagree about who is in form.
        const roundOfRace = {}; races.forEach(r => { roundOfRace[r.id] = r.round; });
        const weeksOf = {};
        scores.forEach(x => {
          const rd = roundOfRace[x.race_id];
          if (rd == null) return;
          const v = (x.top_pick_pts || 0) + (x.midfield_pts || 0) + (x.best_finish_bonus || 0)
            + (x.order_bonus || 0) + (x.pit_individual_pts || 0) + (x.weekly_bonus_pts || 0);
          (weeksOf[x.player_id] = weeksOf[x.player_id] || []).push({ round: rd, pts: v });
        });
        const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
        const nameOfId = Object.fromEntries(players.map(p => [p.id, p.name]));
        const photoOfId = Object.fromEntries(players.map(p => [p.id, p.photo_url]));
        // The podium of every round so far. Ties break on name, the same way
        // every other order in this app does: Postgres heap order is not
        // stable, and a shared score must not decide itself differently on two
        // loads.
        const roundNames = {}; races.forEach(r => { roundNames[r.round] = r.race_name; });
        const perRound = {};
        Object.entries(weeksOf).forEach(([id, ws]) => ws.forEach(w => {
          (perRound[w.round] = perRound[w.round] || []).push({
            id, name: nameOfId[id], photo: photoOfId[id], pts: w.pts });
        }));
        const podiums = Object.keys(perRound).map(Number).sort((a, b) => a - b).map(round => ({
          round, race: roundNames[round] || "",
          top: perRound[round]
            .sort((a, b) => (b.pts - a.pts) || String(a.name).localeCompare(b.name))
            .slice(0, 3),
          best: Math.max(...perRound[round].map(x => x.pts), 1),
        }));

        const power = Object.entries(weeksOf).map(([id, ws]) => {
          const sorted = ws.slice().sort((a, b) => a.round - b.round).map(w => w.pts);
          const rating = 0.75 * mean(sorted) + 0.20 * mean(sorted.slice(-5)) + 0.05 * mean(sorted.slice(-2));
          return { id, name: nameOfId[id], photo: photoOfId[id],
                   rating: Math.round(rating * 10) / 10, avg: Math.round(mean(sorted) * 10) / 10,
                   recent: Math.round(mean(sorted.slice(-5)) * 10) / 10 };
        }).filter(r => r.name).sort((a, b) => b.rating - a.rating);
        power.forEach((r, i) => { r.place = i + 1; });

        // The drivers' championship, written by the Monday cron. Empty is fine
        // and says so on the page rather than inventing a number.
        const drivers = (await supabase.from("driver_standings")
          .select("driver,points,position").order("position")).data || [];

        setS({
          loading: false, half, season, avgRank, fixtures,
          byId: Object.fromEntries(half.map(r => [r.id, r])),
          myTeamId: myTeam ? myTeam.id : null,
          players: pt, place: placesBy(pt, r => r.avg), meId: me ? me.id : null, pickState,
          drivers, luck, podiums, drivers2, power,
          week: {
            me: currentUser, teammate: mateId ? (players.find(p => p.id === mateId) || {}).name : null,
            race: { round: race.round, name: race.race_name, deadline: race.pick_deadline,
                    pitQuestion: race.pit_stop_question },
            pools: { top: race.top_drivers || [], mid: race.mid_drivers || [] },
            picksIn: { me: me ? has.has(me.id) : false, mate: mateId ? has.has(mateId) : false },
            side: fx && myTeam ? (fx.home_team_id === myTeam.id ? "OVER" : "UNDER") : null,
            myTeam: myTeam ? { name: displayOf(myTeam.name), logo: myTeam.logo_url } : null,
            opp: oppRow ? { name: displayOf(oppRow.name), logo: oppRow.logo_url } : null,
          },
        });
      } catch (e) { console.error(e); setS({ loading: false, error: true }); }
    })();
  }, [currentUser]);

  const wrap = { maxWidth: MAX, margin: "0 auto", padding: "18px 20px 60px" };
  if (s.loading || s.error) return (
    <div style={{ background: V.bg, minHeight: "100vh", ...wrap }}>
      <p style={{ ...body("body"), color: V.text2 }}>{s.error ? "Did not load." : "Loading"}</p>
    </div>
  );

  const posOf = {};
  ["championship", "second"].forEach(d => {
    const list = s.half.filter(r => r.division === d);
    list.forEach((r, i) => { posOf[r.id] = (i > 0 && list[i - 1].pts === r.pts) ? posOf[list[i - 1].id] : i + 1; });
  });

  // Every panel, named once. The layout below is a list of ids per column, so
  // moving a panel is moving a string and nothing re-renders that did not have
  // to.
  const PANELS = {
    home: { title: "This week", accent: V.blue,
      body: <VegasHome currentUser={currentUser} onNavigate={onNavigate} />, bare: true },
    championship: { title: "Championship Division", accent: V.gold,
      body: <TeamTable rows={s.half.filter(r => r.division === "championship")} posOf={posOf}
        myTeamId={s.myTeamId} avgRank={s.avgRank} fixtures={s.fixtures} byId={s.byId} /> },
    second: { title: "Second Division", accent: V.silver,
      body: <TeamTable rows={s.half.filter(r => r.division === "second")} posOf={posOf}
        myTeamId={s.myTeamId} avgRank={s.avgRank} fixtures={s.fixtures} byId={s.byId} /> },
    drivers: { title: "Drivers' championship", accent: V.purple,
      body: <DriverTable rows={s.drivers} /> },
    pits: { title: "Pit stops this season", accent: V.green,
      body: <PitTable data={PIT_TIMES} /> },
    podiums: { title: "The podium, race by race", accent: V.gold,
      body: <PodiumRuns rows={s.podiums} meId={s.meId} /> },
    allplay: { title: "All-play and schedule luck", accent: V.amber,
      body: <AllPlayTable rows={s.luck} myTeamId={s.myTeamId} /> },
    value: { title: "What a driver has been worth", accent: V.blue,
      body: <DriverValue rows={s.drivers2} /> },
    power: { title: "Power index", accent: V.purple,
      body: <PowerTable rows={s.power} meId={s.meId} /> },
    players: { title: `Players — ${Object.keys(s.pickState).length} of ${s.players.length} in`,
      accent: V.blue,
      body: <PlayerTable rows={s.players} place={s.place} meId={s.meId} pickState={s.pickState} /> },
  };

  const column = (ids, col) => (
    <div key={col}
      onDragOver={e => { if (drag) e.preventDefault(); }}
      onDrop={e => { e.preventDefault(); drop(col, null); }}
      style={{ display: "grid", gap: 14, alignContent: "start", minHeight: 80,
        minWidth: 0, borderRadius: 16,
        outline: drag ? `1px dashed ${V.border2}` : "none",
        outlineOffset: 6 }}>
      {ids.map(id => {
        const p = PANELS[id];
        if (!p) return null;
        // The home page brings its own ground and its own 480px cap, so it sits
        // in a panel with no padding rather than being restyled.
        return (
          <div key={id} onDragOver={e => { if (drag) e.preventDefault(); }}
            onDrop={e => { e.preventDefault(); e.stopPropagation(); drop(col, id); }}>
            <Panel id={id} title={p.title} accent={p.accent}
              folded={folded.includes(id)} onFold={fold}
              onDragStart={setDrag} onDragEnd={() => setDrag(null)} dragging={drag === id}
              style={p.bare && !folded.includes(id) ? { padding: 0, overflow: "hidden" } : undefined}>
              {p.bare && !folded.includes(id)
                ? <div style={{ padding: 0 }}>{p.body}</div>
                : p.body}
            </Panel>
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{ background: V.bg, minHeight: "100vh" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Monoton&family=Encode+Sans+Semi+Condensed:wght@400;600;700&family=Chakra+Petch:wght@600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');`}</style>
      <div style={wrap}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 12, marginBottom: 12 }}>
          <span style={{ ...body("bodySm"), color: V.text3 }}>
            Drag a panel by its heading to move it. The minus folds one away.
          </span>
          {(dirty || folded.length) ? (
            <button onClick={reset} style={{ ...label({ fontSize: 11, color: V.blue }),
              background: "transparent", border: `1px solid ${V.blue}`, borderRadius: 999,
              padding: "6px 13px", cursor: "pointer" }}>RESET LAYOUT</button>
          ) : null}
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "minmax(340px, 0.95fr) minmax(340px, 1.1fr) minmax(340px, 1.1fr)",
          gap: 14, alignItems: "start",
        }}>
          {layout.map((ids, col) => column(ids, col))}
        </div>
      </div>
    </div>
  );
}
