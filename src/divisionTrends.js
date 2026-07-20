// Round-by-round division trends: cumulative championship points, live table
// position, and distance to the promotion / relegation cut after every scored race.
//
// The per-race points allocation here mirrors TeamStandings.jsx (same 25-18-15…
// table, same winners → ties → losers ranking, same split on tied groups). It is
// duplicated rather than shared so a change here can't regress the live standings
// page mid-season. If the two ever need to diverge, that's a bug — fix both.

export const TEAM_PTS_TABLE = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1, 0, 0];

// Cut lines. Championship: 9th–12th are relegated, so the last safe seat is 8th.
// Second Division: 1st–4th are promoted, so the last promoted seat is 4th.
export const CUT = {
  championship: { lastSafeRank: 8, label: "Relegation cut", direction: "down" },
  second: { lastSafeRank: 4, label: "Promotion cut", direction: "up" },
};

// 2025 individual points — preseason tiebreaker, matches TeamStandings.jsx
const PTS_2025 = {
  "Andrew Ishak": 473, "George Fahmy": 459, "Krista Nabil": 457, "Rafik Zarifa": 438,
  "Mena Yousef": 436, "Aditya Satish": 431, "Heather Ishak": 421, "Martin Nobar": 416,
  "Moses Abdelshaid": 410, "Alicia Cho": 404, "Kerolos Nakhla": 401, "Joe McGlynn": 398,
  "Scott Schertler": 392, "Anthony Carnesecca": 392, "Evie Ishak": 390, "Jack Civitts": 388,
  "Nick Brody": 381, "Ryan Kohli": 378, "Harold Gutmann": 378, "Theo Ishak": 376,
  "Joe Hanna": 376, "Kevin Coolidge": 375, "Zack Girgis": 375, "Lucia Thompson": 373,
  "Paul Kohli": 366, "Brett Dillon": 362, "Sam Bottoms": 349, "Andy Thompson": 344,
  "Chris Fondacaro": 339, "Maggie Mudge": 334, "Jacob Ford": 322, "Ronnie Nobar": 319,
  "Anthony Zamary": 313, "Dan Patry": 313, "Grant Wong": 309, "Chris Malek": 303,
  "Ramy Stephanos": 280, "Brian Dong": 275, "Kristin Eskind": 267, "Pavly Attalah": 210
};

const playerScore = (s) =>
  (s.top_pick_pts || 0) + (s.midfield_pts || 0) + (s.order_bonus || 0) + (s.best_finish_bonus || 0);

/**
 * Build per-round trend data for both divisions.
 *
 * @param {object} input - raw Supabase rows: teams, players, scores, schedule, races
 * @param {number} [maxRounds] - optional cap on how many scored rounds to include
 */
export function computeDivisionTrends({ teams, players, scores, schedule, races }, maxRounds) {
  if (!teams || !players || !races) return null;

  const playerMap = {};
  players.forEach((p) => { playerMap[p.id] = p.name; });
  const raceMap = {};
  races.forEach((r) => { raceMap[r.id] = r; });

  const scoreMap = {};
  (scores || []).forEach((s) => { scoreMap[`${s.player_id}_${s.race_id}`] = s; });
  const at = (pid, rid) => scoreMap[`${pid}_${rid}`];

  // Only rounds that actually have scores, in round order
  const scoredRaceIds = new Set((scores || []).map((s) => s.race_id));
  let rounds = races
    .filter((r) => scoredRaceIds.has(r.id))
    .sort((a, b) => (a.round || 0) - (b.round || 0))
    .map((r) => ({ raceId: r.id, round: r.round, raceName: r.race_name }));
  if (maxRounds) rounds = rounds.slice(0, maxRounds);

  // ── Per-team, per-race matchup results ─────────────────────────────────
  const teamRows = teams.map((team) => {
    const p1 = team.player1_id, p2 = team.player2_id;
    const p1Name = playerMap[p1] || "?", p2Name = playerMap[p2] || "?";
    const byRace = {};

    rounds.forEach(({ raceId }) => {
      const s1 = at(p1, raceId), s2 = at(p2, raceId);
      if (!s1 || !s2) return;
      const teamScore = playerScore(s1) + playerScore(s2);
      const boxBoxBonus = s1.pit_matchup_pts || 0;
      const matchupScore = teamScore + boxBoxBonus;

      const m = (schedule || []).find(
        (x) => x.race_id === raceId && (x.home_team_id === team.id || x.away_team_id === team.id)
      );
      let won = null, opponentName = null, opponentMatchupScore = null;
      if (m) {
        const oppId = m.home_team_id === team.id ? m.away_team_id : m.home_team_id;
        const opp = teams.find((t) => t.id === oppId);
        if (opp) {
          opponentName = opp.name;
          const os1 = at(opp.player1_id, raceId), os2 = at(opp.player2_id, raceId);
          if (os1 && os2) {
            opponentMatchupScore = playerScore(os1) + playerScore(os2) + (os1.pit_matchup_pts || 0);
            won = matchupScore > opponentMatchupScore ? true
              : matchupScore < opponentMatchupScore ? false : null;
          }
        }
      }
      byRace[raceId] = {
        matchupScore, won, opponentName, opponentMatchupScore,
        boxBoxCorrect: boxBoxBonus > 0, teamPtsEarned: 0,
      };
    });

    return {
      id: team.id,
      name: team.name,
      logo_url: team.logo_url,
      division: team.division || "second",
      p1Name, p2Name,
      combined2025: (PTS_2025[p1Name] || 0) + (PTS_2025[p2Name] || 0),
      byRace,
    };
  });

  // ── Award championship points per race, within each division ───────────
  rounds.forEach(({ raceId }) => {
    ["championship", "second"].forEach((div) => {
      const entries = teamRows
        .filter((t) => t.division === div && t.byRace[raceId])
        .map((t) => ({ team: t, ...t.byRace[raceId] }));

      const winners = entries.filter((r) => r.won === true).sort((a, b) => b.matchupScore - a.matchupScore);
      const ties = entries.filter((r) => r.won === null).sort((a, b) => {
        if (a.boxBoxCorrect && !b.boxBoxCorrect) return -1;
        if (!a.boxBoxCorrect && b.boxBoxCorrect) return 1;
        return b.matchupScore - a.matchupScore;
      });
      const losers = entries.filter((r) => r.won === false).sort((a, b) => b.matchupScore - a.matchupScore);
      const ranked = [...winners, ...ties, ...losers];

      let i = 0;
      while (i < ranked.length) {
        const r = ranked[i];
        const isTied = r.won === null;
        let end = i + 1;
        if (isTied) {
          while (end < ranked.length && ranked[end].won === null && ranked[end].boxBoxCorrect === r.boxBoxCorrect) end++;
        }
        const size = end - i;
        if (size > 1 && isTied) {
          let total = 0;
          for (let k = i; k < end; k++) total += TEAM_PTS_TABLE[k] ?? 0;
          const split = total / size;
          for (let k = i; k < end; k++) ranked[k].team.byRace[raceId].teamPtsEarned = split;
        } else {
          for (let k = i; k < end; k++) ranked[k].team.byRace[raceId].teamPtsEarned = TEAM_PTS_TABLE[k] ?? 0;
        }
        i = end;
      }
    });
  });

  // ── Walk the rounds, building cumulative series ────────────────────────
  const divisions = {};
  const matchupPosition = [];

  ["championship", "second"].forEach((div) => {
    const divTeams = teamRows.filter((t) => t.division === div);
    const state = {};
    divTeams.forEach((t) => { state[t.id] = { pts: 0, wins: 0, scoreSum: 0, played: 0 }; });
    const series = {};
    divTeams.forEach((t) => { series[t.id] = []; });

    rounds.forEach(({ raceId, round, raceName }) => {
      divTeams.forEach((t) => {
        const r = t.byRace[raceId];
        if (!r) return;
        const st = state[t.id];
        st.pts += r.teamPtsEarned;
        if (r.won === true) st.wins += 1;
        st.scoreSum += r.matchupScore;
        st.played += 1;
      });

      // Live table after this round — same tiebreak chain as the standings page
      const table = [...divTeams].sort((a, b) => {
        const A = state[a.id], B = state[b.id];
        const aAvg = A.played ? A.scoreSum / A.played : 0;
        const bAvg = B.played ? B.scoreSum / B.played : 0;
        return B.pts - A.pts || B.wins - A.wins || bAvg - aAvg || b.combined2025 - a.combined2025;
      });

      // The cut sits between the last safe seat and the first unsafe one. Using the
      // midpoint of their point totals means sign alone tells you which side you're on.
      const lastSafeRank = CUT[div].lastSafeRank;
      const safeTeam = table[lastSafeRank - 1];
      const firstUnsafe = table[lastSafeRank];
      const cutValue = safeTeam && firstUnsafe
        ? (state[safeTeam.id].pts + state[firstUnsafe.id].pts) / 2
        : safeTeam ? state[safeTeam.id].pts : 0;

      table.forEach((t, idx) => {
        const st = state[t.id];
        const r = t.byRace[raceId];
        series[t.id].push({
          round, raceName, raceId,
          cum: st.pts,
          earned: r ? r.teamPtsEarned : 0,
          position: idx + 1,
          gap: st.pts - cutValue,
          avgScore: st.played ? st.scoreSum / st.played : 0,
          matchupScore: r ? r.matchupScore : null,
          opponentName: r ? r.opponentName : null,
          won: r ? r.won : null,
        });
      });

      // Matchup Position: Champ 8th scoring avg vs Second Division 5th
      const watchRank = div === "championship" ? 8 : 5;
      const watched = table[watchRank - 1];
      if (watched) {
        let row = matchupPosition.find((m) => m.round === round);
        if (!row) { row = { round, raceName }; matchupPosition.push(row); }
        const avg = state[watched.id].played
          ? state[watched.id].scoreSum / state[watched.id].played : 0;
        if (div === "championship") { row.champ8Avg = avg; row.champ8Name = watched.name; }
        else { row.second5Avg = avg; row.second5Name = watched.name; }
      }
    });

    divisions[div] = {
      key: div,
      cutRank: CUT[div].lastSafeRank,
      teams: divTeams
        .map((t) => ({
          id: t.id, name: t.name, logo_url: t.logo_url,
          p1Name: t.p1Name, p2Name: t.p2Name,
          series: series[t.id],
        }))
        .filter((t) => t.series.length > 0)
        .sort((a, b) => {
          const A = a.series[a.series.length - 1], B = b.series[b.series.length - 1];
          return A.position - B.position;
        }),
    };
  });

  matchupPosition.sort((a, b) => a.round - b.round);

  return { rounds, divisions, matchupPosition };
}
