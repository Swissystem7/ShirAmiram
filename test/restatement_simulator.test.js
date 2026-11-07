// ShirAmiram — Unit Tests for Amiram Restatement Simulator Engine
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const Restatements = require('../src/restatement_simulator.js');
const root = path.join(__dirname, '..');
const jsonPath = path.join(root, 'data/imports/amiram_restatements.json');
const items = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

test('1. amiram_restatements.json contains 30 questions with 10 in each level A, B, and C', () => {
  assert.equal(items.length, 30);
  const countA = items.filter(i => i.difficulty === 'A_foundational').length;
  const countB = items.filter(i => i.difficulty === 'B_intermediate').length;
  const countC = items.filter(i => i.difficulty === 'C_advanced').length;
  assert.equal(countA, 10);
  assert.equal(countB, 10);
  assert.equal(countC, 10);
});

test('2. Every question has source sentence, Hebrew explanation, grammar target, and 4 options', () => {
  items.forEach((item, idx) => {
    assert.ok(item.source_sentence && item.source_sentence.trim().length > 10, `Item ${idx} missing source sentence`);
    assert.ok(item.explanation_he && item.explanation_he.trim().length > 10, `Item ${idx} missing explanation`);
    assert.ok(/[\u0590-\u05FF]/.test(item.explanation_he), `Item ${idx} explanation must be in Hebrew`);
    assert.ok(item.grammar_target, `Item ${idx} missing grammar target`);
    assert.equal(item.options.length, 4, `Item ${idx} must have exactly 4 options`);

    const correctCount = item.options.filter(o => o.is_correct).length;
    assert.equal(correctCount, 1, `Item ${idx} must have exactly 1 correct option`);

    const distractors = item.options.filter(o => !o.is_correct);
    distractors.forEach(d => {
      assert.ok(d.error_type, `Distractor in item ${idx} must have error_type`);
    });
  });
});

test('3. createSession filters accurately by level and mixed_15 mode', () => {
  const sessionA = Restatements.createSession(items, { mode: 'A' });
  assert.equal(sessionA.length, 10);
  assert.ok(sessionA.every(q => q.difficulty === 'A_foundational'));

  const sessionB = Restatements.createSession(items, { mode: 'B' });
  assert.equal(sessionB.length, 10);
  assert.ok(sessionB.every(q => q.difficulty === 'B_intermediate'));

  const sessionC = Restatements.createSession(items, { mode: 'C' });
  assert.equal(sessionC.length, 10);
  assert.ok(sessionC.every(q => q.difficulty === 'C_advanced'));

  const sessionMixed = Restatements.createSession(items, { mode: 'mixed_15' });
  assert.equal(sessionMixed.length, 15);
  const mixA = sessionMixed.filter(q => q.difficulty === 'A_foundational').length;
  const mixB = sessionMixed.filter(q => q.difficulty === 'B_intermediate').length;
  const mixC = sessionMixed.filter(q => q.difficulty === 'C_advanced').length;
  assert.equal(mixA, 5);
  assert.equal(mixB, 5);
  assert.equal(mixC, 5);
});

test('4. evaluateAnswer accurately identifies correct choice and distractor error type', () => {
  const item = items[0];
  const correctIdx = item.options.findIndex(o => o.is_correct);
  const wrongIdx = item.options.findIndex(o => !o.is_correct);

  const evalCorrect = Restatements.evaluateAnswer(item, correctIdx);
  assert.equal(evalCorrect.isCorrect, true);
  assert.equal(evalCorrect.error_type, null);
  assert.ok(evalCorrect.grammarCategory.length > 0);

  const evalWrong = Restatements.evaluateAnswer(item, wrongIdx);
  assert.equal(evalWrong.isCorrect, false);
  assert.ok(evalWrong.error_type != null);
  assert.equal(evalWrong.correctIndex, correctIdx);
});

test('5. getGrammarCategories surfaces distinct Hebrew category names', () => {
  const cats = Restatements.getGrammarCategories(items);
  assert.ok(cats.length >= 10);
  cats.forEach(c => {
    assert.ok(c.key);
    assert.ok(/[\u0590-\u05FF]/.test(c.name));
  });
});
