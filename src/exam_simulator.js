// ShirAmiram — Amiram Exam Simulator Engine (Sentence Completion & Adaptive Levels)
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ShirAmiramExam = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const WORD_CHAR = /\w/;

  function isWordChar(ch) {
    return ch !== undefined && WORD_CHAR.test(ch);
  }

  /**
   * Find the first case-insensitive whole-word occurrence of `word` in `text`
   * (same semantics as /\bword\b/i, with `word` matched literally).
   * Uses no dynamically built RegExp.
   * @param {string} text
   * @param {string} word
   * @returns {number} start index, or -1
   */
  function findWholeWord(text, word) {
    const haystack = text.toLowerCase();
    const needle = word.toLowerCase();
    let from = 0;
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

  /**
   * Generate distractors (wrong options) for a target word from the same level or dataset.
   * @param {Object} targetWord
   * @param {Array} allWords
   * @param {number} count (default 3)
   * @returns {Array<string>} 3 distinct wrong options
   */
  function pickDistractors(targetWord, allWords, count = 3) {
    const target = targetWord.word.toLowerCase();
    // Prefer words from the same part of speech and level
    const candidates = (allWords || []).filter(w => {
      const candidateWord = w.word.toLowerCase();
      return candidateWord !== target && w.part_of_speech === targetWord.part_of_speech;
    });

    const fallback = (allWords || []).filter(w => w.word.toLowerCase() !== target);
    const pool = candidates.length >= count ? candidates : fallback;

    // Deterministic selection based on word character codes
    const seed = target.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const shuffled = pool.slice().sort((a, b) => {
      const valA = (a.word.charCodeAt(0) * seed + a.id) % 100;
      const valB = (b.word.charCodeAt(0) * seed + b.id) % 100;
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
    const at = findWholeWord(sentence, word);
    let clozeSentence = at === -1
      ? sentence
      : sentence.slice(0, at) + '______' + sentence.slice(at + word.length);
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
