const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
	generateFlashcard,
	generateDeck,
} = require("../src/flashcard_generator.js");
const { generatePhoneticHint } = require("../src/pronunciation_hint.js");
const { classifyWord } = require("../src/vocab_taxonomy.js");

test("1. full card structure includes front, back, and meta with all mapped fields", () => {
	const item = {
		id: 101,
		word: "achieve",
		part_of_speech: "verb",
		level: "A_foundational",
		hebrew_translation: "להשיג",
		hebrew_definition: "פועל: להגיע לתוצאה או למטרה בעבודה קשה",
		sample_sentence: "She worked hard to achieve her goals.",
		song_title: "Stand by Me",
	};
	const schedulerState = { box: 3, nextReviewMs: 1780000000000 };

	const card = generateFlashcard(item, schedulerState);

	assert.ok(card !== null, "Card should not be null");
	assert.equal(card.id, 101);

	// Front
	assert.equal(card.front.word, "achieve");
	assert.ok(
		Array.isArray(card.front.syllables),
		"Syllables should be an array",
	);
	assert.equal(typeof card.front.phoneticGuide, "string");

	// Back
	assert.equal(card.back.hebrewTranslation, "להשיג");
	assert.equal(
		card.back.hebrewDefinition,
		"פועל: להגיע לתוצאה או למטרה בעבודה קשה",
	);
	assert.equal(card.back.partOfSpeech, "verb");
	assert.equal(
		card.back.exampleSentence,
		"She worked hard to achieve her goals.",
	);
	assert.equal(card.back.songTitle, "Stand by Me");

	// Meta
	assert.equal(card.meta.box, 3);
	assert.equal(card.meta.nextReviewMs, 1780000000000);
});

test("2. syllables and phoneticGuide are accurately derived from generatePhoneticHint", () => {
	const words = ["achieve", "deliberate", "mountain"];

	for (const word of words) {
		const expected = generatePhoneticHint(word);
		const card = generateFlashcard({ word });

		assert.ok(card !== null);
		assert.deepEqual(card.front.syllables, expected.syllables);
		assert.equal(card.front.phoneticGuide, expected.phoneticGuide);
	}
});

test("3. partOfSpeech fallback derives from classifyWord when part_of_speech is absent", () => {
	const peaceCard = generateFlashcard({ id: 1, word: "peace" });
	assert.ok(peaceCard !== null);
	assert.equal(peaceCard.back.partOfSpeech, classifyWord("peace").partOfSpeech);
	assert.equal(peaceCard.back.partOfSpeech, "Noun");

	const encourageCard = generateFlashcard({ id: 2, word: "encourage" });
	assert.ok(encourageCard !== null);
	assert.equal(
		encourageCard.back.partOfSpeech,
		classifyWord("encourage").partOfSpeech,
	);
	assert.equal(encourageCard.back.partOfSpeech, "Verb");

	const explicitCard = generateFlashcard({
		id: 3,
		word: "peace",
		part_of_speech: "adjective",
	});
	assert.ok(explicitCard !== null);
	assert.equal(explicitCard.back.partOfSpeech, "adjective");
});

test("4. default meta values without scheduler state default to box 1 and null nextReviewMs", () => {
	const cardWithoutState = generateFlashcard({ id: 1, word: "sing" });
	assert.ok(cardWithoutState !== null);
	assert.equal(cardWithoutState.meta.box, 1);
	assert.equal(cardWithoutState.meta.nextReviewMs, null);

	const cardWithNull = generateFlashcard({ id: 2, word: "sing" }, null);
	assert.ok(cardWithNull !== null);
	assert.equal(cardWithNull.meta.box, 1);
	assert.equal(cardWithNull.meta.nextReviewMs, null);

	const cardWithEmpty = generateFlashcard({ id: 3, word: "sing" }, {});
	assert.ok(cardWithEmpty !== null);
	assert.equal(cardWithEmpty.meta.box, 1);
	assert.equal(cardWithEmpty.meta.nextReviewMs, null);
});

test("5. generateDeck filterBox option keeps only cards matching specified box", () => {
	const vocabList = [
		{ id: 1, word: "apple" },
		{ id: 2, word: "banana" },
		{ id: 3, word: "cherry" },
		{ id: 4, word: "date" },
	];
	const schedulerStates = {
		1: { box: 1, nextReviewMs: null },
		2: { box: 2, nextReviewMs: 100 },
		3: { box: 2, nextReviewMs: 200 },
		4: { box: 3, nextReviewMs: 300 },
	};

	const deckBox2 = generateDeck(vocabList, schedulerStates, { filterBox: 2 });
	assert.equal(deckBox2.length, 2);
	assert.ok(deckBox2.every((card) => card.meta.box === 2));
	assert.deepEqual(
		deckBox2.map((card) => card.front.word),
		["banana", "cherry"],
	);

	const deckBox3 = generateDeck(vocabList, schedulerStates, { filterBox: 3 });
	assert.equal(deckBox3.length, 1);
	assert.equal(deckBox3[0].front.word, "date");

	const deckBox5 = generateDeck(vocabList, schedulerStates, { filterBox: 5 });
	assert.equal(deckBox5.length, 0);

	const deckNoFilter = generateDeck(vocabList, schedulerStates);
	assert.equal(deckNoFilter.length, 4);
});

test("6. generateDeck sort order prioritizes due now (null) first, ties by box then word", () => {
	const vocabList = [
		{ id: 1, word: "zebra" },
		{ id: 2, word: "banana" },
		{ id: 3, word: "apple" },
		{ id: 4, word: "cherry" },
		{ id: 5, word: "date" },
		{ id: 6, word: "apricot" },
	];
	const schedulerStates = {
		zebra: { box: 2, nextReviewMs: null },
		banana: { box: 1, nextReviewMs: null },
		apple: { box: 1, nextReviewMs: null },
		cherry: { box: 2, nextReviewMs: 500 },
		date: { box: 1, nextReviewMs: 200 },
		apricot: { box: 2, nextReviewMs: 200 },
	};

	const deck = generateDeck(vocabList, schedulerStates);
	const words = deck.map((card) => card.front.word);

	// 1. null review, box 1, apple
	// 2. null review, box 1, banana
	// 3. null review, box 2, zebra
	// 4. 200 ms review, box 1, date
	// 5. 200 ms review, box 2, apricot
	// 6. 500 ms review, box 2, cherry
	assert.deepEqual(words, [
		"apple",
		"banana",
		"zebra",
		"date",
		"apricot",
		"cherry",
	]);
});

test("7. missing translation, definition, example sentence and song title fall back to safe defaults", () => {
	const minimalItem = { id: 42, word: "simple" };
	const card = generateFlashcard(minimalItem);

	assert.ok(card !== null);
	assert.equal(card.back.hebrewTranslation, "");
	assert.equal(card.back.hebrewDefinition, "");
	assert.equal(card.back.exampleSentence, "");
	assert.equal(card.back.songTitle, null);
});

test("8. invalid inputs return null for card and empty array for deck", () => {
	const invalidWordItems = [
		null,
		undefined,
		{},
		{ word: "" },
		{ word: "   " },
		{ word: 123 },
		{ word: null },
		"string",
		123,
		[],
		true,
	];

	for (const item of invalidWordItems) {
		assert.equal(
			generateFlashcard(item),
			null,
			`Expected null for invalid item: ${JSON.stringify(item)}`,
		);
	}

	const invalidDeckInputs = [null, undefined, "not an array", 123, {}, true];

	for (const input of invalidDeckInputs) {
		assert.deepEqual(
			generateDeck(input),
			[],
			`Expected empty array for invalid deck input: ${JSON.stringify(input)}`,
		);
	}

	const mixedList = [
		null,
		{},
		{ word: "" },
		{ id: 99, word: "valid" },
		{ word: "   " },
	];
	const deck = generateDeck(mixedList);
	assert.equal(deck.length, 1);
	assert.equal(deck[0].front.word, "valid");
});

test("9. inputs are never mutated by generateFlashcard or generateDeck", () => {
	const item = Object.freeze({
		id: 7,
		word: "peace",
		part_of_speech: "noun",
		hebrew_translation: "שלום",
		hebrew_definition: "הגדרה",
		sample_sentence: "Living in peace.",
		song_title: "Give Peace a Chance",
	});
	const schedulerState = Object.freeze({
		box: 2,
		nextReviewMs: 1700000000000,
	});

	const card = generateFlashcard(item, schedulerState);
	assert.ok(card !== null);

	const vocabList = Object.freeze([
		item,
		Object.freeze({ id: 8, word: "hope" }),
	]);
	const statesMap = Object.freeze({
		7: schedulerState,
		8: Object.freeze({ box: 1, nextReviewMs: null }),
	});
	const options = Object.freeze({ filterBox: null });

	const deck = generateDeck(vocabList, statesMap, options);
	assert.equal(deck.length, 2);
	assert.equal(vocabList.length, 2);
	assert.equal(vocabList[0].word, "peace");
});

test("10. scheduler state lookup supports id lookup, fallback by word, and multiple SRS formats", () => {
	const vocabList = [
		{ id: 10, word: "first" },
		{ id: 20, word: "second" },
		{ word: "third" },
	];

	const statesMap = {
		10: { box: 3, nextReviewMs: 1000 },
		second: { box: 4, dueMs: 2000 },
		third: { box: 2, dueAt: "2026-11-10T12:00:00.000Z" },
	};

	const deck = generateDeck(vocabList, statesMap);
	assert.equal(deck.length, 3);

	const firstCard = deck.find((c) => c.front.word === "first");
	const secondCard = deck.find((c) => c.front.word === "second");
	const thirdCard = deck.find((c) => c.front.word === "third");

	assert.equal(firstCard.meta.box, 3);
	assert.equal(firstCard.meta.nextReviewMs, 1000);

	assert.equal(secondCard.meta.box, 4);
	assert.equal(secondCard.meta.nextReviewMs, 2000);

	assert.equal(thirdCard.meta.box, 2);
	assert.equal(
		thirdCard.meta.nextReviewMs,
		Date.parse("2026-11-10T12:00:00.000Z"),
	);
});
