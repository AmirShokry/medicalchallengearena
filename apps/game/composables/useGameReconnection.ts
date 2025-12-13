/**
 * @fileoverview Game Reconnection Composable
 *
 * This composable handles game reconnection logic for multiplayer games.
 * It manages:
 * - Detecting when user returns to the tab (visibility change)
 * - Notifying the server about away/back status
 * - Handling game state restoration after reconnection
 * - Restoring Pinia state from server-provided game state
 *
 * Usage:
 * ```ts
 * const { isReconnecting, isOpponentAway, setupReconnection } = useGameReconnection();
 * setupReconnection();
 * ```
 */

import { ref, onMounted, onUnmounted } from "vue";
import { gameSocket } from "@/components/socket";
import type { RecordObject } from "@/shared/types/common";

/**
 * Reactive state for reconnection status
 */
const isReconnecting = ref(false);
const isOpponentAway = ref(false);
const isOpponentDisconnected = ref(false);
const disconnectReason = ref<string | null>(null);

/**
 * Composable for managing game reconnection
 */
export function useGameReconnection() {
  const $$game = useGameStore();

  /**
   * Handle visibility change (tab hidden/shown)
   */
  function handleVisibilityChange() {
    if (document.hidden) {
      // Tab is now hidden - notify server
      if (gameSocket.connected && $$game.flags.ingame.isGameStarted) {
        gameSocket.emit("userAway");
        console.log("[Reconnection] User went away (tab hidden)");
      }
    } else {
      // Tab is now visible - notify server
      if (gameSocket.connected && $$game.flags.ingame.isGameStarted) {
        gameSocket.emit("userBack");
        console.log("[Reconnection] User is back (tab visible)");
      }

      // If we were disconnected, the socket will auto-reconnect
      // The server will send gameSessionRestored event
      if (!gameSocket.connected && $$game.flags.ingame.isGameStarted) {
        isReconnecting.value = true;
        console.log("[Reconnection] User is back, waiting for reconnection...");
      }
    }
  }

  /**
   * Handle focus/blur events as backup for visibility API
   */
  function handleFocus() {
    if (gameSocket.connected && $$game.flags.ingame.isGameStarted) {
      gameSocket.emit("userBack");
    }
  }

  function handleBlur() {
    if (gameSocket.connected && $$game.flags.ingame.isGameStarted) {
      gameSocket.emit("userAway");
    }
  }

  /**
   * Restore game state from server-provided data
   */
  function restoreGameState(gameState: {
    cases: any;
    userProgress: {
      currentCaseIdx: number;
      currentQuestionIdx: number;
      currentQuestionNumber: number;
      records: RecordObject;
      hasSolved?: boolean;
    };
    opponentProgress: {
      records: RecordObject;
      hasSolved?: boolean;
      currentQuestionNumber?: number;
    };
  }) {
    console.log("[Reconnection] Restoring game state:", gameState);

    // Restore cases data
    if (gameState.cases && gameState.cases.length > 0) {
      $$game.data.cases = gameState.cases;
    }

    // Restore user progress
    const user = $$game.players.user;
    user.records.stats = { ...gameState.userProgress.records.stats };
    user.records.data = [...gameState.userProgress.records.data];
    // Restore hasSolved flag from server state (for current question)
    user.flags.hasSolved = gameState.userProgress.hasSolved ?? false;

    // Restore opponent progress
    const opponent = $$game.players.opponent;
    opponent.records.stats = { ...gameState.opponentProgress.records.stats };
    opponent.records.data = [...gameState.opponentProgress.records.data];
    // Reset hasLeft flag - opponent may still be connected or reconnected
    opponent.flags.hasLeft = false;
    // Restore opponent's hasSolved flag from server state
    opponent.flags.hasSolved = gameState.opponentProgress.hasSolved ?? false;

    // Update game ID if not set
    if (!$$game.gameId && gameState.cases) {
      // gameId should be set from the gameSessionRestored event
    }

    console.log("[Reconnection] Game state restored successfully");
  }

  /**
   * Setup reconnection event listeners
   */
  function setupReconnection() {
    // Listen for visibility change
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    // Handle socket reconnection
    gameSocket.on("connect", () => {
      console.log("[Reconnection] Socket reconnected");
      isReconnecting.value = false;
    });

    gameSocket.on("disconnect", (reason) => {
      console.log(`[Reconnection] Socket disconnected: ${reason}`);
      if ($$game.flags.ingame.isGameStarted) {
        // Don't mark as reconnecting if user intentionally left
        if (
          reason !== "io client disconnect" &&
          reason !== "io server disconnect"
        ) {
          isReconnecting.value = true;
        }
      }
    });

    // Handle game session restoration
    gameSocket.on("gameSessionRestored", (data) => {
      console.log("[Reconnection] Game session restored:", data);

      isReconnecting.value = false;
      $$game.gameId = data.gameId;

      // Restore game state if provided
      if (data.gameState) {
        restoreGameState(data.gameState);
      }

      // Update opponent connection status
      if (!data.opponentConnected) {
        isOpponentDisconnected.value = true;
      } else {
        isOpponentDisconnected.value = false;
      }
    });

    // Handle opponent away/back notifications
    gameSocket.on("opponentAway", () => {
      console.log("[Reconnection] Opponent is away");
      isOpponentAway.value = true;
    });

    gameSocket.on("opponentBack", () => {
      console.log("[Reconnection] Opponent is back");
      isOpponentAway.value = false;
    });

    // Handle opponent disconnect/reconnect
    gameSocket.on("opponentDisconnected", (data) => {
      console.log(`[Reconnection] Opponent disconnected: ${data.reason}`);
      isOpponentDisconnected.value = true;
      disconnectReason.value = data.reason;
    });

    gameSocket.on("opponentReconnected", () => {
      console.log("[Reconnection] Opponent reconnected");
      isOpponentDisconnected.value = false;
      disconnectReason.value = null;
    });
  }

  /**
   * Cleanup event listeners
   */
  function cleanupReconnection() {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("focus", handleFocus);
    window.removeEventListener("blur", handleBlur);

    gameSocket.off("gameSessionRestored");
    gameSocket.off("opponentAway");
    gameSocket.off("opponentBack");
    // Note: We don't remove opponentDisconnected/opponentReconnected here
    // as they may be managed by the game page component
  }

  return {
    isReconnecting,
    isOpponentAway,
    isOpponentDisconnected,
    disconnectReason,
    setupReconnection,
    cleanupReconnection,
    restoreGameState,
  };
}

export default useGameReconnection;
