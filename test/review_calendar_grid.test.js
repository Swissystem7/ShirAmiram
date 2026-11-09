const test = require("node:test");
const assert = require("node:assert/strict");
const {
	calculateIntensity,
	buildHeatmapGrid,
} = require("../src/review_calendar_grid.js");

test("28-day layout four weeks", () => {
	const g = buildHeatmapGrid({}, "2026-11-09", 28);
	assert.equal(g.weeks.length, 4);
	assert.equal(g.weeks.flat().length, 28);
});
test("intensity levels", () => {
	assert.equal(calculateIntensity(0), 0);
	assert.equal(calculateIntensity(3), 1);
	assert.equal(calculateIntensity(5), 2);
	assert.equal(calculateIntensity(10), 3);
	assert.equal(calculateIntensity(20), 4);
});
test("totals and streak", () => {
	const g = buildHeatmapGrid(
		{ "2026-11-07": 2, "2026-11-08": 5, "2026-11-09": 1 },
		"2026-11-09",
		28,
	);
	assert.equal(g.totalActiveDays, 3);
	assert.equal(g.totalActions, 8);
	assert.equal(g.maxStreak, 3);
});
test("empty map", () => {
	const g = buildHeatmapGrid({}, "2026-11-09", 28);
	assert.equal(g.totalActiveDays, 0);
	assert.equal(g.totalActions, 0);
	assert.equal(g.maxStreak, 0);
});
test("invalid end date", () => {
	const g = buildHeatmapGrid({ "2026-11-09": 1 }, "not-a-date", 28);
	assert.deepEqual(g.weeks, []);
});
test("cell intensity from map", () => {
	const g = buildHeatmapGrid({ "2026-11-09": 12 }, "2026-11-09", 7);
	const last = g.weeks.flat().at(-1);
	assert.equal(last.date, "2026-11-09");
	assert.equal(last.intensity, 3);
});
