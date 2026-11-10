// ShirAmiram — Amiram Exam Simulator Engine (Sentence Completion & Adaptive Levels)
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ShirAmiramExam = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * Generate distractors (wrong options) for a target word from the same level or dataset.
   * @param {Object} targetWord
   * @param {Array} allWords
   * @param {number} count (default 3)
   * @returns {Array<string>} 3 distinct wrong options
   */
  function normalizePos(pos) {
    if (typeof pos !== 'string') return '';
    return pos.trim().toLowerCase();
  }

  function pickDistractors(targetWord, allWords, count = 3) {
    if (!targetWord || typeof targetWord.word !== 'string') return [];
    const target = targetWord.word.toLowerCase();
    const targetPos = normalizePos(targetWord.part_of_speech);
    const valid = (Array.isArray(allWords) ? allWords : []).filter(
      w => w && typeof w.word === 'string' && w.word.trim() !== '' && w.word.toLowerCase() !== target
    );

    // Prefer words from the same part of speech. A missing POS tag on either
    // side is never treated as a match (undefined === undefined is not "same POS").
    const candidates = targetPos ? valid.filter(w => normalizePos(w.part_of_speech) === targetPos) : [];

    const fallback = valid;
    const pool = candidates.length >= count ? candidates : fallback;

    // Deterministic selection based on word character codes
    const seed = target.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const shuffled = pool.slice().sort((a, b) => {
      const valA = (a.word.charCodeAt(0) * seed + (Number(a.id) || 0)) % 100;
      const valB = (b.word.charCodeAt(0) * seed + (Number(b.id) || 0)) % 100;
      return valA - valB;
    });

    const selected = [];
    const seen = new Set();
    for (const item of shuffled) {
      const w = item.word.toLowerCase();
      if (!seen.has(w) && w !== target) {
        seen.add(w);
        selected.push(w);
        if (selected.length === count) break;
      }
    }

    return selected;
  }

  /**
   * Generate an Amiram cloze question from a vocabulary record.
   * Replaces the target word in its sample sentence with '______'.
   * @param {Object} wordItem
   * @param {Array} allWords
   * @returns {Object} Question object
   */
  function buildQuestion(wordItem, allWords) {
    const word = wordItem.word.toLowerCase();
    const sentence = wordItem.sample_sentence || '';
    
    // Case-insensitive replacement of whole word
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    let clozeSentence = sentence.replace(regex, '______');
    if (!clozeSentence.includes('______')) {
      // Fallback if inflected in sentence
      const firstSpace = sentence.indexOf(' ');
      clozeSentence = sentence.replace(word, '______');
    }

    const distractors = pickDistractors(wordItem, allWords, 3);
    const options = [word, ...distractors].sort((a, b) => {
      // Deterministic option shuffle based on word length and alphabet
      return (a.charCodeAt(0) + a.length) - (b.charCodeAt(0) + b.length);
    });

    return {
      id: wordItem.id,
      word: word,
      level: wordItem.level,
      part_of_speech: wordItem.part_of_speech,
      question: clozeSentence,
      original_sentence: sentence,
      answer: word,
      options,
      translation: wordItem.hebrew_translation,
      definition: wordItem.hebrew_definition,
      explanation: `${wordItem.hebrew_translation} (${wordItem.hebrew_definition})`
    };
  }

  /**
   * Create an exam session with filtered questions.
   * @param {Array} allWords
   * @param {string} mode ('A', 'B', 'C', 'mixed_25', or 'all')
   * @param {number} limit
   * @returns {Array<Object>} Generated questions
   */
  function createExam(allWords, mode = 'mixed_25', limit = 20) {
    if (!Array.isArray(allWords) || allWords.length === 0) return [];

    let pool = allWords.slice();
    if (mode === 'A' || mode === 'A_foundational') {
      pool = pool.filter(w => w.level === 'A_foundational');
    } else if (mode === 'B' || mode === 'B_intermediate') {
      pool = pool.filter(w => w.level === 'B_intermediate');
    } else if (mode === 'C' || mode === 'C_advanced') {
      pool = pool.filter(w => w.level === 'C_advanced');
    } else if (mode === 'mixed_25') {
      const a = pool.filter(w => w.level === 'A_foundational').slice(0, 8);
      const b = pool.filter(w => w.level === 'B_intermediate').slice(0, 9);
      const c = pool.filter(w => w.level === 'C_advanced').slice(0, 8);
      pool = [...a, ...b, ...c];
      return pool.map(item => buildQuestion(item, allWords));
    }

    return pool.slice(0, limit).map(item => buildQuestion(item, allWords));
  }

  return {
    pickDistractors,
    buildQuestion,
    createExam
  };
}));
