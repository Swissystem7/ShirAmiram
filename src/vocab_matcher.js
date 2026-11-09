// ShirAmiram — Lexical Matcher & Stemming Engine (pure logic)
// Bridges gap between real song/question vocabulary and the 300 Amiram words.
// Pure, deterministic, zero-dependency. Safe against prototype pollution and mutations.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ShirAmiramVocabMatcher = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function isObj(v) {
    return !!v && typeof v === 'object' && !Array.isArray(v);
  }

  function norm(str) {
    if (str === null || str === undefined) return '';
    return String(str).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  }

  // Fast Levenshtein distance calculation
  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;

    var v0 = new Array(b.length + 1);
    var v1 = new Array(b.length + 1);

    for (var i = 0; i <= b.length; i++) v0[i] = i;

    for (var i = 0; i < a.length; i++) {
      v1[0] = i + 1;
      for (var j = 0; j < b.length; j++) {
        var cost = (a.charAt(i) === b.charAt(j)) ? 0 : 1;
        v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
      }
      for (var j = 0; j <= b.length; j++) v0[j] = v1[j];
    }

    return v1[b.length];
  }

  // Common irregular verb / adjective / noun mappings
  var IRREGULARS = Object.freeze({
    'better': 'good',
    'best': 'good',
    'worse': 'bad',
    'worst': 'bad',
    'went': 'go',
    'gone': 'go',
    'ran': 'run',
    'running': 'run',
    'saw': 'see',
    'seen': 'see',
    'took': 'take',
    'taken': 'take',
    'wrote': 'write',
    'written': 'write',
    'writing': 'write',
    'children': 'child',
    'men': 'man',
    'women': 'woman',
    'people': 'person'
  });

  // Systematic English stemmer generating plausible base candidates
  function getStemCandidates(rawWord) {
    var word = norm(rawWord);
    if (!word || word.length < 2) return [word].filter(Boolean);

    var candidates = [word];
    function add(c) {
      if (c && c.length >= 2 && candidates.indexOf(c) === -1) {
        candidates.push(c);
      }
    }

    // 0. Check irregulars
    if (Object.prototype.hasOwnProperty.call(IRREGULARS, word)) {
      add(IRREGULARS[word]);
    }

    // 1. Adverb -ly, -ally
    if (word.endsWith('ally') && word.length > 5) {
      add(word.slice(0, -4)); // e.g. chronically -> chronic
      add(word.slice(0, -2)); // e.g. conditionally -> conditional
    } else if (word.endsWith('ly') && word.length > 4) {
      add(word.slice(0, -2)); // rapidly -> rapid, subtle -> subtly
      if (word.endsWith('ily')) {
        add(word.slice(0, -3) + 'y'); // happily -> happy
      }
    }

    // 2. Plural / 3rd-person singular -ies, -es, -s
    if (word.endsWith('ies') && word.length > 4) {
      add(word.slice(0, -3) + 'y'); // theories -> theory, categories -> category
    } else if (word.endsWith('es') && word.length > 3) {
      add(word.slice(0, -2)); // watches -> watch
      add(word.slice(0, -1)); // clauses -> clause
    } else if (word.endsWith('s') && !word.endsWith('ss') && word.length > 3) {
      add(word.slice(0, -1)); // steps -> step, dreams -> dream
    }

    // 3. Past tense / past participle -ied, -ed
    if (word.endsWith('ied') && word.length > 4) {
      add(word.slice(0, -3) + 'y'); // clarified -> clarify, denied -> deny
    } else if (word.endsWith('ed') && word.length > 3) {
      add(word.slice(0, -2)); // walked -> walk
      add(word.slice(0, -1)); // achieved -> achieve, created -> create
      // Double consonant rollback: stopped -> stop, robbed -> rob
      if (word.length > 5 && word.charAt(word.length - 3) === word.charAt(word.length - 4)) {
        add(word.slice(0, -3));
      }
    }

    // 4. Gerund / continuous -ing
    if (word.endsWith('ing') && word.length > 4) {
      add(word.slice(0, -3)); // demanding -> demand, singing -> sing, achieving -> achiev
      add(word.slice(0, -3) + 'e'); // achieving -> achieve, debating -> debate
      // Double consonant: running -> run, swimming -> swim
      if (word.length > 5 && word.charAt(word.length - 4) === word.charAt(word.length - 5)) {
        add(word.slice(0, -4));
      }
    }

    // 5. Comparatives / Superlatives -er, -est
    if (word.endsWith('est') && word.length > 4) {
      add(word.slice(0, -3));
      add(word.slice(0, -2));
    } else if (word.endsWith('er') && word.length > 3) {
      add(word.slice(0, -2));
      add(word.slice(0, -1));
    }

    // 6. Noun / Adjective suffixes: -tion, -sion, -ment, -ness, -able, -ible
    if (word.endsWith('tion') && word.length > 5) {
      add(word.slice(0, -4) + 'te'); // calculation -> calculate
      add(word.slice(0, -4) + 't'); // prevention -> prevent
    } else if (word.endsWith('ment') && word.length > 5) {
      add(word.slice(0, -4)); // agreement -> agree
    } else if (word.endsWith('ness') && word.length > 5) {
      add(word.slice(0, -4)); // darkness -> dark
    } else if (word.endsWith('able') && word.length > 5) {
      add(word.slice(0, -4));
      add(word.slice(0, -4) + 'e'); // debatable -> debate
    }

    // 7. Common prefixes: un-, in-, im-, dis-, re-
    var prefixes = ['un', 'in', 'im', 'dis', 're'];
    for (var p = 0; p < prefixes.length; p++) {
      var pref = prefixes[p];
      if (word.startsWith(pref) && word.length > pref.length + 3) {
        add(word.slice(pref.length));
      }
    }

    return candidates;
  }

  // Canonical stem (single best guess)
  function stem(word) {
    var cands = getStemCandidates(word);
    return cands.length > 1 ? cands[1] : cands[0] || '';
  }

  // Build high-performance lookup indexes over Amiram vocabulary
  function buildVocabIndex(vocabList) {
    var list = Array.isArray(vocabList) ? vocabList : [];
    var exactMap = Object.create(null);
    var stemMap = Object.create(null);
    var allItems = [];

    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      if (!item || typeof item !== 'object') continue;
      var w = norm(item.word);
      if (!w) continue;

      var cleanItem = Object.freeze({
        id: item.id != null ? item.id : (i + 1),
        word: item.word,
        normWord: w,
        part_of_speech: item.part_of_speech || item.category || 'unknown',
        level: item.level || (item.difficulty ? (item.difficulty.toLowerCase() === 'medium' ? 'B_intermediate' : (item.difficulty.toLowerCase() === 'hard' ? 'C_advanced' : 'A_foundational')) : 'A_foundational'),
        hebrew_translation: item.hebrew_translation || item.translation || '',
        hebrew_definition: item.hebrew_definition || item.explanation || ''
      });

      exactMap[w] = cleanItem;
      allItems.push(cleanItem);

      var cands = getStemCandidates(w);
      for (var c = 0; c < cands.length; c++) {
        var cand = cands[c];
        if (!stemMap[cand]) stemMap[cand] = [];
        if (stemMap[cand].indexOf(cleanItem) === -1) {
          stemMap[cand].push(cleanItem);
        }
      }
    }

    return Object.freeze({
      exactMap: exactMap,
      stemMap: stemMap,
      allItems: Object.freeze(allItems),
      size: allItems.length
    });
  }

  // Match a single query word against the indexed vocabulary
  function matchWord(query, index, options) {
    var opts = options || {};
    var threshold = typeof opts.threshold === 'number' ? opts.threshold : 0.7;
    var maxDistance = typeof opts.maxDistance === 'number' ? opts.maxDistance : 2;

    var q = norm(query);
    if (!q || !index || !index.exactMap) {
      return {
        matched: false,
        query: q,
        targetWord: null,
        item: null,
        matchType: null,
        distance: -1,
        confidence: 0
      };
    }

    // 1. Exact match
    if (index.exactMap[q]) {
      return {
        matched: true,
        query: q,
        targetWord: index.exactMap[q].word,
        item: index.exactMap[q],
        matchType: 'exact',
        distance: 0,
        confidence: 1.0
      };
    }

    // 2. Stem match via candidate variations
    var cands = getStemCandidates(q);
    for (var i = 0; i < cands.length; i++) {
      var cand = cands[i];
      if (index.exactMap[cand]) {
        return {
          matched: true,
          query: q,
          targetWord: index.exactMap[cand].word,
          item: index.exactMap[cand],
          matchType: 'stem',
          distance: 0,
          confidence: 0.95
        };
      }
      if (index.stemMap[cand] && index.stemMap[cand].length > 0) {
        var first = index.stemMap[cand][0];
        return {
          matched: true,
          query: q,
          targetWord: first.word,
          item: first,
          matchType: 'affix',
          distance: 0,
          confidence: 0.88
        };
      }
    }

    // 3. Substring / Prefix match for compound words
    if (q.length >= 5) {
      for (var i = 0; i < index.allItems.length; i++) {
        var item = index.allItems[i];
        var iw = item.normWord;
        if (iw.length >= 4 && (q.startsWith(iw) || iw.startsWith(q))) {
          return {
            matched: true,
            query: q,
            targetWord: item.word,
            item: item,
            matchType: 'affix',
            distance: Math.abs(q.length - iw.length),
            confidence: 0.82
          };
        }
      }
    }

    // 4. Fuzzy Levenshtein match
    var bestItem = null;
    var bestDist = Infinity;

    for (var i = 0; i < index.allItems.length; i++) {
      var item = index.allItems[i];
      var iw = item.normWord;
      // Skip length difference greater than maxDistance
      if (Math.abs(q.length - iw.length) > maxDistance) continue;

      var dist = levenshtein(q, iw);
      if (dist < bestDist && dist <= maxDistance) {
        bestDist = dist;
        bestItem = item;
      }
    }

    if (bestItem && bestDist <= maxDistance) {
      var conf = 1.0 - (bestDist / Math.max(q.length, bestItem.normWord.length));
      if (conf >= threshold) {
        return {
          matched: true,
          query: q,
          targetWord: bestItem.word,
          item: bestItem,
          matchType: 'fuzzy',
          distance: bestDist,
          confidence: Math.round(conf * 100) / 100
        };
      }
    }

    return {
      matched: false,
      query: q,
      targetWord: null,
      item: null,
      matchType: null,
      distance: -1,
      confidence: 0
    };
  }

  // Bridge an array of questions to vocabulary items
  function bridgeQuestions(questions, index) {
    var qs = Array.isArray(questions) ? questions : [];
    var matches = [];
    var unmatched = [];
    var countsByType = { exact: 0, stem: 0, affix: 0, fuzzy: 0 };

    for (var i = 0; i < qs.length; i++) {
      var q = qs[i];
      if (!q || typeof q !== 'object') continue;

      var qWord = q.word || q.answer || '';
      var res = matchWord(qWord, index);

      if (res.matched) {
        countsByType[res.matchType] = (countsByType[res.matchType] || 0) + 1;
        matches.push({
          questionId: q.id,
          originalWord: qWord,
          matchedWord: res.targetWord,
          level: res.item.level,
          part_of_speech: res.item.part_of_speech,
          hebrew_translation: res.item.hebrew_translation,
          matchType: res.matchType,
          confidence: res.confidence
        });
      } else {
        unmatched.push({
          questionId: q.id,
          originalWord: qWord
        });
      }
    }

    var total = matches.length + unmatched.length;
    var rate = total > 0 ? Math.round((matches.length / total) * 100) / 100 : 0;

    return {
      totalQuestions: total,
      matchedCount: matches.length,
      unmatchedCount: unmatched.length,
      matchRate: rate,
      byMatchType: countsByType,
      matches: matches,
      unmatched: unmatched
    };
  }

  // Bridge an array of songs to vocabulary items
  function bridgeSongs(songs, index) {
    var sList = Array.isArray(songs) ? songs : [];
    var songReports = [];
    var totalHighlightWords = 0;
    var totalMatched = 0;

    for (var i = 0; i < sList.length; i++) {
      var s = sList[i];
      if (!s || typeof s !== 'object') continue;

      var hw = Array.isArray(s.highlight_words) ? s.highlight_words : [];
      var matchedInSong = [];

      for (var j = 0; j < hw.length; j++) {
        var entry = hw[j];
        var w = typeof entry === 'object' ? (entry.word || '') : String(entry || '');
        var res = matchWord(w, index);
        totalHighlightWords++;
        if (res.matched) {
          totalMatched++;
          matchedInSong.push({
            originalWord: w,
            targetWord: res.targetWord,
            level: res.item.level,
            matchType: res.matchType
          });
        }
      }

      songReports.push({
        songId: s.id,
        title: s.title || '',
        highlightCount: hw.length,
        matchedCount: matchedInSong.length,
        coverageRate: hw.length ? Math.round((matchedInSong.length / hw.length) * 100) / 100 : 0,
        matches: matchedInSong
      });
    }

    return {
      totalSongs: sList.length,
      totalHighlightWords: totalHighlightWords,
      totalMatched: totalMatched,
      overallCoverageRate: totalHighlightWords ? Math.round((totalMatched / totalHighlightWords) * 100) / 100 : 0,
      songReports: songReports
    };
  }

  // Enrich single attempt or question metadata
  function resolveWordEnrichment(input, index) {
    if (!input || !index) return null;
    var word = '';
    if (typeof input === 'string') {
      word = input;
    } else if (isObj(input)) {
      word = input.word || input.answer || input.userAnswer || '';
    }

    var res = matchWord(word, index);
    if (!res.matched) return null;

    return {
      query: res.query,
      word: res.targetWord,
      level: res.item.level,
      part_of_speech: res.item.part_of_speech,
      hebrew_translation: res.item.hebrew_translation,
      hebrew_definition: res.item.hebrew_definition,
      matchType: res.matchType,
      confidence: res.confidence
    };
  }

  return Object.freeze({
    stem: stem,
    getStemCandidates: getStemCandidates,
    levenshtein: levenshtein,
    buildVocabIndex: buildVocabIndex,
    matchWord: matchWord,
    bridgeQuestions: bridgeQuestions,
    bridgeSongs: bridgeSongs,
    resolveWordEnrichment: resolveWordEnrichment
  });
}));
