// knip config: static site without bundler.
// Browser entry points are the <script src> tags in the HTML pages, so they are
// collected from the HTML at run time instead of being hard-coded here.
const fs = require('node:fs');
const path = require('node:path');

const HTML_DIRS = ['.'];

function scriptsFromHtml() {
  const found = new Set();
  for (const dir of HTML_DIRS) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith('.html')) continue;
      const html = fs.readFileSync(path.join(dir, name), 'utf8');
      for (const m of html.matchAll(/<script[^>]*\ssrc=["']([^"'?#]+\.m?js)["']/g)) {
        if (/^(https?:)?\/\//.test(m[1])) continue;
        const rel = path.posix.normalize(path.posix.join(dir, m[1].replace(/^\//, '')));
        if (fs.existsSync(rel)) found.add(rel);
      }
    }
  }
  return [...found].sort();
}

module.exports = {
  $schema: 'https://unpkg.com/knip@6/schema.json',
  entry: [...scriptsFromHtml(), ...['sw.js', 'test/**/*.js']],
  project: ['*.js', 'src/**/*.js', 'test/**/*.js'],
};
