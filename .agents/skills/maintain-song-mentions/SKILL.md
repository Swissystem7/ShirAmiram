---
name: maintain-song-mentions
description: Autonomous maintenance workflow for discovering and updating real popular song lyric mentions of Amiram academic vocabulary with verified Spotify and YouTube links.
---

# Song Mentions Maintenance Skill

Use this workflow to maintain and enrich the popular song mentions catalog (`data/imports/popular_song_mentions.json`).

## Workflow Steps:
1. **Identify Target Gap**: Read `data/imports/amiram_vocab_full.json` (300 words) and identify any words not yet matched in `data/imports/popular_song_mentions.json`.
2. **Lyric Mining**: Search verified lyric databases for well-known popular songs (Queen, Beatles, Adele, Coldplay, Taylor Swift, Eminem, Billie Eilish, etc.) containing the exact target word.
3. **Verify Links & Timestamp**:
   - YouTube: Ensure 11-character alphanumeric video ID, note the exact seconds offset where the line is sung.
   - Spotify: Ensure 22-character track ID.
4. **Non-mutating update**: Append new validated entries to `data/imports/popular_song_mentions.json`.
5. **Run Verification**: Execute `node --test test/popular_lyrics_agent.test.js` to ensure 100% schema compliance.
