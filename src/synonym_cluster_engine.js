((root, factory) => {
	if (typeof module === "object" && module.exports) {
		module.exports = factory();
	} else {
		root.ShirAmiramSynonymClusterEngine = factory();
	}
})(typeof self !== "undefined" ? self : this, () => {
	const CLUSTERS = Object.freeze([
		Object.freeze(["abundant", "plentiful", "copious", "ample"]),
		Object.freeze(["fragile", "delicate", "brittle", "vulnerable"]),
		Object.freeze(["ancient", "archaic", "antique", "primitive"]),
	]);

	const ANTONYM_PAIRS = Object.freeze([
		Object.freeze(["abundant", "scarce"]),
		Object.freeze(["ancient", "modern"]),
	]);

	function norm(word) {
		if (word === undefined || word === null) return "";
		return String(word).trim().toLowerCase();
	}

	function findCluster(word) {
		const w = norm(word);
		if (!w) return null;
		for (const cluster of CLUSTERS) {
			if (cluster.includes(w)) return cluster;
		}
		return null;
	}

	function findSynonyms(word) {
		const cluster = findCluster(word);
		const w = norm(word);
		if (!cluster) return [];
		return cluster.filter((x) => x !== w);
	}

	function findAntonyms(word) {
		const w = norm(word);
		if (!w) return [];
		const out = [];
		for (const pair of ANTONYM_PAIRS) {
			if (pair[0] === w) out.push(pair[1]);
			else if (pair[1] === w) out.push(pair[0]);
		}
		return out;
	}

	function checkSemanticRelation(a, b) {
		const wa = norm(a);
		const wb = norm(b);
		if (!wa || !wb || wa === wb) return "UNRELATED";
		const cluster = findCluster(wa);
		if (cluster?.includes(wb)) return "SYNONYM";
		const ants = findAntonyms(wa);
		if (ants.includes(wb)) return "ANTONYM";
		return "UNRELATED";
	}

	return {
		findSynonyms,
		findAntonyms,
		checkSemanticRelation,
	};
});
