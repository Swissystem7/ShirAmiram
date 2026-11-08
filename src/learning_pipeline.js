// ShirAmiram — Learning Pipeline (pure logic, no UI, no storage)
//
// runLearningCycle({ simulationSession, simulationResult, songCatalog,
//   amiramVocabMap, history = [] })
//   -> EXACTLY { studyPlan, assessmentEnvelope, progressDelta,
//                updatedHistory, persistentWeaknesses }
//
// CHAIN (existing modules only, inspected APIs):
//   studyPlan = coordinateSessionFromSimulation(simulationResult,
//     songCatalog, amiramVocabMap)                    [learning_coordinator]
//   raw = produceAssessmentFromSimulation(simulationSession,
//     simulationResult, studyPlan)                    [assessment_producer]
//   assessmentEnvelope = enriched COPY of raw (see below)
//   progressDelta = last VALID history entry
//     ? evaluateSessionDelta(lastValid, assessmentEnvelope) : null
//   updatedHistory = appendSessionHistory(history, assessmentEnvelope)
//   persistentWeaknesses = aggregatePersistentWeaknesses(updatedHistory)
//                                                       [learning_history]
//
// CATEGORY ENRICHMENT — exact mapping, no guessing:
// - Only explicit assessment errors whose category is exactly 'unknown'
//   (case-insensitive after trim; the producer's documented fallback) are
//   eligible. Known categories are never overwritten. Errors are never
//   inferred from targets/weakCategories/enrichment or from absence.
// - The replacement is the VERIFIED category of that exact (trimmed,
//   lowercased) word in amiramVocabMap, taken from the entry's own field,
//   in priority order: category, then part_of_speech, then pos. The value
//   is copied verbatim (trimmed) — e.g. the actual 300-entry vocab
//   (src/amiram_vocab_data.js / data/imports/amiram_vocab_full.json:
//   { word, part_of_speech, level, ... }) yields 'verb'/'noun'/'adjective',
//   and entries shaped { word, category, difficulty, ... } (the root
//   shiramiram_vocab_full.json shape) yield their `category`.
// - Supported amiramVocabMap shapes (mirroring how the coordinator reads
//   vocab, narrowed to category-bearing evidence):
//     * array of entries: [{ word|word_id|wordId, category|part_of_speech|pos }]
//     * a Map: word -> entry object, or word -> category string
//     * a plain object map: { word: entry object | category string }
//     * a single entry object, or a wrapper holding one of the above under
//       an own key among: vocab, amiramVocab, vocabMap, wordInfo, data
//       (walked recursively, depth <= 4, first verified entry per word wins)
//     * an entry value that is a string is that word's verified category.
//   A non-empty string field is required; level/difficulty are NEVER used
//   as a category. If no verified entry exists, category stays 'unknown'.
// - Lookup uses a null-prototype dictionary plus own-property checks, so
//   words like 'constructor' and '__proto__' are ordinary keys and cannot
//   read or mutate Object.prototype.
// - Enrichment mutates nothing: the envelope, its assessment, every error
//   object, correctWords and (when an object) session are fresh copies.
//   Producer inputs and the producer's returned shared objects are intact.
//
// SCORE / TIME HONESTY:
// - Missing/invalid score stays null (via the coordinator): it is never
//   coerced to 0, and no score is claimed always available.
// - No new timestamps: the only timestamp is the coordinator's existing
//   one, carried unchanged on the copied session.
// - Partial explicit evidence is retained as-is (complete:false envelopes
//   keep their explicit errors/correctWords); nothing is inferred.
//
// HISTORY VALIDITY (same rule as learning_history.isValidEntry):
//   an entry counts only when normalizeHistoryEntry(entry) yields a finite
//   simulationScore OR a meaningful timestamp. Malformed entries are
//   filtered before the last-valid comparison entry is chosen; with no
//   valid prior entry progressDelta is null.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.ShirAmiramLearningPipeline = factory(root);
  }
}(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';

  function load(name, globalName) {
    if (root && root[globalName]) return root[globalName];
    if (typeof require === 'function') return require(name);
    return null;
  }
  var Coordinator = load('./learning_coordinator.js', 'ShirAmiramLearningCoordinator');
  var Producer = load('./assessment_producer.js', 'ShirAmiramAssessmentProducer');
  var History = load('./learning_history.js', 'ShirAmiramLearningHistory');

  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function dict() { return Object.create(null); }
  function normWord(v) { return typeof v === 'string' ? v.trim().toLowerCase() : ''; }

  var CATEGORY_FIELDS = ['category', 'part_of_speech', 'pos'];
  var WORD_FIELDS = ['word', 'word_id', 'wordId'];
  var WRAPPER_KEYS = ['vocab', 'amiramVocab', 'vocabMap', 'wordInfo', 'data'];

  function verifiedCategory(entry) {
    if (typeof entry === 'string') return entry.trim() ? entry.trim() : null;
    if (!isObj(entry)) return null;
    for (var i = 0; i < CATEGORY_FIELDS.length; i++) {
      var k = CATEGORY_FIELDS[i];
      if (has(entry, k) && typeof entry[k] === 'string' && entry[k].trim()) {
        return entry[k].trim();
      }
    }
    return null;
  }

  function entryWord(entry, fallbackKey) {
    if (isObj(entry)) {
      for (var i = 0; i < WORD_FIELDS.length; i++) {
        var k = WORD_FIELDS[i];
        if (has(entry, k)) {
          var w = normWord(typeof entry[k] === 'string' ? entry[k] : '');
          if (w) return w;
          if (entry[k] !== undefined && entry[k] !== null && String(entry[k]).trim()) {
            return String(entry[k]).trim().toLowerCase();
          }
        }
      }
    }
    return normWord(fallbackKey || '');
  }

  function addEntry(out, entry, fallbackKey) {
    var word = entryWord(entry, fallbackKey);
    if (!word || has(out, word)) return;
    var cat = verifiedCategory(entry);
    if (cat) out[word] = cat;
  }

  function walkVocab(container, out, depth) {
    if (!container || depth > 4) return;
    if (Array.isArray(container)) {
      container.forEach(function (e) { walkVocab(e, out, depth + 1); });
      return;
    }
    if (typeof Map !== 'undefined' && container instanceof Map) {
      container.forEach(function (v, k) { addEntry(out, v, String(k)); });
      return;
    }
    if (!isObj(container)) return;
    // Single entry object (carries its own word or category field).
    var isEntry = WORD_FIELDS.some(function (k) { return has(container, k); }) ||
      CATEGORY_FIELDS.some(function (k) { return has(container, k); });
    if (isEntry && (WORD_FIELDS.some(function (k) { return has(container, k); }))) {
      addEntry(out, container, '');
      return;
    }
    var wrapperFound = false;
    WRAPPER_KEYS.forEach(function (k) {
      if (has(container, k) && container[k] !== undefined) {
        wrapperFound = true;
        walkVocab(container[k], out, depth + 1);
      }
    });
    if (wrapperFound) return;
    if (isEntry) { addEntry(out, container, ''); return; }
    // Plain word -> entry/category map: own keys only.
    Object.keys(container).forEach(function (k) {
      var v = container[k];
      if (isObj(v) || typeof v === 'string') addEntry(out, v, k);
    });
  }

  function buildCategoryLookup(amiramVocabMap) {
    var out = dict();
    walkVocab(amiramVocabMap, out, 0);
    return out;
  }

  function enrichEnvelope(rawEnvelope, lookup) {
    var src = isObj(rawEnvelope) ? rawEnvelope : {};
    var assessment = isObj(src.assessment) ? src.assessment : {};
    var errors = Array.isArray(assessment.errors) ? assessment.errors.map(function (e) {
      if (!isObj(e)) return e;
      var copy = Object.assign({}, e);
      var isUnknown = typeof copy.category === 'string' &&
        copy.category.trim().toLowerCase() === 'unknown';
      if (isUnknown) {
        var w = normWord(copy.word);
        if (w && has(lookup, w)) copy.category = lookup[w];
      }
      return copy;
    }) : [];
    return {
      session: isObj(src.session) ? Object.assign({}, src.session)
        : (src.session === undefined ? null : src.session),
      assessment: {
        errors: errors,
        correctWords: Array.isArray(assessment.correctWords)
          ? assessment.correctWords.slice() : [],
        complete: assessment.complete
      }
    };
  }

  function isValidHistoryEntry(entry) {
    var n = History.normalizeHistoryEntry(entry);
    return n.simulationScore !== null || n.timestamp !== null;
  }

  function runLearningCycle(input) {
    var opts = isObj(input) ? input : {};
    var history = Array.isArray(opts.history) ? opts.history : [];

    var studyPlan = Coordinator.coordinateSessionFromSimulation(
      opts.simulationResult, opts.songCatalog, opts.amiramVocabMap);
    var rawEnvelope = Producer.produceAssessmentFromSimulation(
      opts.simulationSession, opts.simulationResult, studyPlan);
    var assessmentEnvelope = enrichEnvelope(
      rawEnvelope, buildCategoryLookup(opts.amiramVocabMap));

    var validPrior = history.filter(isValidHistoryEntry);
    var progressDelta = validPrior.length
      ? History.evaluateSessionDelta(
          validPrior[validPrior.length - 1], assessmentEnvelope)
      : null;
    var updatedHistory = History.appendSessionHistory(history, assessmentEnvelope);
    var persistentWeaknesses = History.aggregatePersistentWeaknesses(updatedHistory);

    return {
      studyPlan: studyPlan,
      assessmentEnvelope: assessmentEnvelope,
      progressDelta: progressDelta,
      updatedHistory: updatedHistory,
      persistentWeaknesses: persistentWeaknesses
    };
  }

  return { runLearningCycle: runLearningCycle };
}));
