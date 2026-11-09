// Learning History — controlling contract tests.
// REAL coordinator outputs (imported below) carry goals/enrichment only and
// must yield score-only results with NO inferred errors. All explicit-error
// fixtures are SYNTHETIC labelled assessments, never coordinator fields.
const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('../src/learning_history.js');
const Sim = require('../src/simulation.js');
const C = require('../src/learning_coordinator.js');

// --- Minimal synthetic catalogue so coordinator outputs are REAL ---
const VOCAB = [
  { word: 'peace', part_of_speech: 'noun', level: 'A_foundational' },
  { word: 'comfort', part_of_speech: 'noun', level: 'A_foundational' },
  { word: 'achieve', part_of_speech: 'verb', level: 'A_foundational' },
  { word: 'adapt', part_of_speech: 'verb', level: 'B_intermediate' },
  { word: 'complex', part_of_speech: 'adjective', level: 'C_advanced' },
  { word: 'rapidly', part_of_speech: 'adverb', level: 'C_advanced' },
  { word: 'intricate', part_of_speech: 'adjective', level: 'C_advanced' }
];
function song(id, title, words) {
  return { id, title, artist: 'Synthetic', highlight_words: words.map((word) => ({ word, he: 'x', explanation: 'noun: x' })) };
}
function question(id, song_id, word) {
  return { id, song_id, word_id: word, word, question: 'Fill _____ here.', options: [word, 'a', 'b', 'c'], answer: word, explanation: 'test' };
}
const SONGS = [
  song(2, 'Beta', ['achieve', 'adapt', 'peace']),
  song(1, 'Alpha', ['peace', 'comfort', 'rapidly']),
  song(3, 'Gamma', ['complex', 'rapidly', 'comfort']),
  song(4, 'Delta', ['complex', 'rapidly', 'intricate'])
];
const QUESTIONS = [
  question(10, 1, 'peace'), question(11, 1, 'comfort'), question(12, 2, 'achieve'),
  question(13, 2, 'adapt'), question(14, 3, 'complex'), question(15, 3, 'rapidly'),
  question(16, 4, 'intricate')
];
const CATALOGUE = { songs: SONGS, questions: QUESTIONS };
function seededRandom(seed) {
  let state = seed >>> 0;
  return function () { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296; };
}
function realCoordinatorOutput(wrongWords) {
  const session = Sim.createSimulation(QUESTIONS, { questionCount: QUESTIONS.length, random: seededRandom(7) });
  session.questions.forEach((q) => Sim.answerQuestion(session, q.id, wrongWords.includes(q.word) ? 'definitely-wrong' : q.answer));
  return C.coordinateSessionFromSimulation(Sim.submitSimulation(session), CATALOGUE, VOCAB);
}
// SYNTHETIC explicit-evidence envelope (labelled synthetic, not coordinator).
function ev(score, errors, correctWords, extra) {
  return {
    session: { simulationScore: score, timestamp: '2026-01-01T00:00:00.000Z' },
    assessment: Object.assign(
      { errors: (errors || []).map((e) => (typeof e === 'string' ? { word: e } : e)), correctWords: correctWords || [] },
      extra || {})
  };
}
const TS = (d) => `2026-01-${String(d).padStart(2, '0')}T00:00:00.000Z`;

test('1. REAL coordinator output without assessment: score-only, no errors inferred', () => {
  const real = realCoordinatorOutput(['peace', 'achieve']);
  assert.ok(real.targetWords.length > 0); // goals exist, yet are NOT errors
  const n = H.normalizeHistoryEntry(real);
  assert.equal(n.evidenceStatus, 'none');
  assert.deepEqual(n.errorWords, []);
  assert.deepEqual(n.correctWords, []);
  assert.equal(n.simulationScore, real.simulationScore);
  const d = H.evaluateSessionDelta(real, realCoordinatorOutput(['peace']));
  assert.equal(d.evidenceStatus, 'none');
  assert.deepEqual(d.resolvedWords, []);
  assert.deepEqual(d.unresolvedWords, []);
  assert.deepEqual(d.newErrors, []);
  assert.deepEqual(H.aggregatePersistentWeaknesses([real, real], 1), []);
});

test('2. REAL perfect-150 coordinator output: weakCategories [C] ignored as enrichment', () => {
  const perfect = realCoordinatorOutput([]);
  assert.equal(perfect.simulationScore, 150);
  assert.deepEqual(perfect.weakCategories, ['C']);
  assert.ok(perfect.targetWords.every((t) => t.directlyMissed === false));
  const n = H.normalizeHistoryEntry(perfect);
  assert.equal(n.evidenceStatus, 'none');
  assert.deepEqual(n.errorWords, []);
  assert.deepEqual(H.aggregatePersistentWeaknesses([perfect, perfect, perfect], 1), []);
});

test('3. normalizeHistoryEntry: valid synthetic assessment normalised/deduped immutably', () => {
  const input = Object.freeze({
    session: Object.freeze({ simulationScore: 90, timestamp: TS(1) }),
    assessment: Object.freeze({
      errors: Object.freeze([Object.freeze({ word: ' Peace ', category: ' noun ' }), Object.freeze({ word: 'peace' })]),
      correctWords: Object.freeze(['Adapt', ' adapt ', ''])
    })
  });
  const n = H.normalizeHistoryEntry(input);
  assert.equal(n.evidenceStatus, 'available');
  assert.deepEqual(n.errorWords, ['peace']);
  assert.deepEqual(n.correctWords, ['adapt']);
  assert.equal(n.errors[0].category, 'noun');
  // Direct coordinator shape with synthetic targetWords still infers nothing.
  const direct = H.normalizeHistoryEntry({ simulationScore: 80, targetWords: [{ word: 'peace', directlyMissed: true }], weakCategories: ['noun'] });
  assert.equal(direct.evidenceStatus, 'none');
  assert.deepEqual(direct.errorWords, []);
});

test('4. SYNTHETIC 110->90 with a resolved word still regresses (score fall wins)', () => {
  const d = H.evaluateSessionDelta(ev(110, ['peace', 'adapt']), ev(90, ['adapt'], ['peace']));
  assert.deepEqual(Object.keys(d).sort(), ['evidenceStatus', 'newErrors', 'resolvedWords', 'scoreDelta', 'trajectory', 'unresolvedWords']);
  assert.equal(d.scoreDelta, -20);
  assert.deepEqual(d.resolvedWords, ['peace']);
  assert.deepEqual(d.unresolvedWords, ['adapt']);
  assert.equal(d.trajectory, 'regressing');
  assert.equal(d.evidenceStatus, 'available');
});

test('5. SYNTHETIC 90->110 improves; exact delta fields', () => {
  const d = H.evaluateSessionDelta(ev(90, ['peace']), ev(110, [], ['peace']));
  assert.equal(d.scoreDelta, 20);
  assert.equal(d.trajectory, 'improving');
  assert.deepEqual(d.resolvedWords, ['peace']);
  assert.deepEqual(d.newErrors, []);
});

test('6. SYNTHETIC equal 100 with resolved and no new errors improves', () => {
  const d = H.evaluateSessionDelta(ev(100, ['peace', 'adapt']), ev(100, ['adapt'], ['peace']));
  assert.equal(d.scoreDelta, 0);
  // resolved>0 and no newErrors takes improving even with an unresolved word.
  assert.equal(d.trajectory, 'improving');
  assert.deepEqual(d.unresolvedWords, ['adapt']);
});

test('7. SYNTHETIC equal score with unresolved or new errors regresses; neither is stable', () => {
  const un = H.evaluateSessionDelta(ev(100, ['peace']), ev(100, ['peace']));
  assert.equal(un.trajectory, 'regressing');
  assert.deepEqual(un.unresolvedWords, ['peace']);
  const nw = H.evaluateSessionDelta(ev(100, []), ev(100, ['peace']));
  assert.equal(nw.trajectory, 'regressing');
  assert.deepEqual(nw.newErrors, ['peace']);
  const flat = H.evaluateSessionDelta(ev(100, []), ev(100, []));
  assert.equal(flat.trajectory, 'stable');
});

test('8. SYNTHETIC contradiction: same word in errors and correctWords — error wins', () => {
  const curr = ev(100, ['peace'], ['peace', 'adapt']);
  const n = H.normalizeHistoryEntry(curr);
  assert.deepEqual(n.errorWords, ['peace']);
  assert.deepEqual(n.correctWords, ['adapt']); // peace removed: no resolution
  const d = H.evaluateSessionDelta(ev(100, ['peace']), curr);
  assert.deepEqual(d.resolvedWords, []);
  assert.deepEqual(d.unresolvedWords, ['peace']);
});

test('9. SYNTHETIC complete:false still permits positive explicit evidence, no absence inference', () => {
  const prev = ev(90, ['peace', 'adapt'], [], { complete: false });
  const curr = ev(90, ['adapt'], ['peace'], { complete: false });
  assert.equal(H.normalizeHistoryEntry(prev).evidenceStatus, 'available');
  const d = H.evaluateSessionDelta(prev, curr);
  assert.deepEqual(d.resolvedWords, ['peace']);
  assert.deepEqual(d.unresolvedWords, ['adapt']);
});

test('10. evidence statuses: both none, one invalid/missing, malformed assessment cleared', () => {
  const bare = (s) => ({ simulationScore: s, timestamp: TS(1) });
  assert.equal(H.evaluateSessionDelta(bare(90), bare(100)).evidenceStatus, 'none');
  const malformed = { session: { simulationScore: 100, timestamp: TS(2) }, assessment: { errors: 'peace' } };
  assert.equal(H.normalizeHistoryEntry(malformed).evidenceStatus, 'invalid');
  assert.deepEqual(H.normalizeHistoryEntry(malformed).errorWords, []);
  const d = H.evaluateSessionDelta(ev(90, ['peace']), malformed);
  assert.equal(d.evidenceStatus, 'insufficient');
  assert.deepEqual(d.resolvedWords, []);
  assert.deepEqual(d.unresolvedWords, []);
  assert.deepEqual(d.newErrors, []);
  assert.equal(H.normalizeHistoryEntry({ session: bare(1), assessment: null }).evidenceStatus, 'invalid');
  assert.equal(H.normalizeHistoryEntry({ session: bare(1), assessment: { errors: [{ word: 42 }] } }).evidenceStatus, 'invalid');
  assert.equal(H.normalizeHistoryEntry(null).evidenceStatus, 'invalid');
  // No valid score difference -> insufficient_data trajectory.
  const noScore = H.evaluateSessionDelta(null, null);
  assert.equal(noScore.scoreDelta, null);
  assert.equal(noScore.trajectory, 'insufficient_data');
  assert.equal(noScore.evidenceStatus, 'insufficient');
});

test('11. aggregate: duplicates count once per session; word in 2 of 3 synthetic sessions', () => {
  const h = [
    ev(80, [{ word: 'peace', category: 'noun' }, { word: 'peace', category: 'noun' }, { word: 'peace', category: 'verb' }, 'adapt']),
    ev(90, [{ word: 'peace', category: 'noun' }]),
    ev(100, ['adapt'])
  ];
  assert.deepEqual(H.aggregatePersistentWeaknesses(h), [
    { word: 'adapt', occurrences: 2, categories: [] },
    { word: 'peace', occurrences: 2, categories: ['noun', 'verb'] }
  ]);
  assert.deepEqual(H.aggregatePersistentWeaknesses(h, 3), []);
  // Safe invalid thresholds fall back to 2; explicit 1 includes singles.
  assert.equal(H.aggregatePersistentWeaknesses(h, NaN).length, 2);
  assert.equal(H.aggregatePersistentWeaknesses(h, 1).length, 2);
  assert.deepEqual(H.aggregatePersistentWeaknesses(null), []);
  assert.deepEqual(H.aggregatePersistentWeaknesses([null, 42, {}], 1), []);
});

test('12. aggregate: only latest 10 sessions, never weakCategories/targets', () => {
  const h = [ev(50, ['old'])];
  for (let i = 0; i < 10; i++) h.push(ev(60 + i, ['recent']));
  const a = H.aggregatePersistentWeaknesses(h, 1);
  assert.deepEqual(a, [{ word: 'recent', occurrences: 10, categories: [] }]);
  const goalOnly = { simulationScore: 150, weakCategories: ['C'], targetWords: [{ word: 'peace', directlyMissed: true }], timestamp: TS(1) };
  assert.deepEqual(H.aggregatePersistentWeaknesses([goalOnly, goalOnly], 1), []);
});

test('13. append: FIFO 11 -> 10, immutable, preserves the evidence envelope', () => {
  let h = [];
  const entries = [];
  for (let i = 1; i <= 11; i++) {
    const e = ev(50 + i, ['peace']);
    e.session.timestamp = TS(i);
    entries.push(e);
    h = H.appendSessionHistory(h, e);
  }
  assert.equal(h.length, 10);
  assert.equal(h[0], entries[1]); // oldest dropped, references preserved
  assert.equal(h[9], entries[10]);
  assert.equal(h[9].assessment.errors[0].word, 'peace');
  const frozen = Object.freeze([entries[0]]);
  const next = H.appendSessionHistory(frozen, entries[1]);
  assert.equal(frozen.length, 1);
  assert.notEqual(next, frozen);
  assert.equal(next.length, 2);
});

test('14. append: null/malformed filtered, cap 0, hard bound 10, safe defaults', () => {
  const good = ev(90, []);
  assert.deepEqual(H.appendSessionHistory(null, good).length, 1);
  assert.deepEqual(H.appendSessionHistory([], null), []);
  assert.deepEqual(H.appendSessionHistory([null, 42, {}, good], ev(95, [])).map((e) => e.session.simulationScore), [90, 95]);
  assert.deepEqual(H.appendSessionHistory([good], ev(95, []), 0), []);
  let h = [];
  for (let i = 0; i < 12; i++) h = H.appendSessionHistory(h, ev(50 + i, []), 99);
  assert.equal(h.length, 10); // hard bound
  assert.equal(H.appendSessionHistory([], good, 'junk').length, 1);
  assert.equal(H.appendSessionHistory([], good, 1.9).length, 1);
});

test('15. append: missing timestamp allowed with valid score, invalid without either', () => {
  const scoreOnly = { session: { simulationScore: 88 }, assessment: { errors: [], correctWords: [] } };
  assert.equal(H.appendSessionHistory([], scoreOnly).length, 1);
  const noScoreNoTs = { session: {}, assessment: { errors: [], correctWords: [] } };
  assert.deepEqual(H.appendSessionHistory([], noScoreNoTs), []);
  const tsOnly = { simulationScore: null, timestamp: TS(3) };
  assert.equal(H.appendSessionHistory([], tsOnly).length, 1);
  assert.deepEqual(H.appendSessionHistory([], { simulationScore: NaN, timestamp: '   ' }), []);
  assert.deepEqual(H.appendSessionHistory([], { simulationScore: Infinity }), []);
});

test('16. evaluate: invalid scores give null delta and insufficient_data, words cleared', () => {
  const d = H.evaluateSessionDelta({ simulationScore: '90' }, ev(100, ['peace']));
  assert.equal(d.scoreDelta, null);
  assert.equal(d.trajectory, 'insufficient_data');
  assert.equal(d.evidenceStatus, 'insufficient');
  assert.deepEqual(d.newErrors, []);
});

test('17. SAFE STRINGS: constructor/__proto__ error words are not silently lost (reported repro)', () => {
  const input = {
    session: { simulationScore: 100 },
    assessment: {
      errors: [{ word: 'constructor', category: 'noun' }, { word: '__proto__', category: 'noun' }],
      correctWords: []
    }
  };
  const n = H.normalizeHistoryEntry(input);
  assert.equal(n.evidenceStatus, 'available');
  assert.deepEqual(n.errorWords, ['constructor', '__proto__']);
  assert.deepEqual(n.errors, [
    { word: 'constructor', category: 'noun' }, { word: '__proto__', category: 'noun' }
  ]);
  assert.deepEqual(H.aggregatePersistentWeaknesses([input, input]), [
    { word: '__proto__', occurrences: 2, categories: ['noun'] },
    { word: 'constructor', occurrences: 2, categories: ['noun'] }
  ]);
});

test('18. SAFE STRINGS: toString/constructor/__proto__ words and categories survive, deduped once', () => {
  const n = H.normalizeHistoryEntry(ev(100, [
    { word: ' ToString ', category: '__proto__' },
    { word: 'toString', category: 'constructor' },
    { word: 'toString', category: '__proto__' },
    { word: 'hasOwnProperty', category: 'toString' },
    { word: 'valueOf', category: 'valueOf' }
  ], ['Constructor', ' constructor ', '__PROTO__', 'toString']));
  // Duplicated (word, category) pair collapses; distinct category kept.
  assert.deepEqual(n.errors, [
    { word: 'tostring', category: '__proto__' },
    { word: 'tostring', category: 'constructor' },
    { word: 'hasownproperty', category: 'toString' },
    { word: 'valueof', category: 'valueOf' }
  ]);
  assert.deepEqual(n.errorWords, ['tostring', 'hasownproperty', 'valueof']);
  // Error-authoritative: toString removed from correct; safe correct words kept literally.
  assert.deepEqual(n.correctWords, ['constructor', '__proto__']);
});

test('19. SAFE STRINGS: resolution/error-authoritative semantics for reserved words', () => {
  const resolved = H.evaluateSessionDelta(
    ev(90, ['constructor', '__proto__']),
    ev(90, [], ['constructor', '__proto__']));
  assert.deepEqual(resolved.resolvedWords, ['constructor', '__proto__']);
  assert.deepEqual(resolved.unresolvedWords, []);
  const stillErr = H.evaluateSessionDelta(
    ev(90, ['constructor']),
    ev(90, ['constructor', 'toString'], ['constructor']));
  assert.deepEqual(stillErr.resolvedWords, []); // error wins over correct
  assert.deepEqual(stillErr.unresolvedWords, ['constructor']);
  assert.deepEqual(stillErr.newErrors, ['tostring']);
});

test('20. SAFE STRINGS: persistent frequency with reserved categories, no prototype mutation', () => {
  const protoKeysBefore = Object.keys(Object.prototype);
  const h = [
    ev(80, [
      { word: '__proto__', category: 'constructor' },
      { word: '__proto__', category: '__proto__' },
      { word: '__proto__', category: 'constructor' },
      { word: 'constructor', category: 'toString' }
    ]),
    ev(90, [
      { word: '__proto__', category: 'toString' },
      { word: 'constructor', category: '__proto__' }
    ])
  ];
  assert.deepEqual(H.aggregatePersistentWeaknesses(h, 1), [
    { word: '__proto__', occurrences: 2, categories: ['__proto__', 'constructor', 'toString'] },
    { word: 'constructor', occurrences: 2, categories: ['__proto__', 'toString'] }
  ]);
  // Per-session dedupe: __proto__ in session 1 counts once despite 3 rows.
  assert.equal(H.aggregatePersistentWeaknesses([h[0]], 1)
    .find((r) => r.word === '__proto__').occurrences, 1);
  assert.deepEqual(Object.keys(Object.prototype), protoKeysBefore);
  assert.equal(Object.prototype.polluted, undefined);
  assert.equal({}.polluted, undefined);
  assert.equal(Object.getPrototypeOf({}), Object.prototype);
  assert.equal({}.constructor, Object);
});
