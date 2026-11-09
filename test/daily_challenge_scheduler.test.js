const test = require("node:test");
const assert = require("node:assert/strict");
const sch = require("../src/daily_challenge_scheduler.js");

test("generateDailyChallenge: quests and xp", () => {
	const r = sch.generateDailyChallenge(
		"2026-11-09",
		[{ id: "s1" }],
		[{ id: "w1" }],
	);
	assert.equal(r.dateString, "2026-11-09");
	assert.deepEqual(
		r.quests.map((q) => q.id),
		["DAILY_SONG", "DAILY_QUIZ", "DAILY_KARAOKE"],
	);
	assert.deepEqual(
		r.quests.map((q) => q.xp),
		[30, 25, 40],
	);
});

test("generateDailyChallenge: picks song and word", () => {
	const songs = [{ id: "a" }, { id: "b" }, { id: "c" }];
	const words = [{ id: "x" }, { id: "y" }];
	const r = sch.generateDailyChallenge("2026-11-09", songs, words);
	assert.ok(songs.includes(r.songOfTheDay));
	assert.ok(words.includes(r.wordOfTheDay));
});

test("generateDailyChallenge: empty catalogs -> null picks", () => {
	const r = sch.generateDailyChallenge("2026-11-09", [], []);
	assert.equal(r.songOfTheDay, null);
	assert.equal(r.wordOfTheDay, null);
});

test("generateDailyChallenge: deterministic for same date", () => {
	const songs = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
	const words = [{ id: "w1" }, { id: "w2" }, { id: "w3" }];
	const a = sch.generateDailyChallenge("2026-01-01", songs, words);
	const b = sch.generateDailyChallenge("2026-01-01", songs, words);
	assert.deepEqual(a, b);
});

test("updateStreak: same day keeps streak", () => {
	const r = sch.updateStreak(
		{ currentStreak: 4, lastActiveDate: "2026-11-09" },
		"2026-11-09",
	);
	assert.equal(r.currentStreak, 4);
	assert.equal(r.lastActiveDate, "2026-11-09");
	assert.equal(r.streakMaintained, true);
});

test("updateStreak: consecutive day increments", () => {
	const r = sch.updateStreak(
		{ currentStreak: 2, lastActiveDate: "2026-11-08" },
		"2026-11-09",
	);
	assert.equal(r.currentStreak, 3);
	assert.equal(r.streakMaintained, true);
});

test("updateStreak: gap resets to 1", () => {
	const r = sch.updateStreak(
		{ currentStreak: 5, lastActiveDate: "2026-11-01" },
		"2026-11-09",
	);
	assert.equal(r.currentStreak, 1);
	assert.equal(r.streakMaintained, false);
});

test("updateStreak: first activity starts at 1", () => {
	const r = sch.updateStreak(
		{ currentStreak: 0, lastActiveDate: "" },
		"2026-11-09",
	);
	assert.equal(r.currentStreak, 1);
	assert.equal(r.lastActiveDate, "2026-11-09");
});
