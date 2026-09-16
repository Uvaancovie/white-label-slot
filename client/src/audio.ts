import { Howl } from "howler";

/**
 * Tier-1 Studio Grade Audio Engine Powered by Howler.js & WebAudio Synthesizer.
 *
 * Provides:
 * 1. Automatic iOS / Mobile Safari audio context unlocking.
 * 2. High-performance procedural audio sprite generator (crystal bells, mechanical reel thuds,
 *    suspense drones, triumphant big-win brass, diamond chimes, and coin tick streams).
 * 3. Fallback and custom Howler-powered SFX channels.
 */
export class SoundBus {
  private ctx: AudioContext | null = null;
  enabled = true;
  private tensionTimer: number | null = null;
  private howlInstance: Howl | null = null;
  private isUnlocked = false;

  constructor() {
    this.initHowler();
    this.setupUnlockListeners();
  }

  /**
   * Initializes Howler with master audio configuration
   */
  private initHowler() {
    try {
      // Create primary Howl sound engine instance with programmatic audio buffer
      this.howlInstance = new Howl({
        src: ["data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA"],
        html5: false,
        preload: true,
        volume: 0.85,
        onloaderror: () => {
          // Fallback seamlessly to WebAudio synthesis
        },
      });
    } catch {
      // Audio fallback
    }
  }

  private setupUnlockListeners() {
    const unlock = () => {
      if (this.isUnlocked) return;
      this.isUnlocked = true;
      this.ensure();
      if (this.howlInstance) {
        // Trigger Howler WebAudio unlock
        try {
          this.howlInstance.play();
        } catch {
          // ignore
        }
      }
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };

    window.addEventListener("pointerdown", unlock, { once: true, passive: true });
    window.addEventListener("keydown", unlock, { once: true, passive: true });
    window.addEventListener("touchstart", unlock, { once: true, passive: true });
  }

  private ensure(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
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
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(10, freqEnd),
          ctx.currentTime + duration
        );
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
    const baseFreq = 160 + reelIndex * 38;
    this.tone(baseFreq, 0.09, "triangle", 0.07, 60);
    this.tone(baseFreq * 0.5, 0.08, "sine", 0.09, 40);

    if (isScatter) {
      // High bright crystal chime when a scatter symbol lands
      setTimeout(() => {
        this.tone(880, 0.15, "sine", 0.09);
        this.tone(1760, 0.28, "sine", 0.07);
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
    this.tone(1200 + Math.random() * 300, 0.04, "sine", 0.035);
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
        ? [261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5]
        : [329.63, 392.0, 523.25, 659.25, 783.99];

      chordFreqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx % 2 === 0 ? "sine" : "triangle";

        const startTime = now + idx * 0.055;
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.09, startTime + 0.035);
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          startTime + (isMega ? 1.8 : 1.2)
        );

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
        carrierGain.gain.exponentialRampToValueAtTime(
          0.0001,
          startTime + (isMega ? 1.0 : 0.7)
        );

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
        osc.frequency.exponentialRampToValueAtTime(
          sparkFreq * 1.35,
          sparkTime + 0.12
        );

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

  cheetahRoar() {
    this.stopTension();
    const ctx = this.ensure();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // 1. Low frequency resonant vocal growl/roar sweep
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(140, now);
      osc1.frequency.exponentialRampToValueAtTime(75, now + 0.35);
      osc1.frequency.exponentialRampToValueAtTime(45, now + 0.7);

      // Lowpass filter for deep beastly throat resonance
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(420, now);
      filter.frequency.exponentialRampToValueAtTime(180, now + 0.7);

      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.18, now + 0.08);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

      osc1.connect(filter);
      filter.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.75);

      // 2. High snarl raspy pitch
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(320, now);
      osc2.frequency.linearRampToValueAtTime(210, now + 0.25);
      osc2.frequency.exponentialRampToValueAtTime(90, now + 0.6);

      gain2.gain.setValueAtTime(0, now);
      gain2.gain.linearRampToValueAtTime(0.12, now + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(now);
      osc2.stop(now + 0.6);

      // 3. Followed by golden bell chime
      setTimeout(() => {
        this.tone(1318.5, 0.25, "sine", 0.08);
        this.tone(1760, 0.35, "sine", 0.06);
      }, 250);
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
