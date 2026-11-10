// ShirAmiram — Spaced Repetition Flashcards (Leitner SRS Engine)
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ShirAmiramSRS = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STORAGE_KEY = 'shiramiram:srs:v1';
  const DAY_MS = 24 * 60 * 60 * 1000;

  const BOX_INTERVALS_DAYS = {
    1: 0,
    2: 1,
    3: 3,
    4: 7,
    5: 14
  };

  /**
   * Initialize progress record for a new word.
   * @param {string|number} wordId
   * @param {Date} [now]
   * @returns {Object}
   */
  function initProgress(wordId, now = new Date()) {
    const nowDate = now instanceof Date ? now : new Date(now);
    return {
      wordId: String(wordId),
      box: 1,
      dueAt: nowDate.toISOString(),
      reviewCount: 0,
      correctCount: 0,
      lastReviewedAt: null,
      lastResult: null
    };
  }

  /**
   * Pure state transition for Leitner SRS based on review response.
   * @param {Object} current
   * @param {'again'|'hard'|'good'|'easy'} result
   * @param {Date} [now]
   * @returns {Object} Updated progress record
   */
  function calculateNextState(current, result, now = new Date()) {
    const nowDate = now instanceof Date ? now : new Date(now);
    const prev = current || initProgress(current?.wordId || 'unknown', nowDate);
    const curBox = Math.max(1, Math.min(5, prev.box || 1));
    let nextBox = curBox;
    let intervalDays = 0;

    switch (result) {
      case 'again':
        nextBox = 1;
        intervalDays = BOX_INTERVALS_DAYS[1];
        break;
      case 'hard':
        nextBox = curBox;
        intervalDays = Math.max(1, Math.floor((BOX_INTERVALS_DAYS[curBox] || 1) / 2));
        break;
      case 'good':
        nextBox = Math.min(5, curBox + 1);
        intervalDays = BOX_INTERVALS_DAYS[nextBox];
        break;
      case 'easy':
        nextBox = Math.min(5, curBox + 2);
        intervalDays = BOX_INTERVALS_DAYS[nextBox];
        break;
      default:
        nextBox = curBox;
        intervalDays = BOX_INTERVALS_DAYS[curBox];
        break;
    }

    const nextDue = new Date(nowDate.getTime() + intervalDays * DAY_MS);
    const isCorrect = result === 'good' || result === 'easy';

    return {
      wordId: String(prev.wordId),
      box: nextBox,
      dueAt: nextDue.toISOString(),
      reviewCount: (prev.reviewCount || 0) + 1,
      correctCount: (prev.correctCount || 0) + (isCorrect ? 1 : 0),
      lastReviewedAt: nowDate.toISOString(),
      lastResult: result
    };
  }

  /**
   * Build a flashcard study session prioritizing overdue cards then new cards.
   * @param {Array} allWords List of vocabulary objects
   * @param {Object} progressMap Map of wordId -> FlashcardProgress
   * @param {Object} [options]
   * @returns {Array} Selected cards for the session
   */
  function createSession(allWords, progressMap = {}, options = {}) {
    if (!Array.isArray(allWords) || allWords.length === 0) return [];

    const now = options.now ? new Date(options.now) : new Date();
    const batchSize = options.batchSize || 15;
    const levelFilter = options.level; // 'A', 'B', 'C', or undefined

    let pool = allWords.slice();
    if (levelFilter) {
      const code = levelFilter.replace('level_', '').replace('_foundational', '').replace('_intermediate', '').replace('_advanced', '').toUpperCase();
      pool = pool.filter(w => {
        const lvl = (w.level || w.difficulty || '').toUpperCase();
        return lvl.startsWith(code) || lvl.includes(code);
      });
    }

    const dueCards = [];
    const newCards = [];

    pool.forEach(item => {
      const key = String(item.id || item.word);
      const prog = progressMap[key];
      if (!prog) {
        newCards.push(item);
      } else {
        const dueDate = new Date(prog.dueAt || 0);
        if (dueDate <= now) {
          dueCards.push(item);
        }
      }
    });

    // Prioritize due cards first, then fill up to batchSize with new cards
    const remainingSlots = Math.max(0, batchSize - dueCards.length);
    const selectedNew = newCards.slice(0, remainingSlots);

    const sessionList = [...dueCards.slice(0, batchSize), ...selectedNew];
    return sessionList.slice(0, batchSize);
  }

  /**
   * Load SRS state from storage safely.
   */
  function loadState(storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
    if (!storage) return { version: 1, cards: {}, dailyStats: {} };
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return { version: 1, cards: {}, dailyStats: {} };
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          version: parsed.version || 1,
          cards: parsed.cards || {},
          dailyStats: parsed.dailyStats || {}
        };
      }
    } catch (e) {
      console.warn('Failed to parse SRS state from storage, resetting clean state', e);
    }
    return { version: 1, cards: {}, dailyStats: {} };
  }

  /**
   * Save SRS state to storage safely.
   */
  function saveState(state, storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
    if (!storage) return false;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      console.error('Failed to save SRS state to storage', e);
      return false;
    }
  }

  /**
   * Process a card review response, update card state in state object and record daily stats.
   * @param {Object} state Current SRS state object
   * @param {string|number} wordId
   * @param {'again'|'hard'|'good'|'easy'} result
   * @param {Date} [now]
   * @returns {Object} Updated state object
   */
  function recordReview(state, wordId, result, now = new Date()) {
    const nowDate = now instanceof Date ? now : new Date(now);
    const key = String(wordId);
    const currentState = state && state.cards ? state.cards[key] : null;
    const nextCardState = calculateNextState(currentState || initProgress(key, nowDate), result, nowDate);

    const dateKey = nowDate.toISOString().slice(0, 10);
    const prevStats = (state && state.dailyStats && state.dailyStats[dateKey]) || {
      reviewedCount: 0,
      correctCount: 0,
      againCount: 0,
      hardCount: 0,
      goodCount: 0,
      easyCount: 0
    };

    const isCorrect = result === 'good' || result === 'easy';
    const updatedStats = {
      reviewedCount: prevStats.reviewedCount + 1,
      correctCount: prevStats.correctCount + (isCorrect ? 1 : 0),
      againCount: prevStats.againCount + (result === 'again' ? 1 : 0),
      hardCount: prevStats.hardCount + (result === 'hard' ? 1 : 0),
      goodCount: prevStats.goodCount + (result === 'good' ? 1 : 0),
      easyCount: prevStats.easyCount + (result === 'easy' ? 1 : 0)
    };

    return {
      version: (state && state.version) || 1,
      cards: {
        ...(state && state.cards ? state.cards : {}),
        [key]: nextCardState
      },
      dailyStats: {
        ...(state && state.dailyStats ? state.dailyStats : {}),
        [dateKey]: updatedStats
      }
    };
  }

  return {
    STORAGE_KEY,
    BOX_INTERVALS_DAYS,
    initProgress,
    calculateNextState,
    createSession,
    loadState,
    saveState,
    recordReview
  };
}));
