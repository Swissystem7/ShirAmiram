// Weak-words queue Empty State card: shown when the queue is empty, hidden otherwise. Run: npm test
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const A = require("../app.js");
const AN = require("../src/analytics.js");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

function fakeEl(initialClasses = []) {
	const classes = new Set(initialClasses);
	const attrs = {};
	return {
		textContent: "",
		attrs,
		classList: {
			toggle(name, force) {
				const on = force === undefined ? !classes.has(name) : Boolean(force);
				if (on) classes.add(name);
				else classes.delete(name);
				return on;
			},
			contains: (name) => classes.has(name),
		},
		setAttribute(name, value) {
			attrs[name] = String(value);
		},
	};
}

function makeEls() {
	return { empty: fakeEl(["hidden"]), list: fakeEl(), message: fakeEl() };
}

test("analytics exposes the weak-words empty message", () => {
	assert.equal(AN.getWeakWordsEmptyMessage(), "אין מילים חלשות לבחינה");
	assert.equal(
		AN.getWeakWordsQueueLength({ cards: {}, attempts: [] }, [], 6),
		0,
	);
});

test("empty queue (length 0) shows the Empty State card with the analytics message and hides the list", () => {
	const els = makeEls();
	const len = AN.getWeakWordsQueueLength({ cards: {}, attempts: [] }, [], 6);
	const res = A.applyWeakWordsEmptyState(
		els,
		len,
		AN.getWeakWordsEmptyMessage(),
	);
	assert.equal(res.isEmpty, true);
	assert.equal(els.empty.classList.contains("hidden"), false);
	assert.equal(els.empty.attrs["aria-hidden"], "false");
	assert.equal(els.list.classList.contains("hidden"), true);
	assert.equal(els.message.textContent, "אין מילים חלשות לבחינה");
});

test("non-empty queue (length > 0) hides the Empty State card and shows the word cards", () => {
	const els = makeEls();
	A.applyWeakWordsEmptyState(els, 0, AN.getWeakWordsEmptyMessage());
	const res = A.applyWeakWordsEmptyState(els, 3, AN.getWeakWordsEmptyMessage());
	assert.equal(res.isEmpty, false);
	assert.equal(els.empty.classList.contains("hidden"), true);
	assert.equal(els.empty.attrs["aria-hidden"], "true");
	assert.equal(els.list.classList.contains("hidden"), false);
});

test("toggling back to an empty queue shows the Empty State card again", () => {
	const els = makeEls();
	A.applyWeakWordsEmptyState(els, 2, "x");
	A.applyWeakWordsEmptyState(els, 0, AN.getWeakWordsEmptyMessage());
	assert.equal(els.empty.classList.contains("hidden"), false);
	assert.equal(els.list.classList.contains("hidden"), true);
});

test("missing elements do not throw", () => {
	assert.deepEqual(A.applyWeakWordsEmptyState(null, 0, "m"), {
		isEmpty: true,
		queueLength: 0,
	});
	assert.deepEqual(A.applyWeakWordsEmptyState({}, 5, "m"), {
		isEmpty: false,
		queueLength: 5,
	});
});

test("index.html has the Empty State card with a mobile-friendly (>=44px) navigation button", () => {
	const card = html.match(
		/<div id="weak-words-empty"[\s\S]*?<\/div>\s*<div id="weak-words-list"/,
	);
	assert.ok(card, "Empty State card sits before the weak-words list");
	assert.match(
		card[0],
		/class="hidden /,
		"card is hidden until the queue is known to be empty",
	);
	assert.match(card[0], /id="weak-words-empty-message"/);
	const btn = card[0].match(/<button id="weak-words-empty-cta"[^>]*>/);
	assert.ok(btn, "card has a call-to-action button");
	assert.match(btn[0], /type="button"/);
	assert.match(btn[0], /data-goto-tab="quiz"/);
	const minH = btn[0].match(/min-height:\s*(\d+)px/);
	assert.ok(minH && Number(minH[1]) >= 44, "button is at least 44px tall");
});

test("dashboard render wires the analytics helpers into the Empty State", () => {
	assert.match(html, /AN\.getWeakWordsQueueLength\(/);
	assert.match(html, /AN\.getWeakWordsEmptyMessage\(\)/);
	assert.match(html, /A\.applyWeakWordsEmptyState\(/);
	assert.match(html, /\$\('weak-words-empty-cta'\)/);
});
