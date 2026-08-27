import { nanoid } from "nanoid";
import {
  defaultGameConfig,
  type GameConfig,
  type SessionState,
} from "@sa-slot/shared";

const sessions = new Map<string, SessionState>();

export function getConfig(gameId?: string): GameConfig {
  // MVP: single title. Extend with a Map of gameId → config for multi-theme.
  if (gameId && gameId !== defaultGameConfig.gameId) {
    // Still return default but keep id for embed demos
    return { ...defaultGameConfig, gameId };
  }
  return defaultGameConfig;
}

export function createSession(
  operatorId = "demo-operator",
  gameId = defaultGameConfig.gameId,
): SessionState {
  const config = getConfig(gameId);
  const session: SessionState = {
    sessionId: nanoid(16),
    operatorId,
    gameId: config.gameId,
    balanceCents: config.betting.startingBalanceCents,
    freeSpinsRemaining: 0,
    freeSpinMultiplier: config.features.freeSpinMultiplier,
    stats: {
      spins: 0,
      totalBetCents: 0,
      totalWinCents: 0,
    },
    createdAt: new Date().toISOString(),
  };
  sessions.set(session.sessionId, session);
  return session;
}

export function getSession(sessionId: string): SessionState | undefined {
  return sessions.get(sessionId);
}

export function saveSession(session: SessionState): void {
  sessions.set(session.sessionId, session);
}

export function depositSession(
  sessionId: string,
  amountCents: number,
): SessionState | undefined {
  const session = sessions.get(sessionId);
  if (!session) return undefined;
  session.balanceCents += Math.max(0, amountCents);
  sessions.set(sessionId, session);
  return session;
}

