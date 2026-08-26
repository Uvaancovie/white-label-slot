import { formatZar, type SpinResult } from "@sa-slot/shared";

export interface HistoryRecord {
  spinNum: number;
  roundId: string;
  timestamp: string;
  fullDateStr: string;
  betCents: number;
  winCents: number;
  usedFreeSpin: boolean;
  freeSpinsAwarded: number;
  multiplier: number;
}

const STORAGE_KEY = "slot_game_history_v1";
const MAX_HISTORY = 10;

class HistoryService {
  private history: HistoryRecord[] = [];
  private spinCounter = 0;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.history = parsed.slice(0, MAX_HISTORY);
          this.spinCounter = this.history.reduce(
            (max, item) => Math.max(max, item.spinNum || 0),
            0
          );
        }
      }
    } catch {
      this.history = [];
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.history));
    } catch {
      // Ignore storage quota or disabled errors
    }
  }

  public recordSpin(result: SpinResult): HistoryRecord {
    this.spinCounter += 1;
    const now = result.timestamp ? new Date(result.timestamp) : new Date();

    const timeStr = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const fullDateStr = `${now.toLocaleDateString()} ${timeStr}`;

    const effectiveBet = result.usedFreeSpin ? 0 : result.betCents;
    const multiplier =
      result.betCents > 0
        ? Math.round((result.totalWinCents / result.betCents) * 100) / 100
        : 0;

    const record: HistoryRecord = {
      spinNum: this.spinCounter,
      roundId: result.roundId || `RND-${Date.now()}`,
      timestamp: timeStr,
      fullDateStr,
      betCents: effectiveBet,
      winCents: result.totalWinCents,
      usedFreeSpin: result.usedFreeSpin,
      freeSpinsAwarded: result.freeSpinsJustAwarded || 0,
      multiplier,
    };

    // Keep only the last 10 spin results (newest first)
    this.history.unshift(record);
    if (this.history.length > MAX_HISTORY) {
      this.history = this.history.slice(0, MAX_HISTORY);
    }

    this.saveToStorage();
    return record;
  }

  public getHistory(): HistoryRecord[] {
    return [...this.history];
  }

  public clearHistory() {
    this.history = [];
    this.spinCounter = 0;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }

  public render(containerEl: HTMLElement) {
    if (!containerEl) return;

    if (this.history.length === 0) {
      containerEl.innerHTML = `
        <div style="text-align: center; padding: 28px 12px; color: #e0adb1; font-size: 14px;">
          <div style="font-size: 24px; margin-bottom: 6px;">🎰</div>
          <p style="margin: 0; font-weight: 600;">No spins recorded yet in this session.</p>
          <p style="margin-top: 4px; font-size: 12px; opacity: 0.7;">Press <strong>SPIN</strong> to play!</p>
        </div>
      `;
      return;
    }

    const rowsHtml = this.history
      .map((item) => {
        const isWin = item.winCents > 0;
        const betLabel = item.usedFreeSpin
          ? `<span style="color:#ffd700; font-weight:700;">FREE</span>`
          : formatZar(item.betCents);

        let winBadge = `<span class="badge-loss">R0.00</span>`;
        if (isWin) {
          const multText = item.multiplier >= 1 ? ` (${item.multiplier}x)` : "";
          winBadge = `<span class="badge-win">+${formatZar(item.winCents)}${multText}</span>`;
        }

        let extraBadge = "";
        if (item.freeSpinsAwarded > 0) {
          extraBadge = `<span style="display:inline-block; margin-left:4px; background:#d61c24; color:#fff; font-size:10px; font-weight:700; padding:1px 5px; border-radius:4px;">+${item.freeSpinsAwarded} FS</span>`;
        }

        return `
          <tr>
            <td style="font-weight: 700; color: #ff4d5a;">#${item.spinNum}</td>
            <td style="font-size: 12px; color: #e0adb1;" title="${item.fullDateStr}">${item.timestamp}</td>
            <td style="font-family: Rajdhani, sans-serif; font-weight: 600;">${betLabel}</td>
            <td style="font-family: Rajdhani, sans-serif;">${winBadge}${extraBadge}</td>
          </tr>
        `;
      })
      .join("");

    containerEl.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-size: 12px; color: #e0adb1; font-weight: 600;">Showing last ${this.history.length} spins</span>
        <button type="button" id="clear-history-btn" class="chip" style="font-size: 11px; min-height: 24px; padding: 2px 8px; background: rgba(255,42,59,0.15);">Clear</button>
      </div>
      <table class="history-table">
        <thead>
          <tr>
            <th>Spin</th>
            <th>Time</th>
            <th>Bet</th>
            <th>Win Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;

    const clearBtn = containerEl.querySelector("#clear-history-btn");
    clearBtn?.addEventListener("click", () => {
      this.clearHistory();
      this.render(containerEl);
    });
  }
}

export const historyService = new HistoryService();
