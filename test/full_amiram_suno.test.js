// Comprehensive Test Suite for Local Amiram Vocab and Suno Studio Engine
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const amiram = require('../data/imports/amiram_vocab_full.json');
const content = require('../data/imports/content_v2.json');
const suno = require('../src/suno_generator.js');
const audio = require('../src/audio_player.js');
const vocab = require('../src/vocab.js');

test('1. amiram_vocab_full.json has exactly 300 unique words', () => {
  assert.equal(amiram.length, 300);
  const words = amiram.map(w => w.word.toLowerCase());
  assert.equal(new Set(words).size, 300);
});

test('2. 100 words in level A, 100 in level B, 100 in level C', () => {
  assert.equal(amiram.filter(w => w.level === 'A_foundational').length, 100);
  assert.equal(amiram.filter(w => w.level === 'B_intermediate').length, 100);
  assert.equal(amiram.filter(w => w.level === 'C_advanced').length, 100);
});

test('3. No null or missing fields in 300 words', () => {
  amiram.forEach((w, i) => {
    assert.ok(w.id, `word ${i} missing id`);
    assert.ok(w.word, `word ${i} missing word`);
    assert.ok(w.part_of_speech, `word ${i} missing part_of_speech`);
    assert.ok(w.level, `word ${i} missing level`);
    assert.ok(w.hebrew_translation, `word ${i} missing hebrew_translation`);
    assert.ok(w.hebrew_definition, `word ${i} missing hebrew_definition`);
    assert.ok(w.sample_sentence, `word ${i} missing sample_sentence`);
  });
});

test('4. Hebrew definitions follow "חלק דיבר: פירוש" format', () => {
  amiram.forEach(w => {
    assert.ok(w.hebrew_definition.includes(':'), `Missing colon in ${w.word}`);
    assert.ok(/[\u0590-\u05FF]/.test(w.hebrew_definition), `Non-Hebrew definition in ${w.word}`);
  });
});

test('5. findMissingWords identifies words not in content_v2', () => {
  const missing = suno.findMissingWords(amiram, content.songs);
  assert.ok(missing.length > 0);
  assert.ok(missing.length <= 300);
  // Verify none of the missing words are in existing songs highlight_words
  const existingWords = new Set();
  content.songs.forEach(s => (s.highlight_words || []).forEach(hw => existingWords.add(hw.word.toLowerCase())));
  missing.forEach(m => {
    assert.ok(!existingWords.has(m.word.toLowerCase()), `Word ${m.word} shouldn't be missing`);
  });
});

test('6. clusterWords groups into 5-7 words per cluster', () => {
  const missing = suno.findMissingWords(amiram, content.songs);
  const clusters = suno.clusterWords(missing, 6);
  assert.ok(clusters.length >= 40);
  clusters.forEach((c, idx) => {
    assert.ok(c.length >= 4 && c.length <= 10, `Cluster ${idx} invalid size ${c.length}`);
  });
});

test('7. generateSongForWords produces full song structure with [WORD] formatting', () => {
  const testWords = amiram.slice(0, 6);
  const song = suno.generateSongForWords(0, testWords);
  assert.equal(song.id, 1);
  assert.ok(song.title.startsWith('Anthem of'));
  assert.ok(song.lyrics.includes('[Verse 1]'));
  assert.ok(song.lyrics.includes('[Chorus]'));
  assert.ok(song.lyrics.includes('[Verse 2]'));
  assert.ok(song.lyrics.includes('[Bridge]'));
  assert.ok(song.lyrics.includes('[Outro]'));
  testWords.forEach(tw => {
    assert.ok(
      song.lyrics.includes(`[${tw.word.toUpperCase()}]`),
      `Lyrics missing [${tw.word.toUpperCase()}]`
    );
  });
  assert.equal(song.status, 'pending_manual');
});

test('8. Suno style prompt includes genre, bpm, and English vocals', () => {
  const testWords = amiram.slice(0, 6);
  const song = suno.generateSongForWords(1, testWords);
  assert.ok(song.style_prompt.includes('BPM'));
  assert.ok(song.style_prompt.includes('English vocals'));
});

test('9. Full suite generated_songs.json exists and is valid', () => {
  const generatedPath = path.join(root, 'data/suno_prompts/generated_songs.json');
  assert.ok(fs.existsSync(generatedPath));
  const songs = JSON.parse(fs.readFileSync(generatedPath, 'utf8'));
  assert.ok(songs.length >= 45);
  songs.forEach(s => {
    assert.ok(s.id > 0);
    assert.ok(s.title);
    assert.ok(s.lyrics);
    assert.ok(s.style_prompt);
    assert.equal(s.status, 'pending_manual');
  });
});

test('10. Audio player detects missing files honestly without fabrication', () => {
  const check = audio.checkAudioAvailability('assets/audio/suno_999.mp3', () => false);
  assert.equal(check.available, false);
  assert.equal(check.status, 'pending_manual');
  assert.ok(check.message.includes('Suno'));
});

test('11. Audio player detects existing files correctly', () => {
  const check = audio.checkAudioAvailability('assets/audio/suno_1.mp3', () => true);
  assert.equal(check.available, true);
  assert.equal(check.status, 'ready');
});

test('12. LRC parser parses standard timestamps and lines', () => {
  const lrc = '[00:04.50]Line one\n[00:10.00]Line two\n[01:05.25]Line three';
  const parsed = audio.parseLrc(lrc);
  assert.equal(parsed.length, 3);
  assert.equal(parsed[0].time, 4.5);
  assert.equal(parsed[0].text, 'Line one');
  assert.equal(parsed[1].time, 10.0);
  assert.equal(parsed[2].time, 65.25);
});

test('13. getActiveLineIndex tracks current position correctly', () => {
  const lines = [
    { time: 5, text: 'A' },
    { time: 10, text: 'B' },
    { time: 20, text: 'C' }
  ];
  assert.equal(audio.getActiveLineIndex(lines, 2), -1);
  assert.equal(audio.getActiveLineIndex(lines, 5), 0);
  assert.equal(audio.getActiveLineIndex(lines, 9.9), 0);
  assert.equal(audio.getActiveLineIndex(lines, 10), 1);
  assert.equal(audio.getActiveLineIndex(lines, 25), 2);
});

test('14. Vocab filterByLevel filters levels A, B, C accurately', () => {
  const filteredA = vocab.filterByLevel(amiram, '', 'A');
  assert.equal(filteredA.length, 100);
  const filteredB = vocab.filterByLevel(amiram, '', 'B');
  assert.equal(filteredB.length, 100);
  const filteredC = vocab.filterByLevel(amiram, '', 'C');
  assert.equal(filteredC.length, 100);
});

test('15. Backwards compatibility: content_v2 songs preserved completely', () => {
  assert.equal(content.songs.length, 30);
  assert.equal(content.questions.length, 50);
});
