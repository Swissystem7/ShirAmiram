const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
	MILESTONES,
	MILESTONE_TITLES_HEBREW,
	TARGETS,
	computeChecksum,
	evaluateMilestones,
	generateCertificatePayload,
	verifyCertificatePayload,
} = require("../src/mastery_certificate_engine.js");

test("1. FOUNDATION_MASTERY pass: awards milestone when >=50 level-A words at Leitner grade >=4", () => {
	assert.equal(TARGETS.FOUNDATION_WORDS, 50);
	const userStats = {
		levelAMasteredWords: 50,
	};
	const results = evaluateMilestones(userStats);
	const foundation = results.find(
		(m) => m.milestoneId === MILESTONES.FOUNDATION_MASTERY,
	);

	assert.ok(foundation);
	assert.equal(foundation.isAchieved, true);
	assert.equal(foundation.progressPercent, 100);
	assert.equal(
		foundation.titleHebrew,
		MILESTONE_TITLES_HEBREW.FOUNDATION_MASTERY,
	);

	// Over-achievement is capped at 100%
	const overResults = evaluateMilestones({ levelAMasteredWords: 75 });
	const overFoundation = overResults.find(
		(m) => m.milestoneId === MILESTONES.FOUNDATION_MASTERY,
	);
	assert.equal(overFoundation.isAchieved, true);
	assert.equal(overFoundation.progressPercent, 100);
});

test("2. FOUNDATION_MASTERY fail: rejects milestone when <50 level-A words at Leitner grade >=4", () => {
	const halfStats = {
		levelAMasteredWords: 25,
	};
	const halfResults = evaluateMilestones(halfStats);
	const halfFoundation = halfResults.find(
		(m) => m.milestoneId === MILESTONES.FOUNDATION_MASTERY,
	);
	assert.equal(halfFoundation.isAchieved, false);
	assert.equal(halfFoundation.progressPercent, 50);

	const boundaryStats = {
		levelAMasteredWords: 49,
	};
	const boundaryResults = evaluateMilestones(boundaryStats);
	const boundaryFoundation = boundaryResults.find(
		(m) => m.milestoneId === MILESTONES.FOUNDATION_MASTERY,
	);
	assert.equal(boundaryFoundation.isAchieved, false);
	assert.equal(boundaryFoundation.progressPercent, 98);
});

test("3. INTERMEDIATE_MASTERY pass: awards milestone when >=50 level-B words mastered", () => {
	const userStats = {
		levelBMasteredWords: 50,
	};
	const results = evaluateMilestones(userStats);
	const intermediate = results.find(
		(m) => m.milestoneId === MILESTONES.INTERMEDIATE_MASTERY,
	);

	assert.ok(intermediate);
	assert.equal(intermediate.isAchieved, true);
	assert.equal(intermediate.progressPercent, 100);
	assert.equal(
		intermediate.titleHebrew,
		MILESTONE_TITLES_HEBREW.INTERMEDIATE_MASTERY,
	);

	// Also supports summary.B.mastered structure
	const summaryStats = {
		summary: { B: { mastered: 60 } },
	};
	const intermediateSummary = evaluateMilestones(summaryStats).find(
		(m) => m.milestoneId === MILESTONES.INTERMEDIATE_MASTERY,
	);
	assert.equal(intermediateSummary.isAchieved, true);
	assert.equal(intermediateSummary.progressPercent, 100);
});

test("4. INTERMEDIATE_MASTERY fail: rejects milestone when <50 level-B words mastered", () => {
	const userStats = {
		levelBMasteredWords: 35,
	};
	const results = evaluateMilestones(userStats);
	const intermediate = results.find(
		(m) => m.milestoneId === MILESTONES.INTERMEDIATE_MASTERY,
	);

	assert.ok(intermediate);
	assert.equal(intermediate.isAchieved, false);
	assert.equal(intermediate.progressPercent, 70);
});

test("5. AMIRAM_EXEMPT_READY pass: awards milestone when CEFR C1+ AND >=2 simulations scoring 134+", () => {
	// Exact boundary (C1, exactly two 134 simulations)
	const statsC1 = {
		cefrLevel: "C1",
		simulations: [134, 134],
	};
	const resultsC1 = evaluateMilestones(statsC1);
	const exemptC1 = resultsC1.find(
		(m) => m.milestoneId === MILESTONES.AMIRAM_EXEMPT_READY,
	);
	assert.ok(exemptC1);
	assert.equal(exemptC1.isAchieved, true);
	assert.equal(exemptC1.progressPercent, 100);
	assert.equal(
		exemptC1.titleHebrew,
		MILESTONE_TITLES_HEBREW.AMIRAM_EXEMPT_READY,
	);

	// Beyond boundary (C2 with multiple high scores and object shapes)
	const statsC2 = {
		cefr: "C2",
		simulations: [{ score: 140 }, { score: 138 }, { score: 125 }],
	};
	const resultsC2 = evaluateMilestones(statsC2);
	const exemptC2 = resultsC2.find(
		(m) => m.milestoneId === MILESTONES.AMIRAM_EXEMPT_READY,
	);
	assert.equal(exemptC2.isAchieved, true);
	assert.equal(exemptC2.progressPercent, 100);
});

test("6. AMIRAM_EXEMPT_READY fail: rejects when CEFR is below C1 despite high simulation scores", () => {
	const statsB2 = {
		cefrLevel: "B2",
		simulations: [140, 142],
	};
	const results = evaluateMilestones(statsB2);
	const exempt = results.find(
		(m) => m.milestoneId === MILESTONES.AMIRAM_EXEMPT_READY,
	);

	assert.equal(exempt.isAchieved, false);
	// Simulations count for 50%, CEFR counts for 0%
	assert.equal(exempt.progressPercent, 50);
});

test("7. AMIRAM_EXEMPT_READY fail: rejects when only 1 simulation scores 134+", () => {
	const statsOneSim = {
		cefrLevel: "C1",
		simulations: [135, 130],
	};
	const results = evaluateMilestones(statsOneSim);
	const exempt = results.find(
		(m) => m.milestoneId === MILESTONES.AMIRAM_EXEMPT_READY,
	);

	assert.equal(exempt.isAchieved, false);
	// CEFR gives 50%, 1 simulation gives 25% -> 75%
	assert.equal(exempt.progressPercent, 75);
});

test("8. AMIRAM_EXEMPT_READY fail: rejects when CEFR C1 but all simulations are below 134", () => {
	const statsLowSims = {
		cefrLevel: "C1",
		simulations: [128, 133],
	};
	const results = evaluateMilestones(statsLowSims);
	const exempt = results.find(
		(m) => m.milestoneId === MILESTONES.AMIRAM_EXEMPT_READY,
	);

	assert.equal(exempt.isAchieved, false);
	// CEFR gives 50%, 0 simulations >= 134 -> 50%
	assert.equal(exempt.progressPercent, 50);
});

test("9. Checksum stability: identical arguments generate identical verificationHash and certificateId", () => {
	assert.equal(typeof computeChecksum("sample"), "string");
	assert.equal(computeChecksum("sample"), computeChecksum("sample"));
	assert.notEqual(computeChecksum("sample"), computeChecksum("different"));

	const milestoneId = MILESTONES.FOUNDATION_MASTERY;
	const userProfile = { studentName: "Learner_42" };
	const timestamp = 1762700000000;

	const payloadA = generateCertificatePayload(
		milestoneId,
		userProfile,
		timestamp,
	);
	const payloadB = generateCertificatePayload(
		milestoneId,
		userProfile,
		timestamp,
	);

	assert.equal(payloadA.verificationHash, payloadB.verificationHash);
	assert.equal(payloadA.certificateId, payloadB.certificateId);
	assert.match(payloadA.verificationHash, /^[0-9a-f]{16}$/);
	assert.ok(payloadA.certificateId.startsWith("CERT-FOUNDATION_MASTERY-"));

	// Changing studentName produces a distinct hash
	const payloadC = generateCertificatePayload(
		milestoneId,
		{ studentName: "Learner_99" },
		timestamp,
	);
	assert.notEqual(payloadA.verificationHash, payloadC.verificationHash);

	// Changing timestamp produces a distinct hash
	const payloadD = generateCertificatePayload(
		milestoneId,
		userProfile,
		timestamp + 1000,
	);
	assert.notEqual(payloadA.verificationHash, payloadD.verificationHash);
});

test("10. Verification hash validation: verifyCertificatePayload authenticates genuine and flags tampered payloads", () => {
	const payload = generateCertificatePayload(
		MILESTONES.INTERMEDIATE_MASTERY,
		{ studentName: "Student_A", levelBMasteredWords: 55 },
		1762701000000,
	);

	assert.equal(verifyCertificatePayload(payload), true);

	// Tampered studentName fails verification
	const tamperedName = { ...payload, studentName: "Imposter_User" };
	assert.equal(verifyCertificatePayload(tamperedName), false);

	// Tampered summaryStats fails verification
	const tamperedStats = {
		...payload,
		summaryStats: { ...payload.summaryStats, wordsMastered: 999 },
	};
	assert.equal(verifyCertificatePayload(tamperedStats), false);

	// Tampered issuedAtISO fails verification
	const tamperedDate = {
		...payload,
		issuedAtISO: "2020-01-01T00:00:00.000Z",
	};
	assert.equal(verifyCertificatePayload(tamperedDate), false);

	// Invalid payload types return false
	assert.equal(verifyCertificatePayload(null), false);
	assert.equal(verifyCertificatePayload({}), false);
});

test("11. ISO date handling: generateCertificatePayload outputs valid ISO 8601 timestamps", () => {
	// From explicit timestamp
	const fixedMs = 1762705200000;
	const payload = generateCertificatePayload(
		MILESTONES.AMIRAM_EXEMPT_READY,
		"Learner_Beta",
		fixedMs,
	);
	assert.equal(payload.issuedAtISO, new Date(fixedMs).toISOString());
	assert.match(
		payload.issuedAtISO,
		/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
	);

	// From default Date.now()
	const beforeMs = Date.now();
	const defaultPayload = generateCertificatePayload(
		MILESTONES.AMIRAM_EXEMPT_READY,
		"Learner_Beta",
	);
	const afterMs = Date.now();
	const parsedDefault = Date.parse(defaultPayload.issuedAtISO);
	assert.ok(!Number.isNaN(parsedDefault));
	assert.ok(parsedDefault >= beforeMs && parsedDefault <= afterMs);
});

test("12. Empty inputs & robustness: functions handle empty/null inputs gracefully and never mutate fixtures", () => {
	// evaluateMilestones with empty inputs
	const nullResults = evaluateMilestones(null);
	assert.equal(nullResults.length, 3);
	for (const item of nullResults) {
		assert.equal(item.isAchieved, false);
		assert.equal(item.progressPercent, 0);
		assert.ok(typeof item.titleHebrew === "string");
	}

	const undefinedResults = evaluateMilestones(undefined);
	assert.equal(undefinedResults.length, 3);

	const emptyResults = evaluateMilestones({});
	assert.equal(emptyResults.length, 3);

	// generateCertificatePayload with null/empty inputs
	const emptyPayload = generateCertificatePayload(null, null);
	assert.ok(emptyPayload.certificateId);
	assert.ok(emptyPayload.verificationHash);
	assert.equal(emptyPayload.studentName, "תלמיד/ה");
	assert.match(
		emptyPayload.issuedAtISO,
		/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
	);

	// Immutability: frozen inputs are never mutated
	const frozenStats = Object.freeze({
		levelAMasteredWords: 30,
		cards: Object.freeze({
			w1: Object.freeze({ box: 4, level: "A" }),
		}),
		simulations: Object.freeze([135, 140]),
	});
	assert.doesNotThrow(() => evaluateMilestones(frozenStats));
});

test("13. Card object aggregation: resolves words across Leitner boxes >=4 vs <4", () => {
	// Create 50 Level-A cards at box 4/5 and 10 Level-A cards at box 1-3
	const cards = {};
	for (let i = 1; i <= 50; i++) {
		cards[`word_a_${i}`] = {
			box: i % 2 === 0 ? 4 : 5,
			level: "A_foundational",
		};
	}
	for (let i = 51; i <= 60; i++) {
		cards[`word_a_${i}`] = { box: 3, level: "A_foundational" };
	}

	// 50 Level-B cards at box 4
	for (let i = 1; i <= 50; i++) {
		cards[`word_b_${i}`] = { box: 4, level: "B_intermediate" };
	}

	const results = evaluateMilestones({ cards });
	const foundation = results.find(
		(m) => m.milestoneId === MILESTONES.FOUNDATION_MASTERY,
	);
	const intermediate = results.find(
		(m) => m.milestoneId === MILESTONES.INTERMEDIATE_MASTERY,
	);

	assert.equal(foundation.isAchieved, true);
	assert.equal(foundation.progressPercent, 100);
	assert.equal(intermediate.isAchieved, true);
	assert.equal(intermediate.progressPercent, 100);
});
