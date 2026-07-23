import { Container, Graphics } from "pixi.js";
import type { GameConfig, SymbolId } from "@sa-slot/shared";
import { createSymbolSprite } from "./symbols.js";

export interface ReelViewOptions {
  config: GameConfig;
  cellW: number;
  cellH: number;
  reducedMotion: boolean;
  turbo: boolean;
  onReelStop?: (reelIndex: number) => void;
}

/**
 * 5-reel view with staggered stop animation.
 * Final grid always comes from server; animation is cosmetic.
 */
export class ReelBoard {
  readonly container = new Container();
  private reels: Container[] = [];
  private masks: Graphics[] = [];
  private cellW: number;
  private cellH: number;
  private rows: number;
  private spinning = false;
  private reducedMotion: boolean;
  private turbo: boolean;
  private onReelStop?: (reelIndex: number) => void;
  private stripCache: SymbolId[][];

  constructor(opts: ReelViewOptions) {
    this.cellW = opts.cellW;
    this.cellH = opts.cellH;
    this.rows = opts.config.layout.rows;
    this.reducedMotion = opts.reducedMotion;
    this.turbo = opts.turbo;
    this.onReelStop = opts.onReelStop;
    this.stripCache = opts.config.reelStrips;

    const frame = new Graphics();
    const boardW = this.cellW * 5;
    const boardH = this.cellH * this.rows;
    frame.roundRect(-6, -6, boardW + 12, boardH + 12, 16);
    frame.fill({ color: 0x0a1a10, alpha: 0.9 });
    frame.stroke({ width: 3, color: 0xffb612, alpha: 0.85 });
    this.container.addChild(frame);

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
    }

    // Divider lines
    const lines = new Graphics();
    for (let i = 1; i < 5; i++) {
      lines.moveTo(i * this.cellW, 0);
      lines.lineTo(i * this.cellW, boardH);
      lines.stroke({ width: 1, color: 0xffb612, alpha: 0.25 });
    }
    this.container.addChild(lines);

    // Initial placeholder grid
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
    }
  }

  private paintReel(reelIndex: number, symbols: SymbolId[]) {
    const reel = this.reels[reelIndex];
    reel.removeChildren();
    // Extra symbols above for spin illusion
    const above = 8;
    const strip = this.stripCache[reelIndex];
    for (let i = 0; i < above; i++) {
      const id = strip[(i * 3 + reelIndex) % strip.length];
      const spr = createSymbolSprite(id, this.cellW, this.cellH);
      spr.y = (i - above) * this.cellH;
      reel.addChild(spr);
    }
    for (let row = 0; row < symbols.length; row++) {
      const spr = createSymbolSprite(symbols[row], this.cellW, this.cellH);
      spr.y = row * this.cellH;
      reel.addChild(spr);
    }
    // Below
    for (let i = 0; i < 4; i++) {
      const id = strip[(i * 5 + 2) % strip.length];
      const spr = createSymbolSprite(id, this.cellW, this.cellH);
      spr.y = (symbols.length + i) * this.cellH;
      reel.addChild(spr);
    }
  }

  /**
   * Animate spin then land on server grid.
   */
  async spinTo(grid: SymbolId[][]): Promise<void> {
    if (this.spinning) return;
    this.spinning = true;

    if (this.reducedMotion) {
      this.setGrid(grid);
      this.spinning = false;
      return;
    }

    const baseDuration = this.turbo ? 280 : 700;
    const stagger = this.turbo ? 60 : 160;
    const boardH = this.cellH * this.rows;

    const promises = this.reels.map((reel, i) => {
      return new Promise<void>((resolve) => {
        // Pre-paint destination mixed with strip noise
        this.paintReel(i, grid[i]);
        reel.y = -boardH * 2;

        const duration = baseDuration + i * stagger;
        const start = performance.now();
        const from = reel.y;
        const to = 0;

        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          // ease-out cubic with slight overshoot settle
          const eased = 1 - Math.pow(1 - t, 3);
          reel.y = from + (to - from) * eased;
          if (t < 1) {
            requestAnimationFrame(tick);
          } else {
            reel.y = 0;
            this.onReelStop?.(i);
            resolve();
          }
        };
        requestAnimationFrame(tick);
      });
    });

    await Promise.all(promises);
    this.setGrid(grid);
    this.spinning = false;
  }
}

/** Highlight winning cells with a gold border overlay */
export class WinHighlighter {
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

  show(positions: Array<{ reel: number; row: number }>, color = 0xffb612) {
    this.clear();
    for (const p of positions) {
      const g = new Graphics();
      g.roundRect(
        p.reel * this.cellW + 2,
        p.row * this.cellH + 2,
        this.cellW - 4,
        this.cellH - 4,
        12,
      );
      g.stroke({ width: 4, color, alpha: 0.95 });
      this.container.addChild(g);
    }
  }
}

export class CoinBurst {
  readonly container = new Container();
  private particles: Array<{
    g: Graphics;
    vx: number;
    vy: number;
    life: number;
  }> = [];
  private running = false;

  burst(x: number, y: number, count = 18) {
    for (let i = 0; i < count; i++) {
      const g = new Graphics()
        .circle(0, 0, 3 + Math.random() * 3)
        .fill(0xffb612);
      g.x = x;
      g.y = y;
      this.container.addChild(g);
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      this.particles.push({
        g,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
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
      p.vy += 0.15;
      p.g.x += p.vx;
      p.g.y += p.vy;
      p.life -= 0.02;
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
