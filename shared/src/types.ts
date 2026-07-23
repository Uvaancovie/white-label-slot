/** Shared contracts for SA white-label slot kit */

export type Locale = "en" | "zu";

export type SymbolId =
  | "wild"
  | "scatter"
  | "springbok"
  | "protea"
  | "gold"
  | "drum"
  | "A"
  | "K"
  | "Q"
  | "J"
  | "10";

export interface PaytableEntry {
  symbol: SymbolId;
  /** Multipliers of total bet for 3 / 4 / 5 of a kind on a payline */
  ofAKind: { 3: number; 4: number; 5: number };
}

export interface GameConfig {
  gameId: string;
  name: string;
  market: {
    country: "ZA";
    currency: "ZAR";
    localeDefault: Locale;
    minAge: 18;
    responsibleGamblingUrl: string;
    legalFooter: string;
  };
  branding: {
    logoText: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundTop: string;
    backgroundBottom: string;
  };
  layout: {
    reels: 5;
    rows: 3;
    paylineCount: number;
  };
  betting: {
    /** Demo credits in ZAR cents (e.g. 100000 = R1 000.00) */
    startingBalanceCents: number;
    /** Bet steps in cents */
    betStepsCents: number[];
    defaultBetCents: number;
    minBetCents: number;
    maxBetCents: number;
  };
  features: {
    wild: boolean;
    scatter: boolean;
    freeSpins: boolean;
    freeSpinsTriggerScatters: number;
    freeSpinsAwarded: number;
    freeSpinMultiplier: number;
  };
  /** Theoretical RTP label shown in UI (math is simplified for demo) */
  rtpLabel: string;
  paytable: PaytableEntry[];
  /**
   * Reel strips: each reel is an ordered list of symbol ids.
   * Spin lands a random stop index; visible window is 3 symbols.
   */
  reelStrips: SymbolId[][];
  /** Fixed paylines as [reel][row] coordinates, row 0 = top */
  paylines: number[][];
  embed: {
    allowIframe: boolean;
    demoOnly: boolean;
  };
}

export interface SessionState {
  sessionId: string;
  operatorId: string;
  gameId: string;
  balanceCents: number;
  freeSpinsRemaining: number;
  freeSpinMultiplier: number;
  stats: SessionStats;
  createdAt: string;
}

export interface SessionStats {
  spins: number;
  totalBetCents: number;
  totalWinCents: number;
}

export interface LineWin {
  paylineIndex: number;
  symbol: SymbolId;
  count: number;
  winCents: number;
  positions: Array<{ reel: number; row: number }>;
}

export interface ScatterWin {
  count: number;
  winCents: number;
  positions: Array<{ reel: number; row: number }>;
  freeSpinsAwarded: number;
}

export interface SpinRequest {
  sessionId: string;
  betCents: number;
  turbo?: boolean;
}

export interface SpinResult {
  roundId: string;
  grid: SymbolId[][]; // [reel][row]
  stopIndices: number[];
  betCents: number;
  totalWinCents: number;
  lineWins: LineWin[];
  scatterWin: ScatterWin | null;
  balanceCents: number;
  freeSpinsRemaining: number;
  usedFreeSpin: boolean;
  freeSpinsJustAwarded: number;
  serverSeed: string;
  timestamp: string;
}

export interface CreateSessionRequest {
  operatorId?: string;
  gameId?: string;
  locale?: Locale;
}

export interface CreateSessionResponse {
  session: SessionState;
  config: GameConfig;
}

export interface AutoplayStopConditions {
  maxSpins: number;
  stopOnWinCentsGte?: number;
  stopOnBalanceLte?: number;
}
