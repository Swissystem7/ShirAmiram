# Typography: type scale, fonts, line height and hierarchy

**Status:** proposal, not applied. This PR changes no CSS, HTML or JS. Applying it is a separate PR after Aviran approves.

**Updated 18.11.2026:** this version follows Aviran's reference type system (Frank Ruhl Libre, Heebo and Rubik) and
replaces the first draft of this file. The specimen, the fonts and the tokens are in [`typography/`](typography/).

> **Conflict with `AGENTS.md`:** the repo rules say to keep the app's fonts (Rubik, Bricolage Grotesque, Heebo and
> JetBrains Mono). Frank Ruhl Libre is a new font. That is why it lives only under `design/`, and why applying it
> to the app needs Aviran to change that rule first. Option B below keeps to the rule.

## The reference system

| Role | Font | Weights | Size | Line height |
|---|---|---|---|---|
| Level 1: the one big heading or number on a screen | Frank Ruhl Libre (serif) | 900 | 44 px | 1.08 |
| Level 2: card and section titles | Frank Ruhl Libre | 700 | 19 px | 1.3 |
| Level 3: running text | Heebo | 300 to 700 (400 for text) | 17 px | 1.6 |
| Secondary text and card details | Heebo | 400 | 14.5 px | 1.5 |
| Labels, chips and small numbers | Rubik | 500 | 12 px | 1.4 |

- **Three levels at most:** a display heading, then a card title, then text. Meta and labels support those three;
  they are not extra levels.
- **Generous spacing** on an 8 px rhythm: 8, 16, 24 and 40 px (`--space-1` to `--space-4`).
- **Numbers:**
  - A big number (the score, a time) stays in Frank Ruhl Libre 900.
  - Small numbers use Rubik 500 with `tabular-nums`, so digits don't jump.
- **English words and lyrics:** Frank Ruhl Libre has a Latin set, so an English word set as a heading (as in the
  specimen) uses it too. Bricolage Grotesque is no longer needed in Option A.
- **Fonts:** self-hosted woff2, one variable file per subset (Hebrew and Latin), under the SIL Open Font License.
  - All six files: 156 KB.
  - Frank Ruhl Libre (the only new font): 63 KB.

## What the app uses today (measured)

Measured on `main` @ `c1b7416` with Playwright at 390 px, on the opening screen and on all 10 tabs.

- **64 text styles and 18 font sizes:** 12, 13, 14, 15, 15.2, 16, 17, 18, 19, 20, 22, 24, 26, 28, 30, 44, 46 and 68 px.
- **Body text is 13 px.** That is 19,980 of about 31,000 characters, including meanings, quiz options and tables.
- **15 line heights,** from 0.90 to 2.00.
- **Five weights.**
- **Hebrew headings use the Latin display stack** (Bricolage, then Rubik). They get Rubik only by fallback.

The reference system brings that down to five sizes, two line heights and three levels. Body text goes from 13 to 17
px, which is the UI/UX Pro Max rule of at least 16 px for body text on mobile.

## Mapping from today

| Today | New |
|---|---|
| 13 px and 15 px text (meanings, options, hints) | 17 px Heebo, or 14.5 px for details |
| 12 px, 13 px and 14 px bold labels | 12 px Rubik 500 |
| 15–22 px headings (Bricolage and Rubik) | 19 px Frank Ruhl Libre 700 |
| 24–30 px titles and 44–68 px numbers | 44 px Frank Ruhl Libre 900 |
| English word on a card, 26 px Bricolage 800 | Frank Ruhl Libre 700 at 19 px, or 900 at 44 px on its own card |

## Two options for applying it

- **Option A, the reference.** Add `design/typography/type.css` and its fonts to the app, and add the woff2 files
  to the `sw.js` precache. This needs the `AGENTS.md` font rule changed.
- **Option B, within the repo rules.** Keep the same scale, line heights and three levels, but:
  - headings in Rubik 800/700 (instead of Frank Ruhl Libre);
  - body text in Heebo, which the app already loads;
  - labels in Rubik 500.

  No new font is added.

## Colour palette A: warm paper (chosen 18.11.2026)

Aviran found the Volt colours (near-black with lime `#C6FF3D`) poor and picked palette A out of three options.
It is shown in the specimen only; the app keeps Volt until a separate PR applies it.

| Token | Colour | Use | Contrast (WCAG) |
|---|---|---|---|
| `--page` | `#F3ECE0` | page behind the screens | |
| `--bg` | `#FBF6EE` | screen background (cream) | |
| `--card` | `#FFFFFF` | cards | |
| `--ink` | `#2A1F1A` | text | 14.9 on cream |
| `--muted` | `#6B5D52` | secondary text | 5.9 on cream |
| `--line` | `#EADFCF` | borders | |
| `--accent` | `#C2461F` | main button (coral) | white text 5.0 |
| `--accent-ink` | `#A93B1B` | coral labels and kickers | 5.9 on cream |
| `--chip-bg` / `--chip` | `#DDF1EC` / `#0E5C50` | chips (teal) | 6.7 |

Every text pair passes WCAG AA (4.5:1). The coral is a little darker than in the first sketch (`#D9542F`) because
white on that colour was only 4.0:1. Coral and teal are the two colour tweaks the v2 design README listed as not
yet implemented.

## Files

- [`typography/type.css`](typography/type.css): `@font-face` rules, tokens and role classes (`.t-display`,
  `.t-title`, `.t-body`, `.t-meta`, `.t-label`, `.t-num`).
- [`typography/fonts/`](typography/fonts/): woff2 files, the OFL licences, and a local `_typos.toml` so that
  spell-checking skips the binary files.
- [`typography/specimen.html`](typography/specimen.html): the system on two ShirAmiram screens, in colour
  palette A (below).
- `typography/specimen-375.png`, `specimen-390.png` and `specimen-1280.png`: screenshots. There is no horizontal
  scroll at any width.

Plugins used: `frontend-design` (Anthropic) and `ui-ux-pro-max`. From ui-ux-pro-max: body line height 1.5–1.75,
body text at least 16 px on mobile, and one consistent scale.

## Status and next step

- **Done:** the measurement, the reference system, the specimen and the fonts (branch `design/typography-scale`).
- **Next:**
  1. Aviran chooses A or B.
  2. One PR moves the 110 `font-size` declarations in `css/volt.css` onto the tokens, with before-and-after
     screenshots at 375, 390 and 1280.

  `check:size` stays untouched.
