const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
	planTimeBoxedSession,
	TIME_COSTS,
} = require("../src/study_session_optimizer.js");

const SAMPLE_SONGS = [
	{
		id: 101,
		title: "Anthem of Achieve",
		target_words: ["achieve", "adapt", "affect"],
		lyrics: "We strive to achieve and adapt each day.",
	},
	{
		id: 102,
		title: "Song of Discovery",
		target_words: ["explore", "discover", "wonder"],
		lyrics: "We explore the world and discover new things.",
	},
	{
		id: 103,
		title: "Harmony of Structure",
		target_words: ["structure", "maintain", "resolve"],
		lyrics: "Maintain the rhythm to resolve the harmony.",
	},
];

function createDueWords(count) {
	return Array.from({ length: count }, (_, i) => `word_${i + 1}`);
}

function createQuestionPool(count) {
	return Array.from({ length: count }, (_, i) => ({
		id: `q_${i + 1}`,
		prompt: `Question prompt ${i + 1}`,
		options: ["A", "B", "C", "D"],
		correctIndex: 0,
	}));
}

test("1. constants values and immutability (TIME_COSTS)", () => {
	assert.ok(
		Object.isFrozen(TIME_COSTS),
		"TIME_COSTS must be frozen with Object.freeze",
	);
	assert.equal(TIME_COSTS.song, 3.5, "song cost must be 3.5 minutes");
	assert.equal(TIME_COSTS.flashcard, 0.5, "flashcard cost must be 0.5 minutes");
	assert.equal(TIME_COSTS.quiz, 0.8, "quiz cost must be 0.8 minutes");
	assert.equal(
		TIME_COSTS.simulation,
		0.8,
		"simulation cost must be 0.8 minutes",
	);

	TIME_COSTS.song = 99;
	assert.equal(TIME_COSTS.song, 3.5, "frozen TIME_COSTS must not be mutated");
});

test("2. zero, negative, NaN and invalid budgets return safe empty plan", () => {
	const dueWords = createDueWords(5);
	const questionPool = createQuestionPool(10);
	const songCatalog = SAMPLE_SONGS;

	const invalidBudgets = [
		0,
		-1,
		-15,
		Number.NaN,
		Number.POSITIVE_INFINITY,
		Number.NEGATIVE_INFINITY,
		"10",
		null,
		undefined,
		{},
	];

	for (const availableMinutes of invalidBudgets) {
		const res = planTimeBoxedSession({
			availableMinutes,
			dueWords,
			songCatalog,
			questionPool,
		});
		assert.equal(
			res.targetMinutes,
			0,
			`targetMinutes should be 0 for budget ${availableMinutes}`,
		);
		assert.equal(
			res.estimatedMinutes,
			0,
			`estimatedMinutes should be 0 for budget ${availableMinutes}`,
		);
		assert.deepEqual(
			res.activities,
			[],
			`activities should be empty for budget ${availableMinutes}`,
		);
	}

	// Calling with null or no arguments
	const emptyRes = planTimeBoxedSession();
	assert.equal(emptyRes.targetMinutes, 0);
	assert.equal(emptyRes.estimatedMinutes, 0);
	assert.deepEqual(emptyRes.activities, []);
});

test("3. band < 5 minutes chooses one song if a song exists and fits", () => {
	const dueWords = createDueWords(10);
	const questionPool = createQuestionPool(10);
	const songCatalog = SAMPLE_SONGS;

	// At 4 minutes, song costs 3.5 <= 4, so song fits
	const res4 = planTimeBoxedSession({
		availableMinutes: 4,
		dueWords,
		songCatalog,
		questionPool,
	});

	assert.equal(res4.targetMinutes, 4);
	assert.equal(res4.estimatedMinutes, 3.5);
	assert.ok(
		res4.estimatedMinutes <= 4,
		"estimatedMinutes must not exceed availableMinutes",
	);
	assert.equal(res4.activities.length, 1);
	assert.equal(res4.activities[0].type, "song");
	assert.equal(res4.activities[0].title, "שיר");
	assert.equal(res4.activities[0].durationMinutes, 3.5);
	assert.equal(res4.activities[0].items.length, 1);

	// Exactly 3.5 minutes
	const resExact = planTimeBoxedSession({
		availableMinutes: 3.5,
		dueWords,
		songCatalog,
		questionPool,
	});
	assert.equal(resExact.targetMinutes, 3.5);
	assert.equal(resExact.estimatedMinutes, 3.5);
	assert.equal(resExact.activities.length, 1);
	assert.equal(resExact.activities[0].type, "song");
});

test("4. band < 5 minutes falls back to up to 6 flashcards when song does not fit or catalog is empty", () => {
	const dueWords = createDueWords(10);
	const questionPool = createQuestionPool(10);

	// At 2 minutes: song (3.5m) does not fit, should fit floor(2 / 0.5) = 4 flashcards
	const res2 = planTimeBoxedSession({
		availableMinutes: 2,
		dueWords,
		songCatalog: SAMPLE_SONGS,
		questionPool,
	});

	assert.equal(res2.targetMinutes, 2);
	assert.equal(res2.estimatedMinutes, 2.0);
	assert.ok(res2.estimatedMinutes <= 2);
	assert.equal(res2.activities.length, 1);
	assert.equal(res2.activities[0].type, "flashcards");
	assert.equal(res2.activities[0].title, "כרטיסיות");
	assert.equal(res2.activities[0].durationMinutes, 2.0);
	assert.equal(res2.activities[0].items.length, 4);

	// At 4 minutes with empty song catalog: up to 6 flashcards fit (6 * 0.5 = 3.0m <= 4)
	const resEmptyCatalog = planTimeBoxedSession({
		availableMinutes: 4,
		dueWords,
		songCatalog: [],
		questionPool,
	});

	assert.equal(resEmptyCatalog.targetMinutes, 4);
	assert.equal(resEmptyCatalog.estimatedMinutes, 3.0);
	assert.ok(resEmptyCatalog.estimatedMinutes <= 4);
	assert.equal(resEmptyCatalog.activities.length, 1);
	assert.equal(resEmptyCatalog.activities[0].type, "flashcards");
	assert.equal(resEmptyCatalog.activities[0].durationMinutes, 3.0);
	assert.equal(resEmptyCatalog.activities[0].items.length, 6);

	// When fewer than 6 dueWords exist (e.g. 3 cards = 1.5m)
	const resFewCards = planTimeBoxedSession({
		availableMinutes: 4,
		dueWords: createDueWords(3),
		songCatalog: [],
		questionPool,
	});
	assert.equal(resFewCards.estimatedMinutes, 1.5);
	assert.equal(resFewCards.activities[0].items.length, 3);
});

test("5. band 5 to < 15 minutes chooses song + up to 5 quiz questions + leftover flashcards", () => {
	const dueWords = createDueWords(10);
	const questionPool = createQuestionPool(15);
	const songCatalog = SAMPLE_SONGS;

	// At 5 minutes: song 3.5 + 1 quiz (0.8) + 1 flashcard (0.5) = 4.8m <= 5
	const res5 = planTimeBoxedSession({
		availableMinutes: 5,
		dueWords,
		songCatalog,
		questionPool,
	});

	assert.equal(res5.targetMinutes, 5);
	assert.equal(res5.estimatedMinutes, 4.8);
	assert.ok(res5.estimatedMinutes <= 5);
	assert.equal(res5.activities.length, 3);
	assert.equal(res5.activities[0].type, "song");
	assert.equal(res5.activities[0].title, "שיר");
	assert.equal(res5.activities[0].durationMinutes, 3.5);
	assert.equal(res5.activities[1].type, "quiz");
	assert.equal(res5.activities[1].title, "חידון");
	assert.equal(res5.activities[1].durationMinutes, 0.8);
	assert.equal(res5.activities[1].items.length, 1);
	assert.equal(res5.activities[2].type, "flashcards");
	assert.equal(res5.activities[2].title, "כרטיסיות");
	assert.equal(res5.activities[2].durationMinutes, 0.5);
	assert.equal(res5.activities[2].items.length, 1);

	// At 10 minutes: song (3.5) + 5 quiz (4.0) + 5 flashcards (2.5) = 10.0m <= 10
	const res10 = planTimeBoxedSession({
		availableMinutes: 10,
		dueWords,
		songCatalog,
		questionPool,
	});

	assert.equal(res10.targetMinutes, 10);
	assert.equal(res10.estimatedMinutes, 10.0);
	assert.ok(res10.estimatedMinutes <= 10);
	assert.equal(res10.activities.length, 3);
	assert.equal(res10.activities[0].type, "song");
	assert.equal(res10.activities[1].type, "quiz");
	assert.equal(
		res10.activities[1].items.length,
		5,
		"capped at 5 quiz questions",
	);
	assert.equal(res10.activities[1].durationMinutes, 4.0);
	assert.equal(res10.activities[2].type, "flashcards");
	assert.equal(res10.activities[2].items.length, 5);
	assert.equal(res10.activities[2].durationMinutes, 2.5);
});

test("6. band >= 15 minutes chooses simulation section + error-review block", () => {
	const dueWords = createDueWords(20);
	const questionPool = createQuestionPool(30);
	const songCatalog = SAMPLE_SONGS;

	// At 15 minutes: simulation (15 questions = 12.0m) + error-review (6 flashcards = 3.0m) = 15.0m
	const res15 = planTimeBoxedSession({
		availableMinutes: 15,
		dueWords,
		songCatalog,
		questionPool,
	});

	assert.equal(res15.targetMinutes, 15);
	assert.equal(res15.estimatedMinutes, 15.0);
	assert.ok(res15.estimatedMinutes <= 15);
	assert.equal(res15.activities.length, 2);
	assert.equal(res15.activities[0].type, "simulation");
	assert.equal(res15.activities[0].title, "סימולציה מתוזמנת");
	assert.equal(res15.activities[0].durationMinutes, 12.0);
	assert.equal(res15.activities[0].items.length, 15);
	assert.equal(res15.activities[1].type, "error-review");
	assert.equal(res15.activities[1].title, "חזרה על טעויות");
	assert.equal(res15.activities[1].durationMinutes, 3.0);
	assert.equal(res15.activities[1].items.length, 6);

	// At 20 minutes: simulation (21 questions = 16.8m) + error-review (6 flashcards = 3.0m) = 19.8m
	const res20 = planTimeBoxedSession({
		availableMinutes: 20,
		dueWords,
		songCatalog,
		questionPool,
	});

	assert.equal(res20.targetMinutes, 20);
	assert.equal(res20.estimatedMinutes, 19.8);
	assert.ok(res20.estimatedMinutes <= 20);
	assert.equal(res20.activities.length, 2);
	assert.equal(res20.activities[0].type, "simulation");
	assert.equal(res20.activities[0].durationMinutes, 16.8);
	assert.equal(res20.activities[0].items.length, 21);
	assert.equal(res20.activities[1].type, "error-review");
	assert.equal(res20.activities[1].durationMinutes, 3.0);
	assert.equal(res20.activities[1].items.length, 6);
});

test("7. hard check: estimatedMinutes <= availableMinutes across standard and boundary budgets", () => {
	const dueWords = createDueWords(25);
	const questionPool = createQuestionPool(40);
	const songCatalog = SAMPLE_SONGS;

	const testBudgets = [
		0.5, 1, 2, 3.4, 3.5, 4.9, 5, 7.3, 9.9, 10, 14.9, 15, 18.5, 20, 25, 30, 45,
	];

	for (const availableMinutes of testBudgets) {
		const res = planTimeBoxedSession({
			availableMinutes,
			dueWords,
			songCatalog,
			questionPool,
		});

		assert.equal(
			res.targetMinutes,
			availableMinutes,
			`targetMinutes should match availableMinutes for ${availableMinutes}`,
		);
		assert.ok(
			res.estimatedMinutes <= availableMinutes,
			`estimatedMinutes (${res.estimatedMinutes}) must NEVER exceed availableMinutes (${availableMinutes})`,
		);

		// Verify sum of activities matches estimatedMinutes within float precision
		const activitySum = res.activities.reduce(
			(sum, a) => sum + Math.round(a.durationMinutes * 10),
			0,
		);
		const estimatedTenths = Math.round(res.estimatedMinutes * 10);
		assert.equal(
			activitySum,
			estimatedTenths,
			`Sum of activities duration (${activitySum / 10}) must equal estimatedMinutes (${res.estimatedMinutes})`,
		);

		// Every activity must have non-empty items and duration > 0
		for (const act of res.activities) {
			assert.ok(
				act.items.length > 0,
				`Activity ${act.type} should have non-empty items`,
			);
			assert.ok(
				act.durationMinutes > 0,
				`Activity ${act.type} duration should be > 0`,
			);
			assert.ok(typeof act.title === "string" && act.title.length > 0);
		}
	}
});

test("8. empty inputs and missing arrays handled gracefully", () => {
	// Only availableMinutes provided
	const resMissing = planTimeBoxedSession({ availableMinutes: 10 });
	assert.equal(resMissing.targetMinutes, 10);
	assert.equal(resMissing.estimatedMinutes, 0);
	assert.deepEqual(resMissing.activities, []);

	// In >= 15 band with only questionPool (no dueWords)
	const resSimulationOnly = planTimeBoxedSession({
		availableMinutes: 15,
		dueWords: [],
		questionPool: createQuestionPool(20),
	});
	assert.equal(resSimulationOnly.activities.length, 1);
	assert.equal(resSimulationOnly.activities[0].type, "simulation");
	assert.ok(resSimulationOnly.estimatedMinutes <= 15);

	// In >= 15 band with only dueWords (no questionPool)
	const resReviewOnly = planTimeBoxedSession({
		availableMinutes: 15,
		dueWords: createDueWords(10),
		questionPool: [],
	});
	assert.equal(resReviewOnly.activities.length, 1);
	assert.equal(resReviewOnly.activities[0].type, "error-review");
	assert.ok(resReviewOnly.estimatedMinutes <= 15);

	// In 5-10 band with only songs (no quiz or dueWords)
	const resSongOnly = planTimeBoxedSession({
		availableMinutes: 10,
		songCatalog: SAMPLE_SONGS,
	});
	assert.equal(resSongOnly.activities.length, 1);
	assert.equal(resSongOnly.activities[0].type, "song");
	assert.equal(resSongOnly.estimatedMinutes, 3.5);
});

test("9. inputs are never mutated (frozen fixtures)", () => {
	const frozenDueWords = Object.freeze([
		Object.freeze({ word: "achieve" }),
		Object.freeze({ word: "adapt" }),
	]);
	const frozenCatalog = Object.freeze([
		Object.freeze({
			id: 1,
			title: "Frozen Song",
			target_words: Object.freeze(["achieve"]),
			lyrics: "Frozen lyrics",
		}),
	]);
	const frozenQuestions = Object.freeze([
		Object.freeze({
			id: 1,
			prompt: "Frozen prompt?",
			options: Object.freeze(["A", "B", "C", "D"]),
			correctIndex: 0,
		}),
	]);
	const frozenInput = Object.freeze({
		availableMinutes: 15,
		dueWords: frozenDueWords,
		songCatalog: frozenCatalog,
		questionPool: frozenQuestions,
	});

	assert.doesNotThrow(() => {
		const res = planTimeBoxedSession(frozenInput);
		assert.ok(res.estimatedMinutes <= 15);
	}, "Execution with frozen inputs must not throw");
});

test("10. song recommender integration ranks matching song or falls back to first song", () => {
	const catalog = [
		{
			id: "first_song",
			title: "First Song",
			target_words: ["irrelevant"],
			lyrics: "No matches here.",
		},
		{
			id: "matching_song",
			title: "Matching Song",
			target_words: ["achieve", "adapt"],
			lyrics: "We achieve and adapt to everything.",
		},
	];

	// With dueWords matching 'achieve', should choose 'matching_song'
	const resMatching = planTimeBoxedSession({
		availableMinutes: 5,
		dueWords: ["achieve"],
		songCatalog: catalog,
	});
	assert.equal(resMatching.activities[0].type, "song");
	assert.equal(resMatching.activities[0].items[0].id, "matching_song");

	// With dueWords matching nothing, falls back to the first song
	const resFallback = planTimeBoxedSession({
		availableMinutes: 5,
		dueWords: ["unrelated_word_xyz"],
		songCatalog: catalog,
	});
	assert.equal(resFallback.activities[0].type, "song");
	assert.equal(resFallback.activities[0].items[0].id, "first_song");
});
