// ShirAmiram — Mobile UI/UX contract: dark theme, pill nav, 44px+ tap targets, zero horizontal scroll, PWA wiring
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'style.css'), 'utf8');

const MIN_TAP = 44;

function inlineSizes(source, prop) {
  const re = new RegExp(`${prop}\\s*:\\s*(\\d+(?:\\.\\d+)?)px`, 'g');
  const found = [];
  let m = re.exec(source);
  while (m) {
    found.push({ value: Number(m[1]), index: m.index });
    m = re.exec(source);
  }
  return found;
}

function buttonTags(source) {
  return source.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) || [];
}

test('1. no inline min-height below 44px overrides the tap-target rule (index.html + app.js)', () => {
  for (const [name, src] of [
    ['index.html', html],
    ['app.js', appJs],
  ]) {
    const tooSmall = inlineSizes(src, 'min-height').filter((s) => s.value < MIN_TAP);
    assert.deepEqual(
      tooSmall.map((s) => `${name}@${s.index}:${s.value}px`),
      [],
      `${name} has inline min-height below ${MIN_TAP}px`,
    );
  }
});

test('2. icon-only buttons (🔊 / ▶️) reserve a 44x44 tap area', () => {
  const iconOnly = buttonTags(html).filter((tag) => {
    const label = tag
      .replace(/<button\b[^>]*>/, '')
      .replace(/<\/button>/, '')
      .trim();
    return label === '🔊' || label === '▶️';
  });
  assert.ok(iconOnly.length >= 2, 'expected icon-only speak/play buttons in the UI');
  for (const tag of iconOnly) {
    const h = inlineSizes(tag, 'min-height');
    const w = inlineSizes(tag, 'min-width');
    assert.ok(h.length && h[0].value >= MIN_TAP, `missing 44px height: ${tag.slice(0, 80)}`);
    assert.ok(w.length && w[0].value >= MIN_TAP, `missing 44px width: ${tag.slice(0, 80)}`);
  }
});

test('3. header play button is a full-size tap target', () => {
  const tag = buttonTags(html).find((t) => /id="btn-play"/.test(t));
  assert.ok(tag, 'btn-play exists');
  assert.ok(inlineSizes(tag, 'min-height')[0].value >= MIN_TAP);
});

test('4. pill navigation: every main tab is a tab-btn with aria-pressed, styled as a 44px pill', () => {
  const navMatch = html.match(/<nav[^>]*aria-label="מסכים"[^>]*>([\s\S]*?)<\/nav>/);
  assert.ok(navMatch, 'main nav exists');
  const tabs = buttonTags(navMatch[1]);
  assert.ok(tabs.length >= 6, 'nav has the main screens');
  for (const tab of tabs) {
    assert.match(tab, /class="[^"]*\btab-btn\b/);
    assert.match(tab, /data-tab="[a-z]+"/);
    assert.match(tab, /aria-pressed="(true|false)"/);
    assert.match(tab, /type="button"/);
  }
  const tabRule = css.match(/\.tab-btn\s*\{([^}]*)\}/);
  assert.ok(tabRule, '.tab-btn rule exists');
  assert.match(tabRule[1], /min-height:\s*44px/);
  assert.match(tabRule[1], /border-radius:\s*var\(--radius-pill\)/);
  const navRule = css.match(/nav\[aria-label="מסכים"\]\s*\{([^}]*)\}/);
  assert.ok(navRule, 'nav rule exists');
  assert.match(navRule[1], /flex-wrap:\s*wrap/, 'tabs wrap instead of scrolling horizontally');
});

test('5. zero horizontal scroll: viewport meta is responsive and root clips overflow-x', () => {
  const viewport = html.match(/<meta name="viewport" content="([^"]+)"/);
  assert.ok(viewport);
  assert.match(viewport[1], /width=device-width/);
  assert.doesNotMatch(viewport[1], /user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?!\.)/);
  assert.match(css, /html,\s*body\s*\{[^}]*overflow-x:\s*hidden/);
});

test('6. dark theme palette + glassmorphism are wired', () => {
  for (const color of ['#0f172a', '#1e293b', '#6366f1']) {
    assert.ok(css.includes(color), `style.css defines ${color}`);
    assert.ok(html.includes(color), `index.html uses ${color}`);
  }
  assert.match(css, /backdrop-filter:\s*blur\(/);
  // The browser chrome follows the Volt base colour since the v2 redesign.
  assert.match(html, /<meta name="theme-color" content="#0B0C10">/);
});

test('7. PWA: service worker registered from the UI with a guarded feature check', () => {
  assert.match(html, /'serviceWorker' in navigator/);
  assert.match(html, /navigator\.serviceWorker\.register\('\.\/sw\.js'\)/);
});
