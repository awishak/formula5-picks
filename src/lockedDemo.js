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
const themB = ["George Russell", "Max Verstappen", "Pierre Gasly", "Arvid Lindblad", "Gabriel Bortoleto"];

// Round 9's two rosters, so the faces on this screen are real faces. The week
// itself is still made up; only the people and the crests are borrowed.
const PIC = "https://fhtwjpohfomnhxjefjwq.supabase.co/storage/v1/object/public/player-photos/";
const ROSTER = {
  me:   { name: "Andrew Ishak",  photo: PIC + "74e68847-70fe-4eaf-9075-f4cfaa642cdd.png?t=1772682494867" },
  mate: { name: "Kevin Coolidge", photo: PIC + "719da11a-6cd8-42f4-aba5-a3bd95742a1a.png?t=1772503404813" },
  a:    { name: "Sam Bottoms",   photo: PIC + "e9002856-d1f1-4134-bb2f-efe995eafcf8.png?t=1772682722860" },
  b:    { name: "Grant Wong",    photo: PIC + "061ca7b2-411b-4405-b425-13c6aebfbb51.png?t=1772503464761" },
};

const LOGO = {
  cal: "https://fhtwjpohfomnhxjefjwq.supabase.co/storage/v1/object/public/team-logos/f3eab88a-5d25-4e3b-b7fc-2aa7a9ea4385.png?t=1772417213026",
  tubes: "https://fhtwjpohfomnhxjefjwq.supabase.co/storage/v1/object/public/team-logos/fc7843e9-bf07-493f-a9bf-59c6ce2f3a21.png?t=1772436034485",
};

const pick = (order, best, guess) => ({ topPick: order[0], order, bestFinish: best, pitGuess: guess });

// A scored week. top / mid / best / order are what Admin writes per player, and
// the total is their sum, so the columns add up to the number above them.
const score = (top, mid, best, order) => ({ top, mid, best, order, total: top + mid + best + order });

const seat = (who, ours, mine, picked, p, sc) => ({
  id: who.name, name: who.name, photo: who.photo, ours, mine, picked,
  pick: picked ? p : null,
  team: ours ? "Cal Aggie Racing" : "HomeworkTubes.Com", score: picked ? sc : null,
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
    me: ROSTER.me.name,
    teammate: ROSTER.mate.name,
    locked: true,
    race: {
      round: 12, name: "Dutch Grand Prix",
      deadline: new Date(Date.now() - 3600e3).toISOString(),
      pitQuestion: "Williams' first pit stop",
    },
    pools: { top: ["Lewis Hamilton", "Lando Norris", "George Russell"],
             mid: ["Pierre Gasly", "Liam Lawson", "Max Verstappen", "Oscar Piastri",
                   "Carlos Sainz", "Franco Colapinto", "Gabriel Bortoleto"] },
    // Real logos. The demo already names two real teams, and an empty square
    // where the logo goes is the difference between checking this screen and
    // guessing at it.
    myTeam: { name: "Cal Aggie Racing", logo: LOGO.cal },
    opp: { name: "HomeworkTubes.Com", logo: LOGO.tubes, division: "championship", place: 3, avgRank: 6, avg: 77.4,
           players: [{ name: ROSTER.a.name, photo: ROSTER.a.photo, rank: 11 },
                     { name: ROSTER.b.name, photo: ROSTER.b.photo, rank: 23 }] },
    oppWeeks: [],
    side: "UNDER",
    picksIn: { me: youPicked, mate: matePicked },
    myPick: youPicked ? pick(drivers, "P3", 2.1) : null,
    matePick: matePicked ? pick(other, "P2", 3.4) : null,
    seats: [
      seat(ROSTER.me, true, true, youPicked, pick(drivers, "P3", 2.1), score(15, 26, 0, 6)),
      seat(ROSTER.mate, true, false, matePicked, pick(other, "P2", 3.4), score(15, 21, 3, 6)),
      seat(ROSTER.a, false, false, true, pick(themA, "P1", 2.8), score(25, 16, 0, 0)),
      seat(ROSTER.b, false, false, true, pick(themB, "P5", 1.9), score(18, 24, 3, 0)),
    ],
    boxBox: {
      side: "UNDER",
      team: "Williams",
      line: Math.round((guesses.reduce((a, b) => a + b, 0) / guesses.length) * 100) / 100,
      waitingOn: 4 - guesses.length,
      // The stop landed. Without it the card is only half the mechanic: the
      // guesses and the line, and no result, so the pin and the verdict below
      // never render and the screen cannot be checked in the state that
      // matters.
      stop: 2.31,
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
