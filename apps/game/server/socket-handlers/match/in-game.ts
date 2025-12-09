import { db, and, eq, sql, inArray } from "@package/database";
import type { GameIO, GameSocket } from "@/shared/types/socket";
const { users_games, users } = db.table;

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

  socket.on("pauseGame", () => {
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
    const opponentSocket = getOpponentSocket(socket, io);
    if (!opponentSocket) {
      console.warn(
        `[Game] Cannot emit resumeGame - opponent socket not found for user ${socket.data.session?.username}`
      );
      return;
    }
    io.to(opponentSocket.id).emit("gameResumed");
  });

  socket.on("userFinishedGame", async (gameId, records) => {
    if (!socket?.data) return "No socket data";
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
