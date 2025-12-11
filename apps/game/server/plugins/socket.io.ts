import type { NitroApp } from "nitropack";
import { Server as Engine } from "engine.io";
import { Server, Socket } from "socket.io";
import { defineEventHandler } from "h3";
import { registerFriendMessaging } from "../socket-handlers/social/messaging";
import {
  registerPresence,
  handleUserConnect,
  handleUserDisconnect,
} from "../socket-handlers/social/presence";
import { registerMatchEvents } from "../socket-handlers/match/in-game";
import { registerMatchMaking } from "../socket-handlers/match/making";
import {
  registerInvitationHandlers,
  setSocialIORef,
  notifyGameStarted,
  notifyGameEnded,
  findGameSessionByUserId,
  unregisterGameSession,
} from "../socket-handlers/match/invitation";
import { authenticateSocket } from "../socket-handlers/auth.middleware";
import type {
  ToServerIO,
  ToClientIO,
  GameIO,
  SocialIO,
} from "@/shared/types/socket";

(function override() {
  Object.defineProperty(Socket.prototype, "helpers", {
    get() {
      if (this._helpers) return this._helpers;
      const _this = this as Socket;
      return (this._helpers = {
        reset() {
          _this.data.hasAccepted = false;
          _this.data.hasOpponentLeft = false;
          _this.data.isInGame = false;
          _this.data.isInStudyMode = false;
          _this.data.roomName = "";
          _this.data.opponentSocket = undefined;
          _this.data.finalStats = {};
          _this.data.hasSolved = false;
          _this.data.isMaster = false;
          // console.log(_this.data);
        },
      });
    },
  });
})();

// Map user IDs to their active game socket IDs for reliable lookup after reconnection
const userIdToGameSocketId = new Map<number, string>();

export default defineNitroPlugin((nitroApp: NitroApp) => {
  const engine = new Engine();
  const io = new Server<
    ToServerIO.Default.Events,
    ToClientIO.Default.Events,
    any,
    ToClientIO.Default.Data
  >({
    // Increase ping interval to reduce traffic and handle browser throttling better
    // Browsers throttle timers/network in background tabs, so we need larger intervals
    pingInterval: 60e3, // 60 seconds between pings
    pingTimeout: 120e3, // 120 seconds to wait for pong response
  });

  io.bind(engine);

  const socialIO = io.of("/social") as SocialIO,
    gameIO = io.of("/game") as GameIO;

  // Set reference for cross-namespace communication (presence updates from game namespace)
  setSocialIORef(socialIO);

  // Legacy helper - kept for backwards compatibility, now uses presence system
  socialIO.helpers = {
    getUsersStatusById: function (playersIds: number[]) {
      const usersStatus = new Map<number, "offline" | "online" | "ingame">(
        playersIds.map((id) => [id, "offline"])
      );

      for (const playerId of playersIds) {
        const stringPlayerId = playerId.toString();
        if (socialIO.adapter.sids.has(stringPlayerId))
          usersStatus.set(playerId, "online");

        const gameSocket = gameIO.sockets.get(stringPlayerId);
        if (!gameSocket || gameSocket.id) continue;
        if (gameSocket?.data?.isInGame) usersStatus.set(playerId, "ingame");
      }

      return usersStatus;
    },
  };

  gameIO.use(authenticateSocket);
  socialIO.use(authenticateSocket);

  /**
   * Social namespace connection handler
   * Handles presence and messaging
   */
  socialIO.on("connection", async (socket) => {
    console.log(
      `[Social] User ${socket.data.session.username} (${socket.data.session.id}) connected - SID: ${socket.id}`
    );

    // Handle user presence on connect
    await handleUserConnect(socket, socialIO);

    socket.on("disconnect", async (reason) => {
      console.log(
        `[Social] User ${socket.data.session?.username} disconnected. Reason: ${reason}`
      );
      // Handle user presence on disconnect
      await handleUserDisconnect(socket, socialIO);
    });

    // Register presence handlers (status updates, friend status queries)
    registerPresence(socket, socialIO);

    // Register messaging handlers (friend messages stored in DB)
    registerFriendMessaging(socket, socialIO);
  });

  socialIO.adapter.on("join-room", async (room: string, id: string) => {
    // Room join logging (commented for production)
    // console.log(`[Social] User ${socialIO.sockets.get(id)?.data?.session?.username} joined room ${room}`);
  });

  socialIO.adapter.on("leave-room", (room: string, id: string) => {
    // Room leave logging (commented for production)
    // console.log(`[Social] User left room ${room}`);
  });

  /**
   * Helper function to get the current socket for a user by their user ID
   * This is more reliable than storing socket references which become stale after reconnection
   */
  function getSocketByUserId(userId: number) {
    const socketId = userIdToGameSocketId.get(userId);
    if (!socketId) return undefined;
    return gameIO.sockets.get(socketId);
  }

  /**
   * Game namespace connection handler
   * Handles matchmaking and in-game events
   */
  gameIO.on("connection", (socket) => {
    console.log(
      `[Game] User ${socket.data.session.username} (${socket.data.session.id}) connected - SID: ${socket.id}`
    );

    const userId = socket.data.session.id;
    const previousSocketId = userIdToGameSocketId.get(userId);
    const previousSocket = previousSocketId
      ? gameIO.sockets.get(previousSocketId)
      : undefined;

    // Check if user has an existing socket that's in a game
    const isExistingSocketInGame = previousSocket?.data?.isInGame === true;

    if (isExistingSocketInGame) {
      // Don't replace the in-game socket - this is likely a new tab
      // Mark this socket as a secondary connection
      socket.data.isSecondaryTab = true;
      console.log(
        `[Game] User ${socket.data.session.username} opened new tab while in game. Keeping original socket ${previousSocketId}`
      );
    } else {
      // No active game - safe to register this as the primary socket
      userIdToGameSocketId.set(userId, socket.id);
    }

    // Check if this is a reconnection during an active game (same user, new socket, no existing in-game socket)
    if (
      previousSocketId &&
      previousSocketId !== socket.id &&
      !isExistingSocketInGame
    ) {
      console.log(
        `[Game] User ${socket.data.session.username} reconnected with new socket ID: ${socket.id} (was: ${previousSocketId})`
      );

      // Find and restore any active game session for this user
      const sessionInfo = findGameSessionByUserId(userId);
      if (sessionInfo) {
        const { roomName, session } = sessionInfo;
        console.log(
          `[Game] Restoring game session for ${socket.data.session.username} in room ${roomName}`
        );

        // Restore socket state
        socket.data.roomName = roomName;
        socket.data.isInGame = true;
        socket.join(roomName);

        // Get the opponent's current socket
        const opponentId =
          session.player1Id === userId ? session.player2Id : session.player1Id;
        const opponentSocket = getSocketByUserId(opponentId);

        if (opponentSocket) {
          // Re-link the sockets bidirectionally
          socket.data.opponentSocket = opponentSocket;
          opponentSocket.data.opponentSocket = socket;

          // Notify the opponent that the user has reconnected
          opponentSocket.emit("opponentReconnected");
          console.log(
            `[Game] Re-linked ${socket.data.session.username} with opponent ${opponentSocket.data.session.username}`
          );
        }

        // Emit reconnection event to the reconnected user
        socket.emit("gameSessionRestored", {
          roomName,
          gameId: session.gameId,
          opponentConnected: !!opponentSocket,
        });
      }
    }

    socket.on("disconnect", async (reason) => {
      console.log(
        `[Game] User ${socket.data.session?.username} - SID: (${socket.id}) disconnected from game server. Reason: ${reason}`
      );

      // If this is a secondary tab (opened while in game), ignore its disconnect
      if (socket.data.isSecondaryTab) {
        console.log(
          `[Game] Secondary tab disconnected for ${socket.data.session?.username}, ignoring`
        );
        return;
      }

      // Only remove from mapping if this is still the current socket for the user
      // This prevents removing the mapping when an old socket disconnects after reconnection
      if (userIdToGameSocketId.get(socket.data.session?.id) === socket.id) {
        userIdToGameSocketId.delete(socket.data.session?.id);
      }

      // Clean up game state if user was in a game
      if (socket?.data.isInGame && socket.data.opponentSocket) {
        // Use user ID to find opponent's current socket (handles reconnection case)
        const opponentUserId = socket.data.opponentSocket.data?.session?.id;
        const currentOpponentSocket = opponentUserId
          ? getSocketByUserId(opponentUserId)
          : undefined;

        if (currentOpponentSocket) {
          // Only emit opponentLeft if the disconnect reason indicates a real disconnection
          // Don't emit for ping timeout if user might reconnect
          if (
            reason === "client namespace disconnect" ||
            reason === "server namespace disconnect"
          ) {
            currentOpponentSocket.emit("opponentLeft");
            currentOpponentSocket.helpers.reset();

            // Clean up game session
            if (socket.data.roomName) {
              unregisterGameSession(socket.data.roomName);
            }
          } else {
            // For ping timeout or transport close, give the user a chance to reconnect
            // The opponent will be notified via opponentDisconnected instead
            currentOpponentSocket.emit("opponentDisconnected", { reason });
          }
        }

        socket.helpers.reset();

        // Update presence to online when leaving game
        await notifyGameEnded(
          socket.data.session.id,
          socket.data.session.username
        );
      }
    });

    socket.on("userLeft", async () => {
      socket.leave(socket?.data?.roomName);
      socket.leave("waiting");

      // If the user was in a game, notify opponent and tear down session
      if (socket.data.isInGame) {
        const opponentUserId = socket.data.opponentSocket?.data?.session?.id;
        const opponentSocket = opponentUserId
          ? getSocketByUserId(opponentUserId)
          : undefined;

        if (opponentSocket) {
          opponentSocket.emit("opponentLeft");
          opponentSocket.helpers.reset();
        }

        if (socket.data.roomName) {
          unregisterGameSession(socket.data.roomName);
        }

        socket.helpers.reset();

        // Update presence when user leaves game/matchmaking
        await notifyGameEnded(
          socket.data.session.id,
          socket.data.session.username
        );
      } else {
        // Not in game: ensure presence resets to online when leaving queue/invite
        await notifyGameEnded(
          socket.data.session.id,
          socket.data.session.username
        );
      }
    });

    // Register matchmaking handlers
    registerMatchMaking(socket, gameIO);

    // Register in-game event handlers
    registerMatchEvents(socket, gameIO);

    // Register invitation validation handlers
    registerInvitationHandlers(socket, gameIO);
  });

  gameIO.adapter.on("join-room", (room: string, id: string) => {
    console.log(
      `[Game] User ${gameIO.sockets.get(id)?.data?.session?.username} joined room ${room}`
    );
  });

  gameIO.adapter.on("leave-room", async (room: string, id: string) => {
    const socket = gameIO.sockets.get(id);
    console.log(
      `[Game] User ${socket?.data.session?.username} left room ${room}`
    );

    if (socket?.data.isInGame) {
      const opponentUserId = socket.data.opponentSocket?.data?.session?.id;
      const opponentSocket = opponentUserId
        ? getSocketByUserId(opponentUserId)
        : undefined;

      if (opponentSocket) {
        opponentSocket.emit("opponentLeft");
        opponentSocket.helpers.reset();
      }

      if (socket.data.roomName) {
        unregisterGameSession(socket.data.roomName);
      }

      socket.helpers.reset();

      // Update presence when leaving game room
      await notifyGameEnded(
        socket.data.session.id,
        socket.data.session.username
      );
    }
  });

  nitroApp.router.use(
    "/socket.io/",
    defineEventHandler({
      handler(event) {
        // @ts-expect-error private method and property
        engine.handleRequest(event.node.req, event.node.res);
        event._handled = true;
      },
      websocket: {
        open(peer) {
          // @ts-expect-error private method and property
          engine.prepare(peer._internal.nodeReq);
          // @ts-expect-error private method and property
          engine.onWebSocket(
            // @ts-expect-error private method and property
            peer._internal.nodeReq,
            // @ts-expect-error private method and property
            peer._internal.nodeReq.socket,
            peer.websocket
          );
        },
      },
    })
  );
});
