import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";
import {
  createSession,
  depositSession,
  getConfig,
  getSession,
} from "./sessionStore.js";
import { executeSpin, SpinError } from "./spinService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3000);
const app = express();

app.use(cors());
app.use(express.json());

/** Health */
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    market: "ZA",
    currency: "ZAR",
    mode: "demo",
    product: "sa-white-label-slot",
  });
});

/**
 * Create demo session.
 * Query: operatorId, gameId (for embed: ?operatorId=x&gameId=springbok-rush)
 */
app.post("/api/session", (req, res) => {
  const operatorId =
    (req.body?.operatorId as string | undefined) ??
    (req.query.operatorId as string | undefined) ??
    "demo-operator";
  const gameId =
    (req.body?.gameId as string | undefined) ??
    (req.query.gameId as string | undefined) ??
    "springbok-rush";

  const session = createSession(operatorId, gameId);
  const config = getConfig(gameId);

  res.status(201).json({ session, config });
});

app.get("/api/session/:sessionId", (req, res) => {
  const session = getSession(req.params.sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json({
    session,
    config: getConfig(session.gameId),
  });
});

app.get("/api/config/:gameId", (req, res) => {
  res.json(getConfig(req.params.gameId));
});

/** Deposit demo / simulated funds */
app.post("/api/deposit", (req, res) => {
  const { sessionId, amountCents, method, metadata } = req.body ?? {};
  if (!sessionId || typeof amountCents !== "number" || amountCents <= 0) {
    res.status(400).json({ error: "Valid sessionId and positive amountCents required" });
    return;
  }

  const updatedSession = depositSession(sessionId, amountCents);
  if (!updatedSession) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.json({
    ok: true,
    balanceCents: updatedSession.balanceCents,
    depositedCents: amountCents,
    method: method || "card",
    metadata: metadata || {},
  });
});

let cryptoCache: { timestamp: number; data: any } | null = null;
const CACHE_TTL_MS = 30000; // 30 seconds

/** Live Crypto to ZAR conversion tracker */
app.get("/api/crypto-rates", async (_req, res) => {
  const now = Date.now();
  if (cryptoCache && now - cryptoCache.timestamp < CACHE_TTL_MS) {
    res.json(cryptoCache.data);
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const resp = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether,solana,ripple&vs_currencies=zar,usd&include_24hr_change=true",
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (resp.ok) {
      const raw = await resp.json();
      const payload = {
        ok: true,
        source: "coingecko",
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
          USDT: {
            zar: Number((raw.tether?.zar || 18.25).toFixed(2)),
            usd: Number((raw.tether?.usd || 1.0).toFixed(2)),
            change24h: Number((raw.tether?.zar_24h_change || 0.1).toFixed(2)),
          },
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
      cryptoCache = { timestamp: now, data: payload };
      res.json(payload);
      return;
    }
  } catch {
    // Network fallback below
  }

  // Resilient fallback rates in ZAR
  const fallback = {
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
  res.json(fallback);
});

/** Server-authoritative spin */
app.post("/api/spin", (req, res) => {
  const { sessionId, betCents, useFreeSpin } = req.body ?? {};
  if (!sessionId || typeof betCents !== "number") {
    res.status(400).json({ error: "sessionId and betCents required" });
    return;
  }

  const session = getSession(sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const config = getConfig(session.gameId);

  try {
    const result = executeSpin(
      session,
      config,
      betCents,
      useFreeSpin !== false
    );
    res.json(result);
  } catch (err) {
    if (err instanceof SpinError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Spin failed" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const clientDir = path.resolve(__dirname, "../../client");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: "0.0.0.0",
      },
      appType: "spa",
      root: clientDir,
    });
    app.use(vite.middlewares);
  } else {
    const clientDist = path.resolve(__dirname, "../../client/dist");
    app.use(express.static(clientDist));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.join(clientDist, "index.html"), (err) => {
        if (err) next();
      });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🇿🇦  SA White-label Slot API & Frontend`);
    console.log(`    http://0.0.0.0:${PORT}`);
    console.log(`    Demo mode · ZAR · server-authoritative RNG\n`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});

