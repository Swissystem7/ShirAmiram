# HANDOFF — ShirAmiram

Updated: 2026-11-17 (Claude Code, branch `fix/a11y-biome`)

## Current state
- 17.11: #122 merged (748/748 tests on Windows and CI).
- Branch `feat/self-host-fonts`: no more Google Fonts. fonts/ holds the 20 woff2 files Google served for the
  old css2 link (same subsets), fonts/fonts.css with the same 76 @font-face rules, and OFL-*.txt for the four
  families. sw.js precaches them; cache v10 -> v11. Checked: screenshots of 10 screens at 390/1280 identical
  to the Google Fonts version (only the time-rotated quiz question differs); offline with the service worker
  every request is served locally, no console errors. 748/748 tests, biome lint 0.
- Note: `npm run check:size` already fails on main (index.html, src/*.js, css/* over their limits); this
  branch does not add to it (fonts.css lives in fonts/, index.html got smaller).

- 17.11 17:07: dell-ci/full-gate failed on `typos` (51 false positives inside the binary .woff2 files).
  Added `_typos.toml` with `extend-exclude = ["fonts/"]` (coordinator decision). Local typos 1.52.2:
  0 hits under fonts/, also with --binary.

## Next step
- Wait for CI on the PR. Claude Code never merges; the servers merge.

## Rate limits
- None hit.
