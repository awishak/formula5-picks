// Who is he, who is she, and the Bot, which is it. Andrew, 2026-10-11:
// "instead of their, let's say his or her." The deck's write-ups read this;
// nothing else in the app does. WOMEN is Andrew's list, everyone else is he,
// and the Bot is it. A name not in the league at all gets they, so a sentence
// about somebody new is never wrong, only neutral.
export const WOMEN = new Set([
  "Alicia Cho",
  "Evie Ishak",
  "Heather Ishak",
  "Krista Nabil",
  "Lucia Thompson",
  "Maggie Ball",
  "Maggie Mudge",
  "Matilda Luton",
  "Stacy Michaelsen",
]);
export const MEN = new Set([
  "Aditya Satish", "Andrew Ishak", "Andy Thompson", "Anthony Carnesecca", "Anthony Zamary",
  "Brett Dillon", "Brian Dong", "Chris Fondacaro", "Chris Malek", "Dan Patry", "Danny Bowers",
  "Francisco Soldavini", "George Fahmy", "Grant Wong", "Harold Gutmann", "Jack Civitts",
  "Joe Hanna", "Joe McGlynn", "Kerolos Nakhla", "Kevin Coolidge", "Larry Noel", "Martin Nobar",
  "Matteo Thompson", "Max Reisinger", "Mena Yousef", "Moses Abdelshaid", "Nick Brody",
  "Paul Kohli", "Pavly Attalah", "Rafik Zarifa", "Ramy Stephanos", "Ronnie Nobar", "Ryan Kohli",
  "Sam Bottoms", "Scott Schertler", "Theo Ishak", "TJ Donato", "Zack Girgis",
]);
export const BOTS = new Set(["Formula5 Bot"]);

const SHE = { subject: "she", object: "her", possessive: "her", reflexive: "herself" };
const HE = { subject: "he", object: "him", possessive: "his", reflexive: "himself" };
const IT = { subject: "it", object: "it", possessive: "its", reflexive: "itself" };
const THEY = { subject: "they", object: "them", possessive: "their", reflexive: "themself" };

/** The pronouns for a player, by name. */
export function pronounsOf(name) {
  if (WOMEN.has(name)) return SHE;
  if (MEN.has(name)) return HE;
  if (BOTS.has(name)) return IT;
  return THEY;
}
