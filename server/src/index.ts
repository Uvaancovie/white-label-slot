import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createSession,
  getConfig,
  getSession,
} from "./sessionStore.js";
import { executeSpin, SpinError } from "./spinService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 8787);
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

/** Server-authoritative spin */
app.post("/api/spin", (req, res) => {
  const { sessionId, betCents } = req.body ?? {};
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
    const result = executeSpin(session, config, betCents);
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

/** Production: serve built client */
const clientDist = path.resolve(__dirname, "../../client/dist");
app.use(express.static(clientDist));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(clientDist, "index.html"), (err) => {
    if (err) next();
  });
});

app.listen(PORT, () => {
  console.log(`\n🇿🇦  SA White-label Slot API`);
  console.log(`    http://localhost:${PORT}`);
  console.log(`    Demo mode · ZAR · server-authoritative RNG\n`);
});
