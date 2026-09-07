import {
  defaultGameConfig,
  type GameConfig,
  type SessionState,
} from "../../../shared/src/index.js";

export interface Env {
  SESSIONS?: KVNamespace;
}

export const onRequestGet: PagesFunction<Env, "sessionId"> = async (context) => {
  const sessionId = context.params.sessionId as string;
  if (!sessionId) {
    return new Response(JSON.stringify({ error: "sessionId required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
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

  if (!session) {
    return new Response(JSON.stringify({ error: "Session not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const config: GameConfig = {
    ...defaultGameConfig,
    gameId: session.gameId,
  };

  return new Response(
    JSON.stringify({
      session,
      config,
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
};
