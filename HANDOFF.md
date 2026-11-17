# HANDOFF — ShirAmiram

Updated: 2026-11-17 09:4x (Claude Code, branch `claude/alias-game`, PR #108)

## Current state
- PR #108: Alias word game. Solo Guess + Explain mode (EN and HE, taboo words, party -1). Done and tested
  (npm test 744/745 - the one failure is the CRLF hash test on Windows only; Playwright 375/390/1280).
- Biome: 0 errors in index.html, alias_ui.js, alias_engine.js, ui_shell.js.
- main merged into the branch on 17.11 (conflicts in volt.css, index.html, ui_shell.js resolved by keeping both sides).
- Not merged. Merge only when Gemini (tools chat) says so and CI is green.

- 17.11 (coordinator order): the 7 game choices (mode, language, deck) are native radios in fieldsets instead of
  `<button role="radio">` (Biome lint/a11y/useSemanticElements). Look unchanged; keyboard arrows work.

## Known blockers
- `dell-ci/full-gate` fails on every PR: Biome errors in ~18 older files on main, and "lcov missing"
  (npm test produces no coverage file). Needs a decision from Aviran.
- PR #109 (another worker) fixes the same forEach lint lines in index.html as commit 0f2ff17 here.

## Next step
- Wait for `ci` and `dell-ci/full-gate` on PR #108. The GitHub agent merges, not Claude Code.
- After that (coordinator order): a NEW ShirAmiram PR for #btn-play, #timer, #mini-player and favicon.

## Rate limits
- None hit in this session.
