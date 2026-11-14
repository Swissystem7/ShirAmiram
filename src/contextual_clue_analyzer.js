((root, factory) => {
	if (typeof module === "object" && module.exports) module.exports = factory();
	else root.ShirAmiramContextualClueAnalyzer = factory();
})(typeof self !== "undefined" ? self : this, () => {
	const SIGNALS = Object.freeze([
		{ word: "although", type: "CONTRAST" },
		{ word: "however", type: "CONTRAST" },
		{ word: "despite", type: "CONTRAST" },
		{ word: "nevertheless", type: "CONTRAST" },
		{ word: "whereas", type: "CONTRAST" },
		{ word: "yet", type: "CONTRAST" },
		{ word: "but", type: "CONTRAST" },
		{ word: "because", type: "CAUSE_EFFECT" },
		{ word: "therefore", type: "CAUSE_EFFECT" },
		{ word: "consequently", type: "CAUSE_EFFECT" },
		{ word: "as a result", type: "CAUSE_EFFECT" },
		{ word: "since", type: "CAUSE_EFFECT" },
		{ word: "thus", type: "CAUSE_EFFECT" },
		{ word: "furthermore", type: "ADDITION" },
		{ word: "moreover", type: "ADDITION" },
		{ word: "in addition", type: "ADDITION" },
		{ word: "besides", type: "ADDITION" },
	]);

	function detectTransitionSignals(sentence) {
		if (typeof sentence !== "string" || !sentence.trim()) return [];
		const lower = sentence.toLowerCase();
		const out = [];
		const sorted = [...SIGNALS].sort((a, b) => b.word.length - a.word.length);
		const used = [];
		for (const s of sorted) {
			let from = 0;
			while (from < lower.length) {
				const idx = lower.indexOf(s.word, from);
				if (idx === -1) break;
				const end = idx + s.word.length;
				const overlaps = used.some((r) => !(end <= r[0] || idx >= r[1]));
				if (!overlaps) {
					out.push({
						signalWord: s.word,
						signalType: s.type,
						positionIndex: idx,
					});
					used.push([idx, end]);
				}
				from = idx + 1;
			}
		}
		return out.sort((a, b) => a.positionIndex - b.positionIndex);
	}

	function predictSemanticDirection(sentence) {
		const hits = detectTransitionSignals(sentence);
		if (!hits.length) return "NEUTRAL";
		if (hits.some((h) => h.signalType === "CONTRAST")) return "OPPOSITE_MEANING";
		return "REINFORCING";
	}

	return { detectTransitionSignals, predictSemanticDirection };
});
