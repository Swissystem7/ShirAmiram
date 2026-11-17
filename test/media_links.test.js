const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseMediaLink, parseStart } = require('../src/media_links.js');

const YT = 'dQw4w9WgXcQ';
const SP = '4uLU6hMCjMI75M1A2tKUQC';
const root = path.join(__dirname, '..');

test('YouTube watch, youtu.be, shorts, music, embed and live links', () => {
  const cases = [
    `https://www.youtube.com/watch?v=${YT}`,
    `https://youtube.com/watch?v=${YT}&feature=share`,
    `https://m.youtube.com/watch?v=${YT}`,
    `youtube.com/watch?v=${YT}`,
    `https://youtu.be/${YT}`,
    `https://youtu.be/${YT}?si=abc`,
    `https://www.youtube.com/shorts/${YT}`,
    `https://www.youtube.com/embed/${YT}`,
    `https://www.youtube.com/live/${YT}`,
    `https://www.youtube-nocookie.com/embed/${YT}`,
    YT
  ];
  for (const c of cases) {
    const r = parseMediaLink(c);
    assert.ok(r, c);
    assert.equal(r.provider, 'youtube', c);
    assert.equal(r.kind, 'video', c);
    assert.equal(r.id, YT, c);
    assert.equal(r.embedUrl, `https://www.youtube.com/embed/${YT}`, c);
    assert.equal(r.openUrl, `https://www.youtube.com/watch?v=${YT}`, c);
  }
  const music = parseMediaLink(`https://music.youtube.com/watch?v=${YT}&si=x`);
  assert.equal(music.embedUrl, `https://www.youtube.com/embed/${YT}`);
  assert.equal(music.openUrl, `https://music.youtube.com/watch?v=${YT}`);
  assert.equal(music.music, true);
  assert.equal(parseMediaLink(`https://youtu.be/${YT}`).music, false);
  assert.equal(parseMediaLink(`spotify:track:${SP}`).music, false);
});

test('YouTube start time is kept for the embed and the open link', () => {
  assert.equal(parseMediaLink(`https://youtu.be/${YT}?t=90`).embedUrl, `https://www.youtube.com/embed/${YT}?start=90`);
  const r = parseMediaLink(`https://www.youtube.com/watch?v=${YT}&t=1m30s`);
  assert.equal(r.start, 90);
  assert.equal(r.openUrl, `https://www.youtube.com/watch?v=${YT}&t=90`);
  assert.deepEqual(['90', '90s', '1m30s', '1h2m3s', '', 'abc', null].map(parseStart), [90, 90, 90, 3723, 0, 0, 0]);
});

test('YouTube playlists', () => {
  const list = 'PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG';
  for (const c of [`https://www.youtube.com/playlist?list=${list}`, `https://music.youtube.com/playlist?list=${list}`]) {
    const r = parseMediaLink(c);
    assert.equal(r.kind, 'playlist', c);
    assert.equal(r.embedUrl, `https://www.youtube.com/embed/videoseries?list=${list}`);
  }
  assert.equal(parseMediaLink(`https://music.youtube.com/playlist?list=${list}`).openUrl, `https://music.youtube.com/playlist?list=${list}`);
  // a watch link with both a video and a list plays the video
  assert.equal(parseMediaLink(`https://www.youtube.com/watch?v=${YT}&list=${list}`).kind, 'video');
});

test('Spotify track, album and playlist links and spotify: URIs', () => {
  for (const kind of ['track', 'album', 'playlist']) {
    for (const c of [
      `https://open.spotify.com/${kind}/${SP}`,
      `https://open.spotify.com/${kind}/${SP}?si=abc123`,
      `https://open.spotify.com/intl-he/${kind}/${SP}`,
      `https://open.spotify.com/embed/${kind}/${SP}`,
      `open.spotify.com/${kind}/${SP}`,
      `spotify:${kind}:${SP}`
    ]) {
      const r = parseMediaLink(c);
      assert.ok(r, c);
      assert.equal(r.provider, 'spotify', c);
      assert.equal(r.kind, kind, c);
      assert.equal(r.id, SP, c);
      assert.equal(r.embedUrl, `https://open.spotify.com/embed/${kind}/${SP}`, c);
      assert.equal(r.openUrl, `https://open.spotify.com/${kind}/${SP}`, c);
      assert.equal(r.height, kind === 'track' ? 152 : 352, c);
    }
  }
  assert.equal(parseMediaLink(SP).kind, 'track', 'a bare 22-character ID is a Spotify track');
});

test('anything else is rejected', () => {
  const bad = [
    '', '   ', null, undefined, 42, 'hello world',
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    `https://evil.example/watch?v=${YT}`,
    `https://youtube.com.evil.example/watch?v=${YT}`,
    'https://www.youtube.com/watch?v=short',
    `https://www.youtube.com/watch?v=${YT}"><img src=x>`,
    'https://www.youtube.com/channel/UC123',
    `https://open.spotify.com/artist/${SP}`,
    `https://open.spotify.com/track/${SP}x`,
    'https://open.spotify.com/track/abc',
    `spotify:artist:${SP}`,
    `ftp://youtube.com/watch?v=${YT}`,
    'x'.repeat(600)
  ];
  for (const b of bad) assert.equal(parseMediaLink(b), null, String(b).slice(0, 60));
});

test('returned URLs are rebuilt from the ID, never copied from the input', () => {
  const r = parseMediaLink(`https://www.youtube.com/watch?v=${YT}&x=<script>`);
  for (const u of [r.embedUrl, r.openUrl]) assert.match(u, /^https:\/\/[a-z.]+\/[A-Za-z0-9/?=&_-]+$/);
});

test('the songs screen has the link form and loads the parser', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  for (const id of ['media-link-form', 'media-link-input', 'media-link-status']) assert.ok(html.includes(`id="${id}"`), id);
  assert.match(html, /<script defer src="src\/media_links\.js"><\/script>/);
  assert.ok(sw.includes("'./src/media_links.js'"));
});

test('offline, the players show a message instead of an iframe', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.equal((html.match(/navigator\.onLine === false/g) || []).length, 2, 'song cards and pasted links both check');
  assert.match(html, /אין חיבור לרשת, ולכן הנגן לא נטען/);
  assert.match(html, /status\.append\(offline \? /);
});
