# HANDOFF — ShirAmiram

Updated: 2026-11-17 (Claude Code, branch `fix/a11y-biome`)

## Current state
- Branch `fix/a11y-biome` (from main 9d0a99f). Biome 2.6.7 (`biome.json` schema version):
  - index.html: 0 errors (was 23). 11 role="group"/labelled divs -> fieldset.ui-group, #timer role="timer",
    scoreboard <section>, aria-hidden decorative SVGs, default heading text, label for=, captions <track>.
  - src, test, scripts, assets: 0 errors (68 `var` in blocks -> `let`; forEach bodies; duplicate key; icon <title>).
  - `biome lint` on the whole repo: 132 errors left, all in design/ (Claude Design exports).
- Visual check: Playwright screenshots of all 10 screens at 390 and 1280 before/after; only the quiz question
  differs (it rotates by time). npm test 746/748; the 2 failures also fail on main in a Windows CRLF checkout.

## Needs a decision (coordinator / Aviran)
1. design/*.dc.html + support.js (132 lint errors): edit the exported prototypes (button type, key handlers,
   lang, == in Claude Design's runtime) or exclude design/ in biome.json.
2. `biome check` formatting: the repo was never formatted with Biome defaults (tabs, quotes). Almost every file
   "needs formatting" even on a clean LF checkout. Options: format the whole repo (huge diff), set formatter
   options in biome.json to match the current style, or keep the gate on `biome lint`.

## Next step
- Wait for CI on the PR. Do not merge (the GitHub agent merges after Gemini's say-so).

## Rate limits
- None hit.
