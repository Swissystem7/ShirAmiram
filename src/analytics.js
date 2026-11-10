// ShirAmiram — Amiram Score Estimator & Learning Analytics Engine
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ShirAmiramAnalytics = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STORAGE_KEY = 'shiramiram:analytics:v1';

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  /**
   * Map provisional Amiram score (50-150) to CEFR and Israeli academic exemption level.
   * @param {number} score
   * @returns {{ cefr: string, academicLevel: string, description: string }}
   */
  function estimateCefr(score) {
    const s = Math.round(score);
    if (s >= 134) {
      return { cefr: 'C1', academicLevel: 'פטור', description: 'פטור מלא מלימודי אנגלית באקדמיה' };
    } else if (s >= 120) {
      return { cefr: 'B2', academicLevel: 'מתקדמים ב\'', description: 'קורס אחד בלבד לקראת פטור' };
    } else if (s >= 100) {
      return { cefr: 'B1', academicLevel: 'מתקדמים א\'', description: 'שני קורסי אנגלית אקדמית' };
    } else if (s >= 85) {
      return { cefr: 'A2', academicLevel: 'בסיסי', description: 'שלושה קורסי אנגלית' };
    }
    return { cefr: 'Pre-A2', academicLevel: 'טרום בסיסי', description: 'דורש חיזוק משמעותי של אוצר המילים הבסיסי' };
  }

  /**
   * Calculate provisional Amiram score between 50 and 150 based on:
   * - clozeAccuracy (40%)
   * - retentionStrength (30%)
   * - vocabularyCoverage (20%)
   * - consistency (10%)
   * @param {Object} state
   * @param {Array} vocab
   * @returns {{ score: number, confidence: string, sampleSize: number, metrics: Object }}
   */
  function calculateAmiramScore(state = {}, vocab = []) {
    const attempts = state.attempts || [];
    const cards = state.cards || {};
    const sampleSize = attempts.length;

    // Cloze accuracy: last 30 attempts weighted heavily
    const recentAttempts = attempts.slice(-30);
    const clozeCorrect = recentAttempts.filter(a => a.correct).length;
    const clozeAccuracy = recentAttempts.length > 0 ? (clozeCorrect / recentAttempts.length) : 0.5;

    // Retention strength: Leitner box distribution of reviewed cards
    const cardKeys = Object.keys(cards);
    let totalBoxScore = 0;
    cardKeys.forEach(k => {
      const box = Math.max(1, Math.min(5, cards[k].box || 1));
      totalBoxScore += (box - 1) / 4; // Box 1 = 0, Box 5 = 1.0
    });
    const retentionStrength = cardKeys.length > 0 ? (totalBoxScore / cardKeys.length) : 0.2;

    // Vocabulary coverage: percentage of vocab mastered (Box 4 or 5) or correctly answered
    const totalVocab = vocab.length || 300;
    let masteredCount = 0;
    cardKeys.forEach(k => {
      if ((cards[k].box || 1) >= 4) masteredCount++;
    });
    const vocabularyCoverage = clamp(masteredCount / totalVocab, 0, 1);

    // Consistency: active days in attempts
    const activeDays = new Set(attempts.map(a => (a.at || '').slice(0, 10))).size;
    const consistency = clamp(activeDays / 7, 0, 1); // 7 active days = full consistency

    const composite = (0.40 * clozeAccuracy) + (0.30 * retentionStrength) + (0.20 * vocabularyCoverage) + (0.10 * consistency);
    const rawScore = 50 + (100 * composite);
    const score = Math.round(clamp(rawScore, 50, 150));

    let confidence = 'נמוכה (מבוסס על מדגם ראשוני)';
    if (sampleSize >= 40) confidence = 'גבוהה';
    else if (sampleSize >= 15) confidence = 'בינונית';

    return {
      score,
      confidence,
      sampleSize,
      metrics: {
        clozeAccuracy: Math.round(clozeAccuracy * 100),
        retentionStrength: Math.round(retentionStrength * 100),
        vocabularyCoverage: Math.round(vocabularyCoverage * 100),
        consistency: Math.round(consistency * 100)
      }
    };
  }

  /**
   * Summarize vocabulary mastery broken down by level (A, B, C).
   * @param {Array} vocab
   * @param {Object} cards
   * @returns {Object} { A: { mastered, learning, unseen, total }, B: ..., C: ..., overall: ... }
   */
  function summarizeMastery(vocab = [], cards = {}) {
    const summary = {
      A: { mastered: 0, learning: 0, unseen: 0, total: 0 },
      B: { mastered: 0, learning: 0, unseen: 0, total: 0 },
      C: { mastered: 0, learning: 0, unseen: 0, total: 0 },
      overall: { mastered: 0, learning: 0, unseen: 0, total: vocab.length }
    };

    vocab.forEach(item => {
      const lvl = (item.level || '').includes('A') ? 'A' : ((item.level || '').includes('B') ? 'B' : 'C');
      if (!summary[lvl]) return;

      summary[lvl].total++;
      const card = cards[String(item.id || item.word)];
      const box = card ? (card.box || 1) : 0;

      if (box >= 4) {
        summary[lvl].mastered++;
        summary.overall.mastered++;
      } else if (box >= 2) {
        summary[lvl].learning++;
        summary.overall.learning++;
      } else {
        summary[lvl].unseen++;
        summary.overall.unseen++;
      }
    });

    return summary;
  }

  /**
   * Record a Cloze or Flashcard attempt and update the state.
   * @param {Object} state
   * @param {string|number} cardId
   * @param {'cloze'|'flashcard'} mode
   * @param {boolean} correct
   * @param {Date} [now]
   * @returns {Object} updated state
   */
  function recordAttempt(state = {}, cardId, mode, correct, now = new Date()) {
    const nextState = {
      version: 1,
      cards: { ...(state.cards || {}) },
      attempts: [...(state.attempts || [])]
    };

    const idStr = String(cardId);
    const nowDate = now instanceof Date ? now : new Date(now);

    nextState.attempts.push({
      cardId: idStr,
      mode,
      correct: Boolean(correct),
      at: nowDate.toISOString()
    });

    // Keep max 200 attempts for performance
    if (nextState.attempts.length > 200) {
      nextState.attempts = nextState.attempts.slice(-200);
    }

    const card = nextState.cards[idStr] || {
      box: 1,
      correct: 0,
      incorrect: 0,
      clozeCorrect: 0,
      clozeIncorrect: 0,
      lastReviewed: null,
      nextDue: null
    };

    if (mode === 'cloze') {
      if (correct) {
        card.clozeCorrect = (card.clozeCorrect || 0) + 1;
      } else {
        card.clozeIncorrect = (card.clozeIncorrect || 0) + 1;
        // On cloze mistake, demote card or keep in box 1
        card.box = 1;
        card.nextDue = nowDate.toISOString();
      }
    } else {
      if (correct) card.correct = (card.correct || 0) + 1;
      else card.incorrect = (card.incorrect || 0) + 1;
    }

    card.lastReviewed = nowDate.toISOString();
    nextState.cards[idStr] = card;

    return nextState;
  }

  /**
   * Build a queue of weak words prioritized by repeated cloze mistakes and low box.
   * @param {Object} state
   * @param {Array} vocab
   * @param {number} [limit=10]
   * @returns {Array} weak words list
   */
  function buildReviewQueue(state = {}, vocab = [], limit = 10) {
    const cards = state.cards || {};
    const candidateWords = [];

    vocab.forEach(item => {
      const idStr = String(item.id || item.word);
      const card = cards[idStr];
      if (!card) return;

      const mistakes = (card.clozeIncorrect || 0) + (card.incorrect || 0);
      if (mistakes > 0 || (card.box || 1) === 1) {
        candidateWords.push({
          word: item,
          mistakes,
          box: card.box || 1,
          score: (mistakes * 3) + (5 - (card.box || 1))
        });
      }
    });

    // Sort by highest mistake priority
    candidateWords.sort((a, b) => b.score - a.score);
    return candidateWords.slice(0, limit).map(c => c.word);
  }

  // Weak Words Review Queue helpers
  const WEAK_WORDS_EMPTY_MESSAGE = 'אין מילים חלשות לבחינה';
  function getWeakWordsQueueLength(state = {}, vocab = [], limit = 10) {
    return buildReviewQueue(state, vocab, limit).length;
  }
  function getWeakWordsEmptyMessage() {
    return WEAK_WORDS_EMPTY_MESSAGE;
  }

  function loadAnalyticsState(storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
    if (!storage) return { version: 1, cards: {}, attempts: [] };
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return { version: 1, cards: {}, attempts: [] };
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          version: parsed.version || 1,
          cards: parsed.cards || {},
          attempts: Array.isArray(parsed.attempts) ? parsed.attempts : []
        };
      }
    } catch (e) {
      console.warn('Resetting analytics state due to invalid JSON', e);
    }
    return { version: 1, cards: {}, attempts: [] };
  }

  function saveAnalyticsState(state, storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
    if (!storage) return false;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      console.error('Failed to save analytics state', e);
      return false;
    }
  }

  return {
    STORAGE_KEY,
    clamp,
    estimateCefr,
    calculateAmiramScore,
    summarizeMastery,
    recordAttempt,
    buildReviewQueue,
    getWeakWordsQueueLength,
    getWeakWordsEmptyMessage,
    loadAnalyticsState,
    saveAnalyticsState
  };
}));
