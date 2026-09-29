// What a player guesses on the pit stop when they hold the OVER, and when they
// hold the UNDER. Pure, no React and no Supabase, the same shape as
// teamTable.js and playerTable.js.
//
// The side comes off the schedule: home_team_id IS the OVER seat. A guess made
// by the randomizer is left out, because it says nothing about the player.
//
//   buildLean({ picks, schedule, teams })
//     -> { [playerId]: { OVER: { avg, n }, UNDER: { avg, n } } }
//
// avg is null on a side the player has never held. Summed in tenths, the unit
// the dial moves in, so 2.3 + 2.4 is 4.7 and not 4.699999999999999.

export function buildLean({ picks = [], schedule = [], teams = [] }) {
  const teamOf = {};
  teams.forEach(t => [t.player1_id, t.player2_id].filter(Boolean)
    .forEach(id => { teamOf[id] = t.id; }));

  const sum = {};
  picks.forEach(p => {
    if (p.auto || p.pit_guess == null || p.pit_guess === "") return;
    const g = Number(p.pit_guess);
    const team = teamOf[p.player_id];
    if (Number.isNaN(g) || team == null) return;
    const fx = schedule.find(m => m.race_id === p.race_id &&
      (m.home_team_id === team || m.away_team_id === team));
    if (!fx) return;
    const side = fx.home_team_id === team ? "OVER" : "UNDER";
    const row = sum[p.player_id] || (sum[p.player_id] = {
      OVER: { tenths: 0, n: 0 }, UNDER: { tenths: 0, n: 0 },
    });
    row[side].tenths += Math.round(g * 10);
    row[side].n += 1;
  });

  const out = {};
  Object.entries(sum).forEach(([id, row]) => {
    const shape = s => ({ avg: s.n ? s.tenths / s.n / 10 : null, n: s.n });
    out[id] = { OVER: shape(row.OVER), UNDER: shape(row.UNDER) };
  });
  return out;
}
