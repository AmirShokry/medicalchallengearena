import { type Socket } from "socket.io";
import { getTRPCCaller } from "@/server/utils/trpc-caller";
import { createMockH3EventFromSocket } from "@/server/utils/mock-h3-event";
export async function authenticateSocket(
  socket: Socket,
  next: (error?: Error) => void
) {
  try {
    const caller = await getTRPCCaller(createMockH3EventFromSocket(socket));
    const session = await caller.auth.getSession();

    if (!session) {
      console.log(
        `Socket ${socket.id} authentication failed: No session found`
      );
      return next(new Error("Authentication required"));
    }

    socket.data.session = Object.assign({}, session.user);
    next();
  } catch (error) {
    console.log(`Socket ${socket.id} authentication failed:`, error);
    return next(new Error("Authentication failed"));
  }
}
