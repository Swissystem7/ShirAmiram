((root, factory) => {
	if (typeof module === "object" && module.exports) module.exports = factory();
	else root.ShirAmiramDailySummaryCard = factory();
})(typeof self !== "undefined" ? self : this, () => {
	function generateDailySummaryCard({
		dateString = "",
		streakDays = 1,
		wordsLearnedCount = 0,
		xpEarned = 0,
		featuredSongTitle = "",
		songQuote = "",
	} = {}) {
		const date = String(dateString || "").trim() || "היום";
		const streak = Number.isFinite(Number(streakDays)) ? Number(streakDays) : 1;
		const words = Number.isFinite(Number(wordsLearnedCount))
			? Number(wordsLearnedCount)
			: 0;
		const xp = Number.isFinite(Number(xpEarned)) ? Number(xpEarned) : 0;
		const song = String(featuredSongTitle || "").trim();
		const quote = String(songQuote || "").trim();

		const lines = [
			"╔══════════════════════════╗",
			`║  סיכום יומי · ${date}`,
			`║  רצף: ${streak} ימים`,
			`║  מילים שנלמדו: ${words} · XP: ${xp}`,
		];
		if (song) lines.push(`║  שיר נבחר: ${song}`);
		if (quote) lines.push(`║  ציטוט: "${quote}"`);
		lines.push("╚══════════════════════════╝");
		return lines.join("\n");
	}

	return { generateDailySummaryCard };
});
