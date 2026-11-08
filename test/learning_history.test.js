// Learning History — synthetic coordinator-shaped fixtures only.
// Shape mirrors coordinateSessionFromSimulation output:
// { simulationScore, exemptionLevel, weakCategories, recommendedSong,
//   targetWords: [{ word, songId, partOfSpeech, difficulty, directlyMissed, need }],
//   targetQuestionIds, timestamp }
const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('../src/learning_history.js');

function session(score, missed, extraTargets, cats, ts) {
  const targets = (missed || []).map((word) => ({
    word, songId: 1, partOfSpeech: 'noun', difficulty: 'A', directlyMissed: true, need: 1
  })).concat((extraTargets || []).map((word) => ({
    word, songId: 1, partOfSpeech: 'noun', difficulty: 'C', directlyMissed: false, need: 0
  })));
  return {
    simulationScore: score, exemptionLevel: 'Basic', weakCategories: cats || [],
    recommendedSong: null, targetWords: targets, targetQuestionIds: [],
    timestamp: ts || '2026-01-01T00:00:00.000Z'
  };
}

test('1. evaluateSessionDelta: scoreDelta, resolvedWords and unresolvedWords', () => {
  const prev = session(90, ['peace', 'achieve', 'adapt']);
  const curr = session(110, ['achieve']);
  const d = H.evaluateSessionDelta(prev, curr);
  assert.equal(d.scoreDelta, 20);
  assert.deepEqual(d.resolvedWords, ['peace', 'adapt']);
  assert.deepEqual(d.unresolvedWords, ['achieve']);
  assert.equal(d.trajectory, 'improving');
});

test('2. trajectory improving by resolved words even when score is unchanged', () => {
  const d = H.evaluateSessionDelta(session(100, ['peace']), session(100, []));
  assert.equal(d.scoreDelta, 0);
  assert.deepEqual(d.resolvedWords, ['peace']);
  assert.deepEqual(d.unresolvedWords, []);
  assert.equal(d.trajectory, 'improving');
});

test('3. trajectory regressing when score falls, stable when nothing changes', () => {
  const down = H.evaluateSessionDelta(session(120, ['peace']), session(100, ['peace']));
  assert.equal(down.scoreDelta, -20);
  assert.equal(down.trajectory, 'regressing');
  assert.deepEqual(down.unresolvedWords, ['peace']);
  const flat = H.evaluateSessionDelta(session(100, ['peace']), session(100, ['peace']));
  assert.equal(flat.scoreDelta, 0);
  assert.deepEqual(flat.resolvedWords, []);
  assert.equal(flat.trajectory, 'stable');
});

test('4. conflict: score fall wins trajectory, resolved words still reported verbatim', () => {
  // Documented honest behaviour: the fall is the continuous signal;
  // "resolved" may only be target rotation (max 3 targets per session).
  const d = H.evaluateSessionDelta(session(120, ['peace', 'adapt']), session(100, ['adapt']));
  assert.equal(d.scoreDelta, -20);
  assert.deepEqual(d.resolvedWords, ['peace']);
  assert.equal(d.trajectory, 'regressing');
});

test('5. enrichment targets (directlyMissed:false) are not errors', () => {
  const prev = session(80, ['peace']);
  const perfect = session(150, [], ['complex', 'rapidly'], ['C']);
  const d = H.evaluateSessionDelta(prev, perfect);
  assert.deepEqual(d.resolvedWords, ['peace']);
  assert.deepEqual(d.unresolvedWords, []);
  // A prev filler target (directlyMissed:false) never becomes "unresolved".
  const prevFiller = session(80, ['peace'], ['complex']);
  const curr = session(90, ['complex']);
  assert.deepEqual(H.evaluateSessionDelta(prevFiller, curr).unresolvedWords, []);
});

test('6. aggregatePersistentWeaknesses across 3 sessions, sorted by frequency', () => {
  const history = [
    session(80, ['peace', 'adapt'], [], ['noun', 'A']),
    session(90, ['peace', 'complex'], [], ['noun', 'B']),
    session(100, ['peace', 'adapt'], [], ['verb'])
  ];
  const a = H.aggregatePersistentWeaknesses(history);
  assert.deepEqual(a.words, [{ word: 'peace', count: 3 }, { word: 'adapt', count: 2 }]);
  assert.deepEqual(a.categories, [{ category: 'noun', count: 2 }]);
  const strict = H.aggregatePersistentWeaknesses(history, 3);
  assert.deepEqual(strict.words, [{ word: 'peace', count: 3 }]);
  assert.deepEqual(strict.categories, []);
  const all = H.aggregatePersistentWeaknesses(history, 1);
  assert.equal(all.words.length, 3);
  assert.deepEqual(all.words[0], { word: 'peace', count: 3 });
});

test('7. aggregation dedupes repeats within one session and counts sessions, not mentions', () => {
  const dup = session(80, ['peace', 'peace']);
  dup.targetWords.push({ word: 'peace', songId: 1, partOfSpeech: 'noun', difficulty: 'A', directlyMissed: true, need: 1 });
  const a = H.aggregatePersistentWeaknesses([dup, session(90, ['peace'])], 2);
  assert.deepEqual(a.words, [{ word: 'peace', count: 2 }]);
});

test('8. appendSessionHistory caps at maxItems dropping the oldest (FIFO)', () => {
  let h = [];
  for (let i = 1; i <= 12; i++) {
    h = H.appendSessionHistory(h, session(50 + i, [], [], [], `2026-01-${String(i).padStart(2, '0')}T00:00:00.000Z`));
  }
  assert.equal(h.length, 10);
  assert.equal(h[0].simulationScore, 53);
  assert.equal(h[9].simulationScore, 62);
  const small = H.appendSessionHistory(h, session(99, [], [], [], '2026-02-01T00:00:00.000Z'), 3);
  assert.deepEqual(small.map((s) => s.simulationScore), [61, 62, 99]);
});

test('9. appendSessionHistory never mutates the original history', () => {
  const original = Object.freeze([session(80, ['peace'])]);
  const next = H.appendSessionHistory(original, session(90, []));
  assert.equal(original.length, 1);
  assert.equal(next.length, 2);
  assert.notEqual(next, original);
  assert.equal(next[0], original[0]);
});

test('10. partial and null inputs fail safe in all three functions', () => {
  assert.deepEqual(H.evaluateSessionDelta(null, null),
    { scoreDelta: null, resolvedWords: [], unresolvedWords: [], trajectory: 'stable' });
  assert.deepEqual(H.evaluateSessionDelta(undefined, session(100, ['peace'])),
    { scoreDelta: null, resolvedWords: [], unresolvedWords: [], trajectory: 'stable' });
  assert.deepEqual(H.aggregatePersistentWeaknesses(null), { words: [], categories: [] });
  assert.deepEqual(H.aggregatePersistentWeaknesses([]), { words: [], categories: [] });
  assert.deepEqual(H.aggregatePersistentWeaknesses([null, 42, {}, session(90, ['peace'])]),
    { words: [], categories: [] });
  assert.deepEqual(H.appendSessionHistory(null, session(90, [])).length, 1);
  assert.deepEqual(H.appendSessionHistory(undefined, null), []);
  assert.deepEqual(H.appendSessionHistory([], {}), []);
});

test('11. session without a timestamp is not appended; existing copy is returned', () => {
  const existing = [session(80, ['peace'])];
  const noTs = session(90, []); delete noTs.timestamp;
  const out = H.appendSessionHistory(existing, noTs);
  assert.deepEqual(out, existing);
  assert.notEqual(out, existing);
  assert.deepEqual(H.appendSessionHistory(existing, { timestamp: '   ' }), existing);
  assert.equal(existing.length, 1);
});
