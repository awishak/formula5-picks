# The live page, if we ever build it

**Status: parked, 2026-08-23. Nothing is built. This is the design so the
thinking does not have to happen twice.**

The idea: `/schedule` goes live from five minutes before the race to three hours
after the start, refreshing every five minutes.

## The shape

One fetcher, one row, many readers. What you do not want is 48 phones hitting
OpenF1 at once during a race, which is exactly when it rate-limits and possibly
401s.

    Vercel function --5 min--> OpenF1 /v1/position, /v1/pit
            |
            +--> Supabase live_race (one row per race_id, jsonb payload)
                        |
                        +--> phones poll Supabase every 5 min (cheap, no limits)

The server half already exists. `api/` is there, `vercel.json` carries three
crons, `api/_supabase.js` does authed REST writes with the anon key. A live page
is a fourth job, not a new service.

## The window is already computable

`RACE_UTC` in `src/raceTimes.js` holds all 23 start times. A `liveWindow(round,
now)` sitting next to `currentRace()` gives start-5min to start+3h as a pure
function, and the server and the page read the same one. The function refuses to
do work outside it, so a bug cannot become unbounded polling.

## What triggers the fetch

**Lazy on read is the better default.** The page asks `/api/live?race=12`; the
function returns the stored row untouched if it is younger than five minutes,
and only then goes to OpenF1. A race nobody is watching costs nothing, the herd
is self-limiting, and it works on any plan.

A `*/5 * * * *` cron gating itself on the window also works and keeps the
snapshot warm before the first person opens it, but it is 8,640 invocations a
month of mostly no-op, and sub-daily crons need Pro. Three crons already ship,
so the plan is probably already Pro; confirm before relying on it.

## What gets stored

**Raw, not computed.** Running order as 22 driver numbers, session status, lap x
of y, and the target constructor's first stop duration once it exists. Computed
scores go stale in a way you cannot re-derive; a stored running order can be
rescored later when the rules move.

RLS note: the cron functions write with the anon key because Admin writes with
it too. A `live_race` table written with the anon key is a table any client can
forge. Either a service-role key, which is a new secret, or accept that the
worst case is a wrong live board for five minutes.

## The real work is the scoring extraction

`scoreRace()` in `Admin.jsx:330` is welded to the Supabase reads and writes, so
nothing else can run the rules read-only. Reimplementing them inside the live
page gives two copies that silently disagree, which is the same bug shape as
DRIVER_NAMES being trapped in Admin.

So: `src/scoring.js`, a pure `scoreRound({ picks, finishingOrder, dnfs,
pitTime })`. Admin calls it and keeps only the writes.

**That same extraction unblocks the Vegas rooting board margin bug**, which is
already an open item, so it is one job paying twice. It is worth doing whether
or not the live page ever happens.

The verification that makes it safe: a smoke script running the pure function
over every scored round's real picks, asserting it reproduces the stored scores
exactly. Rounds 1-2 and 12+ hold the full 22-driver order, so pin against those.

## What is honest mid-race

Order bonus and best finish are computable from a running order. BOX BOX is not,
until the target constructor's stop has happened. So the live matchup number is
drivers + order + best finish, with BOX BOX carried as a pending plus or minus
6, and **a margin of 6 or less before the stop gets refused rather than called**.
Colours stay blue and pink, ahead and behind, never won and lost.

The subtler problem: **a running order is not a finishing order**. A driver
sitting in the pits shows P18 for twenty-five seconds and the board swings a
dozen points for nothing. The page should show the lap and say positions are
live, rather than let a pit cycle look like a result.

## The thing that could sink it

`drivers.js:33` says OpenF1 returns 401 across the entire API while a session is
live. That has never been tested during an actual race, and it is the one hour a
live page needs it. Server-side polling is right either way, since it is also
where a token would live if one turns out to be needed. But the cost is unknown
until it is tested.

**The test is cheap and needs no UI:** a function polling
`/v1/position?session_key=latest` through a race hour, logging status codes and
row counts. Round 12 ran the morning of 2026-08-23; the next window is round 13
on 2026-09-06.

Measure the free tier's live delay in the same test. Five minutes probably
absorbs it, but the page should not say live if it is three minutes behind.

## Build order, if it is ever picked up

1. The 401 probe on a race day. Everything else is speculative until it answers.
2. `src/scoring.js` extraction plus the reproduce-the-stored-scores smoke.
3. `liveWindow()` in raceTimes.js.
4. `api/live.js` and the `live_race` table.
5. The `/schedule` live state.

Steps 2 and 3 do not depend on the probe.

## Decisions never made

- All twelve matchups live, or only yours? Twelve live matchups is twelve times
  the numbers on a page that is already dense.
- Anon key for the live table, or a service-role key?
- Is the individual game live too? It includes the needle, which is unknowable
  until the stop, so that column is mostly pending for most of the race.
- Probe scheduled, or triggered by hand on the morning?
