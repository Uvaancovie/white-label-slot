import { Application } from "pixi.js";
import {
  formatZar,
  t,
  type GameConfig,
  type Locale,
  type SessionState,
  type SpinResult,
} from "@sa-slot/shared";
import { createSession, getEmbedParams, spin } from "./api.js";
import { SoundBus } from "./audio.js";
import { GameScene } from "./gameScene.js";
import { historyService } from "./historyService.js";
import { SYMBOL_COLORS } from "./symbols.js";

const sound = new SoundBus();

let locale: Locale = "en";
let config!: GameConfig;
let session!: SessionState;
let scene!: GameScene;
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

const el = {
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
  toast: document.getElementById("toast")!,
  lblBalance: document.getElementById("lbl-balance")!,
  lblBet: document.getElementById("lbl-bet")!,
  lblWin: document.getElementById("lbl-win")!,
  btnTurbo: document.getElementById("btn-turbo")!,
  btnSound: document.getElementById("btn-sound")!,
  btnMotion: document.getElementById("btn-motion")!,
  btnLang: document.getElementById("btn-lang")!,
  btnAuto: document.getElementById("btn-auto")!,
  btnPaytable: document.getElementById("btn-paytable")!,
  btnRules: document.getElementById("btn-rules")!,
  btnSession: document.getElementById("btn-session")!,
  betMinus: document.getElementById("bet-minus") as HTMLButtonElement,
  betPlus: document.getElementById("bet-plus") as HTMLButtonElement,
};

// Progressive Jackpot State
const INITIAL_JACKPOT_CENTS = 5000000; // R50,000.00 initial pool seed
let jackpotCents = Number(localStorage.getItem("slot_jackpot_cents")) || INITIAL_JACKPOT_CENTS;
let displayedJackpotCents = jackpotCents;
let jackpotAnimFrame: number | null = null;

function updateJackpotDisplay(targetCents: number, animate = true) {
  jackpotCents = targetCents;
  localStorage.setItem("slot_jackpot_cents", jackpotCents.toString());

  if (!animate) {
    displayedJackpotCents = jackpotCents;
    el.jackpotValue.textContent = formatZar(displayedJackpotCents);
    return;
  }

  const startValue = displayedJackpotCents;
  const startTime = performance.now();
  const duration = 750;

  if (jackpotAnimFrame) cancelAnimationFrame(jackpotAnimFrame);

  const step = (now: number) => {
    const progress = Math.min(1, (now - startTime) / duration);
    displayedJackpotCents = Math.round(startValue + (targetCents - startValue) * progress);
    el.jackpotValue.textContent = formatZar(displayedJackpotCents);

    if (progress < 1) {
      jackpotAnimFrame = requestAnimationFrame(step);
    } else {
      displayedJackpotCents = targetCents;
      el.jackpotValue.textContent = formatZar(targetCents);
      jackpotAnimFrame = null;
    }
  };
  jackpotAnimFrame = requestAnimationFrame(step);
}

function accumulateJackpot(betCents: number) {
  // Accumulate 2.5% of bet amount into progressive pool
  const contribution = Math.max(1, Math.round(betCents * 0.025));
  const newTarget = jackpotCents + contribution;

  // Trigger glowing pulse effect
  el.jackpotMeter.classList.remove("pulse-bet");
  void el.jackpotMeter.offsetWidth;
  el.jackpotMeter.classList.add("pulse-bet");

  updateJackpotDisplay(newTarget, true);
}

// Live simulation ticker for progressive prize growth
setInterval(() => {
  if (!busy) {
    const liveTick = Math.floor(Math.random() * 4) + 1;
    jackpotCents += liveTick;
    localStorage.setItem("slot_jackpot_cents", jackpotCents.toString());
    displayedJackpotCents = jackpotCents;
    el.jackpotValue.textContent = formatZar(jackpotCents);
  }
}, 3500);

function currentBet(): number {
  return config.betting.betStepsCents[betIndex];
}

function refreshMeters() {
  el.balance.textContent = formatZar(session.balanceCents);
  el.bet.textContent = formatZar(currentBet());
  el.betDisplay.textContent = formatZar(currentBet());
  el.win.textContent = formatZar(lastWinCents);
  el.fsBadge.classList.toggle("show", session.freeSpinsRemaining > 0);
  el.fsBadge.textContent = `${t(locale, "freeSpins")}: ${session.freeSpinsRemaining}`;
  el.spinBtn.classList.toggle("free", session.freeSpinsRemaining > 0);
  el.spinBtn.textContent =
    autoRemaining > 0
      ? `${t(locale, "stop")} (${autoRemaining})`
      : session.freeSpinsRemaining > 0
        ? t(locale, "freeSpins")
        : t(locale, "spin");
}

function applyI18n() {
  el.banner.textContent = t(locale, "demoBanner");
  el.lblBalance.textContent = t(locale, "balance");
  el.lblBet.textContent = t(locale, "bet");
  el.lblWin.textContent = t(locale, "win");
  el.lblJackpot.textContent = t(locale, "progressiveJackpot");
  el.btnPaytable.textContent = t(locale, "paytable");
  el.btnRules.textContent = t(locale, "rules");
  el.btnSession.textContent = t(locale, "session");
  el.btnSound.textContent = sound.enabled
    ? t(locale, "sound")
    : `${t(locale, "sound")} off`;
  el.btnMotion.textContent = reducedMotion
    ? t(locale, "reducedMotion")
    : t(locale, "reducedMotion");
  el.btnMotion.classList.toggle("active", reducedMotion);
  el.btnTurbo.classList.toggle("active", turbo);
  el.btnLang.textContent = locale === "en" ? "EN | ZU" : "ZU | EN";
  el.footerLegal.textContent =
    config.market.legalFooter || t(locale, "footerLegal");
  el.rgLink.href = config.market.responsibleGamblingUrl;
  el.rgLink.textContent = t(locale, "rgLink");
  document.getElementById("pt-title")!.textContent = t(locale, "paytable");
  document.getElementById("rules-title")!.textContent = t(locale, "rules");
  document.getElementById("session-title")!.textContent = t(locale, "session");
  document.getElementById("rules-body")!.textContent = t(locale, "rulesBody");
  document.getElementById("rules-rtp")!.textContent =
    `${t(locale, "rtp")}: ${config.rtpLabel} · ${t(locale, "paylineHint")}`;
  document.getElementById("auto-title")!.textContent = t(locale, "auto");
  document.getElementById("auto-spins-lbl")!.textContent = t(
    locale,
    "autoSpins",
  );
  document.getElementById("auto-win-lbl")!.textContent = t(
    locale,
    "maxWinStop",
  );
  document.getElementById("auto-bal-lbl")!.textContent = t(
    locale,
    "balanceStop",
  );
  document.getElementById("auto-start")!.textContent = t(
    locale,
    "startAuto",
  );
  refreshMeters();
}

function showToast(msg: string, ms = 1600) {
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

function buildPaytable() {
  const body = document.getElementById("pt-body")!;
  const rows = config.paytable
    .map((p) => {
      const label = SYMBOL_COLORS[p.symbol]?.label ?? p.symbol;
      return `<tr>
        <td><strong>${label}</strong></td>
        <td>3× ${p.ofAKind[3]}</td>
        <td>4× ${p.ofAKind[4]}</td>
        <td>5× ${p.ofAKind[5]}</td>
      </tr>`;
    })
    .join("");
  body.innerHTML = `
    <p>${t(locale, "paylineHint")}</p>
    <table>
      <thead><tr><th>Symbol</th><th>3</th><th>4</th><th>5</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin-top:12px">WILD substitutes all except SCATTER. 3+ SCATTER pays and awards free spins.</p>
  `;
}

function buildSession() {
  const overviewEl = document.getElementById("session-overview-content")!;
  const historyEl = document.getElementById("session-history-content")!;

  overviewEl.innerHTML = `
    <p><strong>${t(locale, "spins")}:</strong> ${session.stats.spins}</p>
    <p><strong>${t(locale, "totalBet")}:</strong> ${formatZar(session.stats.totalBetCents)}</p>
    <p><strong>${t(locale, "totalWin")}:</strong> ${formatZar(session.stats.totalWinCents)}</p>
    <p><strong>Session ID:</strong> ${session.sessionId}</p>
    <p><strong>Operator:</strong> ${session.operatorId}</p>
    <p><strong>Game:</strong> ${session.gameId}</p>
    <p><strong>${t(locale, "balance")}:</strong> ${formatZar(session.balanceCents)}</p>
  `;

  historyService.render(historyEl);
}

async function doSpin() {
  if (busy) return;
  busy = true;
  el.spinBtn.disabled = true;
  el.betMinus.disabled = true;
  el.betPlus.disabled = true;

  try {
    const result: SpinResult = await spin(
      session.sessionId,
      currentBet(),
      turbo,
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

    // Record spin result in History Service (stores up to last 10 spins)
    historyService.recordSpin(result);

    await scene.playSpin(result);

    if (result.freeSpinsJustAwarded > 0) {
      showToast(
        `${t(locale, "freeSpinWin")} +${result.freeSpinsJustAwarded}`,
        2000,
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
      2200,
    );
  } finally {
    busy = false;
    el.spinBtn.disabled = false;
    el.betMinus.disabled = session.freeSpinsRemaining > 0 || autoRemaining > 0;
    el.betPlus.disabled = session.freeSpinsRemaining > 0 || autoRemaining > 0;
    refreshMeters();

    if (autoRemaining > 0) {
      // slight gap between auto spins
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

async function boot() {
  const { operatorId, gameId } = getEmbedParams();
  const data = await createSession(operatorId, gameId);
  config = data.config;
  session = data.session;
  locale = config.market.localeDefault;

  betIndex = Math.max(
    0,
    config.betting.betStepsCents.indexOf(config.betting.defaultBetCents),
  );

  const host = document.getElementById("game-root")!;
  const app = new Application();
  await app.init({
    resizeTo: host,
    backgroundAlpha: 0,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  });
  host.appendChild(app.canvas);

  scene = new GameScene(app, config, sound);
  await scene.init();
  scene.setMotion(reducedMotion, turbo);
  scene.setTitle(config.branding.logoText);

  applyI18n();
  buildPaytable();
  updateJackpotDisplay(jackpotCents, false);

  // Wire controls
  el.betMinus.addEventListener("click", () => {
    if (busy || autoRemaining || session.freeSpinsRemaining) return;
    betIndex = Math.max(0, betIndex - 1);
    refreshMeters();
  });
  el.betPlus.addEventListener("click", () => {
    if (busy || autoRemaining || session.freeSpinsRemaining) return;
    betIndex = Math.min(config.betting.betStepsCents.length - 1, betIndex + 1);
    refreshMeters();
  });

  el.spinBtn.addEventListener("click", () => {
    if (autoRemaining > 0) {
      stopAuto();
      return;
    }
    void doSpin();
  });

  el.btnTurbo.addEventListener("click", () => {
    turbo = !turbo;
    scene.setMotion(reducedMotion, turbo);
    el.btnTurbo.classList.toggle("active", turbo);
  });

  el.btnSound.addEventListener("click", () => {
    sound.toggle();
    applyI18n();
  });

  el.btnMotion.addEventListener("click", () => {
    reducedMotion = !reducedMotion;
    scene.setMotion(reducedMotion, turbo);
    applyI18n();
  });

  el.btnLang.addEventListener("click", () => {
    locale = locale === "en" ? "zu" : "en";
    applyI18n();
    buildPaytable();
  });

  el.btnPaytable.addEventListener("click", () => {
    buildPaytable();
    openModal("modal-paytable");
  });
  el.btnRules.addEventListener("click", () => openModal("modal-rules"));
  el.btnSession.addEventListener("click", () => {
    buildSession();
    openModal("modal-session");
  });

  const tabOverview = document.getElementById("tab-btn-overview")!;
  const tabHistory = document.getElementById("tab-btn-history")!;
  const overviewContent = document.getElementById("session-overview-content")!;
  const historyContent = document.getElementById("session-history-content")!;

  tabOverview?.addEventListener("click", () => {
    tabOverview.classList.add("active");
    tabHistory.classList.remove("active");
    overviewContent.style.display = "block";
    historyContent.style.display = "none";
  });

  tabHistory?.addEventListener("click", () => {
    tabHistory.classList.add("active");
    tabOverview.classList.remove("active");
    overviewContent.style.display = "none";
    historyContent.style.display = "block";
  });
  el.btnAuto.addEventListener("click", () => {
    if (autoRemaining > 0) {
      stopAuto();
      return;
    }
    openModal("modal-auto");
  });

  document.getElementById("auto-start")!.addEventListener("click", () => {
    const spins = Number(
      (document.getElementById("auto-spins") as HTMLInputElement).value,
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

  // Space to spin
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" && !busy) {
      e.preventDefault();
      if (autoRemaining > 0) stopAuto();
      else void doSpin();
    }
  });

  console.info(
    `[Springbok Rush] operator=${operatorId} game=${gameId} session=${session.sessionId}`,
  );
}

boot().catch((err) => {
  console.error(err);
  document.getElementById("banner")!.textContent =
    "Failed to start demo — is the API running on :8787?";
});
