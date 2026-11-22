# Agent notes

- **מדיניות מיזוג (חובה).** הענף הראשי ( או ) מוגן. אסור למזג PRs ישירות ואסור לדחוף ישירות אליו. פתח PR מענף לולאה ( או ) או dependabot. הלולאות לא ממזגות בעצמן. המיזוג האוטומטי בשרת ( דרך ) רץ רק כאשר סוקר ה-pre-PR ( — Gemini או מודל אחר השונה מהמחבר) אישר בלי בעיות חוסמות, וכל בדיקות GitHub כולל  ירוקות על ה-head הנוכחי, וה-PR הוא MERGEABLE בלי קונפליקט. אין להמתין לאישור מיזוג ידני נוסף. (כלל אבירן 22.11.2026 08:13.)
- **עיצוב.** Build UI minimal and functional; never wait for designs; approved Claude Design packages are applied later as polish.
## Design

Design work should use the trimmed Taste Skill at `.agents/skills/design-taste-frontend`. It is a vendored adaptation of the MIT-licensed [taste-skill](https://github.com/Leonxlnx/taste-skill) (`design-taste-frontend`) from commit [`f6b76575f949707b4e3c37cd86cb44b0b98643e8`](https://github.com/Leonxlnx/taste-skill/commit/f6b76575f949707b4e3c37cd86cb44b0b98643e8). This copy is `SKILL.md`, `LICENSE`, and `UPSTREAM.md`. The upstream asset kit, dealer scripts, and finish gate are not in the repo. Follow the skill's art direction and check the result in a real browser.

The project's existing logo, color palette, and fonts must be preserved:

- Logo: `assets/icon-192.svg` and `assets/icon-512.svg`.
- Palette: the tokens in `css/volt.css` (deep green `#287C42`, warm orange `#D36D00`/`#F7A973`, paper `#F5F8F5`; dark theme `#0B110C` with the same token names). They follow the design approved in Claude Design on 20.11.2026; the screens are styled in `css/shir.css`.
- Fonts in `fonts/fonts.css`: Rubik and Heebo for the interface and numbers, and Gveret Levin only for the home title, short quotes and the praise line.

When the skill would deal a palette, a type pairing, or a mark, keep the logo, palette, and fonts above.

## Modern web

HTML, CSS, and client-side JavaScript work should use the Modern Web Guidance skill at `.agents/skills/modern-web-guidance`. It is the Apache-2.0 [modern-web-guidance](https://github.com/GoogleChrome/modern-web-guidance) skill from commit [`64a6d708f5a43f2cd3fde5d4d7db3905ba1bdf65`](https://github.com/GoogleChrome/modern-web-guidance/commit/64a6d708f5a43f2cd3fde5d4d7db3905ba1bdf65) (v1.0.1). This copy is `SKILL.md`, `LICENSE`, and `NOTICE`. The guide corpus is not in the repo.

Run it with `npx -y modern-web-guidance@latest`. The command works offline and needs no API keys. Follow the skill at the start of HTML, CSS, and client-side JS tasks.
