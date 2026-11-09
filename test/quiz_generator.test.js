const assert = require("node:assert/strict");
const { test } = require("node:test");
const { generateAdaptiveQuiz } = require("../src/quiz_generator.js");

const sampleSentenceBank = {
	peace: ["They found peace in the quiet mountains."],
	comfort: ["Music offered comfort during cold nights."],
	acceptance: ["True acceptance brings deep inner calm."],
	wisdom: ["Ancient wisdom guided the brave traveler."],
	memory: ["A distant memory returned without warning."],
	regret: ["He showed no regret for his past choices."],
	time: ["Only time will tell if they succeed."],
	change: ["Every sudden change requires courage."],
	reflection: ["Quiet reflection helped clarify the truth."],
	support: ["Family support provided great relief."],
	journey: ["The long journey ended at dawn."],
	hope: ["Bright hope inspired the entire village."],
	dream: ["A childhood dream came true at last."],
	future: ["Their bright future was filled with promise."],
	unity: ["Shared struggle fostered unity among people."],
	possibility: ["Every new possibility opened fresh doors."],
	question: ["That difficult question puzzled everyone."],
	answer: ["A clear answer arrived just in time."],
	freedom: ["They fought for freedom and democracy."],
	justice: ["Equal justice was granted to all citizens."],
	beauty: ["Natural beauty surrounded the secluded lake."],
	nature: ["Human nature contains many mysteries."],
	joy: ["Pure joy filled every celebration."],
};

const sampleWordPool = [
	"peace",
	"comfort",
	"acceptance",
	"wisdom",
	"memory",
	"regret",
	"time",
	"change",
	"reflection",
	"support",
	"journey",
	"hope",
	"dream",
	"future",
	"unity",
	"possibility",
	"question",
	"answer",
	"freedom",
	"justice",
	"beauty",
	"nature",
	"joy",
	"sky",
	"praise",
	"faith",
	"song",
	"emotion",
	"silence",
	"escape",
];

test("1. 10 unique questions with 5/3/2 composition (default totalQuestions: 10)", () => {
	const dueWords = ["peace", "comfort", "acceptance", "wisdom", "memory"];
	const newWords = ["regret", "time", "change"];
	const masteredWords = ["reflection", "support"];

	const quiz = generateAdaptiveQuiz({
		dueWords,
		newWords,
		masteredWords,
		sentenceBank: sampleSentenceBank,
		wordPool: sampleWordPool,
		options: { seed: 42 },
	});

	assert.equal(quiz.questions.length, 10);
	assert.deepEqual(quiz.composition, {
		dueCount: 5,
		newCount: 3,
		masteredCount: 2,
	});
	assert.equal(quiz.quizId, "quiz-42-10");

	const dueQuestions = quiz.questions.filter((q) => q.category === "due");
	const newQuestions = quiz.questions.filter((q) => q.category === "new");
	const masteredQuestions = quiz.questions.filter(
		(q) => q.category === "mastered",
	);

	assert.equal(dueQuestions.length, 5);
	assert.equal(newQuestions.length, 3);
	assert.equal(masteredQuestions.length, 2);

	const targetWords = quiz.questions.map((q) => q.targetWord);
	assert.equal(new Set(targetWords).size, 10);
});

test("2. fallback when new words are missing", () => {
	const dueWords = [
		"peace",
		"comfort",
		"acceptance",
		"wisdom",
		"memory",
		"regret",
		"time",
		"change",
	];
	const masteredWords = ["reflection", "support"];

	// Empty array of new words
	const quizWithEmptyNew = generateAdaptiveQuiz({
		dueWords,
		newWords: [],
		masteredWords,
		sentenceBank: sampleSentenceBank,
		wordPool: sampleWordPool,
		options: { seed: 101 },
	});

	assert.equal(quizWithEmptyNew.questions.length, 10);
	assert.deepEqual(quizWithEmptyNew.composition, {
		dueCount: 8,
		newCount: 0,
		masteredCount: 2,
	});

	// Omitted newWords property entirely
	const quizWithOmittedNew = generateAdaptiveQuiz({
		dueWords,
		masteredWords,
		sentenceBank: sampleSentenceBank,
		wordPool: sampleWordPool,
		options: { seed: 101 },
	});

	assert.equal(quizWithOmittedNew.questions.length, 10);
	assert.deepEqual(quizWithOmittedNew.composition, {
		dueCount: 8,
		newCount: 0,
		masteredCount: 2,
	});
});

test("3. every question has 4 choices and a valid correctIndex pointing to targetWord", () => {
	const dueWords = ["peace", "comfort", "acceptance", "wisdom", "memory"];
	const newWords = ["regret", "time", "change"];
	const masteredWords = ["reflection", "support"];

	const quiz = generateAdaptiveQuiz({
		dueWords,
		newWords,
		masteredWords,
		sentenceBank: sampleSentenceBank,
		wordPool: sampleWordPool,
		options: { seed: 77 },
	});

	assert.equal(quiz.questions.length, 10);

	for (const q of quiz.questions) {
		assert.equal(Array.isArray(q.choices), true);
		assert.equal(q.choices.length, 4);
		assert.equal(new Set(q.choices).size, 4);
		assert.equal(typeof q.correctIndex, "number");
		assert.ok(q.correctIndex >= 0 && q.correctIndex < 4);
		assert.equal(q.choices[q.correctIndex], q.targetWord);
		assert.equal(typeof q.maskedSentence, "string");
		assert.ok(q.maskedSentence.includes("________"));
		assert.equal(typeof q.partOfSpeech, "string");
		assert.ok(q.partOfSpeech.length > 0);
		assert.ok(["due", "new", "mastered"].includes(q.category));
	}
});

test("4. deterministic with the same seed", () => {
	const input = {
		dueWords: ["peace", "comfort", "acceptance", "wisdom", "memory"],
		newWords: ["regret", "time", "change"],
		masteredWords: ["reflection", "support"],
		sentenceBank: sampleSentenceBank,
		wordPool: sampleWordPool,
		options: { seed: 999 },
	};

	const quiz1 = generateAdaptiveQuiz(input);
	const quiz2 = generateAdaptiveQuiz(input);

	assert.deepEqual(quiz1, quiz2);
	assert.equal(quiz1.quizId, quiz2.quizId);
	assert.equal(quiz1.quizId, "quiz-999-10");
});

test("5. custom totalQuestions scales composition and fixes sum", () => {
	const dueWords = [
		"peace",
		"comfort",
		"acceptance",
		"wisdom",
		"memory",
		"regret",
		"time",
		"change",
	];
	const newWords = ["journey", "hope", "dream", "future", "unity"];
	const masteredWords = ["reflection", "support", "possibility", "freedom"];

	// totalQuestions: 5 -> 50% = 2.5 -> 2, 30% = 1.5 -> 2, 20% = 1 -> 1
	const quiz5 = generateAdaptiveQuiz({
		dueWords,
		newWords,
		masteredWords,
		sentenceBank: sampleSentenceBank,
		wordPool: sampleWordPool,
		options: { totalQuestions: 5, seed: 10 },
	});

	assert.equal(quiz5.questions.length, 5);
	assert.deepEqual(quiz5.composition, {
		dueCount: 2,
		newCount: 2,
		masteredCount: 1,
	});
	assert.equal(quiz5.quizId, "quiz-10-5");

	// totalQuestions: 15 -> due: 7, new: 5, mastered: 3
	const quiz15 = generateAdaptiveQuiz({
		dueWords,
		newWords,
		masteredWords,
		sentenceBank: sampleSentenceBank,
		wordPool: sampleWordPool,
		options: { totalQuestions: 15, seed: 20 },
	});

	assert.equal(quiz15.questions.length, 15);
	assert.equal(
		quiz15.composition.dueCount +
			quiz15.composition.newCount +
			quiz15.composition.masteredCount,
		15,
	);
	assert.equal(quiz15.quizId, "quiz-20-15");
});

test("6. missing/empty input returns empty questions and zero counts without throwing", () => {
	assert.doesNotThrow(() => generateAdaptiveQuiz());
	assert.deepEqual(generateAdaptiveQuiz(), {
		quizId: "quiz-default-0",
		questions: [],
		composition: { dueCount: 0, newCount: 0, masteredCount: 0 },
	});

	assert.deepEqual(generateAdaptiveQuiz(null), {
		quizId: "quiz-default-0",
		questions: [],
		composition: { dueCount: 0, newCount: 0, masteredCount: 0 },
	});

	assert.deepEqual(generateAdaptiveQuiz({}), {
		quizId: "quiz-default-0",
		questions: [],
		composition: { dueCount: 0, newCount: 0, masteredCount: 0 },
	});

	// Invalid totalQuestions
	const invalidTotal = generateAdaptiveQuiz({
		dueWords: ["peace"],
		sentenceBank: sampleSentenceBank,
		wordPool: sampleWordPool,
		options: { totalQuestions: -5, seed: 1 },
	});
	assert.equal(invalidTotal.questions.length, 0);
	assert.deepEqual(invalidTotal.composition, {
		dueCount: 0,
		newCount: 0,
		masteredCount: 0,
	});

	// Zero totalQuestions
	const zeroTotal = generateAdaptiveQuiz({
		dueWords: ["peace"],
		sentenceBank: sampleSentenceBank,
		wordPool: sampleWordPool,
		options: { totalQuestions: 0 },
	});
	assert.equal(zeroTotal.questions.length, 0);

	// Missing wordPool
	const missingPool = generateAdaptiveQuiz({
		dueWords: ["peace"],
		sentenceBank: sampleSentenceBank,
	});
	assert.equal(missingPool.questions.length, 0);

	// Missing sentenceBank
	const missingBank = generateAdaptiveQuiz({
		dueWords: ["peace"],
		wordPool: sampleWordPool,
	});
	assert.equal(missingBank.questions.length, 0);
});

test("7. no duplicate target words even with overlapping categories or duplicates", () => {
	const dueWords = [
		"peace",
		"peace",
		{ word: "comfort" },
		{ targetWord: "wisdom" },
	];
	const newWords = ["peace", "comfort", "wisdom", "hope", "dream"];
	const masteredWords = ["peace", "hope", "future", "unity"];

	const quiz = generateAdaptiveQuiz({
		dueWords,
		newWords,
		masteredWords,
		sentenceBank: sampleSentenceBank,
		wordPool: sampleWordPool,
		options: { totalQuestions: 6, seed: 55 },
	});

	const targetWords = quiz.questions.map((q) => q.targetWord);
	assert.equal(new Set(targetWords).size, targetWords.length);
});

test("8. inputs not mutated (frozen fixtures remain untouched)", () => {
	const dueWords = Object.freeze([
		Object.freeze({ word: "peace" }),
		Object.freeze({ word: "comfort" }),
		Object.freeze({ word: "acceptance" }),
		Object.freeze({ word: "wisdom" }),
		Object.freeze({ word: "memory" }),
	]);
	const newWords = Object.freeze(["regret", "time", "change"]);
	const masteredWords = Object.freeze(["reflection", "support"]);
	const sentenceBank = Object.freeze({
		...sampleSentenceBank,
	});
	const wordPool = Object.freeze([...sampleWordPool]);
	const options = Object.freeze({ totalQuestions: 10, seed: 888 });

	assert.doesNotThrow(() => {
		generateAdaptiveQuiz({
			dueWords,
			newWords,
			masteredWords,
			sentenceBank,
			wordPool,
			options,
		});
	});
});

test("9. fewer questions when not enough material available", () => {
	const quiz = generateAdaptiveQuiz({
		dueWords: ["peace"],
		newWords: ["comfort"],
		masteredWords: ["wisdom"],
		sentenceBank: sampleSentenceBank,
		wordPool: sampleWordPool,
		options: { totalQuestions: 10, seed: 123 },
	});

	assert.equal(quiz.questions.length, 3);
	assert.deepEqual(quiz.composition, {
		dueCount: 1,
		newCount: 1,
		masteredCount: 1,
	});
	assert.equal(quiz.quizId, "quiz-123-3");
});

test("10. sentenceBank formats (array of objects, wordItem embedded sentence)", () => {
	const arraySentenceBank = [
		{
			word: "peace",
			sentence: "They found peace in the quiet mountains.",
			explanation: "Peace is calmness.",
		},
		{
			targetWord: "comfort",
			sentences: ["Music offered comfort during cold nights."],
		},
	];

	const dueWords = [
		{ word: "peace" },
		"comfort",
		{
			word: "wisdom",
			sentence: "Ancient wisdom guided the brave traveler.",
			explanation: "Wisdom is knowledge.",
		},
	];

	const quiz = generateAdaptiveQuiz({
		dueWords,
		newWords: [],
		masteredWords: [],
		sentenceBank: arraySentenceBank,
		wordPool: sampleWordPool,
		options: { totalQuestions: 3, seed: 33 },
	});

	assert.equal(quiz.questions.length, 3);
	assert.equal(quiz.questions[0].targetWord, "peace");
	assert.equal(quiz.questions[0].explanation, "Peace is calmness.");
	assert.equal(quiz.questions[1].targetWord, "comfort");
	assert.equal(quiz.questions[2].targetWord, "wisdom");
	assert.equal(quiz.questions[2].explanation, "Wisdom is knowledge.");
});

test("11. skips words when buildQuestion returns null or sentence does not contain target", () => {
	const bankWithInvalidSentence = {
		peace: ["No matching target here."], // Does not contain target word -> buildQuestion returns null
		comfort: ["Music offered comfort during cold nights."],
		wisdom: ["Ancient wisdom guided the brave traveler."],
	};

	const dueWords = [
		null, // null word -> skip
		"", // empty string -> skip
		"peace", // sentence does not contain peace -> buildQuestion returns null -> skip
		"comfort", // valid
		"wisdom", // valid
	];

	const quiz = generateAdaptiveQuiz({
		dueWords,
		newWords: [],
		masteredWords: [],
		sentenceBank: bankWithInvalidSentence,
		wordPool: sampleWordPool,
		options: { totalQuestions: 2, seed: 44 },
	});

	assert.equal(quiz.questions.length, 2);
	assert.equal(quiz.questions[0].targetWord, "comfort");
	assert.equal(quiz.questions[1].targetWord, "wisdom");
});
