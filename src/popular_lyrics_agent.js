// ShirAmiram — Popular Song Lyrics Memory Agent for Learner Weak Words
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ShirAmiramPopularLyricsAgent = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function normalize(w) {
    if (!w || typeof w !== 'string') return '';
    return w.toLowerCase().trim().replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, '');
  }

  function highlightWordInLyric(lyric, word) {
    if (!lyric || !word) return lyric || '';
    const regex = new RegExp(`\\b(${word})\\b`, 'gi');
    return lyric.replace(regex, '<mark class="target-word">$1</mark>');
  }

  class PopularLyricsAgent {
    constructor(catalog) {
      this.catalog = Array.isArray(catalog) ? catalog : [];
      this.index = new Map();
      this.buildIndex();
    }

    buildIndex() {
      this.index.clear();
      this.catalog.forEach(item => {
        if (!item || !item.word) return;
        const norm = normalize(item.word);
        if (!this.index.has(norm)) {
          this.index.set(norm, []);
        }
        this.index.get(norm).push(item);
      });
    }

    findMentionsForWord(rawWord) {
      const norm = normalize(rawWord);
      if (!norm || !this.index.has(norm)) return [];
      return this.index.get(norm).map(item => Object.assign({}, item));
    }

    getWeakWordMentions(weakWordsList) {
      if (!Array.isArray(weakWordsList)) {
        return {
          totalWeakWords: 0,
          coveredCount: 0,
          uncoveredCount: 0,
          coverageRate: 0,
          mentions: {},
          uncoveredList: []
        };
      }

      const cleanList = weakWordsList.map(normalize).filter(Boolean);
      const uniqueWords = Array.from(new Set(cleanList));
      const mentions = {};
      const uncovered = [];

      uniqueWords.forEach(w => {
        const matches = this.findMentionsForWord(w);
        if (matches.length > 0) {
          mentions[w] = matches[0]; // best primary mention
        } else {
          mentions[w] = null;
          uncovered.push(w);
        }
      });

      const coveredCount = Object.keys(mentions).filter(k => mentions[k] != null).length;
      const total = uniqueWords.length;
      const coverageRate = total > 0 ? Math.round((coveredCount / total) * 100) / 100 : 0;

      return {
        totalWeakWords: total,
        coveredCount,
        uncoveredCount: uncovered.length,
        coverageRate,
        mentions: Object.freeze(mentions),
        uncoveredList: Object.freeze(uncovered)
      };
    }

    formatMnemonicCard(mention) {
      if (!mention || typeof mention !== 'object') return { html: '', highlightedLyric: '' };

      const highlightedLyric = highlightWordInLyric(mention.lyric_line, mention.word);
      const safeTitle = mention.song_title || 'Unknown Track';
      const safeArtist = mention.artist || 'Unknown Artist';
      const safeWord = mention.word || '';
      const safeTranslation = mention.hebrew_translation || '';
      const safeYtId = mention.youtube_id || '';
      const safeSpId = mention.spotify_id || '';
      const timestamp = mention.timestamp_sec || 0;

      const html = `
<div class="popular-song-card p-4 rounded-2xl bg-slate-900/80 border border-indigo-500/30 shadow-xl backdrop-blur-md mb-4 text-white">
  <div class="flex items-center justify-between gap-3 mb-2">
    <div>
      <span class="text-xs uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">שיר מוכר</span>
      <h4 class="text-base font-bold text-white mt-1">${safeTitle} — <span class="text-slate-400 font-normal">${safeArtist}</span></h4>
    </div>
    <div class="text-right">
      <span class="text-amber-400 font-bold text-lg">${safeWord}</span>
      <div class="text-xs text-slate-400">${safeTranslation}</div>
    </div>
  </div>

  <div class="p-3 my-2 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-200 text-sm italic font-serif leading-relaxed">
    "${highlightedLyric}"
  </div>

  <div class="flex items-center gap-2 mt-3 pt-2 border-t border-slate-800/80">
    <button type="button" class="btn-play-youtube px-3 py-1.5 rounded-lg bg-red-600/90 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer min-h-[44px]" data-youtube-id="${safeYtId}" data-timestamp="${timestamp}">
      <span>▶ YouTube</span>
      <span class="text-[10px] opacity-80">(${timestamp}s)</span>
    </button>
    <button type="button" class="btn-play-spotify px-3 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer min-h-[44px]" data-spotify-id="${safeSpId}">
      <span>♫ Spotify</span>
    </button>
  </div>
</div>`.trim();

      return {
        html,
        highlightedLyric,
        word: safeWord,
        songTitle: safeTitle,
        artist: safeArtist
      };
    }
  }

  return PopularLyricsAgent;
}));
