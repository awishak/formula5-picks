# Round 11 recap pipeline

Regenerates `public/recaps/round11.html` from a Supabase export.

```
export F5_DATA=~/Downloads/formula5_data_2026-07-27.json   # or any export
node prep.mjs && node prep2.mjs && node prep3.mjs && node build.mjs && node smoke.mjs
```

| file | does |
|---|---|
| `standings.mjs` | faithful port of `TeamStandings.jsx`. Validated: reproduces the published round-10 preview on all 24 teams. |
| `nobb.mjs` | the same season with BOX BOX optionally deleted, **including the tie-splitting rule**. Leaving that rule out was a real bug; removing the line creates ties it used to break. |
| `prep.mjs` | charts 3, 5, 6, 7, 7b, 8 and the round-10 opening state |
| `prep2.mjs` | the what-ifs and strategy sets, plus the Malaysia calendar row |
| `prep3.mjs` | charts 1 and 2: what each team was playing for going into round 11, and the standings either side of it |
| `build.mjs` | inlines `chart-data.json` into `template.html` |
| `template.html` | the page itself. Edit this, not the built output. |
| `smoke.mjs` | runs charts 1 and 2 headlessly through all 48 viewers. **Run it before any deploy.** |

## What each team was playing for (prep3)

The stake line under chart 1 is solved, not written by hand. Round 11 pays each
division 25-18-15-12-10-8 to that week's six winners in score order and
6-4-2-1-0-0 to the six losers, so a team's award is bounded by whether it won
and everything inside that band is free. That makes the space enumerable
exactly: 32 win/loss configurations for the five other matchups, times the six
awards the team could take, giving the best and worst finish still available.

The result reproduces the storylines already written into the prose: Van City
top and playing for the division, Cascadia needing a big win from tenth, Cal
Aggie needing to beat Peloton. Nothing was tuned to make that happen.

Two things position alone gets wrong, so both are taken from the real outcome:
**Peloton finished fifth and went up** through the swap seat, and **Garra
finished eighth and went down** through it.

## Smoke

`smoke.mjs` compares rendered **content** across viewers, not output length.
The "you" marker moves between a team's two rows without changing the byte
count, so teammates are the same length and differ only in content. Comparing
lengths would score that as a miss. It currently expects 48 distinct renders
from 48 viewers.

Never hand-edit `public/recaps/round11.html`; it is generated and will be overwritten.

Sanity check after any change to the scoring model: `season(true)` must give
XLIX 133 and Meatballs 143. If it doesn't, the model is wrong.
