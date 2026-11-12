const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const shell = require('../src/ui_shell.js');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'volt.css'), 'utf8');

test('every main tab in index.html belongs to exactly one bottom-nav group', () => {
  const nav = html.match(/<nav[^>]*aria-label="מסכים"[^>]*>([\s\S]*?)<\/nav>/)[1];
  const tabs = [...nav.matchAll(/data-tab="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(tabs.length >= 8);
  for (const tab of tabs) {
    const owners = shell.GROUPS.filter((g) => g.tabs.includes(tab));
    assert.equal(owners.length, 1, `tab ${tab} has ${owners.length} groups`);
    assert.equal(shell.groupForTab(tab), owners[0]);
  }
  const grouped = shell.GROUPS.flatMap((g) => g.tabs);
  for (const tab of grouped) assert.ok(tabs.includes(tab), `group tab ${tab} exists in index.html`);
});

test('bottom nav has at most five destinations and unknown tabs have no group', () => {
  assert.ok(shell.GROUPS.length <= 5);
  assert.equal(shell.groupForTab('nope'), null);
});

test('theme helpers default to dark and toggle both ways', () => {
  assert.equal(shell.normalizeTheme(null), 'dark');
  assert.equal(shell.normalizeTheme('light'), 'light');
  assert.equal(shell.nextTheme('light'), 'dark');
  assert.equal(shell.nextTheme('dark'), 'light');
  assert.equal(shell.nextTheme(undefined), 'light');
});

test('index.html loads the volt theme after style.css and wires the shell', () => {
  assert.ok(html.indexOf('css/style.css') < html.indexOf('css/volt.css'));
  assert.match(html, /<nav id="bottom-nav"/);
  assert.match(html, /<button id="theme-toggle"[^>]*min-height:44px/);
  assert.match(html, /src="src\/ui_shell\.js"/);
});

test('volt.css defines the same colour tokens for light and dark', () => {
  const block = (sel) => css.slice(css.indexOf(sel)).match(/\{([^}]*)\}/)[1];
  const names = (b) => [...b.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]);
  const light = names(block(':root[data-theme="light"]'));
  const dark = names(block(':root[data-theme="dark"]'));
  // Dark is the base block; light must redefine every colour, shadow and glow token.
  const themed = dark.filter((t) => !/^--(s\d|r-|nav-h|display|sans|cover-\d)/.test(t));
  for (const token of themed) assert.ok(light.includes(token), `${token} defined in light`);
  for (const token of ['--bg', '--surface', '--ink', '--accent', '--accent-text', '--mark', '--ok', '--bad']) {
    assert.ok(dark.includes(token), `${token} defined in dark`);
  }
});

test('practice hub cards point at real tabs and controls', () => {
  const cards = [...html.matchAll(/<button[^>]*class="hub-card"[^>]*>/g)].map((m) => m[0]);
  assert.ok(cards.length >= 3);
  for (const card of cards) {
    const tab = card.match(/data-hub-tab="([^"]+)"/)[1];
    assert.match(html, new RegExp('<section id="' + tab + '"'));
    const click = card.match(/data-hub-click="([^"]+)"/);
    if (click) assert.match(html, new RegExp('id="' + click[1] + '"'));
  }
});

test('hero and mini player are wired to the existing play button', () => {
  for (const id of ['song-hero', 'hero-play', 'mini-player', 'mini-play', 'mini-open', 'btn-play', 'seek', 'timer']) {
    assert.match(html, new RegExp('id="' + id + '"'), id);
  }
});

test('stripEmoji removes pictographs and keeps Hebrew, English and punctuation', () => {
  assert.equal(shell.stripEmoji('\u{1F3AF} מילים מומלצות לחיזוק'), 'מילים מומלצות לחיזוק');
  assert.equal(shell.stripEmoji('▶️'), '');
  assert.equal(shell.stripEmoji('אמיר״ם: 50% (A–C) → ok'), 'אמיר״ם: 50% (A–C) → ok');
});

test('scoreToPercent maps the 50–150 scale onto 0–100 and tolerates junk', () => {
  assert.equal(shell.scoreToPercent('50'), 0);
  assert.equal(shell.scoreToPercent('112'), 62);
  assert.equal(shell.scoreToPercent(150), 100);
  assert.equal(shell.scoreToPercent(999), 100);
  assert.equal(shell.scoreToPercent('—'), 0);
});
