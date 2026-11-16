# Agent notes

## Design

Design work should use the Taste Skill at `.agents/skills/design-taste-frontend`. It is the MIT-licensed [taste-skill](https://github.com/Leonxlnx/taste-skill) (`design-taste-frontend`), installed from commit [`f6b76575f949707b4e3c37cd86cb44b0b98643e8`](https://github.com/Leonxlnx/taste-skill/commit/f6b76575f949707b4e3c37cd86cb44b0b98643e8). The license and the upstream pointer live in that folder. The skill asks for real art direction and a check in a real browser, instead of a generic AI landing page.

The project's existing logo, color palette, and fonts must be preserved:

- Logo: `assets/icon-192.svg` and `assets/icon-512.svg`.
- Palette: the Volt tokens in `css/volt.css` (near-black base, volt-lime `#C6FF3D` as the signature colour; light theme uses the same token names). See `design/README.md`.
- Fonts already loaded in `index.html` and `css/volt.css`: Rubik for Hebrew, Bricolage Grotesque for English words, Heebo, and JetBrains Mono.

When the skill deals a palette, a type pairing, or a mark, keep the logo, palette, and fonts above.
