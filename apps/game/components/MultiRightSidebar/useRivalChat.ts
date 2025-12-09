/**
 * @fileoverview Rival chat composable for in-game messaging
 *
 * This handles ephemeral chat between rivals during a game.
 * Unlike friend messages, rival chat is NOT stored in the database.
 * Messages are sent via Socket.IO through the game namespace.
 */

import { gameSocket } from "@/components/socket";

export function useRival() {
  const $$game = useGameStore();

  const info = computed(() => {
    if (!$$game.players?.opponent.info) return null;
    return $$game.players?.opponent.info;
  });

  const messages = ref<
    {
      text: string;
      self: boolean;
      timestamp: number;
    }[]
  >([]);

  // Listen for rival chat messages via socket
  gameSocket.on("opponentSentSelectionChat", (data: string) => {
    console.log("[RivalChat] Received message from opponent:", data);
    messages.value.push({
      text: data,
      self: false,
      timestamp: Date.now(),
    });
  });

  /**
   * Send a message to the rival
   * This uses the existing game socket selection chat event
   */
  function sendMessage(text: string) {
    if (!info.value) return;

    // Send via socket (not stored in DB - ephemeral)
    gameSocket.emit("userSentSelectionChat", text);

    // Add to local messages
    messages.value.push({
      text,
      self: true,
      timestamp: Date.now(),
    });

    console.log("[RivalChat] Sent message to opponent:", text);
  }

  /**
   * Clean up messages when game ends
   */
  function cleanUp() {
    messages.value = [];
    console.log("[RivalChat] Cleaned up rival chat");
  }

  // Watch for opponent changes and clean up
  watch(
    () => info.value?.username,
    (newUsername, oldUsername) => {
      if (oldUsername && oldUsername !== newUsername) {
        cleanUp();
      }
    }
  );

  onBeforeUnmount(() => {
    gameSocket.off("opponentSentSelectionChat");
    cleanUp();
  });

  return {
    messages,
    sendMessage,
    info,
    cleanUp,
  };
}
