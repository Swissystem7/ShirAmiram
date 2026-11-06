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
