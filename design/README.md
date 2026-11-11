# Design

| | |
|---|---|
| Source | Claude Design project "ShirAmiram App Redesign" — https://claude.ai/design/p/1f22cff8-f908-45a7-83fa-ec074376776e |
| Exported | 2026-11-11, Project HTML archive, unpacked as-is into `shiramiram-2026-11-11/` |
| Direction | Annotated songbook: warm paper, Frank Ruhl Libre headwords over Heebo text, a yellow highlighter for Amiram words, one orange-red accent |

## What the export covers

- `ShirAmiram.dc.html` — clickable 375px phone prototype (Today, Words, Practice hub, Songs, Progress) and a 1280px desktop Home.
- `Design System.dc.html` — colour tokens (light and dark), type scale, spacing, radii and components.
- `support.js` — the Claude Design runtime the two pages need. It loads React and Babel from unpkg.com when a page is opened.

All content in the prototype is placeholder (songs, lyrics, the score of 112 and its bands).

## What is implemented in the app

`css/songbook.css` and `src/ui_shell.js` apply the tokens and components to the existing screens:
light and dark themes, bottom navigation with four destinations, word rows instead of a table on phones,
flashcard, question options, lyric line states and the progress dashboard.

Not implemented yet: the Today home screen, the Practice hub screen and the desktop Home layout from the prototype.
They need new screens wired to app data, not only styling.
