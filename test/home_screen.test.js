const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const home = require('../src/home_screen.js');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('greeting and title follow the time of day', () => {
  assert.equal(home.greetingFor(8), 'בוקר טוב');
  assert.equal(home.greetingFor(14), 'צהריים טובים');
  assert.equal(home.greetingFor(19), 'ערב טוב');
  assert.equal(home.greetingFor(2), 'לילה טוב');
  assert.equal(home.titleFor(10), 'מה שרים היום?');
  assert.equal(home.titleFor(20), 'מה שרים הערב?');
});

test('weekCounts runs Sunday to Saturday and marks today and the days after it', () => {
  const wed = new Date(2026, 10, 18); // Wednesday
  const week = home.weekCounts({ '2026-11-16': 3, '2026-11-18': 2, '2026-11-20': 9 }, wed);
  assert.deepEqual(week.map((d) => d.letter), ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']);
  assert.equal(week[1].count, 3);
  assert.equal(week[3].count, 2);
  assert.equal(week[3].today, true);
  assert.equal(week[5].future, true);
  assert.equal(week[5].count, 9);
});

test('srsCounts counts known words (box 2+) and words due now', () => {
  const now = new Date('2026-11-20T12:00:00Z');
  const cards = {
    a: { box: 1, dueAt: '2026-11-19T00:00:00Z' },
    b: { box: 3, dueAt: '2026-11-25T00:00:00Z' },
    c: { box: 2, dueAt: '2026-11-20T11:00:00Z' },
    d: null
  };
  assert.deepEqual(home.srsCounts(cards, now), { learned: 2, due: 2 });
  assert.deepEqual(home.srsCounts(undefined, now), { learned: 0, due: 0 });
});

test('song chips show two words and a count of the rest', () => {
  assert.deepEqual(home.songChips(['a', 'b', 'c', 'd']), ['a', 'b', '+2']);
  assert.deepEqual(home.songChips(['a']), ['a']);
});

test('topSongs ranks the catalogue by highlighted words', () => {
  const top = home.topSongs([
    { title: 'One', artist: 'X', highlight_words: [1] },
    { title: 'Two', artist: 'Y', highlight_words: [1, 2, 3] },
    { artist: 'no title' }
  ], 2);
  assert.deepEqual(top.map((s) => s.title), ['Two', 'One']);
});

test('sinceLabel names the first practice month', () => {
  assert.equal(home.sinceLabel({}), 'מתחילים היום');
  assert.equal(home.sinceLabel({ '2026-03-04': 1, '2026-05-01': 2 }), 'לומדים מאז מרץ 2026');
});

test('index.html has the home screen and loads its script and styles', () => {
  for (const id of ['home', 'home-play', 'home-streak', 'home-ring', 'home-week', 'home-practice', 'me-words', 'me-week', 'quiz-bar']) {
    assert.match(html, new RegExp('id="' + id + '"'), id);
  }
  assert.match(html, /src="src\/home_screen\.js"/);
  assert.ok(html.indexOf('css/volt.css') < html.indexOf('css/shir.css'));
});
