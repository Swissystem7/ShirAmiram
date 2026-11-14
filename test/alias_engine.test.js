const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const G = require('../src/alias_engine.js');
const SRS = require('../src/srs_leitner.js');
const VOCAB = require('../src/amiram_vocab_data.js');
const CLUES = require('../src/alias_clues_data.js');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const NOW = new Date(2026, 10, 14, 12);

test('answers: exact, case and spaces ignored, one typo only for words of 5+ letters', () => {
  assert.deepEqual(G.checkAnswer('  Achieve ', 'achieve'), { correct: true, typo: false });
  assert.deepEqual(G.checkAnswer('achieev', 'achieve'), { correct: false, typo: false }, 'a swap is two edits');
  assert.deepEqual(G.checkAnswer('acieve', 'achieve'), { correct: true, typo: true });
  assert.deepEqual(G.checkAnswer('achievee', 'achieve'), { correct: true, typo: true });
  assert.deepEqual(G.checkAnswer('acxieve', 'achieve'), { correct: true, typo: true });
  assert.equal(G.checkAnswer('acxievx', 'achieve').correct, false);
  assert.equal(G.checkAnswer('aim', 'aid').correct, false, 'no typo allowance under 5 letters');
  assert.equal(G.checkAnswer('slove', 'solve').correct, false);
  assert.equal(G.checkAnswer('solv', 'solve').correct, true);
  assert.equal(G.checkAnswer('', 'solve').correct, false);
  assert.equal(G.levenshtein('kitten', 'sitting'), 3);
});

test('a Hebrew keyboard is detected', () => {
  assert.equal(G.hasHebrew('שלום'), true);
  assert.equal(G.hasHebrew('acר'), true);
  assert.equal(G.hasHebrew('achieve'), false);
});

test('points 10/7/4/2 by clue, 0 for a miss, +5 from the third correct answer in a row', () => {
  assert.deepEqual([0, 1, 2, 3].map(G.pointsFor), [10, 7, 4, 2]);
  assert.equal(G.pointsFor(null), 0);
  assert.deepEqual([1, 2, 3, 4].map(G.streakBonus), [0, 0, 5, 5]);
});

test('SRS quality 5/4/3/2 by clue and 1 for a miss, mapped onto the Leitner ratings', () => {
  assert.deepEqual([0, 1, 2, 3, null].map(G.qualityFor), [5, 4, 3, 2, 1]);
  assert.deepEqual([5, 4, 3, 2, 1].map(G.qualityToResult), ['easy', 'good', 'hard', 'hard', 'again']);
  const card = SRS.initProgress('1', NOW);
  assert.equal(SRS.calculateNextState(card, G.qualityToResult(1), NOW).box, 1, 'a miss is a lapse');
  assert.equal(SRS.calculateNextState({ ...card, box: 3 }, G.qualityToResult(1), NOW).box, 1);
  assert.equal(SRS.calculateNextState(card, G.qualityToResult(5), NOW).box, 3);
});

test('the clue ladder: synonym, English explanation, blanked sentence with audio, Hebrew last', () => {
  const word = VOCAB.find((w) => w.word === 'achieve');
  const clues = G.buildClues(word, CLUES[String(word.id)], null);
  assert.deepEqual(clues.map((c) => c.kind), ['synonym', 'definition', 'sentence', 'hebrew']);
  assert.equal(clues[3].text, word.hebrew_translation);
  assert.ok(!/achiev/i.test(clues[0].text + clues[1].text + clues[2].text), 'no clue gives the word away');
  assert.match(clues[2].text, /_____/);
  assert.equal(clues[2].audio, word.sample_sentence);
  for (const c of clues.slice(0, 3)) assert.equal(c.lang, 'en');
});

test('a word sung in the app song gets the song line as clue 3', () => {
  const word = VOCAB.find((w) => w.word === 'crucial');
  const song = { line: 'deliberate steps echo in the night, crucial hearts beat, we hold the light.', title: 'Hold the Light' };
  const clues = G.buildClues(word, CLUES[String(word.id)], song);
  assert.equal(clues[2].kind, 'song');
  assert.match(clues[2].text, /_____ hearts beat/);
  assert.equal(clues[2].audio, song.line);
  assert.match(clues[2].label, /Hold the Light/);
});

test('without synonyms the ladder falls back and never repeats a clue kind', () => {
  const word = { id: 999, word: 'zebra', part_of_speech: 'noun', hebrew_translation: 'זברה', sample_sentence: '' };
  const clues = G.buildClues(word, null, null);
  assert.equal(clues.length, 4);
  assert.equal(clues[0].kind, 'pattern');
  assert.match(clues[0].text, /^z _ _ _ _ \(5\)$/);
  assert.equal(clues[3].kind, 'hebrew');
  const kinds = clues.map((c) => c.kind);
  assert.equal(new Set(kinds).size, 4, kinds.join(','));
  const withDef = G.buildClues(word, { synonyms: [], en_def: 'a striped horse' }, null);
  assert.deepEqual(withDef.map((c) => c.kind).slice(0, 2), ['pattern', 'definition']);
});

test('every vocabulary word has clue data that never contains the word itself', () => {
  assert.equal(Object.keys(CLUES).length, VOCAB.length);
  for (const w of VOCAB) {
    const c = CLUES[String(w.id)];
    assert.ok(c, `missing clues for ${w.word}`);
    assert.equal(c.word, w.word);
    assert.ok(c.synonyms.length === 0 || (c.synonyms.length >= 3 && c.synonyms.length <= 4), w.word);
    assert.ok(c.taboo.length >= 3 && c.taboo.length <= 4, w.word);
    const stem = w.word.length > 4 ? w.word.replace(/[sey]$/, '') : w.word;
    for (const s of [...c.synonyms, ...c.taboo, c.en_def]) assert.ok(!s.toLowerCase().includes(stem.toLowerCase()), `${w.word}: ${s}`);
  }
});

function pool() {
  return VOCAB.slice(0, 120);
}
function cardsFor(ids, box, due) {
  const out = {};
  ids.forEach((id) => { out[String(id)] = { box, dueAt: due.toISOString() }; });
  return out;
}

test('smart mix: 4 weak, 3 due, 2 new, 1 mastered, 10 words, no repeats', () => {
  const past = new Date(2026, 10, 1);
  const future = new Date(2026, 11, 30);
  const cards = { ...cardsFor([11, 12, 13, 14, 15, 16], 2, past), ...cardsFor([21, 22, 23], 5, future), ...cardsFor([1, 2, 3, 4, 5, 6], 1, past) };
  const weak = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {}, 6: {} };
  const deck = G.buildDeck(pool(), { deck: 'mix', cards, weak, now: NOW, seed: 42 });
  assert.equal(deck.length, 10);
  const count = (slot) => deck.filter((d) => d.slot === slot).length;
  assert.deepEqual([count('weak'), count('due'), count('fresh'), count('mastered')], [4, 3, 2, 1]);
  assert.equal(new Set(deck.map((d) => d.item.id)).size, 10);
  const order = deck.map((d) => d.slot).join(',');
  assert.notEqual(order, 'weak,weak,weak,weak,due,due,due,fresh,fresh,mastered', 'shuffled');
});

test('new words are capped at 3 a day, counting earlier games', () => {
  const fresh = (d) => d.filter((x) => x.slot === 'fresh').length;
  assert.equal(fresh(G.buildDeck(pool(), { deck: 'mix', now: NOW, seed: 1 })), 3, 'a first game with no history fills with up to 3 new words');
  assert.equal(fresh(G.buildDeck(pool(), { deck: 'mix', now: NOW, seed: 1, newToday: 2 })), 1);
  assert.equal(fresh(G.buildDeck(pool(), { deck: 'mix', now: NOW, seed: 1, newToday: 3 })), 0);
  let s = G.emptyState();
  ['7', '8', '8'].forEach((k) => { s = G.markNew(s, k, '2026-11-14'); });
  assert.equal(G.newCountToday(s, '2026-11-14'), 2);
  assert.equal(G.newCountToday(s, '2026-11-15'), 0);
});

test('at most 3 words from the same song in one game', () => {
  const weak = {};
  pool().slice(0, 20).forEach((w) => { weak[String(w.id)] = {}; });
  const deck = G.buildDeck(pool(), { deck: 'weak', weak, now: NOW, seed: 3, songOf: (item) => (item.id % 2 === 0 ? 'song:1' : null) });
  assert.equal(deck.filter((d) => d.item.id % 2 === 0).length, 3);
  assert.equal(deck.length, 10);
});

test('extra decks: "today" holds weak and due words only, "weak" only weak words', () => {
  const past = new Date(2026, 10, 1);
  const cards = { ...cardsFor([11, 12], 2, past), ...cardsFor([21], 5, new Date(2026, 11, 30)) };
  const weak = { 1: {} };
  const today = G.buildDeck(pool(), { deck: 'today', cards, weak, now: NOW, seed: 5 });
  assert.deepEqual(today.map((d) => d.item.id).sort((a, b) => a - b), [1, 11, 12]);
  const onlyWeak = G.buildDeck(pool(), { deck: 'weak', cards, weak, now: NOW, seed: 5 });
  assert.deepEqual(onlyWeak.map((d) => d.item.id), [1]);
  assert.deepEqual(G.buildDeck(pool(), { deck: 'weak', now: NOW }), []);
});

test('weak list: quality 1-2 adds, two strong days on different dates remove', () => {
  let s = G.emptyState();
  s = G.applyWeak(s, '5', 2, '2026-11-14');
  assert.ok(s.weak['5']);
  s = G.applyWeak(s, '5', 5, '2026-11-14');
  s = G.applyWeak(s, '5', 4, '2026-11-14');
  assert.ok(s.weak['5'], 'two strong answers on the same day count once');
  s = G.applyWeak(s, '5', 3, '2026-11-15');
  assert.ok(s.weak['5'], 'quality 3 is not strong');
  s = G.applyWeak(s, '5', 4, '2026-11-16');
  assert.equal(s.weak['5'], undefined);
  s = G.applyWeak(s, '6', 1, '2026-11-14');
  s = G.applyWeak(s, '6', 5, '2026-11-15');
  s = G.applyWeak(s, '6', 1, '2026-11-16');
  assert.deepEqual(s.weak['6'].strongDays, [], 'a new miss restarts the count');
  assert.equal(G.applyWeak(G.emptyState(), '7', 5, '2026-11-14').weak['7'], undefined);
});

test('SRS is updated once per word per day, and only on the first attempt in a game', () => {
  let s = G.emptyState();
  assert.equal(G.canUpdateSrs(s, '9', '2026-11-14', false), true);
  assert.equal(G.canUpdateSrs(s, '9', '2026-11-14', true), false);
  s = G.markSrsDay(s, '9', '2026-11-14');
  assert.equal(G.canUpdateSrs(s, '9', '2026-11-14', false), false);
  assert.equal(G.canUpdateSrs(s, '9', '2026-11-15', false), true);
});

test('timer: deadline timestamp, paused time does not count', () => {
  let t = G.timerStart(1000, 30000);
  assert.equal(G.timerLeft(t, 11000), 20000);
  t = G.timerPause(t, 11000);
  assert.equal(G.timerLeft(t, 99999), 20000, 'frozen while hidden');
  t = G.timerResume(t, 50000);
  assert.equal(G.timerLeft(t, 55000), 15000);
  assert.equal(G.timerLeft(t, 90000), 0);
  assert.equal(G.timerPause(G.timerPause(G.timerStart(0, 30000), 1000), 5000).remainingMs, 29000, 'pausing twice is harmless');
});

test('stored state survives damage and blocked storage', () => {
  const map = new Map();
  const store = { getItem: (k) => map.get(k) || null, setItem: (k, v) => map.set(k, v) };
  const s = G.applyWeak(G.emptyState(), '3', 1, '2026-11-14');
  assert.equal(G.save(s, store), true);
  assert.deepEqual(G.load(store).weak['3'], { since: '2026-11-14', strongDays: [] });
  map.set(G.STORAGE_KEY, '{nope');
  assert.deepEqual(G.load(store), G.emptyState());
  const blocked = {};
  Object.defineProperty(blocked, 'getItem', { get() { throw new Error('SecurityError'); } });
  assert.deepEqual(G.load(blocked), G.emptyState());
  assert.equal(G.save(s, { setItem() { throw new Error('quota'); } }), false);
});

test('the page wires the game into flashcards, practice, analytics and the offline cache', () => {
  assert.match(html, /<section id="alias" class="tab-content hidden"/);
  assert.match(html, /data-tab="alias"/);
  assert.equal((html.match(/data-open-alias=/g) || []).length, 2, 'entry from the flashcards screen and the practice hub');
  const flash = html.indexOf('<section id="flashcards"');
  assert.ok(html.indexOf('class="alias-banner"', flash) - flash < 200, 'the banner opens the flashcards screen');
  assert.match(html, /window\.recordWordAttempt = function\(cardId, isRight, mode\)/);
  assert.match(html, /window\.ShirAmiramAliasUI\.noteMistake\(cardId\)/);
  assert.match(html, /srsState = SRS\.loadState\(\);\n?\r?\n?/);
  assert.match(html, /<input id="alias-input"[^>]*dir="ltr" lang="en"/);
  assert.match(html, /id="alias-clues" class="alias-clues" aria-live="polite"/);
  for (const f of ['alias_clues_data', 'alias_engine', 'alias_ui']) {
    assert.ok(html.includes(`<script src="src/${f}.js"></script>`), f);
    assert.ok(sw.includes(`'./src/${f}.js'`), `${f} precached`);
  }
  const shell = require('../src/ui_shell.js');
  assert.equal(shell.groupForTab('alias').id, 'practice');
});
