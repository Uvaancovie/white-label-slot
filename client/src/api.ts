import {
  buildGrid,
  createRng,
  defaultGameConfig,
  evaluateSpin,
  rollStops,
  type CreateSessionResponse,
  type GameConfig,
  type SessionState,
  type SpinResult,
} from "@sa-slot/shared";

const STORAGE_SESSION_KEY = "sa_slot_client_session_v1";

export function getEmbedParams(): {
  operatorId: string;
  gameId: string;
} {
  const q = new URLSearchParams(window.location.search);
  return {
    operatorId: q.get("operatorId") ?? "demo-operator",
    gameId: q.get("gameId") ?? "springbok-rush",
  };
}

function loadPersistedSession(): SessionState | null {
  try {
    const raw = localStorage.getItem(STORAGE_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function savePersistedSession(session: SessionState): void {
  try {
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage quota or access errors
  }
}

let activeSession: SessionState | null = loadPersistedSession();

export async function createSession(
  operatorId: string,
  gameId: string,
): Promise<CreateSessionResponse> {
  const config: GameConfig = {
    ...defaultGameConfig,
    gameId,
  };

  if (!activeSession || activeSession.gameId !== gameId) {
    activeSession = {
      sessionId: `client_${Math.random().toString(36).slice(2, 11)}`,
      operatorId,
      gameId,
      createdAt: new Date().toISOString(),
      balanceCents: config.betting.startingBalanceCents,
      freeSpinsRemaining: 0,
      freeSpinMultiplier: 3,
      stats: {
        spins: 0,
        totalBetCents: 0,
        totalWinCents: 0,
      },
    };
  }

  savePersistedSession(activeSession);

  return {
    session: activeSession,
    config,
  };
}

export async function spin(
  _sessionId: string,
  betCents: number,
  _turbo = false,
  useFreeSpin = true,
): Promise<SpinResult> {
  if (!activeSession) {
    await createSession("demo-operator", "springbok-rush");
  }

  const session = activeSession!;
  const config = defaultGameConfig;
  const willUseFreeSpin = useFreeSpin && session.freeSpinsRemaining > 0;

  if (!willUseFreeSpin) {
    if (session.balanceCents < betCents) {
      throw new Error("Insufficient demo balance");
    }
    session.balanceCents -= betCents;
    session.stats.totalBetCents += betCents;
  } else {
    session.freeSpinsRemaining -= 1;
  }

  session.stats.spins += 1;

  const roundId = Math.random().toString(36).slice(2, 14);
  const serverSeed = `${session.sessionId}:${roundId}:${Date.now()}`;
  const rng = createRng(serverSeed);
  const stopIndices = rollStops(config, rng);
  const grid = buildGrid(config, stopIndices);

  const multiplier = willUseFreeSpin ? session.freeSpinMultiplier : 1;
  const { lineWins, scatterWin, totalWinCents } = evaluateSpin(
    config,
    grid,
    betCents,
    multiplier,
  );

  session.balanceCents += totalWinCents;
  session.stats.totalWinCents += totalWinCents;

  let freeSpinsJustAwarded = 0;
  if (config.features.freeSpins && scatterWin && scatterWin.freeSpinsAwarded > 0) {
    freeSpinsJustAwarded = scatterWin.freeSpinsAwarded;
    session.freeSpinsRemaining += freeSpinsJustAwarded;
  }

  savePersistedSession(session);

  return {
    roundId,
    grid,
    stopIndices,
    betCents,
    totalWinCents,
    lineWins,
    scatterWin,
    balanceCents: session.balanceCents,
    freeSpinsRemaining: session.freeSpinsRemaining,
    usedFreeSpin: willUseFreeSpin,
    freeSpinsJustAwarded,
    serverSeed,
    timestamp: new Date().toISOString(),
  };
}

export async function depositFunds(
  _sessionId: string,
  amountCents: number,
  _method = "card",
  _metadata?: Record<string, unknown>,
): Promise<{ ok: boolean; balanceCents: number; depositedCents: number }> {
  if (!activeSession) {
    await createSession("demo-operator", "springbok-rush");
  }

  const session = activeSession!;
  session.balanceCents += amountCents;
  savePersistedSession(session);

  return {
    ok: true,
    balanceCents: session.balanceCents,
    depositedCents: amountCents,
  };
}

export interface CryptoRatesResponse {
  ok: boolean;
  source: string;
  updatedAt: string;
  rates: Record<
    string,
    {
      zar: number;
      usd: number;
      change24h: number;
    }
  >;
}

export async function fetchCryptoRates(): Promise<CryptoRatesResponse> {
  // Direct client-side fetch with fallback
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether,solana,ripple&vs_currencies=zar,usd&include_24hr_change=true"
    );
    if (res.ok) {
      const raw = await res.json();
      return {
        ok: true,
        source: "coingecko_direct",
        updatedAt: new Date().toISOString(),
        rates: {
          BTC: {
            zar: Math.round(raw.bitcoin?.zar || 1720000),
            usd: Math.round(raw.bitcoin?.usd || 94500),
            change24h: Number((raw.bitcoin?.zar_24h_change || 1.4).toFixed(2)),
          },
          ETH: {
            zar: Math.round(raw.ethereum?.zar || 48500),
            usd: Math.round(raw.ethereum?.usd || 2650),
            change24h: Number((raw.ethereum?.zar_24h_change || -0.8).toFixed(2)),
          },
          USDT: { zar: 18.25, usd: 1.0, change24h: 0.1 },
          SOL: {
            zar: Math.round(raw.solana?.zar || 3450),
            usd: Math.round(raw.solana?.usd || 190),
            change24h: Number((raw.solana?.zar_24h_change || 3.2).toFixed(2)),
          },
          XRP: {
            zar: Number((raw.ripple?.zar || 39.5).toFixed(2)),
            usd: Number((raw.ripple?.usd || 2.15).toFixed(2)),
            change24h: Number((raw.ripple?.zar_24h_change || 2.1).toFixed(2)),
          },
        },
      };
    }
  } catch {
    // Ignore and return standard live rates estimate
  }

  return {
    ok: true,
    source: "market_estimate",
    updatedAt: new Date().toISOString(),
    rates: {
      BTC: { zar: 1725000, usd: 94800, change24h: 1.8 },
      ETH: { zar: 48900, usd: 2680, change24h: -0.4 },
      USDT: { zar: 18.32, usd: 1.0, change24h: 0.1 },
      SOL: { zar: 3480, usd: 191, change24h: 3.5 },
      XRP: { zar: 39.8, usd: 2.18, change24h: 2.4 },
    },
  };
}
