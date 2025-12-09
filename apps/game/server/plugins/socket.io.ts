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

export default defineNitroPlugin((nitroApp: NitroApp) => {
  const engine = new Engine();
  const io = new Server<
    ToServerIO.Default.Events,
    ToClientIO.Default.Events,
    any,
    ToClientIO.Default.Data
  >({
    pingTimeout: 700e3,
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
   * Game namespace connection handler
   * Handles matchmaking and in-game events
   */
  gameIO.on("connection", (socket) => {
    console.log(
      `[Game] User ${socket.data.session.username} (${socket.data.session.id}) connected - SID: ${socket.id}`
    );

    socket.on("disconnect", async (reason) => {
      console.log(
        `[Game] User ${socket.data.session?.username} disconnected. Reason: ${reason}`
      );

      // Clean up game state if user was in a game
      if (socket?.data.isInGame && socket.data.opponentSocket?.id) {
        gameIO.to(socket.data.opponentSocket.id).emit("opponentLeft");
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

      // Update presence when user leaves game/matchmaking
      if (socket.data.isInGame) {
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
      gameIO.to(socket.data.opponentSocket?.id!).emit("opponentLeft");
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
