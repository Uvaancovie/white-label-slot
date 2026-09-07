import {
  defaultGameConfig,
  type CreateSessionResponse,
  type GameConfig,
  type SessionState,
} from "../../shared/src/index.js";

export interface Env {
  SESSIONS?: KVNamespace;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    let body: any = {};
    try {
      body = await context.request.json();
    } catch {
      body = {};
    }

    const url = new URL(context.request.url);
    const operatorId =
      body?.operatorId ?? url.searchParams.get("operatorId") ?? "demo-operator";
    const gameId =
      body?.gameId ?? url.searchParams.get("gameId") ?? "springbok-rush";

    const config: GameConfig = {
      ...defaultGameConfig,
      gameId,
    };

    const sessionId = `ses_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const session: SessionState = {
      sessionId,
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

    if (context.env?.SESSIONS) {
      await context.env.SESSIONS.put(`session:${sessionId}`, JSON.stringify(session), {
        expirationTtl: 86400, // 24 hours
      });
    }

    const payload: CreateSessionResponse = {
      session,
      config,
    };

    return new Response(JSON.stringify(payload), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Failed to create session" }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
};
