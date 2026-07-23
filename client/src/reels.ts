import { BlurFilter, Container, Graphics, Text } from "pixi.js";
import type { GameConfig, SymbolId, LineWin } from "@sa-slot/shared";
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

    // Reel separator lines with clean silver feel
    const lines = new Graphics();
    for (let i = 1; i < 5; i++) {
      lines.moveTo(i * this.cellW, 0);
      lines.lineTo(i * this.cellW, boardH);
      lines.stroke({ width: 1.5, color: 0xd0d8e0, alpha: 0.7 });
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

/** Particle burst system for sparkling red and white diamonds */
export class CoinBurst {
  readonly container = new Container();
  private particles: Array<{
    g: Graphics;
    vx: number;
    vy: number;
    rotSpeed: number;
    life: number;
  }> = [];
  private running = false;

  burstAtPositions(
    positions: Array<{ reel: number; row: number }>,
    cellW: number,
    cellH: number,
    boardX: number,
    boardY: number,
    countPerCell = 14
  ) {
    positions.forEach((pos) => {
      const cx = boardX + pos.reel * cellW + cellW / 2;
      const cy = boardY + pos.row * cellH + cellH / 2;

      // Spawn radial shockwave ring in ruby red and diamond white
      const shockwave = new Graphics();
      shockwave.circle(0, 0, 8);
      shockwave.stroke({ width: 3, color: 0xff2a3b, alpha: 0.95 });
      shockwave.x = cx;
      shockwave.y = cy;
      this.container.addChild(shockwave);

      let swRadius = 8;
      let swAlpha = 0.95;
      const animateShockwave = () => {
        swRadius += 3.5;
        swAlpha -= 0.04;
        shockwave.clear();
        shockwave.circle(0, 0, swRadius);
        shockwave.stroke({ width: Math.max(1, 4 * swAlpha), color: 0xffffff, alpha: Math.max(0, swAlpha) });
        if (swAlpha > 0) {
          requestAnimationFrame(animateShockwave);
        } else {
          this.container.removeChild(shockwave);
          shockwave.destroy();
        }
      };
      animateShockwave();

      // Burst particles at symbol center
      this.burst(cx, cy, countPerCell);
    });
  }

  burst(x: number, y: number, count = 32) {
    for (let i = 0; i < count; i++) {
      const g = new Graphics();
      const randType = Math.random();

      if (randType > 0.4) {
        // Sparkling White Diamond
        const s = 5 + Math.random() * 6;
        g.moveTo(0, -s);
        g.lineTo(s * 0.75, 0);
        g.lineTo(0, s);
        g.lineTo(-s * 0.75, 0);
        g.closePath();
        g.fill(0xffffff);
        g.stroke({ width: 1.5, color: 0xff2a3b, alpha: 0.9 });
      } else if (randType > 0.2) {
        // Ruby Red Gem
        const s = 6 + Math.random() * 5;
        g.rect(-s / 2, -s / 2, s, s);
        g.fill(0xd61c24);
        g.stroke({ width: 1, color: 0xffffff });
        g.rotation = Math.PI / 4;
      } else {
        // Crimson Diamond Star
        g.star(0, 0, 4, 8 + Math.random() * 4, 3);
        g.fill(0xff2a3b);
        g.stroke({ width: 1, color: 0xffffff });
      }

      g.x = x;
      g.y = y;
      this.container.addChild(g);

      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 10;
      this.particles.push({
        g,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 5,
        rotSpeed: (Math.random() - 0.5) * 0.25,
        life: 1,
      });
    }

    if (!this.running) {
      this.running = true;
      this.tick();
    }
  }

  private tick = () => {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vy += 0.28; // gravity
      p.g.x += p.vx;
      p.g.y += p.vy;
      p.g.rotation += p.rotSpeed;
      p.life -= 0.016;
      p.g.alpha = Math.max(0, p.life);

      if (p.life <= 0) {
        this.container.removeChild(p.g);
        p.g.destroy();
        this.particles.splice(i, 1);
      }
    }

    if (this.particles.length) {
      requestAnimationFrame(this.tick);
    } else {
      this.running = false;
    }
  };
}

/** Animated Big Win / Mega Win / Free Spins Modal Banner Overlay */
export class BigWinModal {
  readonly container = new Container();
  private bg = new Graphics();
  private titleText!: Text;
  private winText!: Text;
  private animTimer: number | null = null;

  constructor(w: number, h: number) {
    // Dark modal veil
    this.bg.rect(0, 0, w, h);
    this.bg.fill({ color: 0x000000, alpha: 0.75 });
    this.container.addChild(this.bg);

    // Decorative sunburst gold badge
    const badge = new Graphics();
    badge.star(w / 2, h / 2 - 10, 16, 150, 110);
    badge.fill({ color: 0xffa000, alpha: 0.3 });
    badge.stroke({ width: 3, color: 0xffd700 });
    this.container.addChild(badge);

    this.titleText = new Text({
      text: "BIG WIN!",
      style: {
        fontFamily: "Rajdhani, Inter, Arial, sans-serif",
        fontSize: 42,
        fontWeight: "700",
        fill: "#ffd700",
        stroke: { color: 0x000000, width: 6 },
        dropShadow: { alpha: 0.8, blur: 6, color: 0xff8000, distance: 4 },
        align: "center",
      },
    });
    this.titleText.anchor.set(0.5);
    this.titleText.x = w / 2;
    this.titleText.y = h / 2 - 30;
    this.container.addChild(this.titleText);

    this.winText = new Text({
      text: "R0.00",
      style: {
        fontFamily: "Rajdhani, Inter, Arial, sans-serif",
        fontSize: 36,
        fontWeight: "700",
        fill: "#ffffff",
        stroke: { color: 0x000000, width: 4 },
        align: "center",
      },
    });
    this.winText.anchor.set(0.5);
    this.winText.x = w / 2;
    this.winText.y = h / 2 + 25;
    this.container.addChild(this.winText);

    this.container.visible = false;
  }

  show(
    title: string,
    winCents: number,
    onCoinTick?: () => void
  ): Promise<void> {
    return new Promise((resolve) => {
      this.titleText.text = title;
      this.container.visible = true;
      this.container.alpha = 0;

      // Fade in and scale pop
      let alpha = 0;
      const targetCents = winCents;
      let currentCents = 0;
      const stepCents = Math.max(1, Math.floor(targetCents / 20));

      const tick = () => {
        if (alpha < 1) {
          alpha += 0.1;
          this.container.alpha = alpha;
        }

        if (currentCents < targetCents) {
          currentCents = Math.min(targetCents, currentCents + stepCents);
          this.winText.text = `R${(currentCents / 100).toFixed(2)}`;
          onCoinTick?.();
          this.animTimer = requestAnimationFrame(tick);
        } else {
          // Hold then resolve and fade out
          setTimeout(() => {
            this.fadeOut().then(resolve);
          }, 1000);
        }
      };
      tick();
    });
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

  triggerFlash(color = 0xffffff, duration = 250) {
    this.flash.clear();
    this.flash.rect(-100, -100, 1200, 1200);
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


