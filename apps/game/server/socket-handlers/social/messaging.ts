/**
 * @fileoverview Friend messaging system via Socket.IO
 *
 * This module handles real-time messaging between friends:
 * - Messages are stored in the database for persistence
 * - Messages can be sent even when the recipient is offline (stored for later retrieval)
 * - Each conversation is limited to 500 messages (oldest are deleted)
 * - Messages are delivered in real-time when both users are online
 *
 * Note: Rival chat (during games) is NOT stored in the database - it's ephemeral.
 */

import type { SocialIO, SocialSocket } from "@/shared/types/socket";
import { db, eq, or, and, desc, sql, asc } from "@package/database";
import { getUserSocketId, getUserStatus } from "./presence";

const { friend_messages, users_friends, users } = db.table;

/** Maximum messages to retain per conversation */
const MAX_MESSAGES_PER_CONVERSATION = 500;

/** Message structure for client communication */
export interface FriendMessage {
  id: number;
  senderId: number;
  senderUsername: string;
  receiverId: number;
  content: string;
  createdAt: Date;
  isRead: boolean;
}

/**
 * Saves a message to the database and enforces the 500 message limit
 */
async function saveMessage(
  senderId: number,
  receiverId: number,
  content: string
): Promise<number> {
  // Insert the new message
  const [newMessage] = await db
    .insert(friend_messages)
    .values({
      senderId,
      receiverId,
      content,
      isRead: false,
    })
    .returning({ id: friend_messages.id });

  // Enforce message limit by deleting oldest messages
  // We need to count and delete for both directions of the conversation
  await enforceMessageLimit(senderId, receiverId);

  return newMessage.id;
}

/**
 * Enforces the 500 message limit per conversation by deleting oldest messages
 */
async function enforceMessageLimit(
  user1Id: number,
  user2Id: number
): Promise<void> {
  try {
    // Get total count of messages in this conversation
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(friend_messages)
      .where(
        or(
          and(
            eq(friend_messages.senderId, user1Id),
            eq(friend_messages.receiverId, user2Id)
          ),
          and(
            eq(friend_messages.senderId, user2Id),
            eq(friend_messages.receiverId, user1Id)
          )
        )
      );

    const totalMessages = countResult?.count ?? 0;

    if (totalMessages > MAX_MESSAGES_PER_CONVERSATION) {
      const messagesToDelete = totalMessages - MAX_MESSAGES_PER_CONVERSATION;

      // Get IDs of oldest messages to delete
      const oldestMessages = await db
        .select({ id: friend_messages.id })
        .from(friend_messages)
        .where(
          or(
            and(
              eq(friend_messages.senderId, user1Id),
              eq(friend_messages.receiverId, user2Id)
            ),
            and(
              eq(friend_messages.senderId, user2Id),
              eq(friend_messages.receiverId, user1Id)
            )
          )
        )
        .orderBy(asc(friend_messages.createdAt))
        .limit(messagesToDelete);

      if (oldestMessages.length > 0) {
        const idsToDelete = oldestMessages.map((m) => m.id);
        await db
          .delete(friend_messages)
          .where(sql`${friend_messages.id} = ANY(${idsToDelete})`);

        console.log(
          `[Messages] Deleted ${messagesToDelete} old messages from conversation between ${user1Id} and ${user2Id}`
        );
      }
    }
  } catch (error) {
    console.error("[Messages] Error enforcing message limit:", error);
  }
}

/**
 * Gets conversation history between two users
 */
export async function getConversationHistory(
  user1Id: number,
  user2Id: number,
  limit: number = 50,
  offset: number = 0
): Promise<FriendMessage[]> {
  const messages = await db
    .select({
      id: friend_messages.id,
      senderId: friend_messages.senderId,
      receiverId: friend_messages.receiverId,
      content: friend_messages.content,
      createdAt: friend_messages.createdAt,
      isRead: friend_messages.isRead,
      senderUsername: users.username,
    })
    .from(friend_messages)
    .innerJoin(users, eq(friend_messages.senderId, users.id))
    .where(
      or(
        and(
          eq(friend_messages.senderId, user1Id),
          eq(friend_messages.receiverId, user2Id)
        ),
        and(
          eq(friend_messages.senderId, user2Id),
          eq(friend_messages.receiverId, user1Id)
        )
      )
    )
    .orderBy(desc(friend_messages.createdAt))
    .limit(limit)
    .offset(offset);

  // Return in chronological order
  return messages.reverse();
}

/**
 * Marks messages as read
 */
async function markMessagesAsRead(
  receiverId: number,
  senderId: number
): Promise<void> {
  await db
    .update(friend_messages)
    .set({ isRead: true })
    .where(
      and(
        eq(friend_messages.senderId, senderId),
        eq(friend_messages.receiverId, receiverId),
        eq(friend_messages.isRead, false)
      )
    );
}

/**
 * Gets unread message count for a user from each sender
 */
async function getUnreadCounts(
  userId: number
): Promise<Record<number, number>> {
  const unreadMessages = await db
    .select({
      senderId: friend_messages.senderId,
      count: sql<number>`count(*)::int`,
    })
    .from(friend_messages)
    .where(
      and(
        eq(friend_messages.receiverId, userId),
        eq(friend_messages.isRead, false)
      )
    )
    .groupBy(friend_messages.senderId);

  const counts: Record<number, number> = {};
  for (const { senderId, count } of unreadMessages) {
    counts[senderId] = count;
  }
  return counts;
}

/**
 * Validates that two users are friends
 */
async function areFriends(user1Id: number, user2Id: number): Promise<boolean> {
  const [friendship] = await db
    .select()
    .from(users_friends)
    .where(
      and(
        or(
          and(
            eq(users_friends.user1_id, user1Id),
            eq(users_friends.user2_id, user2Id)
          ),
          and(
            eq(users_friends.user1_id, user2Id),
            eq(users_friends.user2_id, user1Id)
          )
        ),
        eq(users_friends.isFriend, true)
      )
    )
    .limit(1);

  return !!friendship;
}

/**
 * Registers message-related socket event handlers
 */
export function registerFriendMessaging(
  socket: SocialSocket,
  io: SocialIO
): void {
  const { id: userId, username } = socket.data.session;

  /**
   * Send a message to a friend
   * Messages are stored in the database regardless of recipient's online status
   */
  socket.on(
    "sendFriendMessage",
    async (
      data: { friendId: number; content: string },
      callback?: (result: {
        success: boolean;
        messageId?: number;
        error?: string;
      }) => void
    ) => {
      try {
        const { friendId, content } = data;

        // Validate input
        if (!friendId || !content || typeof content !== "string") {
          callback?.({ success: false, error: "Invalid message data" });
          return;
        }

        // Validate friendship
        const isFriend = await areFriends(userId, friendId);
        if (!isFriend) {
          callback?.({
            success: false,
            error: "Cannot send message to non-friend",
          });
          return;
        }

        // Trim and validate content length
        const trimmedContent = content.trim();
        if (trimmedContent.length === 0 || trimmedContent.length > 2000) {
          callback?.({
            success: false,
            error: "Message must be between 1 and 2000 characters",
          });
          return;
        }

        // Save to database
        const messageId = await saveMessage(userId, friendId, trimmedContent);

        // Try to deliver in real-time if recipient is online
        const friendSocketId = getUserSocketId(friendId);
        if (friendSocketId) {
          io.to(friendSocketId).emit("receiveFriendMessage", {
            id: messageId,
            senderId: userId,
            senderUsername: username,
            content: trimmedContent,
            createdAt: new Date(),
            isRead: false,
          });
        }

        callback?.({ success: true, messageId });
        console.log(
          `[Messages] ${username} sent message to friend ${friendId}`
        );
      } catch (error) {
        console.error("[Messages] Error sending message:", error);
        callback?.({ success: false, error: "Failed to send message" });
      }
    }
  );

  /**
   * Get conversation history with a friend
   */
  socket.on(
    "getConversationHistory",
    async (
      data: { friendId: number; limit?: number; offset?: number },
      callback: (messages: FriendMessage[]) => void
    ) => {
      try {
        const { friendId, limit = 50, offset = 0 } = data;

        // Validate friendship
        const isFriend = await areFriends(userId, friendId);
        if (!isFriend) {
          callback([]);
          return;
        }

        const messages = await getConversationHistory(
          userId,
          friendId,
          Math.min(limit, 100),
          offset
        );
        callback(messages);
      } catch (error) {
        console.error("[Messages] Error getting conversation history:", error);
        callback([]);
      }
    }
  );

  /**
   * Mark messages from a friend as read
   */
  socket.on("markMessagesRead", async (friendId: number) => {
    try {
      await markMessagesAsRead(userId, friendId);

      // Notify the sender that their messages were read
      const friendSocketId = getUserSocketId(friendId);
      if (friendSocketId) {
        io.to(friendSocketId).emit("messagesRead", {
          readBy: userId,
        });
      }
    } catch (error) {
      console.error("[Messages] Error marking messages as read:", error);
    }
  });

  /**
   * Get unread message counts from all friends
   */
  socket.on(
    "getUnreadCounts",
    async (callback: (counts: Record<number, number>) => void) => {
      try {
        const counts = await getUnreadCounts(userId);
        callback(counts);
      } catch (error) {
        console.error("[Messages] Error getting unread counts:", error);
        callback({});
      }
    }
  );

  /**
   * Open chat - marks messages as read and gets history
   */
  socket.on(
    "openChat",
    async (
      data: { id: number },
      callback?: (messages: FriendMessage[]) => void
    ) => {
      try {
        const friendId = data.id;

        // Mark messages from this friend as read
        await markMessagesAsRead(userId, friendId);

        // Get conversation history
        const messages = await getConversationHistory(userId, friendId, 50, 0);
        callback?.(messages);
      } catch (error) {
        console.error("[Messages] Error opening chat:", error);
        callback?.([]);
      }
    }
  );
}

export { getUnreadCounts, markMessagesAsRead };
