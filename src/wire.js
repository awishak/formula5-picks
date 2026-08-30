/**
 * The week, written up.
 *
 * Pure. No React and no Supabase, the same shape as weekly.js, teamTable.js and
 * playerTable.js. buildWire(data) takes the output of buildWeekly() and returns
 * eight stories: a headline, a standfirst, body copy and the frames that draw
 * the numbers.
 *
 * THE MATHS ARE NOT HERE. Every number on the page comes off buildWeekly, which
 * mirrors scoreRace() in Admin.jsx. This file only decides what to call the week
 * and in what order to tell somebody about the week. Two copies of the scoring
 * rules is the bug shape that DRIVER_NAMES being trapped in Admin.jsx already
 * cost once.
 *
 * Every headline carries a pun or an angle. A headline that only restates the
 * scoreline is not finished: "Peloton beat Meatballs" is the standfirst's job.
 * The banks below are what makes that possible without a language model in the
 * loop, and they are keyed on the two vocabularies the league already has, its
 * team names and the 22 drivers.
 */

import { codeOf, shortOf } from "./teams.js";
import { canonicalName, DRIVER_HEADSHOTS } from "./drivers.js";

/* ------------------------------------------------------------------ words */

const last = n => String(n || "").trim().split(/\s+/).pop();
const first = n => String(n || "").trim().split(/\s+/)[0];
const plural = (n, word) => `${n} ${word}${Math.abs(n) === 1 ? "" : "s"}`;
// In front of a noun a number hyphenates and does not pluralise: a 50-point
// defeat, not a "50 points defeat".
const attrib = (n, word) => `${Math.abs(n)}-${word}`;
// 22nd, 33rd, and 11th through 13th, which do not follow the rule.
const ord = n => {
  const a = Math.abs(n) % 100, b = a % 10;
  const suf = a >= 11 && a <= 13 ? "th"
    : b === 1 ? "st" : b === 2 ? "nd" : b === 3 ? "rd" : "th";
  return `${n}${suf}`;
};
// "climbs a place" rather than "climbs 1 place", which reads like a readout.
const places = n => (Math.abs(n) === 1 ? "a place" : plural(Math.abs(n), "place"));
const signed = n => (n > 0 ? `+${n}` : `${n}`);
const round1 = n => Math.round(n * 10) / 10;
const secs = n => (n == null ? null : `${Number(n).toFixed(2)}s`);
// "at the Dutch Grand Prix", not "at Dutch Grand Prix". Race names in the
// calendar carry no article of their own.
const theRace = (name, cap = false) => {
  const n = String(name || "");
  if (!n || /^the\b/i.test(n)) return n;
  return `${cap ? "The" : "the"} ${n}`;
};
// Spoken numbers up to twelve, because a headline that opens on a digit reads
// as a scoreboard rather than as writing.
const WORDS = ["nothing", "one", "two", "three", "four", "five", "six",
  "seven", "eight", "nine", "ten", "eleven", "twelve"];
const spell = n => (Math.abs(n) <= 12 ? WORDS[Math.abs(n)] : String(Math.abs(n)));
// A headline built off a spelled-out number opened in lower case.
const cap = t => (t ? t[0].toUpperCase() + t.slice(1) : t);

// A stable pick out of a list of candidates. Two players in the same situation
// should not read the identical sentence, and the same player should read the
// same sentence on every load, so the choice comes off a hash of who is reading
// rather than off a random number.
const hash = str => {
  let h = 5381;
  for (let i = 0; i < String(str).length; i++) h = ((h * 33) ^ String(str).charCodeAt(i)) >>> 0;
  return h;
};
const oneOf = (list, key) => (list && list.length ? list[hash(key) % list.length] : null);

// Last names alone collide: the league has two Thompsons and two Ishaks, and a
// chart that labels both rows "Thompson" is telling the reader nothing. A name
// stays short until somebody else in the same list shares the surname, and then
// both of them grow an initial.
const shortNames = names => {
  const count = {};
  names.forEach(n => { const l = last(n); count[l] = (count[l] || 0) + 1; });
  const out = {};
  names.forEach(n => { out[n] = count[last(n)] > 1 ? `${first(n)[0]}. ${last(n)}` : last(n); });
  return out;
};

/* ------------------------------------------------------------- the banks */

// Two lines per team, one for a win and one for a loss, each built off what the
// team is actually called. Keyed on the three-letter code from teams.js, so a
// rename is one edit and a missing team falls through to the plain lines below.
const TEAM_PUN = {
  VAN: { win: ["{t} deliver", "{t} go the distance", "{t} make it rain"],
         loss: ["{t} break down", "{t} miss the drop",
                "Forecast for {t}: cloudy with a chance of losing"] },
  XRT: { win: ["{t} add up", "{t} do the numbers", "{t} light the beam",
               "{t} strike gold", "{t} do it for Sactown"],
         loss: ["{t} do not compute", "{t} come up a numeral short",
                "{t} get 86ed", "{t} does not mark the spot"] },
  TEX: { win: ["{t} send the message", "{t} get their point across",
               "{t} put their horns up", "{t} ride tall in the saddle"],
         loss: ["{t} left on read", "{t} lose the signal",
                "{t} is back!...or not.", "{t} wilt in the Texas heat"] },
  HWT: { win: ["{t} hand it in on time", "{t} ace the assignment",
               "{t}.com make Tubey the worm smile!"],
         loss: ["{t} miss the deadline", "{t} ask for an extension",
                "{t}.com can't find their way out of the racing tube"] },
  CAR: { win: ["{t} bring in the harvest", "{t} make the grade",
               "{t} make Davis proud", "All eggheads for {t}!"],
         loss: ["{t} watch the crop fail", "{t} flunk the week",
                "It's no picnic (day) for {t}.", "{t} gets stampeded"] },
  EBR: { win: ["{t} bridge the gap", "{t} hold the bay",
               "{t} do it for Oaktown", "{t} get hyphy"],
         loss: ["{t} go in the bay", "{t} lose the crossing",
                "{t} tries to ghostride the whip, and fails"] },
  JSV: { win: ["{t} squeeze it out", "{t} finally ship", "{t} file that IPO"],
         loss: ["{t} run out of runway", "{t} fail to squeeze",
                "{t} can't squeeze out a win"] },
  CSC: { win: ["{t} come down in a flood", "{t} cascade", "{t} climb the mountain"],
         loss: ["{t} run dry", "{t} trickle out", "{t} can't make the climb"] },
  PEL: { win: ["{t} pull away from the pack", "{t} ride off the front",
               "{t} go purple", "{t} come in ripe"],
         loss: ["{t} get dropped by the pack", "{t} blow up on the climb",
                "{t} wilt on the vine", "{t} turn to mush"] },
  COU: { win: ["{t} get their claws in", "{t} are on the prowl", "{t} hit on something",
               "{t} flirt with danger", "{t} still have it"],
         loss: ["{t} get declawed", "{t} go tame", "{t} strike out",
                "{t} get turned down", "{t} lose their touch"] },
  MEA: { win: ["{t} serve it up", "{t} cook"],
         loss: ["{t} get sauced", "{t} go cold",
                "{t} get past-a on the track by everyone"] },
  TNT: { win: ["{t} go off", "{t} blow the week open", "Everything's coming up Thompson."],
         loss: ["{t} turn out to be a dud", "{t} fizzle"] },
  ECR: { win: ["{t} live up to the rapido", "{t} take the short way round",
               "{t} walks away with a win."],
         loss: ["{t} take the scenic route", "{t} lose the rapido",
                "{t} is not so rapido"] },
  STL: { win: ["{t} stampede", "{t} bolt", "{t} 1851 got on their horses."],
         loss: ["{t} stall", "{t} pull up lame", "{t} 1851 didn't have the horses"] },
  GAR: { win: ["{t} get a grip", "{t} dig their claws in"], loss: ["{t} lose their grip", "{t} let it slip"] },
  WLD: { win: ["{t} pounce", "{t} go feral", "You put the W in {t}"],
         loss: ["{t} get house-trained", "{t} go quiet",
                "{t} Motors? More like Mildcat Whoa There"] },
  TJP: { win: ["{t} worth the upgrade", "{t} justify the subscription"], loss: ["{t} downgraded to basic", "{t} not so premium"] },
  BRO: { win: ["{t} buck", "{t} ride it out"], loss: ["{t} get thrown", "{t} last three seconds"] },
  SHO: { win: ["{t} earn the drink", "{t} fill the boot", "Good on ya, {t}",
               "A ripper week for {t}", "{t} go flat out like a lizard drinking"],
         loss: ["{t} pour one out", "{t} go thirsty", "{t} are having a shocker",
                "{t} have gone walkabout", "She'll be right, {t}"] },
  MKR: { win: ["{t} cast the spell", "{t} run the happiest week on earth"], loss: ["{t} run out of magic", "{t} close the park early"] },
  LUX: { win: ["{t} light the beam", "{t} take the house",
               "A luxurious week from the {t} boys",
               "{t} rule like pharaohs", "{t} rise like Ra",
               "{t} take the Valley of the Kings"],
         loss: ["{t} go dark", "{t} lose to the house", "You put the L in {t}",
                "{t} are in de-Nile", "{t} can't read the writing on the wall",
                "{t} get buried in the tomb"] },
  PRS: { win: ["{t} live up to the tempo", "{t} play it prestissimo",
               "Veloce? They sure were this week!"],
         loss: ["{t} take it adagio", "{t} lose the tempo",
                "Veloce? more like Ve-lost."] },
  AGS: { win: ["{t} get the tow", "{t} sit in the slipstream",
               "{t} won!? We're all shocked.",
               "Dan? Brian? Is this what it feels like to win?"],
         loss: ["{t} lose the tow", "{t} run in dirty air",
                "This week you were truly ASS",
                "Guys. are you even trying."] },
  ISK: { win: ["{t} conquer", "{t} take more ground", "{t} cruise the corniche",
               "{t} land the whole catch", "{t} light the Pharos"],
         loss: ["{t} lose an empire", "{t} give ground", "{t} burn the library down",
                "{t} come home with an empty net", "{t} run aground on the corniche"] },
};

// One driver, one week. `good` runs when he was worth real points and `bad`
// when he was not, so the same name can carry either half of a story.
const DRIVER_PUN = {
  "Max Verstappen": { good: ["Max value", "Verstappen, and everyone else stopping"], bad: ["Max, minimum", "Verstappen at a standstill"] },
  "Lando Norris": { good: ["Norris sticks the landing", "Lando comes good"], bad: ["Norris misses the landing", "Lando comes up short"] },
  "Charles Leclerc": { good: ["Leclerc files the paperwork", "Leclerc clocks in"], bad: ["Leclerc calls in sick", "Leclerc clocks off early"] },
  "Lewis Hamilton": { good: ["Hamilton does not throw away his shot", "Hamilton is in the room"], bad: ["Hamilton throws away his shot", "Hamilton waits in the wings"] },
  "George Russell": { good: ["Russell up the points", "The Russell hustle"], bad: ["No Russell, no hustle", "Russell rustles up nothing"] },
  "Oscar Piastri": { good: ["And the Oscar goes to Piastri", "Piastri takes the statue"], bad: ["Piastri snubbed", "No Oscar this week"] },
  "Carlos Sainz": { good: ["Sainz of life", "Making Sainz of the week"], bad: ["Sainz makes no sense", "No Sainz in it"] },
  "Fernando Alonso": { good: ["Alonso, and not alone for long", "Fernando still has it"], bad: ["Alonso, and alone", "Fernando finds nothing"] },
  "Andrea Kimi Antonelli": { good: ["Kimi a break", "Antonelli, and a big one"], bad: ["Kimi nothing", "Antonelli goes missing"] },
  "Alex Albon": { good: ["Albon voyage", "Albon-a-fide"], bad: ["Albon gone", "Albon overboard"] },
  "Lance Stroll": { good: ["A Stroll in the park", "Stroll walks it"], bad: ["Stroll goes nowhere", "A Stroll to nowhere"] },
  "Pierre Gasly": { good: ["Gasly, and gladly", "Gasly does it"], bad: ["Gasly runs out of gas", "Gasly, ghastly"] },
  "Franco Colapinto": { good: ["No collapse from Colapinto", "Colapinto pours it on"], bad: ["Colapinto collapses", "Colapinto folds"] },
  "Nico Hulkenberg": { good: ["The Hulk smashes", "Hulkenberg is angry now"], bad: ["The Hulk stays calm", "Hulkenberg goes quiet"] },
  "Gabriel Bortoleto": { good: ["Bortoleto brings the lot", "Bort of the week"], bad: ["Bortoleto brings nothing", "Bort, and short"] },
  "Oliver Bearman": { good: ["Bearman goes bull", "Bearman runs the market"], bad: ["Bear market", "Bearman goes into hibernation"] },
  "Esteban Ocon": { good: ["Ocon and on and on", "Ocon do no wrong"], bad: ["Ocon do no right", "Ocon, and off"] },
  "Liam Lawson": { good: ["Lawson lays down the law", "Law and order"], bad: ["Lawson breaks no laws", "Lawson gets overruled"] },
  "Isack Hadjar": { good: ["A sack of points from Isack", "Hadjar has had enough"], bad: ["Isack, empty sack", "Hadjar had nothing"] },
  "Arvid Lindblad": { good: ["Blad runner", "Lindblad goes ballistic"], bad: ["Lindblad runs out of blade", "Lindblad stays in the shadows"] },
  "Sergio Perez": { good: ["Checo, mate", "Perez cashes the cheque"], bad: ["Cheque bounces", "Perez, and no pesos"] },
  "Valtteri Bottas": { good: ["Bottas up", "Bottas to the top"], bad: ["Bottom of the Bottas", "Bottas empty"] },
};

const BIG_ONLY = new Set([
  "{t} blow the week open", "{t} pull away from the pack", "{t} ride off the front",
  "{t} come down in a flood", "{t} run the happiest week on earth", "{t} stampede",
]);
const BIG_MARGIN = 10;

// A line carries {t} wherever the team belongs in the sentence, not only at the
// front: "Forecast for {t}: cloudy with a chance of losing" is a headline, and
// "{t} deliver" is a headline, and both are the same field.
// A line that says "you" is talking to the reader, so it can only run over the
// reader's own team. The same bank also writes headlines about somebody else's
// upset, and "You put the W in Wildcat" over a team the reader is not on is
// addressed to nobody.
const ADDRESSES_READER = /\byou\b|\byour\b/i;

const teamLine = (team, kind, key, margin = null, self = true) => {
  const bank = TEAM_PUN[codeOf(team.name) || ""];
  if (!bank) return null;
  const lines = (bank[kind] || []).filter(l =>
    (margin == null || Math.abs(margin) >= BIG_MARGIN || !BIG_ONLY.has(l)) &&
    (self || !ADDRESSES_READER.test(l)));
  const line = oneOf(lines.length ? lines : bank[kind], key + team.name);
  if (!line) return null;
  return line.replace("{t}", shortOf(team.name));
};

const driverLine = (driver, kind, key) => {
  const bank = DRIVER_PUN[canonicalName(driver) || driver];
  return bank ? oneOf(bank[kind], key + driver) : null;
};

const shotOf = driver => DRIVER_HEADSHOTS[canonicalName(driver) || driver] || null;

/* ------------------------------------------------------------- the desk */

// Bylines. Fernolo 5 Bort already writes picks for anybody who misses the
// deadline, so the paper he files for is the joke the league is holding.
const DESK = {
  matchup: "Fernolo 5 Bort",
  league: "The F5 Desk",
  needle: "The Pit Wall",
  field: "The F5 Desk",
  power: "The F5 Desk",
  notebook: "Fernolo 5 Bort",
};

const readTime = story => {
  const words = (story.body || []).join(" ").split(/\s+/).length;
  return `${Math.max(1, Math.round(words / 180))} min read`;
};

/* ------------------------------------------------------------- the angles */

// A headline names somebody by surname, unless the league holds two of them.
// "Ishak is 1st on form" is Evie in a paper Andrew is reading, and there is no
// way for him to tell. The 48 come off the power board, which is everybody who
// has scored.
const nameIn = (d, full) => {
  const rows = (d.context && d.context.power && d.context.power.rows) || [];
  if (!rows.length) return last(full);
  const shared = rows.filter(r => last(r.name) === last(full)).length > 1;
  return shared ? full : last(full);
};

// A story has to earn its slot. Every slot below builds each angle it could
// run, with a weight, and prints the strongest. The reason it won is kept on
// the story as `why`, so `npm run peek:wire` can say why a paper looks the way
// it does rather than leaving the decision buried in a ternary.
const best = list => list.filter(Boolean).sort((a, b) => b.w - a.w)[0] || null;

const GENERIC = {
  win: ["{t} take the round", "{t} get the job done"],
  loss: ["{t} come up short", "{t} lose the round"],
};

// The top ten of the week, and the reader wherever they landed. Sliced at ten
// alone, a reader who scored 26 in a week that ran to 54 was missing from their
// own story.
function fieldRows(ladder) {
  const short = shortNames(ladder.map(r => r.name));
  const row = r => ({ label: short[r.name] || last(r.name), v: r.pts, me: r.me, photo: r.photo });
  const top = ladder.slice(0, 10);
  const me = ladder.find(r => r.me);
  if (!me || top.some(r => r.me)) return top.map(row);
  const near = ladder.filter(r => Math.abs(r.place - me.place) <= 1);
  return [...top.map(row), { spacer: true, label: "", v: 0 }, ...near.map(row)];
}

/* ------------------------------------------------------ 1. your matchup */

// Always the lead. The only question is what the story out of the matchup is,
// and the answer is whatever decided the matchup: the line, one driver, one of
// the two of you, or a team that had no business winning. weekly.js already
// works that out in `cause`; the upset is the one angle that can outrank it.
function slotLead(d, key) {
  const c = d.card1, c3 = d.card3, ctx = d.context, wk = ctx.week;
  const won = c.outcome === "won", drew = c.outcome === "drew";
  const mag = Math.abs(c.margin);
  const mine = shortOf(c.myTeam.name), theirs = shortOf(c.oppTeam.name);
  const me = nameIn(d, d.player.name);
  const bbSwing = c3.margin - c3.marginNoBB;
  const upset = wk.upset && wk.upset.mine ? wk.upset : null;
  const iWon = upset && upset.winner.id === c.myTeam.id;
  const iLost = upset && upset.loser.id === c.myTeam.id;

  const pun = drew ? null
    : teamLine(c.myTeam, won ? "win" : "loss", key, c.margin)
      || oneOf(GENERIC[won ? "win" : "loss"], key + c.myTeam.name).replace("{t}", mine);

  const angle = best([
    c.cause.kind === "boxbox" && {
      w: 92, id: "line",
      why: "the line decided your matchup",
      para: `BOX BOX is the whole story. Take the line out and the round finishes ` +
        `${c3.marginNoBB > 0 ? "your way" : c3.marginNoBB < 0 ? "the other way" : "level"}, ` +
        `${signed(c3.marginNoBB)} instead of ${signed(c3.margin)}. Six points of swing sat on one pit stop.`,
      frame: { type: "stat", big: signed(bbSwing), cap: "BOX BOX",
        sub: `${signed(c3.marginNoBB)} without the line, ${signed(c3.margin)} with it` },
    },
    c.cause.kind === "driver" && {
      w: 84, id: "driver",
      why: `${last(c.cause.driver)} was worth ${c.cause.gap} more to one side`,
      para: `One driver did most of the separating. ${c.cause.driver} was worth ` +
        `${plural(c.cause.gap, "point")} more to ${c.cause.yours ? mine : theirs} than to ` +
        `${c.cause.yours ? theirs : mine}, out of a ${attrib(mag, "point")} ${won ? "win" : "defeat"}.`,
      frame: (c3.gaps || []).length ? { type: "bars", title: "WHAT SEPARATED THE TWO TEAMS",
        signedBars: true, rows: c3.gaps.map(g => ({ label: last(g.driver), v: g.gap,
          good: g.gap > 0, photo: shotOf(g.driver) })), cap: `Margin ${signed(c3.margin)}` } : null,
    },
    (iWon || iLost) && {
      w: 78, id: "upset",
      why: iWon ? `you beat a team ${upset.drop} places above you`
        : `you lost to a team ${upset.drop} places below you`,
      para: iWon
        ? `On the table going in, this was not close. ${theirs} sat ${ord(upset.loserPlace)} and ` +
          `${mine} sat ${ord(upset.winnerPlace)}, ${plural(upset.drop, "place")} apart, and the ` +
          `${plural(upset.drop, "place")} counted for nothing.`
        : `${theirs} came into the round ${ord(upset.winnerPlace)}, ${plural(upset.drop, "place")} ` +
          `below ${mine}, and left with the points.`,
      frame: null,
    },
    c.cause.kind === "mate" && c.mate && {
      w: 70, id: "mate",
      why: `${first(c.mate.name)} outscored you by ${c.mate.ind - c.ind}`,
      para: `${first(c.mate.name)} carried the team. ${c.mate.ind} points against your ${c.ind}, ` +
        `and ${ord(c.mate.place)} of the ${c.field} who scored.`,
      frame: null,
    },
    c.cause.kind === "you" && {
      w: 70, id: "you",
      why: `you outscored your teammate by ${c.mate ? c.ind - c.mate.ind : c.ind}`,
      para: `You carried the team. ${c.ind} points, ${ord(c.place)} of ${c.field}` +
        (c.mate ? `, against ${first(c.mate.name)}'s ${c.mate.ind}.` : "."),
      frame: null,
    },
    {
      w: 10, id: "spread",
      why: "no single thing decided the round",
      para: `No single driver settled the round. The gaps were small and they came from ` +
        `everywhere, which is what a ${attrib(mag, "point")} ${won ? "win" : drew ? "draw" : "defeat"} usually looks like.`,
      frame: null,
    },
  ]);

  const headline = drew
    ? oneOf([`${mine} and ${theirs} cannot be separated`, `${mine} and ${theirs} split the round`], key)
    : pun;

  const body = [
    `${mine} ${won ? "beat" : drew ? "drew with" : "lost to"} ${theirs} ` +
    `${c.myTotal} to ${c.oppTotal} in round ${d.round}, at ${theRace(d.raceName)}.` +
    (drew ? " Nobody moves." : ` The margin was ${plural(mag, "point")}.`),
    angle.para,
    `Against the rest of the week, ${c.myTotal} beat ${ctx.allPlay.beat} of the other ` +
    `${ctx.allPlay.of} teams and lost to ${ctx.allPlay.lost}, the ${ord(ctx.allPlay.rank)} ` +
    `best number of the round.` +
    (ctx.luck === "lucky" ? ` Most teams would have lost with the number you won with.`
      : ctx.luck === "unlucky" ? ` Most teams would have won with the number you lost with.` : ""),
  ];
  if (ctx.teamRun.wins >= 2) body.push(`That is ${plural(ctx.teamRun.wins, "win")} running.`);
  else if (ctx.teamRun.losses >= 2) body.push(`That is ${plural(ctx.teamRun.losses, "defeat")} running.`);

  const result = { type: "duel", left: { ...c.myTeam, score: c.myTotal, me: true },
    right: { ...c.oppTeam, score: c.oppTotal },
    // The Vegas colour rule: our side goes green when won and grey when lost,
    // and theirs lights up only if they beat us.
    result: c.outcome,
    cap: won ? "WON" : drew ? "DREW" : "LOST", sub: `${signed(c.margin)} on the round` };
  const keyPoints = { type: "points", title: "KEY POINTS", rows: [
    `${mine} ${won ? "beat" : drew ? "drew with" : "lost to"} ${theirs}, ${c.myTotal} to ${c.oppTotal}`,
    `You scored ${c.ind}, ${ord(c.place)} of the ${c.field} who scored`,
    c.mate ? `${c.mate.name} scored ${c.mate.ind}, ${ord(c.mate.place)}` : null,
    c.cause.kind === "boxbox" ? `BOX BOX swung ${plural(Math.abs(bbSwing), "point")} and settled it`
      : c.cause.kind === "driver" ? `${c.cause.driver} was worth ${plural(c.cause.gap, "point")} more to one side`
      : `No single driver settled the round`,
    `${c.myTotal} would have beaten ${ctx.allPlay.beat} of the other ${ctx.allPlay.of} teams`,
  ].filter(Boolean) };

  return {
    id: "matchup", kicker: "YOUR MATCHUP", lead: true, why: angle.why, angle: angle.id,
    // ESPN's shape: the winner card, then Key points, then the report.
    pageSpec: [
      { frame: result, para: body[0] },
      { frame: keyPoints, para: null },
      { frame: angle.frame, para: angle.para },
    ],
    headline, byline: DESK.matchup,
    standfirst: `${mine} ${c.myTotal}, ${theirs} ${c.oppTotal}.` +
      (c.mate ? ` Your ${c.ind} and ${first(c.mate.name)}'s ${c.mate.ind} made up the half that counts.` : ""),
    art: { kind: "player", photo: d.player.photo, name: d.player.name,
           crest: c.myTeam, foe: c.oppTeam,
           alt: `${d.player.name}, ${c.ind} points for ${mine}` },
    body,
    frames: [
      result, keyPoints, angle.frame,
      { type: "bars", title: "EVERY TEAM THIS WEEK",
        rows: (ctx.leagueScores || []).map(t => ({
          label: t.code || shortOf(t.name), v: t.v, me: t.me, foe: t.opp, logo: t.logo })),
        cap: `${ord(ctx.allPlay.rank)} of ${ctx.teams}` },
    ].filter(Boolean),
  };
}

/* --------------------------------------------------- 2. around the league */

// The week's own story, whoever is reading. Six things can be true about a
// round and the strongest one runs; a record beats an upset beats a tight week
// beats the line. The fallback is the closest matchup, which is always there.
function slotLeague(d, key) {
  const wk = d.context.week, ctx = d.context;
  const rec = wk.record, up = wk.upset, ls = wk.lineSplit;
  const tighter = wk.seasonAvgMargin != null && wk.avgMargin != null
    && wk.avgMargin < wk.seasonAvgMargin * 0.7;

  const cand = best([
    rec && {
      w: 100, id: "record", why: `${rec.kind === "high" ? "highest" : "lowest"} score of the season`,
      make: () => ({
        headline: rec.kind === "high"
          ? oneOf([`${nameIn(d, rec.row.name)} posts the highest score of the season`,
                   `Nobody has scored like ${nameIn(d, rec.row.name)} did`], key)
          : oneOf([`${nameIn(d, rec.row.name)} sets a low nobody wanted`,
                   `A season low for ${nameIn(d, rec.row.name)}`], key),
        standfirst: `${rec.row.pts} points, past ${rec.prev.name}'s ${rec.prev.pts} in round ${rec.prev.round}.`,
        art: { kind: "player", photo: rec.row.photo, name: rec.row.name,
               alt: `${rec.row.name}, ${rec.row.pts} points` },
        body: [
          `${rec.row.name} scored ${rec.row.pts} in round ${d.round}, the ` +
          `${rec.kind === "high" ? "highest" : "lowest"} number anybody has put up in ` +
          `${plural(wk.rounds, "round")} of this season.`,
          `The mark stood at ${rec.prev.pts}, set by ${rec.prev.name} in round ${rec.prev.round}.`,
          `${rec.row.team ? `${rec.row.team} ` : ""}took ${rec.kind === "high" ? "the week" : "the hit"} with him.`,
        ],
        frames: [
          { type: "stat", big: String(rec.row.pts), cap: rec.kind === "high" ? "SEASON HIGH" : "SEASON LOW",
            sub: `${rec.prev.name} held it at ${rec.prev.pts}` },
          { type: "bars", title: "THE WEEK, TOP TO BOTTOM", rows: fieldRows(d.card2.ladder || []) },
        ],
      }),
    },
    up && up.drop >= 3 && {
      w: 62 + up.drop * 3, id: "upset", why: `${up.drop} places of upset`,
      make: () => ({
        headline: teamLine(up.winner, "win", key, up.score - up.against,
          up.winner.id === d.card1.myTeam.id)
          || `${shortOf(up.winner.name)} take down the ${ord(up.loserPlace)}`,
        standfirst: `${shortOf(up.winner.name)} ${up.score}, ${shortOf(up.loser.name)} ${up.against}. ` +
          `${plural(up.drop, "place")} apart going in.`,
        art: { kind: "duel", left: up.winner, right: up.loser,
               alt: `${shortOf(up.winner.name)} beat ${shortOf(up.loser.name)}` },
        body: [
          `${up.winner.name} came into round ${d.round} ${ord(up.winnerPlace)} in the division and ` +
          `left having beaten the team ${ord(up.loserPlace)}, ${up.score} to ${up.against}.`,
          `${plural(up.drop, "place")} of table separated them, which counted for nothing at all.`,
        ],
        frames: [
          { type: "duel", left: { ...up.winner, score: up.score, me: up.winner.id === d.card1.myTeam.id },
            right: { ...up.loser, score: up.against, me: up.loser.id === d.card1.myTeam.id },
            cap: "THE UPSET", sub: `${ord(up.winnerPlace)} beat ${ord(up.loserPlace)}` },
        ],
      }),
    },
    tighter && {
      w: 72 + wk.close * 2, id: "tight", why: `${wk.close} of ${wk.fixtures} inside three points`,
      make: () => ({
        headline: oneOf([`Nobody got away this week`, `${spell(wk.close)} matchups inside three points`], key),
        standfirst: `The round averaged ${wk.avgMargin} points of margin, against ${wk.seasonAvgMargin} for the season.`,
        art: { kind: "duel", left: wk.tightest.home, right: wk.tightest.away,
               alt: `${shortOf(wk.tightest.home.name)} and ${shortOf(wk.tightest.away.name)}, ${wk.tightest.margin} apart` },
        body: [
          `${wk.close} of the ${wk.fixtures} matchups finished inside three points. The average margin ` +
          `was ${wk.avgMargin}, and the season runs at ${wk.seasonAvgMargin}.`,
          `The closest was ${shortOf(wk.tightest.home.name)} and ${shortOf(wk.tightest.away.name)}, ` +
          `${wk.tightest.homeTotal} to ${wk.tightest.awayTotal}.` +
          (wk.draws ? ` ${plural(wk.draws, "matchup")} finished level.` : ""),
        ],
        frames: [
          { type: "stat", big: String(wk.avgMargin), cap: "AVERAGE MARGIN",
            sub: `The season runs at ${wk.seasonAvgMargin}` },
          { type: "duel", left: { ...wk.tightest.home, score: wk.tightest.homeTotal },
            right: { ...wk.tightest.away, score: wk.tightest.awayTotal },
            cap: "CLOSEST MATCHUP", sub: `${plural(wk.tightest.margin, "point")} in it` },
        ],
      }),
    },
    ls && ls.knife >= 2 && {
      w: 60 + ls.knife * 5, id: "line", why: `${ls.knife} lines within a tenth of the stop`,
      make: () => ({
        headline: oneOf([`The stop at ${secs(ls.stop)} cut the league in half`,
                         `${spell(ls.over)} lines above, ${spell(ls.under)} below`], key),
        standfirst: `${plural(ls.knife, "matchup")} had a line within a tenth of ${secs(ls.stop)}.`,
        art: { kind: "graphic", label: secs(ls.stop), alt: `The stop, ${secs(ls.stop)}` },
        body: [
          `The stop came in at ${secs(ls.stop)}. The twelve lines ran from ${secs(ls.lo)} to ` +
          `${secs(ls.hi)}, and the stop landed with ${ls.over} of them below it and ${ls.under} above.`,
          `${plural(ls.knife, "matchup")} sat within a tenth of the stop either way, which is closer ` +
          `than anybody guesses on purpose. Six points of BOX BOX turned on that tenth.`,
        ],
        frames: [
          { type: "stat", big: secs(ls.stop), cap: "THE STOP",
            sub: `${ls.over} lines below, ${ls.under} above` },
          { type: "needle", four: d.card4.leagueFour ? d.card4.leagueFour.slice(0, 8) : [],
            line: null, pit: ls.stop, seat: d.card4.seat,
            cap: `Lines ran ${secs(ls.lo)} to ${secs(ls.hi)}` },
        ],
      }),
    },
    wk.widest && wk.widest.margin >= 30 && {
      w: 50 + Math.min(20, wk.widest.margin - 30), id: "blowout",
      why: `${wk.widest.margin} points in one matchup`,
      make: () => {
        const w = wk.widest.homeTotal > wk.widest.awayTotal ? wk.widest.home : wk.widest.away;
        const l = w.id === wk.widest.home.id ? wk.widest.away : wk.widest.home;
        const ws = Math.max(wk.widest.homeTotal, wk.widest.awayTotal);
        const lsc = Math.min(wk.widest.homeTotal, wk.widest.awayTotal);
        return {
          headline: teamLine(w, "win", key, wk.widest.margin, w.id === d.card1.myTeam.id)
            || `${shortOf(w.name)} run away with it`,
          standfirst: `${shortOf(w.name)} ${ws}, ${shortOf(l.name)} ${lsc}. The widest of the round.`,
          art: { kind: "duel", left: w, right: l, alt: `${shortOf(w.name)} beat ${shortOf(l.name)} by ${wk.widest.margin}` },
          body: [
            `${w.name} put ${ws} on ${l.name}, who managed ${lsc}. ` +
            `${plural(wk.widest.margin, "point")} is the widest margin of round ${d.round}.`,
            `The round averaged ${wk.avgMargin} points of margin, so this one was on its own.`,
          ],
          frames: [
            { type: "duel", left: { ...w, score: ws }, right: { ...l, score: lsc },
              cap: "WIDEST MATCHUP", sub: `${plural(wk.widest.margin, "point")} apart` },
          ],
        };
      },
    },
    {
      w: 10, id: "closest", why: "the closest matchup of the round",
      make: () => ({
        headline: `${plural(wk.tightest.margin, "point")} in it at ${shortOf(wk.tightest.home.name)}`,
        standfirst: `${shortOf(wk.tightest.home.name)} ${wk.tightest.homeTotal}, ` +
          `${shortOf(wk.tightest.away.name)} ${wk.tightest.awayTotal}.`,
        art: { kind: "duel", left: wk.tightest.home, right: wk.tightest.away, alt: "The closest matchup" },
        body: [
          `The closest matchup of round ${d.round} was ${wk.tightest.home.name} and ` +
          `${wk.tightest.away.name}, ${plural(wk.tightest.margin, "point")} apart.`,
          `The round averaged ${wk.avgMargin} points of margin.`,
        ],
        frames: [
          { type: "duel", left: { ...wk.tightest.home, score: wk.tightest.homeTotal },
            right: { ...wk.tightest.away, score: wk.tightest.awayTotal },
            cap: "CLOSEST MATCHUP", sub: `${plural(wk.tightest.margin, "point")} in it` },
        ],
      }),
    },
  ]);

  return { id: "league", kicker: "AROUND THE LEAGUE", why: cand.why, angle: cand.id,
           byline: DESK.league, ...cand.make() };
}

/* ------------------------------------------------------------ 3. the pit */

// Four stories, one for each corner of the same two questions: did the team win
// the line, and did you score on the Needle.
function slotPit(d, key) {
  const c = d.card4, c5 = d.card5;
  const me = nameIn(d, d.player.name);
  const bbWon = c.bb === "won";
  const v = c.verdict;

  const H = {
    both: { w: 0, why: "you called the stop and the team took the line",
      lines: [`${me} threads the needle and takes the line`, `A clean sweep of the pit lane for ${me}`] },
    needle: { w: 0, why: "you called the stop, the team lost the line",
      lines: [`${me} calls the stop, and the team loses the line anyway`,
              `${me} threads the needle into a losing line`] },
    line: { w: 0, why: "you missed the stop, the team took the line",
      lines: [`${me} misses the stop and wins on the line`, `Close enough for ${me}`] },
    neither: { w: 0, why: "nothing came out of the pit lane",
      lines: [`No needle, no line for ${me}`, `${me} comes away from the pit lane empty`] },
  }[v];

  const body = [];
  if (c.pit == null) {
    body.push(`No pit stop was recorded for round ${d.round}, so the Needle scored nothing for anybody.`);
  } else {
    body.push(`The stop came in at ${secs(c.pit)}.` +
      (c.guess != null
        ? ` You said ${secs(c.guess)}, ${secs(c.off)} out, and the Needle was worth ${plural(c.needlePts, "point")}.`
        : ` You did not guess.`));
    body.push(`The line was ${secs(c.line)}, the average of all four guesses, and you sat in the ` +
      `${c.seat} seat. ` +
      (bbWon ? `The stop landed on your side, so BOX BOX was worth five to the team and cost theirs one.`
        : c.bb === "lost" ? `The stop landed the other way, so the other side took five and you gave up one.`
        : `Nothing separated the two sides on the line.`));
    body.push(v === "both"
      ? `Both halves of the pit lane, in one week. ${c.leagueScored} of the ${c.field} who scored got ` +
        `anything off the Needle at all.`
      : v === "needle"
      ? `The Needle is yours alone and the line belongs to all four of you, which is how a guess this ` +
        `good comes with nothing for the team. ${c.leagueScored} of ${c.field} scored on the Needle.`
      : v === "line"
      ? `Winning the line does not need a good guess, only a guess on the right side of the stop. ` +
        `${c.leagueScored} of ${c.field} scored on the Needle, and you were not one of them.`
      : `${c.leagueScored} of the ${c.field} who scored took something off the Needle. Not this week.`);
  }
  if (c5.state === "solo" && c5.need != null) {
    body.push(`You could have moved the line on your own. A guess of ${secs(c5.need)} ` +
      `${c5.wantLow ? "or lower" : "or higher"} flips BOX BOX, and the round with it.`);
  } else if (c5.state === "pair" && c5.pairNeed != null) {
    body.push(`No guess of yours alone would have moved the line. The pair of you had to sum to ` +
      `${secs(c5.pairNeed)}${c5.mateName ? `, and ${first(c5.mateName)} was half of that` : ""}.`);
  } else if (c5.state === "held" && c5.room != null) {
    body.push(`There was room to spare. Your guess could have drifted ${secs(c5.room)} before the line crossed.`);
  }

  return {
    id: "pit", kicker: "THE PIT LANE", why: H.why, angle: v,
    headline: oneOf(H.lines, key), byline: DESK.needle,
    standfirst: c.pit != null && c.guess != null
      ? `The stop was ${secs(c.pit)}. You said ${secs(c.guess)}. ` +
        `${c.needlePts ? plural(c.needlePts, "Needle point") : "No Needle points"}, and BOX BOX ` +
        `${bbWon ? "won" : c.bb === "lost" ? "lost" : "level"}.`
      : `Round ${d.round} on the pit wall.`,
    art: { kind: "graphic", label: secs(c.pit) || "NO STOP", alt: `The stop, ${secs(c.pit) || "not recorded"}` },
    body,
    frames: [
      { type: "stat", big: secs(c.pit) || "—", cap: "THE STOP",
        sub: c.guess != null ? `You said ${secs(c.guess)}` : "You did not guess" },
      { type: "needle", four: c.four, line: c.line, pit: c.pit, seat: c.seat,
        cap: `The line was ${secs(c.line) || "—"}, and you took the ${c.seat}` },
      { type: "stat", big: signed(c.needlePts), cap: "NEEDLE POINTS",
        sub: `${c.leagueScored} of ${c.field} scored on the Needle` },
    ],
  };
}

/* ---------------------------------------------------- 4. your own points */

// Your score, where it ranked, and the driver you walked past. The week's top
// three and the season leader go in the same story, because a number means
// nothing without the two things it is being measured against.
function slotIndividual(d, key) {
  const c = d.card1, c2 = d.card2, c7 = d.card7, ctx = d.context;
  const me = nameIn(d, d.player.name);
  // A swap has to be worth telling somebody about. Andy Thompson's best
  // available change was one point onto a driver worth nothing.
  const SWAP_FLOOR = 5;
  const swap = ctx.bestSwap && ctx.bestSwap.gain >= SWAP_FLOOR ? ctx.bestSwap : null;
  const left = ctx.left;
  const sweep = d.card4.verdict === "both" && c.outcome === "won";

  const angle = best([
    sweep && { w: 95, id: "sweep", why: "the Needle, the line and the matchup, all three" },
    c.place === 1 && { w: 90, id: "top", why: "top scorer of the week" },
    c.contrast && c.outcome === "lost" && { w: 80, id: "wasted", why: "a big score on a losing team" },
    c.contrast && c.outcome === "won" && { w: 70, id: "carried", why: "a small score on a winning team" },
    left > 0 && swap && { w: 55 + Math.min(30, swap.gain), id: "left", why: `${left} points left in the pool` },
    c.place <= 3 && { w: 60, id: "podium", why: "a podium in the week" },
    { w: 10, id: "plain", why: "where your score landed" },
  ]);

  const headline = angle.id === "sweep"
    ? oneOf([`Everything lands for ${me}`, `${me} does not put a foot wrong`], key)
    : angle.id === "top"
    ? oneOf([`${me} leads the field home`, `Nobody outscored ${me}`], key)
    : angle.id === "wasted"
    ? `${me} scores ${c.ind} and loses anyway`
    : angle.id === "carried"
    ? oneOf([`${plural(c.ind, "point")}, and ${me} wins anyway`, `${me} scrapes through on ${plural(c.ind, "point")}`], key)
    : angle.id === "left"
    ? (driverLine(swap.in.driver, "good", key) || `${last(swap.in.driver)} was there for the taking`)
    : angle.id === "podium"
    ? oneOf([`${me} makes the podium`, `${me} finishes the week on the box`], key)
    : c.place > c.field - 3
    ? oneOf([`${me} props up the field`, `${me} finishes the week in the barriers`], key)
    : oneOf([`${me} settles for ${ord(c.place)}`, `A quiet ${ord(c.place)} for ${me}`], key);

  const body = [
    `${c.ind} points, ${ord(c.place)} of the ${c.field} who scored. The week ran from ${c.high} ` +
    `down to ${c.low}, and the middle of the field was ${c.mid}.`,
  ];
  if (angle.id === "sweep") {
    body.push(`The Needle, the line and the matchup, all three in one round. ` +
      `${d.card4.leagueScored} of ${c.field} took anything off the Needle at all.`);
  }
  if (swap) {
    body.push(`The one you walked past was ${swap.in.driver}. He sat in the same ` +
      `${swap.pool === "top" ? "top" : "midfield"} pool at ${swap.in.pts}, and ${swap.out.driver} ` +
      `was worth ${swap.out.pts} to you. That single change is ${plural(swap.gain, "point")}.`);
  }
  if (left > 0) {
    body.push(`The best hand the pools allowed was worth ${ctx.perfect.total}. You took ` +
      `${ctx.myHaul}, so ${plural(left, "point")} stayed in the pool.`);
  }
  const top3 = c2.top3 || [];
  if (top3.length) {
    body.push(`${top3[0].name} took the week with ${top3[0].pts}` +
      (top3[1] ? `, from ${top3[1].name} on ${top3[1].pts}` : "") +
      (top3[2] ? ` and ${top3[2].name} on ${top3[2].pts}` : "") + `.`);
  }
  if (c7.individualLeader && c7.individual) {
    body.push(`${c7.individualLeader.name} still leads the season on ${c7.individualLeader.pts}. ` +
      `You are ${ord(c7.individual.place)} of ${c7.individual.of}, on ${round1(c7.individual.avg)} a race.`);
  }

  return {
    id: "individual", kicker: "YOUR POINTS", why: angle.why, angle: angle.id,
    headline, byline: DESK.field,
    standfirst: `${plural(c.ind, "point")}, ${ord(c.place)} of ${c.field}.` +
      (swap ? ` ${swap.in.driver} was sitting in the same pool at ${swap.in.pts}.` : ""),
    art: { kind: "player", photo: d.player.photo, name: d.player.name,
           alt: `${d.player.name}, ${ord(c.place)} of ${c.field} this week` },
    body,
    frames: [
      { type: "stat", big: String(c.ind), cap: "YOUR POINTS", sub: `${ord(c.place)} of ${c.field}` },
      swap ? { type: "swap", out: swap.out, in: swap.in, gain: swap.gain, pool: swap.pool,
        outPhoto: shotOf(swap.out.driver), inPhoto: shotOf(swap.in.driver),
        cap: `${signed(swap.gain)} from one change` } : null,
      { type: "bars", title: "THE WEEK, TOP TO BOTTOM", rows: fieldRows(c2.ladder || []),
        cap: `Middle of the field: ${c.mid}` },
      { type: "list", title: "THE PODIUM",
        rows: top3.map((r, i) => ({ label: r.name, right: String(r.pts), sub: r.team || "",
          me: r.id === d.player.id, rank: i + 1, photo: r.photo })),
        cap: c7.individualLeader ? `Season: ${c7.individualLeader.name}, ${c7.individualLeader.pts}` : null },
    ].filter(Boolean),
  };
}

/* ---------------------------------------------------------- 5. power index */

// Not the standings. The standings answer who has scored most all season; the
// index answers who you would least like to draw next week.
//
// Andrew, 2026-08-29: no need for all the numbers. So the board carries a
// place, the move since last week and where that player sits in the standings,
// and the ratings behind the order stay off the page.
function slotPower(d, key) {
  const p = d.context.power;
  const me = nameIn(d, d.player.name);
  const mine = p.me, climber = p.climber;

  const angle = best([
    mine && mine.place === 1 && { w: 100, id: "first", why: "you are top of the index" },
    mine && mine.move != null && mine.move >= 5 && { w: 85, id: "rising",
      why: `up ${mine.move} on the index since last week` },
    mine && mine.move != null && mine.move <= -5 && { w: 80, id: "falling",
      why: `down ${Math.abs(mine.move)} on the index since last week` },
    mine && mine.standing && mine.place && Math.abs(mine.standing - mine.place) >= 6 && {
      w: 70, id: "split",
      why: `${ord(mine.place)} on the index against ${ord(mine.standing)} in the standings` },
    climber && { w: 60, id: "climber", why: `${climber.name} is the week's biggest climber` },
    { w: 10, id: "board", why: "the state of the index" },
  ]);

  const headline = angle.id === "first"
    ? oneOf([`${me} is the one to beat`, `Nobody is in better form than ${me}`], key)
    : angle.id === "rising"
    ? oneOf([`${me} is climbing`, `The index has caught up with ${me}`], key)
    : angle.id === "falling"
    ? oneOf([`${me} is going backwards`, `The index has turned on ${me}`], key)
    : angle.id === "split"
    ? (mine.place < mine.standing
        ? `${me} is better than the table says`
        : `${me} is coasting on the season`)
    : climber
    ? `${nameIn(d, climber.name)} is the week's biggest climber`
    : `The power index, round ${d.round}`;

  const body = [
    `The index is mostly the season and a little of lately: three quarters of it is a player's ` +
    `average across the year, and the rest is the last five rounds and the last two.`,
  ];
  if (mine && mine.place) {
    body.push(`You are ${ord(mine.place)} of ${p.rows.length}` +
      (mine.was ? `, from ${ord(mine.was)} a week ago` : "") +
      (mine.standing ? `, and ${ord(mine.standing)} in the standings.` : "."));
  } else if (climber) {
    body.push(`${climber.name} is up ${places(climber.move)} on the week, to ${ord(climber.place)}.`);
  }

  const board = { type: "list", title: "THE TOP TEN",
    rows: p.top.map(r => ({
      label: r.name, rank: r.place, me: r.me, photo: r.photo, move: r.move,
      right: r.standing ? ord(r.standing) : "—" })),
    cap: "Standings on the right" };

  return {
    id: "power", kicker: "POWER INDEX", why: angle.why, angle: angle.id,
    // The board gets the page to itself; the words follow on the next one.
    pageSpec: [{ frame: board, para: null }, { frame: null, para: body }],
    headline, byline: DESK.power,
    standfirst: mine && mine.place
      ? `${ord(mine.place)} on the index, ${mine.standing ? `${ord(mine.standing)} in the standings` : "unplaced"}.`
      : `The top ten, on form rather than on history.`,
    art: { kind: "player",
           photo: (angle.id === "climber" && climber ? climber.photo : (mine && mine.photo) || d.player.photo),
           name: angle.id === "climber" && climber ? climber.name : d.player.name,
           alt: angle.id === "climber" && climber
             ? `${climber.name}, ${ord(climber.place)} on the index`
             : mine && mine.place ? `${d.player.name}, ${ord(mine.place)} on the index`
             : "The power index" },
    body,
    frames: [board],
  };
}

/* ------------------------------------------------------------------ 6. ad */

// The paper carries advertising. This one is the league's own: the theme music
// that shipped with the deck on 2026-08-28 is off an album, and the album is
// out. `public/velvet-thunder.mp3` is already in the build, so the ad plays.
function slotAd() {
  return {
    id: "ad", kind: "ad", kicker: "ADVERTISEMENT", why: "the album is out",
    headline: "The Hardest Compound",
    standfirst: "The new album by Andrei. Featuring Velvet Thunder, the Formula 5 theme.",
    byline: null,
    art: { kind: "album", title: "The Hardest Compound", artist: "Andrei", alt: "The Hardest Compound" },
    body: [],
    frames: [
      { type: "album", title: "The Hardest Compound", artist: "Andrei",
        track: "Velvet Thunder", src: "/velvet-thunder.mp3",
        cap: "OUT NOW" },
    ],
  };
}

/* ------------------------------------------------------------ 7. notebook */

// The flex slot. Whatever else was true about the week and has not been printed
// yet, strongest first. Everything here is a real finding rather than a filler
// column, so a week with nothing left over runs the driver who moved the round.
function slotNotebook(d, key, used) {
  const c6 = d.card6, c3 = d.card3, ctx = d.context, c = d.card1;
  const ws = ctx.weekVsSelf, run = ctx.teamRun;
  const gap = c3.gaps && c3.gaps[0];
  const hero = c6.hero, trap = c6.trap;

  const cand = best([
    ws && ws.of >= 4 && ws.rank === 1 && {
      w: 90, id: "bestWeek", why: "your best week of the season",
      make: () => ({
        headline: `${nameIn(d, d.player.name)} has not scored like this all season`,
        standfirst: `${plural(c.ind, "point")} is your best of ${plural(ws.of, "round")}.`,
        art: { kind: "player", photo: d.player.photo, name: d.player.name,
               alt: `${d.player.name}, a season best` },
        body: [
          `${c.ind} points is the most you have scored in ${plural(ws.of, "round")} this season. ` +
          `The next best was ${ws.best.round === d.round ? plural(ws.worst.pts, "point") : `${ws.best.pts} in round ${ws.best.round}`}.`,
          `Your worst was ${ws.worst.pts}, in round ${ws.worst.round}.`,
        ],
        frames: [{ type: "stat", big: String(c.ind), cap: "SEASON BEST",
          sub: `Your worst is ${ws.worst.pts}, in round ${ws.worst.round}` }],
      }),
    },
    ws && ws.of >= 4 && ws.rank === ws.of && {
      w: 85, id: "worstWeek", why: "your worst week of the season",
      make: () => ({
        headline: `${nameIn(d, d.player.name)} has not scored this low all season`,
        standfirst: `${plural(c.ind, "point")} is your worst of ${plural(ws.of, "round")}.`,
        art: { kind: "player", photo: d.player.photo, name: d.player.name,
               alt: `${d.player.name}, a season low` },
        body: [
          `${c.ind} points is the least you have scored in ${plural(ws.of, "round")}. Your best is ` +
          `${ws.best.pts}, in round ${ws.best.round}.`,
          `The week's middle was ${c.mid}, so this was not a week where nobody scored.`,
        ],
        frames: [{ type: "stat", big: String(c.ind), cap: "SEASON LOW",
          sub: `Your best is ${ws.best.pts}, in round ${ws.best.round}` }],
      }),
    },
    ctx.left === 0 && {
      w: 88, id: "perfect", why: "you took the perfect hand",
      make: () => ({
        headline: `${nameIn(d, d.player.name)} takes the perfect hand`,
        standfirst: `${ctx.myHaul} out of ${ctx.perfect.total}. Nothing left in either pool.`,
        art: { kind: "drivers", drivers: (ctx.perfect.picks || []).map(p => ({ ...p, photo: shotOf(p.driver) })),
               alt: "The perfect hand" },
        body: [
          `The best hand the two pools allowed was worth ${ctx.perfect.total}, and you took all of it.`,
          `${ctx.bestHaul ? `${ctx.bestHaul.name} pulled ${ctx.bestHaul.haul} out of the same ten drivers.` : ""}`,
        ].filter(Boolean),
        frames: [
          { type: "faces", title: "THE POOLS, AS THEY FINISHED",
            rows: (ctx.poolBoard || []).map(r => ({ label: r.driver, right: String(r.pts),
              sub: r.pos ? `P${r.pos}` : "DNF", me: r.mine, best: r.best, photo: shotOf(r.driver) })) },
        ],
      }),
    },
    run && run.wins >= 3 && {
      w: 75, id: "streak", why: `${run.wins} wins running`,
      make: () => ({
        headline: teamLine(c.myTeam, "win", key + "streak", c.margin)
          || `${shortOf(c.myTeam.name)} keep going`,
        standfirst: `${run.last5.w} won, ${run.last5.l} lost and ${run.last5.d} drawn over five rounds.`,
        art: { kind: "duel", left: c.myTeam, right: c.oppTeam, alt: `${shortOf(c.myTeam.name)} on a run` },
        body: [
          `${c.myTeam.name} have won ${plural(run.wins, "matchup")} in a row, and are unbeaten in ` +
          `${plural(run.unbeaten, "round")}.`,
          `Over the last five rounds: ${run.last5.w} won, ${run.last5.l} lost, ${run.last5.d} drawn.`,
        ],
        frames: [{ type: "stat", big: String(run.wins), cap: "WINS RUNNING",
          sub: `Unbeaten in ${plural(run.unbeaten, "round")}` }],
      }),
    },
    trap && trap.edge != null && trap.edge < -4 && {
      w: (trap.mine ? 72 : 34) + Math.min(15, Math.abs(trap.edge)), id: "trap",
      why: `${trap.driver} cost his pickers ${Math.abs(round1(trap.edge))} a head`,
      make: () => ({
        headline: driverLine(trap.driver, "bad", key) || `${last(trap.driver)} was the trap`,
        standfirst: `The ${plural(trap.picks, "player")} who took him averaged ${trap.pickerAvg}, ` +
          `against ${trap.otherAvg} for everybody else.`,
        art: { kind: "driver", driver: trap.driver, photo: shotOf(trap.driver), alt: trap.driver },
        body: [
          `${trap.driver} was the week's trap. ${plural(trap.picks, "player")} took him and averaged ` +
          `${trap.pickerAvg}; everybody else averaged ${trap.otherAvg}.`,
          `That is ${plural(Math.abs(round1(trap.edge)), "point")} of difference off one name` +
          (trap.mine ? `, and you were on the wrong side of the name.` : `.`),
        ],
        frames: [
          { type: "list", title: "PICKED HIM, OR DID NOT",
            rows: (c6.compared || []).slice(0, 6).map(r => ({ label: r.driver, right: signed(r.edge),
              sub: plural(r.picks, "pick"), me: r.mine })) },
        ],
      }),
    },
    ctx.luck && {
      w: 68, id: "luck",
      why: ctx.luck === "lucky" ? "you won on a number most teams lose with"
        : "you lost on a number most teams win with",
      make: () => ({
        headline: ctx.luck === "lucky"
          ? oneOf([`${shortOf(c.myTeam.name)} get away with one`,
                   `The draw was kind to ${shortOf(c.myTeam.name)}`], key)
          : oneOf([`${shortOf(c.myTeam.name)} deserved better`,
                   `A good week wasted on the wrong opponent`], key),
        standfirst: `${c.myTotal} beat ${ctx.allPlay.beat} of the other ${ctx.allPlay.of} teams ` +
          `this week, and you ${ctx.luck === "lucky" ? "won" : "lost"} anyway.`,
        art: { kind: "duel", left: c.myTeam, right: c.oppTeam,
               alt: `${shortOf(c.myTeam.name)} against ${shortOf(c.oppTeam.name)}` },
        body: [
          `Played against every other team in the league rather than the one you drew, ` +
          `${c.myTotal} beats ${ctx.allPlay.beat} and loses to ${ctx.allPlay.lost}. ` +
          `That is the ${ord(ctx.allPlay.rank)} best number of the round.`,
          ctx.luck === "lucky"
            ? `You drew one of the ${ctx.allPlay.lost === 0 ? "few" : plural(ctx.allPlay.lost, "team")} ` +
              `you could beat with it, and the two points count the same as anybody's.`
            : `${shortOf(c.oppTeam.name)} were ${ord(ctx.oppRank)} of ${ctx.teams} this week. ` +
              `Most weeks that number wins you the round.`,
        ],
        frames: [
          { type: "stat", big: `${ctx.allPlay.beat}-${ctx.allPlay.lost}`,
            cap: "AGAINST THE WHOLE LEAGUE", sub: `${ord(ctx.allPlay.rank)} of ${ctx.teams} this week` },
          { type: "bars", title: "EVERY TEAM THIS WEEK",
            rows: (ctx.leagueScores || []).map(t => ({ label: t.code || shortOf(t.name), v: t.v,
              me: t.me, foe: t.opp, logo: t.logo })) },
        ],
      }),
    },
    c.mate && Math.abs(c.mate.ind - c.ind) >= 8 && {
      w: 46, id: "mate",
      why: c.mate.ind > c.ind ? `${first(c.mate.name)} outscored you by ${c.mate.ind - c.ind}`
        : `you outscored ${first(c.mate.name)} by ${c.ind - c.mate.ind}`,
      make: () => ({
        headline: c.mate.ind > c.ind
          ? oneOf([`${first(c.mate.name)} is carrying ${shortOf(c.myTeam.name)}`,
                   `${nameIn(d, c.mate.name)} does the heavy lifting`], key)
          : oneOf([`${shortOf(c.myTeam.name)} are a one-player team this week`,
                   `${nameIn(d, d.player.name)} is carrying ${shortOf(c.myTeam.name)}`], key),
        standfirst: `${c.ind} and ${c.mate.ind}, split ${plural(Math.abs(c.mate.ind - c.ind), "point")} apart.`,
        art: { kind: "player", photo: c.mate.photo || d.player.photo, name: c.mate.name,
               alt: `${c.mate.name}, ${c.mate.ind} points` },
        body: [
          `${c.mate.name} scored ${c.mate.ind} and finished ${ord(c.mate.place)} of the ${c.field} ` +
          `who scored. You scored ${c.ind}, ${ord(c.place)}.`,
          `A matchup counts both halves, so ${plural(Math.abs(c.mate.ind - c.ind), "point")} of ` +
          `difference inside a team is ${plural(Math.abs(c.mate.ind - c.ind), "point")} the other ` +
          `side has to find somewhere else.`,
        ],
        frames: [
          { type: "list", title: "THE TWO OF YOU",
            rows: [{ label: d.player.name, right: String(c.ind), rank: c.place, me: true, photo: d.player.photo },
                   { label: c.mate.name, right: String(c.mate.ind), rank: c.mate.place, photo: c.mate.photo }] },
        ],
      }),
    },
    (gap || hero) && {
      w: 40, id: "driver", why: "the driver who moved the round",
      make: () => {
        const subject = gap ? gap.driver : hero.driver;
        const held = gap ? gap.gap > 0 : !!hero.mine;
        return {
          headline: (driverLine(subject, held ? "good" : "bad", key)
            || `${last(subject)} moved the round`),
          standfirst: gap
            ? `${subject} was worth ${plural(Math.abs(gap.gap), "point")} of separation in your matchup.`
            : `${hero.driver} moved ${plural(hero.swing, "point")} across the twelve matchups.`,
          art: { kind: "driver", driver: subject, photo: shotOf(subject), alt: subject },
          body: [
            gap ? `${gap.driver} was worth ${gap.mine} to your side and ${gap.theirs} to the other.`
              : `Nobody in your matchup held a driver the other side did not, so nothing separated the two of you on drivers at all.`,
            hero ? `Across all twelve matchups, ${hero.driver} moved more points than anybody: ` +
              `${plural(hero.picks, "player")} held him, ${hero.pts} apiece, ${plural(hero.swing, "point")} of swing.` : null,
            c6.mostDecisive ? `${c6.mostDecisive.driver} turned more results. Take him out and ` +
              `${plural(c6.mostDecisive.decided, "matchup")} finish the other way.` : null,
          ].filter(Boolean),
          frames: [
            (c3.gaps || []).length ? { type: "bars", title: "WHAT SEPARATED THE TWO TEAMS",
              signedBars: true, rows: c3.gaps.map(g => ({ label: last(g.driver), v: g.gap,
                good: g.gap > 0, photo: shotOf(g.driver) })), cap: `Margin ${signed(c3.margin)}` } : null,
            { type: "faces", title: "THE POOLS, AS THEY FINISHED",
              rows: (ctx.poolBoard || []).map(r => ({ label: r.driver, right: String(r.pts),
                sub: r.pos ? `P${r.pos}` : "DNF", me: r.mine, best: r.best, photo: shotOf(r.driver) })) },
          ].filter(Boolean),
        };
      },
    },
  ].filter(x => !x || !used.has(x.id)));

  return { id: "notebook", kicker: "THE NOTEBOOK", why: cand.why, angle: cand.id,
           byline: DESK.notebook, ...cand.make() };
}

/* ---------------------------------------------------------------- 8. flag */

function slotFlag(d) {
  const chosen = d.player.nation != null;
  return {
    id: "flag", kind: "action", kicker: "ONE MORE THING",
    why: chosen ? "your flag flies beside your name" : "you have never picked a flag",
    headline: chosen ? "Your flag" : "Pick your flag",
    standfirst: chosen
      ? "It flies over the podium and beside your name."
      : "It will fly over the podium and beside your name.",
    byline: null,
    art: { kind: "flag", nation: d.player.nation, name: d.player.name, alt: "Your flag" },
    body: [],
    frames: [{ type: "flagpick", nation: d.player.nation, name: d.player.name, id: d.player.id }],
  };
}

/* --------------------------------------------------------------- 9. outro */

function slotOutro(d, key) {
  const c = d.card8, r = c.race;
  const deadline = r && r.deadline
    ? new Date(r.deadline).toLocaleString("en-US", {
        weekday: "long", month: "long", day: "numeric",
        hour: "numeric", minute: "2-digit", timeZoneName: "short" })
    : null;
  return {
    id: "next", kind: "action", kicker: "NEXT",
    why: r ? `round ${r.round} is next` : "the calendar is done",
    headline: !r ? "That is the season"
      : c.poolReady
      ? oneOf([`Next stop, ${theRace(r.name)}`, `${theRace(r.name, true)} next, and the pools are open`], key)
      : oneOf([`Next stop, ${theRace(r.name)}`, `${theRace(r.name, true)} next, pools on Tuesday`], key),
    standfirst: r
      ? `Round ${r.round}${deadline ? `. Picks close ${deadline}.` : "."}`
      : `Round ${d.round} was the last one on the calendar.`,
    byline: null,
    art: { kind: "graphic", label: r ? `R${r.round}` : "END", alt: r ? r.name : "The season" },
    body: [],
    frames: [{ type: "cta", race: r, poolReady: c.poolReady, deadline,
      cap: r ? `ROUND ${r.round}` : "SEASON OVER" }],
  };
}

/* ---------------------------------------------------------------- the wire */

/**
 * @param {object} data the output of buildWeekly()
 * @returns {object|null} { round, raceName, player, stories: [...] }
 */
export function buildWire(data) {
  if (!data) return null;
  const key = `${data.player.name}|${data.round}`;

  const lead = slotLead(data, key);
  const league = slotLeague(data, key);
  const pit = slotPit(data, key);
  const individual = slotIndividual(data, key);
  const power = slotPower(data, key);
  // The notebook is the flex slot, so it is told what the paper has already
  // run. Without that, a round decided by one driver printed the same driver
  // twice, once as the lead and once as the column.
  const used = new Set([
    lead.angle === "driver" ? "driver" : null,
    individual.angle === "left" ? null : null,
  ].filter(Boolean));
  const notebook = slotNotebook(data, key, used);

  const TAGS = { matchup: "MATCHUP", league: "LEAGUE", pit: "PIT LANE", individual: "POINTS",
                 power: "INDEX", ad: "THE ALBUM", notebook: "NOTEBOOK", flag: "FLAG", next: "NEXT" };
  const stories = [lead, league, pit, individual, power, slotAd(),
                   notebook, slotFlag(data), slotOutro(data, key)]
    .map(s => ({ kind: "story", ...s, headline: cap(s.headline), tag: TAGS[s.id] || s.id.toUpperCase(),
                 read: (s.body || []).length ? readTime(s) : null }))
    .map(s => ({ ...s, card: cardOf(s) }));

  return {
    round: data.round, raceName: data.raceName, raceDate: data.raceDate,
    player: data.player, stories,
  };
}

export const STORY_COUNT = 9;

// One story, one card. Andrew, 2026-08-29: each story should be one card only.
//
// So a card is a headline, a standfirst, the single graphic that carries the
// story, and at most one paragraph. Everything a slot computed beyond that is
// still on the story and still printed by `npm run peek:wire`; it just does not
// get a screen of its own any more.
//
// Which graphic carries a story is a judgement, so it is written down here
// rather than defaulting to whichever frame happened to be built first.
const CARD_FRAME = {
  matchup: "duel",      // the winner card, ESPN's own opener
  pit: "needle",        // the four guesses against the stop
  individual: "bars",   // where the reader's score landed in the field
  power: "list",        // the top ten
};

function cardOf(s) {
  const frames = (s.frames || []).filter(Boolean);
  const want = CARD_FRAME[s.id];
  const frame = (want && frames.find(f => f.type === want)) || frames[0] || null;
  // A board of ten takes the card on its own. Anything else leads with the
  // paragraph that explains its own graphic.
  const long = frame && (frame.rows || []).length >= 8;
  const para = long ? null : ((s.body || [])[0] || null);
  return { frame, para };
}

