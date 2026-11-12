# Design

| | |
|---|---|
| Source | Claude Design project "ShirAmiram App Redesign" — https://claude.ai/design/p/1f22cff8-f908-45a7-83fa-ec074376776e |
| Current | v2 "Volt", exported 2026-11-12, Project HTML archive, unpacked into `shiramiram-2026-11-12/` |
| Direction | Dark-first, near-black base with one volt-lime signature colour (primary action, active nav item, current lyric chip, score). Song covers carry the rest of the colour. Rubik for Hebrew, Bricolage Grotesque for English words. Light theme uses the same token names. |
| Previous | v1 "Annotated songbook", exported 2026-11-11, kept in `shiramiram-2026-11-11/`. The owner rejected it; it is no longer used by the app. |

## What the v2 export covers

- `ShirAmiram v2.dc.html` — clickable 375px phone prototype: Songs (album-art hero and cards), Lyrics with tappable word chips,
  Words as level-coded cards, Practice hub with flashcards, quiz and reading, Progress with score ring, streak and level bars.
  A mini now-playing bar and a floating four-tab navigation stay on every screen.
- `Design System v2.dc.html` — colour tokens for dark and light, type scale, radii, shadows and components.
- `support.js` — the Claude Design runtime the pages need. It loads React and Babel from unpkg.com when a page is opened.

All content in the prototype is placeholder (12 sample words, invented songs and lyrics, the score of 112).

## What is implemented in the app

`css/volt.css` and `src/ui_shell.js` apply the v2 tokens and components to the existing screens:
dark (default) and light themes, floating bottom navigation with four destinations, word cards instead of a table on phones,
album-art covers on the song list, lyric lines with word chips, large quiz answers, flashcards and the progress dashboard.

Not implemented yet, because they need new screens or behaviour wired to app data, not only styling:
the album-art hero for today's song, the persistent mini now-playing bar, the word sheet opened from a lyric chip,
the Practice hub screen, the score ring and streak week on Progress, and the signature-colour tweaks (coral, aqua).
