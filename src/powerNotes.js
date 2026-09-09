// The write-ups under the Power Rankings, one short paragraph a team, the way
// ESPN runs theirs: where the team sits and why, what happened last time out,
// and who is next. Pure, no React and no Supabase. Computes no score; every
// number here is read off buildTeamPower.
//
// Rules this file holds:
//   1. Real sentences. This is narration, so it does not follow the fragments
//      rule that product chrome does.
//   2. A team takes a plural verb: El Camino climb, Cal Aggie hold.
//   3. Players are people and nobody's pronouns are recorded: they/them.
//   4. A number has to be worth printing. A gap between teammates is named
//      only past eight points a week; a schedule is named only at either end
//      of the league.
//   5. Nothing non-human decides, refuses, knows or tells. A rating rises; a
//      team wins; a person reads.
//   6. Short, and no team lore. Andrew, 2026-09-09: half as long, and nobody
//      needs to know who the team was named for here. A write-up is the
//      headline, the number with its rank, one colour sentence when the week
//      has one, and who is next. The place and the move are on the row above
//      and are not said again.
//   7. The choice between phrasings is hashed off the team and the round,
//      never random, so the page reads the same on every load.
//   8. Every paragraph opens on a headline: the one line somebody scanning the
//      page reads, and what they need to know about this team right now.
//      Andrew, 2026-09-09. It comes off TEAM_PUN in wire.js, the bank Andrew
//      wrote himself, so the wording is his including the punctuation, and the
//      rules that bank carries are the rules here: a line that says "you" is
//      addressed to a reader this page does not have, and a line that claims a
//      rout only runs over one. A win line runs over a good run, a loss line
//      over a bad one, and a team going both ways at once gets a plain line
//      about the result rather than a pun that overstates the run.
//   9. No two teams take the same headline in one week, and the headline never
//      says what the sentence after it says. The puns carry no numbers, so the
//      "why" sentence keeps the number and the rank.
//  10. No driver is named in a headline. DRIVER_PUN belongs to the weekly
//      paper, where one week is the subject; a team's week is not one driver.
import { ordinal, nextFixtures } from "./teamTable.js";
import { TEAM_PUN, BIG_ONLY, ADDRESSES_READER } from "./wire.js";

const r1 = n => Math.round(n * 10) / 10;
const fmt = n => (Number.isInteger(r1(n)) ? String(r1(n)) : r1(n).toFixed(1));

const hash = str => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};
const pick = (arr, key) => arr[hash(key) % arr.length];

const WORD = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const word = n => (Number.isInteger(n) && n >= 0 && n < WORD.length ? WORD[n] : String(n));
const cap = str => str.replace(/^./, c => c.toUpperCase());

// A place said out loud: "4th in the league", or "level 4th" when shared.
const placeOf = rk => (rk.place === 1 && !rk.tied ? "the best" : rk.tied ? `level ${ordinal(rk.place)}` : ordinal(rk.place));

// A run of the same result at the end of the form line, and how long.
const streak = form => {
  if (!form.length) return { what: null, n: 0 };
  const last = form[form.length - 1].won;
  let n = 0;
  for (let i = form.length - 1; i >= 0 && form[i].won === last; i--) n++;
  return { what: last, n };
};

// The plain lines, for a team going two ways at once: four wins in the last
// five and then a loss, or four losses and then a win. The pun banks are win
// and loss only, and a win pun over a team that just lost claims a week that
// did not happen. These say what the last round did and leave the run to the
// sentence after them.
// A loss off four wins in five is one dropped, and a loss off three is a run
// coming apart, so the two take different words.
const PLAIN = {
  won: ["{t} answer back", "{t} take one back", "{t} stop the slide", "{t} get back on the board"],
  lostRun: ["{t} give one back", "{t} drop one"],
  lostBad: ["{t} come unstuck", "{t} lose the thread"],
  drew: ["{t} split the week", "{t} share the points"],
};

// Andrew's lines are headlines in the weekly paper, where nothing follows them
// on the line, so most carry no full stop. Here the headline is the first
// sentence of a paragraph and needs one. A line that already ends on a mark
// keeps the mark he wrote.
const stop = line => (/[.!?]$/.test(line) ? line : `${line}.`);

// The run and the last result as one number. Two teams can both hold three
// wins in the last five and be going opposite ways, and the headline is about
// which way. Four from five is a good run at 5 and a mixed week at 3 once the
// last one is lost, which is what keeps a win pun off a team that just lost.
const formScore = r => {
  const last = r.form[r.form.length - 1];
  return r.wins + (!last ? 0 : last.won === true ? 1 : last.won === false ? -1 : 0);
};

/**
 * One headline a team, in row order so a collision can step to the next line.
 *
 * @param {object} power  buildTeamPower(db) output
 * @returns {object}      { [teamId]: headline }
 */
export function buildPowerHeadlines(power) {
  const { rows, round } = power;
  const used = new Set();      // the words as they print
  const spent = new Set();     // and the line they came off
  const out = {};
  rows.forEach(r => {
    const last = r.form[r.form.length - 1];
    const score = formScore(r);
    // A pun that claims a rout only runs over one: four or five wins from the
    // last five, or a last result decided by 25 or more.
    const big = r.wins >= 4 || (last && Math.abs(last.score - last.oppScore) >= 25);
    const bank = TEAM_PUN[r.code] || {};
    const kind = score >= 4 ? "win" : score <= 1 ? "loss" : null;
    let lines = kind
      ? (bank[kind] || []).filter(l => !ADDRESSES_READER.test(l) && (big || !BIG_ONLY.has(l)))
      : [];
    if (!lines.length) {
      lines = !last || last.won === null ? PLAIN.drew
        : last.won ? PLAIN.won
        : r.wins >= 4 ? PLAIN.lostRun : PLAIN.lostBad;
    }
    // Hashed off the team and the round, never random. Two teams landing on the
    // same line step to the next one rather than printing twice. The plain
    // lines are one small bank shared by every team that draws them, so the
    // template is spent as well as the sentence: three teams reading "answer
    // back" in the same week is the same repetition with three names on it.
    const n = hash(`${r.code}:${round}:head`) % lines.length;
    let line = null, from = null;
    for (const skip of [true, false]) {
      for (let i = 0; i < lines.length && !line; i++) {
        const src = lines[(n + i) % lines.length];
        if (skip && spent.has(src)) continue;
        const cand = stop(src.replace(/\{t\}/g, r.short));
        if (!used.has(cand)) { line = cand; from = src; }
      }
      if (line) break;
    }
    if (!line) line = stop(`${r.short} hold ${ordinal(r.place)}`);
    used.add(line);
    if (from) spent.add(from);
    out[r.id] = line;
  });
  return out;
}

/**
 * @param {object} power  buildTeamPower(db) output
 * @param {object} db     { teams, races, scores, schedule, players }
 * @returns {object}      { [teamId]: paragraph }
 */
export function buildPowerNotes(power, db) {
  const { rows, round } = power;
  const players = db.players || [];
  const nameOf = {}; players.forEach(p => { nameOf[p.id] = p.name; });
  const byId = {}; rows.forEach(r => { byId[r.id] = r; });
  const teamCount = rows.length;
  const fiveOfFive = rows.filter(r => r.wins === 5).length;
  const mostWins = Math.max(...rows.map(x => x.w));
  const fixtures = nextFixtures(db, round + 1);

  const headlines = buildPowerHeadlines(power);

  const notes = {};
  rows.forEach(r => {
    const key = `${r.code}:${round}`;
    const headline = headlines[r.id];

    /* ---- why: the run, or the number, with its rank ---- */
    const st = streak(r.form);
    const wins = r.wins;
    const gap = r1(r.last5 - r.season);
    const sRank = r.ranks.season, fRank = r.ranks.last5;
    const winsWord = wins === 0 ? "no wins" : wins === 1 ? "one win" : Number.isInteger(wins) ? `${word(wins)} wins` : `${word(Math.floor(wins))} wins and a draw`;
    let why;
    if (wins === 5) {
      why = fiveOfFive === 1
        ? `Five wins from the last five, and nobody else in the league can say that.`
        : `Five wins from the last five.`;
    } else if (wins <= 1 && sRank.place <= 8) {
      why = `Their ${fmt(r.season)} a week for the season is ${placeOf(sRank)} in the league on scoring, and ${winsWord} in the last five is what has them down here.`;
    } else if (st.what === true && st.n >= 3) {
      why = pick([
        `${cap(word(st.n))} straight wins, and the ${fmt(r.last5)} a week over the last five is ${placeOf(fRank)} in the league on form.`,
        `They've won ${word(st.n)} in a row, scoring ${fmt(r.last5)} a week over the last five against ${fmt(r.season)} for the season.`,
      ], key + "w");
    } else if (st.what === false && st.n >= 3) {
      why = pick([
        `${cap(word(st.n))} straight losses, on ${fmt(r.last5)} a week over the last five, which is still ${placeOf(fRank)} in the league.`,
        `They've lost ${word(st.n)} in a row on ${fmt(r.last5)} a week, ${gap >= 0 ? "above" : "under"} their ${fmt(r.season)} for the season.`,
      ], key + "l");
    } else if (fRank.place <= 3) {
      why = `${cap(winsWord)} in the last five, and the ${fmt(r.last5)} a week over that run is ${placeOf(fRank)} in the league on form.`;
    } else if (Math.abs(gap) >= 8) {
      why = gap > 0
        ? `${cap(winsWord)} in the last five, and they're scoring ${fmt(r.last5)} a week over that run against ${fmt(r.season)} for the season.`
        : `${cap(winsWord)} in the last five, and the ${fmt(r.last5)} a week over that run is well under their ${fmt(r.season)} for the season.`;
    } else {
      why = pick([
        `${cap(winsWord)} in the last five, on ${fmt(r.last5)} a week, ${placeOf(fRank)} in the league on form.`,
        `${cap(winsWord)} from the last five, scoring ${fmt(r.last5)} a week over that run. For the season they're ${placeOf(sRank)} on scoring.`,
      ], key + "f");
    }
    if (r.w === mostWins && r.place > 8) {
      why = `Nobody has won more matchups than their ${word(r.w)}, and the ${fmt(r.season)} a week they've scored is ${placeOf(sRank)} in the league.`;
    }

    /* ---- last time out, when the result says something ---- */
    const last = r.form[r.form.length - 1];
    let lastLine = null;
    if (last) {
      const opp = byId[last.oppId];
      const on = opp ? opp.short : "their opponent";
      const margin = Math.abs(last.score - last.oppScore);
      if (last.won === null) {
        lastLine = `Last time out they drew with ${on}, ${last.score} apiece.`;
      } else if (last.decidedByBoxBox && last.won === true) {
        lastLine = pick([
          `Last time out they beat ${on} ${last.score} to ${last.oppScore}, with the drivers inside six points and BOX BOX the difference.`,
          `They beat ${on} ${last.score} to ${last.oppScore} last time out, a matchup that turned on BOX BOX.`,
        ], key + "b");
      } else if (last.decidedByBoxBox && last.won === false) {
        lastLine = pick([
          `Last time out they lost to ${on} ${last.oppScore} to ${last.score}, with the drivers inside six points and BOX BOX the difference.`,
          `They lost to ${on} ${last.oppScore} to ${last.score} last time out, a matchup that turned on BOX BOX.`,
        ], key + "b");
      } else if (margin >= 25) {
        lastLine = last.won
          ? `Last time out they beat ${on} ${last.score} to ${last.oppScore}, a margin of ${margin}.`
          : `Last time out ${on} beat them ${last.oppScore} to ${last.score}, a margin of ${margin}.`;
      } else if (opp && opp.place <= 5 && last.won === true && r.place > 5) {
        lastLine = `Last time out they beat ${on}, who sit ${ordinal(opp.place)} on this board, ${last.score} to ${last.oppScore}.`;
      }
    }

    /* ---- the two people, when one is carrying the other ---- */
    const p1 = nameOf[r.p1Id], p2 = nameOf[r.p2Id];
    const n5 = r.form.length;
    let people = null;
    if (p1 && p2 && n5 >= 3) {
      const a1 = r1(r.form.reduce((a, f) => a + (f.parts ? f.parts.p1 : 0), 0) / n5);
      const a2 = r1(r.form.reduce((a, f) => a + (f.parts ? f.parts.p2 : 0), 0) / n5);
      const [hi, lo] = a1 >= a2 ? [[p1, a1], [p2, a2]] : [[p2, a2], [p1, a1]];
      if (hi[1] - lo[1] >= 8) {
        people = pick([
          `${hi[0]} has carried the load over the last five, ${fmt(hi[1])} a week to ${lo[0]}'s ${fmt(lo[1])}.`,
          `${hi[0]} is scoring ${fmt(hi[1])} a week over the last five and ${lo[0]} ${fmt(lo[1])}.`,
        ], key + "p");
      } else if (Math.abs(hi[1] - lo[1]) <= 2 && r.place <= 6) {
        people = `${p1} and ${p2} have been level over the last five, ${fmt(a1)} and ${fmt(a2)} a week.`;
      }
    }

    /* ---- the schedule, at either end of the league ---- */
    let sched = null;
    if (r.schedRank <= 3) {
      const which = r.schedRank === 1 ? "highest" : r.schedRank === 2 ? "second highest" : "third highest";
      sched = `Their last five opponents average ${fmt(r.oppAvg)} a week, the ${which} in the league.`;
    } else if (r.schedRank >= teamCount - 2) {
      const which = r.schedRank === teamCount ? "lowest" : r.schedRank === teamCount - 1 ? "second lowest" : "third lowest";
      sched = `Their last five opponents average ${fmt(r.oppAvg)} a week, the ${which} in the league.`;
    }

    /* ---- next ---- */
    const nextId = fixtures.opponentOf[r.id];
    const next = nextId ? byId[nextId] : null;
    let nextLine = null;
    if (next && fixtures.race) {
      const where = next.place === 1 ? "top of this board" : `${ordinal(next.place)} on this board`;
      nextLine = pick([
        `Next up is ${next.short}, ${where}, in round ${fixtures.race.round}.`,
        `Round ${fixtures.race.round} brings ${next.short}, ${where}.`,
        `${next.short}, ${where}, are next in round ${fixtures.race.round}.`,
      ], key + "n");
    }

    /* ---- one colour sentence, when the week has one. Last time out is
            only built when the result says something, so it goes first; the
            teammate gap and the schedule take turns after that. ---- */
    const colour = lastLine || (people && sched ? pick([people, sched], key + "c") : people || sched);
    const out = [why, colour, nextLine];
    notes[r.id] = [headline, ...out].filter(Boolean).join(" ");
  });
  return notes;
}
