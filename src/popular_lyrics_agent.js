// ShirAmiram — Popular Song Lyrics Memory Agent, Smart Genre Playlist Builder & Genius Annotations
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ShirAmiramPopularLyricsAgent = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const GENRE_LABELS_HE = {
    'all': 'כל הסגנונות 🎶',
    'Rock': 'רוק קלאסי ומודרני 🎸',
    'Pop': 'פופ ולהיטים ✨',
    'Hip-Hop & Rap': 'היפ-הופ וראפ 🎤',
    'Alternative & Indie': 'אלטרנטיבי ואינדי 🌙',
    'Classic & Soul': 'קלאסיקות וסול 🎷'
  };

  function normalize(w) {
    if (!w || typeof w !== 'string') return '';
    return w.toLowerCase().trim().replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, '');
  }

  const WORD_CHAR = /\w/;

  function isWordChar(ch) {
    return ch !== undefined && WORD_CHAR.test(ch);
  }

  /**
   * Find the next case-insensitive whole-word occurrence of `needle` in `text`
   * starting at `from` (same semantics as /\bneedle\b/gi, with `needle`
   * matched literally). Uses no dynamically built RegExp.
   * @returns {number} start index, or -1
   */
  function findWholeWord(text, haystack, needle, from) {
    while (from <= haystack.length) {
      const i = haystack.indexOf(needle, from);
      if (i === -1) return -1;
      const end = i + needle.length;
      if (isWordChar(text[i - 1]) !== isWordChar(text[i]) &&
          isWordChar(text[end - 1]) !== isWordChar(text[end])) {
        return i;
      }
      from = i + 1;
    }
    return -1;
  }

  function highlightWordInLyric(lyric, word) {
    if (!lyric || !word) return lyric || '';
    const text = String(lyric);
    const needle = String(word).toLowerCase();
    const haystack = text.toLowerCase();
    let out = '';
    let pos = 0;
    let at = findWholeWord(text, haystack, needle, pos);
    while (at !== -1) {
      const end = at + needle.length;
      out += text.slice(pos, at) + '<mark class="target-word">' + text.slice(at, end) + '</mark>';
      pos = end;
      at = findWholeWord(text, haystack, needle, pos);
    }
    return out + text.slice(pos);
  }

  function extractCoveredWords(item) {
    if (!item || typeof item !== 'object') return [];
    const primary = normalize(item.word);
    const sec = Array.isArray(item.secondary_words)
      ? item.secondary_words.map(normalize).filter(Boolean)
      : [];
    return Array.from(new Set([primary, ...sec].filter(Boolean)));
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

    getAvailableGenres() {
      const counts = {};
      this.catalog.forEach(item => {
        if (!item) return;
        const g = item.genre || 'Pop';
        counts[g] = (counts[g] || 0) + 1;
      });
      const list = Object.keys(counts).map(g => ({
        id: g,
        labelHe: GENRE_LABELS_HE[g] || g,
        count: counts[g]
      }));
      return [
        { id: 'all', labelHe: GENRE_LABELS_HE.all, count: this.catalog.length },
        ...list
      ];
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
          mentions[w] = matches[0];
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

    getGeniusExplanation(mention) {
      if (!mention || typeof mention !== 'object') {
        return {
          word: '',
          hebrewTranslation: '',
          songTitle: '',
          artist: '',
          genre: '',
          geniusUrl: 'https://genius.com',
          annotationHe: '',
          coveredWords: [],
          html: ''
        };
      }
      const word = mention.word || '';
      const hebrewTranslation = mention.hebrew_translation || '';
      const songTitle = mention.song_title || 'Unknown Song';
      const artist = mention.artist || 'Unknown Artist';
      const genre = mention.genre || 'Pop';
      const coveredWords = extractCoveredWords(mention);
      const geniusUrl = mention.genius_url || `https://genius.com/search?q=${encodeURIComponent(artist + ' ' + songTitle)}`;
      const annotationHe = mention.genius_annotation || (
        `בשיר "${songTitle}" של ${artist}, המילה "${word}" (${hebrewTranslation}) משמשת להמחשת הרעיון המרכזי בשורה "${mention.lyric_line || ''}".`
      );

      const html = `
<div class="genius-explanation-box mt-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-400/30 text-xs leading-relaxed">
  <div class="flex items-center justify-between gap-2 mb-1">
    <span class="font-extrabold text-amber-300 flex items-center gap-1">
      <span>💡 הסבר Genius • משמעות המילה דרך השיר</span>
    </span>
    <a href="${geniusUrl}" target="_blank" rel="noopener noreferrer" class="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-400/20 text-amber-200 hover:bg-amber-400/30 border border-amber-400/40 transition-all">
      Genius Lyrics ↗
    </a>
  </div>
  <p class="text-slate-200">${annotationHe}</p>
</div>`.trim();

      return {
        word,
        hebrewTranslation,
        songTitle,
        artist,
        genre,
        geniusUrl,
        annotationHe,
        coveredWords,
        html
      };
    }

    /**
     * Greedy Maximum Word-Coverage Playlist Builder by Genre.
     * Selects up to `maxTracks` songs in the requested genre (or all genres)
     * such that each added song maximizes newly covered Amiram words (with extra weight for weak/target words).
     */
    buildGenrePlaylist(options) {
      const opts = options || {};
      const requestedGenre = opts.genre || 'all';
      const maxTracks = Math.max(1, Math.min(Number(opts.maxTracks) || 8, 30));
      const targetSet = new Set(
        Array.isArray(opts.targetWords) ? opts.targetWords.map(normalize).filter(Boolean) : []
      );

      let pool = this.catalog.filter(item => item && item.word);
      if (requestedGenre !== 'all') {
        const genreMatches = pool.filter(
          item => (item.genre || '').toLowerCase() === requestedGenre.toLowerCase()
        );
        if (genreMatches.length > 0) {
          pool = genreMatches;
        }
      }

      const coveredWords = new Set();
      const selectedTracks = [];
      const remaining = pool.slice();

      while (selectedTracks.length < maxTracks && remaining.length > 0) {
        let bestIdx = -1;
        let bestScore = -1;
        let bestNewWords = [];

        for (let i = 0; i < remaining.length; i++) {
          const candidate = remaining[i];
          const words = extractCoveredWords(candidate);
          const newWords = words.filter(w => !coveredWords.has(w));
          const newTargetHits = newWords.filter(w => targetSet.has(w)).length;

          // Score prioritizes newly covered weak/target words (+10 each) and total newly covered Amiram words (+3 each)
          const score = (newTargetHits * 10) + (newWords.length * 3) + (words.length * 0.1);
          if (score > bestScore) {
            bestScore = score;
            bestIdx = i;
            bestNewWords = newWords;
          }
        }

        if (bestIdx === -1) break;

        const chosen = remaining.splice(bestIdx, 1)[0];
        const allTrackWords = extractCoveredWords(chosen);
        allTrackWords.forEach(w => coveredWords.add(w));

        const genius = this.getGeniusExplanation(chosen);
        selectedTracks.push(Object.assign({}, chosen, {
          coveredWords: allTrackWords,
          newlyAddedWords: bestNewWords,
          geniusExplanation: genius.annotationHe,
          geniusUrl: genius.geniusUrl
        }));
      }

      const coveredWordsList = Array.from(coveredWords);
      const weakWordsCovered = coveredWordsList.filter(w => targetSet.has(w));
      const ytIds = selectedTracks.map(t => t.youtube_id).filter(Boolean);
      const spIds = selectedTracks.map(t => t.spotify_id).filter(Boolean);

      const youtubePlaylistUrl = ytIds.length > 0
        ? `https://www.youtube.com/watch_videos?video_ids=${ytIds.join(',')}`
        : null;
      const youtubeEmbedPlaylistUrl = ytIds.length > 0
        ? `https://www.youtube.com/embed/${ytIds[0]}?playlist=${ytIds.slice(1).join(',')}&enablejsapi=1`
        : null;
      const spotifyTrackUrls = spIds.map(id => `https://open.spotify.com/track/${id}`);

      return {
        genre: requestedGenre,
        genreLabelHe: GENRE_LABELS_HE[requestedGenre] || requestedGenre,
        tracks: selectedTracks,
        totalTracks: selectedTracks.length,
        totalUniqueWords: coveredWordsList.length,
        coveredWordsList,
        weakWordsCovered,
        youtubePlaylistUrl,
        youtubeEmbedPlaylistUrl,
        spotifyTrackUrls
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
      const safeGenre = mention.genre || 'Pop';
      const safeGenreHe = GENRE_LABELS_HE[safeGenre] || safeGenre;
      const timestamp = mention.timestamp_sec || 0;
      const coveredWords = extractCoveredWords(mention);
      const genius = this.getGeniusExplanation(mention);

      const wordBadgesHtml = coveredWords.map(w => {
        const isPrimary = w === normalize(safeWord);
        return `<span class="text-[11px] px-2 py-0.5 rounded-full ${isPrimary ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold' : 'bg-indigo-950/80 text-indigo-300 border border-indigo-700/40'}" dir="ltr">${w}</span>`;
      }).join(' ');

      const html = `
<div class="popular-song-card p-4 rounded-2xl bg-slate-900/80 border border-indigo-500/30 shadow-xl backdrop-blur-md mb-4 text-white" data-genre="${safeGenre}">
  <div class="flex items-center justify-between gap-3 mb-2">
    <div>
      <div class="flex flex-wrap items-center gap-1.5">
        <span class="text-xs uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">שיר מוכר</span>
        <span class="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">${safeGenreHe}</span>
      </div>
      <h4 class="text-base font-bold text-white mt-1">${safeTitle} — <span class="text-slate-400 font-normal">${safeArtist}</span></h4>
    </div>
    <div class="text-right">
      <span class="text-amber-400 font-bold text-lg" dir="ltr">${safeWord}</span>
      <div class="text-xs text-slate-400">${safeTranslation}</div>
    </div>
  </div>

  <div class="flex flex-wrap items-center gap-1.5 my-1.5">
    <span class="text-[11px] text-slate-400">מילות אמיר"ם בשיר:</span>
    ${wordBadgesHtml}
  </div>

  <div class="p-3 my-2 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-200 text-sm italic font-serif leading-relaxed" dir="ltr">
    "${highlightedLyric}"
  </div>

  ${genius.html}

  <div class="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t border-slate-800/80">
    <button type="button" class="btn-play-youtube px-3 py-1.5 rounded-lg bg-red-600/90 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer min-h-[44px]" data-youtube-id="${safeYtId}" data-timestamp="${timestamp}">
      <span>▶ YouTube</span>
      <span class="text-[10px] opacity-80">(${timestamp}s)</span>
    </button>
    <button type="button" class="btn-play-spotify px-3 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer min-h-[44px]" data-spotify-id="${safeSpId}">
      <span>♫ Spotify</span>
    </button>
    <a href="https://www.youtube.com/watch?v=${safeYtId}&t=${timestamp}s" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-all min-h-[44px]">
      <span>🔗 YouTube ישיר</span>
    </a>
    <a href="https://open.spotify.com/track/${safeSpId}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-all min-h-[44px]">
      <span>🔗 Spotify ישיר</span>
    </a>
  </div>
</div>`.trim();

      return {
        html,
        highlightedLyric,
        word: safeWord,
        songTitle: safeTitle,
        artist: safeArtist,
        genre: safeGenre,
        coveredWords,
        geniusUrl: genius.geniusUrl,
        geniusExplanation: genius.annotationHe
      };
    }
  }

  return PopularLyricsAgent;
}));
