((root, factory) => {
	if (typeof module === "object" && module.exports) module.exports = factory();
	else root.ShirAmiramPrefixSuffixEngine = factory();
})(typeof self !== "undefined" ? self : this, () => {
	const PREFIXES = Object.freeze({
		un: "לא / שלילה",
		re: "שוב / מחדש",
		pre: "לפני",
		dis: "היפוך / ניגוד",
		mis: "בטעות / לא נכון",
		non: "לא",
		over: "יתר / יותר מדי",
		under: "חסר / מתחת",
		inter: "בין",
		trans: "מעבר / דרך",
		sub: "תת / מתחת",
		super: "על / מעבר",
		anti: "נגד",
		co: "יחד / משותף",
		ex: "לשעבר / מחוץ",
	});

	const SUFFIXES = Object.freeze({
		able: "ניתן ל…",
		ible: "ניתן ל…",
		less: "בלי / חסר",
		ful: "מלא ב…",
		ness: "תכונה / מצב",
		ment: "פעולה / תוצאה",
		tion: "פעולה / תהליך",
		sion: "פעולה / תהליך",
		er: "עושה פעולה",
		or: "עושה פעולה",
		ly: "באופן…",
		ous: "בעל תכונה",
		ive: "נוטה ל…",
		al: "שייך ל…",
		ity: "מצב / איכות",
	});

	function emptyResult(originalWord) {
		return {
			originalWord,
			prefix: null,
			prefixMeaning: null,
			baseRoot: originalWord || "",
			suffix: null,
			suffixMeaning: null,
			hasAffixes: false,
		};
	}

	function decomposeAffixes(word) {
		if (typeof word !== "string") return emptyResult("");
		const originalWord = word;
		const lower = word.toLowerCase().trim();
		if (!lower || lower.length < 3) return emptyResult(originalWord);

		let prefix = null;
		let prefixMeaning = null;
		let rest = lower;
		const prefixKeys = Object.keys(PREFIXES).sort((a, b) => b.length - a.length);
		for (const p of prefixKeys) {
			if (rest.startsWith(p) && rest.length - p.length >= 2) {
				prefix = p;
				prefixMeaning = PREFIXES[p];
				rest = rest.slice(p.length);
				break;
			}
		}

		let suffix = null;
		let suffixMeaning = null;
		const suffixKeys = Object.keys(SUFFIXES).sort((a, b) => b.length - a.length);
		for (const s of suffixKeys) {
			if (rest.endsWith(s) && rest.length - s.length >= 2) {
				suffix = s;
				suffixMeaning = SUFFIXES[s];
				rest = rest.slice(0, rest.length - s.length);
				break;
			}
		}

		const hasAffixes = Boolean(prefix || suffix);
		return {
			originalWord,
			prefix,
			prefixMeaning,
			baseRoot: rest || lower,
			suffix,
			suffixMeaning,
			hasAffixes,
		};
	}

	return { PREFIXES, SUFFIXES, decomposeAffixes };
});
