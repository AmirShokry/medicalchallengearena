import { db, and, eq, sql, inArray } from "@package/database";
import type { GameIO, GameSocket } from "@/shared/types/socket";
const { users_games, users } = db.table;

export function registerMatchEvents(socket: GameSocket, io: GameIO) {
  socket.on("userSolved", (data, stats) => {
    if (!socket?.data) return "No socket data";
    const opponentId = socket.data.opponentSocket!.id;
    io.to(opponentId).emit("opponentSolved", data, stats);
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
          eq(users_games.userId, Number(socket.id))
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
      .where(eq(users.id, Number(socket.id)));

    socket.data.finalStats = {
      totalMedpoints: records.stats.totalMedpoints,
      totalTimeSpentMs: records.stats.totalTimeSpentMs,
    };

    const opponentSocket = socket.data.opponentSocket!;
    if (
      opponentSocket.data.finalStats.totalMedpoints === undefined ||
      opponentSocket.data.finalStats.totalTimeSpentMs === undefined
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
              Number(socket.id),
              Number(opponentSocket.id),
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
            eq(users_games.userId, Number(socket.id))
          )
        );
      await db
        .update(users)
        .set({ gamesWon: sql`${users.gamesWon} + 1` })
        .where(eq(users.id, Number(socket.id)));
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
            eq(users_games.userId, Number(opponentSocket.id))
          )
        );
      await db
        .update(users)
        .set({ gamesWon: sql`${users.gamesWon} + 1` })
        .where(eq(users.id, Number(opponentSocket.id)));
    }
  });
}

export default registerMatchEvents;
