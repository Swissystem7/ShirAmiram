((root, factory) => {
	if (typeof module === "object" && module.exports) module.exports = factory();
	else root.ShirAmiramSpellingBeeValidator = factory();
})(typeof self !== "undefined" ? self : this, () => {
	function mulberry32(seed) {
		let t = seed >>> 0;
		return () => {
			t += 0x6d2b79f5;
			let r = Math.imul(t ^ (t >>> 15), 1 | t);
			r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
			return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
		};
	}

	function scrambleWord(word, seed = null) {
		if (typeof word !== "string") return "";
		const normalized = word.toLowerCase().replace(/\s+/g, "");
		if (!normalized) return "";
		if (normalized.length === 1) return normalized;
		const chars = normalized.split("");
		const rand =
			seed === null || seed === undefined
				? Math.random
				: mulberry32(Number(seed) || 0);
		for (let attempt = 0; attempt < 20; attempt += 1) {
			const arr = chars.slice();
			for (let i = arr.length - 1; i > 0; i -= 1) {
				const j = Math.floor(rand() * (i + 1));
				const tmp = arr[i];
				arr[i] = arr[j];
				arr[j] = tmp;
			}
			const out = arr.join("");
			if (out !== normalized) return out;
		}
		// force swap first two if all shuffles matched
		const forced = chars.slice();
		const tmp = forced[0];
		forced[0] = forced[1];
		forced[1] = tmp;
		return forced.join("");
	}

	function validateSpellingAttempt(targetWord, userAttempt) {
		const target =
			typeof targetWord === "string"
				? targetWord.toLowerCase().replace(/\s+/g, "")
				: "";
		const attempt =
			typeof userAttempt === "string"
				? userAttempt.toLowerCase().replace(/\s+/g, "")
				: "";
		const totalLetters = target.length;
		let matchedLettersCount = 0;
		let firstMismatchIndex = -1;
		const lim = Math.min(target.length, attempt.length);
		for (let i = 0; i < lim; i += 1) {
			if (target[i] === attempt[i]) matchedLettersCount += 1;
			else if (firstMismatchIndex === -1) firstMismatchIndex = i;
		}
		if (firstMismatchIndex === -1 && attempt.length !== target.length) {
			firstMismatchIndex = lim;
		}
		const isComplete = attempt.length === target.length;
		const isCorrect = isComplete && firstMismatchIndex === -1;
		return {
			isCorrect,
			matchedLettersCount,
			totalLetters,
			firstMismatchIndex,
			isComplete,
		};
	}

	return { scrambleWord, validateSpellingAttempt };
});
