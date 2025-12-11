/**
 * @fileoverview Presence management for tracking user online status via Socket.IO
 *
 * This module handles user presence states:
 * - online: User is connected and available for invitations
 * - offline: User is disconnected
 * - matchmaking: User is in multi matchmaking page AND doesn't have an invitation
 * - busy: User has an invitation, accepted one (not started), or is in solo mode
 * - ingame: User successfully started a game (multi or solo)
 *
 * When a user connects, their friends are notified of their online status.
 * When a user disconnects, their friends are notified they went offline.
 * When a user's status changes, friends are notified.
 *
 * Status Flow:
 * - Connect -> online
 * - Enter multi matchmaking page -> matchmaking
 * - Receive/send invitation -> busy
 * - Accept invitation (before game starts) -> busy
 * - Start game -> ingame
 * - Enter solo setup -> busy
 * - Start solo game -> ingame
 * - Leave game/finish game -> online
 * - Disconnect -> offline
 */

import type { SocialIO, SocialSocket } from "@/shared/types/socket";
import { db, eq, or, and } from "@package/database";

const { users_friends, users } = db.table;

/** User status type */
export type UserStatus =
  | "online"
  | "offline"
  | "busy"
  | "matchmaking"
  | "ingame";

/**
 * In-memory store for user presence
 * Maps socket.id to user status information
 */
interface UserPresenceData {
  userId: number;
  username: string;
  status: UserStatus;
  socketId: string;
}

/** Maps userId to their presence data */
const userPresenceMap = new Map<number, UserPresenceData>();

/** Maps socketId to userId for quick lookup on disconnect */
const socketToUserMap = new Map<string, number>();

/** Check if running in production mode */
const isProduction = process.env.NODE_ENV === "production";

/** Debug logger that only logs in non-production */
function debugLog(...args: any[]) {
  if (!isProduction) {
    console.log(...args);
  }
}

/**
 * Gets the current status of a user
 */
export function getUserStatus(userId: number): UserStatus {
  const presence = userPresenceMap.get(userId);
  return presence?.status ?? "offline";
}

/**
 * Gets the socket ID of a user if they're online
 */
export function getUserSocketId(userId: number): string | undefined {
  const presence = userPresenceMap.get(userId);
  return presence?.socketId;
}

/**
 * Gets all online user IDs from a list of user IDs
 */
export function getOnlineUsersFromList(
  userIds: number[]
): Map<number, UserStatus> {
  const statuses = new Map<number, UserStatus>();
  for (const userId of userIds) {
    statuses.set(userId, getUserStatus(userId));
  }
  return statuses;
}

/**
 * Sets a user's status and optionally notifies their friends
 */
export async function setUserStatus(
  io: SocialIO,
  userId: number,
  username: string,
  socketId: string,
  status: UserStatus,
  notifyFriends: boolean = true
): Promise<void> {
  const previousStatus = getUserStatus(userId);

  if (status === "offline") {
    userPresenceMap.delete(userId);
    socketToUserMap.delete(socketId);
  } else {
    userPresenceMap.set(userId, {
      userId,
      username,
      status,
      socketId,
    });
    socketToUserMap.set(socketId, userId);
  }

  // Only notify if status actually changed
  if (notifyFriends && previousStatus !== status) {
    await notifyFriendsOfStatusChange(io, userId, username, status);
  }
}

/**
 * Notifies all friends of a user about their status change
 */
async function notifyFriendsOfStatusChange(
  io: SocialIO,
  userId: number,
  username: string,
  status: UserStatus
): Promise<void> {
  try {
    // Get all friends of the user
    const friendships = await db
      .select({
        friendId: users_friends.user2_id,
      })
      .from(users_friends)
      .where(
        and(
          eq(users_friends.user1_id, userId),
          eq(users_friends.isFriend, true)
        )
      )
      .union(
        db
          .select({
            friendId: users_friends.user1_id,
          })
          .from(users_friends)
          .where(
            and(
              eq(users_friends.user2_id, userId),
              eq(users_friends.isFriend, true)
            )
          )
      );

    // Notify each online friend
    for (const { friendId } of friendships) {
      const friendSocketId = getUserSocketId(friendId);
      if (friendSocketId) {
        // Send actual status - client handles display logic
        io.to(friendSocketId).emit("friendStatusUpdate", {
          id: userId,
          username,
          status,
        });
      }
    }
  } catch (error) {
    console.error("Error notifying friends of status change:", error);
  }
}

/**
 * Handles user connection - sets status to online and notifies friends
 * If the page needs a different status (matchmaking, busy, etc), it will call updateStatus
 */
export async function handleUserConnect(
  socket: SocialSocket,
  io: SocialIO
): Promise<void> {
  const { id: userId, username } = socket.data.session;

  debugLog(
    `[Presence] User ${username} (${userId}) connected via socket ${socket.id}`
  );

  // Set status to online and notify friends immediately
  // If the page needs a different status, it will call updateStatus which will notify again
  await setUserStatus(io, userId, username, socket.id, "online", true);
}

/**
 * Handles user disconnection - sets them as offline and notifies friends
 */
export async function handleUserDisconnect(
  socket: SocialSocket,
  io: SocialIO
): Promise<void> {
  const userId = socketToUserMap.get(socket.id);
  if (!userId) return;

  const presence = userPresenceMap.get(userId);
  if (!presence) return;

  debugLog(`[Presence] User ${presence.username} (${userId}) disconnected`);

  await setUserStatus(
    io,
    userId,
    presence.username,
    socket.id,
    "offline",
    true
  );
}

/**
 * Registers presence-related socket event handlers
 */
export function registerPresence(socket: SocialSocket, io: SocialIO): void {
  // Handle status update requests from the client
  socket.on("updateStatus", async (status: UserStatus) => {
    const { id: userId, username } = socket.data.session;

    // Validate status - all statuses except "offline" can be set by client
    if (!["online", "busy", "matchmaking", "ingame"].includes(status)) {
      if (!isProduction) {
        console.warn(
          `[Presence] Invalid status update from ${username}: ${status}`
        );
      }
      return;
    }

    // CRITICAL: Prevent downgrading from ingame to matchmaking
    // This protects users who are in a game from secondary tabs changing their status
    const currentStatus = getUserStatus(userId);
    if (currentStatus === "ingame" && status === "matchmaking") {
      console.warn(
        `[Presence] BLOCKED: User ${username} tried to change status from ingame to matchmaking`
      );
      return;
    }

    debugLog(`[Presence] User ${username} status changed to ${status}`);
    await setUserStatus(io, userId, username, socket.id, status, true);
  });

  // Handle get friends status request
  socket.on("getFriendsStatus", (friendIds: number[], callback) => {
    const statuses = getOnlineUsersFromList(friendIds);
    const result: Record<number, UserStatus> = {};

    for (const [id, status] of statuses) {
      // Return the actual status - client handles display
      result[id] = status;
    }

    callback(result);
  });

  // Handle checking if a specific user is online (for invitation validation)
  socket.on(
    "checkUserOnline",
    (
      userId: number,
      callback: (isOnline: boolean, status: UserStatus) => void
    ) => {
      const status = getUserStatus(userId);
      callback(status !== "offline", status);
    }
  );
}

/**
 * Gets presence data for debugging/monitoring
 */
export function getPresenceStats(): {
  totalOnline: number;
  statuses: Record<UserStatus, number>;
} {
  const stats = {
    totalOnline: userPresenceMap.size,
    statuses: {
      online: 0,
      offline: 0,
      busy: 0,
      matchmaking: 0,
      ingame: 0,
    } as Record<UserStatus, number>,
  };

  for (const presence of userPresenceMap.values()) {
    stats.statuses[presence.status]++;
  }

  return stats;
}

export { userPresenceMap, socketToUserMap };
