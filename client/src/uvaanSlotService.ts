import { formatZar, type SpinResult, type SymbolId } from "@sa-slot/shared";
import { SoundBus } from "./audio";
import { historyService } from "./historyService";

export interface UvaanSymbolDef {
  id: string;
  name: string;
  emoji: string;
  color: string;
  glowColor: string;
  multiplier3x: number;
  multiplier2x?: number;
  multiplier1x?: number;
  isWild?: boolean;
  isDiamond?: boolean;
}

export const UVAAN_SYMBOLS: Record<string, UvaanSymbolDef> = {
  RED_DIAMOND: {
    id: "RED_DIAMOND",
    name: "Red Diamond",
    emoji: "💎",
    color: "#ff2a3b",
    glowColor: "rgba(255, 42, 59, 0.9)",
    multiplier3x: 250,
    isDiamond: true,
  },
  BLACK_DIAMOND: {
    id: "BLACK_DIAMOND",
    name: "Black Diamond",
    emoji: "🖤",
    color: "#202020",
    glowColor: "rgba(255, 215, 0, 0.7)",
    multiplier3x: 150,
    isDiamond: true,
  },
  UVAAN_CROWN: {
    id: "UVAAN_CROWN",
    name: "Uvaan's Crown",
    emoji: "👑",
    color: "#ffd700",
    glowColor: "rgba(255, 215, 0, 0.9)",
    multiplier3x: 100,
    isWild: true,
  },
  BITCOIN: {
    id: "BITCOIN",
    name: "Crypto BTC",
    emoji: "🪙",
    color: "#f7931a",
    glowColor: "rgba(247, 147, 26, 0.8)",
    multiplier3x: 60,
  },
  SPRINGBOK: {
    id: "SPRINGBOK",
    name: "Springbok Star",
    emoji: "🇿🇦",
    color: "#00c853",
    glowColor: "rgba(0, 200, 83, 0.8)",
    multiplier3x: 40,
  },
  SEVEN: {
    id: "SEVEN",
    name: "Lucky 7",
    emoji: "7️⃣",
    color: "#ff3d00",
    glowColor: "rgba(255, 61, 0, 0.8)",
    multiplier3x: 25,
  },
  BELL: {
    id: "BELL",
    name: "Golden Bell",
    emoji: "🔔",
    color: "#ffc107",
    glowColor: "rgba(255, 193, 7, 0.8)",
    multiplier3x: 15,
  },
  CHERRY: {
    id: "CHERRY",
    name: "VIP Cherries",
    emoji: "🍒",
    color: "#e91e63",
    glowColor: "rgba(233, 30, 99, 0.8)",
    multiplier3x: 10,
    multiplier2x: 4,
    multiplier1x: 2,
  },
};

// Reel Strips (Weighted for high excitement & balanced demo RTP ~96.5%)
const REEL_STRIP_1 = [
  "CHERRY", "BELL", "SEVEN", "CHERRY", "SPRINGBOK", "BELL", "BITCOIN", "CHERRY",
  "UVAAN_CROWN", "SEVEN", "BLACK_DIAMOND", "BELL", "CHERRY", "RED_DIAMOND",
  "SPRINGBOK", "SEVEN", "BITCOIN", "CHERRY", "BELL", "UVAAN_CROWN"
];

const REEL_STRIP_2 = [
  "BELL", "CHERRY", "SPRINGBOK", "SEVEN", "CHERRY", "BITCOIN", "BELL",
  "BLACK_DIAMOND", "CHERRY", "UVAAN_CROWN", "SEVEN", "BELL", "RED_DIAMOND",
  "CHERRY", "SPRINGBOK", "BITCOIN", "SEVEN", "CHERRY", "BELL", "BLACK_DIAMOND"
];

const REEL_STRIP_3 = [
  "SEVEN", "CHERRY", "BELL", "BITCOIN", "CHERRY", "SPRINGBOK", "SEVEN",
  "BELL", "BLACK_DIAMOND", "CHERRY", "UVAAN_CROWN", "RED_DIAMOND", "CHERRY",
  "BELL", "SPRINGBOK", "SEVEN", "BITCOIN", "CHERRY", "BELL", "UVAAN_CROWN"
];

// 5 Classic 3x3 Paylines: [ [reel0, row], [reel1, row], [reel2, row] ]
const PAYLINES = [
  { id: 1, name: "Center Line", path: [[0, 1], [1, 1], [2, 1]], color: "#ff2a3b" },
  { id: 2, name: "Top Line", path: [[0, 0], [1, 0], [2, 0]], color: "#ffd700" },
  { id: 3, name: "Bottom Line", path: [[0, 2], [1, 2], [2, 2]], color: "#00e676" },
  { id: 4, name: "Diagonal Down", path: [[0, 0], [1, 1], [2, 2]], color: "#00e5ff" },
  { id: 5, name: "Diagonal Up", path: [[0, 2], [1, 1], [2, 0]], color: "#d500f9" },
];

export interface UvaanLineWin {
  lineId: number;
  lineName: string;
  symbol: string;
  count: number;
  multiplier: number;
  payoutCents: number;
  path: number[][];
}

export interface UvaanSpinResult {
  grid: string[][]; // 3 columns x 3 rows
  totalWinCents: number;
  lineWins: UvaanLineWin[];
  isJackpot: boolean;
  jackpotAmountCents?: number;
}

export class UvaanSlotMachine {
  private soundBus: SoundBus;
  private onBalanceChange: (newBalanceCents: number, diffCents: number, reason: string) => void;
  private getBalanceCents: () => number;

  private betIndex = 2;
  private betOptionsCents = [100, 200, 500, 1000, 2000, 5000, 10000, 25000, 50000]; // R1 to R500
  private isSpinning = false;
  private isTurbo = false;
  private autoSpinsRemaining = 0;
  private autoInterval: number | null = null;
  private bonusSpinsAvailable = 1;
  private jackpotCents = 2500000; // R25,000.00 base jackpot

  // Machine Stats
  private stats = {
    totalSpins: 0,
    totalWageredCents: 0,
    totalWonCents: 0,
    biggestWinCents: 0,
    hitCount: 0,
  };

  // Current Reel Visible Window (3x3 grid)
  private currentGrid: string[][] = [
    ["RED_DIAMOND", "UVAAN_CROWN", "SEVEN"],
    ["BLACK_DIAMOND", "RED_DIAMOND", "BITCOIN"],
    ["UVAAN_CROWN", "SPRINGBOK", "RED_DIAMOND"],
  ];

  private winningLines: UvaanLineWin[] = [];
  private lastWinCents = 0;

  constructor(
    soundBus: SoundBus,
    getBalanceCents: () => number,
    onBalanceChange: (newBalanceCents: number, diffCents: number, reason: string) => void
  ) {
    this.soundBus = soundBus;
    this.getBalanceCents = getBalanceCents;
    this.onBalanceChange = onBalanceChange;

    // Simulate steady jackpot increment over time
    setInterval(() => {
      this.jackpotCents += Math.floor(Math.random() * 8) + 2;
      this.updateJackpotDisplay();
    }, 2500);
  }

  public render(container: HTMLElement) {
    const currentBetCents = this.betOptionsCents[this.betIndex];

    container.innerHTML = `
      <div class="uvaan-cabinet-wrapper">
        <!-- VIP Header Banner -->
        <div class="uvaan-header">
          <div class="uvaan-brand-badge">
            <span class="uvaan-sparkle">★</span>
            <span>UVAAN'S VIP CASINO LOUNGE</span>
            <span class="uvaan-sparkle">★</span>
          </div>
          <h2 class="uvaan-main-title">
            <span class="text-gold">UVAAN'S</span>
            <span class="text-red">DIAMOND & CRYPTO</span>
            <span class="text-white">SLOT</span>
          </h2>
          <p class="uvaan-tagline">
            High-RTP 3-Reel Classic Cabinet with Wild Crowns, Red Diamonds, & Instant ZAR Cashier Credits
          </p>

          <!-- Progressive Mini-Jackpot Ticker -->
          <div class="uvaan-jackpot-box">
            <div class="uvaan-jackpot-label">
              <span class="jackpot-flame">🔥</span>
              <span>UVAAN'S PROGRESSIVE DIAMOND JACKPOT</span>
              <span class="jackpot-flame">🔥</span>
            </div>
            <div class="uvaan-jackpot-value" id="uvaan-jackpot-meter">${formatZar(this.jackpotCents)}</div>
            <div class="uvaan-jackpot-hint">Land 3x 💎 Red Diamonds on the Center Line to trigger!</div>
          </div>
        </div>

        <!-- Main Machine Stage: Reels Frame + Pull Lever + Paytable -->
        <div class="uvaan-stage-layout">
          <!-- Left: Paytable & Multipliers Panel -->
          <div class="uvaan-paytable-panel">
            <div class="uvaan-panel-title">🏆 Payout Multipliers</div>
            <div class="uvaan-paytable-list">
              <div class="uvaan-pay-item highlight">
                <span class="pay-sym">💎 💎 💎</span>
                <span class="pay-name">Red Diamonds (Jackpot)</span>
                <span class="pay-mult">250x</span>
              </div>
              <div class="uvaan-pay-item">
                <span class="pay-sym">🖤 🖤 🖤</span>
                <span class="pay-name">Black Diamonds</span>
                <span class="pay-mult">150x</span>
              </div>
              <div class="uvaan-pay-item">
                <span class="pay-sym">👑 👑 👑</span>
                <span class="pay-name">Uvaan's Crown (Wild)</span>
                <span class="pay-mult">100x</span>
              </div>
              <div class="uvaan-pay-item">
                <span class="pay-sym">🪙 🪙 🪙</span>
                <span class="pay-name">Crypto BTC</span>
                <span class="pay-mult">60x</span>
              </div>
              <div class="uvaan-pay-item">
                <span class="pay-sym">🇿🇦 🇿🇦 🇿🇦</span>
                <span class="pay-name">Springbok Star</span>
                <span class="pay-mult">40x</span>
              </div>
              <div class="uvaan-pay-item">
                <span class="pay-sym">💎 🖤 💎</span>
                <span class="pay-name">Any 3 Diamonds</span>
                <span class="pay-mult">30x</span>
              </div>
              <div class="uvaan-pay-item">
                <span class="pay-sym">7️⃣ 7️⃣ 7️⃣</span>
                <span class="pay-name">Lucky 7s</span>
                <span class="pay-mult">25x</span>
              </div>
              <div class="uvaan-pay-item">
                <span class="pay-sym">🔔 🔔 🔔</span>
                <span class="pay-name">Golden Bells</span>
                <span class="pay-mult">15x</span>
              </div>
              <div class="uvaan-pay-item">
                <span class="pay-sym">🍒 🍒 🍒</span>
                <span class="pay-name">3x VIP Cherries</span>
                <span class="pay-mult">10x</span>
              </div>
              <div class="uvaan-pay-item sub">
                <span class="pay-sym">🍒 🍒 Any</span>
                <span class="pay-name">2x Cherries</span>
                <span class="pay-mult">4x</span>
              </div>
              <div class="uvaan-pay-item sub">
                <span class="pay-sym">🍒 Any Any</span>
                <span class="pay-name">1x Cherry</span>
                <span class="pay-mult">2x</span>
              </div>
            </div>
          </div>

          <!-- Center: 3-Reel Slot Cabinet -->
          <div class="uvaan-cabinet-frame">
            <!-- Win Banner Overlay -->
            <div class="uvaan-win-display" id="uvaan-win-display">
              <span id="uvaan-win-text">READY TO SPIN</span>
            </div>

            <!-- 3x3 Reel Glass Container with Laser Payline Highlights -->
            <div class="uvaan-reels-stage" id="uvaan-reels-stage">
              <div class="uvaan-payline-laser" id="uvaan-laser-1" title="Line 1: Center Horizontal"></div>
              <div class="uvaan-payline-laser" id="uvaan-laser-2" title="Line 2: Top Horizontal"></div>
              <div class="uvaan-payline-laser" id="uvaan-laser-3" title="Line 3: Bottom Horizontal"></div>
              <div class="uvaan-payline-laser" id="uvaan-laser-4" title="Line 4: Diagonal Top-Left to Bottom-Right"></div>
              <div class="uvaan-payline-laser" id="uvaan-laser-5" title="Line 5: Diagonal Bottom-Left to Top-Right"></div>

              <!-- 3 Physical Reels Columns -->
              <div class="uvaan-reel-col" id="uvaan-col-0">
                <div class="uvaan-reel-strip" id="uvaan-strip-0"></div>
              </div>
              <div class="uvaan-reel-col" id="uvaan-col-1">
                <div class="uvaan-reel-strip" id="uvaan-strip-1"></div>
              </div>
              <div class="uvaan-reel-col" id="uvaan-col-2">
                <div class="uvaan-reel-strip" id="uvaan-strip-2"></div>
              </div>
            </div>

            <!-- Cabinet Meter Displays -->
            <div class="uvaan-meters-bar">
              <div class="uvaan-meter-cell">
                <label>BALANCE (ZAR)</label>
                <strong id="uvaan-val-balance" style="color: #ffd700;">${formatZar(this.getBalanceCents())}</strong>
              </div>
              <div class="uvaan-meter-cell">
                <label>BET (5 LINES)</label>
                <strong id="uvaan-val-bet" style="color: #ff4d5a;">${formatZar(currentBetCents)}</strong>
              </div>
              <div class="uvaan-meter-cell">
                <label>LAST WIN</label>
                <strong id="uvaan-val-win" style="color: #00e676;">${formatZar(this.lastWinCents)}</strong>
              </div>
            </div>

            <!-- Controls Grid -->
            <div class="uvaan-controls-strip">
              <!-- Bet Stepper -->
              <div class="uvaan-bet-stepper">
                <button type="button" class="uvaan-btn-step" id="uvaan-bet-minus" aria-label="Decrease Bet">−</button>
                <div class="uvaan-bet-info">
                  <span style="font-size: 10px; color: #f7d2d5;">TOTAL BET</span>
                  <strong id="uvaan-bet-label">${formatZar(currentBetCents)}</strong>
                </div>
                <button type="button" class="uvaan-btn-step" id="uvaan-bet-plus" aria-label="Increase Bet">+</button>
              </div>

              <!-- Main Spin Button -->
              <button type="button" class="uvaan-btn-spin" id="uvaan-btn-spin">
                <span>SPIN</span>
                <small id="uvaan-spin-sub">${formatZar(currentBetCents)}</small>
              </button>

              <!-- Secondary Action Controls -->
              <div class="uvaan-sub-actions">
                <button type="button" class="uvaan-action-chip" id="uvaan-btn-bonus" title="Free Daily Cashier Spin">
                  🎁 BONUS SPIN (<span id="uvaan-bonus-count">${this.bonusSpinsAvailable}</span>)
                </button>
                <button type="button" class="uvaan-action-chip ${this.isTurbo ? "active" : ""}" id="uvaan-btn-turbo" title="Toggle Turbo Mode">
                  ⚡ TURBO: ${this.isTurbo ? "ON" : "OFF"}
                </button>
                <button type="button" class="uvaan-action-chip" id="uvaan-btn-auto" title="Autoplay">
                  🔁 AUTO
                </button>
              </div>
            </div>

            <!-- Quick Bet Chips -->
            <div class="uvaan-quick-bets">
              <span style="font-size: 11px; color: #e0adb1; align-self: center;">Quick Bet:</span>
              ${this.betOptionsCents
                .map(
                  (cents, idx) => `
                <button type="button" class="uvaan-chip-bet ${idx === this.betIndex ? "active" : ""}" data-bet-idx="${idx}">
                  ${formatZar(cents)}
                </button>
              `
                )
                .join("")}
            </div>
          </div>

          <!-- Right: Interactive Mechanical Pull Lever -->
          <div class="uvaan-lever-station">
            <div class="uvaan-lever-housing">
              <div class="uvaan-lever-base"></div>
              <div class="uvaan-lever-arm" id="uvaan-lever-arm">
                <div class="uvaan-lever-shaft"></div>
                <div class="uvaan-lever-knob" id="uvaan-lever-knob" title="Click or Drag Lever to Spin!">
                  <span class="knob-sheen"></span>
                </div>
              </div>
            </div>
            <div class="uvaan-lever-label">PULL TO SPIN</div>
          </div>
        </div>

        <!-- Bottom VIP Stats & Quick Top-up Bar -->
        <div class="uvaan-stats-card">
          <div class="uvaan-stat-item">
            <label>SPINS PLAYED</label>
            <strong id="uvaan-stat-spins">${this.stats.totalSpins}</strong>
          </div>
          <div class="uvaan-stat-item">
            <label>TOTAL WAGERED</label>
            <strong id="uvaan-stat-wagered">${formatZar(this.stats.totalWageredCents)}</strong>
          </div>
          <div class="uvaan-stat-item">
            <label>TOTAL WON</label>
            <strong id="uvaan-stat-won" style="color: #00e676;">${formatZar(this.stats.totalWonCents)}</strong>
          </div>
          <div class="uvaan-stat-item">
            <label>BIGGEST WIN</label>
            <strong id="uvaan-stat-biggest" style="color: #ffd700;">${formatZar(this.stats.biggestWinCents)}</strong>
          </div>
          <div class="uvaan-stat-item">
            <label>SESSION RTP</label>
            <strong id="uvaan-stat-rtp">
              ${this.stats.totalWageredCents > 0 ? ((this.stats.totalWonCents / this.stats.totalWageredCents) * 100).toFixed(1) + "%" : "100.0%"}
            </strong>
          </div>
        </div>
      </div>
    `;

    this.renderReelStrips();
    this.wireEvents(container);
  }

  private renderReelStrips() {
    for (let reelIdx = 0; reelIdx < 3; reelIdx++) {
      const stripEl = document.getElementById(`uvaan-strip-${reelIdx}`);
      if (!stripEl) continue;

      const symbols = this.currentGrid[reelIdx];
      stripEl.innerHTML = symbols
        .map((symKey, rowIdx) => {
          const sym = UVAAN_SYMBOLS[symKey] || UVAAN_SYMBOLS.CHERRY;
          return `
            <div class="uvaan-cell" data-reel="${reelIdx}" data-row="${rowIdx}">
              <div class="uvaan-symbol-icon" style="text-shadow: 0 0 12px ${sym.glowColor};">${sym.emoji}</div>
              <div class="uvaan-symbol-name" style="color: ${sym.color};">${sym.name}</div>
            </div>
          `;
        })
        .join("");
    }
  }

  private wireEvents(container: HTMLElement) {
    const btnSpin = container.querySelector("#uvaan-btn-spin") as HTMLButtonElement | null;
    const btnMinus = container.querySelector("#uvaan-bet-minus") as HTMLButtonElement | null;
    const btnPlus = container.querySelector("#uvaan-bet-plus") as HTMLButtonElement | null;
    const btnBonus = container.querySelector("#uvaan-btn-bonus") as HTMLButtonElement | null;
    const btnTurbo = container.querySelector("#uvaan-btn-turbo") as HTMLButtonElement | null;
    const btnAuto = container.querySelector("#uvaan-btn-auto") as HTMLButtonElement | null;
    const leverArm = container.querySelector("#uvaan-lever-arm") as HTMLElement | null;
    const leverKnob = container.querySelector("#uvaan-lever-knob") as HTMLElement | null;

    btnSpin?.addEventListener("click", () => this.spin(false));

    leverKnob?.addEventListener("click", () => {
      this.animateLever();
      this.spin(false);
    });

    btnMinus?.addEventListener("click", () => {
      if (this.betIndex > 0) {
        this.betIndex--;
        this.updateBetDisplay();
        this.soundBus.spin();
      }
    });

    btnPlus?.addEventListener("click", () => {
      if (this.betIndex < this.betOptionsCents.length - 1) {
        this.betIndex++;
        this.updateBetDisplay();
        this.soundBus.spin();
      }
    });

    btnBonus?.addEventListener("click", () => {
      if (this.bonusSpinsAvailable > 0 && !this.isSpinning) {
        this.bonusSpinsAvailable--;
        const bonusCountEl = document.getElementById("uvaan-bonus-count");
        if (bonusCountEl) bonusCountEl.textContent = this.bonusSpinsAvailable.toString();
        this.spin(true);
      }
    });

    btnTurbo?.addEventListener("click", () => {
      this.isTurbo = !this.isTurbo;
      if (btnTurbo) {
        btnTurbo.textContent = `⚡ TURBO: ${this.isTurbo ? "ON" : "OFF"}`;
        btnTurbo.classList.toggle("active", this.isTurbo);
      }
    });

    btnAuto?.addEventListener("click", () => {
      if (this.autoSpinsRemaining > 0) {
        this.stopAuto();
      } else {
        this.startAuto(25);
      }
    });

    // Quick Bet Chips
    container.querySelectorAll(".uvaan-chip-bet").forEach((chip) => {
      chip.addEventListener("click", (e) => {
        const target = e.currentTarget as HTMLElement;
        const idx = parseInt(target.dataset.betIdx || "0", 10);
        this.betIndex = idx;
        this.updateBetDisplay();
        this.soundBus.spin();
      });
    });
  }

  private animateLever() {
    const arm = document.getElementById("uvaan-lever-arm");
    if (!arm) return;
    arm.classList.add("pulling");
    setTimeout(() => arm.classList.remove("pulling"), 600);
  }

  private updateBetDisplay() {
    const currentBetCents = this.betOptionsCents[this.betIndex];
    const formatted = formatZar(currentBetCents);

    const betLabel = document.getElementById("uvaan-bet-label");
    const valBet = document.getElementById("uvaan-val-bet");
    const spinSub = document.getElementById("uvaan-spin-sub");

    if (betLabel) betLabel.textContent = formatted;
    if (valBet) valBet.textContent = formatted;
    if (spinSub) spinSub.textContent = formatted;

    document.querySelectorAll(".uvaan-chip-bet").forEach((chip, idx) => {
      chip.classList.toggle("active", idx === this.betIndex);
    });
  }

  private updateJackpotDisplay() {
    const meter = document.getElementById("uvaan-jackpot-meter");
    if (meter) {
      meter.textContent = formatZar(this.jackpotCents);
    }
  }

  private startAuto(count: number) {
    this.autoSpinsRemaining = count;
    const btnAuto = document.getElementById("uvaan-btn-auto");
    if (btnAuto) {
      btnAuto.textContent = `⏹ STOP (${this.autoSpinsRemaining})`;
      btnAuto.classList.add("active");
    }
    void this.spin(false);
  }

  private stopAuto() {
    this.autoSpinsRemaining = 0;
    const btnAuto = document.getElementById("uvaan-btn-auto");
    if (btnAuto) {
      btnAuto.textContent = "🔁 AUTO";
      btnAuto.classList.remove("active");
    }
  }

  public async spin(isBonusFreeSpin = false): Promise<void> {
    if (this.isSpinning) return;

    const betCents = isBonusFreeSpin ? 0 : this.betOptionsCents[this.betIndex];
    const currentBalance = this.getBalanceCents();

    if (!isBonusFreeSpin && currentBalance < betCents) {
      this.soundBus.stop();
      this.showBanner("INSUFFICIENT DEMO BALANCE", "#ff3344");
      this.stopAuto();
      return;
    }

    this.isSpinning = true;
    this.animateLever();

    // Deduct bet if not free
    if (!isBonusFreeSpin) {
      this.onBalanceChange(currentBalance - betCents, -betCents, "🎰 Uvaan's Slot Spin Wager");
      this.stats.totalWageredCents += betCents;
    }

    this.stats.totalSpins++;
    this.updateStatsDisplay();

    // Sound
    this.soundBus.spin();

    // UI state
    const btnSpin = document.getElementById("uvaan-btn-spin") as HTMLButtonElement | null;
    if (btnSpin) {
      btnSpin.disabled = true;
      btnSpin.classList.add("spinning");
    }
    this.clearWinHighlights();
    this.showBanner(isBonusFreeSpin ? "🎁 BONUS SPIN IN PROGRESS..." : "⚡ SPINNING REELS...", "#ffd700");

    // Generate random outcome with realistic probabilities
    const result = this.evaluateOutcome(isBonusFreeSpin);

    // Animate Reels Spinning
    const spinDuration = this.isTurbo ? 500 : 1200;
    await this.animateReelSpin(result.grid, spinDuration);

    // Settle Spin
    this.currentGrid = result.grid;
    this.lastWinCents = result.totalWinCents;
    this.winningLines = result.lineWins;

    if (result.totalWinCents > 0) {
      this.stats.totalWonCents += result.totalWinCents;
      this.stats.hitCount++;
      if (result.totalWinCents > this.stats.biggestWinCents) {
        this.stats.biggestWinCents = result.totalWinCents;
      }

      // Credit balance
      const newBal = this.getBalanceCents() + result.totalWinCents;
      this.onBalanceChange(newBal, result.totalWinCents, `🎰 Uvaan's Slot Machine Win (+${formatZar(result.totalWinCents)})`);

      // Sound & Visuals
      if (result.isJackpot) {
        this.soundBus.win(true, true);
        this.showBanner(`💎 JACKPOT! +${formatZar(result.totalWinCents)} 💎`, "#ffd700", true);
        this.jackpotCents = 2500000; // reset
        this.updateJackpotDisplay();
      } else if (result.totalWinCents >= betCents * 10) {
        this.soundBus.win(true, false);
        this.showBanner(`🔥 BIG WIN! +${formatZar(result.totalWinCents)} (${(result.totalWinCents / Math.max(100, betCents)).toFixed(0)}x)`, "#ffd700");
      } else {
        this.soundBus.win(false, false);
        this.showBanner(`WIN +${formatZar(result.totalWinCents)}!`, "#00e676");
      }

      // Highlight winning lines
      this.highlightWinningLines(result.lineWins);
    } else {
      this.showBanner("TRY AGAIN", "#f7d2d5");
    }

    // Record in game history analytics
    const dummyGrid: SymbolId[][] = [
      ["gold", "gold", "gold"],
      ["gold", "gold", "gold"],
      ["gold", "gold", "gold"],
      ["gold", "gold", "gold"],
      ["gold", "gold", "gold"],
    ];
    historyService.recordSpin({
      roundId: `UVAAN-${Date.now()}`,
      grid: dummyGrid,
      stopIndices: [0, 0, 0],
      betCents,
      totalWinCents: result.totalWinCents,
      lineWins: result.lineWins.map((lw, idx) => ({
        paylineIndex: idx,
        symbol: "gold" as SymbolId,
        count: 3,
        winCents: lw.payoutCents,
        positions: [{ reel: 0, row: 1 }, { reel: 1, row: 1 }, { reel: 2, row: 1 }],
      })),
      scatterWin: null,
      balanceCents: this.getBalanceCents(),
      freeSpinsRemaining: 0,
      usedFreeSpin: isBonusFreeSpin,
      freeSpinsJustAwarded: result.isJackpot ? 5 : 0,
      serverSeed: "uvaan-vip-rng",
      timestamp: new Date().toISOString(),
    });

    // Update balances on screen
    this.updateBalanceMeter();
    this.updateStatsDisplay();

    // Reset button
    if (btnSpin) {
      btnSpin.disabled = false;
      btnSpin.classList.remove("spinning");
    }
    this.isSpinning = false;

    // Handle Auto Spins
    if (this.autoSpinsRemaining > 0) {
      this.autoSpinsRemaining--;
      const btnAuto = document.getElementById("uvaan-btn-auto");
      if (btnAuto) btnAuto.textContent = `⏹ STOP (${this.autoSpinsRemaining})`;

      if (this.autoSpinsRemaining > 0) {
        setTimeout(() => {
          if (this.autoSpinsRemaining > 0) void this.spin(false);
        }, this.isTurbo ? 350 : 800);
      } else {
        this.stopAuto();
      }
    }
  }

  private async animateReelSpin(finalGrid: string[][], baseDuration: number): Promise<void> {
    const strips: HTMLElement[] = [
      document.getElementById("uvaan-strip-0")!,
      document.getElementById("uvaan-strip-1")!,
      document.getElementById("uvaan-strip-2")!,
    ];

    strips.forEach((s) => s?.classList.add("blur-spin"));

    // Staggered stop for each reel
    for (let reelIdx = 0; reelIdx < 3; reelIdx++) {
      const delay = baseDuration + reelIdx * (this.isTurbo ? 100 : 250);
      await new Promise((resolve) => setTimeout(resolve, delay));

      const strip = strips[reelIdx];
      if (strip) {
        strip.classList.remove("blur-spin");
        // Update symbol content
        const symbols = finalGrid[reelIdx];
        strip.innerHTML = symbols
          .map((symKey, rowIdx) => {
            const sym = UVAAN_SYMBOLS[symKey] || UVAAN_SYMBOLS.CHERRY;
            return `
              <div class="uvaan-cell" data-reel="${reelIdx}" data-row="${rowIdx}">
                <div class="uvaan-symbol-icon" style="text-shadow: 0 0 12px ${sym.glowColor};">${sym.emoji}</div>
                <div class="uvaan-symbol-name" style="color: ${sym.color};">${sym.name}</div>
              </div>
            `;
          })
          .join("");

        // Reel stop sound
        this.soundBus.stopReel(reelIdx);
      }
    }
  }

  private evaluateOutcome(isBonusSpin: boolean): UvaanSpinResult {
    // Generate 3x3 grid from strips with weighted RNG
    const grid: string[][] = [[], [], []];

    for (let col = 0; col < 3; col++) {
      const strip = col === 0 ? REEL_STRIP_1 : col === 1 ? REEL_STRIP_2 : REEL_STRIP_3;
      const startIdx = Math.floor(Math.random() * strip.length);
      grid[col] = [
        strip[startIdx % strip.length],
        strip[(startIdx + 1) % strip.length],
        strip[(startIdx + 2) % strip.length],
      ];
    }

    // Boost chances on Bonus Spin
    if (isBonusSpin && Math.random() < 0.65) {
      grid[0][1] = "UVAAN_CROWN";
      grid[1][1] = "RED_DIAMOND";
      grid[2][1] = "RED_DIAMOND";
    }

    const betCents = isBonusSpin ? 1000 : this.betOptionsCents[this.betIndex];
    const lineBetCents = Math.floor(betCents / 5);
    const lineWins: UvaanLineWin[] = [];
    let totalWinCents = 0;
    let isJackpot = false;

    // Check each of the 5 paylines
    for (const pl of PAYLINES) {
      const sym0Key = grid[pl.path[0][0]][pl.path[0][1]];
      const sym1Key = grid[pl.path[1][0]][pl.path[1][1]];
      const sym2Key = grid[pl.path[2][0]][pl.path[2][1]];

      const sym0 = UVAAN_SYMBOLS[sym0Key];
      const sym1 = UVAAN_SYMBOLS[sym1Key];
      const sym2 = UVAAN_SYMBOLS[sym2Key];

      if (!sym0 || !sym1 || !sym2) continue;

      // 1. Check for 3 of a kind (with Wild substitution)
      let matchSymbolKey: string | null = null;
      if (sym0.id === sym1.id && sym1.id === sym2.id) {
        matchSymbolKey = sym0.id;
      } else if (sym0.isWild || sym1.isWild || sym2.isWild) {
        // Find non-wild symbol to match
        const nonWild = [sym0, sym1, sym2].find((s) => !s.isWild);
        if (nonWild) {
          const matchAll = [sym0, sym1, sym2].every((s) => s.isWild || s.id === nonWild.id);
          if (matchAll) matchSymbolKey = nonWild.id;
        } else {
          matchSymbolKey = "UVAAN_CROWN";
        }
      }

      if (matchSymbolKey) {
        const matchedDef = UVAAN_SYMBOLS[matchSymbolKey];
        let multiplier = matchedDef.multiplier3x;

        // Check Progressive Jackpot (3x Red Diamonds on Center line)
        if (pl.id === 1 && matchSymbolKey === "RED_DIAMOND") {
          isJackpot = true;
          const payout = this.jackpotCents;
          totalWinCents += payout;
          lineWins.push({
            lineId: pl.id,
            lineName: pl.name,
            symbol: matchSymbolKey,
            count: 3,
            multiplier: Math.round(payout / Math.max(1, lineBetCents)),
            payoutCents: payout,
            path: pl.path,
          });
          continue;
        }

        const payout = lineBetCents * multiplier;
        totalWinCents += payout;
        lineWins.push({
          lineId: pl.id,
          lineName: pl.name,
          symbol: matchSymbolKey,
          count: 3,
          multiplier,
          payoutCents: payout,
          path: pl.path,
        });
        continue;
      }

      // 2. Check for Any 3 Diamonds (Mix of Red and Black Diamonds)
      if (sym0.isDiamond && sym1.isDiamond && sym2.isDiamond) {
        const multiplier = 30;
        const payout = lineBetCents * multiplier;
        totalWinCents += payout;
        lineWins.push({
          lineId: pl.id,
          lineName: pl.name,
          symbol: "ANY_DIAMONDS",
          count: 3,
          multiplier,
          payoutCents: payout,
          path: pl.path,
        });
        continue;
      }

      // 3. Check for Cherries on line (2x or 1x)
      if (sym0.id === "CHERRY" && sym1.id === "CHERRY") {
        const multiplier = 4;
        const payout = lineBetCents * multiplier;
        totalWinCents += payout;
        lineWins.push({
          lineId: pl.id,
          lineName: pl.name,
          symbol: "CHERRY",
          count: 2,
          multiplier,
          payoutCents: payout,
          path: [pl.path[0], pl.path[1]],
        });
      } else if (sym0.id === "CHERRY") {
        const multiplier = 2;
        const payout = lineBetCents * multiplier;
        totalWinCents += payout;
        lineWins.push({
          lineId: pl.id,
          lineName: pl.name,
          symbol: "CHERRY",
          count: 1,
          multiplier,
          payoutCents: payout,
          path: [pl.path[0]],
        });
      }
    }

    return {
      grid,
      totalWinCents,
      lineWins,
      isJackpot,
      jackpotAmountCents: isJackpot ? this.jackpotCents : undefined,
    };
  }

  private highlightWinningLines(lineWins: UvaanLineWin[]) {
    lineWins.forEach((lw) => {
      // Light up laser line
      const laser = document.getElementById(`uvaan-laser-${lw.lineId}`);
      if (laser) laser.classList.add("active");

      // Light up winning cells
      lw.path.forEach(([reel, row]) => {
        const cell = document.querySelector(`.uvaan-cell[data-reel="${reel}"][data-row="${row}"]`);
        cell?.classList.add("winner");
      });
    });
  }

  private clearWinHighlights() {
    document.querySelectorAll(".uvaan-payline-laser").forEach((l) => l.classList.remove("active"));
    document.querySelectorAll(".uvaan-cell").forEach((c) => c.classList.remove("winner"));
  }

  private showBanner(text: string, color = "#ffffff", isJackpot = false) {
    const banner = document.getElementById("uvaan-win-display");
    const label = document.getElementById("uvaan-win-text");
    if (!banner || !label) return;

    label.textContent = text;
    label.style.color = color;
    banner.classList.toggle("jackpot", isJackpot);
  }

  private updateBalanceMeter() {
    const valBal = document.getElementById("uvaan-val-balance");
    const valWin = document.getElementById("uvaan-val-win");
    if (valBal) valBal.textContent = formatZar(this.getBalanceCents());
    if (valWin) valWin.textContent = formatZar(this.lastWinCents);
  }

  private updateStatsDisplay() {
    const spins = document.getElementById("uvaan-stat-spins");
    const wagered = document.getElementById("uvaan-stat-wagered");
    const won = document.getElementById("uvaan-stat-won");
    const biggest = document.getElementById("uvaan-stat-biggest");
    const rtp = document.getElementById("uvaan-stat-rtp");

    if (spins) spins.textContent = this.stats.totalSpins.toString();
    if (wagered) wagered.textContent = formatZar(this.stats.totalWageredCents);
    if (won) won.textContent = formatZar(this.stats.totalWonCents);
    if (biggest) biggest.textContent = formatZar(this.stats.biggestWinCents);
    if (rtp) {
      rtp.textContent =
        this.stats.totalWageredCents > 0
          ? ((this.stats.totalWonCents / this.stats.totalWageredCents) * 100).toFixed(1) + "%"
          : "100.0%";
    }
  }
}
