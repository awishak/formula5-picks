// When each race actually starts, and how to say that out loud.
//
// The times lived inside F1Calendar.jsx, which meant any other screen wanting
// to name a start time had to keep a second copy of the calendar. That is the
// shape of bug DRIVER_NAMES was: one module owns the fact, everyone else asks.
//
// Stored in UTC because that is what the FIA publishes. Everything the league
// reads is Pacific, so that is what comes back out.
export const RACE_UTC = {
  1:  "2026-03-08T04:00:00Z",
  2:  "2026-03-15T07:00:00Z",
  3:  "2026-03-29T05:00:00Z",
  4:  "2026-05-03T20:00:00Z",
  5:  "2026-05-24T20:00:00Z",
  6:  "2026-06-07T13:00:00Z",
  7:  "2026-06-14T13:00:00Z",
  8:  "2026-06-28T13:00:00Z",
  9:  "2026-07-05T14:00:00Z",
  10: "2026-07-19T13:00:00Z",
  11: "2026-07-26T13:00:00Z",
  12: "2026-08-23T13:00:00Z",
  13: "2026-09-06T13:00:00Z",
  14: "2026-09-13T13:00:00Z",
  15: "2026-09-26T11:00:00Z",  // Saturday
  16: "2026-10-04T07:00:00Z",
  17: "2026-10-11T12:00:00Z",
  18: "2026-10-25T20:00:00Z",
  19: "2026-11-01T19:00:00Z",
  20: "2026-11-08T17:00:00Z",
  21: "2026-11-22T04:00:00Z",  // Saturday night, technically Sunday UTC
  22: "2026-11-29T16:00:00Z",
  23: "2026-12-06T13:00:00Z",
};

const PT = "America/Los_Angeles";
const part = (d, opts) => d.toLocaleString("en-US", { timeZone: PT, ...opts });

// "Sunday August 23 at 6 am". The minutes only appear when there are any, so a
// race on the hour does not read as a train timetable.
export function raceTimePT(round) {
  const iso = RACE_UTC[round];
  if (!iso) return null;
  const d = new Date(iso);
  const day = part(d, { weekday: "long" });
  const month = part(d, { month: "long" });
  const date = part(d, { day: "numeric" });
  const hour = part(d, { hour: "numeric", hour12: true });   // "6 AM"
  const mins = part(d, { minute: "numeric" });
  const [h, ampm] = hour.split(" ");
  const time = mins === "0" ? `${h} ${ampm.toLowerCase()}` : `${h}:${mins.padStart(2, "0")} ${ampm.toLowerCase()}`;
  return `${day} ${month} ${date} at ${time}`;
}

// Which race the app is on.
//
// Not "the next one still taking picks". The deadline closing is what locks the
// picks, not what ends the week: between the deadline and the race there are
// two days where the locked screen is the whole point, and reading the deadline
// as the end of the round jumped the entire app to the next Grand Prix four
// hours after picks shut.
//
// Scoring does not end the week either. The result is the most read screen of
// the round and it only exists once the race is scored, so treating the score
// as the end sent everyone to a Grand Prix a fortnight out on the Sunday
// afternoon their own result landed.
//
// One rule, scored or not: a round is finished 48 hours after it started.
const GRACE_MS = 48 * 3600e3;

export const raceStartMs = (race) => {
  const iso = RACE_UTC[race.round];
  if (iso) return Date.parse(iso);
  return race.race_date ? Date.parse(race.race_date) : null;
};

// The Thursday a race week begins on, at midnight Pacific.
//
// Pacific rather than UTC because the league is: the rules say 5pm Pacific and
// midnight UTC Thursday is 5pm Pacific Wednesday, which is a day early to
// everybody reading it.
const THURSDAY = 4;
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// The UTC instant of midnight Pacific on whichever Pacific day `ms` falls on.
// Pacific is -7 or -8 and never anything else, so both are tried and the one
// that lands on hour zero is the right one. Round 21 is the reason this cannot
// assume PDT: it is in November.
function ptMidnight(ms) {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", {
    timeZone: PT, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(ms)).split("-").map(Number);
  for (const off of [7, 8]) {
    const t = Date.UTC(y, m - 1, d, off);
    const h = new Intl.DateTimeFormat("en-US", {
      timeZone: PT, hour: "numeric", hourCycle: "h23",
    }).format(new Date(t));
    if (Number(h) === 0) return t;
  }
  return Date.UTC(y, m - 1, d, 8);
}

// Counted back from the race in Pacific days, so a race that runs Sunday
// morning UTC but Saturday night Pacific gets the Thursday of the weekend it
// is actually part of. Round 21 is exactly that race.
export function raceWeekStartMs(race) {
  const start = raceStartMs(race);
  if (start == null) return null;
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: PT, weekday: "short" })
    .format(new Date(start));
  const idx = WD.indexOf(wd);
  if (idx < 0) return null;
  const back = idx >= THURSDAY ? idx - THURSDAY : idx + (7 - THURSDAY);
  return ptMidnight(start - back * 86400e3);
}

/**
 * Which round the schedule page opens on.
 *
 * Not currentRace. The schedule is where people come to read what happened, and
 * currentRace hands over 48 hours after lights out, which is the Tuesday: it
 * takes the result off the screen while it is still the thing being talked
 * about, and with a fortnight between rounds it does that for twelve days.
 *
 * Here a round holds the page until the next race week starts, on its Thursday.
 * Deliberately NOT wired into currentRace, which the home page reads: picks open
 * on the Tuesday, and a home page still showing last week on the Tuesday is a
 * home page with no way through to the picks that just opened.
 */
export function scheduleRace(races, nowMs = Date.now()) {
  const list = [...races].sort((a, b) => a.round - b.round);
  let cur = list[0] || null;
  for (const r of list) {
    const f = raceWeekStartMs(r);
    if (f != null && nowMs >= f) cur = r;
  }
  return cur;
}

export function currentRace(races, scoredIds, nowMs = Date.now()) {
  const list = [...races].sort((a, b) => a.round - b.round);
  const done = (r) => {
    const t = raceStartMs(r);
    // No start time and no date is nothing to measure, so fall back to the
    // score: an unplaceable round that has been played is over.
    if (t == null) return !!(scoredIds && scoredIds.has && scoredIds.has(r.id));
    return nowMs - t > GRACE_MS;
  };
  return list.find(r => !done(r)) || list[list.length - 1] || null;
}
