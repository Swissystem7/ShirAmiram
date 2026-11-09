const assert = require("node:assert/strict");
const { test } = require("node:test");
const { generateThematicPlaylist } = require("../src/playlist_generator.js");

const SAMPLE_CATALOG = [
	{
		id: "song-1",
		title: "Peaceful Mind",
		theme: "Peace",
		tags: ["peace", "calm", "relax"],
		words: ["peace", "calm"],
		durationMinutes: 3.0,
	},
	{
		id: "song-2",
		title: "Active Stride",
		theme: "Energy",
		tags: ["energy", "workout"],
		words: ["reach", "encourage"],
		durationMinutes: 4.0,
	},
	{
		id: "song-3",
		title: "Whispering Hope",
		theme: "Peace",
		tags: ["peace", "hope"],
		words: ["peace", "comfort", "wisdom", "hope"],
		durationMinutes: 3.5,
	},
	{
		id: "song-4",
		title: "Nature Dream",
		theme: "Nature",
		tags: ["nature", "beauty"],
		words: ["mountain", "valley", "birds", "sky", "silence"],
		durationMinutes: 5.0,
	},
	{
		id: "song-5",
		title: "Gentle Harmony",
		theme: "Peace",
		tags: ["peace", "summary"],
		words: ["peace", "wisdom"],
		isSummary: true,
		durationMinutes: 2.5,
	},
];

test("1. theme filter: case-insensitive matching on song theme and tags", () => {
	const res = generateThematicPlaylist(SAMPLE_CATALOG, { theme: "peace" });

	assert.ok(res.songs.length > 0, "Should find matching songs");
	for (const song of res.songs) {
		const matches =
			song.theme.toLowerCase() === "peace" ||
			song.tags?.some((t) => t.toLowerCase() === "peace");
		assert.ok(matches, `Song "${song.title}" must match theme "peace"`);
	}
	assert.ok(
		res.playlistTitle.includes("peace"),
		"Hebrew title must mention the theme",
	);

	// Case-insensitive test with uppercase
	const resUpper = generateThematicPlaylist(SAMPLE_CATALOG, {
		theme: "PEACE",
	});
	assert.equal(resUpper.songs.length, res.songs.length);

	// Tag match where theme is different
	const tagCatalog = [
		{
			id: 1,
			title: "Tag Song",
			theme: "General",
			tags: ["serenity", "peace"],
			words: ["peace"],
		},
	];
	const resTag = generateThematicPlaylist(tagCatalog, { theme: "peace" });
	assert.equal(resTag.songs.length, 1);
});

test("2. POS filter: filters songs containing at least one word of targetPOS", () => {
	// "reach" and "encourage" are Verbs; "peace" and "comfort" are Nouns
	const resVerb = generateThematicPlaylist(SAMPLE_CATALOG, {
		targetPOS: "Verb",
	});
	assert.ok(resVerb.songs.length >= 1);
	assert.equal(resVerb.songs[0].id, "song-2");
	assert.ok(
		resVerb.playlistTitle.includes("Verb"),
		"Hebrew title must mention the targetPOS",
	);

	// Filter by Noun
	const resNoun = generateThematicPlaylist(SAMPLE_CATALOG, {
		targetPOS: "Noun",
	});
	const nounIds = resNoun.songs.map((s) => s.id);
	assert.ok(nounIds.includes("song-1"));
	assert.ok(nounIds.includes("song-3"));
	assert.ok(nounIds.includes("song-5"));
	assert.ok(!nounIds.includes("song-2"));
});

test("3. max duration respected: total duration never exceeds maxDurationMinutes", () => {
	const res = generateThematicPlaylist(SAMPLE_CATALOG, {
		maxDurationMinutes: 6.0,
	});

	assert.ok(
		res.totalDurationMinutes <= 6.0,
		`Total duration ${res.totalDurationMinutes} must be <= 6.0`,
	);
	let actualDuration = 0;
	for (const s of res.songs) {
		actualDuration += s.durationMinutes || 3.5;
	}
	assert.equal(res.totalDurationMinutes, actualDuration);

	// Very tight duration that only fits opener
	const tight = generateThematicPlaylist(SAMPLE_CATALOG, {
		maxDurationMinutes: 3.0,
	});
	assert.ok(tight.totalDurationMinutes <= 3.0);
	assert.equal(tight.songs.length, 1);
	assert.equal(tight.songs[0].id, "song-5");
	assert.equal(tight.totalDurationMinutes, 2.5);
});

test("4. max songs respected: number of songs in playlist never exceeds maxSongs", () => {
	const catalog = Array.from({ length: 10 }, (_, i) => ({
		id: `gen-${i + 1}`,
		title: `Song ${i + 1}`,
		theme: "Study",
		words: ["word", `term_${i}`],
		durationMinutes: 1.0,
	}));

	const res3 = generateThematicPlaylist(catalog, {
		theme: "Study",
		maxSongs: 3,
		maxDurationMinutes: 50,
	});
	assert.equal(res3.songs.length, 3);

	const resDefault = generateThematicPlaylist(catalog, {
		theme: "Study",
		maxDurationMinutes: 50,
	});
	assert.equal(resDefault.songs.length, 5); // default maxSongs is 5
});

test("5. 3.5 default and custom duration: respects durationMinutes and falls back to 3.5", () => {
	const catalog = [
		{
			id: 1,
			title: "Song with custom duration",
			words: ["peace"],
			durationMinutes: 4.8,
		},
		{
			id: 2,
			title: "Song with missing duration",
			words: ["peace", "calm"],
		},
		{
			id: 3,
			title: "Song with invalid duration 0",
			words: ["peace", "comfort"],
			durationMinutes: 0,
		},
		{
			id: 4,
			title: "Song with negative duration",
			words: ["peace", "wisdom"],
			durationMinutes: -2,
		},
	];

	const res = generateThematicPlaylist(catalog, { maxDurationMinutes: 50 });
	assert.equal(res.songs.length, 4);

	// 4.8 + 3.5 + 3.5 + 3.5 = 15.3
	assert.equal(res.totalDurationMinutes, 15.3);
});

test("6. covered vocabulary unique: coveredVocabulary has unique strings without duplicates", () => {
	const catalog = [
		{
			id: 1,
			title: "Song 1",
			words: ["peace", "calm", "wisdom"],
		},
		{
			id: 2,
			title: "Song 2",
			words: ["calm", "wisdom", "hope"],
		},
		{
			id: 3,
			title: "Song 3",
			words: ["hope", "peace", "comfort"],
		},
	];

	const res = generateThematicPlaylist(catalog, { maxDurationMinutes: 50 });
	const words = res.coveredVocabulary;

	// No duplicates in coveredVocabulary
	const uniqueWords = new Set(words);
	assert.equal(words.length, uniqueWords.size, "Words must be unique");

	// All expected words are present
	assert.ok(uniqueWords.has("peace"));
	assert.ok(uniqueWords.has("calm"));
	assert.ok(uniqueWords.has("wisdom"));
	assert.ok(uniqueWords.has("hope"));
	assert.ok(uniqueWords.has("comfort"));
});

test("7. order simple->complex: light opener first, then word-richest songs, then closing summary song", () => {
	const catalog = [
		{
			id: "s-rich-1",
			title: "Richest Anthem",
			words: [
				"peace",
				"comfort",
				"acceptance",
				"wisdom",
				"calm",
				"memory",
				"regret",
				"time",
			], // 8 words
			durationMinutes: 2.0,
		},
		{
			id: "s-opener",
			title: "Light Opener Song",
			words: ["peace"], // 1 word (fewest words)
			durationMinutes: 2.0,
		},
		{
			id: "s-rich-2",
			title: "Second Richest Song",
			words: ["peace", "comfort", "acceptance", "wisdom", "calm"], // 5 words
			durationMinutes: 2.0,
		},
		{
			id: "s-summary",
			title: "Closing Summary Ballad",
			words: ["peace", "comfort", "wisdom"], // 3 words, explicit summary
			isSummary: true,
			durationMinutes: 2.0,
		},
	];

	const res = generateThematicPlaylist(catalog, {
		maxSongs: 4,
		maxDurationMinutes: 20,
	});

	assert.equal(res.songs.length, 4);

	// First song must be the light opener with fewest distinct words
	assert.equal(
		res.songs[0].id,
		"s-opener",
		"Opener must have fewest distinct words",
	);

	// Last song must be the closing summary song
	assert.equal(
		res.songs[3].id,
		"s-summary",
		"Last song must be the closing summary song",
	);

	// Middle songs must be the word-richest songs ordered descending
	assert.equal(res.songs[1].id, "s-rich-1");
	assert.equal(res.songs[2].id, "s-rich-2");
});

test("8. empty catalog / theme with no match: handles gracefully without throwing", () => {
	// Empty array
	const resEmpty = generateThematicPlaylist([]);
	assert.deepEqual(resEmpty.songs, []);
	assert.equal(resEmpty.totalDurationMinutes, 0);
	assert.deepEqual(resEmpty.coveredVocabulary, []);
	assert.equal(typeof resEmpty.playlistTitle, "string");

	// Null / undefined catalog
	const resNull = generateThematicPlaylist(null);
	assert.deepEqual(resNull.songs, []);
	assert.equal(resNull.totalDurationMinutes, 0);
	assert.deepEqual(resNull.coveredVocabulary, []);

	const resUndefined = generateThematicPlaylist(undefined);
	assert.deepEqual(resUndefined.songs, []);
	assert.equal(resUndefined.totalDurationMinutes, 0);

	// Theme with no matches
	const resNoMatch = generateThematicPlaylist(SAMPLE_CATALOG, {
		theme: "astronomy-in-space",
	});
	assert.deepEqual(resNoMatch.songs, []);
	assert.equal(resNoMatch.totalDurationMinutes, 0);
	assert.deepEqual(resNoMatch.coveredVocabulary, []);
	assert.ok(resNoMatch.playlistTitle.includes("astronomy-in-space"));
});

test("9. input not mutated: frozen catalog, songs and options are never modified", () => {
	const frozenSong1 = Object.freeze({
		id: 1,
		title: "Frozen Peace",
		theme: "peace",
		words: Object.freeze(["peace", "calm"]),
		durationMinutes: 3.5,
	});
	const frozenSong2 = Object.freeze({
		id: 2,
		title: "Frozen Energy",
		theme: "peace",
		words: Object.freeze(["peace", "wisdom", "comfort"]),
		durationMinutes: 3.5,
	});
	const frozenCatalog = Object.freeze([frozenSong1, frozenSong2]);
	const frozenOptions = Object.freeze({
		theme: "peace",
		maxDurationMinutes: 10,
		maxSongs: 5,
	});

	// Should execute without throwing or modifying frozen objects
	const res = generateThematicPlaylist(frozenCatalog, frozenOptions);

	assert.equal(res.songs.length, 2);
	assert.equal(frozenCatalog.length, 2);
	assert.equal(frozenCatalog[0].id, 1);
	assert.equal(frozenCatalog[1].id, 2);
});

test("10. matchWord inflection integration: matches inflected forms in lyrics/words against vocabulary", () => {
	const catalog = [
		{
			id: "inflect-1",
			title: "Song of Movement",
			theme: "Motion",
			words: ["reaching"], // inflected form of "reach" (Verb)
			durationMinutes: 3.0,
		},
		{
			id: "inflect-2",
			title: "Song of Stillness",
			theme: "Stillness",
			words: ["peace"], // Noun
			durationMinutes: 3.0,
		},
	];

	// Target POS Verb: "reaching" stems to "reach", classified as Verb
	const resVerb = generateThematicPlaylist(catalog, {
		targetPOS: "Verb",
	});
	assert.equal(resVerb.songs.length, 1);
	assert.equal(resVerb.songs[0].id, "inflect-1");
	assert.ok(
		resVerb.coveredVocabulary.includes("reach") ||
			resVerb.coveredVocabulary.includes("reaching"),
	);
});
