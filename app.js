// ShirAmiram — data and pure logic, shared by the page (window.ShirAmiram) and
// by the tests (node --test). No DOM here.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ShirAmiram = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // The same list as shiramiram_vocab_full.json (test/app.test.js keeps them equal).
  const VOCAB = [
    { word: 'deliberate', translation: 'מכוון, שקול', category: 'adjective', difficulty: 'Medium', sample_sentence: 'Walking through the shadows with a deliberate stride.' },
    { word: 'crucial', translation: 'חיוני, מכריע', category: 'adjective', difficulty: 'Medium', sample_sentence: "Facing every challenge, yeah it's crucial to try." },
    { word: 'undermine', translation: 'לערער, לחתור תחת', category: 'verb', difficulty: 'Hard', sample_sentence: 'They tried to undermine the dreams we made.' },
    { word: 'subtle', translation: 'עדין, דק', category: 'adjective', difficulty: 'Medium', sample_sentence: 'With subtle little whispers in the shade.' },
    { word: 'nevertheless', translation: 'אף על פי כן', category: 'connector', difficulty: 'Hard', sample_sentence: 'Nevertheless, we stand up tall.' },
    { word: 'inevitable', translation: 'בלתי נמנע', category: 'adjective', difficulty: 'Hard', sample_sentence: "Victory is coming, it's inevitable now." },
    { word: 'hypothesis', translation: 'השערה מדעית', category: 'noun', difficulty: 'Medium', sample_sentence: 'We had a wild hypothesis and figured out how.' },
    { word: 'consequently', translation: 'כתוצאה מכך', category: 'connector', difficulty: 'Medium', sample_sentence: 'Consequently, there is no turning back!' }
  ];

  // The filter buttons of the vocabulary tab: only categories that exist in the data.
  const CATEGORIES = [
    { id: 'connector', he: 'מילות קישור' },
    { id: 'adjective', he: 'שמות תואר' },
    { id: 'verb', he: 'פעלים' },
    { id: 'noun', he: 'שמות עצם' },
    { id: 'all', he: 'הכול' }
  ];
  const CATEGORY_HE = { connector: 'קונקטור', adjective: 'שם תואר', verb: 'פועל', noun: 'שם עצם' };
  const DIFFICULTY_HE = { Medium: 'בינוני', Hard: 'קשה' };

  // Every question has its right answer among the options.
  const QUIZ = [
    { q: "What does 'deliberate' mean?", a: 'מכוון, שקול', opts: ['חסר משמעות', 'מכוון, שקול', 'קשה', 'מהיר'] },
    { q: "Which word is a connector? 'nevertheless' means:", a: 'אף על פי כן', opts: ['חלק', 'אף על פי כן', 'קשה', 'חזק'] },
    { q: "'Hypothesis' translates to:", a: 'השערה מדעית', opts: ['מסקנה סופית', 'ניסוי', 'השערה מדעית', 'הוכחה'] },
    { q: "'Inevitable' translates to:", a: 'בלתי נמנע', opts: ['בלתי אפשרי', 'בלתי נמנע', 'קשה', 'מהיר'] }
  ];

  // One loop of the song: 4 lines, LINE_SEC seconds each.
  const LINES = 4;
  const LINE_SEC = 7.5;
  const LOOP_SEC = LINES * LINE_SEC;
  // A short pentatonic tune (Hz), one note per half second; original, no recording.
  const TUNE = [220, 261.63, 293.66, 329.63, 392, 329.63, 293.66, 261.63, 220, 261.63, 329.63, 392, 440, 392, 329.63];
  const NOTE_SEC = 0.5;

  // text: searched in the word and the translation, case-insensitive.
  // category: 'all' (or empty) keeps every word.
  function filterVocab(text, category) {
    const t = String(text == null ? '' : text).trim().toLowerCase();
    const c = category && category !== 'all' ? category : null;
    return VOCAB.filter(function (v) {
      if (c && v.category !== c) return false;
      return !t || v.word.toLowerCase().includes(t) || v.translation.includes(t);
    });
  }

  function findWord(word) {
    const w = String(word || '').trim().toLowerCase();
    return VOCAB.filter(function (v) { return v.word === w; })[0] || null;
  }

  function formatTime(sec) {
    const s = Math.max(0, Math.floor(Number(sec) || 0));
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }

  // Where the song is after `sec` seconds of playing: the line to highlight,
  // the percent of the loop for the progress bar, and the note of the tune.
  function positionAt(sec) {
    const inLoop = ((Number(sec) || 0) % LOOP_SEC + LOOP_SEC) % LOOP_SEC;
    return {
      line: Math.min(LINES - 1, Math.floor(inLoop / LINE_SEC)),
      percent: Math.round(inLoop / LOOP_SEC * 1000) / 10,
      hz: TUNE[Math.floor(inLoop / NOTE_SEC) % TUNE.length]
    };
  }

  function isCorrect(question, picked) { return !!question && picked === question.a; }

  // --- Task H: validated content_v2, platform links, recommendations, timing, Suno export ---
  // Quick Study Plan Selector
  /**
   * Build a quick study plan using the provided optimizer.
   * @param {number} availableMinutes - Total minutes available for the session.
   * @param {Array} dueWords - Array of due word objects or strings.
   * @param {Array} songCatalog - Array of song objects.
   * @param {Array} questionPool - Array of question objects for quizzes.
   * @param {object} optimizer - Object exposing `planTimeBoxedSession`.
   * @returns {object} The planning result with targetMinutes, estimatedMinutes and activities.
   */
  function buildQuickStudyPlan(availableMinutes, dueWords, songCatalog, questionPool, optimizer) {
    if (!optimizer || typeof optimizer.planTimeBoxedSession !== 'function') {
      throw new Error('Invalid optimizer: must provide planTimeBoxedSession');
    }
    const input = {
      availableMinutes,
      dueWords,
      songCatalog,
      questionPool,
    };
    return optimizer.planTimeBoxedSession(input);
  }

  var SPOTIFY_ID_RE = /^[A-Za-z0-9]{22}$/;
  var YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;
  var QUIZ_LAYOUT = { gapPx: 12, minTapPx: 44, singleColumn: true };

  function validateContent(raw) {
    var errors = [];
    if (!raw || typeof raw !== 'object') {
      return { songs: [], questions: [], words: [], errors: ['content is not an object'], examCoverage: 'unknown' };
    }
    var examCoverage = (raw.meta && raw.meta.exam_coverage) || 'unknown';
    var songs = (Array.isArray(raw.songs) ? raw.songs : []).map(function (s, i) {
      var c = Object.assign({}, s);
      if (!c.title || !c.artist) errors.push('song ' + (c.id != null ? c.id : i) + ': missing title/artist');
      if (c.spotify_id != null && !SPOTIFY_ID_RE.test(String(c.spotify_id))) { errors.push('song ' + c.id + ': invalid spotify_id'); c.spotify_id = null; }
      if (c.spotify_id && c.spotify_url && String(c.spotify_url).indexOf(c.spotify_id) === -1) errors.push('song ' + c.id + ': spotify_url does not contain spotify_id');
      if (c.youtube_id != null && !YOUTUBE_ID_RE.test(String(c.youtube_id))) { errors.push('song ' + c.id + ': invalid youtube_id'); c.youtube_id = null; }
      if (c.youtube_id == null) { c.youtube_id = null; c.youtube_url = null; }
      c.exam_coverage = (c.provenance && c.provenance.exam_coverage) || 'unknown';
      c.highlight_words = Array.isArray(c.highlight_words) ? c.highlight_words : [];
      return c;
    });
    var words = [];
    songs.forEach(function (s) { s.highlight_words.forEach(function (w) { if (w && w.word && w.he) words.push({ word: String(w.word).toLowerCase(), translation: w.he, explanation: w.explanation || '', example: w.example || '', example_kind: w.example_kind || '', songId: s.id, songTitle: s.title }); else errors.push('song ' + s.id + ': highlight word missing word/he'); }); });
    var questions = (Array.isArray(raw.questions) ? raw.questions : []).filter(function (q) {
      var ok = q && Array.isArray(q.options) && q.options.filter(function (o) { return o === q.answer; }).length === 1;
      if (!ok) errors.push('question ' + (q && q.id) + ': answer must appear exactly once in options');
      return ok;
    });
    return { songs: songs, questions: questions, words: words, errors: errors, examCoverage: examCoverage };
  }

  function loadContent(fetchImpl, url) {
    return Promise.resolve(fetchImpl(url || 'data/imports/content_v2.json')).then(function (r) {
      if (!r || !r.ok) throw new Error('content fetch failed');
      return r.json();
    }).then(validateContent);
  }

  function spotifyEmbedUrl(id) { return SPOTIFY_ID_RE.test(String(id || '')) ? 'https://open.spotify.com/embed/track/' + id : null; }
  function spotifyTrackUrl(id) { return SPOTIFY_ID_RE.test(String(id || '')) ? 'https://open.spotify.com/track/' + id : null; }
  function youtubeEmbedUrl(id) { return YOUTUBE_ID_RE.test(String(id || '')) ? 'https://www.youtube.com/embed/' + id : null; }
  function youtubeMusicLink(song) {
    if (song && YOUTUBE_ID_RE.test(String(song.youtube_id || ''))) {
      return { kind: 'direct', url: 'https://music.youtube.com/watch?v=' + song.youtube_id };
    }
    var q = encodeURIComponent(((song && song.title) || '') + ' ' + ((song && song.artist) || ''));
    return { kind: 'search', url: 'https://music.youtube.com/search?q=' + q };
  }

  function recommendSongs(songs, targetWords, limit) {
    var targets = (targetWords || []).map(function (w) { return String(w).trim().toLowerCase(); }).filter(Boolean);
    var out = (songs || []).map(function (s) {
      var have = (s.highlight_words || []).map(function (w) { return String(w.word).toLowerCase(); });
      var matched = targets.filter(function (t) { return have.indexOf(t) !== -1; });
      return {
        song: s, score: matched.length, matchedWords: matched,
        reasons: matched.length ? ['כולל ' + matched.length + ' ממילות היעד: ' + matched.join(', ')] : ['ללא חפיפה למילות היעד']
      };
    });
    out.sort(function (a, b) { return b.score - a.score || String(a.song.title).localeCompare(String(b.song.title)) || a.song.id - b.song.id; });
    return out.slice(0, limit > 0 ? limit : out.length);
  }

  function parseLRC(text) {
    var lines = [];
    String(text || '').split(/\r?\n/).forEach(function (row) {
      var m = row.match(/^\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)$/);
      if (m) lines.push({ time: Number(m[1]) * 60 + Number(m[2]), text: m[3] });
    });
    return lines.sort(function (a, b) { return a.time - b.time; });
  }
  function parseTimingData(input) {
    if (typeof input === 'string' && input.trim().charAt(0) !== '{' && input.trim().charAt(0) !== '[') return parseLRC(input);
    var obj = typeof input === 'string' ? JSON.parse(input) : input;
    var arr = Array.isArray(obj) ? obj : (obj && obj.lines) || [];
    return arr.map(function (l) { return { time: Number(l.time), text: String(l.text || '') }; })
      .filter(function (l) { return isFinite(l.time) && l.time >= 0; }).sort(function (a, b) { return a.time - b.time; });
  }
  function activeTimedLine(lines, sec) {
    var idx = -1; var t = Number(sec) || 0;
    (lines || []).forEach(function (l, i) { if (l.time <= t) idx = i; });
    return idx;
  }
  function validateAudioFile(f) {
    if (!f || !f.name) return { ok: false, reason: 'no file' };
    var okType = /^audio\//.test(f.type || '') || /\.(mp3|wav|m4a|ogg|webm)$/i.test(f.name);
    return okType ? { ok: true, name: f.name } : { ok: false, reason: 'not an audio file' };
  }
  function buildSunoExport(words, title) {
    var ws = (words || []).slice(0, 12);
    var lyrics = ws.map(function (w) { return (w.example || (w.word + ' — ' + (w.translation || ''))); }).join('\n');
    return {
      title: title || 'ShirAmiram vocabulary song', generation: 'pending_manual',
      note: 'Export only. No Suno generation performed; paste manually in Suno if you choose.',
      stylePrompt: 'educational English vocabulary song, clear slow singing, simple melody, words: ' + ws.map(function (w) { return w.word; }).join(', '),
      lyrics: lyrics, words: ws.map(function (w) { return w.word; })
    };
  }

  // Weak-words queue Empty State: show the card only when the queue is empty, otherwise show the word list.

  function resolveDailyChallengeScheduler() {
    if (typeof root !== 'undefined' && root && root.ShirAmiramDailyChallengeScheduler) {
      return root.ShirAmiramDailyChallengeScheduler;
    }
    if (typeof require === 'function') {
      try {
        return require('./src/daily_challenge_scheduler.js');
      } catch (err) {
        return null;
      }
    }
    return null;
  }

  /**
   * Generate formatted data for the Daily Challenge banner.
   * @param {string} dateString - The date identifier (e.g., "2023-10-05").
   * @param {Array} songs - Array of song objects (same shape as used by the scheduler).
   * @param {Array} vocab - Array of vocabulary objects (same shape as used by the scheduler).
   * @param {object} [scheduler] - Optional scheduler object; defaults to resolved module.
   * @returns {object} An object containing songTitle, artist, word, hebrewTranslation, formattedDate.
   */
  function getDailyChallengeBannerData(dateString, songs, vocab, scheduler) {
    // existing implementation unchanged
    const sch = scheduler || resolveDailyChallengeScheduler();
    if (!sch || typeof sch.generateDailyChallenge !== 'function') {
      throw new Error('Invalid scheduler provided to getDailyChallengeBannerData');
    }
    const result = sch.generateDailyChallenge(dateString, songs, vocab);
    const song = result.songOfTheDay || {};
    const word = result.wordOfTheDay || {};
    return {
      songTitle: song.title || null,
      artist: song.artist || null,
      word: word.word || null,
      hebrewTranslation: word.translation || null,
      formattedDate: result.dateString || dateString
    };
  }
  function applyWeakWordsEmptyState(els, queueLength, message) {
    var n = Number(queueLength) || 0;
    var isEmpty = n <= 0;
    var e = els || {};
    if (e.empty && e.empty.classList) e.empty.classList.toggle('hidden', !isEmpty);
    if (e.empty) e.empty.setAttribute('aria-hidden', String(!isEmpty));
    if (e.list && e.list.classList) e.list.classList.toggle('hidden', isEmpty);
    if (isEmpty && e.message) e.message.textContent = message || '';
    return {
      isEmpty: isEmpty,
      queueLength: n
    };
  }

  // Dominant vocab level (A_foundational / B_intermediate / C_advanced) of a song's highlight words.
  // `estimator` is the difficulty estimator (needs estimateSongVocabDifficulty). Ties go to the easier level.
  var SONG_LEVELS = ['A_foundational', 'B_intermediate', 'C_advanced'];
  function songDominantLevel(song, estimator) {
    if (!estimator || typeof estimator.estimateSongVocabDifficulty !== 'function') return null;
    var words = ((song && song.highlight_words) || []).map(function (w) { return w && w.word; }).filter(Boolean);
    var stats = estimator.estimateSongVocabDifficulty(words);
    if (!stats || !stats.totalWords) return null;
    var best = null;
    SONG_LEVELS.forEach(function (lvl) {
      if (best === null || (stats.levelCounts[lvl] || 0) > (stats.levelCounts[best] || 0)) best = lvl;
    });
    return best;
  }
  function filterSongsByLevel(songs, level, estimator) {
    if (!level || level === 'all') return (songs || []).slice();
    return (songs || []).filter(function (s) { return songDominantLevel(s, estimator) === level; });
  }

  function resolveConfidenceScoreEstimator() {
    if (typeof root !== 'undefined' && root && root.ShirAmiramConfidenceScoreEstimator) {
      return root.ShirAmiramConfidenceScoreEstimator;
    }
    if (typeof require === 'function') {
      try {
        return require('./src/confidence_score_estimator.js');
      } catch (err) {
        return null;
      }
    }
    return null;
  }

  /**
   * Format quiz answer confidence badge and feedback text.
   * @param {number|null} responseTimeMs - Response time in milliseconds.
   * @param {boolean} isCorrect - Whether answer was correct.
   * @param {object} [estimator] - Optional confidence score estimator object.
   * @returns {object} { badgeLabel, badgeColor, feedbackText, isFastAndCorrect }
   */
  function formatAnswerConfidenceBadge(responseTimeMs, isCorrect, estimator) {
    const est = estimator !== undefined ? estimator : resolveConfidenceScoreEstimator();
    let confidenceData = null;
    if (est && typeof est.evaluateResponseConfidence === 'function') {
      confidenceData = est.evaluateResponseConfidence(responseTimeMs, isCorrect);
    }

    const correct = Boolean(isCorrect);
    const validTime = typeof responseTimeMs === 'number' && !isNaN(responseTimeMs) && responseTimeMs >= 0;

    let badgeLabel = 'ללא תזמון';
    let badgeColor = 'gray';
    let feedbackText = correct ? 'תשובה נכונה!' : 'תשובה שגויה, כדאי לתרגל שוב';
    let isFastAndCorrect = false;

    if (confidenceData) {
      badgeLabel = confidenceData.label || confidenceData.badgeLabel || confidenceData.tierLabel || badgeLabel;
      badgeColor = confidenceData.color || confidenceData.badgeColor || confidenceData.tierColor || badgeColor;
      feedbackText = confidenceData.feedback || confidenceData.feedbackText || feedbackText;
      isFastAndCorrect = Boolean(confidenceData.isFastAndCorrect);
    }
    
    if ((!confidenceData || badgeLabel === 'ללא תזמון') && validTime) {
      if (correct) {
        if (responseTimeMs < 3000) {
          badgeLabel = 'שליטה מעולה';
          badgeColor = 'green';
          feedbackText = 'תשובה מהירה ומדויקת!';
          isFastAndCorrect = true;
        } else {
          badgeLabel = 'תשובה נכונה';
          badgeColor = 'blue';
          feedbackText = 'תשובה נכונה, קח עוד קצת זמן לביטחון מלא.';
        }
      } else {
        badgeLabel = 'חזרה מומלצת';
        badgeColor = 'red';
        feedbackText = 'תשובה שגויה, מומלץ לעבור על המילה שוב.';
      }
    }

    return {
      badgeLabel,
      badgeColor,
      feedbackText,
      isFastAndCorrect
    };
  }

  function calculateVocabMasteryStats(masteredWordIds, vocabList) {
    const list = Array.isArray(vocabList) ? vocabList : [];
    const total = list.length;
    const masteredSet = new Set(Array.isArray(masteredWordIds) ? masteredWordIds : []);
    let masteredCount = 0;
    const levelCounts = { levelA: { mastered: 0, total: 0 }, levelB: { mastered: 0, total: 0 }, levelC: { mastered: 0, total: 0 } };
    list.forEach(v => {
      const isMastered = masteredSet.has(v.word);
      if (isMastered) masteredCount++;
      const level = v.difficulty === 'Medium' ? 'levelA' : v.difficulty === 'Hard' ? 'levelB' : 'levelC';
      if (levelCounts[level]) {
        levelCounts[level].total++;
        if (isMastered) levelCounts[level].mastered++;
      }
    });
    const overallPercent = total ? (masteredCount / total) * 100 : 0;
    return {
      overallPercent,
      levelA: { mastered: levelCounts.levelA.mastered, total: levelCounts.levelA.total, percent: levelCounts.levelA.total ? (levelCounts.levelA.mastered / levelCounts.levelA.total) * 100 : 0 },
      levelB: { mastered: levelCounts.levelB.mastered, total: levelCounts.levelB.total, percent: levelCounts.levelB.total ? (levelCounts.levelB.mastered / levelCounts.levelB.total) * 100 : 0 },
      levelC: { mastered: levelCounts.levelC.mastered, total: levelCounts.levelC.total, percent: levelCounts.levelC.total ? (levelCounts.levelC.mastered / levelCounts.levelC.total) * 100 : 0 }
    };
  }

  /**
   * The analytics key for a quiz answer. Words are keyed like the vocabulary list (its id), so
   * the weak-words queue finds them. Question numbers from other banks (song quiz 1..50,
   * restatements 1..n) also run from 1, so they get a prefix instead of colliding with word ids.
   * @param {object} item - Quiz item as rendered.
   * @param {string} bank - 'cloze', 'restatement' or 'reading'.
   * @param {Array} vocab - The vocabulary list ({ id, word }).
   * @param {number} index - Position in the quiz, used only when the item has no id.
   */
  function quizCardKey(item, bank, vocab, index) {
    const it = item && typeof item === 'object' ? item : {};
    const word = typeof it.word === 'string' ? it.word.trim().toLowerCase() : '';
    if (word && !it.source_sentence && typeof it.correct_index !== 'number') {
      const hit = (Array.isArray(vocab) ? vocab : []).find((v) => v && typeof v.word === 'string' && v.word.toLowerCase() === word);
      if (hit) return String(hit.id != null ? hit.id : hit.word);
      return 'word:' + word;
    }
    const id = it.id != null ? it.id : index;
    return (bank || 'quiz') + ':' + String(id);
  }

  return {
    formatAnswerConfidenceBadge: formatAnswerConfidenceBadge,
    quizCardKey: quizCardKey,
    calculateVocabMasteryStats: calculateVocabMasteryStats,
    getDailyChallengeBannerData: getDailyChallengeBannerData,
    buildQuickStudyPlan: buildQuickStudyPlan,
    songDominantLevel: songDominantLevel, filterSongsByLevel: filterSongsByLevel,
    VOCAB: VOCAB, CATEGORIES: CATEGORIES, CATEGORY_HE: CATEGORY_HE, DIFFICULTY_HE: DIFFICULTY_HE, QUIZ: QUIZ,
    LINES: LINES, LINE_SEC: LINE_SEC, LOOP_SEC: LOOP_SEC, TUNE: TUNE, NOTE_SEC: NOTE_SEC,
    filterVocab: filterVocab, findWord: findWord, formatTime: formatTime, positionAt: positionAt, isCorrect: isCorrect,
    validateContent: validateContent, loadContent: loadContent, spotifyEmbedUrl: spotifyEmbedUrl, spotifyTrackUrl: spotifyTrackUrl, youtubeEmbedUrl: youtubeEmbedUrl, youtubeMusicLink: youtubeMusicLink, recommendSongs: recommendSongs, parseLRC: parseLRC, parseTimingData: parseTimingData, activeTimedLine: activeTimedLine, validateAudioFile: validateAudioFile, buildSunoExport: buildSunoExport, QUIZ_LAYOUT: QUIZ_LAYOUT,
    applyWeakWordsEmptyState: applyWeakWordsEmptyState
  };
});
