import { db } from "@package/database";
import { getTRPCCaller } from "@/server/utils/trpc-caller";
import { createMockH3EventFromSocket } from "@/server/utils/mock-h3-event";

import type { GameIO, GameSocket } from "@/shared/types/socket";

const { users_cases, games, users_games } = db.table;

export function registerMatchMaking(socket: GameSocket, io: GameIO) {
  socket.on("challenge", async () => {
    if (socket.data.isInGame)
      throw new Error("Cannot start a challenge while being in a game");

    const currentSocketRooms = io.adapter.socketRooms(socket.id);

    console.log(`${socket.data.session.username} is trying to find a match`);

    if (currentSocketRooms?.has("waiting")) socket.leave("waiting");

    function getRandomOpponentId() {
      //Getting players in the waiting list if any
      const waitingRoomSize = io.adapter?.rooms?.get("waiting")?.size;
      if (!waitingRoomSize) return;

      //Picking 1 id out of (10 or less) players from the waiting list
      const randomId = Math.min(
        Math.floor(Math.random() * waitingRoomSize),
        10
      ); // Limit to 10 room. Don't want to get a very large number

      //Iterating up to the ithPickedRandomId.
      const roomsIterator = io.adapter.rooms.get("waiting")!.values();
      for (let i = 0; i <= randomId; i++) {
        if (i === randomId) return roomsIterator?.next().value as string;
        roomsIterator.next();
      }
    }
    const opponentSocketId = getRandomOpponentId();
    if (!opponentSocketId) return socket.join("waiting");
    const opponentSocket = io.sockets.get(opponentSocketId)!;
    if (opponentSocket.data.session.id === socket.data.session.id)
      return socket.join("waiting");

    console.log(
      `${socket.data.session.username} matched with ${opponentSocket.data.session.username}`
    );

    socket.leave("waiting");
    opponentSocket.leave("waiting");

    io.to(socket.id).emit("matchFound", {
      opponent: {
        ...opponentSocket.data,
        ...opponentSocket.data.session,
      },
    });
    io.to(opponentSocketId).emit("matchFound", {
      opponent: { ...socket.data, ...socket.data.session },
    });

    socket.data.opponentSocket = opponentSocket;
    opponentSocket.data.opponentSocket = socket;
  });

  socket.on("userSentInvitation", async (data) => {
    // TODO: Note that using this way. The invitation will be sent only when the user clicks on play button.
    for (const friendSocket of io.sockets.values()) {
      if (friendSocket.data.session.id === data.id) {
        if (friendSocket.data.isInGame) throw new Error("Opponent is busy");
        socket.data.isInGame = friendSocket.data.isInGame = true;
        socket.data.opponentSocket = friendSocket;
        friendSocket.data.opponentSocket = socket;

        console.log(
          `${socket.data.session.username} sent an invitation to ${friendSocket.data.session.username}`
        );
        io.to(friendSocket.id).emit("opponentSentInvitation", {
          friendId: socket.data.session.id,
        });

        break;
      }
    }
  });
  socket.on("userAccepted", async (isInvitation) => {
    const opponentSocket = socket.data.opponentSocket!;
    if (!isInvitation && !opponentSocket.data.hasAccepted)
      return (socket.data.hasAccepted = true);

    // Create tRPC caller with the socket's authenticated session context
    const appRouterCaller = await getTRPCCaller(
      createMockH3EventFromSocket(socket)
    );

    const systemsCategories =
      await appRouterCaller.systems.matchingSystemCategories({
        user1Id: socket.data.session.id,
        user2Id: opponentSocket.data.session.id,
      });

    const [{ allCount, matchingCount, unusedCount1, unusedCount2 }] =
      await appRouterCaller.cases.mactchingCount({
        user1Id: socket.data.session.id,
        user2Id: opponentSocket.data.session.id,
      });

    const roomName = `game:${socket.data.session.username}-${opponentSocket.data.session.username}`;

    socket.join(roomName);
    opponentSocket.join(roomName);

    socket.data.roomName = opponentSocket.data.roomName = roomName;
    socket.data.isInGame = opponentSocket.data.isInGame = true;
    socket.data.finalStats = opponentSocket.data.finalStats = {} as any;
    // socket.data.totalMedpoints = opponentSocket.data.totalMedpoints = -1;
    socket.data.hasSolved = opponentSocket.data.hasSolved = false;
    socket.data.isMaster = true;
    opponentSocket.data.isMaster = false;
    io.to(opponentSocket.id).emit("opponentAccepted", {
      isMaster: true,
      // systemsCategories,
      // allCount,
      // matchingCount,
      // unusedCount: unusedCount2,
    });
    io.to(socket.id).emit("opponentAccepted", {
      isMaster: false,
      // systemsCategories,
      // allCount,
      // matchingCount,
      // unusedCount: unusedCount1,
    });
  });

  socket.on("userStartedGame", async (data) => {
    const roomName = socket.data.roomName;
    const opponentSocket = socket.data.opponentSocket!;

    // Create tRPC caller with the socket's authenticated session context
    const appRouterCaller = await getTRPCCaller(
      createMockH3EventFromSocket(socket)
    );

    if (!data.selectedCatIds) return;
    const cases =
      data.pool === "all"
        ? await appRouterCaller.block.allBlockByCategoriesIds({
            categoriesIds: data.selectedCatIds,
            options: { count: data.casesCount, studyMode: false },
          })
        : await appRouterCaller.block.unusedBlockByCategoriesIds({
            categoriesIds: data.selectedCatIds,
            userId: socket.data.session.id,
            opponentId: opponentSocket.data.session.id,
            options: { count: data.casesCount, studyMode: false },
          });

    if (!cases.length) throw new Error("No cases found");
    function registerCasesRecord() {
      return cases.flatMap((c, nthCase) =>
        c.questions.map((q) => ({
          caseId: c.id,
          questionId: q.id,
          nthSelectedChoice: -1,
          nthEliminatedChoices: [] as number[],
          isCorrect: false,
          nthCase,
          timeSpentMs: 0,
          medPoints: 0,
        }))
      );
    }

    const emptyCasesRecord = registerCasesRecord();
    const gameId = await db.transaction(async (tx) => {
      await tx
        .insert(users_cases)
        .values(
          cases.flatMap((c) => [
            {
              user_id: socket.data.session.id,
              case_id: c.id,
            },
            {
              user_id: opponentSocket.data.session.id,
              case_id: c.id,
            },
          ])
        )
        .onConflictDoNothing();

      const [{ id }] = await tx
        .insert(games)
        .values([{ mode: "unranked" }])
        .returning();
      await tx.insert(users_games).values([
        {
          gameId: id,
          userId: socket.data.session.id,
          opponentId: opponentSocket.data.session.id,
          hasWon: null,
          durationMs: 0,
          data: emptyCasesRecord,
        },
        {
          gameId: id,
          userId: opponentSocket.data.session.id,
          opponentId: socket.data.session.id,
          hasWon: null,
          durationMs: 0,
          data: emptyCasesRecord,
        },
      ]);

      return id;
    });
    io.to(roomName).emit("gameStarted", { cases, gameId });
  });
  socket.on("userDeclined", () => {
    io.socketsLeave(socket.data.roomName);
    socket.leave("waiting");
    const opponentSocket = socket.data.opponentSocket;

    if (opponentSocket) {
      opponentSocket.leave("waiting");
      io.to(opponentSocket.id).emit("opponentDeclined");
      opponentSocket?.helpers.reset();
    }

    socket.helpers.reset();
  });

  socket.on("userJoinedWaitingRoom", () => socket.join("waiting"));
  socket.on("userSelected", (data) => {
    const opponentId = socket.data.opponentSocket!.id;
    // console.log(`User selected: ${opponentId}`, data);
    socket.to(opponentId).emit("opponentSelected", data);
  });
  socket.on("userSentSelectionChat", (data) => {
    const opponentId = socket?.data?.opponentSocket!.id;
    socket.to(opponentId).emit("opponentSentSelectionChat", data);
  });
}
