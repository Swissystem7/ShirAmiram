const test = require("node:test");
const assert = require("node:assert/strict");
const { checkCognateStatus } = require("../src/cognate_detector.js");

test("true cognate: music", () => {
	const r = checkCognateStatus("music");
	assert.equal(r.status, "TRUE_COGNATE");
	assert.equal(r.isCognate, true);
	assert.equal(r.isFalseFriend, false);
});

test("false friend: actually", () => {
	const r = checkCognateStatus("actually");
	assert.equal(r.status, "FALSE_FRIEND");
	assert.equal(r.isFalseFriend, true);
	assert.match(r.note, /זהירות/);
});

test("standard vocab", () => {
	const r = checkCognateStatus("ancient");
	assert.equal(r.status, "STANDARD_VOCAB");
	assert.equal(r.isCognate, false);
});

test("empty input", () => {
	const r = checkCognateStatus("");
	assert.equal(r.status, "STANDARD_VOCAB");
	assert.equal(r.note, "");
});

test("uppercase", () => {
	assert.equal(checkCognateStatus("SYSTEM").status, "TRUE_COGNATE");
	assert.equal(checkCognateStatus("EVENTUALLY").status, "FALSE_FRIEND");
});

test("punctuation stripped", () => {
	assert.equal(checkCognateStatus("technology!").status, "TRUE_COGNATE");
	assert.equal(checkCognateStatus("sympathetic.").status, "FALSE_FRIEND");
});
