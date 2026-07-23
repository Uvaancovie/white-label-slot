/** Lightweight WebAudio beeps — no external SFX files required */

export class SoundBus {
  private ctx: AudioContext | null = null;
  enabled = true;

  private ensure(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType = "sine",
    gain = 0.04,
  ) {
    const ctx = this.ensure();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    osc.connect(g);
    g.connect(ctx.destination);
    const now = ctx.currentTime;
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.start(now);
    osc.stop(now + duration);
  }

  spin() {
    this.tone(180, 0.08, "triangle", 0.03);
  }

  stop() {
    this.tone(320, 0.05, "square", 0.025);
  }

  win(big = false) {
    this.tone(big ? 660 : 520, 0.12, "sine", 0.05);
    setTimeout(() => this.tone(big ? 880 : 660, 0.14, "sine", 0.045), 80);
  }

  freeSpins() {
    this.tone(440, 0.1, "sine", 0.05);
    setTimeout(() => this.tone(554, 0.1, "sine", 0.05), 90);
    setTimeout(() => this.tone(659, 0.16, "sine", 0.05), 180);
  }
}
