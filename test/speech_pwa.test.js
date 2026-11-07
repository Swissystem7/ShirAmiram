// ShirAmiram — Unit Tests for Universal Speech & Offline PWA Contract
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const Speech = require('../src/speech.js');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const manifestRaw = fs.readFileSync(path.join(root, 'manifest.json'), 'utf8');
const manifest = JSON.parse(manifestRaw);
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

test('1. Speech helper handles node/non-browser environment gracefully without throwing', () => {
  assert.equal(Speech.canSpeak(), false);
  assert.equal(Speech.speak(''), false);
  assert.equal(Speech.speak('hello'), false);
  assert.doesNotThrow(() => Speech.stopSpeaking());
});

test('2. Speech settings can be stored and retrieved with defaults', () => {
  const mockStorage = {
    _data: {},
    getItem(k) { return this._data[k]; },
    setItem(k, v) { this._data[k] = String(v); }
  };

  const defaults = Speech.getSettings(mockStorage);
  assert.equal(defaults.rate, 0.9);
  assert.equal(defaults.lang, 'en-US');

  Speech.saveSettings({ rate: 1.1, lang: 'en-GB' }, mockStorage);
  const updated = Speech.getSettings(mockStorage);
  assert.equal(updated.rate, 1.1);
  assert.equal(updated.lang, 'en-GB');
});

test('3. manifest.json complies with PWA installability requirements', () => {
  assert.ok(manifest.name && manifest.name.includes('ShirAmiram'));
  assert.ok(manifest.short_name);
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.start_url);
  assert.ok(manifest.theme_color);
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2);
  manifest.icons.forEach(icon => {
    assert.ok(icon.src);
    assert.ok(icon.sizes);
    assert.ok(icon.type);
  });
});

test('4. sw.js defines static asset precache including all 300 words data and scripts', () => {
  assert.match(sw, /CACHE_NAME\s*=/);
  assert.match(sw, /amiram_vocab_full\.json/);
  assert.match(sw, /speech\.js/);
  assert.match(sw, /analytics\.js/);
  assert.match(sw, /srs_leitner\.js/);
  assert.match(sw, /caches\.match/);
});

test('5. index.html links manifest.json and loads speech.js', () => {
  assert.match(html, /<link rel="manifest" href="manifest\.json">/);
  assert.match(html, /<script src="src\/speech\.js"><\/script>/);
});
