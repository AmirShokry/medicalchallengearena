import { db, and, eq, sql, inArray } from "@package/database";
import type { GameIO, GameSocket } from "@/shared/types/socket";
import {
  updatePlayerRecords,
  advanceQuestion as advanceQuestionState,
  getOpponentId,
  findGameStateByUserId,
} from "./game-state-manager";
const { users_games, users } = db.table;

/**
 * Timer functionality is disabled - no timeout logic.
 * All time-related calculations return 0.
 */

/**
 * Clean up a room's state (no-op since timer is disabled)
 */
export function cleanupRoomTimer(_roomName: string): void {
  // No-op - timer disabled
}

/**
 * Helper function to get the current socket for the opponent
 * Uses multiple strategies to find the opponent:
 * 1. First try the game state manager (most reliable, works even after reconnection)
 * 2. Then try the cached opponentSocket reference
 * 3. Finally iterate through connected sockets
 */
function getOpponentSocket(
  socket: GameSocket,
  io: GameIO
): GameSocket | undefined {
  const userId = socket.data.session?.id;
  if (!userId) return undefined;

  // Try to get roomName from socket or from game state
  let roomName = socket.data?.roomName;

  // If no roomName on socket, try to find it from game state
  if (!roomName) {
    const gameStateInfo = findGameStateByUserId(userId);
    if (gameStateInfo) {
      roomName = gameStateInfo.roomName;
      // Update socket data with the room name for future calls
      socket.data.roomName = roomName;
      socket.join(roomName);
      console.log(
        `[Game] Restored roomName ${roomName} for user ${socket.data.session?.username}`
      );
    }
  }

  // Strategy 1: Try to get opponent ID from game state manager (most reliable)
  if (roomName) {
    const opponentUserId = getOpponentId(roomName, userId);

    if (opponentUserId) {
      // Look up opponent by iterating through connected sockets
      for (const [, connectedSocket] of io.sockets) {
        if (connectedSocket.data?.session?.id === opponentUserId) {
          // Update the cached reference to the current socket
          socket.data.opponentSocket = connectedSocket as GameSocket;
          return connectedSocket as GameSocket;
        }
      }
    }
  }

  // Strategy 2: Try finding through game state by user ID (works without roomName)
  const gameStateInfo = findGameStateByUserId(userId);
  if (gameStateInfo) {
    const { gameState, roomName: foundRoomName } = gameStateInfo;
    const opponentId =
      gameState.player1Id === userId
        ? gameState.player2Id
        : gameState.player1Id;

    // Update socket's roomName if not set
    if (!socket.data.roomName) {
      socket.data.roomName = foundRoomName;
      socket.join(foundRoomName);
      console.log(
        `[Game] Restored roomName ${foundRoomName} for user ${socket.data.session?.username} via game state`
      );
    }

    for (const [, connectedSocket] of io.sockets) {
      if (connectedSocket.data?.session?.id === opponentId) {
        socket.data.opponentSocket = connectedSocket as GameSocket;
        return connectedSocket as GameSocket;
      }
    }
  }

  // Strategy 3: Fallback to cached opponentSocket reference
  if (socket?.data?.opponentSocket?.data?.session?.id) {
    const cachedOpponentUserId = socket.data.opponentSocket.data.session.id;

    // Look up opponent by iterating through connected sockets
    for (const [, connectedSocket] of io.sockets) {
      if (connectedSocket.data?.session?.id === cachedOpponentUserId) {
        // Update the cached reference to the current socket
        socket.data.opponentSocket = connectedSocket as GameSocket;
        return connectedSocket as GameSocket;
      }
    }
  }

  return undefined;
}

export function registerMatchEvents(socket: GameSocket, io: GameIO) {
  /**
   * Handle request to start question timer (timer is disabled, just emit event)
   */
  socket.on("startQuestionTimer", () => {
    const roomName = socket.data?.roomName;
    if (!roomName) return;

    const serverTime = Date.now();

    // Emit to both players - timer is disabled, just for compatibility
    io.to(roomName).emit("questionStarted", {
      serverTime,
      startTimestamp: serverTime,
      durationMs: 0, // Timer disabled
    });
  });

  /**
   * Handle request for current server time (for sync purposes)
   * Timer is disabled, return minimal info
   */
  socket.on("requestTimeSync", (callback) => {
    callback({
      serverTime: Date.now(),
      questionStartTimestamp: null,
      questionDurationMs: null,
      isPaused: false,
    });
  });

  socket.on("userSolved", (data, stats) => {
    if (!socket?.data) return "No socket data";

    const userId = socket.data.session?.id;

    // Try to get roomName from socket, or restore it from game state
    let roomName = socket.data?.roomName;
    if (!roomName && userId) {
      const gameStateInfo = findGameStateByUserId(userId);
      if (gameStateInfo) {
        roomName = gameStateInfo.roomName;
        socket.data.roomName = roomName;
        socket.data.isInGame = true;
        socket.join(roomName);
        console.log(
          `[Game] Restored roomName ${roomName} for user ${socket.data.session?.username} in userSolved`
        );
      }
    }

    // Persist the answer to game state for reconnection support
    if (roomName && userId) {
      updatePlayerRecords(roomName, userId, data, stats);
      console.log(
        `[Game] Persisted answer for user ${socket.data.session?.username} in room ${roomName}`
      );
    } else if (userId) {
      // Try to persist even without roomName by finding via userId
      const gameStateInfo = findGameStateByUserId(userId);
      if (gameStateInfo) {
        updatePlayerRecords(gameStateInfo.roomName, userId, data, stats);
        console.log(
          `[Game] Persisted answer for user ${socket.data.session?.username} via game state lookup`
        );
      }
    }

    // Emit to the room, excluding the sender (so opponent receives it)
    // This works even if opponent reconnected with a different socket ID
    if (roomName) {
      socket.to(roomName).emit("opponentSolved", data, stats);
      console.log(
        `[Game] Emitted opponentSolved to room ${roomName} (excluding sender ${socket.data.session?.username})`
      );
    } else {
      // Fallback: try to find opponent socket directly
      const opponentSocket = getOpponentSocket(socket, io);
      if (opponentSocket) {
        io.to(opponentSocket.id).emit("opponentSolved", data, stats);
        console.log(
          `[Game] Emitted opponentSolved directly to opponent ${opponentSocket.data.session?.username}`
        );
      } else {
        console.warn(
          `[Game] Cannot emit userSolved - no room and opponent socket not found for user ${socket.data.session?.username}`
        );
      }
    }
  });

  /**
   * Handle when both players are ready to advance (timer disabled, just emit event)
   */
  socket.on("advanceQuestion", () => {
    let roomName = socket.data?.roomName;

    // Try to restore roomName from game state if not set
    if (!roomName) {
      const userId = socket.data.session?.id;
      if (userId) {
        const gameStateInfo = findGameStateByUserId(userId);
        if (gameStateInfo) {
          roomName = gameStateInfo.roomName;
          socket.data.roomName = roomName;
          socket.join(roomName);
          console.log(
            `[Game] Restored roomName ${roomName} for user ${socket.data.session?.username} in advanceQuestion`
          );
        }
      }
    }

    if (!roomName) return;

    // Advance question in game state for reconnection support
    // Returns false if already advanced (prevents double-advance from both players)
    const didAdvance = advanceQuestionState(roomName);

    if (!didAdvance) {
      // Already advanced by the other player, don't emit again
      return;
    }

    const serverTime = Date.now();

    // Emit new question start to both players - timer disabled
    io.to(roomName).emit("questionStarted", {
      serverTime,
      startTimestamp: serverTime,
      durationMs: 0, // Timer disabled
    });
  });

  // Pause functionality is disabled - these are no-ops for compatibility
  socket.on("pauseGame", () => {
    // No-op - pause disabled
  });

  socket.on("resumeGame", () => {
    // No-op - pause disabled
  });

  socket.on("userFinishedGame", async (gameId, records) => {
    if (!socket?.data) return "No socket data";

    // Timer cleanup is disabled (no timer state to clean up)

    const serverData = records.data.map((d) => {
      const { nthCase, nthQuestion, ...rest } = d;
      return rest;
    });

    //Just make him lose initially, if he wins, we will update it later
    await db
      .update(users_games)
      .set({
        data: serverData,
        durationMs: Math.round(records.stats.totalTimeSpentMs),
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
