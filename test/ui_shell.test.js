const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const shell = require('../src/ui_shell.js');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'songbook.css'), 'utf8');

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

test('theme helpers default to light and toggle both ways', () => {
  assert.equal(shell.normalizeTheme(null), 'light');
  assert.equal(shell.normalizeTheme('dark'), 'dark');
  assert.equal(shell.nextTheme('light'), 'dark');
  assert.equal(shell.nextTheme('dark'), 'light');
  assert.equal(shell.nextTheme(undefined), 'dark');
});

test('index.html loads the songbook theme after style.css and wires the shell', () => {
  assert.ok(html.indexOf('css/style.css') < html.indexOf('css/songbook.css'));
  assert.match(html, /<nav id="bottom-nav"/);
  assert.match(html, /<button id="theme-toggle"[^>]*min-height:44px/);
  assert.match(html, /src="src\/ui_shell\.js"/);
});

test('songbook.css defines the same tokens for light and dark', () => {
  const block = (sel) => css.slice(css.indexOf(sel)).match(/\{([^}]*)\}/)[1];
  const names = (b) => [...b.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]);
  const light = names(block(':root[data-theme="light"]'));
  const dark = names(block(':root[data-theme="dark"]'));
  for (const token of dark) assert.ok(light.includes(token), `${token} defined in light`);
  for (const token of ['--bg', '--surface', '--ink', '--accent', '--mark', '--ok', '--bad']) {
    assert.ok(dark.includes(token), `${token} defined in dark`);
  }
});
