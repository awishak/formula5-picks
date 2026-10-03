// Prior seasons. Pure, no React and no Supabase.
//
// The database is 2026 only. Everything before it is what Andrew has on paper:
// who played in 2023, the 2024 final table (points, wins, podiums, trophies),
// and the 2025 points and trophies. Nothing here is computed from rounds,
// because there are no rounds to compute from; see [[f5-no-prior-season-data]].
//
// Names are as they were on the sheet that year. ALIAS maps a spelling that
// changed to the name the 2026 roster uses.
//
// The 2024 sheet holds one shared seat, "Stacy M / Heather I". It is credited
// to Stacy Michaelsen and Heather Ishak both, marked `shared`, so neither of
// them reads as a rookie for a year they played.

const ALIAS = { "Theodore Ishak": "Theo Ishak" };
export const canonPlayer = n => ALIAS[n] || n;

// 2023 final table, from Andrew's sheet 2026-10-02. Order is the sheet's order.
// [name, points, wins, podiums]. Podiums include wins, as the sheet counted
// them. Ryan and Paul Kohli joined at round 15 and have nine rounds in theirs.
const T23 = [
  ["Minatte Matta Garcia", 508, 3, 7],
  ["George Fahmy", 489, 1, 3],
  ["Anthony Carnesecca", 480, 1, 3],
  ["Heather Brackett", 471, 1, 5],
  ["Joe Hanna", 451, 1, 7],
  ["Theo Ishak", 442, 0, 6],
  ["Sam Bottoms", 433, 0, 7],
  ["Rafik Zarifa", 433, 1, 6],
  ["Andrew Ishak", 427, 1, 5],
  ["Zack Girgis", 419, 1, 4],
  ["Stacy Michaelsen", 410, 0, 5],
  ["Maggie Mudge", 407, 1, 4],
  ["Evie Ishak", 397, 2, 8],
  ["Kerolos Nakhla", 381, 1, 5],
  ["Heather Ishak", 376, 1, 4],
  ["Anthony Zamary", 376, 0, 3],
  ["Harold Gutmann", 374, 0, 2],
  ["Scott Schertler", 372, 1, 2],
  ["Lucia Thompson", 371, 0, 3],
  ["Kevin Coolidge", 366, 0, 1],
  ["Kristin Eskind", 355, 2, 5],
  ["Grant Wong", 352, 0, 3],
  ["Ramy Stephanos", 350, 2, 5],
  ["Joe McGlynn", 348, 0, 0],
  ["Jacob Ford", 320, 0, 1],
  ["Chris Fondacaro", 265, 0, 4],
  ["Ryan Kohli", 236, 0, 3],
  ["Dan Patry", 232, 0, 2],
  ["Jeremiah Yassa", 199, 1, 2],
  ["Brian Dong", 190, 0, 0],
  ["Paul Kohli", 190, 0, 1],
  ["Josh Masdary", 158, 1, 2],
];
export const PLAYED_2023 = new Set(T23.map(r => r[0]));

// 2024 final table, from Andrew's sheet 2026-10-02. Order is the sheet's order.
// [name, points, wins, podiums, trophies]. Podiums include wins, as the sheet
// counted them.
const T24 = [
  ["Kevin Coolidge", 473, 1, 5, "\u{1F3C6}\u{1F6BE}"],
  ["Ronnie Nobar", 457, 1, 2, "\u{1F3C6}"],
  ["Kerolos Nakhla", 453, 0, 4, ""],
  ["Mena Yousef", 442, 1, 3, "\u{1F3C6}"],
  ["Martin Nobar", 440, 2, 4, "\u{1F3C6}\u{1F3C6}"],
  ["Paul Kohli", 429, 0, 2, ""],
  ["Zack Girgis", 423, 0, 1, ""],
  ["Nick Brody", 423, 0, 5, ""],
  ["Andrew Ishak", 420, 2, 5, "\u{1F3C6}\u{1F3C6}"],
  ["Ryan Kohli", 417, 1, 2, "\u{1F3C6}"],
  ["Sam Bottoms", 416, 0, 2, ""],
  ["Jacob Ford", 416, 0, 0, ""],
  ["Rafik Zarifa", 415, 0, 3, ""],
  ["Maggie Mudge", 412, 3, 4, "\u{1F3C6}\u{1F3C6}\u{1F3C6}"],
  ["Scott Schertler", 408, 1, 2, "\u{1F3C6}"],
  ["Joe Hanna", 401, 1, 3, "\u{1F3C6}"],
  ["Harold Gutmann", 401, 0, 0, ""],
  ["Joe McGlynn", 371, 1, 1, "\u{1F3C6}"],
  ["Chris Fondacaro", 367, 0, 3, ""],
  ["Theo Ishak", 364, 4, 5, "\u{1F3C6}\u{1F3C6}\u{1F3C6}\u{1F3C6}"],
  ["Minatte Matta Garcia", 362, 0, 2, ""],
  ["Dan Patry", 360, 1, 1, "\u{1F3C6}"],
  ["George Fahmy", 352, 1, 1, "\u{1F3C6}"],
  ["Anthony Carnesecca", 342, 0, 0, ""],
  ["Aditya Satish", 335, 0, 0, ""],
  ["Stacy Michaelsen", 330, 1, 1, "\u{1F3C6}", true],
  ["Heather Ishak", 330, 1, 1, "\u{1F3C6}", true],
  ["Heather Brackett", 326, 0, 0, ""],
  ["Anthony Zamary", 323, 1, 2, "\u{1F3C6}"],
  ["Andy Thompson", 323, 0, 1, ""],
  ["Chris Malek", 313, 1, 2, "\u{1F3C6}"],
  ["Evie Ishak", 296, 0, 2, ""],
  ["Kristin Eskind", 284, 1, 1, "\u{1F3C6}"],
  ["Grant Wong", 268, 0, 1, ""],
  ["Ramy Stephanos", 252, 0, 1, ""],
  ["Lucia Thompson", 224, 0, 1, ""],
  ["Brian Dong", 160, 0, 0, ""],
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

const count = (s, ch) => [...(s || "")].filter(c => c === ch).length;
const WIN = "\u{1F3C6}", P2 = "\u{1F948}", P3 = "\u{1F949}";

// Places come off the sheet's order; ties share a place. A sheet with no
// trophy column gets a cup a win.
const season = (year, rows) => {
  const out = {};
  rows.forEach(([name, pts, wins, podiums, trophies, shared], i) => {
    const prev = rows[i - 1];
    const place = prev && prev[1] === pts ? out[prev[0]].place : i + 1;
    out[name] = { year, pts, place, wins, podiums,
      trophies: trophies != null ? trophies : WIN.repeat(wins), shared: Boolean(shared) };
  });
  return out;
};
const SEASON_2023 = season(2023, T23);
const SEASON_2024 = season(2024, T24);

const SEASON_2025 = {};
Object.entries(PTS_2025).sort((a, b) => b[1] - a[1]).forEach(([name, pts], i, arr) => {
  const place = i > 0 && arr[i - 1][1] === pts ? SEASON_2025[arr[i - 1][0]].place : i + 1;
  const t = TROPHIES_2025[name] || "";
  SEASON_2025[name] = {
    year: 2025, pts, place,
    wins: count(t, WIN), podiums: count(t, WIN) + count(t, P2) + count(t, P3),
    trophies: t, shared: false,
  };
});

export const FIELD = { 2023: T23.length, 2024: T24.length, 2025: Object.keys(PTS_2025).length };

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
