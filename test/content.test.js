// Task H — deterministic tests for content_v2, recommendations, platforms, timing, layout.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const A = require('../app.js');
const root = path.join(__dirname, '..');
const rawBytes = fs.readFileSync(path.join(root, 'data/imports/content_v2.json'));
const raw = JSON.parse(rawBytes);
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const C = A.validateContent(raw);

test('import hash and counts preserved', () => {
  assert.equal(crypto.createHash('sha256').update(rawBytes).digest('hex'), 'f9a5ebe87c8e0275dbbbce29cd0d1620a1f7f485b71b85dd17fb474747f5e4fd');
  assert.equal(C.songs.length, 30); assert.equal(C.questions.length, 50); assert.ok(C.words.length >= 100);
  assert.deepEqual(C.errors, []);
});

test('exam coverage is full_vocabulary_50; youtube ids validated when present', () => {
  assert.equal(C.examCoverage, 'full_vocabulary_50');
  C.songs.forEach(s => {
    if (s.youtube_id == null) {
      assert.equal(s.youtube_url, null);
      assert.equal(A.youtubeEmbedUrl(s.youtube_id), null);
      assert.equal(A.youtubeMusicLink(s).kind, 'search');
    } else {
      assert.match(String(s.youtube_id), /^[A-Za-z0-9_-]{11}$/);
      assert.equal(s.youtube_url, 'https://www.youtube.com/watch?v=' + s.youtube_id);
      assert.equal(A.youtubeEmbedUrl(s.youtube_id), 'https://www.youtube.com/embed/' + s.youtube_id);
      assert.equal(A.youtubeMusicLink(s).kind, 'direct');
    }
  });
  assert.equal(A.validateContent({ songs: [], questions: [] }).examCoverage, 'unknown');
});

test('all resolved youtube_id values match ^[a-zA-Z0-9_-]{11}$', () => {
  const ids = C.songs.map(s => s.youtube_id).filter(Boolean);
  assert.ok(ids.length >= 1, 'expected at least one youtube_id');
  ids.forEach(id => assert.match(String(id), /^[a-zA-Z0-9_-]{11}$/));
  // Prefer full coverage: when enrichment succeeded for all 30, enforce it.
  if (ids.length === 30) {
    C.songs.forEach(s => assert.match(String(s.youtube_id), /^[a-zA-Z0-9_-]{11}$/));
  }
});

test('spotify only from validated IDs', () => {
  C.songs.forEach(s => { assert.equal(A.spotifyEmbedUrl(s.spotify_id), 'https://open.spotify.com/embed/track/' + s.spotify_id); assert.equal(A.spotifyTrackUrl(s.spotify_id), s.spotify_url); });
  assert.equal(A.spotifyEmbedUrl('bad id!'), null); assert.equal(A.spotifyEmbedUrl(null), null);
  assert.equal(A.youtubeEmbedUrl('dQw4w9WgXcQ'), 'https://www.youtube.com/embed/dQw4w9WgXcQ');
});

test('recommendations deterministic with explicit reasons', () => {
  const r1 = A.recommendSongs(C.songs, ['peace', 'hope'], 5);
  const r2 = A.recommendSongs(C.songs, ['PEACE', ' hope '], 5);
  assert.deepEqual(r1.map(x => x.song.id), r2.map(x => x.song.id));
  assert.ok(r1[0].score >= r1[1].score); assert.ok(r1[0].reasons[0].includes('peace') || r1[0].reasons[0].includes('hope'));
  assert.deepEqual(A.recommendSongs(C.songs, ['zzzz'], 3).map(x => x.score), [0, 0, 0]);
});

test('questions valid and loader uses injected fetch', async () => {
  C.questions.forEach(q => assert.equal(q.options.filter(o => o === q.answer).length, 1));
  const loaded = await A.loadContent(async () => ({ ok: true, json: async () => raw }));
  assert.equal(loaded.songs.length, 30);
  await assert.rejects(() => A.loadContent(async () => ({ ok: false })));
});

test('LRC/JSON timing and active line', () => {
  const lrc = A.parseLRC('[00:05.00]hello peace\n[00:00.00]start\nbad line');
  assert.deepEqual(lrc.map(l => l.time), [0, 5]); assert.equal(A.activeTimedLine(lrc, 4.9), 0); assert.equal(A.activeTimedLine(lrc, 5), 1); assert.equal(A.activeTimedLine(lrc, -1), -1);
  assert.deepEqual(A.parseTimingData('{"lines":[{"time":2,"text":"b"},{"time":1,"text":"a"}]}').map(l => l.text), ['a', 'b']);
  assert.deepEqual(A.parseTimingData([{ time: -1, text: 'x' }]), []);
});

test('audio validation and Suno export is pending/manual, original only', () => {
  assert.equal(A.validateAudioFile({ name: 'x.mp3', type: '' }).ok, true);
  assert.equal(A.validateAudioFile({ name: 'x.txt', type: 'text/plain' }).ok, false);
  const ex = A.buildSunoExport(C.words.slice(0, 3));
  assert.equal(ex.generation, 'pending_manual'); assert.ok(ex.lyrics.length > 0); assert.ok(ex.note.includes('No Suno generation'));
});

test('mobile quiz layout contract in CSS and constants', () => {
  assert.ok(A.QUIZ_LAYOUT.gapPx >= 12 && A.QUIZ_LAYOUT.minTapPx >= 44);
  assert.match(html, /\.quiz-opts\{display:grid;grid-template-columns:minmax\(0,1fr\);gap:12px/);
  assert.match(html, /\.quiz-opt\{min-height:44px;width:100%/);
  assert.match(html, /quiz-opts/);
  assert.match(html, /id="songs"/); assert.match(html, /data-tab="songs"/);
  assert.match(html, /id="embed-tab-spotify"/); assert.match(html, /id="embed-tab-youtube"/);
  assert.match(html, /id="quiz-mode-quick"/); assert.match(html, /id="quiz-mode-full"/); assert.match(html, /quiz-progress/);
  assert.doesNotMatch(html, /youtube\.com\/embed\/[A-Za-z0-9_-]{11}/); // no hardcoded embed id in markup
});
