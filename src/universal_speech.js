((root, factory) => {
	if (typeof module === "object" && module.exports) module.exports = factory();
	else root.ShirAmiramUniversalSpeech = factory();
})(typeof self !== "undefined" ? self : this, () => {
	function isSpeechSupported(win) {
		const targetWindow = win || (typeof window !== "undefined" ? window : null);
		return !!(
			targetWindow &&
			targetWindow.speechSynthesis &&
			typeof targetWindow.SpeechSynthesisUtterance !== "undefined"
		);
	}

	function speak(text, options = {}, win) {
		const targetWindow = win || (typeof window !== "undefined" ? window : null);
		if (!isSpeechSupported(targetWindow)) return false;

		const cleanText = typeof text === "string" ? text.trim() : "";
		if (!cleanText) return false;

		const synth = targetWindow.speechSynthesis;
		const UtteranceClass = targetWindow.SpeechSynthesisUtterance;
		const utterance = new UtteranceClass(cleanText);

		utterance.lang = options.lang || "en-US";
		utterance.rate = typeof options.rate === "number" ? options.rate : 1.0;
		utterance.pitch = typeof options.pitch === "number" ? options.pitch : 1.0;

		synth.cancel();
		synth.speak(utterance);
		return true;
	}

	return {
		isSpeechSupported,
		speak,
	};
});
