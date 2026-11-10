((root, factory) => {
	if (typeof module === "object" && module.exports) {
		module.exports = factory();
	} else {
		root.ShirAmiramRestatementGenerator = factory();
	}
})(typeof self !== "undefined" ? self : this, () => {
	const clusterEngine =
		typeof require === "function"
			? require("./synonym_cluster_engine.js")
			: root.ShirAmiramSynonymClusterEngine;

	function norm(word) {
		if (word === undefined || word === null) return "";
		return String(word).trim().toLowerCase();
	}

	function mulberry32(seed) {
		let a = seed >>> 0;
		return function next() {
			a |= 0;
			a = (a + 0x6d2b79f5) | 0;
			let t = Math.imul(a ^ (a >>> 15), 1 | a);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	function seedFrom(value) {
		if (typeof value === "number" && Number.isFinite(value)) return value >>> 0;
		const s = String(value ?? "restatement");
		let h = 2166136261;
		for (let i = 0; i < s.length; i++) {
			h ^= s.charCodeAt(i);
			h = Math.imul(h, 16777619);
		}
		return h >>> 0;
	}

	function shuffleInPlace(arr, rand) {
		for (let i = arr.length - 1; i > 0; i--) {
			const j = Math.floor(rand() * (i + 1));
			const tmp = arr[i];
			arr[i] = arr[j];
			arr[j] = tmp;
		}
		return arr;
	}

	const UNRELATED_POOL = Object.freeze([
		"bicycle",
		"keyboard",
		"ocean",
		"notebook",
		"lantern",
		"melody",
		"window",
		"garden",
	]);

	function escapeRegExp(value) {
		return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	}

	function matchCase(replacement, reference) {
		const rep = String(replacement);
		const ref = String(reference);
		if (!rep || !ref) return rep;
		if (ref === ref.toUpperCase() && ref !== ref.toLowerCase()) {
			return rep.toUpperCase();
		}
		if (
			ref[0] === ref[0].toUpperCase() &&
			ref[0] !== ref[0].toLowerCase() &&
			ref.slice(1) === ref.slice(1).toLowerCase()
		) {
			return rep[0].toUpperCase() + rep.slice(1);
		}
		return rep;
	}

	function buildRestatedSentence(originalSentence, targetWord, synonym) {
		const orig = String(originalSentence || "");
		const target = String(targetWord || "").trim();
		const syn = String(synonym || "").trim();

		if (!orig) {
			return syn ? `In other words, ${syn}.` : "";
		}

		let candidate = orig;
		if (target) {
			const wordBoundaryRe = new RegExp(`\\b${escapeRegExp(target)}\\b`, "gi");
			if (wordBoundaryRe.test(orig)) {
				candidate = orig.replace(wordBoundaryRe, (match) =>
					matchCase(syn, match),
				);
			} else {
				const looseRe = new RegExp(escapeRegExp(target), "gi");
				if (looseRe.test(orig)) {
					candidate = orig.replace(looseRe, (match) => matchCase(syn, match));
				}
			}
		}

		if (norm(candidate) === norm(orig)) {
			const trimmedOrig = orig.trim();
			const fallbackSyn =
				syn && norm(syn) !== norm(target) ? syn : `similar to ${target || syn}`;
			candidate = trimmedOrig
				? `${trimmedOrig} (in other words: ${fallbackSyn})`
				: `In other words: ${fallbackSyn}`;
		}

		return candidate;
	}

	function pickUnrelated(exclude, rand) {
		const pool = UNRELATED_POOL.filter((w) => !exclude.has(w));
		if (pool.length === 0) return "object";
		return pool[Math.floor(rand() * pool.length)];
	}

	function generateRestatementQuestion(input) {
		const opts = input && typeof input === "object" ? input : {};
		const originalSentence = String(opts.originalSentence || "");
		const targetWord = String(opts.targetWord || "");
		const target = norm(targetWord);
		const rand = mulberry32(
			seedFrom(opts.seed ?? `${originalSentence}|${targetWord}`),
		);

		const synonyms = clusterEngine
			.findSynonyms(targetWord)
			.filter((s) => norm(s) && norm(s) !== target);
		const antonyms = clusterEngine
			.findAntonyms(targetWord)
			.filter((a) => norm(a) && norm(a) !== target);

		const customSyn =
			opts.customSynonym != null ? String(opts.customSynonym).trim() : "";
		let correct = "";
		if (customSyn && norm(customSyn) !== target) {
			correct = customSyn;
		} else if (synonyms.length > 0) {
			correct = String(synonyms[0]);
		} else if (target) {
			correct = `equivalent to ${targetWord.trim()}`;
		} else {
			correct = customSyn || "synonym";
		}

		const customAnt =
			opts.customAntonym != null ? String(opts.customAntonym).trim() : "";
		const antonym =
			customAnt &&
			norm(customAnt) !== target &&
			norm(customAnt) !== norm(correct)
				? customAnt
				: antonyms.find((a) => norm(a) !== norm(correct)) || "opposite";

		const exclude = new Set(
			[target, norm(correct), norm(antonym)].filter(Boolean),
		);
		const negationTrap = `not ${correct}`;
		const unrelated = pickUnrelated(exclude, rand);

		const choices = [correct, antonym, negationTrap, unrelated];
		shuffleInPlace(choices, rand);
		const correctIndex = choices.indexOf(correct);
		const restatedSentence = buildRestatedSentence(
			originalSentence,
			targetWord,
			correct,
		);

		return {
			originalSentence,
			restatedSentence,
			targetWord,
			choices,
			correctIndex,
		};
	}

	return { generateRestatementQuestion, buildRestatedSentence };
});
