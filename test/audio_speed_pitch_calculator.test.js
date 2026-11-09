const test = require("node:test");
const assert = require("node:assert/strict");
const {
	scaleTimestamp,
	scaleKaraokeLineTimings,
	PLAYBACK_RATES,
} = require("../src/audio_speed_pitch_calculator.js");

test("slow 0.5x doubles time", () => assert.equal(scaleTimestamp(1000, 0.5), 2000));
test("fast 2x halves time", () => assert.equal(scaleTimestamp(1000, 2), 500));
test("default 1x", () => assert.equal(scaleTimestamp(1000), 1000));
test("invalid rate defaults to 1", () => {
	assert.equal(scaleTimestamp(1000, 0), 1000);
	assert.equal(scaleTimestamp(1000, -1), 1000);
	assert.equal(scaleTimestamp(1000, "x"), 1000);
});
test("karaoke line timings", () => {
	const out = scaleKaraokeLineTimings({ timeMs: 2000, windowMs: 400, text: "hi" }, 0.5);
	assert.equal(out.scaledTimeMs, 4000);
	assert.equal(out.scaledWindowMs, 800);
	assert.equal(out.playbackRate, 0.5);
	assert.equal(out.text, "hi");
});
test("rates list", () => assert.deepEqual(PLAYBACK_RATES, [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]));
