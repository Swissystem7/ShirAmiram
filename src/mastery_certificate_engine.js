((root, factory) => {
	if (typeof module === "object" && module.exports) {
		module.exports = factory();
	} else {
		root.ShirAmiramMasteryCertificateEngine = factory();
	}
})(typeof self !== "undefined" ? self : this, () => {
	const MILESTONES = Object.freeze({
		FOUNDATION_MASTERY: "FOUNDATION_MASTERY",
		INTERMEDIATE_MASTERY: "INTERMEDIATE_MASTERY",
		AMIRAM_EXEMPT_READY: "AMIRAM_EXEMPT_READY",
	});

	const MILESTONE_TITLES_HEBREW = Object.freeze({
		FOUNDATION_MASTERY: "שליטה באוצר מילים בסיסי (רמה A)",
		INTERMEDIATE_MASTERY: "שליטה באוצר מילים בינוני (רמה B)",
		AMIRAM_EXEMPT_READY: "מוכנות לפטור במבחן אמיר״ם",
	});

	const TARGETS = Object.freeze({
		FOUNDATION_WORDS: 50,
		INTERMEDIATE_WORDS: 50,
		EXEMPT_SIMULATIONS: 2,
		EXEMPT_SCORE_MIN: 134,
	});

	function computeChecksum(input) {
		const str = String(input);
		let h1 = 0x811c9dc5;
		let h2 = 0x27d4eb2f;
		for (let i = 0; i < str.length; i++) {
			const c = str.charCodeAt(i);
			h1 = Math.imul(h1 ^ c, 0x01000193);
			h2 = Math.imul(h2 ^ (c * 31), 0x5bd1e995);
		}
		const p1 = (h1 >>> 0).toString(16).padStart(8, "0");
		const p2 = (h2 >>> 0).toString(16).padStart(8, "0");
		return `${p1}${p2}`;
	}

	function isCardMastered(card) {
		if (!card || typeof card !== "object") return false;
		if (card.mastered === true) return true;
		const rawGrade =
			card.box ?? card.grade ?? card.leitnerGrade ?? card.leitnerBox;
		const numericGrade = Number(rawGrade);
		if (Number.isFinite(numericGrade) && numericGrade >= 4) {
			return true;
		}
		return false;
	}

	function isLevelMatch(levelStr, targetChar) {
		if (typeof levelStr !== "string") return false;
		const upper = levelStr.toUpperCase();
		if (targetChar === "A") {
			return (
				upper === "A" ||
				upper.includes("FOUNDATION") ||
				upper.startsWith("A_") ||
				upper.startsWith("A-") ||
				upper.startsWith("LEVEL-A") ||
				upper.startsWith("LEVEL A") ||
				upper.includes("A1") ||
				upper.includes("A2")
			);
		}
		if (targetChar === "B") {
			return (
				upper === "B" ||
				upper.includes("INTERMEDIATE") ||
				upper.startsWith("B_") ||
				upper.startsWith("B-") ||
				upper.startsWith("LEVEL-B") ||
				upper.startsWith("LEVEL B") ||
				upper.includes("B1") ||
				upper.includes("B2")
			);
		}
		return false;
	}

	function extractLevelCount(userStats, targetChar) {
		if (!userStats || typeof userStats !== "object") return 0;

		const charUpper = targetChar.toUpperCase();
		const directCandidates = [];

		if (charUpper === "A") {
			directCandidates.push(
				userStats.levelAMasteredWords,
				userStats.levelAWordsMastered,
				userStats.levelAMastered,
				userStats.masteredLevelA,
				userStats.masteredA,
				userStats.foundationMasteredWords,
				userStats.foundationWordsMastered,
				userStats.foundationMastered,
				userStats.wordsMasteredA,
				userStats.A_mastered,
				userStats.summary?.A?.mastered,
				userStats.masterySummary?.A?.mastered,
				userStats.vocabSummary?.A?.mastered,
				userStats.vocabMastery?.A?.mastered,
				typeof userStats.A === "number" ? userStats.A : userStats.A?.mastered,
			);
		} else if (charUpper === "B") {
			directCandidates.push(
				userStats.levelBMasteredWords,
				userStats.levelBWordsMastered,
				userStats.levelBMastered,
				userStats.masteredLevelB,
				userStats.masteredB,
				userStats.intermediateMasteredWords,
				userStats.intermediateWordsMastered,
				userStats.intermediateMastered,
				userStats.wordsMasteredB,
				userStats.B_mastered,
				userStats.summary?.B?.mastered,
				userStats.masterySummary?.B?.mastered,
				userStats.vocabSummary?.B?.mastered,
				userStats.vocabMastery?.B?.mastered,
				typeof userStats.B === "number" ? userStats.B : userStats.B?.mastered,
			);
		}

		let maxDirect = 0;
		for (const cand of directCandidates) {
			if (typeof cand === "number" && Number.isFinite(cand) && cand > 0) {
				maxDirect = Math.max(maxDirect, Math.floor(cand));
			}
		}

		let countedFromCards = 0;

		const rawCards = userStats.cards || userStats.leitnerCards;
		if (Array.isArray(rawCards)) {
			for (const card of rawCards) {
				if (card && typeof card === "object") {
					if (isLevelMatch(card.level, targetChar) && isCardMastered(card)) {
						countedFromCards++;
					}
				}
			}
		} else if (rawCards && typeof rawCards === "object") {
			if (Array.isArray(userStats.vocab)) {
				for (const item of userStats.vocab) {
					if (item && isLevelMatch(item.level, targetChar)) {
						const card = rawCards[String(item.id)] || rawCards[item.word];
						if (isCardMastered(card)) {
							countedFromCards++;
						}
					}
				}
			} else {
				for (const key of Object.keys(rawCards)) {
					const card = rawCards[key];
					if (card && typeof card === "object") {
						if (isLevelMatch(card.level, targetChar) && isCardMastered(card)) {
							countedFromCards++;
						}
					}
				}
			}
		}

		if (Array.isArray(userStats.words)) {
			for (const word of userStats.words) {
				if (word && typeof word === "object") {
					if (isLevelMatch(word.level, targetChar) && isCardMastered(word)) {
						countedFromCards++;
					}
				}
			}
		}

		if (Array.isArray(userStats.masteredWords)) {
			for (const item of userStats.masteredWords) {
				if (item && typeof item === "object") {
					if (isLevelMatch(item.level, targetChar)) {
						countedFromCards++;
					}
				}
			}
		}

		return Math.max(maxDirect, countedFromCards);
	}

	function isCefrC1Plus(userStats) {
		if (!userStats || typeof userStats !== "object") return false;

		const candidate =
			userStats.cefrLevel ??
			userStats.cefr ??
			userStats.level ??
			userStats.competencyProfile?.level ??
			userStats.profile?.cefr ??
			userStats.profile?.level;

		if (typeof candidate === "string") {
			const upper = candidate.trim().toUpperCase();
			if (
				upper === "C1" ||
				upper === "C2" ||
				upper === "C1+" ||
				upper === "C2+" ||
				upper.startsWith("C1") ||
				upper.startsWith("C2")
			) {
				return true;
			}
			return false;
		}

		if (typeof candidate === "number" && Number.isFinite(candidate)) {
			return candidate >= 120;
		}

		if (userStats.isExempt === true) {
			return true;
		}

		const numericScore =
			userStats.estimatedScore ?? userStats.amiramScore ?? userStats.score;
		if (typeof numericScore === "number" && Number.isFinite(numericScore)) {
			return numericScore >= 120;
		}

		return false;
	}

	function extractSimulationScores(userStats) {
		if (!userStats || typeof userStats !== "object") return [];

		if (
			typeof userStats.simulationsScoring134Plus === "number" &&
			Number.isFinite(userStats.simulationsScoring134Plus)
		) {
			const count = Math.max(
				0,
				Math.floor(userStats.simulationsScoring134Plus),
			);
			return Array(count).fill(134);
		}

		const list =
			userStats.simulations ||
			userStats.simulationScores ||
			userStats.simulationsHistory ||
			userStats.userHistory ||
			userStats.history;

		if (!Array.isArray(list)) return [];

		const scores = [];
		for (const item of list) {
			if (typeof item === "number" && Number.isFinite(item)) {
				scores.push(item);
			} else if (item && typeof item === "object") {
				const raw =
					item.score ??
					item.amiramScore ??
					item.estimatedScore ??
					item.result?.score;
				if (typeof raw === "number" && Number.isFinite(raw)) {
					scores.push(raw);
				}
			}
		}
		return scores;
	}

	function countSimulations134Plus(userStats) {
		const scores = extractSimulationScores(userStats);
		return scores.filter((s) => s >= TARGETS.EXEMPT_SCORE_MIN).length;
	}

	function evaluateMilestones(userStats) {
		const safeStats =
			userStats !== null && typeof userStats === "object" ? userStats : {};

		// 1. FOUNDATION_MASTERY
		const countA = extractLevelCount(safeStats, "A");
		const foundationAchieved = countA >= TARGETS.FOUNDATION_WORDS;
		const foundationProgress = Math.min(
			100,
			Math.max(0, Math.round((countA / TARGETS.FOUNDATION_WORDS) * 100)),
		);

		// 2. INTERMEDIATE_MASTERY
		const countB = extractLevelCount(safeStats, "B");
		const intermediateAchieved = countB >= TARGETS.INTERMEDIATE_WORDS;
		const intermediateProgress = Math.min(
			100,
			Math.max(0, Math.round((countB / TARGETS.INTERMEDIATE_WORDS) * 100)),
		);

		// 3. AMIRAM_EXEMPT_READY
		const cefrMet = isCefrC1Plus(safeStats);
		const sims134Count = countSimulations134Plus(safeStats);
		const exemptAchieved =
			cefrMet && sims134Count >= TARGETS.EXEMPT_SIMULATIONS;

		const cefrProgress = cefrMet ? 50 : 0;
		const simProgress = Math.min(
			50,
			Math.max(0, Math.round((sims134Count / TARGETS.EXEMPT_SIMULATIONS) * 50)),
		);
		const exemptProgress = exemptAchieved
			? 100
			: Math.min(99, cefrProgress + simProgress);

		return [
			{
				milestoneId: MILESTONES.FOUNDATION_MASTERY,
				titleHebrew: MILESTONE_TITLES_HEBREW.FOUNDATION_MASTERY,
				isAchieved: foundationAchieved,
				progressPercent: foundationProgress,
			},
			{
				milestoneId: MILESTONES.INTERMEDIATE_MASTERY,
				titleHebrew: MILESTONE_TITLES_HEBREW.INTERMEDIATE_MASTERY,
				isAchieved: intermediateAchieved,
				progressPercent: intermediateProgress,
			},
			{
				milestoneId: MILESTONES.AMIRAM_EXEMPT_READY,
				titleHebrew: MILESTONE_TITLES_HEBREW.AMIRAM_EXEMPT_READY,
				isAchieved: exemptAchieved,
				progressPercent: exemptProgress,
			},
		];
	}

	function generateCertificatePayload(
		milestoneId,
		userProfile,
		issuedAtMs = Date.now(),
	) {
		const validMilestoneId =
			typeof milestoneId === "string" && milestoneId.trim() !== ""
				? milestoneId.trim()
				: "UNKNOWN";

		const title =
			MILESTONE_TITLES_HEBREW[validMilestoneId] ||
			`תעודת שליטה - ${validMilestoneId}`;

		let studentName = "תלמיד/ה";
		let userStats = {};
		let customSummary = {};

		if (typeof userProfile === "string" && userProfile.trim() !== "") {
			studentName = userProfile.trim();
		} else if (userProfile && typeof userProfile === "object") {
			const extractedName =
				userProfile.studentName ||
				userProfile.displayName ||
				userProfile.name ||
				userProfile.username ||
				userProfile.learnerName ||
				userProfile.userId;
			if (typeof extractedName === "string" && extractedName.trim() !== "") {
				studentName = extractedName.trim();
			}
			if (userProfile.stats && typeof userProfile.stats === "object") {
				userStats = userProfile.stats;
			} else if (
				userProfile.userStats &&
				typeof userProfile.userStats === "object"
			) {
				userStats = userProfile.userStats;
			} else {
				userStats = userProfile;
			}

			if (
				userProfile.summaryStats &&
				typeof userProfile.summaryStats === "object"
			) {
				customSummary = userProfile.summaryStats;
			}
		}

		let dateObj;
		if (typeof issuedAtMs === "number" && Number.isFinite(issuedAtMs)) {
			dateObj = new Date(issuedAtMs);
		} else if (
			issuedAtMs instanceof Date &&
			!Number.isNaN(issuedAtMs.getTime())
		) {
			dateObj = issuedAtMs;
		} else if (typeof issuedAtMs === "string") {
			const parsed = Date.parse(issuedAtMs);
			dateObj = Number.isNaN(parsed) ? new Date() : new Date(parsed);
		} else {
			dateObj = new Date();
		}
		const issuedAtISO = dateObj.toISOString();

		let baseSummary = { milestoneId: validMilestoneId };
		if (validMilestoneId === MILESTONES.FOUNDATION_MASTERY) {
			const countA = extractLevelCount(userStats, "A");
			baseSummary = {
				milestoneId: validMilestoneId,
				targetLevel: "A",
				wordsMastered: Math.max(countA, customSummary.wordsMastered ?? 0),
				requiredWords: TARGETS.FOUNDATION_WORDS,
				leitnerGradeThreshold: 4,
			};
		} else if (validMilestoneId === MILESTONES.INTERMEDIATE_MASTERY) {
			const countB = extractLevelCount(userStats, "B");
			baseSummary = {
				milestoneId: validMilestoneId,
				targetLevel: "B",
				wordsMastered: Math.max(countB, customSummary.wordsMastered ?? 0),
				requiredWords: TARGETS.INTERMEDIATE_WORDS,
			};
		} else if (validMilestoneId === MILESTONES.AMIRAM_EXEMPT_READY) {
			const simCount = countSimulations134Plus(userStats);
			const cefrCandidate =
				userStats.cefrLevel ||
				userStats.cefr ||
				userStats.level ||
				customSummary.cefrLevel ||
				(isCefrC1Plus(userStats) ? "C1" : "Under C1");
			baseSummary = {
				milestoneId: validMilestoneId,
				cefrLevel: cefrCandidate,
				simulationsScoring134Plus: Math.max(
					simCount,
					customSummary.simulationsScoring134Plus ?? 0,
				),
				requiredSimulations: TARGETS.EXEMPT_SIMULATIONS,
				scoreThreshold: TARGETS.EXEMPT_SCORE_MIN,
			};
		}

		const summaryStats = Object.freeze({
			...baseSummary,
			...customSummary,
		});

		const canonicalString = `${validMilestoneId}:${studentName}:${issuedAtISO}:${JSON.stringify(summaryStats)}`;
		const verificationHash = computeChecksum(canonicalString);
		const certificateId = `CERT-${validMilestoneId}-${verificationHash.slice(0, 10).toUpperCase()}`;

		return Object.freeze({
			certificateId,
			verificationHash,
			title,
			studentName,
			issuedAtISO,
			summaryStats,
			milestoneId: validMilestoneId,
		});
	}

	function verifyCertificatePayload(payload) {
		if (!payload || typeof payload !== "object") return false;
		const {
			milestoneId,
			studentName,
			issuedAtISO,
			summaryStats,
			verificationHash,
		} = payload;
		if (
			typeof milestoneId !== "string" ||
			typeof studentName !== "string" ||
			typeof issuedAtISO !== "string" ||
			!summaryStats ||
			typeof summaryStats !== "object" ||
			typeof verificationHash !== "string" ||
			verificationHash.length === 0
		) {
			return false;
		}
		const canonicalString = `${milestoneId}:${studentName}:${issuedAtISO}:${JSON.stringify(summaryStats)}`;
		return computeChecksum(canonicalString) === verificationHash;
	}

	return {
		MILESTONES,
		MILESTONE_TITLES_HEBREW,
		TARGETS,
		computeChecksum,
		evaluateMilestones,
		generateCertificatePayload,
		verifyCertificatePayload,
	};
});
