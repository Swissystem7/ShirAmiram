// ShirAmiram — Unified Unit Tests for Lexical Matcher & Stemming Engine
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const matcher = require('../src/vocab_matcher.js');

const root = path.join(__dirname, '..');
const rawContentBytes = fs.readFileSync(path.join(root, 'data/imports/content_v2.json'));
const content = JSON.parse(rawContentBytes);
const rawVocabBytes = fs.readFileSync(path.join(root, 'data/imports/amiram_vocab_full.json'));
const vocab300 = JSON.parse(rawVocabBytes);

const SAMPLE_VOCAB = Object.freeze([
  { id: 1, word: 'achieve', part_of_speech: 'verb', level: 'A_foundational', hebrew_translation: 'להשיג', hebrew_definition: 'פועל: להגיע לתוצאה' },
  { id: 2, word: 'theory', part_of_speech: 'noun', level: 'B_intermediate', hebrew_translation: 'תאוריה', hebrew_definition: 'שם עצם: מערכת רעיונות' },
  { id: 3, word: 'rapid', part_of_speech: 'adjective', level: 'A_foundational', hebrew_translation: 'מהיר', hebrew_definition: 'שם תואר: מתרחש במהירות' },
  { id: 4, word: 'debate', part_of_speech: 'noun', level: 'B_intermediate', hebrew_translation: 'עימות', hebrew_definition: 'שם עצם: דיון פומבי' },
  { id: 5, word: 'crucial', part_of_speech: 'adjective', level: 'C_advanced', hebrew_translation: 'מכריע', hebrew_definition: 'שם תואר: בעל חשיבות עליונה' },
  { id: 6, word: 'consequent', part_of_speech: 'adjective', level: 'C_advanced', hebrew_translation: 'תוצאתי', hebrew_definition: 'שם תואר: נובע מ-' },
  { id: 7, word: 'hypothesis', part_of_speech: 'noun', level: 'C_advanced', hebrew_translation: 'השערה', hebrew_definition: 'שם עצם: הנחה מדעית' }
]);

// --- Core Morphological & Lexical Tests ---

test('1. stem handles plurals, inflections, gerunds and preserves short words', () => {
  assert.equal(matcher.stem('sky'), 'sky');
  assert.equal(matcher.stem('joy'), 'joy');
  assert.equal(matcher.stem('run'), 'run');

  assert.equal(matcher.stem('birds'), 'bird');
  assert.equal(matcher.stem('memories'), 'memory');
  assert.equal(matcher.stem('possibilities'), 'possibility');
  assert.equal(matcher.stem('watches'), 'watch');

  assert.equal(matcher.stem('learning'), 'learn');
  assert.equal(matcher.stem('reflecting'), 'reflect');
  assert.equal(matcher.stem('changing'), 'change');
  assert.equal(matcher.stem('worried'), 'worry');
  assert.equal(matcher.stem('reached'), 'reach');

  assert.equal(matcher.stem('reflection'), 'reflect');
  assert.equal(matcher.stem('acceptance'), 'accept');
});

test('2. stem and getStemCandidates extract standard English inflections', () => {
  assert.equal(matcher.stem('walked'), 'walk');
  assert.equal(matcher.stem('theories'), 'theory');
  assert.equal(matcher.stem('rapidly'), 'rapid');
  assert.ok(matcher.getStemCandidates('achieving').includes('achieve'));
  assert.ok(matcher.getStemCandidates('achieving').includes('achiev'));
  assert.ok(matcher.getStemCandidates('theories').includes('theory'));
  assert.ok(matcher.getStemCandidates('walked').includes('walk'));
  assert.ok(matcher.getStemCandidates('rapidly').includes('rapid'));

  const cands = matcher.getStemCandidates('consequently');
  assert.ok(cands.includes('consequent'));
  assert.ok(cands.includes('consequently'));

  assert.deepEqual(matcher.getStemCandidates(null), []);
  assert.deepEqual(matcher.getStemCandidates(''), []);
  assert.deepEqual(matcher.getStemCandidates('a'), ['a']);
});

test('3. normalize strips edge punctuation, whitespace, and case', () => {
  assert.equal(matcher.normalize('  "Peace!" '), 'peace');
  assert.equal(matcher.normalize('...Comfort...'), 'comfort');
  assert.equal(matcher.normalize('CHANGE?'), 'change');
  assert.equal(matcher.normalize(''), '');
  assert.equal(matcher.normalize(null), '');
  assert.equal(matcher.normalize(123), '');
});

test('4. levenshtein and similarity compute distances and metrics accurately', () => {
  assert.equal(matcher.levenshtein('kitten', 'sitting'), 3);
  assert.equal(matcher.levenshtein('achieve', 'achieve'), 0);
  assert.equal(matcher.levenshtein('achive', 'achieve'), 1);
  assert.equal(matcher.levenshtein('', 'word'), 4);
  assert.equal(matcher.levenshtein('word', ''), 4);
  assert.equal(matcher.levenshtein('', ''), 0);

  assert.equal(matcher.similarity('achieve', 'achieve'), 1.0);
  assert.equal(matcher.similarity('cat', 'dog') < 0.5, true);
  const sim = matcher.similarity('concept', 'concepts');
  assert.ok(sim >= 0.85);
});

// --- Indexing & Lookup Tests ---

test('5. buildVocabIndex / buildLexicalIndex indexes vocabulary safely and immutably', () => {
  const index = matcher.buildVocabIndex(SAMPLE_VOCAB);
  assert.equal(index.size, 7);
  assert.ok(index.exactMap.achieve);
  assert.equal(index.exactMap.achieve.word, 'achieve');
  assert.equal(index.exactMap.achieve.level, 'A_foundational');

  assert.equal(index.exactMap['__proto__'], undefined);
  assert.equal(index.exactMap['constructor'], undefined);

  const emptyIndex = matcher.buildVocabIndex(null);
  assert.equal(emptyIndex.size, 0);
  assert.deepEqual(emptyIndex.allItems, []);
});

test('6. matchWord performs exact matching with 1.0 confidence against vocabulary entries', () => {
  const index = matcher.buildLexicalIndex(vocab300);
  const res = matcher.matchWord('achieve', index);
  assert.equal(res.matched, true);
  assert.equal(res.matchType, 'exact');
  assert.equal(res.matchedWord, 'achieve');
  assert.equal(res.targetWord, 'achieve');
  assert.equal(res.confidence, 1.0);
  assert.ok(res.vocabEntry != null);
  assert.equal(res.vocabEntry.word, 'achieve');

  const sampleIndex = matcher.buildVocabIndex(SAMPLE_VOCAB);
  const resCrucial = matcher.matchWord('crucial', sampleIndex);
  assert.equal(resCrucial.matched, true);
  assert.equal(resCrucial.targetWord, 'crucial');
  assert.equal(resCrucial.distance, 0);
  assert.equal(resCrucial.item.level, 'C_advanced');
});

test('7. matchWord handles stemmed plural, tense, gerund and root variants', () => {
  const index = matcher.buildLexicalIndex(vocab300);

  // 'challenges' in plural stems to 'challenge'
  const resPlural = matcher.matchWord('challenges', index);
  assert.equal(resPlural.matched, true);
  assert.ok(['exact', 'stem', 'root'].includes(resPlural.matchType));
  assert.equal(resPlural.matchedWord, 'challenge');

  // 'adapting' stems to 'adapt'
  const resGerund = matcher.matchWord('adapting', index);
  assert.equal(resGerund.matched, true);
  assert.equal(resGerund.matchedWord, 'adapt');

  // 'communicating' should match 'communicate'
  const resComm = matcher.matchWord('communicating', index);
  assert.equal(resComm.matched, true);
  assert.equal(resComm.matchedWord, 'communicate');

  // With SAMPLE_VOCAB
  const sampleIndex = matcher.buildVocabIndex(SAMPLE_VOCAB);
  const resTheo = matcher.matchWord('theories', sampleIndex);
  assert.equal(resTheo.matched, true);
  assert.equal(resTheo.targetWord, 'theory');
  assert.equal(resTheo.matchType, 'stem');

  const resAch = matcher.matchWord('achieving', sampleIndex);
  assert.equal(resAch.matched, true);
  assert.equal(resAch.targetWord, 'achieve');

  const resAdv = matcher.matchWord('rapidly', sampleIndex);
  assert.equal(resAdv.matched, true);
  assert.equal(resAdv.targetWord, 'rapid');
});

test('8. matchWord handles affix, prefix and compound variations', () => {
  const index = matcher.buildVocabIndex(SAMPLE_VOCAB);
  const res = matcher.matchWord('consequently', index);
  assert.equal(res.matched, true);
  assert.equal(res.targetWord, 'consequent');
  assert.ok(res.confidence >= 0.85);
});

test('9. matchWord handles fuzzy matching within distance tolerance', () => {
  const index = matcher.buildVocabIndex(SAMPLE_VOCAB);
  const res = matcher.matchWord('hipothesis', index);
  assert.equal(res.matched, true);
  assert.equal(res.targetWord, 'hypothesis');
  assert.equal(res.matchType, 'fuzzy');
  assert.equal(res.distance, 1);
  assert.ok(res.confidence >= 0.85);

  const resMiss = matcher.matchWord('xylophone', index);
  assert.equal(resMiss.matched, false);
  assert.equal(resMiss.targetWord, null);
  assert.equal(resMiss.confidence, 0);
});

test('10. matchWord bridges lyrical words via semantic families to academic targets', () => {
  const index = matcher.buildLexicalIndex(vocab300);

  // 'peace' -> 'consent' / 'community' / 'consistent'
  const resPeace = matcher.matchWord('peace', index);
  assert.equal(resPeace.matched, true);
  assert.ok(resPeace.matchedWord != null);
  assert.ok(resPeace.vocabEntry != null);
  assert.ok(['family', 'root', 'stem', 'fuzzy'].includes(resPeace.matchType));

  // 'journey' -> 'process' / 'approach' / 'conduct'
  const resJourney = matcher.matchWord('journey', index);
  assert.equal(resJourney.matched, true);
  assert.ok(['approach', 'conduct', 'process', 'passage'].some(w => resJourney.matchedWord.includes(w) || resJourney.vocabEntry.word === w));
});

// --- Question & Song Bridging Tests ---

test('11. bridgeQuestions maps question pools to vocabulary items', () => {
  const index = matcher.buildVocabIndex(SAMPLE_VOCAB);
  const questions = [
    { id: 101, word: 'achieve', answer: 'achieve' },
    { id: 102, word: 'theories', answer: 'theories' },
    { id: 103, word: 'unknownword', answer: 'unknownword' }
  ];

  const report = matcher.bridgeQuestions(questions, index);
  assert.equal(report.totalQuestions, 3);
  assert.equal(report.matchedCount, 2);
  assert.equal(report.unmatchedCount, 1);
  assert.equal(report.matchRate, 0.67);
  assert.equal(report.byMatchType.exact, 1);
  assert.equal(report.byMatchType.stem, 1);
  assert.equal(report.matches[0].matchedWord, 'achieve');
  assert.equal(report.matches[1].matchedWord, 'theory');
  assert.equal(report.unmatched[0].questionId, 103);
});

test('12. bridgeQuestionsToVocab bridges all 50 questions from content_v2 to academic vocabulary', () => {
  const questions = content.questions;
  assert.equal(questions.length, 50);

  const bridgeResult = matcher.bridgeQuestionsToVocab(questions, vocab300);

  // Check metrics: full resolution of the 0/50 lexical gap
  assert.equal(bridgeResult.total, 50);
  assert.ok(bridgeResult.matchedCount >= 45, `Expected >= 45 matched, got ${bridgeResult.matchedCount}`);
  assert.ok(bridgeResult.coverageRate >= 0.90, `Expected >= 90% coverage rate, got ${bridgeResult.coverageRate}`);

  // Inspect bridged question structure
  const first = bridgeResult.bridgedQuestions[0];
  assert.ok(first.matchedWord != null);
  assert.ok(first.bridgedVocab != null);
  assert.ok(first.academicLevel != null);
});

test('13. bridgeSongs analyzes song highlight words and computes coverage', () => {
  const index = matcher.buildVocabIndex(SAMPLE_VOCAB);
  const songs = [
    {
      id: 1,
      title: 'Song of Knowledge',
      highlight_words: [
        { word: 'achieving' },
        { word: 'crucial' },
        { word: 'unrelated' }
      ]
    }
  ];

  const report = matcher.bridgeSongs(songs, index);
  assert.equal(report.totalSongs, 1);
  assert.equal(report.totalHighlightWords, 3);
  assert.equal(report.totalMatched, 2);
  assert.equal(report.overallCoverageRate, 0.67);
  assert.equal(report.songReports[0].matchedCount, 2);
});

test('14. resolveWordEnrichment gracefully enriches attempts and handles malformed inputs', () => {
  const index = matcher.buildVocabIndex(SAMPLE_VOCAB);

  // String input
  const enr1 = matcher.resolveWordEnrichment('achieving', index);
  assert.equal(enr1.word, 'achieve');
  assert.equal(enr1.level, 'A_foundational');
  assert.equal(enr1.part_of_speech, 'verb');

  // Object attempt input
  const enr2 = matcher.resolveWordEnrichment({ word: 'theories', userAnswer: 'theories' }, index);
  assert.equal(enr2.word, 'theory');
  assert.equal(enr2.level, 'B_intermediate');

  // Malformed inputs
  assert.equal(matcher.resolveWordEnrichment(null, index), null);
  assert.equal(matcher.resolveWordEnrichment('nonexistent', index), null);
  assert.equal(matcher.resolveWordEnrichment({}, index), null);
});

test('15. non-mutating execution on frozen inputs and raw files', () => {
  const frozenVocab = Object.freeze([...SAMPLE_VOCAB]);
  const index = matcher.buildVocabIndex(frozenVocab);

  const frozenQuestion = Object.freeze({ id: 999, word: 'debates', answer: 'debates' });
  const report1 = matcher.bridgeQuestions([frozenQuestion], index);
  const report2 = matcher.bridgeQuestions([frozenQuestion], index);

  assert.deepEqual(report1, report2);
  assert.equal(report1.matches[0].matchedWord, 'debate');

  const frozenArr = Object.freeze([
    Object.freeze({ id: 999, word: 'freedom', question: 'Test?', options: ['a', 'b'], answer: 'freedom' })
  ]);
  const res = matcher.bridgeQuestionsToVocab(frozenArr, vocab300);
  assert.equal(res.total, 1);
  assert.equal(res.matchedCount, 1);

  assert.deepEqual(matcher.bridgeQuestionsToVocab(null, vocab300), {
    total: 0,
    totalQuestions: 0,
    matchedCount: 0,
    unmatchedCount: 0,
    coverageRate: 0,
    matchRate: 0,
    byMatchType: { exact: 0, stem: 0, affix: 0, root: 0, family: 0, fuzzy: 0 },
    bridgedQuestions: [],
    matches: [],
    unmatched: []
  });
});
