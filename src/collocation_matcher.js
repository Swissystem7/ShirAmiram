((root, factory) => {
	if (typeof module === "object" && module.exports) module.exports = factory();
	else root.ShirAmiramCollocationMatcher = factory();
})(typeof self !== "undefined" ? self : this, () => {
	const COLLOCATIONS = Object.freeze([
		{ base: "capable", prep: "of", wrong: ["to", "for"], he: "מסוגל ל-" },
		{ base: "interested", prep: "in", wrong: ["for", "on"], he: "מתעניין ב-" },
		{ base: "depend", prep: "on", wrong: ["of", "in"], he: "תלוי ב-" },
		{ base: "afraid", prep: "of", wrong: ["from", "to"], he: "פוחד מ-" },
		{ base: "good", prep: "at", wrong: ["in", "with"], he: "טוב ב-" },
		{ base: "bad", prep: "at", wrong: ["in", "with"], he: "גרוע ב-" },
		{ base: "famous", prep: "for", wrong: ["of", "by"], he: "מפורסם ב-" },
		{ base: "responsible", prep: "for", wrong: ["of", "to"], he: "אחראי ל-" },
		{ base: "proud", prep: "of", wrong: ["from", "for"], he: "גאה ב-" },
		{ base: "tired", prep: "of", wrong: ["from", "with"], he: "עייף מ-" },
		{ base: "aware", prep: "of", wrong: ["about", "to"], he: "מודע ל-" },
		{ base: "similar", prep: "to", wrong: ["with", "as"], he: "דומה ל-" },
		{ base: "different", prep: "from", wrong: ["than", "of"], he: "שונה מ-" },
		{ base: "married", prep: "to", wrong: ["with", "of"], he: "נשוי ל-" },
		{ base: "listen", prep: "to", wrong: ["at", "for"], he: "להקשיב ל-" },
		{ base: "wait", prep: "for", wrong: ["to", "on"], he: "לחכות ל-" },
		{ base: "belong", prep: "to", wrong: ["with", "in"], he: "שייך ל-" },
		{
			base: "apologize",
			prep: "for",
			wrong: ["about", "to"],
			he: "להתנצל על-",
		},
		{ base: "rely", prep: "on", wrong: ["in", "to"], he: "להסתמך על-" },
		{ base: "succeed", prep: "in", wrong: ["at", "to"], he: "להצליח ב-" },
		{ base: "believe", prep: "in", wrong: ["to", "on"], he: "להאמין ב-" },
		{ base: "concentrate", prep: "on", wrong: ["in", "at"], he: "להתרכז ב-" },
		{ base: "agree", prep: "with", wrong: ["to", "on"], he: "להסכים עם-" },
		{ base: "look", prep: "at", wrong: ["to", "on"], he: "להסתכל על-" },
		{ base: "pay", prep: "for", wrong: ["to", "on"], he: "לשלם עבור-" },
	]);

	function findCollocations(text) {
		if (typeof text !== "string" || !text.trim()) return [];
		const lower = text
			.toLowerCase()
			.replace(/[^\w\s]/g, " ")
			.replace(/\s+/g, " ")
			.trim();
		const out = [];
		const seen = new Set();
		for (const c of COLLOCATIONS) {
			if (seen.has(c.base)) continue;
			const re = new RegExp(`\\b${c.base}\\s+(?=(\\w+)\\b)`, "gi");
			const matches = Array.from(lower.matchAll(re));
			if (matches.length === 0) continue;
			const preferred =
				matches.find((m) => m[1] === c.prep || c.wrong.includes(m[1])) ||
				matches.find((m) => m[1] !== c.base) ||
				matches[0];
			const prep = preferred[1].toLowerCase();
			const fullPhrase = `${c.base} ${prep}`;
			if (seen.has(fullPhrase)) continue;
			seen.add(c.base);
			seen.add(fullPhrase);
			out.push({
				baseWord: c.base,
				preposition: prep,
				fullPhrase,
				hebrewMeaning: c.he,
			});
		}
		return out;
	}

	function validatePreposition(baseWord, usedPreposition) {
		const rawBase = String(baseWord || "")
			.toLowerCase()
			.replace(/\s+/g, " ")
			.trim();
		let used = String(usedPreposition || "")
			.toLowerCase()
			.replace(/\s+/g, " ")
			.trim();

		let base = rawBase;
		if (rawBase.includes(" ")) {
			const parts = rawBase.split(" ");
			if (usedPreposition === undefined && parts.length === 2) {
				base = parts[0];
				used = parts[1];
			} else {
				const found = COLLOCATIONS.find((x) => parts.includes(x.base));
				if (found) {
					base = found.base;
					if (usedPreposition === undefined) {
						const idx = parts.indexOf(found.base);
						if (idx !== -1 && idx + 1 < parts.length) {
							used = parts[idx + 1];
						}
					}
				}
			}
		}

		const c = COLLOCATIONS.find((x) => x.base === base);
		if (!c) {
			return {
				isValid: false,
				expectedPreposition: null,
				commonMistake: false,
			};
		}
		const isValid = used === c.prep;
		return {
			isValid,
			expectedPreposition: c.prep,
			commonMistake: !isValid && c.wrong.includes(used),
		};
	}

	return { COLLOCATIONS, findCollocations, validatePreposition };
});
