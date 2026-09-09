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
import { ordinal, nextFixtures } from "./teamTable.js";

const r1 = n => Math.round(n * 10) / 10;
const fmt = n => (Number.isInteger(r1(n)) ? String(r1(n)) : r1(n).toFixed(1));
const rec = r => (r.d > 0 ? `${r.w}-${r.l}-${r.d}` : `${r.w}-${r.l}`);

// The choice between two phrasings of the same fact is hashed off the team and
// the round, never random, so the page reads the same on every load.
const hash = str => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};
const pick = (arr, key) => arr[hash(key) % arr.length];

const WORD = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const word = n => (Number.isInteger(n) && n >= 0 && n < WORD.length ? WORD[n] : String(n));

// A run of the same result at the end of the form line, and how long.
const streak = form => {
  if (!form.length) return { what: null, n: 0 };
  const last = form[form.length - 1].won;
  let n = 0;
  for (let i = form.length - 1; i >= 0 && form[i].won === last; i--) n++;
  return { what: last, n };
};

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

  // Season scoring rank across the league, for the "better than their place" line.
  const bySeason = rows.slice().sort((a, b) => b.season - a.season);
  const seasonRank = {}; bySeason.forEach((r, i) => { seasonRank[r.id] = i + 1; });

  const fiveOfFive = rows.filter(r => r.wins === 5).length;
  const fixtures = nextFixtures(db, round + 1);

  const notes = {};
  rows.forEach(r => {
    const key = `${r.code}:${round}`;
    const t = r.short;
    const place = ordinal(r.place);
    const out = [];

    /* ---- 1. where they sit, and the move ---- */
    if (r.move == null) {
      out.push(`${t} come in at ${place}.`);
    } else if (r.place === 1 && r.move === 0) {
      out.push(pick([`${t} stay top.`, `${t} hold the top spot.`], key));
    } else if (r.place === 1) {
      out.push(`${t} go top, up ${word(r.move)} from last week.`);
    } else if (r.move === 0) {
      out.push(pick([`${t} hold ${place}.`, `No move for ${t}, who stay ${place}.`], key));
    } else if (r.move >= 3) {
      out.push(pick([`${t} climb ${word(r.move)} places to ${place}.`, `Up ${word(r.move)} to ${place} for ${t}.`], key));
    } else if (r.move > 0) {
      out.push(`${t} move up ${word(r.move)} to ${place}.`);
    } else if (r.move <= -3) {
      out.push(pick([`${t} drop ${word(-r.move)} places to ${place}.`, `Down ${word(-r.move)} to ${place} for ${t}.`], key));
    } else {
      out.push(`${t} slip ${word(-r.move)} to ${place}.`);
    }

    /* ---- 2. why: the run, or the number ---- */
    const st = streak(r.form);
    const wins = r.wins;
    const gap = r1(r.last5 - r.season);
    const sRank = seasonRank[r.id];
    const winsWord = wins === 0 ? "no wins" : wins === 1 ? "one win" : Number.isInteger(wins) ? `${word(wins)} wins` : `${word(Math.floor(wins))} wins and a draw`;
    const cap = str => str.replace(/^./, c => c.toUpperCase());

    if (wins === 5) {
      out.push(fiveOfFive === 1
        ? `Five wins from the last five, and nobody else in the league can say that.`
        : `Five wins from the last five.`);
    } else if (wins <= 1 && sRank <= 8) {
      // A team scoring well and still losing is the clearest thing on the page.
      out.push(`Their ${fmt(r.season)} a week for the season is ${ordinal(sRank)} in the league on scoring, and ${winsWord} in the last five is what has them down here.`);
    } else if (st.what === true && st.n >= 3) {
      out.push(pick([
        `${cap(word(st.n))} straight wins, and they've scored ${fmt(r.last5)} a week over the last five against a season average of ${fmt(r.season)}.`,
        `They've won ${word(st.n)} in a row, scoring ${fmt(r.last5)} a week over the last five. The season average is ${fmt(r.season)}.`,
      ], key + "w"));
    } else if (st.what === false && st.n >= 3) {
      out.push(pick([
        `${cap(word(st.n))} straight losses, on ${fmt(r.last5)} a week over the last five.`,
        `They've lost ${word(st.n)} in a row. The scoring is ${fmt(r.last5)} a week over the last five, ${gap >= 0 ? "above" : "under"} their ${fmt(r.season)} for the season, so the losses are about who they've drawn as much as what they've scored.`,
      ], key + "l"));
    } else if (Math.abs(gap) >= 8) {
      out.push(gap > 0
        ? `${cap(winsWord)} in the last five, and they're scoring ${fmt(r.last5)} a week over that run against ${fmt(r.season)} for the season.`
        : `${cap(winsWord)} in the last five, and the ${fmt(r.last5)} a week over that run is well under their ${fmt(r.season)} for the season.`);
    } else {
      out.push(pick([
        `${cap(winsWord)} in the last five, on ${fmt(r.last5)} a week.`,
        `${cap(winsWord)} from the last five, scoring ${fmt(r.last5)} a week over that run.`,
      ], key + "f"));
    }

    /* ---- 2b. the record, when the record and the rating disagree ---- */
    const mostWins = Math.max(...rows.map(x => x.w));
    if (r.w === mostWins && r.place > 8) {
      out.push(`Nobody has won more matchups than their ${word(r.w)}. The ${fmt(r.season)} a week they've scored is ${ordinal(sRank)} in the league, and scoring is seventy percent of the rating.`);
    }

    /* ---- 3. last time out, when the result says something ---- */
    const last = r.form[r.form.length - 1];
    if (last) {
      const opp = byId[last.oppId];
      const on = opp ? opp.short : "their opponent";
      const margin = Math.abs(last.score - last.oppScore);
      if (last.won === null) {
        out.push(`Last time out they drew with ${on}, ${last.score} apiece.`);
      } else if (last.decidedByBoxBox && last.won === true) {
        out.push(pick([
          `Last time out they beat ${on} ${last.score} to ${last.oppScore}, with the drivers inside six points and BOX BOX the difference.`,
          `They beat ${on} ${last.score} to ${last.oppScore} last time out, a matchup that turned on BOX BOX.`,
        ], key + "b"));
      } else if (last.decidedByBoxBox && last.won === false) {
        out.push(pick([
          `Last time out they lost to ${on} ${last.oppScore} to ${last.score}, with the drivers inside six points and BOX BOX the difference.`,
          `They lost to ${on} ${last.oppScore} to ${last.score} last time out, a matchup that turned on BOX BOX.`,
        ], key + "b"));
      } else if (margin >= 25) {
        out.push(last.won
          ? `Last time out they beat ${on} ${last.score} to ${last.oppScore}, a margin of ${margin}.`
          : `Last time out ${on} beat them ${last.oppScore} to ${last.score}, a margin of ${margin}.`);
      } else if (opp && opp.place <= 5 && last.won === true && r.place > 5) {
        out.push(`Last time out they beat ${on}, who sit ${ordinal(opp.place)} on this board, ${last.score} to ${last.oppScore}.`);
      }
    }

    /* ---- 4. the two people, when one is carrying the other ---- */
    const p1 = nameOf[r.p1Id], p2 = nameOf[r.p2Id];
    const n5 = r.form.length;
    if (p1 && p2 && n5 >= 3) {
      const a1 = r1(r.form.reduce((a, f) => a + (f.parts ? f.parts.p1 : 0), 0) / n5);
      const a2 = r1(r.form.reduce((a, f) => a + (f.parts ? f.parts.p2 : 0), 0) / n5);
      const [hi, lo] = a1 >= a2 ? [[p1, a1], [p2, a2]] : [[p2, a2], [p1, a1]];
      if (hi[1] - lo[1] >= 8) {
        out.push(pick([
          `${hi[0]} has carried the load over the last five, ${fmt(hi[1])} a week to ${lo[0]}'s ${fmt(lo[1])}.`,
          `${hi[0]} is scoring ${fmt(hi[1])} a week over the last five and ${lo[0]} ${fmt(lo[1])}.`,
        ], key + "p"));
      } else if (Math.abs(hi[1] - lo[1]) <= 2 && r.place <= 6) {
        out.push(`${p1} and ${p2} have been level over the last five, ${fmt(a1)} and ${fmt(a2)} a week.`);
      }
    }

    /* ---- 5. the schedule, at either end of the league ---- */
    if (r.schedRank <= 3) {
      const which = r.schedRank === 1 ? "highest" : r.schedRank === 2 ? "second highest" : "third highest";
      out.push(`Their last five opponents average ${fmt(r.oppAvg)} a week, the ${which} in the league.`);
    } else if (r.schedRank >= teamCount - 2) {
      const which = r.schedRank === teamCount ? "lowest" : r.schedRank === teamCount - 1 ? "second lowest" : "third lowest";
      out.push(`Their last five opponents average ${fmt(r.oppAvg)} a week, the ${which} in the league.`);
    }

    /* ---- 6. next ---- */
    const nextId = fixtures.opponentOf[r.id];
    const next = nextId ? byId[nextId] : null;
    if (next && fixtures.race) {
      const where = next.place === 1 ? "top of this board" : `${ordinal(next.place)} on this board`;
      out.push(pick([
        `Next up is ${next.short}, ${where}, in round ${fixtures.race.round}.`,
        `Round ${fixtures.race.round} brings ${next.short}, ${where}.`,
      ], key + "n"));
    }

    notes[r.id] = out.join(" ");
  });
  return notes;
}
