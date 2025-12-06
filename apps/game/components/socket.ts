import { io, Socket } from "socket.io-client";
import type { ToClientIO, ToServerIO } from "@/shared/types/socket";

// Configure socket with longer ping intervals and timeouts to handle tab throttling
// Browsers throttle timers in background tabs which can cause ping timeouts
const socketOptions = {
  withCredentials: true,
  autoConnect: false,
  // Increase ping timeout to handle browser throttling when tab is minimized
  // Default is 20000ms, but throttled tabs may need more time
  pingTimeout: 60000,
  // Increase ping interval to reduce frequency of pings
  pingInterval: 25000,
  // Enable reconnection with backoff
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
};

export const gameSocket = io("/game", socketOptions) as Socket<
  ToClientIO.Game.Events,
  ToServerIO.Game.Events
>;
export const socialSocket = io("/social", socketOptions) as Socket<
  ToClientIO.Social.Events,
  ToServerIO.Social.Events
>;
