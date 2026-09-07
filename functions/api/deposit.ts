import { type SessionState } from "../../shared/src/index.js";

export interface Env {
  SESSIONS?: KVNamespace;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { sessionId, amountCents, method, metadata } = (await context.request.json()) as {
      sessionId?: string;
      amountCents?: number;
      method?: string;
      metadata?: Record<string, unknown>;
    };

    if (!sessionId || typeof amountCents !== "number" || amountCents <= 0) {
      return new Response(
        JSON.stringify({ error: "Valid sessionId and positive amountCents required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
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

    if (!session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    session.balanceCents += amountCents;

    if (context.env?.SESSIONS) {
      await context.env.SESSIONS.put(`session:${sessionId}`, JSON.stringify(session), {
        expirationTtl: 86400,
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        balanceCents: session.balanceCents,
        depositedCents: amountCents,
        method: method || "card",
        metadata: metadata || {},
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Deposit failed" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  }
};
