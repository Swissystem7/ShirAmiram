const assert = require("node:assert/strict");
const { test } = require("node:test");
const { calculateComplexityScore } = require("../src/difficulty_estimator.js");
const {
	analyzeLyricsRichness,
	compareSongsByDifficulty,
} = require("../src/lyrics_analyzer.js");

const CATALOG = [
	{ word: "ancient" },
	{ word: "fragile" },
	{ word: "unprecedented" },
	{ word: "indispensable" },
];

test("1. exact type-token ratio for a very repetitive song vs a varied one", () => {
	const repetitive = analyzeLyricsRichness("la la la la", []);
	assert.equal(repetitive.totalTokens, 4);
	assert.equal(repetitive.uniqueTokens, 1);
	assert.equal(repetitive.typeTokenRatio, 0.25);

	const varied = analyzeLyricsRichness("one two three four", []);
	assert.equal(varied.totalTokens, 4);
	assert.equal(varied.uniqueTokens, 4);
	assert.equal(varied.typeTokenRatio, 1);

	assert.ok(varied.typeTokenRatio > repetitive.typeTokenRatio);
});

test("2. target word density with known target words (1 decimal place)", () => {
	const report = analyzeLyricsRichness("ancient fragile heart beat", CATALOG);
	assert.equal(report.totalTokens, 4);
	assert.equal(report.targetWordDensity, 50);

	const third = analyzeLyricsRichness("ancient moon star", CATALOG);
	assert.equal(third.totalTokens, 3);
	assert.equal(third.targetWordDensity, 33.3);

	const full = analyzeLyricsRichness("ancient fragile", CATALOG);
	assert.equal(full.targetWordDensity, 100);
});

test("3. averageComplexity is the mean complexity of matched target tokens", () => {
	const single = analyzeLyricsRichness("ancient ancient", CATALOG);
	assert.equal(single.targetWordDensity, 100);
	assert.equal(single.averageComplexity, calculateComplexityScore("ancient"));

	const pair = analyzeLyricsRichness("ancient fragile heart", CATALOG);
	const expected =
		(calculateComplexityScore("ancient") +
			calculateComplexityScore("fragile")) /
		2;
	assert.ok(
		Math.abs(pair.averageComplexity - expected) <= 0.001,
		`expected averageComplexity ~${expected}, got ${pair.averageComplexity}`,
	);
	assert.ok(pair.averageComplexity > 0 && pair.averageComplexity <= 1);
});

test("4. overallScore is always an integer within [0, 100]", () => {
	const samples = [
		"",
		"la la la la",
		"one two three four five six",
		"ancient fragile heart beat",
		"ancient fragile unprecedented indispensable",
	];

	for (const lyrics of samples) {
		const report = analyzeLyricsRichness(lyrics, CATALOG);
		assert.ok(
			Number.isInteger(report.overallScore),
			`overallScore for "${lyrics}" should be an integer, got ${report.overallScore}`,
		);
		assert.ok(
			report.overallScore >= 0 && report.overallScore <= 100,
			`overallScore for "${lyrics}" should be in [0, 100], got ${report.overallScore}`,
		);
	}

	const easy = analyzeLyricsRichness("la la la la", CATALOG);
	const advanced = analyzeLyricsRichness(
		"ancient fragile unprecedented indispensable",
		CATALOG,
	);
	assert.ok(advanced.overallScore > easy.overallScore);
});

test("5. empty and non-string text return all zeros and never throw", () => {
	const zeros = {
		totalTokens: 0,
		uniqueTokens: 0,
		typeTokenRatio: 0,
		targetWordDensity: 0,
		averageComplexity: 0,
		overallScore: 0,
	};
	const invalidInputs = [
		"",
		"   ",
		"\t\n",
		"!!! ??? ...",
		null,
		undefined,
		123,
		0,
		Number.NaN,
		{},
		[],
		true,
	];

	for (const input of invalidInputs) {
		assert.doesNotThrow(() => {
			assert.deepEqual(analyzeLyricsRichness(input, CATALOG), zeros);
		});
	}
});

test("6. no target words and non-array catalog give zero density and complexity", () => {
	const report = analyzeLyricsRichness("hello world sunny day", CATALOG);
	assert.equal(report.totalTokens, 4);
	assert.equal(report.targetWordDensity, 0);
	assert.equal(report.averageComplexity, 0);

	const emptyCatalog = analyzeLyricsRichness("ancient fragile", []);
	assert.equal(emptyCatalog.targetWordDensity, 0);
	assert.equal(emptyCatalog.averageComplexity, 0);

	for (const catalog of [null, undefined, "ancient", 42, {}]) {
		const noCatalog = analyzeLyricsRichness("ancient ancient", catalog);
		assert.equal(noCatalog.totalTokens, 2);
		assert.equal(noCatalog.targetWordDensity, 0);
		assert.equal(noCatalog.averageComplexity, 0);
	}
});

test("7. punctuation, case and apostrophes tokenize cleanly", () => {
	const messy = analyzeLyricsRichness("Ancient, ANCIENT! fragile?", CATALOG);
	const clean = analyzeLyricsRichness("ancient ancient fragile", CATALOG);
	assert.deepEqual(messy, clean);

	const apostrophes = analyzeLyricsRichness("Don't stop, don't stop!", []);
	assert.equal(apostrophes.totalTokens, 4);
	assert.equal(apostrophes.uniqueTokens, 2);
	assert.equal(apostrophes.typeTokenRatio, 0.5);

	const quoted = analyzeLyricsRichness("'Ancient!' (fragile)", CATALOG);
	assert.equal(quoted.totalTokens, 2);
	assert.equal(quoted.targetWordDensity, 100);
});

test("8. compareSongsByDifficulty orders easy before advanced and ties at 0", () => {
	const easy = { title: "Easy", lyrics: "la la la la" };
	const advanced = {
		title: "Advanced",
		lyrics: "ancient fragile unprecedented indispensable",
	};

	assert.ok(compareSongsByDifficulty(easy, advanced, CATALOG) < 0);
	assert.ok(compareSongsByDifficulty(advanced, easy, CATALOG) > 0);
	assert.equal(compareSongsByDifficulty(easy, easy, CATALOG), 0);
	assert.equal(
		compareSongsByDifficulty(
			{ lyrics: "ancient fragile" },
			{ lyrics: "ancient fragile" },
			CATALOG,
		),
		0,
	);

	// Plain-string songs are accepted too.
	assert.ok(
		compareSongsByDifficulty("la la la", "ancient fragile", CATALOG) < 0,
	);
});

test("9. compareSongsByDifficulty breaks overallScore ties by averageComplexity", () => {
	const catalog = [{ word: "ancient" }];
	const varied = { title: "Varied", lyrics: "one two three four" };
	const targeted = { title: "Targeted", lyrics: "ancient la la la" };

	assert.equal(
		analyzeLyricsRichness(varied.lyrics, catalog).overallScore,
		analyzeLyricsRichness(targeted.lyrics, catalog).overallScore,
	);
	assert.ok(
		analyzeLyricsRichness(targeted.lyrics, catalog).averageComplexity >
			analyzeLyricsRichness(varied.lyrics, catalog).averageComplexity,
	);
	assert.ok(compareSongsByDifficulty(varied, targeted, catalog) < 0);
	assert.ok(compareSongsByDifficulty(targeted, varied, catalog) > 0);
});

test("10. compareSongsByDifficulty is usable to sort songs with Array.sort", () => {
	const easy = { title: "Easy", lyrics: "la la la la" };
	const medium = { title: "Medium", lyrics: "ancient heart ancient heart" };
	const advanced = {
		title: "Advanced",
		lyrics: "ancient fragile unprecedented indispensable",
	};

	const sorted = [advanced, easy, medium].sort((a, b) =>
		compareSongsByDifficulty(a, b, CATALOG),
	);
	assert.deepEqual(
		sorted.map((song) => song.title),
		["Easy", "Medium", "Advanced"],
	);
});

test("11. string vocab entries in the catalog also match", () => {
	const report = analyzeLyricsRichness("ancient moon ancient", [
		"ancient",
		"fragile",
	]);
	assert.equal(report.totalTokens, 3);
	assert.equal(report.targetWordDensity, 66.7);
	assert.equal(report.averageComplexity, calculateComplexityScore("ancient"));
});
