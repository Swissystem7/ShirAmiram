# ShirAmiram Phase 2 Implementation Plan: Polish, Media & Popular Song Memory Agent

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform ShirAmiram into an engaging, polished, mobile-first learning application with comprehensive vocabulary, real YouTube/Spotify media playback, a popular-song lyric memory engine for weak words, dual-track karaoke finale, and deep UI redesign.

**Architecture:** Pure vanilla JavaScript modules with UMD exports for seamless browser + Node test execution; zero external runtime bundlers; modular audio/media managers (YouTube IFrame API, Spotify Embed API, Web Audio synthesizer fallback); an embedded catalog of well-known popular songs cross-referenced with the Amiram vocabulary; glassmorphism design system in modern CSS/Tailwind.

**Tech Stack:** JavaScript (ES2022 / UMD), HTML5 Web Audio API, YouTube IFrame Player API, Spotify Embed Controller API, Web Speech API (TTS), Node.js native test runner (`node --test`), Tailwind CSS 3.4.

---

## Global Constraints
- Preserve documentation and existing functionality.
- All existing 215 tests must remain 100% green at all times.
- Never mutate locked historical files (`data/imports/content_v2.json`, `data/imports/amiram_vocab_full.json`).
- Touch targets must be >= 44px on mobile with zero horizontal overflow (`overflow-x: hidden`).
- All user-facing communications with Aviran must be in Hebrew (`hebrew-updates`).

---

## Milestones Overview

1. **Milestone 1 — Comprehensive Vocabulary Expansion & Sync**
   - Ensure the full 300+ academic Amiram vocabulary dataset is completely integrated into the primary app runtime and searchable/filterable across all levels (A, B, C) and parts of speech.
   - Add enrichment fallbacks so every word includes Hebrew translation, structured definition ("חלק דיבר: פירוש"), example sentences, and audio pronunciation.

2. **Milestone 2 — Real YouTube & Spotify Playback Engine**
   - Implement `src/media_player.js` providing unified playback control for:
     - Real YouTube IFrame API (embedded player with time tracking, play/pause, volume, seeking).
     - Real Spotify Embed Controller (embed iframe with play/pause and deep track links).
     - Graceful offline fallback to Web Audio synthesizer when external media is unreachable.
   - Add unit tests in `test/media_player.test.js`.

3. **Milestone 3 — Popular Song Lyric Memory Agent (`src/popular_lyrics_agent.js`)**
   - Curate a dataset of famous, iconic songs across genres (Queen, Beatles, Adele, Coldplay, Taylor Swift, Eminem, Billie Eilish, etc.) with verified lyric timestamps.
   - For every word the user struggles with (detected from SRS review queue, simulation wrong answers, or practice errors), match and present the exact lyric line from a famous song where that word appears.
   - Provide one-click playback jumping directly to that line in YouTube / Spotify, plus a mobile mnemonic card.
   - Unit tests in `test/popular_lyrics_agent.test.js`.

4. **Milestone 4 — Dual-Track Karaoke Finale (`src/karaoke_finale.js`)**
   - At the completion of an exam or learning cycle, activate the "Karaoke Finale":
     - Track 1 (Original/Invented): Sing the Suno-generated Amiram song with synchronized teleprompter highlighting target vocabulary.
     - Track 2 (Familiar Popular Track): Sing the learned target words adapted to the rhythm and melody of a familiar popular song played via Spotify/YouTube.
   - Real-time lyric teleprompter, tempo indicator, and pronunciation rating via Web Speech API.
   - Unit tests in `test/karaoke_finale.test.js`.

5. **Milestone 5 — Deep UI/UX Redesign & Visual Polish**
   - Define cohesive Design System:
     - Typography: Clean typography hierarchy (Inter / Rubik Hebrew) with crisp weights and tabular numerals.
     - Palette: Modern dark slate background (`#0B0F19`), translucent glass cards (`rgba(255,255,255,0.05)` with subtle backdrop blur and 1px border), vibrant accents (Electric Indigo `#6366F1`, Emerald Green `#10B981`, Amber Gold `#F59E0B`).
     - Components: Redesigned tab navigation bar, modern flashcards, interactive audio visualizer pill, sticky playback dock, responsive mobile quiz layout.
   - Implement redesign in `index.html` and `css/style.css`.
   - Validate live layout with Playwright on desktop and mobile viewports (375x667, 390x844).
