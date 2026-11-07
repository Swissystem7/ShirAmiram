// ShirAmiram — Unit Tests for Spaced Repetition Flashcards (Leitner SRS Engine)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SRS = require('../src/srs_leitner.js');
const root = path.join(__dirname, '..');
const jsonPath = path.join(root, 'data/imports/amiram_vocab_full.json');
const vocab = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

test('1. initProgress initializes card in Box 1 with 0 reviews', () => {
  const now = new Date('2026-11-07T12:00:00Z');
  const prog = SRS.initProgress(101, now);
  assert.equal(prog.wordId, '101');
  assert.equal(prog.box, 1);
  assert.equal(prog.dueAt, now.toISOString());
  assert.equal(prog.reviewCount, 0);
  assert.equal(prog.correctCount, 0);
});

test('2. "again" resets card to Box 1 immediately', () => {
  const now = new Date('2026-11-07T12:00:00Z');
  const existing = { wordId: '101', box: 4, reviewCount: 5, correctCount: 4 };
  const next = SRS.calculateNextState(existing, 'again', now);
  assert.equal(next.box, 1);
  assert.equal(next.dueAt, now.toISOString());
  assert.equal(next.reviewCount, 6);
  assert.equal(next.correctCount, 4);
});

test('3. "hard" stays in current box with shortened interval', () => {
  const now = new Date('2026-11-07T12:00:00Z');
  const existing = { wordId: '101', box: 3, reviewCount: 2, correctCount: 2 };
  const next = SRS.calculateNextState(existing, 'hard', now);
  assert.equal(next.box, 3);
  const due = new Date(next.dueAt);
  assert.ok(due > now);
  assert.equal(next.reviewCount, 3);
});

test('4. "good" advances one box with standard interval', () => {
  const now = new Date('2026-11-07T12:00:00Z');
  const existing = { wordId: '101', box: 2, reviewCount: 2, correctCount: 2 };
  const next = SRS.calculateNextState(existing, 'good', now);
  assert.equal(next.box, 3);
  const diffDays = Math.round((new Date(next.dueAt) - now) / (24 * 3600 * 1000));
  assert.equal(diffDays, 3); // Box 3 interval is 3 days
  assert.equal(next.correctCount, 3);
});

test('5. "easy" advances two boxes capped at Box 5', () => {
  const now = new Date('2026-11-07T12:00:00Z');
  const existing = { wordId: '101', box: 2, reviewCount: 2, correctCount: 2 };
  const next = SRS.calculateNextState(existing, 'easy', now);
  assert.equal(next.box, 4);

  const existing4 = { wordId: '101', box: 4, reviewCount: 5, correctCount: 5 };
  const next5 = SRS.calculateNextState(existing4, 'easy', now);
  assert.equal(next5.box, 5); // Capped at Box 5
  const diffDays = Math.round((new Date(next5.dueAt) - now) / (24 * 3600 * 1000));
  assert.equal(diffDays, 14); // Box 5 interval is 14 days
});

test('6. createSession prioritizes overdue cards then new cards', () => {
  const now = new Date('2026-11-07T12:00:00Z');
  const past = new Date('2026-11-05T12:00:00Z');
  const future = new Date('2026-11-10T12:00:00Z');

  const progressMap = {
    '1': { wordId: '1', box: 2, dueAt: past.toISOString() }, // overdue
    '2': { wordId: '2', box: 3, dueAt: future.toISOString() } // not due
  };

  const session = SRS.createSession(vocab, progressMap, { now, batchSize: 5 });
  assert.equal(session.length, 5);
  assert.equal(session[0].id, 1, 'First card must be overdue card #1');
  assert.ok(!session.some(c => c.id === 2), 'Future card #2 must not be in session');
});

test('7. createSession filters accurately by level A, B, and C', () => {
  const sessionA = SRS.createSession(vocab, {}, { level: 'A', batchSize: 10 });
  assert.equal(sessionA.length, 10);
  assert.ok(sessionA.every(c => c.level === 'A_foundational'));

  const sessionB = SRS.createSession(vocab, {}, { level: 'B', batchSize: 10 });
  assert.equal(sessionB.length, 10);
  assert.ok(sessionB.every(c => c.level === 'B_intermediate'));

  const sessionC = SRS.createSession(vocab, {}, { level: 'C', batchSize: 10 });
  assert.equal(sessionC.length, 10);
  assert.ok(sessionC.every(c => c.level === 'C_advanced'));
});

test('8. loadState handles corrupted or empty storage gracefully', () => {
  const mockCorruptStorage = {
    getItem: () => 'invalid-json{{{',
    setItem: () => {}
  };
  const state = SRS.loadState(mockCorruptStorage);
  assert.equal(state.version, 1);
  assert.deepEqual(state.cards, {});
});
