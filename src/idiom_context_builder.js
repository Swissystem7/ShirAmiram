((root, factory) => {
	if (typeof module === "object" && module.exports) module.exports = factory();
	else root.ShirAmiramIdiomContextBuilder = factory();
})(typeof self !== "undefined" ? self : this, () => {
	const IDIOMS = Object.freeze([
		{ key: "break_the_ice", phrase: "break the ice", he: "לשבור את הקרח / להתחיל שיחה", trap: "לא שוברים קרח פיזית" },
		{ key: "piece_of_cake", phrase: "piece of cake", he: "קל מאוד", trap: "לא פרוסת עוגה ממש" },
		{ key: "hit_the_books", phrase: "hit the books", he: "ללמוד ברצינות", trap: "לא להכות ספרים" },
		{ key: "under_the_weather", phrase: "under the weather", he: "לא מרגיש טוב", trap: "לא מתחת למזג האוויר" },
		{ key: "spill_the_beans", phrase: "spill the beans", he: "לגלות סוד", trap: "לא לשפוך שעועית" },
		{ key: "cost_an_arm_and_a_leg", phrase: "cost an arm and a leg", he: "יקר מאוד", trap: "לא עולה איבר ממש" },
		{ key: "once_in_a_blue_moon", phrase: "once in a blue moon", he: "לעיתים נדירות", trap: "לא ירח כחול" },
		{ key: "bite_the_bullet", phrase: "bite the bullet", he: "להתמודד עם משהו קשה", trap: "לא לנשוך כדור" },
		{ key: "let_the_cat_out", phrase: "let the cat out of the bag", he: "לחשוף סוד בטעות", trap: "לא לשחרר חתול משקית" },
		{ key: "kick_the_bucket", phrase: "kick the bucket", he: "למות (סלנג)", trap: "לא לבעוט בדלי" },
		{ key: "on_cloud_nine", phrase: "on cloud nine", he: "מאושר מאוד", trap: "לא על ענן מספר תשע" },
		{ key: "hit_the_nail", phrase: "hit the nail on the head", he: "לפגוע בדיוק / לומר נכון", trap: "לא להכות מסמר בראש" },
		{ key: "burn_the_midnight_oil", phrase: "burn the midnight oil", he: "לעבוד עד מאוחר בלילה", trap: "לא לשרוף שמן חצות" },
		{ key: "call_it_a_day", phrase: "call it a day", he: "לסיים להיום", trap: "לא לקרוא ליום" },
		{ key: "get_cold_feet", phrase: "get cold feet", he: "להתחרט / לפחד ברגע האחרון", trap: "לא לקבל רגליים קרות ממש" },
	]);

	function findIdioms(sentence) {
		if (typeof sentence !== "string" || !sentence.trim()) return [];
		const lower = sentence.toLowerCase();
		const out = [];
		for (const item of IDIOMS) {
			const idx = lower.indexOf(item.phrase);
			if (idx === -1) continue;
			out.push({
				idiomPhrase: item.phrase,
				figurativeMeaningHebrew: item.he,
				literalTrapMeaning: item.trap,
				startIndex: idx,
				endIndex: idx + item.phrase.length,
			});
		}
		return out;
	}

	function explainIdiom(idiomKey) {
		const key = String(idiomKey || "").trim().toLowerCase().replace(/\s+/g, "_");
		const item =
			IDIOMS.find((i) => i.key === key) ||
			IDIOMS.find((i) => i.phrase === String(idiomKey || "").toLowerCase());
		if (!item) return null;
		return {
			idiomPhrase: item.phrase,
			figurativeMeaningHebrew: item.he,
			literalTrapMeaning: item.trap,
			explanation: `הביטוי "${item.phrase}" משמעו ${item.he}. זהירות: ${item.trap}.`,
			example: `Example: Students often hear "${item.phrase}" in AMIRAM passages.`,
		};
	}

	return { IDIOMS, findIdioms, explainIdiom };
});
