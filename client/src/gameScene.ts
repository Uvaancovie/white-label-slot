import { Application, Container, Graphics, Text } from "pixi.js";
import type { GameConfig, SpinResult, SymbolId } from "@sa-slot/shared";
import { CoinBurst, ReelBoard, WinHighlighter } from "./reels.js";
import { SoundBus } from "./audio.js";

export class GameScene {
  readonly app: Application;
  private board!: ReelBoard;
  private highlight!: WinHighlighter;
  private coins!: CoinBurst;
  private title!: Text;
  private root = new Container();
  private config: GameConfig;
  private sound: SoundBus;
  private cellW = 70;
  private cellH = 78;
  reducedMotion = false;
  turbo = false;

  constructor(app: Application, config: GameConfig, sound: SoundBus) {
    this.app = app;
    this.config = config;
    this.sound = sound;
  }

  async init() {
    const view = this.app.canvas.parentElement!;
    const w = view.clientWidth || 360;
    const h = view.clientHeight || 480;

    // Background gradient blocks
    const bg = new Graphics();
    bg.rect(0, 0, w, h);
    bg.fill(this.hex(this.config.branding.backgroundBottom));
    const top = new Graphics();
    top.ellipse(w / 2, 0, w * 0.7, h * 0.45);
    top.fill({
      color: this.hex(this.config.branding.primaryColor),
      alpha: 0.25,
    });
    this.root.addChild(bg, top);

    this.title = new Text({
      text: this.config.branding.logoText,
      style: {
        fontFamily: "Rajdhani, Arial, sans-serif",
        fontSize: 28,
        fontWeight: "700",
        fill: this.hex(this.config.branding.secondaryColor),
        dropShadow: {
          alpha: 0.5,
          blur: 2,
          color: 0x000000,
          distance: 2,
        },
      },
    });
    this.title.anchor.set(0.5, 0);
    this.title.x = w / 2;
    this.title.y = 12;
    this.root.addChild(this.title);

    // Fit 5 reels in width with padding
    const pad = 16;
    this.cellW = Math.floor((w - pad * 2) / 5);
    this.cellH = Math.floor(this.cellW * 1.05);

    this.board = new ReelBoard({
      config: this.config,
      cellW: this.cellW,
      cellH: this.cellH,
      reducedMotion: this.reducedMotion,
      turbo: this.turbo,
      onReelStop: () => this.sound.stop(),
    });
    this.board.container.x = (w - this.cellW * 5) / 2;
    this.board.container.y = 56;
    this.root.addChild(this.board.container);

    this.highlight = new WinHighlighter(this.cellW, this.cellH);
    this.highlight.container.x = this.board.container.x;
    this.highlight.container.y = this.board.container.y;
    this.root.addChild(this.highlight.container);

    this.coins = new CoinBurst();
    this.root.addChild(this.coins.container);

    // SA flag-inspired accent bar under title
    const bar = new Graphics();
    const barY = 48;
    const colors = [0x007a4d, 0xffb612, 0xde3831, 0x002395, 0x000000];
    const bw = w / colors.length;
    colors.forEach((c, i) => {
      bar.rect(i * bw, barY, bw, 3);
      bar.fill(c);
    });
    this.root.addChild(bar);

    this.app.stage.addChild(this.root);
  }

  setTitle(text: string) {
    this.title.text = text;
  }

  setMotion(reducedMotion: boolean, turbo: boolean) {
    this.reducedMotion = reducedMotion;
    this.turbo = turbo;
    this.board.setMotionFlags(reducedMotion, turbo);
  }

  async playSpin(result: SpinResult): Promise<void> {
    this.highlight.clear();
    this.sound.spin();
    await this.board.spinTo(result.grid);

    if (result.totalWinCents > 0) {
      const positions = [
        ...result.lineWins.flatMap((w) => w.positions),
        ...(result.scatterWin?.positions ?? []),
      ];
      // unique
      const key = new Set<string>();
      const unique = positions.filter((p) => {
        const k = `${p.reel}:${p.row}`;
        if (key.has(k)) return false;
        key.add(k);
        return true;
      });
      this.highlight.show(unique);
      const big = result.totalWinCents >= result.betCents * 10;
      this.sound.win(big);
      if (!this.reducedMotion) {
        const cx =
          this.board.container.x + (this.cellW * 5) / 2;
        const cy =
          this.board.container.y + (this.cellH * 3) / 2;
        this.coins.burst(cx, cy, big ? 28 : 14);
      }
    }

    if (result.freeSpinsJustAwarded > 0) {
      this.sound.freeSpins();
    }
  }

  setGrid(grid: SymbolId[][]) {
    this.board.setGrid(grid);
  }

  private hex(css: string): number {
    const s = css.replace("#", "");
    return parseInt(s.length === 3 ? s.split("").map((c) => c + c).join("") : s, 16);
  }
}
