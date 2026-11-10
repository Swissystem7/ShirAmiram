((root, factory) => {
	if (typeof module === "object" && module.exports) module.exports = factory();
	else root.ShirAmiramReadingSpeedCalculator = factory();
})(typeof self !== "undefined" ? self : this, () => {
	function calculateWPM(wordCount, durationSeconds) {
		const words = Number(wordCount);
		const secs = Number(durationSeconds);
		if (
			!Number.isFinite(words) ||
			!Number.isFinite(secs) ||
			secs < 1 ||
			words < 0
		) {
			return 0;
		}
		return Math.round(words / (secs / 60));
	}

	function classifyPacingTier(wpm) {
		const n = Number(wpm);
		const safe = Number.isFinite(n) && n >= 0 ? n : 0;
		let tier = "RUSHED";
		if (safe < 100) tier = "TOO_SLOW";
		else if (safe <= 180) tier = "OPTIMAL_PACING";
		else if (safe <= 250) tier = "FAST";
		return { wpm: safe, tier, isOptimal: tier === "OPTIMAL_PACING" };
	}

	function estimateReadingTimeSeconds(text, targetWPM = 140) {
		const wpm = Number(targetWPM);
		if (!Number.isFinite(wpm) || wpm <= 0) return 0;
		const words =
			typeof text === "string"
				? text.trim() === ""
					? 0
					: text.trim().split(/\s+/).length
				: 0;
		return Math.round((words / wpm) * 60);
	}

	return { calculateWPM, classifyPacingTier, estimateReadingTimeSeconds };
});
