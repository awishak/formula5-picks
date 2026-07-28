# Round 11 recap pipeline

Regenerates `public/recaps/round11.html` from a Supabase export.

```
export F5_DATA=~/Downloads/formula5_data_2026-07-27.json   # or any export
node prep.mjs && node prep2.mjs && node build.mjs
```

| file | does |
|---|---|
| `standings.mjs` | faithful port of `TeamStandings.jsx`. Validated: reproduces the published round-10 preview on all 24 teams. |
| `nobb.mjs` | the same season with BOX BOX optionally deleted, **including the tie-splitting rule**. Leaving that rule out was a real bug; removing the line creates ties it used to break. |
| `prep.mjs` | charts 1, 3, 4, 5, 5b, 6 and the round-10 opening state |
| `prep2.mjs` | the what-ifs and strategy sets, plus the Malaysia calendar row |
| `build.mjs` | inlines `chart-data.json` into `template.html` |
| `template.html` | the page itself. Edit this, not the built output. |

Never hand-edit `public/recaps/round11.html`; it is generated and will be overwritten.

Sanity check after any change to the scoring model: `season(true)` must give
XLIX 133 and Meatballs 143. If it doesn't, the model is wrong.
