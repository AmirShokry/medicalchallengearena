import { db, and, eq, sql, inArray } from "@package/database";
import type { GameIO, GameSocket } from "@/shared/types/socket";
const { users_games, users } = db.table;

/**
 * Server-side timer state for each game room
 * NO setTimeout/setInterval - just timestamps for calculation
 */
interface RoomTimerState {
  questionStartTimestamp: number;
  questionDurationMs: number;
  // For pause: we track total paused time to adjust calculations
  totalPausedMs: number;
  pauseStartTimestamp: number | null; // null = not paused
}

// Map of room names to their timer state
const roomTimers = new Map<string, RoomTimerState>();

const QUESTION_DURATION_MS = 10 * 60e3; // 10 minutes per question

/**
 * Get timer state for a room
 */
function getRoomTimer(roomName: string): RoomTimerState | undefined {
  return roomTimers.get(roomName);
}

/**
 * Start/reset question timer for a room (just stores timestamp, no actual timer)
 */
function startQuestionTimer(roomName: string): number {
  const startTimestamp = Date.now();

  roomTimers.set(roomName, {
    questionStartTimestamp: startTimestamp,
    questionDurationMs: QUESTION_DURATION_MS,
    totalPausedMs: 0,
    pauseStartTimestamp: null,
  });

  console.log(
    `[Timer] Started question for room ${roomName}. Start: ${new Date(startTimestamp).toISOString()}`
  );

  return startTimestamp;
}

/**
 * Calculate remaining time for a room
 */
function getRemainingTime(roomName: string): number {
  const timer = roomTimers.get(roomName);
  if (!timer) return 0;

  const now = Date.now();
  let elapsedMs = now - timer.questionStartTimestamp - timer.totalPausedMs;

  // If currently paused, don't count time since pause started
  if (timer.pauseStartTimestamp !== null) {
    elapsedMs -= now - timer.pauseStartTimestamp;
  }

  return Math.max(0, timer.questionDurationMs - elapsedMs);
}

/**
 * Pause the timer for a room (just records pause start time)
 */
function pauseRoomTimer(roomName: string): void {
  const timer = roomTimers.get(roomName);
  if (!timer || timer.pauseStartTimestamp !== null) return; // Already paused

  timer.pauseStartTimestamp = Date.now();
  console.log(`[Timer] Paused timer for room ${roomName}`);
}

/**
 * Resume the timer for a room (accumulates paused time)
 */
function resumeRoomTimer(roomName: string): void {
  const timer = roomTimers.get(roomName);
  if (!timer || timer.pauseStartTimestamp === null) return; // Not paused

  // Add the paused duration to total
  timer.totalPausedMs += Date.now() - timer.pauseStartTimestamp;
  timer.pauseStartTimestamp = null;

  console.log(
    `[Timer] Resumed timer for room ${roomName}. Total paused: ${timer.totalPausedMs}ms`
  );
}

/**
 * Get the effective start timestamp (adjusted for pauses)
 * This is what client uses to calculate remaining time
 */
function getEffectiveStartTimestamp(roomName: string): number | null {
  const timer = roomTimers.get(roomName);
  if (!timer) return null;

  // Effective start = actual start + total paused time
  // This makes it as if the timer started later
  return timer.questionStartTimestamp + timer.totalPausedMs;
}

/**
 * Check if room is paused
 */
function isRoomPaused(roomName: string): boolean {
  const timer = roomTimers.get(roomName);
  return timer?.pauseStartTimestamp !== null;
}

/**
 * Clean up a room's timer state
 */
function cleanupRoomTimerState(roomName: string): void {
  roomTimers.delete(roomName);
  console.log(`[Timer] Cleaned up timer state for room ${roomName}`);
}

/**
 * Export for cleanup when game ends
 */
export function cleanupRoomTimer(roomName: string): void {
  cleanupRoomTimerState(roomName);
}

/**
 * Helper function to get the current socket for the opponent
 * This uses the user ID to look up the socket, handling reconnection scenarios
 * where the socket reference might be stale
 */
function getOpponentSocket(
  socket: GameSocket,
  io: GameIO
): GameSocket | undefined {
  if (!socket?.data?.opponentSocket?.data?.session?.id) return undefined;

  const opponentUserId = socket.data.opponentSocket.data.session.id;

  // Look up opponent by iterating through connected sockets
  // This ensures we get the current socket even after reconnection
  for (const [, connectedSocket] of io.sockets) {
    if (connectedSocket.data?.session?.id === opponentUserId) {
      // Update the cached reference to the current socket
      socket.data.opponentSocket = connectedSocket as GameSocket;
      return connectedSocket as GameSocket;
    }
  }

  return undefined;
}

export function registerMatchEvents(socket: GameSocket, io: GameIO) {
  /**
   * Handle request to start question timer (called by game master when question starts)
   * No actual timer - just stores the start timestamp
   */
  socket.on("startQuestionTimer", () => {
    const roomName = socket.data?.roomName;
    if (!roomName) return;

    const startTimestamp = startQuestionTimer(roomName);
    const serverTime = Date.now();

    // Emit to both players with the start timestamp and current server time
    io.to(roomName).emit("questionStarted", {
      serverTime,
      startTimestamp,
      durationMs: QUESTION_DURATION_MS,
    });
  });

  /**
   * Handle request for current server time (for sync purposes)
   * Client can use this to sync their local clock with server
   */
  socket.on("requestTimeSync", (callback) => {
    const roomName = socket.data?.roomName;
    const timer = roomName ? getRoomTimer(roomName) : undefined;

    callback({
      serverTime: Date.now(),
      questionStartTimestamp: timer
        ? getEffectiveStartTimestamp(roomName)
        : null,
      questionDurationMs: timer?.questionDurationMs ?? null,
      isPaused: isRoomPaused(roomName),
    });
  });

  socket.on("userSolved", (data, stats) => {
    if (!socket?.data) return "No socket data";
    const opponentSocket = getOpponentSocket(socket, io);
    if (!opponentSocket) {
      console.warn(
        `[Game] Cannot emit userSolved - opponent socket not found for user ${socket.data.session?.username}`
      );
      return;
    }
    io.to(opponentSocket.id).emit("opponentSolved", data, stats);
  });

  /**
   * Handle when both players are ready to advance (called after both solve or timeout)
   * Starts a new question timer (just stores timestamp)
   */
  socket.on("advanceQuestion", () => {
    const roomName = socket.data?.roomName;
    if (!roomName) return;

    const startTimestamp = startQuestionTimer(roomName);
    const serverTime = Date.now();

    // Emit new question start to both players with server time
    io.to(roomName).emit("questionStarted", {
      serverTime,
      startTimestamp,
      durationMs: QUESTION_DURATION_MS,
    });
  });

  socket.on("pauseGame", () => {
    const roomName = socket.data?.roomName;
    if (roomName) {
      pauseRoomTimer(roomName);
    }

    const opponentSocket = getOpponentSocket(socket, io);
    if (!opponentSocket) {
      console.warn(
        `[Game] Cannot emit pauseGame - opponent socket not found for user ${socket.data.session?.username}`
      );
      return;
    }
    io.to(opponentSocket.id).emit("gamePaused");
  });

  socket.on("resumeGame", () => {
    const roomName = socket.data?.roomName;

    if (roomName) {
      resumeRoomTimer(roomName);
    }

    const opponentSocket = getOpponentSocket(socket, io);
    if (!opponentSocket) {
      console.warn(
        `[Game] Cannot emit resumeGame - opponent socket not found for user ${socket.data.session?.username}`
      );
      return;
    }

    // Calculate remaining time and emit with server time for sync
    const remainingMs = roomName ? getRemainingTime(roomName) : null;
    const effectiveStart = roomName
      ? getEffectiveStartTimestamp(roomName)
      : null;
    const serverTime = Date.now();

    io.to(roomName).emit("gameResumed", {
      serverTime,
      startTimestamp: effectiveStart,
      remainingMs,
    });
  });

  socket.on("userFinishedGame", async (gameId, records) => {
    if (!socket?.data) return "No socket data";

    // Clean up room timer state
    if (socket.data.roomName) {
      cleanupRoomTimerState(socket.data.roomName);
    }

    const serverData = records.data.map((d) => {
      const { nthCase, nthQuestion, ...rest } = d;
      return rest;
    });

    //Just make him lose initially, if he wins, we will update it later
    await db
      .update(users_games)
      .set({
        data: serverData,
        durationMs: records.stats.totalTimeSpentMs,
        hasWon: false,
      })
      .where(
        and(
          eq(users_games.gameId, gameId),
          eq(users_games.userId, Number(socket.data.session?.id))
        )
      );

    await db
      .update(users)
      .set({
        medPoints: sql`${users.medPoints} + ${records.stats.totalMedpoints}`,
        questionsCorrect: sql`${users.questionsCorrect} + ${records.stats.correctAnswersCount}`,
        questionsTotal: sql`${users.questionsTotal} + ${records.stats.wrongAnswersCount} + ${records.stats.correctAnswersCount}`,
        eliminationsCorrect: sql`${users.eliminationsCorrect} + ${records.stats.correctEliminationsCount}`,
        eliminationsTotal: sql`${users.eliminationsTotal} + ${records.stats.wrongEliminationsCount} + ${records.stats.correctEliminationsCount}`,
        gamesTotal: sql`${users.gamesTotal} + 1`,
      })
      .where(eq(users?.id, Number(socket.data.session?.id)));
    console.log(`User ${socket.data.session?.id} finished game ${gameId}`);
    async function insertMistakes() {
      const userId = Number(socket.data.session?.id);
      const mistakeCounts: Record<number, number> = {};
      serverData.forEach((d) => {
        if (!d.isCorrect && d.categoryId != null) {
          mistakeCounts[d.categoryId] = (mistakeCounts[d.categoryId] || 0) + 1;
        }
      });

      const values = Object.entries(mistakeCounts)
        .map(
          ([categoryId, count]) =>
            `(${userId}, ${Number(categoryId)}, ${count})`
        )
        .join(",");
      console.log(values);
      if (values.length > 0) {
        await db.execute(
          sql.raw(
            `INSERT INTO users_mistakes ("userId", "category_id", "count") VALUES ${values} ON CONFLICT ("userId", "category_id") DO UPDATE SET "count" = users_mistakes."count" + EXCLUDED."count"`
          )
        );
      }
    }
    await insertMistakes();

    socket.data.finalStats = {
      totalMedpoints: records.stats.totalMedpoints,
      totalTimeSpentMs: records.stats.totalTimeSpentMs,
    };

    // Get the current opponent socket using helper function to handle reconnection
    const opponentSocket = getOpponentSocket(socket, io);
    if (!opponentSocket) {
      console.warn(
        `[Game] User ${socket.data.session?.username} finished game but opponent socket not found`
      );
      return;
    }

    if (
      opponentSocket.data.finalStats?.totalMedpoints === undefined ||
      opponentSocket.data.finalStats?.totalTimeSpentMs === undefined
    )
      return;

    if (
      socket.data.finalStats.totalMedpoints ===
      opponentSocket.data.finalStats.totalMedpoints
    )
      return await db
        .update(users_games)
        .set({ hasWon: null })
        .where(
          and(
            eq(users_games.gameId, gameId),
            inArray(users_games.userId, [
              Number(socket.data.session?.id),
              Number(opponentSocket.data.session?.id),
            ])
          )
        );

    if (
      socket.data.finalStats.totalMedpoints >
      opponentSocket.data.finalStats.totalMedpoints
    ) {
      await db
        .update(users_games)
        .set({ hasWon: true })
        .where(
          and(
            eq(users_games.gameId, gameId),
            eq(users_games.userId, Number(socket.data.session?.id))
          )
        );
      await db
        .update(users)
        .set({ gamesWon: sql`${users.gamesWon} + 1` })
        .where(eq(users?.id, Number(socket.data.session?.id)));
    } else if (
      socket.data.finalStats.totalMedpoints <
      opponentSocket.data.finalStats.totalMedpoints
    ) {
      await db
        .update(users_games)
        .set({ hasWon: true })
        .where(
          and(
            eq(users_games.gameId, gameId),
            eq(users_games.userId, Number(opponentSocket.data.session?.id))
          )
        );
      await db
        .update(users)
        .set({ gamesWon: sql`${users.gamesWon} + 1` })
        .where(eq(users?.id, Number(opponentSocket.data.session?.id)));
    }
  });
}

export default registerMatchEvents;
