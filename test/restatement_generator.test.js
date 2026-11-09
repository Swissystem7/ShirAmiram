const test = require("node:test");
const assert = require("node:assert/strict");
const {
	generateRestatementQuestion,
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
