import { io, Socket } from "socket.io-client";
import type { ToClientIO, ToServerIO } from "@/shared/types/socket";

// Create socket but don't auto-connect
export const gameSocket = io("/game", {
  withCredentials: true,
  forceNew: true, // Force a new connection
  autoConnect: false, // Don't auto-connect, we'll manage this manually
}) as Socket<ToClientIO.Game.Events, ToServerIO.Game.Events>;
export const socialSocket = io("/social", {
  withCredentials: true,
  forceNew: true,
  autoConnect: false, // Don't auto-connect, we'll manage this manually
}) as Socket<ToClientIO.Social.Events, ToServerIO.Social.Events>;
