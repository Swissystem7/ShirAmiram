'use strict';
// check:assets - every audio/image file the app refers to must exist on disk.
// Scans src/**/*.js (as asked), plus the shipped entry files (index.html, app.js, manifest.json,
// sw.js), css/**/*.css and data/**/*.json, for quoted paths and CSS url()s that end in an audio or
// image extension (.lrc timing files included). Comments are ignored. A template path such as
// `assets/audio/suno_${n}.mp3` is checked for its folder only.
// Paths are resolved from the site root (the folder of index.html); CSS url()s from the CSS file.
// PENDING lists folders whose files are produced later on purpose; missing files there are counted
// and shown, but do not fail the run.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const EXT = 'mp3|wav|ogg|oga|m4a|aac|flac|lrc|png|jpe?g|svg|webp|gif|ico|avif';
const PENDING = {
  'assets/audio/':
    'Suno songs: data/suno_prompts/generated_songs.json lists them, src/suno_generator.js names them, and index.html plays one only when checkAudioAvailability() finds it',
  'assets/timing/': 'karaoke .lrc timings for the same Suno songs, produced together with the audio',
};

function walk(dir, re) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((e) => {
    const rel = path.posix.join(dir, e.name);
    if (e.isDirectory()) return walk(rel, re);
    return re.test(e.name) ? [rel] : [];
  });
}

function sources() {
  const entry = ['index.html', 'app.js', 'manifest.json', 'sw.js'].filter((f) => fs.existsSync(path.join(ROOT, f)));
  return [...walk('src', /\.js$/), ...entry, ...walk('css', /\.css$/), ...walk('data', /\.json$/)];
}

function stripComments(text, file) {
  if (/\.json$/.test(file)) return text;
  const blank = (m) => m.replace(/[^\n]/g, '');
  let out = text.replace(/\/\*[\s\S]*?\*\//g, blank).replace(/<!--[\s\S]*?-->/g, blank);
  out = out.replace(/^\s*\/\/.*$/gm, '');
  return out;
}

const lineOf = (text, index) => text.slice(0, index).split('\n').length;
const isRemote = (p) => /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(p);

const refs = [];
for (const file of sources()) {
  const text = stripComments(fs.readFileSync(path.join(ROOT, file), 'utf8'), file);
  const quoted = new RegExp('([\'"`])((?:\\$\\{[^}]*\\}|[^\'"`\\s<>])*?\\.(?:' + EXT + '))(?:[?#][^\'"`\\s]*)?\\1', 'gi');
  for (const m of text.matchAll(quoted)) refs.push({ file, ref: m[2], line: lineOf(text, m.index), css: false });
  if (/\.css$/.test(file) || /\.html$/.test(file)) {
    for (const m of text.matchAll(new RegExp('url\\(\\s*([^\'")\\s]+\\.(?:' + EXT + '))\\s*\\)', 'gi'))) {
      refs.push({ file, ref: m[1], line: lineOf(text, m.index), css: /\.css$/.test(file) });
    }
  }
}

let ok = 0;
const missing = [];
const pending = [];
for (const r of refs) {
  if (isRemote(r.ref) || r.ref.startsWith('data:')) continue;
  const template = r.ref.indexOf('${');
  const clean = (template >= 0 ? r.ref.slice(0, r.ref.lastIndexOf('/', template) + 1) : r.ref).replace(/^\.\//, '');
  if (!clean) continue;
  const base = r.css ? path.dirname(path.join(ROOT, r.file)) : ROOT;
  const target = clean.startsWith('/') ? path.join(ROOT, clean) : path.join(base, clean);
  const rel = path.relative(ROOT, target).split(path.sep).join('/') + (template >= 0 ? '/' : '');
  if (fs.existsSync(target)) {
    ok += 1;
    continue;
  }
  const slot = Object.keys(PENDING).find((d) => rel.startsWith(d));
  (slot ? pending : missing).push({ ...r, rel, slot });
}

console.log('check:assets: ' + refs.length + ' audio/image reference(s) in ' + sources().length + ' file(s): ' + ok + ' found, ' + pending.length + ' pending (allowed), ' + missing.length + ' missing');
const bySlot = {};
for (const p of pending) bySlot[p.slot] = (bySlot[p.slot] || 0) + 1;
for (const [slot, n] of Object.entries(bySlot)) console.log('  pending  ' + slot + '  ' + n + ' reference(s): ' + PENDING[slot]);
for (const m of missing) console.error('  MISSING  ' + m.file + ':' + m.line + '  ' + m.ref + '  -> ' + m.rel);
if (missing.length) process.exitCode = 1;
