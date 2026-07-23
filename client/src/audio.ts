/** Synthesized WebAudio Casino Sound Engine — ultra-responsive & crisp */

export class SoundBus {
  private ctx: AudioContext | null = null;
  enabled = true;
  private tensionTimer: number | null = null;

  private ensure(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this.stopTension();
    }
    return this.enabled;
  }

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType = "sine",
    gain = 0.05,
    freqEnd?: number
  ) {
    const ctx = this.ensure();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (freqEnd) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(10, freqEnd), ctx.currentTime + duration);
      }
      g.gain.setValueAtTime(gain, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio fallback
    }
  }

  spin() {
    this.stopTension();
    // Quick reel acceleration whir
    this.tone(140, 0.12, "sawtooth", 0.025, 260);
    setTimeout(() => this.tone(280, 0.08, "triangle", 0.02), 50);
  }

  stopReel(reelIndex = 0, isScatter = false) {
    // Mechanical reel stop thud with rising pitch for reels 0..4
    const baseFreq = 160 + reelIndex * 35;
    this.tone(baseFreq, 0.09, "triangle", 0.06, 60);
    this.tone(baseFreq * 0.5, 0.08, "sine", 0.08, 40);

    if (isScatter) {
      // High bright crystal chime when a scatter symbol lands
      setTimeout(() => {
        this.tone(880, 0.15, "sine", 0.08);
        this.tone(1760, 0.25, "sine", 0.06);
      }, 30);
    }
  }

  stop() {
    this.stopReel(0);
  }

  startTension() {
    this.stopTension();
    const ctx = this.ensure();
    if (!ctx) return;
    let step = 0;
    this.tensionTimer = window.setInterval(() => {
      const freq = step % 2 === 0 ? 520 : 650;
      this.tone(freq, 0.08, "sine", 0.05);
      step++;
    }, 120);
  }

  stopTension() {
    if (this.tensionTimer !== null) {
      clearInterval(this.tensionTimer);
      this.tensionTimer = null;
    }
  }

  coinTick() {
    this.tone(1200 + Math.random() * 300, 0.04, "sine", 0.03);
  }

  win(big = false, mega = false) {
    this.stopTension();
    if (big || mega) {
      this.bigWinChime(mega);
    } else {
      this.tone(523.25, 0.1, "sine", 0.05);
      setTimeout(() => this.tone(659.25, 0.14, "sine", 0.05), 70);
    }
  }

  bigWinChime(isMega = false) {
    const ctx = this.ensure();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // 1. Triumphant Brass/Triad Resonance
      const chordFreqs = isMega
        ? [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]
        : [329.63, 392.00, 523.25, 659.25, 783.99];

      chordFreqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx % 2 === 0 ? "sine" : "triangle";

        const startTime = now + idx * 0.055;
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.09, startTime + 0.035);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + (isMega ? 1.8 : 1.2));

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + (isMega ? 1.8 : 1.2));
      });

      // 2. High Metallic Crystal Chimes (Bell Timbre with Harmonic Modulation)
      const bellNotes = isMega
        ? [1046.5, 1318.5, 1567.98, 2093.0, 2637.0, 3135.96]
        : [1046.5, 1318.5, 1567.98, 2093.0];

      bellNotes.forEach((freq, i) => {
        const startTime = now + 0.1 + i * 0.065;

        // Carrier oscillator
        const carrier = ctx.createOscillator();
        const carrierGain = ctx.createGain();
        carrier.type = "sine";
        carrier.frequency.setValueAtTime(freq, startTime);

        // Modulator oscillator for sparkling metallic ring
        const modulator = ctx.createOscillator();
        const modGain = ctx.createGain();
        modulator.type = "sine";
        modulator.frequency.setValueAtTime(freq * 2.75, startTime);
        modGain.gain.setValueAtTime(freq * 0.7, startTime);
        modGain.gain.exponentialRampToValueAtTime(1, startTime + 0.35);

        modulator.connect(modGain);
        modGain.connect(carrier.frequency);

        carrierGain.gain.setValueAtTime(0.08, startTime);
        carrierGain.gain.exponentialRampToValueAtTime(0.0001, startTime + (isMega ? 1.0 : 0.7));

        carrier.connect(carrierGain);
        carrierGain.connect(ctx.destination);

        modulator.start(startTime);
        carrier.start(startTime);

        modulator.stop(startTime + (isMega ? 1.0 : 0.7));
        carrier.stop(startTime + (isMega ? 1.0 : 0.7));
      });

      // 3. Shimmering Sparkle Glissando Cascades (Syncs with particle bursts)
      const sparkleCount = isMega ? 18 : 11;
      for (let k = 0; k < sparkleCount; k++) {
        const sparkTime = now + 0.15 + k * 0.05;
        const sparkFreq = 1600 + Math.random() * 2400;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(sparkFreq, sparkTime);
        osc.frequency.exponentialRampToValueAtTime(sparkFreq * 1.35, sparkTime + 0.12);

        gain.gain.setValueAtTime(0.045, sparkTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, sparkTime + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(sparkTime);
        osc.stop(sparkTime + 0.12);
      }
    } catch {
      // Audio fallback
    }
  }

  freeSpins() {
    this.stopTension();
    const notes = [587.33, 739.99, 880, 1174.66];
    notes.forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.2, "sine", 0.08), i * 100);
    });
  }
}

