import type {
  CreateSessionResponse,
  SpinResult,
} from "@sa-slot/shared";

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      (data as { error?: string }).error ?? `HTTP ${res.status}`,
    );
  }
  return data as T;
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
  const res = await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operatorId, gameId }),
  });
  return parseJson(res);
}

export async function spin(
  sessionId: string,
  betCents: number,
  turbo = false,
  useFreeSpin = true,
): Promise<SpinResult> {
  const res = await fetch("/api/spin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, betCents, turbo, useFreeSpin }),
  });
  return parseJson(res);
}
