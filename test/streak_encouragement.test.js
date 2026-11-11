// streak_encouragement.test.js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getNextMilestone, getStreakEncouragement } from "../src/streak_encouragement.js";

describe("getNextMilestone", () => {
  it("returns 5 for streakDays 0", () => {
    assert.strictEqual(getNextMilestone(0), 5);
  });
  it("returns 5 for streakDays 3", () => {
    assert.strictEqual(getNextMilestone(3), 5);
  });
  it("returns 10 for streakDays 5", () => {
    assert.strictEqual(getNextMilestone(5), 10);
  });
  it("returns 15 for streakDays 12", () => {
    assert.strictEqual(getNextMilestone(12), 15);
  });
  it("throws for invalid streakDays", () => {
    assert.throws(() => getNextMilestone(-1), /streakDays must be a non‑negative number/);
    assert.throws(() => getNextMilestone("5"), /streakDays must be a non‑negative number/);
    assert.throws(() => getNextMilestone(NaN), /streakDays must be a non‑negative number/);
  });
});

describe("getStreakEncouragement", () => {
  it("message for non-milestone", () => {
    const msg = getStreakEncouragement(3);
    assert.match(msg, /3‑day streak/);
    assert.match(msg, /2 more days/);
  });
  it("message for exactly milestone", () => {
    const msg = getStreakEncouragement(5);
    assert.match(msg, /Amazing/);
    assert.match(msg, /5‑day streak/);
    assert.match(msg, /next milestone is 10 days/);
  });
  it("throws for invalid streakDays in getStreakEncouragement", () => {
    assert.throws(() => getStreakEncouragement(-1), /streakDays must be a non‑negative number/);
  });
});
