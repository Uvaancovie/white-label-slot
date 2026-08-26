import { nanoid } from "nanoid";
import {
  buildGrid,
  createRng,
  evaluateSpin,
  rollStops,
  type GameConfig,
  type SessionState,
  type SpinResult,
} from "@sa-slot/shared";
import { saveSession } from "./sessionStore.js";

export class SpinError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export function executeSpin(
  session: SessionState,
  config: GameConfig,
  betCents: number,
  useFreeSpin = true,
): SpinResult {
  const willUseFreeSpin = useFreeSpin && session.freeSpinsRemaining > 0;

  if (!willUseFreeSpin) {
    if (
      betCents < config.betting.minBetCents ||
      betCents > config.betting.maxBetCents
    ) {
      throw new SpinError("Bet out of allowed range", 400);
    }
    if (!config.betting.betStepsCents.includes(betCents)) {
      throw new SpinError("Bet must match an allowed step", 400);
    }
    if (session.balanceCents < betCents) {
      throw new SpinError("Insufficient demo balance", 400);
    }
    session.balanceCents -= betCents;
    session.stats.totalBetCents += betCents;
  } else {
    // Free spin: no debit; use last paid bet size stored as betCents param
    if (
      betCents < config.betting.minBetCents ||
      betCents > config.betting.maxBetCents
    ) {
      throw new SpinError("Invalid free-spin bet reference", 400);
    }
    session.freeSpinsRemaining -= 1;
  }

  session.stats.spins += 1;

  const roundId = nanoid(12);
  const serverSeed = `${session.sessionId}:${roundId}:${Date.now()}`;
  const rng = createRng(serverSeed);
  const stopIndices = rollStops(config, rng);
  const grid = buildGrid(config, stopIndices);

  const multiplier = willUseFreeSpin
    ? session.freeSpinMultiplier
    : 1;

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

  saveSession(session);

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
