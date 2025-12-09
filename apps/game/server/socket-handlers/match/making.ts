import { db } from "@package/database";
import { getTRPCCaller } from "@/server/utils/trpc-caller";
import { createMockH3EventFromSocket } from "@/server/utils/mock-h3-event";
import type { ReducedRecordObject } from "@package/types";

import type { GameIO, GameSocket } from "@/shared/types/socket";
import {
  canInviteUser,
  notifyUserBusy,
  notifyGameStarted,
  notifyGameEnded,
} from "./invitation";

const { users_cases, games, users_games } = db.table;

export function registerMatchMaking(socket: GameSocket, io: GameIO) {
  socket.on("challenge", async () => {
    if (socket.data.isInGame)
      throw new Error("Cannot start a challenge while being in a game");

    const currentSocketRooms = socket.rooms;

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
    if (opponentSocket.data.session?.id === socket.data.session?.id)
      return socket.join("waiting");

    console.log(
      `${socket.data.session.username} matched with ${opponentSocket.data.session.username}`
    );

    socket.leave("waiting");
    opponentSocket.leave("waiting");

    io.to(socket?.id).emit("matchFound", {
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
    // Validate that the target user can be invited (online and not busy)
    const inviteCheck = canInviteUser(data?.id);
    if (!inviteCheck.canInvite) {
      // Emit validation failure to the sender
      io.to(socket?.id).emit("invitationValidated", {
        canInvite: false,
        reason: inviteCheck.reason,
      });
      console.log(
        `[Invitation] ${socket.data.session.username} cannot invite user ${data?.id}: ${inviteCheck.reason}`
      );
      return;
    }

    // Find the target user's socket
    for (const friendSocket of io.sockets.values()) {
      if (friendSocket.data.session?.id === data?.id) {
        if (friendSocket.data.isInGame) {
          io.to(socket?.id).emit("invitationValidated", {
            canInvite: false,
            reason: "Opponent is busy",
          });
          return;
        }

        socket.data.isInGame = friendSocket.data.isInGame = true;
        socket.data.opponentSocket = friendSocket;
        friendSocket.data.opponentSocket = socket;

        // Update both users' presence to busy (invitation pending)
        await notifyUserBusy(
          socket.data.session?.id,
          socket.data.session.username
        );
        await notifyUserBusy(
          friendSocket.data.session?.id,
          friendSocket.data.session.username
        );

        console.log(
          `[Invitation] ${socket.data.session.username} sent an invitation to ${friendSocket.data.session.username}`
        );

        io.to(friendSocket?.id).emit("opponentSentInvitation", {
          friendId: socket.data.session?.id,
        });

        break;
      }
    }
  });

  socket.on("userAccepted", async (isInvitation) => {
    const opponentSocket = socket.data.opponentSocket!;
    if (!isInvitation && !opponentSocket.data.hasAccepted)
      return (socket.data.hasAccepted = true);

    const roomName = `game:${socket.data.session.username}-${opponentSocket.data.session.username}`;

    socket.join(roomName);
    opponentSocket.join(roomName);

    socket.data.roomName = opponentSocket.data.roomName = roomName;
    socket.data.isInGame = opponentSocket.data.isInGame = true;
    socket.data.finalStats = opponentSocket.data.finalStats = {} as any;
    socket.data.hasSolved = opponentSocket.data.hasSolved = false;
    socket.data.isMaster = true;
    opponentSocket.data.isMaster = false;

    // Keep both users' presence as busy (accepted but game not started yet)
    // Status changes to ingame when userStartedGame is emitted
    await notifyUserBusy(socket.data.session?.id, socket.data.session.username);
    await notifyUserBusy(
      opponentSocket.data.session?.id,
      opponentSocket.data.session.username
    );

    io.to(opponentSocket?.id).emit("opponentAccepted", {
      isMaster: true,
    });
    io.to(socket?.id).emit("opponentAccepted", {
      isMaster: false,
    });
  });

  socket.on("userStartedGame", async (data) => {
    const roomName = socket.data.roomName;
    const opponentSocket = socket.data.opponentSocket!;

    // Update both users' presence to ingame (game actually starting now)
    await notifyGameStarted(
      socket.data.session?.id,
      socket.data.session.username
    );
    await notifyGameStarted(
      opponentSocket.data.session?.id,
      opponentSocket.data.session.username
    );

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
            userId: socket.data.session?.id,
            opponentId: opponentSocket.data.session?.id,
            options: { count: data.casesCount, studyMode: false },
          });

    if (!cases.length) throw new Error("No cases found");
    function registerCasesRecord(): ReducedRecordObject {
      return cases.flatMap((c) =>
        c.questions.map((q) => ({
          caseId: c.id,
          questionId: q.id,
          categoryId: 0, // TODO: Get actual categoryId from question/case
          nthSelectedChoice: -1,
          nthEliminatedChoices: [] as number[],
          isCorrect: false,
          timeSpentMs: 0,
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
              user_id: socket.data.session?.id,
              case_id: c.id,
            },
            {
              user_id: opponentSocket.data.session?.id,
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
          userId: socket.data.session?.id,
          opponentId: opponentSocket.data.session?.id,
          hasWon: null,
          durationMs: 0,
          data: emptyCasesRecord,
        },
        {
          gameId: id,
          userId: opponentSocket.data.session?.id,
          opponentId: socket.data.session?.id,
          hasWon: null,
          durationMs: 0,
          data: emptyCasesRecord,
        },
      ]);

      return id;
    });
    io.to(roomName).emit("gameStarted", { cases, gameId });
  });

  socket.on("userDeclined", async () => {
    io.socketsLeave(socket.data.roomName);
    socket.leave("waiting");
    const opponentSocket = socket.data.opponentSocket;

    if (opponentSocket) {
      opponentSocket.leave("waiting");
      io.to(opponentSocket?.id).emit("opponentDeclined");
      opponentSocket?.helpers.reset();

      // Reset opponent's presence to online
      await notifyGameEnded(
        opponentSocket.data.session?.id,
        opponentSocket.data.session.username
      );
    }

    socket.helpers.reset();

    // Reset user's presence to online
    await notifyGameEnded(
      socket.data.session?.id,
      socket.data.session.username
    );
  });

  socket.on("userJoinedWaitingRoom", () => socket.join("waiting"));
  socket.on("userSelected", (data) => {
    const opponentId = socket.data.opponentSocket!?.id;
    socket.to(opponentId).emit("opponentSelected", data);
  });
  socket.on("userSentSelectionChat", (data) => {
    const opponentId = socket?.data?.opponentSocket!?.id;
    socket.to(opponentId).emit("opponentSentSelectionChat", data);
  });
}
