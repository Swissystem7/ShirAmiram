# שיראמיר״ם: design preview (redesign)

Open [`index.html`](index.html) in a browser. The button at the top switches between light and dark;
`?theme=light` or `?theme=dark` pins a theme.

**The idea:** the page is a lyric sheet. A full-bleed colour field holds the hero, the song is set as a poster, and the new words are marked inside the lyrics.

- Colours: role tokens only, in [`tokens/tokens.css`](tokens/tokens.css) (light and dark, WCAG AA checked).
  The same tokens are in `tokens/tokens.dtcg.json` and `tokens/tailwind.tokens.cjs`.
- Type: Gveret Levin for the hero and the short quote only; Heebo for body and subheads (700); Rubik for numbers.
  Fonts are self-hosted in [`fonts/`](fonts/) (SIL OFL 1.1, licences next to the files).
- Motion: a bar runs under the word being sung, in time with the line. Opening a word and answering the quiz show what changed. Turned off under `prefers-reduced-motion`.

Screenshots (390 px and 1280 px, light and dark) are in [`screenshots/`](screenshots/).
Preview only: nothing here changes the live app.
