((root, factory) => {
	if (typeof module === "object" && module.exports) module.exports = factory();
	else root.ShirAmiramExportSummaryFormatter = factory();
})(typeof self !== "undefined" ? self : this, () => {
	function formatStudentMarkdownReport(input) {
		const o = input && typeof input === "object" ? input : {};
		const studentName =
			o.studentName != null ? String(o.studentName) : "לומד/ת";
		const cefrLevel = o.cefrLevel != null ? String(o.cefrLevel) : "A2";
		const estimatedScore =
			o.estimatedScore != null ? String(o.estimatedScore) : "85-99";
		const masteredCount = Number(o.masteredCount);
		const totalVocab = Number(o.totalVocab);
		const mastered = Number.isFinite(masteredCount) ? masteredCount : 0;
		const total =
			Number.isFinite(totalVocab) && totalVocab > 0 ? totalVocab : 300;
		const weak = Array.isArray(o.weakCategories)
			? o.weakCategories.map(String)
			: [];
		const pct = Math.round((mastered / total) * 100);
		const exempt =
			/1(3[4-9]|[4-9]\d)/.test(estimatedScore.split("-").pop() || "") ||
			estimatedScore.includes("134");
		const date = new Date().toISOString().slice(0, 10);
		const weakList = weak.length
			? weak.map((w) => `- ${w}`).join("\n")
			: "- אין תחומים חלשים שדווחו";
		return [
			`# דוח התקדמות — ${studentName}`,
			``,
			`תאריך הפקה: ${date}`,
			``,
			`## סיכום`,
			``,
			`| מדד | ערך |`,
			`| --- | --- |`,
			`| רמת CEFR | ${cefrLevel} |`,
			`| ציון אמיר״ם צפוי | ${estimatedScore} |`,
			`| פטור | ${exempt ? "כן" : "לא / לבדיקה"} |`,
			`| אוצר מילים | ${mastered}/${total} (${pct}%) |`,
			``,
			`## תחומים לחיזוק`,
			``,
			weakList,
			``,
			`## המלצה לשבוע הבא`,
			``,
			weak.length
				? `להתמקד ב־${weak.slice(0, 3).join(", ")} באמצעות שיר + חידון קצרים.`
				: `להמשיך תרגול יומי קבוע ולשמור על רצף.`,
			``,
		].join("\n");
	}
	return { formatStudentMarkdownReport };
});
// round-17 CI recover 20261109-203016
