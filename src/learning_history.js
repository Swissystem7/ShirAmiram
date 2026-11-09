// ShirAmiram — Learning History and Progress Tracker (pure logic, no UI)
//
// CONTROLLING CONTRACT (explicitly clarified; replaces the obsolete one):
// - Coordinator output (coordinateSessionFromSimulation) carries GOALS /
//   enrichment only: targetWords and weakCategories are NOT an errors
//   schema. Nothing here infers errors from targetWords/weakCategories
//   (including directlyMissed flags) and nothing infers mastery from the
//   absence of a word. A perfect-150 session reporting weakCategories
//   ['C'] is enrichment, never a weakness.
// - Error/correct evidence exists ONLY in an explicit assessment envelope:
//     { session: <coordinator output>,
//       assessment: { errors: [{ word: string, category?: string }],
//                     correctWords: string[], complete?: boolean } }
//   A bare coordinator entry (or a wrapped session) without an assessment
//   has evidenceStatus 'none' and empty errorWords/correctWords.
// - A structurally valid assessment yields evidenceStatus 'available'.
//   A malformed assessment (not an object, errors/correctWords of the
//   wrong type, an error without a string word, a non-string category,
//   a non-boolean complete, or neither errors nor correctWords present)
//   yields evidenceStatus 'invalid' with all evidence cleared. In
//   evaluateSessionDelta any side that is not 'available' makes the
//   combined status 'insufficient' unless both sides are 'none'
//   (see there), and clears all word arrays.
// - complete:false still permits positive explicit error/correct
//   evidence; it never licenses inference from absence.
// - If the same word is in errors and correctWords, the error is
//   authoritative: it is dropped from correctWords (no resolution).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ShirAmiramLearningHistory = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function normWord(v) { return typeof v === 'string' ? v.trim().toLowerCase() : ''; }
  function cmpStr(a, b) { return a < b ? -1 : (a > b ? 1 : 0); }
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  // Null-prototype dictionary: user words/categories such as
  // 'constructor', '__proto__' or 'toString' become ordinary own keys
  // instead of colliding with inherited Object.prototype members, and
  // assigning '__proto__' cannot mutate any prototype.
  function dict() { return Object.create(null); }

  function meaningfulTimestamp(ts) {
    if (typeof ts === 'string') {
      var t = ts.trim();
      return t !== '' && Number.isFinite(Date.parse(t));
    }
    return typeof ts === 'number' && Number.isFinite(ts);
  }
  function scoreOf(session) {
    return isObj(session) && typeof session.simulationScore === 'number' &&
      Number.isFinite(session.simulationScore) ? session.simulationScore : null;
  }

  // Validate + normalise an explicit assessment. Returns null when there
  // is no assessment key at all, { invalid: true } when malformed, else
  // { errors, errorWords, correctWords, complete } with fresh deduped
  // arrays (input never mutated). Words are trimmed + lowercased;
  // categories are trimmed, case preserved.
  function parseAssessment(raw) {
    if (!isObj(raw)) return { invalid: true };
    if (!has(raw, 'errors') && !has(raw, 'correctWords')) return { invalid: true };
    if (has(raw, 'complete') && raw.complete !== undefined && typeof raw.complete !== 'boolean') {
      return { invalid: true };
    }
    var errors = []; var errorWords = []; var seenErr = dict();
    var seenErrCat = dict();
    if (has(raw, 'errors') && raw.errors !== undefined) {
      if (!Array.isArray(raw.errors)) return { invalid: true };
      for (var i = 0; i < raw.errors.length; i++) {
        var e = raw.errors[i];
        if (!isObj(e)) return { invalid: true };
        var w = normWord(e.word);
        if (!w) return { invalid: true };
        var cat = null;
        if (e.category !== undefined) {
          if (typeof e.category !== 'string' || !e.category.trim()) return { invalid: true };
          cat = e.category.trim();
        }
        var key = w + '\u0000' + (cat || '');
        if (!seenErrCat[key]) {
          seenErrCat[key] = true;
          var item = { word: w };
          if (cat) item.category = cat;
          errors.push(item);
        }
        if (!seenErr[w]) { seenErr[w] = true; errorWords.push(w); }
      }
    }
    var correctWords = [];
    if (has(raw, 'correctWords') && raw.correctWords !== undefined) {
      if (!Array.isArray(raw.correctWords)) return { invalid: true };
      var seenCorr = dict();
      for (var j = 0; j < raw.correctWords.length; j++) {
        if (typeof raw.correctWords[j] !== 'string') return { invalid: true };
        var cw = normWord(raw.correctWords[j]);
        if (cw && !seenCorr[cw]) { seenCorr[cw] = true; correctWords.push(cw); }
      }
    }
    // Error is authoritative over the same word in correctWords.
    correctWords = correctWords.filter(function (w) { return !seenErr[w]; });
    return {
      errors: errors, errorWords: errorWords, correctWords: correctWords,
      complete: typeof raw.complete === 'boolean' ? raw.complete : null
    };
  }

  function normalizeHistoryEntry(entry) {
    var invalidShell = {
      session: null, simulationScore: null, timestamp: null,
      evidenceStatus: 'invalid', errorWords: [], correctWords: [],
      errors: [], complete: null, assessment: null
    };
    if (!isObj(entry)) return invalidShell;
    var isEnvelope = has(entry, 'session') || has(entry, 'assessment');
    var session = isEnvelope ? (isObj(entry.session) ? entry.session : null) : entry;
    var out = {
      session: session ? Object.assign({}, session) : null,
      simulationScore: scoreOf(session),
      timestamp: session && meaningfulTimestamp(session.timestamp)
        ? (typeof session.timestamp === 'string' ? session.timestamp.trim() : session.timestamp)
        : null,
      evidenceStatus: 'none', errorWords: [], correctWords: [],
      errors: [], complete: null, assessment: null
    };
    if (!has(entry, 'assessment') || entry.assessment === undefined) return out;
    var parsed = parseAssessment(entry.assessment);
    if (parsed.invalid) {
      out.evidenceStatus = 'invalid';
      return out;
    }
    out.evidenceStatus = 'available';
    out.errorWords = parsed.errorWords;
    out.correctWords = parsed.correctWords;
    out.errors = parsed.errors;
    out.complete = parsed.complete;
    out.assessment = {
      errors: parsed.errors.map(function (e) { return Object.assign({}, e); }),
      correctWords: parsed.correctWords.slice(),
      complete: parsed.complete
    };
    return out;
  }

  function evaluateSessionDelta(previousSession, currentSession) {
    var prev = normalizeHistoryEntry(previousSession);
    var curr = normalizeHistoryEntry(currentSession);
    var scoreDelta = prev.simulationScore !== null && curr.simulationScore !== null
      ? curr.simulationScore - prev.simulationScore : null;

    var evidenceStatus;
    if (prev.evidenceStatus === 'available' && curr.evidenceStatus === 'available') {
      evidenceStatus = 'available';
    } else if (prev.evidenceStatus === 'none' && curr.evidenceStatus === 'none') {
      evidenceStatus = 'none';
    } else {
      evidenceStatus = 'insufficient';
    }

    var resolvedWords = []; var unresolvedWords = []; var newErrors = [];
    if (evidenceStatus === 'available') {
      var prevErr = dict(); prev.errorWords.forEach(function (w) { prevErr[w] = true; });
      var currErr = dict(); curr.errorWords.forEach(function (w) { currErr[w] = true; });
      var currCorr = dict(); curr.correctWords.forEach(function (w) { currCorr[w] = true; });
      resolvedWords = prev.errorWords.filter(function (w) { return currCorr[w] && !currErr[w]; });
      unresolvedWords = prev.errorWords.filter(function (w) { return !!currErr[w]; });
      newErrors = curr.errorWords.filter(function (w) { return !prevErr[w]; });
    }

    var trajectory;
    if (scoreDelta === null) trajectory = 'insufficient_data';
    else if (scoreDelta < 0) trajectory = 'regressing';
    else if (scoreDelta > 0) trajectory = 'improving';
    else if (resolvedWords.length > 0 && newErrors.length === 0) trajectory = 'improving';
    else if (newErrors.length > 0 || unresolvedWords.length > 0) trajectory = 'regressing';
    else trajectory = 'stable';

    return { scoreDelta: scoreDelta, trajectory: trajectory,
      resolvedWords: resolvedWords, unresolvedWords: unresolvedWords,
      newErrors: newErrors, evidenceStatus: evidenceStatus };
  }

  // Safe threshold: a finite number >= 1 is floored; anything else
  // (missing, NaN, infinite, < 1, non-number) falls back to 2.
  function safeMinOccurrences(v) {
    return typeof v === 'number' && Number.isFinite(v) && v >= 1 ? Math.floor(v) : 2;
  }

  function aggregatePersistentWeaknesses(sessionHistoryList, minOccurrences) {
    var min = safeMinOccurrences(minOccurrences);
    var list = Array.isArray(sessionHistoryList) ? sessionHistoryList.slice(-10) : [];
    var counts = dict(); var cats = dict();
    list.forEach(function (entry) {
      var n = normalizeHistoryEntry(entry);
      if (n.evidenceStatus !== 'available') return;
      var perWordCat = dict();
      n.errors.forEach(function (e) {
        if (e.category) {
          (perWordCat[e.word] = perWordCat[e.word] || dict())[e.category] = true;
        }
      });
      // Once per word per session (errorWords is already deduped).
      n.errorWords.forEach(function (w) {
        counts[w] = (counts[w] || 0) + 1;
        var bucket = cats[w] || (cats[w] = dict());
        Object.keys(perWordCat[w] || {}).forEach(function (c) { bucket[c] = true; });
      });
    });
    return Object.keys(counts)
      .filter(function (w) { return counts[w] >= min; })
      .map(function (w) {
        return { word: w, occurrences: counts[w],
          categories: Object.keys(cats[w] || {}).sort(cmpStr) };
      })
      .sort(function (a, b) { return (b.occurrences - a.occurrences) || cmpStr(a.word, b.word); });
  }

  function isValidEntry(n) {
    return n.simulationScore !== null || n.timestamp !== null;
  }
  // Safe cap: undefined / non-finite / non-number -> 10; fractional is
  // floored; the result is clamped to [0, 10] (0 yields an empty list).
  function safeCap(v) {
    if (v === undefined) return 10;
    if (typeof v !== 'number' || !Number.isFinite(v)) return 10;
    var f = Math.floor(v);
    return f < 0 ? 0 : (f > 10 ? 10 : f);
  }

  function appendSessionHistory(existingHistory, newSession, maxItems) {
    var cap = safeCap(maxItems);
    var out = [];
    if (Array.isArray(existingHistory)) {
      existingHistory.forEach(function (entry) {
        if (isObj(entry) && isValidEntry(normalizeHistoryEntry(entry))) out.push(entry);
      });
    }
    if (isObj(newSession) && isValidEntry(normalizeHistoryEntry(newSession))) {
      out.push(newSession);
    }
    return cap === 0 ? [] : out.slice(-cap);
  }

  return { normalizeHistoryEntry: normalizeHistoryEntry,
    evaluateSessionDelta: evaluateSessionDelta,
    aggregatePersistentWeaknesses: aggregatePersistentWeaknesses,
    appendSessionHistory: appendSessionHistory };
}));
