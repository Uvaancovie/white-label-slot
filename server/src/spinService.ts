import { nanoid } from "nanoid";
import {
  buildGrid,
  createRng,
  evaluateSpin,
  rollStops,
  type GameConfig,
  type PersistentWild,
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

  // 1. Process existing persistent wilds from session
  const previousWilds: PersistentWild[] = session.persistentWilds ?? [];
  const activePersistentWilds: PersistentWild[] = [];

  for (const prev of previousWilds) {
    if (prev.type === "walking") {
      // Walking Wild steps 1 reel to the left
      const nextReel = prev.reel - 1;
      if (nextReel >= 0) {
        activePersistentWilds.push({
          ...prev,
          reel: nextReel,
        });
      }
      // If nextReel < 0, it falls off the board and is destroyed
    } else if (prev.type === "sticky") {
      // Sticky Wild remains in place
      if (prev.spinsRemaining !== undefined) {
        const remaining = prev.spinsRemaining - 1;
        if (remaining > 0) {
          activePersistentWilds.push({
            ...prev,
            spinsRemaining: remaining,
          });
        }
      } else {
        activePersistentWilds.push(prev);
      }
    }
  }

  // 2. Turn newly landed natural wild symbols into persistent wilds if wild feature enabled
  if (config.features.wild) {
    for (let reel = 0; reel < grid.length; reel++) {
      for (let row = 0; row < grid[reel].length; row++) {
        if (grid[reel][row] === "wild") {
          // Check if this position is already occupied by an active persistent wild
          const alreadyOccupied = activePersistentWilds.some(
            (w) => w.reel === reel && w.row === row
          );
          if (!alreadyOccupied) {
            // Free spins grant Sticky Wilds; Base spins grant Walking Wilds (walking left)
            const wildType = willUseFreeSpin ? "sticky" : "walking";
            activePersistentWilds.push({
              instanceId: nanoid(8),
              symbolId: "wild",
              reel,
              row,
              type: wildType,
              multiplier: 1,
              spinsRemaining: wildType === "sticky" ? 3 : undefined,
            });
          }
        }
      }
    }
  }

  // 3. Overlay all active persistent wilds onto the grid so they participate in win evaluations
  for (const pw of activePersistentWilds) {
    if (pw.reel >= 0 && pw.reel < grid.length && pw.row >= 0 && pw.row < grid[pw.reel].length) {
      grid[pw.reel][pw.row] = "wild";
    }
  }

  // Save updated persistent wilds state in session
  session.persistentWilds = activePersistentWilds;

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
    persistentWilds: activePersistentWilds,
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
