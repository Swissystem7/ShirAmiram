// ShirAmiram — Pipeline edge cases (formalised verified audit).
// All learner questions/answers below are SYNTHETIC and labelled as such.
// They run through the ACTUAL exported simulation / producer / pipeline /
// history APIs. Vocabulary metadata is read-only from the actual repo
// catalogue (src/amiram_vocab_data.js); no production claims are made and
// coordinator goals/enrichment are never treated as errors.
const test = require('node:test');
const assert = require('node:assert/strict');

const Sim = require('../src/simulation.js');
const Producer = require('../src/assessment_producer.js');
const History = require('../src/learning_history.js');
const { runLearningCycle } = require('../src/learning_pipeline.js');
const REAL_VOCAB = require('../src/amiram_vocab_data.js');

function syntheticQuestion(id, word, extra) {
  const base = {
    id,
    question: `SYNTHETIC question for ${String(word)}`,
    options: [String(word).trim().toLowerCase(), 'wrong-option'],
    answer: String(word).trim().toLowerCase()
  };
  if (word !== undefined) base.word = word;
  return Object.assign(base, extra || {});
}

function runSynthetic(pool, answersById) {
  const session = Sim.createSimulation(pool, {
    questionCount: pool.length, random: () => 0, startedAtMs: 0
  });
  session.questions.forEach((item) => {
    const key = String(item.id);
    if (Object.prototype.hasOwnProperty.call(answersById, key)) {
      Sim.answerQuestion(session, item.id, answersById[key]);
    }
  });
  return { session, result: Sim.submitSimulation(session) };
}

function envelopeWithScore(score) {
  return {
    session: { simulationScore: score, timestamp: '2026-01-01T00:00:00.000Z' },
    assessment: { errors: [], correctWords: [], complete: true }
  };
}

test('evaluateSessionDelta: synthetic 0 -> 50 yields delta 50', () => {
  const delta = History.evaluateSessionDelta(envelopeWithScore(0), envelopeWithScore(50));
  assert.equal(delta.scoreDelta, 50);
  assert.equal(delta.trajectory, 'improving');
  assert.equal(delta.evidenceStatus, 'available');
});

test('evaluateSessionDelta: synthetic 0 -> 0 yields delta 0 and stable', () => {
  const delta = History.evaluateSessionDelta(envelopeWithScore(0), envelopeWithScore(0));
  assert.equal(delta.scoreDelta, 0);
  assert.equal(delta.trajectory, 'stable');
  assert.equal(delta.evidenceStatus, 'available');
  assert.deepEqual(delta.resolvedWords, []);
  assert.deepEqual(delta.newErrors, []);
});

test('pipeline: synthetic trim/case word resolves to actual achieve/verb vocab entry', () => {
  const achieve = REAL_VOCAB.find((entry) => entry.word === 'achieve');
  assert.ok(achieve);
  assert.equal(achieve.part_of_speech, 'verb');

  const pool = [
    syntheticQuestion('edge-achieve', '  Achieve  '),
    syntheticQuestion('edge-adapt', 'adapt')
  ];
  const songs = [{
    id: 1, title: 'Synthetic Song', artist: 'Synthetic',
    highlight_words: [{ word: 'achieve' }, { word: 'adapt' }]
  }];
  const { session, result } = runSynthetic(pool, {
    'edge-achieve': 'wrong-option', 'edge-adapt': 'adapt'
  });
  const cycle = runLearningCycle({
    simulationSession: session, simulationResult: result,
    songCatalog: { songs, questions: pool }, amiramVocabMap: REAL_VOCAB, history: []
  });
  // Producer normalises '  Achieve  ' to 'achieve'; pipeline enriches the
  // producer's 'unknown' category from the actual vocab entry (verb).
  assert.deepEqual(cycle.assessmentEnvelope.assessment.errors,
    [{ word: 'achieve', category: 'verb', questionId: 'edge-achieve' }]);
  assert.deepEqual(cycle.assessmentEnvelope.assessment.correctWords, ['adapt']);
  assert.equal(cycle.assessmentEnvelope.assessment.complete, true);
});

test('simulation/producer: numeric and string ids unify; duplicate ids rejected', () => {
  const pool = [
    syntheticQuestion(7, 'achieve'),
    syntheticQuestion('8', 'adapt')
  ];
  const session = Sim.createSimulation(pool, {
    questionCount: 2, random: () => 0, startedAtMs: 0
  });
  Sim.answerQuestion(session, 7, 'achieve');
  Sim.answerQuestion(session, '7', 'achieve'); // string form of numeric id 7
  Sim.answerQuestion(session, '8', 'wrong-option');
  assert.deepEqual(Object.keys(session.answers).sort(), ['7', '8']);

  const result = Sim.submitSimulation(session);
  assert.equal(result.correctCount, 1);
  assert.equal(result.totalCount, 2);
  assert.equal(result.reviewList.length, 1);
  assert.equal(result.reviewList[0].questionId, '8');

  const envelope = Producer.produceAssessmentFromSimulation(session, result);
  assert.deepEqual(envelope.assessment.errors,
    [{ word: 'adapt', category: 'unknown', questionId: '8' }]);
  assert.deepEqual(envelope.assessment.correctWords, ['achieve']);
  assert.equal(envelope.assessment.complete, true);

  assert.throws(
    () => Sim.createSimulation(
      [syntheticQuestion(1, 'achieve'), syntheticQuestion('1', 'adapt')],
      { questionCount: 2, random: () => 0 }),
    /duplicate question in pool: 1/);
});

test('producer/history: duplicate word across questions dedupes in history words', () => {
  const pool = [
    syntheticQuestion('dup-1', 'achieve'),
    syntheticQuestion('dup-2', 'achieve'),
    syntheticQuestion('dup-3', 'adapt')
  ];
  const { session, result } = runSynthetic(pool, {
    'dup-1': 'wrong-option', 'dup-2': 'wrong-option', 'dup-3': 'adapt'
  });
  const envelope = Producer.produceAssessmentFromSimulation(session, result);
  // Producer keeps one error row per question id...
  assert.equal(envelope.assessment.errors.length, 2);
  assert.deepEqual(envelope.assessment.errors.map((e) => e.questionId).sort(), ['dup-1', 'dup-2']);
  assert.deepEqual(envelope.assessment.correctWords, ['adapt']);
  // ...while history normalisation dedupes the word itself exactly once.
  const normalized = History.normalizeHistoryEntry(envelope);
  assert.equal(normalized.evidenceStatus, 'available');
  assert.deepEqual(normalized.errorWords, ['achieve']);
  assert.deepEqual(normalized.correctWords, ['adapt']);
});

test('producer: empty/missing/whitespace words omitted while complete tracks valid answers', () => {
  const missingWord = syntheticQuestion('edge-missing', 'adapt');
  delete missingWord.word;
  const pool = [
    syntheticQuestion('edge-valid', 'achieve'),
    syntheticQuestion('edge-empty', '', { options: ['x', 'y'], answer: 'x' }),
    missingWord,
    syntheticQuestion('edge-space', '   ', { options: ['x', 'y'], answer: 'x' })
  ];
  const { session, result } = runSynthetic(pool, {
    'edge-valid': 'achieve', 'edge-empty': 'x', 'edge-missing': 'adapt', 'edge-space': 'y'
  });
  const envelope = Producer.produceAssessmentFromSimulation(session, result);
  assert.equal(envelope.assessment.complete, true);
  assert.deepEqual(envelope.assessment.errors, []);
  assert.deepEqual(envelope.assessment.correctWords, ['achieve']);

  // An unanswered valid question makes the assessment incomplete, yet the
  // explicit correct evidence already recorded is still tracked.
  const partialPool = pool.concat([syntheticQuestion('edge-unanswered', 'adapt')]);
  const partial = runSynthetic(partialPool, {
    'edge-valid': 'achieve', 'edge-empty': 'x', 'edge-missing': 'adapt', 'edge-space': 'y'
  });
  const partialEnvelope = Producer.produceAssessmentFromSimulation(partial.session, partial.result);
  assert.equal(partialEnvelope.assessment.complete, false);
  assert.deepEqual(partialEnvelope.assessment.errors, []);
  assert.deepEqual(partialEnvelope.assessment.correctWords, ['achieve']);
});

test('pipeline/history: constructor/__proto__ are safe literal words, no prototype pollution', () => {
  // JSON.parse (not an object literal) so '__proto__' is a real own key;
  // this test never assumes a {'__proto__': ...} literal creates a key.
  const vocab = JSON.parse('{"constructor":{"part_of_speech":"noun"},"__proto__":{"category":"verb"}}');
  assert.ok(Object.prototype.hasOwnProperty.call(vocab, '__proto__'));
  assert.ok(Object.prototype.hasOwnProperty.call(vocab, 'constructor'));

  const pool = [
    syntheticQuestion('edge-ctor', 'constructor', { options: ['constructor', 'wrong-option'], answer: 'constructor' }),
    syntheticQuestion('edge-proto', '__proto__', { options: ['__proto__', 'wrong-option'], answer: '__proto__' })
  ];
  const songs = [{
    id: 1, title: 'Synthetic Song', artist: 'Synthetic',
    highlight_words: [{ word: 'constructor' }, { word: '__proto__' }]
  }];
  const { session, result } = runSynthetic(pool, {
    'edge-ctor': 'wrong-option', 'edge-proto': 'wrong-option'
  });
  const cycle = runLearningCycle({
    simulationSession: session, simulationResult: result,
    songCatalog: { songs, questions: pool }, amiramVocabMap: vocab, history: []
  });
  const byWord = Object.create(null);
  cycle.assessmentEnvelope.assessment.errors.forEach((e) => { byWord[e.word] = e.category; });
  assert.equal(byWord.constructor, 'noun');
  assert.equal(byWord['__proto__'], 'verb');

  const normalized = History.normalizeHistoryEntry(cycle.assessmentEnvelope);
  assert.deepEqual([...normalized.errorWords].sort(), ['__proto__', 'constructor']);

  assert.equal(Object.prototype.category, undefined);
  assert.equal(Object.prototype.polluted, undefined);
  assert.equal({}.polluted, undefined);
  assert.equal(Object.getPrototypeOf({}), Object.prototype);
});
