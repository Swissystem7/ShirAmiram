// ShirAmiram — Unit Tests for Real YouTube & Spotify Media Player
const test = require('node:test');
const assert = require('node:assert/strict');
const MediaPlayer = require('../src/media_player.js');

test('1. MediaPlayer provides unified API for YouTube, Spotify and Fallback Audio', () => {
  const player = new MediaPlayer();
  assert.equal(typeof player.loadYouTube, 'function');
  assert.equal(typeof player.loadSpotify, 'function');
  assert.equal(typeof player.play, 'function');
  assert.equal(typeof player.pause, 'function');
  assert.equal(typeof player.seekTo, 'function');
  assert.equal(typeof player.getState, 'function');
});

test('2. YouTube ID validation and embed URL generation', () => {
  assert.equal(MediaPlayer.isValidYouTubeId('dQw4w9WgXcQ'), true);
  assert.equal(MediaPlayer.isValidYouTubeId('invalid_id'), false);
  assert.equal(MediaPlayer.isValidYouTubeId(null), false);

  const embedUrl = MediaPlayer.getYouTubeEmbedUrl('dQw4w9WgXcQ', { autoplay: 1, start: 45 });
  assert.ok(embedUrl.includes('https://www.youtube.com/embed/dQw4w9WgXcQ'));
  assert.ok(embedUrl.includes('autoplay=1'));
  assert.ok(embedUrl.includes('start=45'));
});

test('3. Spotify ID validation and embed/track URL generation', () => {
  const validId = '4cOdK2wGLETKBW3PvgPWqT';
  assert.equal(MediaPlayer.isValidSpotifyId(validId), true);
  assert.equal(MediaPlayer.isValidSpotifyId('short'), false);
  assert.equal(MediaPlayer.isValidSpotifyId(null), false);

  const embedUrl = MediaPlayer.getSpotifyEmbedUrl(validId);
  assert.equal(embedUrl, `https://open.spotify.com/embed/track/${validId}`);

  const trackUrl = MediaPlayer.getSpotifyTrackUrl(validId);
  assert.equal(trackUrl, `https://open.spotify.com/track/${validId}`);
});

test('4. Player state transitions and event dispatching', () => {
  const player = new MediaPlayer();
  const events = [];
  player.on('stateChange', state => events.push(state));

  player.loadFallback({ duration: 30 });
  assert.equal(player.getState().mode, 'fallback');
  assert.equal(player.getState().duration, 30);

  player.play();
  assert.equal(player.getState().isPlaying, true);

  player.pause();
  assert.equal(player.getState().isPlaying, false);

  player.seekTo(15);
  assert.equal(player.getState().currentTime, 15);
  assert.ok(events.length >= 3);
});

test('5. Graceful handling of invalid media loads', () => {
  const player = new MediaPlayer();
  const resYt = player.loadYouTube('invalid_id');
  assert.equal(resYt.ok, false);
  assert.ok(resYt.error != null);

  const resSp = player.loadSpotify('invalid_id');
  assert.equal(resSp.ok, false);
  assert.ok(resSp.error != null);
});

test('6. Playlist queue management (loadPlaylist, nextTrack, prevTrack) and YouTube watch_videos URL', () => {
  const player = new MediaPlayer();
  const sampleTracks = [
    { word: 'crucial', song_title: 'Lose Yourself', artist: 'Eminem', youtube_id: '_Yhyp-_hX2s', spotify_id: '7lQ8MOhq6IN2w8Mgr6C34G', timestamp_sec: 33 },
    { word: 'achieve', song_title: 'We Are The Champions', artist: 'Queen', youtube_id: '04854XqcfCY', spotify_id: '7ccI98COWII0ALOPVmHGnn', timestamp_sec: 48 }
  ];

  const loadRes = player.loadPlaylist(sampleTracks, 'youtube');
  assert.equal(loadRes.ok, true);
  assert.equal(loadRes.playlistIndex, 0);
  assert.equal(loadRes.totalTracks, 2);
  assert.equal(player.getState().currentId, '_Yhyp-_hX2s');

  const plState = player.getPlaylistState();
  assert.equal(plState.totalTracks, 2);
  assert.equal(plState.youtubePlaylistUrl, 'https://www.youtube.com/watch_videos?video_ids=_Yhyp-_hX2s,04854XqcfCY');

  const nextRes = player.nextTrack();
  assert.equal(nextRes.ok, true);
  assert.equal(nextRes.playlistIndex, 1);
  assert.equal(player.getState().currentId, '04854XqcfCY');

  const prevRes = player.prevTrack();
  assert.equal(prevRes.ok, true);
  assert.equal(prevRes.playlistIndex, 0);
  assert.equal(player.getState().currentId, '_Yhyp-_hX2s');
});
