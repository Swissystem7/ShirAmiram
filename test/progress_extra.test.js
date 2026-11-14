const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const P = require('../src/progress_tracker.js');
const XP = require('../src/xp_engine.js');
const A = require('../app.js');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

// The CI runner is in UTC, where local and UTC dates agree, so the local-day rules are checked
// in child processes pinned to zones east and west of UTC, across a DST change.
test('local practice days hold in time zones east and west of UTC', () => {
  const probe = [
    "const P = require(process.argv[1]);",
    "const out = {",
    "  justAfterMidnight: P.localISODate(new Date(2026, 10, 13, 0, 30)),",
    "  lateEvening: P.localISODate(new Date(2026, 10, 13, 23, 30)),",
    "  back: P.shiftISODate('2026-03-01', -1),",
    "  forward: P.shiftISODate('2026-12-31', 1),",
    "  overDst: [P.shiftISODate('2026-03-08', 1), P.shiftISODate('2026-03-29', 1), P.shiftISODate('2026-04-05', 1), P.shiftISODate('2026-11-01', -1)],",
    "  streak: P.currentStreak({ '2026-03-07': 1, '2026-03-08': 1, '2026-03-09': 1 }, '2026-03-09')",
    "};",
    "process.stdout.write(JSON.stringify(out));"
  ].join('\n');
  for (const tz of ['Asia/Jerusalem', 'America/New_York', 'Pacific/Auckland', 'UTC']) {
    const raw = execFileSync(process.execPath, ['-e', probe, path.join(root, 'src', 'progress_tracker.js')], {
      env: Object.assign({}, process.env, { TZ: tz }), encoding: 'utf8'
    });
    const out = JSON.parse(raw);
    assert.equal(out.justAfterMidnight, '2026-11-13', tz);
    assert.equal(out.lateEvening, '2026-11-13', tz);
    assert.equal(out.back, '2026-02-28', tz);
    assert.equal(out.forward, '2027-01-01', tz);
    assert.deepEqual(out.overDst, ['2026-03-09', '2026-03-30', '2026-04-06', '2026-10-31'], tz);
    assert.equal(out.streak, 3, tz);
  }
});

test('seeding replays past answers in time order', () => {
  const at = (d) => new Date(2026, 10, d, 12).toISOString();
  // In order: right (10), wrong (run ends), right (10) = 20. Out of order would give 10 + 12 = 22.
  const attempts = [
    { correct: true, at: at(13) },
    { correct: false, at: at(12) },
    { correct: true, at: at(11) }
  ];
  const s = P.seedFromAttempts(attempts, XP);
  assert.equal(s.xp, 20);
  assert.equal(s.run, 1);
  assert.equal(s.correct, 2);
});

test('only the newest 400 practice days are kept', () => {
  let s = P.emptyState();
  let iso = '2025-01-01';
  for (let i = 0; i < 405; i++) {
    s.days[iso] = 1;
    iso = P.shiftISODate(iso, 1);
  }
  const last = P.shiftISODate(iso, -1);
  const parts = last.split('-').map(Number);
  s = P.recordReview(s, new Date(parts[0], parts[1] - 1, parts[2], 12));
  const keys = Object.keys(s.days).sort();
  assert.equal(keys.length, 400);
  assert.equal(keys[keys.length - 1], last);
  assert.equal(s.days[last], 2);
  assert.ok(!('2025-01-01' in s.days), 'the oldest day is dropped');
  assert.equal(P.currentStreak(s.days, last), 400);
});

test('every precached path exists and every local script is precached', () => {
  const list = sw.slice(sw.indexOf('STATIC_ASSETS'), sw.indexOf('];'));
  const paths = [...list.matchAll(/'(\.\/[^']*)'/g)].map((m) => m[1]);
  assert.ok(paths.length > 20);
  for (const p of paths) {
    const rel = p === './' ? 'index.html' : p.slice(2);
    assert.ok(fs.existsSync(path.join(root, rel)), 'missing file for ' + p);
  }
  const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]).filter((s) => !/^https?:/.test(s));
  assert.ok(scripts.length > 10);
  for (const s of scripts) assert.ok(paths.includes('./' + s), s + ' is loaded by index.html but not precached');
});

test('quiz answers are keyed by word, and other question banks cannot collide with word ids', () => {
  const vocab = [{ id: 1, word: 'achieve' }, { id: 2, word: 'adapt' }, { id: 17, word: 'peace' }];
  // Song quiz question 1 asks about "peace": it must count for word 17, not for word 1.
  assert.equal(A.quizCardKey({ id: 1, word_id: 'peace', word: 'peace' }, 'cloze', vocab, 0), '17');
  // A word outside the Amiram list gets its own key.
  assert.equal(A.quizCardKey({ id: 2, word: 'comfort' }, 'cloze', vocab, 1), 'word:comfort');
  // Amiram exam items carry the vocabulary id already.
  assert.equal(A.quizCardKey({ id: 2, word: 'adapt' }, 'cloze', vocab, 0), '2');
  assert.equal(A.quizCardKey({ id: 9, word: 'Achieve ' }, 'cloze', vocab, 0), '1');
  // Restatement and reading questions have their own numbering.
  assert.equal(A.quizCardKey({ id: 1, source_sentence: 'x', options: [] }, 'restatement', vocab, 0), 'restatement:1');
  assert.equal(A.quizCardKey({ id: 'rc_a1_q1', correct_index: 0, word: 'x' }, 'reading', vocab, 0), 'reading:rc_a1_q1');
  assert.equal(A.quizCardKey({}, 'cloze', vocab, 4), 'cloze:4');
  assert.equal(A.quizCardKey(null, undefined, null, 3), 'quiz:3');
  for (const key of ['restatement:1', 'reading:rc_a1_q1', 'word:comfort']) {
    assert.ok(!vocab.some((v) => String(v.id) === key));
  }
  assert.match(html, /window\.recordQuizAttempt\(A\.quizCardKey\(item, examType, AMIRAM_VOCAB, i\), right\)/);
});

test('the answer timer restarts only when the quiz comes on screen', () => {
  assert.match(html, /const quizWasHidden = \$\('quiz'\)\.classList\.contains\('hidden'\);/);
  assert.match(html, /if \(id === 'quiz' && quizWasHidden\) quizShownAt = Date\.now\(\);/);
});
