// Synthetic locked weeks, for checking that screen before a real deadline has
// passed.
//
// Made up on purpose. The alternative was a URL parameter that treats the week
// as locked, and that would show everyone their opponents' picks days early:
// the whole point of the deadline is that nobody sees them until it goes.
const drivers = ["Lewis Hamilton", "Max Verstappen", "Oscar Piastri", "Liam Lawson", "Pierre Gasly"];
const other = ["Lando Norris", "Isack Hadjar", "Carlos Sainz", "Franco Colapinto", "Gabriel Bortoleto"];

const pick = (order, best, guess) => ({ topPick: order[0], order, bestFinish: best, pitGuess: guess });

const seat = (name, ours, mine, picked, p) => ({
  id: name, name, photo: null, ours, mine, picked, pick: picked ? p : null, team: ours ? "Your team" : "Them",
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
    pools: { top: [], mid: [] },
    myTeam: { name: "Your team", logo: null },
    opp: { name: "Their team", logo: null, division: "championship", place: 3, avgRank: 6, avg: 77.4,
           players: [{ name: "Their one", photo: null, rank: 11 }, { name: "Their two", photo: null, rank: 23 }] },
    oppWeeks: [],
    side: "UNDER",
    picksIn: { me: youPicked, mate: matePicked },
    myPick: youPicked ? pick(drivers, "P3", 2.1) : null,
    matePick: matePicked ? pick(other, "P2", 3.4) : null,
    seats: [
      seat("You", true, true, youPicked, pick(drivers, "P3", 2.1)),
      seat("Your teammate", true, false, matePicked, pick(other, "P2", 3.4)),
      seat("Their one", false, false, true, pick(other, "P1", 2.8)),
      seat("Their two", false, false, true, pick(drivers, "P5", 1.9)),
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
  };
}
