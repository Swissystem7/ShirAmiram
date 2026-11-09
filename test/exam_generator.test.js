const test = require("node:test");
const assert = require("node:assert/strict");

const { generateExamSection } = require("../src/exam_generator.js");
const { classifyWord } = require("../src/vocab_taxonomy.js");
const Sim = require("../src/simulation.js");

function createSampleBank() {
	return [
		// 8 Nouns
		{
			word: "peace",
			sentence: "They lived in peace and harmony.",
			explanation: "State of mutual harmony",
		},
		{
			word: "comfort",
			sentence: "She found comfort in quiet music.",
			explanation: "Consolation or solace",
		},
		{
			word: "wisdom",
			sentence: "Age brings wisdom to leaders.",
			explanation: "Knowledge and good judgment",
		},
		{
			word: "memory",
			sentence: "A fond memory stays forever.",
			explanation: "Recollection of the past",
		},
		{
			word: "journey",
			sentence: "Their journey took three months.",
			explanation: "Travel from one place to another",
		},
		{
			word: "freedom",
			sentence: "People celebrate freedom each year.",
			explanation: "Power to act without restraint",
		},
		{
			word: "justice",
			sentence: "The judge upholds justice firmly.",
			explanation: "Fairness and righteousness",
		},
		{
			word: "beauty",
			sentence: "The beauty of sunrise amazed us.",
			explanation: "Quality giving aesthetic pleasure",
		},

		// 8 Adjectives
		{
			word: "calm",
			sentence: "The ocean stayed calm all night.",
			explanation: "Not agitated or excited",
		},
		{
			word: "strong",
			sentence: "A strong wind shook the tower.",
			explanation: "Having great physical power",
		},
		{
			word: "little",
			sentence: "A little bird sang outside.",
			explanation: "Small in size",
		},
		{
			word: "joyful",
			sentence: "We heard joyful voices across town.",
			explanation: "Experiencing or showing joy",
		},
		{
			word: "hopeful",
			sentence: "She was hopeful about tomorrow.",
			explanation: "Feeling hope",
		},
		{
			word: "famous",
			sentence: "He is a famous author worldwide.",
			explanation: "Known widely by many people",
		},
		{
			word: "active",
			sentence: "Staying active keeps the body well.",
			explanation: "Engaging in vigorous activity",
		},
		{
			word: "capable",
			sentence: "She is capable of solving problems.",
			explanation: "Having the ability or competence",
		},

		// 8 Adverbs
		{
			word: "enough",
			sentence: "We had enough time to prepare.",
			explanation: "As much as required",
		},
		{
			word: "quickly",
			sentence: "He finished quickly and left.",
			explanation: "At a fast pace",
		},
		{
			word: "slowly",
			sentence: "Rivers move slowly across flat plains.",
			explanation: "At a slow speed",
		},
		{
			word: "softly",
			sentence: "She spoke softly to the baby.",
			explanation: "In a quiet or gentle voice",
		},
		{
			word: "clearly",
			sentence: "The teacher explained clearly to all.",
			explanation: "In an easy to understand manner",
		},
		{
			word: "warmly",
			sentence: "They welcomed us warmly at the door.",
			explanation: "In an enthusiastic or friendly way",
		},
		{
			word: "gently",
			sentence: "Handle the antique gently please.",
			explanation: "With care and mildness",
		},
		{
			word: "calmly",
			sentence: "He responded calmly to the question.",
			explanation: "In a calm or composed manner",
		},

		// 8 Connectors (classified as General by classifyWord)
		{
			word: "however",
			sentence: "He was tired; however, he continued walking.",
			explanation: "By contrast or nevertheless",
		},
		{
			word: "although",
			sentence: "Although it rained heavily, we played soccer.",
			explanation: "Even though or in spite of",
		},
		{
			word: "therefore",
			sentence: "The evidence is clear; therefore, we must act.",
			explanation: "For that reason or consequently",
		},
		{
			word: "moreover",
			sentence: "The proposal is practical; moreover, it is inexpensive.",
			explanation: "Beyond what has been said",
		},
		{
			word: "nevertheless",
			sentence: "The test was challenging; nevertheless, they passed.",
			explanation: "In spite of that",
		},
		{
			word: "furthermore",
			sentence: "She is qualified; furthermore, she has experience.",
			explanation: "In addition or moreover",
		},
		{
			word: "instead",
			sentence: "Choose fresh fruit instead of sweet candy.",
			explanation: "As an alternative or substitute",
		},
		{
			word: "meanwhile",
			sentence: "Please prepare soup; meanwhile, I set dishes.",
			explanation: "In the intervening period of time",
		},
	];
}

function createSamplePool() {
	return [
		"peace",
		"comfort",
		"wisdom",
		"memory",
		"journey",
		"freedom",
		"justice",
		"beauty",
		"calm",
		"strong",
		"little",
		"joyful",
		"hopeful",
		"famous",
		"active",
		"capable",
		"enough",
		"quickly",
		"slowly",
		"softly",
		"clearly",
		"warmly",
		"gently",
		"calmly",
		"however",
		"although",
		"therefore",
		"moreover",
		"nevertheless",
		"furthermore",
		"instead",
		"meanwhile",
		"future",
		"unity",
		"dream",
		"silence",
		"mountain",
		"valley",
		"loyalty",
		"trust",
		"hope",
		"change",
	];
}

test("1. bank of >= 30 items over >= 4 parts of speech returns exactly 25 questions with unique target words", () => {
	const bank = createSampleBank();
	const pool = createSamplePool();
	assert.ok(bank.length >= 30, "sample bank must have at least 30 items");

	const result = generateExamSection(bank, pool);
	assert.equal(result.questions.length, 25);
	assert.equal(result.isCompleteSection, true);
	assert.equal(result.totalQuestions, 25);

	const targetWords = result.questions.map((q) => q.targetWord.toLowerCase());
	assert.equal(
		new Set(targetWords).size,
		25,
		"all 25 target words must be unique",
	);
});

test("2. at least 3 distinct parts of speech appear and counts are balanced", () => {
	const bank = createSampleBank();
	const pool = createSamplePool();
	const result = generateExamSection(bank, pool, {
		totalQuestions: 25,
		seed: 42,
	});

	const distinctPOS = Object.keys(result.partOfSpeechCounts);
	assert.ok(
		distinctPOS.length >= 3,
		`expected >= 3 distinct parts of speech, got ${distinctPOS.length}`,
	);

	// All 4 groups in createSampleBank have 8 items each, which is sufficient for 25 questions.
	// Counts across these sufficient groups must differ by at most 1 (max - min <= 1).
	const counts = Object.values(result.partOfSpeechCounts);
	const maxCount = Math.max(...counts);
	const minCount = Math.min(...counts);
	assert.ok(
		maxCount - minCount <= 1,
		`counts among groups should be balanced (max - min <= 1), got max=${maxCount}, min=${minCount}`,
	);

	// Also verify with an uneven bank: 3 groups have 10 items, 1 group has only 2 items
	const unevenBank = [
		...bank.slice(0, 8),
		{ word: "creation", sentence: "The creation of art inspires." },
		{ word: "kindness", sentence: "Show kindness toward everyone." },
		...bank.slice(8, 16),
		{ word: "peaceful", sentence: "A peaceful morning arrived." },
		{ word: "massive", sentence: "A massive tree fell down." },
		...bank.slice(16, 24),
		{ word: "purely", sentence: "It happened purely by chance." },
		{ word: "boldly", sentence: "They stepped boldly into danger." },
		// Group with only 2 items
		{ word: "lean", sentence: "Do not lean upon that railing." },
		{ word: "help", sentence: "Friends help each other always." },
	];
	const unevenResult = generateExamSection(unevenBank, pool, {
		totalQuestions: 25,
		seed: 99,
	});
	const sufficientGroupsCounts = [];
	for (const [pos, count] of Object.entries(unevenResult.partOfSpeechCounts)) {
		const itemsInBank = unevenBank.filter(
			(it) => classifyWord(it.word).partOfSpeech === pos,
		).length;
		if (itemsInBank >= 7) {
			sufficientGroupsCounts.push(count);
		}
	}
	const unevenMax = Math.max(...sufficientGroupsCounts);
	const unevenMin = Math.min(...sufficientGroupsCounts);
	assert.ok(
		unevenMax - unevenMin <= 1,
		`uneven bank sufficient groups must be balanced, got max=${unevenMax}, min=${unevenMin}`,
	);
});

test("3. every question has required fields, 4 choices, and choices[correctIndex] === targetWord", () => {
	const bank = createSampleBank();
	const pool = createSamplePool();
	const result = generateExamSection(bank, pool, {
		totalQuestions: 25,
		seed: 101,
	});

	for (let index = 0; index < result.questions.length; index += 1) {
		const q = result.questions[index];
		assert.equal(q.id, `q${index + 1}`);
		assert.equal(typeof q.maskedSentence, "string");
		assert.ok(q.maskedSentence.includes("________"));
		assert.equal(typeof q.targetWord, "string");
		assert.equal(typeof q.partOfSpeech, "string");
		assert.ok(Array.isArray(q.choices));
		assert.equal(q.choices.length, 4);
		assert.equal(new Set(q.choices).size, 4, "choices must be distinct");
		assert.ok(
			Number.isInteger(q.correctIndex) &&
				q.correctIndex >= 0 &&
				q.correctIndex < 4,
		);
		assert.equal(typeof q.explanation, "string");
		assert.equal(
			q.choices[q.correctIndex],
			q.targetWord,
			"choices[correctIndex] must strictly equal targetWord",
		);
		assert.equal(
			q.correctAnswer,
			q.choices[q.correctIndex],
			"correctAnswer must equal choices[correctIndex]",
		);
	}
});

test("4. determinism with the same seed", () => {
	const bank = createSampleBank();
	const pool = createSamplePool();
	const sectionA = generateExamSection(bank, pool, {
		totalQuestions: 25,
		seed: 777,
	});
	const sectionB = generateExamSection(bank, pool, {
		totalQuestions: 25,
		seed: 777,
	});

	assert.deepEqual(sectionA, sectionB);
});

test("5. small bank yields isCompleteSection false with all possible questions", () => {
	const pool = createSamplePool();
	const smallBank = [
		{
			word: "peace",
			sentence: "They prayed for peace worldwide.",
			explanation: "Tranquility",
		},
		{
			word: "calm",
			sentence: "The morning remained calm and quiet.",
			explanation: "Not agitated",
		},
		{
			word: "quickly",
			sentence: "She stepped quickly past the crowd.",
			explanation: "Fast",
		},
		{
			word: "however",
			sentence: "It was late; however, he stayed awake.",
			explanation: "Nevertheless",
		},
	];

	const result = generateExamSection(smallBank, pool, { totalQuestions: 25 });
	assert.equal(result.isCompleteSection, false);
	assert.equal(result.questions.length, 4);
	assert.equal(result.totalQuestions, 25);
	assert.deepEqual(result.partOfSpeechCounts, {
		Adjective: 1,
		Adverb: 1,
		General: 1,
		Noun: 1,
	});
});

test("6. invalid inputs never throw and return graceful fallback", () => {
	const pool = createSamplePool();
	const bank = createSampleBank();

	assert.doesNotThrow(() => generateExamSection(null, pool));
	assert.doesNotThrow(() => generateExamSection(bank, null));
	assert.doesNotThrow(() => generateExamSection(undefined, undefined));
	assert.doesNotThrow(() => generateExamSection({}, {}));
	assert.doesNotThrow(() =>
		generateExamSection(bank, pool, { totalQuestions: -5 }),
	);
	assert.doesNotThrow(() =>
		generateExamSection(bank, pool, { totalQuestions: 0 }),
	);
	assert.doesNotThrow(() =>
		generateExamSection(bank, pool, { totalQuestions: "ten" }),
	);

	const nullBankResult = generateExamSection(null, pool);
	assert.deepEqual(nullBankResult, {
		questions: [],
		isCompleteSection: false,
		totalQuestions: 25,
		partOfSpeechCounts: {},
	});

	const nullPoolResult = generateExamSection(bank, null);
	assert.deepEqual(nullPoolResult, {
		questions: [],
		isCompleteSection: false,
		totalQuestions: 25,
		partOfSpeechCounts: {},
	});
});

test("7. duplicate target words with different casing are never reused", () => {
	const pool = createSamplePool();
	const bankWithDups = [
		{
			word: "peace",
			sentence: "They lived in peace today.",
			explanation: "Harmony",
		},
		{
			word: "PEACE",
			sentence: "The world desires PEACE always.",
			explanation: "Harmony uppercase",
		},
		{
			word: "Peace",
			sentence: "May Peace prevail everywhere.",
			explanation: "Harmony title case",
		},
		{
			word: "calm",
			sentence: "The lake was calm and blue.",
			explanation: "Peaceful",
		},
	];

	const result = generateExamSection(bankWithDups, pool, {
		totalQuestions: 10,
	});
	assert.equal(result.questions.length, 2);
	const words = result.questions.map((q) => q.targetWord.toLowerCase());
	assert.equal(new Set(words).size, 2);
	assert.ok(words.includes("peace"));
	assert.ok(words.includes("calm"));
});

test("8. compatibility with src/simulation.js: accepts questions and scores perfect run at top score", () => {
	const bank = createSampleBank();
	const pool = createSamplePool();
	const section = generateExamSection(bank, pool, {
		totalQuestions: 25,
		seed: 42,
	});

	assert.equal(section.isCompleteSection, true);
	assert.equal(section.questions.length, 25);

	// createSimulation expects pool of questions with id, options/choices, correctAnswer/answer
	const session = Sim.createSimulation(section.questions);
	assert.equal(session.questions.length, 25);

	for (const q of session.questions) {
		Sim.answerQuestion(session, q.id, q.correctAnswer);
	}

	const simResult = Sim.submitSimulation(session);
	assert.equal(simResult.score, 150);
	assert.equal(simResult.level, Sim.LEVELS.EXEMPTION);
	assert.equal(simResult.correctCount, 25);
	assert.equal(simResult.totalCount, 25);
	assert.deepEqual(simResult.reviewList, []);
});

test("9. invalid bank items are ignored gracefully", () => {
	const pool = createSamplePool();
	const dirtyBank = [
		null,
		undefined,
		42,
		"invalid",
		{},
		{ word: "", sentence: "No target word here." },
		{ word: "peace", sentence: "" },
		{ word: "peace", sentence: 123 },
		// Sentence does not contain target word -> buildQuestion returns null -> skipped
		{
			word: "peace",
			sentence: "The sky is blue today.",
			explanation: "Mismatch",
		},
		// Valid item
		{
			word: "peace",
			sentence: "They celebrated peace across the globe.",
			explanation: "Valid",
		},
	];

	const result = generateExamSection(dirtyBank, pool, { totalQuestions: 5 });
	assert.equal(result.questions.length, 1);
	assert.equal(result.questions[0].targetWord, "peace");
});

test("10. supports custom totalQuestions and item targetWord field", () => {
	const bank = createSampleBank().map((item) => ({
		targetWord: item.word,
		sentence: item.sentence,
		explanation: item.explanation,
	}));
	const pool = createSamplePool();

	const result = generateExamSection(bank, pool, {
		totalQuestions: 10,
		seed: 15,
	});
	assert.equal(result.questions.length, 10);
	assert.equal(result.isCompleteSection, true);
	assert.equal(result.totalQuestions, 10);
});
