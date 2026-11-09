// ShirAmiram — Assessment Producer (pure logic, no UI)
//
// Builds the explicit assessment envelope consumed by
// src/learning_history.js:
//   { session: <coordinator output || simulation result>,
//     assessment: { errors: [{ word, category, questionId }],
//                   correctWords: [word], complete: boolean } }
//
// ACTUAL SCHEMAS INSPECTED (not assumed):
// - src/simulation.js createSimulation(questionsPool, config) -> session
//   { type, version, questions: [shallow copies of pool items],
//     answers: { [questionId]: selectedAnswer }, questionCount, ... }.
//   Question key: question.id, else question.questionId, else
//   question.word, else the positional index (as a string).
//   Expected answer: correctAnswer, else correct_answer, else answer,
//   else correctOption. submitSimulation grades by: an integer answer
//   against a string expected value with an options array is an option
//   index; a numeric string against a numeric expected value compares
//   numerically; otherwise trimmed, case-insensitive string equality.
//   A boolean isCorrect/correct on the question is used only when no
//   expected-answer field exists.
// - submitSimulation(session) -> { score, level, correctCount,
//   totalCount, timeSpentSec, reviewList }. reviewList mixes wrong AND
//   unanswered questions ({ id, questionId, question, correctAnswer,
//   userAnswer, explanation }); unanswered entries have userAnswer null.
//   Therefore reviewList membership alone never proves an error here:
//   an error requires an actual recorded, valid, incorrect answer.
// - Actual catalogue word metadata (src/amiram_vocab_data.js, 300
//   entries) is { id, word, part_of_speech, level, ... }. This producer's
//   fixed API receives no catalogue, so word evidence is taken ONLY from
//   an explicit string `word` field on the question itself, and category
//   from an explicit string `category`, else `part_of_speech`, else
//   `pos`, else the documented fallback 'unknown'. A word is NEVER
//   guessed from question prose or from correct-answer free text, and
//   questions without word metadata contribute no word evidence (a
//   realistic limitation: the simulation test pool carries no `word`).
//
// HONEST LIMITATION — score field name: the envelope `session` is the
// actual output object, preserved unchanged by reference. With a
// coordinator output it carries simulationScore, which
// learning_history reads. A direct simulationResult carries `score`,
// not `simulationScore`; no field is fabricated or renamed, so
// learning_history will report simulationScore null for such an
// envelope (its explicit word evidence is still usable).
//
// complete is true iff EVERY actual question has a valid recorded
// answer. Extraneous answer-map keys never count. Missing questions
// or answers yield an empty, incomplete assessment. Malformed inputs
// never throw. Nothing is mutated; output is deterministic.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ShirAmiramAssessmentProducer = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function dict() { return Object.create(null); }

  function questionKey(question, index) {
    if (isObj(question)) {
      if (question.id !== undefined && question.id !== null) return String(question.id);
      if (question.questionId !== undefined && question.questionId !== null) {
        return String(question.questionId);
      }
      if (question.word !== undefined && question.word !== null) return String(question.word);
    }
    return String(index);
  }

  function correctAnswerOf(question) {
    if (!isObj(question)) return undefined;
    if (question.correctAnswer !== undefined) return question.correctAnswer;
    if (question.correct_answer !== undefined) return question.correct_answer;
    if (question.answer !== undefined) return question.answer;
    if (question.correctOption !== undefined) return question.correctOption;
    return undefined;
  }

  function recordedAnswer(session, question, index, id, reviewById) {
    var maps = [session.answers, session.responses, session.userAnswers];
    for (var m = 0; m < maps.length; m++) {
      var map = maps[m];
      if (Array.isArray(map) && map[index] !== undefined) return map[index];
      if (isObj(map) && map[id] !== undefined) return map[id];
    }
    if (isObj(question)) {
      var fields = ['userAnswer', 'selectedAnswer', 'selected', 'givenAnswer', 'response'];
      for (var f = 0; f < fields.length; f++) {
        if (question[fields[f]] !== undefined) return question[fields[f]];
      }
    }
    // Fall back to the actual submitted record in the result's
    // reviewList (its userAnswer is the recorded answer, null when
    // unanswered). This never invents an answer.
    if (reviewById && reviewById[id] !== undefined) return reviewById[id];
    return undefined;
  }

  // A recorded answer is valid only when it can be assessed under the
  // simulation's own rules: present, and — when options exist — either
  // an in-range integer option index (for a string expected answer) or
  // the text of an actual option; without options, a non-empty string
  // or a finite number. The question must also carry assessable
  // metadata (an expected answer or a boolean isCorrect/correct).
  function isValidAnswer(question, answer) {
    if (answer === undefined || answer === null) return false;
    if (typeof answer === 'string' && answer.trim() === '') return false;
    var expected = correctAnswerOf(question);
    var assessable = expected !== undefined ||
      (isObj(question) && (typeof question.isCorrect === 'boolean' ||
        typeof question.correct === 'boolean'));
    if (!assessable) return false;
    var options = isObj(question) && Array.isArray(question.options) &&
      question.options.length ? question.options : null;
    if (typeof answer === 'number') {
      if (!Number.isFinite(answer)) return false;
      if (typeof expected === 'number') return true;
      if (options) return Number.isInteger(answer) && answer >= 0 && answer < options.length;
      return true;
    }
    if (typeof answer === 'string') {
      if (typeof expected === 'number') {
        return answer.trim() !== '' && !Number.isNaN(Number(answer));
      }
      if (options) {
        var wanted = answer.trim().toLowerCase();
        return options.some(function (opt) {
          return String(opt).trim().toLowerCase() === wanted;
        });
      }
      return true;
    }
    if (typeof answer === 'boolean') return typeof expected === 'boolean';
    return false;
  }

  function isCorrectAnswer(question, answer) {
    var expected = correctAnswerOf(question);
    if (expected === undefined) {
      if (typeof question.isCorrect === 'boolean') return question.isCorrect;
      if (typeof question.correct === 'boolean') return question.correct;
      return false;
    }
    var actual = answer;
    if (typeof actual === 'number' && typeof expected === 'string' &&
        Array.isArray(question.options)) {
      actual = question.options[actual];
    }
    if (typeof expected === 'number' && typeof actual === 'string' &&
        actual.trim() !== '' && !Number.isNaN(Number(actual))) {
      return Number(actual) === expected;
    }
    return String(actual).trim().toLowerCase() ===
      String(expected).trim().toLowerCase();
  }

  function wordOf(question) {
    if (!isObj(question) || typeof question.word !== 'string') return '';
    return question.word.trim().toLowerCase();
  }

  function categoryOf(question) {
    var fields = ['category', 'part_of_speech', 'pos'];
    for (var i = 0; i < fields.length; i++) {
      var v = question[fields[i]];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return 'unknown';
  }

  function emptyEnvelope(session) {
    return { session: session || null,
      assessment: { errors: [], correctWords: [], complete: false } };
  }

  function produceAssessmentFromSimulation(simulationSession, simulationResult, coordinatorOutput) {
    var session = coordinatorOutput || simulationResult || null;
    if (!isObj(simulationSession) || !Array.isArray(simulationSession.questions) ||
        simulationSession.questions.length === 0) {
      return emptyEnvelope(session);
    }
    var reviewById = dict();
    if (isObj(simulationResult) && Array.isArray(simulationResult.reviewList)) {
      simulationResult.reviewList.forEach(function (entry) {
        if (!isObj(entry)) return;
        var qid = entry.questionId !== undefined ? entry.questionId : entry.id;
        if (qid === undefined || qid === null) return;
        if (entry.userAnswer !== undefined) reviewById[String(qid)] = entry.userAnswer;
      });
    }
    var errors = [];
    var seenError = dict();
    var errorWords = dict();
    var correctWords = [];
    var seenCorrect = dict();
    var complete = true;
    simulationSession.questions.forEach(function (question, index) {
      var id = questionKey(question, index);
      var answer = recordedAnswer(simulationSession, question, index, id, reviewById);
      if (!isValidAnswer(question, answer)) { complete = false; return; }
      var word = wordOf(question);
      if (!word) return;
      if (isCorrectAnswer(question, answer)) {
        if (!seenCorrect[word]) { seenCorrect[word] = true; correctWords.push(word); }
      } else {
        var category = categoryOf(question);
        var key = word + '\u0000' + category + '\u0000' + id;
        if (!seenError[key]) {
          seenError[key] = true;
          errors.push({ word: word, category: category, questionId: id });
        }
        errorWords[word] = true;
      }
    });
    // An error is authoritative: the same word never stays correct.
    correctWords = correctWords.filter(function (w) { return !errorWords[w]; });
    return { session: session,
      assessment: { errors: errors, correctWords: correctWords, complete: complete } };
  }

  return { produceAssessmentFromSimulation: produceAssessmentFromSimulation };
}));
