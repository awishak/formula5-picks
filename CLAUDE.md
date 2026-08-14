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

## Midseason recap: the card deck

**Live in production at https://f5.andrewishak.com/deck since 2026-08-12.**
It replaced the twelve-chart scroll page, which was deleted along with its
`template.html`, `build.mjs` and `scripts/recap/smoke.mjs`. The prep scripts
survived because the deck needs the same numbers. Git history has the old page.

The deck is `src/Recap.jsx`. Three ways in, all equivalent: **`/deck`** (the real
path, and the one to share), `?recap`, `#recap`. The path needs the SPA rewrite
in `vercel.json` or a direct hit 404s before the app loads, since Vercel's Vite
preset does not add one. `?player=Andrew%20Ishak` overrides the signed-in name
so any of the 48 decks can be checked without switching users.

`src/recaps.js` maps a round to its recap URL. Both Recaps.jsx and Schedule.jsx
used to build `/recaps/round{N}.html` from the round number and assume a file was
there, but a round appears as soon as it is **scored**, not when it is written
up, so rounds 8 and 10 have always offered a recap that does not exist. That
used to 404; since `vercel.json` started serving the app for unmatched paths it
silently returns the app shell instead. Both screens now check the map, and
round 11 points at `/deck`.

Ten cards, tap-through, forward only, one next button whose label changes on
cards 4-6. Cards 1-6 are the light look, **card 7 turns Vegas** and stays.

**Three rules the file exists to hold. Break any and the deck stops working:**

1. **Headline first.** Every card opens with the one sentence that is its
   takeaway, then supports it underneath. Never build up to the point. Andrew
   rewrote the whole deck around this on 2026-08-12.
2. **Real sentences, not fragments.** This deck is narration, so it does NOT
   follow [[f5-ui-copy-is-fragments]] — that rule is for product chrome. "You
   scored 42.6 points a race, which puts you 4th out of 48."
3. **Centred on both axes, and nothing below 13px.** Centring comes from the one
   `Card` shell, never per card. The 13px floor is `theme.vegas.js`'s rule and
   the first draft broke it in three places. The Vegas half runs a step LARGER
   than the light half, not smaller.

| # | Card | Headline shape |
|---|---|---|
| 1 | Title | "Let's take a look at your first half, {first}." |
| 2 | You and the field | "You scored X a race, which puts you Nth out of 48." Flythrough down all 48, landing on you |
| 3 | Your team | "As for the team competition, you and {mate} race as {team}." |
| 4 | Round 11 | "You were playing for {stake}." **Click**, then the score and outcome |
| 5 | The swap | "Five teams go up, and five come down." Board travels |
| 6 | By average | "10 of the 12 best averages are in the Championship Division." |
| 7 | **Vegas** | "Team scores reset, but your points carry." Six-component breakdown |
| 8 | You and your teammate | "You and {mate} have a choice to make." |
| 9 | The title race | "Right now, {leader} is in the driver's seat." |
| 10 | Good luck | |

Card 4 is the only one with an internal beat: the stake lands alone, the button
reads "What happened?", then the score and result appear under it. Back
un-reveals before it leaves the card.

Data is `src/recapData.json`, built by `scripts/recap/cards.mjs` from a Supabase
export plus `chart-data.json`. **Never hand-edit it.** Rebuild with:

```
export F5_DATA=~/Downloads/formula5_data_2026-07-27.json
node scripts/recap/prep3.mjs && node scripts/recap/cards.mjs
```

`prep3.mjs` must run first: the stake windows come from it.

**Run `npm run smoke:recap` before any deploy.** It renders all 48 decks × 10
cards (528 renders — card 4 goes twice, once each side of the click) through
react-dom/server and fails on a runtime error, which `npm run build` cannot
catch. It also checks that each card renders *distinctly* across players — by
content hash, never by output length, because the highlighted row on the team
board moves without changing the byte count. Cards 5 and 6 are team-level, so 24
distinct renders is correct for them; card 4 gives 36 because its two halves
differ; the rest give 48. Adding a card means raising `CARDS` in the smoke
script or the new one is silently uncovered.

`initialCard` and `initialReveal` on the component exist only for that script,
which cannot click. Nothing in the app passes them.

### Conventions that took several rounds to land

- Colour semantics: **blue is good, green is really good, pink is bad**. Validated with the dataviz skill's script in both modes. **Green and pink can never share a chart** — ΔE 1.6 under deuteranopia, indistinguishable. Blue against pink is 15.9 and safe, so promoted vs relegated always uses that pair.
- Raw Vegas neon fails the dark lightness band as a chart fill. Marks use deepened steps; neon stays on glow and text.
- Logos and player photos wherever they fit. All 24 team logos and 44 of 48 player photos are in Supabase and publicly reachable.
- No explanatory paragraphs. See [[f5-ui-copy-is-fragments]].
- Stake sentences are noun phrases, because they render straight after "You were
  playing for". A verb in there doubles the sentence up on itself.

### Findings from the first half worth acting on

- **The OVER won 66% of 132 matchups; the UNDER won 25%, and took a fifth of the points.** Home teams take the OVER. This reads as a balance problem, not a strategy.
- Without the BOX BOX line, Drivetex win the Championship Division, HomeworkTubes win the Second, **Luxor are promoted and Cal Aggie are not**. 28 of 132 matchups had a different winner.
- Best-finish guesses of P2 hit 42%; P1 only 28%, and P1 is guessed nearly as often.
- Partner agreement only separates the **bottom six** (59.7%). The top eighteen sit 72.7–76.7 and cannot be told apart by it. The r = 0.59 correlation is almost entirely that bottom group.
- Submission timing does nothing. r = −0.05 across 528 cards.
- Most-picked driver is Hadjar at 338 cards for 5.3 a race. Bearman took 219 cards for 1.7. Sainz, Albon and Alonso returned less than zero.

### Bugs found in the data

- **The stake solver was wrong for 14 of 24 teams.** `pairAwards` in `prep3.mjs`
  worked out a team's worst case by sorting teams on points *descending* and
  handing the biggest championship award to the highest-points team, spending
  25s on teams already clear of the line. To maximise how many teams finish
  above you, the smallest sufficient award goes to the team needing least help,
  which keeps the big awards free for teams below. Every error made the table
  look safer than it was. Fixed 2026-08-12: `pairAwards` is now `countOver`.
  **Only the worst case was affected**; the minimising direction was already
  correct, so every `best` value was right and every `worst` was understated.
  Consequences: Drivetex and East Bay could have gone down (4-8, not 4-7) and
  were playing to stay up, not already safe; Prestissimo, Aggie Slipstream and
  Scuderia could all have finished last. Andrew caught this from memory before
  the code did.
- **`driver_pts` contains both "Andrea Kimi Antonelli" and "Kimi Antonelli"**, splitting 133 cards across two spellings. Merged in the recap pipeline via a local `CANON()`, not fixed at source. This is the exact failure the driver-name section of this file warns about, now sitting in scored data.
- `results.finishing_order` stores only the top 5, but `driver_pts` proves scoring used a full order (Hadjar scored 8 in round 11, which is P6). **So there is no scoring bug** — the persistence is lossy, and positions are recoverable from `driver_pts` rather than from `results`. That resolves the doc/code mismatch noted at the bottom of this file.
- Round 14 is a second "Spanish Grand Prix", at Ifema Madrid. In real 2026 that is the Madrid Grand Prix. It shows in the calendar reveal.

### The stake states, and the stories in them

Six states going into round 11: title 6, must-win 5, win-and-help 6,
win-is-enough 2, already up 1, out of it 4. Eighteen distinct stake+outcome
sentences across the 24 teams. Worth knowing:

- **Every must-win team lost.** Five teams needed one result, none got it.
- **Bronco won 89-68 and went down anyway. Luxor won 75-72 and still didn't go
  up.** Both won the exact match they needed. The consequence differs by
  division, so these are two branches, not one — an early version told Luxor
  they had been relegated out of the Second Division.
- Only TJ Premium had truly nothing at stake: they could neither go up nor
  finish last. Their card says "All good."
- Fairness check: 10 of the 12 best scoring averages are in the new Championship
  Division. El Camino (77.7) and Stalloni (76.8) went down having outscored
  three teams above them, including champions Meatballs (74.5).

### Open — READ THIS FIRST when picking the deck back up

**Andrew is working on this over the weekend of 2026-08-15.** The deck is a
working draft that is already live, which is the awkward part: everything below
is unresolved and 48 people can reach it.

**Andrew's verdict on the current draft: "this needs lots of work."** He named
two things and both are done — headline-first, and the Vegas type being too
small. **The rest of that list was never given.** Ask for it before doing
anything else; guessing one item at a time was already going badly.

Three questions asked and never answered:

1. Card 3 ends on a flat standings line ("You went into round 11 5th in the
   Second Division"). Andrew's own draft had tension there instead: "you and
   your teammate had some work to do in round 11." Should it vary by how much
   was at stake?
2. "You're killing it on **the** midfield" reads off. Keep the articles, or drop
   them so it's "midfield" / "top pool" / "needle"?
3. Card 9's rival label literally says `family` for the nine players with a
   relative in the league. Blunt on the card.

**The deck has never been seen in motion, and it is live.** The flythrough on
card 2, the board travel on cards 5-6, the click reveal on card 4 and the Vegas
flip on card 7 are all unverified. The three smoke suites prove it renders, not
that it looks right. The Chrome extension still will not pair
(`list_connected_browsers` returns empty), so this needs a human at
`f5.andrewishak.com/deck`. `npm run dev` serves on **:5174** when 5173 is taken.

**The pick pages have never been opened since the driver-name refactor either.**
`npm run smoke:drivers` checks the data hard and opens both pages, but their real
data loads from Supabase after the page appears, which does not happen in the
harness. Someone should submit a pick on a phone before round 12.

Everything is merged to `main` and deployed. Production and `main` are the same
commit.

Dropped when the twelve charts were cut, per Andrew: the OVER/UNDER imbalance,
partner agreement, submission timing, driver returns. `prep.mjs` and `prep2.mjs`
still compute all of them. **The OVER/UNDER balance is still live as a rules
decision** even though it is no longer a chart.

**Shelf life.** This is a *first-half* recap and round 12 is next.

### Relationship to the Stories project

The deck is the reference implementation for `~/Projects/stories`, the generic
version of this pattern. Vocabulary settled 2026-08-12: the format is a **story**
(tap-through cards, from Instagram/Snapchat), the genre is a **Wrapped**
(personalised data recap), and gating the app behind it makes it an
**interstitial**. The reusable product is really the config — trigger, audience,
frequency, dismissal — not the cards.

If Stories lands first, this deck should become its first consumer rather than
staying a one-off. Two things here would have to be extracted: the `Card` shell
plus token switching, and the light-to-dark flip partway through a deck.

Not yet solved for a real gate: F5 has no persisted "seen" flag. `?recap` is a
URL anyone can revisit, which is fine for a preview and not enough for gating.
That needs a Supabase column and a write, and this app has no server-side code.

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
