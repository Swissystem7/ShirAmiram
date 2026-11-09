// ShirAmiram — Unit Tests for Lexical Matcher & Stemming Engine (Task: Vocab Matcher)
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

test('1. stem handles plurals, inflections, gerunds and preserves short words', () => {
  // Short words preserved
  assert.equal(matcher.stem('sky'), 'sky');
  assert.equal(matcher.stem('joy'), 'joy');
  assert.equal(matcher.stem('run'), 'run');

  // Plurals
  assert.equal(matcher.stem('birds'), 'bird');
  assert.equal(matcher.stem('memories'), 'memory');
  assert.equal(matcher.stem('possibilities'), 'possibility');
  assert.equal(matcher.stem('watches'), 'watch');

  // Gerunds and past tense
  assert.equal(matcher.stem('learning'), 'learn');
  assert.equal(matcher.stem('reflecting'), 'reflect');
  assert.equal(matcher.stem('changing'), 'change');
  assert.equal(matcher.stem('worried'), 'worry');
  assert.equal(matcher.stem('reached'), 'reach');

  // Nominalizations
  assert.equal(matcher.stem('reflection'), 'reflect');
  assert.equal(matcher.stem('acceptance'), 'accept');
});

test('2. normalize strips edge punctuation, whitespace, and case', () => {
  assert.equal(matcher.normalize('  "Peace!" '), 'peace');
  assert.equal(matcher.normalize('...Comfort...'), 'comfort');
  assert.equal(matcher.normalize('CHANGE?'), 'change');
  assert.equal(matcher.normalize(''), '');
  assert.equal(matcher.normalize(null), '');
  assert.equal(matcher.normalize(123), '');
});

test('3. similarity returns accurate normalized metrics', () => {
  assert.equal(matcher.similarity('achieve', 'achieve'), 1.0);
  assert.equal(matcher.similarity('cat', 'dog') < 0.5, true);
  const sim = matcher.similarity('concept', 'concepts');
  assert.ok(sim >= 0.85);
});

test('4. matchWord performs exact matching against vocabulary entries', () => {
  const index = matcher.buildLexicalIndex(vocab300);
  const res = matcher.matchWord('achieve', index);
  assert.equal(res.matched, true);
  assert.equal(res.matchType, 'exact');
  assert.equal(res.matchedWord, 'achieve');
  assert.equal(res.confidence, 1.0);
  assert.ok(res.vocabEntry != null);
  assert.equal(res.vocabEntry.word, 'achieve');
});

test('5. matchWord matches inflected stems to root vocabulary targets', () => {
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
});

test('6. matchWord resolves root and derivational forms', () => {
  const index = matcher.buildLexicalIndex(vocab300);
  // 'communicating' should match 'communicate'
  const res = matcher.matchWord('communicating', index);
  assert.equal(res.matched, true);
  assert.equal(res.matchedWord, 'communicate');
});

test('7. matchWord bridges lyrical words via semantic families to academic targets', () => {
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

test('8. bridgeQuestionsToVocab bridges all 50 questions from content_v2 to academic vocabulary', () => {
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

test('9. bridgeQuestionsToVocab guarantees non-mutating execution and handles malformed inputs', () => {
  // Frozen question fixture
  const frozen = Object.freeze([
    Object.freeze({ id: 999, word: 'freedom', question: 'Test?', options: ['a', 'b'], answer: 'freedom' })
  ]);

  const res = matcher.bridgeQuestionsToVocab(frozen, vocab300);
  assert.equal(res.total, 1);
  assert.equal(res.matchedCount, 1);

  // Handled without throwing
  assert.deepEqual(matcher.bridgeQuestionsToVocab(null, vocab300), {
    total: 0,
    matchedCount: 0,
    coverageRate: 0,
    bridgedQuestions: [],
    unmatched: []
  });
  assert.deepEqual(matcher.bridgeQuestionsToVocab([null, 'bad', 42], vocab300), {
    total: 0,
    matchedCount: 0,
    coverageRate: 0,
    bridgedQuestions: [],
    unmatched: []
  });
});
