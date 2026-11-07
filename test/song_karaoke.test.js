// ShirAmiram — Unit Tests for 30-Song Interactive Karaoke Teleprompter Engine
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const Karaoke = require('../src/song_karaoke.js');
const root = path.join(__dirname, '..');
const content = JSON.parse(fs.readFileSync(path.join(root, 'data/imports/content_v2.json'), 'utf8'));
const vocab = JSON.parse(fs.readFileSync(path.join(root, 'data/imports/amiram_vocab_full.json'), 'utf8'));

test('1. parseLRC correctly parses timestamps into seconds and text', () => {
  const lrc = '[00:00.00] Intro\n[00:04.50] She found peace\n[00:09.00] Wisdom is power';
  const parsed = Karaoke.parseLRC(lrc);
  assert.equal(parsed.length, 3);
  assert.equal(parsed[0].time, 0);
  assert.equal(parsed[0].text, 'Intro');
  assert.equal(parsed[1].time, 4.5);
  assert.equal(parsed[1].text, 'She found peace');
  assert.equal(parsed[2].time, 9);
});

test('2. getActiveLineIndex tracks current line position deterministically', () => {
  const lines = [
    { time: 0 },
    { time: 4.5 },
    { time: 9.0 }
  ];
  assert.equal(Karaoke.getActiveLineIndex(lines, -1), -1);
  assert.equal(Karaoke.getActiveLineIndex(lines, 0), 0);
  assert.equal(Karaoke.getActiveLineIndex(lines, 4.4), 0);
  assert.equal(Karaoke.getActiveLineIndex(lines, 4.5), 1);
  assert.equal(Karaoke.getActiveLineIndex(lines, 7.0), 1);
  assert.equal(Karaoke.getActiveLineIndex(lines, 9.5), 2);
});

test('3. tokenizeLine annotates target words while preserving whitespace and punctuation', () => {
  const targetWords = [{ word: 'peace', he: 'שלום' }];
  const line = 'She found peace while resting.';
  const tokens = Karaoke.tokenizeLine(line, targetWords);
  assert.ok(tokens.length >= 5);
  const peaceToken = tokens.find(t => t.text === 'peace');
  assert.ok(peaceToken, 'peace token must exist');
  assert.equal(peaceToken.isTarget, true);
  assert.equal(peaceToken.wordData.he, 'שלום');

  const sheToken = tokens.find(t => t.text === 'She');
  assert.equal(sheToken.isTarget, false);
});

test('4. buildSongKaraokeIndex indexes all 30 songs from content_v2.json without error', () => {
  assert.equal(content.songs.length, 30);
  content.songs.forEach((song, idx) => {
    const songIndex = Karaoke.buildSongKaraokeIndex(song, vocab);
    assert.ok(songIndex != null, `Song ${idx} failed to index`);
    assert.equal(songIndex.songId, song.id);
    assert.ok(songIndex.title && songIndex.title.length > 0);
    assert.ok(songIndex.lines.length >= 1, `Song ${song.id} must have lines`);
    assert.ok(songIndex.durationSec > 0);

    songIndex.lines.forEach((l, lIdx) => {
      assert.ok(l.id);
      assert.ok(l.text && l.text.length > 0, `Song ${song.id} line ${lIdx} empty`);
      assert.ok(l.tokens.length > 0);
    });
  });
});

test('5. trackEvent records learning events in storage safely', () => {
  const mockStorage = {
    _data: {},
    getItem(k) { return this._data[k]; },
    setItem(k, v) { this._data[k] = String(v); }
  };
  const res = Karaoke.trackEvent('word_inspected', { word: 'peace' }, mockStorage);
  assert.equal(res, true);
  const events = JSON.parse(mockStorage.getItem(Karaoke.TRACKING_KEY));
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'word_inspected');
  assert.equal(events[0].word, 'peace');
});
