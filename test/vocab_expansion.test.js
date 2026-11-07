// Test suite for Server Specification 2: Amiram Vocab Expansion
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const V = require('../src/vocab.js');
const root = path.join(__dirname, '..');
const jsonPath = path.join(root, 'data/imports/amiram_vocab_full.json');
const rawBytes = fs.readFileSync(jsonPath, 'utf8');
const vocab = JSON.parse(rawBytes);

test('amiram_vocab_full.json contains exactly 300 unique words with 0 null values', () => {
  assert.equal(vocab.length, 300, 'Expected exactly 300 words');
  const words = vocab.map(w => w.word.toLowerCase());
  const uniqueWords = new Set(words);
  assert.equal(uniqueWords.size, 300, 'Found duplicate words in amiram_vocab_full.json');

  vocab.forEach((item, index) => {
    assert.ok(item.id != null, `null id at index ${index}`);
    assert.ok(item.word != null && item.word.trim().length > 0, `null/empty word at index ${index}`);
    assert.ok(item.part_of_speech != null, `null part_of_speech at index ${index}`);
    assert.ok(item.level != null, `null level at index ${index}`);
    assert.ok(item.hebrew_translation != null, `null hebrew_translation at index ${index}`);
    assert.ok(item.hebrew_definition != null, `null hebrew_definition at index ${index}`);
    assert.ok(item.sample_sentence != null, `null sample_sentence at index ${index}`);
  });
});

test('every word is classified into A_foundational, B_intermediate, or C_advanced', () => {
  const levels = new Set(vocab.map(w => w.level));
  assert.deepEqual(
    Array.from(levels).sort(),
    ['A_foundational', 'B_intermediate', 'C_advanced'].sort()
  );

  const countA = vocab.filter(w => w.level === 'A_foundational').length;
  const countB = vocab.filter(w => w.level === 'B_intermediate').length;
  const countC = vocab.filter(w => w.level === 'C_advanced').length;

  assert.equal(countA, 100);
  assert.equal(countB, 100);
  assert.equal(countC, 100);
});

test('300/300 definitions contain Hebrew and follow "חלק דיבר: פירוש" format', () => {
  const hebrewRegex = /[\u0590-\u05FF]/;
  vocab.forEach(item => {
    assert.ok(hebrewRegex.test(item.hebrew_translation), `${item.word} translation must be Hebrew`);
    assert.ok(hebrewRegex.test(item.hebrew_definition), `${item.word} definition must be Hebrew`);
    assert.ok(item.hebrew_definition.includes(':'), `${item.word} definition must contain colon`);
  });
});

test('src/vocab.js validates dataset and filters deterministically by level', () => {
  const validation = V.validateVocabDataset(vocab);
  assert.equal(validation.ok, true);
  assert.equal(validation.count, 300);
  assert.deepEqual(validation.errors, []);

  // Filter tests
  const allFiltered = V.filterByLevel(vocab, '', 'all');
  assert.equal(allFiltered.length, 300);

  const levelA = V.filterByLevel(vocab, '', 'A');
  assert.equal(levelA.length, 100);
  levelA.forEach(item => assert.equal(item.level, 'A_foundational'));

  const levelB = V.filterByLevel(vocab, '', 'B_intermediate');
  assert.equal(levelB.length, 100);

  const levelC = V.filterByLevel(vocab, '', 'C');
  assert.equal(levelC.length, 100);

  // Search within level
  const searchA = V.filterByLevel(vocab, 'achieve', 'A');
  assert.equal(searchA.length, 1);
  assert.equal(searchA[0].word, 'achieve');

  // Search Hebrew translation
  const searchHebrew = V.filterByLevel(vocab, 'להשיג', 'all');
  assert.ok(searchHebrew.length >= 1);
});
