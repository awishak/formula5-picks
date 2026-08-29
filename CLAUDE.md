# Formula 5 (F5)

Fantasy Formula 1 pick'em league. Custom web app I built and maintain. This file is the context for working on the codebase. Recap workflow lives in docs/recaps.md. Team lore lives in docs/F5_Team_Lore.md. A live in-race /schedule was designed and parked 2026-08-23; docs/live-page.md holds it.

## Stack

React + Vite frontend. Supabase backend (Postgres + RLS). Deployed on Vercel.

## File map

Admin.jsx: scoring logic including needleScore, Driver Pools tab with dropdown selectors.
MyPicks.jsx: 22-driver finishing order grid.
PracticePicks.jsx: practice/preview picks UI.
SchedulePage.jsx: THE schedule page, at /schedule. The round, every matchup in it, on the Vegas look. Which round it opens on comes from scheduleRace() in raceTimes.js.
Schedule.jsx: the OLD schedule, unrouted, at ?page=schedule-v1. Dynamic recap button, reads pick_deadline. Editing this file does not change /schedule; that mistake cost a round trip on 2026-08-28.
raceTimes.js: when each race starts and how to say that out loud. RACE_UTC, raceTimePT, raceStartMs, currentRace (the week the app is on, 48h after lights out) and scheduleRace (the week /schedule is on, which is different on purpose; see below).
PickIntel.jsx: pick intel display, depends on canonical driver names for headshots and color chips.
drivers.js: canonical driver identity. Names, teams, cached headshot URLs, name aliases, the useOpenF1Drivers hook and findDriver. Single source of truth for anything driver-shaped.
teams.js: canonical team identity. Full name (matches teams.name in Supabase), short name for tight spots, three-letter code for URLs. Single source of truth for anything team-shaped. Codes are part of the URL scheme, so changing one breaks a link.
teamTable.js: the team game computed. Pure, no React and no Supabase, so any page can render a standings row without growing a second copy of the scoring rules. buildTeamTable, rankByAverage, nextFixtures, TIEBREAKS.
playerTable.js: the individual game computed. Pure. buildPlayerTable, placesBy. The individual score is wider than the team score: it includes pit_individual_pts and weekly_bonus_pts, which the team score leaves out.
PlayersPage.jsx: the individual standings at /players, on the Vegas look. Same skeleton as TeamsPage. Ranked on points a race, which is also the big number. Trophies are a placing among everyone who scored that week: gold, silver, bronze, and a dot for a top ten that was not a podium, so nothing is counted twice. PlayerStandings.jsx is the old one, unrouted, at ?page=player-standings-v1.
TeamsPage.jsx: the second-half team standings at /teams, on the Vegas look. Position, logo, code, record, next opponent, championship points, nothing else. TeamStandings.jsx is the first-half table, unrouted, still at ?page=team-standings-v1.
Rules.jsx: rules and glossary.
PlayerStandings.jsx: individual standings and player stats.
TeamStandings.jsx: team standings by championship points and division.
RaceResults.jsx: per-round results browser, individual/team tabs, weekly bonus points.
Strategy.jsx: Pit stop & BOX BOX tactics, pit-time reference pulled from 2025 sessions.
F1Calendar.jsx: race calendar with UTC start times, sprint/Saturday round flags.
Players.jsx: all players & team rosters, seasons-played descriptors, avatars.
App.jsx: app shell, routing, F1 starting-light bottom nav, player switcher on HomePage.
VegasHome.jsx: the Second Half Vegas Refresh mockup. Neon kit plus the state-driven Home and rooting board. Hardcoded round-11 snapshot, touches no Supabase.
theme.vegas.js: Vegas tokens. Type scale with a 13px floor, palette, neon glow helpers, motion CSS. Vegas components take color and type from here, never inline hex. FD is Encode Sans Semi Condensed, chosen 2026-08-18 with a live picker on /teams after fifteen faces in the real team names; FN is Chakra Petch for glowing numbers only.
MorePage.jsx: the fifth tab at /. A holding page: coming soon, and a link to Admin. The old home page (next race, season summary, week by week, league news) is still in App.jsx, unrouted, at ?page=home-v1. The news itself lives on in src/news.js.
ViewingAs.jsx: who you are looking at the app as. Top right of every page, rendered by the app shell. Used to live inside HomePage, so switching player meant going home first.
VegasNav.jsx: the bottom nav on the Vegas look. Five starting lights, same five slots and the same order as the old one so the positions stay where people's thumbs expect. Home, Teams, Picks, Players, Schedule. The middle light reports the week rather than the route: green when picks are in, pink and pulsing when they are not.
Recap.jsx: the 18-card first-half recap deck. No longer routed and no longer the gate; it opens at `?page=recap`. Superseded by the weekly deck.
weekly.js: one player's week, computed. Pure, no React and no Supabase, the same shape as playerTable.js and teamTable.js. buildWeekly(db, name, round) returns every card's data plus a `context` block of league-wide stats. Mirrors scoreRace() in Admin.jsx; if the two disagree the deck is wrong.
Weekly.jsx: the weekly deck itself, four cards and nine presses, Vegas throughout. Also the theme music control and card 4's flag row. Computed in the browser from the round's rows, so a deck exists the moment Admin writes the scores and changes if a round is rescored. WeeklyDeck is the presentational half, split out so the smoke script can render all 48 without a network.
HandsColumns.jsx: the four-hand board, lifted out of VegasHome.jsx so the home page and the weekly deck draw the same board from the same code. A driver cancels COPY FOR COPY, not driver for driver.
nations.js: the fallback map for nationality, and the default. A player who has picked a flag beats it; see the flags section below.
nationList.js: every flag anybody can fly. 266 countries, 50 states, D.C., 5 territories, and no flag. Generated by scripts/nation-list.mjs; never hand-edit.
Flag.jsx: draws one. Art in the file first, then the emoji flag, then the code on a plate. US states land on the plate because no emoji exists for them.
FlagPicker.jsx: the search-first sheet, and FlagRow, the row that opens it. Used by MorePage and by Admin's Flags tab.
scripts/smoke.jsx: renders every VegasHome branch through react-dom/server and exits non-zero on a runtime error. Run with npm run smoke.
scripts/smoke-weekly.jsx: 384 renders of the weekly deck, every card at every press for all 48, checking each renders distinctly. npm run smoke:weekly. Reads scripts/weekly-fixture.json, a committed snapshot of a real round; regenerate with scripts/weekly-fixture.mjs.
scripts/check-weekly.mjs: loads every card and press in a real browser and fails on any console error. npm run check:weekly, with npm run dev in another shell. **The bundled smoke run is not the browser**: esbuild reorders module-level constants, so a `const` read before its declaration passes smoke and throws on load. That happened on 2026-08-24 and this is what catches it.
scripts/smoke-recap.jsx: 864 renders of the deck, and checks each card differs across players by content hash. npm run smoke:recap.
scripts/peek.jsx: prints the rendered TEXT of recap cards so copy gets read as copy. npm run peek.
scripts/schedule2.mjs: draws and checks the second-half round robin, writes schedule2.sql and recap/schedule2.json.
public/check.html, public/fit.html, public/scroll.html, public/drive.html, public/names.html: dev harnesses. check.html measures every route at every phone width in ONE browser run and is what to reach for first: fit.html does one page at one width, which meant a dozen 40-second Chrome launches to answer a single layout question. fit.html measures any route at a true phone viewport (?path=/teams) and reports overflow and truncation; scroll.html shows a given offset; drive.html walks a multi-step flow so a step deep inside a wizard can be photographed; names.html measures name widths. All unlinked, and they do ship.

All components live in src/. Recaps are static HTML in public/recaps/, surfaced via the recap button in App.jsx and Schedule.jsx.

## The weekly deck

**Live as the gate since 2026-08-26.** The first time you open the app after a
race is scored you get your own deck, once, and closing it is remembered under
`f5_week_seen_r{round}_{name}` in localStorage. It replaced the first-half recap
deck in that slot.

The trigger is the round being **scored**, not picks being open: Andrew scores by
hand, so a Monday that has not been scored has nothing to show and a Tuesday that
has been scored should not wait for the next deadline. App.jsx does two small
reads to find the most recently scored round; the deck loads the rest itself.

Four cards, nine presses. `/week` opens it, with `?player=`, `?card=`, `?stage=`
and `?round=` overrides so every press can be photographed.

| card | what |
|---|---|
| 1 | The team's result. Matchup box, then all 24 team scores as horizontal bars with the ones you outscored marked. |
| 2 | Five presses: your score against the field, recoloured by who won, the matchup as the shared HandsColumns board, BOX BOX, then the pools and what you left behind. **The podium leads on the first two presses and the chart sits under it**; from the team press on they swap, because there the chart is the content and the panel is commentary. |
| 3 | Where you stand. Both tables, scrollable, ranked on points a race. |
| 4 | Next race, picks, and the flag. |

Rules this deck holds:

1. **It ranks on points a race, the way /players does.** Ranking the same league
   two ways on two screens is how they disagree about who is 4th.
2. **Blue is the score colour.** Green and pink mean won and lost, so a points
   column in those colours claims something it does not mean.
3. **One scale for the whole of card 2.** The chart height used to change between
   presses, so a 26-point bar was drawn four different heights and its height
   stopped meaning a number.
4. **Nothing may change height between presses**, or the card rescales to fit and
   every bar appears to jump on the click. The headline reserves two lines, the
   caption reserves two lines, and the panel under the chart has a floor.
5. **Every card hands off with a question** the next one answers.
6. **The matchup press is the only thing in the deck that scrolls.** HandsColumns
   is about 600px tall; on the home page it sits on a scrolling page, and a deck
   card is a fixed frame.
7. **Nothing "pays" anybody.** A driver is *worth* points to whoever picked him.
8. **The fit scale runs after the type scale.** `Card` measures each card and
   scales it to fit, floored at `MIN_SCALE = 0.72`, so theme.vegas.js's 13px
   floor is really a 9.4px floor and anything authored under 13 lands lower.
   Raising a font on a card that is already scaling does almost nothing: the
   card gets taller and the scale drops by about the same amount. **The lever is
   card height, not font size.** Read `document.documentElement.dataset.fit` and
   `.natural` in a real browser at 375x667 and 393x852 before touching type.
9. **A control the reader has to find is a control that does not exist.** The
   theme music went from the top chrome to a named pill to a button in the
   bottom bar beside NEXT across four rounds of "too small" on 2026-08-28.
   Actions live in the bottom bar next to the primary button.

### The theme music

**Live 2026-08-28.** "Velvet Thunder", written by Andrea Buttacavoli, majority
owner of Prestissimo Veloce. `public/velvet-thunder.mp3`, 1.9MB, `preload="none"`
and looped. The `<audio>` element lives in `WeeklyDeck`, so the track survives
the card changing and leaving the deck is what stops it.

Card 1 stacks the full offer and the credit above NEXT and reserves
`THEME_BAR_CREDIT` for them. Cards 2 and 3 get the short pill beside NEXT in the
row that is already there and reserve nothing, because card 2 is ~790px of card
against 517px of room at 375x667 and was already under the scale floor before
the music existed. Card 4 has no bottom bar, so its pill sits in the top chrome.

**The deck opens without anyone touching the phone**, since App.jsx returns it
straight out of the gate, and every browser blocks autoplay with sound until a
gesture. There is no version of this that starts on its own: the tap on the
speaker IS the gesture. An iPhone's silent switch mutes an `<audio>` element and
there is no web workaround, so the control glows while the track plays, which is
the only thing separating "my phone is muted" from "this button is broken".

**RESOLVED 2026-08-28.** Andrew reported that a track not started on card 1
would not start later, and confirmed on his own phone the same day that starting
from card 2 works. Not reproduced after the control became a 157x41 pill in the
bottom bar; the version he hit it on was an 18px bare speaker icon in the top
chrome, so the likely answer is that the tap was missing the target rather than
anything in the audio. Recorded rather than proven: nothing was changed to fix
this, so if it comes back the two live candidates are iOS gesture locking and
the 1.9MB download reading as a failure, and the `<audio>` node is provably the
same DOM node across all four cards so a remount is already ruled out. Headless
Chrome cannot separate the other two, because a scripted click is not a user
gesture.

### Which round /schedule opens on

**Changed 2026-08-28.** `scheduleRace()` in raceTimes.js: a round holds the page
until the next race week starts, on **its Thursday at midnight Pacific**. It was
`currentRace`, which hands over 48 hours after lights out, so the result came off
the screen on the Tuesday while it was still being talked about, and with a
fortnight between rounds 12 and 13 it did that for twelve days.

Pacific rather than UTC because the league is: midnight UTC Thursday is 5pm
Pacific Wednesday. Counted back in Pacific days, so round 21, which runs Sunday
04:00 UTC and Saturday 8pm at home, gets the Thursday of the weekend it is
actually part of. Both offsets are tried, because rounds 21-23 are PST.

**Deliberately not wired into `currentRace`**, which the home page, the dashboard
and /teams read. Picks open on the Tuesday, and a home page still showing last
week on the Tuesday has no way through to the picks that just opened. /teams also
reads `currentRace` for when the next race starts, and a round that already ran
would make its 72-hour switch permanently true.

Numbers it works out that the app never had: all-play record, schedule luck, the
perfect hand the pools allowed and what you left behind, the single best swap you
could have made, this week against your own weeks, and how often a player in your
band wins.

## Flags

**Live 2026-08-26.** Players pick their own on the More page; Admin's Flags tab
sets anybody's, players and teams both.

`players.nation` and `teams.nation`, added by `scripts/nations.sql`. Precedence:

    the column          what the player picked. Wins.
      | null            never chosen, so fall through
    PLAYER_NATIONS      what is hardcoded in nations.js
      |
    "US"

**`null` and `""` are not the same.** Null is "never chosen" and falls through.
Empty is "chose no flag", which is an answer, and draws nothing.

Codes are ISO 3166-1 alpha-2, with `US-XX` for states and territories. AL is
Albania; Alabama is US-AL, and the prefix is what keeps them apart.

Artwork, best first: the 15 hand-drawn in Flag.jsx, then `/flags/us-xx.svg` for
states, then the emoji flag for every other country, then the code on a plate,
which nothing should reach.

Emoji is the only emoji in the app and it is a picture rather than writing; it
was checked, not assumed, by counting colours in a rendered glyph.

**An emoji flag's artwork is 0.880 of its font size wide and 0.640 tall**, a 1.38
ratio, measured by painting a glyph to a canvas and reading the non-transparent
bounds. Sizing the font to the box height painted emoji flags at 66% the width
of a drawn one, so Argentina looked smaller than Brazil in the same list. The
font is sized to fill the width now and the extra 4% of height is cropped, which
makes every flag on screen the same box whatever drew it.

**State flags are files, not bundled.** A state flag is a seal on blue:
Pennsylvania is 119KB and the 56 together are 2.5MB, which nobody should
download to see one of them. `scripts/state-flags.mjs` extracts them once out of
the `us-state-flags` devDependency into `public/flags/` and they are committed;
nothing at runtime imports the package and the three production dependencies are
unchanged. Re-run the script only if a flag changes.

A path in `ART` carries its own leading M. Prefixing another gave `MM0,0` and
every path-drawn flag emitted invalid SVG for a week, unseen because the only
one on screen was the US, which is all rectangles. `npm run smoke:flags` checks
the path data now.

## Verify before deploying

npm run build does NOT catch undefined identifiers. A missing helper compiles clean and throws in the browser; this shipped once and crashed on a phone. Run `npm run smoke` before any deploy that touches VegasHome. Adding a state or branch there means adding it to the loop in scripts/smoke.jsx, or the new path is silently uncovered.

Identical output lengths across smoke cases means the props are not actually driving state and every case rendered the same screen. Distinct lengths are the signal that coverage is real.

Adding a state to VegasHome means adding it to the loop in scripts/smoke.jsx.
`waiting` was added 2026-08-26 and the run passed at 20 without ever rendering it.

**Every hook in App.jsx must sit above every early return, and there are five of
those returns.** The two scroll effects sat below the deck branches, so tapping
into /week rendered two fewer hooks than the render before it and React threw
#300, "rendered fewer hooks than expected". Shipped 2026-08-26 and broke the app
on a tap.

Nothing caught it. A cold load of any URL renders a consistent set of hooks, so
loading each page in turn proves nothing; the mismatch needs `activePage` to
change WITHOUT a remount. **`npm run check:nav` taps through the app the way a
person does** and is the only check that sees this class of bug. Reloading is
not tapping.

The smoke runs prove a card renders and differs across players. They cannot see
that a chart drew the wrong bars. A renumber on 2026-08-24 widened a `stage <=`
test so the matchup drew 11 bars instead of four, and every check passed; only
the screenshot caught it.

## Data model

races.pick_deadline: controls when picks open and close.
races: 23 rounds for 2026. Round 16 is the Bahrain Grand Prix at Sepang; the season ends at round 23, Abu Dhabi.
teams.division: the FIRST-half division. teams.division_h2 is the second half. Never read `division` alone for a round 12+ question.
schedule: home_team_id IS the OVER seat. Rounds 1-22 exist; round 23 is seeded after round 22 is scored.
results.finishing_order: the full 22-driver order. Admin sliced it to 5 before writing until 2026-08-19, so rounds 3-11 hold only the top five and cannot be used to rebuild a championship; rounds 1-2 and everything from 12 on hold all 22.
driver_pts in score records: stored as a JSON string, must json.loads() before use.
DRIVER_NAMES: canonical driver name strings, defined in src/drivers.js. Every driver reference (scoring, headshots, team color chips, pick intel) must use these exact strings or it breaks silently. Resolve external or legacy spellings with canonicalName() rather than comparing strings directly.

## Known bugs and gotchas

Standings depended on database row order. RESOLVED 2026-08-18. Two teams in a division can post the identical matchup score, ten times in the first half, and nothing decided which took the higher championship-points place. It fell to Postgres heap order, which is not stable: an UPDATE rewrites a row to the end of the heap, so adding division_h2 reshuffled 45 championship points with no score changing. Any query whose output order matters needs an explicit rule, not an implicit one.

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

## Tiebreaks

Set by Andrew 2026-08-18, live from round 12. When two teams in a division post the same matchup score, the higher championship-points place goes on:

1. Matchup score
2. BOX BOX. On a WIN the team that did NOT win BOX BOX goes ahead, since BOX BOX swings 6 and a team level without it picked six points better. On a DRAW the other way round: winning BOX BOX is what separates two teams the day could not.
3. Margin of victory
4. Order points, both players
5. Midfield points, both players
6. The better of the two players
7. Coin flip, drawn from the team and race ids so it is arbitrary between two teams and identical on every load

Nobody shares a place. Drawn matchups used to split the points between teams level on BOX BOX; the chain runs until one is above the other. Lives in `cmp` in src/teamTable.js. Deliberately NOT on the rules page: Andrew's call, nobody asks.

Run over the first half it leaves promotion untouched, moves the Second Division title from Meatballs to HomeworkTubes, and puts El Camino one point above East Bay, the reverse of the relegation that was played. **The first half stands as played and nothing was written to the database.**

## League structure

48 players, 24 two-player teams, two divisions (Championship and Second Division).
12-race half-seasons. Head-to-head team matchups.
The Needle: pit stop prediction mechanic.
BOX BOX: team strategy layer.
Team championship points per division: 25-18-15-12-10-8-6-4-2-1-0-0.
The top 12 individual scorers from the prior season retain their team brands and are placed in the Championship Division.

## Midseason recap: the card deck

**Live at https://f5.andrewishak.com/deck. Eighteen cards. Finished and
deployed 2026-08-17.** It replaced the twelve-chart scroll page; git history has
that. The prep scripts survived because the deck needs the same numbers.

Three ways in, all equivalent: **`/deck`**, `?recap`, `#recap`. The path needs
the SPA rewrite in `vercel.json` or a direct hit 404s. `?player=Andrew%20Ishak`
overrides the signed-in name. **`?card=7` opens on that card**, which is what
makes every card screenshottable without clicking through.

The deck is `src/Recap.jsx`. Cards 1-12 are the light look, **card 13 turns
Vegas** after the dice roll on 12.

| # | Card |
|---|---|
| 1 | Title, avatar and team logo, three derived notes |
| 2 | You and the field: quote, flythrough, three stat tiles |
| 3 | Your team and what was at stake |
| 4 | Round 11's result, with confetti up on a win and down on a loss |
| 5 | Three round-11 stories from around the league |
| 6 | Promotion and relegation, played out on a button in four stages |
| 7 | Did promotion and relegation work |
| 8 | Your rounds and your team's weeks, two charts |
| 9 | Where the points came from, stacked |
| 10 | How you score on each component, with ranks |
| 11 | What to do next half. **Scrolls** |
| 12 | Are you ready, with the dice |
| 13 | **VEGAS.** Your division, ranked on scoring average. **Scrolls** |
| 14 | Every team's points counting down to zero |
| 15 | The individual game, full-width flythrough |
| 16 | The rules. **Scrolls** |
| 17 | Your calendar. **Scrolls** |
| 18 | Good luck, and Make your picks |

### Rules the file exists to hold

1. **Headline first.** Every card opens with its takeaway, then supports it.
2. **Real sentences.** The deck is narration, so it does NOT follow
   [[f5-ui-copy-is-fragments]] — that rule is for product chrome.
3. **Nothing scrolls except the four cards marked above**, and nothing is ever
   clipped. `SCROLLS` holds those four; everything else is measured and scaled
   to fit. Cards are top justified.
4. **Animate with CSS, never by slicing data.** Every chart renders its full
   geometry on the server and then draws itself. Slicing by a timer makes all 48
   decks render identically under react-dom/server, which is what
   `scripts/smoke-recap.jsx` exists to catch.
5. **Charts carry a legend and both axis labels.**

### The layout traps, all of which bit

- **Never set an animated value as an SVG attribute while the transition targets
  the CSS property.** `opacity={x}` with `transition: opacity` does not connect:
  three beeswarm dots never painted and the stacked chart rendered empty. Put it
  in the `style` object.
- **The card body is a flex column with a measured height, so children shrink.**
  That squashed the 12-team board and cut teams off. `.f5card > *` sets
  `flex-shrink: 0`.
- **`position: relative` paints above every non-positioned sibling**, whatever
  the DOM order. The board covered its own button and the next card's text.
  `.f5card > *` sets `position: relative` so DOM order decides again.
- **Do not reach for `contain: paint`.** It clips rather than prevents, and it
  hides the overflow from the check meant to catch it.
- **Measure with the wrapper released.** Reading `offsetHeight` while the parent
  still carries the previous height measures the content through its own
  constraint and converges on the first value it happened to read.
- **Re-measure after `document.fonts.ready` and after images load.** Team logos
  have no intrinsic size until they load; measuring early under-measures a card
  full of them by a couple of hundred pixels.

### Checking layout

`public/fit.html` loads the deck in an iframe at an exact phone size and reports
the fit scale, anything crossing the viewport edge, and anything truncated.
**macOS Chrome clamps its own window to about 500px, so `--window-size` is
useless for testing a 375px phone** — that is why the iframe exists.

    open http://localhost:5173/fit.html?w=393&h=852&card=8

`public/names.html` measures team names against the 120px a board row gives one.
Both ship to production, unlinked. `npm run peek` prints the rendered TEXT of
cards so copy gets read as copy rather than reviewed as code.

Verified at 393x852 and 375x667: nothing clipped, nothing scrolls outside the
four list cards. On an iPhone SE a few cards scale to 0.72-0.98.

### Data

`src/recapData.json`, built by `scripts/recap/cards.mjs`. **Never hand-edit.**

    export F5_DATA=~/Downloads/formula5_data_2026-07-27.json
    node scripts/recap/prep3.mjs && node scripts/recap/cards.mjs

`prep3.mjs` must run first: the stake windows come from it.

**Run `npm run smoke:recap` before any deploy.** 864 renders, and it checks each
card renders *distinctly* across players by content hash. Cards that are
deliberately identical for everyone are listed in `EXPECTED_MIN`; adding a card
means raising `CARDS` there or it is silently uncovered.

- Driver returns are ranked on **points per pick**, and the denominator shown is
  **rounds in the pool**. 48 people picking the same driver in one round is one
  race, not 48 samples: Antonelli's 25.0 a pick came off three rounds, all of
  which he won. Andrew caught that number as wrong on sight.
- A driver belongs to whichever pool they were picked from more, so nobody
  appears in both lists.
- Short team names live in `SHORT` in cards.mjs, used only on the board and the
  division list. Nothing is renamed. A missing one throws at build time.
- Scoring-average rank is across all 24 teams, never within a division.

### Findings from the first half worth acting on

- **The OVER won 66% of 132 matchups; the UNDER won 25%.** Still live as a rules
  decision.
- Without the BOX BOX line, 29 of 132 matchups had a different result.
- Best-finish guesses of P2 hit 42%; P1 only 28%, and P1 is guessed nearly as
  often.
- Most-picked midfielder is Hadjar, 301 picks for 5.9 each. **Sainz was picked
  142 times and returned -0.1 a pick.**

### Bugs found in the data, still unfixed at source

- **`results.top_driver` for round 5 contains "Claude responded: Andrea Kimi
  AntonelliAndrea Kimi Antonelli".** An AI response was written into the field.
  Scoring reads `driver_pts` so round 5 scored fine, but the row is wrong.
- **Round 9 and 10 pit times are 10 and 11 seconds** against 2.2-4.8 everywhere
  else, and round 2 is null. Either real disaster stops or data entry.
- **`driver_pts` holds both "Andrea Kimi Antonelli" and "Kimi Antonelli"**,
  splitting 133 cards. Merged in the recap pipeline via a local `CANON()`, not
  fixed at source.
- `results.finishing_order` stores only the top 5, but `driver_pts` proves
  scoring used a full order. The persistence is lossy; positions are recoverable
  from `driver_pts`.

### Relationship to the Stories project

The deck is the reference implementation for `~/Projects/stories`. The format is
a **story**, the genre is a **Wrapped**, gating the app behind it makes it an
**interstitial**. The reusable product is the config, not the cards. Two things
would have to be extracted: the `Card` shell with its fit measurement, and the
light-to-dark flip partway through. Not solved for a real gate: F5 has no
persisted "seen" flag, which needs a Supabase column and a write.

## The second half: calendar, schedule and divisions

**Done and live, 2026-08-17.** Three database changes, all additive.

- **The calendar is 23 races.** The Bahrain Grand Prix at Sepang was inserted at
  round 16 and everything from the old round 16 shifted up, so the season now
  ends at Abu Dhabi in round 23. Yes, the race at Kuala Lumpur is called the
  Bahrain Grand Prix. Andrew confirmed that; OpenF1 agrees.
- **Rounds 12-22 are drawn**, a straight round robin per division: every pair
  meets once, round 22 is seeded 1v2, 3v4 and so on by first-half scoring
  average, and every team takes the OVER five or six times with both sides
  inside the opening three rounds. `scripts/schedule2.mjs` draws it and checks
  it; `scripts/schedule2.sql` is what was run. **Round 23 is deliberately
  undrawn**: it gets seeded 1v12, 2v11 once round 22 is scored.
- `home_team_id` IS the OVER seat (Admin.jsx:547). Home carries no other
  meaning, in either half.
- **`teams.division_h2`** splits divisions by half so first-half standings keep
  rendering as they were played. `TeamStandings.jsx` picks by round, and the
  team game now resets at the half while the individual game runs all 23 races.
  **`scripts/division_h2.sql` may not have been run yet** — the app falls back to
  the first-half division when the column is missing, so nothing breaks, but
  second-half standings will not group correctly until it does. Check first.

### The Vegas refresh itself

In progress on branch `vegas-second-half`, 10 commits, all pushed. Not merged, nothing user-facing changed. Design is settled; the data is not.

Open it at `?vegas`, NOT `#vegas`. Vercel SSO on protected previews redirects without the fragment, so a hash entry lands you on the normal light app looking unchanged. The query param survives. Both work locally where there is no auth redirect.

Goal: Home answers two questions. What am I doing this week, and who am I cheering for. It is state-driven: no picks, locked, live, final. Mock controls at the top of the page switch state and are not part of the design.

The centrepiece is the rooting board. All 22 drivers in grid order before the race, running order during, finishing order after. Two columns for the two teams, each showing what that driver is worth to that team. Ring count is pick count, two rings meaning both teammates have him. Thumb up green for root for, thumb down pink with the face greyed for root against. Only the 10 pool drivers get a full row; the other 12 are 30px context lines since they cannot score.

Color rules, agreed with Andrew and enforced in theme.vegas.js:
- blue normal, green good to go or won, pink the other team or a problem or needs attention
- our side goes green when won and grey when lost, theirs lights up only if they beat us
- those win/lose colors apply ONLY once the race is scored. Mid-race stays blue and pink and says ahead/behind, never won/lost. Nothing should look decided while a race is running.
- labels are DM Sans, never Bebas. Bebas is for chips, stats and headers only, and ships one weight so never set 700 or 900 on it.

UI copy is fragments, not sentences. See [[f5-ui-copy-is-fragments]].

### Blocking correctness problem

The board's margin counts driver points only. It is missing three things that Admin.jsx does count, so a stated margin can be wrong by up to 24:
- order_bonus, 6 per player for all 5 picks in exact finishing order (Admin.jsx:481)
- best_finish_bonus, 3 per player (Admin.jsx:502)
- pit_matchup_pts, BOX BOX winner +5 loser −1, so 6 of swing between the teams

Andrew's instinct that a 7+ point margin is safe is exactly right for BOX BOX alone, since 6 is its max swing. It does not hold once the other 18 is also missing.

Order bonus and best finish ARE computable from a running order, same as driver points. BOX BOX is the only thing genuinely unknowable mid-race, since it needs the constructor's first stop to have happened. So the rule should be: include order and best finish always; if the stop has not happened and the margin is 6 or less, refuse to call it.

Doing this properly needs the pure scoring math extracted out of scoreRace() in Admin.jsx, which is currently welded to the Supabase writes and cannot run read-only. Reimplementing the rules inside VegasHome would give two copies that silently disagree, the same shape of bug as DRIVER_NAMES being trapped in Admin.jsx.

### Decisions Andrew still owes

- Cut the older BOX BOX card lower on the locked page? It now duplicates the board header and only adds "+5 or −1".
- Should Final show the true score including all three missing components? That is the honest fix above.

### Next chunks, not started

- Standings and the team table in the Vegas look, fewer columns and bigger type, folding in the jump chip scoped earlier
- Home reading live Supabase data instead of the hardcoded snapshot

**RESOLVED 2026-08-17: the second-half schedule now exists.** `schedule` covers
rounds 12-22, so a real second-half Home has an opponent to show. See below.

### What the recap deck learned that this should reuse

The deck went from unseen to verified on 2026-08-17 and the tooling transfers:

- **Drive Chrome headless through `public/fit.html`** to see any screen at a
  true phone viewport. macOS Chrome clamps its own window to about 500px, so
  `--window-size` is useless for testing a 375px phone; the iframe is the fix.
  This is how everything finally got looked at, and the Chrome extension still
  will not pair (`list_connected_browsers` returns empty).
- The layout traps listed under the recap section all apply here too, especially
  animating an SVG attribute while the transition targets the CSS property, and
  `position: relative` painting above non-positioned siblings.
- **Read rendered copy as copy.** `npm run peek` exists because the deck's voice
  mistakes all happened in template strings that were reviewed as code.

## Open work items

needleScore thresholds: decide between fixing the bucket thresholds (0.0/0.1/0.2 etc.) or enforcing tenths-only entry in the input.
Matchup leading player stat: the higher scorer on the winning team in a head-to-head matchup. Compute at render time like trophies. Add to player stats and the glossary.

Automated driver pools (deferred to August 2026). Goal: generate pools automatically the Monday before each race. Rule: 3 random drivers from driver standings positions 1-5, 7 random from positions 6-15, weighted to avoid drivers who appeared in recent rounds' pools. Prior pools are already in races.top_drivers / races.mid_drivers, so repeat-avoidance needs no new storage.
Blockers found 2026-07-20, all unresolved:
- RESOLVED 2026-08-19. src/standings.js builds the real drivers' championship. OpenF1 has no standings endpoint (/v1/standings and /v1/driver_standings 404) and its session_result carries points for only three 2026 sessions, so both look like answers and are not. /v1/position is populated for every session, and the last position record per driver is where they finished: checked against the official Australia result, all 22, same order. Sprints count and pay 8-7-6-5-4-3-2-1. Totals reconcile exactly at 1255, which is 11 races at 101 plus 4 sprints at 36.
  OpenF1 rate limits and answers 429. That is what made two runs a minute apart count 14 races and then 12, and it was silently swallowed. get() backs off to 8s and gives up loudly; finished races are cached in scripts/f1-results.json so a rerun is 1.6s instead of a rate limit.
  A session OpenF1 has nothing for answers 404, not an empty list. Bahrain and Saudi Arabia 2026 are both that, which is also why neither is on the F5 calendar. They are recorded as skipped rather than thrown.
- OPEN QUESTION 2026-07-25, gates the live rooting board. drivers.js warns that OpenF1 returns 401 across the whole API while a session is live, which is exactly when a live board would poll it. Tested during the Hungary weekend and got 200s from /v1/position with real data, but no session was live at the time, so that proves nothing. If the 401 is real, live results need a server-side proxy with a cache, which is a new service. The only cheap test is polling /v1/position during an actual race hour.
- RESOLVED. Server-side code exists: `api/` with `_supabase.js` and three cron functions, and `vercel.json` carries the schedules. The service-role key turned out to be unnecessary — Admin writes driver pools from the browser with the anon key, so RLS already allows the same write from a function, and `api/_supabase.js` uses the anon key deliberately. No new secret was added. Cron calls are authed on Vercel's `x-vercel-cron` header, with `CRON_SECRET` for triggering by hand.
- An emailed digest on generation day was wanted. No mail provider is set up, so that is a third new service.
- RESOLVED 2026-07-24: DRIVER_NAMES was module-local to Admin.jsx. It now lives in src/drivers.js and is exported. Admin.jsx imports it.
- RESOLVED 2026-07-24: name matching now goes through canonicalName() in src/drivers.js, backed by a NAME_ALIASES map, instead of string equality. Antonelli, Albon, Hulkenberg and Perez variants are covered.
RESOLVED. Cron automation shipped and kept the veto: `api/cron/pools.js` runs Tuesdays at 15:00 UTC and will not overwrite a pool already set by hand in Admin. `?force=1` with the secret is how to redraw, not clearing it and waiting. `api/cron/standings.js` refreshes the drivers' championship Mondays at 14:00 UTC.

RESOLVED 2026-08-19: Admin now writes the full finishing order. Rounds 3-11 keep the five they were written with; nothing rewrote history.

### Next: an Athletic-style alternate deck

**Agreed 2026-08-28, not started.** A second weekly UI that reads like a run of
theathletic.com news stories, to try against the Vegas deck rather than to
replace it. Editorial register: headline, byline, body copy, photography over
glow.

`src/weekly.js` already computes every number, including the league-wide
`context` block, and is pure. The alternate is a new presentational component
over the same `buildWeekly(db, name, round)` output, the way `WeeklyDeck` is
split out of `Weekly`. **Do not fork the maths.** Route it in parallel and leave
`/week` alone until Andrew has both in front of him and picks.

Announced to the league in the deck, so these are now promises:
- The pit stop input must accept up to 4.5 seconds. **Done 2026-08-18.** Raised in MyPicks.jsx, PracticePicks.jsx, the Schedule.jsx guess bar and Admin's random-pick generator. Driven to the stop in the browser: the dial reads "4.5 or above".
- Fernolo 5 Bort, Formula 5 Bot's less popular cousin, makes random picks for anyone who misses the deadline. **Written and scheduled**: `api/cron/fernolo.js`, nightly at 03:00 UTC, which is 8pm Pacific and three hours after a 5pm deadline, so a missing pick can still be filled by hand from Admin first. Nightly rather than weekly because the deadlines are not all on the same day. It only acts on a race whose deadline passed in the last twelve hours, and inserts only, so somebody who picked is never overwritten. `?dry=1` with the secret returns who it would fill and a sample pick without writing, which is how to check it before trusting a Friday night to it. It marks its rows `auto: true`, and if that column does not exist yet it retries without the label rather than dropping the picks. **Not confirmed to have fired on a real deadline** — check a run before calling it done to the league.
- Round 23, if the FIA holds it, is seeded 1v12, 2v11 and so on.
