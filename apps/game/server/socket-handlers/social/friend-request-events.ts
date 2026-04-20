/**
 * @fileoverview Helpers for emitting friend-request related real-time events
 * from places that don't directly own a socket (e.g. tRPC mutations).
 *
 * The plugin code calls {@link setFriendRequestIO} once during boot with the
 * `/social` namespace. The exported emit functions then look up the recipient's
 * connected socket by user id (via the presence map) and dispatch the event.
 *
 * Events are best-effort: if the user is offline, nothing is sent. The next
 * time they load the friend manager the persistent DB state takes over.
 */

import type { PlayerData } from "@/shared/types/common";
import type { SocialIO } from "@/shared/types/socket";
import { getUserSocketId } from "./presence";

let socialIORef: SocialIO | null = null;

/** Initialize the friend-request emitter with the social namespace. */
export function setFriendRequestIO(io: SocialIO): void {
  socialIORef = io;
}

/** Emit a "you received a new friend request" event to the recipient. */
export function emitFriendRequestReceived(
  receiverId: number,
  sender: PlayerData
): void {
  if (!socialIORef) return;
  const sid = getUserSocketId(receiverId);
  if (!sid) return;
  socialIORef.to(sid).emit("receivedFriendRequest", sender);
}

/**
 * Emit a generic "friend request state changed" notification to a specific
 * user so their UI can refresh (used for accept/reject/cancel/delete).
 */
export function emitFriendRequestUpdated(targetUserId: number): void {
  if (!socialIORef) return;
  const sid = getUserSocketId(targetUserId);
  if (!sid) return;
  socialIORef.to(sid).emit("friendRequestUpdated");
}
