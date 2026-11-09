const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
	SECTION_TYPES,
	DEFAULT_CHORUS_REINFORCEMENT_FACTOR,
	segmentLyricsStructure,
	analyzeSectionVocabulary,
} = require("../src/song_segmenter.js");

const SAMPLE_CATALOG = Object.freeze([
	Object.freeze({ word: "ancient", level: "A_foundational" }),
	Object.freeze({ word: "fragile", level: "A_foundational" }),
	Object.freeze({ word: "peace", level: "A_foundational" }),
	Object.freeze({ word: "achieve", level: "A_foundational" }),
	Object.freeze({ word: "resilient", level: "B_intermediate" }),
	Object.freeze({ word: "journey", level: "A_foundational" }),
]);

test("1. segmentLyricsStructure: detects bracket tags [Verse 1], [Chorus], [Bridge], [Intro] with correct section types", () => {
	const lyrics = `
[Verse 1]
Walking through the ancient forest
Listening to the quiet breeze

[Chorus]
Fragile hearts will find their peace
Singing loud for all to hear

[Bridge]
Cross the river, climb the hill

[Intro]
Instrumental melody starts soft
`;

	const sections = segmentLyricsStructure(lyrics);
	assert.equal(sections.length, 4);

	assert.equal(sections[0].type, SECTION_TYPES.VERSE);
	assert.deepEqual(sections[0].lines, [
		"Walking through the ancient forest",
		"Listening to the quiet breeze",
	]);

	assert.equal(sections[1].type, SECTION_TYPES.CHORUS);
	assert.deepEqual(sections[1].lines, [
		"Fragile hearts will find their peace",
		"Singing loud for all to hear",
	]);

	assert.equal(sections[2].type, SECTION_TYPES.BRIDGE);
	assert.deepEqual(sections[2].lines, ["Cross the river, climb the hill"]);

	assert.equal(sections[3].type, SECTION_TYPES.OTHER);
	assert.deepEqual(sections[3].lines, ["Instrumental melody starts soft"]);
});

test("2. segmentLyricsStructure: detects colon tags like Verse 1:, Chorus:, Bridge: case-insensitively", () => {
	const lyrics = `
verse 1:
The morning sun begins to glow
A new adventure starts right now

CHORUS:
Hold the dream and achieve your goal
Fragile steps lead far away

Bridge:
When darkness falls we carry light
`;

	const sections = segmentLyricsStructure(lyrics);
	assert.equal(sections.length, 3);
	assert.equal(sections[0].type, SECTION_TYPES.VERSE);
	assert.equal(sections[1].type, SECTION_TYPES.CHORUS);
	assert.equal(sections[2].type, SECTION_TYPES.BRIDGE);
	assert.equal(sections[1].lines.length, 2);
});

test("3. segmentLyricsStructure: handles blank-line splits without tags as VERSE sections", () => {
	const lyrics = `
The ancient trees stand proud and tall
Shadows stretch along the wall

The gentle rain begins to fall
An answer to a distant call
`;

	const sections = segmentLyricsStructure(lyrics);
	assert.equal(sections.length, 2);
	assert.equal(sections[0].type, SECTION_TYPES.VERSE);
	assert.equal(sections[1].type, SECTION_TYPES.VERSE);
	assert.equal(sections[0].lines.length, 2);
	assert.equal(sections[1].lines.length, 2);
});

test("4. segmentLyricsStructure: continuous text without tags produces a single VERSE section", () => {
	const lyrics = `
No markers here at all
Just lines that follow each other
In a single continuous flow
`;

	const sections = segmentLyricsStructure(lyrics);
	assert.equal(sections.length, 1);
	assert.equal(sections[0].type, SECTION_TYPES.VERSE);
	assert.equal(sections[0].lines.length, 3);
	assert.equal(sections[0].lines[0], "No markers here at all");
	assert.equal(sections[0].lines[2], "In a single continuous flow");
});

test("5. segmentLyricsStructure: empty lyrics, whitespace, and non-string inputs return an empty array", () => {
	assert.deepEqual(segmentLyricsStructure(""), []);
	assert.deepEqual(segmentLyricsStructure("   \n\n\t   \n  "), []);
	assert.deepEqual(segmentLyricsStructure(null), []);
	assert.deepEqual(segmentLyricsStructure(undefined), []);
	assert.deepEqual(segmentLyricsStructure(12345), []);
	assert.deepEqual(segmentLyricsStructure({}), []);
});

test("6. segmentLyricsStructure: inline text on tag line is captured as the first line of that section", () => {
	const lyrics = `
[Verse 1] We start the day together
The birds begin to sing

Chorus: Hold the fragile melody
Never let the dream fade away
`;

	const sections = segmentLyricsStructure(lyrics);
	assert.equal(sections.length, 2);
	assert.equal(sections[0].type, SECTION_TYPES.VERSE);
	assert.equal(sections[0].lines[0], "We start the day together");
	assert.equal(sections[0].lines[1], "The birds begin to sing");

	assert.equal(sections[1].type, SECTION_TYPES.CHORUS);
	assert.equal(sections[1].lines[0], "Hold the fragile melody");
	assert.equal(sections[1].lines[1], "Never let the dream fade away");
});

test("7. analyzeSectionVocabulary: accurately counts target words per section via matchWord", () => {
	const sections = [
		{
			type: SECTION_TYPES.VERSE,
			lines: ["We seek the ancient path of peace"],
		},
		{
			type: SECTION_TYPES.CHORUS,
			lines: ["Our fragile dreams achieve the sky"],
		},
	];

	const report = analyzeSectionVocabulary(sections, SAMPLE_CATALOG);
	assert.equal(report.sections.length, 2);

	// Verse 1 matches: "ancient", "peace"
	assert.equal(report.sections[0].targetWordCount, 2);
	assert.ok(report.sections[0].targetWords.includes("ancient"));
	assert.ok(report.sections[0].targetWords.includes("peace"));

	// Chorus matches: "fragile", "achieve"
	assert.equal(report.sections[1].targetWordCount, 2);
	assert.ok(report.sections[1].targetWords.includes("fragile"));
	assert.ok(report.sections[1].targetWords.includes("achieve"));
});

test("8. analyzeSectionVocabulary: calculates totalChorusRepetitions correctly across repeated choruses", () => {
	const lyrics = `
[Verse 1]
We embark upon a journey

[Chorus]
Keep the peace and remain resilient

[Verse 2]
Through the mountains high

[Chorus]
Keep the peace and remain resilient

[Chorus]
Keep the peace and remain resilient
`;

	const sections = segmentLyricsStructure(lyrics);
	const report = analyzeSectionVocabulary(sections, SAMPLE_CATALOG);

	assert.equal(report.totalChorusRepetitions, 3);
	assert.equal(report.sections.length, 5);
});

test("9. analyzeSectionVocabulary: chorusReinforcementFactor amplifies chorus words into highImpactWords", () => {
	const sections = [
		{
			type: SECTION_TYPES.VERSE,
			lines: ["An ancient stone along the road"],
		},
		{
			type: SECTION_TYPES.CHORUS,
			lines: ["Hold the fragile light forever"],
		},
		{
			type: SECTION_TYPES.CHORUS,
			lines: ["Hold the fragile light forever"],
		},
	];

	// "fragile" appears in 2 choruses -> impact: 2 * 2 = 4
	// "ancient" appears in 1 verse -> impact: 1 * 1 = 1
	const report = analyzeSectionVocabulary(sections, SAMPLE_CATALOG);

	assert.ok(
		report.highImpactWords.includes("fragile"),
		"fragile must be in highImpactWords",
	);
	assert.ok(
		!report.highImpactWords.includes("ancient"),
		"ancient should not meet high impact threshold",
	);
	assert.equal(report.highImpactWords[0], "fragile");
});

test("10. analyzeSectionVocabulary: continuous text without tags has 0 chorus repetitions and ranks repeated words", () => {
	const lyrics = `
We achieve what we set out to achieve today
An ancient journey begins
`;

	const sections = segmentLyricsStructure(lyrics);
	const report = analyzeSectionVocabulary(sections, SAMPLE_CATALOG);

	assert.equal(report.totalChorusRepetitions, 0);
	assert.equal(report.sections.length, 1);
	// "achieve" appears twice in the verse -> impact = 2 >= 2
	// "ancient" appears once -> impact = 1
	// "journey" appears once -> impact = 1
	assert.ok(report.highImpactWords.includes("achieve"));
	assert.ok(!report.highImpactWords.includes("ancient"));
	assert.ok(!report.highImpactWords.includes("journey"));
});

test("11. analyzeSectionVocabulary: custom chorusReinforcementFactor and minImpactThreshold options", () => {
	assert.equal(DEFAULT_CHORUS_REINFORCEMENT_FACTOR, 2);

	const sections = [
		{
			type: SECTION_TYPES.CHORUS,
			lines: ["Finding peace"],
		},
	];

	// With factor 3: "peace" impact = 1 * 3 = 3
	const customReport = analyzeSectionVocabulary(sections, SAMPLE_CATALOG, {
		chorusReinforcementFactor: 3,
		minImpactThreshold: 3,
	});

	assert.equal(customReport.totalChorusRepetitions, 1);
	assert.ok(customReport.highImpactWords.includes("peace"));
	assert.equal(customReport.chorusReinforcementFactor, 3);
});

test("12. analyzeSectionVocabulary: empty sections, missing catalog, or invalid inputs return safe defaults", () => {
	const res1 = analyzeSectionVocabulary([], SAMPLE_CATALOG);
	assert.deepEqual(res1.sections, []);
	assert.equal(res1.totalChorusRepetitions, 0);
	assert.deepEqual(res1.highImpactWords, []);

	const res2 = analyzeSectionVocabulary(null, null);
	assert.deepEqual(res2.sections, []);
	assert.equal(res2.totalChorusRepetitions, 0);
	assert.deepEqual(res2.highImpactWords, []);

	const res3 = analyzeSectionVocabulary(
		[{ type: SECTION_TYPES.VERSE, lines: ["nothing matched here"] }],
		[],
	);
	assert.equal(res3.sections.length, 1);
	assert.equal(res3.sections[0].targetWordCount, 0);
	assert.deepEqual(res3.highImpactWords, []);
});

test("13. non-mutating behavior: frozen inputs (sections and catalog) are never mutated", () => {
	const frozenSections = Object.freeze([
		Object.freeze({
			type: SECTION_TYPES.VERSE,
			lines: Object.freeze(["ancient peace"]),
		}),
		Object.freeze({
			type: SECTION_TYPES.CHORUS,
			lines: Object.freeze(["fragile achieve"]),
		}),
	]);

	const report = analyzeSectionVocabulary(frozenSections, SAMPLE_CATALOG);
	assert.equal(report.sections.length, 2);
	assert.equal(report.totalChorusRepetitions, 1);
	assert.ok(report.highImpactWords.includes("fragile"));
});
