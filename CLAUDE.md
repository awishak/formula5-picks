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
Recap.jsx: the 18-card first-half recap deck. Live at /deck.
scripts/smoke.jsx: renders every VegasHome branch through react-dom/server and exits non-zero on a runtime error. Run with npm run smoke.
scripts/smoke-recap.jsx: 864 renders of the deck, and checks each card differs across players by content hash. npm run smoke:recap.
scripts/peek.jsx: prints the rendered TEXT of recap cards so copy gets read as copy. npm run peek.
scripts/schedule2.mjs: draws and checks the second-half round robin, writes schedule2.sql and recap/schedule2.json.
public/check.html, public/fit.html, public/scroll.html, public/drive.html, public/names.html: dev harnesses. check.html measures every route at every phone width in ONE browser run and is what to reach for first: fit.html does one page at one width, which meant a dozen 40-second Chrome launches to answer a single layout question. fit.html measures any route at a true phone viewport (?path=/teams) and reports overflow and truncation; scroll.html shows a given offset; drive.html walks a multi-step flow so a step deep inside a wizard can be photographed; names.html measures name widths. All unlinked, and they do ship.

All components live in src/. Recaps are static HTML in public/recaps/, surfaced via the recap button in App.jsx and Schedule.jsx.

## Verify before deploying

npm run build does NOT catch undefined identifiers. A missing helper compiles clean and throws in the browser; this shipped once and crashed on a phone. Run `npm run smoke` before any deploy that touches VegasHome. Adding a state or branch there means adding it to the loop in scripts/smoke.jsx, or the new path is silently uncovered.

Identical output lengths across smoke cases means the props are not actually driving state and every case rendered the same screen. Distinct lengths are the signal that coverage is real.

## Data model

races.pick_deadline: controls when picks open and close.
races: 23 rounds for 2026. Round 16 is the Bahrain Grand Prix at Sepang; the season ends at round 23, Abu Dhabi.
teams.division: the FIRST-half division. teams.division_h2 is the second half. Never read `division` alone for a round 12+ question.
schedule: home_team_id IS the OVER seat. Rounds 1-22 exist; round 23 is seeded after round 22 is scored.
results.finishing_order: 22-driver array stored with Postgres {} array literal syntax.
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
- RESOLVED 2026-08-19, with a caveat. src/standings.js builds the championship from our own data. OpenF1 still has no standings endpoint (/v1/standings and /v1/driver_standings 404); it does have /v1/session_result with a points column, but for 2026 only Australia and the China sprint and race carry one, so summing it gives a table of two race weekends. Our own results.finishing_order holds all 22 finishers for rounds 1-2 and only the top 5 from round 3 on (Admin.jsx:668 slices it), and driver_pts holds that round's pool. Layering the two reaches 11-13 drivers a round instead of 5. A driver who finished outside the top five and was not in the pool is still invisible, so the tail of the table is approximate. Fixing Admin to write all 22 makes it exact from round 12 on.
- OPEN QUESTION 2026-07-25, gates the live rooting board. drivers.js warns that OpenF1 returns 401 across the whole API while a session is live, which is exactly when a live board would poll it. Tested during the Hungary weekend and got 200s from /v1/position with real data, but no session was live at the time, so that proves nothing. If the 401 is real, live results need a server-side proxy with a cache, which is a new service. The only cheap test is polling /v1/position during an actual race hour.
- No server-side code exists. Pure client-side Vite SPA, no api/, no vercel.json, no cron. Unattended Monday runs need a Vercel Cron plus an api/ function, plus a Supabase service-role key in env, since supabaseClient.js is anon-only and all writes go through RLS.
- An emailed digest on generation day was wanted. No mail provider is set up, so that is a third new service.
- RESOLVED 2026-07-24: DRIVER_NAMES was module-local to Admin.jsx. It now lives in src/drivers.js and is exported. Admin.jsx imports it.
- RESOLVED 2026-07-24: name matching now goes through canonicalName() in src/drivers.js, backed by a NAME_ALIASES map, instead of string equality. Antonelli, Albon, Hulkenberg and Perez variants are covered.
Decision still open: full cron automation vs an Admin "auto-generate pool" button that needs no new service and keeps a human veto.

Doc/code mismatch to resolve: this file says results.finishing_order is a 22-driver array, but Admin.jsx:668 writes finishOrder.slice(0, 5). Confirm the intended shape for both results.finishing_order and picks.finishing_order, then correct whichever is wrong.

Announced to the league in the deck, so these are now promises:
- The pit stop input must accept up to 4.5 seconds. **Done 2026-08-18.** Raised in MyPicks.jsx, PracticePicks.jsx, the Schedule.jsx guess bar and Admin's random-pick generator. Driven to the stop in the browser: the dial reads "4.5 or above".
- Fernolo 5 Bort, Formula 5 Bot's less popular cousin, makes random picks for anyone who misses the deadline. **Not yet implemented.**
- Round 23, if the FIA holds it, is seeded 1v12, 2v11 and so on.
