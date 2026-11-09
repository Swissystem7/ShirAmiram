// ShirAmiram — Unit Tests for Dual-Track Karaoke Finale
const test = require('node:test');
const assert = require('node:assert/strict');
const KaraokeFinale = require('../src/karaoke_finale.js');

test('1. createFinaleSession generates dual-track structure for original and familiar songs', () => {
  const session = KaraokeFinale.createFinaleSession({
    weakWords: ['crucial', 'undermine'],
    sunoSong: {
      title: 'Echoes of Mastery',
      lyrics: '[Verse]\nFacing challenges, it is crucial to stay strong.\nDo not let fear undermine your song.'
    },
    familiarSong: {
      title: 'Lose Yourself',
      artist: 'Eminem',
      youtube_id: '_Yhyp-_hX2s',
      spotify_id: '7lQ8MOhq6IN2w8Mgr6C34G',
      lyric_line: 'This opportunity comes once in a lifetime, it is crucial not to miss it'
    }
  });

  assert.ok(session != null);
  assert.equal(session.tracks.length, 2);
  assert.equal(session.tracks[0].type, 'invented_suno');
  assert.equal(session.tracks[0].title, 'Echoes of Mastery');
  assert.equal(session.tracks[1].type, 'familiar_popular');
  assert.equal(session.tracks[1].title, 'Lose Yourself');
  assert.deepEqual(session.targetWords, ['crucial', 'undermine']);
  assert.equal(session.status, 'ready');
});

test('2. scoreKaraokePerformance computes accurate word recognition rate and feedback', () => {
  const targetWords = ['crucial', 'undermine'];
  const expectedLyrics = 'It is crucial to stay strong and not undermine your path.';

  // Perfect match
  const spokenPerfect = 'it is crucial to stay strong and not undermine your path';
  const score1 = KaraokeFinale.scorePerformance(spokenPerfect, expectedLyrics, targetWords);
  assert.equal(score1.targetWordsHit, 2);
  assert.equal(score1.targetWordsTotal, 2);
  assert.equal(score1.targetScorePercent, 100);
  assert.ok(score1.passed);
  assert.ok(score1.feedbackHebrew.includes('מושלם'));

  // Partial match
  const spokenPartial = 'it is crucial to stay strong and do something else';
  const score2 = KaraokeFinale.scorePerformance(spokenPartial, expectedLyrics, targetWords);
  assert.equal(score2.targetWordsHit, 1);
  assert.equal(score2.targetScorePercent, 50);
});

test('3. Session state progression from Track 1 to Track 2 and Finale completion', () => {
  const session = KaraokeFinale.createFinaleSession({
    weakWords: ['deliberate']
  });

  assert.equal(session.currentTrackIndex, 0);
  const s1 = KaraokeFinale.advanceSession(session, { passed: true, score: 90 });
  assert.equal(s1.currentTrackIndex, 1);
  assert.equal(s1.status, 'track2_active');

  const s2 = KaraokeFinale.advanceSession(s1, { passed: true, score: 95 });
  assert.equal(s2.status, 'completed');
  assert.equal(s2.overallScore, 93); // rounded average of 90 & 95
});

test('4. Graceful handling of empty or malformed inputs', () => {
  const empty = KaraokeFinale.createFinaleSession(null);
  assert.equal(empty.targetWords.length, 0);
  assert.equal(empty.tracks.length, 2);

  const emptyScore = KaraokeFinale.scorePerformance('', '', []);
  assert.equal(emptyScore.targetScorePercent, 0);
  assert.equal(emptyScore.passed, false);
});
