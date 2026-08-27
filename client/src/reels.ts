import { BlurFilter, Container, Graphics, Text } from "pixi.js";
import type { GameConfig, SymbolId, LineWin, SpinResult } from "@sa-slot/shared";
import { createSymbolSprite } from "./symbols.js";

/** Subtle floating diamond background animation in PixiJS */
export class DiamondBackground {
  readonly container = new Container();
  private diamonds: Array<{
    gfx: Graphics;
    x: number;
    y: number;
    size: number;
    speedY: number;
    speedX: number;
    rotSpeed: number;
    baseAlpha: number;
  }> = [];
  private width: number;
  private height: number;
  private spinning = false;
  private animFrameId: number | null = null;

  constructor(width: number, height: number, count = 36) {
    this.width = width;
    this.height = height;

    // Palette of black, crimson red, ruby, and sparkling white diamonds
    const colors = [0xff2a3b, 0xd61c24, 0xffffff, 0xff4d5e, 0xffffff, 0x8a0008, 0x1a0205];

    for (let i = 0; i < count; i++) {
      const size = 5 + Math.random() * 15;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const baseAlpha = 0.2 + Math.random() * 0.45;

      const gfx = new Graphics();
      // Draw a diamond shape centered at (0, 0)
      gfx.moveTo(0, -size);
      gfx.lineTo(size * 0.75, 0);
      gfx.lineTo(0, size);
      gfx.lineTo(-size * 0.75, 0);
      gfx.closePath();
      gfx.fill({ color, alpha: baseAlpha });

      if (color === 0xffffff || Math.random() > 0.4) {
        gfx.stroke({ width: 1.5, color: 0xffffff, alpha: 0.8 });
      } else {
        gfx.stroke({ width: 1.2, color: 0xff2a3b, alpha: 0.7 });
      }

      const x = Math.random() * width;
      const y = Math.random() * height;

      gfx.x = x;
      gfx.y = y;
      this.container.addChild(gfx);

      this.diamonds.push({
        gfx,
        x,
        y,
        size,
        speedY: 0.35 + Math.random() * 0.85,
        speedX: (Math.random() - 0.5) * 0.35,
        rotSpeed: (Math.random() - 0.5) * 0.025,
        baseAlpha,
      });
    }

    this.startAnimation();
  }

  setSpinning(isSpinning: boolean) {
    this.spinning = isSpinning;
  }

  private startAnimation() {
    let tick = 0;
    const animate = () => {
      tick += 0.05;
      const speedMult = this.spinning ? 3.4 : 1.0;

      for (const d of this.diamonds) {
        d.y -= d.speedY * speedMult;
        d.x += Math.sin(tick + d.y * 0.015) * 0.4 + d.speedX * speedMult;
        d.gfx.rotation += d.rotSpeed * speedMult;

        if (this.spinning) {
          // Intensify brightness and pulsing glow when spinning
          const pulse = Math.sin(tick * 3 + d.size) * 0.25;
          d.gfx.alpha = Math.min(0.95, d.baseAlpha + 0.3 + pulse);
          d.gfx.scale.set(1.0 + Math.sin(tick * 4) * 0.15);
        } else {
          d.gfx.alpha = d.baseAlpha + Math.sin(tick + d.size) * 0.1;
          d.gfx.scale.set(1.0);
        }

        // Wrap around top/bottom and left/right
        if (d.y < -30) {
          d.y = this.height + 25;
          d.x = Math.random() * this.width;
        }
        if (d.x < -20) d.x = this.width + 15;
        if (d.x > this.width + 20) d.x = -15;

        d.gfx.x = d.x;
        d.gfx.y = d.y;
      }

      this.animFrameId = requestAnimationFrame(animate);
    };
    animate();
  }

  destroy() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.container.destroy({ children: true });
  }
}

export interface ReelViewOptions {
  config: GameConfig;
  cellW: number;
  cellH: number;
  reducedMotion: boolean;
  turbo: boolean;
  onReelStop?: (reelIndex: number, containsScatter: boolean) => void;
  onTensionChange?: (inTension: boolean) => void;
  onShakeScreen?: () => void;
}

/**
 * 5-reel view with realistic mechanical recoil, high-speed spin illusion,
 * elastic bounce settle, and dramatic scatter suspense anticipation mode.
 */
export class ReelBoard {
  readonly container = new Container();
  private reels: Container[] = [];
  private masks: Graphics[] = [];
  private suspenseFrames: Graphics[] = [];
  private cellW: number;
  private cellH: number;
  private rows: number;
  private spinning = false;
  private reducedMotion: boolean;
  private turbo: boolean;
  private onReelStop?: (reelIndex: number, containsScatter: boolean) => void;
  private onTensionChange?: (inTension: boolean) => void;
  private onShakeScreen?: () => void;
  private stripCache: SymbolId[][];

  constructor(opts: ReelViewOptions) {
    this.cellW = opts.cellW;
    this.cellH = opts.cellH;
    this.rows = opts.config.layout.rows;
    this.reducedMotion = opts.reducedMotion;
    this.turbo = opts.turbo;
    this.onReelStop = opts.onReelStop;
    this.onTensionChange = opts.onTensionChange;
    this.onShakeScreen = opts.onShakeScreen;
    this.stripCache = opts.config.reelStrips;

    // Board background & black, red, white diamond style chassis frame
    const frame = new Graphics();
    const boardW = this.cellW * 5;
    const boardH = this.cellH * this.rows;

    // Outer Red Glow and Black Shadow
    frame.roundRect(-10, -10, boardW + 20, boardH + 20, 22);
    frame.fill({ color: 0xff2a3b, alpha: 0.35 });
    frame.roundRect(-8, -8, boardW + 16, boardH + 16, 20);
    frame.fill({ color: 0x000000, alpha: 0.85 });

    // Outer Obsidian & Ruby Red Chassis Frame
    frame.roundRect(-6, -6, boardW + 12, boardH + 12, 18);
    frame.fill({ color: 0x0a0002, alpha: 0.98 });
    frame.stroke({ width: 4.5, color: 0xd61c24, alpha: 1.0 });

    // Inner Silver Diamond Bevel line
    frame.roundRect(-2, -2, boardW + 4, boardH + 4, 14);
    frame.stroke({ width: 2, color: 0xffffff, alpha: 0.95 });

    // Pitch Black Reel Grid Backing
    frame.roundRect(0, 0, boardW, boardH, 12);
    frame.fill({ color: 0x000000, alpha: 0.98 });
    this.container.addChild(frame);

    // Reel containers, masks & suspense frames
    for (let i = 0; i < 5; i++) {
      const reel = new Container();
      reel.x = i * this.cellW;

      const mask = new Graphics()
        .rect(i * this.cellW, 0, this.cellW, boardH)
        .fill(0xffffff);
      reel.mask = mask;
      this.masks.push(mask);
      this.reels.push(reel);

      this.container.addChild(mask);
      this.container.addChild(reel);

      // Suspense frame graphic (hidden by default)
      const sFrame = new Graphics();
      sFrame.x = i * this.cellW;
      sFrame.visible = false;
      this.suspenseFrames.push(sFrame);
      this.container.addChild(sFrame);
    }

    // Full 5x3 Grid matrix separator lines (both vertical and horizontal)
    const lines = new Graphics();
    // 4 Vertical reel divider lines
    for (let i = 1; i < 5; i++) {
      lines.moveTo(i * this.cellW, 0);
      lines.lineTo(i * this.cellW, boardH);
      lines.stroke({ width: 2, color: 0xd0d8e0, alpha: 0.75 });
    }
    // 2 Horizontal row divider lines
    for (let r = 1; r < this.rows; r++) {
      lines.moveTo(0, r * this.cellH);
      lines.lineTo(boardW, r * this.cellH);
      lines.stroke({ width: 2, color: 0xd0d8e0, alpha: 0.75 });
    }
    this.container.addChild(lines);

    // Initial grid setup
    const starter: SymbolId[][] = Array.from({ length: 5 }, (_, r) =>
      Array.from(
        { length: this.rows },
        (__, row) => this.stripCache[r][row % this.stripCache[r].length],
      ),
    );
    this.setGrid(starter);
  }

  setMotionFlags(reducedMotion: boolean, turbo: boolean) {
    this.reducedMotion = reducedMotion;
    this.turbo = turbo;
  }

  get isSpinning() {
    return this.spinning;
  }

  setGrid(grid: SymbolId[][]) {
    for (let reel = 0; reel < 5; reel++) {
      this.paintReel(reel, grid[reel]);
      this.reels[reel].y = 0;
      this.suspenseFrames[reel].visible = false;
    }
  }

  private paintReel(reelIndex: number, symbols: SymbolId[]) {
    const reel = this.reels[reelIndex];
    reel.removeChildren();
    const above = 10;
    const strip = this.stripCache[reelIndex];

    // Symbols above (visible during rapid spin)
    for (let i = 0; i < above; i++) {
      const id = strip[(i * 3 + reelIndex) % strip.length];
      const spr = createSymbolSprite(id, this.cellW, this.cellH);
      spr.y = (i - above) * this.cellH;
      reel.addChild(spr);
    }
    // Main landing symbols
    for (let row = 0; row < symbols.length; row++) {
      const spr = createSymbolSprite(symbols[row], this.cellW, this.cellH);
      spr.y = row * this.cellH;
      reel.addChild(spr);
    }
    // Extra below
    for (let i = 0; i < 5; i++) {
      const id = strip[(i * 5 + 2) % strip.length];
      const spr = createSymbolSprite(id, this.cellW, this.cellH);
      spr.y = (symbols.length + i) * this.cellH;
      reel.addChild(spr);
    }
  }

  /**
   * Spin all 5 reels simultaneously at high speed, then land each reel
   * sequentially with mechanical recoil, bounce-back, and dramatic scatter suspense.
   */
  async spinTo(grid: SymbolId[][]): Promise<void> {
    if (this.spinning) return;
    this.spinning = true;

    // Reset suspense frames
    this.suspenseFrames.forEach((f) => (f.visible = false));

    if (this.reducedMotion) {
      this.setGrid(grid);
      this.spinning = false;
      return;
    }

    const boardH = this.cellH * this.rows;

    // Pre-paint all 5 reels with final target symbols & spin strip noise
    for (let r = 0; r < 5; r++) {
      this.paintReel(r, grid[r]);
    }

    // Step 1: Initial upward recoil snap for all 5 reels simultaneously
    await Promise.all(this.reels.map((reel, idx) => this.animateStartRecoil(reel, idx)));

    let scattersLandedCount = 0;
    let inTensionMode = false;

    // Step 2: Land each reel sequentially
    const stopTimes = this.calculateStopDelays(grid);

    for (let reelIdx = 0; reelIdx < 5; reelIdx++) {
      const reel = this.reels[reelIdx];

      // Check if entering Scatter Suspense mode on remaining reels
      const isSuspense =
        !this.turbo && scattersLandedCount >= 2 && reelIdx >= 2;

      if (isSuspense && !inTensionMode) {
        inTensionMode = true;
        this.onTensionChange?.(true);
      }

      if (isSuspense) {
        this.showSuspenseFrame(reelIdx);
      }

      const duration = stopTimes[reelIdx] + (isSuspense ? 1100 : 0);
      await this.animateReelPlungeAndSettle(reel, boardH, duration);

      // Hide suspense frame on stop
      this.suspenseFrames[reelIdx].visible = false;

      // Check for scatters
      const containsScatter = grid[reelIdx].includes("scatter");
      if (containsScatter) {
        scattersLandedCount++;
        if (scattersLandedCount >= 3) {
          this.onShakeScreen?.();
        }
      }

      // Small screen shudder on reel lock
      this.onShakeScreen?.();
      this.onReelStop?.(reelIdx, containsScatter);
    }

    if (inTensionMode) {
      this.onTensionChange?.(false);
    }

    this.setGrid(grid);
    this.spinning = false;
  }

  private calculateStopDelays(grid: SymbolId[][]): number[] {
    if (this.turbo) {
      return [100, 150, 200, 250, 300];
    }
    return [260, 390, 520, 650, 780];
  }

  private animateStartRecoil(reel: Container, reelIdx: number): Promise<void> {
    return new Promise((resolve) => {
      const start = performance.now();
      const delay = reelIdx * (this.turbo ? 10 : 20);
      const dur = this.turbo ? 40 : 80;

      const tick = (now: number) => {
        const elapsed = now - start;
        if (elapsed < delay) {
          requestAnimationFrame(tick);
          return;
        }
        const t = Math.min(1, (elapsed - delay) / dur);
        reel.y = -14 * Math.sin(t * Math.PI);
        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          reel.y = 0;
          resolve();
        }
      };
      requestAnimationFrame(tick);
    });
  }

  private animateReelPlungeAndSettle(
    reel: Container,
    boardH: number,
    duration: number
  ): Promise<void> {
    return new Promise((resolve) => {
      reel.y = -boardH * 2.2;
      const start = performance.now();
      const from = reel.y;
      const to = 0;

      // Apply vertical motion blur filter during high-speed spin
      const blurFilter = new BlurFilter({ strengthX: 0, strengthY: 14, quality: 2 });
      reel.filters = [blurFilter];

      const tick = (now: number) => {
        const elapsed = performance.now() - start;
        const t = Math.min(1, elapsed / duration);

        if (t < 0.8) {
          // Rapid ease-in acceleration plunge
          const progress = Math.pow(t / 0.8, 2.4);
          reel.y = from + (to - from) * progress;
          reel.scale.y = 1.0;
          reel.scale.x = 1.0;
          // Dynamic vertical blur strength matching spin velocity
          blurFilter.strengthY = 6 + progress * 10;
        } else {
          // INSTANTLY remove motion blur filter on impact/land
          if (reel.filters && reel.filters.length > 0) {
            reel.filters = [];
          }

          // Satisfying physical impact bounce with elastic overshoot and squash/stretch
          const bt = (t - 0.8) / 0.2;
          // Position overshoot (+18px down -> -6px recoil -> 0px lock)
          const bounceOffset = Math.sin(bt * Math.PI * 2) * 18 * Math.pow(1 - bt, 1.2);
          reel.y = to + bounceOffset;

          // Squash on impact (squish Y, widen X slightly), then rebound elastic
          const squish = Math.sin(bt * Math.PI) * 0.08 * (1 - bt);
          reel.scale.y = 1.0 - squish;
          reel.scale.x = 1.0 + squish * 0.5;
        }

        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          reel.y = 0;
          reel.scale.set(1.0);
          reel.filters = [];
          resolve();
        }
      };
      requestAnimationFrame(tick);
    });
  }

  private showSuspenseFrame(reelIdx: number) {
    const f = this.suspenseFrames[reelIdx];
    f.clear();
    const boardH = this.cellH * this.rows;

    // Glowing ruby red / white diamond aura box
    f.roundRect(-2, -2, this.cellW + 4, boardH + 4, 12);
    f.fill({ color: 0xd61c24, alpha: 0.25 });
    f.stroke({ width: 3.5, color: 0xffffff, alpha: 0.95 });

    f.roundRect(-5, -5, this.cellW + 10, boardH + 10, 14);
    f.stroke({ width: 2, color: 0xff2a3b, alpha: 0.8 });

    f.visible = true;
  }
}

/** Highlight winning cells with animated pulsing ruby/diamond frames */
export class WinHighlighter {
  readonly container = new Container();
  private cellW: number;
  private cellH: number;
  private animTimer: number | null = null;
  private frames: Graphics[] = [];
  private shimmers: Array<{ sheen: Graphics; x: number; y: number; w: number; h: number }> = [];

  constructor(cellW: number, cellH: number) {
    this.cellW = cellW;
    this.cellH = cellH;
  }

  clear() {
    if (this.animTimer) {
      cancelAnimationFrame(this.animTimer);
      this.animTimer = null;
    }
    this.container.removeChildren();
    this.frames = [];
    this.shimmers = [];
  }

  show(positions: Array<{ reel: number; row: number }>, color = 0xff2a3b) {
    this.clear();
    for (const p of positions) {
      const cellCont = new Container();

      const x = p.reel * this.cellW + 2;
      const y = p.row * this.cellH + 2;
      const w = this.cellW - 4;
      const h = this.cellH - 4;

      const g = new Graphics();

      // Outer ruby glow aura
      g.roundRect(x - 2, y - 2, w + 4, h + 4, 12);
      g.fill({ color: 0xd61c24, alpha: 0.35 });

      // Crimson win frame
      g.roundRect(x, y, w, h, 10);
      g.fill({ color: 0xff2a3b, alpha: 0.25 });
      g.stroke({ width: 4.5, color: 0xff2a3b, alpha: 0.98 });

      // Inner white highlight stroke
      g.roundRect(x + 3, y + 3, w - 6, h - 6, 8);
      g.stroke({ width: 1.5, color: 0xffffff, alpha: 0.9 });

      cellCont.addChild(g);
      this.frames.push(g);

      // Shimmer Mask and Sheen Ray layer
      const maskG = new Graphics();
      maskG.roundRect(x, y, w, h, 10);
      maskG.fill(0xffffff);

      const sheenG = new Graphics();
      const shimmerContainer = new Container();
      shimmerContainer.addChild(sheenG);
      shimmerContainer.mask = maskG;

      cellCont.addChild(maskG);
      cellCont.addChild(shimmerContainer);

      this.shimmers.push({ sheen: sheenG, x, y, w, h });
      this.container.addChild(cellCont);
    }

    // High energy pulse and diagonal shimmer sweep animation
    let step = 0;
    let sweepPos = -0.5;

    const pulse = () => {
      step += 0.12;
      sweepPos += 0.038;
      if (sweepPos > 1.8) sweepPos = -0.6;

      const alpha = 0.75 + 0.25 * Math.sin(step * 1.5);
      this.frames.forEach((f) => {
        f.alpha = alpha;
      });

      // Animate light sweep across each symbol cell
      this.shimmers.forEach(({ sheen, x, y, w, h }) => {
        sheen.clear();
        if (sweepPos >= -0.3 && sweepPos <= 1.5) {
          const sweepX = x + sweepPos * w;

          // Outer shimmer beam
          sheen.moveTo(sweepX, y);
          sheen.lineTo(sweepX + 30, y);
          sheen.lineTo(sweepX + 10, y + h);
          sheen.lineTo(sweepX - 20, y + h);
          sheen.closePath();
          sheen.fill({ color: 0xffe6e8, alpha: 0.45 });

          // Core bright sheen beam
          sheen.moveTo(sweepX + 8, y);
          sheen.lineTo(sweepX + 22, y);
          sheen.lineTo(sweepX + 2, y + h);
          sheen.lineTo(sweepX - 12, y + h);
          sheen.closePath();
          sheen.fill({ color: 0xffffff, alpha: 0.95 });
        }
      });

      this.animTimer = requestAnimationFrame(pulse);
    };
    pulse();
  }
}

/** Draw laser payline connectors across winning symbols */
export class PaylineOverlay {
  readonly container = new Container();
  private cellW: number;
  private cellH: number;

  constructor(cellW: number, cellH: number) {
    this.cellW = cellW;
    this.cellH = cellH;
  }

  clear() {
    this.container.removeChildren();
  }

  drawLines(lineWins: LineWin[], paylines: number[][]) {
    this.clear();
    if (!lineWins || lineWins.length === 0) return;

    // Palette of Red, White, and Obsidian accents
    const colors = [0xff2a3b, 0xffffff, 0xd61c24, 0xff4d5e, 0xffffff];

    lineWins.forEach((win, idx) => {
      const lineCoords = paylines[win.paylineIndex];
      if (!lineCoords) return;

      const g = new Graphics();
      const color = colors[idx % colors.length];

      // Draw laser glow line
      const startX = 0 * this.cellW + this.cellW / 2;
      const startY = lineCoords[0] * this.cellH + this.cellH / 2;

      g.moveTo(startX, startY);

      // Node marker at reel 0
      g.circle(startX, startY, 7);
      g.fill(color);
      g.stroke({ width: 2, color: 0xffffff });

      for (let r = 1; r < win.count; r++) {
        const row = lineCoords[r];
        const px = r * this.cellW + this.cellW / 2;
        const py = row * this.cellH + this.cellH / 2;

        g.lineTo(px, py);

        // Node marker at each reel
        g.circle(px, py, 7);
        g.fill(color);
        g.stroke({ width: 2, color: 0xffffff });
      }

      g.stroke({ width: 6, color, alpha: 0.95 });
      this.container.addChild(g);
    });
  }
}

/**
 * Screen-wide Particle Animation Overlay System for Winning Combinations
 * Renders cascading diamonds, 3D tumbling gold coins, faceted ruby gems,
 * shooting comets, glowing shockwave ripples, and celebratory glitter showers
 * directly over the existing game canvas.
 */
interface OverlayParticle {
  g: Graphics;
  type: "diamond" | "coin" | "ruby" | "confetti" | "star" | "sparkle";
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  rotSpeed: number;
  rotX?: number;
  rotXSpeed?: number;
  scale: number;
  life: number;
  maxLife: number;
  color: number;
  bounceCount: number;
  trail?: Array<{ x: number; y: number; alpha: number }>;
}

interface OverlayShockwave {
  g: Graphics;
  x: number;
  y: number;
  r: number;
  maxR: number;
  color: number;
  alpha: number;
  width: number;
}

interface OverlayComet {
  g: Graphics;
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  progress: number;
  speed: number;
  color: number;
  trailGfx: Graphics;
}

export class ScreenWinParticleOverlay {
  readonly container = new Container();
  private w: number;
  private h: number;

  private shockwaveContainer = new Container();
  private cometContainer = new Container();
  private particleContainer = new Container();
  private glowContainer = new Container();

  private particles: OverlayParticle[] = [];
  private shockwaves: OverlayShockwave[] = [];
  private comets: OverlayComet[] = [];

  private isRunning = false;
  private animId: number | null = null;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;

    this.container.addChild(this.shockwaveContainer);
    this.container.addChild(this.glowContainer);
    this.container.addChild(this.cometContainer);
    this.container.addChild(this.particleContainer);
  }

  resize(w: number, h: number) {
    this.w = w;
    this.h = h;
  }

  clear() {
    this.particles.forEach((p) => {
      this.particleContainer.removeChild(p.g);
      p.g.destroy();
    });
    this.particles = [];

    this.shockwaves.forEach((s) => {
      this.shockwaveContainer.removeChild(s.g);
      s.g.destroy();
    });
    this.shockwaves = [];

    this.comets.forEach((c) => {
      this.cometContainer.removeChild(c.g);
      this.cometContainer.removeChild(c.trailGfx);
      c.g.destroy();
      c.trailGfx.destroy();
    });
    this.comets = [];

    this.glowContainer.removeChildren();

    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    this.isRunning = false;
  }

  /**
   * Trigger the screen-overlay particle animation effect for a winning spin.
   */
  triggerWinEffect(options: {
    positions: Array<{ x: number; y: number }>;
    winTier?: "small" | "nice" | "big" | "mega";
    totalWinCents?: number;
    reducedMotion?: boolean;
  }) {
    const { positions, winTier = "small", reducedMotion = false } = options;

    const countMultiplier = reducedMotion
      ? 0.35
      : winTier === "mega"
      ? 2.8
      : winTier === "big"
      ? 2.0
      : winTier === "nice"
      ? 1.4
      : 1.0;

    const colors = [0xff2a3b, 0xffd700, 0xffffff, 0xd61c24, 0xff8000];

    // 1. Shockwaves & Comet Emitters at each winning symbol position
    positions.forEach((pos, idx) => {
      // Staggered shockwaves
      setTimeout(() => {
        const swColor = colors[idx % colors.length];
        this.addShockwave(pos.x, pos.y, swColor, winTier === "mega" ? 180 : 120);

        if (!reducedMotion) {
          // Add comet tracer shooting towards top-center of screen
          this.addComet(
            pos.x,
            pos.y,
            this.w / 2 + (Math.random() - 0.5) * (this.w * 0.4),
            Math.max(40, pos.y - 120 - Math.random() * 80),
            swColor
          );
        }
      }, idx * 60);

      // Burst localized particles from each winning cell
      const burstCount = Math.round(14 * countMultiplier);
      for (let i = 0; i < burstCount; i++) {
        this.spawnBurstParticle(pos.x, pos.y, colors[Math.floor(Math.random() * colors.length)]);
      }
    });

    // 2. Full-Screen Celebratory Shower (Raining from top or exploding outward)
    const screenShowerCount = Math.round((winTier === "mega" ? 80 : winTier === "big" ? 50 : winTier === "nice" ? 30 : 18) * (reducedMotion ? 0.4 : 1));
    for (let i = 0; i < screenShowerCount; i++) {
      const delay = Math.random() * 600;
      setTimeout(() => {
        this.spawnScreenParticle(winTier, colors[Math.floor(Math.random() * colors.length)]);
      }, delay);
    }

    // 3. Side Cannons / Fountains for Nice / Big / Mega wins
    if (winTier !== "small" && !reducedMotion) {
      const fountainCount = winTier === "mega" ? 35 : winTier === "big" ? 22 : 14;
      for (let i = 0; i < fountainCount; i++) {
        setTimeout(() => {
          // Left cannon
          this.spawnCannonParticle(0, this.h * 0.85, 1, 0xffd700);
          // Right cannon
          this.spawnCannonParticle(this.w, this.h * 0.85, -1, 0xff2a3b);
        }, Math.random() * 500);
      }
    }

    if (!this.isRunning) {
      this.isRunning = true;
      this.loop();
    }
  }

  private addShockwave(x: number, y: number, color: number, maxR = 120) {
    const g = new Graphics();
    this.shockwaveContainer.addChild(g);
    this.shockwaves.push({
      g,
      x,
      y,
      r: 6,
      maxR,
      color,
      alpha: 0.95,
      width: 3.5,
    });
  }

  private addComet(startX: number, startY: number, targetX: number, targetY: number, color: number) {
    const g = new Graphics();
    const trailGfx = new Graphics();
    this.cometContainer.addChild(trailGfx);
    this.cometContainer.addChild(g);

    g.circle(0, 0, 4.5);
    g.fill(0xffffff);
    g.stroke({ width: 2, color });

    this.comets.push({
      g,
      trailGfx,
      x: startX,
      y: startY,
      startX,
      startY,
      targetX,
      targetY,
      progress: 0,
      speed: 0.035 + Math.random() * 0.02,
      color,
    });
  }

  private spawnBurstParticle(cx: number, cy: number, color: number) {
    const g = new Graphics();
    this.particleContainer.addChild(g);

    const types: Array<OverlayParticle["type"]> = ["diamond", "coin", "ruby", "star", "sparkle"];
    const type = types[Math.floor(Math.random() * types.length)];

    const angle = Math.random() * Math.PI * 2;
    const speed = 3.5 + Math.random() * 7.5;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed - (3 + Math.random() * 3);

    const maxLife = 65 + Math.random() * 45;

    this.particles.push({
      g,
      type,
      x: cx,
      y: cy,
      vx,
      vy,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.3,
      rotX: Math.random() * Math.PI * 2,
      rotXSpeed: (Math.random() - 0.5) * 0.25,
      scale: 0.75 + Math.random() * 0.5,
      life: maxLife,
      maxLife,
      color,
      bounceCount: 0,
    });
  }

  private spawnScreenParticle(winTier: string, color: number) {
    const g = new Graphics();
    this.particleContainer.addChild(g);

    const types: Array<OverlayParticle["type"]> = ["diamond", "coin", "confetti", "star", "sparkle", "ruby"];
    const type = types[Math.floor(Math.random() * types.length)];

    const x = Math.random() * this.w;
    const y = -20 - Math.random() * 40;
    const vx = (Math.random() - 0.5) * 2.8;
    const vy = 2.0 + Math.random() * 4.5;
    const maxLife = 90 + Math.random() * 60;

    this.particles.push({
      g,
      type,
      x,
      y,
      vx,
      vy,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.2,
      rotX: Math.random() * Math.PI * 2,
      rotXSpeed: (Math.random() - 0.5) * 0.2,
      scale: 0.8 + Math.random() * 0.6,
      life: maxLife,
      maxLife,
      color,
      bounceCount: 0,
    });
  }

  private spawnCannonParticle(x: number, y: number, dir: 1 | -1, color: number) {
    const g = new Graphics();
    this.particleContainer.addChild(g);

    const types: Array<OverlayParticle["type"]> = ["coin", "diamond", "confetti", "star"];
    const type = types[Math.floor(Math.random() * types.length)];

    const angle = (dir === 1 ? -Math.PI * 0.35 : -Math.PI * 0.65) + (Math.random() - 0.5) * 0.45;
    const speed = 7.5 + Math.random() * 9.0;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const maxLife = 85 + Math.random() * 50;

    this.particles.push({
      g,
      type,
      x,
      y,
      vx,
      vy,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.3,
      rotX: Math.random() * Math.PI * 2,
      rotXSpeed: (Math.random() - 0.5) * 0.2,
      scale: 0.85 + Math.random() * 0.6,
      life: maxLife,
      maxLife,
      color,
      bounceCount: 0,
    });
  }

  private loop = () => {
    // 1. Update Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.r += 4.5;
      s.alpha = Math.max(0, 0.95 * (1 - s.r / s.maxR));

      s.g.clear();
      s.g.circle(s.x, s.y, s.r);
      s.g.stroke({
        width: Math.max(1, s.width * (s.alpha / 0.95)),
        color: s.color,
        alpha: s.alpha,
      });

      // Secondary inner glow ring
      s.g.circle(s.x, s.y, Math.max(1, s.r * 0.85));
      s.g.stroke({
        width: 1.5,
        color: 0xffffff,
        alpha: s.alpha * 0.75,
      });

      if (s.r >= s.maxR || s.alpha <= 0) {
        this.shockwaveContainer.removeChild(s.g);
        s.g.destroy();
        this.shockwaves.splice(i, 1);
      }
    }

    // 2. Update Comets
    for (let i = this.comets.length - 1; i >= 0; i--) {
      const c = this.comets[i];
      c.progress += c.speed;

      const t = Math.min(1, c.progress);
      const easeT = 1 - Math.pow(1 - t, 2.5);

      const curX = c.startX + (c.targetX - c.startX) * easeT;
      // Arc path
      const arcHeight = 40 * Math.sin(t * Math.PI);
      const curY = c.startY + (c.targetY - c.startY) * easeT - arcHeight;

      c.g.x = curX;
      c.g.y = curY;
      c.g.alpha = 1 - t * 0.8;

      // Draw luminous comet trail
      c.trailGfx.clear();
      c.trailGfx.moveTo(c.startX, c.startY);
      c.trailGfx.quadraticCurveTo(
        (c.startX + curX) / 2,
        (c.startY + curY) / 2 - arcHeight,
        curX,
        curY
      );
      c.trailGfx.stroke({
        width: Math.max(1, 3.5 * (1 - t)),
        color: c.color,
        alpha: Math.max(0, 0.85 * (1 - t)),
      });

      if (t >= 1) {
        // Spawn small spark burst at comet apex
        for (let b = 0; b < 6; b++) {
          this.spawnBurstParticle(c.targetX, c.targetY, c.color);
        }
        this.cometContainer.removeChild(c.g);
        this.cometContainer.removeChild(c.trailGfx);
        c.g.destroy();
        c.trailGfx.destroy();
        this.comets.splice(i, 1);
      }
    }

    // 3. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vy += 0.24; // smooth gravity
      p.vx *= 0.985; // air friction
      p.x += p.vx;
      p.y += p.vy;

      p.rot += p.rotSpeed;
      if (p.rotX !== undefined && p.rotXSpeed !== undefined) {
        p.rotX += p.rotXSpeed;
      }

      p.life -= 1;
      const alpha = Math.max(0, Math.min(1, p.life / 20));

      // Floor bounce near bottom of canvas
      if (p.y >= this.h - 14 && p.bounceCount < 2) {
        p.vy = -p.vy * 0.42;
        p.vx *= 0.65;
        p.y = this.h - 14;
        p.bounceCount++;
      }

      p.g.x = p.x;
      p.g.y = p.y;
      p.g.rotation = p.rot;
      p.g.alpha = alpha;

      const scaleX = p.rotX !== undefined ? Math.abs(Math.cos(p.rotX)) : 1;
      p.g.scale.set(p.scale * scaleX, p.scale);

      // Render custom procedural particle shapes
      p.g.clear();

      if (p.type === "diamond") {
        // Sparkling 4-point faceted diamond
        const s = 7;
        p.g.moveTo(0, -s);
        p.g.lineTo(s * 0.75, 0);
        p.g.lineTo(0, s);
        p.g.lineTo(-s * 0.75, 0);
        p.g.closePath();
        p.g.fill(0xffffff);
        p.g.stroke({ width: 1.5, color: p.color });

        // Diamond facet highlights
        p.g.moveTo(0, -s);
        p.g.lineTo(0, s);
        p.g.stroke({ width: 1, color: 0xffffff, alpha: 0.8 });
      } else if (p.type === "coin") {
        // 3D Gold / Platinum Coin
        const r = 7;
        p.g.ellipse(0, 0, r, r);
        p.g.fill(p.color === 0xff2a3b ? 0xd61c24 : 0xffd700);
        p.g.stroke({ width: 1.5, color: 0xffffff });

        // Coin inner ring bevel
        p.g.ellipse(0, 0, r * 0.6, r * 0.6);
        p.g.stroke({ width: 1, color: 0xffa000, alpha: 0.85 });
      } else if (p.type === "ruby") {
        // Faceted 6-sided Ruby Jewel
        const s = 6;
        p.g.moveTo(0, -s);
        p.g.lineTo(s * 0.9, -s * 0.3);
        p.g.lineTo(s * 0.9, s * 0.4);
        p.g.lineTo(0, s);
        p.g.lineTo(-s * 0.9, s * 0.4);
        p.g.lineTo(-s * 0.9, -s * 0.3);
        p.g.closePath();
        p.g.fill(0xd61c24);
        p.g.stroke({ width: 1.2, color: 0xffffff });
      } else if (p.type === "star") {
        // 4-point Diamond Star flare
        p.g.star(0, 0, 4, 8, 3.5);
        p.g.fill(p.color);
        p.g.stroke({ width: 1, color: 0xffffff });
      } else if (p.type === "sparkle") {
        // Delicate cross glimmer
        p.g.moveTo(0, -5);
        p.g.lineTo(0, 5);
        p.g.moveTo(-5, 0);
        p.g.lineTo(5, 0);
        p.g.stroke({ width: 2, color: 0xffffff });
        p.g.circle(0, 0, 2);
        p.g.fill(p.color);
      } else {
        // Ribbon confetti strip
        p.g.rect(-4.5, -2.5, 9, 5);
        p.g.fill(p.color);
      }

      if (p.life <= 0 || p.y > this.h + 50) {
        this.particleContainer.removeChild(p.g);
        p.g.destroy();
        this.particles.splice(i, 1);
      }
    }

    const hasActiveEffects =
      this.particles.length > 0 || this.shockwaves.length > 0 || this.comets.length > 0;

    if (hasActiveEffects) {
      this.animId = requestAnimationFrame(this.loop);
    } else {
      this.isRunning = false;
      this.animId = null;
    }
  };
}


/**
 * Multi-Layer Visual Animation Effect for Big Win & Mega Win on Canvas
 * Features rotating sunburst light rays, 3D tumbling gold coins & ruby shower,
 * electric lightning tendrils, milestone shockwave bursts, firework sparklers,
 * perimeter neon aura, and interactive tap-to-collect.
 */
interface BigWinParticle {
  g: Graphics;
  type: "coin" | "ruby" | "diamond" | "star" | "confetti";
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  rotSpeed: number;
  scale: number;
  life: number;
  bounceCount: number;
  color: number;
}

interface FireworkSpark {
  g: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: number;
}

interface ShockwaveRing {
  g: Graphics;
  x: number;
  y: number;
  r: number;
  maxR: number;
  alpha: number;
  color: number;
}

export class BigWinModal {
  readonly container = new Container();
  private w: number;
  private h: number;

  private bg = new Graphics();
  private borderGlow = new Graphics();
  private raysContainer = new Container();
  private raysGfx = new Graphics();

  private badgeContainer = new Container();
  private badgeBg = new Graphics();
  private lightningGfx = new Graphics();

  private titleText: Text;
  private winText: Text;
  private tapHintText: Text;

  private particleContainer = new Container();
  private particles: BigWinParticle[] = [];

  private fireworkContainer = new Container();
  private fireworks: FireworkSpark[] = [];

  private shockwaveContainer = new Container();
  private shockwaves: ShockwaveRing[] = [];

  private animTimer: number | null = null;
  private isFastForwarded = false;
  private isMegaWinMode = false;
  private targetCents = 0;
  private currentCents = 0;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;

    this.container.eventMode = "static";
    this.container.cursor = "pointer";
    this.container.on("pointerdown", () => {
      this.isFastForwarded = true;
    });

    // 1. Dark Vignette Backdrop
    this.container.addChild(this.bg);

    // 2. Rotating Sunburst Light Rays
    this.raysContainer.x = w / 2;
    this.raysContainer.y = h / 2 - 20;
    this.raysContainer.addChild(this.raysGfx);
    this.container.addChild(this.raysContainer);

    // 3. Shockwaves Layer
    this.container.addChild(this.shockwaveContainer);

    // 4. Fireworks Layer
    this.container.addChild(this.fireworkContainer);

    // 5. Screen Perimeter Neon Glow Border
    this.container.addChild(this.borderGlow);

    // 6. 3D Badge Shield Container
    this.badgeContainer.x = w / 2;
    this.badgeContainer.y = h / 2 - 20;

    this.badgeContainer.addChild(this.badgeBg);
    this.badgeContainer.addChild(this.lightningGfx);

    // Title Text
    this.titleText = new Text({
      text: "BIG WIN!",
      style: {
        fontFamily: "Rajdhani, Inter, Arial, sans-serif",
        fontSize: 44,
        fontWeight: "700",
        fill: "#ffd700",
        stroke: { color: 0x000000, width: 7 },
        dropShadow: { alpha: 0.9, blur: 8, color: 0xff4d00, distance: 4, angle: Math.PI / 4 },
        align: "center",
      },
    });
    this.titleText.anchor.set(0.5);
    this.titleText.y = -30;
    this.badgeContainer.addChild(this.titleText);

    // Win Counter Text
    this.winText = new Text({
      text: "R0.00",
      style: {
        fontFamily: "Rajdhani, Inter, Arial, sans-serif",
        fontSize: 38,
        fontWeight: "700",
        fill: "#ffffff",
        stroke: { color: 0x000000, width: 5 },
        dropShadow: { alpha: 0.8, blur: 6, color: 0x000000, distance: 3, angle: Math.PI / 4 },
        align: "center",
      },
    });
    this.winText.anchor.set(0.5);
    this.winText.y = 28;
    this.badgeContainer.addChild(this.winText);

    this.container.addChild(this.badgeContainer);

    // 7. Particle Shower (Falling & Bouncing Coins & Gems)
    this.container.addChild(this.particleContainer);

    // 8. Tap Hint
    this.tapHintText = new Text({
      text: "TAP TO COLLECT",
      style: {
        fontFamily: "Rajdhani, Inter, Arial, sans-serif",
        fontSize: 13,
        fontWeight: "700",
        fill: "#ffd700",
        stroke: { color: 0x000000, width: 3 },
        letterSpacing: 2,
        align: "center",
      },
    });
    this.tapHintText.anchor.set(0.5);
    this.tapHintText.x = w / 2;
    this.tapHintText.y = h - 28;
    this.container.addChild(this.tapHintText);

    this.container.visible = false;
  }

  resize(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.raysContainer.x = w / 2;
    this.raysContainer.y = h / 2 - 20;
    this.badgeContainer.x = w / 2;
    this.badgeContainer.y = h / 2 - 20;
    this.tapHintText.x = w / 2;
    this.tapHintText.y = h - 28;
  }

  show(
    title: string,
    winCents: number,
    onCoinTick?: () => void,
    isMegaOverride?: boolean
  ): Promise<void> {
    return new Promise((resolve) => {
      this.targetCents = winCents;
      this.currentCents = 0;
      this.isFastForwarded = false;
      this.isMegaWinMode = isMegaOverride ?? title.toUpperCase().includes("MEGA");

      if (this.animTimer) {
        cancelAnimationFrame(this.animTimer);
        this.animTimer = null;
      }

      // Cleanup prior objects
      this.particles.forEach((p) => {
        this.particleContainer.removeChild(p.g);
        p.g.destroy();
      });
      this.particles = [];

      this.fireworks.forEach((f) => {
        this.fireworkContainer.removeChild(f.g);
        f.g.destroy();
      });
      this.fireworks = [];

      this.shockwaves.forEach((s) => {
        this.shockwaveContainer.removeChild(s.g);
        s.g.destroy();
      });
      this.shockwaves = [];

      this.renderStaticBackdrop(this.isMegaWinMode);

      // Title Styling
      this.titleText.text = title;
      if (this.isMegaWinMode) {
        this.titleText.style.fill = "#ff2a3b";
        this.titleText.style.dropShadow = { alpha: 0.95, blur: 12, color: 0xff002b, distance: 4, angle: Math.PI / 4 };
      } else {
        this.titleText.style.fill = "#ffd700";
        this.titleText.style.dropShadow = { alpha: 0.9, blur: 8, color: 0xff4d00, distance: 4, angle: Math.PI / 4 };
      }

      this.winText.text = winCents > 0 ? "R0.00" : "";
      this.badgeContainer.scale.set(0.2);
      this.container.alpha = 0;
      this.container.visible = true;

      // Explosive initial radial burst
      const burstCount = this.isMegaWinMode ? 65 : 40;
      for (let i = 0; i < burstCount; i++) {
        this.spawnParticle(this.w / 2, this.h / 2 - 20, true);
      }
      this.triggerShockwave(this.w / 2, this.h / 2 - 20, this.isMegaWinMode ? 0xff2a3b : 0xffd700);

      let time = 0;
      let alpha = 0;
      let badgeScale = 0.2;
      let lastMilestone = 0;
      let frameCount = 0;
      let lastTickTime = performance.now();

      const durationMs = this.isMegaWinMode ? 3600 : 2600;
      const startTime = performance.now();

      const tick = (now: number) => {
        frameCount++;
        const elapsed = now - startTime;
        time += 0.05;

        // 1. Fade in & badge spring pop
        if (alpha < 1) {
          alpha += 0.08;
          this.container.alpha = Math.min(1, alpha);
        }
        if (badgeScale < 1.0) {
          badgeScale += (1.05 - badgeScale) * 0.22;
          this.badgeContainer.scale.set(badgeScale);
        } else {
          // Heartbeat pulse while counting
          const pulse = 1.0 + 0.04 * Math.sin(time * 5);
          this.badgeContainer.scale.set(pulse);
        }

        // Tap hint pulse
        this.tapHintText.alpha = 0.5 + 0.4 * Math.sin(time * 6);

        // 2. Rotate light rays
        this.raysContainer.rotation += this.isMegaWinMode ? 0.018 : 0.012;
        this.raysGfx.alpha = 0.6 + 0.3 * Math.sin(time * 3);

        // 3. Screen edge neon border pulse
        this.borderGlow.clear();
        const glowAlpha = 0.4 + 0.35 * Math.sin(time * 6);
        this.borderGlow.roundRect(4, 4, this.w - 8, this.h - 8, 16);
        this.borderGlow.stroke({
          width: this.isMegaWinMode ? 6 : 4,
          color: this.isMegaWinMode ? 0xff2a3b : 0xffd700,
          alpha: glowAlpha,
        });

        // 4. Update Win Counter
        if (winCents > 0) {
          if (this.isFastForwarded) {
            this.currentCents = winCents;
          } else {
            const progress = Math.min(1, elapsed / durationMs);
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            this.currentCents = Math.round(winCents * easeProgress);
          }

          this.winText.text = `R${(this.currentCents / 100).toFixed(2)}`;

          if (now - lastTickTime > 85 && this.currentCents < winCents) {
            lastTickTime = now;
            onCoinTick?.();
          }

          // Milestone shockwave & firework pops
          const milestone = Math.floor((this.currentCents / winCents) * 4);
          if (milestone > lastMilestone) {
            lastMilestone = milestone;
            this.triggerShockwave(
              this.w / 2,
              this.h / 2 - 20,
              this.isMegaWinMode ? 0xffffff : 0xffd700
            );
            this.spawnFirework(
              this.w / 2 + (Math.random() - 0.5) * 160,
              this.h / 2 - 20 + (Math.random() - 0.5) * 80,
              16
            );
            this.badgeContainer.scale.set(1.18);
          }
        }

        // 5. Electric arcs for Mega Win
        if (frameCount % 3 === 0) {
          this.updateLightning();
        }

        // 6. Spawn top shower particles
        if (frameCount % 4 === 0 && (this.currentCents < winCents || Math.random() > 0.4)) {
          this.spawnParticle(this.w / 2, this.h / 2 - 20, false);
        }

        // 7. Random fireworks bursts
        if (frameCount % 18 === 0 && Math.random() > 0.3) {
          this.spawnFirework(
            this.w / 2 + (Math.random() - 0.5) * (this.w * 0.7),
            this.h / 2 + (Math.random() - 0.5) * 160,
            14
          );
        }

        // 8. Update Particles, Fireworks, Shockwaves
        this.updateParticles();
        this.updateFireworks();
        this.updateShockwaves();

        // Completion check
        const isCountDone = winCents === 0 || this.currentCents >= winCents;
        const isMinTimePassed = elapsed >= (this.isFastForwarded ? 250 : durationMs);

        if (isCountDone && isMinTimePassed) {
          setTimeout(() => {
            this.fadeOut().then(resolve);
          }, this.isFastForwarded ? 300 : 800);
        } else {
          this.animTimer = requestAnimationFrame(tick);
        }
      };

      this.animTimer = requestAnimationFrame(tick);
    });
  }

  private renderStaticBackdrop(isMega: boolean) {
    this.bg.clear();
    this.bg.rect(0, 0, this.w, this.h);
    this.bg.fill({ color: 0x020003, alpha: 0.82 });

    this.bg.circle(this.w / 2, this.h / 2 - 20, Math.max(this.w, this.h) * 0.45);
    this.bg.fill({ color: isMega ? 0xd61c24 : 0xffa000, alpha: 0.28 });

    // Light rays
    this.raysGfx.clear();
    const rayCount = 20;
    const rayLen = Math.max(this.w, this.h) * 1.3;

    for (let i = 0; i < rayCount; i++) {
      const a1 = (i / rayCount) * Math.PI * 2;
      const a2 = ((i + 0.55) / rayCount) * Math.PI * 2;
      this.raysGfx.moveTo(0, 0);
      this.raysGfx.lineTo(Math.cos(a1) * rayLen, Math.sin(a1) * rayLen);
      this.raysGfx.lineTo(Math.cos(a2) * rayLen, Math.sin(a2) * rayLen);
      this.raysGfx.closePath();

      if (i % 2 === 0) {
        this.raysGfx.fill({ color: isMega ? 0xff2a3b : 0xffd700, alpha: 0.28 });
      } else {
        this.raysGfx.fill({ color: isMega ? 0xffffff : 0xff8000, alpha: 0.14 });
      }
    }

    // Metallic Shield Badge
    const bw = Math.min(this.w * 0.84, 340);
    const bh = 150;

    this.badgeBg.clear();
    this.badgeBg.roundRect(-bw / 2 - 6, -bh / 2 - 6, bw + 12, bh + 12, 22);
    this.badgeBg.fill({ color: 0x000000, alpha: 0.65 });

    this.badgeBg.roundRect(-bw / 2, -bh / 2, bw, bh, 18);
    this.badgeBg.fill({ color: isMega ? 0x8a0008 : 0x2e1a00, alpha: 0.98 });
    this.badgeBg.stroke({ width: 4.5, color: isMega ? 0xff2a3b : 0xffd700, alpha: 1.0 });

    this.badgeBg.roundRect(-bw / 2 + 5, -bh / 2 + 5, bw - 10, bh - 10, 14);
    this.badgeBg.stroke({ width: 2, color: 0xffffff, alpha: 0.9 });

    this.badgeBg.roundRect(-bw / 2 + 8, -bh / 2 + 8, bw - 16, bh - 16, 12);
    this.badgeBg.fill({ color: 0x080102, alpha: 0.96 });

    const cornerX = bw / 2 - 16;
    const cornerY = bh / 2 - 16;
    const offsets = [
      [-cornerX, -cornerY],
      [cornerX, -cornerY],
      [-cornerX, cornerY],
      [cornerX, cornerY],
    ];
    for (const [ox, oy] of offsets) {
      this.badgeBg.star(ox, oy, 4, 6, 3);
      this.badgeBg.fill(isMega ? 0xffffff : 0xffd700);
    }
  }

  private updateLightning() {
    this.lightningGfx.clear();
    if (!this.isMegaWinMode) return;

    const bw = Math.min(this.w * 0.84, 340);
    const bh = 150;
    const halfW = bw / 2 + 4;
    const halfH = bh / 2 + 4;

    const boltCount = Math.floor(Math.random() * 3) + 2;
    for (let b = 0; b < boltCount; b++) {
      const side = Math.floor(Math.random() * 4);
      let x1 = 0, y1 = 0, x2 = 0, y2 = 0;

      if (side === 0) {
        x1 = -halfW + Math.random() * bw;
        y1 = -halfH;
        x2 = x1 + (Math.random() - 0.5) * 60;
        y2 = y1;
      } else if (side === 1) {
        x1 = halfW;
        y1 = -halfH + Math.random() * bh;
        x2 = x1;
        y2 = y1 + (Math.random() - 0.5) * 60;
      } else if (side === 2) {
        x1 = -halfW + Math.random() * bw;
        y1 = halfH;
        x2 = x1 + (Math.random() - 0.5) * 60;
        y2 = y1;
      } else {
        x1 = -halfW;
        y1 = -halfH + Math.random() * bh;
        x2 = x1;
        y2 = y1 + (Math.random() - 0.5) * 60;
      }

      const segments = 4;
      this.lightningGfx.moveTo(x1, y1);
      for (let s = 1; s <= segments; s++) {
        const t = s / segments;
        const nextX = x1 + (x2 - x1) * t + (Math.random() - 0.5) * 16;
        const nextY = y1 + (y2 - y1) * t + (Math.random() - 0.5) * 16;
        this.lightningGfx.lineTo(nextX, nextY);
      }

      const colors = [0xffffff, 0xff2a3b, 0xffd700];
      const c = colors[Math.floor(Math.random() * colors.length)];
      this.lightningGfx.stroke({ width: 2.5, color: c, alpha: 0.9 });
    }
  }

  private spawnParticle(cx: number, cy: number, isInitialExplosion = false) {
    const g = new Graphics();
    const types: Array<BigWinParticle["type"]> = ["coin", "ruby", "diamond", "star", "confetti"];
    const type = types[Math.floor(Math.random() * types.length)];

    let color = 0xff2a3b;
    if (type === "coin" || type === "star") color = 0xffd700;
    else if (type === "diamond") color = Math.random() > 0.5 ? 0xffffff : 0xff2a3b;
    else if (type === "confetti") {
      const cList = [0xffd700, 0xff2a3b, 0xffffff, 0xff8000, 0xd61c24];
      color = cList[Math.floor(Math.random() * cList.length)];
    }

    let x = cx;
    let y = cy;
    let vx = 0;
    let vy = 0;

    if (isInitialExplosion) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 5 + Math.random() * 11;
      vx = Math.cos(angle) * speed;
      vy = Math.sin(angle) * speed - 4;
    } else {
      x = Math.random() * this.w;
      y = -15;
      vx = (Math.random() - 0.5) * 3;
      vy = 2 + Math.random() * 5;
    }

    const p: BigWinParticle = {
      g,
      type,
      x,
      y,
      vx,
      vy,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.25,
      scale: 0.8 + Math.random() * 0.6,
      life: 1.0,
      bounceCount: 0,
      color,
    };

    g.x = x;
    g.y = y;
    g.rotation = p.rot;
    this.particleContainer.addChild(g);
    this.particles.push(p);
  }

  private spawnFirework(cx: number, cy: number, count = 18) {
    const colors = [0xffd700, 0xffffff, 0xff2a3b, 0xff8000];
    for (let i = 0; i < count; i++) {
      const g = new Graphics();
      const color = colors[Math.floor(Math.random() * colors.length)];
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 8;

      g.circle(0, 0, 2 + Math.random() * 2);
      g.fill(color);
      g.x = cx;
      g.y = cy;

      this.fireworkContainer.addChild(g);
      this.fireworks.push({
        g,
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1.0,
        color,
      });
    }
  }

  private triggerShockwave(cx: number, cy: number, color = 0xffd700) {
    const g = new Graphics();
    this.shockwaveContainer.addChild(g);
    this.shockwaves.push({
      g,
      x: cx,
      y: cy,
      r: 10,
      maxR: 180 + Math.random() * 60,
      alpha: 0.95,
      color,
    });
  }

  private updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vy += 0.32;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.rotSpeed;

      if (p.y >= this.h - 18 && p.bounceCount < 2) {
        p.vy = -p.vy * (0.42 + Math.random() * 0.2);
        p.vx *= 0.7;
        p.y = this.h - 18;
        p.bounceCount++;
      }

      p.life -= 0.012;
      p.g.x = p.x;
      p.g.y = p.y;
      p.g.rotation = p.rot;
      p.g.alpha = Math.max(0, Math.min(1, p.life * 2));

      p.g.clear();
      if (p.type === "coin") {
        p.g.ellipse(0, 0, Math.max(1, 8 * Math.abs(Math.cos(p.rot))), 8);
        p.g.fill(0xffd700);
        p.g.stroke({ width: 1.5, color: 0xff8000 });
      } else if (p.type === "ruby") {
        p.g.moveTo(0, -8);
        p.g.lineTo(6, -3);
        p.g.lineTo(6, 4);
        p.g.lineTo(0, 8);
        p.g.lineTo(-6, 4);
        p.g.lineTo(-6, -3);
        p.g.closePath();
        p.g.fill(0xd61c24);
        p.g.stroke({ width: 1.2, color: 0xffffff });
      } else if (p.type === "diamond") {
        p.g.moveTo(0, -9);
        p.g.lineTo(7, 0);
        p.g.lineTo(0, 9);
        p.g.lineTo(-7, 0);
        p.g.closePath();
        p.g.fill(0xffffff);
        p.g.stroke({ width: 1.5, color: p.color });
      } else if (p.type === "star") {
        p.g.star(0, 0, 5, 8, 4);
        p.g.fill(0xffd700);
        p.g.stroke({ width: 1, color: 0xffffff });
      } else {
        p.g.rect(-5, -2.5, 10, 5);
        p.g.fill(p.color);
      }

      if (p.life <= 0 || p.y > this.h + 50) {
        this.particleContainer.removeChild(p.g);
        p.g.destroy();
        this.particles.splice(i, 1);
      }
    }
  }

  private updateFireworks() {
    for (let i = this.fireworks.length - 1; i >= 0; i--) {
      const f = this.fireworks[i];
      f.vy += 0.12;
      f.x += f.vx;
      f.y += f.vy;
      f.alpha -= 0.025;

      f.g.x = f.x;
      f.g.y = f.y;
      f.g.alpha = Math.max(0, f.alpha);

      if (f.alpha <= 0) {
        this.fireworkContainer.removeChild(f.g);
        f.g.destroy();
        this.fireworks.splice(i, 1);
      }
    }
  }

  private updateShockwaves() {
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.r += 7;
      s.alpha -= 0.03;

      s.g.clear();
      s.g.circle(s.x, s.y, s.r);
      s.g.stroke({
        width: Math.max(1, 6 * (s.alpha / 0.95)),
        color: s.color,
        alpha: Math.max(0, s.alpha),
      });

      if (s.alpha <= 0 || s.r >= s.maxR) {
        this.shockwaveContainer.removeChild(s.g);
        s.g.destroy();
        this.shockwaves.splice(i, 1);
      }
    }
  }

  private fadeOut(): Promise<void> {
    return new Promise((resolve) => {
      let alpha = 1;
      const tick = () => {
        alpha -= 0.08;
        this.container.alpha = Math.max(0, alpha);
        if (alpha > 0) {
          requestAnimationFrame(tick);
        } else {
          this.container.visible = false;
          resolve();
        }
      };
      tick();
    });
  }
}

/** Floating "+R10.00" animated popups on winning reel coordinates */
export class FloatingWinManager {
  readonly container = new Container();

  clear() {
    this.container.removeChildren();
  }

  spawnPopup(x: number, y: number, textString: string) {
    const pop = new Container();
    pop.x = x;
    pop.y = y;

    const bg = new Graphics();
    bg.roundRect(-45, -16, 90, 32, 16);
    bg.fill({ color: 0x061e12, alpha: 0.9 });
    bg.stroke({ width: 2, color: 0xffd700, alpha: 0.95 });
    pop.addChild(bg);

    const txt = new Text({
      text: textString,
      style: {
        fontFamily: "Rajdhani, Inter, Arial, sans-serif",
        fontSize: 18,
        fontWeight: "700",
        fill: "#ffd700",
        stroke: { color: 0x000000, width: 3 },
        align: "center",
      },
    });
    txt.anchor.set(0.5);
    pop.addChild(txt);

    this.container.addChild(pop);

    let elapsed = 0;
    const startY = y;
    const anim = () => {
      elapsed += 0.04;
      pop.y = startY - Math.sin(elapsed * Math.PI) * 28;
      pop.scale.set(1 + Math.sin(elapsed * Math.PI * 0.5) * 0.2);
      pop.alpha = Math.max(0, 1 - elapsed * 0.8);

      if (elapsed < 1.25) {
        requestAnimationFrame(anim);
      } else {
        this.container.removeChild(pop);
        pop.destroy();
      }
    };
    anim();
  }
}

/** Screen flash and explosion shockwave overlay */
export class FlashImpactOverlay {
  readonly container = new Container();
  private flash = new Graphics();

  constructor(w: number, h: number) {
    this.flash.rect(0, 0, w, h);
    this.flash.fill(0xffffff);
    this.flash.alpha = 0;
    this.container.addChild(this.flash);
  }

  resize(w: number, h: number) {
    this.flash.clear();
    this.flash.rect(0, 0, w, h);
    this.flash.fill(0xffffff);
    this.flash.alpha = 0;
  }

  triggerFlash(color = 0xffffff, duration = 250) {
    this.flash.clear();
    this.flash.rect(-100, -100, 2000, 2000);
    this.flash.fill(color);
    this.flash.alpha = 0.4;

    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = elapsed / duration;
      this.flash.alpha = Math.max(0, 0.4 * (1 - progress));
      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  }
}

/**
 * Overlay breakdown of winning symbols and their individual contributions
 */
export class WinBreakdownOverlay {
  readonly container = new Container();
  private panel = new Container();
  private cardBg = new Graphics();
  private w: number;
  private h: number;
  private autoDismissTimer: number | null = null;
  private isVisible = false;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.container.addChild(this.panel);
    this.panel.addChild(this.cardBg);

    this.container.eventMode = "static";
    this.container.cursor = "pointer";
    this.container.on("pointerdown", () => {
      this.hide();
    });

    this.container.visible = false;
  }

  resize(w: number, h: number) {
    this.w = w;
    this.h = h;
  }

  showBreakdown(
    result: SpinResult,
    onDismiss?: () => void,
    autoDismissMs = 6500
  ) {
    if (this.autoDismissTimer) {
      clearTimeout(this.autoDismissTimer);
      this.autoDismissTimer = null;
    }

    this.panel.removeChildren();
    this.cardBg = new Graphics();
    this.panel.addChild(this.cardBg);

    const hasLineWins = result.lineWins && result.lineWins.length > 0;
    const hasScatter = result.scatterWin && result.scatterWin.winCents > 0;

    if (!hasLineWins && !hasScatter) {
      this.hide();
      return;
    }

    const totalWinCents = Math.max(1, result.totalWinCents);
    const winEntries: Array<{
      type: "line" | "scatter";
      label: string;
      symbolName: string;
      count: number;
      winCents: number;
      color: number;
      extraInfo?: string;
    }> = [];

    const lineColors = [0xff2a3b, 0xffd700, 0xff5c7a, 0x00ffcc, 0xffa500, 0x9966ff];

    result.lineWins.forEach((win: LineWin, idx: number) => {
      const symName = win.symbol.replace("_", " ").toUpperCase();
      winEntries.push({
        type: "line",
        label: `LINE ${win.paylineIndex + 1}`,
        symbolName: symName,
        count: win.count,
        winCents: win.winCents,
        color: lineColors[idx % lineColors.length],
      });
    });

    if (result.scatterWin && result.scatterWin.winCents > 0) {
      winEntries.push({
        type: "scatter",
        label: "SCATTER",
        symbolName: "DIAMOND SCATTER",
        count: result.scatterWin.count,
        winCents: result.scatterWin.winCents,
        color: 0xff3344,
        extraInfo:
          result.scatterWin.freeSpinsAwarded > 0
            ? `+${result.scatterWin.freeSpinsAwarded} FREE SPINS`
            : undefined,
      });
    }

    const cardWidth = Math.min(340, this.w - 24);
    const rowHeight = 44;
    const headerHeight = 58;
    const footerHeight = 28;
    const cardHeight = Math.min(
      this.h - 40,
      headerHeight + winEntries.length * rowHeight + footerHeight
    );

    const cardX = (this.w - cardWidth) / 2;
    const cardY = (this.h - cardHeight) / 2;

    this.panel.x = cardX;
    this.panel.y = cardY;

    // Card Glass Background
    this.cardBg.clear();
    // Drop Shadow
    this.cardBg.roundRect(4, 6, cardWidth, cardHeight, 14);
    this.cardBg.fill({ color: 0x000000, alpha: 0.75 });
    // Obsidian Metallic Body
    this.cardBg.roundRect(0, 0, cardWidth, cardHeight, 14);
    this.cardBg.fill({ color: 0x0c0103, alpha: 0.95 });
    this.cardBg.stroke({ width: 2, color: 0xff2a3b, alpha: 0.95 });
    // Header divider
    this.cardBg.moveTo(0, headerHeight);
    this.cardBg.lineTo(cardWidth, headerHeight);
    this.cardBg.stroke({ width: 1.5, color: 0xff2a3b, alpha: 0.4 });

    // Header Title
    const titleText = new Text({
      text: "WIN COMBINATIONS BREAKDOWN",
      style: {
        fontFamily: "Rajdhani, Inter, Arial, sans-serif",
        fontSize: 14,
        fontWeight: "700",
        fill: "#ff4d5a",
        letterSpacing: 1,
      },
    });
    titleText.x = 14;
    titleText.y = 12;
    this.panel.addChild(titleText);

    // Total Win Text
    const totalWinText = new Text({
      text: `TOTAL: +R${(result.totalWinCents / 100).toFixed(2)}`,
      style: {
        fontFamily: "Rajdhani, Inter, Arial, sans-serif",
        fontSize: 17,
        fontWeight: "700",
        fill: "#ffffff",
        dropShadow: { alpha: 0.8, blur: 4, color: 0xff2a3b, distance: 1, angle: Math.PI / 4 },
      },
    });
    totalWinText.x = 14;
    totalWinText.y = 30;
    this.panel.addChild(totalWinText);

    // Close button tag
    const closeText = new Text({
      text: "✕ CLOSE",
      style: {
        fontFamily: "Rajdhani, Inter, Arial, sans-serif",
        fontSize: 12,
        fontWeight: "700",
        fill: "#e0adb1",
      },
    });
    closeText.anchor.set(1, 0);
    closeText.x = cardWidth - 14;
    closeText.y = 18;
    this.panel.addChild(closeText);

    // Rows Container
    const rowsCont = new Container();
    rowsCont.y = headerHeight + 6;

    winEntries.forEach((entry, idx) => {
      const rowY = idx * rowHeight;
      const rowBg = new Graphics();

      // Row alternate background
      rowBg.roundRect(8, rowY, cardWidth - 16, rowHeight - 6, 8);
      rowBg.fill({ color: 0x1a0205, alpha: 0.7 });
      rowBg.stroke({ width: 1, color: entry.color, alpha: 0.4 });

      // Contribution progress bar
      const pct = Math.min(1, entry.winCents / totalWinCents);
      const barWidth = Math.max(4, (cardWidth - 20) * pct);
      rowBg.roundRect(10, rowY + rowHeight - 10, barWidth, 3, 2);
      rowBg.fill({ color: entry.color, alpha: 0.9 });

      rowsCont.addChild(rowBg);

      // Line Badge Text
      const lineTag = new Text({
        text: entry.label,
        style: {
          fontFamily: "Rajdhani, Inter, Arial, sans-serif",
          fontSize: 11,
          fontWeight: "700",
          fill: entry.color,
        },
      });
      lineTag.x = 16;
      lineTag.y = rowY + 5;
      rowsCont.addChild(lineTag);

      // Symbol Match Text
      const symMatch = new Text({
        text: `${entry.count}× ${entry.symbolName}`,
        style: {
          fontFamily: "Rajdhani, Inter, Arial, sans-serif",
          fontSize: 13,
          fontWeight: "700",
          fill: "#ffffff",
        },
      });
      symMatch.x = 16;
      symMatch.y = rowY + 18;
      rowsCont.addChild(symMatch);

      // Win Amount & Share Text
      const pctStr = Math.round(pct * 100);
      const winVal = new Text({
        text: `+R${(entry.winCents / 100).toFixed(2)} (${pctStr}%)`,
        style: {
          fontFamily: "Rajdhani, Inter, Arial, sans-serif",
          fontSize: 14,
          fontWeight: "700",
          fill: "#ffd700",
          align: "right",
        },
      });
      winVal.anchor.set(1, 0);
      winVal.x = cardWidth - 16;
      winVal.y = rowY + 10;
      rowsCont.addChild(winVal);

      if (entry.extraInfo) {
        const extraText = new Text({
          text: entry.extraInfo,
          style: {
            fontFamily: "Rajdhani, Inter, Arial, sans-serif",
            fontSize: 9,
            fontWeight: "700",
            fill: "#ff4d5a",
            align: "right",
          },
        });
        extraText.anchor.set(1, 0);
        extraText.x = cardWidth - 16;
        extraText.y = rowY + 24;
        rowsCont.addChild(extraText);
      }
    });

    this.panel.addChild(rowsCont);

    // Footer Hint
    const footerHint = new Text({
      text: "Tap anywhere to close breakdown",
      style: {
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: 10,
        fill: "#e0adb1",
        align: "center",
      },
    });
    footerHint.anchor.set(0.5);
    footerHint.x = cardWidth / 2;
    footerHint.y = cardHeight - 12;
    this.panel.addChild(footerHint);

    // Slide-up and fade-in entrance animation
    this.container.visible = true;
    this.isVisible = true;
    this.panel.alpha = 0;
    this.panel.y = cardY + 20;

    const start = performance.now();
    const anim = (now: number) => {
      if (!this.isVisible) return;
      const tNorm = Math.min(1, (now - start) / 220);
      this.panel.alpha = tNorm;
      this.panel.y = cardY + (1 - tNorm) * 20;
      if (tNorm < 1) {
        requestAnimationFrame(anim);
      }
    };
    requestAnimationFrame(anim);

    if (autoDismissMs > 0) {
      this.autoDismissTimer = window.setTimeout(() => {
        this.hide(onDismiss);
      }, autoDismissMs);
    }
  }

  hide(onDismiss?: () => void) {
    if (!this.isVisible) return;
    if (this.autoDismissTimer) {
      clearTimeout(this.autoDismissTimer);
      this.autoDismissTimer = null;
    }
    this.isVisible = false;

    const start = performance.now();
    const startY = this.panel.y;
    const anim = (now: number) => {
      const tNorm = Math.min(1, (now - start) / 180);
      this.panel.alpha = 1 - tNorm;
      this.panel.y = startY + tNorm * 15;
      if (tNorm < 1) {
        requestAnimationFrame(anim);
      } else {
        this.container.visible = false;
        if (onDismiss) onDismiss();
      }
    };
    requestAnimationFrame(anim);
  }
}

/**
 * 20 Classic 5x3 Paylines Definition & High-Contrast Neon Palette
 */
const ALL_20_PAYLINES: number[][] = [
  [1, 1, 1, 1, 1], // 1: Center Row
  [0, 0, 0, 0, 0], // 2: Top Row
  [2, 2, 2, 2, 2], // 3: Bottom Row
  [0, 1, 2, 1, 0], // 4: V-Shape
  [2, 1, 0, 1, 2], // 5: Inverted V
  [0, 0, 1, 2, 2], // 6: Down Slope
  [2, 2, 1, 0, 0], // 7: Up Slope
  [1, 0, 0, 0, 1], // 8: Crown Top
  [1, 2, 2, 2, 1], // 9: Crown Bottom
  [0, 1, 1, 1, 0], // 10: Shallow V
  [2, 1, 1, 1, 2], // 11: Shallow Peak
  [1, 0, 1, 2, 1], // 12: Zig-Zag Down
  [1, 2, 1, 0, 1], // 13: Zig-Zag Up
  [0, 1, 0, 1, 0], // 14: Top Waves
  [2, 1, 2, 1, 2], // 15: Bottom Waves
  [1, 1, 0, 1, 1], // 16: Top Arch
  [1, 1, 2, 1, 1], // 17: Bottom Arch
  [0, 0, 1, 0, 0], // 18: Middle Dip
  [2, 2, 1, 2, 2], // 19: Middle Rise
  [0, 2, 0, 2, 0], // 20: Extreme W
];

const PAYLINE_PALETTE: number[] = [
  0xff2a3b, // 1: Ruby Red
  0x00e676, // 2: Electric Emerald
  0x00d4ff, // 3: Diamond Cyan
  0xffd700, // 4: Goldenrod
  0xff007f, // 5: Hot Pink
  0xff9100, // 6: Neon Amber
  0xaa00ff, // 7: Laser Violet
  0x00f5d4, // 8: Mint Turquoise
  0xff3d00, // 9: Sunset Orange
  0x76ff03, // 10: Bright Lime
  0xff1744, // 11: Crimson Red
  0x2979ff, // 12: Sky Blue
  0xf50057, // 13: Rose Magenta
  0x00e5ff, // 14: Electric Blue
  0xffea00, // 15: Cyber Yellow
  0x651fff, // 16: Deep Indigo
  0x1de9b6, // 17: Aqua Marine
  0xff6d00, // 18: Tangerine
  0xff4081, // 19: Coral Pink
  0xffffff, // 20: Diamond White
];

export type GridDisplayMode = "all-grid" | "neon-matrix" | "all-paylines" | "subtle";

/**
 * FullGridOverlay
 * Renders high-contrast, crystal-clear 5x3 grid lines (all vertical and horizontal rows),
 * individual glowing cell bevels, diamond intersection rivets, numbered side payline badges,
 * and the interactive full 20-payline laser roadmap.
 */
export class FullGridOverlay {
  readonly container = new Container();
  private cellW: number;
  private cellH: number;
  private cols = 5;
  private rows = 3;

  private gridGfx = new Graphics();
  private paylinesGfx = new Graphics();
  private cellFramesGfx = new Graphics();
  private animId: number | null = null;

  private mode: GridDisplayMode = "all-grid";
  private activeHoverPayline: number | null = null;
  private pulsePhase = 0;

  constructor(cellW: number, cellH: number) {
    this.cellW = cellW;
    this.cellH = cellH;

    this.container.addChild(this.cellFramesGfx);
    this.container.addChild(this.gridGfx);
    this.container.addChild(this.paylinesGfx);

    this.redraw();
    this.startAnimation();
  }

  public setDimensions(cellW: number, cellH: number) {
    this.cellW = cellW;
    this.cellH = cellH;
    this.redraw();
  }

  public setMode(mode: GridDisplayMode) {
    this.mode = mode;
    this.redraw();
  }

  public cycleMode(): GridDisplayMode {
    const modes: GridDisplayMode[] = ["all-grid", "neon-matrix", "all-paylines", "subtle"];
    const currIdx = modes.indexOf(this.mode);
    const nextIdx = (currIdx + 1) % modes.length;
    this.mode = modes[nextIdx];
    this.redraw();
    return this.mode;
  }

  public getMode(): GridDisplayMode {
    return this.mode;
  }

  public hoverPayline(lineIndex: number | null) {
    this.activeHoverPayline = lineIndex;
    this.redraw();
  }

  public pulse() {
    this.pulsePhase = 1.0;
  }

  private startAnimation() {
    let tick = 0;
    const loop = () => {
      tick += 0.04;
      if (this.pulsePhase > 0) {
        this.pulsePhase = Math.max(0, this.pulsePhase - 0.03);
      }

      if (this.mode === "neon-matrix" || this.mode === "all-paylines" || this.pulsePhase > 0) {
        this.drawDynamicEffects(tick);
      }

      this.animId = requestAnimationFrame(loop);
    };
    loop();
  }

  public redraw() {
    const boardW = this.cellW * this.cols;
    const boardH = this.cellH * this.rows;

    this.gridGfx.clear();
    this.cellFramesGfx.clear();
    this.paylinesGfx.clear();

    // 1. Draw Individual Cell Bevel Borders (15 cells)
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        const cx = c * this.cellW;
        const cy = r * this.cellH;
        const pad = 2;

        if (this.mode === "neon-matrix") {
          // Neon cyber cell frame with glowing aura
          this.cellFramesGfx.roundRect(cx + pad, cy + pad, this.cellW - pad * 2, this.cellH - pad * 2, 6);
          this.cellFramesGfx.stroke({ width: 1.5, color: 0xff2a3b, alpha: 0.45 });
          this.cellFramesGfx.fill({ color: 0xff2a3b, alpha: 0.04 });
        } else if (this.mode === "all-grid" || this.mode === "all-paylines") {
          // Clean subtle cell framing
          this.cellFramesGfx.roundRect(cx + pad, cy + pad, this.cellW - pad * 2, this.cellH - pad * 2, 4);
          this.cellFramesGfx.stroke({ width: 1, color: 0xffffff, alpha: 0.12 });
          this.cellFramesGfx.fill({ color: 0xffffff, alpha: 0.02 });
        }
      }
    }

    // 2. Draw ALL Primary Grid Lines (4 vertical + 2 horizontal + outer frame)
    const isNeon = this.mode === "neon-matrix";
    const lineColor = isNeon ? 0xff3344 : 0xe0e6ed;
    const lineAlpha = this.mode === "subtle" ? 0.4 : isNeon ? 0.95 : 0.85;
    const lineWidth = isNeon ? 2.5 : 2.0;

    // Outer Board Glow Stroke
    this.gridGfx.roundRect(0, 0, boardW, boardH, 10);
    this.gridGfx.stroke({ width: lineWidth + 1, color: isNeon ? 0xd61c24 : 0xffffff, alpha: lineAlpha });

    // 4 Vertical Divider Lines
    for (let c = 1; c < this.cols; c++) {
      const x = c * this.cellW;
      // Soft shadow line
      this.gridGfx.moveTo(x + 1, 0);
      this.gridGfx.lineTo(x + 1, boardH);
      this.gridGfx.stroke({ width: lineWidth, color: 0x000000, alpha: 0.6 });

      // Core crisp line
      this.gridGfx.moveTo(x, 0);
      this.gridGfx.lineTo(x, boardH);
      this.gridGfx.stroke({ width: lineWidth, color: lineColor, alpha: lineAlpha });
    }

    // 2 Horizontal Divider Lines
    for (let r = 1; r < this.rows; r++) {
      const y = r * this.cellH;
      // Soft shadow line
      this.gridGfx.moveTo(0, y + 1);
      this.gridGfx.lineTo(boardW, y + 1);
      this.gridGfx.stroke({ width: lineWidth, color: 0x000000, alpha: 0.6 });

      // Core crisp line
      this.gridGfx.moveTo(0, y);
      this.gridGfx.lineTo(boardW, y);
      this.gridGfx.stroke({ width: lineWidth, color: lineColor, alpha: lineAlpha });
    }

    // 3. Draw Diamond Intersection Rivets at all 8 internal grid junctions
    for (let c = 1; c < this.cols; c++) {
      for (let r = 1; r < this.rows; r++) {
        const jx = c * this.cellW;
        const jy = r * this.cellH;
        const dSize = isNeon ? 6.5 : 5.0;

        // Outer glow
        this.gridGfx.moveTo(jx, jy - dSize - 2);
        this.gridGfx.lineTo(jx + dSize + 2, jy);
        this.gridGfx.lineTo(jx, jy + dSize + 2);
        this.gridGfx.lineTo(jx - dSize - 2, jy);
        this.gridGfx.closePath();
        this.gridGfx.fill({ color: isNeon ? 0xff2a3b : 0xd61c24, alpha: 0.6 });

        // Core diamond
        this.gridGfx.moveTo(jx, jy - dSize);
        this.gridGfx.lineTo(jx + dSize, jy);
        this.gridGfx.lineTo(jx, jy + dSize);
        this.gridGfx.lineTo(jx - dSize, jy);
        this.gridGfx.closePath();
        this.gridGfx.fill({ color: 0xffffff, alpha: 0.95 });
        this.gridGfx.stroke({ width: 1.2, color: 0xd61c24, alpha: 0.9 });
      }
    }

    // 4. Render All 20 Paylines Laser Roadmap (if active or if hovering a single line)
    if (this.mode === "all-paylines") {
      this.renderAllPaylineLasers();
    } else if (this.activeHoverPayline !== null) {
      this.renderSinglePaylineLaser(this.activeHoverPayline);
    }
  }

  private renderAllPaylineLasers() {
    this.paylinesGfx.clear();

    ALL_20_PAYLINES.forEach((path, idx) => {
      const color = PAYLINE_PALETTE[idx % PAYLINE_PALETTE.length];
      const g = this.paylinesGfx;

      // Draw glowing laser path
      const startX = 0 * this.cellW + this.cellW / 2;
      const startY = path[0] * this.cellH + this.cellH / 2;

      g.moveTo(startX, startY);

      // Start Node Dot
      g.circle(startX, startY, 4.5);
      g.fill({ color, alpha: 0.95 });
      g.stroke({ width: 1.5, color: 0xffffff, alpha: 0.9 });

      for (let reel = 1; reel < 5; reel++) {
        const row = path[reel];
        const px = reel * this.cellW + this.cellW / 2;
        const py = row * this.cellH + this.cellH / 2;

        g.lineTo(px, py);

        // Junction Dot
        g.circle(px, py, 3.5);
        g.fill({ color, alpha: 0.9 });
      }

      g.stroke({ width: 2.2, color, alpha: 0.85 });
    });
  }

  private renderSinglePaylineLaser(lineIdx: number) {
    this.paylinesGfx.clear();
    const path = ALL_20_PAYLINES[lineIdx];
    if (!path) return;

    const color = PAYLINE_PALETTE[lineIdx % PAYLINE_PALETTE.length];
    const g = this.paylinesGfx;

    const startX = 0 * this.cellW + this.cellW / 2;
    const startY = path[0] * this.cellH + this.cellH / 2;

    // Glowing halo beam
    g.moveTo(startX, startY);
    for (let reel = 1; reel < 5; reel++) {
      const px = reel * this.cellW + this.cellW / 2;
      const py = path[reel] * this.cellH + this.cellH / 2;
      g.lineTo(px, py);
    }
    g.stroke({ width: 8, color, alpha: 0.45 });

    // Sharp core laser
    g.moveTo(startX, startY);
    g.circle(startX, startY, 6.5);
    g.fill(color);
    g.stroke({ width: 2, color: 0xffffff });

    for (let reel = 1; reel < 5; reel++) {
      const px = reel * this.cellW + this.cellW / 2;
      const py = path[reel] * this.cellH + this.cellH / 2;
      g.lineTo(px, py);
      g.circle(px, py, 5.5);
      g.fill(color);
      g.stroke({ width: 1.5, color: 0xffffff });
    }
    g.stroke({ width: 3.5, color: 0xffffff, alpha: 0.95 });
  }

  private drawDynamicEffects(tick: number) {
    if (this.mode === "neon-matrix") {
      const alphaPulse = 0.75 + Math.sin(tick * 3) * 0.25;
      this.gridGfx.alpha = alphaPulse;
    } else {
      this.gridGfx.alpha = 1.0;
    }
  }

  public destroy() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    this.container.destroy({ children: true });
  }
}
