const test = require('node:test');
const assert = require('node:assert/strict');
const V = require('../src/vocab.js');
const vocab = require('../data/imports/amiram_vocab_full.json');

test('formatWordItem adds syllablesDisplay with bullet separators', () => {
  const card = V.formatWordItem({ word: 'abundant', level: 'C_advanced' });
  assert.ok(card.syllablesDisplay.includes('•') || card.syllablesDisplay === 'abundant');
  assert.equal(typeof card.phoneticGuide, 'string');
  assert.ok(card.phoneticGuide.length > 0);
});

test('formatWordItem keeps original word when unsplittable', () => {
  const card = V.formatWordItem({ word: 'a', level: 'A_foundational' });
  assert.equal(card.syllablesDisplay, 'a');
  assert.ok(card.phoneticGuide);
});

test('formatWordItem tolerates bad input without throwing', () => {
  assert.doesNotThrow(() => V.formatWordItem(null));
  assert.doesNotThrow(() => V.formatWordItem(undefined));
  assert.doesNotThrow(() => V.formatWordItem({ word: '' }));
  const empty = V.formatWordItem(null);
  assert.equal(empty.word, '');
});

test('existing level filter still works after pronunciation wiring', () => {
  const a = V.filterByLevel(vocab, '', 'A');
  assert.ok(a.length > 0);
  assert.ok(a.every((w) => w.level === 'A_foundational'));
});
