((root, factory) => {
	if (typeof module === "object" && module.exports) module.exports = factory();
	else root.ShirAmiramWordFamilyBuilder = factory();
})(typeof self !== "undefined" ? self : this, () => {
	const FAMILIES = Object.freeze([
		{ rootKey: "create", noun: "creation", verb: "create", adjective: "creative", adverb: "creatively" },
		{ rootKey: "decide", noun: "decision", verb: "decide", adjective: "decisive", adverb: "decisively" },
		{ rootKey: "educate", noun: "education", verb: "educate", adjective: "educational", adverb: "educationally" },
		{ rootKey: "act", noun: "action", verb: "act", adjective: "active", adverb: "actively" },
		{ rootKey: "beauty", noun: "beauty", verb: "beautify", adjective: "beautiful", adverb: "beautifully" },
		{ rootKey: "care", noun: "care", verb: "care", adjective: "careful", adverb: "carefully" },
		{ rootKey: "happy", noun: "happiness", verb: "happify", adjective: "happy", adverb: "happily" },
		{ rootKey: "help", noun: "help", verb: "help", adjective: "helpful", adverb: "helpfully" },
		{ rootKey: "inform", noun: "information", verb: "inform", adjective: "informative", adverb: "informatively" },
		{ rootKey: "move", noun: "movement", verb: "move", adjective: "movable", adverb: "movably" },
		{ rootKey: "nation", noun: "nation", verb: "nationalize", adjective: "national", adverb: "nationally" },
		{ rootKey: "organize", noun: "organization", verb: "organize", adjective: "organized", adverb: "organizationally" },
		{ rootKey: "produce", noun: "production", verb: "produce", adjective: "productive", adverb: "productively" },
		{ rootKey: "quick", noun: "quickness", verb: "quicken", adjective: "quick", adverb: "quickly" },
		{ rootKey: "relate", noun: "relation", verb: "relate", adjective: "relative", adverb: "relatively" },
		{ rootKey: "safe", noun: "safety", verb: "save", adjective: "safe", adverb: "safely" },
		{ rootKey: "simple", noun: "simplicity", verb: "simplify", adjective: "simple", adverb: "simply" },
		{ rootKey: "strong", noun: "strength", verb: "strengthen", adjective: "strong", adverb: "strongly" },
		{ rootKey: "success", noun: "success", verb: "succeed", adjective: "successful", adverb: "successfully" },
		{ rootKey: "think", noun: "thought", verb: "think", adjective: "thoughtful", adverb: "thoughtfully" },
	]);

	function getWordFamily(word) {
		if (typeof word !== "string" || !word.trim()) return null;
		const w = word.toLowerCase().trim();
		for (const f of FAMILIES) {
			if (
				f.rootKey === w ||
				f.noun === w ||
				f.verb === w ||
				f.adjective === w ||
				f.adverb === w
			) {
				return { ...f };
			}
		}
		return null;
	}

	function derivePartOfSpeech(word, targetPOS) {
		const fam = getWordFamily(word);
		if (!fam) return null;
		const key = String(targetPOS || "").toLowerCase();
		if (key === "noun") return fam.noun;
		if (key === "verb") return fam.verb;
		if (key === "adjective") return fam.adjective;
		if (key === "adverb") return fam.adverb;
		return null;
	}

	return { FAMILIES, getWordFamily, derivePartOfSpeech };
});
