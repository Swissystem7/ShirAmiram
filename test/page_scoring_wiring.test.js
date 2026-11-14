// The page loads karaoke_scoring, confidence_score_estimator and daily_challenge_scheduler as plain
// <script>s. These tests read the script order from index.html and run the files the way the browser
// does: one shared global, no require() and no module.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const PAGE_SCRIPTS = [...HTML.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]).filter((src) => !/^https?:/.test(src));

function browserRun(files) {
  const sandbox = { console };
  sandbox.self = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
  return sandbox;
}

// karaoke.js, app.js and the three modules: the logic files, in page order (the rest of the page needs a DOM)
const LOGIC = PAGE_SCRIPTS.filter((f) => /^(app\.js|src\/(karaoke_scoring|confidence_score_estimator|daily_challenge_scheduler|karaoke)\.js)$/.test(f));

test('index.html loads the three modules once each, karaoke_scoring before karaoke.js (which reads it when it loads)', () => {
  for (const f of ['src/karaoke_scoring.js', 'src/confidence_score_estimator.js', 'src/daily_challenge_scheduler.js']) {
    assert.equal(PAGE_SCRIPTS.filter((src) => src === f).length, 1, f + ' has exactly one <script> tag');
  }
  assert.ok(PAGE_SCRIPTS.indexOf('src/karaoke_scoring.js') < PAGE_SCRIPTS.indexOf('src/karaoke.js'));
  assert.equal(LOGIC.length, 5);
});

test('sw.js precaches the three modules for offline use', () => {
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  for (const f of ['karaoke_scoring', 'confidence_score_estimator', 'daily_challenge_scheduler']) {
    assert.ok(sw.includes("'./src/" + f + ".js'"), f);
  }
});

test('karaoke pronunciation score is real in the page: a matching input scores above zero', () => {
  const page = browserRun(LOGIC);
  const scoring = page.ShirAmiramKaraokeScoring;
  assert.ok(scoring, 'window.ShirAmiramKaraokeScoring is defined');
  assert.equal(scoring.evaluatePhoneticMatch('peace', 'peace'), 1);
  assert.equal(scoring.evaluatePhoneticMatch('weight', 'wait'), 0.8);
  const attempt = scoring.scoreAttempt({ targetWord: 'peace', spokenTranscript: 'peace', eventTimeMs: 500, windowStartMs: 0, windowEndMs: 1000 });
  assert.equal(attempt.isHit, true);
  assert.ok(attempt.points > 0, 'points ' + attempt.points);
});

test('the page karaoke session counts a homophone as a hit; without karaoke_scoring it was a miss', () => {
  const words = [{ word: 'weight', timeMs: 1000, windowMs: 1500 }];
  const withScoring = browserRun(LOGIC).ShirAmiramKaraoke.createSession({ words });
  const hit = withScoring.tryVoice('wait', 1000);
  assert.equal(hit.ok, true, JSON.stringify(hit));
  assert.ok(hit.points > 0);

  // the page before this change: karaoke.js without karaoke_scoring falls back to a phonetic score of 0
  const without = browserRun(['src/karaoke.js']).ShirAmiramKaraoke.createSession({ words });
  assert.deepEqual(JSON.parse(JSON.stringify(without.tryVoice('wait', 1000))), { ok: false, reason: 'no-match', feedback: 'miss-match' });
});

test('app.js finds the scheduler and the estimator as page globals (no require in the browser)', () => {
  const page = browserRun(LOGIC);
  const api = page.ShirAmiram;
  const songs = [{ id: 's1', title: 'Song', words: ['deliberate'] }];
  const banner = api.getDailyChallengeBannerData('2026-11-14', songs, api.VOCAB);
  assert.equal(banner.songTitle, 'Song');
  assert.equal(banner.formattedDate, '2026-11-14');
  assert.ok(banner.word);
  // before: app.js looked for root.* inside a factory that has no root in scope, so this threw
  // "Invalid scheduler provided to getDailyChallengeBannerData" in the browser
  const badge = api.formatAnswerConfidenceBadge(1200, true);
  assert.equal(badge.isFastAndCorrect, true);
});
