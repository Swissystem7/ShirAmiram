// ShirAmiram — Adaptive Diagnostic & Song Recommender Engine (pure logic)
// No network, storage, UI, secrets or real-user data. Synthetic inputs only.
//
// GROUNDED DATA SHAPES (read from this repository, not invented):
// - Songs (data/imports/content_v2.json `songs`, 30 items):
//   { id, title, artist, highlight_words: [{ word, he, explanation }] }
//   Every real song carries exactly 5 highlight_words.
// - Questions (same file `questions`, 50 items):
//   { id, song_id, word_id, word, question, options, answer, explanation }
//   `answer` equals the target `word`; `song_id` links to a song id.
// - Vocabulary (src/amiram_vocab_data.js, 300 items):
//   { id, word, part_of_speech, level, hebrew_translation, ... }
//   level is A_foundational | B_intermediate | C_advanced.
//   In highlight/question explanations the Hebrew prefix also encodes POS
//   (e.g. "שם עצם: ..." = noun, "פועל: ..." = verb), used only as a fallback.
//
// API (all pure, deterministic, non-mutating):
//   analyzeErrors(attempts, reference?) -> profile
//     attempts: [{ word|word_id|questionId|id, correct|isCorrect,
//                  userAnswer+answer, part_of_speech|pos,
//                  level|difficulty, song_id }]
//     reference: { vocab|wordInfo: vocab[], questions: question[] }
//       enriches attempts that lack POS/difficulty from real shapes above.
//     Malformed entries are skipped and counted, never thrown on.
//   rankSongs(profile, songs, options?) -> rankedSongs (max 30)
//     options: { vocab|wordInfo, questions, limit }
//   buildStudyPlan(input) -> plan
//     input: { attempts, profile, songs|catalogue, questions,
//              vocab|wordInfo }
//     Ready plan: { status:'ready', recommendedSong, karaokeTargetWords[3],
//                   quizQuestionIds[5], rankedSongs, profile, reasons:[] }
//     Otherwise:   { status:'insufficient-data', recommendedSong:null,
//                   karaokeTargetWords:[], quizQuestionIds:[] (or partial
//                   only inside rankedSongs), reasons:[...] }
//     A plan is ready only with an error signal (>=1 incorrect attempt),
//     a song with >=3 target words, and >=5 eligible questions.
//
// SCORING / TIE-BREAK POLICY (deterministic, no randomness):
//   wordNeed(word) = 0.65*errorRate(its POS) + 0.35*errorRate(its level)
//     Unknown POS/level contributes the overall errorRate; no data -> 0.
//   wordValue(word) = wordNeed + (word was directly missed ? 1 : 0)
//   score(song) = round4( mean(wordValue over its words)*10
//                         + weakWordCount*0.5 )
//     weak word: directly missed, or wordNeed >= 0.25.
//   Order: score desc, weakWordCount desc, matchedWordCount desc,
//     title asc (code-point), song id asc (numeric when both numeric).
//   Same inputs always produce byte-identical ordering.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ShirAmiramAdaptiveRecommender = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MAX_CATALOGUE = 30;
  var KARAOKE_TARGET_COUNT = 3;
  var QUIZ_QUESTION_COUNT = 5;
  var WEAK_NEED_THRESHOLD = 0.25;

  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function normWord(v) {
    return v === undefined || v === null ? '' : String(v).trim().toLowerCase();
  }
  function round4(n) { return Math.round(n * 10000) / 10000; }
  function cmpStr(a, b) { return a < b ? -1 : (a > b ? 1 : 0); }
  function cmpId(a, b) {
    var na = Number(a); var nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb) && String(a).trim() !== '' && String(b).trim() !== '') return na - nb;
    return cmpStr(String(a), String(b));
  }

  function normalizePartOfSpeech(raw) {
    if (raw === undefined || raw === null) return 'unknown';
    var s = String(raw).trim().toLowerCase();
    if (!s) return 'unknown';
    if (s.indexOf('שם עצם') === 0 || s === 'noun' || s === 'n') return 'noun';
    if (s.indexOf('פועל') === 0 || s === 'verb' || s === 'v') return 'verb';
    if (s.indexOf('שם תואר') === 0 || s === 'adjective' || s === 'adj') return 'adjective';
    if (s.indexOf('תואר הפועל') === 0 || s === 'adverb' || s === 'adv') return 'adverb';
    if (s === 'preposition' || s === 'prep') return 'preposition';
    if (s === 'pronoun') return 'pronoun';
    if (s === 'conjunction') return 'conjunction';
    return s.replace(/\s+/g, '_');
  }

  function posFromExplanation(explanation) {
    if (typeof explanation !== 'string') return 'unknown';
    var head = explanation.trim();
    if (head.indexOf('שם עצם') === 0) return 'noun';
    if (head.indexOf('פועל') === 0) return 'verb';
    if (head.indexOf('שם תואר') === 0) return 'adjective';
    if (head.indexOf('תואר הפועל') === 0) return 'adverb';
    return 'unknown';
  }

  function normalizeDifficulty(raw) {
    if (raw === undefined || raw === null || raw === '') return 'unknown';
    if (typeof raw === 'number') {
      if (raw === 1) return 'A'; if (raw === 2) return 'B'; if (raw === 3) return 'C';
      return 'unknown';
    }
    var s = String(raw).trim().toLowerCase();
    if (s === 'a' || s.indexOf('a_') === 0 || s.indexOf('foundational') >= 0 || s === 'easy' || s === 'basic') return 'A';
    if (s === 'b' || s.indexOf('b_') === 0 || s.indexOf('intermediate') >= 0 || s === 'medium') return 'B';
    if (s === 'c' || s.indexOf('c_') === 0 || s.indexOf('advanced') >= 0 || s === 'hard') return 'C';
    return 'unknown';
  }

  function indexReference(reference) {
    var ref = isObj(reference) ? reference : {};
    var vocabList = Array.isArray(ref.vocab) ? ref.vocab
      : (Array.isArray(ref.wordInfo) ? ref.wordInfo : []);
    var questions = Array.isArray(ref.questions) ? ref.questions : [];
    var vocabByWord = {}; var questionById = {};
    vocabList.forEach(function (v) {
      if (!isObj(v)) return;
      var w = normWord(v.word || v.word_id || v.wordId);
      if (w && !vocabByWord[w]) vocabByWord[w] = v;
    });
    questions.forEach(function (q, i) {
      if (!isObj(q)) return;
      var id = q.id !== undefined ? String(q.id)
        : (q.questionId !== undefined ? String(q.questionId) : String(i));
      if (!questionById[id]) questionById[id] = q;
    });
    return { vocabByWord: vocabByWord, questionById: questionById };
  }

  function attemptCorrectness(a) {
    if (typeof a.correct === 'boolean') return a.correct;
    if (typeof a.isCorrect === 'boolean') return a.isCorrect;
    var expected = a.correctAnswer !== undefined ? a.correctAnswer
      : (a.answer !== undefined ? a.answer : undefined);
    var given = a.userAnswer !== undefined ? a.userAnswer
      : (a.selectedAnswer !== undefined ? a.selectedAnswer
        : (a.selected !== undefined ? a.selected : undefined));
    if (expected !== undefined && given !== undefined && given !== null && given !== '') {
      return String(given).trim().toLowerCase() === String(expected).trim().toLowerCase();
    }
    return null;
  }

  function emptyBucket() { return { attempts: 0, errors: 0, correct: 0, errorRate: 0 }; }
  function bump(map, key, isError) {
    if (!map[key]) map[key] = emptyBucket();
    map[key].attempts++; if (isError) map[key].errors++; else map[key].correct++;
  }
  function finishBuckets(map) {
    Object.keys(map).forEach(function (k) {
      var b = map[k]; b.errorRate = b.attempts ? round4(b.errors / b.attempts) : 0;
    });
    return map;
  }
  function weakestKey(map) {
    var best = null;
    Object.keys(map).sort(cmpStr).forEach(function (k) {
      if (k === 'unknown') return;
      if (!best || map[k].errorRate > map[best].errorRate ||
          (map[k].errorRate === map[best].errorRate && map[k].attempts > map[best].attempts)) best = k;
    });
    return best;
  }

  function analyzeErrors(attempts, reference) {
    var idx = indexReference(reference);
    var list = Array.isArray(attempts) ? attempts : [];
    var byPos = {}; var byDiff = {}; var missed = {};
    var total = 0; var correctCount = 0; var invalid = 0;
    list.forEach(function (a) {
      if (!isObj(a)) { invalid++; return; }
      var ok = attemptCorrectness(a);
      if (ok === null) { invalid++; return; }
      var qid = a.questionId !== undefined ? String(a.questionId)
        : (a.question_id !== undefined ? String(a.question_id)
          : (a.id !== undefined && (a.word !== undefined || a.word_id !== undefined) ? null : (a.id !== undefined ? String(a.id) : null)));
      var q = qid !== null ? idx.questionById[qid] : undefined;
      var word = normWord(a.word || a.word_id || a.wordId || (q && (q.word || q.word_id)));
      var vocab = word ? idx.vocabByWord[word] : undefined;
      var pos = normalizePartOfSpeech(a.part_of_speech || a.partOfSpeech || a.pos ||
        (vocab && vocab.part_of_speech) || (q && posFromExplanation(q.explanation)));
      var diff = normalizeDifficulty(a.level !== undefined ? a.level
        : (a.difficulty !== undefined ? a.difficulty
          : (vocab && vocab.level !== undefined ? vocab.level : (q && q.level))));
      total++; if (ok) correctCount++;
      bump(byPos, pos, !ok); bump(byDiff, diff, !ok);
      if (!ok && word) {
        if (!missed[word]) missed[word] = { word: word, count: 0, partOfSpeech: pos, difficulty: diff };
        missed[word].count++;
      }
    });
    var missedWords = Object.keys(missed).map(function (k) { return missed[k]; })
      .sort(function (x, y) { return (y.count - x.count) || cmpStr(x.word, y.word); });
    var errors = total - correctCount;
    return {
      totalAttempts: total, correctCount: correctCount, errorCount: errors,
      invalidCount: invalid,
      accuracy: total ? round4(correctCount / total) : 0,
      errorRate: total ? round4(errors / total) : 0,
      byPartOfSpeech: finishBuckets(byPos),
      byDifficulty: finishBuckets(byDiff),
      missedWords: missedWords,
      weakestPartOfSpeech: weakestKey(byPos),
      weakestDifficulty: weakestKey(byDiff)
    };
  }

  function songWords(song) {
    var raw = Array.isArray(song.highlight_words) ? song.highlight_words
      : (Array.isArray(song.highlightWords) ? song.highlightWords
        : (Array.isArray(song.words) ? song.words
          : (Array.isArray(song.targetWords) ? song.targetWords : [])));
    var seen = {}; var out = [];
    raw.forEach(function (w) {
      var word = normWord(isObj(w) ? (w.word || w.word_id) : w);
      if (!word || seen[word]) return;
      seen[word] = true; out.push(word);
    });
    return out;
  }

  function wordNeed(word, profile, vocabByWord) {
    var overall = profile && profile.errorRate ? profile.errorRate : 0;
    var vocab = vocabByWord[word];
    // POS/difficulty for a catalogue word come from the vocab reference;
    // missed-word entries carry their own resolved tags as a fallback.
    var missedEntry = null;
    (profile.missedWords || []).forEach(function (m) { if (m.word === word) missedEntry = m; });
    var pos = normalizePartOfSpeech(vocab ? vocab.part_of_speech
      : (missedEntry ? missedEntry.partOfSpeech : undefined));
    var diff = normalizeDifficulty(vocab ? vocab.level
      : (missedEntry ? missedEntry.difficulty : undefined));
    var posRate = profile.byPartOfSpeech && profile.byPartOfSpeech[pos]
      ? profile.byPartOfSpeech[pos].errorRate : overall;
    var diffRate = profile.byDifficulty && profile.byDifficulty[diff]
      ? profile.byDifficulty[diff].errorRate : overall;
    return {
      need: round4(0.65 * posRate + 0.35 * diffRate),
      partOfSpeech: pos, difficulty: diff, directlyMissed: !!missedEntry
    };
  }

  function rankSongs(profile, songs, options) {
    var prof = isObj(profile) && isObj(profile.byPartOfSpeech) ? profile
      : analyzeErrors(profile, options);
    var opts = isObj(options) ? options : {};
    var idx = indexReference(opts);
    var catalogue = Array.isArray(songs) ? songs.slice(0, MAX_CATALOGUE) : [];
    var ranked = [];
    catalogue.forEach(function (song, i) {
      if (!isObj(song)) return;
      var songId = song.id !== undefined ? song.id
        : (song.song_id !== undefined ? song.song_id : i);
      var words = songWords(song);
      if (!words.length) return;
      var details = words.map(function (w) {
        var info = wordNeed(w, prof, idx.vocabByWord);
        return { word: w, need: info.need, partOfSpeech: info.partOfSpeech,
          difficulty: info.difficulty, directlyMissed: info.directlyMissed,
          value: round4(info.need + (info.directlyMissed ? 1 : 0)) };
      });
      var weak = details.filter(function (d) { return d.directlyMissed || d.need >= WEAK_NEED_THRESHOLD; });
      var matched = details.filter(function (d) { return d.value > 0; });
      var mean = details.length
        ? details.reduce(function (s, d) { return s + d.value; }, 0) / details.length : 0;
      ranked.push({
        songId: songId, id: songId,
        title: song.title ? String(song.title) : '',
        artist: song.artist ? String(song.artist) : '',
        score: round4(mean * 10 + weak.length * 0.5),
        weakWordCount: weak.length, matchedWordCount: matched.length,
        words: words.slice(),
        weakWords: weak.map(function (d) { return d.word; }),
        wordDetails: details
      });
    });
    ranked.sort(function (a, b) {
      return (b.score - a.score) || (b.weakWordCount - a.weakWordCount) ||
        (b.matchedWordCount - a.matchedWordCount) ||
        cmpStr(a.title, b.title) || cmpId(a.songId, b.songId);
    });
    var limit = Number.isInteger(opts.limit) && opts.limit > 0
      ? Math.min(opts.limit, MAX_CATALOGUE) : MAX_CATALOGUE;
    return ranked.slice(0, limit);
  }

  function pickQuizIds(profile, ranked, questions, vocabByWord) {
    var pool = Array.isArray(questions) ? questions : [];
    var top = ranked[0];
    var scored = [];
    pool.forEach(function (q, i) {
      if (!isObj(q) || q.id === undefined) return;
      var word = normWord(q.word || q.word_id);
      var info = wordNeed(word, profile, vocabByWord);
      var value = info.need + (info.directlyMissed ? 1 : 0);
      var songBonus = top && String(q.song_id) === String(top.songId) ? 0.25 : 0;
      scored.push({ id: q.id, value: round4(value + songBonus), word: word });
    });
    scored.sort(function (a, b) {
      return (b.value - a.value) || cmpId(a.id, b.id) || cmpStr(a.word, b.word);
    });
    var seen = {}; var ids = [];
    scored.forEach(function (s) {
      var k = String(s.id); if (seen[k]) return; seen[k] = true; ids.push(s.id);
    });
    return ids.slice(0, QUIZ_QUESTION_COUNT);
  }

  function buildStudyPlan(input) {
    var inp = isObj(input) ? input : {};
    var songs = Array.isArray(inp.songs) ? inp.songs
      : (Array.isArray(inp.catalogue) ? inp.catalogue : []);
    var questions = Array.isArray(inp.questions) ? inp.questions : [];
    var profile = isObj(inp.profile) && isObj(inp.profile.byPartOfSpeech)
      ? inp.profile : analyzeErrors(inp.attempts, inp);
    var idx = indexReference(inp);
    var ranked = rankSongs(profile, songs, inp);
    var reasons = [];
    if (!profile.totalAttempts) reasons.push('insufficient-diagnostic-data: no valid attempts');
    else if (!profile.errorCount) reasons.push('insufficient-diagnostic-data: no incorrect attempts to learn from');
    if (!ranked.length) reasons.push('insufficient-catalogue: no song with target words');
    else if (ranked[0].words.length < KARAOKE_TARGET_COUNT) reasons.push('insufficient-karaoke-words: top song has fewer than 3 target words');
    var quizIds = ranked.length ? pickQuizIds(profile, ranked, questions, idx.vocabByWord) : [];
    if (quizIds.length < QUIZ_QUESTION_COUNT) reasons.push('insufficient-questions: fewer than 5 eligible questions');
    if (reasons.length) {
      return { status: 'insufficient-data', profile: profile, rankedSongs: ranked,
        recommendedSong: null, karaokeTargetWords: [], quizQuestionIds: [], reasons: reasons };
    }
    var top = ranked[0];
    var targets = top.wordDetails.slice()
      .sort(function (a, b) { return (b.value - a.value) || cmpStr(a.word, b.word); })
      .slice(0, KARAOKE_TARGET_COUNT)
      .map(function (d) {
        return { word: d.word, songId: top.songId, partOfSpeech: d.partOfSpeech,
          difficulty: d.difficulty, directlyMissed: d.directlyMissed, need: d.need };
      });
    return { status: 'ready', profile: profile, rankedSongs: ranked,
      recommendedSong: { songId: top.songId, id: top.id, title: top.title,
        artist: top.artist, score: top.score, weakWords: top.weakWords.slice() },
      karaokeTargetWords: targets, quizQuestionIds: quizIds, reasons: [] };
  }

  return {
    MAX_CATALOGUE: MAX_CATALOGUE,
    normalizePartOfSpeech: normalizePartOfSpeech,
    normalizeDifficulty: normalizeDifficulty,
    analyzeErrors: analyzeErrors,
    rankSongs: rankSongs,
    buildStudyPlan: buildStudyPlan,
  };
}));
