((root, factory) => {
	if (typeof module === "object" && module.exports) {
		module.exports = factory();
	} else {
		root.ShirAmiramUserLevelTracker = factory();
	}
})(typeof self !== "undefined" ? self : this, () => {
	const VOCAB_TARGET = 300;

	const A1_BAND = Object.freeze({
		level: "A1",
		minScore: 0,
		maxScore: 49,
		midpoint: 24.5,
		label: "טרום בסיסי",
		isExempt: false,
	});

	const A2_BAND = Object.freeze({
		level: "A2",
		minScore: 50,
		maxScore: 84,
		midpoint: 67,
		label: "בסיסי",
		isExempt: false,
	});

	const B1_BAND = Object.freeze({
		level: "B1",
		minScore: 85,
		maxScore: 99,
		midpoint: 92,
		label: "טרום בינוני",
		isExempt: false,
	});

	const B2_BAND = Object.freeze({
		level: "B2",
		minScore: 100,
		maxScore: 119,
		midpoint: 109.5,
		label: "בינוני",
		isExempt: false,
	});

	const C1_BAND = Object.freeze({
		level: "C1",
		minScore: 120,
		maxScore: 133,
		midpoint: 126.5,
		label: "מתקדם",
		isExempt: false,
	});

	const C2_BAND = Object.freeze({
		level: "C2",
		minScore: 134,
		maxScore: 150,
		midpoint: 142,
		label: "מתקדם מאוד / פטור",
		isExempt: true,
	});

	const bandsList = [A2_BAND, B1_BAND, B2_BAND, C1_BAND, C2_BAND];
	bandsList.A1 = A1_BAND;
	bandsList.A2 = A2_BAND;
	bandsList.B1 = B1_BAND;
	bandsList.B2 = B2_BAND;
	bandsList.C1 = C1_BAND;
	bandsList.C2 = C2_BAND;
	const AMIRAM_CEFR_BANDS = Object.freeze(bandsList);

	function mapAmiramToCefr(score) {
		if (typeof score !== "number" || !Number.isFinite(score)) {
			return null;
		}
		if (score < 50) {
			return A1_BAND;
		}
		if (score < 85) {
			return A2_BAND;
		}
		if (score < 100) {
			return B1_BAND;
		}
		if (score < 120) {
			return B2_BAND;
		}
		if (score < 134) {
			return C1_BAND;
		}
		return C2_BAND;
	}

	function extractValidScore(entry) {
		if (entry === null || entry === undefined) {
			return null;
		}
		let val = null;
		if (typeof entry === "number") {
			val = entry;
		} else if (typeof entry === "object") {
			if (typeof entry.score === "number") {
				val = entry.score;
			} else if (typeof entry.amiramScore === "number") {
				val = entry.amiramScore;
			}
		}
		if (
			typeof val === "number" &&
			Number.isFinite(val) &&
			val >= 50 &&
			val <= 150
		) {
			return val;
		}
		return null;
	}

	function resolveMasteredCount(masteredWords) {
		if (typeof masteredWords === "number" && Number.isFinite(masteredWords)) {
			return Math.max(0, Math.floor(masteredWords));
		}
		if (Array.isArray(masteredWords)) {
			return masteredWords.length;
		}
		if (masteredWords instanceof Set) {
			return masteredWords.size;
		}
		if (
			masteredWords &&
			typeof masteredWords === "object" &&
			typeof masteredWords.count === "number" &&
			Number.isFinite(masteredWords.count)
		) {
			return Math.max(0, Math.floor(masteredWords.count));
		}
		return 0;
	}

	function evaluateCompetencyProfile(userHistory, masteredWords) {
		const validScores = [];
		if (Array.isArray(userHistory)) {
			for (const entry of userHistory) {
				const score = extractValidScore(entry);
				if (score !== null) {
					validScores.push(score);
				}
			}
		}

		const masteredCount = resolveMasteredCount(masteredWords);
		const hasSimulations = validScores.length > 0;

		if (!hasSimulations && masteredCount === 0) {
			return Object.freeze({
				estimatedScore: null,
				range: Object.freeze({
					minScore: A2_BAND.minScore,
					maxScore: A2_BAND.maxScore,
					midpoint: A2_BAND.midpoint,
				}),
				level: A2_BAND.level,
				label: A2_BAND.label,
				isExempt: false,
				isStart: true,
				focus: "להתמקד באוצר מילים",
			});
		}

		const vocabularyComponent =
			50 + 100 * Math.min(1, masteredCount / VOCAB_TARGET);

		let estimatedScore;
		let simulationComponent = null;

		if (hasSimulations) {
			const sum = validScores.reduce((acc, s) => acc + s, 0);
			simulationComponent = sum / validScores.length;
			estimatedScore = Math.round(
				0.6 * simulationComponent + 0.4 * vocabularyComponent,
			);
		} else {
			estimatedScore = Math.round(vocabularyComponent);
		}

		const band = mapAmiramToCefr(estimatedScore);

		const isExempt = estimatedScore >= 134;

		let focus;
		if (!hasSimulations) {
			focus = "להתמקד בסימולציות";
		} else if (simulationComponent < vocabularyComponent) {
			focus = "להתמקד בסימולציות";
		} else {
			focus = "להתמקד באוצר מילים";
		}

		return Object.freeze({
			estimatedScore,
			range: Object.freeze({
				minScore: band.minScore,
				maxScore: band.maxScore,
				midpoint: band.midpoint,
			}),
			level: band.level,
			label: band.label,
			isExempt,
			focus,
			isStart: false,
		});
	}

	return {
		AMIRAM_CEFR_BANDS,
		A1_BAND,
		VOCAB_TARGET,
		mapAmiramToCefr,
		evaluateCompetencyProfile,
	};
});
