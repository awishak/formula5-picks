// Synthetic locked weeks, for checking that screen before a real deadline has
// passed.
//
// Made up on purpose. The alternative was a URL parameter that treats the week
// as locked, and that would show everyone their opponents' picks days early:
// the whole point of the deadline is that nobody sees them until it goes.
const drivers = ["Lewis Hamilton", "Max Verstappen", "Oscar Piastri", "Liam Lawson", "Pierre Gasly"];
const other = ["Lando Norris", "Isack Hadjar", "Carlos Sainz", "Franco Colapinto", "Gabriel Bortoleto"];
// The other team picks differently, or every row ties and the board says
// "nobody" on both sides, which is the one thing it must never say by accident.
const themA = ["George Russell", "Max Verstappen", "Liam Lawson", "Carlos Sainz", "Oliver Bearman"];
const themB = ["George Russell", "Oscar Piastri", "Pierre Gasly", "Arvid Lindblad", "Gabriel Bortoleto"];

const pick = (order, best, guess) => ({ topPick: order[0], order, bestFinish: best, pitGuess: guess });

// A scored week. top / mid / best / order are what Admin writes per player, and
// the total is their sum, so the columns add up to the number above them.
const score = (top, mid, best, order) => ({ top, mid, best, order, total: top + mid + best + order });

const seat = (name, ours, mine, picked, p, sc) => ({
  id: name, name, photo: null, ours, mine, picked, pick: picked ? p : null,
  team: ours ? "Your team" : "Them", score: picked ? sc : null,
});

// case: everyone in / someone missing / you missed it
export function lockedDemo(kind = "all") {
  const youPicked = kind !== "missed";
  const matePicked = kind !== "waiting";
  const guesses = [
    youPicked ? 2.1 : null, matePicked ? 3.4 : null, 2.8, 1.9,
  ].filter(v => v != null);

  return {
    loading: false,
    me: "You",
    teammate: "Your teammate",
    locked: true,
    race: {
      round: 12, name: "Dutch Grand Prix",
      deadline: new Date(Date.now() - 3600e3).toISOString(),
      pitQuestion: "Williams' first pit stop",
    },
    pools: { top: ["Lewis Hamilton", "Lando Norris", "George Russell"],
             mid: ["Pierre Gasly", "Liam Lawson", "Max Verstappen", "Oscar Piastri",
                   "Carlos Sainz", "Franco Colapinto", "Gabriel Bortoleto"] },
    myTeam: { name: "Cal Aggie Racing", logo: null },
    opp: { name: "XLIX Racing Team", logo: null, division: "championship", place: 3, avgRank: 6, avg: 77.4,
           players: [{ name: "Their one", photo: null, rank: 11 }, { name: "Their two", photo: null, rank: 23 }] },
    oppWeeks: [],
    side: "UNDER",
    picksIn: { me: youPicked, mate: matePicked },
    myPick: youPicked ? pick(drivers, "P3", 2.1) : null,
    matePick: matePicked ? pick(other, "P2", 3.4) : null,
    seats: [
      seat("You", true, true, youPicked, pick(drivers, "P3", 2.1), score(15, 26, 0, 6)),
      seat("Your teammate", true, false, matePicked, pick(other, "P2", 3.4), score(15, 21, 3, 6)),
      seat("Their one", false, false, true, pick(themA, "P1", 2.8), score(25, 16, 0, 0)),
      seat("Their two", false, false, true, pick(themB, "P5", 1.9), score(18, 24, 3, 0)),
    ],
    boxBox: {
      side: "UNDER",
      team: "Williams",
      line: Math.round((guesses.reduce((a, b) => a + b, 0) / guesses.length) * 100) / 100,
      waitingOn: 4 - guesses.length,
      guesses: {},
    },
    f1Points: {},
    playerId: "demo",
    // The board reads down this order and needs all 22, since the twelve
    // outside the pool are the context lines.
    order: [
      "Andrea Kimi Antonelli", "Lewis Hamilton", "George Russell", "Charles Leclerc",
      "Lando Norris", "Max Verstappen", "Oscar Piastri", "Isack Hadjar",
      "Liam Lawson", "Pierre Gasly", "Arvid Lindblad", "Franco Colapinto",
      "Oliver Bearman", "Gabriel Bortoleto", "Carlos Sainz", "Alex Albon",
      "Nico Hulkenberg", "Esteban Ocon", "Fernando Alonso", "Lance Stroll",
      "Valtteri Bottas", "Sergio Perez",
    ],
    orderIs: "championship",
    counts: (() => {
      const mine = {}, theirs = {};
      const add = (bag, list) => list.forEach(d => { bag[d] = (bag[d] || 0) + 1; });
      if (youPicked) add(mine, drivers);
      if (matePicked) add(mine, other);
      add(theirs, themA);
      add(theirs, themB);
      return { mine, theirs };
    })(),
  };
}
