// index.html loads its scripts with defer so the first paint does not wait for them. The start-up
// order must stay what it was with plain <script> tags: every file, then the page script, then the
// DOMContentLoaded init of progress_ui.js and ui_shell.js.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

test('every local script in index.html is deferred, except the inline theme and page scripts', () => {
  const external = [...HTML.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/g)].map((m) => m[0]);
  assert.ok(external.length > 20);
  for (const tag of external) assert.match(tag, /^<script defer src="/, tag);
});

test('the page script starts on DOMContentLoaded, and opens on the song tab that ui_shell.js shows', () => {
  const start = HTML.indexOf("document.addEventListener('DOMContentLoaded', () => {\n    const A = window.ShirAmiram;");
  assert.ok(start > 0, 'page script waits for DOMContentLoaded');
  const tail = HTML.slice(HTML.lastIndexOf('</script>\n</body>') - 80);
  assert.match(tail, /showTab\('song'\);\n {4}paint\(\);\n {2}\}\);\n<\/script>/);
});

function runDeferred(file, readyState, deferred) {
  const listeners = [];
  const doc = {
    readyState,
    currentScript: deferred ? { defer: true } : null,
    addEventListener: (type, fn) => listeners.push([type, fn]),
    querySelector: () => null,
    getElementById: () => null,
    documentElement: { getAttribute: () => null, setAttribute() {} },
  };
  // progress_ui.js needs its tracker to be present; init only runs later, so the stub is never called
  const sandbox = { console, document: doc, setTimeout: () => 0, ShirAmiramProgress: { load: () => ({}) } };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file });
  return listeners.filter(([type]) => type === 'DOMContentLoaded').length;
}

test('progress_ui.js and ui_shell.js wait for DOMContentLoaded when deferred, as they did while loading', () => {
  for (const file of ['src/progress_ui.js', 'src/ui_shell.js']) {
    assert.equal(runDeferred(file, 'loading', false), 1, file + ' while loading');
    assert.equal(runDeferred(file, 'interactive', true), 1, file + ' when deferred');
  }
});
