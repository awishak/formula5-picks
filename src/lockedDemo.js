// Round 9, for checking the locked screen against a week that happened.
//
// The picks, the scores, the guesses and the stop are what four people actually
// did at Silverstone. What is invented is only who submitted: ?demo=waiting
// takes a card back off the table and ?demo=missed takes yours, because a week
// that is locked and scored can no longer show either.
//
// It stands in for a made-up week because a made-up one could not cover the
// board. Round 9 carries every shared-driver case on its own: Gasly two to one,
// Lindblad one to two, Hadjar two each, Sainz two of ours and none of theirs,
// Bearman the reverse. And Andrew and Coolidge both guessed 2.0, which is the
// pair of faces that have to sit shoulder to shoulder on the line.
const drivers = ["Lewis Hamilton", "Isack Hadjar", "Pierre Gasly", "Arvid Lindblad", "Carlos Sainz"];
const other = ["George Russell", "Pierre Gasly", "Alex Albon", "Carlos Sainz", "Isack Hadjar"];
const themA = ["Lewis Hamilton", "Isack Hadjar", "Arvid Lindblad", "Franco Colapinto", "Oliver Bearman"];
const themB = ["George Russell", "Arvid Lindblad", "Oliver Bearman", "Isack Hadjar", "Pierre Gasly"];

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
    youPicked ? 2 : null, matePicked ? 2 : null, 3.3, 2.3,
  ].filter(v => v != null);

  return {
    loading: false,
    me: ROSTER.me.name,
    teammate: ROSTER.mate.name,
    locked: true,
    race: {
      round: 9, name: "British Grand Prix",
      deadline: new Date(Date.now() - 3600e3).toISOString(),
      pitQuestion: "Williams' first pit stop",
    },
    pools: { top: ["George Russell", "Lewis Hamilton", "Lando Norris"],
             mid: ["Arvid Lindblad", "Oliver Bearman", "Isack Hadjar", "Pierre Gasly",
                   "Franco Colapinto", "Carlos Sainz", "Alex Albon"] },
    // Real logos. The demo already names two real teams, and an empty square
    // where the logo goes is the difference between checking this screen and
    // guessing at it.
    myTeam: { name: "Cal Aggie Racing", short: "Cal Aggie", logo: LOGO.cal },
    opp: { name: "HomeworkTubes.Com", short: "HomeworkTubes", logo: LOGO.tubes, division: "championship", place: 3, avgRank: 6, avg: 77.4,
           players: [{ name: ROSTER.a.name, photo: ROSTER.a.photo, rank: 11 },
                     { name: ROSTER.b.name, photo: ROSTER.b.photo, rank: 23 }] },
    oppWeeks: [],
    side: "OVER",
    picksIn: { me: youPicked, mate: matePicked },
    myPick: youPicked ? pick(drivers, "P1", 2) : null,
    matePick: matePicked ? pick(other, "P1", 2) : null,
    seats: [
      seat(ROSTER.me, true, true, youPicked, pick(drivers, "P1", 2), score(15, 17, 0, 0)),
      seat(ROSTER.mate, true, false, matePicked, pick(other, "P1", 2), score(18, 10, 0, 0)),
      seat(ROSTER.a, false, false, true, pick(themA, "P2", 3.3), score(15, 18, 0, 6)),
      seat(ROSTER.b, false, false, true, pick(themB, "P1", 2.3), score(18, 17, 0, 0)),
    ],
    boxBox: {
      side: "OVER",
      team: "Williams",
      line: Math.round((guesses.reduce((a, b) => a + b, 0) / guesses.length) * 100) / 100,
      waitingOn: 4 - guesses.length,
      // What round 9 recorded. Ten seconds is one of the two pit times the
      // recap flagged as either a disaster or a typo, and it is left alone
      // here: it is what the row says, and it is the case the scale has to
      // survive, since the line only runs to 4.5.
      stop: 10,
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
