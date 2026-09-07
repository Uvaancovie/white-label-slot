import {
  buildGrid,
  createRng,
  defaultGameConfig,
  evaluateSpin,
  rollStops,
  type GameConfig,
  type SessionState,
  type SpinResult,
} from "../../shared/src/index.js";

export interface Env {
  SESSIONS?: KVNamespace;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { sessionId, betCents, useFreeSpin } = (await context.request.json()) as {
      sessionId?: string;
      betCents?: number;
      useFreeSpin?: boolean;
    };

    if (!sessionId || typeof betCents !== "number") {
      return new Response(
        JSON.stringify({ error: "sessionId and betCents required" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    let session: SessionState | null = null;
    if (context.env?.SESSIONS) {
      const data = await context.env.SESSIONS.get(`session:${sessionId}`);
      if (data) {
        try {
          session = JSON.parse(data);
        } catch {
          session = null;
        }
      }
    }

    // If running in local preview or KV isn't provisioned yet, create a temporary session
    if (!session) {
      session = {
        sessionId,
        operatorId: "demo-operator",
        gameId: "springbok-rush",
        createdAt: new Date().toISOString(),
        balanceCents: defaultGameConfig.betting.startingBalanceCents,
        freeSpinsRemaining: 0,
        freeSpinMultiplier: 3,
        stats: {
          spins: 0,
          totalBetCents: 0,
          totalWinCents: 0,
        },
      };
    }

    const config: GameConfig = {
      ...defaultGameConfig,
      gameId: session.gameId,
    };

    const willUseFreeSpin = Boolean(useFreeSpin !== false && session.freeSpinsRemaining > 0);

    if (!willUseFreeSpin) {
      if (
        betCents < config.betting.minBetCents ||
        betCents > config.betting.maxBetCents
      ) {
        return new Response(JSON.stringify({ error: "Bet out of allowed range" }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
      if (!config.betting.betStepsCents.includes(betCents)) {
        return new Response(JSON.stringify({ error: "Bet must match an allowed step" }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
      if (session.balanceCents < betCents) {
        return new Response(JSON.stringify({ error: "Insufficient demo balance" }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
      session.balanceCents -= betCents;
      session.stats.totalBetCents += betCents;
    } else {
      if (
        betCents < config.betting.minBetCents ||
        betCents > config.betting.maxBetCents
      ) {
        return new Response(JSON.stringify({ error: "Invalid free-spin bet reference" }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
      session.freeSpinsRemaining -= 1;
    }

    session.stats.spins += 1;

    const roundId = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
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
    if (
      config.features.freeSpins &&
      scatterWin &&
      scatterWin.freeSpinsAwarded > 0
    ) {
      freeSpinsJustAwarded = scatterWin.freeSpinsAwarded;
      session.freeSpinsRemaining += freeSpinsJustAwarded;
    }

    if (context.env?.SESSIONS) {
      await context.env.SESSIONS.put(`session:${sessionId}`, JSON.stringify(session), {
        expirationTtl: 86400,
      });
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

    return new Response(JSON.stringify(result), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Spin processing failed" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
};
