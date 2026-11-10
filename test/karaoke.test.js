// Voice Karaoke Challenge — unit tests (node --test)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const K = require('../src/karaoke.js');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const cssPath = path.join(root, 'css/style.css');
const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';

test('sanitize lowercases, strips punctuation and collapses spaces', () => {
  assert.equal(K.sanitize('  Hello, WORLD!!  '), 'hello world');
  assert.equal(K.sanitize('Peace.'), 'peace');
  assert.equal(K.sanitize(''), '');
});

test('exact includes match', () => {
  assert.equal(K.utteranceMatches('peace', 'peace'), true);
  assert.equal(K.utteranceMatches('I want peace now', 'peace'), true);
  assert.equal(K.utteranceMatches('PEACE!', 'peace'), true);
});

test('fuzzy Levenshtein: <=1 for short words, <=2 for words >6 letters', () => {
  assert.equal(K.maxDistance('peace'), 1); // 5 letters -> 1
  assert.equal(K.maxDistance('comfort'), 2); // 7 letters -> 2
  assert.equal(K.maxDistance('inevitable'), 2);
  assert.equal(K.wordMatches('peac', 'peace'), true); // dist 1
  assert.equal(K.wordMatches('peaxe', 'peace'), true); // dist 1
  assert.equal(K.wordMatches('xyz', 'peace'), false);
  assert.equal(K.wordMatches('inevitabl', 'inevitable'), true); // dist 1 on long word
  assert.equal(K.wordMatches('inevitabxx', 'inevitable'), true); // dist 2
  assert.equal(K.wordMatches('xxxxxxxx', 'inevitable'), false);
});

test('predefined inflections accepted', () => {
  assert.equal(K.wordMatches('running', 'run'), true);
  assert.equal(K.wordMatches('sang', 'sing'), true);
  assert.equal(K.wordMatches('memories', 'memory'), true);
  assert.equal(K.wordMatches('calming', 'calm'), true);
});

test('regression: do not match when heard token is merely a substring of target', () => {
  // Substring words/letters must return false
  assert.equal(K.wordMatches('a', 'peace'), false);
  assert.equal(K.wordMatches('i', 'inevitable'), false);
  assert.equal(K.wordMatches('to', 'stop'), false);

  // Utterances with unrelated words must return false
  assert.equal(K.utteranceMatches('I went there', 'inevitable'), false);

  // Legitimate exact matches, inflections, and fuzzy matches still return true
  assert.equal(K.wordMatches('peace', 'peace'), true);
  assert.equal(K.utteranceMatches('peace', 'peace'), true);
  assert.equal(K.utteranceMatches('I went there to find peace', 'peace'), true);
  assert.equal(K.wordMatches('stopped', 'stop'), true);
  assert.equal(K.wordMatches('inevitably', 'inevitable'), true);
  assert.equal(K.wordMatches('peac', 'peace'), true);
  assert.equal(K.wordMatches('inevitabl', 'inevitable'), true);
});

test('reject wrong word and out-of-window hits', () => {
  const session = K.createSession({
    words: [
      { word: 'peace', he: 'שלום', timeMs: 1000, windowMs: 1500 },
      { word: 'hope', he: 'תקווה', timeMs: 4000, windowMs: 1500 }
    ]
  });
  // wrong word inside window
  const bad = session.tryVoice('banana', 1200);
  assert.equal(bad.ok, false);
  assert.equal(bad.reason, 'no-match');
  // out of window (before start)
  const early = session.tryVoice('peace', 500);
  assert.equal(early.ok, false);
  assert.equal(early.reason, 'out-of-window');
  // out of window (after +1.5s)
  const late = session.tryVoice('peace', 2600);
  assert.equal(late.ok, false);
  assert.equal(late.reason, 'out-of-window');
  // good hit in window
  const hit = session.tryVoice('peace', 1500);
  assert.equal(hit.ok, true);
  assert.equal(hit.points, 100);
});

test('scoring base 100 and streak multipliers x1.2 then x1.5', () => {
  assert.equal(K.streakMultiplier(0), 1);
  assert.equal(K.streakMultiplier(1), 1);
  assert.equal(K.streakMultiplier(2), 1.2);
  assert.equal(K.streakMultiplier(3), 1.5);
  assert.equal(K.pointsForHit(1), 100);
  assert.equal(K.pointsForHit(2), 120);
  assert.equal(K.pointsForHit(3), 150);

  const session = K.createSession({
    words: [
      { word: 'a', he: 'א', timeMs: 0 },
      { word: 'b', he: 'ב', timeMs: 0 },
      { word: 'c', he: 'ג', timeMs: 0 },
      { word: 'd', he: 'ד', timeMs: 0 }
    ]
  });
  assert.equal(session.tryVoice('a', 100).points, 100);
  assert.equal(session.tryVoice('b', 100).points, 120);
  assert.equal(session.tryVoice('c', 100).points, 150);
  assert.equal(session.state.score, 100 + 120 + 150);
  // miss resets streak
  session.skipCurrent('timeout');
  assert.equal(session.state.streak, 0);
});

test('end screen reports accuracy, score, missed words with Hebrew', () => {
  const session = K.createSession({
    words: [
      { word: 'peace', he: 'שלום', timeMs: 0 },
      { word: 'hope', he: 'תקווה', timeMs: 0 }
    ]
  });
  session.tryVoice('peace', 100);
  session.skipCurrent('timeout');
  const end = session.endScreen();
  assert.equal(end.score, 100);
  assert.equal(end.accuracy, 50);
  assert.equal(end.missed.length, 1);
  assert.equal(end.missed[0].word, 'hope');
  assert.equal(end.missed[0].he, 'תקווה');
  assert.equal(end.missed[0].translation, 'תקווה');
});

test('fallback when SpeechRecognition missing enables Rhythm Tap with 3 choices', () => {
  const support = K.detectSpeechSupport(null);
  assert.equal(support.ok, false);
  assert.match(support.reason, /SpeechRecognition/);
  const session = K.createSession({
    words: [{ word: 'peace', he: 'שלום', timeMs: 0 }]
  });
  const msg = session.enableFallback();
  assert.match(msg, /מיקרופון|Rhythm/i);
  assert.equal(session.state.mode, 'rhythm');
  const choices = session.rhythmChoices(['hope', 'light', 'dream']);
  assert.equal(choices.length, 3);
  assert.ok(choices.includes('peace'));
  const wrong = session.tryRhythmTap('hope');
  assert.equal(wrong.ok, false);
  // new session for correct tap
  const s2 = K.createSession({ words: [{ word: 'peace', he: 'שלום', timeMs: 0 }] });
  s2.enableFallback();
  const ok = s2.tryRhythmTap('peace');
  assert.equal(ok.ok, true);
});

test('instrumental player reports no vocals', () => {
  const fakeCtx = {
    state: 'running',
    currentTime: 0,
    destination: {},
    createGain() {
      return { gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} };
    },
    createOscillator() {
      return { type: '', frequency: { value: 0 }, connect() {}, start() {}, stop() {}, disconnect() {} };
    }
  };
  const player = K.createInstrumentalPlayer(fakeCtx);
  assert.equal(player.hasVocals, false);
  assert.equal(player.kind, 'instrumental-synth');
  assert.equal(player.start(), true);
  assert.equal(player.isPlaying(), true);
  player.stop();
  assert.equal(player.isPlaying(), false);
});

test('UI contract: karaoke tab, mic, scoreboard, status classes, Start Mic', () => {
  assert.match(html, /data-tab="karaoke"/);
  assert.match(html, /id="karaoke"/);
  assert.match(html, /id="karaoke-mic-btn"|Start Mic|התחל מיקרופון/);
  assert.match(html, /id="karaoke-score"|karaoke-scoreboard/);
  assert.match(html, /id="karaoke-status"/);
  assert.match(html, /id="karaoke-teleprompter"/);
  assert.match(html, /src\/karaoke\.js/);
  assert.match(html, /css\/style\.css/);
  assert.match(css, /karaoke-status-idle/);
  assert.match(css, /karaoke-status-listening/);
  assert.match(css, /karaoke-status-processing/);
  assert.match(css, /min-height:\s*44px/);
});

test('isInWindow inclusive from word time to +windowMs', () => {
  assert.equal(K.isInWindow(1000, 1000, 1500), true);
  assert.equal(K.isInWindow(2500, 1000, 1500), true);
  assert.equal(K.isInWindow(2501, 1000, 1500), false);
  assert.equal(K.isInWindow(999, 1000, 1500), false);
});

test('statusClass maps status strings to css classes', () => {
  assert.equal(K.statusClass('listening'), 'karaoke-status-listening');
  assert.equal(K.statusClass('processing'), 'karaoke-status-processing');
  assert.equal(K.statusClass('fallback'), 'karaoke-status-idle');
  assert.equal(K.statusClass('done'), 'karaoke-status-idle');
  assert.equal(K.statusClass('idle'), 'karaoke-status-idle');
  assert.equal(K.statusClass('unknown'), 'karaoke-status-idle');
  assert.equal(K.statusClass(null), 'karaoke-status-idle');
});

test('tokens tokenizes text, collapses whitespace, strips punctuation, and handles empty inputs', () => {
  assert.deepEqual(K.tokens('hello world'), ['hello', 'world']);
  assert.deepEqual(K.tokens('  Multiple   SPACES!  '), ['multiple', 'spaces']);
  assert.deepEqual(K.tokens(''), []);
  assert.deepEqual(K.tokens(null), []);
  assert.deepEqual(K.tokens(undefined), []);
});

test('detectSpeechSupport returns ok and ctor when passed a mock constructor', () => {
  function MockSpeech() {}
  const res = K.detectSpeechSupport(MockSpeech);
  assert.deepEqual(res, { ok: true, ctor: MockSpeech });
});

test('createSession edge cases: initial accuracy, rhythm tap in voice mode, tryVoice after ended', () => {
  const session = K.createSession({
    words: [{ word: 'peace', he: 'שלום', timeMs: 1000, windowMs: 1500 }]
  });

  assert.equal(session.accuracy(), 0);
  assert.deepEqual(session.tryRhythmTap('peace'), { ok: false, reason: 'not-rhythm' });

  const hit = session.tryVoice('peace', 1200);
  assert.equal(hit.ok, true);
  assert.equal(session.state.ended, true);

  assert.deepEqual(session.tryVoice('peace', 1200), { ok: false, reason: 'ended' });
});

function createMockStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    store,
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, val) {
      store.set(key, String(val));
    }
  };
}

test('finishSession accuracy calculation: 100% when all hit, 0% when 0 hit, and 0% when totalTargets is 0', () => {
  // 100% when all targets hit
  const allHit = K.finishSession({ hits: 5, totalTargets: 5 });
  assert.equal(allHit.accuracy, 100);
  assert.equal(allHit.hits, 5);
  assert.equal(allHit.totalTargets, 5);

  // 0% when 0 targets hit
  const zeroHit = K.finishSession({ hits: 0, totalTargets: 5 });
  assert.equal(zeroHit.accuracy, 0);

  // 0% when totalTargets is 0
  const zeroTargets = K.finishSession({ hits: 0, totalTargets: 0 });
  assert.equal(zeroTargets.accuracy, 0);

  const zeroTargetsWithHits = K.finishSession({ hits: 4, totalTargets: 0 });
  assert.equal(zeroTargetsWithHits.accuracy, 0);

  const negativeTargets = K.finishSession({ hits: 0, totalTargets: -2 });
  assert.equal(negativeTargets.accuracy, 0);

  // Rounded percentage
  const oneOfThree = K.finishSession({ hits: 1, totalTargets: 3 });
  assert.equal(oneOfThree.accuracy, 33);

  const twoOfThree = K.finishSession({ hits: 2, totalTargets: 3 });
  assert.equal(twoOfThree.accuracy, 67);
});

test('finishSession high score persistence: writes new high score when score exceeds stored high score', () => {
  const storage = createMockStorage({ shiramiram_karaoke_high_song1: '100' });
  const res = K.finishSession({ songId: 'song1', score: 250, hits: 2, totalTargets: 2 }, storage);

  assert.equal(res.isNewHighScore, true);
  assert.equal(res.score, 250);
  assert.equal(storage.getItem('shiramiram_karaoke_high_song1'), '250');

  // When no previous score exists in storage
  const emptyStorage = createMockStorage();
  const resEmpty = K.finishSession({ score: 120, hits: 1, totalTargets: 1 }, emptyStorage);
  assert.equal(resEmpty.isNewHighScore, true);
  assert.equal(resEmpty.score, 120);
  assert.equal(emptyStorage.getItem('shiramiram_karaoke_high_default'), '120');
});

test('finishSession existing high score preserved: does not overwrite when score is lower or equal', () => {
  const storage = createMockStorage({ shiramiram_karaoke_high_song2: '500' });

  // Score is lower than stored high score
  const resLower = K.finishSession({ songId: 'song2', score: 300, hits: 2, totalTargets: 3 }, storage);
  assert.equal(resLower.isNewHighScore, false);
  assert.equal(storage.getItem('shiramiram_karaoke_high_song2'), '500');

  // Score is equal to stored high score
  let setItemCalled = false;
  const storageEqual = {
    getItem() { return '500'; },
    setItem() { setItemCalled = true; }
  };
  const resEqual = K.finishSession({ songId: 'song2', score: 500, hits: 3, totalTargets: 3 }, storageEqual);
  assert.equal(resEqual.isNewHighScore, false);
  assert.equal(setItemCalled, false);
});

test('finishSession storage robustness: handles getItem/setItem exceptions gracefully without throwing', () => {
  // getItem throws SecurityError
  let setVal = null;
  const storageGetThrows = {
    getItem() {
      throw new Error('SecurityError: localStorage is disabled');
    },
    setItem(k, v) {
      setVal = v;
    }
  };
  const res1 = K.finishSession({ songId: 'default', score: 100, hits: 1, totalTargets: 1 }, storageGetThrows);
  assert.equal(res1.score, 100);
  assert.equal(res1.isNewHighScore, true);
  assert.equal(setVal, '100');

  // setItem throws QuotaExceededError
  const storageSetThrows = {
    getItem() { return '50'; },
    setItem() {
      throw new Error('QuotaExceededError: DOM exception 22');
    }
  };
  const res2 = K.finishSession({ songId: 'default', score: 150, hits: 1, totalTargets: 1 }, storageSetThrows);
  assert.equal(res2.score, 150);
  assert.equal(res2.isNewHighScore, true);

  // Both throw
  const storageBothThrow = {
    getItem() { throw new Error('SecurityError'); },
    setItem() { throw new Error('QuotaExceededError'); }
  };
  const res3 = K.finishSession({ score: 200, hits: 2, totalTargets: 2 }, storageBothThrow);
  assert.equal(res3.score, 200);
  assert.equal(res3.isNewHighScore, true);

  // Missing / null storage safely handled
  const resNoStorage = K.finishSession({ score: 100, hits: 1, totalTargets: 1 }, null);
  assert.equal(resNoStorage.score, 100);
  assert.equal(resNoStorage.isNewHighScore, true);
});

test('finishSession session state unwrapping, streak extraction and totalTargets fallbacks', () => {
  // null / undefined input
  assert.deepEqual(K.finishSession(null), {
    score: 0,
    hits: 0,
    totalTargets: 0,
    accuracy: 0,
    bestStreak: 0,
    maxMultiplier: 1,
    isNewHighScore: false
  });
  assert.deepEqual(K.finishSession(undefined), {
    score: 0,
    hits: 0,
    totalTargets: 0,
    accuracy: 0,
    bestStreak: 0,
    maxMultiplier: 1,
    isNewHighScore: false
  });

  // Session instance from createSession
  const session = K.createSession({
    words: [
      { word: 'peace', timeMs: 0 },
      { word: 'hope', timeMs: 0 }
    ]
  });
  session.tryVoice('peace', 100);
  session.skipCurrent('timeout');
  const storage = createMockStorage();
  const sessionRes = K.finishSession(session, storage);
  assert.equal(sessionRes.score, 100);
  assert.equal(sessionRes.hits, 1);
  assert.equal(sessionRes.totalTargets, 2);
  assert.equal(sessionRes.accuracy, 50);
  assert.equal(sessionRes.bestStreak, 1);
  assert.equal(sessionRes.isNewHighScore, true);
  assert.equal(storage.getItem('shiramiram_karaoke_high_default'), '100');

  // bestStreak from hits array
  const streakFromHits = K.finishSession({
    hits: [{ streak: 1 }, { streak: 4 }, { streak: 2 }]
  });
  assert.equal(streakFromHits.bestStreak, 4);
  assert.equal(streakFromHits.hits, 3);

  // explicit bestStreak overrides hits
  const streakExplicit = K.finishSession({
    hits: [{ streak: 2 }],
    bestStreak: 6
  });
  assert.equal(streakExplicit.bestStreak, 6);

  // totalTargets fallback to words.length
  const wordsFallback = K.finishSession({
    hits: 2,
    words: [{ word: 'a' }, { word: 'b' }, { word: 'c' }, { word: 'd' }]
  });
  assert.equal(wordsFallback.totalTargets, 4);
  assert.equal(wordsFallback.accuracy, 50);

  // totalTargets fallback to hits + misses array length
  const missesArrayFallback = K.finishSession({
    hits: 3,
    misses: [{ word: 'x' }]
  });
  assert.equal(missesArrayFallback.totalTargets, 4);
  assert.equal(missesArrayFallback.accuracy, 75);

  // totalTargets fallback to hits + misses numeric
  const missesNumFallback = K.finishSession({
    hits: 2,
    misses: 2
  });
  assert.equal(missesNumFallback.totalTargets, 4);
  assert.equal(missesNumFallback.accuracy, 50);

  // totalTargets fallback to hits alone
  const hitsAloneFallback = K.finishSession({ hits: 4 });
  assert.equal(hitsAloneFallback.totalTargets, 4);
  assert.equal(hitsAloneFallback.accuracy, 100);
});

test('getStreakMultiplier threshold boundaries and input robustness', () => {
  // Boundaries
  assert.equal(K.getStreakMultiplier(0), 1.0);
  assert.equal(K.getStreakMultiplier(1), 1.0);
  assert.equal(K.getStreakMultiplier(2), 1.0);
  assert.equal(K.getStreakMultiplier(3), 1.5);
  assert.equal(K.getStreakMultiplier(4), 1.5);
  assert.equal(K.getStreakMultiplier(5), 2.0);
  assert.equal(K.getStreakMultiplier(6), 2.0);
  assert.equal(K.getStreakMultiplier(7), 2.0);
  assert.equal(K.getStreakMultiplier(8), 3.0);
  assert.equal(K.getStreakMultiplier(10), 3.0);

  // Robustness (negative, null, undefined, NaN, invalid strings -> 1.0)
  assert.equal(K.getStreakMultiplier(-1), 1.0);
  assert.equal(K.getStreakMultiplier(-50), 1.0);
  assert.equal(K.getStreakMultiplier(null), 1.0);
  assert.equal(K.getStreakMultiplier(undefined), 1.0);
  assert.equal(K.getStreakMultiplier(NaN), 1.0);
  assert.equal(K.getStreakMultiplier('invalid'), 1.0);
  assert.equal(K.getStreakMultiplier(''), 1.0);
  assert.equal(K.getStreakMultiplier('three'), 1.0);
  assert.equal(K.getStreakMultiplier({}), 1.0);
});

test('point calculation Math.round(basePoints * multiplier) across tiers with base 100 and custom base points', () => {
  const words = [
    { word: 'w1', timeMs: 0 }, { word: 'w2', timeMs: 0 }, { word: 'w3', timeMs: 0 },
    { word: 'w4', timeMs: 0 }, { word: 'w5', timeMs: 0 }, { word: 'w6', timeMs: 0 },
    { word: 'w7', timeMs: 0 }, { word: 'w8', timeMs: 0 }
  ];

  // Base 100 across tiers: 100 (streak 1, 2), 150 (streak 3, 4), 200 (streak 5, 6, 7), 300 (streak 8)
  const session100 = K.createSession({ words, useStreakMultipliers: true });
  assert.equal(session100.tryVoice('w1', 100).points, 100);
  assert.equal(session100.tryVoice('w2', 100).points, 100);
  assert.equal(session100.tryVoice('w3', 100).points, 150);
  assert.equal(session100.tryVoice('w4', 100).points, 150);
  assert.equal(session100.tryVoice('w5', 100).points, 200);
  assert.equal(session100.tryVoice('w6', 100).points, 200);
  assert.equal(session100.tryVoice('w7', 100).points, 200);
  assert.equal(session100.tryVoice('w8', 100).points, 300);

  // Custom base points (e.g. 75) with getStreakMultiplier option passed
  const sessionCustom = K.createSession({
    words,
    basePoints: 75,
    getStreakMultiplier: K.getStreakMultiplier
  });
  assert.equal(sessionCustom.tryVoice('w1', 100).points, Math.round(75 * 1.0)); // 75
  assert.equal(sessionCustom.tryVoice('w2', 100).points, Math.round(75 * 1.0)); // 75
  assert.equal(sessionCustom.tryVoice('w3', 100).points, Math.round(75 * 1.5)); // 113
  assert.equal(sessionCustom.tryVoice('w4', 100).points, Math.round(75 * 1.5)); // 113
  assert.equal(sessionCustom.tryVoice('w5', 100).points, Math.round(75 * 2.0)); // 150
  assert.equal(sessionCustom.tryVoice('w6', 100).points, Math.round(75 * 2.0)); // 150
  assert.equal(sessionCustom.tryVoice('w7', 100).points, Math.round(75 * 2.0)); // 150
  assert.equal(sessionCustom.tryVoice('w8', 100).points, Math.round(75 * 3.0)); // 225

  // Custom base points (e.g. 120) with opts.useStreakMultipliers
  const session120 = K.createSession({
    words: words.slice(0, 3),
    basePoints: 120,
    useStreakMultipliers: true
  });
  assert.equal(session120.tryVoice('w1', 100).points, Math.round(120 * 1.0)); // 120
  assert.equal(session120.tryVoice('w2', 100).points, Math.round(120 * 1.0)); // 120
  assert.equal(session120.tryVoice('w3', 100).points, Math.round(120 * 1.5)); // 180
});

test('session streak progression and miss streak reset to 0 via skipCurrent and wrong tap', () => {
  const session = K.createSession({
    words: [
      { word: 'first', timeMs: 0 },
      { word: 'second', timeMs: 0 },
      { word: 'third', timeMs: 0 },
      { word: 'fourth', timeMs: 0 },
      { word: 'fifth', timeMs: 0 },
      { word: 'sixth', timeMs: 0 }
    ],
    useStreakMultipliers: true
  });

  // Progression: hit 1 and hit 2
  const h1 = session.tryVoice('first', 100);
  assert.equal(h1.ok, true);
  assert.equal(h1.streak, 1);
  assert.equal(session.state.streak, 1);

  const h2 = session.tryVoice('second', 100);
  assert.equal(h2.ok, true);
  assert.equal(h2.streak, 2);
  assert.equal(session.state.streak, 2);

  // Miss streak reset via skipCurrent
  const missSkip = session.skipCurrent('timeout');
  assert.equal(missSkip.ok, false);
  assert.equal(missSkip.streak, 0);
  assert.equal(session.state.streak, 0);

  // Next hit after skip starts streak back at 1
  const h3 = session.tryVoice('fourth', 100);
  assert.equal(h3.ok, true);
  assert.equal(h3.streak, 1);
  assert.equal(session.state.streak, 1);

  // Enable rhythm mode to test wrong tap reset
  session.enableFallback();
  assert.equal(session.state.mode, 'rhythm');

  // Correct rhythm tap continues streak to 2
  const tapHit = session.tryRhythmTap('fifth');
  assert.equal(tapHit.ok, true);
  assert.equal(tapHit.streak, 2);
  assert.equal(session.state.streak, 2);

  // Wrong tap resets streak to 0
  const wrongTap = session.tryRhythmTap('incorrect');
  assert.equal(wrongTap.ok, false);
  assert.equal(wrongTap.streak, 0);
  assert.equal(session.state.streak, 0);
});

test('finishSession reporting maxMultiplier across different streak levels and explicit override', () => {
  // Streak 0 -> 1.0
  const res0 = K.finishSession({ bestStreak: 0 });
  assert.equal(res0.maxMultiplier, 1.0);

  // Streak 3 -> 1.5
  const res3 = K.finishSession({ bestStreak: 3 });
  assert.equal(res3.maxMultiplier, 1.5);

  // Streak 6 -> 2.0
  const res6 = K.finishSession({ bestStreak: 6 });
  assert.equal(res6.maxMultiplier, 2.0);

  // Streak 8 -> 3.0
  const res8 = K.finishSession({ bestStreak: 8 });
  assert.equal(res8.maxMultiplier, 3.0);

  // Explicit maxMultiplier override on top-level sessionState
  const resOverride = K.finishSession({ bestStreak: 0, maxMultiplier: 4.5 });
  assert.equal(resOverride.maxMultiplier, 4.5);

  // Explicit maxMultiplier override on unwrapped st.maxMultiplier
  const resUnwrappedOverride = K.finishSession({
    state: { bestStreak: 1, maxMultiplier: 2.5 }
  });
  assert.equal(resUnwrappedOverride.maxMultiplier, 2.5);

  // Explicit maxMultiplier numeric string conversion
  const resStringOverride = K.finishSession({
    bestStreak: 2,
    maxMultiplier: '3.0'
  });
  assert.equal(resStringOverride.maxMultiplier, 3.0);
});


test('phonetic tolerance accepts single-letter error on long words via evaluatePhoneticMatch', () => {
  assert.equal(K.wordMatches('inevitabl', 'inevitable'), true);
  assert.ok(K.evaluatePhoneticMatch('inevitable', 'inevitabl') >= 0.8);
});

test('setPlaybackRate scales timing windows at 0.75x and 1.25x', () => {
  const session = K.createSession({
    words: [{ word: 'peace', timeMs: 1000, windowMs: 1500 }],
  });
  K.setPlaybackRate(session, 0.75);
  assert.ok(Math.abs(session.state.words[0].windowMs - K.scaleTimestamp(1500, 0.75)) < 0.01);
  K.setPlaybackRate(session, 1.25);
  assert.ok(Math.abs(session.state.words[0].windowMs - K.scaleTimestamp(1500, 1.25)) < 0.01);
});

test('setPlaybackRate exports are functions', () => {
  assert.equal(typeof K.setPlaybackRate, 'function');
  assert.equal(typeof K.scaleTimestamp, 'function');
  assert.equal(typeof K.evaluatePhoneticMatch, 'function');
});

test('teleprompter Amiram-word highlight invariant: syncs data-vocab-id and active state', () => {
  const line = 'We seek peace and comfort in the storm';
  const targets = [
    { id: 'v101', word: 'peace', he: 'שלום' },
    { id: 'v102', word: 'comfort', he: 'נחמה' }
  ];

  // Invariant 1: highlighted Amiram words contain exact data-vocab-id matching the vocab source
  const markup = K.highlightTeleprompterText(line, targets, 0);
  assert.ok(markup.includes('data-vocab-id="v101"'));
  assert.ok(markup.includes('data-vocab-id="v102"'));
  assert.ok(markup.includes('data-word="peace"'));
  assert.ok(markup.includes('data-word="comfort"'));

  // Invariant 2: only the active vocab index has is-active class
  assert.ok(markup.includes('<mark class="karaoke-amiram-word is-active" data-vocab-id="v101"'));
  assert.ok(markup.includes('<mark class="karaoke-amiram-word" data-vocab-id="v102"'));

  // Invariant 3: advance active word index
  const nextMarkup = K.highlightTeleprompterText(line, targets, 1);
  assert.ok(!nextMarkup.includes('data-vocab-id="v101">peace</mark class="karaoke-amiram-word is-active"'));
  assert.ok(nextMarkup.includes('<mark class="karaoke-amiram-word" data-vocab-id="v101"'));
  assert.ok(nextMarkup.includes('<mark class="karaoke-amiram-word is-active" data-vocab-id="v102"'));

  // Invariant 4: non-matching lines remain unchanged without spurious marks
  const plain = K.highlightTeleprompterText('No keywords here', targets, 0);
  assert.equal(plain, 'No keywords here');
});
