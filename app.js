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
    { id: 'connector', he: 'קונקטורים' },
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
  var SPOTIFY_ID_RE = /^[A-Za-z0-9]{22}$/;
  var YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;
  var QUIZ_LAYOUT = { gapPx: 12, minTapPx: 44, singleColumn: true };

  function validateContent(raw) {
    var errors = [];
    if (!raw || typeof raw !== 'object') return { songs: [], questions: [], words: [], errors: ['content is not an object'], examCoverage: 'unknown' };
    var examCoverage = (raw.meta && raw.meta.exam_coverage) || 'unknown'; // never upgrade unknown/none_claimed
    var songs = (Array.isArray(raw.songs) ? raw.songs : []).map(function (s, i) {
      var c = Object.assign({}, s);
      if (!c.title || !c.artist) errors.push('song ' + (c.id != null ? c.id : i) + ': missing title/artist');
      if (c.spotify_id != null && !SPOTIFY_ID_RE.test(String(c.spotify_id))) { errors.push('song ' + c.id + ': invalid spotify_id'); c.spotify_id = null; }
      if (c.spotify_id && c.spotify_url && String(c.spotify_url).indexOf(c.spotify_id) === -1) errors.push('song ' + c.id + ': spotify_url does not contain spotify_id');
      if (c.youtube_id != null && !YOUTUBE_ID_RE.test(String(c.youtube_id))) { errors.push('song ' + c.id + ': invalid youtube_id'); c.youtube_id = null; }
      if (c.youtube_id == null) { c.youtube_id = null; c.youtube_url = null; } // null stays null — no fabrication
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
    if (song && YOUTUBE_ID_RE.test(String(song.youtube_id || ''))) return { kind: 'direct', url: 'https://music.youtube.com/watch?v=' + song.youtube_id };
    var q = encodeURIComponent(((song && song.title) || '') + ' ' + ((song && song.artist) || ''));
    return { kind: 'search', url: 'https://music.youtube.com/search?q=' + q }; // explicitly a search link, not a verified track
  }

  function recommendSongs(songs, targetWords, limit) {
    var targets = (targetWords || []).map(function (w) { return String(w).trim().toLowerCase(); }).filter(Boolean);
    var out = (songs || []).map(function (s) {
      var have = (s.highlight_words || []).map(function (w) { return String(w.word).toLowerCase(); });
      var matched = targets.filter(function (t) { return have.indexOf(t) !== -1; });
      return { song: s, score: matched.length, matchedWords: matched,
        reasons: matched.length ? ['כולל ' + matched.length + ' ממילות היעד: ' + matched.join(', ')] : ['ללא חפיפה למילות היעד'] };
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
    return { title: title || 'ShirAmiram vocabulary song', generation: 'pending_manual',
      note: 'Export only. No Suno generation performed; paste manually in Suno if you choose.',
      stylePrompt: 'educational English vocabulary song, clear slow singing, simple melody, words: ' + ws.map(function (w) { return w.word; }).join(', '),
      lyrics: lyrics, words: ws.map(function (w) { return w.word; }) };
  }

  // Weak-words queue Empty State: show the card only when the queue is empty, otherwise show the word list.
  function applyWeakWordsEmptyState(els, queueLength, message) {
    var n = Number(queueLength) || 0;
    var isEmpty = n <= 0;
    var e = els || {};
    if (e.empty && e.empty.classList) e.empty.classList.toggle('hidden', !isEmpty);
    if (e.empty) e.empty.setAttribute('aria-hidden', String(!isEmpty));
    if (e.list && e.list.classList) e.list.classList.toggle('hidden', isEmpty);
    if (isEmpty && e.message) e.message.textContent = message || '';
    return { isEmpty: isEmpty, queueLength: n };
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

  return {
    songDominantLevel: songDominantLevel, filterSongsByLevel: filterSongsByLevel, SONG_LEVELS: SONG_LEVELS,
    VOCAB: VOCAB, CATEGORIES: CATEGORIES, CATEGORY_HE: CATEGORY_HE, DIFFICULTY_HE: DIFFICULTY_HE, QUIZ: QUIZ,
    LINES: LINES, LINE_SEC: LINE_SEC, LOOP_SEC: LOOP_SEC, TUNE: TUNE, NOTE_SEC: NOTE_SEC,
    filterVocab: filterVocab, findWord: findWord, formatTime: formatTime, positionAt: positionAt, isCorrect: isCorrect,
    validateContent: validateContent, loadContent: loadContent, spotifyEmbedUrl: spotifyEmbedUrl, spotifyTrackUrl: spotifyTrackUrl, youtubeEmbedUrl: youtubeEmbedUrl, youtubeMusicLink: youtubeMusicLink, recommendSongs: recommendSongs, parseLRC: parseLRC, parseTimingData: parseTimingData, activeTimedLine: activeTimedLine, validateAudioFile: validateAudioFile, buildSunoExport: buildSunoExport, QUIZ_LAYOUT: QUIZ_LAYOUT,
    applyWeakWordsEmptyState: applyWeakWordsEmptyState
  };
});
