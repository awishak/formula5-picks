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
//   6. Every paragraph carries one line of lore, from docs/F5_Team_Lore.md,
//      and no two paragraphs take the same shape in the same week. Andrew,
//      2026-09-09: they should be different from each other.
//   7. The choice between phrasings is hashed off the team and the round,
//      never random, so the page reads the same on every load.
import { ordinal, nextFixtures } from "./teamTable.js";

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

// One line of lore a team, from docs/F5_Team_Lore.md, keyed on the code in
// teams.js. Two or three lines each so neighbouring weeks do not repeat, and
// nothing here that the lore doc does not say. A line that names a player goes
// stale when that player moves, so check the roster before adding one.
export const LORE = {
  VAN: [
    "Van City is Vancouver, where Rafik Zarifa's wife is from, and corsa is Italian for race.",
    "Rafik Zarifa co-founded the team with the Cascadia pair in 2024 after a spell on East Bay Racing.",
  ],
  ECR: [
    "El Camino Real runs past SCU, where Harold Gutmann works; Paul Kohli is an alum. The fast road, in Spanish.",
    "A new team this year, named for the road that runs past the university both players came through.",
  ],
  JSV: [
    "An original team from 2023, named after the infamous Silicon Valley juicer startup.",
    "George Fahmy is a founding member of the league, and both players are from the Bay Area.",
  ],
  XRT: [
    "XLIX is 49, for the Gold Rush and Sacramento, and the Tower Bridge on the logo is drawn to read as the numerals.",
    "The Sacramento team, with the 1849 Gold Rush in the name and the Tower Bridge in the badge.",
  ],
  WLD: [
    "An original team of two Los Gatos High classmates, the Los Gatos Wildcats.",
    "Two Wildcats from Los Gatos High, in the league since the start.",
  ],
  BRO: [
    "Two former students of Professor Ishak's at Santa Clara, with SCU hidden inside Scuderia and the Broncos for the mascot.",
    "An original team. The SCU in the middle of the name is the university and the Bronco is its mascot.",
  ],
  COU: [
    "An original team named for an adult Los Gatos community side, and no university mascot in sight.",
    "Cougar Autosport have been here since the start, named for a Los Gatos adult community team.",
  ],
  CSC: [
    "Cascadia is the Pacific Northwest, and the team was part of Van City Corsa before it split off.",
    "Once half of Van City Corsa, now their own team, named for the bioregion up the coast.",
  ],
  STL: [
    "Founded in 2025 by former SCU men when Jack Civitts moved to Cal Poly; stalloni is stallions, and 1851 is the year SCU was founded.",
    "Stallions in Italian, and the year in the name is Santa Clara's founding.",
  ],
  EBR: [
    "An original team, friends from the East Bay. Peep the logo.",
    "East Bay friends, in the league since the start, with a logo worth a second look.",
  ],
  TEX: [
    "Two friends from grad school at UT Austin, one who grew up in Texas and one who lives there now. Drive plus Texas.",
    "An original team out of UT Austin, Texas in the name and one of the two still living there.",
  ],
  GAR: [
    "Two SCU freshmen, one from Argentina; garra is Spanish for claw, or for grit.",
    "A new team of two Santa Clara freshmen, named for the Spanish word for claw.",
  ],
  TNT: [
    "Thompson and Thompson, and Andy Thompson works at Roku.",
    "TNT is Thompson and Thompson, and the Roku is Andy Thompson's employer.",
  ],
  SHO: [
    "Two former students from the same Fall 2022 Public Speaking class, named for Daniel Ricciardo's shoey, with Max and Danny for the old Red Bull pairing.",
    "Named for the shoey, and the Max and Danny is the old Verstappen and Ricciardo pairing as much as the two players.",
  ],
  MEA: [
    "Carnesecca and Ball, meat and ball. Maggie Ball was in Professor Ishak's very first class at SCU in Fall 2012.",
    "The name is the two surnames, carne being meat, and Maggie Ball goes back to Professor Ishak's first class at SCU.",
  ],
  CAR: [
    "A spinoff of Aggie Slipstream founded in 2025, UC Davis, and sent down for 2026 for a cost cap violation after signing the last two individual champions.",
    "Founded in 2025 by Andrew Ishak out of Aggie Slipstream, and relegated for 2026 for signing the last two individual champions under the cost cap.",
  ],
  ISK: [
    "Iskandaraya is Arabic for Alexandria; two Coptic friends from church.",
    "Named for Alexandria, in Arabic, by two friends from church.",
  ],
  LUX: [
    "Named for the ancient Egyptian city; two close friends from Hayward Church.",
    "Luxor, the ancient city on the Nile, for two close friends from Hayward Church.",
  ],
  PEL: [
    "Brett Dillon is French and into biking, Stacy Michaelsen loves her Peloton and eggplant, and aubergine is the French for eggplant.",
    "A Peloton bike, an eggplant in French, and a beautifully absurd team name.",
  ],
  PRS: [
    "Evie Ishak and her friend Matilda Luton; prestissimo is the tempo marking for very fast, and veloce is Italian for fast.",
    "Very fast twice over, once as a music tempo for Evie Ishak's singing and once in Italian.",
  ],
  TJP: [
    "TJ Donato and the Formula 5 Bot. The name is deliberately underwhelming.",
    "Half of this team is a bot, and the name is underwhelming on purpose.",
  ],
  MKR: [
    "Big Disney fans, Larry Noel near the Magic Kingdom in Florida and Chris Fondacaro near Disneyland, and both friends of Professor Ishak's from elementary school.",
    "One player near the Magic Kingdom and one near Disneyland, friends of Professor Ishak's since elementary school.",
  ],
  HWT: [
    "HomeworkTubes.com is a real website. Both players were on Cougar Autosport before this and coached little league with Professor Ishak.",
    "Two former Cougar Autosport players who coached little league with Professor Ishak, named for a real website.",
  ],
  AGS: [
    "The acronym is ASS. They slipstream because they suck. That's the lore.",
    "An original team whose acronym is ASS, and the lore ends there.",
  ],
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
  const fiveOfFive = rows.filter(r => r.wins === 5).length;
  const mostWins = Math.max(...rows.map(x => x.w));
  const fixtures = nextFixtures(db, round + 1);

  // Four shapes, dealt round the table in hashed order so that neighbouring
  // rows do not open the same way and every shape runs about six times.
  //   A  move, why, last time out, people, lore, next
  //   B  lore, move, why, last time out, next
  //   C  move, lore, why, people or schedule, next
  //   D  why, move, last time out, lore, next
  const SHAPES = ["A", "B", "C", "D"];
  const offset = hash(`shape:${round}`) % 4;

  const notes = {};
  rows.forEach((r, i) => {
    const key = `${r.code}:${round}`;
    const shape = SHAPES[(i + offset) % 4];
    const t = r.short;
    const place = ordinal(r.place);

    /* ---- where they sit, and the move. Built for the team by name and for
            "they", so a shape that has already named the team does not name
            them twice in two sentences. ---- */
    const moveLine = subj => {
      const named = subj === t;
      if (r.move == null) return `${subj} come in at ${place}.`;
      if (r.place === 1 && r.move === 0) return pick([`${subj} stay top.`, `${subj} hold the top spot.`], key);
      if (r.place === 1) return `${subj} go top, up ${word(r.move)} from last week.`;
      if (r.move === 0) return pick(named ? [`${subj} hold ${place}.`, `No move for ${subj}, who stay ${place}.`, `${subj} are ${place} again.`] : [`${subj} hold ${place}.`, `${subj} are ${place} again.`], key);
      if (r.move >= 3) return pick(named ? [`${subj} climb ${word(r.move)} places to ${place}.`, `Up ${word(r.move)} to ${place} for ${subj}.`, `${subj} are ${place}, up ${word(r.move)} on last week.`] : [`${subj} climb ${word(r.move)} places to ${place}.`, `${subj} are ${place}, up ${word(r.move)} on last week.`], key);
      if (r.move > 0) return pick([`${subj} move up ${word(r.move)} to ${place}.`, `${subj} edge up to ${place}.`], key);
      if (r.move <= -3) return pick(named ? [`${subj} drop ${word(-r.move)} places to ${place}.`, `Down ${word(-r.move)} to ${place} for ${subj}.`, `${subj} fall to ${place}, ${word(-r.move)} places down on last week.`] : [`${subj} drop ${word(-r.move)} places to ${place}.`, `${subj} fall to ${place}, ${word(-r.move)} places down on last week.`], key);
      return pick([`${subj} slip ${word(-r.move)} to ${place}.`, `${subj} are ${place}, down ${word(-r.move)}.`], key);
    };
    const move = moveLine(t);

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
        `They've lost ${word(st.n)} in a row. The scoring is ${fmt(r.last5)} a week over the last five, ${gap >= 0 ? "above" : "under"} their ${fmt(r.season)} for the season, so the losses are about who they've drawn as much as what they've scored.`,
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
      why += ` Nobody has won more matchups than their ${word(r.w)}. The ${fmt(r.season)} a week they've scored is ${placeOf(sRank)} in the league, and scoring is seventy percent of the rating.`;
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

    /* ---- lore ---- */
    const bank = LORE[r.code];
    const lore = bank ? pick(bank, key + "lore") : null;

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

    /* ---- deal the sentences by shape ---- */
    let out;
    if (shape === "A") out = [move, why, lastLine, people, lore, nextLine];
    else if (shape === "B") out = [lore, move, why, lastLine, sched, nextLine];
    else if (shape === "C") out = [move, lore, why, people || sched, nextLine];
    else {
      // Leads on the why, so the team is named in front of the number and the
      // move is said about "they".
      const led = /^(Their|They've)/.test(why) ? `${t}: ${why.replace(/^./, c => c.toLowerCase())}` : `For ${t}, ${why.replace(/^./, c => c.toLowerCase())}`;
      out = [led, moveLine("They"), lastLine, sched, lore, nextLine];
    }
    notes[r.id] = out.filter(Boolean).join(" ");
  });
  return notes;
}
