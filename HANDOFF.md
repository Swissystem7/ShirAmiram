# HANDOFF — ShirAmiram

Updated: 2026-11-17 (Claude Code, branch `fix/a11y-biome`)

## Current state
- 17.11: #125 merged (offline player message).
- Branch `perf/lighthouse-lcp-tbt-cls` (decision 32): Lighthouse 12.8.2, local http-server, median of 3 runs.
  - before: mobile 390 perf 39, LCP 9.0 s, TBT 1401 ms, CLS 0.121 / desktop 1280 perf 70, LCP 1.8 s, TBT 200 ms, CLS 0.302
  - after:  mobile 390 perf 64, LCP 9.2 s, TBT 252 ms, CLS 0.027 / desktop 1280 perf 91, LCP 1.8 s, TBT 11 ms, CLS 0.073
  - Changes: reserve #bottom-nav height while empty; opening tab row pre-set in HTML; preload 3 first-screen fonts;
    ui_shell polishes only the visible screen at start (hidden ones in small idle steps or on open); word table built
    on first open. Screens identical to main at 390/1280; 756/756 tests; biome lint 0.
- Not done (needs a decision): mobile LCP. The first paint happens only after all 33 deferred scripts run, so the
  simulated slow network counts ~1.2 MB of scripts and data. Fix = load non-opening-tab scripts after first paint
  (changes script loading and test/script_loading.test.js).

## Next step
- Wait for CI on the PR. Claude Code never merges; the servers merge.

## Rate limits
- None hit.
