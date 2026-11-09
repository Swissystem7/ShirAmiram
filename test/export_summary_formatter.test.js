const test = require("node:test");
const assert = require("node:assert/strict");
const {
	formatStudentMarkdownReport,
} = require("../src/export_summary_formatter.js");
test("includes title and table headers", () => {
	const md = formatStudentMarkdownReport({
		studentName: "דני",
		masteredCount: 30,
		totalVocab: 300,
	});
	assert.match(md, /# דוח התקדמות — דני/);
	assert.match(md, /רמת CEFR/);
	assert.match(md, /ציון אמיר״ם צפוי/);
});
test("percent calculation", () => {
	const md = formatStudentMarkdownReport({
		masteredCount: 75,
		totalVocab: 300,
	});
	assert.match(md, /75\/300 \(25%\)/);
});
test("weak categories listed", () => {
	const md = formatStudentMarkdownReport({
		weakCategories: ["phrasal verbs", "tenses"],
	});
	assert.match(md, /phrasal verbs/);
	assert.match(md, /tenses/);
});
test("defaults on empty input", () => {
	const md = formatStudentMarkdownReport({});
	assert.match(md, /לומד\/ת/);
	assert.match(md, /A2/);
	assert.match(md, /0\/300 \(0%\)/);
});
test("null input safe", () => {
	const md = formatStudentMarkdownReport(null);
	assert.match(md, /דוח התקדמות/);
});
test("iso date present", () => {
	const md = formatStudentMarkdownReport({});
	assert.match(md, /תאריך הפקה: \d{4}-\d{2}-\d{2}/);
});
