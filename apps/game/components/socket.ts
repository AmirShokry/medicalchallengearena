import { io, Socket } from "socket.io-client";
import type { ToClientIO, ToServerIO } from "@/shared/types/socket";

// Configure socket with longer ping intervals and timeouts to handle tab throttling
// Browsers throttle timers in background tabs which can cause ping timeouts
const socketOptions = {
  withCredentials: true,
  autoConnect: false,
  // Match server ping configuration to handle browser throttling
  // Server sends ping every 60s, client must respond within 120s
  pingInterval: 60e3, // 60 seconds between pings (matches server)
  pingTimeout: 120e3, // 120 seconds to wait for pong (matches server)
  // Enable reconnection with backoff
  reconnection: true,
  reconnectionAttempts: 15,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
};

export const gameSocket = io("/game", socketOptions) as Socket<
  ToClientIO.Game.Events,
  ToServerIO.Game.Events
>;
export const socialSocket = io("/social", socketOptions) as Socket<
  ToClientIO.Social.Events,
  ToServerIO.Social.Events
>;
