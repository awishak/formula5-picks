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

// Round 9's top pool. Named once so the picks below and the pools the screen
// reads come off the same list.
const TOP_POOL = ["George Russell", "Lewis Hamilton", "Lando Norris"];

// The top pick is the driver taken from the top pool, not whoever is listed
// first. All four of these happen to lead with theirs, but order[0] is the rule
// the real page got wrong, so the fixture should not teach it either.
const pick = (order, best, guess) => ({
  topPick: order.find(d => TOP_POOL.includes(d)) || order[0],
  order, bestFinish: best, pitGuess: guess,
});

// A scored week. top / mid / best / order are what Admin writes per player, and
// the total is their sum, so the columns add up to the number above them.
const score = (top, mid, best, order) => ({ top, mid, best, order, total: top + mid + best + order });

const seat = (who, ours, mine, picked, p, sc, scored = true) => ({
  id: who.name, name: who.name, photo: who.photo, ours, mine, picked,
  pick: picked ? p : null,
  team: ours ? "Cal Aggie Racing" : "HomeworkTubes.Com",
  score: picked && scored ? sc : null,
});

// case: everyone in / someone missing / you missed it / not scored yet
//
// "pending" is the same week between the deadline going and Admin scoring it:
// every pick visible, no points anywhere. Nobody had ever looked at that screen,
// and it is the one 48 people get for a few hours every Sunday.
export function lockedDemo(kind = "all") {
  const youPicked = kind !== "missed";
  const matePicked = kind !== "waiting";
  // Before the deadline the week is not locked and nothing is scored, which is
  // the same round 9 at two earlier moments.
  const open = kind === "open" || kind === "submitted";
  const scored = !open && kind !== "pending";
  const guesses = [
    youPicked ? 2 : null, matePicked ? 2 : null, 3.3, 2.3,
  ].filter(v => v != null);

  return {
    loading: false,
    scored,
    me: ROSTER.me.name,
    teammate: ROSTER.mate.name,
    locked: !open,
    race: {
      round: 9, name: "British Grand Prix",
      deadline: new Date(Date.now() + (open ? 39 * 3600e3 : -3600e3)).toISOString(),
      pitQuestion: "Williams' first pit stop",
    },
    pools: { top: TOP_POOL,
             mid: ["Arvid Lindblad", "Oliver Bearman", "Isack Hadjar", "Pierre Gasly",
                   "Franco Colapinto", "Carlos Sainz", "Alex Albon"] },
    // Real logos. The demo already names two real teams, and an empty square
    // where the logo goes is the difference between checking this screen and
    // guessing at it.
    myTeam: { name: "Cal Aggie Racing", short: "Cal Aggie", code: "CAR", logo: LOGO.cal },
    opp: { name: "HomeworkTubes.Com", short: "HomeworkTubes", code: "HWT", logo: LOGO.tubes, division: "championship", place: 3, avgRank: 6, avg: 77.4,
           players: [{ name: ROSTER.a.name, photo: ROSTER.a.photo, rank: 11 },
                     { name: ROSTER.b.name, photo: ROSTER.b.photo, rank: 23 }] },
    oppWeeks: [],
    side: "OVER",
    picksIn: kind === "open" ? { me: false, mate: false }
      : kind === "submitted" ? { me: true, mate: true }
      : { me: youPicked, mate: matePicked },
    myPick: youPicked ? pick(drivers, "P1", 2) : null,
    matePick: matePicked ? pick(other, "P1", 2) : null,
    seats: [
      seat(ROSTER.me, true, true, youPicked, pick(drivers, "P1", 2), score(15, 17, 0, 0), scored),
      seat(ROSTER.mate, true, false, matePicked, pick(other, "P1", 2), score(18, 10, 0, 0), scored),
      seat(ROSTER.a, false, false, true, pick(themA, "P2", 3.3), score(15, 18, 0, 6), scored),
      seat(ROSTER.b, false, false, true, pick(themB, "P1", 2.3), score(18, 17, 0, 0), scored),
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
      stop: scored ? 10 : null,
      guesses: {},
    },
    // Andrew's actual round 9, the individual game. It went the wrong way,
    // which is the case this card has to survive: 32 points is under his
    // average, so the week took his average down and took him from third to
    // sixth.
    mine: scored ? {
      parts: { top: 15, mid: 17, best: 0, order: 0, needle: 0, bonus: 0 },
      // Null where he scored nothing, because a rank there is only a tie.
      ranks: { top: 34, mid: 11, best: null, order: null, needle: null, bonus: null, total: 29 },
      total: 32, place: 29, of: 48,
      avg: 41.7, rank: 6, avgBefore: 42.9, rankBefore: 3,
    } : null,
    // What all 48 did at Silverstone. Only ever visible on the locked screen:
    // before the deadline it would give the week away, and after the race
    // nobody looks at what people guessed.
    // What all 48 did at Silverstone, generated from the real round rather
    // than written out by hand. Only ever visible on the locked screen: before
    // the deadline it would give the week away, and after the race nobody looks
    // at what people guessed.
    field: {
      in: 48, of: 48,
      guesses: [1.5,1.5,1.5,2,2,2,2.1,2.1,2.1,2.1,2.2,2.2,2.3,2.3,2.3,2.3,2.4,2.5,
                2.5,2.5,2.5,2.6,2.6,2.6,2.7,2.7,2.7,2.8,2.8,2.8,2.8,2.9,2.9,3,3,3,3,
                3.1,3.1,3.1,3.2,3.2,3.3,3.4,3.4,3.5,3.6,4],
      needle: { lo: 1.5, hi: 4, median: 2.7, mine: 2 },
      topPick: [{"k":"George Russell","n":33},{"k":"Lewis Hamilton","n":13},{"k":"Lando Norris","n":2}],
      mid: [{"k":"Isack Hadjar","n":44},{"k":"Pierre Gasly","n":43},{"k":"Arvid Lindblad","n":30},{"k":"Oliver Bearman","n":27},{"k":"Franco Colapinto","n":25},{"k":"Carlos Sainz","n":12},{"k":"Alex Albon","n":11}],
      bestFinish: [{"k":"P1","n":17},{"k":"P2","n":27},{"k":"P3","n":2},{"k":"P5","n":1},{"k":"P10","n":1}],
      mine: {"topPick":"Lewis Hamilton","mid":["Isack Hadjar","Pierre Gasly","Arvid Lindblad","Carlos Sainz"],"bestFinish":"P1"},
      stops: [{"name":"Anthony Carnesecca","guess":1.5,"side":"OVER","mine":false},{"name":"Joe Hanna","guess":1.5,"side":"OVER","mine":false},{"name":"Zack Girgis","guess":1.5,"side":"OVER","mine":false},{"name":"Kevin Coolidge","guess":2,"side":"OVER","mine":false},{"name":"Andrew Ishak","guess":2,"side":"OVER","mine":true},{"name":"Ramy Stephanos","guess":2,"side":"UNDER","mine":false},{"name":"Maggie Mudge","guess":2.1,"side":"UNDER","mine":false},{"name":"Danny Bowers","guess":2.1,"side":"OVER","mine":false},{"name":"Kerolos Nakhla","guess":2.1,"side":"OVER","mine":false},{"name":"Formula5 Bot","guess":2.1,"side":"OVER","mine":false},{"name":"Lucia Thompson","guess":2.2,"side":"OVER","mine":false},{"name":"Dan Patry","guess":2.2,"side":"UNDER","mine":false},{"name":"Maggie Ball","guess":2.3,"side":"OVER","mine":false},{"name":"George Fahmy","guess":2.3,"side":"OVER","mine":false},{"name":"Grant Wong","guess":2.3,"side":"UNDER","mine":false},{"name":"TJ Donato","guess":2.3,"side":"OVER","mine":false},{"name":"Rafik Zarifa","guess":2.4,"side":"OVER","mine":false},{"name":"Brett Dillon","guess":2.5,"side":"OVER","mine":false},{"name":"Martin Nobar","guess":2.5,"side":"OVER","mine":false},{"name":"Brian Dong","guess":2.5,"side":"UNDER","mine":false},{"name":"Mena Yousef","guess":2.5,"side":"OVER","mine":false},{"name":"Moses Abdelshaid","guess":2.6,"side":"OVER","mine":false},{"name":"Andy Thompson","guess":2.6,"side":"OVER","mine":false},{"name":"Heather Ishak","guess":2.6,"side":"OVER","mine":false},{"name":"Harold Gutmann","guess":2.7,"side":"UNDER","mine":false},{"name":"Krista Nabil","guess":2.7,"side":"OVER","mine":false},{"name":"Max Reisinger","guess":2.7,"side":"OVER","mine":false},{"name":"Anthony Zamary","guess":2.8,"side":"UNDER","mine":false},{"name":"Matteo Thompson","guess":2.8,"side":"OVER","mine":false},{"name":"Matilda Luton","guess":2.8,"side":"UNDER","mine":false},{"name":"Jack Civitts","guess":2.8,"side":"UNDER","mine":false},{"name":"Larry Noel","guess":2.9,"side":"UNDER","mine":false},{"name":"Chris Malek","guess":2.9,"side":"UNDER","mine":false},{"name":"Aditya Satish","guess":3,"side":"UNDER","mine":false},{"name":"Stacy Michaelsen","guess":3,"side":"OVER","mine":false},{"name":"Francisco Soldavini","guess":3,"side":"UNDER","mine":false},{"name":"Pavly Attalah","guess":3,"side":"UNDER","mine":false},{"name":"Theo Ishak","guess":3.1,"side":"UNDER","mine":false},{"name":"Alicia Cho","guess":3.1,"side":"UNDER","mine":false},{"name":"Ronnie Nobar","guess":3.1,"side":"OVER","mine":false},{"name":"Evie Ishak","guess":3.2,"side":"UNDER","mine":false},{"name":"Paul Kohli","guess":3.2,"side":"UNDER","mine":false},{"name":"Sam Bottoms","guess":3.3,"side":"UNDER","mine":false},{"name":"Chris Fondacaro","guess":3.4,"side":"UNDER","mine":false},{"name":"Joe McGlynn","guess":3.4,"side":"UNDER","mine":false},{"name":"Scott Schertler","guess":3.5,"side":"UNDER","mine":false},{"name":"Ryan Kohli","guess":3.6,"side":"UNDER","mine":false},{"name":"Nick Brody","guess":4,"side":"UNDER","mine":false}],
      earned: [{"name":"Harold Gutmann","total":54,"mine":false},{"name":"Krista Nabil","total":53,"mine":false},{"name":"Theo Ishak","total":51,"mine":false},{"name":"Chris Fondacaro","total":48,"mine":false},{"name":"Matteo Thompson","total":46,"mine":false},{"name":"Mena Yousef","total":45,"mine":false},{"name":"Anthony Carnesecca","total":43,"mine":false},{"name":"Sam Bottoms","total":42,"mine":false},{"name":"Formula5 Bot","total":40,"mine":false},{"name":"Aditya Satish","total":39,"mine":false},{"name":"George Fahmy","total":38,"mine":false},{"name":"Joe McGlynn","total":38,"mine":false},{"name":"Max Reisinger","total":38,"mine":false},{"name":"Rafik Zarifa","total":38,"mine":false},{"name":"TJ Donato","total":38,"mine":false},{"name":"Moses Abdelshaid","total":38,"mine":false},{"name":"Brian Dong","total":37,"mine":false},{"name":"Jack Civitts","total":37,"mine":false},{"name":"Maggie Ball","total":37,"mine":false},{"name":"Scott Schertler","total":37,"mine":false},{"name":"Paul Kohli","total":37,"mine":false},{"name":"Grant Wong","total":35,"mine":false},{"name":"Chris Malek","total":34,"mine":false},{"name":"Evie Ishak","total":34,"mine":false},{"name":"Heather Ishak","total":34,"mine":false},{"name":"Joe Hanna","total":34,"mine":false},{"name":"Francisco Soldavini","total":34,"mine":false},{"name":"Stacy Michaelsen","total":34,"mine":false},{"name":"Andrew Ishak","total":32,"mine":true},{"name":"Lucia Thompson","total":32,"mine":false},{"name":"Ryan Kohli","total":32,"mine":false},{"name":"Dan Patry","total":31,"mine":false},{"name":"Kerolos Nakhla","total":31,"mine":false},{"name":"Nick Brody","total":31,"mine":false},{"name":"Zack Girgis","total":31,"mine":false},{"name":"Maggie Mudge","total":30,"mine":false},{"name":"Andy Thompson","total":28,"mine":false},{"name":"Brett Dillon","total":28,"mine":false},{"name":"Kevin Coolidge","total":28,"mine":false},{"name":"Matilda Luton","total":28,"mine":false},{"name":"Pavly Attalah","total":28,"mine":false},{"name":"Ronnie Nobar","total":28,"mine":false},{"name":"Anthony Zamary","total":27,"mine":false},{"name":"Alicia Cho","total":25,"mine":false},{"name":"Martin Nobar","total":25,"mine":false},{"name":"Larry Noel","total":24,"mine":false},{"name":"Ramy Stephanos","total":24,"mine":false},{"name":"Danny Bowers","total":22,"mine":false}],
    },
    // Round 9 projected: the drivers from their own form through round 8, best
    // finish, order and needle from how often Andrew had earned each, and the
    // weekly bonus from the projected place, which is 38th and so pays nothing.
    // It called 25.7 and 38th; the week actually scored 32 and came 29th.
    projection: {
      parts: { top: 13.3, mid: 9.7, best: 1.5, order: 0.8, needle: 0.5, bonus: 0 },
      total: 25.7, place: 38, of: 48,
    },
    // What his five averaged a round, over the rounds each was in a pool
    // through round 8. Adds to 23; the week actually scored 32.
    driverAvg: {
      "Lewis Hamilton": { avg: 13.3, rounds: 4 }, "Isack Hadjar": { avg: 4.3, rounds: 7 },
      "Pierre Gasly": { avg: 5.4, rounds: 7 }, "Arvid Lindblad": { avg: 0.2, rounds: 5 },
      "Carlos Sainz": { avg: -0.2, rounds: 6 }, "George Russell": { avg: 11.9, rounds: 5 },
      "Alex Albon": { avg: 1.4, rounds: 4 }, "Oliver Bearman": { avg: 2.1, rounds: 6 },
      "Franco Colapinto": { avg: 1.8, rounds: 5 },
    },
    // Cal Aggie had the over and the stop came in at ten seconds, so BOX BOX
    // went their way: five to the winner, one off the loser.
    teamBoxBox: scored ? { mine: 5, theirs: -1 } : { mine: 0, theirs: 0 },
    // What each driver scored at Silverstone. Same for everybody: a driver is
    // worth what he finished, and who picked him only decides who collects.
    driverPts: {
      "George Russell": 18, "Lewis Hamilton": 15, "Isack Hadjar": 10,
      "Arvid Lindblad": 6, "Franco Colapinto": 2, "Pierre Gasly": 1,
      "Oliver Bearman": 0, "Carlos Sainz": 0, "Alex Albon": -1,
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
