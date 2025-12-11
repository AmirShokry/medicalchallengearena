import { io, Socket } from "socket.io-client";
import type { ToClientIO, ToServerIO } from "@/shared/types/socket";

/**
 * Socket.IO client configuration
 *
 * Note: pingInterval and pingTimeout are SERVER-SIDE only options.
 * The client configuration focuses on reconnection behavior.
 *
 * The server is configured with:
 * - pingInterval: 60s (sends ping every 60 seconds)
 * - pingTimeout: 120s (waits 120 seconds for pong response)
 *
 * This handles browser throttling in background tabs (especially Safari on Mac).
 */
const socketOptions = {
  withCredentials: true,
  autoConnect: false,
  // Enable reconnection with exponential backoff
  reconnection: true,
  reconnectionAttempts: Infinity, // Keep trying indefinitely
  reconnectionDelay: 1000, // Start with 1 second
  reconnectionDelayMax: 30000, // Max 30 seconds between attempts
  // Use randomization to prevent thundering herd
  randomizationFactor: 0.5,
  // Timeout for connection attempt
  timeout: 60000, // 60 seconds connection timeout
  // Transport configuration - prefer websocket but allow polling fallback
  transports: ["websocket", "polling"] as ("websocket" | "polling")[],
  // Upgrade from polling to websocket when possible
  upgrade: true,
};

export const gameSocket = io("/game", socketOptions) as Socket<
  ToClientIO.Game.Events,
  ToServerIO.Game.Events
>;
export const socialSocket = io("/social", socketOptions) as Socket<
  ToClientIO.Social.Events,
  ToServerIO.Social.Events
>;
