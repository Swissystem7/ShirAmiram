((root, factory) => {
	if (typeof module === "object" && module.exports) module.exports = factory();
	else root.ShirAmiramAudioSpeedPitchCalculator = factory();
})(typeof self !== "undefined" ? self : this, () => {
	const PLAYBACK_RATES = Object.freeze([0.5, 0.75, 1.0, 1.25, 1.5, 2.0]);

	function normalizeRate(playbackRate) {
		const r = Number(playbackRate);
		if (!Number.isFinite(r) || r <= 0) return 1.0;
		return r;
	}

	function scaleTimestamp(originalTimestampMs, playbackRate = 1.0) {
		const t = Number(originalTimestampMs);
		if (!Number.isFinite(t)) return 0;
		const rate = normalizeRate(playbackRate);
		return Math.round(t / rate);
	}

	function scaleKaraokeLineTimings(lineObject, playbackRate = 1.0) {
		const rate = normalizeRate(playbackRate);
		const src =
			lineObject && typeof lineObject === "object" && !Array.isArray(lineObject)
				? lineObject
				: {};
		const timeMs = Number(src.timeMs);
		const windowMs = Number(src.windowMs);
		return {
			...src,
			scaledTimeMs: scaleTimestamp(
				Number.isFinite(timeMs) ? timeMs : 0,
				rate,
			),
			scaledWindowMs: scaleTimestamp(
				Number.isFinite(windowMs) ? windowMs : 0,
				rate,
			),
			playbackRate: rate,
		};
	}

	return { PLAYBACK_RATES, scaleTimestamp, scaleKaraokeLineTimings };
});
