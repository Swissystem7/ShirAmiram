// ShirAmiram — Unit Tests for Amiram Exam Simulator
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const Exam = require('../src/exam_simulator.js');
const root = path.join(__dirname, '..');
const jsonPath = path.join(root, 'data/imports/amiram_vocab_full.json');
const vocab = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

test('1. pickDistractors returns exact count of unique candidates distinct from target', () => {
  const target = vocab[0];
  const distractors = Exam.pickDistractors(target, vocab, 3);
  assert.equal(distractors.length, 3);
  assert.ok(!distractors.includes(target.word.toLowerCase()));
  const unique = new Set(distractors);
  assert.equal(unique.size, 3);
});

test('2. pickDistractors prioritizes same part of speech when available', () => {
  const nounItem = vocab.find(w => w.part_of_speech === 'noun');
  assert.ok(nounItem, 'Expected at least one noun in vocab');
  const distractors = Exam.pickDistractors(nounItem, vocab, 3);
  const distractorRecords = vocab.filter(w => distractors.includes(w.word.toLowerCase()));
  const nounDistractors = distractorRecords.filter(w => w.part_of_speech === 'noun');
  assert.ok(nounDistractors.length >= 2, 'Expected most distractors to share noun part of speech');
});

test('3. buildQuestion creates cloze blank and 4 unique options containing the answer', () => {
  const wordItem = vocab[5];
  const q = Exam.buildQuestion(wordItem, vocab);
  assert.ok(q.question.includes('______'), 'Question must contain cloze blank ______');
  assert.equal(q.answer, wordItem.word.toLowerCase());
  assert.equal(q.options.length, 4);
  const uniqueOptions = new Set(q.options);
  assert.equal(uniqueOptions.size, 4, 'Options must be unique');
  assert.ok(q.options.includes(q.answer), 'Options must include correct answer');
  assert.ok(q.explanation.length > 0, 'Explanation must be populated');
  assert.ok(/[\u0590-\u05FF]/.test(q.explanation), 'Explanation must contain Hebrew');
});

test('4. createExam with mode "mixed_25" yields exactly 25 questions across A, B, and C', () => {
  const exam = Exam.createExam(vocab, 'mixed_25');
  assert.equal(exam.length, 25);
  const countA = exam.filter(q => q.level === 'A_foundational').length;
  const countB = exam.filter(q => q.level === 'B_intermediate').length;
  const countC = exam.filter(q => q.level === 'C_advanced').length;
  assert.equal(countA, 8);
  assert.equal(countB, 9);
  assert.equal(countC, 8);
  assert.equal(countA + countB + countC, 25);
});

test('5. createExam filters strictly by level for A, B, and C modes', () => {
  const examA = Exam.createExam(vocab, 'A', 15);
  assert.equal(examA.length, 15);
  assert.ok(examA.every(q => q.level === 'A_foundational'));

  const examB = Exam.createExam(vocab, 'B', 15);
  assert.equal(examB.length, 15);
  assert.ok(examB.every(q => q.level === 'B_intermediate'));

  const examC = Exam.createExam(vocab, 'C', 15);
  assert.equal(examC.length, 15);
  assert.ok(examC.every(q => q.level === 'C_advanced'));
});

test('6. createExam handles empty or invalid vocab gracefully', () => {
  assert.deepEqual(Exam.createExam([], 'mixed_25'), []);
  assert.deepEqual(Exam.createExam(null, 'mixed_25'), []);
  assert.deepEqual(Exam.createExam(undefined, 'mixed_25'), []);
});

test('7. every generated question across 300 words is well-formed', () => {
  const allQuestions = vocab.map(w => Exam.buildQuestion(w, vocab));
  assert.equal(allQuestions.length, 300);
  allQuestions.forEach(q => {
    assert.ok(q.question.includes('______'), `Missing cloze for ${q.word}`);
    assert.equal(q.options.length, 4, `Options length != 4 for ${q.word}`);
    assert.ok(q.options.includes(q.answer), `Options missing answer for ${q.word}`);
  });
});
