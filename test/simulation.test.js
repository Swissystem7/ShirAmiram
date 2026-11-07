// ShirAmiram — Unit Tests for Amiram Practice Simulation Engine
// Practice approximation only: not official exam scoring or exemption.
const test = require('node:test');
const assert = require('node:assert/strict');

const Sim = require('../src/simulation.js');

function makePool(n = 30) {
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    question: `Question ${i + 1}?`,
    options: [`answer-${i + 1}`, `wrong-${i + 1}a`, `wrong-${i + 1}b`],
    answer: `answer-${i + 1}`,
    explanation: `Explanation ${i + 1}`
  }));
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return function () {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

test('1. calculateAmiramScore extremes: 25/25=150 and 0/25=50', () => {
  assert.equal(Sim.calculateAmiramScore(25, 25), 150);
  assert.equal(Sim.calculateAmiramScore(25), 150);
  assert.equal(Sim.calculateAmiramScore(0, 25), 50);
  assert.equal(Sim.calculateAmiramScore(0), 50);
});

test('2. calculateAmiramScore uses Math.round(50 + correct/total*100)', () => {
  assert.equal(Sim.calculateAmiramScore(13, 25), 102);
  assert.equal(Sim.calculateAmiramScore(1, 3), 83);
  for (let c = 0; c <= 25; c++) {
    const s = Sim.calculateAmiramScore(c, 25);
    assert.ok(s >= 50 && s <= 150);
    assert.equal(s, Math.round(50 + (c / 25) * 100));
  }
});

test('3. calculateAmiramScore validates totals and correct bounds', () => {
  assert.throws(() => Sim.calculateAmiramScore(0, 0), RangeError);
  assert.throws(() => Sim.calculateAmiramScore(0, -5), RangeError);
  assert.throws(() => Sim.calculateAmiramScore(0, 2.5), RangeError);
  assert.throws(() => Sim.calculateAmiramScore(-1, 25), RangeError);
  assert.throws(() => Sim.calculateAmiramScore(26, 25), RangeError);
  assert.throws(() => Sim.calculateAmiramScore(NaN, 25), TypeError);
  assert.throws(() => Sim.calculateAmiramScore(5, 'x'), TypeError);
});

test('4. level boundaries at 134/120/100/85 (all thresholds)', () => {
  assert.equal(Sim.levelForScore(150), 'Exemption');
  assert.equal(Sim.levelForScore(134), 'Exemption');
  assert.equal(Sim.levelForScore(133), 'AdvancedB');
  assert.equal(Sim.levelForScore(120), 'AdvancedB');
  assert.equal(Sim.levelForScore(119), 'AdvancedA');
  assert.equal(Sim.levelForScore(100), 'AdvancedA');
  assert.equal(Sim.levelForScore(99), 'Basic');
  assert.equal(Sim.levelForScore(85), 'Basic');
  assert.equal(Sim.levelForScore(84), 'PreBasic');
  assert.equal(Sim.levelForScore(50), 'PreBasic');
});

test('5. createSimulation samples 25 unique questions with 20-minute config', () => {
  const session = Sim.createSimulation(makePool(30), { random: seededRandom(42) });
  assert.equal(session.questions.length, 25);
  assert.equal(session.questionCount, 25);
  assert.equal(session.durationSec, 1200);
  assert.equal(session.timeLimitSec, 1200);
  assert.equal(session.durationMinutes, 20);
  const ids = session.questions.map(q => q.id);
  assert.equal(new Set(ids).size, 25, 'sampled questions must have no duplicates');
});

test('6. createSimulation is deterministic with an injected random source', () => {
  const a = Sim.createSimulation(makePool(30), { random: seededRandom(7) });
  const b = Sim.createSimulation(makePool(30), { random: seededRandom(7) });
  assert.deepEqual(a.questions.map(q => q.id), b.questions.map(q => q.id));
});

test('7. createSimulation rejects insufficient, duplicate and invalid pools', () => {
  assert.throws(() => Sim.createSimulation(makePool(24)), RangeError);
  const dup = makePool(30); dup[5] = { ...dup[0] };
  assert.throws(() => Sim.createSimulation(dup), /duplicate/);
  assert.throws(() => Sim.createSimulation(null), TypeError);
  assert.throws(() => Sim.createSimulation('pool'), TypeError);
});

test('8. createSimulation and submitSimulation do not mutate the input pool', () => {
  const pool = makePool(30);
  const snapshot = JSON.stringify(pool);
  const session = Sim.createSimulation(pool, { random: seededRandom(3) });
  session.questions.forEach(q => Sim.answerQuestion(session, q.id, q.answer));
  const result = Sim.submitSimulation(session);
  assert.equal(result.correctCount, 25);
  assert.equal(JSON.stringify(pool), snapshot);
  const frozen = Object.freeze(makePool(30).map(q => Object.freeze(q)));
  assert.doesNotThrow(() => Sim.createSimulation(frozen, { random: seededRandom(1) }));
});

test('9. submitSimulation: perfect run scores 150 / Exemption, empty review', () => {
  let now = 1000000;
  const session = Sim.createSimulation(makePool(30), {
    random: seededRandom(9), now: () => now
  });
  session.questions.forEach(q => Sim.answerQuestion(session, q.id, q.answer));
  now += 10 * 60 * 1000;
  const result = Sim.submitSimulation(session);
  assert.deepEqual(Object.keys(result).sort(),
    ['correctCount', 'level', 'reviewList', 'score', 'timeSpentSec', 'totalCount']);
  assert.equal(result.score, 150);
  assert.equal(result.level, 'Exemption');
  assert.equal(result.correctCount, 25);
  assert.equal(result.totalCount, 25);
  assert.equal(result.timeSpentSec, 600);
  assert.deepEqual(result.reviewList, []);
});

test('10. submitSimulation reviews only wrong and unanswered questions', () => {
  const session = Sim.createSimulation(makePool(30), { random: seededRandom(11) });
  const [q0, q1] = session.questions;
  Sim.answerQuestion(session, q0.id, 'definitely-wrong');
  session.questions.slice(2).forEach(q => Sim.answerQuestion(session, q.id, q.answer));
  // q1 is intentionally left unanswered.
  const result = Sim.submitSimulation(session);
  assert.equal(result.correctCount, 23);
  assert.equal(result.score, Sim.calculateAmiramScore(23, 25));
  assert.equal(result.reviewList.length, 2);
  const reviewedIds = result.reviewList.map(r => r.questionId).sort();
  assert.deepEqual(reviewedIds, [String(q0.id), String(q1.id)].sort());
  const wrong = result.reviewList.find(r => r.questionId === String(q0.id));
  assert.equal(wrong.correctAnswer, q0.answer);
  assert.equal(wrong.userAnswer, 'definitely-wrong');
  const missed = result.reviewList.find(r => r.questionId === String(q1.id));
  assert.equal(missed.correctAnswer, q1.answer);
  assert.equal(missed.userAnswer, null);
});

test('11. submitSimulation clamps elapsed time to the 20-minute limit', () => {
  let now = 5000000;
  const session = Sim.createSimulation(makePool(25), {
    random: seededRandom(5), now: () => now
  });
  session.questions.forEach(q => Sim.answerQuestion(session, q.id, q.answer));
  now += 60 * 60 * 1000; // one hour: beyond the practice limit
  assert.equal(Sim.submitSimulation(session).timeSpentSec, 1200);
  const backwards = Sim.createSimulation(makePool(25), {
    random: seededRandom(5), now: () => now
  });
  backwards.startedAtMs = now + 60000; // clock appears to go backwards
  assert.equal(Sim.submitSimulation(backwards).timeSpentSec, 0);
});

test('12. submitSimulation validates session state and maps mid levels', () => {
  assert.throws(() => Sim.submitSimulation(null), TypeError);
  assert.throws(() => Sim.submitSimulation({}), TypeError);
  assert.throws(() => Sim.submitSimulation({ questions: [] }), RangeError);
  const session = Sim.createSimulation(makePool(25), { random: seededRandom(13) });
  // Answer 13 of 25 correctly -> score 102 -> AdvancedA.
  session.questions.forEach((q, i) =>
    Sim.answerQuestion(session, q.id, i < 13 ? q.answer : 'nope'));
  const result = Sim.submitSimulation(session);
  assert.equal(result.score, 102);
  assert.equal(result.level, 'AdvancedA');
});
