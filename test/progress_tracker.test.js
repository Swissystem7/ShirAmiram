const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const P = require('../src/progress_tracker.js');
const XP = require('../src/xp_engine.js');
const STREAKS = require('../src/study_streak_badges.js');
const CALENDAR = require('../src/review_calendar_grid.js');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

function memoryStorage() {
  const map = new Map();
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => { map.set(k, String(v)); } };
}
const day = (y, m, d, h = 12) => new Date(y, m - 1, d, h, 0, 0);

test('a correct answer earns the XP engine amount and extends the run', () => {
  let s = P.emptyState();
  s = P.recordAnswer(s, true, day(2026, 11, 13), XP);
  assert.equal(s.xp, 10);
  s = P.recordAnswer(s, true, day(2026, 11, 13), XP);
  assert.equal(s.xp, 22, 'second answer in a row gets the streak bonus');
  assert.equal(s.run, 2);
  assert.deepEqual(s.days, { '2026-11-13': 2 });
});

test('a wrong answer earns nothing, ends the run and still counts as practice', () => {
  let s = P.recordAnswer(P.emptyState(), true, day(2026, 11, 13), XP);
  s = P.recordAnswer(s, false, day(2026, 11, 13), XP);
  assert.equal(s.xp, 10);
  assert.equal(s.run, 0);
  assert.equal(s.answered, 2);
  assert.equal(s.correct, 1);
  assert.equal(s.days['2026-11-13'], 2);
});

test('a flashcard review counts for the day without XP', () => {
  const s = P.recordReview(P.emptyState(), day(2026, 11, 13));
  assert.equal(s.xp, 0);
  assert.equal(s.days['2026-11-13'], 1);
});

test('the practice day is the local calendar day, also just after midnight', () => {
  assert.equal(P.localISODate(day(2026, 11, 13, 0)), '2026-11-13');
  assert.equal(P.localISODate(new Date(2026, 10, 13, 23, 59)), '2026-11-13');
  assert.equal(P.shiftISODate('2026-03-01', -1), '2026-02-28');
  assert.equal(P.shiftISODate('2026-12-31', 1), '2027-01-01');
});

test('the streak counts back from today, or from yesterday while today is empty', () => {
  const days = { '2026-11-11': 3, '2026-11-12': 1, '2026-11-13': 5 };
  assert.equal(P.currentStreak(days, '2026-11-13'), 3);
  assert.equal(P.currentStreak(days, '2026-11-14'), 3, 'not broken until a full day is missed');
  assert.equal(P.currentStreak(days, '2026-11-15'), 0);
  assert.equal(P.currentStreak({}, '2026-11-13'), 0);
  assert.equal(P.currentStreak({ '2026-11-10': 2, '2026-11-13': 1 }, '2026-11-13'), 1);
});

test('the summary reports level, distance to the next level and the streak title', () => {
  let s = P.emptyState();
  for (let d = 9; d <= 13; d++) s = P.recordAnswer(s, true, day(2026, 11, d), XP);
  const sum = P.summarize(s, day(2026, 11, 13), XP, STREAKS);
  assert.equal(sum.streakDays, 5);
  assert.equal(sum.streakTitle, 'הצתה');
  assert.equal(sum.nextMilestoneDays, 7);
  assert.equal(sum.practisedToday, true);
  assert.equal(sum.level, XP.calculateLevelFromXP(s.xp).level);
  assert.equal(sum.xp + sum.xpToNext, XP.calculateLevelFromXP(s.xp).nextLevelXP);
  assert.equal(sum.activeDays, 5);
});

test('a first visit is seeded from the analytics attempt log', () => {
  const attempts = [
    { cardId: 'b', mode: 'cloze', correct: false, at: day(2026, 11, 12).toISOString() },
    { cardId: 'a', mode: 'cloze', correct: true, at: day(2026, 11, 11).toISOString() },
    { cardId: 'c', mode: 'cloze', correct: true, at: 'not a date' }
  ];
  const s = P.seedFromAttempts(attempts, XP);
  assert.deepEqual(s.days, { '2026-11-11': 1, '2026-11-12': 1 });
  assert.equal(s.xp, 10);
  assert.equal(s.answered, 2);
  assert.deepEqual(P.seedFromAttempts(null, XP), P.emptyState());
});

test('state survives a save and load, and damaged storage is ignored', () => {
  const store = memoryStorage();
  assert.equal(P.load(store), null);
  const s = P.recordAnswer(P.emptyState(), true, day(2026, 11, 13), XP);
  assert.equal(P.save(s, store), true);
  assert.deepEqual(P.load(store), s);
  store.setItem(P.STORAGE_KEY, '{broken');
  assert.equal(P.load(store), null);
  store.setItem(P.STORAGE_KEY, JSON.stringify({ xp: -5, days: { nope: 3, '2026-11-13': 'x', '2026-11-12': 2 }, run: 'a' }));
  assert.deepEqual(P.load(store), { version: 1, xp: 0, days: { '2026-11-12': 2 }, answered: 0, correct: 0, run: 0 });
  assert.equal(P.save(s, null), false);
  assert.equal(P.save(s, { setItem() { throw new Error('quota'); } }), false);
});

test('the stored days feed the review calendar', () => {
  let s = P.emptyState();
  for (let i = 0; i < 6; i++) s = P.recordAnswer(s, true, day(2026, 11, 13), XP);
  s = P.recordReview(s, day(2026, 11, 12));
  const grid = CALENDAR.buildHeatmapGrid(s.days, '2026-11-13', 28);
  assert.equal(grid.totalActiveDays, 2);
  assert.equal(grid.totalActions, 7);
  assert.equal(grid.maxStreak, 2);
  assert.equal(grid.weeks.length, 4);
  assert.equal(grid.weeks[3][6].intensity, 2);
});

test('index.html loads every engine the widgets use, before the page script', () => {
  const needed = ['xp_engine', 'study_streak_badges', 'review_calendar_grid', 'confidence_score_estimator',
    'export_summary_formatter', 'song_recommender', 'study_session_optimizer', 'progress_tracker', 'progress_ui'];
  const pageScript = html.indexOf('const A = window.ShirAmiram;');
  assert.ok(pageScript > 0);
  for (const name of needed) {
    const at = html.indexOf('<script src="src/' + name + '.js"></script>');
    assert.ok(at > 0 && at < pageScript, name + ' must load before the page script');
    assert.ok(sw.includes("'./src/" + name + ".js'"), name + ' must be precached for offline use');
  }
  assert.ok(html.indexOf('src/song_recommender.js') < html.indexOf('src/study_session_optimizer.js'));
  assert.ok(html.indexOf('src/progress_tracker.js') < html.indexOf('src/progress_ui.js'));
});

test('index.html has the widget anchors and wires answers into the tracker', () => {
  for (const id of ['xp-widget', 'xp-level', 'xp-fill', 'xp-bar', 'xp-note', 'xp-streak', 'plan-list', 'plan-note',
    'heatmap-grid', 'heatmap-summary', 'btn-export-progress', 'export-status']) {
    assert.ok(html.includes('id="' + id + '"'), 'missing #' + id);
  }
  assert.equal((html.match(/data-plan-min="/g) || []).length, 3);
  assert.match(html, /ShirAmiramProgressUI\.onAnswer\(isRight\)/);
  assert.match(html, /ShirAmiramProgressUI\.onReview\(\)/);
  assert.match(html, /A\.formatAnswerConfidenceBadge\(answerMs, right\)/);
  assert.match(html, /<link rel="icon" href="assets\/icon-192\.svg"/);
});

test('the linking-words filter matches the tag the Amiram word list uses', () => {
  assert.match(html, /category === 'connector' \? \['connector', 'conjunction'\]/);
  const vocab = fs.readFileSync(path.join(root, 'src', 'amiram_vocab_data.js'), 'utf8');
  assert.ok(/"part_of_speech":\s*"conjunction"/.test(vocab), 'the word list has at least one linking word');
});

test('blocked site storage does not throw: load gives null and save gives false', () => {
  const blocked = {};
  Object.defineProperty(blocked, 'getItem', { get() { throw new Error('SecurityError'); } });
  Object.defineProperty(blocked, 'setItem', { get() { throw new Error('SecurityError'); } });
  assert.equal(P.load(blocked), null);
  assert.equal(P.save(P.emptyState(), blocked), false);
  const hadGlobal = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('SecurityError'); } });
  try {
    assert.equal(P.load(), null);
    assert.equal(P.save(P.emptyState()), false);
  } finally {
    if (hadGlobal) Object.defineProperty(globalThis, 'localStorage', hadGlobal);
    else delete globalThis.localStorage;
  }
});

test('without the XP engine the level still follows the engine curve', () => {
  let s = P.emptyState();
  for (let i = 0; i < 12; i++) s = P.recordAnswer(s, true, day(2026, 11, 13), null);
  const sum = P.summarize(s, day(2026, 11, 13), null, null);
  const real = XP.calculateLevelFromXP(s.xp);
  assert.equal(sum.level, real.level);
  assert.equal(sum.progressPercent, real.progressPercent);
  assert.equal(sum.xp + sum.xpToNext, real.nextLevelXP);
  for (const xp of [0, 99, 100, 399, 400, 250000, 1e9]) {
    const a = P.summarize({ xp }, day(2026, 11, 13), null, null);
    const b = P.summarize({ xp }, day(2026, 11, 13), XP, null);
    assert.deepEqual([a.level, a.progressPercent, a.xpToNext], [b.level, b.progressPercent, b.xpToNext], 'xp=' + xp);
  }
});

test('the XP engine does not depend on Object.hasOwn (older Safari)', () => {
  const saved = Object.hasOwn;
  delete Object.hasOwn;
  try {
    delete require.cache[require.resolve('../src/xp_engine.js')];
    const fresh = require('../src/xp_engine.js');
    assert.equal(fresh.calculateActivityXP('QUIZ_CORRECT', { streak: 0 }), 10);
    assert.equal(fresh.calculateActivityXP('toString'), 0);
  } finally {
    Object.hasOwn = saved;
  }
});
