// Learning Coordinator — synthetic fixtures only, no real user data.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Sim = require('../src/simulation.js');
const C = require('../src/learning_coordinator.js');

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
  return { id, song_id, word_id: word, word, question: 'Fill _____ here.', options: [word, 'a', 'b', 'c'], answer: word, explanation: 'שם עצם: test' };
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
function makeSimulationResult(wrongWords) {
  const session = Sim.createSimulation(QUESTIONS, { questionCount: QUESTIONS.length, random: seededRandom(7) });
  session.questions.forEach((q) => Sim.answerQuestion(session, q.id, wrongWords.includes(q.word) ? 'definitely-wrong' : q.answer));
  return Sim.submitSimulation(session);
}
function assertTimestamp(r) {
  assert.equal(typeof r.timestamp, 'string');
  assert.ok(Number.isFinite(Date.parse(r.timestamp)), 'timestamp must be parseable ISO');
}
const KEYS = ['exemptionLevel', 'recommendedSong', 'simulationScore', 'targetQuestionIds', 'targetWords', 'timestamp', 'weakCategories'];

test('1. end-to-end actual flow: createSimulation -> submitSimulation -> coordinator', () => {
  const simResult = makeSimulationResult(['peace', 'achieve']);
  assert.ok(simResult.reviewList.length === 2 && simResult.score < 150);
  const r = C.coordinateSessionFromSimulation(simResult, CATALOGUE, VOCAB);
  assert.deepEqual(Object.keys(r).sort(), KEYS);
  assert.equal(r.simulationScore, simResult.score);
  assert.equal(r.exemptionLevel, simResult.level);
  assert.ok(r.weakCategories.includes('noun'));
  assert.ok(r.weakCategories.includes('A'));
  assert.equal(r.recommendedSong.songId, 2);
  assert.equal(r.targetWords.length, 3);
  assert.ok(r.targetWords.some((t) => t.word === 'peace'));
  assert.equal(r.targetQuestionIds.length, 5);
  assert.equal(new Set(r.targetQuestionIds).size, 5);
  assertTimestamp(r);
});

test('2. deterministic ranking: repeated calls agree except timestamp value', () => {
  const simResult = makeSimulationResult(['peace', 'achieve', 'complex']);
  const a = C.coordinateSessionFromSimulation(simResult, CATALOGUE, VOCAB);
  const b = C.coordinateSessionFromSimulation(simResult, CATALOGUE, VOCAB);
  const strip = ({ timestamp, ...rest }) => rest;
  assert.deepEqual(strip(a), strip(b));
});

test('3. perfect 150 via actual submitSimulation yields LevelC enrichment, no fabricated errors', () => {
  const simResult = makeSimulationResult([]);
  assert.equal(simResult.score, 150); assert.deepEqual(simResult.reviewList, []);
  const r = C.coordinateSessionFromSimulation(simResult, CATALOGUE, VOCAB);
  assert.equal(r.simulationScore, 150);
  assert.equal(r.exemptionLevel, 'Exemption'); // practice label, not official
  assert.deepEqual(r.weakCategories, ['C']); // dataset difficulty, not weakness
  assert.equal(r.recommendedSong.songId, 4); // only song with 3 C words
  assert.equal(r.targetWords.length, 3);
  assert.ok(r.targetWords.every((t) => t.difficulty === 'C' && t.directlyMissed === false));
  assert.deepEqual(r.targetWords.map((t) => t.word), ['complex', 'rapidly', 'intricate']);
  assert.ok(r.targetQuestionIds.length >= 3 && r.targetQuestionIds.length <= 5);
  assert.ok(r.targetQuestionIds.every((id) => QUESTIONS.some((q) => q.id === id)));
  assertTimestamp(r);
});

test('4. real content/vocab files: song words lack LevelC vocab links, so no fabricated enrichment', () => {
  // Grounded check: content_v2 song highlight words (113 distinct) overlap
  // the 300-word Amiram vocab in only one word, and no song reaches 3
  // C-level linked words. The coordinator must report insufficiency
  // honestly instead of inventing levels for song words.
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data/imports/content_v2.json'), 'utf8'));
  const vocabRaw = fs.readFileSync(path.join(__dirname, '..', 'src/amiram_vocab_data.js'), 'utf8');
  const vocab = JSON.parse(vocabRaw.slice(vocabRaw.indexOf('['), vocabRaw.lastIndexOf(']') + 1));
  const simResult = { score: 150, level: 'Exemption', correctCount: 25, totalCount: 25, timeSpentSec: 60, reviewList: [] };
  const r = C.coordinateSessionFromSimulation(simResult, raw, vocab);
  assert.equal(r.simulationScore, 150);
  assert.deepEqual(r.weakCategories, ['C']);
  assert.equal(r.recommendedSong, null);
  assert.deepEqual(r.targetWords, []); assert.deepEqual(r.targetQuestionIds, []);
});

test('5. perfect 150 with insufficient LevelC catalogue is empty enrichment, not an error', () => {
  const simResult = { score: 150, level: 'Exemption', correctCount: 25, totalCount: 25, reviewList: [] };
  const aOnly = [song(1, 'Alpha', ['peace', 'comfort', 'achieve'])];
  const r = C.coordinateSessionFromSimulation(simResult, aOnly, VOCAB);
  assert.equal(r.simulationScore, 150);
  assert.deepEqual(r.weakCategories, ['C']);
  assert.equal(r.recommendedSong, null);
  assert.deepEqual(r.targetWords, []); assert.deepEqual(r.targetQuestionIds, []);
  assertTimestamp(r);
});

test('6. malformed and empty inputs never throw and return the empty shape', () => {
  for (const bad of [null, undefined, 42, 'junk', {}, { score: 'x' }, { score: 999, reviewList: [] }]) {
    const r = C.coordinateSessionFromSimulation(bad, null, null);
    assert.deepEqual(Object.keys(r).sort(), KEYS);
    assert.equal(r.simulationScore, null); assert.equal(r.recommendedSong, null);
    assert.deepEqual(r.targetWords, []); assert.deepEqual(r.targetQuestionIds, []);
    assertTimestamp(r);
  }
  const noData = C.coordinateSessionFromSimulation(makeSimulationResult(['peace']), [], {});
  assert.equal(noData.recommendedSong, null); assert.deepEqual(noData.targetWords, []);
});

test('7. malformed review entries are skipped; unknown words are not invented', () => {
  const simResult = { score: 90, level: 'Basic', correctCount: 1, totalCount: 4,
    reviewList: [null, 42, {}, { questionId: 99, userAnswer: 'x', correctAnswer: 'not-a-vocab-word' }] };
  const r = C.coordinateSessionFromSimulation(simResult, SONGS, VOCAB);
  assert.deepEqual(r.weakCategories, []); // POS/level unknown, never guessed
  assert.ok(!r.targetWords.some((t) => t.word === 'not-a-vocab-word'));
  assertTimestamp(r);
});

test('8. partial data without question catalogue uses actual review ids only', () => {
  const simResult = makeSimulationResult(['peace', 'achieve']);
  const reviewIds = simResult.reviewList.map((e) => e.questionId);
  const r = C.coordinateSessionFromSimulation(simResult, SONGS, VOCAB);
  assert.ok(r.recommendedSong); assert.equal(r.targetWords.length, 3);
  assert.deepEqual(r.targetQuestionIds, reviewIds.slice(0, 5));
  assert.ok(r.targetQuestionIds.every((id) => reviewIds.includes(id)));
});

test('9. vocab as a word->entry map is accepted', () => {
  const map = {}; VOCAB.forEach((v) => { map[v.word] = { part_of_speech: v.part_of_speech, level: v.level }; });
  const r = C.coordinateSessionFromSimulation(makeSimulationResult(['peace']), CATALOGUE, map);
  assert.ok(r.weakCategories.includes('noun'));
  assert.equal(r.targetWords.length, 3);
});

test('10. score/level derived from correctCount when score and level are missing', () => {
  const simResult = { correctCount: 1, totalCount: 4,
    reviewList: [{ questionId: 10, id: 10, question: 'q', correctAnswer: 'peace', userAnswer: 'wrong', explanation: null }] };
  const r = C.coordinateSessionFromSimulation(simResult, CATALOGUE, VOCAB);
  assert.equal(r.simulationScore, 75);
  assert.equal(r.exemptionLevel, 'PreBasic'); // levelForScore(75) practice label
  assert.ok(r.weakCategories.includes('noun'));
});

test('11. inputs are never mutated (frozen fixtures)', () => {
  const simResult = makeSimulationResult(['peace', 'achieve']);
  const songs = Object.freeze(SONGS.map((s) => Object.freeze({ ...s, highlight_words: Object.freeze(s.highlight_words.map((w) => Object.freeze({ ...w }))) })));
  const catalogue = Object.freeze({ songs, questions: Object.freeze(QUESTIONS.map((q) => Object.freeze({ ...q }))) });
  const vocab = Object.freeze(VOCAB.map((v) => Object.freeze({ ...v })));
  const snap = JSON.stringify(songs);
  assert.doesNotThrow(() => C.coordinateSessionFromSimulation(Object.freeze({ ...simResult, reviewList: Object.freeze(simResult.reviewList.map((e) => Object.freeze({ ...e }))) }), catalogue, vocab));
  assert.equal(JSON.stringify(songs), snap);
});
