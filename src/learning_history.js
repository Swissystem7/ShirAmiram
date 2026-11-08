// ShirAmiram — Learning History and Progress Tracker (pure logic, no UI)
//
// ACTUAL INPUT SHAPE (from coordinateSessionFromSimulation in
// src/learning_coordinator.js, inspected — not invented):
//   { simulationScore, exemptionLevel, weakCategories, recommendedSong,
//     targetWords, targetQuestionIds, timestamp }
//   targetWords items: { word, songId, partOfSpeech, difficulty,
//     directlyMissed, need }
//
// HONEST DEFINITIONS (no fabricated data):
// - "Error words" of a session = targetWords whose directlyMissed is not
//   explicitly false. Real coordinator output sets directlyMissed:true only
//   for words actually missed, and false for enrichment/weak filler targets
//   (e.g. perfect-score plans), so explicit false is never counted as an
//   error. A missing flag on a partial/mock entry is treated as
//   error-associated, since targetWords is the only word list available.
// - "Categories" = the session's weakCategories strings exactly as reported.
//   Note: a perfect-score session reports weakCategories ['C'] as an
//   enrichment tier, not a weakness; this module counts what is reported
//   and does not reinterpret it.
// - A word absent from the current error set is "resolved" only in that
//   limited sense: the coordinator lists at most 3 target words, so absence
//   may reflect target rotation, not proven mastery. Nothing here invents
//   mastery, word ids, or session fields.
//
// TRAJECTORY CONFLICTS: if the score fell while some words resolved, the
// signals conflict. trajectory reports "regressing" (the score is the only
// continuous measure and resolved may be rotation), while resolvedWords and
// scoreDelta are still returned verbatim so callers see the mixed picture.
// If either score is missing, scoreDelta is null and trajectory is based on
// resolved words alone ("improving" if any, else "stable").
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ShirAmiramLearningHistory = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function normWord(v) { return v === undefined || v === null ? '' : String(v).trim().toLowerCase(); }
  function cmpStr(a, b) { return a < b ? -1 : (a > b ? 1 : 0); }
  function scoreOf(s) {
    return isObj(s) && typeof s.simulationScore === 'number' && Number.isFinite(s.simulationScore)
      ? s.simulationScore : null;
  }
  // Ordered, de-duplicated target words of a session (all targets).
  function targetWordsOf(s) {
    if (!isObj(s) || !Array.isArray(s.targetWords)) return [];
    var seen = {}; var out = [];
    s.targetWords.forEach(function (t) {
      var w = normWord(isObj(t) ? t.word : t);
      if (w && !seen[w]) { seen[w] = true; out.push(w); }
    });
    return out;
  }
  // Ordered, de-duplicated error words (see header definition).
  function errorWordsOf(s) {
    if (!isObj(s) || !Array.isArray(s.targetWords)) return [];
    var seen = {}; var out = [];
    s.targetWords.forEach(function (t) {
      var w = normWord(isObj(t) ? t.word : t);
      if (!w || seen[w]) return;
      if (isObj(t) && t.directlyMissed === false) return;
      seen[w] = true; out.push(w);
    });
    return out;
  }
  function categoriesOf(s) {
    if (!isObj(s) || !Array.isArray(s.weakCategories)) return [];
    var seen = {}; var out = [];
    s.weakCategories.forEach(function (c) {
      var k = c === undefined || c === null ? '' : String(c).trim();
      if (k && !seen[k]) { seen[k] = true; out.push(k); }
    });
    return out;
  }

  function evaluateSessionDelta(previousSession, currentSession) {
    var prevScore = scoreOf(previousSession);
    var currScore = scoreOf(currentSession);
    var scoreDelta = prevScore !== null && currScore !== null ? currScore - prevScore : null;
    var currErrors = {}; errorWordsOf(currentSession).forEach(function (w) { currErrors[w] = true; });
    var resolvedWords = targetWordsOf(previousSession).filter(function (w) { return !currErrors[w]; });
    var unresolvedWords = errorWordsOf(previousSession).filter(function (w) { return !!currErrors[w]; });
    var trajectory;
    if (scoreDelta !== null && scoreDelta < 0) trajectory = 'regressing';
    else if ((scoreDelta !== null && scoreDelta > 0) || resolvedWords.length > 0) trajectory = 'improving';
    else trajectory = 'stable';
    return { scoreDelta: scoreDelta, resolvedWords: resolvedWords,
      unresolvedWords: unresolvedWords, trajectory: trajectory };
  }

  function aggregatePersistentWeaknesses(sessionHistoryList, minOccurrences) {
    var min = typeof minOccurrences === 'number' && Number.isFinite(minOccurrences) && minOccurrences >= 1
      ? Math.floor(minOccurrences) : 2;
    var list = Array.isArray(sessionHistoryList) ? sessionHistoryList.slice(-10) : [];
    var wordCount = {}; var catCount = {};
    list.forEach(function (s) {
      if (!isObj(s)) return;
      errorWordsOf(s).forEach(function (w) { wordCount[w] = (wordCount[w] || 0) + 1; });
      categoriesOf(s).forEach(function (c) { catCount[c] = (catCount[c] || 0) + 1; });
    });
    function toSorted(counts, keyName) {
      return Object.keys(counts)
        .filter(function (k) { return counts[k] >= min; })
        .map(function (k) { var e = { count: counts[k] }; e[keyName] = k; return e; })
        .sort(function (a, b) { return (b.count - a.count) || cmpStr(a[keyName], b[keyName]); })
        .map(function (e) {
          // Present word/category first for readability; count stays exact.
          var out = {}; out[keyName] = e[keyName]; out.count = e.count; return out;
        });
    }
    return { words: toSorted(wordCount, 'word'), categories: toSorted(catCount, 'category') };
  }

  function appendSessionHistory(existingHistory, newSession, maxItems) {
    var cap = typeof maxItems === 'number' && Number.isFinite(maxItems) && maxItems >= 1
      ? Math.floor(maxItems) : 10;
    var base = Array.isArray(existingHistory) ? existingHistory.slice() : [];
    if (!isObj(newSession) || typeof newSession.timestamp !== 'string' || !newSession.timestamp.trim()) {
      return base.slice(-cap);
    }
    base.push(newSession);
    return base.slice(-cap);
  }

  return { evaluateSessionDelta: evaluateSessionDelta,
    aggregatePersistentWeaknesses: aggregatePersistentWeaknesses,
    appendSessionHistory: appendSessionHistory };
}));
