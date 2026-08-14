# Recap data pipeline

Builds `src/recapData.json`, the 48 personalised decks behind `/deck`.

```
export F5_DATA=~/Downloads/formula5_data_2026-07-27.json   # or any export
node prep.mjs && node prep2.mjs && node prep3.mjs && node cards.mjs
npm run smoke:recap                                        # from the repo root
```

`cards.mjs` reads `chart-data.json`, so the three preps have to run first.

| file | does |
|---|---|
| `standings.mjs` | faithful port of `TeamStandings.jsx`. Validated: reproduces the published round-10 preview on all 24 teams. |
| `nobb.mjs` | the same season with BOX BOX optionally deleted, **including the tie-splitting rule**. Leaving that rule out was a real bug; removing the line creates ties it used to break. |
| `prep.mjs` | season-wide sets: scoring averages, driver returns, pit and best-finish rates |
| `prep2.mjs` | the what-ifs and strategy sets, plus the Malaysia calendar row |
| `prep3.mjs` | what each team was playing for going into round 11, and the standings either side of it |
| `cards.mjs` | **the deck.** One entry per player: rank, six-component breakdown, stake and outcome, contenders. Writes `src/recapData.json`. |

## What each team was playing for (prep3)

The stake line is solved, not written by hand. Round 11 pays each division
25-18-15-12-10-8 to that week's six winners in score order and 6-4-2-1-0-0 to
the six losers, so a team's award is bounded by whether it won and everything
inside that band is free. That makes the space enumerable exactly: 32 win/loss
configurations for the five other matchups, times the six awards the team could
take, giving the best and worst finish still available.

**The solver was wrong for 14 of 24 teams until 2026-08-12.** `pairAwards`
worked out a worst case by sorting teams on points descending and handing the
biggest award to the highest-points team, which spends 25s on teams already
clear of the line. To maximise how many teams finish above you, the smallest
sufficient award goes to the team needing least help, keeping the big awards
free for teams below. Only the worst case was affected, so every `best` was
already right and every `worst` was too optimistic. It is now `countOver`.

Two things position alone gets wrong, so both are taken from the real outcome:
**Peloton finished fifth and went up** through the swap seat, and **Garra
finished eighth and went down** through it.

## Sanity checks

After any change to the scoring model, `season(true)` must give XLIX 133 and
Meatballs 143. If it does not, the model is wrong.

After any change to `cards.mjs`, its own output should still report 48 decks,
league PPR 37.7, and 10 of 12 best averages in the top flight.

## History

This directory used to build a twelve-chart scroll page at
`public/recaps/round11.html` from a `template.html`. That was replaced by the
card deck on 2026-08-12 and the page, its template, its builder and its own
smoke script were deleted. The prep scripts survived because the deck needs the
same numbers. Everything is in git history if the old page is ever wanted back.

Findings that were charted there and are not in the deck: the OVER/UNDER
imbalance, partner agreement, submission timing, and driver returns. `prep.mjs`
and `prep2.mjs` still compute all of them.
