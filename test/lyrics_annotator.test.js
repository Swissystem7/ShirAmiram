const test = require("node:test");
const assert = require("node:assert/strict");
const {
	tokenizeLine,
	annotateFullLyrics,
} = require("../src/lyrics_annotator.js");

const sampleCatalog = Object.freeze([
	{
		id: 1,
		word: "peace",
		part_of_speech: "noun",
		level: "A_foundational",
	},
	{
		id: 2,
		word: "journey",
		part_of_speech: "noun",
		level: "A_foundational",
	},
	{
		id: 3,
		word: "reach",
		part_of_speech: "verb",
		level: "A_foundational",
	},
	{
		id: 4,
		word: "calm",
		part_of_speech: "adjective",
		level: "A_foundational",
	},
	{
		id: 5,
		word: "achieve",
		part_of_speech: "verb",
		level: "A_foundational",
	},
	{
		id: 6,
		word: "mountain",
		part_of_speech: "noun",
		level: "A_foundational",
	},
	{
		id: 7,
		word: "wisdom",
		level: "A_foundational",
	},
]);

test("1. target word at the start, middle and end of a line with correct offsets", () => {
	const startLine = "Peace will guide our way.";
	const startTokens = tokenizeLine(startLine, sampleCatalog);
	assert.equal(startTokens[0].text, "Peace");
	assert.equal(startTokens[0].isTarget, true);
	assert.equal(startTokens[0].start, 0);
	assert.equal(startTokens[0].end, 5);
	assert.equal(
		startLine.slice(startTokens[0].start, startTokens[0].end),
		"Peace",
	);
	assert.equal(startTokens[0].wordMetadata?.cleanWord, "peace");
	assert.equal(startTokens[0].wordMetadata?.matchType, "exact");
	assert.equal(startTokens[0].wordMetadata?.partOfSpeech, "noun");

	const middleLine = "Together we find peace inside.";
	const middleTokens = tokenizeLine(middleLine, sampleCatalog);
	const midTarget = middleTokens.find((t) => t.isTarget);
	assert.ok(midTarget);
	assert.equal(midTarget.text, "peace");
	assert.equal(midTarget.start, 17);
	assert.equal(midTarget.end, 22);
	assert.equal(middleLine.slice(midTarget.start, midTarget.end), "peace");
	assert.equal(midTarget.wordMetadata?.cleanWord, "peace");

	const endLine = "All we need is peace";
	const endTokens = tokenizeLine(endLine, sampleCatalog);
	const lastToken = endTokens[endTokens.length - 1];
	assert.equal(lastToken.text, "peace");
	assert.equal(lastToken.isTarget, true);
	assert.equal(lastToken.start, 15);
	assert.equal(lastToken.end, 20);
	assert.equal(endLine.slice(lastToken.start, lastToken.end), "peace");
	assert.equal(lastToken.wordMetadata?.cleanWord, "peace");
});

test("2. exact 100% reconstruction for several lines including punctuation and multiple spaces", () => {
	const testLines = [
		"  Peace,  calm... and   quiet  --  now!  ",
		"Don't stop, we can't look back; it's our journey.",
		"Track 12: achieve & reach 100% success?!",
		"Simple lyrics without any target words here.",
		"",
	];

	for (const line of testLines) {
		const tokens = tokenizeLine(line, sampleCatalog);
		const reconstructed = tokens.map((t) => t.text).join("");
		assert.equal(reconstructed, line);
		for (const token of tokens) {
			assert.equal(line.slice(token.start, token.end), token.text);
		}
	}
});

test("3. stem matches (e.g. plural) flagged as 'stem'", () => {
	const line = "The journeys continue across the mountains.";
	const tokens = tokenizeLine(line, sampleCatalog);

	const journeysToken = tokens.find((t) => t.text === "journeys");
	assert.ok(journeysToken);
	assert.equal(journeysToken.isTarget, true);
	assert.equal(journeysToken.wordMetadata?.matchType, "stem");
	assert.equal(journeysToken.wordMetadata?.cleanWord, "journey");

	const mountainsToken = tokens.find((t) => t.text === "mountains");
	assert.ok(mountainsToken);
	assert.equal(mountainsToken.isTarget, true);
	assert.equal(mountainsToken.wordMetadata?.matchType, "stem");
	assert.equal(mountainsToken.wordMetadata?.cleanWord, "mountain");

	const verbLine = "We reached the peak while achieving success.";
	const verbTokens = tokenizeLine(verbLine, sampleCatalog);

	const reachedToken = verbTokens.find((t) => t.text === "reached");
	assert.ok(reachedToken);
	assert.equal(reachedToken.isTarget, true);
	assert.equal(reachedToken.wordMetadata?.matchType, "stem");
	assert.equal(reachedToken.wordMetadata?.cleanWord, "reach");

	const achievingToken = verbTokens.find((t) => t.text === "achieving");
	assert.ok(achievingToken);
	assert.equal(achievingToken.isTarget, true);
	assert.equal(achievingToken.wordMetadata?.matchType, "stem");
	assert.equal(achievingToken.wordMetadata?.cleanWord, "achieve");
});

test("4. lines without targets -> all isTarget false", () => {
	const line = "The quick brown fox jumps over the lazy dog.";
	const tokens = tokenizeLine(line, sampleCatalog);

	assert.ok(tokens.length > 0);
	for (const token of tokens) {
		assert.equal(token.isTarget, false);
		assert.equal(token.wordMetadata, null);
	}
	assert.equal(tokens.map((t) => t.text).join(""), line);
});

test("5. empty line, null, numbers", () => {
	assert.deepEqual(tokenizeLine("", sampleCatalog), []);
	assert.deepEqual(tokenizeLine(null, sampleCatalog), []);
	assert.deepEqual(tokenizeLine(undefined, sampleCatalog), []);
	assert.deepEqual(tokenizeLine(42, sampleCatalog), []);
	assert.deepEqual(tokenizeLine(0, sampleCatalog), []);

	const numberLine = "123 456";
	const numberTokens = tokenizeLine(numberLine, sampleCatalog);
	assert.equal(numberTokens.length, 3);
	assert.equal(numberTokens[0].text, "123");
	assert.equal(numberTokens[0].isTarget, false);
	assert.equal(numberTokens[0].wordMetadata, null);
	assert.equal(numberTokens[1].text, " ");
	assert.equal(numberTokens[1].isTarget, false);
	assert.equal(numberTokens[2].text, "456");
	assert.equal(numberTokens[2].isTarget, false);
	assert.equal(numberTokens.map((t) => t.text).join(""), numberLine);
});

test("6. punctuation attached to words is its own token", () => {
	const line = "peace, calm! (reach).";
	const tokens = tokenizeLine(line, sampleCatalog);

	assert.equal(tokens[0].text, "peace");
	assert.equal(tokens[0].isTarget, true);

	assert.equal(tokens[1].text, ",");
	assert.equal(tokens[1].isTarget, false);
	assert.equal(tokens[1].wordMetadata, null);

	assert.equal(tokens[2].text, " ");

	assert.equal(tokens[3].text, "calm");
	assert.equal(tokens[3].isTarget, true);

	assert.equal(tokens[4].text, "!");
	assert.equal(tokens[4].isTarget, false);

	assert.equal(tokens[5].text, " ");

	assert.equal(tokens[6].text, "(");
	assert.equal(tokens[6].isTarget, false);

	assert.equal(tokens[7].text, "reach");
	assert.equal(tokens[7].isTarget, true);

	assert.equal(tokens[8].text, ")");
	assert.equal(tokens[8].isTarget, false);

	assert.equal(tokens[9].text, ".");
	assert.equal(tokens[9].isTarget, false);

	assert.equal(tokens.map((t) => t.text).join(""), line);
	for (const token of tokens) {
		assert.equal(line.slice(token.start, token.end), token.text);
	}
});

test("7. annotateFullLyrics returns unique songTargetWords in order", () => {
	const lyricsLines = [
		"Peace is found along the journey.",
		"Many journeys await us on every mountain.",
		"We reach for peace again.",
		"To achieve and reach new heights.",
	];

	const result = annotateFullLyrics(lyricsLines, sampleCatalog);

	assert.equal(result.lines.length, 4);
	for (let i = 0; i < lyricsLines.length; i++) {
		assert.equal(result.lines[i].lineIndex, i);
		assert.equal(result.lines[i].text, lyricsLines[i]);
		assert.equal(
			result.lines[i].tokens.map((t) => t.text).join(""),
			lyricsLines[i],
		);
	}

	assert.deepEqual(result.songTargetWords, [
		"peace",
		"journey",
		"mountain",
		"reach",
		"achieve",
	]);
});

test("8. invalid input never throws", () => {
	assert.doesNotThrow(() => tokenizeLine(null, null));
	assert.doesNotThrow(() => tokenizeLine(undefined, undefined));
	assert.doesNotThrow(() => tokenizeLine(42, {}));
	assert.doesNotThrow(() => tokenizeLine("some text", null));
	assert.doesNotThrow(() => tokenizeLine("some text", undefined));
	assert.doesNotThrow(() => tokenizeLine("some text", "bad catalog"));
	assert.doesNotThrow(() => tokenizeLine("some text", { broken: true }));

	assert.deepEqual(tokenizeLine(null, null), []);
	assert.deepEqual(tokenizeLine(undefined, undefined), []);

	assert.doesNotThrow(() => annotateFullLyrics(null, sampleCatalog));
	assert.doesNotThrow(() => annotateFullLyrics(undefined, sampleCatalog));
	assert.doesNotThrow(() => annotateFullLyrics(12345, sampleCatalog));
	assert.doesNotThrow(() => annotateFullLyrics("not array", sampleCatalog));
	assert.doesNotThrow(() => annotateFullLyrics({}, sampleCatalog));
	assert.doesNotThrow(() =>
		annotateFullLyrics([null, 42, undefined, { notText: true }], sampleCatalog),
	);
	assert.doesNotThrow(() => annotateFullLyrics(["Peace"], null));

	assert.deepEqual(annotateFullLyrics(null, sampleCatalog), {
		lines: [],
		songTargetWords: [],
	});
	assert.deepEqual(annotateFullLyrics(12345, sampleCatalog), {
		lines: [],
		songTargetWords: [],
	});
	assert.deepEqual(annotateFullLyrics("not array", sampleCatalog), {
		lines: [],
		songTargetWords: [],
	});
});

test("9. partOfSpeech resolves from catalog item or falls back to classifyWord", () => {
	const line = "Seeking peace and wisdom.";
	const tokens = tokenizeLine(line, sampleCatalog);

	const peaceToken = tokens.find((t) => t.text === "peace");
	assert.ok(peaceToken);
	assert.equal(peaceToken.wordMetadata?.partOfSpeech, "noun");

	const wisdomToken = tokens.find((t) => t.text === "wisdom");
	assert.ok(wisdomToken);
	assert.equal(wisdomToken.wordMetadata?.partOfSpeech, "Noun");
});

test("10. tokenizeLine handles apostrophes inside words correctly", () => {
	const line = "Don't give up, it's our journey.";
	const tokens = tokenizeLine(line, sampleCatalog);

	const dontToken = tokens.find((t) => t.text === "Don't");
	assert.ok(dontToken);
	assert.equal(dontToken.isTarget, false);

	const itsToken = tokens.find((t) => t.text === "it's");
	assert.ok(itsToken);
	assert.equal(itsToken.isTarget, false);

	const journeyToken = tokens.find((t) => t.text === "journey");
	assert.ok(journeyToken);
	assert.equal(journeyToken.isTarget, true);

	assert.equal(tokens.map((t) => t.text).join(""), line);
});
