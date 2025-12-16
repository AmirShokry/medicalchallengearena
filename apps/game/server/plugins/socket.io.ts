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
import {
  findGameStateByUserId,
  getFullGameStateForReconnection,
  getGameState,
  updatePlayerConnectionState,
  getOpponentId,
  cleanupGameState,
  cleanupStaleGames,
} from "../socket-handlers/match/game-state-manager";
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
export default defineNitroPlugin(async (nitroApp: NitroApp) => {
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
    pingTimeout: 18000e3, // 5 hours before considering the connection closed
  });

  io.bind(engine);

  // Periodically clean up stale games (games older than 4 hours with no activity)
  // This prevents memory leaks from abandoned games
  setInterval(
    () => {
      cleanupStaleGames(4); // Clean up games older than 4 hours
    },
    30 * 60 * 1000
  ); // Run every 30 minutes

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
      // Always update the mapping to the new socket
      userIdToGameSocketId.set(userId, socket.id);
    }

    // Check if this user has an active game session (either reconnection or fresh connection)
    const sessionInfo = findGameSessionByUserId(userId);
    const gameStateInfo = findGameStateByUserId(userId);

    // If user has an active game session, restore it
    if (sessionInfo && gameStateInfo && !isExistingSocketInGame) {
      const { roomName, session } = sessionInfo;
      const { gameState } = gameStateInfo;

      console.log(
        `[Game] Restoring game session for ${socket.data.session.username} in room ${roomName}`
      );

      // Update connection state to connected
      updatePlayerConnectionState(roomName, userId, "connected");

      // Restore socket state
      socket.data.roomName = roomName;
      socket.data.isInGame = true;
      socket.join(roomName);

      // Get the opponent's user ID from the session
      const opponentId =
        session.player1Id === userId ? session.player2Id : session.player1Id;

      // Find opponent socket - they might have also reconnected
      let opponentSocket: ReturnType<typeof getSocketByUserId> = undefined;

      // First try the userIdToGameSocketId mapping
      opponentSocket = getSocketByUserId(opponentId);

      // If not found, search through all connected sockets
      if (!opponentSocket) {
        for (const [, connectedSocket] of gameIO.sockets) {
          if (connectedSocket.data?.session?.id === opponentId) {
            opponentSocket = connectedSocket;
            // Update the mapping
            userIdToGameSocketId.set(opponentId, connectedSocket.id);
            break;
          }
        }
      }

      if (opponentSocket) {
        // Re-link the sockets bidirectionally
        socket.data.opponentSocket = opponentSocket;
        opponentSocket.data.opponentSocket = socket;

        // Notify the opponent that the user has reconnected
        opponentSocket.emit("opponentReconnected");
        console.log(
          `[Game] Re-linked ${socket.data.session.username} with opponent ${opponentSocket.data.session?.username}`
        );
      } else {
        console.log(
          `[Game] Opponent (ID: ${opponentId}) not currently connected for user ${socket.data.session.username}`
        );
      }

      // Get full game state for restoration
      const fullGameState = getFullGameStateForReconnection(roomName, userId);

      // Emit reconnection event to the reconnected user with full game state
      socket.emit("gameSessionRestored", {
        roomName,
        gameId: session.gameId,
        opponentConnected: !!opponentSocket,
        gameState: fullGameState
          ? {
              cases: fullGameState.cases,
              userProgress: {
                currentCaseIdx: fullGameState.userProgress.currentCaseIdx,
                currentQuestionIdx:
                  fullGameState.userProgress.currentQuestionIdx,
                currentQuestionNumber:
                  fullGameState.userProgress.currentQuestionNumber,
                records: fullGameState.userProgress.records,
                hasSolved: fullGameState.userProgress.hasSolved,
              },
              opponentProgress: {
                records: fullGameState.opponentProgress.records,
                hasSolved: fullGameState.opponentProgress.hasSolved,
                currentQuestionNumber:
                  fullGameState.opponentProgress.currentQuestionNumber,
              },
            }
          : undefined,
      });

      console.log(
        `[Game] Sent game state restoration to ${socket.data.session.username}`
      );
    }

    /**
     * Handle user away notification (tab hidden/minimized)
     */
    socket.on("userAway", () => {
      if (!socket.data.roomName || !socket.data.isInGame) return;

      updatePlayerConnectionState(
        socket.data.roomName,
        socket.data.session?.id,
        "away"
      );

      // Notify opponent that user is away
      const opponentUserId = socket.data.opponentSocket?.data?.session?.id;
      const opponentSocket = opponentUserId
        ? getSocketByUserId(opponentUserId)
        : undefined;

      if (opponentSocket) {
        opponentSocket.emit("opponentAway");
      }

      console.log(
        `[Game] User ${socket.data.session?.username} is away in room ${socket.data.roomName}`
      );
    });

    /**
     * Handle user back notification (tab visible again)
     */
    socket.on("userBack", () => {
      // Try to restore roomName from game state if not set
      if (!socket.data.roomName) {
        const userId = socket.data.session?.id;
        if (userId) {
          const gameStateInfo = findGameStateByUserId(userId);
          if (gameStateInfo) {
            socket.data.roomName = gameStateInfo.roomName;
            socket.data.isInGame = true;
            socket.join(gameStateInfo.roomName);
            console.log(
              `[Game] Restored roomName ${gameStateInfo.roomName} for user ${socket.data.session?.username} in userBack`
            );
          }
        }
      }

      if (!socket.data.roomName || !socket.data.isInGame) return;

      updatePlayerConnectionState(
        socket.data.roomName,
        socket.data.session?.id,
        "connected"
      );

      // Find opponent socket - try multiple methods
      let opponentSocket: ReturnType<typeof getSocketByUserId> = undefined;

      // Method 1: Try cached reference
      const opponentUserId = socket.data.opponentSocket?.data?.session?.id;
      if (opponentUserId) {
        opponentSocket = getSocketByUserId(opponentUserId);
      }

      // Method 2: Try game state
      if (!opponentSocket) {
        const opponentId = getOpponentId(
          socket.data.roomName,
          socket.data.session?.id
        );
        if (opponentId) {
          opponentSocket = getSocketByUserId(opponentId);
          // Also search through connected sockets if not in map
          if (!opponentSocket) {
            for (const [, connectedSocket] of gameIO.sockets) {
              if (connectedSocket.data?.session?.id === opponentId) {
                opponentSocket = connectedSocket;
                userIdToGameSocketId.set(opponentId, connectedSocket.id);
                break;
              }
            }
          }
        }
      }

      if (opponentSocket) {
        // Re-link sockets
        socket.data.opponentSocket = opponentSocket;
        opponentSocket.data.opponentSocket = socket;

        // Emit both events - opponentBack for tab visibility and opponentReconnected for socket state
        opponentSocket.emit("opponentBack");
        opponentSocket.emit("opponentReconnected");
      }

      console.log(
        `[Game] User ${socket.data.session?.username} is back in room ${socket.data.roomName}`
      );
    });

    /**
     * Handle game reconnection request (user refreshed page or navigated directly to game URL)
     * This is emitted when user lands on /game/exam/multi/:roomId without game state
     */
    socket.on("requestGameReconnection", (roomId: string) => {
      console.log(
        `[Game] User ${socket.data.session?.username} requesting game reconnection for room ${roomId}`
      );

      const userId = socket.data.session?.id;
      if (!userId) {
        socket.emit("gameReconnectionFailed", { reason: "not_authenticated" });
        return;
      }

      // Find game state by room name
      const gameState = getGameState(roomId);
      if (!gameState) {
        console.log(`[Game] No game state found for room ${roomId}`);
        socket.emit("gameReconnectionFailed", { reason: "game_not_found" });
        return;
      }

      // Verify user is part of this game
      if (gameState.player1Id !== userId && gameState.player2Id !== userId) {
        console.log(
          `[Game] User ${userId} is not part of game in room ${roomId}`
        );
        socket.emit("gameReconnectionFailed", { reason: "not_in_game" });
        return;
      }

      // Restore socket data
      socket.data.roomName = roomId;
      socket.data.isInGame = true;
      socket.join(roomId);

      // Update player connection state
      updatePlayerConnectionState(roomId, userId, "connected");

      // Register socket in the user ID map
      userIdToGameSocketId.set(userId, socket.id);

      // Find opponent
      const opponentId = getOpponentId(roomId, userId);
      let opponentSocket: ReturnType<typeof getSocketByUserId> = undefined;
      let opponentConnected = false;

      if (opponentId) {
        opponentSocket = getSocketByUserId(opponentId);

        // Also search through connected sockets if not in map
        if (!opponentSocket) {
          for (const [, connectedSocket] of gameIO.sockets) {
            if (connectedSocket.data?.session?.id === opponentId) {
              opponentSocket = connectedSocket;
              userIdToGameSocketId.set(opponentId, connectedSocket.id);
              break;
            }
          }
        }

        if (opponentSocket) {
          // Re-link sockets
          socket.data.opponentSocket = opponentSocket;
          opponentSocket.data.opponentSocket = socket;
          opponentConnected = true;

          // Notify opponent that we're back
          opponentSocket.emit("opponentBack");
          opponentSocket.emit("opponentReconnected");
        }
      }

      // Send game session restored event
      // Get the player's progress and info
      const isPlayer1 = gameState.player1Id === userId;
      const playerProgress = isPlayer1
        ? gameState.player1Progress
        : gameState.player2Progress;
      const opponentProgress = isPlayer1
        ? gameState.player2Progress
        : gameState.player1Progress;
      const userInfo = isPlayer1
        ? gameState.player1Info
        : gameState.player2Info;
      const opponentInfo = isPlayer1
        ? gameState.player2Info
        : gameState.player1Info;
      const isMaster = isPlayer1
        ? gameState.player1IsMaster
        : !gameState.player1IsMaster;

      console.log(
        `[Game] Emitting gameSessionRestored to ${socket.data.session?.username}`
      );

      socket.emit("gameSessionRestored", {
        roomName: roomId,
        gameId: gameState.gameId,
        opponentConnected,
        userInfo,
        opponentInfo,
        isMaster,
        gameState: {
          cases: gameState.cases,
          userProgress: {
            currentCaseIdx: playerProgress.currentCaseIdx,
            currentQuestionIdx: playerProgress.currentQuestionIdx,
            currentQuestionNumber: playerProgress.currentQuestionNumber,
            records: playerProgress.records,
            hasSolved: playerProgress.hasSolved,
          },
          opponentProgress: {
            records: opponentProgress.records,
            hasSolved: opponentProgress.hasSolved,
            currentQuestionNumber: opponentProgress.currentQuestionNumber,
          },
        },
      });

      console.log(
        `[Game] Game reconnection successful for ${socket.data.session?.username} in room ${roomId}`
      );
    });

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

      // Clean up game state if user was in a game
      if (socket?.data.isInGame && socket.data.opponentSocket) {
        // Use user ID to find opponent's current socket (handles reconnection case)
        const opponentUserId = socket.data.opponentSocket.data?.session?.id;
        const currentOpponentSocket = opponentUserId
          ? getSocketByUserId(opponentUserId)
          : undefined;

        if (currentOpponentSocket) {
          // Only emit opponentLeft if the disconnect reason indicates a real disconnection
          // (user intentionally left via navigation or server kicked them)
          // Don't emit for ping timeout if user might reconnect
          if (
            reason === "client namespace disconnect" ||
            reason === "server namespace disconnect"
          ) {
            currentOpponentSocket.emit("opponentLeft");
            currentOpponentSocket.helpers.reset();

            // Clean up game session AND game state (user intentionally left)
            if (socket.data.roomName) {
              unregisterGameSession(socket.data.roomName);
              cleanupGameState(socket.data.roomName);
            }

            // Only remove from mapping if this is a real disconnection
            if (
              userIdToGameSocketId.get(socket.data.session?.id) === socket.id
            ) {
              userIdToGameSocketId.delete(socket.data.session?.id);
            }

            socket.helpers.reset();

            // Update presence to online when leaving game
            await notifyGameEnded(
              socket.data.session.id,
              socket.data.session.username
            );
          } else {
            // For ping timeout or transport close, give the user a chance to reconnect
            // The opponent will be notified via opponentDisconnected instead
            // DON'T clean up game state or socket mapping - user may reconnect
            updatePlayerConnectionState(
              socket.data.roomName,
              socket.data.session?.id,
              "disconnected"
            );
            currentOpponentSocket.emit("opponentDisconnected", { reason });

            console.log(
              `[Game] User ${socket.data.session?.username} disconnected (${reason}), keeping game state for reconnection`
            );

            // Don't reset socket helpers, don't delete userIdToGameSocketId, don't call notifyGameEnded
            // The user may reconnect and resume the game
          }
        } else {
          // No opponent socket found, but still handle disconnection gracefully
          if (
            reason === "client namespace disconnect" ||
            reason === "server namespace disconnect"
          ) {
            if (socket.data.roomName) {
              unregisterGameSession(socket.data.roomName);
              cleanupGameState(socket.data.roomName);
            }

            // Only remove from mapping if this is a real disconnection
            if (
              userIdToGameSocketId.get(socket.data.session?.id) === socket.id
            ) {
              userIdToGameSocketId.delete(socket.data.session?.id);
            }

            socket.helpers.reset();
            await notifyGameEnded(
              socket.data.session.id,
              socket.data.session.username
            );
          } else {
            // Mark as disconnected but keep state and mapping
            if (socket.data.roomName) {
              updatePlayerConnectionState(
                socket.data.roomName,
                socket.data.session?.id,
                "disconnected"
              );
            }
          }
        }
      } else {
        // User was not in a game - safe to remove from mapping
        if (userIdToGameSocketId.get(socket.data.session?.id) === socket.id) {
          userIdToGameSocketId.delete(socket.data.session?.id);
        }
      }
    });

    socket.on("userLeft", async () => {
      // CRITICAL: Secondary tabs should NEVER affect the primary game session
      if (socket.data.isSecondaryTab) {
        console.warn(
          `[Game] BLOCKED: Secondary tab for ${socket.data.session?.username} tried to leave game`
        );
        return;
      }

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

        // Clean up both game session AND game state (user explicitly left)
        if (socket.data.roomName) {
          unregisterGameSession(socket.data.roomName);
          cleanupGameState(socket.data.roomName);
        }

        socket.helpers.reset();

        // Update presence when user leaves game/matchmaking
        await notifyGameEnded(
          socket.data.session.id,
          socket.data.session.username
        );
      }
      // If not in game (just leaving queue/invite), don't change status
      // User is still on matchmaking page, so they stay "matchmaking"
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

    // NOTE: We intentionally do NOT handle game cleanup here.
    // When a socket disconnects (including ping timeout), it automatically leaves all rooms.
    // Game cleanup is handled in the 'disconnect' event handler, which properly distinguishes
    // between intentional disconnects (emit opponentLeft) and temporary disconnects like
    // ping timeout (emit opponentDisconnected, keep state for reconnection).
    //
    // Handling cleanup here would break reconnection because:
    // 1. Ping timeout disconnect -> socket leaves room -> this handler fires
    // 2. We'd emit opponentLeft and clean up state
    // 3. User can't reconnect because state was destroyed
    //
    // The 'userLeft' event handler also properly cleans up when user explicitly leaves.
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
