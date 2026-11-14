// ShirAmiram — Lexical Matcher & Stemming Engine (pure logic)
// Bridges song lyrical vocabulary to the 300 academic Amiram vocabulary words.
// Zero external dependencies, non-mutating, deterministic, UMD module.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ShirAmiramVocabMatcher = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function isString(s) { return typeof s === 'string'; }

  /**
   * Normalizes an English word: lowercase, trimmed, punctuation stripped.
   * @param {string} rawWord
   * @returns {string}
   */
  function normalize(rawWord) {
    if (!rawWord || typeof rawWord !== 'string') return '';
    return rawWord
      .toLowerCase()
      .trim()
      .replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, '');
  }

  /**
   * English stemming algorithm tailored for Amiram exam & song lyrics vocabulary.
   * Handles plurals (-ies, -es, -s), verb inflections (-ing, -ied, -ed),
   * adverbs (-ly), and nominalizations (-tion, -ment, -ness).
   * @param {string} word
   * @returns {string}
   */
  function stem(word) {
    const w = normalize(word);
    if (w.length <= 3) return w;

    // Plurals & y-to-i rules
    if (w.endsWith('ies') && w.length >= 5) {
      return w.slice(0, -3) + 'y';
    }
    if (w.endsWith('ied') && w.length >= 5) {
      return w.slice(0, -3) + 'y';
    }

    // Gerund & continuous (-ing)
    if (w.endsWith('ing') && w.length >= 5) {
      const base = w.slice(0, -3);
      // Double consonant reduction (e.g. running -> run, swimming -> swim)
      if (base.length >= 3 && base[base.length - 1] === base[base.length - 2] && !['l', 's', 'z'].includes(base[base.length - 1])) {
        return base.slice(0, -1);
      }
      // e drop recovery (e.g. changing -> change, taking -> take)
      if (['chang', 'car', 'hop', 'mak', 'tak', 'driv', 'achiev', 'debat', 'creat'].includes(base)) {
        return base + 'e';
      }
      return base;
    }

    // Past tense / participles (-ed)
    if (w.endsWith('ed') && w.length >= 4) {
      const base = w.slice(0, -2);
      if (base.length >= 3 && base[base.length - 1] === base[base.length - 2] && !['l', 's', 'z'].includes(base[base.length - 1])) {
        return base.slice(0, -1);
      }
      if (w.endsWith('eed')) {
        return w; // exceed, succeed
      }
      if (base.endsWith('i')) {
        return base.slice(0, -1) + 'y';
      }
      if (['chang', 'car', 'hop', 'mak', 'tak', 'achiev', 'debat', 'creat'].includes(base)) {
        return base + 'e';
      }
      return base;
    }

    // Adverbs (-ly)
    if (w.endsWith('ly') && w.length >= 4) {
      const base = w.slice(0, -2);
      if (base.endsWith('i')) return base.slice(0, -1) + 'y';
      return base;
    }

    // Plurals / 3rd person (-es, -s)
    if (w.endsWith('es') && w.length >= 4) {
      if (['ch', 'sh', 'ss', 'x', 'z'].some(suffix => w.slice(0, -2).endsWith(suffix))) {
        return w.slice(0, -2);
      }
      return w.slice(0, -1);
    }
    if (w.endsWith('s') && !w.endsWith('ss') && w.length >= 4) {
      return w.slice(0, -1);
    }

    // Nominalization & derivational forms
    if (w.endsWith('tion') && w.length >= 6) {
      return w.slice(0, -4) + 't'; // reflection -> reflect, convention -> convent
    }
    if (w.endsWith('ance') && w.length >= 6) {
      return w.slice(0, -4); // acceptance -> accept
    }
    if (w.endsWith('ment') && w.length >= 6) {
      return w.slice(0, -4);
    }
    if (w.endsWith('ness') && w.length >= 6) {
      return w.slice(0, -4);
    }

    return w;
  }

  // Systematic English stemmer generating plausible base candidates
  function getStemCandidates(rawWord) {
    const word = normalize(rawWord);
    if (!word || word.length < 2) return [word].filter(Boolean);

    const candidates = [word];
    function add(c) {
      if (c && c.length >= 2 && !candidates.includes(c)) {
        candidates.push(c);
      }
    }

    const s = stem(word);
    add(s);

    if (word.endsWith('ing') && word.length > 4) {
      add(word.slice(0, -3));
      add(word.slice(0, -3) + 'e');
    }
    if (word.endsWith('ed') && word.length > 3) {
      add(word.slice(0, -2));
      add(word.slice(0, -1));
    }
    if (word.endsWith('ies') && word.length > 4) {
      add(word.slice(0, -3) + 'y');
    }
    if (word.endsWith('es') && word.length > 3) {
      add(word.slice(0, -2));
      add(word.slice(0, -1));
    }
    if (word.endsWith('s') && !word.endsWith('ss') && word.length > 3) {
      add(word.slice(0, -1));
    }
    if (word.endsWith('ly') && word.length > 4) {
      add(word.slice(0, -2));
      if (word.endsWith('ily')) add(word.slice(0, -3) + 'y');
    }

    return candidates;
  }

  /**
   * Levenshtein Distance calculation for fuzzy matching.
   * @param {string} a
   * @param {string} b
   * @returns {number}
   */
  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;

    const row = [];
    for (let j = 0; j <= b.length; j++) row[j] = j;

    for (let i = 1; i <= a.length; i++) {
      let prev = i;
      for (let j = 1; j <= b.length; j++) {
        let val;
        if (a[i - 1] === b[j - 1]) {
          val = row[j - 1];
        } else {
          val = Math.min(row[j - 1] + 1, prev + 1, row[j] + 1);
        }
        row[j - 1] = prev;
        prev = val;
      }
      row[b.length] = prev;
    }
    return row[b.length];
  }

  /**
   * Normalized similarity score (0 to 1).
   * @param {string} a
   * @param {string} b
   * @returns {number}
   */
  function similarity(a, b) {
    const s1 = normalize(a);
    const s2 = normalize(b);
    if (s1 === s2) return 1.0;
    const maxLen = Math.max(s1.length, s2.length);
    if (maxLen === 0) return 1.0;
    const dist = levenshtein(s1, s2);
    return Math.max(0, 1 - dist / maxLen);
  }

  /**
   * Curated semantic and morphological family mapping
   * connecting common lyrical song words to academic Amiram targets.
   */
  const SEMANTIC_FAMILIES = Object.freeze({
    peace: ['calm', 'consent', 'consistent', 'community', 'conform'],
    comfort: ['benefit', 'assist', 'capacity', 'sustain', 'relief'],
    acceptance: ['consent', 'adapt', 'conclude', 'acknowledge'],
    wisdom: ['concept', 'capacity', 'insight', 'conclude'],
    calm: ['consistent', 'constant', 'consent'],
    memory: ['retain', 'concept', 'recall', 'conclude'],
    regret: ['conflict', 'consequence', 'collapse', 'reluctant'],
    time: ['annual', 'constant', 'period', 'duration', 'interval'],
    change: ['adapt', 'alter', 'shift', 'transform', 'vary'],
    reflection: ['conclude', 'consider', 'concept', 'evaluate'],
    support: ['assist', 'sustain', 'maintain', 'advocate', 'benefit'],
    encourage: ['motivate', 'promote', 'stimulate', 'inspire', 'assist'],
    journey: ['process', 'approach', 'conduct', 'passage', 'transition'],
    hope: ['aspire', 'anticipate', 'assume', 'prospect'],
    dream: ['concept', 'aspire', 'vision', 'potential'],
    future: ['consequence', 'prospect', 'potential', 'subsequent'],
    unity: ['community', 'constitute', 'integrate', 'cohesion'],
    possibility: ['available', 'potential', 'alternative', 'capacity'],
    question: ['challenge', 'conduct', 'investigate', 'inquire'],
    answer: ['conclude', 'respond', 'clarify', 'resolve'],
    freedom: ['authority', 'autonomy', 'capacity', 'release'],
    justice: ['authority', 'conduct', 'appropriate', 'legitimate'],
    beauty: ['apparent', 'concept', 'distinction', 'elegance'],
    nature: ['environment', 'circumstance', 'constitute', 'attribute'],
    joy: ['benefit', 'delight', 'contentment', 'satisfaction'],
    sky: ['environment', 'scope', 'dimension'],
    praise: ['acknowledge', 'appreciate', 'advocate'],
    faith: ['assume', 'conviction', 'consent', 'trust'],
    song: ['communicate', 'expression', 'theme'],
    emotion: ['attitude', 'affect', 'intense', 'sentiment'],
    silence: ['constant', 'calm', 'restraint'],
    escape: ['abandon', 'evade', 'alternative'],
    friendship: ['community', 'cooperate', 'bond', 'alliance'],
    loyalty: ['consistent', 'constant', 'devotion', 'fidelity'],
    trust: ['rely', 'consent', 'assume', 'confidence'],
    lean: ['rely', 'depend', 'approach'],
    help: ['assist', 'benefit', 'support'],
    shoulder: ['capacity', 'bear', 'undertake'],
    burden: ['challenge', 'consequence', 'collapse', 'strain'],
    strong: ['considerable', 'constant', 'robust', 'capacity'],
    mountain: ['challenge', 'obstacle', 'elevation'],
    enough: ['adequate', 'sufficient', 'capacity'],
    valley: ['environment', 'dimension', 'depression'],
    reach: ['achieve', 'attain', 'approach', 'extend'],
    distance: ['dimension', 'interval', 'extent'],
    birds: ['species', 'organism', 'creature'],
    doorstep: ['approach', 'threshold', 'boundary'],
    worry: ['conflict', 'challenge', 'distress', 'concern'],
    morning: ['initial', 'commence', 'phase'],
    little: ['minimal', 'minor', 'fraction']
  });

  /**
   * Builds an indexed map of vocabulary words for rapid matching.
   * @param {Array} vocabList - Array of vocab objects or strings
   * @returns {Object}
   */
  function buildLexicalIndex(vocabList) {
    const exactMap = Object.create(null);
    const stemMap = Object.create(null);
    const entries = [];

    if (Array.isArray(vocabList)) {
      for (let i = 0; i < vocabList.length; i++) {
        const item = vocabList[i];
        if (!item || (typeof item !== 'object' && typeof item !== 'string')) continue;
        const rawW = isObj(item) ? (item.word || item.id || '') : String(item || '');
        const normW = normalize(rawW);
        if (!normW) continue;

        const entry = Object.freeze(isObj(item) ? Object.assign({}, item, {
          id: item.id != null ? item.id : (i + 1),
          word: item.word || normW,
          normWord: normW,
          part_of_speech: item.part_of_speech || item.category || 'unknown',
          level: item.level || (item.difficulty ? (item.difficulty.toLowerCase() === 'medium' ? 'B_intermediate' : (item.difficulty.toLowerCase() === 'hard' ? 'C_advanced' : 'A_foundational')) : 'A_foundational'),
          hebrew_translation: item.hebrew_translation || item.translation || '',
          hebrew_definition: item.hebrew_definition || item.explanation || ''
        }) : {
          id: i + 1,
          word: normW,
          normWord: normW,
          part_of_speech: 'unknown',
          level: 'A_foundational',
          hebrew_translation: '',
          hebrew_definition: ''
        });

        entries.push(entry);

        if (!exactMap[normW]) exactMap[normW] = entry;

        const cands = getStemCandidates(normW);
        for (let c = 0; c < cands.length; c++) {
          const cand = cands[c];
          if (!stemMap[cand]) stemMap[cand] = [];
          if (!stemMap[cand].includes(entry)) stemMap[cand].push(entry);
        }
      }
    }

    return Object.freeze({
      exactMap,
      stemMap,
      entries: Object.freeze(entries),
      allItems: Object.freeze(entries),
      size: entries.length
    });
  }

  /**
   * Matches a single word against a vocabulary index or list.
   * @param {string} inputWord
   * @param {Array|Object} vocabSource - vocab list or indexed vocab
   * @param {Object} [options]
   * @returns {Object}
   */
  function matchWord(inputWord, vocabSource, options) {
    const opts = options || {};
    const norm = normalize(inputWord);

    if (!norm) {
      return {
        matched: false,
        inputWord: '',
        query: '',
        matchedWord: null,
        targetWord: null,
        vocabEntry: null,
        item: null,
        matchType: 'none',
        distance: -1,
        confidence: 0
      };
    }

    const index = (vocabSource && vocabSource.exactMap && vocabSource.stemMap)
      ? vocabSource
      : buildLexicalIndex(vocabSource);

    // 1. Exact match
    if (index.exactMap[norm]) {
      const entry = index.exactMap[norm];
      return {
        matched: true,
        inputWord: norm,
        query: norm,
        matchedWord: entry.word,
        targetWord: entry.word,
        vocabEntry: entry,
        item: entry,
        matchType: 'exact',
        distance: 0,
        confidence: 1.0
      };
    }

    // 2. Stem match
    const cands = getStemCandidates(norm);
    for (let i = 0; i < cands.length; i++) {
      const cand = cands[i];
      if (index.exactMap[cand]) {
        const entry = index.exactMap[cand];
        return {
          matched: true,
          inputWord: norm,
          query: norm,
          matchedWord: entry.word,
          targetWord: entry.word,
          vocabEntry: entry,
          item: entry,
          matchType: 'stem',
          distance: 0,
          confidence: 0.95
        };
      }
      if (index.stemMap[cand] && index.stemMap[cand].length > 0) {
        const entry = index.stemMap[cand][0];
        return {
          matched: true,
          inputWord: norm,
          query: norm,
          matchedWord: entry.word,
          targetWord: entry.word,
          vocabEntry: entry,
          item: entry,
          matchType: 'stem',
          distance: 0,
          confidence: 0.90
        };
      }
    }

    // 3. Root / Prefix match (min length 4)
    const inputStem = stem(norm);
    if (inputStem.length >= 4) {
      for (let i = 0; i < index.entries.length; i++) {
        const candidate = index.entries[i];
        const candStem = stem(candidate.word);
        if (candStem.length >= 4 && (candStem.startsWith(inputStem) || inputStem.startsWith(candStem))) {
          return {
            matched: true,
            inputWord: norm,
            query: norm,
            matchedWord: candidate.word,
            targetWord: candidate.word,
            vocabEntry: candidate,
            item: candidate,
            matchType: 'root',
            distance: Math.abs(candStem.length - inputStem.length),
            confidence: 0.85
          };
        }
      }
    }

    // 4. Semantic / Morphological Family match
    const familyTargets = SEMANTIC_FAMILIES[norm] || SEMANTIC_FAMILIES[inputStem];
    if (familyTargets && Array.isArray(familyTargets)) {
      for (let j = 0; j < familyTargets.length; j++) {
        const target = familyTargets[j];
        if (index.exactMap[target]) {
          const entry = index.exactMap[target];
          return {
            matched: true,
            inputWord: norm,
            query: norm,
            matchedWord: entry.word,
            targetWord: entry.word,
            vocabEntry: entry,
            item: entry,
            matchType: 'family',
            distance: 0,
            confidence: 0.80
          };
        }
        const targetStem = stem(target);
        if (index.stemMap[targetStem] && index.stemMap[targetStem].length > 0) {
          const entry = index.stemMap[targetStem][0];
          return {
            matched: true,
            inputWord: norm,
            query: norm,
            matchedWord: entry.word,
            targetWord: entry.word,
            vocabEntry: entry,
            item: entry,
            matchType: 'family',
            distance: 0,
            confidence: 0.75
          };
        }
      }
    }

    // 5. Fuzzy match (Levenshtein distance <= 2, similarity >= 0.70)
    if (opts.fuzzy !== false && norm.length >= 4) {
      let bestMatch = null;
      let highestSim = 0;
      let lowestDist = Infinity;

      for (let k = 0; k < index.entries.length; k++) {
        const candidate = index.entries[k];
        const dist = levenshtein(norm, candidate.normWord || candidate.word);
        if (dist <= 2) {
          const sim = similarity(norm, candidate.normWord || candidate.word);
          if (sim >= 0.70 && sim > highestSim) {
            highestSim = sim;
            lowestDist = dist;
            bestMatch = candidate;
          }
        }
      }

      if (bestMatch) {
        return {
          matched: true,
          inputWord: norm,
          query: norm,
          matchedWord: bestMatch.word,
          targetWord: bestMatch.word,
          vocabEntry: bestMatch,
          item: bestMatch,
          matchType: 'fuzzy',
          distance: lowestDist,
          confidence: Math.round(highestSim * 100) / 100
        };
      }
    }

    return {
      matched: false,
      inputWord: norm,
      query: norm,
      matchedWord: null,
      targetWord: null,
      vocabEntry: null,
      item: null,
      matchType: 'none',
      distance: -1,
      confidence: 0
    };
  }

  /**
   * Bridges a list of questions to academic vocabulary.
   * Pure, deterministic, non-mutating.
   * @param {Array} questions - questions pool (e.g. from content_v2.json)
   * @param {Array} vocabList - academic vocabulary (e.g. 300 words)
   * @param {Object} [options]
   * @returns {Object}
   */
  function bridgeQuestionsToVocab(questions, vocabList, options) {
    if (!Array.isArray(questions)) {
      return {
        total: 0,
        totalQuestions: 0,
        matchedCount: 0,
        unmatchedCount: 0,
        coverageRate: 0,
        matchRate: 0,
        byMatchType: { exact: 0, stem: 0, affix: 0, root: 0, family: 0, fuzzy: 0 },
        matches: [],
        bridgedQuestions: [],
        unmatched: []
      };
    }

    const index = (vocabSourceIsIndex(vocabList)) ? vocabList : buildLexicalIndex(vocabList);
    const bridged = [];
    const unmatched = [];
    const countsByType = { exact: 0, stem: 0, affix: 0, root: 0, family: 0, fuzzy: 0 };

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!isObj(q)) continue;

      const qWord = isString(q.word) ? q.word : (isString(q.word_id) ? q.word_id : (isString(q.answer) ? q.answer : ''));
      const matchResult = matchWord(qWord, index, options);

      const bridgedQuestion = Object.freeze(Object.assign({}, q, {
        questionId: q.id,
        originalWord: qWord,
        bridgedVocab: matchResult.vocabEntry,
        item: matchResult.item,
        matchedWord: matchResult.matchedWord,
        targetWord: matchResult.targetWord,
        matchType: matchResult.matchType,
        matchConfidence: matchResult.confidence,
        confidence: matchResult.confidence,
        level: matchResult.vocabEntry ? matchResult.vocabEntry.level : null,
        part_of_speech: matchResult.vocabEntry ? matchResult.vocabEntry.part_of_speech : null,
        hebrew_translation: matchResult.vocabEntry ? matchResult.vocabEntry.hebrew_translation : '',
        academicLevel: matchResult.vocabEntry ? matchResult.vocabEntry.level : null,
        academicPartOfSpeech: matchResult.vocabEntry ? (matchResult.vocabEntry.part_of_speech || matchResult.vocabEntry.pos) : null
      }));

      if (matchResult.matched) {
        countsByType[matchResult.matchType] = (countsByType[matchResult.matchType] || 0) + 1;
        bridged.push(bridgedQuestion);
      } else {
        unmatched.push(bridgedQuestion);
      }
    }

    const total = bridged.length + unmatched.length;
    const coverageRate = total > 0 ? Math.round((bridged.length / total) * 1000) / 1000 : 0;
    const matchRate = total > 0 ? Math.round((bridged.length / total) * 100) / 100 : 0;

    return {
      total,
      totalQuestions: total,
      matchedCount: bridged.length,
      unmatchedCount: unmatched.length,
      coverageRate,
      matchRate,
      byMatchType: countsByType,
      bridgedQuestions: Object.freeze(bridged),
      matches: Object.freeze(bridged),
      unmatched: Object.freeze(unmatched)
    };
  }

  function vocabSourceIsIndex(s) {
    return !!s && typeof s === 'object' && Array.isArray(s.entries) && !!s.exactMap;
  }

  // Bridge an array of songs to vocabulary items
  function bridgeSongs(songs, vocabSource) {
    const sList = Array.isArray(songs) ? songs : [];
    const index = vocabSourceIsIndex(vocabSource) ? vocabSource : buildLexicalIndex(vocabSource);
    const songReports = [];
    let totalHighlightWords = 0;
    let totalMatched = 0;

    for (let i = 0; i < sList.length; i++) {
      const s = sList[i];
      if (!isObj(s)) continue;

      const hw = Array.isArray(s.highlight_words) ? s.highlight_words : [];
      const matchedInSong = [];

      for (let j = 0; j < hw.length; j++) {
        const entry = hw[j];
        const w = typeof entry === 'object' ? (entry.word || '') : String(entry || '');
        const res = matchWord(w, index);
        totalHighlightWords++;
        if (res.matched) {
          totalMatched++;
          matchedInSong.push({
            originalWord: w,
            targetWord: res.targetWord,
            level: res.item ? res.item.level : null,
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
      totalHighlightWords,
      totalMatched,
      overallCoverageRate: totalHighlightWords ? Math.round((totalMatched / totalHighlightWords) * 100) / 100 : 0,
      songReports
    };
  }

  // Enrich single attempt or question metadata
  function resolveWordEnrichment(input, vocabSource) {
    if (!input || !vocabSource) return null;
    let word = '';
    if (typeof input === 'string') {
      word = input;
    } else if (isObj(input)) {
      word = input.word || input.answer || input.userAnswer || '';
    }

    const index = vocabSourceIsIndex(vocabSource) ? vocabSource : buildLexicalIndex(vocabSource);
    const res = matchWord(word, index);
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
    normalize,
    stem,
    getStemCandidates,
    levenshtein,
    similarity,
    buildLexicalIndex,
    buildVocabIndex: buildLexicalIndex,
    matchWord,
    bridgeQuestionsToVocab,
    bridgeQuestions: bridgeQuestionsToVocab,
    bridgeSongs,
    resolveWordEnrichment,
  });
}));
