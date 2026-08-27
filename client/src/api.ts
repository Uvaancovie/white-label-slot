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

// Local fallback session state if server API is unavailable
let localSession: SessionState | null = null;
let isLocalFallback = false;

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // If response body is not JSON (e.g. 404 HTML page)
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText || "Endpoint not found"}`);
    }
  }

  if (!res.ok) {
    throw new Error(
      data?.error ?? `HTTP ${res.status}: ${res.statusText || "Request failed"}`
    );
  }

  return (data ?? {}) as T;
}

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

export async function createSession(
  operatorId: string,
  gameId: string,
): Promise<CreateSessionResponse> {
  try {
    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operatorId, gameId }),
    });
    const result = await parseJson<CreateSessionResponse>(res);
    isLocalFallback = false;
    return result;
  } catch (err) {
    console.warn("[API] Server /api/session unreachable or returned error, initializing client-side demo mode:", err);
    isLocalFallback = true;
    const config: GameConfig = {
      ...defaultGameConfig,
      gameId,
    };
    const newSession: SessionState = {
      sessionId: `local_${Math.random().toString(36).slice(2, 11)}`,
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
    localSession = newSession;
    return {
      session: newSession,
      config,
    };
  }
}

export async function spin(
  sessionId: string,
  betCents: number,
  turbo = false,
  useFreeSpin = true,
): Promise<SpinResult> {
  if (isLocalFallback && localSession) {
    return executeLocalSpin(localSession, defaultGameConfig, betCents, useFreeSpin);
  }

  try {
    const res = await fetch("/api/spin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, betCents, turbo, useFreeSpin }),
    });
    return await parseJson<SpinResult>(res);
  } catch (err) {
    if (localSession) {
      isLocalFallback = true;
      return executeLocalSpin(localSession, defaultGameConfig, betCents, useFreeSpin);
    }
    throw err;
  }
}

function executeLocalSpin(
  session: SessionState,
  config: GameConfig,
  betCents: number,
  useFreeSpin = true,
): SpinResult {
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
  sessionId: string,
  amountCents: number,
  method = "card",
  metadata?: Record<string, unknown>,
): Promise<{ ok: boolean; balanceCents: number; depositedCents: number }> {
  if (isLocalFallback && localSession) {
    localSession.balanceCents += amountCents;
    return {
      ok: true,
      balanceCents: localSession.balanceCents,
      depositedCents: amountCents,
    };
  }

  try {
    const res = await fetch("/api/deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, amountCents, method, metadata }),
    });
    return await parseJson(res);
  } catch (err) {
    if (localSession) {
      localSession.balanceCents += amountCents;
      return {
        ok: true,
        balanceCents: localSession.balanceCents,
        depositedCents: amountCents,
      };
    }
    throw err;
  }
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
  try {
    const res = await fetch("/api/crypto-rates");
    return await parseJson<CryptoRatesResponse>(res);
  } catch {
    // Fallback static rates if backend is not reachable
    return {
      ok: true,
      source: "local_cache",
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
}

