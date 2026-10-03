// Round-by-round scores for 2023 and 2024, off Andrew's sheets, pasted
// 2026-10-02. Writes src/historyRounds.js, which history.js reads to work out
// who finished first, second and third each week, because the sheets' own
// "Podiums" column sometimes counted a top ten (Andrew, 2026-10-02).
//
//   node scripts/history-rounds.mjs
//
// 2023 round 6 (Imola) was cancelled and is blank on the sheet, so a full-season
// row has 22 numbers. Ryan and Paul Kohli joined at round 15 and have nine.
import { writeFileSync } from "node:fs";

const LABELS_2023 = ["Bahrain","Saudi Arabia","Australia","Azerbaijan","Miami","Imola","Monaco","Spain","Canada","Austria","Britain","Hungary","Belgium","Netherlands","Monza","Singapore","Japan","Qatar","USA","Mexico","Brazil","Las Vegas","Abu Dhabi"];
const LABELS_2024 = ["Bahrain","Saudi Arabia","Australia","Japan","China","Miami","Imola","Monaco","Canada","Spain","Austria","Britain","Hungary","Belgium","Netherlands","Monza","Azerbaijan","Singapore","USA","Mexico","Brazil","Las Vegas","Qatar","Abu Dhabi"];

// [name, total, "scores"], total being the sheet's, checked against the sum.
const RAW_2023 = [
  ["Minatte Matta Garcia", 508, "25 15 26 50 25 10 10 51 14 10 15 50 20 15 0 15 35 5 10 34 45 28"],
  ["George Fahmy", 489, "45 15 10 48 15 15 41 20 12 0 45 27 10 10 0 20 29 13 15 27 25 47"],
  ["Anthony Carnesecca", 480, "51 10 10 32 25 15 20 15 10 0 20 33 15 25 5 20 35 16 15 26 45 37"],
  ["Heather Brackett", 471, "45 10 5 64 20 15 20 30 12 5 5 40 15 15 5 15 34 11 10 17 45 33"],
  ["Joe Hanna", 451, "20 15 20 58 20 20 20 25 8 5 15 22 26 10 5 20 39 24 0 22 30 27"],
  ["Theo Ishak", 442, "20 20 20 49 25 20 20 20 8 5 5 25 10 10 5 30 33 17 20 29 15 36"],
  ["Sam Bottoms", 433, "10 0 0 58 20 10 20 20 8 10 40 25 15 30 10 20 20 9 20 28 15 45"],
  ["Rafik Zarifa", 433, "20 15 5 20 20 15 20 10 17 5 46 27 20 10 5 20 26 22 10 25 25 50"],
  ["Andrew Ishak", 427, "45 15 15 14 10 20 5 20 13 0 15 34 10 10 10 25 25 15 21 32 35 38"],
  ["Zack Girgis", 419, "45 15 15 23 20 10 20 15 7 0 30 25 15 10 0 30 24 14 10 18 20 53"],
  ["Stacy Michaelsen", 410, "20 20 20 32 15 10 20 10 8 0 25 29 20 10 0 20 39 21 10 24 25 32"],
  ["Maggie Mudge", 407, "45 10 10 27 30 21 20 25 2 5 20 22 15 10 0 10 14 10 15 31 20 45"],
  ["Evie Ishak", 397, "25 20 20 13 20 15 20 10 9 10 10 25 5 10 10 10 15 30 10 32 51 27"],
  ["Kerolos Nakhla", 381, "15 10 10 30 15 20 20 15 0 5 5 28 10 10 10 15 46 11 10 32 20 44"],
  ["Heather Ishak", 376, "20 0 5 13 20 5 15 40 26 10 15 18 10 25 10 25 35 9 5 15 10 45"],
  ["Anthony Zamary", 376, "5 10 20 43 20 10 20 30 12 5 10 25 20 25 0 20 29 13 0 20 0 39"],
  ["Harold Gutmann", 374, "15 15 10 10 25 10 10 20 19 0 15 23 15 10 0 30 31 21 10 29 20 36"],
  ["Scott Schertler", 372, "20 5 15 35 46 15 5 20 3 5 5 25 10 25 5 20 20 5 0 19 20 49"],
  ["Lucia Thompson", 371, "45 25 15 30 15 10 5 20 0 10 0 30 10 25 0 10 25 5 5 20 30 36"],
  ["Kevin Coolidge", 366, "15 15 5 23 25 10 10 15 10 0 15 42 15 15 5 15 14 7 15 28 20 47"],
  ["Kristin Eskind", 355, "15 26 20 6 25 10 0 25 10 10 10 27 10 30 16 20 25 7 5 10 20 28"],
  ["Grant Wong", 352, "20 15 15 32 20 10 40 10 9 10 5 18 5 25 10 10 13 8 10 13 10 44"],
  ["Ramy Stephanos", 350, "0 15 15 2 20 10 5 40 0 5 20 27 20 15 10 46 10 12 0 36 0 42"],
  ["Joe McGlynn", 348, "15 10 10 47 15 10 5 20 7 0 0 36 15 15 0 20 30 16 10 20 20 27"],
  ["Jacob Ford", 320, "15 10 15 30 45 10 5 10 5 5 25 0 10 10 5 20 5 9 10 20 15 41"],
  ["Chris Fondacaro", 265, "15 5 20 15 10 10 10 10 10 10 5 40 0 0 0 20 5 0 10 15 20 35"],
  ["Ryan Kohli", 236, "25 10 15 43 7 15 25 50 46"],
  ["Dan Patry", 232, "15 5 20 4 5 5 5 5 13 10 5 14 5 10 0 20 15 10 5 12 20 29"],
  ["Jeremiah Yassa", 199, "45 5 0 19 20 0 0 5 0 21 25 3 0 5 5 0 0 0 0 0 10 36"],
  ["Brian Dong", 190, "5 10 15 3 5 10 5 0 0 5 10 8 10 10 0 20 10 9 5 15 5 30"],
  ["Paul Kohli", 190, "15 10 20 35 12 15 17 30 36"],
  ["Josh Masdary", 158, "40 15 20 22 20 0 10 0 0 0 0 0 0 31 0 0 0 0 0 0 0 0"],
];

const RAW_2024 = [
  ["Kevin Coolidge", 473, "48 20 15 40 46 25 5 5 10 33 21 5 27 45 35 0 17 10 5 5 15 16 10 15"],
  ["Ronnie Nobar", 457, "41 21 23 10 45 25 30 10 0 31 15 5 35 25 35 20 10 21 10 5 5 5 10 20"],
  ["Kerolos Nakhla", 453, "42 15 5 41 40 15 20 5 0 10 15 10 33 43 41 15 10 38 15 0 15 10 5 10"],
  ["Mena Yousef", 442, "20 15 5 15 45 20 30 21 10 35 23 10 20 25 35 22 10 15 15 0 10 16 10 15"],
  ["Martin Nobar", 440, "30 15 5 15 40 35 25 30 15 25 22 18 15 20 15 5 10 45 15 0 15 5 10 10"],
  ["Paul Kohli", 429, "41 10 15 42 45 25 10 0 5 25 15 5 20 15 40 21 5 0 10 10 16 17 16 21"],
  ["Zack Girgis", 423, "40 20 5 40 40 20 25 27 15 25 15 5 10 10 35 0 16 15 10 5 10 15 0 20"],
  ["Nick Brody", 423, "10 10 5 25 45 20 42 0 17 25 15 0 20 36 15 10 10 15 15 17 10 23 10 28"],
  ["Andrew Ishak", 420, "15 30 10 5 53 15 25 28 30 25 10 5 15 5 20 21 16 15 22 10 10 10 10 15"],
  ["Ryan Kohli", 417, "15 10 15 41 25 15 36 10 10 25 15 11 15 5 48 15 25 21 15 5 5 15 5 15"],
  ["Sam Bottoms", 416, "20 15 15 15 52 15 36 10 15 25 5 5 10 36 47 15 10 20 5 10 5 15 0 15"],
  ["Jacob Ford", 416, "15 15 5 40 40 25 25 15 10 25 21 10 20 0 35 20 10 15 10 10 10 10 10 20"],
  ["Rafik Zarifa", 415, "20 15 5 20 40 42 20 16 23 25 10 0 10 25 35 0 10 15 15 5 17 10 16 21"],
  ["Maggie Mudge", 412, "15 15 5 50 40 20 30 0 10 25 10 0 15 25 20 10 0 37 0 0 10 25 5 45"],
  ["Scott Schertler", 408, "20 5 15 20 40 50 15 10 5 32 15 5 26 25 35 15 10 15 5 5 10 10 5 15"],
  ["Joe Hanna", 401, "20 15 22 48 46 15 20 5 5 15 15 5 15 25 50 10 10 15 10 0 10 10 5 10"],
  ["Harold Gutmann", 401, "25 15 16 25 40 25 25 15 15 25 15 5 20 15 35 10 10 15 5 5 15 5 5 15"],
  ["Joe McGlynn", 371, "25 15 0 25 45 10 45 5 15 25 15 5 20 25 10 10 10 10 10 11 5 10 10 10"],
  ["Chris Fondacaro", 367, "10 10 10 40 45 43 20 10 5 25 5 0 15 37 15 10 10 5 5 5 0 10 17 15"],
  ["Theo Ishak", 364, "10 22 5 20 55 15 10 5 16 25 25 11 20 5 5 5 5 15 25 5 25 10 10 15"],
  ["Minatte Matta Garcia", 362, "20 5 15 25 45 20 43 10 16 25 15 0 0 10 15 15 10 15 23 0 10 15 10 0"],
  ["Dan Patry", 360, "40 10 5 35 40 20 25 5 0 10 0 25 15 20 40 10 10 15 5 5 5 5 0 15"],
  ["George Fahmy", 352, "10 10 15 35 25 36 25 0 5 31 10 0 15 15 20 10 10 10 5 0 10 10 30 15"],
  ["Anthony Carnesecca", 342, "20 21 5 35 20 41 20 0 15 25 10 10 5 20 20 5 10 5 10 5 10 5 15 10"],
  ["Aditya Satish", 335, "20 10 10 25 40 25 20 5 5 10 20 0 20 15 20 5 10 20 15 5 10 10 5 10"],
  // The shared seat, one entrant on the sheet. Credited to both in history.js.
  ["Stacy M / Heather I", 330, "40 10 10 25 40 10 15 15 5 25 0 5 20 0 10 0 10 15 5 30 15 5 5 15"],
  ["Heather Brackett", 326, "20 15 5 5 45 15 5 5 10 25 10 0 20 5 40 5 10 20 21 10 10 10 10 5"],
  ["Anthony Zamary", 323, "20 20 25 40 40 15 10 10 5 10 10 0 10 15 0 28 5 15 0 0 10 5 15 15"],
  ["Andy Thompson", 323, "15 15 5 35 40 15 10 5 5 15 0 0 20 25 15 10 10 15 15 0 10 10 23 10"],
  ["Chris Malek", 313, "50 5 5 40 25 20 10 10 5 0 10 5 0 10 20 5 10 10 5 10 23 15 0 20"],
  ["Evie Ishak", 296, "10 28 15 0 40 30 25 5 0 15 5 10 5 15 15 10 5 10 10 23 5 5 0 10"],
  ["Kristin Eskind", 284, "15 10 10 0 10 10 10 0 5 30 10 0 15 0 41 30 10 0 21 16 16 15 0 10"],
  ["Grant Wong", 268, "15 10 5 15 15 15 15 10 0 10 10 0 26 20 15 20 10 10 5 5 5 5 0 27"],
  ["Ramy Stephanos", 252, "20 0 5 5 20 10 25 5 0 15 0 17 5 0 35 10 10 15 15 0 10 15 15 0"],
  ["Lucia Thompson", 224, "15 15 16 5 15 15 10 10 5 15 10 0 5 5 10 5 18 15 10 5 10 5 0 5"],
  ["Brian Dong", 160, "15 5 5 10 5 10 10 5 0 0 10 5 15 5 0 5 10 0 0 10 5 5 15 10"],
];

// Lay a row's numbers onto the season's rounds. null is a round not played.
const nums = s => s.trim().split(/\s+/).map(Number);
function lay2023(s) {
  const n = nums(s);
  const out = new Array(23).fill(null);
  if (n.length === 22) { n.slice(0, 5).forEach((v, i) => { out[i] = v; }); n.slice(5).forEach((v, i) => { out[6 + i] = v; }); }
  else if (n.length === 9) { n.forEach((v, i) => { out[14 + i] = v; }); }
  else throw new Error(`2023 row has ${n.length} numbers`);
  return out;
}
function lay2024(s) {
  const n = nums(s);
  if (n.length !== 24) throw new Error(`2024 row has ${n.length} numbers`);
  return n;
}

let bad = 0;
const check = (year, name, total, scores) => {
  const sum = scores.reduce((a, v) => a + (v || 0), 0);
  if (sum !== total) { console.error(`${year} ${name}: rounds sum to ${sum}, sheet says ${total}`); bad++; }
};
const S23 = RAW_2023.map(([name, total, s]) => { const r = lay2023(s); check(2023, name, total, r); return [name, r]; });
const S24 = RAW_2024.map(([name, total, s]) => { const r = lay2024(s); check(2024, name, total, r); return [name, r]; });
if (bad) process.exit(1);

const out = `// GENERATED by scripts/history-rounds.mjs from Andrew's 2023 and 2024 sheets.
// Never hand-edit; change the script and rerun it.
//
// One array a player, one number a round, null for a round not played. 2023
// round 6 is Imola, cancelled.
export const ROUNDS = {
  2023: { labels: ${JSON.stringify(LABELS_2023)}, scores: {
${S23.map(([n, r]) => `    ${JSON.stringify(n)}: ${JSON.stringify(r)},`).join("\n")}
  } },
  2024: { labels: ${JSON.stringify(LABELS_2024)}, scores: {
${S24.map(([n, r]) => `    ${JSON.stringify(n)}: ${JSON.stringify(r)},`).join("\n")}
  } },
};
`;
writeFileSync(new URL("../src/historyRounds.js", import.meta.url), out);
console.log(`wrote src/historyRounds.js: ${S23.length} players in 2023, ${S24.length} in 2024, every total matches`);
