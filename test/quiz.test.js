// Exam coverage — 50 vocabulary cloze questions
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const A = require('../app.js');
const root = path.join(__dirname, '..');
const raw = JSON.parse(fs.readFileSync(path.join(root, 'data/imports/content_v2.json'), 'utf8'));
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/style.css'), 'utf8');
const C = A.validateContent(raw);

test('exactly 50 questions cover 50 distinct words', () => {
  assert.equal(C.questions.length, 50);
  assert.equal(C.examCoverage, 'full_vocabulary_50');
  const words = C.questions.map((q) => String(q.word || q.word_id).toLowerCase());
  assert.equal(new Set(words).size, 50);
  C.questions.forEach((q) => {
    assert.equal(typeof q.id, 'number');
    assert.ok(q.song_id >= 1 && q.song_id <= 30);
    assert.match(String(q.question), /_{3,}/);
    assert.ok(q.explanation && /[֐-׿]/.test(q.explanation));
  });
});

test('every question has a correct answer among distinct options (no repeats)', () => {
  C.questions.forEach((q) => {
    assert.equal(q.options.length, 4);
    assert.equal(new Set(q.options).size, 4, 'q' + q.id + ' repeats an option');
    assert.equal(q.options.filter((o) => o === q.answer).length, 1);
    assert.equal(String(q.answer).toLowerCase(), String(q.word || q.word_id).toLowerCase());
  });
});

test('quiz UI exposes quick/full modes and counter copy', () => {
  assert.match(html, /מבחן מהיר \(10 שאלות\)/);
  assert.match(html, /מבחן מלא \(50 שאלות\)/);
  assert.match(html, /שאלה.*מתוך/);
  assert.match(html, /id="quiz-mode-quick"/);
  assert.match(html, /id="quiz-mode-full"/);
  assert.match(html, /id="quiz-progress"/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(html, /\.quiz-opts\{display:grid;grid-template-columns:minmax\(0,1fr\);gap:12px/);
  assert.match(html, /\.quiz-opt\{min-height:44px/);
});
