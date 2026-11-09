const assert = require("node:assert/strict");
const { test } = require("node:test");
const { buildRemediationSession } = require("../src/review_session_builder.js");
const { generateDiagnosticSummary } = require("../src/error_analytics.js");
const { classifyWord } = require("../src/vocab_taxonomy.js");

const verbPool = [
	"encourage",
	"lean",
	"help",
	"worry",
	"reach",
	"achieve",
	"adapt",
	"collapse",
];

const nounPool = [
	"peace",
	"comfort",
	"acceptance",
	"wisdom",
	"memory",
	"regret",
	"journey",
	"hope",
];

const generalPool = [...verbPool, ...nounPool];

test("1. focused session: targets dueWords matching dominantBlindspot POS", () => {
	const dueWords = [
		"encourage", // Verb
		"peace", // Noun
		"lean", // Verb
		"comfort", // Noun
		"help", // Verb
	];

	const session = buildRemediationSession({
		dueWords,
		diagnosticSummary: { dominantBlindspot: "Verb" },
		wordPool: generalPool,
		maxQuestions: 5,
		seed: 42,
	});

	assert.ok(session.sessionId);
	assert.equal(session.targetBlindspot, "Verb");
	assert.equal(session.targetedWordCount, 3);
	assert.equal(session.questions.length, 3);

	const targetWords = session.questions.map((q) => q.targetWord);
	assert.deepEqual(targetWords, ["encourage", "lean", "help"]);

	for (const q of session.questions) {
		assert.equal(q.partOfSpeech, "Verb");
		assert.equal(q.choices.length, 4);
		assert.equal(q.choices[q.correctIndex], q.targetWord);
	}
});

test("2. fallback: when no overlap between errors and due words, uses available dueWords", () => {
	const dueWords = ["peace", "comfort", "wisdom"]; // All Nouns

	const session = buildRemediationSession({
		dueWords,
		diagnosticSummary: { dominantBlindspot: "Verb" }, // No verbs in dueWords!
		wordPool: generalPool,
		maxQuestions: 5,
		seed: 42,
	});

	assert.ok(session.sessionId);
	assert.equal(session.targetBlindspot, "Verb");
	assert.equal(session.targetedWordCount, 0); // No overlap with blindspot
	assert.equal(session.questions.length, 3); // Falls back to general dueWords

	for (const q of session.questions) {
		assert.equal(q.partOfSpeech, "Noun");
		assert.ok(dueWords.includes(q.targetWord));
	}
});

test("3. empty errors: dominantBlindspot 'none' triggers fallback gracefully", () => {
	const dueWords = ["peace", "comfort"];

	const session = buildRemediationSession({
		dueWords,
		diagnosticSummary: { dominantBlindspot: "none", total: 0 },
		wordPool: generalPool,
		maxQuestions: 5,
		seed: 10,
	});

	assert.ok(session.sessionId);
	assert.equal(session.targetBlindspot, "none");
	assert.equal(session.targetedWordCount, 0);
	assert.equal(session.questions.length, 2);
});

test("4. tiny pool: resilient to small distractor pool without throwing", () => {
	const dueWords = ["encourage"];
	const tinyPool = ["lean"]; // Only 1 distractor candidate, need 3

	const session = buildRemediationSession({
		dueWords,
		diagnosticSummary: { dominantBlindspot: "Verb" },
		wordPool: tinyPool,
		maxQuestions: 5,
	});

	assert.ok(session);
	assert.ok(session.sessionId);
	assert.equal(session.targetBlindspot, "Verb");
	assert.equal(session.targetedWordCount, 0);
	assert.deepEqual(session.questions, []);
});

test("5. missing fields: resilient to undefined, null, and empty object options", () => {
	const s1 = buildRemediationSession();
	assert.ok(s1 && typeof s1 === "object");
	assert.ok(s1.sessionId);
	assert.equal(s1.targetBlindspot, "none");
	assert.equal(s1.targetedWordCount, 0);
	assert.deepEqual(s1.questions, []);

	const s2 = buildRemediationSession(null);
	assert.ok(s2 && typeof s2 === "object");
	assert.equal(s2.targetBlindspot, "none");
	assert.deepEqual(s2.questions, []);

	const s3 = buildRemediationSession({});
	assert.ok(s3 && typeof s3 === "object");
	assert.equal(s3.targetBlindspot, "none");
	assert.deepEqual(s3.questions, []);

	const s4 = buildRemediationSession({
		dueWords: null,
		diagnosticSummary: null,
		wordPool: null,
		maxQuestions: null,
	});
	assert.ok(s4 && typeof s4 === "object");
	assert.deepEqual(s4.questions, []);
});

test("6. maxQuestions capping: respects maxQuestions limit", () => {
	const dueWords = ["encourage", "lean", "help", "worry", "reach"];

	const session = buildRemediationSession({
		dueWords,
		diagnosticSummary: { dominantBlindspot: "Verb" },
		wordPool: verbPool,
		maxQuestions: 2,
		seed: 99,
	});

	assert.equal(session.questions.length, 2);
	assert.equal(session.targetedWordCount, 2);
});

test("7. distractors: intentionally include same-POS words", () => {
	const dueWords = ["encourage"];

	const session = buildRemediationSession({
		dueWords,
		diagnosticSummary: { dominantBlindspot: "Verb" },
		wordPool: generalPool,
		maxQuestions: 1,
		seed: 42,
	});

	assert.equal(session.questions.length, 1);
	const question = session.questions[0];
	assert.equal(question.targetWord, "encourage");
	assert.equal(question.partOfSpeech, "Verb");

	// Every choice should belong to the same part of speech (Verb)
	for (const choice of question.choices) {
		const classification = classifyWord(choice);
		assert.equal(
			classification.partOfSpeech,
			"Verb",
			`Distractor "${choice}" should have partOfSpeech "Verb"`,
		);
	}
});

test("8. integration: works with error_analytics generateDiagnosticSummary output", () => {
	// 3 mistakes where chosen is Adjective and target is Verb
	const mistakes = [
		{ targetWord: "encourage", chosenDistractor: "calm" },
		{ targetWord: "lean", chosenDistractor: "calm" },
		{ targetWord: "help", chosenDistractor: "calm" },
	];

	const summary = generateDiagnosticSummary(mistakes);
	assert.equal(summary.dominantBlindspot, "pos");
	assert.ok(summary.tipHe.includes("פועל"));

	const dueWords = ["reach", "peace", "comfort"];
	const session = buildRemediationSession({
		dueWords,
		diagnosticSummary: summary,
		wordPool: generalPool,
		maxQuestions: 5,
		seed: 55,
	});

	assert.equal(session.targetBlindspot, "Verb");
	assert.equal(session.targetedWordCount, 1); // "reach" is the only verb
	assert.equal(session.questions.length, 1);
	assert.equal(session.questions[0].targetWord, "reach");
	assert.equal(session.questions[0].partOfSpeech, "Verb");
});

test("9. determinism: seed produces identical session choices and correctIndex", () => {
	const input = {
		dueWords: ["encourage", "lean"],
		diagnosticSummary: { dominantBlindspot: "Verb" },
		wordPool: verbPool,
		maxQuestions: 5,
		seed: 777,
		sessionId: "test-session-deterministic",
	};

	const s1 = buildRemediationSession(input);
	const s2 = buildRemediationSession(input);

	assert.equal(s1.sessionId, "test-session-deterministic");
	assert.equal(s2.sessionId, "test-session-deterministic");
	assert.deepEqual(s1.questions, s2.questions);
});

test("10. immutability: does not mutate input arrays or objects", () => {
	const frozenDueWords = Object.freeze(["encourage", "peace"]);
	const frozenSummary = Object.freeze({ dominantBlindspot: "Verb" });
	const frozenPool = Object.freeze(["encourage", "lean", "help", "worry"]);

	assert.doesNotThrow(() => {
		buildRemediationSession({
			dueWords: frozenDueWords,
			diagnosticSummary: frozenSummary,
			wordPool: frozenPool,
		});
	});
});

test("11. object dueWords: supports objects with custom sentence and explanation", () => {
	const dueWords = [
		{
			word: "encourage",
			sentence: "Teachers always encourage their students to read.",
			explanation: "להמריץ, לעודד",
		},
	];

	const session = buildRemediationSession({
		dueWords,
		diagnosticSummary: { dominantBlindspot: "Verb" },
		wordPool: verbPool,
		seed: 12,
	});

	assert.equal(session.questions.length, 1);
	const q = session.questions[0];
	assert.equal(q.targetWord, "encourage");
	assert.equal(
		q.maskedSentence,
		"Teachers always ________ their students to read.",
	);
	assert.equal(q.explanation, "להמריץ, לעודד");
});
