const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const G = require('../src/alias_engine.js');
const VOCAB = require('../src/amiram_vocab_data.js');
const CLUES = require('../src/alias_clues_data.js');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('explain scoring: 10 easy, 6 with effort, 0 skip; a taboo word is -1 only in group play', () => {
  assert.deepEqual(['easy', 'effort', 'skip', 'taboo'].map((o) => G.explainPoints(o, false)), [10, 6, 0, 0]);
  assert.deepEqual(['easy', 'effort', 'skip', 'taboo'].map((o) => G.explainPoints(o, true)), [10, 6, 0, -1]);
  assert.equal(G.explainPoints('nonsense', true), 0);
});

test('explain results feed the weak list: skip and taboo add, easy on two days removes', () => {
  assert.deepEqual(['easy', 'effort', 'skip', 'taboo'].map(G.explainQuality), [4, 3, 1, 2]);
  let s = G.emptyState();
  s = G.applyWeak(s, '8', G.explainQuality('skip'), '2026-11-14');
  assert.ok(s.weak['8']);
  s = G.applyWeak(s, '9', G.explainQuality('taboo'), '2026-11-14');
  assert.ok(s.weak['9']);
  s = G.applyWeak(s, '8', G.explainQuality('effort'), '2026-11-15');
  assert.ok(s.weak['8'], 'with effort is not a strong success');
  s = G.applyWeak(s, '8', G.explainQuality('easy'), '2026-11-15');
  s = G.applyWeak(s, '8', G.explainQuality('easy'), '2026-11-16');
  assert.equal(s.weak['8'], undefined);
});

test('English card: the English word, Hebrew translation forbidden, English taboo words', () => {
  const w = VOCAB.find((x) => x.word === 'achieve');
  const card = G.buildExplainCard(w, CLUES[String(w.id)], 'en');
  assert.equal(card.main, 'achieve');
  assert.equal(card.lang, 'en');
  assert.equal(card.translation, w.hebrew_translation);
  assert.deepEqual(card.taboo, CLUES[String(w.id)].taboo);
  assert.equal(card.tabooLang, 'en');
});

test('Hebrew card: the Hebrew meaning, English word forbidden, Hebrew taboo words', () => {
  const w = VOCAB.find((x) => x.word === 'achieve');
  const card = G.buildExplainCard(w, CLUES[String(w.id)], 'he');
  assert.equal(card.main, w.hebrew_translation);
  assert.equal(card.lang, 'he');
  assert.equal(card.translation, 'achieve');
  assert.equal(card.translationLang, 'en');
  assert.deepEqual(card.taboo, CLUES[String(w.id)].taboo_he);
  assert.equal(card.tabooLang, 'he');
  assert.deepEqual(G.buildExplainCard(w, null, 'he').taboo, [], 'missing data gives an empty list, not a crash');
});

test('every word has 3-4 Hebrew taboo words that do not repeat the card text', () => {
  for (const w of VOCAB) {
    const t = CLUES[String(w.id)].taboo_he;
    assert.ok(Array.isArray(t) && t.length >= 3 && t.length <= 4, w.word);
    const tokens = new Set(String(w.hebrew_translation).split(/[\s,/]+/));
    for (const x of t) {
      assert.match(x, /[֐-׿]/, `${w.word}: ${x}`);
      assert.ok(!tokens.has(x), `${w.word}: taboo "${x}" is on the card`);
    }
  }
});

test('the start screen offers both modes, both languages and group play', () => {
  assert.match(html, /data-alias-mode="guess"/);
  assert.match(html, /data-alias-mode="explain"/);
  assert.match(html, /data-alias-lang="en"/);
  assert.match(html, /data-alias-lang="he"/);
  assert.match(html, /<input id="alias-party" type="checkbox">/);
  for (const id of ['alias-explain', 'alias-x-word', 'alias-x-trans', 'alias-x-taboo', 'alias-x-easy', 'alias-x-effort', 'alias-x-skip', 'alias-x-taboo-btn', 'alias-x-timer-text']) {
    assert.ok(html.includes(`id="${id}"`), id);
  }
});
