import { Application, Container, Graphics, Text } from "pixi.js";
import type { GameConfig, SpinResult, SymbolId } from "@sa-slot/shared";
import {
  BigWinModal,
  CoinBurst,
  DiamondBackground,
  FlashImpactOverlay,
  FloatingWinManager,
  PaylineOverlay,
  ReelBoard,
  WinBreakdownOverlay,
  WinHighlighter,
} from "./reels.js";
import { SoundBus } from "./audio.js";

export class GameScene {
  readonly app: Application;
  private board!: ReelBoard;
  private highlight!: WinHighlighter;
  private paylineOverlay!: PaylineOverlay;
  private floatingWins!: FloatingWinManager;
  private flashOverlay!: FlashImpactOverlay;
  private coins!: CoinBurst;
  private bigWinModal!: BigWinModal;
  private breakdownOverlay!: WinBreakdownOverlay;
  private diamondBg!: DiamondBackground;
  private title!: Text;
  private accentBar = new Graphics();
  private bg = new Graphics();
  private topGlow = new Graphics();
  private root = new Container();
  private config: GameConfig;
  private sound: SoundBus;
  private cellW = 70;
  private cellH = 78;
  private lastSpinResult: SpinResult | null = null;
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

    // Background gradient & casino glow
    this.bg.rect(0, 0, w, h);
    this.bg.fill(this.hex(this.config.branding.backgroundBottom));

    this.topGlow.ellipse(w / 2, 0, w * 0.8, h * 0.5);
    this.topGlow.fill({
      color: this.hex(this.config.branding.primaryColor),
      alpha: 0.35,
    });
    this.root.addChild(this.bg, this.topGlow);

    // Floating diamond background animation (Red, Black & White floating gems)
    this.diamondBg = new DiamondBackground(w, h, 36);
    this.root.addChild(this.diamondBg.container);

    this.title = new Text({
      text: this.config.branding.logoText,
      style: {
        fontFamily: "Rajdhani, Inter, Arial, sans-serif",
        fontSize: 28,
        fontWeight: "700",
        fill: this.config.branding.secondaryColor,
        stroke: { color: 0x000000, width: 4 },
        dropShadow: {
          alpha: 0.6,
          blur: 4,
          color: 0x000000,
          distance: 2,
        },
      },
    });
    this.title.anchor.set(0.5, 0);
    this.title.x = w / 2;
    this.title.y = 10;
    this.root.addChild(this.title);

    // Fit 5 reels in width with padding
    const pad = 14;
    this.cellW = Math.floor((w - pad * 2) / 5);
    this.cellH = Math.floor(this.cellW * 1.05);

    this.board = new ReelBoard({
      config: this.config,
      cellW: this.cellW,
      cellH: this.cellH,
      reducedMotion: this.reducedMotion,
      turbo: this.turbo,
      onReelStop: (idx, isScatter) => this.sound.stopReel(idx, isScatter),
      onTensionChange: (inTension) =>
        inTension ? this.sound.startTension() : this.sound.stopTension(),
      onShakeScreen: () => this.shakeScreen(300, 6),
    });
    this.board.container.x = (w - this.cellW * 5) / 2;
    this.board.container.y = 54;
    this.root.addChild(this.board.container);

    this.highlight = new WinHighlighter(this.cellW, this.cellH);
    this.highlight.container.x = this.board.container.x;
    this.highlight.container.y = this.board.container.y;
    this.root.addChild(this.highlight.container);

    this.paylineOverlay = new PaylineOverlay(this.cellW, this.cellH);
    this.paylineOverlay.container.x = this.board.container.x;
    this.paylineOverlay.container.y = this.board.container.y;
    this.root.addChild(this.paylineOverlay.container);

    this.floatingWins = new FloatingWinManager();
    this.floatingWins.container.x = this.board.container.x;
    this.floatingWins.container.y = this.board.container.y;
    this.root.addChild(this.floatingWins.container);

    this.flashOverlay = new FlashImpactOverlay(w, h);
    this.root.addChild(this.flashOverlay.container);

    this.coins = new CoinBurst();
    this.root.addChild(this.coins.container);

    this.bigWinModal = new BigWinModal(w, h);
    this.root.addChild(this.bigWinModal.container);

    this.breakdownOverlay = new WinBreakdownOverlay(w, h);
    this.root.addChild(this.breakdownOverlay.container);

    // Red & Black Diamond accent bar under title
    this.renderAccentBar(w);
    this.root.addChild(this.accentBar);

    this.app.stage.addChild(this.root);
  }

  private renderAccentBar(w: number) {
    this.accentBar.clear();
    const barY = 46;
    const colors = [0x8a0008, 0xd61c24, 0xff2a3b, 0xffffff, 0xff2a3b, 0xd61c24, 0x8a0008];
    const bw = w / colors.length;
    colors.forEach((c, i) => {
      this.accentBar.rect(i * bw, barY, bw, 3);
      this.accentBar.fill(c);
    });
  }

  resize(w: number, h: number) {
    if (!this.bg || !this.title) return;
    this.bg.clear();
    this.bg.rect(0, 0, w, h);
    this.bg.fill(this.hex(this.config.branding.backgroundBottom));

    this.topGlow.clear();
    this.topGlow.ellipse(w / 2, 0, w * 0.8, h * 0.5);
    this.topGlow.fill({
      color: this.hex(this.config.branding.primaryColor),
      alpha: 0.35,
    });

    this.title.x = w / 2;
    this.renderAccentBar(w);

    if (this.board) {
      this.board.container.x = (w - this.cellW * 5) / 2;
      this.highlight.container.x = this.board.container.x;
      this.paylineOverlay.container.x = this.board.container.x;
      this.floatingWins.container.x = this.board.container.x;
    }

    if (this.bigWinModal) {
      this.bigWinModal.resize(w, h);
    }
    if (this.breakdownOverlay) {
      this.breakdownOverlay.resize(w, h);
    }
    if (this.flashOverlay) {
      this.flashOverlay.resize(w, h);
    }
  }

  setTitle(text: string) {
    this.title.text = text;
  }

  setMotion(reducedMotion: boolean, turbo: boolean) {
    this.reducedMotion = reducedMotion;
    this.turbo = turbo;
    if (this.board) {
      this.board.setMotionFlags(reducedMotion, turbo);
    }
  }

  shakeScreen(duration = 250, intensity = 6) {
    if (this.reducedMotion) return;
    const start = performance.now();
    const origX = 0;
    const origY = 0;
    const origRot = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      if (elapsed < duration) {
        const decay = Math.pow(1 - elapsed / duration, 1.4);
        const rotAngle = (Math.random() - 0.5) * (intensity * 0.0025) * decay;
        this.root.x = origX + (Math.random() - 0.5) * intensity * decay;
        this.root.y = origY + (Math.random() - 0.5) * intensity * decay;
        this.root.rotation = origRot + rotAngle;
        requestAnimationFrame(tick);
      } else {
        this.root.x = origX;
        this.root.y = origY;
        this.root.rotation = origRot;
      }
    };
    requestAnimationFrame(tick);
  }

  showWinBreakdown(result?: SpinResult) {
    const res = result || this.lastSpinResult;
    if (res && (res.lineWins.length > 0 || (res.scatterWin && res.scatterWin.winCents > 0))) {
      this.breakdownOverlay.showBreakdown(res);
    }
  }

  async playSpin(result: SpinResult): Promise<void> {
    this.lastSpinResult = result;
    this.highlight.clear();
    this.paylineOverlay.clear();
    this.floatingWins.clear();
    this.breakdownOverlay.hide();
    this.sound.spin();
    this.diamondBg.setSpinning(true);

    try {
      await this.board.spinTo(result.grid);

      if (result.totalWinCents > 0) {
        const positions = [
          ...result.lineWins.flatMap((w) => w.positions),
          ...(result.scatterWin?.positions ?? []),
        ];
        // unique positions
        const key = new Set<string>();
        const unique = positions.filter((p) => {
          const k = `${p.reel}:${p.row}`;
          if (key.has(k)) return false;
          key.add(k);
          return true;
        });

        this.highlight.show(unique);
        this.paylineOverlay.drawLines(result.lineWins, this.config.paylines);

        // Trigger particle explosions at all winning symbol coordinates on the reels
        this.coins.burstAtPositions(
          unique,
          this.cellW,
          this.cellH,
          this.board.container.x,
          this.board.container.y,
          12
        );

        const isMega = result.totalWinCents >= result.betCents * 25;
        const isBig = result.totalWinCents >= result.betCents * 10;

        this.flashOverlay.triggerFlash(isMega ? 0xffd700 : 0xffffff, 250);

        // Spawn floating win text popups at center of winning line combinations
        result.lineWins.forEach((win) => {
          if (win.positions.length > 0) {
            const midPos = win.positions[Math.floor(win.positions.length / 2)];
            const popX = midPos.reel * this.cellW + this.cellW / 2;
            const popY = midPos.row * this.cellH + this.cellH / 2;
            const winRands = (win.winCents / 100).toFixed(2);
            this.floatingWins.spawnPopup(popX, popY, `+R${winRands}`);
          }
        });

        if (result.scatterWin) {
          const midPos = result.scatterWin.positions[0];
          if (midPos) {
            const popX = midPos.reel * this.cellW + this.cellW / 2;
            const popY = midPos.row * this.cellH + this.cellH / 2;
            const winRands = (result.scatterWin.winCents / 100).toFixed(2);
            this.floatingWins.spawnPopup(popX, popY, `+R${winRands}`);
          }
        }

        const cx = this.board.container.x + (this.cellW * 5) / 2;
        const cy = this.board.container.y + (this.cellH * 3) / 2;

        if (isBig || isMega) {
          this.sound.win(isBig, isMega);
          this.shakeScreen(450, isMega ? 12 : 7);
          this.coins.burst(cx, cy, isMega ? 52 : 32);

          await this.bigWinModal.show(
            isMega ? "MEGA WIN!" : "BIG WIN!",
            result.totalWinCents,
            () => this.sound.coinTick(),
            isMega
          );
        } else {
          this.sound.win(false, false);
          this.shakeScreen(180, 4);
          this.coins.burst(cx, cy, 18);
        }

        // Display winning symbols overlay breakdown
        this.breakdownOverlay.showBreakdown(result);
      }

      if (result.freeSpinsJustAwarded > 0) {
        this.flashOverlay.triggerFlash(0xde1131, 400);
        this.sound.freeSpins();
        this.shakeScreen(400, 10);
        await this.bigWinModal.show(
          `FREE SPINS! (${result.freeSpinsJustAwarded})`,
          0,
          () => {}
        );
      }
    } finally {
      this.diamondBg.setSpinning(false);
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


