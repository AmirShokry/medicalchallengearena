/**
 * @fileoverview Game invitation system via Socket.IO
 *
 * This module handles game invitations between users:
 * - Validates that the target user is in matchmaking state (can be invited)
 * - Prevents invitations to users who are offline, busy, or in-game
 * - Integrates with presence system for status checks
 * - Coordinates with the game socket namespace for game state
 *
 * Status transitions handled:
 * - matchmaking -> busy (when receiving invitation)
 * - busy -> ingame (when game starts)
 * - ingame/busy -> online (when leaving/finishing game)
 */

import type { GameIO, GameSocket, SocialIO } from "@/shared/types/socket";
import {
  getUserStatus,
  getUserSocketId,
  setUserStatus,
  type UserStatus,
} from "../social/presence";

/**
 * Reference to the social IO namespace (set during initialization)
 */
let socialIORef: SocialIO | null = null;

/**
 * Sets the social IO reference for cross-namespace communication
 */
export function setSocialIORef(io: SocialIO): void {
  socialIORef = io;
}

/**
 * Checks if a user can be invited to a game
 * Users can only be invited if they are in "matchmaking" state
 */
export function canInviteUser(userId: number): {
  canInvite: boolean;
  reason?: string;
  status: UserStatus;
} {
  const status = getUserStatus(userId);

  if (status === "offline") {
    return { canInvite: false, reason: "User is offline", status };
  }

  if (status === "ingame") {
    return { canInvite: false, reason: "User is in a game", status };
  }

  if (status === "busy") {
    return { canInvite: false, reason: "User is busy", status };
  }

  if (status === "online") {
    return { canInvite: false, reason: "User is not in matchmaking", status };
  }

  // Only matchmaking status can be invited
  return { canInvite: true, status };
}

/**
 * Updates user status in the presence system via game socket
 * This is used when a user enters matchmaking, starts a game, or finishes a game
 */
export async function updateUserGameStatus(
  userId: number,
  username: string,
  socketId: string,
  status: UserStatus
): Promise<void> {
  if (!socialIORef) {
    console.warn(
      "[Invitation] Social IO reference not set, cannot update presence"
    );
    return;
  }

  // Use the presence system to update and notify friends
  await setUserStatus(socialIORef, userId, username, socketId, status, true);
}

/**
 * Gets the social socket ID for a user (for game-related notifications)
 */
export function getUserSocialSocketId(userId: number): string | undefined {
  return getUserSocketId(userId);
}

/**
 * Registers invitation-related socket event handlers on the game namespace
 */
export function registerInvitationHandlers(
  socket: GameSocket,
  io: GameIO
): void {
  const { id: userId, username } = socket.data.session;

  /**
   * Check if a user can be invited before sending invitation
   */
  socket.on(
    "checkCanInvite",
    (
      targetUserId: number,
      callback: (result: {
        canInvite: boolean;
        reason?: string;
        status: UserStatus;
      }) => void
    ) => {
      const result = canInviteUser(targetUserId);
      callback(result);
    }
  );

  /**
   * Handle user entering matchmaking state
   * CRITICAL: Do NOT change status if user is already in a game
   */
  socket.on("userJoinedWaitingRoom", async () => {
    // CRITICAL: Block status change if user is in a game or is a secondary tab
    if (socket.data.isInGame) {
      console.warn(
        `[Invitation] BLOCKED: User ${username} tried to enter matchmaking while in game`
      );
      return;
    }

    if (socket.data.isSecondaryTab) {
      console.warn(
        `[Invitation] BLOCKED: Secondary tab for ${username} tried to change status to matchmaking`
      );
      return;
    }

    // Update presence to matchmaking
    if (socialIORef) {
      // Get the user's social socket ID for presence update
      const socialSocketId = getUserSocketId(userId);
      if (socialSocketId) {
        await setUserStatus(
          socialIORef,
          userId,
          username,
          socialSocketId,
          "matchmaking",
          true
        );
      }
    }

    console.log(`[Invitation] User ${username} entered matchmaking`);
  });
}

/**
 * Updates user status to busy (has invitation, accepted invitation not yet started)
 */
export async function notifyUserBusy(
  userId: number,
  username: string
): Promise<void> {
  if (!socialIORef) return;

  const socketId = getUserSocketId(userId);
  if (socketId) {
    await setUserStatus(socialIORef, userId, username, socketId, "busy", true);
  }
}

/**
 * Updates game status when user starts a game (ingame status)
 */
export async function notifyGameStarted(
  userId: number,
  username: string
): Promise<void> {
  if (!socialIORef) return;

  const socketId = getUserSocketId(userId);
  if (socketId) {
    await setUserStatus(
      socialIORef,
      userId,
      username,
      socketId,
      "ingame",
      true
    );
  }
}

/**
 * Updates game status when user finishes a game
 */
export async function notifyGameEnded(
  userId: number,
  username: string
): Promise<void> {
  if (!socialIORef) return;

  const socketId = getUserSocketId(userId);
  if (socketId) {
    await setUserStatus(
      socialIORef,
      userId,
      username,
      socketId,
      "online",
      true
    );
  }
}

/**
 * Map of active game sessions for reconnection support
 * Key: roomName, Value: session info
 */
const activeGameSessions = new Map<
  string,
  {
    player1Id: number;
    player2Id: number;
    gameId: number;
    roomName: string;
    createdAt: number;
  }
>();

/**
 * Registers a new game session for reconnection support
 */
export function registerGameSession(
  roomName: string,
  player1Id: number,
  player2Id: number,
  gameId: number
): void {
  activeGameSessions.set(roomName, {
    player1Id,
    player2Id,
    gameId,
    roomName,
    createdAt: Date.now(),
  });
  console.log(
    `[Game] Registered game session: ${roomName} (game ${gameId}) between ${player1Id} and ${player2Id}`
  );
}

/**
 * Removes a game session when the game ends
 */
export function unregisterGameSession(roomName: string): void {
  if (activeGameSessions.delete(roomName)) {
    console.log(`[Game] Unregistered game session: ${roomName}`);
  }
}

/**
 * Gets a game session by room name
 */
export function getGameSession(roomName: string) {
  return activeGameSessions.get(roomName);
}

/**
 * Finds a game session by user ID
 */
export function findGameSessionByUserId(userId: number) {
  for (const [roomName, session] of activeGameSessions.entries()) {
    if (session.player1Id === userId || session.player2Id === userId) {
      return { roomName, session };
    }
  }
  return undefined;
}
