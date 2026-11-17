# HANDOFF — ShirAmiram

Updated: 2026-11-17 (Claude Code, branch `fix/a11y-biome`)

## Current state
- 17.11: #124 merged (paste a YouTube/Spotify link to play it).
- Branch `fix/embed-offline`: with no network the player iframe showed the browser's offline page and the status
  said "מנגן למטה". Now, when navigator.onLine is false, the song-card button and the pasted-link form show a
  short message in the player box; the pasted-link status keeps the open link for later. No console errors.
- Embed hosts blocked while online: the frame shows the browser's "blocked" page (cross-origin, the page cannot
  detect it); the "פתיחה ב-…" link under the form stays as the fallback. No console errors. No change made.
- Lighthouse 12.8.2 (local http-server): 390 mobile perf 49 / a11y 100 / best practices 100;
  1280 desktop perf 79 / a11y 100 / best practices 100; 0 console errors. Perf left as is (out of scope):
  mobile LCP 8.8 s, TBT 810 ms; desktop CLS 0.302.

## Next step
- Wait for CI on the PR. Claude Code never merges; the servers merge.

## Rate limits
- None hit.
