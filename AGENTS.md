# Agent notes

## Design

Design work should use the trimmed Taste Skill at `.agents/skills/design-taste-frontend`. It is a vendored adaptation of the MIT-licensed [taste-skill](https://github.com/Leonxlnx/taste-skill) (`design-taste-frontend`) from commit [`f6b76575f949707b4e3c37cd86cb44b0b98643e8`](https://github.com/Leonxlnx/taste-skill/commit/f6b76575f949707b4e3c37cd86cb44b0b98643e8). This copy is `SKILL.md`, `LICENSE`, and `UPSTREAM.md`. The upstream asset kit, dealer scripts, and finish gate are not in the repo. Follow the skill's art direction and check the result in a real browser.

The project's existing logo, color palette, and fonts must be preserved:

- Logo: `assets/icon-192.svg` and `assets/icon-512.svg`.
- Palette: the Volt tokens in `css/volt.css` (near-black base, volt-lime `#C6FF3D` as the signature colour; light theme uses the same token names). See `design/README.md`.
- Fonts already loaded in `index.html` and `css/volt.css`: Rubik for Hebrew, Bricolage Grotesque for English words, Heebo, and JetBrains Mono.

When the skill would deal a palette, a type pairing, or a mark, keep the logo, palette, and fonts above.
