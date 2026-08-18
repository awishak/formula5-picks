# The first-half user interface

What the league used through round 11, captured 2026-08-18 before the
second-half rebuild. Fifteen pages at 393px wide, signed in as Andrew Ishak.

The code is tagged: `git checkout ui-v1-first-half`.

## How it was navigated

No router, and no URL for any page. `App.jsx` held an `activePage` string in
React state and swapped components on it. Every page rendered at `/`, so a page
could not be linked, bookmarked, shared or reloaded into.

The bottom nav offered five of the sixteen pages:

| Nav | Page |
|---|---|
| Garage | `home` |
| Player Table | `player-standings` |
| My Picks | `picks` |
| Team Table | `team-standings` |
| Schedule | `schedule` |

The other eleven were reachable only from inside another page, which is why
capturing them needed `?page=` to be added first.

## The pages

| File | Page | Reached from |
|---|---|---|
| `home.png` | Garage front page, news feed, season preview carousel | bottom nav |
| `picks.png` | The 22-driver finishing order grid | bottom nav |
| `practice.png` | Practice and preview picks | home |
| `schedule.png` | Matchups by round, with the recap button | bottom nav |
| `results.png` | Per-round results, individual and team tabs | home |
| `player-standings.png` | Individual table and player stats | bottom nav |
| `team-standings.png` | Team table by division | bottom nav |
| `division-trends.png` | Promotion and relegation distance over the season | team standings |
| `players.png` | All 48 players and the 24 rosters | home |
| `rules.png` | Rules and scoring | home |
| `strategy.png` | Pit stop and BOX BOX tactics | home |
| `f1-calendar.png` | Race calendar with UTC start times | home |
| `season-preview.png` | Preseason preview | home |
| `recaps.png` | Links to written round recaps | schedule |
| `admin.png` | Scoring, driver pools, news editor | home |

Not captured here: `recap` (the eighteen-card first-half deck, live at `/deck`
and documented in CLAUDE.md) and `vegas` (the second-half look being built, at
`/newui`). Both already have their own URLs.
