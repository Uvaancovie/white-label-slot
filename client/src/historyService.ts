import { formatZar, type LineWin, type SpinResult, type SymbolId } from "@sa-slot/shared";

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
  linesCount: number;
  lines?: LineWin[];
  grid?: SymbolId[][];
}

const STORAGE_KEY = "slot_game_history_v2";
const MAX_HISTORY = 50;

class HistoryService {
  private history: HistoryRecord[] = [];
  private spinCounter = 0;
  private currentFilter: "all" | "wins" | "freespins" | "bigwins" = "all";

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
      // Ignore quota errors
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
      linesCount: result.lineWins?.length || 0,
      lines: result.lineWins,
      grid: result.grid,
    };

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

  public getCount(): number {
    return this.history.length;
  }

  public getStats() {
    const totalSpins = this.history.length;
    const totalBetCents = this.history.reduce((sum, h) => sum + h.betCents, 0);
    const totalWinCents = this.history.reduce((sum, h) => sum + h.winCents, 0);
    const netProfitCents = totalWinCents - totalBetCents;
    const winningSpins = this.history.filter((h) => h.winCents > 0).length;
    const hitRate = totalSpins > 0 ? ((winningSpins / totalSpins) * 100).toFixed(1) : "0.0";
    const maxMultiplier = this.history.reduce(
      (max, h) => Math.max(max, h.multiplier),
      0
    );
    const totalFreeSpinsAwarded = this.history.reduce(
      (sum, h) => sum + h.freeSpinsAwarded,
      0
    );

    return {
      totalSpins,
      totalBetCents,
      totalWinCents,
      netProfitCents,
      winningSpins,
      hitRate,
      maxMultiplier,
      totalFreeSpinsAwarded,
    };
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

  public exportCsv(): string {
    const headers = [
      "Spin Number",
      "Round ID",
      "Timestamp",
      "Bet (ZAR)",
      "Win (ZAR)",
      "Multiplier",
      "Used Free Spin",
      "Free Spins Awarded",
      "Lines Won",
    ];
    const rows = this.history.map((h) => [
      h.spinNum,
      h.roundId,
      `"${h.fullDateStr}"`,
      (h.betCents / 100).toFixed(2),
      (h.winCents / 100).toFixed(2),
      `${h.multiplier}x`,
      h.usedFreeSpin ? "Yes" : "No",
      h.freeSpinsAwarded,
      h.linesCount,
    ]);

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  }

  public render(containerEl: HTMLElement, onBackToGame?: () => void) {
    if (!containerEl) return;

    const stats = this.getStats();
    const isNetPositive = stats.netProfitCents >= 0;

    let filtered = [...this.history];
    if (this.currentFilter === "wins") {
      filtered = filtered.filter((h) => h.winCents > 0);
    } else if (this.currentFilter === "freespins") {
      filtered = filtered.filter((h) => h.usedFreeSpin || h.freeSpinsAwarded > 0);
    } else if (this.currentFilter === "bigwins") {
      filtered = filtered.filter((h) => h.multiplier >= 5);
    }

    const rowsHtml =
      filtered.length === 0
        ? `<tr><td colspan="6" style="text-align:center; padding: 28px 12px; color: #e0adb1;">No spins match the selected filter.</td></tr>`
        : filtered
            .map((item) => {
              const isWin = item.winCents > 0;
              const betLabel = item.usedFreeSpin
                ? `<span style="color:#ffd700; font-weight:700; font-size:11px; background:rgba(255,215,0,0.15); padding:2px 6px; border-radius:4px;">FREE</span>`
                : formatZar(item.betCents);

              let winBadge = `<span class="badge-loss">R0.00</span>`;
              if (isWin) {
                const isBigWin = item.multiplier >= 5;
                const winClass = isBigWin ? "badge-big-win" : "badge-win";
                const star = isBigWin ? "⭐ " : "";
                winBadge = `<span class="${winClass}">${star}+${formatZar(item.winCents)} (${item.multiplier}x)</span>`;
              }

              let extraBadges = "";
              if (item.freeSpinsAwarded > 0) {
                extraBadges += `<span class="badge-fs">+${item.freeSpinsAwarded} FS</span>`;
              }
              if (item.linesCount > 0) {
                extraBadges += `<span class="badge-lines">${item.linesCount} lines</span>`;
              }

              return `
                <tr class="history-row" data-spin="${item.spinNum}">
                  <td style="font-weight: 700; color: #ff4d5a; font-family: Rajdhani, sans-serif; font-size: 15px;">#${item.spinNum}</td>
                  <td style="font-size: 12px; color: #e0adb1;" title="${item.fullDateStr}">${item.timestamp}</td>
                  <td style="font-family: Rajdhani, sans-serif; font-weight: 600; font-size: 14px;">${betLabel}</td>
                  <td style="font-family: Rajdhani, sans-serif; font-size: 14px;">${winBadge}</td>
                  <td>${extraBadges || '<span style="color: #666; font-size: 11px;">—</span>'}</td>
                  <td style="font-size: 11px; color: #a17075; font-family: monospace;">${item.roundId.slice(-8)}</td>
                </tr>
              `;
            })
            .join("");

    containerEl.innerHTML = `
      <div class="history-page-header">
        <div>
          <h2 class="view-title">📜 Game Spin History</h2>
          <p class="view-subtitle">Server-authoritative outcome logs with detailed timestamps and payout multipliers</p>
        </div>
        ${
          onBackToGame
            ? `<button type="button" class="btn-action-primary" id="btn-hist-back-game">🎰 Play Slot</button>`
            : ""
        }
      </div>

      <!-- KPI Summary Cards Grid -->
      <div class="history-kpi-grid">
        <div class="kpi-card">
          <label>Total Spins</label>
          <strong>${stats.totalSpins}</strong>
        </div>
        <div class="kpi-card">
          <label>Total Wagered</label>
          <strong style="color: #ffffff;">${formatZar(stats.totalBetCents)}</strong>
        </div>
        <div class="kpi-card">
          <label>Total Won</label>
          <strong style="color: #00e676;">${formatZar(stats.totalWinCents)}</strong>
        </div>
        <div class="kpi-card">
          <label>Net P/L</label>
          <strong style="color: ${isNetPositive ? "#00e676" : "#ff4d5a"};">
            ${isNetPositive ? "+" : ""}${formatZar(stats.netProfitCents)}
          </strong>
        </div>
        <div class="kpi-card">
          <label>Hit Frequency</label>
          <strong style="color: #ffd700;">${stats.hitRate}%</strong>
        </div>
        <div class="kpi-card">
          <label>Best Multiplier</label>
          <strong style="color: #ff3344;">${stats.maxMultiplier}x</strong>
        </div>
      </div>

      <!-- Filter bar and Actions -->
      <div class="history-controls-bar">
        <div class="filter-pills">
          <button type="button" class="filter-pill ${this.currentFilter === "all" ? "active" : ""}" data-filter="all">All Spins (${this.history.length})</button>
          <button type="button" class="filter-pill ${this.currentFilter === "wins" ? "active" : ""}" data-filter="wins">Wins Only (${stats.winningSpins})</button>
          <button type="button" class="filter-pill ${this.currentFilter === "bigwins" ? "active" : ""}" data-filter="bigwins">Big Wins (≥5x)</button>
          <button type="button" class="filter-pill ${this.currentFilter === "freespins" ? "active" : ""}" data-filter="freespins">Free Spins</button>
        </div>
        <div class="history-export-actions">
          <button type="button" id="btn-export-csv" class="chip" title="Download CSV report">📥 Export CSV</button>
          <button type="button" id="btn-clear-history" class="chip" title="Reset history">🗑️ Clear</button>
        </div>
      </div>

      <!-- Main History Table -->
      <div class="history-table-wrapper">
        <table class="history-table">
          <thead>
            <tr>
              <th>Spin #</th>
              <th>Time</th>
              <th>Wager</th>
              <th>Payout</th>
              <th>Features / Lines</th>
              <th>Round ID</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;

    // Wire filter buttons
    containerEl.querySelectorAll(".filter-pill").forEach((btn) => {
      btn.addEventListener("click", () => {
        const filter = (btn as HTMLElement).dataset.filter as any;
        if (filter) {
          this.currentFilter = filter;
          this.render(containerEl, onBackToGame);
        }
      });
    });

    // Wire clear history
    containerEl.querySelector("#btn-clear-history")?.addEventListener("click", () => {
      if (confirm("Are you sure you want to clear your spin history?")) {
        this.clearHistory();
        this.render(containerEl, onBackToGame);
      }
    });

    // Wire CSV export
    containerEl.querySelector("#btn-export-csv")?.addEventListener("click", () => {
      const csv = this.exportCsv();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `springbok-rush-history-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });

    // Wire back to game
    if (onBackToGame) {
      containerEl.querySelector("#btn-hist-back-game")?.addEventListener("click", onBackToGame);
    }
  }
}

export const historyService = new HistoryService();

