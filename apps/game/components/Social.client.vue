<!--
  Social.client.vue - Socket-based social features component
  
  This component replaces Peer.client.vue and handles:
  - Initializing the social socket listeners
  - Syncing friend status updates with the friends store
  - Handling incoming messages
  
  Usage:
    <Social v-if="status !== 'unauthenticated'" />
-->
<script setup lang="ts">
import useSocial from "@/composables/useSocial";

const userStore = useUserStore();
const friendStore = useFriendsStore();
const social = useSocial();

/** Check if running in production mode */
const isProduction = process.env.NODE_ENV === "production";

/** Debug logger that only logs in non-production */
function debugLog(...args: any[]) {
  if (!isProduction) {
    console.log(...args);
  }
}

// Initialize social socket listeners
social.init();

// Sync friend statuses when friend list changes
const friendIds = computed(
  () => friendStore.friendList?.map((friend) => friend.id) ?? []
);

// Fetch initial friend statuses when friend list is loaded
watch(
  friendIds,
  async (ids) => {
    if (!ids.length) return;

    try {
      const statuses = await social.getFriendsStatus(ids);

      // Update each friend's status in the store
      if (friendStore.friendList) {
        for (const friend of friendStore.friendList) {
          const status = statuses[friend.id];
          if (status) {
            friend.status = status;
          }
        }
      }

      debugLog("[Social] Initial friend statuses loaded:", statuses);
    } catch (error) {
      console.error("[Social] Error fetching friend statuses:", error);
    }
  },
  { immediate: true }
);

// Listen for friend status updates
social.onFriendStatus((friendId, username, status) => {
  debugLog(
    `[Social] Friend ${username} (${friendId}) status changed to ${status}`
  );

  if (!friendStore.friendList) return;

  const friend = friendStore.friendList.find((f) => f.id === friendId);
  if (friend) {
    friend.status = status;
  }
});

// Listen for incoming messages
social.onMessage((message) => {
  debugLog(`[Social] Message from ${message.senderUsername}:`, message.content);

  if (!friendStore.friendList) return;

  // Find the friend who sent the message
  const friend = friendStore.friendList.find((f) => f.id === message.senderId);
  if (!friend) return;

  // Add message to the friend's message list
  friend.messages.push({
    type: "text",
    id: message.senderId.toString(),
    text: message.content,
    content: message.content,
    timestamp: message.createdAt,
    self: false,
  });
});

// Fetch unread counts on mount
onMounted(async () => {
  try {
    await social.getUnreadCounts();
    debugLog("[Social] Unread counts loaded");
  } catch (error) {
    console.error("[Social] Error fetching unread counts:", error);
  }
});

// Periodic status polling to catch missed updates (every 30 seconds)
const POLL_INTERVAL = 3000; // 3 seconds
let pollIntervalId: ReturnType<typeof setInterval> | null = null;

async function pollFriendStatuses() {
  const ids = friendIds.value;
  if (!ids.length) return;

  try {
    const statuses = await social.getFriendsStatus(ids);

    if (friendStore.friendList) {
      for (const friend of friendStore.friendList) {
        const status = statuses[friend.id];
        if (status && friend.status !== status) {
          debugLog(
            `[Social] Poll: Friend ${friend.username} status updated from ${friend.status} to ${status}`
          );
          friend.status = status;
        }
      }
    }
  } catch (error) {
    console.error("[Social] Error polling friend statuses:", error);
  }
}

onMounted(() => {
  // Start periodic polling
  pollIntervalId = setInterval(pollFriendStatuses, POLL_INTERVAL);
  debugLog("[Social] Started periodic status polling");
});

// Clean up on unmount
onBeforeUnmount(() => {
  // Clear the polling interval
  if (pollIntervalId) {
    clearInterval(pollIntervalId);
    pollIntervalId = null;
    debugLog("[Social] Stopped periodic status polling");
  }

  // Note: We don't call social.cleanup() here because other components
  // might still need the socket listeners. Cleanup is handled by HMR
  // and when the user logs out.
});
</script>

<template>
  <slot />
</template>
