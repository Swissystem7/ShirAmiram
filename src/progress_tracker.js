// Keeps the learner's XP and practice days, so the XP engine, the streak badges and the review
// calendar have something to show. State lives in localStorage; every function here is pure
// except load() and save().
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ShirAmiramProgress = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STORAGE_KEY = 'shiramiram:progress:v1';
  const MAX_DAYS_KEPT = 400;

  function emptyState() {
    return { version: 1, xp: 0, days: {}, answered: 0, correct: 0, run: 0 };
  }

  // The learner's own calendar day, not UTC: practising at 00:30 belongs to the new day.
  function localISODate(date) {
    const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function shiftISODate(iso, deltaDays) {
    const parts = String(iso).split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + deltaDays);
    return localISODate(d);
  }

  function normalize(raw) {
    const s = emptyState();
    if (!raw || typeof raw !== 'object') return s;
    const num = (v) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
    s.xp = num(raw.xp);
    s.answered = num(raw.answered);
    s.correct = num(raw.correct);
    s.run = num(raw.run);
    if (raw.days && typeof raw.days === 'object') {
      Object.keys(raw.days).forEach((k) => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(k) && num(raw.days[k]) > 0) s.days[k] = num(raw.days[k]);
      });
    }
    return s;
  }

  function trimDays(days) {
    const keys = Object.keys(days).sort();
    if (keys.length <= MAX_DAYS_KEPT) return days;
    const out = {};
    keys.slice(-MAX_DAYS_KEPT).forEach((k) => { out[k] = days[k]; });
    return out;
  }

  function bumpDay(state, now) {
    const next = normalize(state);
    const iso = localISODate(now);
    next.days[iso] = (next.days[iso] || 0) + 1;
    next.days = trimDays(next.days);
    return next;
  }

  /**
   * A quiz answer. Correct answers earn XP from the XP engine (more for a run of correct
   * answers); a wrong answer ends the run. Either way the day counts as a practice day.
   */
  function recordAnswer(state, isCorrect, now, xpEngine) {
    const next = bumpDay(state, now);
    next.answered += 1;
    if (isCorrect === true) {
      const earned = xpEngine && typeof xpEngine.calculateActivityXP === 'function'
        ? xpEngine.calculateActivityXP('QUIZ_CORRECT', { streak: next.run })
        : 10;
      next.xp += earned;
      next.correct += 1;
      next.run += 1;
    } else {
      next.run = 0;
    }
    return next;
  }

  /** A flashcard rating: counts toward the practice day, earns no XP. */
  function recordReview(state, now) {
    return bumpDay(state, now);
  }

  /** Consecutive practice days ending today, or ending yesterday when today is still empty. */
  function currentStreak(days, todayIso) {
    const map = days && typeof days === 'object' ? days : {};
    let cursor = map[todayIso] > 0 ? todayIso : shiftISODate(todayIso, -1);
    let count = 0;
    while (map[cursor] > 0) {
      count += 1;
      cursor = shiftISODate(cursor, -1);
    }
    return count;
  }

  /**
   * First run for someone who already practised: rebuild days and XP from the analytics
   * attempt log (it keeps the last 200 attempts), so they do not start from zero.
   */
  function seedFromAttempts(attempts, xpEngine) {
    let state = emptyState();
    (Array.isArray(attempts) ? attempts : [])
      .filter((a) => a && typeof a.at === 'string' && !Number.isNaN(Date.parse(a.at)))
      .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
      .forEach((a) => { state = recordAnswer(state, a.correct === true, new Date(a.at), xpEngine); });
    return state;
  }

  // Same curve as xp_engine.calculateLevelFromXP, for when that script did not load.
  function fallbackLevel(xp) {
    const level = Math.min(50, Math.floor(Math.sqrt(xp / 100)) + 1);
    const currentLevelXP = 100 * (level - 1) ** 2;
    if (level >= 50) return { level, currentLevelXP, nextLevelXP: null, progressPercent: 100 };
    const nextLevelXP = 100 * level ** 2;
    const progressPercent = Math.floor(((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100);
    return { level, currentLevelXP, nextLevelXP, progressPercent };
  }

  function summarize(state, now, xpEngine, streakBadges) {
    const s = normalize(state);
    const today = localISODate(now);
    const level = xpEngine && typeof xpEngine.calculateLevelFromXP === 'function'
      ? xpEngine.calculateLevelFromXP(s.xp)
      : fallbackLevel(s.xp);
    const streakDays = currentStreak(s.days, today);
    const earned = streakBadges && typeof streakBadges.evaluateStreakMilestones === 'function'
      ? streakBadges.evaluateStreakMilestones(streakDays) : [];
    const milestones = streakBadges && Array.isArray(streakBadges.MILESTONES) ? streakBadges.MILESTONES : [];
    const upcoming = milestones.find((m) => m.days > streakDays) || null;
    return {
      xp: s.xp,
      level: level.level,
      progressPercent: level.progressPercent,
      xpToNext: level.nextLevelXP == null ? 0 : Math.max(0, level.nextLevelXP - s.xp),
      streakDays,
      practisedToday: (s.days[today] || 0) > 0,
      streakTitle: earned.length ? earned[earned.length - 1].titleHebrew : '',
      nextMilestoneDays: upcoming ? upcoming.days : null,
      answered: s.answered,
      correct: s.correct,
      activeDays: Object.keys(s.days).length
    };
  }

  // Reading window.localStorage itself throws when the browser blocks site storage, so the
  // lookup sits inside the try as well.
  function load(storage) {
    try {
      const store = storage !== undefined ? storage : (typeof localStorage !== 'undefined' ? localStorage : null);
      if (!store) return null;
      const raw = store.getItem(STORAGE_KEY);
      return raw ? normalize(JSON.parse(raw)) : null;
    } catch (e) {
      return null;
    }
  }

  function save(state, storage) {
    try {
      const store = storage !== undefined ? storage : (typeof localStorage !== 'undefined' ? localStorage : null);
      if (!store) return false;
      store.setItem(STORAGE_KEY, JSON.stringify(normalize(state)));
      return true;
    } catch (e) {
      return false; // blocked or full storage: progress lasts for this visit only
    }
  }

  return {
    STORAGE_KEY, emptyState, localISODate, shiftISODate, normalize,
    recordAnswer, recordReview, currentStreak, seedFromAttempts, summarize, load, save
  };
}));
