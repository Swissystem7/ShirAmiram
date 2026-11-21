# Agent notes

## Design

**UI design comes only from Claude Design and is implemented as-is, without changes.**

Design work should use the trimmed Taste Skill at `.agents/skills/design-taste-frontend`. It is a vendored adaptation of the MIT-licensed [taste-skill](https://github.com/Leonxlnx/taste-skill) (`design-taste-frontend`) from commit [`f6b76575f949707b4e3c37cd86cb44b0b98643e8`](https://github.com/Leonxlnx/taste-skill/commit/f6b76575f949707b4e3c37cd86cb44b0b98643e8). This copy is `SKILL.md`, `LICENSE`, and `UPSTREAM.md`. The upstream asset kit, dealer scripts, and finish gate are not in the repo. Follow the skill's art direction and check the result in a real browser.

The project's existing logo, color palette, and fonts must be preserved:

- Logo: `assets/icon-192.svg` and `assets/icon-512.svg`.
- Palette: the tokens in `css/volt.css` (deep green `#287C42`, warm orange `#D36D00`/`#F7A973`, paper `#F5F8F5`; dark theme `#0B110C` with the same token names). They follow the design approved in Claude Design on 20.11.2026; the screens are styled in `css/shir.css`.
- Fonts in `fonts/fonts.css`: Rubik and Heebo for the interface and numbers, and Gveret Levin only for the home title, short quotes and the praise line.

When the skill would deal a palette, a type pairing, or a mark, keep the logo, palette, and fonts above.

## Modern web

HTML, CSS, and client-side JavaScript work should use the Modern Web Guidance skill at `.agents/skills/modern-web-guidance`. It is the Apache-2.0 [modern-web-guidance](https://github.com/GoogleChrome/modern-web-guidance) skill from commit [`64a6d708f5a43f2cd3fde5d4d7db3905ba1bdf65`](https://github.com/GoogleChrome/modern-web-guidance/commit/64a6d708f5a43f2cd3fde5d4d7db3905ba1bdf65) (v1.0.1). This copy is `SKILL.md`, `LICENSE`, and `NOTICE`. The guide corpus is not in the repo.

Run it with `npx -y modern-web-guidance@latest`. The command works offline and needs no API keys. Follow the skill at the start of HTML, CSS, and client-side JS tasks.

## Commands

Install, lint, build, and test commands below are taken from `package.json`, `package-lock.json`, and `biome.json`. If a step is listed as **none defined**, skip it and do not invent a command.

| Step | Command | Notes |
|---|---|---|
| Install | `npm ci` | `package-lock.json` is present (lockfileVersion 3). There are no production `dependencies`. devDependencies include Tailwind CSS, knip, and size-limit. |
| Lint | none defined | There is no lint script in `package.json` (`check:style` is not defined). A `biome.json` file is present with `$schema` `https://biomejs.dev/schemas/2.6.7/schema.json`, but `@biomejs/biome` is **not** listed in `package.json` or `package-lock.json`. Related existing checks (not a lint runner): `npm run check:css`, `npm run check:html`, `npm run check:deadcode`, `npm run check:size`, `npm run check:reachability`, `npm run check:assets`, `npm run doctor`. |
| Build | `npm run build:css` | Runs Tailwind (`tailwindcss -c tailwind.config.js -i css/tailwind.src.css -o css/tailwind.css --minify`). After changing classes in `index.html`, `app.js`, or `src/`, rebuild `css/tailwind.css`. `npm run check:css` fails if that file is stale. |
| Test | `npm test` | Runs `node --test test/*.test.js`. The README also documents `python scripts/mobile_ui_check.py` (Playwright responsiveness) — that is a Python script, not an npm test script. |

Before opening a PR, run every lint, build, and test command that exists in the table above.

## Folder structure

- `index.html`, `app.js`, `sw.js`, `manifest.json` — app entry points at the repo root.
- `src/` — feature modules (vocab, quiz, SRS, karaoke, speech, analytics, and related files), as loose files directly under `src/`.
- `css/` — `shir.css`, `volt.css`, `style.css`, `tailwind.src.css`, and the generated `css/tailwind.css`.
- `fonts/`, `assets/`, `data/`, `design/`.
- `test/` — Node test suite (`test/*.test.js`).
- `scripts/` — HTML/CSS/asset checks, doctor, and some Python helpers.
- `.agents/skills/` — vendored design-taste and modern-web skills.
- `README.md`, `HANDOFF.md`, this file.

## Style

- Tailwind is the CSS build (`tailwind.config.js`, `css/tailwind.src.css` → `css/tailwind.css`). Preserve the Claude Design tokens and fonts listed in the Design section; implement UI design as-is.
- `biome.json` exists (`$schema` 2.6.7). It includes `**` and excludes `css/tailwind.css` and `design/`. One override turns off `suspicious.noUnknownAtRules` for `css/tailwind.src.css`. Because `@biomejs/biome` is not a package dependency and there is no npm lint script, do not invent a Biome command.

Match the surrounding file when editing JavaScript and HTML.

## Rules

- **UI design** comes only from Claude Design and is implemented as-is, without changes.
- **Before opening a PR**, run lint, build, and test locally (skip any step listed as none defined; do not invent commands).
- **Never** touch `.github/workflows` or any merge mechanism, auto-merge, or merge scripts. **Never** push to `master` or `main`. Do not merge pull requests and do not enable auto-merge.
