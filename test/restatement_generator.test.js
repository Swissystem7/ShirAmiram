const test = require("node:test");
const assert = require("node:assert/strict");
const {
	generateRestatementQuestion,
	buildRestatedSentence,
} = require("../src/restatement_generator.js");

test("generateRestatementQuestion: shape and correct synonym", () => {
	const q = generateRestatementQuestion({
		originalSentence: "The garden was abundant with flowers.",
		targetWord: "abundant",
		seed: 1,
	});
	assert.equal(q.originalSentence, "The garden was abundant with flowers.");
	assert.equal(q.targetWord, "abundant");
	assert.equal(q.choices.length, 4);
	assert.ok(q.correctIndex >= 0 && q.correctIndex < 4);
	assert.equal(q.choices[q.correctIndex], "plentiful");
});

test("generateRestatementQuestion: includes antonym distractor", () => {
	const q = generateRestatementQuestion({
		originalSentence: "The ruins looked ancient.",
		targetWord: "ancient",
		seed: 2,
	});
	assert.ok(q.choices.includes("modern"));
});

test("generateRestatementQuestion: includes negation trap", () => {
	const q = generateRestatementQuestion({
		originalSentence: "Glass can be fragile.",
		targetWord: "fragile",
		customSynonym: "delicate",
		seed: 3,
	});
	assert.ok(q.choices.includes("not delicate"));
	assert.equal(q.choices[q.correctIndex], "delicate");
});

test("generateRestatementQuestion: custom synonym and antonym", () => {
	const q = generateRestatementQuestion({
		originalSentence: "x",
		targetWord: "abundant",
		customSynonym: "bountiful",
		customAntonym: "sparse",
		seed: 4,
	});
	assert.equal(q.choices[q.correctIndex], "bountiful");
	assert.ok(q.choices.includes("sparse"));
});

test("generateRestatementQuestion: deterministic with same seed", () => {
	const a = generateRestatementQuestion({
		originalSentence: "A",
		targetWord: "abundant",
		seed: 99,
	});
	const b = generateRestatementQuestion({
		originalSentence: "A",
		targetWord: "abundant",
		seed: 99,
	});
	assert.deepEqual(a, b);
});

test("generateRestatementQuestion: different seeds can shuffle differently", () => {
	const seen = new Set();
	for (let seed = 0; seed < 20; seed++) {
		const q = generateRestatementQuestion({
			originalSentence: "A",
			targetWord: "abundant",
			seed,
		});
		seen.add(q.choices.join("|"));
	}
	assert.ok(seen.size >= 2);
});

test("generateRestatementQuestion: four unique choice slots", () => {
	const q = generateRestatementQuestion({
		originalSentence: "A",
		targetWord: "fragile",
		seed: 7,
	});
	assert.equal(new Set(q.choices).size, 4);
});

test("generateRestatementQuestion: unrelated distractor present", () => {
	const q = generateRestatementQuestion({
		originalSentence: "A",
		targetWord: "abundant",
		customSynonym: "plentiful",
		customAntonym: "scarce",
		seed: 11,
	});
	const extras = q.choices.filter(
		(c) => c !== "plentiful" && c !== "scarce" && c !== "not plentiful",
	);
	assert.equal(extras.length, 1);
});

test("generateRestatementQuestion: prevents identical synonym/restated sentence when customSynonym matches targetWord", () => {
	const original = "The garden was abundant with flowers.";
	const q = generateRestatementQuestion({
		originalSentence: original,
		targetWord: "abundant",
		customSynonym: "abundant",
		seed: 12,
	});
	const correctChoice = q.choices[q.correctIndex];
	assert.notEqual(correctChoice.toLowerCase(), "abundant");
	assert.equal(correctChoice, "plentiful");
	assert.notEqual(q.restatedSentence, q.originalSentence);
	assert.equal(q.restatedSentence, "The garden was plentiful with flowers.");

	// Case-insensitive and whitespace-padded identical customSynonym
	const qCase = generateRestatementQuestion({
		originalSentence: "The ruins looked Ancient.",
		targetWord: "ancient",
		customSynonym: "  ANCIENT  ",
		seed: 13,
	});
	assert.notEqual(qCase.choices[qCase.correctIndex].toLowerCase(), "ancient");
	assert.equal(qCase.choices[qCase.correctIndex], "archaic");
	assert.notEqual(qCase.restatedSentence, qCase.originalSentence);
	assert.equal(qCase.restatedSentence, "The ruins looked Archaic.");
});

test("generateRestatementQuestion: prevents identical synonym and restatedSentence for unknown targetWord", () => {
	const original = "The phenomenon was ubiquitous across the continent.";
	const q = generateRestatementQuestion({
		originalSentence: original,
		targetWord: "ubiquitous",
		seed: 14,
	});
	const correctChoice = q.choices[q.correctIndex];
	assert.notEqual(correctChoice.toLowerCase(), "ubiquitous");
	assert.notEqual(q.restatedSentence, q.originalSentence);
	assert.ok(q.restatedSentence.includes(correctChoice));

	// Unknown targetWord with identical customSynonym
	const qCustomSame = generateRestatementQuestion({
		originalSentence: original,
		targetWord: "ubiquitous",
		customSynonym: "ubiquitous",
		seed: 15,
	});
	assert.notEqual(
		qCustomSame.choices[qCustomSame.correctIndex].toLowerCase(),
		"ubiquitous",
	);
	assert.notEqual(qCustomSame.restatedSentence, qCustomSame.originalSentence);
});

test("buildRestatedSentence: never returns a sentence identical to originalSentence", () => {
	const original = "Glass can be fragile.";
	const restatedDiff = buildRestatedSentence(original, "fragile", "delicate");
	assert.equal(restatedDiff, "Glass can be delicate.");
	assert.notEqual(restatedDiff, original);

	// Direct call with synonym identical to targetWord
	const restatedSame = buildRestatedSentence(original, "fragile", "fragile");
	assert.notEqual(restatedSame, original);
	assert.notEqual(restatedSame.toLowerCase(), original.toLowerCase());

	// Case-insensitive identical synonym
	const restatedCase = buildRestatedSentence(original, "fragile", "FRAGILE");
	assert.notEqual(restatedCase.toLowerCase(), original.toLowerCase());

	// Target word missing from sentence still produces non-identical restatement
	const restatedMissing = buildRestatedSentence(
		original,
		"nonexistent",
		"nonexistent",
	);
	assert.notEqual(restatedMissing, original);
});
