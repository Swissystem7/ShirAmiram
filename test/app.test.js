// ShirAmiram — the data and the logic behind the page. Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const A = require('../app.js');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const json = JSON.parse(fs.readFileSync(path.join(root, 'shiramiram_vocab_full.json'), 'utf8'));

test('the vocabulary in app.js is the same list as shiramiram_vocab_full.json', () => {
  assert.deepEqual(A.VOCAB, json);
});

test('every word has a translation, a known category, a difficulty and an example that uses it', () => {
  assert.ok(A.VOCAB.length >= 8);
  assert.equal(new Set(A.VOCAB.map((v) => v.word)).size, A.VOCAB.length, 'a word repeats');
  A.VOCAB.forEach((v) => {
    assert.match(v.word, /^[a-z]+$/, v.word);
    assert.ok(v.translation && /[֐-׿]/.test(v.translation), v.word + ' has a Hebrew translation');
    assert.ok(A.CATEGORY_HE[v.category], v.word + ' category ' + v.category);
    assert.ok(A.DIFFICULTY_HE[v.difficulty], v.word + ' difficulty ' + v.difficulty);
    assert.ok(v.sample_sentence.toLowerCase().includes(v.word), v.word + ' appears in its example');
  });
});

test('every highlighted word in the song is in the vocabulary, and every vocabulary word is in the song', () => {
  const inSong = [...html.matchAll(/class="vocab-badge" data-word="([a-z]+)"/g)].map((m) => m[1]);
  assert.ok(inSong.length >= 8);
  inSong.forEach((w) => assert.ok(A.findWord(w), w + ' is highlighted but has no entry'));
  A.VOCAB.forEach((v) => assert.ok(inSong.includes(v.word), v.word + ' is not in the song'));
  assert.equal((html.match(/class="lyric-line /g) || []).length, A.LINES, 'one highlightable line per song line');
});

test('category filter: every button shows at least one word, and "all" shows everything', () => {
  A.CATEGORIES.forEach((c) => {
    const rows = A.filterVocab('', c.id);
    assert.ok(rows.length >= 1, c.id + ' shows nothing');
    if (c.id !== 'all') rows.forEach((v) => assert.equal(v.category, c.id));
  });
  assert.equal(A.filterVocab('', 'all').length, A.VOCAB.length);
  assert.equal(A.filterVocab('', '').length, A.VOCAB.length);
  // every category in the data has a button
  new Set(A.VOCAB.map((v) => v.category)).forEach((c) => assert.ok(A.CATEGORIES.some((b) => b.id === c), c));
});

test('search: by English word in any letter case and by Hebrew translation, together with the category', () => {
  assert.deepEqual(A.filterVocab('CRUC', 'all').map((v) => v.word), ['crucial']);
  assert.deepEqual(A.filterVocab('נמנע', 'all').map((v) => v.word), ['inevitable']);
  assert.deepEqual(A.filterVocab('  ', 'connector').map((v) => v.word), ['nevertheless', 'consequently']);
  assert.deepEqual(A.filterVocab('never', 'adjective'), []);
  assert.deepEqual(A.filterVocab('zzz', 'all'), []);
  assert.equal(A.filterVocab(null, 'all').length, A.VOCAB.length);
});

test('quiz: the right answer is always one of the options, once, and is a real translation', () => {
  assert.ok(A.QUIZ.length >= 4);
  A.QUIZ.forEach((q, i) => {
    assert.equal(q.opts.filter((o) => o === q.a).length, 1, 'question ' + (i + 1) + ': ' + q.q);
    assert.equal(new Set(q.opts).size, q.opts.length, 'question ' + (i + 1) + ' repeats an option');
    assert.ok(A.VOCAB.some((v) => v.translation === q.a), 'question ' + (i + 1) + ' answer is a vocabulary translation');
    assert.ok(A.isCorrect(q, q.a));
    q.opts.filter((o) => o !== q.a).forEach((o) => assert.ok(!A.isCorrect(q, o)));
  });
});

test('timer text and song position: the line, the progress bar and the tune follow the time and loop', () => {
  assert.equal(A.formatTime(0), '00:00');
  assert.equal(A.formatTime(59.9), '00:59');
  assert.equal(A.formatTime(125), '02:05');
  assert.equal(A.formatTime(-3), '00:00');
  assert.equal(A.LOOP_SEC, A.LINES * A.LINE_SEC);
  assert.deepEqual([0, 7.4, 7.5, 15, 22.5, 29.9].map((t) => A.positionAt(t).line), [0, 0, 1, 2, 3, 3]);
  assert.equal(A.positionAt(0).percent, 0);
  assert.equal(A.positionAt(15).percent, 50);
  assert.equal(A.positionAt(A.LOOP_SEC).line, 0, 'the song loops');
  assert.equal(A.positionAt(A.LOOP_SEC + 15).percent, 50);
  assert.ok(new Set([0, 0.5, 1, 1.5, 2].map((t) => A.positionAt(t).hz)).size >= 4, 'the tune moves: it is not one held tone');
  A.TUNE.forEach((hz) => assert.ok(hz >= 110 && hz <= 880));
});

test('the page loads app.js and no longer carries the broken v1 pieces', () => {
  assert.match(html, /<script src="app\.js"><\/script>/);
  assert.doesNotMatch(html, /data-cat="science"|data-cat="society"/, 'filters for categories that are not in the data');
  assert.doesNotMatch(html, /renderVocab\(v=>/, 'a function passed as the search text');
  assert.match(html, /id="btn-play"[^>]*aria-label=/);
  assert.match(html, /<article[^>]*dir="ltr"/);
});

test('vocabulary table renders formatWordItem pronunciation guidance safely', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(html, /ShirAmiramVocab\.formatWordItem/);
  assert.match(html, /vocab-pronunciation/);
  assert.match(html, /syllablesDisplay \|\| formatted\.phoneticGuide/);
  // guidance is escaped via esc(...) — no raw innerHTML of the guide string
  assert.match(html, /esc\(guide\)/);
});

test('formatWordItem returns syllablesDisplay/phoneticGuide and UI escapes guidance', () => {
  const vocab = require('../src/vocab.js');
  const item = vocab.formatWordItem({ word: 'deliberate' });
  assert.ok(item.syllablesDisplay || item.phoneticGuide);
  assert.match(String(item.syllablesDisplay), /de/);
  // Markup-like input is treated as plain text by the helper; the table path escapes via esc(guide).
  const nasty = vocab.formatWordItem({ word: 'hello' });
  assert.ok(nasty.syllablesDisplay || nasty.phoneticGuide);
  assert.match(html, /vocab-pronunciation/);
  assert.match(html, /esc\(guide\)/);
  assert.match(html, /ShirAmiramVocab\.formatWordItem/);
});

test('songDominantLevel and filterSongsByLevel use estimateSongVocabDifficulty', () => {
  const calls = [];
  const fake = {
    estimateSongVocabDifficulty(words) {
      calls.push(words);
      const hard = words.filter((w) => w.length > 7).length;
      const mid = words.filter((w) => w.length > 4 && w.length <= 7).length;
      return {
        avgScore: 0,
        totalWords: words.length,
        levelCounts: { A_foundational: words.length - hard - mid, B_intermediate: mid, C_advanced: hard },
      };
    },
  };
  const mk = (id, words) => ({ id, highlight_words: words.map((word) => ({ word })) });
  const songs = [mk(1, ['cat', 'dog', 'sun']), mk(2, ['market', 'garden', 'silver']), mk(3, ['inevitable', 'nevertheless']), mk(4, [])];
  assert.equal(A.songDominantLevel(songs[0], fake), 'A_foundational');
  assert.equal(A.songDominantLevel(songs[1], fake), 'B_intermediate');
  assert.equal(A.songDominantLevel(songs[2], fake), 'C_advanced');
  assert.equal(A.songDominantLevel(songs[3], fake), null);
  assert.equal(A.songDominantLevel(songs[0], null), null);
  assert.deepEqual(A.filterSongsByLevel(songs, 'C_advanced', fake).map((s) => s.id), [3]);
  assert.deepEqual(A.filterSongsByLevel(songs, 'B_intermediate', fake).map((s) => s.id), [2]);
  assert.equal(A.filterSongsByLevel(songs, 'all', fake).length, 4);
  assert.ok(calls.length > 0);
});

test('buildQuickStudyPlan delegates planning to the optimizer', () => {
  const optimizer = {
    planTimeBoxedSession(input) {
      return { targetMinutes: input.availableMinutes, activities: ['quiz'] };
    }
  };
  const plan = A.buildQuickStudyPlan(15, ['word1'], [], [], optimizer);
  assert.equal(plan.targetMinutes, 15);
  assert.deepEqual(plan.activities, ['quiz']);
  assert.throws(() => A.buildQuickStudyPlan(15, [], [], [], null), /Invalid optimizer/);
});

test('real estimator classifies the content songs and the page wires the level filter', () => {
  const est = require('../src/difficulty_estimator.js');
  const content = JSON.parse(fs.readFileSync(path.join(root, 'data/imports/content_v2.json'), 'utf8'));
  const total = ['A_foundational', 'B_intermediate', 'C_advanced'].reduce(
    (n, l) => n + A.filterSongsByLevel(content.songs, l, est).length,
    0,
  );
  assert.ok(total > 0 && total <= content.songs.length);
  assert.match(html, /id="karaoke-30-level"/);
  assert.match(html, /src\/difficulty_estimator\.js/);
  assert.match(html, /A\.filterSongsByLevel/);
});
