// ShirAmiram — Learning Pipeline tests.
// Labelled SYNTHETIC learner answers run through the ACTUAL simulation /
// coordinator / producer / history APIs. Vocab evidence uses the ACTUAL
// repo vocab shapes (read-only): the 300-entry array with
// { word, part_of_speech, level } (src/amiram_vocab_data.js) and the root
// shiramiram_vocab_full.json entries { word, category, difficulty }.
const test = require('node:test');
const assert = require('node:assert/strict');

const Sim = require('../src/simulation.js');
const { runLearningCycle } = require('../src/learning_pipeline.js');
const REAL_VOCAB = require('../src/amiram_vocab_data.js'); // actual 300
const ROOT_VOCAB = require('../shiramiram_vocab_full.json'); // actual {word, category}

function q(id, word, extra) {
  return Object.assign({
    id, song_id: 1, word,
    question: `Synthetic: pick ${word}`,
    options: [word, 'wrong-option'],
    answer: word
  }, extra || {});
}
const POOL = [q('q1', 'achieve'), q('q2', 'adapt'), q('q3', 'annual'), q('q4', 'attitude')];
const SONGS = [{
  id: 1, title: 'Synthetic Song', artist: 'Synthetic',
  highlight_words: ['achieve', 'adapt', 'annual', 'attitude'].map((word) => ({ word }))
}];
const CATALOG = { songs: SONGS, questions: POOL };

function round(history, answersById, vocab, pool) {
  const usePool = pool || POOL;
  const session = Sim.createSimulation(usePool, { questionCount: usePool.length, random: () => 0 });
  session.questions.forEach((item) => {
    if (Object.prototype.hasOwnProperty.call(answersById, item.id)) {
      Sim.answerQuestion(session, item.id, answersById[item.id]);
    }
  });
  const result = Sim.submitSimulation(session);
  return {
    session, result,
    cycle: runLearningCycle({
      simulationSession: session, simulationResult: result,
      songCatalog: CATALOG, amiramVocabMap: vocab === undefined ? REAL_VOCAB : vocab,
      history: history || []
    })
  };
}
const ALL_CORRECT = { q1: 'achieve', q2: 'adapt', q3: 'annual', q4: 'attitude' };
const WRONG_ACHIEVE = Object.assign({}, ALL_CORRECT, { q1: 'wrong-option' });

function deepFreeze(v, seen) {
  if (!v || typeof v !== 'object') return v;
  seen = seen || new Set();
  if (seen.has(v)) return v;
  seen.add(v);
  Object.values(v).forEach((x) => deepFreeze(x, seen));
  return Object.freeze(v);
}

test('1. exact 5 fields, coordinator score carried, no invented score', () => {
  const { result, cycle } = round([], WRONG_ACHIEVE);
  assert.deepEqual(Object.keys(cycle),
    ['studyPlan', 'assessmentEnvelope', 'progressDelta', 'updatedHistory', 'persistentWeaknesses']);
  assert.equal(result.score, 125);
  assert.equal(cycle.studyPlan.simulationScore, 125);
  assert.equal(cycle.assessmentEnvelope.session.simulationScore, 125);
  assert.equal(cycle.progressDelta, null); // no valid prior history
  assert.equal(cycle.updatedHistory.length, 1);
  assert.equal(cycle.updatedHistory[0], cycle.assessmentEnvelope);
});

test('2. unknown category enriched from REAL 300 vocab part_of_speech', () => {
  const { cycle } = round([], WRONG_ACHIEVE);
  // Question carries no POS, so the producer honestly reports 'unknown';
  // real vocab says achieve is a verb.
  assert.deepEqual(cycle.assessmentEnvelope.assessment.errors,
    [{ word: 'achieve', category: 'verb', questionId: 'q1' }]);
  assert.deepEqual([...cycle.assessmentEnvelope.assessment.correctWords].sort(),
    ['adapt', 'annual', 'attitude']);
  assert.equal(cycle.assessmentEnvelope.assessment.complete, true);
});

test('3. unknown word stays unknown; no guessed category', () => {
  const pool = [q('qx', 'zqxw'), q('q2', 'adapt')];
  const { cycle } = round([], { qx: 'wrong-option', q2: 'adapt' }, REAL_VOCAB, pool);
  assert.deepEqual(cycle.assessmentEnvelope.assessment.errors,
    [{ word: 'zqxw', category: 'unknown', questionId: 'qx' }]);
});

test('4. known producer category is never overwritten by vocab', () => {
  const pool = [q('q1', 'achieve', { part_of_speech: 'noun' }), q('q2', 'adapt')];
  const { cycle } = round([], { q1: 'wrong-option', q2: 'adapt' }, REAL_VOCAB, pool);
  assert.equal(cycle.assessmentEnvelope.assessment.errors[0].category, 'noun');
});

test('5. two wrong rounds persist, explicit correct round resolves (delta)', () => {
  const r1 = round([], WRONG_ACHIEVE).cycle;
  assert.deepEqual(r1.persistentWeaknesses, []); // 1 occurrence < default 2
  const r2 = round(r1.updatedHistory, WRONG_ACHIEVE).cycle;
  assert.deepEqual(r2.persistentWeaknesses,
    [{ word: 'achieve', occurrences: 2, categories: ['verb'] }]);
  assert.deepEqual(r2.progressDelta.unresolvedWords, ['achieve']);
  assert.equal(r2.progressDelta.scoreDelta, 0);
  const r3 = round(r2.updatedHistory, ALL_CORRECT).cycle;
  assert.deepEqual(r3.progressDelta.resolvedWords, ['achieve']);
  assert.deepEqual(r3.assessmentEnvelope.assessment.errors, []);
  assert.ok(r3.assessmentEnvelope.assessment.correctWords.includes('achieve'));
  // aggregatePersistentWeaknesses is count-based over history (existing
  // module semantics): past occurrences are not erased by resolution.
  assert.deepEqual(r3.persistentWeaknesses,
    [{ word: 'achieve', occurrences: 2, categories: ['verb'] }]);
});

test('6. actual root {word, category} shape and map/string vocab shapes', () => {
  const deliberate = ROOT_VOCAB.find((e) => e.word === 'deliberate');
  assert.ok(deliberate && deliberate.category === 'adjective');
  const pool = [q('qd', 'deliberate'), q('q2', 'adapt')];
  const fromArray = round([], { qd: 'wrong-option', q2: 'adapt' }, ROOT_VOCAB, pool).cycle;
  assert.equal(fromArray.assessmentEnvelope.assessment.errors[0].category, 'adjective');
  const asMap = { deliberate: 'adjective' }; // word -> category string
  const fromMap = round([], { qd: 'wrong-option', q2: 'adapt' }, asMap, pool).cycle;
  assert.equal(fromMap.assessmentEnvelope.assessment.errors[0].category, 'adjective');
  const nested = { vocab: REAL_VOCAB }; // wrapper shape
  const fromNested = round([], WRONG_ACHIEVE, nested).cycle;
  assert.equal(fromNested.assessmentEnvelope.assessment.errors[0].category, 'verb');
});

test('7. safe strings: constructor/__proto__ are ordinary words', () => {
  const vocab = JSON.parse('{"constructor":{"part_of_speech":"noun"},"__proto__":{"category":"verb"}}');
  assert.ok(Object.prototype.hasOwnProperty.call(vocab, '__proto__'));
  const pool = [q('qc', 'constructor'), q('qp', '__proto__')];
  const { cycle } = round([], { qc: 'wrong-option', qp: 'wrong-option' }, vocab, pool);
  const byWord = Object.create(null);
  cycle.assessmentEnvelope.assessment.errors.forEach((e) => { byWord[e.word] = e.category; });
  assert.equal(byWord.constructor, 'noun');
  assert.equal(byWord['__proto__'], 'verb');
  assert.equal({}.category, undefined);
  assert.equal(Object.prototype.category, undefined);
});

test('8. FIFO cap 10 via appendSessionHistory', () => {
  const history = Array.from({ length: 10 }, (_, i) => ({
    session: { simulationScore: 100 + i, timestamp: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z` },
    assessment: { errors: [], correctWords: [] }
  }));
  const { cycle } = round(history, ALL_CORRECT);
  assert.equal(cycle.updatedHistory.length, 10);
  assert.equal(cycle.updatedHistory[0].session.simulationScore, 101); // oldest dropped
  assert.equal(cycle.updatedHistory[9], cycle.assessmentEnvelope);
  assert.equal(history.length, 10); // input array not mutated
});

test('9. partial evidence retained; malformed history filtered for last valid', () => {
  const { cycle } = round([], { q1: 'wrong-option', q2: 'adapt', q3: 'annual' }); // q4 unanswered
  assert.equal(cycle.assessmentEnvelope.assessment.complete, false);
  assert.equal(cycle.assessmentEnvelope.assessment.errors.length, 1);
  assert.deepEqual([...cycle.assessmentEnvelope.assessment.correctWords].sort(), ['adapt', 'annual']);

  const validPrev = {
    session: { simulationScore: 100, timestamp: '2026-01-01T00:00:00.000Z' },
    assessment: { errors: [], correctWords: [] }
  };
  const malformed = [
    validPrev,
    { session: { simulationScore: 'bad', timestamp: 'not-a-date' } },
    null, 'junk', { session: {} }, 42
  ];
  const r = round(malformed, ALL_CORRECT).cycle;
  assert.equal(r.progressDelta.scoreDelta, 50); // 150 vs last VALID (100)
  assert.equal(r.updatedHistory[0], validPrev); // malformed dropped by append
});

test('10. null/missing inputs: score stays null, never coerced to 0', () => {
  for (const input of [undefined, null, {}, { history: 'nope' }]) {
    const cycle = runLearningCycle(input);
    assert.deepEqual(Object.keys(cycle),
      ['studyPlan', 'assessmentEnvelope', 'progressDelta', 'updatedHistory', 'persistentWeaknesses']);
    assert.equal(cycle.studyPlan.simulationScore, null);
    assert.equal(cycle.assessmentEnvelope.session.simulationScore, null);
    assert.equal(cycle.progressDelta, null);
    assert.deepEqual(cycle.persistentWeaknesses, []);
  }
});

test('11. deep-frozen inputs are not mutated', () => {
  const session = Sim.createSimulation(POOL, { questionCount: 4, random: () => 0 });
  session.questions.forEach((item) => Sim.answerQuestion(session, item.id, WRONG_ACHIEVE[item.id]));
  const result = Sim.submitSimulation(session);
  const vocab = JSON.parse(JSON.stringify(REAL_VOCAB.slice(0, 20)));
  const history = [{
    session: { simulationScore: 100, timestamp: '2026-01-01T00:00:00.000Z' },
    assessment: { errors: [{ word: 'achieve', category: 'verb' }], correctWords: [] }
  }];
  const snapshot = JSON.stringify({ vocab, history, result });
  deepFreeze(session); deepFreeze(result); deepFreeze(vocab); deepFreeze(history);
  deepFreeze(JSON.parse(JSON.stringify(CATALOG)));
  const cycle = runLearningCycle({
    simulationSession: session, simulationResult: result,
    songCatalog: deepFreeze(JSON.parse(JSON.stringify(CATALOG))),
    amiramVocabMap: vocab, history
  });
  assert.equal(cycle.assessmentEnvelope.assessment.errors[0].category, 'verb');
  assert.equal(JSON.stringify({ vocab, history, result }), snapshot);
  assert.notEqual(cycle.assessmentEnvelope.assessment.errors[0], undefined);
});

test('12. actual vocab read-only flow; wordless question yields no word evidence', () => {
  assert.equal(REAL_VOCAB.length, 300);
  assert.ok(REAL_VOCAB.every((e) => typeof e.word === 'string' && typeof e.part_of_speech === 'string'));
  const before = JSON.stringify(REAL_VOCAB[0]);
  // Limitation (producer contract): a question with no explicit `word`
  // contributes no word evidence, even when answered wrong.
  const pool = [
    { id: 'qw', song_id: 1, question: 'Synthetic wordless', options: ['x', 'y'], answer: 'x' },
    q('q2', 'adapt')
  ];
  const { cycle } = round([], { qw: 'y', q2: 'adapt' }, REAL_VOCAB, pool);
  assert.deepEqual(cycle.assessmentEnvelope.assessment.errors, []);
  assert.deepEqual(cycle.assessmentEnvelope.assessment.correctWords, ['adapt']);
  assert.equal(JSON.stringify(REAL_VOCAB[0]), before); // read-only
});
