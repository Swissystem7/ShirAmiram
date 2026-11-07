// ShirAmiram — Unit Tests for Amiram Score Estimator & Analytics Engine
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const Analytics = require('../src/analytics.js');
const root = path.join(__dirname, '..');
const jsonPath = path.join(root, 'data/imports/amiram_vocab_full.json');
const vocab = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

test('1. estimateCefr maps score ranges to official academic exemption levels', () => {
  assert.equal(Analytics.estimateCefr(145).cefr, 'C1');
  assert.equal(Analytics.estimateCefr(145).academicLevel, 'פטור');
  assert.equal(Analytics.estimateCefr(125).cefr, 'B2');
  assert.equal(Analytics.estimateCefr(125).academicLevel, 'מתקדמים ב\'');
  assert.equal(Analytics.estimateCefr(105).cefr, 'B1');
  assert.equal(Analytics.estimateCefr(90).cefr, 'A2');
  assert.equal(Analytics.estimateCefr(60).cefr, 'Pre-A2');
});

test('2. calculateAmiramScore returns bounded score (50-150) with confidence indicator', () => {
  const emptyRes = Analytics.calculateAmiramScore({}, vocab);
  assert.ok(emptyRes.score >= 50 && emptyRes.score <= 150);
  assert.equal(emptyRes.sampleSize, 0);
  assert.match(emptyRes.confidence, /ראשוני/);

  // High performance state
  const highState = {
    attempts: Array.from({ length: 50 }, (_, i) => ({
      cardId: String(i + 1),
      mode: 'cloze',
      correct: true,
      at: '2026-11-07T12:00:00Z'
    })),
    cards: {}
  };
  vocab.forEach(w => {
    highState.cards[String(w.id)] = { box: 5 };
  });

  const highRes = Analytics.calculateAmiramScore(highState, vocab);
  assert.ok(highRes.score >= 130 && highRes.score <= 150);
  assert.equal(highRes.confidence, 'גבוהה');
});

test('3. summarizeMastery accurately categorizes words across A, B, and C levels', () => {
  const wordA = vocab.find(w => w.level === 'A_foundational');
  const wordA2 = vocab.filter(w => w.level === 'A_foundational')[1];
  const wordB = vocab.find(w => w.level === 'B_intermediate');
  const wordC = vocab.find(w => w.level === 'C_advanced');

  const cards = {
    [String(wordA.id)]: { box: 5 }, // Mastered (Level A)
    [String(wordA2.id)]: { box: 3 }, // Learning (Level A)
    [String(wordB.id)]: { box: 4 }, // Mastered (Level B)
    [String(wordC.id)]: { box: 2 }  // Learning (Level C)
  };

  const summary = Analytics.summarizeMastery(vocab, cards);
  assert.equal(summary.A.total, 100);
  assert.equal(summary.B.total, 100);
  assert.equal(summary.C.total, 100);
  assert.equal(summary.overall.total, 300);

  assert.equal(summary.A.mastered, 1);
  assert.equal(summary.A.learning, 1);
  assert.equal(summary.A.unseen, 98);
  assert.equal(summary.B.mastered, 1);
  assert.equal(summary.C.learning, 1);
  assert.equal(summary.overall.mastered, 2);
});

test('4. recordAttempt tracks cloze failures and demotes card to box 1', () => {
  let state = { version: 1, cards: { '5': { box: 4 } }, attempts: [] };
  state = Analytics.recordAttempt(state, 5, 'cloze', false);

  assert.equal(state.attempts.length, 1);
  assert.equal(state.attempts[0].correct, false);
  assert.equal(state.cards['5'].box, 1, 'Cloze mistake must demote to box 1');
  assert.equal(state.cards['5'].clozeIncorrect, 1);
});

test('5. buildReviewQueue prioritizes words with most errors', () => {
  const state = {
    version: 1,
    cards: {
      '1': { box: 1, clozeIncorrect: 3 },
      '2': { box: 1, clozeIncorrect: 1 },
      '3': { box: 4, clozeIncorrect: 0 }
    }
  };

  const queue = Analytics.buildReviewQueue(state, vocab, 5);
  assert.ok(queue.length >= 2);
  assert.equal(queue[0].id, 1, 'Card with 3 mistakes must be first');
  assert.equal(queue[1].id, 2, 'Card with 1 mistake must be second');
});
