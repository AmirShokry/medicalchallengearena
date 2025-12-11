/**
 * Keep-Alive Web Worker
 *
 * Sends periodic pings to prevent Cloudflare from dropping idle WebSocket connections.
 * Web Workers are not throttled when the browser tab is in the background.
 */

let pingInterval = null;
const PING_INTERVAL_MS = 30000; // 30 seconds (Cloudflare drops after ~100s idle)

console.log("[KeepAlive Worker] Loaded");

self.onmessage = function (event) {
  const { type } = event.data;
  console.log("[KeepAlive Worker] Received message:", type);

  if (type === "start") {
    if (pingInterval) clearInterval(pingInterval);

    console.log("[KeepAlive Worker] Starting ping interval...");

    pingInterval = setInterval(() => {
      console.log("[KeepAlive Worker] Sending ping to main thread");
      self.postMessage({ type: "ping" });
    }, PING_INTERVAL_MS);

    // Send first ping immediately
    console.log("[KeepAlive Worker] Sending initial ping");
    self.postMessage({ type: "ping" });
  }

  if (type === "stop") {
    console.log("[KeepAlive Worker] Stopping");
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
  }
};
