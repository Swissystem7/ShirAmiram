// ShirAmiram — Amiram Practice Simulation Engine (pure logic, no UI)
//
// PRACTICE APPROXIMATION — READ BEFORE USE:
// This module is a practice approximation only. It is NOT official exam
// scoring and does NOT determine actual exemption from academic English
// courses. Only the official exam and the accepting institution can do that.
// The practice settings of 25 questions and 20 minutes are local practice
// settings chosen for this app; they are NOT claims about the real exam,
// which is adaptive. Do not present results from this module as the real
// exam's format, timing, scoring, or exemption decision.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ShirAmiramSimulation = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var QUESTION_COUNT = 25;
  var DURATION_MINUTES = 20;
  var DURATION_SEC = DURATION_MINUTES * 60; // 1200

  // Practice level identifiers (local to this practice module).
  // Mapping to the repo's existing identifiers in src/analytics.js
  // (estimateCefr): 'Exemption' = full exemption (repo: 'פטור', CEFR C1),
  // 'AdvancedB' (repo: 'מתקדמים ב\'', CEFR B2), 'AdvancedA' (repo:
  // 'מתקדמים א\'', CEFR B1), 'Basic' (repo: 'בסיסי', CEFR A2),
  // 'PreBasic' (repo: 'טרום בסיסי', CEFR Pre-A2). These are practice
  // labels on the same 50-150 practice scale, not official determinations.
  var LEVELS = Object.freeze({
    EXEMPTION: 'Exemption',
    ADVANCED_B: 'AdvancedB',
    ADVANCED_A: 'AdvancedA',
    BASIC: 'Basic',
    PRE_BASIC: 'PreBasic'
  });

  function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function questionKey(question, index) {
    if (question && typeof question === 'object') {
      if (question.id !== undefined && question.id !== null) return String(question.id);
      if (question.questionId !== undefined && question.questionId !== null) {
        return String(question.questionId);
      }
      if (question.word !== undefined && question.word !== null) return String(question.word);
    }
    return String(index);
  }

  function correctAnswerOf(question) {
    if (!question || typeof question !== 'object') return undefined;
    if (question.correctAnswer !== undefined) return question.correctAnswer;
    if (question.correct_answer !== undefined) return question.correct_answer;
    if (question.answer !== undefined) return question.answer;
    if (question.correctOption !== undefined) return question.correctOption;
    return undefined;
  }

  /**
   * Practice score on the 50-150 practice scale.
   * calculateAmiramScore(correct, total = 25) -> Math.round(50 + correct/total*100)
   * This is a practice approximation, not official exam scoring.
   */
  function calculateAmiramScore(correct, total) {
    var totalCount = total === undefined ? QUESTION_COUNT : total;
    if (!isFiniteNumber(correct) || !isFiniteNumber(totalCount)) {
      throw new TypeError('correct and total must be finite numbers');
    }
    if (!Number.isInteger(totalCount) || totalCount <= 0) {
      throw new RangeError('total must be a positive integer');
    }
    if (!Number.isInteger(correct) || correct < 0 || correct > totalCount) {
      throw new RangeError('correct must be an integer between 0 and total');
    }
    return Math.round(50 + (correct / totalCount) * 100);
  }

  /** Map a 50-150 practice score to a practice level identifier. */
  function levelForScore(score) {
    if (!isFiniteNumber(score)) throw new TypeError('score must be a finite number');
    if (score >= 134) return LEVELS.EXEMPTION;
    if (score >= 120) return LEVELS.ADVANCED_B;
    if (score >= 100) return LEVELS.ADVANCED_A;
    if (score >= 85) return LEVELS.BASIC;
    return LEVELS.PRE_BASIC;
  }

  function resolveNow(config) {
    var fn = config.now || config.clock || null;
    if (fn !== null && typeof fn !== 'function') {
      throw new TypeError('config.now/config.clock must be a function');
    }
    return fn || function () { return Date.now(); };
  }

  function nowMs(nowFn) {
    var value = nowFn();
    if (value instanceof Date) return value.getTime();
    if (!isFiniteNumber(value)) throw new TypeError('clock must return ms or a Date');
    return value;
  }

  /**
   * Create a practice simulation session.
   * State contract (plain data, plus a non-enumerable injected clock):
   * {
   *   type: 'amiram-practice-simulation', version: 1,
   *   questions: [shallow copies of sampled pool items],
   *   answers: { [questionId]: selectedAnswer },
   *   questionCount, totalCount, durationMinutes, durationSec, timeLimitSec,
   *   startedAtMs, startedAt (ISO string)
   * }
   * config: { questionCount=25, durationMinutes=20 (or durationSec),
   *           random=Math.random, now|clock=Date.now, startedAtMs }
   * The input pool and its items are never mutated.
   */
  function createSimulation(questionsPool, config) {
    var cfg = config || {};
    if (!Array.isArray(questionsPool)) {
      throw new TypeError('questionsPool must be an array');
    }
    var questionCount = cfg.questionCount !== undefined ? cfg.questionCount
      : (cfg.count !== undefined ? cfg.count : QUESTION_COUNT);
    if (!Number.isInteger(questionCount) || questionCount <= 0) {
      throw new RangeError('config.questionCount must be a positive integer');
    }
    var durationSec = cfg.durationSec !== undefined ? cfg.durationSec
      : (cfg.timeLimitSec !== undefined ? cfg.timeLimitSec
        : (cfg.durationMinutes !== undefined ? cfg.durationMinutes * 60 : DURATION_SEC));
    if (!isFiniteNumber(durationSec) || durationSec <= 0) {
      throw new RangeError('simulation duration must be a positive number of seconds');
    }
    var random = cfg.random !== undefined ? cfg.random : Math.random;
    if (typeof random !== 'function') throw new TypeError('config.random must be a function');
    var nowFn = resolveNow(cfg);

    if (questionsPool.length < questionCount) {
      throw new RangeError('questionsPool has ' + questionsPool.length +
        ' questions; at least ' + questionCount + ' are required');
    }
    var seen = new Set();
    questionsPool.forEach(function (q, i) {
      var key = questionKey(q, i);
      if (seen.has(key)) throw new Error('duplicate question in pool: ' + key);
      seen.add(key);
    });

    // Fisher-Yates shuffle of a copy: the caller's pool is left untouched,
    // and sampling without replacement guarantees unique questions.
    var copy = questionsPool.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var r = random();
      if (!isFiniteNumber(r) || r < 0 || r >= 1) {
        throw new RangeError('config.random() must return a number in [0, 1)');
      }
      var j = Math.floor(r * (i + 1));
      var tmp = copy[i]; copy[i] = copy[j]; copy[j] = tmp;
    }
    var questions = copy.slice(0, questionCount).map(function (q) {
      return q && typeof q === 'object' ? Object.assign({}, q) : q;
    });

    var startedAtMs = cfg.startedAtMs !== undefined ? cfg.startedAtMs : nowMs(nowFn);
    if (!isFiniteNumber(startedAtMs)) {
      throw new TypeError('startedAtMs must be a finite number');
    }
    var session = {
      type: 'amiram-practice-simulation',
      version: 1,
      questions: questions,
      answers: {},
      questionCount: questionCount,
      totalCount: questionCount,
      durationMinutes: durationSec / 60,
      durationSec: durationSec,
      timeLimitSec: durationSec,
      startedAtMs: startedAtMs,
      startedAt: new Date(startedAtMs).toISOString()
    };
    // Keep the injected clock available to submitSimulation without
    // polluting the serializable / deep-equal shape of the session.
    Object.defineProperty(session, 'now', { value: nowFn, enumerable: false });
    return session;
  }

  /** Record an answer by question index, id, or question object. */
  function answerQuestion(session, questionRef, selectedAnswer) {
    if (!session || !Array.isArray(session.questions)) {
      throw new TypeError('session must be a simulation session with questions');
    }
    var index = -1;
    if (typeof questionRef === 'number') {
      // Prefer an id match; fall back to a positional index.
      index = session.questions.findIndex(function (q, i) {
        return questionKey(q, i) === String(questionRef);
      });
      if (index < 0) index = questionRef;
    } else {
      var key = String(questionRef && typeof questionRef === 'object'
        ? questionKey(questionRef, -1) : questionRef);
      index = session.questions.findIndex(function (q, i) {
        return questionKey(q, i) === key;
      });
    }
    if (index < 0 || index >= session.questions.length) {
      throw new RangeError('unknown question reference: ' + questionRef);
    }
    var question = session.questions[index];
    var id = questionKey(question, index);
    if (!session.answers || typeof session.answers !== 'object') session.answers = {};
    session.answers[id] = selectedAnswer;
    if (question && typeof question === 'object') question.selectedAnswer = selectedAnswer;
    return session;
  }

  function userAnswerOf(session, question, index, id) {
    var maps = [session.answers, session.responses, session.userAnswers];
    for (var m = 0; m < maps.length; m++) {
      var map = maps[m];
      if (Array.isArray(map) && map[index] !== undefined) return map[index];
      if (map && typeof map === 'object' && !Array.isArray(map)) {
        // Maps are keyed by question id only: an index key would collide
        // with numeric ids. Use an array form for positional answers.
        if (map[id] !== undefined) return map[id];
      }
    }
    if (!question || typeof question !== 'object') return undefined;
    var fields = ['userAnswer', 'selectedAnswer', 'selected', 'givenAnswer', 'response'];
    for (var f = 0; f < fields.length; f++) {
      if (question[fields[f]] !== undefined) return question[fields[f]];
    }
    return undefined;
  }

  function isCorrectAnswer(question, userAnswer) {
    if (userAnswer === undefined || userAnswer === null || userAnswer === '') return false;
    if (question && typeof question.isCorrect === 'boolean' &&
        userAnswer === undefined) return question.isCorrect;
    var expected = correctAnswerOf(question);
    if (expected === undefined) {
      if (question && typeof question.isCorrect === 'boolean') return question.isCorrect;
      if (question && typeof question.correct === 'boolean') return question.correct;
      return false;
    }
    var actual = userAnswer;
    // An integer answer against a string expected value is an option index.
    if (typeof actual === 'number' && typeof expected === 'string' &&
        question && Array.isArray(question.options)) {
      actual = question.options[actual];
    }
    if (typeof expected === 'number' && typeof actual === 'string' &&
        actual.trim() !== '' && !Number.isNaN(Number(actual))) {
      return Number(actual) === expected;
    }
    return String(actual).trim().toLowerCase() === String(expected).trim().toLowerCase();
  }

  function elapsedSec(session, durationSec) {
    if (isFiniteNumber(session.timeSpentSec)) {
      return Math.min(durationSec, Math.max(0, Math.floor(session.timeSpentSec)));
    }
    if (isFiniteNumber(session.elapsedSec)) {
      return Math.min(durationSec, Math.max(0, Math.floor(session.elapsedSec)));
    }
    var start = isFiniteNumber(session.startedAtMs) ? session.startedAtMs
      : (session.startedAt ? Date.parse(session.startedAt) : NaN);
    if (!isFiniteNumber(start)) return 0;
    var end = null;
    var endFields = ['endedAtMs', 'submittedAtMs', 'finishedAtMs'];
    for (var i = 0; i < endFields.length; i++) {
      if (isFiniteNumber(session[endFields[i]])) { end = session[endFields[i]]; break; }
    }
    if (end === null) {
      var fn = typeof session.now === 'function' ? session.now
        : (typeof session.clock === 'function' ? session.clock : null);
      if (fn) { var v = fn(); end = v instanceof Date ? v.getTime() : v; }
    }
    if (!isFiniteNumber(end)) end = Date.now();
    // Sensible clamping: a backwards clock yields 0, overtime is capped
    // at the practice time limit.
    return Math.min(durationSec, Math.max(0, Math.floor((end - start) / 1000)));
  }

  /**
   * Grade a session from createSimulation. Does not mutate the session.
   * Unanswered questions count as wrong and appear in reviewList.
   * Returns { score, level, correctCount, totalCount, timeSpentSec, reviewList }.
   */
  function submitSimulation(sessionState) {
    if (!sessionState || typeof sessionState !== 'object' ||
        !Array.isArray(sessionState.questions)) {
      throw new TypeError('sessionState must be a session with a questions array');
    }
    var questions = sessionState.questions;
    if (questions.length === 0) {
      throw new RangeError('sessionState.questions must not be empty');
    }
    var durationSec = isFiniteNumber(sessionState.durationSec) ? sessionState.durationSec
      : (isFiniteNumber(sessionState.timeLimitSec) ? sessionState.timeLimitSec : DURATION_SEC);
    var correctCount = 0;
    var reviewList = [];
    questions.forEach(function (q, index) {
      var id = questionKey(q, index);
      var userAnswer = userAnswerOf(sessionState, q, index, id);
      var explicit = q && typeof q.isCorrect === 'boolean' ? q.isCorrect
        : (q && typeof q.correct === 'boolean' && correctAnswerOf(q) === undefined
          ? q.correct : undefined);
      var ok = explicit !== undefined && userAnswer === undefined
        ? explicit : isCorrectAnswer(q, userAnswer);
      if (ok) { correctCount++; return; }
      reviewList.push({
        id: q && q.id !== undefined ? q.id : id,
        questionId: id,
        question: q ? (q.question || q.prompt || q.text || null) : null,
        correctAnswer: correctAnswerOf(q) !== undefined ? correctAnswerOf(q) : null,
        userAnswer: userAnswer !== undefined ? userAnswer : null,
        explanation: q && q.explanation !== undefined ? q.explanation : null
      });
    });
    var score = calculateAmiramScore(correctCount, questions.length);
    return {
      score: score,
      level: levelForScore(score),
      correctCount: correctCount,
      totalCount: questions.length,
      timeSpentSec: elapsedSec(sessionState, durationSec),
      reviewList: reviewList
    };
  }

  return {
    QUESTION_COUNT: QUESTION_COUNT,
    DURATION_MINUTES: DURATION_MINUTES,
    DURATION_SEC: DURATION_SEC,
    LEVELS: LEVELS,
    createSimulation: createSimulation,
    calculateAmiramScore: calculateAmiramScore,
    levelForScore: levelForScore,
    getLevel: levelForScore,
    answerQuestion: answerQuestion,
    submitSimulation: submitSimulation
  };
}));
