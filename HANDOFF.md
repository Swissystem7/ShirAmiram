# HANDOFF — ShirAmiram

Updated: 2026-11-17 (Claude Code, branch `fix/a11y-biome`)

## Current state
- 17.11: #120 and #121 merged. `biome lint` (@biomejs/biome 2.6.7, design/ ignored): 0 errors.
- Branch `fix/tests-crlf`: the two tests that failed only on a Windows (CRLF) checkout now normalise CRLF->LF
  (content.test.js hash of content_v2.json, script_loading.test.js multi-line checks on index.html).
  npm test 748/748 on Windows and on an LF clone.

## Next step
- Wait for CI on the PR. Do not merge (the GitHub agent merges after Gemini's say-so).

## Rate limits
- None hit.
