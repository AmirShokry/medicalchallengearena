/**
 * @fileoverview Socket-based social features composable
 *
 * This composable replaces usePeer.ts and provides:
 * - Real-time friend status updates via Socket.IO
 * - Friend messaging with database persistence
 * - Status management (online/offline/busy/matchmaking/ingame)
 * - No more PeerJS dependency - all communication through existing socket.io server
 *
 * Status meanings:
 * - online: User is connected and available
 * - offline: User is disconnected
 * - matchmaking: User is in multi matchmaking page AND doesn't have an invitation
 * - busy: User has an invitation, accepted one (not started), or is in solo setup
 * - ingame: User successfully started a game (multi or solo)
 *
 * @example
 * ```ts
 * const social = useSocial();
 *
 * // Initialize on component mount
 * social.init();
 *
 * // Send a message to a friend
 * await social.sendMessage(friendId, "Hello!");
 *
 * // Update your status
 * social.setStatus("busy");
 *
 * // Listen for status updates
 * social.onFriendStatus((friendId, username, status) => {
 *   console.log(`${username} is now ${status}`);
 * });
 * ```
 */

import { ref, computed, type Ref, watch } from "vue";
import { socialSocket, gameSocket } from "@/components/socket";
import type { ToClientIO } from "@/shared/types/socket";

/** User status types */
export type UserStatus =
  | "online"
  | "offline"
  | "busy"
  | "matchmaking"
  | "ingame";

/** Friend message structure */
export interface FriendMessage {
  id: number;
  senderId: number;
  senderUsername: string;
  receiverId?: number;
  content: string;
  createdAt: Date;
  isRead: boolean;
  /** Whether this message was sent by the current user */
  self?: boolean;
}

/** Callbacks for events */
type FriendStatusCallback = (
  friendId: number,
  username: string,
  status: UserStatus
) => void;
type MessageCallback = (message: FriendMessage) => void;

/** Check if running in production mode */
const isProduction = process.env.NODE_ENV === "production";

/** Debug logger that only logs in non-production */
function debugLog(...args: any[]) {
  if (!isProduction) {
    console.log(...args);
  }
}

/** State */
let isInitialized = false;
const friendStatusCallbacks: FriendStatusCallback[] = [];
const messageCallbacks: MessageCallback[] = [];
const unreadCounts = ref<Record<number, number>>({});

/**
 * Initialize the social socket listeners
 * Should be called once when the user is authenticated
 */
function init(): void {
  if (isInitialized) return;

  // Listen for friend status updates
  socialSocket.on("friendStatusUpdate", (data) => {
    debugLog(
      `[Social] Friend ${data.username} (${data.id}) is now ${data.status}`
    );

    // Pass the actual status to callbacks
    const status: UserStatus = data.status as UserStatus;

    // Notify all registered callbacks
    friendStatusCallbacks.forEach((cb) => cb(data.id, data.username, status));
  });

  // Listen for incoming messages
  socialSocket.on("receiveFriendMessage", (message) => {
    debugLog(
      `[Social] Received message from ${message.senderUsername}:`,
      message.content
    );

    // Update unread count
    unreadCounts.value[message.senderId] =
      (unreadCounts.value[message.senderId] || 0) + 1;

    // Notify all registered callbacks
    messageCallbacks.forEach((cb) =>
      cb({
        ...message,
        self: false,
        createdAt: new Date(message.createdAt),
      })
    );
  });

  // Listen for messages read notification
  socialSocket.on("messagesRead", (data) => {
    debugLog(`[Social] Messages read by user ${data.readBy}`);
  });

  isInitialized = true;
  debugLog("[Social] Social socket listeners initialized");
}

/**
 * Clean up listeners
 */
function cleanup(): void {
  socialSocket.off("friendStatusUpdate");
  socialSocket.off("receiveFriendMessage");
  socialSocket.off("messagesRead");
  friendStatusCallbacks.length = 0;
  messageCallbacks.length = 0;
  isInitialized = false;
}

/**
 * Register a callback for friend status changes
 */
function onFriendStatus(callback: FriendStatusCallback): () => void {
  friendStatusCallbacks.push(callback);

  // Return unsubscribe function
  return () => {
    const index = friendStatusCallbacks.indexOf(callback);
    if (index > -1) {
      friendStatusCallbacks.splice(index, 1);
    }
  };
}

/**
 * Register a callback for incoming messages
 */
function onMessage(callback: MessageCallback): () => void {
  messageCallbacks.push(callback);

  // Return unsubscribe function
  return () => {
    const index = messageCallbacks.indexOf(callback);
    if (index > -1) {
      messageCallbacks.splice(index, 1);
    }
  };
}

/**
 * Update the current user's status
 * This will notify all friends of the status change
 * Note: ingame status is typically set by the server when game starts
 *
 * If socket is not connected, will poll until connected and then set status
 */
function setStatus(status: Exclude<UserStatus, "offline">): void {
  // If already connected, emit immediately
  if (socialSocket.connected) {
    debugLog(`[Social] Setting status to ${status}`);
    socialSocket.emit("updateStatus", status);
    return;
  }

  debugLog(`[Social] Socket not connected, polling to set status to ${status}`);

  // Poll for connection - this is more reliable than event listeners
  // because Connection.client.vue calls socialSocket.off() which removes our listener
  const pollInterval = setInterval(() => {
    if (socialSocket.connected) {
      clearInterval(pollInterval);
      debugLog(`[Social] Socket now connected, setting status to ${status}`);
      socialSocket.emit("updateStatus", status);
    }
  }, 100);

  // Timeout after 10 seconds
  setTimeout(() => {
    clearInterval(pollInterval);
  }, 4000);
}

/**
 * Get the current status of a friend
 */
function getFriendStatus(friendId: number): Promise<UserStatus> {
  return new Promise((resolve) => {
    socialSocket.emit("checkUserOnline", friendId, (isOnline, status) => {
      resolve(isOnline ? status : "offline");
    });
  });
}

/**
 * Get the status of multiple friends
 */
function getFriendsStatus(
  friendIds: number[]
): Promise<Record<number, UserStatus>> {
  return new Promise((resolve) => {
    socialSocket.emit("getFriendsStatus", friendIds, (statuses) => {
      // Return statuses as-is from server
      const result: Record<number, UserStatus> = {};
      for (const [id, status] of Object.entries(statuses)) {
        result[Number(id)] = status as UserStatus;
      }
      resolve(result);
    });
  });
}

/**
 * Send a message to a friend
 * Returns the message ID if successful
 */
function sendMessage(
  friendId: number,
  content: string
): Promise<{ success: boolean; messageId?: number; error?: string }> {
  return new Promise((resolve) => {
    socialSocket.emit("sendFriendMessage", { friendId, content }, (result) => {
      if (result?.success) {
        console.log(
          `[Social] Message sent to friend ${friendId}, ID: ${result.messageId}`
        );
      } else {
        console.error(`[Social] Failed to send message: ${result?.error}`);
      }
      resolve(result || { success: false, error: "No response from server" });
    });
  });
}

/**
 * Get conversation history with a friend
 */
function getConversationHistory(
  friendId: number,
  limit: number = 50,
  offset: number = 0
): Promise<FriendMessage[]> {
  return new Promise((resolve) => {
    socialSocket.emit(
      "getConversationHistory",
      { friendId, limit, offset },
      (messages) => {
        // Convert dates and add self flag
        const formatted = messages.map((msg) => ({
          ...msg,
          createdAt: new Date(msg.createdAt),
          self: false, // Will be set correctly by the caller based on senderId
        }));
        resolve(formatted);
      }
    );
  });
}

/**
 * Mark messages from a friend as read
 */
function markMessagesRead(friendId: number): void {
  socialSocket.emit("markMessagesRead", friendId);

  // Clear local unread count
  if (unreadCounts.value[friendId]) {
    delete unreadCounts.value[friendId];
  }
}

/**
 * Get unread message counts from all friends
 */
function getUnreadCounts(): Promise<Record<number, number>> {
  return new Promise((resolve) => {
    socialSocket.emit("getUnreadCounts", (counts) => {
      unreadCounts.value = counts;
      resolve(counts);
    });
  });
}

/**
 * Open a chat with a friend
 * Marks messages as read and returns conversation history
 */
function openChat(friendId: number): Promise<FriendMessage[]> {
  return new Promise((resolve) => {
    socialSocket.emit("openChat", { id: friendId }, (messages) => {
      // Clear unread count for this friend
      if (unreadCounts.value[friendId]) {
        delete unreadCounts.value[friendId];
      }

      // Convert dates
      const formatted = (messages || []).map((msg) => ({
        ...msg,
        createdAt: new Date(msg.createdAt),
        self: false,
      }));
      resolve(formatted);
    });
  });
}

/**
 * Check if a user can be invited to a game
 */
function checkCanInvite(
  userId: number
): Promise<{ canInvite: boolean; reason?: string; status: string }> {
  return new Promise((resolve) => {
    gameSocket.emit("checkCanInvite", userId, (result) => {
      resolve(result);
    });
  });
}

/**
 * Composable export
 */
export default function useSocial() {
  return {
    // Initialization
    init,
    cleanup,

    // Status management
    setStatus,
    getFriendStatus,
    getFriendsStatus,

    // Messaging
    sendMessage,
    getConversationHistory,
    markMessagesRead,
    getUnreadCounts,
    openChat,

    // Event listeners
    onFriendStatus,
    onMessage,

    // Game invitations
    checkCanInvite,

    // State
    unreadCounts: computed(() => unreadCounts.value),
    isInitialized: computed(() => isInitialized),
  };
}

// Export for HMR
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    console.log("[Social] HMR: Cleaning up social socket listeners");
    cleanup();
  });
}
