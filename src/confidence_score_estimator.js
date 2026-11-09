((root, factory) => {
	if (typeof module === "object" && module.exports) module.exports = factory();
	else root.ShirAmiramConfidenceScoreEstimator = factory();
})(typeof self !== "undefined" ? self : this, () => {
	function evaluateResponseConfidence(responseTimeMs, isCorrect) {
		const ms = Number(responseTimeMs);
		const ok = isCorrect === true;
		if (!Number.isFinite(ms) || ms < 0) {
			return {
				confidenceTier: "NORMAL",
				isHesitantGuess: false,
				scheduleMultiplier: 1.0,
			};
		}
		if (ok) {
			if (ms < 3000)
				return {
					confidenceTier: "SOLID",
					isHesitantGuess: false,
					scheduleMultiplier: 1.2,
				};
			if (ms <= 8000)
				return {
					confidenceTier: "NORMAL",
					isHesitantGuess: false,
					scheduleMultiplier: 1.0,
				};
			return {
				confidenceTier: "HESITANT",
				isHesitantGuess: true,
				scheduleMultiplier: 0.7,
			};
		}
		if (ms < 2000)
			return {
				confidenceTier: "IMPULSIVE",
				isHesitantGuess: false,
				scheduleMultiplier: 0.7,
			};
		return {
			confidenceTier: "STRUGGLED",
			isHesitantGuess: false,
			scheduleMultiplier: 0.7,
		};
	}
	return { evaluateResponseConfidence };
});
// round-17 CI nudge
