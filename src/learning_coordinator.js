// ShirAmiram — Learning Session Coordinator (pure logic, no UI)
// Bridges the practice simulation engine to the adaptive recommender.
//
// ACTUAL INPUT SHAPES (inspected, not invented):
// - submitSimulation(session) -> { score, level, correctCount, totalCount,
//   timeSpentSec, reviewList }. reviewList contains ONLY wrong/unanswered
//   questions: { id, questionId, question, correctAnswer, userAnswer,
//   explanation }. It has no correct-question entries, no word/POS/level
//   fields, and there is no answered-question list.
// - analyzeErrors(attempts, reference) / buildStudyPlan(input) from
//   src/adaptive_recommender.js. A study plan is "ready" only with >=1
//   incorrect attempt, a top song with >=3 target words, >=5 questions.
//
// TRANSLATION (no fabrication):
// - Every reviewList entry is incorrect by construction (submitSimulation
//   only lists wrong/unanswered questions), so attempts use correct:false.
//   A learner answer is never invented: userAnswer is copied when present
//   (null stays null for unanswered). POS/level/word are never guessed from
//   the question text. Word comes from entry.word, else the linked question
//   catalogue entry, else correctAnswer ONLY when that exact (normalised)
//   string is a known vocabulary word. Unknown categories stay unknown
//   and are excluded from weakCategories.
//
// LIMITATIONS (honest):
// - Without a question catalogue (passed inside a catalogue/vocab object
//   as `questions`), buildStudyPlan cannot pick its 5 quiz questions.
//   Then targetQuestionIds falls back to the actual reviewList question
//   ids (partial, in review order) — never invented ids.
// - Without correct-question metadata we cannot know accuracy per correct
//   question; error analysis covers reviewed (wrong/unanswered) items only.
// - `exemptionLevel` is the simulation's practice level label (copied or
//   derived with levelForScore). It is NOT an official exam/exemption
//   decision. Likewise "LevelC" below means C_advanced dataset difficulty
//   used for enrichment — NOT an official classification.
//
// PERFECT SCORE (150, zero reviewed errors):
// - No errors are fabricated to satisfy buildStudyPlan. Instead a LevelC
//   enrichment plan is built directly: a song with >=3 highlight words
//   whose vocabulary level is C, its first 3 such words as targets, and
//   question ids only from an actually supplied question catalogue.
//   If no such valid song/vocabulary data exists, song/targets are empty.
//
// Output: { simulationScore, exemptionLevel, weakCategories,
//   recommendedSong, targetWords, targetQuestionIds, timestamp }
// targetWords items mirror buildStudyPlan karaokeTargetWords:
//   { word, songId, partOfSpeech, difficulty, directlyMissed, need }
// Deterministic: ranking reuses rankSongs tie-breaks; enrichment ranks by
// C-word count desc, title asc, song id asc. timestamp is the coordination
// time as an ISO string (callers/tests should parse it, not pin it).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.ShirAmiramLearningCoordinator = factory(root);
  }
}(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';

  var Recommender = (root && root.ShirAmiramAdaptiveRecommender) ||
    (typeof require === 'function' ? require('./adaptive_recommender.js') : null);
  var Simulation = (root && root.ShirAmiramSimulation) ||
    (typeof require === 'function' ? require('./simulation.js') : null);

  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function normWord(v) { return v === undefined || v === null ? '' : String(v).trim().toLowerCase(); }
  function cmpStr(a, b) { return a < b ? -1 : (a > b ? 1 : 0); }
  function cmpId(a, b) {
    var na = Number(a); var nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb) && String(a).trim() !== '' && String(b).trim() !== '') return na - nb;
    return cmpStr(String(a), String(b));
  }
  function isFiniteNumber(v) { return typeof v === 'number' && Number.isFinite(v); }

  function classify(entry, keyWord, buckets) {
    if (!isObj(entry)) {
      if (keyWord && (typeof entry === 'string')) buckets.vocab.push({ word: keyWord });
      return;
    }
    var hasHighlights = Array.isArray(entry.highlight_words) || Array.isArray(entry.highlightWords) ||
      Array.isArray(entry.words) || Array.isArray(entry.targetWords);
    if (hasHighlights || (entry.title !== undefined && entry.artist !== undefined)) { buckets.songs.push(entry); return; }
    if ((entry.question !== undefined || entry.prompt !== undefined) &&
        (entry.options !== undefined || entry.answer !== undefined || entry.song_id !== undefined)) {
      buckets.questions.push(entry); return;
    }
    var word = entry.word || entry.word_id || entry.wordId || keyWord;
    if (word !== undefined && word !== null && String(word).trim() !== '') {
      var copy = {};
      Object.keys(entry).forEach(function (k) { copy[k] = entry[k]; });
      if (!copy.word) copy.word = String(word);
      buckets.vocab.push(copy);
    }
  }

  function walk(container, buckets, depth) {
    if (!container || depth > 4) return;
    if (Array.isArray(container)) {
      container.forEach(function (e) {
        if (isObj(e) && (Array.isArray(e.songs) || Array.isArray(e.questions) || Array.isArray(e.vocab))) walk(e, buckets, depth + 1);
        else classify(e, null, buckets);
      });
      return;
    }
    if (typeof Map !== 'undefined' && container instanceof Map) {
      container.forEach(function (v, k) { classify(v, String(k), buckets); });
      return;
    }
    if (!isObj(container)) return;
    var known = ['songs', 'catalogue', 'catalog', 'questions', 'vocab', 'wordInfo', 'vocabMap', 'amiramVocab', 'data'];
    var found = false;
    known.forEach(function (k) {
      if (container[k] !== undefined) { found = true; walk(container[k], buckets, depth + 1); }
    });
    if (found) return;
    // A vocab map { word: entry, ... } or a single entry.
    var values = Object.keys(container).map(function (k) { return container[k]; });
    var isEntry = container.word !== undefined || container.part_of_speech !== undefined ||
      container.level !== undefined || container.highlight_words !== undefined || container.question !== undefined;
    if (isEntry) { classify(container, null, buckets); return; }
    Object.keys(container).forEach(function (k) { classify(container[k], k, buckets); });
    void values;
  }

  function collect(songCatalog, amiramVocabMap) {
    var buckets = { songs: [], questions: [], vocab: [] };
    walk(songCatalog, buckets, 0);
    walk(amiramVocabMap, buckets, 0);
    var seenQ = {}; var questions = [];
    buckets.questions.forEach(function (q) {
      if (q.id === undefined) return;
      var k = String(q.id); if (seenQ[k]) return; seenQ[k] = true; questions.push(q);
    });
    var seenV = {}; var vocab = [];
    buckets.vocab.forEach(function (v) {
      var w = normWord(v.word); if (!w || seenV[w]) return; seenV[w] = true; vocab.push(v);
    });
    return { songs: buckets.songs, questions: questions, vocab: vocab, vocabByWord: seenV && vocab.reduce(function (m, v) { m[normWord(v.word)] = v; return m; }, {}) };
  }

  function songWordsOf(song) {
    var raw = Array.isArray(song.highlight_words) ? song.highlight_words
      : (Array.isArray(song.highlightWords) ? song.highlightWords
        : (Array.isArray(song.words) ? song.words : (Array.isArray(song.targetWords) ? song.targetWords : [])));
    var seen = {}; var out = [];
    raw.forEach(function (w) {
      var word = normWord(isObj(w) ? (w.word || w.word_id) : w);
      if (!word || seen[word]) return; seen[word] = true; out.push(word);
    });
    return out;
  }

  function levelForScore(score) {
    if (Simulation && typeof Simulation.levelForScore === 'function') return Simulation.levelForScore(score);
    if (score >= 134) return 'Exemption';
    if (score >= 120) return 'AdvancedB';
    if (score >= 100) return 'AdvancedA';
    if (score >= 85) return 'Basic';
    return 'PreBasic';
  }

  function emptyResult(score, level, weakCategories) {
    return {
      simulationScore: score, exemptionLevel: level,
      weakCategories: weakCategories || [], recommendedSong: null,
      targetWords: [], targetQuestionIds: [],
      timestamp: new Date().toISOString()
    };
  }

  function weakFromProfile(profile) {
    var items = [];
    [['byPartOfSpeech'], ['byDifficulty']].forEach(function (pair) {
      var map = profile[pair[0]] || {};
      Object.keys(map).forEach(function (k) {
        if (k === 'unknown' || !map[k].errors) return;
        items.push({ key: k, errorRate: map[k].errorRate, attempts: map[k].attempts });
      });
    });
    items.sort(function (a, b) { return (b.errorRate - a.errorRate) || (b.attempts - a.attempts) || cmpStr(a.key, b.key); });
    var seen = {}; var out = [];
    items.forEach(function (i) { if (!seen[i.key]) { seen[i.key] = true; out.push(i.key); } });
    return out;
  }

  function enrichmentPlan(data, score, level) {
    var result = emptyResult(score, level, ['C']);
    if (!Recommender) return result;
    var candidates = [];
    data.songs.forEach(function (song, i) {
      if (!isObj(song)) return;
      var cWords = songWordsOf(song).filter(function (w) {
        var v = data.vocabByWord[w];
        return v && Recommender.normalizeDifficulty(v.level) === 'C';
      });
      if (cWords.length < 3) return;
      var songId = song.id !== undefined ? song.id : (song.song_id !== undefined ? song.song_id : i);
      candidates.push({ song: song, songId: songId, cWords: cWords,
        title: song.title ? String(song.title) : '' });
    });
    candidates.sort(function (a, b) {
      return (b.cWords.length - a.cWords.length) || cmpStr(a.title, b.title) || cmpId(a.songId, b.songId);
    });
    if (!candidates.length) return result;
    var top = candidates[0];
    var targetWordList = top.cWords.slice(0, 3);
    result.recommendedSong = { songId: top.songId, id: top.songId,
      title: top.title, artist: top.song.artist ? String(top.song.artist) : '',
      score: top.cWords.length, weakWords: [] };
    result.targetWords = targetWordList.map(function (w) {
      var v = data.vocabByWord[w];
      return { word: w, songId: top.songId,
        partOfSpeech: Recommender.normalizePartOfSpeech(v && v.part_of_speech),
        difficulty: 'C', directlyMissed: false, need: 0 };
    });
    // Question ids only from an actually supplied catalogue.
    var inSong = {}; top.cWords.forEach(function (w) { inSong[w] = true; });
    var isC = function (w) { var v = data.vocabByWord[w]; return v && Recommender.normalizeDifficulty(v.level) === 'C'; };
    var scored = [];
    data.questions.forEach(function (q) {
      var w = normWord(q.word || q.word_id);
      if (!w || !isC(w)) return;
      scored.push({ id: q.id, word: w, inSong: inSong[w] ? 0 : 1 });
    });
    scored.sort(function (a, b) { return (a.inSong - b.inSong) || cmpStr(a.word, b.word) || cmpId(a.id, b.id); });
    result.targetQuestionIds = scored.slice(0, 5).map(function (s) { return s.id; });
    return result;
  }

  function coordinateSessionFromSimulation(simulationResult, songCatalog, amiramVocabMap) {
    if (!isObj(simulationResult) || !Recommender) return emptyResult(null, null, []);
    var data = collect(songCatalog, amiramVocabMap);

    var score = null;
    if (isFiniteNumber(simulationResult.score) && simulationResult.score >= 0 && simulationResult.score <= 150) {
      score = Math.round(simulationResult.score);
    } else if (isFiniteNumber(simulationResult.correctCount) && isFiniteNumber(simulationResult.totalCount) &&
        simulationResult.totalCount > 0 && simulationResult.correctCount >= 0 &&
        simulationResult.correctCount <= simulationResult.totalCount) {
      score = Math.round(50 + (simulationResult.correctCount / simulationResult.totalCount) * 100);
    }
    var level = null;
    if (typeof simulationResult.level === 'string' && simulationResult.level.trim()) level = simulationResult.level.trim();
    else if (typeof simulationResult.exemptionLevel === 'string' && simulationResult.exemptionLevel.trim()) level = simulationResult.exemptionLevel.trim();
    else if (score !== null) level = levelForScore(score);
    if (score === null) return emptyResult(null, level, []);

    var reviewList = Array.isArray(simulationResult.reviewList) ? simulationResult.reviewList : [];
    var questionById = {};
    data.questions.forEach(function (q) { questionById[String(q.id)] = q; });
    var attempts = []; var reviewIds = []; var seenReview = {};
    reviewList.forEach(function (entry) {
      if (!isObj(entry)) return;
      var qid = entry.questionId !== undefined ? entry.questionId : entry.id;
      var q = qid !== undefined && qid !== null ? questionById[String(qid)] : undefined;
      var attempt = { correct: false };
      if (qid !== undefined && qid !== null) {
        attempt.questionId = qid;
        var k = String(qid); if (!seenReview[k]) { seenReview[k] = true; reviewIds.push(qid); }
      }
      if (entry.userAnswer !== undefined) attempt.userAnswer = entry.userAnswer;
      if (entry.correctAnswer !== undefined) attempt.correctAnswer = entry.correctAnswer;
      else if (entry.answer !== undefined) attempt.correctAnswer = entry.answer;
      var word = normWord(entry.word || entry.word_id || (q && (q.word || q.word_id)));
      if (!word) {
        var cand = normWord(entry.correctAnswer !== undefined ? entry.correctAnswer : entry.answer);
        if (cand && data.vocabByWord[cand]) word = cand;
      }
      if (word) attempt.word = word;
      if (entry.part_of_speech !== undefined) attempt.part_of_speech = entry.part_of_speech;
      if (entry.pos !== undefined) attempt.pos = entry.pos;
      if (entry.level !== undefined) attempt.level = entry.level;
      if (entry.difficulty !== undefined) attempt.difficulty = entry.difficulty;
      attempts.push(attempt);
    });

    var profile = Recommender.analyzeErrors(attempts, { vocab: data.vocab, questions: data.questions });
    var isPerfect = score === 150 && profile.errorCount === 0;
    if (isPerfect) return enrichmentPlan(data, score, level);
    if (!profile.errorCount) return emptyResult(score, level, []);

    var weakCategories = weakFromProfile(profile);
    var plan = Recommender.buildStudyPlan({ profile: profile, songs: data.songs, questions: data.questions, vocab: data.vocab });
    var result = emptyResult(score, level, weakCategories);
    if (plan.status === 'ready') {
      result.recommendedSong = plan.recommendedSong;
      result.targetWords = plan.karaokeTargetWords;
      result.targetQuestionIds = plan.quizQuestionIds;
      return result;
    }
    // Partial-but-valid fallback: a ranked song with >=3 words still gives
    // real targets; quiz ids come from the supplied catalogue if present,
    // otherwise from the actual reviewList (never invented).
    var top = plan.rankedSongs && plan.rankedSongs[0];
    if (top && top.words.length >= 3) {
      result.recommendedSong = { songId: top.songId, id: top.id, title: top.title,
        artist: top.artist, score: top.score, weakWords: top.weakWords.slice() };
      result.targetWords = top.wordDetails.slice()
        .sort(function (a, b) { return (b.value - a.value) || cmpStr(a.word, b.word); })
        .slice(0, 3)
        .map(function (d) { return { word: d.word, songId: top.songId, partOfSpeech: d.partOfSpeech,
          difficulty: d.difficulty, directlyMissed: d.directlyMissed, need: d.need }; });
      if (data.questions.length) {
        var targetSet = {}; result.targetWords.forEach(function (t) { targetSet[t.word] = true; });
        var missedSet = {}; profile.missedWords.forEach(function (m) { missedSet[m.word] = true; });
        var eligible = data.questions.slice().sort(function (a, b) {
          var aw = normWord(a.word || a.word_id); var bw = normWord(b.word || b.word_id);
          var ap = (missedSet[aw] || targetSet[aw]) ? 0 : 1; var bp = (missedSet[bw] || targetSet[bw]) ? 0 : 1;
          return (ap - bp) || cmpStr(aw, bw) || cmpId(a.id, b.id);
        });
        result.targetQuestionIds = eligible.slice(0, 5).map(function (q) { return q.id; });
      } else {
        result.targetQuestionIds = reviewIds.slice(0, 5);
      }
    }
    return result;
  }

  return { coordinateSessionFromSimulation: coordinateSessionFromSimulation };
}));
