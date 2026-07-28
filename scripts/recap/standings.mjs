// Faithful port of TeamStandings.jsx's computation, so numbers match the app.
import { readFileSync } from "node:fs";
const D = JSON.parse(readFileSync(process.env.F5_DATA || (process.env.HOME + "/Downloads/formula5_data_2026-07-27.json"), "utf8"));
const TEAM_PTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1, 0, 0];

const roundOf = {};
D.races.forEach(r => { roundOf[r.id] = r.round; });
const sKey = (p, r) => `${p}_${r}`;
const scoreMap = {};
D.scores.forEach(s => { scoreMap[sKey(s.player_id, s.race_id)] = s; });

const base = (s) => s ? (s.top_pick_pts || 0) + (s.midfield_pts || 0) + (s.order_bonus || 0) + (s.best_finish_bonus || 0) : 0;

export function standingsThrough(maxRound) {
  const raceIds = D.races.filter(r => r.round <= maxRound && D.scores.some(s => s.race_id === r.id)).map(r => r.id);

  const teamData = D.teams.map(t => {
    const weekly = [];
    let wins = 0, totalMatchup = 0, count = 0;
    raceIds.forEach(raceId => {
      const s1 = scoreMap[sKey(t.player1_id, raceId)], s2 = scoreMap[sKey(t.player2_id, raceId)];
      if (!s1 || !s2) return;
      const p1 = base(s1), p2 = base(s2);
      const bb = s1.pit_matchup_pts || 0;
      const matchupScore = p1 + p2 + bb;
      const m = D.schedule.find(x => x.race_id === raceId && (x.home_team_id === t.id || x.away_team_id === t.id));
      let oppScore = null, oppId = null, oppName = null, won = null;
      if (m) {
        oppId = m.home_team_id === t.id ? m.away_team_id : m.home_team_id;
        const opp = D.teams.find(x => x.id === oppId);
        if (opp) {
          oppName = opp.name;
          const o1 = scoreMap[sKey(opp.player1_id, raceId)], o2 = scoreMap[sKey(opp.player2_id, raceId)];
          if (o1 && o2) oppScore = base(o1) + base(o2) + (o1.pit_matchup_pts || 0);
        }
        if (oppScore !== null) won = matchupScore > oppScore ? true : matchupScore < oppScore ? false : null;
      }
      totalMatchup += matchupScore; count++;
      if (won === true) wins++;
      weekly.push({ raceId, round: roundOf[raceId], matchupScore, won, boxBoxCorrect: bb > 0, bb, oppId, oppName, oppScore, p1, p2 });
    });
    return {
      id: t.id, name: t.name, division: t.division || "second",
      p1Name: t.player1_name, p2Name: t.player2_name,
      pts: 0, wins, totalMatchup, count, weekly,
      avg: count ? Math.round((totalMatchup / count) * 10) / 10 : 0,
    };
  });

  // Championship points per race, per division: winners by score, then ties, then losers by score.
  raceIds.forEach(raceId => {
    ["championship", "second"].forEach(div => {
      const rows = teamData.filter(t => t.division === div)
        .map(t => { const w = t.weekly.find(x => x.raceId === raceId); return w ? { teamId: t.id, ...w } : null; })
        .filter(Boolean);
      const winners = rows.filter(r => r.won === true).sort((a, b) => b.matchupScore - a.matchupScore);
      const ties = rows.filter(r => r.won === null).sort((a, b) =>
        (a.boxBoxCorrect && !b.boxBoxCorrect) ? -1 : (!a.boxBoxCorrect && b.boxBoxCorrect) ? 1 : b.matchupScore - a.matchupScore);
      const losers = rows.filter(r => r.won === false).sort((a, b) => b.matchupScore - a.matchupScore);
      const ranked = [...winners, ...ties, ...losers];
      let i = 0;
      while (i < ranked.length) {
        let end = i + 1;
        const r = ranked[i];
        if (r.won === null) while (end < ranked.length && ranked[end].won === null && ranked[end].boxBoxCorrect === r.boxBoxCorrect) end++;
        const size = end - i;
        if (size > 1 && r.won === null) {
          let tot = 0; for (let k = i; k < end; k++) tot += (TEAM_PTS[k] ?? 0);
          const split = tot / size;
          for (let k = i; k < end; k++) { const tm = teamData.find(t => t.id === ranked[k].teamId); tm.pts += split; const w = tm.weekly.find(x => x.raceId === raceId); if (w) w.earned = split; }
        } else {
          for (let k = i; k < end; k++) { const pts = TEAM_PTS[k] ?? 0; const tm = teamData.find(t => t.id === ranked[k].teamId); tm.pts += pts; const w = tm.weekly.find(x => x.raceId === raceId); if (w) w.earned = pts; }
        }
        i = end;
      }
    });
  });

  teamData.forEach(t => { t.avg = t.count ? Math.round((t.totalMatchup / t.count) * 10) / 10 : 0; });
  const byDiv = (div) => teamData.filter(t => t.division === div)
    .sort((a, b) => b.pts - a.pts || b.wins - a.wins || b.avg - a.avg);
  return { champ: byDiv("championship"), second: byDiv("second"), all: teamData };
}

export { D };
