import { io, Socket } from "socket.io-client";
import type { ToClientIO, ToServerIO } from "@/shared/types/socket";
export const gameSocket = io("/game", {
  withCredentials: true,
  autoConnect: false,
}) as Socket<ToClientIO.Game.Events, ToServerIO.Game.Events>;
export const socialSocket = io("/social", {
  withCredentials: true,
  autoConnect: false,
}) as Socket<ToClientIO.Social.Events, ToServerIO.Social.Events>;
