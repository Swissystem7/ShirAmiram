#!/usr/bin/env node
// ShirAmiram — Popular Song Lyrics Curator CLI / Automation script
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const vocabPath = path.join(root, 'data/imports/amiram_vocab_full.json');
const mentionsPath = path.join(root, 'data/imports/popular_song_mentions.json');

const vocab = JSON.parse(fs.readFileSync(vocabPath, 'utf8'));
const mentions = JSON.parse(fs.readFileSync(mentionsPath, 'utf8'));

const coveredWords = new Set(mentions.map(m => m.word.toLowerCase()));
const missing = vocab.filter(v => !coveredWords.has(v.word.toLowerCase()));

console.log('==============================================');
console.log(' ShirAmiram Popular Song Mentions Curator Report');
console.log('==============================================');
console.log(`Total Amiram Words: ${vocab.length}`);
console.log(`Current Popular Song Mentions: ${mentions.length}`);
console.log(`Covered Unique Words: ${coveredWords.size}`);
console.log(`Coverage: ${Math.round((coveredWords.size / vocab.length) * 100)}%`);
console.log(`Pending Enrichment: ${missing.length} words`);
console.log('----------------------------------------------');

if (process.argv.includes('--summary')) {
  process.exit(0);
}

console.log('Sample pending words for agent lyric mining:');
missing.slice(0, 10).forEach((w, i) => {
  console.log(` ${i + 1}. ${w.word} (${w.level}) — ${w.hebrew_translation}`);
});
