# Formula 5 (F5)

Fantasy Formula 1 pick'em league. Custom web app I built and maintain. This file is the context for working on the codebase. Recap workflow lives in docs/recaps.md. Team lore lives in docs/F5_Team_Lore.md.

## Stack

React + Vite frontend. Supabase backend (Postgres + RLS). Deployed on Vercel.

## File map

Admin.jsx: scoring logic including needleScore, Driver Pools tab with dropdown selectors.
MyPicks.jsx: 22-driver finishing order grid.
PracticePicks.jsx: practice/preview picks UI.
Schedule.jsx: dynamic recap button, reads pick_deadline.
PickIntel.jsx: pick intel display, depends on canonical driver names for headshots and color chips.
Rules.jsx: rules and glossary.
PlayerStandings.jsx: individual standings and player stats.
TeamStandings.jsx: team standings by championship points and division.
RaceResults.jsx: per-round results browser, individual/team tabs, weekly bonus points.
Strategy.jsx: Pit stop & BOX BOX tactics, pit-time reference pulled from 2025 sessions.
F1Calendar.jsx: race calendar with UTC start times, sprint/Saturday round flags.
Players.jsx: all players & team rosters, seasons-played descriptors, avatars.
App.jsx: app shell, routing, F1 starting-light bottom nav, player switcher on HomePage.

All components live in src/. Recaps are static HTML in public/recaps/, surfaced via the recap button in App.jsx and Schedule.jsx.

## Data model

races.pick_deadline: controls when picks open and close.
results.finishing_order: 22-driver array stored with Postgres {} array literal syntax.
driver_pts in score records: stored as a JSON string, must json.loads() before use.
DRIVER_NAMES: canonical driver name strings. Every driver reference (scoring, headshots, team color chips, pick intel) must use these exact strings or it breaks silently.

## Known bugs and gotchas

needleScore threshold bug: the bucket thresholds use 0.05/0.15/0.25 instead of clean 0.0/0.1/0.2. Pit times entered as hundredths (e.g. 2.17) are silently scored as the nearest tenth. Open decision below.
Supabase silent writes: RLS policy mismatches swallow writes with no error. Always append .select() to update calls so failures surface.
Duplicate const declarations: cause silent Vercel build failures. The old build keeps serving, so a deploy looks like it did nothing. Check for these first when a deploy seems to have no effect.
Driver name matching: fragile. Use canonical DRIVER_NAMES strings everywhere.
State mutation: use setRaces(...) immutable updates. Never mutate React state directly.

## Code conventions

Minimal, targeted edits over large structural changes.
SQL queries over Supabase dashboard steps for database operations.
When listing drivers or picks, names only. No numbers or annotations unless asked.

## Design system

Fonts: Geologica and DM Sans.
Palette: dark navy anchored by #1e1e2a, blue accent #6cb8e0.
Card-based, mobile-first layouts. Rounded corners. Bottom navigation.

## Pick bot strategy (BOX BOX)

The bot makes pit stop guesses for TJ Premium. The actual stop landing on the team's assigned side of the line is what wins.
OVER assignment: guess lower, to pull the team average down so the real stop more likely lands above the line.
UNDER assignment: guess higher, to raise the line average.

## League structure

48 players, 24 two-player teams, two divisions (Championship and Second Division).
12-race half-seasons. Head-to-head team matchups.
The Needle: pit stop prediction mechanic.
BOX BOX: team strategy layer.
Team championship points per division: 25-18-15-12-10-8-6-4-2-1-0-0.
The top 12 individual scorers from the prior season retain their team brands and are placed in the Championship Division.

## Open work items

needleScore thresholds: decide between fixing the bucket thresholds (0.0/0.1/0.2 etc.) or enforcing tenths-only entry in the input.
Matchup leading player stat: the higher scorer on the winning team in a head-to-head matchup. Compute at render time like trophies. Add to player stats and the glossary.
