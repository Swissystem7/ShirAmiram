'use strict';
// check:css - css/tailwind.css must be what `npm run build:css` produces from the current markup.
// Builds into a temp file with the same Tailwind (devDependency) and config, then compares.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'shiramiram-css-')), 'tailwind.css');
const cli = path.join(ROOT, 'node_modules', '.bin', 'tailwindcss');
const r = spawnSync(cli, ['-c', 'tailwind.config.js', '-i', 'css/tailwind.src.css', '-o', out, '--minify'], { cwd: ROOT, encoding: 'utf8' });
if (r.status !== 0) {
  console.error('check:css: tailwind build failed\n' + r.stderr);
  process.exit(1);
}
const fresh = fs.readFileSync(out, 'utf8');
const committed = fs.readFileSync(path.join(ROOT, 'css', 'tailwind.css'), 'utf8');
if (fresh !== committed) {
  console.error('check:css: css/tailwind.css is stale (classes changed). Run: npm run build:css');
  process.exit(1);
}
console.log('check:css: css/tailwind.css is up to date (' + committed.length + ' bytes)');
