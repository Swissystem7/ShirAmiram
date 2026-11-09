// Adaptive Recommender — synthetic fixtures only, no real user data.
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../src/adaptive_recommender.js');

const VOCAB = [
  { word: 'peace', part_of_speech: 'noun', level: 'A_foundational' },
  { word: 'comfort', part_of_speech: 'noun', level: 'A_foundational' },
  { word: 'achieve', part_of_speech: 'verb', level: 'A_foundational' },
  { word: 'adapt', part_of_speech: 'verb', level: 'B_intermediate' },
  { word: 'complex', part_of_speech: 'adjective', level: 'C_advanced' },
  { word: 'rapidly', part_of_speech: 'adverb', level: 'C_advanced' }
];
function song(id, title, words) {
  return { id, title, artist: 'Synthetic', highlight_words: words.map((word) => ({ word, he: 'x', explanation: 'noun: x' })) };
}
function question(id, song_id, word) {
  return { id, song_id, word_id: word, word, question: 'Fill _____ here.', options: [word, 'a', 'b', 'c'], answer: word, explanation: 'שם עצם: test' };
}
const SONGS = [song(2, 'Beta', ['achieve', 'adapt', 'peace']), song(1, 'Alpha', ['peace', 'comfort', 'rapidly']), song(3, 'Gamma', ['complex', 'rapidly', 'comfort'])];
const QUESTIONS = [question(10, 1, 'peace'), question(11, 1, 'comfort'), question(12, 2, 'achieve'), question(13, 2, 'adapt'), question(14, 3, 'complex'), question(15, 3, 'rapidly')];
const ATTEMPTS = [
  { word: 'peace', correct: false }, { word: 'peace', correct: false },
  { word: 'achieve', correct: false }, { word: 'complex', correct: true },
  { word: 'rapidly', correct: true }
];

test('1. analyzeErrors aggregates POS and difficulty with rates', () => {
  const p = R.analyzeErrors(ATTEMPTS, { vocab: VOCAB });
  assert.equal(p.totalAttempts, 5); assert.equal(p.errorCount, 3); assert.equal(p.correctCount, 2);
  assert.equal(p.byPartOfSpeech.noun.attempts, 2); assert.equal(p.byPartOfSpeech.noun.errorRate, 1);
  assert.equal(p.byPartOfSpeech.verb.errorRate, 1); assert.equal(p.byDifficulty.A.errorRate, 1);
  assert.equal(p.byDifficulty.C.errorRate, 0); assert.equal(p.weakestPartOfSpeech, 'noun');
});

test('2. enrichment from question reference resolves word and Hebrew POS fallback', () => {
  const p = R.analyzeErrors([{ questionId: 10, userAnswer: 'nope', answer: 'peace' }], { questions: QUESTIONS, vocab: VOCAB });
  assert.equal(p.totalAttempts, 1); assert.equal(p.missedWords[0].word, 'peace');
  assert.equal(p.byPartOfSpeech.noun.errors, 1);
});

test('3. malformed and partial inputs are skipped gracefully', () => {
  const p = R.analyzeErrors([null, 42, 'x', {}, { word: 'peace' }, { word: 'peace', correct: false }], { vocab: VOCAB });
  assert.equal(p.totalAttempts, 1); assert.equal(p.invalidCount, 5); assert.equal(p.errorCount, 1);
  assert.deepEqual(R.analyzeErrors(null).totalAttempts, 0);
  assert.deepEqual(R.analyzeErrors('junk').byPartOfSpeech, {});
});

test('4. normalization maps real level and POS vocabularies', () => {
  assert.equal(R.normalizeDifficulty('A_foundational'), 'A');
  assert.equal(R.normalizeDifficulty('B_intermediate'), 'B');
  assert.equal(R.normalizeDifficulty('C_advanced'), 'C');
  assert.equal(R.normalizeDifficulty(2), 'B'); assert.equal(R.normalizeDifficulty('junk'), 'unknown');
  assert.equal(R.normalizePartOfSpeech('שם עצם: שלווה'), 'noun');
  assert.equal(R.normalizePartOfSpeech('Adjective'), 'adjective');
});

test('5. userAnswer comparison grades correctness without boolean flag', () => {
  const p = R.analyzeErrors([
    { word: 'peace', userAnswer: ' PEACE ', answer: 'peace' },
    { word: 'comfort', userAnswer: 'wrong', answer: 'comfort' }
  ], { vocab: VOCAB });
  assert.equal(p.correctCount, 1); assert.equal(p.errorCount, 1);
  assert.deepEqual(p.missedWords.map((m) => m.word), ['comfort']);
});

test('6. rankSongs puts directly-missed weak words first deterministically', () => {
  const p = R.analyzeErrors(ATTEMPTS, { vocab: VOCAB });
  const ranked = R.rankSongs(p, SONGS, { vocab: VOCAB });
  assert.equal(ranked[0].songId, 2); // achieve+adapt+peace all missed/weak
  assert.ok(ranked[0].score > ranked[1].score);
  assert.deepEqual(R.rankSongs(p, SONGS, { vocab: VOCAB }).map((s) => s.songId), ranked.map((s) => s.songId));
});

test('7. ranking ties break by title then id with stable order', () => {
  const empty = R.analyzeErrors([], {});
  const tied = [song(9, 'Same', ['peace']), song(4, 'Same', ['comfort']), song(7, 'Alpha', ['rapidly'])];
  const ranked = R.rankSongs(empty, tied, { vocab: VOCAB });
  assert.deepEqual(ranked.map((s) => s.songId), [7, 4, 9]);
  assert.deepEqual(R.rankSongs(empty, tied, { vocab: VOCAB }).map((s) => s.songId), [7, 4, 9]);
});

test('8. catalogue is capped at 30 songs', () => {
  const many = Array.from({ length: 35 }, (_, i) => song(i + 1, 'S' + String(i + 1).padStart(2, '0'), ['peace']));
  const ranked = R.rankSongs(R.analyzeErrors(ATTEMPTS, { vocab: VOCAB }), many, { vocab: VOCAB });
  assert.equal(ranked.length, 30); assert.equal(R.MAX_CATALOGUE, 30);
});

test('9. buildStudyPlan ready: 1 song, exactly 3 karaoke words, 5 quiz ids', () => {
  const plan = R.buildStudyPlan({ attempts: ATTEMPTS, songs: SONGS, questions: QUESTIONS, vocab: VOCAB });
  assert.equal(plan.status, 'ready'); assert.equal(plan.recommendedSong.songId, 2);
  assert.equal(plan.karaokeTargetWords.length, 3);
  assert.equal(plan.quizQuestionIds.length, 5); assert.equal(new Set(plan.quizQuestionIds).size, 5);
  assert.deepEqual(plan.reasons, []);
});

test('10. insufficient: no attempts yields explicit graceful plan', () => {
  const plan = R.buildStudyPlan({ attempts: [], songs: SONGS, questions: QUESTIONS, vocab: VOCAB });
  assert.equal(plan.status, 'insufficient-data'); assert.equal(plan.recommendedSong, null);
  assert.deepEqual(plan.karaokeTargetWords, []); assert.deepEqual(plan.quizQuestionIds, []);
  assert.ok(plan.reasons.some((r) => r.includes('insufficient-diagnostic-data')));
});

test('11. insufficient: all-correct and too-few questions are reported', () => {
  const ok = R.buildStudyPlan({ attempts: [{ word: 'peace', correct: true }], songs: SONGS, questions: QUESTIONS, vocab: VOCAB });
  assert.equal(ok.status, 'insufficient-data');
  assert.ok(ok.reasons.some((r) => r.includes('no incorrect')));
  const few = R.buildStudyPlan({ attempts: ATTEMPTS, songs: SONGS, questions: QUESTIONS.slice(0, 3), vocab: VOCAB });
  assert.equal(few.status, 'insufficient-data');
  assert.ok(few.reasons.some((r) => r.includes('insufficient-questions')));
});

test('12. inputs are never mutated (frozen fixtures)', () => {
  const songs = Object.freeze(SONGS.map((s) => Object.freeze({ ...s, highlight_words: Object.freeze(s.highlight_words.map((w) => Object.freeze({ ...w }))) })));
  const attempts = Object.freeze(ATTEMPTS.map((a) => Object.freeze({ ...a })));
  const snap = JSON.stringify(songs);
  assert.doesNotThrow(() => R.buildStudyPlan({ attempts, songs, questions: QUESTIONS, vocab: VOCAB }));
  assert.equal(JSON.stringify(songs), snap);
});

test('13. real-shape content file ranks 30 songs and builds deterministic ids', () => {
  const fs = require('node:fs'); const path = require('node:path');
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data/imports/content_v2.json'), 'utf8'));
  const vocabRaw = fs.readFileSync(path.join(__dirname, '..', 'src/amiram_vocab_data.js'), 'utf8');
  const vocab = JSON.parse(vocabRaw.slice(vocabRaw.indexOf('['), vocabRaw.lastIndexOf(']') + 1));
  const attempts = raw.questions.slice(0, 10).map((q) => ({ questionId: q.id, userAnswer: 'wrong', answer: q.answer }));
  const plan = R.buildStudyPlan({ attempts, songs: raw.songs, questions: raw.questions, vocab });
  assert.equal(plan.rankedSongs.length, 30);
  if (plan.status === 'ready') { assert.equal(plan.karaokeTargetWords.length, 3); assert.equal(plan.quizQuestionIds.length, 5); }
  const again = R.buildStudyPlan({ attempts, songs: raw.songs, questions: raw.questions, vocab });
  assert.deepEqual(again.rankedSongs.map((s) => s.songId), plan.rankedSongs.map((s) => s.songId));
});

test('14. rankSongs tolerates malformed catalogue entries', () => {
  const ranked = R.rankSongs(R.analyzeErrors(ATTEMPTS, { vocab: VOCAB }), [null, {}, { id: 5 }, song(6, 'Ok', ['peace'])], { vocab: VOCAB });
  assert.deepEqual(ranked.map((s) => s.songId), [6]);
  assert.deepEqual(R.rankSongs(null, null), []);
});
