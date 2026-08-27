import { Application } from "pixi.js";
import {
  formatZar,
  t,
  type GameConfig,
  type Locale,
  type SessionState,
  type SpinResult,
} from "@sa-slot/shared";
import {
  createSession,
  depositFunds,
  fetchCryptoRates,
  getEmbedParams,
  spin,
  type CryptoRatesResponse,
} from "./api.js";
import { SoundBus } from "./audio.js";
import { GameScene } from "./gameScene.js";
import { historyService } from "./historyService.js";
import { SYMBOL_COLORS } from "./symbols.js";
import { UvaanSlotMachine } from "./uvaanSlotService.js";

const sound = new SoundBus();

let locale: Locale = "en";
let config!: GameConfig;
let session!: SessionState;
let scene!: GameScene;
let pixiApp!: Application;
let uvaanSlotMachine: UvaanSlotMachine | null = null;
let betIndex = 0;
let lastWinCents = 0;
let busy = false;
let turbo = false;
let reducedMotion =
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Autoplay state
let autoRemaining = 0;
let autoStopWinCents: number | undefined;
let autoStopBalanceCents: number | undefined;
let freeSpinsBanked = false;

// Active View Routing
type AppView = "game" | "cashier" | "history" | "session" | "paytable";
let currentView: AppView = "game";
let cashierTab: "card" | "crypto" | "uvaan-slot" | "eft" | "ledger" = "card";

// Deposit transaction history (in-memory & persisted locally)
interface DepositTx {
  id: string;
  time: string;
  amountCents: number;
  method: string;
  reference: string;
}
const depositTransactions: DepositTx[] = [
  {
    id: "TX-1001",
    time: "Session Start",
    amountCents: 100000,
    method: "Demo Initial Grant",
    reference: "WELCOME-BONUS",
  },
];

let cachedCryptoRates: CryptoRatesResponse | null = null;
let sessionStartTime = Date.now();

// Progressive Jackpot State
const INITIAL_JACKPOT_CENTS = 5000000; // R50,000.00 initial pool seed
let jackpotCents =
  Number(localStorage.getItem("slot_jackpot_cents")) || INITIAL_JACKPOT_CENTS;
let displayedJackpotCents = jackpotCents;
let jackpotAnimFrame: number | null = null;

const el = {
  // Navigation & Header
  navBrandBtn: document.getElementById("nav-brand-btn")!,
  navTabGame: document.getElementById("nav-tab-game")!,
  navTabCashier: document.getElementById("nav-tab-cashier")!,
  navTabHistory: document.getElementById("nav-tab-history")!,
  navTabSession: document.getElementById("nav-tab-session")!,
  navTabPaytable: document.getElementById("nav-tab-paytable")!,
  navValBalance: document.getElementById("nav-val-balance")!,
  navBalanceBtn: document.getElementById("nav-balance-btn")!,
  navBtnSound: document.getElementById("nav-btn-sound")!,
  navBtnLang: document.getElementById("nav-btn-lang")!,
  navHistoryCount: document.getElementById("nav-history-count")!,

  // View Containers
  viewGame: document.getElementById("view-game")!,
  viewCashier: document.getElementById("view-cashier")!,
  viewHistory: document.getElementById("view-history")!,
  viewSession: document.getElementById("view-session")!,
  viewPaytable: document.getElementById("view-paytable")!,

  // Game View Specifics
  balance: document.getElementById("val-balance")!,
  bet: document.getElementById("val-bet")!,
  win: document.getElementById("val-win")!,
  betDisplay: document.getElementById("bet-display")!,
  jackpotMeter: document.getElementById("jackpot-meter")!,
  jackpotValue: document.getElementById("val-jackpot")!,
  lblJackpot: document.getElementById("lbl-jackpot")!,
  spinBtn: document.getElementById("spin-btn") as HTMLButtonElement,
  banner: document.getElementById("banner")!,
  footerLegal: document.getElementById("footer-legal")!,
  rgLink: document.getElementById("rg-link") as HTMLAnchorElement,
  fsBadge: document.getElementById("fs-badge")!,
  fsBadgeText: document.getElementById("fs-badge-text")!,
  btnFsToggle: document.getElementById("btn-fs-toggle") as HTMLButtonElement,
  toast: document.getElementById("toast")!,
  lblBalance: document.getElementById("lbl-balance")!,
  lblBet: document.getElementById("lbl-bet")!,
  lblWin: document.getElementById("lbl-win")!,
  btnTurbo: document.getElementById("btn-turbo")!,
  btnSound: document.getElementById("btn-sound")!,
  btnMotion: document.getElementById("btn-motion")!,
  btnLang: document.getElementById("btn-lang")!,
  btnAuto: document.getElementById("btn-auto")!,
  btnBreakdown: document.getElementById("btn-breakdown")!,
  btnCashier: document.getElementById("btn-cashier")!,
  btnGridLines: document.getElementById("btn-grid-lines")!,
  btnHistoryQuick: document.getElementById("btn-history-quick")!,
  balanceMeterBox: document.getElementById("balance-meter-box")!,
  btnPaytable: document.getElementById("btn-paytable")!,
  btnRules: document.getElementById("btn-rules")!,
  btnSession: document.getElementById("btn-session")!,
  betMinus: document.getElementById("bet-minus") as HTMLButtonElement,
  betPlus: document.getElementById("bet-plus") as HTMLButtonElement,
};

function updateJackpotDisplay(targetCents: number, animate = true) {
  jackpotCents = targetCents;
  localStorage.setItem("slot_jackpot_cents", jackpotCents.toString());

  if (!animate) {
    displayedJackpotCents = jackpotCents;
    if (el.jackpotValue) el.jackpotValue.textContent = formatZar(displayedJackpotCents);
    return;
  }

  const startValue = displayedJackpotCents;
  const startTime = performance.now();
  const duration = 750;

  if (jackpotAnimFrame) cancelAnimationFrame(jackpotAnimFrame);

  const step = (now: number) => {
    const progress = Math.min(1, (now - startTime) / duration);
    displayedJackpotCents = Math.round(
      startValue + (targetCents - startValue) * progress
    );
    if (el.jackpotValue) el.jackpotValue.textContent = formatZar(displayedJackpotCents);

    if (progress < 1) {
      jackpotAnimFrame = requestAnimationFrame(step);
    } else {
      displayedJackpotCents = targetCents;
      if (el.jackpotValue) el.jackpotValue.textContent = formatZar(targetCents);
      jackpotAnimFrame = null;
    }
  };
  jackpotAnimFrame = requestAnimationFrame(step);
}

function accumulateJackpot(betCents: number) {
  const contribution = Math.max(1, Math.round(betCents * 0.025));
  const newTarget = jackpotCents + contribution;

  if (el.jackpotMeter) {
    el.jackpotMeter.classList.remove("pulse-bet");
    void el.jackpotMeter.offsetWidth;
    el.jackpotMeter.classList.add("pulse-bet");
  }

  updateJackpotDisplay(newTarget, true);
}

// Live background ticker for progressive jackpot pool
setInterval(() => {
  if (!busy) {
    const liveTick = Math.floor(Math.random() * 4) + 1;
    jackpotCents += liveTick;
    localStorage.setItem("slot_jackpot_cents", jackpotCents.toString());
    displayedJackpotCents = jackpotCents;
    if (el.jackpotValue) el.jackpotValue.textContent = formatZar(jackpotCents);
  }
}, 3500);

function currentBet(): number {
  return config.betting.betStepsCents[betIndex];
}

function refreshMeters() {
  const formattedBal = formatZar(session.balanceCents);
  if (el.balance) el.balance.textContent = formattedBal;
  if (el.navValBalance) el.navValBalance.textContent = formattedBal;
  if (el.bet) el.bet.textContent = formatZar(currentBet());
  if (el.betDisplay) el.betDisplay.textContent = formatZar(currentBet());
  if (el.win) el.win.textContent = formatZar(lastWinCents);

  if (el.navHistoryCount) {
    el.navHistoryCount.textContent = historyService.getCount().toString();
  }

  const hasFs = session.freeSpinsRemaining > 0;
  if (el.fsBadge) {
    el.fsBadge.classList.toggle("show", hasFs);
    el.fsBadge.classList.toggle("banked", freeSpinsBanked && hasFs);
  }

  if (hasFs) {
    if (freeSpinsBanked) {
      if (el.fsBadgeText) el.fsBadgeText.textContent = `🎁 BANKED: ${session.freeSpinsRemaining}`;
      if (el.btnFsToggle) el.btnFsToggle.textContent = t(locale, "resumeFreeSpins");
      if (el.spinBtn) {
        el.spinBtn.classList.remove("free");
        el.spinBtn.textContent =
          autoRemaining > 0
            ? `${t(locale, "stop")} (${autoRemaining})`
            : t(locale, "spin");
      }
      if (el.betMinus) el.betMinus.disabled = busy || autoRemaining > 0;
      if (el.betPlus) el.betPlus.disabled = busy || autoRemaining > 0;
    } else {
      if (el.fsBadgeText) el.fsBadgeText.textContent = `⚡ ${t(locale, "freeSpins")}: ${session.freeSpinsRemaining}`;
      if (el.btnFsToggle) el.btnFsToggle.textContent = t(locale, "saveForLater");
      if (el.spinBtn) {
        el.spinBtn.classList.add("free");
        el.spinBtn.textContent =
          autoRemaining > 0
            ? `${t(locale, "stop")} (${autoRemaining})`
            : t(locale, "freeSpins");
      }
      if (el.betMinus) el.betMinus.disabled = true;
      if (el.betPlus) el.betPlus.disabled = true;
    }
  } else {
    freeSpinsBanked = false;
    if (el.spinBtn) {
      el.spinBtn.classList.remove("free");
      el.spinBtn.textContent =
        autoRemaining > 0
          ? `${t(locale, "stop")} (${autoRemaining})`
          : t(locale, "spin");
    }
    if (el.betMinus) el.betMinus.disabled = busy || autoRemaining > 0;
    if (el.betPlus) el.betPlus.disabled = busy || autoRemaining > 0;
  }
}

function toggleFreeSpinsBank() {
  if (session.freeSpinsRemaining <= 0) return;
  freeSpinsBanked = !freeSpinsBanked;
  refreshMeters();
  showToast(
    freeSpinsBanked
      ? `🎁 Free Spins Saved! (${session.freeSpinsRemaining})`
      : `⚡ Resuming Free Spins!`
  );
}

function applyI18n() {
  if (el.banner) el.banner.textContent = t(locale, "demoBanner");
  if (el.lblBalance) el.lblBalance.textContent = t(locale, "balance");
  if (el.lblBet) el.lblBet.textContent = t(locale, "bet");
  if (el.lblWin) el.lblWin.textContent = t(locale, "win");
  if (el.lblJackpot) el.lblJackpot.textContent = t(locale, "progressiveJackpot");
  if (el.btnBreakdown) el.btnBreakdown.textContent = t(locale, "winBreakdown");
  if (el.btnPaytable) el.btnPaytable.textContent = t(locale, "paytable");
  if (el.btnRules) el.btnRules.textContent = t(locale, "rules");
  if (el.btnSession) el.btnSession.textContent = t(locale, "session");

  const soundLabel = sound.enabled ? "🔊" : "🔇";
  if (el.navBtnSound) el.navBtnSound.textContent = soundLabel;
  if (el.btnSound) {
    el.btnSound.textContent = sound.enabled
      ? t(locale, "sound")
      : `${t(locale, "sound")} off`;
  }

  if (el.btnMotion) {
    el.btnMotion.textContent = reducedMotion
      ? t(locale, "reducedMotion")
      : t(locale, "reducedMotion");
    el.btnMotion.classList.toggle("active", reducedMotion);
  }
  if (el.btnTurbo) el.btnTurbo.classList.toggle("active", turbo);

  const langText = locale === "en" ? "EN" : "ZU";
  if (el.navBtnLang) el.navBtnLang.textContent = langText;
  if (el.btnLang) el.btnLang.textContent = locale === "en" ? "EN | ZU" : "ZU | EN";

  if (el.footerLegal) {
    el.footerLegal.textContent =
      config.market.legalFooter || t(locale, "footerLegal");
  }
  if (el.rgLink) {
    el.rgLink.href = config.market.responsibleGamblingUrl;
    el.rgLink.textContent = t(locale, "rgLink");
  }

  const rulesBody = document.getElementById("rules-body");
  if (rulesBody) rulesBody.textContent = t(locale, "rulesBody");
  const rulesRtp = document.getElementById("rules-rtp");
  if (rulesRtp) {
    rulesRtp.textContent = `${t(locale, "rtp")}: ${config.rtpLabel} · ${t(locale, "paylineHint")}`;
  }

  refreshMeters();
}

function showToast(msg: string, ms = 1600) {
  if (!el.toast) return;
  el.toast.textContent = msg;
  el.toast.classList.add("show");
  setTimeout(() => el.toast.classList.remove("show"), ms);
}

function openModal(id: string) {
  document.getElementById(id)?.classList.add("open");
}
function closeModal(id: string) {
  document.getElementById(id)?.classList.remove("open");
}

/* =========================================================================
   PAGE VIEW ROUTER
   ========================================================================= */

function switchView(view: AppView) {
  currentView = view;

  // Update navbar active state
  const navTabs: Record<AppView, HTMLElement> = {
    game: el.navTabGame,
    cashier: el.navTabCashier,
    history: el.navTabHistory,
    session: el.navTabSession,
    paytable: el.navTabPaytable,
  };

  Object.entries(navTabs).forEach(([v, btn]) => {
    if (btn) btn.classList.toggle("active", v === view);
  });

  // Update view visibility
  const viewContainers: Record<AppView, HTMLElement> = {
    game: el.viewGame,
    cashier: el.viewCashier,
    history: el.viewHistory,
    session: el.viewSession,
    paytable: el.viewPaytable,
  };

  Object.entries(viewContainers).forEach(([v, container]) => {
    if (container) container.classList.toggle("active", v === view);
  });

  // Render view-specific content
  if (view === "cashier") {
    void buildCashierPage();
  } else if (view === "history") {
    const histContainer = document.getElementById("page-history-content");
    if (histContainer) {
      historyService.render(histContainer, () => switchView("game"));
    }
  } else if (view === "session") {
    buildSessionPage();
  } else if (view === "paytable") {
    buildPaytablePage();
  } else if (view === "game") {
    // Trigger resize on pixi renderer
    const host = document.getElementById("game-root");
    if (host && pixiApp && scene) {
      const { clientWidth, clientHeight } = host;
      if (clientWidth > 0 && clientHeight > 0) {
        pixiApp.renderer.resize(clientWidth, clientHeight);
        scene.resize(clientWidth, clientHeight);
      }
    }
  }
}

/* =========================================================================
   DEDICATED CASHIER & LIVE CRYPTO PAGE
   ========================================================================= */

async function buildCashierPage() {
  const container = document.getElementById("page-cashier-content");
  if (!container) return;

  const tabCard = document.getElementById("page-tab-card");
  const tabCrypto = document.getElementById("page-tab-crypto");
  const tabUvaanSlot = document.getElementById("page-tab-uvaan-slot");
  const tabEft = document.getElementById("page-tab-eft");
  const tabLedger = document.getElementById("page-tab-ledger");

  tabCard?.classList.toggle("active", cashierTab === "card");
  tabCrypto?.classList.toggle("active", cashierTab === "crypto");
  tabUvaanSlot?.classList.toggle("active", cashierTab === "uvaan-slot");
  tabEft?.classList.toggle("active", cashierTab === "eft");
  tabLedger?.classList.toggle("active", cashierTab === "ledger");

  if (cashierTab === "uvaan-slot") {
    if (uvaanSlotMachine) {
      uvaanSlotMachine.render(container);
    }
    return;
  }

  if (cashierTab === "card") {
    container.innerHTML = `
      <!-- Promo Banner for Uvaan's Slot Machine -->
      <div style="background: linear-gradient(135deg, rgba(255, 42, 59, 0.18), rgba(255, 215, 0, 0.12)); border: 1.5px solid #ffd700; border-radius: 12px; padding: 10px 14px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 26px;">🎰</span>
          <div>
            <div style="font-family: Rajdhani, sans-serif; font-size: 15px; font-weight: 800; color: #ffd700; letter-spacing: 0.05em;">
              UVAAN'S VIP DIAMOND & CRYPTO SLOT MACHINE
            </div>
            <div style="font-size: 11px; color: #f7d2d5;">
              Play the 3-Reel Classic Cabinet directly in the Cashier to win instant ZAR Balance Multipliers!
            </div>
          </div>
        </div>
        <button type="button" class="btn-jump-uvaan-slot chip" style="background: linear-gradient(135deg, #ffd700, #ff8f00); color: #000; font-weight: 800; font-size: 12px; padding: 4px 12px; border-color: #ffd700; cursor: pointer;">
          ★ PLAY UVAAN'S SLOT
        </button>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; align-items: start;">
        <!-- Card Visual Preview -->
        <div>
          <div class="card-preview-container">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <span style="font-family: Rajdhani, sans-serif; font-size: 15px; font-weight: 700; color: #ffd700; letter-spacing: 0.1em;">DEMO VISA PLATINUM</span>
              <span style="font-size: 18px; color: #fff;">💎</span>
            </div>
            <div class="card-chip-sim"></div>
            <div class="card-num-sim" id="card-sim-digits">4242 •••• •••• 8892</div>
            <div class="card-info-sim">
              <div>
                <div style="opacity: 0.7; font-size: 9px;">CARDHOLDER</div>
                <div style="font-weight: 700; font-size: 13px;" id="card-sim-name">DEMO PLAYER</div>
              </div>
              <div>
                <div style="opacity: 0.7; font-size: 9px;">EXPIRES</div>
                <div style="font-weight: 700; font-size: 13px;" id="card-sim-exp">09/28</div>
              </div>
            </div>
          </div>
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,42,59,0.25); border-radius: 10px; padding: 12px; font-size: 12px; color: #e0adb1; line-height: 1.5;">
            🔒 <strong>Instant Simulation</strong>: Card deposits are credited to your ZAR Demo Balance instantly with zero network delay or KYC wait.
          </div>
        </div>

        <!-- Card Deposit Form -->
        <div style="background: rgba(0,0,0,0.5); border: 1px solid rgba(255,42,59,0.3); border-radius: 12px; padding: 18px;">
          <h3 style="margin: 0 0 12px; font-family: Rajdhani, sans-serif; font-size: 18px; color: #ff4d5a;">Credit / Debit Card Deposit</h3>
          <form id="form-card-deposit" style="display: flex; flex-direction: column; gap: 12px;">
            <div class="field" style="margin: 0;">
              <label>Cardholder Name</label>
              <input type="text" id="card-holder-input" value="Demo Player" required style="width: 180px;" />
            </div>
            <div class="field" style="margin: 0;">
              <label>Card Number</label>
              <input type="text" id="card-num-input" value="4242 •••• •••• 8892" maxlength="19" required style="width: 180px;" />
            </div>
            <div style="display: flex; gap: 8px;">
              <div class="field" style="margin: 0; flex: 1;">
                <label>Expiry</label>
                <input type="text" value="09/28" required style="width: 70px;" />
              </div>
              <div class="field" style="margin: 0; flex: 1;">
                <label>CVV</label>
                <input type="password" value="123" maxlength="4" required style="width: 60px;" />
              </div>
            </div>

            <div style="margin-top: 4px;">
              <label style="display: block; font-size: 12px; color: #e0adb1; margin-bottom: 6px;">Choose Deposit Amount (ZAR)</label>
              <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px;">
                <button type="button" class="chip quick-amt" data-val="100">R100</button>
                <button type="button" class="chip quick-amt" data-val="250">R250</button>
                <button type="button" class="chip quick-amt" data-val="500">R500</button>
                <button type="button" class="chip quick-amt" data-val="1000">R1 000</button>
                <button type="button" class="chip quick-amt" data-val="2500">R2 500</button>
                <button type="button" class="chip quick-amt" data-val="5000">R5 000</button>
              </div>
              <div class="field" style="margin: 0;">
                <label>Custom Amount (R)</label>
                <input type="number" id="deposit-amount-input" value="500" min="50" max="100000" step="50" style="width: 120px; font-weight: 700; color: #ffd700;" required />
              </div>
            </div>

            <button type="submit" id="btn-submit-deposit" class="btn-action-primary" style="margin-top: 8px; justify-content: center; padding: 12px; font-size: 16px; background: linear-gradient(135deg, #00c853 0%, #009624 100%); border-color: #00e676;">
              💳 Deposit & Credit R500
            </button>
          </form>
        </div>
      </div>
    `;
    wireCashierEvents("card");
  } else if (cashierTab === "crypto") {
    container.innerHTML = `
      <!-- Promo Banner for Uvaan's Slot Machine -->
      <div style="background: linear-gradient(135deg, rgba(255, 42, 59, 0.18), rgba(255, 215, 0, 0.12)); border: 1.5px solid #ffd700; border-radius: 12px; padding: 10px 14px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 26px;">🎰</span>
          <div>
            <div style="font-family: Rajdhani, sans-serif; font-size: 15px; font-weight: 800; color: #ffd700; letter-spacing: 0.05em;">
              UVAAN'S VIP DIAMOND & CRYPTO SLOT MACHINE
            </div>
            <div style="font-size: 11px; color: #f7d2d5;">
              Spin the 3-Reel Classic Cabinet directly in the Cashier to win instant ZAR Balance Multipliers!
            </div>
          </div>
        </div>
        <button type="button" class="btn-jump-uvaan-slot chip" style="background: linear-gradient(135deg, #ffd700, #ff8f00); color: #000; font-weight: 800; font-size: 12px; padding: 4px 12px; border-color: #ffd700; cursor: pointer;">
          ★ PLAY UVAAN'S SLOT
        </button>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
        <div>
          <span style="font-size: 13px; color: #00e676; font-weight: 700;">● LIVE REAL-TIME CRYPTO TO ZAR EXCHANGE</span>
          <span style="font-size: 11px; color: #e0adb1; margin-left: 8px;">Source: CoinGecko & South African Crypto Desk</span>
        </div>
        <button type="button" id="btn-refresh-crypto" class="chip" style="font-size: 11px; padding: 2px 8px;">🔄 Refresh Rates</button>
      </div>

      <!-- Live Crypto Price Cards Grid -->
      <div class="crypto-grid" id="crypto-cards-grid">
        <div style="grid-column: 1/-1; text-align: center; padding: 18px; color: #e0adb1;">Fetching live cryptocurrency rates...</div>
      </div>

      <!-- Interactive Bidirectional Converter & Crypto Deposit -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-top: 16px;">
        <div style="background: rgba(0,0,0,0.5); border: 1px solid rgba(255,42,59,0.3); border-radius: 12px; padding: 16px;">
          <h3 style="margin: 0 0 12px; font-family: Rajdhani, sans-serif; font-size: 18px; color: #ffd700;">🪙 Instant Crypto Deposit Flow</h3>
          <form id="form-crypto-deposit" style="display: flex; flex-direction: column; gap: 10px;">
            <div class="field" style="margin: 0;">
              <label>Select Cryptocurrency</label>
              <select id="crypto-select" style="width: 170px;">
                <option value="BTC">Bitcoin (BTC)</option>
                <option value="ETH">Ethereum (ETH)</option>
                <option value="USDT" selected>Tether USD (USDT - TRC20)</option>
                <option value="SOL">Solana (SOL)</option>
                <option value="XRP">Ripple (XRP)</option>
              </select>
            </div>
            <div class="field" style="margin: 0;">
              <label>Amount in ZAR (R)</label>
              <input type="number" id="deposit-amount-input" value="1000" min="100" max="250000" step="100" style="width: 120px; font-weight: 700; color: #ffd700;" required />
            </div>

            <!-- Converted Live Estimation Box -->
            <div id="crypto-calc-preview" style="background: rgba(255,215,0,0.08); border: 1px solid rgba(255,215,0,0.35); padding: 10px; border-radius: 8px; font-size: 13px; color: #ffd700; line-height: 1.4;">
              Calculating live token conversion...
            </div>

            <button type="submit" id="btn-submit-deposit" class="btn-action-primary" style="margin-top: 6px; justify-content: center; padding: 12px; font-size: 16px;">
              🪙 Simulate Crypto Deposit & Credit ZAR
            </button>
          </form>
        </div>

        <!-- Simulated Web3 Deposit QR Box -->
        <div style="background: rgba(0,0,0,0.5); border: 1px solid rgba(255,42,59,0.3); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; align-items: center; text-align: center;">
          <h4 style="margin: 0 0 8px; font-family: Rajdhani, sans-serif; font-size: 16px; color: #fff;">Simulated Deposit Address</h4>
          <!-- Simulated SVG QR Code -->
          <div style="background: #ffffff; padding: 8px; border-radius: 8px; margin-bottom: 8px;">
            <svg width="110" height="110" viewBox="0 0 24 24" fill="#080001">
              <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14 2h2v2h-2v-2zm-4-4h2v2h-2v-2zm2 2h2v2h-2v-2zm2-2h2v2h-2v-2zm0 4h2v2h-2v-2zm-4 2h2v2h-2v-2zm-2-4h2v2h-2v-2z"/>
            </svg>
          </div>
          <div style="font-family: monospace; font-size: 11px; color: #00e676; background: rgba(0,0,0,0.6); padding: 4px 8px; border-radius: 4px; word-break: break-all; margin-bottom: 6px;" id="sim-wallet-addr">
            0x71C...4d9B29 (TRC20 / ERC20)
          </div>
          <p style="font-size: 11px; color: #e0adb1; margin: 0;">
            1 confirmation required (~10 sec). Network fee: <strong>0.00 ZAR</strong> (Sponsored by Demo Kit).
          </p>
        </div>
      </div>
    `;

    await loadAndRenderCryptoRates();
    wireCashierEvents("crypto");
  } else if (cashierTab === "eft") {
    container.innerHTML = `
      <div style="max-width: 600px; margin: 0 auto; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,42,59,0.3); border-radius: 12px; padding: 20px;">
        <h3 style="margin: 0 0 8px; font-family: Rajdhani, sans-serif; font-size: 20px; color: #ff4d5a;">South African Instant EFT</h3>
        <p style="font-size: 13px; color: #e0adb1; margin: 0 0 16px;">
          Direct, instant bank payment simulation supporting all major South African banks.
        </p>

        <form id="form-eft-deposit" style="display: flex; flex-direction: column; gap: 14px;">
          <div class="field" style="margin: 0;">
            <label>Select Your Bank</label>
            <select id="bank-select" style="width: 200px;">
              <option value="Capitec">Capitec Bank</option>
              <option value="FNB">FNB / First National Bank</option>
              <option value="Standard Bank">Standard Bank</option>
              <option value="Nedbank">Nedbank</option>
              <option value="Absa">Absa</option>
              <option value="TymeBank">TymeBank</option>
              <option value="Investec">Investec</option>
            </select>
          </div>

          <div>
            <label style="display: block; font-size: 12px; color: #e0adb1; margin-bottom: 6px;">Select Amount (ZAR)</label>
            <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px;">
              <button type="button" class="chip quick-amt" data-val="250">R250</button>
              <button type="button" class="chip quick-amt" data-val="500">R500</button>
              <button type="button" class="chip quick-amt" data-val="1000">R1 000</button>
              <button type="button" class="chip quick-amt" data-val="2000">R2 000</button>
              <button type="button" class="chip quick-amt" data-val="5000">R5 000</button>
            </div>
            <div class="field" style="margin: 0;">
              <label>Deposit Amount (R)</label>
              <input type="number" id="deposit-amount-input" value="500" min="50" max="50000" step="50" style="width: 120px; font-weight: 700; color: #ffd700;" required />
            </div>
          </div>

          <div style="background: rgba(0,230,118,0.06); border: 1px solid rgba(0,230,118,0.3); border-radius: 8px; padding: 10px; font-size: 12px; color: #00e676;">
            ✓ Simulated Ozow / SiD / Stitch Instant EFT integration with immediate balance credit.
          </div>

          <button type="submit" id="btn-submit-deposit" class="btn-action-primary" style="justify-content: center; padding: 12px; font-size: 16px; background: linear-gradient(135deg, #00c853 0%, #009624 100%); border-color: #00e676;">
            🏦 Authorize Instant EFT (R500)
          </button>
        </form>
      </div>
    `;
    wireCashierEvents("instant_eft");
  } else {
    // Transaction History Ledger
    const txRows = depositTransactions
      .map(
        (tx) => `
      <tr>
        <td style="font-family: monospace; color: #ff4d5a; font-weight: 700;">${tx.id}</td>
        <td style="font-size: 12px; color: #e0adb1;">${tx.time}</td>
        <td style="font-weight: 600;">${tx.method}</td>
        <td style="font-family: monospace; font-size: 11px; color: #ffd700;">${tx.reference}</td>
        <td style="font-family: Rajdhani, sans-serif; font-weight: 700; color: #00e676; font-size: 15px;">+${formatZar(tx.amountCents)}</td>
        <td><span class="badge-win">Completed</span></td>
      </tr>
    `
      )
      .join("");

    container.innerHTML = `
      <div style="background: rgba(0,0,0,0.5); border: 1px solid rgba(255,42,59,0.3); border-radius: 12px; padding: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="margin: 0; font-family: Rajdhani, sans-serif; font-size: 18px; color: #ffffff;">📋 Session Deposit Ledger</h3>
          <span style="font-size: 12px; color: #00e676; font-weight: 700;">Total Added: ${formatZar(depositTransactions.reduce((acc, t) => acc + t.amountCents, 0))}</span>
        </div>
        <div class="history-table-wrapper">
          <table class="history-table">
            <thead>
              <tr>
                <th>Tx ID</th>
                <th>Time</th>
                <th>Payment Method</th>
                <th>Reference</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${txRows}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
}

async function loadAndRenderCryptoRates() {
  const grid = document.getElementById("crypto-cards-grid");
  if (!grid) return;

  try {
    const data = await fetchCryptoRates();
    cachedCryptoRates = data;
    if (data.rates) {
      grid.innerHTML = Object.entries(data.rates)
        .map(([sym, r]) => {
          const isUp = r.change24h >= 0;
          return `
            <div class="crypto-rate-card" data-sym="${sym}">
              <div class="crypto-card-top">
                <span class="crypto-sym">${sym}</span>
                <span class="crypto-chg ${isUp ? "up" : "down"}">${isUp ? "+" : ""}${r.change24h}%</span>
              </div>
              <div class="crypto-zar-price">R${r.zar >= 1000 ? r.zar.toLocaleString() : r.zar.toFixed(2)}</div>
              <div class="crypto-usd-price">$${r.usd.toLocaleString()} USD</div>
            </div>
          `;
        })
        .join("");

      updateCryptoCalculator();
    }
  } catch (err) {
    console.warn("Crypto rate load error", err);
    if (grid) {
      grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:#ff4d5a; font-size:12px;">Unable to load live rates. Using default rates.</div>`;
    }
  }
}

function updateCryptoCalculator() {
  const preview = document.getElementById("crypto-calc-preview");
  const amtInput = document.getElementById("deposit-amount-input") as HTMLInputElement | null;
  const select = document.getElementById("crypto-select") as HTMLSelectElement | null;
  if (!preview || !amtInput || !select) return;

  const zarAmt = parseFloat(amtInput.value || "1000");
  const sym = select.value;
  const rateInfo = cachedCryptoRates?.rates[sym];

  if (rateInfo && rateInfo.zar > 0) {
    const tokens = zarAmt / rateInfo.zar;
    const tokenDisplay = tokens < 0.01 ? tokens.toFixed(6) : tokens.toFixed(3);
    preview.innerHTML = `
      Estimated Crypto: <strong>${tokenDisplay} ${sym}</strong> @ R${rateInfo.zar.toLocaleString()} / ${sym}
      <div style="font-size: 11px; opacity: 0.8; margin-top: 2px;">≈ $${((zarAmt / rateInfo.zar) * rateInfo.usd).toFixed(2)} USD value</div>
    `;
  }
}

function wireCashierEvents(method: "card" | "crypto" | "instant_eft") {
  const amtInput = document.getElementById("deposit-amount-input") as HTMLInputElement | null;
  const quickBtns = document.querySelectorAll(".quick-amt");
  const submitBtn = document.getElementById("btn-submit-deposit") as HTMLButtonElement | null;
  const cardHolderInput = document.getElementById("card-holder-input") as HTMLInputElement | null;
  const cardNumInput = document.getElementById("card-num-input") as HTMLInputElement | null;
  const cryptoSelect = document.getElementById("crypto-select") as HTMLSelectElement | null;

  // Live card preview typing
  cardHolderInput?.addEventListener("input", () => {
    const elName = document.getElementById("card-sim-name");
    if (elName) elName.textContent = cardHolderInput.value.toUpperCase() || "DEMO PLAYER";
  });
  cardNumInput?.addEventListener("input", () => {
    const elNum = document.getElementById("card-sim-digits");
    if (elNum) elNum.textContent = cardNumInput.value || "•••• •••• •••• ••••";
  });

  // Quick Amount presets
  quickBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const val = btn.getAttribute("data-val");
      if (val && amtInput) {
        amtInput.value = val;
        if (submitBtn) {
          if (method === "card") submitBtn.textContent = `💳 Deposit & Credit R${val}`;
          if (method === "instant_eft") submitBtn.textContent = `🏦 Authorize Instant EFT (R${val})`;
        }
        if (method === "crypto") updateCryptoCalculator();
      }
    });
  });

  amtInput?.addEventListener("input", () => {
    const val = amtInput.value || "0";
    if (submitBtn) {
      if (method === "card") submitBtn.textContent = `💳 Deposit & Credit R${val}`;
      if (method === "instant_eft") submitBtn.textContent = `🏦 Authorize Instant EFT (R${val})`;
    }
    if (method === "crypto") updateCryptoCalculator();
  });

  cryptoSelect?.addEventListener("change", () => {
    updateCryptoCalculator();
  });

  document.getElementById("btn-refresh-crypto")?.addEventListener("click", () => {
    void loadAndRenderCryptoRates();
  });

  // Submit deposit
  const form = document.querySelector("#page-cashier-content form");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const amt = parseFloat(amtInput?.value || "500");
    if (!amt || amt <= 0) return;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Processing deposit transaction...";
    }

    try {
      const amtCents = Math.round(amt * 100);
      const res = await depositFunds(session.sessionId, amtCents, method, {
        cardLast4: "8892",
        cryptoSymbol: method === "crypto" ? cryptoSelect?.value || "USDT" : undefined,
      });

      session.balanceCents = res.balanceCents;
      refreshMeters();

      // Log transaction
      const now = new Date();
      depositTransactions.unshift({
        id: `TX-${Math.floor(Math.random() * 89999 + 10000)}`,
        time: now.toLocaleTimeString(),
        amountCents: amtCents,
        method: method === "card" ? "Visa/Mastercard" : method === "crypto" ? `Crypto (${cryptoSelect?.value || "USDT"})` : "Instant EFT SA",
        reference: `DEMO-${Date.now().toString().slice(-6)}`,
      });

      showToast(`✅ +R${amt.toFixed(2)} Deposited! New Balance: ${formatZar(session.balanceCents)}`, 2500);
      sound.win(false, false);

      // Return to game after a moment or refresh cashier
      setTimeout(() => {
        switchView("game");
      }, 900);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Deposit failed";
      showToast(`❌ ${msg}`, 2200);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

/* =========================================================================
   DEDICATED SESSION & RTP PAGE
   ========================================================================= */

function buildSessionPage() {
  const container = document.getElementById("page-session-content");
  if (!container) return;

  const durationSec = Math.floor((Date.now() - sessionStartTime) / 1000);
  const minutes = Math.floor(durationSec / 60);
  const seconds = durationSec % 60;
  const timeFormatted = `${minutes}m ${seconds}s`;

  const totalBet = session.stats.totalBetCents;
  const totalWin = session.stats.totalWinCents;
  const actualRtp = totalBet > 0 ? ((totalWin / totalBet) * 100).toFixed(2) : "0.00";
  const netReturn = totalWin - totalBet;

  container.innerHTML = `
    <div class="history-kpi-grid" style="margin-bottom: 20px;">
      <div class="kpi-card">
        <label>Session Duration</label>
        <strong style="color: #ffd700;">${timeFormatted}</strong>
      </div>
      <div class="kpi-card">
        <label>Total Spins</label>
        <strong>${session.stats.spins}</strong>
      </div>
      <div class="kpi-card">
        <label>Total Wagered</label>
        <strong>${formatZar(totalBet)}</strong>
      </div>
      <div class="kpi-card">
        <label>Total Won</label>
        <strong style="color: #00e676;">${formatZar(totalWin)}</strong>
      </div>
      <div class="kpi-card">
        <label>Net P/L</label>
        <strong style="color: ${netReturn >= 0 ? "#00e676" : "#ff4d5a"};">${netReturn >= 0 ? "+" : ""}${formatZar(netReturn)}</strong>
      </div>
      <div class="kpi-card">
        <label>Realized RTP</label>
        <strong style="color: #00e676;">${actualRtp}%</strong>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
      <div style="background: rgba(0,0,0,0.5); border: 1px solid rgba(255,42,59,0.3); border-radius: 12px; padding: 16px;">
        <h3 style="margin: 0 0 10px; font-family: Rajdhani, sans-serif; font-size: 18px; color: #ff4d5a;">Game Engine & Math Specs</h3>
        <p style="font-size: 13px; color: #e0adb1; margin: 4px 0;"><strong>Game ID:</strong> ${session.gameId}</p>
        <p style="font-size: 13px; color: #e0adb1; margin: 4px 0;"><strong>Operator ID:</strong> ${session.operatorId}</p>
        <p style="font-size: 13px; color: #e0adb1; margin: 4px 0;"><strong>Session Token:</strong> <span style="font-family: monospace; font-size: 11px;">${session.sessionId}</span></p>
        <p style="font-size: 13px; color: #e0adb1; margin: 4px 0;"><strong>Theoretical RTP:</strong> ${config.rtpLabel} (Certified Math)</p>
        <p style="font-size: 13px; color: #e0adb1; margin: 4px 0;"><strong>Volatility:</strong> Medium-High</p>
        <p style="font-size: 13px; color: #e0adb1; margin: 4px 0;"><strong>Layout:</strong> 5 Reels × 3 Rows (20 Fixed Lines)</p>
      </div>

      <div style="background: rgba(0,0,0,0.5); border: 1px solid rgba(255,42,59,0.3); border-radius: 12px; padding: 16px;">
        <h3 style="margin: 0 0 10px; font-family: Rajdhani, sans-serif; font-size: 18px; color: #ffd700;">Responsible Gambling (South Africa)</h3>
        <p style="font-size: 13px; color: #e0adb1; line-height: 1.4;">
          Gambling is strictly for adults aged <strong>18+</strong>. Winners know when to stop.
        </p>
        <p style="font-size: 12px; color: #e0adb1; line-height: 1.4;">
          National Responsible Gambling Programme Helpline:<br />
          <strong style="color: #00e676;">📞 0800 006 008</strong> (Toll-Free in South Africa)
        </p>
        <a href="${config.market.responsibleGamblingUrl}" target="_blank" rel="noopener" class="btn-action-primary" style="text-decoration: none; justify-content: center; margin-top: 10px; font-size: 13px;">
          🌐 Visit ResponsibleGambling.org.za
        </a>
      </div>
    </div>
  `;
}

/* =========================================================================
   DEDICATED PAYTABLE & RULES PAGE
   ========================================================================= */

function buildPaytablePage() {
  const container = document.getElementById("page-paytable-content");
  if (!container) return;

  const symbolCards = config.paytable
    .map((p) => {
      const meta = SYMBOL_COLORS[p.symbol] || { label: p.symbol, fg: 0xffffff };
      return `
        <div class="paytable-card">
          <div class="paytable-card-header">
            <strong style="color: #ffffff; font-family: Rajdhani, sans-serif; font-size: 16px;">${meta.label}</strong>
            <span style="font-size: 11px; color: #ff4d5a; font-weight: 700;">${p.symbol.toUpperCase()}</span>
          </div>
          <div style="display: flex; justify-content: space-around; text-align: center; font-family: Rajdhani, sans-serif;">
            <div>
              <div style="font-size: 11px; color: #e0adb1;">3 OF A KIND</div>
              <strong style="font-size: 16px; color: #ffd700;">${p.ofAKind[3]}x</strong>
            </div>
            <div>
              <div style="font-size: 11px; color: #e0adb1;">4 OF A KIND</div>
              <strong style="font-size: 16px; color: #ffd700;">${p.ofAKind[4]}x</strong>
            </div>
            <div>
              <div style="font-size: 11px; color: #e0adb1;">5 OF A KIND</div>
              <strong style="font-size: 18px; color: #00e676;">${p.ofAKind[5]}x</strong>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  container.innerHTML = `
    <div style="margin-bottom: 20px;">
      <h3 style="font-family: Rajdhani, sans-serif; font-size: 20px; color: #ff4d5a; margin: 0 0 10px;">Symbol Multipliers (Line Wins)</h3>
      <div class="paytable-grid">
        ${symbolCards}
      </div>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-top: 20px;">
      <div style="background: rgba(0,0,0,0.5); border: 1px solid rgba(255,42,59,0.3); border-radius: 12px; padding: 16px;">
        <h4 style="margin: 0 0 8px; font-family: Rajdhani, sans-serif; font-size: 17px; color: #ffd700;">⚡ Special Features</h4>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #e0adb1; line-height: 1.6;">
          <li><strong>WILD Symbol:</strong> Substitutes for any regular symbol to complete the highest paying winning combination on a line.</li>
          <li><strong>SCATTER Diamond:</strong> 3 or more scattered anywhere on the reels trigger <strong>Free Spins</strong> with progressive multiplier boosters.</li>
          <li><strong>Progressive Jackpot:</strong> Accumulates with every spin. Can trigger on maximum diamond symbol lines!</li>
        </ul>
      </div>

      <div style="background: rgba(0,0,0,0.5); border: 1px solid rgba(255,42,59,0.3); border-radius: 12px; padding: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <h4 style="margin: 0; font-family: Rajdhani, sans-serif; font-size: 17px; color: #00e676;">📐 All 20 Fixed Paylines Matrix</h4>
          <span style="font-size: 11px; color: #ffd700; font-weight: 700;">5 REELS × 3 ROWS</span>
        </div>
        <p style="font-size: 12px; color: #e0adb1; line-height: 1.4; margin: 0 0 12px;">
          All line wins evaluate from left-to-right across consecutive reels. View all 20 trajectory configurations below:
        </p>

        <!-- 20 Paylines Micro Visual Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(64px, 1fr)); gap: 8px;">
          ${[
            [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2],
            [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [0, 1, 1, 1, 0],
            [2, 1, 1, 1, 2], [1, 0, 1, 2, 1], [1, 2, 1, 0, 1], [0, 1, 0, 1, 0], [2, 1, 2, 1, 2],
            [1, 1, 0, 1, 1], [1, 1, 2, 1, 1], [0, 0, 1, 0, 0], [2, 2, 1, 2, 2], [0, 2, 0, 2, 0],
          ]
            .map((pattern, idx) => {
              const miniRows = [0, 1, 2];
              return `
                <div style="background: rgba(0,0,0,0.6); border: 1px solid rgba(255,42,59,0.3); border-radius: 6px; padding: 4px; text-align: center;">
                  <div style="font-family: Rajdhani, sans-serif; font-size: 10px; font-weight: 700; color: #ffd700; margin-bottom: 2px;">#${idx + 1}</div>
                  <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 2px; height: 28px;">
                    ${[0, 1, 2, 3, 4]
                      .map((col) => {
                        const targetRow = pattern[col];
                        return `
                          <div style="display: flex; flex-direction: column; gap: 1px;">
                            ${miniRows
                              .map(
                                (r) => `
                                <div style="flex: 1; border-radius: 1px; background: ${
                                  r === targetRow ? "#ff2a3b" : "rgba(255,255,255,0.08)"
                                }; ${r === targetRow ? "box-shadow: 0 0 4px #ff2a3b;" : ""}"></div>
                              `
                              )
                              .join("")}
                          </div>
                        `;
                      })
                      .join("")}
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>
      </div>
    </div>
  `;
}

/* =========================================================================
   CORE GAME SPIN LOGIC
   ========================================================================= */

async function doSpin() {
  if (busy) return;
  busy = true;
  if (el.spinBtn) el.spinBtn.disabled = true;
  if (el.betMinus) el.betMinus.disabled = true;
  if (el.betPlus) el.betPlus.disabled = true;

  try {
    const willUseFreeSpin = session.freeSpinsRemaining > 0 && !freeSpinsBanked;
    const result: SpinResult = await spin(
      session.sessionId,
      currentBet(),
      turbo,
      willUseFreeSpin
    );
    session.balanceCents = result.balanceCents;
    session.freeSpinsRemaining = result.freeSpinsRemaining;
    session.stats.spins += 1;
    if (!result.usedFreeSpin) {
      session.stats.totalBetCents += result.betCents;
      accumulateJackpot(result.betCents);
    }
    session.stats.totalWinCents += result.totalWinCents;
    lastWinCents = result.totalWinCents;
    refreshMeters();

    // Record in History Service
    historyService.recordSpin(result);
    if (el.navHistoryCount) {
      el.navHistoryCount.textContent = historyService.getCount().toString();
    }

    await scene.playSpin(result);

    if (result.freeSpinsJustAwarded > 0) {
      showToast(
        `${t(locale, "freeSpinWin")} +${result.freeSpinsJustAwarded}`,
        2000
      );
    } else if (result.totalWinCents > 0) {
      showToast(formatZar(result.totalWinCents));
    }

    // Autoplay stop conditions
    if (autoRemaining > 0) {
      autoRemaining -= 1;
      if (
        autoStopWinCents != null &&
        result.totalWinCents >= autoStopWinCents
      ) {
        autoRemaining = 0;
        showToast(t(locale, "stop"));
      }
      if (
        autoStopBalanceCents != null &&
        session.balanceCents <= autoStopBalanceCents
      ) {
        autoRemaining = 0;
        showToast(t(locale, "stop"));
      }
    }
  } catch (err) {
    autoRemaining = 0;
    const msg = err instanceof Error ? err.message : "Error";
    showToast(
      msg.toLowerCase().includes("insufficient")
        ? t(locale, "insufficient")
        : msg,
      2200
    );
  } finally {
    busy = false;
    if (el.spinBtn) el.spinBtn.disabled = false;
    const isLockedFreeSpin = session.freeSpinsRemaining > 0 && !freeSpinsBanked;
    if (el.betMinus) el.betMinus.disabled = isLockedFreeSpin || autoRemaining > 0;
    if (el.betPlus) el.betPlus.disabled = isLockedFreeSpin || autoRemaining > 0;
    refreshMeters();

    if (autoRemaining > 0) {
      setTimeout(() => {
        void doSpin();
      }, turbo ? 120 : 350);
    }
  }
}

function stopAuto() {
  autoRemaining = 0;
  refreshMeters();
}

/* =========================================================================
   APPLICATION BOOTSTRAP
   ========================================================================= */

async function boot() {
  const { operatorId, gameId } = getEmbedParams();
  const data = await createSession(operatorId, gameId);
  config = data.config;
  session = data.session;
  locale = config.market.localeDefault;

  betIndex = Math.max(
    0,
    config.betting.betStepsCents.indexOf(config.betting.defaultBetCents)
  );

  const host = document.getElementById("game-root")!;
  pixiApp = new Application();
  await pixiApp.init({
    resizeTo: host,
    backgroundAlpha: 0,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  });
  host.appendChild(pixiApp.canvas);

  scene = new GameScene(pixiApp, config, sound);
  await scene.init();
  scene.setMotion(reducedMotion, turbo);
  scene.setTitle(config.branding.logoText);

  // Initialize Uvaan's VIP Slot Machine for Cashier / Crypto Hub
  uvaanSlotMachine = new UvaanSlotMachine(
    sound,
    () => session.balanceCents,
    (newBalanceCents, winDiffCents, reason) => {
      session.balanceCents = newBalanceCents;
      refreshMeters();
      if (winDiffCents > 0) {
        depositTransactions.unshift({
          id: `UVAAN-${Math.floor(1000 + Math.random() * 9000)}`,
          time: new Date().toLocaleTimeString(),
          amountCents: winDiffCents,
          method: "🎰 Uvaan's Slot Payout",
          reference: `UVAAN-${reason.toUpperCase()}`,
        });
      }
    }
  );

  // ResizeObserver for fluid canvas sizing
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        pixiApp.renderer.resize(width, height);
        scene.resize(width, height);
      }
    }
  });
  resizeObserver.observe(host);

  applyI18n();
  updateJackpotDisplay(jackpotCents, false);

  // ----------------------------------------------------
  // WIRE NAVBAR & NAVIGATION ROUTER
  // ----------------------------------------------------
  el.navBrandBtn?.addEventListener("click", () => switchView("game"));
  el.navTabGame?.addEventListener("click", () => switchView("game"));
  el.navTabCashier?.addEventListener("click", () => switchView("cashier"));
  el.navTabHistory?.addEventListener("click", () => switchView("history"));
  el.navTabSession?.addEventListener("click", () => switchView("session"));
  el.navTabPaytable?.addEventListener("click", () => switchView("paytable"));

  // Quick Balance button routes to Cashier
  el.navBalanceBtn?.addEventListener("click", () => switchView("cashier"));
  el.balanceMeterBox?.addEventListener("click", () => switchView("cashier"));
  el.btnCashier?.addEventListener("click", () => switchView("cashier"));

  // Return to slot buttons
  document.querySelectorAll(".btn-back-to-slot").forEach((btn) => {
    btn.addEventListener("click", () => switchView("game"));
  });

  // Cashier Sub Tabs
  document.getElementById("page-tab-card")?.addEventListener("click", () => {
    cashierTab = "card";
    void buildCashierPage();
  });
  document.getElementById("page-tab-crypto")?.addEventListener("click", () => {
    cashierTab = "crypto";
    void buildCashierPage();
  });
  document.getElementById("page-tab-uvaan-slot")?.addEventListener("click", () => {
    cashierTab = "uvaan-slot";
    void buildCashierPage();
  });
  document.getElementById("page-tab-eft")?.addEventListener("click", () => {
    cashierTab = "eft";
    void buildCashierPage();
  });
  document.getElementById("page-tab-ledger")?.addEventListener("click", () => {
    cashierTab = "ledger";
    void buildCashierPage();
  });

  // Delegation for jumping directly to Uvaan's Slot Machine from promos
  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement | null;
    if (target && target.closest(".btn-jump-uvaan-slot")) {
      cashierTab = "uvaan-slot";
      if (currentView !== "cashier") {
        switchView("cashier");
      } else {
        void buildCashierPage();
      }
    }
  });

  // HUD Toolbar Buttons
  el.btnGridLines?.addEventListener("click", () => {
    const nextMode = scene.cycleGridDisplayMode();
    const modeLabels: Record<string, string> = {
      "all-grid": "🌐 Grid: 5x3 Matrix",
      "neon-matrix": "🔥 Grid: Neon Cyber",
      "all-paylines": "⚡ Grid: 20 Paylines",
      "subtle": "✨ Grid: Clean Rails",
    };
    if (el.btnGridLines) {
      el.btnGridLines.textContent = modeLabels[nextMode] || "🌐 Grid Lines";
      el.btnGridLines.classList.toggle("active", nextMode !== "subtle");
    }
  });

  el.btnHistoryQuick?.addEventListener("click", () => switchView("history"));
  el.btnPaytable?.addEventListener("click", () => switchView("paytable"));
  el.btnSession?.addEventListener("click", () => switchView("session"));
  el.btnRules?.addEventListener("click", () => openModal("modal-rules"));

  // Sound, Turbo, Motion, Language
  el.navBtnSound?.addEventListener("click", () => {
    sound.toggle();
    applyI18n();
  });
  el.btnSound?.addEventListener("click", () => {
    sound.toggle();
    applyI18n();
  });
  el.btnTurbo?.addEventListener("click", () => {
    turbo = !turbo;
    scene.setMotion(reducedMotion, turbo);
    el.btnTurbo.classList.toggle("active", turbo);
  });
  el.btnMotion?.addEventListener("click", () => {
    reducedMotion = !reducedMotion;
    scene.setMotion(reducedMotion, turbo);
    applyI18n();
  });
  el.navBtnLang?.addEventListener("click", () => {
    locale = locale === "en" ? "zu" : "en";
    applyI18n();
  });
  el.btnLang?.addEventListener("click", () => {
    locale = locale === "en" ? "zu" : "en";
    applyI18n();
  });

  // Bet Adjustment
  el.betMinus?.addEventListener("click", () => {
    if (busy || autoRemaining || (session.freeSpinsRemaining && !freeSpinsBanked)) return;
    betIndex = Math.max(0, betIndex - 1);
    refreshMeters();
  });
  el.betPlus?.addEventListener("click", () => {
    if (busy || autoRemaining || (session.freeSpinsRemaining && !freeSpinsBanked)) return;
    betIndex = Math.min(config.betting.betStepsCents.length - 1, betIndex + 1);
    refreshMeters();
  });

  // Spin Button
  el.spinBtn?.addEventListener("click", () => {
    if (autoRemaining > 0) {
      stopAuto();
      return;
    }
    void doSpin();
  });

  // Free Spins Save / Bank Toggle
  el.btnFsToggle?.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleFreeSpinsBank();
  });

  // Win Breakdown
  el.btnBreakdown?.addEventListener("click", () => {
    scene.showWinBreakdown();
  });

  // Autoplay
  el.btnAuto?.addEventListener("click", () => {
    if (autoRemaining > 0) {
      stopAuto();
      return;
    }
    openModal("modal-auto");
  });

  document.getElementById("auto-start")?.addEventListener("click", () => {
    const spins = Number(
      (document.getElementById("auto-spins") as HTMLInputElement).value
    );
    const winR = (document.getElementById("auto-win-stop") as HTMLInputElement)
      .value;
    const balR = (document.getElementById("auto-bal-stop") as HTMLInputElement)
      .value;
    autoRemaining = Math.min(100, Math.max(1, spins || 1));
    autoStopWinCents = winR ? Math.floor(Number(winR) * 100) : undefined;
    autoStopBalanceCents = balR ? Math.floor(Number(balR) * 100) : undefined;
    closeModal("modal-auto");
    void doSpin();
  });

  // Close modals
  document.querySelectorAll("[data-close]").forEach((node) => {
    node.addEventListener("click", () => {
      closeModal((node as HTMLElement).dataset.close!);
    });
  });

  document.querySelectorAll(".modal-backdrop").forEach((node) => {
    node.addEventListener("click", (e) => {
      if (e.target === node) node.classList.remove("open");
    });
  });

  // Spacebar to spin
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" && !busy && currentView === "game") {
      e.preventDefault();
      if (autoRemaining > 0) stopAuto();
      else void doSpin();
    }
  });

  console.info(
    `[Springbok Rush] Booted operator=${operatorId} game=${gameId} session=${session.sessionId}`
  );
}

boot().catch((err) => {
  console.error(err);
  const banner = document.getElementById("banner");
  if (banner) {
    banner.textContent = "Failed to start demo — is the API running on :8787?";
  }
});
