import type {
  GameConfig,
  LineWin,
  ScatterWin,
  SymbolId,
} from "./types.js";

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function createRng(seed: string): () => number {
  return mulberry32(hashSeed(seed));
}

/** Visible grid: reelStrips[reel][stop + row] wrapping */
export function buildGrid(
  config: GameConfig,
  stopIndices: number[],
): SymbolId[][] {
  const { rows } = config.layout;
  return config.reelStrips.map((strip, reel) => {
    const stop = stopIndices[reel] % strip.length;
    const col: SymbolId[] = [];
    for (let row = 0; row < rows; row++) {
      col.push(strip[(stop + row) % strip.length]);
    }
    return col;
  });
}

export function rollStops(
  config: GameConfig,
  rng: () => number,
): number[] {
  return config.reelStrips.map((strip) =>
    Math.floor(rng() * strip.length),
  );
}

function payForCount(
  config: GameConfig,
  symbol: SymbolId,
  count: number,
): number {
  if (count < 3) return 0;
  const entry = config.paytable.find((p) => p.symbol === symbol);
  if (!entry) return 0;
  const key = Math.min(count, 5) as 3 | 4 | 5;
  return entry.ofAKind[key] ?? 0;
}

/**
 * Left-to-right payline evaluation.
 * Wild substitutes for all except scatter.
 * Scatter is paid separately (any position).
 */
export function evaluateSpin(
  config: GameConfig,
  grid: SymbolId[][],
  betCents: number,
  freeSpinMultiplier: number,
): {
  lineWins: LineWin[];
  scatterWin: ScatterWin | null;
  totalWinCents: number;
} {
  const lineWins: LineWin[] = [];
  const wildEnabled = config.features.wild;
  const scatterEnabled = config.features.scatter;

  for (let pi = 0; pi < config.paylines.length; pi++) {
    const line = config.paylines[pi];
    const positions = line.map((row, reel) => ({ reel, row }));
    const symbols = positions.map(
      ({ reel, row }) => grid[reel][row],
    );

    // Determine base symbol (first non-wild, non-scatter)
    let base: SymbolId | null = null;
    for (const s of symbols) {
      if (s === "scatter") continue;
      if (s === "wild" && wildEnabled) continue;
      base = s;
      break;
    }
    if (!base) {
      // All wilds on line
      if (symbols.every((s) => s === "wild") && wildEnabled) {
        base = "wild";
      } else {
        continue;
      }
    }

    let count = 0;
    for (const s of symbols) {
      if (s === "scatter") break;
      if (s === base || (wildEnabled && s === "wild")) {
        count++;
      } else {
        break;
      }
    }

    const mult = payForCount(config, base, count);
    if (mult > 0) {
      const winCents = Math.floor(
        betCents * mult * freeSpinMultiplier,
      );
      lineWins.push({
        paylineIndex: pi,
        symbol: base,
        count,
        winCents,
        positions: positions.slice(0, count),
      });
    }
  }

  let scatterWin: ScatterWin | null = null;
  if (scatterEnabled) {
    const positions: Array<{ reel: number; row: number }> = [];
    for (let reel = 0; reel < grid.length; reel++) {
      for (let row = 0; row < grid[reel].length; row++) {
        if (grid[reel][row] === "scatter") {
          positions.push({ reel, row });
        }
      }
    }
    const count = positions.length;
    if (count >= 3) {
      // Scatter pays total-bet multiples: 3=2x, 4=10x, 5=50x
      const scatterMult = count >= 5 ? 50 : count === 4 ? 10 : 2;
      const winCents = Math.floor(
        betCents * scatterMult * freeSpinMultiplier,
      );
      const freeSpinsAwarded =
        config.features.freeSpins &&
        count >= config.features.freeSpinsTriggerScatters
          ? config.features.freeSpinsAwarded
          : 0;
      scatterWin = {
        count,
        winCents,
        positions,
        freeSpinsAwarded,
      };
    }
  }

  const totalWinCents =
    lineWins.reduce((s, w) => s + w.winCents, 0) +
    (scatterWin?.winCents ?? 0);

  return { lineWins, scatterWin, totalWinCents };
}

export function formatZar(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  return `${sign}R${whole.toLocaleString("en-ZA")}.${frac
    .toString()
    .padStart(2, "0")}`;
}
