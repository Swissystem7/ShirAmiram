const test = require("node:test");
const assert = require("node:assert/strict");
const M = require("../src/melody_synth.js");
const K = require("../src/karaoke.js");
const A = require("../app.js");

// A small Web Audio stand-in that records what the melody asks for.
function fakeContext() {
	const log = { oscillators: [], gains: [], filters: [] };
	function param(owner) {
		const p = {
			value: 0,
			calls: [],
			setValueAtTime(v, t) {
				p.calls.push(["set", v, t]);
			},
			exponentialRampToValueAtTime(v, t) {
				p.calls.push(["exp", v, t]);
			},
			setTargetAtTime(v, t, c) {
				p.calls.push(["target", v, t, c]);
			},
		};
		p.owner = owner;
		return p;
	}
	const node = () => ({ connect() {}, disconnect() {} });
	const ctx = {
		currentTime: 10,
		state: "running",
		destination: node(),
		createGain() {
			const g = Object.assign(node(), {});
			g.gain = param(g);
			log.gains.push(g);
			return g;
		},
		createOscillator() {
			const o = Object.assign(node(), {
				type: "",
				started: null,
				stopped: null,
			});
			o.frequency = param(o);
			o.start = (t) => {
				o.started = t;
			};
			o.stop = (t) => {
				o.stopped = t;
			};
			log.oscillators.push(o);
			return o;
		},
		createBiquadFilter() {
			const f = Object.assign(node(), { type: "" });
			f.frequency = param(f);
			log.filters.push(f);
			return f;
		},
		createDelay() {
			const d = node();
			d.delayTime = param(d);
			return d;
		},
		createDynamicsCompressor: node,
	};
	return { ctx, log };
}

test("melody uses the same tune as the song", () => {
	assert.deepEqual(M.TUNE, A.TUNE);
});

test("every note starts and ends near silence, so it never clicks", () => {
	for (const dur of [0.4, 0.5, 0.67, 2]) {
		const pts = M.envelope(5, dur, 0.16);
		assert.ok(pts[0][1] <= 0.001, "starts silent");
		assert.ok(pts[pts.length - 1][1] <= 0.001, "ends silent");
		assert.equal(Math.max(...pts.map((p) => p[1])), 0.16);
		for (let i = 1; i < pts.length; i++) {
			assert.ok(pts[i][0] > pts[i - 1][0], "times go forward");
		}
		assert.ok(Math.abs(pts[pts.length - 1][0] - (5 + dur)) < 1e-9);
	}
});

test("a bass note starts each bar of four notes", () => {
	assert.equal(M.bassFor(0), 110);
	assert.equal(M.bassFor(1), 0);
	assert.equal(M.bassFor(4), 87.31);
	assert.equal(M.bassFor(8), 130.81);
	assert.equal(M.bassFor(12), 98);
	assert.equal(M.bassFor(16), 110);
});

test("playing a note fades it in and out and stops it afterwards", () => {
	const { ctx, log } = fakeContext();
	const melody = M.createMelody(ctx);
	const hz = melody.play(0, 0.5);
	assert.equal(hz, 220);
	// melody, a soft octave above it, and the bass note of the first bar
	assert.equal(log.oscillators.length, 3);
	const lead = log.oscillators[0];
	assert.equal(lead.type, "triangle");
	assert.deepEqual(lead.frequency.calls[0], ["set", 220, 10]);
	assert.equal(lead.started, 10);
	assert.ok(lead.stopped > 10.45 && lead.stopped < 10.6);
	assert.equal(log.oscillators[2].frequency.calls[0][1], 110);
	const env = log.gains.find(
		(g) => g.gain.calls.length && g.gain.calls[0][0] === "set",
	).gain.calls;
	assert.ok(env[0][1] <= 0.001);
	assert.ok(env.slice(1).every((c) => c[0] === "exp"));
	assert.ok(env[env.length - 1][1] <= 0.001);
	for (const f of log.filters) assert.equal(f.type, "lowpass");
});

test("notes in the middle of a bar have no bass", () => {
	const { ctx, log } = fakeContext();
	M.createMelody(ctx).play(2, 0.5);
	assert.equal(log.oscillators.length, 2);
	assert.equal(log.oscillators[0].frequency.calls[0][1], 293.66);
});

test("pause and play change the volume smoothly", () => {
	const { ctx, log } = fakeContext();
	const melody = M.createMelody(ctx);
	const bus = log.gains[0];
	assert.equal(bus.gain.value, 0);
	melody.setVolume(1);
	melody.setVolume(0);
	assert.deepEqual(
		bus.gain.calls.map((c) => [c[0], c[1]]),
		[
			["target", 1],
			["target", 0],
		],
	);
});

test("without full Web Audio support there is no melody and no error", () => {
	assert.equal(M.createMelody(null), null);
	assert.equal(M.createMelody({ createOscillator() {} }), null);
});

test("the karaoke tune plays through the soft melody voice", () => {
	const { ctx, log } = fakeContext();
	const player = K.createInstrumentalPlayer(ctx, A.TUNE, A.NOTE_SEC);
	assert.equal(player.start(), true);
	player.stop();
	assert.equal(log.oscillators[0].type, "triangle");
	assert.ok(log.oscillators[0].frequency.calls.length > 0);
	const bus = log.gains[0];
	assert.deepEqual(
		bus.gain.calls.map((c) => c[1]),
		[1, 0],
	);
});
