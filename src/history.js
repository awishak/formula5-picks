// Prior seasons. Pure, no React and no Supabase.
//
// The database is 2026 only. Everything before it is what Andrew has on paper:
// the 2023 and 2024 final tables with every round's score, and the 2025 points
// and trophies. Nothing here is computed from rounds in the database, because
// there are none; see [[f5-no-prior-season-data]].
//
// Podiums are worked out here from the round scores, not read off the sheets:
// the sheets' own "Podiums" column sometimes counted a top ten (Andrew,
// 2026-10-02), and a podium is first, second or third and nothing else. A
// week's places are shared on a tie, so two people level on 45 are both P1.
// 2025 has no round scores, so its podiums are read off the trophy string,
// which only ever held cups and medals for the first three.
//
// Names are as they were on the sheet that year. ALIAS maps a spelling that
// changed to the name the 2026 roster uses.
//
// The 2024 sheet holds one shared seat, "Stacy M / Heather I". It is credited
// to Stacy Michaelsen and Heather Ishak both, marked `shared`, so neither of
// them reads as a rookie for a year they played.
import { ROUNDS } from "./historyRounds.js";

const ALIAS = { "Theodore Ishak": "Theo Ishak" };
export const canonPlayer = n => ALIAS[n] || n;

const WIN = "\u{1F3C6}", P2 = "\u{1F948}", P3 = "\u{1F949}";
export const MARK = { 1: WIN, 2: P2, 3: P3 };

// Final tables: [name, points, trophies?, shared?]. Order is the sheet's order
// and places come off it, ties sharing a place. Round scores live in
// historyRounds.js under the same names.
const T23 = [
  ["Minatte Matta Garcia", 508], ["George Fahmy", 489], ["Anthony Carnesecca", 480],
  ["Heather Brackett", 471], ["Joe Hanna", 451], ["Theo Ishak", 442], ["Sam Bottoms", 433],
  ["Rafik Zarifa", 433], ["Andrew Ishak", 427], ["Zack Girgis", 419], ["Stacy Michaelsen", 410],
  ["Maggie Mudge", 407], ["Evie Ishak", 397], ["Kerolos Nakhla", 381], ["Heather Ishak", 376],
  ["Anthony Zamary", 376], ["Harold Gutmann", 374], ["Scott Schertler", 372],
  ["Lucia Thompson", 371], ["Kevin Coolidge", 366], ["Kristin Eskind", 355], ["Grant Wong", 352],
  ["Ramy Stephanos", 350], ["Joe McGlynn", 348], ["Jacob Ford", 320], ["Chris Fondacaro", 265],
  ["Ryan Kohli", 236], ["Dan Patry", 232], ["Jeremiah Yassa", 199], ["Brian Dong", 190],
  ["Paul Kohli", 190], ["Josh Masdary", 158],
];
export const PLAYED_2023 = new Set(T23.map(r => r[0]));

// Kevin's 2024 cup and loo are the sheet's; the loo is a trophy of its own.
const T24 = [
  ["Kevin Coolidge", 473, "\u{1F6BE}"], ["Ronnie Nobar", 457], ["Kerolos Nakhla", 453],
  ["Mena Yousef", 442], ["Martin Nobar", 440], ["Paul Kohli", 429], ["Zack Girgis", 423],
  ["Nick Brody", 423], ["Andrew Ishak", 420], ["Ryan Kohli", 417], ["Sam Bottoms", 416],
  ["Jacob Ford", 416], ["Rafik Zarifa", 415], ["Maggie Mudge", 412], ["Scott Schertler", 408],
  ["Joe Hanna", 401], ["Harold Gutmann", 401], ["Joe McGlynn", 371], ["Chris Fondacaro", 367],
  ["Theo Ishak", 364], ["Minatte Matta Garcia", 362], ["Dan Patry", 360], ["George Fahmy", 352],
  ["Anthony Carnesecca", 342], ["Aditya Satish", 335],
  ["Stacy Michaelsen", 330, "", "Stacy M / Heather I"], ["Heather Ishak", 330, "", "Stacy M / Heather I"],
  ["Heather Brackett", 326], ["Anthony Zamary", 323], ["Andy Thompson", 323], ["Chris Malek", 313],
  ["Evie Ishak", 296], ["Kristin Eskind", 284], ["Grant Wong", 268], ["Ramy Stephanos", 252],
  ["Lucia Thompson", 224], ["Brian Dong", 160],
];

// 2025 points and trophies. These were in PlayerStandings.jsx, TeamStandings.jsx
// and divisionTrends.js as three copies; this is the one the card reads.
export const PTS_2025 = {
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

export const TROPHIES_2025 = {
  "Andrew Ishak": "🚾🏆🥈🥈🥉🥉🛞", "George Fahmy": "🏆🏆🏆🏆🥉",
  "Krista Nabil": "🏆🥉", "Rafik Zarifa": "🏆🥈🥈🥈🥉",
  "Mena Yousef": "🏆🥈🥉", "Aditya Satish": "🏆🏆🥈",
  "Heather Ishak": "🏆🛞🏁", "Martin Nobar": "🥉🥉",
  "Moses Abdelshaid": "🏆", "Alicia Cho": "🥈🥉",
  "Kerolos Nakhla": "🥈🥉", "Joe McGlynn": "🥉",
  "Scott Schertler": "🏆🥈🛞", "Anthony Carnesecca": "🏆",
  "Evie Ishak": "🥈🥉", "Jack Civitts": "🏆🥈🥈",
  "Nick Brody": "🏆🥉🛞", "Ryan Kohli": "🥈🥈",
  "Harold Gutmann": "🥉", "Theo Ishak": "🥉",
  "Kevin Coolidge": "🏆🏆🥈🥉", "Zack Girgis": "🥈🛞",
  "Lucia Thompson": "🏆🥉", "Paul Kohli": "🥉🥉🛞",
  "Brett Dillon": "🏆", "Andy Thompson": "🥈🥈",
  "Chris Fondacaro": "🥈", "Maggie Mudge": "🥉",
  "Jacob Ford": "🏆", "Anthony Zamary": "🥉",
  "Grant Wong": "🏆🥈", "Chris Malek": "🏆",
  "Ramy Stephanos": "🥈🥈🥉", "Brian Dong": "🏆🥉",
  "Kristin Eskind": "🥈🥉"
};

// Every podium a season's round scores hold, keyed on the sheet's name.
// Competition ranking: level scores share the place and the next one skips.
function podiumsFromRounds(year) {
  const { labels, scores } = ROUNDS[year];
  const out = {};
  Object.keys(scores).forEach(n => { out[n] = []; });
  labels.forEach((where, i) => {
    const week = Object.entries(scores)
      .filter(([, r]) => r[i] != null)
      .map(([n, r]) => ({ n, s: r[i] }))
      .sort((a, b) => b.s - a.s);
    week.forEach((w, k) => {
      const place = k > 0 && week[k - 1].s === w.s ? week[k - 1].place : k + 1;
      w.place = place;
      if (place <= 3) out[w.n].push({ round: i + 1, place, where, score: w.s });
    });
  });
  return out;
}

const PODIUMS = { 2023: podiumsFromRounds(2023), 2024: podiumsFromRounds(2024) };

const season = (year, rows) => {
  const out = {};
  rows.forEach(([name, pts, extras = "", sheetName], i) => {
    const prev = rows[i - 1];
    const place = prev && prev[1] === pts ? out[prev[0]].place : i + 1;
    const finishes = PODIUMS[year][sheetName || name] || [];
    const races = (ROUNDS[year].scores[sheetName || name] || []).filter(v => v != null).length;
    out[name] = {
      year, pts, place, races, ppr: races ? Math.round((pts / races) * 10) / 10 : 0,
      wins: finishes.filter(f => f.place === 1).length,
      podiums: finishes.length,
      finishes,
      // Trophies that are not a podium: the loo, the wheel, the flag.
      extras: [...extras],
      shared: Boolean(sheetName),
    };
  });
  return out;
};
const SEASON_2023 = season(2023, T23);
const SEASON_2024 = season(2024, T24);

// 2025 ran 24 rounds and the sheet has no round column, so everybody is
// taken to have played all 24.
const RACES_2025 = 24;
const SEASON_2025 = {};
Object.entries(PTS_2025).sort((a, b) => b[1] - a[1]).forEach(([name, pts], i, arr) => {
  const place = i > 0 && arr[i - 1][1] === pts ? SEASON_2025[arr[i - 1][0]].place : i + 1;
  const marks = [...(TROPHIES_2025[name] || "")];
  const placeOf = { [WIN]: 1, [P2]: 2, [P3]: 3 };
  const finishes = marks.filter(m => placeOf[m]).map(m => ({ round: null, place: placeOf[m], where: null }));
  SEASON_2025[name] = {
    year: 2025, pts, place, races: RACES_2025, ppr: Math.round((pts / RACES_2025) * 10) / 10,
    wins: finishes.filter(f => f.place === 1).length,
    podiums: finishes.length,
    finishes,
    extras: marks.filter(m => !placeOf[m]),
    shared: false,
  };
});

export const FIELD = { 2023: T23.length, 2024: T24.length - 1, 2025: Object.keys(PTS_2025).length };

// How the league scored each year: every point scored over every player-race,
// so a year with bigger numbers on the sheet (2023's Baku weekend paid 64)
// reads as a higher level, not as better players. The card scales a prior
// year's points a race by this year's level over that year's, so a 2023 season
// and a 2026 one sit on one footing. Set by Andrew 2026-10-02.
const level = seasons => {
  const rows = Object.values(seasons).filter(s => !s.shared || s.year !== 2024 || s.pts);
  // The shared 2024 seat is one entrant on the sheet, counted once.
  const seen = new Set();
  let pts = 0, races = 0;
  rows.forEach(s => {
    const key = s.shared ? "shared" : s;
    if (seen.has(key)) return;
    seen.add(key);
    pts += s.pts; races += s.races;
  });
  return races ? pts / races : 0;
};
export const LEAGUE_PPR = { 2023: level(SEASON_2023), 2024: level(SEASON_2024), 2025: level(SEASON_2025) };

/**
 * Every prior season a player was in, oldest first. The current season is not
 * here; the card adds it from the live table.
 */
export function careerOf(name) {
  const n = canonPlayer(name);
  const seasons = [];
  if (SEASON_2023[n]) seasons.push(SEASON_2023[n]);
  if (SEASON_2024[n]) seasons.push(SEASON_2024[n]);
  if (SEASON_2025[n]) seasons.push(SEASON_2025[n]);
  const firstYear = seasons.length ? seasons[0].year : 2026;
  return { seasons, firstYear, seasonsPlayed: seasons.length + 1 };
}

// "Rookie", "2nd Year", "4th Year". The same words Players.jsx used.
export function yearDescriptor(name) {
  const n = careerOf(name).seasonsPlayed;
  if (n === 1) return "Rookie";
  return `${n}${n === 2 ? "nd" : n === 3 ? "rd" : "th"} Year`;
}
