// ShirAmiram — Unit tests for song due-words recommender
const test = require("node:test");
const assert = require("node:assert/strict");
const {
	calculateSongCoverage,
	rankSongsForReview,
} = require("../src/song_recommender.js");

const INLINE_CATALOG = [
	{
		id: "1",
		title: "Anthem of Achieve",
		target_words: ["achieve", "adapt", "affect"],
		lyrics: "We learn to achieve and adapt each day.",
	},
	{
		id: "2",
		title: "Anthem of Challenge",
		target_words: ["challenge", "conduct", "concept", "conclude"],
		lyrics: "Every challenge brings a new concept to conclude.",
	},
	{
		id: "3",
		title: "Anthem of Authority",
		target_words: ["authority", "available", "benefit"],
		lyrics: "The authority made benefit available for everyone.",
	},
];

test("1. coverage for an exact and an inflected (stem) match", () => {
	const song = INLINE_CATALOG[0];

	// Exact match
	const exactRes = calculateSongCoverage(song, ["achieve"]);
	assert.deepEqual(exactRes.matchedWords, ["achieve"]);
	assert.equal(exactRes.coverageCount, 1);
	assert.equal(exactRes.coverageRatio, 1);

	// Inflected stem matches (gerund, 3rd person singular, past tense)
	const inflectedRes = calculateSongCoverage(song, [
		"achieving",
		"adapts",
		"affected",
	]);
	assert.deepEqual(inflectedRes.matchedWords, [
		"achieving",
		"adapts",
		"affected",
	]);
	assert.equal(inflectedRes.coverageCount, 3);
	assert.equal(inflectedRes.coverageRatio, 1);

	// Due words as objects with word, term, and id fields
	const objRes = calculateSongCoverage(song, [
		{ word: "achieving" },
		{ term: "adapt" },
		{ id: "affect" },
		"unmatched",
	]);
	assert.deepEqual(objRes.matchedWords, ["achieving", "adapt", "affect"]);
	assert.equal(objRes.coverageCount, 3);
	assert.equal(objRes.coverageRatio, 0.75);
});

test("2. ranking by coverage", () => {
	const due = ["achieve", "adapt", "concept", "conclude", "conduct"];
	const ranked = rankSongsForReview(INLINE_CATALOG, due);

	// Song 2 covers 3 words (concept, conclude, conduct)
	// Song 1 covers 2 words (achieve, adapt)
	// Song 3 covers 0 words (ignored)
	assert.equal(ranked.length, 2);
	assert.equal(ranked[0].songId, "2");
	assert.equal(ranked[0].coverageCount, 3);
	assert.deepEqual(ranked[0].matchedWords, ["concept", "conclude", "conduct"]);
	assert.equal(ranked[1].songId, "1");
	assert.equal(ranked[1].coverageCount, 2);
	assert.deepEqual(ranked[1].matchedWords, ["achieve", "adapt"]);
});

test("3. deterministic tie-break by lyrics length and then by id", () => {
	// 3a. Tie-break by lyrics length (shorter song wins, missing lyrics counts as Infinity)
	const lyricsCatalog = [
		{
			id: "song-long",
			title: "Long Lyrics",
			target_words: ["achieve"],
			lyrics: "This is a much longer lyrics string for testing tie breaks.",
		},
		{
			id: "song-short",
			title: "Short Lyrics",
			target_words: ["achieve"],
			lyrics: "Short lyrics",
		},
		{
			id: "song-no-lyrics",
			title: "Missing Lyrics",
			target_words: ["achieve"],
			lyrics: null,
		},
	];
	const rankedByLyrics = rankSongsForReview(lyricsCatalog, ["achieve"]);
	assert.equal(rankedByLyrics.length, 3);
	assert.equal(rankedByLyrics[0].songId, "song-short");
	assert.equal(rankedByLyrics[1].songId, "song-long");
	assert.equal(rankedByLyrics[2].songId, "song-no-lyrics");

	// 3b. Tie-break by id when coverage and lyrics length are equal
	// Numeric string ids: 2 should precede 10
	const numericIdCatalog = [
		{
			id: "10",
			title: "Ten",
			target_words: ["achieve"],
			lyrics: "Same length lyrics",
		},
		{
			id: "2",
			title: "Two",
			target_words: ["achieve"],
			lyrics: "Same length lyrics",
		},
		{
			id: "1",
			title: "One",
			target_words: ["achieve"],
			lyrics: "Same length lyrics",
		},
	];
	const rankedNumeric = rankSongsForReview(numericIdCatalog, ["achieve"]);
	assert.deepEqual(
		rankedNumeric.map((s) => s.songId),
		["1", "2", "10"],
	);

	// String ids: lexicographic compare
	const stringIdCatalog = [
		{
			id: "beta",
			title: "Beta",
			target_words: ["achieve"],
			lyrics: "Same length lyrics",
		},
		{
			id: "alpha",
			title: "Alpha",
			target_words: ["achieve"],
			lyrics: "Same length lyrics",
		},
	];
	const rankedString = rankSongsForReview(stringIdCatalog, ["achieve"]);
	assert.deepEqual(
		rankedString.map((s) => s.songId),
		["alpha", "beta"],
	);
});

test("4. limit option and default 5", () => {
	const largeCatalog = Array.from({ length: 8 }, (_, idx) => ({
		id: String(idx + 1),
		title: `Song ${idx + 1}`,
		target_words: ["achieve"],
		lyrics: `Lyrics for song ${idx + 1}`,
	}));

	// Default limit 5
	const defaultRanked = rankSongsForReview(largeCatalog, ["achieve"]);
	assert.equal(defaultRanked.length, 5);
	assert.deepEqual(
		defaultRanked.map((s) => s.songId),
		["1", "2", "3", "4", "5"],
	);

	// Custom limit 2
	const limitTwo = rankSongsForReview(largeCatalog, ["achieve"], { limit: 2 });
	assert.equal(limitTwo.length, 2);
	assert.deepEqual(
		limitTwo.map((s) => s.songId),
		["1", "2"],
	);

	// Custom limit larger than catalog
	const limitTen = rankSongsForReview(largeCatalog, ["achieve"], {
		limit: 10,
	});
	assert.equal(limitTen.length, 8);
});

test("5. reason text for 1 and 3 words", () => {
	const catalog = [
		{
			id: "1",
			title: "Single Match",
			target_words: ["achieve"],
			lyrics: "Song 1",
		},
		{
			id: "2",
			title: "Triple Match",
			target_words: ["adapt", "concept", "conclude"],
			lyrics: "Song 2",
		},
	];

	const ranked = rankSongsForReview(catalog, [
		"achieve",
		"adapt",
		"concept",
		"conclude",
	]);
	const triple = ranked.find((item) => item.songId === "2");
	const single = ranked.find((item) => item.songId === "1");

	assert.equal(triple.coverageCount, 3);
	assert.equal(triple.reason, "מכסה 3 מילים לחזרה: adapt, concept, conclude");

	assert.equal(single.coverageCount, 1);
	assert.equal(single.reason, "מכסה מילה אחת לחזרה: achieve");
});

test("6. empty due words and songs with no matches", () => {
	const song = INLINE_CATALOG[0];

	// Empty due words array
	const emptyRes = calculateSongCoverage(song, []);
	assert.deepEqual(emptyRes, {
		matchedWords: [],
		coverageCount: 0,
		coverageRatio: 0,
	});
	assert.deepEqual(rankSongsForReview(INLINE_CATALOG, []), []);

	// Due words with zero matches
	const noMatchRes = calculateSongCoverage(song, ["unrelated", "unknown"]);
	assert.deepEqual(noMatchRes, {
		matchedWords: [],
		coverageCount: 0,
		coverageRatio: 0,
	});

	// rankSongsForReview drops songs with 0 coverageCount
	assert.deepEqual(
		rankSongsForReview(INLINE_CATALOG, ["unrelated", "unknown"]),
		[],
	);
});

test("7. Python-list string target_words", () => {
	const stringCatalog = [
		{
			id: "py-1",
			title: "Python Single Quoted List",
			target_words: "['achieve', 'adapt', 'affect']",
			lyrics: "Lyrics text here",
		},
		{
			id: "py-2",
			title: "JSON Double Quoted List",
			target_words: '["concept", "conclude"]',
			lyrics: "Lyrics text here",
		},
	];

	const coveragePy1 = calculateSongCoverage(stringCatalog[0], ["achieve"]);
	assert.deepEqual(coveragePy1.matchedWords, ["achieve"]);
	assert.equal(coveragePy1.coverageCount, 1);

	const ranked = rankSongsForReview(stringCatalog, ["achieve", "concept"]);
	assert.equal(ranked.length, 2);
	assert.equal(ranked[0].matchedWords.length, 1);
	assert.equal(ranked[1].matchedWords.length, 1);
});

test("8. invalid inputs never throw", () => {
	// calculateSongCoverage with malformed inputs
	assert.deepEqual(calculateSongCoverage(null, null), {
		matchedWords: [],
		coverageCount: 0,
		coverageRatio: 0,
	});
	assert.deepEqual(calculateSongCoverage(undefined, undefined), {
		matchedWords: [],
		coverageCount: 0,
		coverageRatio: 0,
	});
	assert.deepEqual(calculateSongCoverage(42, "invalid"), {
		matchedWords: [],
		coverageCount: 0,
		coverageRatio: 0,
	});
	assert.deepEqual(calculateSongCoverage({}, {}), {
		matchedWords: [],
		coverageCount: 0,
		coverageRatio: 0,
	});
	assert.deepEqual(
		calculateSongCoverage({ target_words: null }, [null, 123, {}]),
		{ matchedWords: [], coverageCount: 0, coverageRatio: 0 },
	);

	// rankSongsForReview with malformed inputs
	assert.deepEqual(rankSongsForReview(null, null), []);
	assert.deepEqual(rankSongsForReview("catalog", ["achieve"]), []);
	assert.deepEqual(rankSongsForReview(undefined, ["achieve"]), []);

	// Mixed catalog with malformed entries
	const mixedCatalog = [
		null,
		undefined,
		42,
		"song",
		{},
		{ id: "valid", title: "Valid", target_words: ["achieve"], lyrics: "Text" },
	];
	const ranked = rankSongsForReview(mixedCatalog, ["achieve"], null);
	assert.equal(ranked.length, 1);
	assert.equal(ranked[0].songId, "valid");
});

test("9. input not mutated", () => {
	const catalog = Object.freeze([
		Object.freeze({
			id: "1",
			title: "Frozen One",
			target_words: Object.freeze(["achieve", "adapt"]),
			lyrics: "Frozen lyrics one",
		}),
		Object.freeze({
			id: "2",
			title: "Frozen Two",
			target_words: Object.freeze(["concept", "conclude"]),
			lyrics: "Frozen lyrics two",
		}),
	]);

	const dueWords = Object.freeze([
		Object.freeze({ word: "achieve" }),
		Object.freeze({ term: "adapt" }),
		"concept",
	]);

	const options = Object.freeze({ limit: 2 });

	assert.doesNotThrow(() => {
		calculateSongCoverage(catalog[0], dueWords);
		rankSongsForReview(catalog, dueWords, options);
	});
});

test("10. due words deduplication in order and ratio calculation", () => {
	const song = {
		id: "1",
		title: "Song",
		target_words: ["achieve", "adapt"],
	};

	// Due words with duplicates and varying casings/shapes
	const due = [
		"  ACHIEVE  ",
		{ word: "achieve" },
		{ term: "adapt" },
		"ADAPT",
		"unmatched",
	];

	// Unique due words are: 'achieve', 'adapt', 'unmatched' (3 unique words)
	// Matched words: 'achieve', 'adapt' (2 words)
	// Ratio: 2 / 3 = 0.667
	const coverage = calculateSongCoverage(song, due);
	assert.deepEqual(coverage.matchedWords, ["achieve", "adapt"]);
	assert.equal(coverage.coverageCount, 2);
	assert.equal(coverage.coverageRatio, 0.667);
});
