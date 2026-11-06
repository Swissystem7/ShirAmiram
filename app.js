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

  return {
    VOCAB: VOCAB, CATEGORIES: CATEGORIES, CATEGORY_HE: CATEGORY_HE, DIFFICULTY_HE: DIFFICULTY_HE, QUIZ: QUIZ,
    LINES: LINES, LINE_SEC: LINE_SEC, LOOP_SEC: LOOP_SEC, TUNE: TUNE, NOTE_SEC: NOTE_SEC,
    filterVocab: filterVocab, findWord: findWord, formatTime: formatTime, positionAt: positionAt, isCorrect: isCorrect
  };
});
