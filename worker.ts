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
} from "../shared/src/index.js";

export interface Env {
  SESSIONS?: KVNamespace;
  ASSETS?: Fetcher;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // Health
    if (url.pathname === "/api/health" && request.method === "GET") {
      return json({
        ok: true,
        market: "ZA",
        currency: "ZAR",
        mode: "demo",
        product: "sa-white-label-slot",
        platform: "cloudflare-worker",
        timestamp: new Date().toISOString(),
      });
    }

    // Crypto rates
    if (url.pathname === "/api/crypto-rates" && request.method === "GET") {
      try {
        const resp = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether,solana,ripple&vs_currencies=zar,usd&include_24hr_change=true"
        );
        if (resp.ok) {
          const raw = (await resp.json()) as any;
          return json({
            ok: true,
            source: "coingecko",
            rates: {
              BTC: { zar: Math.round(raw.bitcoin?.zar || 1720000), usd: Math.round(raw.bitcoin?.usd || 94500), change24h: 1.4 },
              ETH: { zar: Math.round(raw.ethereum?.zar || 48500), usd: Math.round(raw.ethereum?.usd || 2650), change24h: -0.8 },
              USDT: { zar: 18.25, usd: 1.0, change24h: 0.1 },
              SOL: { zar: 3450, usd: 190, change24h: 3.2 },
              XRP: { zar: 39.5, usd: 2.15, change24h: 2.1 },
            },
          });
        }
      } catch {
        // Fallback
      }
      return json({
        ok: true,
        source: "market_estimate",
        rates: {
          BTC: { zar: 1725000, usd: 94800, change24h: 1.8 },
          ETH: { zar: 48900, usd: 2680, change24h: -0.4 },
          USDT: { zar: 18.32, usd: 1.0, change24h: 0.1 },
          SOL: { zar: 3480, usd: 191, change24h: 3.5 },
          XRP: { zar: 39.8, usd: 2.18, change24h: 2.4 },
        },
      });
    }

    // Create session
    if (url.pathname === "/api/session" && request.method === "POST") {
      let body: any = {};
      try {
        body = await request.json();
      } catch {
        body = {};
      }
      const operatorId = body?.operatorId ?? url.searchParams.get("operatorId") ?? "demo-operator";
      const gameId = body?.gameId ?? url.searchParams.get("gameId") ?? "springbok-rush";
      const config: GameConfig = { ...defaultGameConfig, gameId };
      const sessionId = `ses_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
      const session: SessionState = {
        sessionId,
        operatorId,
        gameId,
        createdAt: new Date().toISOString(),
        balanceCents: config.betting.startingBalanceCents,
        freeSpinsRemaining: 0,
        freeSpinMultiplier: 3,
        stats: { spins: 0, totalBetCents: 0, totalWinCents: 0 },
      };

      if (env.SESSIONS) {
        await env.SESSIONS.put(`session:${sessionId}`, JSON.stringify(session), { expirationTtl: 86400 });
      }

      const resPayload: CreateSessionResponse = { session, config };
      return json(resPayload, 201);
    }

    // Spin
    if (url.pathname === "/api/spin" && request.method === "POST") {
      const { sessionId, betCents, useFreeSpin } = (await request.json()) as {
        sessionId?: string;
        betCents?: number;
        useFreeSpin?: boolean;
      };

      if (!sessionId || typeof betCents !== "number") {
        return json({ error: "sessionId and betCents required" }, 400);
      }

      let session: SessionState | null = null;
      if (env.SESSIONS) {
        const d = await env.SESSIONS.get(`session:${sessionId}`);
        if (d) {
          try { session = JSON.parse(d); } catch { session = null; }
        }
      }

      if (!session) {
        session = {
          sessionId,
          operatorId: "demo-operator",
          gameId: "springbok-rush",
          createdAt: new Date().toISOString(),
          balanceCents: defaultGameConfig.betting.startingBalanceCents,
          freeSpinsRemaining: 0,
          freeSpinMultiplier: 3,
          stats: { spins: 0, totalBetCents: 0, totalWinCents: 0 },
        };
      }

      const config: GameConfig = { ...defaultGameConfig, gameId: session.gameId };
      const willUseFreeSpin = Boolean(useFreeSpin !== false && session.freeSpinsRemaining > 0);

      if (!willUseFreeSpin) {
        if (betCents < config.betting.minBetCents || betCents > config.betting.maxBetCents) {
          return json({ error: "Bet out of range" }, 400);
        }
        if (session.balanceCents < betCents) {
          return json({ error: "Insufficient balance" }, 400);
        }
        session.balanceCents -= betCents;
        session.stats.totalBetCents += betCents;
      } else {
        session.freeSpinsRemaining -= 1;
      }

      session.stats.spins += 1;
      const roundId = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
      const serverSeed = `${session.sessionId}:${roundId}:${Date.now()}`;
      const rng = createRng(serverSeed);
      const stopIndices = rollStops(config, rng);
      const grid = buildGrid(config, stopIndices);
      const multiplier = willUseFreeSpin ? session.freeSpinMultiplier : 1;
      const { lineWins, scatterWin, totalWinCents } = evaluateSpin(config, grid, betCents, multiplier);

      session.balanceCents += totalWinCents;
      session.stats.totalWinCents += totalWinCents;

      let freeSpinsJustAwarded = 0;
      if (config.features.freeSpins && scatterWin && scatterWin.freeSpinsAwarded > 0) {
        freeSpinsJustAwarded = scatterWin.freeSpinsAwarded;
        session.freeSpinsRemaining += freeSpinsJustAwarded;
      }

      if (env.SESSIONS) {
        await env.SESSIONS.put(`session:${sessionId}`, JSON.stringify(session), { expirationTtl: 86400 });
      }

      const result: SpinResult = {
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

      return json(result);
    }

    // Deposit
    if (url.pathname === "/api/deposit" && request.method === "POST") {
      const { sessionId, amountCents, method, metadata } = (await request.json()) as any;
      if (!sessionId || typeof amountCents !== "number" || amountCents <= 0) {
        return json({ error: "Valid sessionId and amountCents required" }, 400);
      }
      let session: SessionState | null = null;
      if (env.SESSIONS) {
        const d = await env.SESSIONS.get(`session:${sessionId}`);
        if (d) { try { session = JSON.parse(d); } catch {} }
      }
      if (!session) return json({ error: "Session not found" }, 404);

      session.balanceCents += amountCents;
      if (env.SESSIONS) {
        await env.SESSIONS.put(`session:${sessionId}`, JSON.stringify(session), { expirationTtl: 86400 });
      }
      return json({ ok: true, balanceCents: session.balanceCents, depositedCents: amountCents, method, metadata });
    }

    // Static assets fallback (if Worker Assets binding exists)
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not Found", { status: 404 });
  },
};
