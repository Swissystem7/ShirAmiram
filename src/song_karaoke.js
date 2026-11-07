// ShirAmiram — 30-Song Interactive Karaoke Teleprompter Engine
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ShirAmiramSongKaraoke = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const TRACKING_KEY = 'shiramiram:karaoke:events:v1';

  /**
   * Parse LRC text with [mm:ss.xx] timestamps.
   * @param {string} lrcText
   * @returns {Array<{ time: number, text: string }>}
   */
  function parseLRC(lrcText) {
    if (!lrcText || typeof lrcText !== 'string') return [];
    const lines = lrcText.split(/\r?\n/);
    const result = [];
    const timeRegex = /\[(\d{2}):(\d{2}(?:\.\d+)?)\](.*)/;

    lines.forEach(line => {
      const match = timeRegex.exec(line.trim());
      if (match) {
        const min = parseInt(match[1], 10);
        const sec = parseFloat(match[2]);
        const text = match[3].trim();
        const time = parseFloat((min * 60 + sec).toFixed(2));
        if (text) {
          result.push({ time, text });
        }
      }
    });

    return result.sort((a, b) => a.time - b.time);
  }

  /**
   * Find the active lyric line index for a given playback position.
   * @param {Array<{ time: number }>} timedLines
   * @param {number} currentTimeSec
   * @returns {number} Active line index (-1 if before first line)
   */
  function getActiveLineIndex(timedLines, currentTimeSec) {
    if (!Array.isArray(timedLines) || timedLines.length === 0 || currentTimeSec < 0) return -1;
    let active = -1;
    for (let i = 0; i < timedLines.length; i++) {
      if (currentTimeSec >= timedLines[i].time) {
        active = i;
      } else {
        break;
      }
    }
    return active;
  }

  /**
   * Tokenize a lyric line and annotate words that match Amiram vocabulary.
   * @param {string} lineText
   * @param {Array<Object>} targetWords
   * @param {string} lineId
   * @returns {Array<Object>} Array of token objects
   */
  function tokenizeLine(lineText, targetWords = [], lineId = 'line') {
    if (!lineText) return [];
    const wordRegex = /([A-Za-z]+(?:'[A-Za-z]+)?|[^A-Za-z\s]+|\s+)/g;
    const tokens = [];
    let match;
    let idx = 0;

    const lookupMap = new Map();
    (targetWords || []).forEach(w => {
      const term = (typeof w === 'string' ? w : (w.word || '')).toLowerCase();
      if (term) lookupMap.set(term, w);
    });

    while ((match = wordRegex.exec(lineText)) !== null) {
      const text = match[0];
      const isWord = /^[A-Za-z]/.test(text);
      const normalized = text.toLowerCase();
      const matchedWord = isWord ? lookupMap.get(normalized) : null;

      tokens.push({
        id: `${lineId}:t:${idx++}`,
        text,
        isWord,
        isTarget: Boolean(matchedWord),
        wordData: matchedWord || null
      });
    }

    return tokens;
  }

  /**
   * Build a complete index for a song from content_v2 or Suno with lines, timing and tokens.
   * @param {Object} song
   * @param {Array<Object>} allVocab
   * @returns {Object} Structured song karaoke index
   */
  function buildSongKaraokeIndex(song, allVocab = []) {
    if (!song) return null;

    const targetWords = (song.highlight_words || []).map(hw => {
      const full = allVocab.find(v => v.word && v.word.toLowerCase() === hw.word.toLowerCase());
      return {
        word: hw.word,
        hebrew_translation: hw.he || (full && full.hebrew_translation) || '',
        hebrew_definition: hw.explanation || (full && full.hebrew_definition) || '',
        sample_sentence: hw.example || (full && full.sample_sentence) || '',
        level: (full && full.level) || 'A_foundational'
      };
    });

    // Synthesize structured lines from highlight words and examples
    const lines = [];
    let currentTime = 0;
    const LINE_DURATION = 4.5;

    targetWords.forEach((hw, i) => {
      const lineId = `song_${song.id}:line_${i}`;
      const text = hw.sample_sentence || `Focus on ${hw.word} for your vocabulary.`;
      lines.push({
        id: lineId,
        index: i,
        time: parseFloat(currentTime.toFixed(2)),
        duration: LINE_DURATION,
        text,
        tokens: tokenizeLine(text, targetWords, lineId),
        focusWord: hw.word
      });
      currentTime += LINE_DURATION;
    });

    return {
      songId: song.id,
      title: song.title,
      artist: song.artist || 'Amiram Music',
      totalLines: lines.length,
      durationSec: parseFloat(currentTime.toFixed(2)),
      targetWords,
      lines,
      spotifyUrl: song.spotify_url || null,
      youtubeUrl: song.youtube_url || null
    };
  }

  /**
   * Record a learning event (e.g. word inspected, line played) safely in storage.
   */
  function trackEvent(eventType, payload = {}, storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
    if (!storage) return false;
    try {
      const raw = storage.getItem(TRACKING_KEY);
      const list = raw ? JSON.parse(raw) : [];
      list.push({
        type: eventType,
        ...payload,
        at: new Date().toISOString()
      });
      // Keep recent 100 events
      if (list.length > 100) list.splice(0, list.length - 100);
      storage.setItem(TRACKING_KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      return false;
    }
  }

  return {
    TRACKING_KEY,
    parseLRC,
    getActiveLineIndex,
    tokenizeLine,
    buildSongKaraokeIndex,
    trackEvent
  };
}));
