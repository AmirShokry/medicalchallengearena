/**
 * Socket Keep-Alive Plugin
 *
 * Uses a Web Worker to send periodic pings to the server, preventing
 * Cloudflare from dropping idle WebSocket connections (~100s timeout).
 *
 * Web Workers are not throttled in background tabs, ensuring pings
 * continue even when the user switches to another tab.
 */
import { gameSocket, socialSocket } from "@/components/socket";

export default defineNuxtPlugin(() => {
  // Only run on client
  if (import.meta.server) return;

  console.log("[KeepAlive] Plugin initializing...");

  let worker: Worker | null = null;
  let isStarted = false;

  function startKeepAlive() {
    if (isStarted) {
      console.log("[KeepAlive] Already started, skipping");
      return;
    }

    if (typeof Worker === "undefined") {
      console.warn("[KeepAlive] Web Workers not supported");
      return;
    }

    try {
      console.log("[KeepAlive] Creating worker...");
      worker = new Worker("/keepalive.worker.js");

      worker.onmessage = (event) => {
        if (event.data.type === "ping") {
          const gameConnected = gameSocket.connected;
          const socialConnected = socialSocket.connected;

          console.log(
            `[KeepAlive] Sending pings - Game: ${gameConnected}, Social: ${socialConnected}`
          );

          // Send ping to both sockets if connected
          if (gameConnected) {
            gameSocket.emit("ping");
            console.log("[KeepAlive] Sent ping to game socket");
          }
          if (socialConnected) {
            socialSocket.emit("ping");
            console.log("[KeepAlive] Sent ping to social socket");
          }
        }
      };

      worker.onerror = (error) => {
        console.error("[KeepAlive] Worker error:", error);
      };

      worker.postMessage({ type: "start" });
      isStarted = true;
      console.log("[KeepAlive] Worker started successfully");
    } catch (error) {
      console.error("[KeepAlive] Failed to start worker:", error);
    }
  }

  // Start immediately - don't wait for connect events
  // The worker will check connection status before sending pings
  startKeepAlive();

  // Cleanup on page unload
  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", () => {
      if (worker) {
        worker.postMessage({ type: "stop" });
        worker.terminate();
      }
    });
  }
});
