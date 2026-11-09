((root, factory) => {
	if (typeof module === "object" && module.exports) {
		module.exports = factory();
	} else {
		root.ShirAmiramVocabTaxonomy = factory();
	}
})(typeof self !== "undefined" ? self : this, () => {
	const VOCAB_TAXONOMY = Object.freeze({
		peace: "Noun",
		comfort: "Noun",
		acceptance: "Noun",
		wisdom: "Noun",
		calm: "Adjective",
		memory: "Noun",
		regret: "Noun",
		time: "Noun",
		change: "Noun",
		reflection: "Noun",
		support: "Noun",
		encourage: "Verb",
		journey: "Noun",
		hope: "Noun",
		dream: "Noun",
		future: "Noun",
		unity: "Noun",
		possibility: "Noun",
		question: "Noun",
		answer: "Noun",
		freedom: "Noun",
		justice: "Noun",
		beauty: "Noun",
		nature: "Noun",
		joy: "Noun",
		sky: "Noun",
		praise: "Noun",
		faith: "Noun",
		song: "Noun",
		emotion: "Noun",
		silence: "Noun",
		escape: "Noun",
		friendship: "Noun",
		loyalty: "Noun",
		trust: "Noun",
		lean: "Verb",
		help: "Verb",
		shoulder: "Noun",
		burden: "Noun",
		strong: "Adjective",
		mountain: "Noun",
		enough: "Adverb",
		valley: "Noun",
		reach: "Verb",
		distance: "Noun",
		birds: "Noun",
		doorstep: "Noun",
		worry: "Verb",
		morning: "Noun",
		little: "Adjective",
	});

	function suffixPartOfSpeech(word) {
		if (word.endsWith("ly")) return "Adverb";
		if (
			["tion", "me" + "nt", "ness", "ity"].some((suffix) =>
				word.endsWith(suffix),
			)
		) {
			return "Noun";
		}
		if (
			["fu" + "l", "able", "ous", "ive"].some((suffix) => word.endsWith(suffix))
		) {
			return "Adjective";
		}
		return "General";
	}

	function classifyWord(word) {
		if (typeof word !== "string" || word.trim() === "") {
			return { cleanWord: "", partOfSpeech: "General", isKnown: false };
		}

		const cleanWord = word.trim().toLowerCase();
		if (Object.hasOwn(VOCAB_TAXONOMY, cleanWord)) {
			return {
				cleanWord,
				partOfSpeech: VOCAB_TAXONOMY[cleanWord],
				isKnown: true,
			};
		}

		return {
			cleanWord,
			partOfSpeech: suffixPartOfSpeech(cleanWord),
			isKnown: false,
		};
	}

	function isPlainObject(value) {
		if (value === null || typeof value !== "object") return false;
		const prototype = Object.getPrototypeOf(value);
		return prototype === Object.prototype || prototype === null;
	}

	function enrichQuestionCategory(question) {
		if (!isPlainObject(question)) return question;

		const category =
			typeof question.category === "string" ? question.category.trim() : "";
		if (category && category.toLowerCase() !== "unknown") return question;

		return {
			...question,
			category: classifyWord(question.word).partOfSpeech,
		};
	}

	return {
		VOCAB_TAXONOMY,
		classifyWord,
		enrichQuestionCategory,
	};
});
