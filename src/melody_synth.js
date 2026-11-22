// ShirAmiram — the built-in tune as a soft instrument (no recording needed).
// Every note fades in and out, so notes never click or slide into each other.
// A quiet bass note starts each bar (Am, F, C, G) and a light echo rounds the
// sound. Used by the song player and by the karaoke challenge.
((root, factory) => {
	const api = factory();
	if (typeof module === "object" && module.exports) module.exports = api;
	else root.ShirAmiramMelody = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
	const TUNE = [
		220, 261.63, 293.66, 329.63, 392, 329.63, 293.66, 261.63, 220, 261.63,
		329.63, 392, 440, 392, 329.63,
	];
	const BASS = [110, 87.31, 130.81, 98];
	const NOTES_PER_BAR = 4;
	const SILENT = 0.0001;

	// Volume points [time, level] for one note: fade in, settle, fade out.
	function envelope(start, dur, peak) {
		const d = Math.max(0.12, Number(dur) || 0.5);
		const attack = Math.min(0.025, d * 0.1);
		const release = Math.min(0.2, d * 0.4);
		return [
			[start, SILENT],
			[start + attack, peak],
			[start + d - release, peak * 0.55],
			[start + d, SILENT],
		];
	}

	// Bass note (Hz) for a note position, or 0 when the bar is still going.
	function bassFor(index) {
		const i = Math.max(0, Math.floor(Number(index) || 0));
		if (i % NOTES_PER_BAR !== 0) return 0;
		return BASS[Math.floor(i / NOTES_PER_BAR) % BASS.length];
	}

	function createMelody(ctx, tune) {
		// Needs a real Web Audio context (filters and smooth volume changes).
		if (
			!ctx ||
			typeof ctx.createOscillator !== "function" ||
			typeof ctx.createBiquadFilter !== "function"
		)
			return null;
		const notes = Array.isArray(tune) && tune.length ? tune : TUNE;
		const bus = ctx.createGain();
		if (!bus.gain || typeof bus.gain.setTargetAtTime !== "function")
			return null;
		bus.gain.value = 0;
		let out = ctx.destination;
		if (typeof ctx.createDynamicsCompressor === "function") {
			const comp = ctx.createDynamicsCompressor();
			comp.connect(ctx.destination);
			out = comp;
		}
		bus.connect(out);
		if (typeof ctx.createDelay === "function") {
			const delay = ctx.createDelay(1);
			const feedback = ctx.createGain();
			const wet = ctx.createGain();
			delay.delayTime.value = 0.27;
			feedback.gain.value = 0.25;
			wet.gain.value = 0.2;
			bus.connect(delay);
			delay.connect(feedback);
			feedback.connect(delay);
			delay.connect(wet);
			wet.connect(out);
		}

		function voice(hz, dur, when, type, peak, cutoff) {
			const t = Math.max(Number(when) || 0, ctx.currentTime);
			const osc = ctx.createOscillator();
			const filter = ctx.createBiquadFilter();
			const g = ctx.createGain();
			osc.type = type;
			osc.frequency.setValueAtTime(hz, t);
			filter.type = "lowpass";
			filter.frequency.setValueAtTime(cutoff, t);
			const pts = envelope(t, dur, peak);
			g.gain.setValueAtTime(pts[0][1], pts[0][0]);
			for (let i = 1; i < pts.length; i++) {
				g.gain.exponentialRampToValueAtTime(pts[i][1], pts[i][0]);
			}
			osc.connect(filter);
			filter.connect(g);
			g.connect(bus);
			osc.start(t);
			osc.stop(pts[pts.length - 1][0] + 0.05);
			osc.onended = () => {
				try {
					osc.disconnect();
					filter.disconnect();
					g.disconnect();
				} catch {}
			};
			return osc;
		}

		return {
			// Plays note number `index` of the tune; dur is the note length in seconds.
			play(index, dur, when) {
				const i = Math.max(0, Math.floor(Number(index) || 0));
				const hz = notes[i % notes.length];
				const d = Number(dur) || 0.5;
				voice(hz, d * 0.95, when, "triangle", 0.16, 2200);
				voice(hz * 2, d * 0.6, when, "sine", 0.03, 4000);
				const bass = bassFor(i % notes.length);
				if (bass) voice(bass, d * NOTES_PER_BAR, when, "sine", 0.12, 600);
				return hz;
			},
			// 1 = full volume, 0 = silent; changes smoothly.
			setVolume(level) {
				const v = Math.max(0, Math.min(1, Number(level) || 0));
				bus.gain.setTargetAtTime(v, ctx.currentTime, 0.03);
			},
		};
	}

	return { TUNE, BASS, NOTES_PER_BAR, envelope, bassFor, createMelody };
});
