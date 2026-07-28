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
Rules.jsx: rules and glossary.
PlayerStandings.jsx: individual standings and player stats.
TeamStandings.jsx: team standings by championship points and division.
RaceResults.jsx: per-round results browser, individual/team tabs, weekly bonus points.
Strategy.jsx: Pit stop & BOX BOX tactics, pit-time reference pulled from 2025 sessions.
F1Calendar.jsx: race calendar with UTC start times, sprint/Saturday round flags.
Players.jsx: all players & team rosters, seasons-played descriptors, avatars.
App.jsx: app shell, routing, F1 starting-light bottom nav, player switcher on HomePage.
VegasHome.jsx: the Second Half Vegas Refresh mockup. Neon kit plus the state-driven Home and rooting board. Hardcoded round-11 snapshot, touches no Supabase.
theme.vegas.js: Vegas tokens. Type scale with a 13px floor, palette, neon glow helpers, motion CSS. Vegas components take color and type from here, never inline hex.
scripts/smoke.jsx: renders every VegasHome branch through react-dom/server and exits non-zero on a runtime error. Run with npm run smoke.

All components live in src/. Recaps are static HTML in public/recaps/, surfaced via the recap button in App.jsx and Schedule.jsx.

## Verify before deploying

npm run build does NOT catch undefined identifiers. A missing helper compiles clean and throws in the browser; this shipped once and crashed on a phone. Run `npm run smoke` before any deploy that touches VegasHome. Adding a state or branch there means adding it to the loop in scripts/smoke.jsx, or the new path is silently uncovered.

Identical output lengths across smoke cases means the props are not actually driving state and every case rendered the same screen. Distinct lengths are the signal that coverage is real.

## Data model

races.pick_deadline: controls when picks open and close.
results.finishing_order: 22-driver array stored with Postgres {} array literal syntax.
driver_pts in score records: stored as a JSON string, must json.loads() before use.
DRIVER_NAMES: canonical driver name strings, defined in src/drivers.js. Every driver reference (scoring, headshots, team color chips, pick intel) must use these exact strings or it breaks silently. Resolve external or legacy spellings with canonicalName() rather than comparing strings directly.

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

## Round 11 recap (in progress)

Lives at `public/recaps/round11.html`, generated by `scripts/recap/` — see the README there. **Never hand-edit the built HTML**; edit `scripts/recap/template.html` and rebuild.

Long-form piece with twelve interactive charts. Opens in the old light look and turns Vegas partway through chart 1, which is the story beat rather than decoration. Story is three acts (promotion, relegation, the first-half title) with everything else as one-line bullets, then a strategy section aimed at the second half.

Chart 1 runs in three states: the table going into round 11, then round 11 scored, then the division swap with teams physically travelling across and the promoted landing at the BOTTOM of the top flight. Title reads "First half" pinned to Geologica, with a Monoton "→ Second half" that lights up on the swap.

### Conventions that took several rounds to land

- Numbered charts so they can be referred to in conversation.
- Every chart animates on scroll; several have a button that changes what they show.
- Colour semantics: **blue is good, green is really good, pink is bad**. Validated with the dataviz skill's script in both modes. **Green and pink can never share a chart** — ΔE 1.6 under deuteranopia, indistinguishable. Blue against pink is 15.9 and safe, so promoted vs relegated always uses that pair.
- Raw Vegas neon fails the dark lightness band as a chart fill. Marks use deepened steps; neon stays on glow and text.
- Charts read colours from CSS variables, so the theme flip recolours all of them.
- Logos and player photos wherever they fit. All 24 team logos and 44 of 48 player photos are in Supabase and publicly reachable.
- No explanatory paragraphs in captions. See [[f5-ui-copy-is-fragments]].

### Findings from the first half worth acting on

- **The OVER won 66% of 132 matchups; the UNDER won 25%, and took a fifth of the points.** Home teams take the OVER. This reads as a balance problem, not a strategy.
- Without the BOX BOX line, Drivetex win the Championship Division, HomeworkTubes win the Second, **Luxor are promoted and Cal Aggie are not**. 28 of 132 matchups had a different winner.
- Best-finish guesses of P2 hit 42%; P1 only 28%, and P1 is guessed nearly as often.
- Partner agreement only separates the **bottom six** (59.7%). The top eighteen sit 72.7–76.7 and cannot be told apart by it. The r = 0.59 correlation is almost entirely that bottom group.
- Submission timing does nothing. r = −0.05 across 528 cards.
- Most-picked driver is Hadjar at 338 cards for 5.3 a race. Bearman took 219 cards for 1.7. Sainz, Albon and Alonso returned less than zero.

### Bugs found in the data

- **`driver_pts` contains both "Andrea Kimi Antonelli" and "Kimi Antonelli"**, splitting 133 cards across two spellings. Merged in the recap pipeline via a local `CANON()`, not fixed at source. This is the exact failure the driver-name section of this file warns about, now sitting in scored data.
- `results.finishing_order` stores only the top 5, but `driver_pts` proves scoring used a full order (Hadjar scored 8 in round 11, which is P6). **So there is no scoring bug** — the persistence is lossy, and positions are recoverable from `driver_pts` rather than from `results`. That resolves the doc/code mismatch noted at the bottom of this file.
- Round 14 is a second "Spanish Grand Prix", at Ifema Madrid. In real 2026 that is the Madrid Grand Prix. It shows in the calendar reveal.

### Open

Andrew has a longer list of changes in flight. Outstanding from the last round: quotes from the most and least streamlined teams to sit beside chart 7, and the OVER/UNDER imbalance needs a decision. The chart-1 choreography, the button toggles and the tooltips have never been verified in motion, because headless Chrome cannot click and the browser extension would not pair.

## Second Half Vegas Refresh

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

- Standings and the team table in the Vegas look, fewer columns and bigger type, folding in the jump chip scoped earlier this session
- Home reading live Supabase data instead of the hardcoded snapshot
- Second-half matchups do not exist in `schedule` yet. It only covers rounds 1-11, so a real second-half Home has no opponent to show.

### Unverified

Every deploy this session went out unseen; the Chrome extension would not pair (`list_connected_browsers` returned empty). Smoke proves it renders, not that it looks right. Whether the marquee is crowded now that the teammate avatars live in it is the most likely thing to be wrong.

## Open work items

needleScore thresholds: decide between fixing the bucket thresholds (0.0/0.1/0.2 etc.) or enforcing tenths-only entry in the input.
Matchup leading player stat: the higher scorer on the winning team in a head-to-head matchup. Compute at render time like trophies. Add to player stats and the glossary.

Automated driver pools (deferred to August 2026). Goal: generate pools automatically the Monday before each race. Rule: 3 random drivers from driver standings positions 1-5, 7 random from positions 6-15, weighted to avoid drivers who appeared in recent rounds' pools. Prior pools are already in races.top_drivers / races.mid_drivers, so repeat-avoidance needs no new storage.
Blockers found 2026-07-20, all unresolved:
- No standings source. OpenF1 has no standings endpoint, and results.finishing_order stores only the top 5 (Admin.jsx:668 slices to 5), so positions 6-15 are not derivable from our own data. API-Sports was floated but no account or key is wired up.
- OPEN QUESTION 2026-07-25, gates the live rooting board. drivers.js warns that OpenF1 returns 401 across the whole API while a session is live, which is exactly when a live board would poll it. Tested during the Hungary weekend and got 200s from /v1/position with real data, but no session was live at the time, so that proves nothing. If the 401 is real, live results need a server-side proxy with a cache, which is a new service. The only cheap test is polling /v1/position during an actual race hour.
- No server-side code exists. Pure client-side Vite SPA, no api/, no vercel.json, no cron. Unattended Monday runs need a Vercel Cron plus an api/ function, plus a Supabase service-role key in env, since supabaseClient.js is anon-only and all writes go through RLS.
- An emailed digest on generation day was wanted. No mail provider is set up, so that is a third new service.
- RESOLVED 2026-07-24: DRIVER_NAMES was module-local to Admin.jsx. It now lives in src/drivers.js and is exported. Admin.jsx imports it.
- RESOLVED 2026-07-24: name matching now goes through canonicalName() in src/drivers.js, backed by a NAME_ALIASES map, instead of string equality. Antonelli, Albon, Hulkenberg and Perez variants are covered.
Decision still open: full cron automation vs an Admin "auto-generate pool" button that needs no new service and keeps a human veto.

Doc/code mismatch to resolve: this file says results.finishing_order is a 22-driver array, but Admin.jsx:668 writes finishOrder.slice(0, 5). Confirm the intended shape for both results.finishing_order and picks.finishing_order, then correct whichever is wrong.
