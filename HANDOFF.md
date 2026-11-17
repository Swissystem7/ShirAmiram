# HANDOFF — ShirAmiram

Updated: 2026-11-17 (Claude Code, branch `fix/a11y-biome`)

## Current state
- 17.11: #123 merged (self-hosted fonts).
- Branch `feat/song-link-embed`: paste a YouTube/Spotify link or ID on the songs screen and it plays in the
  existing player. Parser src/media_links.js (YouTube watch/youtu.be/shorts/embed/live/music/playlist with start
  time; Spotify track/album/playlist incl. /intl-xx/ and /embed/; spotify: URIs; bare IDs), no API keys.
  test/media_links.test.js (7 tests). Form above the player with the screen's existing classes; iframe built
  with createElement from validated IDs. sw.js precaches the module; cache v11 -> v12.
- Checked: npm test 755/755, biome lint 0, Playwright 390/1280 (19 checks each incl. bad/HTML input), other
  screens unchanged.

## Next step
- Wait for CI on the PR. Claude Code never merges; the servers merge.

## Rate limits
- None hit.
