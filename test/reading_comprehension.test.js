const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const AmiramReading = require("../src/reading_comprehension.js");

const PASSAGES_PATH = path.join(
	__dirname,
	"..",
	"data",
	"imports",
	"amiram_reading_passages.json",
);

test("1. amiram_reading_passages.json contains 3 authentic passages across levels A, B, and C", () => {
	assert.ok(fs.existsSync(PASSAGES_PATH), "Passages file must exist");
	const raw = fs.readFileSync(PASSAGES_PATH, "utf-8");
	const data = JSON.parse(raw);
	assert.equal(data.length, 3, "Should have exactly 3 reading passages");

	const levels = data.map((p) => p.level);
	assert.ok(levels.includes("A_foundational"), "Must include level A");
	assert.ok(levels.includes("B_intermediate"), "Must include level B");
	assert.ok(levels.includes("C_advanced"), "Must include level C");
});

test("2. Every passage has paragraphs, target vocab, and exactly 5 multiple choice questions", () => {
	const data = JSON.parse(fs.readFileSync(PASSAGES_PATH, "utf-8"));

	data.forEach((p) => {
		assert.ok(p.id, "Passage must have id");
		assert.ok(p.title, "Passage must have title");
		assert.ok(
			Array.isArray(p.paragraphs) && p.paragraphs.length >= 2,
			"Must have at least 2 paragraphs",
		);
		assert.ok(
			Array.isArray(p.target_vocab) && p.target_vocab.length >= 3,
			"Must have target vocab words",
		);
		assert.equal(
			p.questions.length,
			5,
			"Must have exactly 5 questions per passage",
		);

		p.questions.forEach((q) => {
			assert.ok(q.id, "Question must have id");
			assert.ok(q.type, "Question must specify type (main_idea, detail, etc.)");
			assert.ok(q.question, "Question text required");
			assert.equal(q.options.length, 4, "Must have exactly 4 options");
			assert.ok(
				q.correct_index >= 0 && q.correct_index <= 3,
				"Valid correct index",
			);
			assert.ok(
				q.hebrew_explanation && q.hebrew_explanation.length > 10,
				"Hebrew explanation required",
			);
		});
	});
});

test("3. filterByLevel filters accurately by level A, B, and C", () => {
	const data = JSON.parse(fs.readFileSync(PASSAGES_PATH, "utf-8"));

	const aList = AmiramReading.filterByLevel(data, "A_foundational");
	assert.equal(aList.length, 1);
	assert.equal(aList[0].level, "A_foundational");

	const bList = AmiramReading.filterByLevel(data, "B_intermediate");
	assert.equal(bList.length, 1);
	assert.equal(bList[0].level, "B_intermediate");

	const cList = AmiramReading.filterByLevel(data, "C_advanced");
	assert.equal(cList.length, 1);
	assert.equal(cList[0].level, "C_advanced");

	const allList = AmiramReading.filterByLevel(data, "all");
	assert.equal(allList.length, 3);
});

test("4. formatParagraphLines generates line numbers with 5-line interval markers", () => {
	const sample =
		"Word1 Word2 Word3 Word4 Word5 Word6 Word7 Word8 Word9 Word10 Word11 Word12 Word13 Word14 Word15 Word16 Word17 Word18 Word19 Word20 Word21 Word22";
	const res = AmiramReading.formatParagraphLines(sample, 1, 4);

	assert.ok(res.formattedHtml.includes('class="rc-line"'), "Should wrap lines");
	assert.ok(res.endLineNumber > 1, "End line number should increment");
	assert.ok(
		res.formattedHtml.includes("(5)"),
		"Marker at line 5 should be present",
	);
});

test("5. highlightVocab wraps target words in interactive badges", () => {
	const text =
		"Students can achieve higher results when they adapt modern methods.";
	const targets = ["achieve", "adapt"];
	const highlighted = AmiramReading.highlightVocab(text, targets);

	assert.ok(highlighted.includes('class="rc-target-word" data-word="achieve"'));
	assert.ok(highlighted.includes('class="rc-target-word" data-word="adapt"'));
});

test("6. evaluateAnswer checks correctness, line reference, and returns Hebrew explanation", () => {
	const q = {
		id: "test_q",
		correct_index: 2,
		line_reference: "lines 4-5",
		hebrew_explanation: "הסבר מפורט בעברית",
		type: "inference",
	};

	const correctRes = AmiramReading.evaluateAnswer(q, 2);
	assert.equal(correctRes.isCorrect, true);
	assert.equal(correctRes.correctIndex, 2);
	assert.equal(correctRes.lineReference, "lines 4-5");
	assert.equal(correctRes.explanation, "הסבר מפורט בעברית");

	const wrongRes = AmiramReading.evaluateAnswer(q, 0);
	assert.equal(wrongRes.isCorrect, false);
});

test("7. createSession and recordSessionAnswer track progress and calculate CEFR score", () => {
	const data = JSON.parse(fs.readFileSync(PASSAGES_PATH, "utf-8"));
	const session = AmiramReading.createSession(data, {
		level: "A_foundational",
	});

	assert.ok(session);
	assert.equal(session.activePassage.id, "rc_a1");
	assert.equal(session.completed, false);

	// Answer all 5 questions
	session.activePassage.questions.forEach((q, idx) => {
		// Answer correctly
		AmiramReading.recordSessionAnswer(session, q.id, q.correct_index);
	});

	assert.equal(session.completed, true);
	const summary = AmiramReading.getSessionSummary(session);
	assert.equal(summary.total, 5);
	assert.equal(summary.correct, 5);
	assert.equal(summary.percentage, 100);
	assert.ok(summary.cefr.includes("C1"), "100% should yield C1 exemption");
});

test("8. formatLineReference formats paragraph and line ranges as Hebrew labels", () => {
	assert.equal(
		AmiramReading.formatLineReference("Paragraph 2, lines 3-5"),
		"פסקה 2, שורות 3-5",
	);
	assert.equal(
		AmiramReading.formatLineReference("Paragraph 1, line 3"),
		"פסקה 1, שורה 3",
	);
	assert.equal(
		AmiramReading.formatLineReference("Paragraphs 1-3"),
		"פסקאות 1-3",
	);
	assert.equal(AmiramReading.formatLineReference("lines 5-4"), "שורות 4-5");
	assert.equal(
		AmiramReading.formatLineReference("Paragraph 3, concluding sentence"),
		"פסקה 3, משפט הסיום",
	);
	assert.equal(AmiramReading.formatLineReference("Entire text"), "כל הקטע");
});

test("9. formatLineReference handles empty and unrecognized references", () => {
	assert.equal(AmiramReading.formatLineReference(""), "");
	assert.equal(AmiramReading.formatLineReference(undefined), "");
	assert.equal(AmiramReading.formatLineReference("  See title  "), "See title");

	const parsed = AmiramReading.parseLineReference("Paragraph 2, lines 3-5");
	assert.deepEqual(parsed.paragraphs, [2, 2]);
	assert.deepEqual(parsed.lines, [3, 5]);
	assert.equal(parsed.scope, "located");
});

test("10. evaluateAnswer exposes a formatted lineReferenceLabel for the UI", () => {
	const q = {
		id: "q",
		correct_index: 1,
		line_reference: "Paragraph 2, lines 3-5",
	};
	const res = AmiramReading.evaluateAnswer(q, 1);
	assert.equal(res.lineReference, "Paragraph 2, lines 3-5");
	assert.equal(res.lineReferenceLabel, "פסקה 2, שורות 3-5");

	const noRef = AmiramReading.evaluateAnswer({ id: "q2", correct_index: 0 }, 0);
	assert.equal(noRef.lineReferenceLabel, "");
});

test("11. every bundled question line_reference formats to a non-empty label", () => {
	const data = JSON.parse(fs.readFileSync(PASSAGES_PATH, "utf-8"));
	data.forEach((p) => {
		p.questions.forEach((q) => {
			const label = AmiramReading.formatLineReference(q.line_reference);
			assert.ok(label.length > 0, `Label for ${q.id} should not be empty`);
			assert.ok(
				!/paragraph|line/i.test(label),
				`Label for ${q.id} should be translated: ${label}`,
			);
		});
	});
});

test("12. lookupTargetWord resolves exact and inflected target words from Amiram vocabulary bank", () => {
	const vocabPath = path.join(
		__dirname,
		"..",
		"data",
		"imports",
		"amiram_vocab_full.json",
	);
	const vocabBank = JSON.parse(fs.readFileSync(vocabPath, "utf-8"));
	const passages = JSON.parse(fs.readFileSync(PASSAGES_PATH, "utf-8"));

	passages.forEach((p) => {
		p.target_vocab.forEach((w) => {
			const entry = AmiramReading.lookupTargetWord(w, vocabBank);
			assert.ok(
				entry,
				`Target word "${w}" in ${p.id} must resolve in amiram_vocab_full.json`,
			);
			assert.equal(entry.word, w);
			assert.ok(
				entry.translation.length > 0,
				`Translation required for "${w}"`,
			);
			assert.ok(entry.definition.length > 0, `Definition required for "${w}"`);
		});
	});

	const inflected = AmiramReading.lookupTargetWord("allocates", vocabBank);
	assert.ok(inflected, 'Inflected "allocates" should resolve to "allocate"');
	assert.equal(inflected.word, "allocate");
	assert.ok(inflected.translation.length > 0);

	assert.equal(AmiramReading.lookupTargetWord("", vocabBank), null);
	assert.equal(
		AmiramReading.lookupTargetWord("nonexistentxyz", vocabBank),
		null,
	);
	assert.equal(AmiramReading.lookupTargetWord("achieve", null), null);
});

test("13. highlightVocab highlights all passage target words including inflections and attaches Hebrew translation", () => {
	const vocabPath = path.join(
		__dirname,
		"..",
		"data",
		"imports",
		"amiram_vocab_full.json",
	);
	const vocabBank = JSON.parse(fs.readFileSync(vocabPath, "utf-8"));
	const passages = JSON.parse(fs.readFileSync(PASSAGES_PATH, "utf-8"));

	passages.forEach((p) => {
		const fullText = p.paragraphs.join(" ");
		const html = AmiramReading.highlightVocab(
			fullText,
			p.target_vocab,
			vocabBank,
		);
		p.target_vocab.forEach((w) => {
			const re = new RegExp(
				`class="rc-target-word" data-word="${w}(?:s|es|d|ed|ing)?"[^>]*data-translation="[^"]+"`,
				"i",
			);
			assert.match(
				html,
				re,
				`Passage ${p.id} should highlight "${w}" with data-translation`,
			);
		});
	});
});

test("14. index.html wires Reading Comprehension word translation inspector, formatLineReference, and evaluateAnswer", () => {
	const html = fs.readFileSync(
		path.join(__dirname, "..", "index.html"),
		"utf-8",
	);
	assert.match(html, /id="rc-word-inspector"/);
	assert.match(
		html,
		/AmiramReading\.highlightVocab\(formattedLines,\s*passage\.target_vocab,\s*AMIRAM_VOCAB\)/,
	);
	assert.match(html, /AmiramReading\.lookupTargetWord\(word,\s*AMIRAM_VOCAB\)/);
	assert.match(
		html,
		/AmiramReading\.formatLineReference\(item\.line_reference\)/,
	);
	assert.match(html, /AmiramReading\.evaluateAnswer\(item,\s*optIdx\)/);
});
