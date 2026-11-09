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
  assert.deepEqual(r.enrichmentInfo, { tierRequested: 'C_advanced', tierResolved: 'C_advanced', fallbackApplied: false });
  assertTimestamp(r);
});

test('4. real content/vocab files (read-only): no usable level links, so honest variety fallback', () => {
  // Grounded check: content_v2 song highlight words overlap the 300-word
  // Amiram vocab in almost no linked levels, and no song reaches any
  // classified enrichment tier. Limitation (reported, not hidden): the
  // actual catalogue therefore resolves by greatest word variety with
  // tierResolved 'unknown' — it does NOT imply C mastery. All 30 songs
  // have 5 distinct words, so title asc then id asc picks song 12.
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data/imports/content_v2.json'), 'utf8'));
  const vocabRaw = fs.readFileSync(path.join(__dirname, '..', 'src/amiram_vocab_data.js'), 'utf8');
  const vocab = JSON.parse(vocabRaw.slice(vocabRaw.indexOf('['), vocabRaw.lastIndexOf(']') + 1));
  const simResult = { score: 150, level: 'Exemption', correctCount: 25, totalCount: 25, timeSpentSec: 60, reviewList: [] };
  const r = C.coordinateSessionFromSimulation(simResult, raw, vocab);
  assert.equal(r.simulationScore, 150);
  assert.deepEqual(r.weakCategories, ['C']);
  assert.equal(r.recommendedSong.songId, 12);
  assert.equal(r.recommendedSong.title, "Ain't No Mountain High Enough");
  assert.deepEqual(r.targetWords.map((t) => t.word), ['mountain', 'enough', 'valley']);
  assert.ok(r.targetWords.every((t) => t.difficulty === 'unknown'));
  assert.deepEqual(r.enrichmentInfo, { tierRequested: 'C_advanced', tierResolved: 'unknown', fallbackApplied: true });
  // Song 12's own supplied questions, word-asc tie-break (all unknown).
  assert.deepEqual(r.targetQuestionIds, [45, 42, 41, 44, 43]);
  assert.ok(r.targetQuestionIds.every((id) => raw.questions.some((q) => q.id === id)));
  assertTimestamp(r);
});

test('5. perfect 150 with only A-level catalogue resolves honestly to A_foundational fallback', () => {
  // Documented decision for other partial levels: an A-only song can fill
  // 3, so it is used but labelled A_foundational with fallbackApplied —
  // never as C. (No questions supplied here, so no question ids.)
  const simResult = { score: 150, level: 'Exemption', correctCount: 25, totalCount: 25, reviewList: [] };
  const aOnly = [song(1, 'Alpha', ['peace', 'comfort', 'achieve'])];
  const r = C.coordinateSessionFromSimulation(simResult, aOnly, VOCAB);
  assert.equal(r.simulationScore, 150);
  assert.deepEqual(r.weakCategories, ['C']);
  assert.equal(r.recommendedSong.songId, 1);
  assert.deepEqual(r.targetWords.map((t) => t.word), ['peace', 'comfort', 'achieve']);
  assert.ok(r.targetWords.every((t) => t.difficulty === 'A'));
  assert.deepEqual(r.targetQuestionIds, []);
  assert.deepEqual(r.enrichmentInfo, { tierRequested: 'C_advanced', tierResolved: 'A_foundational', fallbackApplied: true });
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

const PERFECT = { score: 150, level: 'Exemption', correctCount: 25, totalCount: 25, reviewList: [] };

test('12. rare-C realistic fixture: 1 C + same-song B words fill 3, B_intermediate fallback', () => {
  const vocab = VOCAB.concat([
    { word: 'profound', part_of_speech: 'adjective', level: 'C_advanced' },
    { word: 'resilient', part_of_speech: 'adjective', level: 'B_intermediate' },
    { word: 'coherent', part_of_speech: 'adjective', level: 'B_intermediate' }
  ]);
  const songs = [
    song(21, 'PureB', ['resilient', 'coherent', 'adapt']),
    song(20, 'RareC', ['profound', 'resilient', 'coherent', 'adapt'])
  ];
  const questions = [question(200, 20, 'profound'), question(201, 20, 'resilient'), question(202, 20, 'coherent')];
  const r = C.coordinateSessionFromSimulation(PERFECT, { songs, questions }, vocab);
  assert.equal(r.recommendedSong.songId, 20); // rare-C mixed beats pure-B
  assert.equal(r.targetWords.length, 3);
  assert.deepEqual(r.targetWords.map((t) => t.word), ['profound', 'resilient', 'coherent']);
  assert.deepEqual(r.targetWords.map((t) => t.difficulty), ['C', 'B', 'B']);
  assert.deepEqual(r.enrichmentInfo, { tierRequested: 'C_advanced', tierResolved: 'B_intermediate', fallbackApplied: true });
  assert.ok(r.targetQuestionIds.every((id) => questions.some((q) => q.id === id)));
});

test('13. rich-C fixture: full 3 C, C_advanced with no fallback', () => {
  const r = C.coordinateSessionFromSimulation(PERFECT, CATALOGUE, VOCAB);
  assert.equal(r.recommendedSong.songId, 4);
  assert.deepEqual(r.targetWords.map((t) => t.word), ['complex', 'rapidly', 'intricate']);
  assert.deepEqual(r.enrichmentInfo, { tierRequested: 'C_advanced', tierResolved: 'C_advanced', fallbackApplied: false });
});

test('14. question ids: subset of supplied, selected song first then higher difficulty, unrelated excluded', () => {
  const songs = [song(30, 'Rich', ['complex', 'rapidly', 'intricate', 'peace'])];
  const questions = [
    question(301, 99, 'complex'), // target word, other song, C
    question(302, 30, 'peace'), // selected song, A
    question(303, 99, 'achieve'), // unrelated to selected song and targets
    question(304, 30, 'rapidly') // selected song, C
  ];
  const r = C.coordinateSessionFromSimulation(PERFECT, { songs, questions }, VOCAB);
  assert.deepEqual(r.targetQuestionIds, [304, 302, 301]);
  assert.ok(r.targetQuestionIds.every((id) => questions.some((q) => q.id === id)));
  assert.ok(!r.targetQuestionIds.includes(303));
  assert.ok(r.targetQuestionIds.length <= 5);
});

test('15. no level metadata: greatest word variety wins, tier honestly unknown', () => {
  const vocab = ['melody', 'harbor', 'willow', 'breeze', 'compass']
    .map((word) => ({ word, part_of_speech: 'noun' })); // no level field
  const songs = [
    song(41, 'Small', ['melody', 'harbor', 'willow']),
    song(42, 'Varied', ['melody', 'harbor', 'willow', 'breeze', 'compass'])
  ];
  const r = C.coordinateSessionFromSimulation(PERFECT, { songs, questions: [] }, vocab);
  assert.equal(r.recommendedSong.songId, 42);
  assert.deepEqual(r.targetWords.map((t) => t.word), ['melody', 'harbor', 'willow']);
  assert.ok(r.targetWords.every((t) => t.difficulty === 'unknown'));
  assert.deepEqual(r.enrichmentInfo, { tierRequested: 'C_advanced', tierResolved: 'unknown', fallbackApplied: true });
});

test('16. no C anywhere: strongest B song resolves B_intermediate with fallback', () => {
  const vocab = VOCAB.concat([
    { word: 'resilient', part_of_speech: 'adjective', level: 'B_intermediate' },
    { word: 'coherent', part_of_speech: 'adjective', level: 'B_intermediate' }
  ]);
  const songs = [
    song(51, 'TwoB', ['resilient', 'coherent', 'peace']),
    song(50, 'ThreeB', ['resilient', 'coherent', 'adapt'])
  ];
  const r = C.coordinateSessionFromSimulation(PERFECT, { songs, questions: [] }, vocab);
  assert.equal(r.recommendedSong.songId, 50);
  assert.deepEqual(r.targetWords.map((t) => t.difficulty), ['B', 'B', 'B']);
  assert.deepEqual(r.enrichmentInfo, { tierRequested: 'C_advanced', tierResolved: 'B_intermediate', fallbackApplied: true });
});

test('17. no matching questions: empty ids, never unrelated ids', () => {
  const catalogue = { songs: SONGS, questions: [question(900, 99, 'peace'), question(901, 99, 'achieve')] };
  const r = C.coordinateSessionFromSimulation(PERFECT, catalogue, VOCAB);
  assert.equal(r.recommendedSong.songId, 4);
  assert.equal(r.targetWords.length, 3);
  assert.deepEqual(r.targetQuestionIds, []);
});

test('18. insufficient input: song with fewer than 3 words is graceful empty enrichment', () => {
  const songs = [song(60, 'Tiny', ['peace', 'comfort'])];
  const r = C.coordinateSessionFromSimulation(PERFECT, { songs, questions: QUESTIONS }, VOCAB);
  assert.equal(r.recommendedSong, null);
  assert.deepEqual(r.targetWords, []); assert.deepEqual(r.targetQuestionIds, []);
  assert.deepEqual(r.enrichmentInfo, { tierRequested: 'C_advanced', tierResolved: 'unknown', fallbackApplied: false });
  assertTimestamp(r);
});
