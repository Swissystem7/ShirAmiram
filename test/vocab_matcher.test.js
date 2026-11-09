const test = require('node:test');
const assert = require('node:assert/strict');
const Matcher = require('../src/vocab_matcher.js');

const SAMPLE_VOCAB = Object.freeze([
  { id: 1, word: 'achieve', part_of_speech: 'verb', level: 'A_foundational', hebrew_translation: 'להשיג', hebrew_definition: 'פועל: להגיע לתוצאה' },
  { id: 2, word: 'theory', part_of_speech: 'noun', level: 'B_intermediate', hebrew_translation: 'תאוריה', hebrew_definition: 'שם עצם: מערכת רעיונות' },
  { id: 3, word: 'rapid', part_of_speech: 'adjective', level: 'A_foundational', hebrew_translation: 'מהיר', hebrew_definition: 'שם תואר: מתרחש במהירות' },
  { id: 4, word: 'debate', part_of_speech: 'noun', level: 'B_intermediate', hebrew_translation: 'עימות', hebrew_definition: 'שם עצם: דיון פומבי' },
  { id: 5, word: 'crucial', part_of_speech: 'adjective', level: 'C_advanced', hebrew_translation: 'מכריע', hebrew_definition: 'שם תואר: בעל חשיבות עליונה' },
  { id: 6, word: 'consequent', part_of_speech: 'adjective', level: 'C_advanced', hebrew_translation: 'תוצאתי', hebrew_definition: 'שם תואר: נובע מ-' },
  { id: 7, word: 'hypothesis', part_of_speech: 'noun', level: 'C_advanced', hebrew_translation: 'השערה', hebrew_definition: 'שם עצם: הנחה מדעית' }
]);

test('1. stem and getStemCandidates extract standard English inflections', () => {
  assert.equal(Matcher.stem('walked'), 'walk');
  assert.equal(Matcher.stem('theories'), 'theory');
  assert.equal(Matcher.stem('rapidly'), 'rapid');
  assert.ok(Matcher.getStemCandidates('achieving').includes('achieve'));
  assert.ok(Matcher.getStemCandidates('achieving').includes('achiev'));
  assert.ok(Matcher.getStemCandidates('theories').includes('theory'));
  assert.ok(Matcher.getStemCandidates('walked').includes('walk'));
  assert.ok(Matcher.getStemCandidates('rapidly').includes('rapid'));

  const cands = Matcher.getStemCandidates('consequently');
  assert.ok(cands.includes('consequent'));
  assert.ok(cands.includes('consequently'));

  // Edge cases: null, short strings
  assert.deepEqual(Matcher.getStemCandidates(null), []);
  assert.deepEqual(Matcher.getStemCandidates(''), []);
  assert.deepEqual(Matcher.getStemCandidates('a'), ['a']);
});

test('2. levenshtein computes edit distances accurately and handles edge cases', () => {
  assert.equal(Matcher.levenshtein('kitten', 'sitting'), 3);
  assert.equal(Matcher.levenshtein('achieve', 'achieve'), 0);
  assert.equal(Matcher.levenshtein('achive', 'achieve'), 1);
  assert.equal(Matcher.levenshtein('', 'word'), 4);
  assert.equal(Matcher.levenshtein('word', ''), 4);
  assert.equal(Matcher.levenshtein('', ''), 0);
});

test('3. buildVocabIndex indexes vocabulary with immutability and prototype safety', () => {
  const index = Matcher.buildVocabIndex(SAMPLE_VOCAB);
  assert.equal(index.size, 7);
  assert.ok(index.exactMap.achieve);
  assert.equal(index.exactMap.achieve.word, 'achieve');
  assert.equal(index.exactMap.achieve.level, 'A_foundational');

  // Verify prototype safety
  assert.equal(index.exactMap['__proto__'], undefined);
  assert.equal(index.exactMap['constructor'], undefined);

  // Handle empty or invalid inputs
  const emptyIndex = Matcher.buildVocabIndex(null);
  assert.equal(emptyIndex.size, 0);
  assert.deepEqual(emptyIndex.allItems, []);
});

test('4. matchWord performs exact matching with 1.0 confidence', () => {
  const index = Matcher.buildVocabIndex(SAMPLE_VOCAB);
  const res = Matcher.matchWord('crucial', index);
  assert.equal(res.matched, true);
  assert.equal(res.targetWord, 'crucial');
  assert.equal(res.matchType, 'exact');
  assert.equal(res.distance, 0);
  assert.equal(res.confidence, 1.0);
  assert.equal(res.item.level, 'C_advanced');
});

test('5. matchWord handles stemmed plural, tense and gerund variants', () => {
  const index = Matcher.buildVocabIndex(SAMPLE_VOCAB);

  // Plural -ies -> -y
  const resPlural = Matcher.matchWord('theories', index);
  assert.equal(resPlural.matched, true);
  assert.equal(resPlural.targetWord, 'theory');
  assert.equal(resPlural.matchType, 'stem');
  assert.equal(resPlural.confidence, 0.95);

  // Gerund -ing -> -e
  const resGerund = Matcher.matchWord('achieving', index);
  assert.equal(resGerund.matched, true);
  assert.equal(resGerund.targetWord, 'achieve');
  assert.equal(resGerund.matchType, 'stem');

  // Adverb -ly -> base
  const resAdv = Matcher.matchWord('rapidly', index);
  assert.equal(resAdv.matched, true);
  assert.equal(resAdv.targetWord, 'rapid');
});

test('6. matchWord handles affix, prefix and compound variations', () => {
  const index = Matcher.buildVocabIndex(SAMPLE_VOCAB);

  const res = Matcher.matchWord('consequently', index);
  assert.equal(res.matched, true);
  assert.equal(res.targetWord, 'consequent');
  assert.ok(res.confidence >= 0.85);
});

test('7. matchWord handles fuzzy matching within distance tolerance', () => {
  const index = Matcher.buildVocabIndex(SAMPLE_VOCAB);

  // Typo: 'hipothesis' instead of 'hypothesis'
  const res = Matcher.matchWord('hipothesis', index);
  assert.equal(res.matched, true);
  assert.equal(res.targetWord, 'hypothesis');
  assert.equal(res.matchType, 'fuzzy');
  assert.equal(res.distance, 1);
  assert.ok(res.confidence >= 0.85);

  // Complete miss
  const resMiss = Matcher.matchWord('xylophone', index);
  assert.equal(resMiss.matched, false);
  assert.equal(resMiss.targetWord, null);
  assert.equal(resMiss.confidence, 0);
});

test('8. bridgeQuestions maps question pools to vocabulary items', () => {
  const index = Matcher.buildVocabIndex(SAMPLE_VOCAB);
  const questions = [
    { id: 101, word: 'achieve', answer: 'achieve' },
    { id: 102, word: 'theories', answer: 'theories' },
    { id: 103, word: 'unknownword', answer: 'unknownword' }
  ];

  const report = Matcher.bridgeQuestions(questions, index);
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

test('9. bridgeSongs analyzes song highlight words and computes coverage', () => {
  const index = Matcher.buildVocabIndex(SAMPLE_VOCAB);
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

  const report = Matcher.bridgeSongs(songs, index);
  assert.equal(report.totalSongs, 1);
  assert.equal(report.totalHighlightWords, 3);
  assert.equal(report.totalMatched, 2);
  assert.equal(report.overallCoverageRate, 0.67);
  assert.equal(report.songReports[0].matchedCount, 2);
});

test('10. resolveWordEnrichment gracefully enriches attempts and handles malformed inputs', () => {
  const index = Matcher.buildVocabIndex(SAMPLE_VOCAB);

  // String input
  const enr1 = Matcher.resolveWordEnrichment('achieving', index);
  assert.equal(enr1.word, 'achieve');
  assert.equal(enr1.level, 'A_foundational');
  assert.equal(enr1.part_of_speech, 'verb');

  // Object attempt input
  const enr2 = Matcher.resolveWordEnrichment({ word: 'theories', userAnswer: 'theories' }, index);
  assert.equal(enr2.word, 'theory');
  assert.equal(enr2.level, 'B_intermediate');

  // Malformed inputs
  assert.equal(Matcher.resolveWordEnrichment(null, index), null);
  assert.equal(Matcher.resolveWordEnrichment('nonexistent', index), null);
  assert.equal(Matcher.resolveWordEnrichment({}, index), null);
});

test('11. deterministic behavior and zero mutation on frozen inputs', () => {
  const frozenVocab = Object.freeze([...SAMPLE_VOCAB]);
  const index = Matcher.buildVocabIndex(frozenVocab);

  const frozenQuestion = Object.freeze({ id: 999, word: 'debates', answer: 'debates' });
  const report1 = Matcher.bridgeQuestions([frozenQuestion], index);
  const report2 = Matcher.bridgeQuestions([frozenQuestion], index);

  assert.deepEqual(report1, report2);
  assert.equal(report1.matches[0].matchedWord, 'debate');
});
