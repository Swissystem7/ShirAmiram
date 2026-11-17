# HANDOFF — ShirAmiram

Updated: 2026-11-17 (Claude Code, branch `fix/a11y-biome`)

## Current state
- 17.11: #120 merged (index.html, src, test: 0 Biome errors).
- Branch `chore/biome-ignore-design`: biome.json ignores `design/` (Claude Design exports), per Gemini tools
  decision 17.11 16:06 (no fixes in design/, no repo-wide formatting, gate stays lint-only).
  `biome lint` (@biomejs/biome 2.6.7) on the whole repo: 0 errors.

## Next step
- Wait for CI on the PR. Do not merge (the GitHub agent merges after Gemini's say-so).

## Rate limits
- None hit.
