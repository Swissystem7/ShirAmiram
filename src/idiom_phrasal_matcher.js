((root, factory) => {
	if (typeof module === "object" && module.exports) module.exports = factory();
	else root.ShirAmiramIdiomPhrasalMatcher = factory();
})(typeof self !== "undefined" ? self : this, () => {
	const PHRASALS = Object.freeze([
		Object.freeze({
			baseVerb: "carry",
			particle: "out",
			hebrewMeaning: "לבצע / להוציא לפועל",
		}),
		Object.freeze({
			baseVerb: "give",
			particle: "up",
			hebrewMeaning: "לוותר / להרים ידיים",
		}),
		Object.freeze({
			baseVerb: "turn",
			particle: "down",
			hebrewMeaning: "לסרב / להנמיך",
		}),
		Object.freeze({
			baseVerb: "bring",
			particle: "about",
			hebrewMeaning: "לגרום / להביא לידי",
		}),
		Object.freeze({
			baseVerb: "look",
			particle: "after",
			hebrewMeaning: "לטפל / להשגיח",
		}),
		Object.freeze({ baseVerb: "look", particle: "for", hebrewMeaning: "לחפש" }),
		Object.freeze({ baseVerb: "put", particle: "off", hebrewMeaning: "לדחות" }),
		Object.freeze({
			baseVerb: "put",
			particle: "up",
			hebrewMeaning: "לארח / להקים",
		}),
		Object.freeze({
			baseVerb: "take",
			particle: "off",
			hebrewMeaning: "להמריא / להסיר",
		}),
		Object.freeze({
			baseVerb: "take",
			particle: "after",
			hebrewMeaning: "להידמות ל-",
		}),
		Object.freeze({
			baseVerb: "come",
			particle: "across",
			hebrewMeaning: "להיתקל ב-",
		}),
		Object.freeze({
			baseVerb: "come",
			particle: "up",
			hebrewMeaning: "לעלות / להופיע",
		}),
		Object.freeze({ baseVerb: "go", particle: "on", hebrewMeaning: "להמשיך" }),
		Object.freeze({
			baseVerb: "go",
			particle: "through",
			hebrewMeaning: "לעבור / לחוות",
		}),
		Object.freeze({ baseVerb: "run", particle: "out", hebrewMeaning: "לאזול" }),
		Object.freeze({
			baseVerb: "run",
			particle: "into",
			hebrewMeaning: "להיתקל ב-",
		}),
		Object.freeze({
			baseVerb: "set",
			particle: "up",
			hebrewMeaning: "להקים / לסדר",
		}),
		Object.freeze({
			baseVerb: "make",
			particle: "up",
			hebrewMeaning: "להמציא / להתאפר",
		}),
		Object.freeze({
			baseVerb: "break",
			particle: "down",
			hebrewMeaning: "להתקלקל / להתמוטט",
		}),
		Object.freeze({
			baseVerb: "break",
			particle: "up",
			hebrewMeaning: "להיפרד / להתפרק",
		}),
	]);

	function findPhrasalVerbs(text) {
		const raw = text == null ? "" : String(text);
		const lower = raw.toLowerCase();
		const out = [];
		for (const p of PHRASALS) {
			const contiguous = `${p.baseVerb} ${p.particle}`;
			let from = 0;
			while (from < lower.length) {
				const idx = lower.indexOf(contiguous, from);
				if (idx === -1) break;
				out.push({
					phrasalVerb: contiguous,
					baseVerb: p.baseVerb,
					particle: p.particle,
					hebrewMeaning: p.hebrewMeaning,
					startIndex: idx,
					endIndex: idx + contiguous.length,
				});
				from = idx + contiguous.length;
			}
			// split with one pronoun: turn it down
			const splitRe = new RegExp(
				`\\b${p.baseVerb}\\s+(?:it|them|him|her|us|me|you)\\s+${p.particle}\\b`,
				"gi",
			);
			let m = splitRe.exec(raw);
			while (m !== null) {
				out.push({
					phrasalVerb: contiguous,
					baseVerb: p.baseVerb,
					particle: p.particle,
					hebrewMeaning: p.hebrewMeaning,
					startIndex: m.index,
					endIndex: m.index + m[0].length,
				});
				m = splitRe.exec(raw);
			}
		}
		return out.sort(
			(a, b) => a.startIndex - b.startIndex || a.endIndex - b.endIndex,
		);
	}

	return { PHRASALS, findPhrasalVerbs };
});
