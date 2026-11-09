((root, factory) => {
	if (typeof module === "object" && module.exports) module.exports = factory();
	else root.ShirAmiramCognateDetector = factory();
})(typeof self !== "undefined" ? self : this, () => {
	const TRUE_COGNATES = Object.freeze({
		music: "מילה קרובה לעברית (מוזיקה) — משמעות דומה",
		system: "מילה קרובה לעברית (סיסטם/מערכת) — משמעות דומה",
		technology: "מילה קרובה לעברית (טכנולוגיה) — משמעות דומה",
		university: "מילה קרובה לעברית (אוניברסיטה) — משמעות דומה",
		problem: "מילה קרובה לעברית (פרובלמה) — משמעות דומה",
		radio: "מילה קרובה לעברית (רדיו) — משמעות דומה",
		telephone: "מילה קרובה לעברית (טלפון) — משמעות דומה",
		computer: "מילה קרובה לעברית (קומפיוטר) — משמעות דומה",
	});

	const FALSE_FRIENDS = Object.freeze({
		actually: "זהירות: actually ≠ 'כרגע' — משמעה 'למעשה / בעצם'",
		eventually: "זהירות: eventually ≠ 'באירוע' — משמעה 'בסופו של דבר'",
		sympathetic: "זהירות: sympathetic ≠ 'סימפטי' — משמעה 'מגלה אמפתיה'",
		embarrassed: "זהירות: embarrassed ≠ 'בהריון' — משמעה 'נבוך'",
		fabric: "זהירות: fabric ≠ 'מפעל' — משמעה 'בד / מבנה'",
		sensible: "זהירות: sensible ≠ 'רגיש' — משמעה 'הגיוני / שקול'",
	});

	function checkCognateStatus(word) {
		const raw = typeof word === "string" ? word : "";
		const cleaned = raw
			.toLowerCase()
			.trim()
			.replace(/[^\p{L}\p{N}'-]+/gu, "");
		if (!cleaned) {
			return {
				word: raw,
				status: "STANDARD_VOCAB",
				isCognate: false,
				isFalseFriend: false,
				note: "",
			};
		}
		if (Object.hasOwn(FALSE_FRIENDS, cleaned)) {
			return {
				word: cleaned,
				status: "FALSE_FRIEND",
				isCognate: false,
				isFalseFriend: true,
				note: FALSE_FRIENDS[cleaned],
			};
		}
		if (Object.hasOwn(TRUE_COGNATES, cleaned)) {
			return {
				word: cleaned,
				status: "TRUE_COGNATE",
				isCognate: true,
				isFalseFriend: false,
				note: TRUE_COGNATES[cleaned],
			};
		}
		return {
			word: cleaned,
			status: "STANDARD_VOCAB",
			isCognate: false,
			isFalseFriend: false,
			note: "",
		};
	}

	return { TRUE_COGNATES, FALSE_FRIENDS, checkCognateStatus };
});
