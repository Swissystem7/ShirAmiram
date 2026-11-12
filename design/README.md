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

`css/volt.css` and `src/ui_shell.js` apply the v2 tokens, components and screens on top of the existing app logic:

- Dark (default) and light themes, floating bottom navigation with four destinations.
- Songs opens on today's song: album-art hero with progress and a play button, lyrics with word chips below it.
- A mini now-playing bar above the navigation on every other screen.
- Practice hub leading to flashcards, sentence completion, restatements and reading comprehension.
- Words as level-coded cards on phones; drawn icons instead of emoji.
- Progress with a score ring, metric tiles and level bars.
- The song library keeps the catalogue up front and folds the import and export tools into "advanced tools".

The hero title "Hold the Light" is a display name for the app's built-in original lyrics; change it in `index.html` if the song gets a real name.

Not implemented yet: the word sheet opened from a lyric chip (the existing inline translation box is used instead),
the streak week on Progress (the app does not keep a daily streak), album cards for recommendations on the first screen,
and the signature-colour tweaks (coral, aqua).
