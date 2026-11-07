// ShirAmiram — Vocab Module for Amiram Vocabulary Expansion
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ShirAmiramVocab = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const LEVELS = [
    { id: 'all', he: 'הכל', en: 'All' },
    { id: 'A_foundational', he: 'רמה A (בסיסי)', en: 'Level A' },
    { id: 'B_intermediate', he: 'רמה B (בינוני)', en: 'Level B' },
    { id: 'C_advanced', he: 'רמה C (מתקדם)', en: 'Level C' }
  ];

  const LEVEL_MAP = {
    A: 'A_foundational',
    B: 'B_intermediate',
    C: 'C_advanced',
    all: 'all',
    A_foundational: 'A_foundational',
    B_intermediate: 'B_intermediate',
    C_advanced: 'C_advanced'
  };

  /**
   * Filter vocabulary list by query and level.
   * @param {Array} vocabList - Array of vocab items
   * @param {string} query - Search string
   * @param {string} level - Level filter ('all', 'A', 'B', 'C', or full level id)
   * @returns {Array} Filtered list
   */
  function filterByLevel(vocabList, query, level) {
    if (!Array.isArray(vocabList)) return [];
    const q = (query || '').trim().toLowerCase();
    const targetLevel = LEVEL_MAP[level] || 'all';

    return vocabList.filter(item => {
      // Level check
      if (targetLevel !== 'all' && item.level !== targetLevel) {
        return false;
      }

      // Query check (English word, Hebrew translation, or Hebrew definition)
      if (!q) return true;
      const word = String(item.word || '').toLowerCase();
      const tr = String(item.hebrew_translation || item.translation || '');
      const def = String(item.hebrew_definition || '');

      return word.includes(q) || tr.includes(q) || def.includes(q);
    });
  }

  /**
   * Validate dataset format and constraints
   * @param {Array} list
   * @returns {{ok: boolean, count: number, errors: Array}}
   */
  function validateVocabDataset(list) {
    const errors = [];
    if (!Array.isArray(list)) {
      return { ok: false, count: 0, errors: ['Expected array of words'] };
    }
    const seen = new Set();
    const hebrewRegex = /[\u0590-\u05FF]/;

    list.forEach((item, index) => {
      if (!item || typeof item !== 'object') {
        errors.push(`Row ${index} is not an object`);
        return;
      }
      if (!item.id || typeof item.id !== 'number') {
        errors.push(`Row ${index}: invalid or missing id`);
      }
      if (!item.word || typeof item.word !== 'string') {
        errors.push(`Row ${index}: invalid or missing word`);
      } else {
        const w = item.word.toLowerCase();
        if (seen.has(w)) {
          errors.push(`Duplicate word: ${w}`);
        }
        seen.add(w);
      }
      if (!['A_foundational', 'B_intermediate', 'C_advanced'].includes(item.level)) {
        errors.push(`Row ${index} (${item.word}): invalid level ${item.level}`);
      }
      if (!item.hebrew_translation || !hebrewRegex.test(item.hebrew_translation)) {
        errors.push(`Row ${index} (${item.word}): missing or non-Hebrew translation`);
      }
      if (!item.hebrew_definition || !item.hebrew_definition.includes(':')) {
        errors.push(`Row ${index} (${item.word}): definition must follow format 'חלק דיבר: פירוש'`);
      }
      if (!item.sample_sentence || typeof item.sample_sentence !== 'string') {
        errors.push(`Row ${index} (${item.word}): missing sample sentence`);
      }
    });

    return {
      ok: errors.length === 0,
      count: list.length,
      errors
    };
  }

  return {
    LEVELS,
    LEVEL_MAP,
    filterByLevel,
    validateVocabDataset
  };
}));
