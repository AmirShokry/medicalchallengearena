import { io, Socket } from "socket.io-client";
import type { ToClientIO, ToServerIO } from "@/shared/types/socket";

/**
 * Socket.IO client configuration
 *
 * Reconnection Strategy:
 * - Uses built-in Socket.IO reconnection with exponential backoff
 * - Reconnection is automatic when connection drops (browser throttling, network issues)
 * - Game state is preserved on the server and restored on reconnection
 * - No manual ping/keepalive needed - handled by game state manager
 */
const socketOptions = {
  withCredentials: true,
  autoConnect: false,
  // Enable reconnection with exponential backoff
  reconnection: true,
  // Maximum number of reconnection attempts
  reconnectionAttempts: Infinity,
  // Initial delay before reconnection attempt (ms)
  reconnectionDelay: 1000,
  // Maximum delay between reconnections (ms)
  reconnectionDelayMax: 5000,
  // Use randomization to prevent thundering herd
  randomizationFactor: 0.5,
  // Timeout for connection attempt
  timeout: 20000,

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
