// The second weekly deck, computed. Pure, no React and no Supabase, the same
// shape as weekly.js: buildWeeklyV2(buildWeekly(...)) returns one object a
// card. Nothing here is a new scoring rule; every number is one that
// buildWeekly already holds, regrouped the way the new cards read it.
//
// Set with Andrew 2026-10-05: each card has one takeaway. Result, podium, your
// box score, the matchup taken apart, where you stand, next race.

/** Copies of each driver on one side, across both players' hands. */
const copiesOf = seats => {
  const out = {};
  seats.forEach(s => (s.pick ? s.pick.order : []).slice(0, 5)
    .forEach(name => { out[name] = (out[name] || 0) + 1; }));
  return out;
};

const sumOf = (seats, key) => seats.reduce((a, s) => a + ((s.score || {})[key] || 0), 0);

export function buildWeeklyV2(d) {
  if (!d) return null;
  const c1 = d.card1, M = d.card2.matchup;
  const ladder = d.card2.ladder;
  const meId = d.player.id;

  /* --------------------------------------------------------------- podium */

  // Ten tiles and one more: you, if you are not already among the ten; your
  // teammate if you are and they are not; else whoever is eleventh.
  // Andrew, 2026-10-05.
  const top10 = ladder.slice(0, 10);
  const inTop = id => top10.some(r => r.id === id);
  const mateRow = c1.mate ? ladder.find(r => r.name === c1.mate.name) || null : null;
  const extra = !inTop(meId)
    ? { ...ladder.find(r => r.id === meId), kind: "you" }
    : mateRow && !inTop(mateRow.id)
      ? { ...mateRow, kind: "mate" }
      : ladder[10] ? { ...ladder[10], kind: "next" } : null;
  const podium = {
    top3: ladder.slice(0, 3),
    row2: ladder.slice(3, 7),
    row3: [...ladder.slice(7, 10), ...(extra ? [extra] : [])],
    myPlace: c1.place, field: c1.field,
  };

  /* ------------------------------------------------------------ box score */

  const mine = M.seats.find(s => s.mine) || null;
  const myHand = M.hands.find(h => h.id === meId) || { drivers: [] };
  const ptsOf = {};
  myHand.drivers.forEach(x => { ptsOf[x.driver] = x.pts; });
  const order = mine && mine.pick ? mine.pick.order.slice(0, 5) : [];
  const needle = d.card4.needlePts || 0;
  const teamHalf = mine ? mine.score.total : 0;
  // The individual score less the four team parts and the needle is the
  // weekly top-ten bonus, which no card has carried on its own before.
  const weekly = Math.max(0, c1.ind - teamHalf - needle);
  const boxScore = {
    ind: c1.ind, place: c1.place, field: c1.field,
    drivers: order.map((name, i) => ({ driver: name, pts: ptsOf[name] || 0, top: i === 0 })),
    topPick: order[0] || null,
    bestFinish: mine && mine.pick ? mine.pick.bestFinish : null,
    lines: [
      { key: "top", label: "Top pick", who: order[0] || null, pts: mine ? mine.score.top : 0 },
      { key: "mid", label: "Midfield picks", who: null, pts: mine ? mine.score.mid : 0 },
      { key: "order", label: "Finishing order bonus", who: null, pts: mine ? mine.score.order : 0 },
      // best_finish is a guess at where your best driver finishes, "P3", not
      // a driver, so it reads as a guess beside the line.
      { key: "best", label: "Best finish guess", who: mine && mine.pick ? mine.pick.bestFinish : null, pts: mine ? mine.score.best : 0 },
      { key: "needle", label: "Pit stop", who: null, pts: needle,
        note: d.card4.guess != null && d.card4.pit != null
          ? `You said ${Number(d.card4.guess).toFixed(2)}, the stop was ${Number(d.card4.pit).toFixed(2)}`
          : d.card4.pit == null ? "No pit stop this week" : null },
      { key: "weekly", label: "Weekly top 10 bonus", who: null, pts: weekly },
    ],
    auto: Boolean(mine && mine.auto),
  };

  /* -------------------------------------------------------------- matchup */

  // A driver cancels copy for copy, the rule the four-hand board encodes. What
  // is left on either side is what separated the teams, and the pairs that
  // cancelled go in the grey box at the bottom.
  const ours = M.seats.filter(s => s.ours), theirs = M.seats.filter(s => !s.ours);
  const mineC = copiesOf(ours), theirC = copiesOf(theirs);
  const names = [...new Set([...Object.keys(mineC), ...Object.keys(theirC)])];
  const shared = [], diffs = [];
  names.forEach(name => {
    const a = mineC[name] || 0, b = theirC[name] || 0;
    const pts = M.driverPtsMap[name] || 0;
    const both = Math.min(a, b);
    if (both) shared.push({ driver: name, copies: both, pts });
    if (a > both) diffs.push({ driver: name, side: "mine", copies: a - both, pts, total: (a - both) * pts });
    if (b > both) diffs.push({ driver: name, side: "theirs", copies: b - both, pts, total: (b - both) * pts });
  });
  const byValue = (x, y) => (y.pts - x.pts) || x.driver.localeCompare(y.driver);
  shared.sort(byValue);
  diffs.sort((x, y) => (y.total - x.total) || x.driver.localeCompare(y.driver));

  const orderMine = sumOf(ours, "order"), orderTheirs = sumOf(theirs, "order");
  const bestMine = sumOf(ours, "best"), bestTheirs = sumOf(theirs, "best");
  const bb = {
    line: M.line, pit: M.pit, seat: M.seat,
    mine: M.myBB, theirs: M.oppBB,
    // Who the line paid. A push pays nobody.
    won: M.myBB > M.oppBB ? "mine" : M.oppBB > M.myBB ? "theirs" : null,
    decided: Boolean(d.card3.bbDecided),
  };
  const bonuses = [
    { key: "order", label: "Finishing order bonus", mine: orderMine, theirs: orderTheirs,
      decided: Boolean(d.card3.orderDecided) },
    { key: "best", label: "Best finish bonus", mine: bestMine, theirs: bestTheirs,
      decided: Boolean(d.card3.bestDecided) },
  ].filter(b => b.mine !== b.theirs);
  const sharedBonus = [
    { key: "order", label: "Finishing order bonus", pts: orderMine },
    { key: "best", label: "Best finish bonus", pts: bestMine },
  ].filter(b => b.pts > 0 && (b.key === "order" ? orderMine === orderTheirs : bestMine === bestTheirs));

  // The arithmetic has to close: everything named as different, plus the
  // line, is the margin. The smoke run asserts this for all 48.
  const diffSum = diffs.reduce((a, x) => a + (x.side === "mine" ? x.total : -x.total), 0)
    + (orderMine - orderTheirs) + (bestMine - bestTheirs) + (M.myBB - M.oppBB);

  const matchup = {
    outcome: c1.outcome, myTeam: c1.myTeam, oppTeam: c1.oppTeam,
    myTotal: M.myTotal, oppTotal: M.oppTotal, margin: c1.margin,
    seats: M.seats, hands: M.hands,
    diffs, shared, bonuses, sharedBonus, bb,
    closes: diffSum === c1.margin,
    // What to say up top. BOX BOX first when it turned the result, then the
    // biggest driver gap, then the bonuses.
    reason: (() => {
      if (bb.decided && bb.won) return { kind: "boxbox", side: bb.won };
      const top = diffs[0];
      if (top && top.total >= 8) return { kind: "driver", driver: top.driver, side: top.side, pts: top.total };
      const b = bonuses.find(x => x.decided);
      if (b) return { kind: b.key, side: b.mine > b.theirs ? "mine" : "theirs" };
      return { kind: "spread" };
    })(),
  };

  return {
    round: d.round, raceName: d.raceName, player: d.player,
    result: {
      outcome: c1.outcome, myTeam: c1.myTeam, oppTeam: c1.oppTeam,
      myTotal: c1.myTotal, oppTotal: c1.oppTotal, margin: c1.margin,
      seat: M.seat,
    },
    podium, boxScore, matchup,
    standings: d.card7, next: d.card8,
  };
}
