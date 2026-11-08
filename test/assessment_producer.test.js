// ShirAmiram — Unit Tests for Assessment Producer
// Synthetic questions below are clearly labelled and use the ACTUAL
// simulation schema ({ id, question, options, answer, ... }) plus the
// actual catalogue word-metadata fields ({ word, part_of_speech }).
const test = require('node:test');
const assert = require('node:assert/strict');

const Sim = require('../src/simulation.js');
const Coordinator = require('../src/learning_coordinator.js');
const History = require('../src/learning_history.js');
const { produceAssessmentFromSimulation } = require('../src/assessment_producer.js');

// Clearly-labelled synthetic questions in the actual simulation schema,
// enriched with explicit catalogue-style word metadata on each question.
function syntheticPool() {
  return [
    { id: 'q1', question: 'Synthetic: pick achieve', options: ['achieve', 'adapt'], answer: 'achieve', word: 'achieve', part_of_speech: 'verb' },
    { id: 'q2', question: 'Synthetic: pick annual', options: ['annual', 'apparent'], answer: 'annual', word: 'annual', part_of_speech: 'adjective' },
    { id: 'q3', question: 'Synthetic: pick assume', options: ['assume', 'approach'], answer: 'assume', word: 'assume', part_of_speech: 'verb' },
    { id: 'q4', question: 'Synthetic: pick attitude', options: ['attitude', 'annual'], answer: 'attitude', word: 'attitude', part_of_speech: 'noun' }
  ];
}

function runSession(answersById) {
  const session = Sim.createSimulation(syntheticPool(), { questionCount: 4, random: () => 0 });
  // random () => 0 rotates the pool; answer by each question's own id.
  session.questions.forEach((q) => {
    if (Object.prototype.hasOwnProperty.call(answersById, q.id)) {
      Sim.answerQuestion(session, q.id, answersById[q.id]);
    }
  });
  return { session, result: Sim.submitSimulation(session) };
}

test('1. perfect synthetic run: 150, all explicitly correct, complete', () => {
  const { session, result } = runSession({ q1: 'achieve', q2: 'annual', q3: 'assume', q4: 'attitude' });
  assert.equal(result.score, 150);
  const envelope = produceAssessmentFromSimulation(session, result);
  assert.equal(envelope.session, result);
  assert.deepEqual(envelope.assessment.errors, []);
  assert.deepEqual([...envelope.assessment.correctWords].sort(),
    ['achieve', 'annual', 'assume', 'attitude']);
  assert.equal(envelope.assessment.complete, true);
});

test('2. partial: unanswered in reviewList is NOT an error; wrong is', () => {
  const { session, result } = runSession({ q1: 'adapt', q2: 'annual', q3: 'assume' });
  // q4 unanswered: present in reviewList with userAnswer null.
  assert.equal(result.reviewList.length, 2);
  const envelope = produceAssessmentFromSimulation(session, result);
  assert.deepEqual(envelope.assessment.errors,
    [{ word: 'achieve', category: 'verb', questionId: 'q1' }]);
  assert.deepEqual([...envelope.assessment.correctWords].sort(), ['annual', 'assume']);
  assert.equal(envelope.assessment.complete, false);
});

test('3. option-index answers are assessed per simulation rules', () => {
  const { session, result } = runSession({ q1: 0, q2: 1, q3: ' ASSUME ', q4: 'attitude' });
  const byId = {};
  session.questions.forEach((q) => { byId[q.id] = q; });
  // q1 index 0 is its correct option wherever it landed in the pool.
  const envelope = produceAssessmentFromSimulation(session, result);
  assert.ok(envelope.assessment.correctWords.includes('assume'));
  assert.equal(envelope.assessment.errors.some((e) => e.word === 'annual'), true);
  assert.equal(envelope.assessment.complete, true);
  assert.equal(byId.q3.answer, 'assume');
});

test('4. same word correct and wrong: error wins', () => {
  const pool = [
    { id: 'a', question: 'Synthetic A', options: ['adapt', 'achieve'], answer: 'adapt', word: 'adapt', category: 'verb' },
    { id: 'b', question: 'Synthetic B', options: ['adapt', 'annual'], answer: 'adapt', word: 'adapt', category: 'verb' }
  ];
  const session = Sim.createSimulation(pool, { questionCount: 2, random: () => 0 });
  Sim.answerQuestion(session, 'a', 'adapt');
  Sim.answerQuestion(session, 'b', 'annual');
  const envelope = produceAssessmentFromSimulation(session, Sim.submitSimulation(session));
  assert.deepEqual(envelope.assessment.errors,
    [{ word: 'adapt', category: 'verb', questionId: 'b' }]);
  assert.deepEqual(envelope.assessment.correctWords, []);
  assert.equal(envelope.assessment.complete, true);
});

test('5. extraneous answer keys never make a session complete', () => {
  const { session, result } = runSession({ q1: 'achieve', q2: 'annual', q3: 'assume' });
  session.answers['not-a-question'] = 'attitude';
  session.answers['999'] = 'attitude';
  const envelope = produceAssessmentFromSimulation(session, result);
  assert.equal(envelope.assessment.complete, false);
  assert.deepEqual(envelope.assessment.correctWords.sort(), ['achieve', 'annual', 'assume']);
});

test('6. null, partial and malformed inputs return empty incomplete envelope', () => {
  assert.deepEqual(produceAssessmentFromSimulation(null, null),
    { session: null, assessment: { errors: [], correctWords: [], complete: false } });
  assert.deepEqual(produceAssessmentFromSimulation({}, {}).assessment,
    { errors: [], correctWords: [], complete: false });
  assert.deepEqual(produceAssessmentFromSimulation({ questions: [] }, { score: 50 }).assessment,
    { errors: [], correctWords: [], complete: false });
  const { session } = runSession({});
  const partial = produceAssessmentFromSimulation(session, null);
  assert.equal(partial.session, null);
  assert.deepEqual(partial.assessment, { errors: [], correctWords: [], complete: false });
});

test('7. safe words: constructor/__proto__ dedupe without pollution', () => {
  const pool = [
    { id: 'a', question: 'Synthetic A', options: ['x', 'y'], answer: 'x', word: 'constructor' },
    { id: 'b', question: 'Synthetic B', options: ['x', 'y'], answer: 'x', word: '__proto__' },
    { id: 'c', question: 'Synthetic C', options: ['x', 'y'], answer: 'x', word: '__proto__' }
  ];
  const session = Sim.createSimulation(pool, { questionCount: 3, random: () => 0 });
  session.questions.forEach((q) => Sim.answerQuestion(session, q.id, 'y'));
  const envelope = produceAssessmentFromSimulation(session, Sim.submitSimulation(session));
  assert.deepEqual(envelope.assessment.errors.map((e) => e.word).sort(),
    ['__proto__', '__proto__', 'constructor']);
  assert.deepEqual(envelope.assessment.errors.map((e) => e.category),
    ['unknown', 'unknown', 'unknown']);
  assert.equal({}.polluted, undefined);
  assert.equal(Object.prototype.polluted, undefined);
});

test('8. malformed answers do not masquerade as assessed', () => {
  const { session, result } = runSession({
    q1: 99, q2: 'not-an-option', q3: { evil: true }, q4: 'attitude'
  });
  const envelope = produceAssessmentFromSimulation(session, result);
  assert.deepEqual(envelope.assessment.errors, []);
  assert.deepEqual(envelope.assessment.correctWords, ['attitude']);
  assert.equal(envelope.assessment.complete, false);
});

test('9. produced envelopes feed real evaluateSessionDelta (coordinator session)', () => {
  const wrong = runSession({ q1: 'adapt', q2: 'annual', q3: 'assume', q4: 'attitude' });
  const right = runSession({ q1: 'achieve', q2: 'annual', q3: 'assume', q4: 'attitude' });
  const coordWrong = Coordinator.coordinateSessionFromSimulation(wrong.result, [], []);
  const coordRight = Coordinator.coordinateSessionFromSimulation(right.result, [], []);
  const prev = produceAssessmentFromSimulation(wrong.session, wrong.result, coordWrong);
  const curr = produceAssessmentFromSimulation(right.session, right.result, coordRight);
  assert.equal(prev.session, coordWrong);
  assert.equal(curr.session, coordRight);
  const delta = History.evaluateSessionDelta(prev, curr);
  assert.equal(delta.evidenceStatus, 'available');
  assert.equal(delta.scoreDelta, coordRight.simulationScore - coordWrong.simulationScore);
  assert.deepEqual(delta.resolvedWords, ['achieve']);
  assert.deepEqual(delta.newErrors, []);
});

test('10. no word metadata on question: no guessed word evidence', () => {
  // Actual simulation test-pool shape: no `word` field at all.
  const pool = [
    { id: 1, question: 'Pick the synonym of attain?', options: ['achieve', 'adapt'], answer: 'achieve' },
    { id: 2, question: 'Pick yearly?', options: ['annual', 'apparent'], answer: 'annual' }
  ];
  const session = Sim.createSimulation(pool, { questionCount: 2, random: () => 0 });
  Sim.answerQuestion(session, 1, 'adapt');
  Sim.answerQuestion(session, 2, 'annual');
  const envelope = produceAssessmentFromSimulation(session, Sim.submitSimulation(session));
  assert.deepEqual(envelope.assessment, { errors: [], correctWords: [], complete: true });
});

test('11. non-mutating and deterministic; direct result keeps score limitation', () => {
  const { session, result } = runSession({ q1: 'adapt', q2: 'annual', q3: 'assume', q4: 'attitude' });
  const snapshot = JSON.stringify(session) + JSON.stringify(result);
  const a = produceAssessmentFromSimulation(session, result);
  const b = produceAssessmentFromSimulation(session, result);
  assert.deepEqual(a, b);
  assert.equal(JSON.stringify(session) + JSON.stringify(result), snapshot);
  // Honest limitation: direct simulationResult has `score`, not
  // `simulationScore`, so learning_history sees a null score (no
  // fabrication) while still reading the explicit word evidence.
  assert.equal(result.simulationScore, undefined);
  const normalized = History.normalizeHistoryEntry(a);
  assert.equal(normalized.simulationScore, null);
  assert.equal(normalized.evidenceStatus, 'available');
  assert.deepEqual(normalized.errorWords, ['achieve']);
});
