const test = require("node:test");
const assert = require("node:assert/strict");
const { isSpeechSupported, speak } = require("../src/universal_speech.js");

test("isSpeechSupported detects presence of SpeechSynthesis", () => {
	assert.strictEqual(isSpeechSupported(null), false);
	assert.strictEqual(isSpeechSupported({}), false);

	const mockWin = {
		speechSynthesis: {},
		SpeechSynthesisUtterance: function () {},
	};
	assert.strictEqual(isSpeechSupported(mockWin), true);
});

test("speak triggers speechSynthesis correctly", () => {
	let spokenUtterance = null;
	let cancelled = false;

	class MockUtterance {
		constructor(text) {
			this.text = text;
			this.lang = "";
			this.rate = 0;
			this.pitch = 0;
		}
	}

	const mockWin = {
		SpeechSynthesisUtterance: MockUtterance,
		speechSynthesis: {
			cancel() {
				cancelled = true;
			},
			speak(u) {
				spokenUtterance = u;
			},
		},
	};

	const result = speak("Hello world", { rate: 0.9, lang: "en-US" }, mockWin);
	assert.strictEqual(result, true);
	assert.strictEqual(cancelled, true);
	assert.strictEqual(spokenUtterance.text, "Hello world");
	assert.strictEqual(spokenUtterance.lang, "en-US");
	assert.strictEqual(spokenUtterance.rate, 0.9);
});

test("speak handles empty or invalid text gracefully", () => {
	const mockWin = {
		SpeechSynthesisUtterance: function () {},
		speechSynthesis: { cancel() {}, speak() {} },
	};
	assert.strictEqual(speak("", {}, mockWin), false);
	assert.strictEqual(speak(null, {}, mockWin), false);
});
