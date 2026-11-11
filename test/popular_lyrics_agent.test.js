// ShirAmiram — Unit Tests for Popular Song Lyrics Memory Agent
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const Agent = require('../src/popular_lyrics_agent.js');
const root = path.join(__dirname, '..');
const mentionsPath = path.join(root, 'data/imports/popular_song_mentions.json');
const mentionsData = JSON.parse(fs.readFileSync(mentionsPath, 'utf8'));

test('1. Agent initializes and validates popular song mentions catalog', () => {
  assert.ok(Array.isArray(mentionsData));
  assert.ok(mentionsData.length >= 15);

  mentionsData.forEach((m, idx) => {
    assert.ok(m.word && typeof m.word === 'string', `Missing word at ${idx}`);
    assert.ok(m.song_title && typeof m.song_title === 'string', `Missing title at ${idx}`);
    assert.ok(m.artist && typeof m.artist === 'string', `Missing artist at ${idx}`);
    assert.ok(m.lyric_line && typeof m.lyric_line === 'string', `Missing lyric at ${idx}`);
    assert.ok(m.youtube_id && /^[A-Za-z0-9_-]{11}$/.test(m.youtube_id), `Invalid youtube_id at ${idx}`);
    assert.ok(m.spotify_id && /^[A-Za-z0-9]{22}$/.test(m.spotify_id), `Invalid spotify_id at ${idx}`);
  });
});

test('2. findMentionsForWord returns exact matches and handles case/trim', () => {
  const agent = new Agent(mentionsData);

  const res1 = agent.findMentionsForWord('CRUCIAL');
  assert.ok(res1.length >= 1);
  assert.equal(res1[0].word, 'crucial');
  assert.equal(res1[0].artist, 'Eminem');

  const res2 = agent.findMentionsForWord('  inevitable  ');
  assert.ok(res2.length >= 1);
  assert.equal(res2[0].artist, 'Linkin Park');

  const resEmpty = agent.findMentionsForWord('nonexistentword123');
  assert.deepEqual(resEmpty, []);
});

test('3. getWeakWordMentions groups and ranks mentions for learner weak words', () => {
  const agent = new Agent(mentionsData);
  const weakWords = ['crucial', 'undermine', 'unknown_xyz', 'deliberate'];

  const results = agent.getWeakWordMentions(weakWords);
  assert.equal(results.totalWeakWords, 4);
  assert.equal(results.coveredCount, 3);
  assert.equal(results.uncoveredCount, 1);
  assert.ok(results.mentions.crucial != null);
  assert.ok(results.mentions.undermine != null);
  assert.ok(results.mentions.deliberate != null);
  assert.equal(results.mentions.unknown_xyz, null);
});

test('4. formatMnemonicCard produces mobile-optimized responsive card data', () => {
  const agent = new Agent(mentionsData);
  const mention = agent.findMentionsForWord('crucial')[0];
  const card = agent.formatMnemonicCard(mention);

  assert.ok(card.html != null);
  assert.ok(card.html.includes('Lose Yourself'));
  assert.ok(card.html.includes('Eminem'));
  assert.ok(card.html.includes('data-youtube-id="_Yhyp-_hX2s"'));
  assert.ok(card.html.includes('data-spotify-id="7lQ8MOhq6IN2w8Mgr6C34G"'));
  assert.ok(card.highlightedLyric.includes('<mark class="target-word">crucial</mark>'));
});

test('5. Non-mutating behavior on frozen inputs and graceful malformed handling', () => {
  const agent = new Agent(mentionsData);
  const frozenList = Object.freeze(['crucial', 'subtle']);

  const r1 = agent.getWeakWordMentions(frozenList);
  const r2 = agent.getWeakWordMentions(frozenList);
  assert.deepEqual(r1, r2);

  assert.deepEqual(agent.findMentionsForWord(null), []);
  assert.deepEqual(agent.getWeakWordMentions(null), {
    totalWeakWords: 0,
    coveredCount: 0,
    uncoveredCount: 0,
    coverageRate: 0,
    mentions: {},
    uncoveredList: []
  });
});

test('6. Genius explanation and annotation metadata exist on all 70 catalog entries', () => {
  assert.ok(mentionsData.length >= 70, `Expected >= 70 songs, got ${mentionsData.length}`);
  const agent = new Agent(mentionsData);

  mentionsData.forEach((m, idx) => {
    assert.ok(m.genre && typeof m.genre === 'string', `Missing genre at ${idx}`);
    assert.ok(m.genius_url && m.genius_url.startsWith('https://genius.com/'), `Invalid genius_url at ${idx}`);
    assert.ok(m.genius_annotation && m.genius_annotation.length > 20, `Missing genius_annotation at ${idx}`);
  });

  const mention = agent.findMentionsForWord('crucial')[0];
  const genius = agent.getGeniusExplanation(mention);
  assert.equal(genius.word, 'crucial');
  assert.ok(genius.geniusUrl.startsWith('https://genius.com/'));
  assert.ok(genius.annotationHe.includes('Lose Yourself'));
  assert.ok(genius.html.includes('הסבר Genius'));
});

test('7. buildGenrePlaylist maximizes unique Amiram target words per musical genre', () => {
  const agent = new Agent(mentionsData);
  const genres = agent.getAvailableGenres();
  assert.ok(genres.length >= 5);

  const rockPl = agent.buildGenrePlaylist({
    genre: 'Rock',
    targetWords: ['achieve', 'conflict', 'authority', 'evidence'],
    maxTracks: 6
  });
  assert.equal(rockPl.genre, 'Rock');
  assert.equal(rockPl.tracks.length, 6);
  assert.ok(rockPl.totalUniqueWords >= 10, `Expected >= 10 unique words covered in 6 tracks, got ${rockPl.totalUniqueWords}`);
  assert.ok(rockPl.weakWordsCovered.includes('achieve'));
  assert.ok(rockPl.youtubePlaylistUrl.startsWith('https://www.youtube.com/watch_videos?video_ids='));
  assert.equal(rockPl.spotifyTrackUrls.length, 6);
  rockPl.tracks.forEach(t => {
    assert.equal(t.genre, 'Rock');
    assert.ok(t.geniusExplanation.length > 10);
  });
});
