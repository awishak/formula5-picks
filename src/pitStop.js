// The pit stop, settled at two precisions. Pure, and the only copy: Admin
// scores with it, and every page that works a matchup out again reads the same
// answer.
//
//   the team game, BOX BOX     to the hundredth
//   the individual game, Needle  to the tenth
//
// Set by Andrew 2026-09-13. The line is printed to two places and the stop is
// timed to two, so a line of 2.575 is a line of 2.58, and a 2.58 stop against
// it is a push. Round 14 scored that as an OVER win on the raw average. The
// Needle is guessed on a dial that moves in tenths, so the stop is rounded to
// the tenth before a guess is measured against it.
//
// Everything is compared in whole units, never as floats: 3.0500000000000003
// is 305 hundredths, and 2.45 - 2.3 is not 0.15.

const hundredths = v => Math.round(Number(v) * 100);
// Through hundredths first, so 2.55 is 255 and rounds up to 26 tenths rather
// than landing on 25.499999999999996.
const tenths = v => Math.round(hundredths(v) / 10);

/* ------------------------------------------------------ BOX BOX, the team game */

// The average of whatever guesses are in, to the hundredth. Null with none.
export function boxBoxLine(guesses) {
  const g = guesses.map(v => (v == null || v === "" ? NaN : Number(v))).filter(v => !Number.isNaN(v));
  return g.length ? hundredths(g.reduce((a, b) => a + b, 0) / g.length) / 100 : null;
}

// "OVER", "UNDER", "PUSH", or null while either number is missing.
export function boxBoxSide(stop, line) {
  if (stop == null || line == null || Number.isNaN(Number(stop)) || Number.isNaN(Number(line))) return null;
  const s = hundredths(stop), l = hundredths(line);
  return s > l ? "OVER" : s < l ? "UNDER" : "PUSH";
}

/* ------------------------------------------------ the Needle, the individual game */

// 5 for the stop to the tenth, then one fewer for every tenth off, down to 0
// from half a second out. A 2.58 stop is a 2.6 stop here.
export function needlePoints(guess, stop) {
  if (guess == null || guess === "" || stop == null || Number.isNaN(Number(guess)) || Number.isNaN(Number(stop))) return 0;
  return Math.max(0, 5 - Math.abs(tenths(guess) - tenths(stop)));
}
