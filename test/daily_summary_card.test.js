const test = require("node:test");
const assert = require("node:assert/strict");
const { generateDailySummaryCard } = require("../src/daily_summary_card.js");

test("all fields present", () => {
	const card = generateDailySummaryCard({
		dateString: "2026-11-09",
		streakDays: 5,
		wordsLearnedCount: 12,
		xpEarned: 80,
		featuredSongTitle: "Imagine",
		songQuote: "You may say I'm a dreamer",
	});
	assert.match(card, /2026-11-09/);
	assert.match(card, /רצף: 5/);
	assert.match(card, /מילים שנלמדו: 12/);
	assert.match(card, /XP: 80/);
	assert.match(card, /Imagine/);
	assert.match(card, /dreamer/);
});

test("framing borders", () => {
	const card = generateDailySummaryCard({ dateString: "X" });
	assert.match(card, /╔/);
	assert.match(card, /╚/);
});

test("defaults when empty", () => {
	const card = generateDailySummaryCard({});
	assert.match(card, /היום/);
	assert.match(card, /רצף: 1/);
	assert.match(card, /מילים שנלמדו: 0/);
	assert.match(card, /XP: 0/);
	assert.doesNotMatch(card, /שיר נבחר/);
});

test("partial song only", () => {
	const card = generateDailySummaryCard({
		dateString: "D",
		featuredSongTitle: "Hello",
	});
	assert.match(card, /שיר נבחר: Hello/);
	assert.doesNotMatch(card, /ציטוט/);
});

test("quote only still framed", () => {
	const card = generateDailySummaryCard({ songQuote: "keep going" });
	assert.match(card, /ציטוט: "keep going"/);
});

test("numeric coercion", () => {
	const card = generateDailySummaryCard({
		streakDays: "3",
		wordsLearnedCount: "7",
		xpEarned: "15",
	});
	assert.match(card, /רצף: 3/);
	assert.match(card, /מילים שנלמדו: 7/);
	assert.match(card, /XP: 15/);
});
