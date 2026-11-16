---
name: design-taste-frontend
description: >-
  Trimmed vendored adaptation of tasteskill 2.5.1 (design-taste-frontend).
  Art direction for a page that looks made for this client: plain copy, one
  system, one section per screen, equal edges, real photographs and real
  product UI, quiet motion, and a check in a real browser. The upstream asset
  kit, dealer scripts, and finish gate are not in this copy. Use when you
  build, design, redesign, restyle, polish, or review a page, or when a page
  looks generic, templated, or AI-made.
---

# tasteskill 2.5 — trimmed adaptation

This folder is a **trimmed vendored adaptation** of
[Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill)
`skills/taste-skill` at commit `f6b76575f949707b4e3c37cd86cb44b0b98643e8`
(tasteskill 2.5.1, skill name `design-taste-frontend`).

Copyright (c) 2026 Leonxlnx. MIT license: `LICENSE`. Commit pointer: `UPSTREAM.md`.

Kept here: this `SKILL.md`, `LICENSE`, and `UPSTREAM.md`.

Left out on purpose: `assets/`, `scripts/`, `library/`, `references/`, demos,
photographs, icons, shaders, UI fragments, starter pages, and the Stop hook
that ran `scripts/gate.mjs`. Do not recreate that kit inside the app, and do
not fetch it as a new dependency. The rules below are the whole local skill.
Where the upstream text named a script or a reference file, this copy says
what to do instead.

In this repository, `AGENTS.md` fixes the logo, the color palette, and the
fonts. Follow that over any step that would deal a new mark, palette, or
type pairing.

Build the page a good company would ship: it says plainly what is sold, shows
the real thing on every screen, and looks made for this client, not from a
template and not like an art piece. figma.com and x.ai are the bar.

## House rules

These nine win over everything else in this skill.

1. **No caption or description under any image, render, or visual.** Licence credits go in one footer line.
2. **Every visual renders, never an empty ground,** at 1440, 1024, 768, and 390.
3. **One section per screen:** the hero alone on the first screen, every section exactly one or two screens tall at 1440x900, no second section heading peeking in. The one exception is a live photo-chapter section, three or four screens.
4. **Equal left and right content edges.**
5. **Hover micro-animations:** a linked card lifts 2px, a photo zooms 1.02–1.03 inside its frame, buttons step on hover and press on click, underlines draw, card loops cycle in 2.5–4 s, repeat and restart on hover. No tilt, carousels, or timed tabs. Every hero enters once on load, and every page carries one moment, two on a long page.
6. **More and better real photographs where they fit;** nicer backgrounds; better heroes and layouts. In this repository the existing fonts stay.
7. **Real full-colour icons** (a known product's real icon, never a drawn look-alike); small diagram visuals in cards where the page is technical (a hub with branches; one input, a main processor, three parallel lanes).
8. **Scenes and shader effects only where the subject is technical** (tech, AI, developer tools, gaming, fintech, hardware). A cafe, bakery, guesthouse, or shop gets photographs. Every page still gets its one or two moments; off tech those are photo- and type-led.
9. **Addresses:** street and district only (no street given: the district), no house number, postcode, or coordinates; no register or VAT numbers; no phone in a real format; contacts on `.example`.

## 1. The kind of business decides everything

Write the kind on the plan's first line and declare it on the page: the page type on `<html data-type>` and `<meta name="page-type">` (the same value), and `<meta name="site-kind">`. A place also sets `<meta name="page-kind" content="place">`.

| Brief | page type | site-kind | kind |
|---|---|---|---|
| App, SaaS, AI, developer tool, fintech or banking app, a studio selling its own software | software | software | software |
| A game, a studio launching its game | software | gaming | gaming |
| Hardware or a tech device (a drone, a robot arm, a keyboard) | product | tech | tech |
| Any other physical product or brand (a chair, a bike, coffee beans sold online) | product | other | product |
| People are hired: clinic, law firm, agency, creative studio, trade | service | other | service |
| People come to it: cafe, bar, bakery, restaurant, guesthouse, small hotel, shop, florist, bike shop, gym, local studio | place | other | place |

A maker that also opens its door or teaches (a ceramics studio, a bakery with a web shop) is a **place**; its web shop becomes the goods section. It is a product only when nothing happens at the door.

"Tech" below means site-kind software, gaming, or tech. "Other" is everything else. Effects, scenes, loops, animated counts, decorative grounds, dark pages, and dark heroes are tech only. An other page is photographs, flat colour, type, real icons, the hero's entrance, its photo- or type-led moment, and the hover layer.

## 2. The page plan by kind

- **Place** (a cafe, bakery, guesthouse, shop). Photographs lead: 12 to 20 on the full page, 8 to 12 compact, under 8 frames the 3-screen short page. No client photographs: use clearly credited stand-ins of the same kind of place, and say so in the report. The hero is a photograph whenever a frame fits (a remote place: its region's landscape). Screen two is the visit. Then the offer, the place, orders or booking. The offer and the place use different compositions, never two sections round one picture. One type moment (the address or name set large). One main action a screen. List text 16px. Flat grounds, square photographs, one button style. No effect, decorative ground, loop, UI fragment, diagram, or tab.
- **Product and service** (site-kind other). Photographs lead: the product, the people, the rooms, the work, two or more a screen on a product page. Real icons for the tools a studio uses. One still diagram at most. Flat grounds and one brand band. No shader, grain, gradient scene, or loop. WebGL only for a product render the brief asks for. A physical product with no photographs is shown with stand-in photographs of the same kind of thing, each listed in the report. A render only when the brief asks for 3D. Never a drawing, mood stock, or a set of props.
- **Every product page:** the product **big** where it stands whole, never mid-size in a grey rounded panel on a grey ground. **A different picture each section**, never one view twice. **Every headline promise pictured.** No structure twice. One contrasting ground. The swatch changes the picture, every colour shown once. **No fact twice.** Buttons step and press (rule 5).
- **Tech** (software, gaming, hardware). The client's own subject leads at true size. Software: its own UI as live HTML showing what it works on (a code-review tool: a red and green diff with its Accept action), never a generic dashboard. Hardware: its photographs, else stand-in photographs of its kind. A render only when the brief asks for 3D. A game: its name in the h1, a launch line, its world as full-bleed key art. **60 to 80 words a screen** outside UI mocks. One effect and one or two moments, in their own sections. Four live WebGL contexts at most. No card that moves with the scroll.
- **One object never carries the page.** The product or hero object leads the hero and **two more sections at most**. Another kind of visual the brief supports carries the rest.
- **The client's own assets get slots.** A trailer, key art, screenshots, CAD renders, or a motion video the brief names each get a frame that reads finished now. Name the client's file in a comment. Never leave the frame empty.

## 3. One system

One button pair, one card style, one radius scale, one link look, one heading scale. Two boxes of nesting at most. Tokens, type, and colour come from the project (`AGENTS.md`), not from a dealt palette or a new font.

Forms: visible labels, the error under its own field, a confirmation only after a real send. Head: `lang`, title, description, and share tags. A skip link is the first Tab stop, and its focus ring is visible.

## 4. The run

0. **The stack.** Build in the project's existing pages, CSS, and components. Do not add an upstream starter page or an `assets/` kit.

1. **Read the brief.** Write down the kind (section 1), what is sold, who buys it, the one main action (Book a room, Order a cake, Start a free trial; a place with neither: Get directions), and the real material: logo, screens, photographs, prices, address, hours.

2. **Write all the copy first.** The h1 names the category and the buyer or the place (a game: its name and genre). One hard fact on the first screen. A noun in every heading. Buttons are a verb and an object. Nothing is invented but a coined brand name, searched first, with the result kept beside the page. On a place, plausible hours and prices are each marked as assumed.

3. **Plan the page as screens.** Line 1: the kind. Then one line per section: its id, its one idea, its picture, and its kind (object, use, parts, world, slot, diagram, type; three object lines at most), and its screens (1 or 2). Say which section holds the moment and why it moves. On tech, also name the single effect or scene. Pick photographs now. Their count, stand-ins included, sets a place's length (section 2).

4. **Use the client's brand.** Keep the logo, palette, and fonts named in `AGENTS.md`. Do not deal a replacement palette, type pairing, or mark. Radius stays whatever the project already uses. Record the plan in a comment at the top of the page and build that plan.

5. **Build.** Every section is one idea, heading first, equal left and right edges. Rewrite every name, number, and logo to the client's. A stand-in photograph is credited in the one footer line and listed in the report. Contacts follow rule 9.

6. **Check in a real browser.** Open the page over http (not `file://`) and look at it at 1440, 1024, 768, 390, and 320. Walk the checklist below. Fix what fails, then look again. This copy has no headless checker, copy linter, screenshot script, or finish gate, so the browser pass is the check. Read the copy aloud.

7. **Report.** Kind, what you checked and at which widths, what you could not check, every assumed fact, every stand-in frame, every client slot still waiting on a real file, and anything still open.

## 5. Checklist

Check each line by looking at the live page.

- **First screen:** says what is sold, for whom or where, with one hard fact. The hero fills it alone at every width, and its main button sits inside it.
- **One section per screen:** every section is 1 or 2 screens, its heading first and top-aligned. No neighbour's heading or picture in its tile. Nothing sparse, no section half empty.
- **Equal edges:** every block on the content edges or the grid's columns. Nothing out to one side. No sideways scroll.
- **Every visual draws** at 1440, 1024, 768, and 390. A refused effect shows a still fallback.
- **No caption** explains, apologises for, or labels a picture. Credits sit in one footer line. No placeholder, sample note, or printed `.example` address.
- **The right things for the kind:** outside tech, no effect ground or scene, only the photo- or type-led moments. The subject itself shows: the product big and whole in three sections at most, a new picture each. Each asset the brief names is in its slot. A game's name and its world read as key art. Real photographs where they fit, none twice. Real icons in their own colours. Flat grounds on other pages. A place uses two different compositions and one type moment.
- **Motion:** every button, link, linked card, and linked photograph answers the pointer. Nothing tilts. The hero enters once on load. One or two moments. Card loops cycle in 2.5–4 s. Nothing moves because the page scrolled, except a moment inside its own section or, on tech, the one scene. Anything moving past 5 s has a pause button. Under reduced motion everything rests and nothing stays hidden. At most four live WebGL contexts.
- **Contacts** as rule 9. Get directions only with a street. "See the area" with a district. No map link with a town only.
- **Keyboard and head:** every control named, alt on pictures, labels you can see, headings one level at a time, no tabindex above 0. Tab reaches the skip link first. The menu button says its state. `lang`, title, description, and share tags are set.
- **One system:** one button pair, one card style, one radius scale, one link look. Two boxes deep at most. One heading scale, and its faces are the ones the project already loads. Text contrast holds.
- **Copy and links:** headings name things, buttons a verb and an object, at most two hero actions. One action twice a screen at most. A heading's grey half is its own sentence. One fact, one wording. Assumed facts are marked. Every link lands. Forms send. A confirmation only after a real send. Each error sits under its own field. No slop word, stock line, leftover, or device used as a tic.
- **Fast:** images stay light, few moving contexts, no layout jump.
- **820, 768, 390, and 320:** sections stay on their screens. On a phone nothing lies on anything else or under a fixed bar. Every link and control outside running text is 44px tall, and targets are not piled on each other. Nothing past the screen at 320. The first screen ends whole or on a clear bleed. Splits stack text first. One column at 390, buttons full width, a full-screen menu.
- **Your eyes:** beside the figma.com and x.ai frames it reads as a professional company site. Nothing tilted, staggered, cut, or overlapping. The hero is the work, not a mood.

## 6. Never

- A card, row, or tile that fades in on scroll. A fade-in on every section. Parallax on text. Scroll-jacking. Random blinking.
- Stock photographs passed off as the client's product, people, or place. A stand-in is listed in the report as one, and never shown with another maker's name or logo. A product page that never shows the product.
- A drawn look-alike of a real logo. Invented reviews, quotes, customers, or figures.
- Violet or lavender in the page's own design: accent, ground, gradient, effect colour, or tint. A real third-party logo keeps its own colours.
- Copying a reference site's code, copy, pictures, or signature effect.
- Adding the upstream asset kit, dealer scripts, or checker into the app to force a pass.

## What this copy cannot run

The upstream commit ships a browser finish gate, a copy linter, palette and type dealers, a photograph and icon resolver, and the asset library those tools read. None of that is in this folder. An agent follows the rules above and checks the page in a real browser. It cannot claim `GATE: PASS`.
