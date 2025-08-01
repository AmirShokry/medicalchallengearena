import type { NitroApp } from "nitropack";
import { Server as Engine } from "engine.io";
import { Server, Socket } from "socket.io";
import { defineEventHandler } from "h3";
import { registerMessage } from "../socket-handlers/social/message";
import { registerSocial } from "../socket-handlers/social/social";
import { registerMatchEvents } from "../socket-handlers/match/in-game";
import { registerMatchMaking } from "../socket-handlers/match/making";
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
  >();

  io.bind(engine);

  const socialIO = io.of("/social") as SocialIO,
    gameIO = io.of("/game") as GameIO;

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

  socialIO.on("connection", async (socket) => {
    // console.log(
    //   `User ${socket.data.session.username} - SID: (${socket.id}) joined the social server`
    // );

    socket.on("disconnect", (reason) => {
      // console.log(
      //   `User ${socket.data.session?.username} - SID: (${socket.id}) disconnected from social server. Reason: ${reason}`
      // );
    });

    registerMessage(socket, socialIO);
    registerSocial(socket, socialIO);
  });
  socialIO.adapter.on("join-room", async (room: string, id: string) => {
    // console.log(
    //   `User ${socialIO.sockets.get(id)?.data?.session?.username} - ${id}  joined room ${room}`
    // );
  });

  socialIO.adapter.on("leave-room", (room: string, id: string) => {
    // const socket = socialIO.sockets.get(id);
    // console.log(
    //   `User ${socket?.data.session.username} -  ${id}  left room ${room}`
    // );
  });
  gameIO.on("connection", (socket) => {
    console.log(
      `User ${socket.data.session.username} - sid: (${socket.id}) joined the game server`
    );

    socket.on("disconnect", (reason) => {
      console.log(
        `User ${socket.data.session?.username} - SID: (${socket.id}) disconnected from game server. Reason: ${reason}`
      );

      // Clean up game state if user was in a game
      if (socket?.data.isInGame && socket.data.opponentSocket?.id) {
        gameIO.to(socket.data.opponentSocket.id).emit("opponentLeft");
        socket.helpers.reset();
      }
    });

    socket.on("userLeft", () => {
      socket.leave(socket?.data?.roomName); // TODO: Leave all rooms except self
      socket.leave("waiting");
    });

    registerMatchMaking(socket, gameIO);
    registerMatchEvents(socket, gameIO);
  });

  gameIO.adapter.on("join-room", (room: string, id: string) => {
    console.log(
      `User ${gameIO.sockets.get(id)?.data?.session?.username} - ${id}  joined room ${room}`
    );
  });

  gameIO.adapter.on("leave-room", (room: string, id: string) => {
    const socket = gameIO.sockets.get(id);
    console.log(
      `User ${socket?.data.session?.username} -  ${id}  left room ${room}`
    );
    if (socket?.data.isInGame) {
      gameIO.to(socket.data.opponentSocket?.id!).emit("opponentLeft");
      socket.helpers.reset();
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
