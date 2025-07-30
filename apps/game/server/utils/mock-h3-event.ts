// utils/mockH3Event.ts
import type { H3Event } from "h3";
import { createEvent } from "h3";

export function createMockH3EventFromSocket(socket: any): H3Event {
  const mockReq = {
    method: "GET",
    url: "/",
    headers: socket.handshake.headers,
  };

  const mockRes = {
    statusCode: 200,
    setHeader: () => {},
    end: () => {},
  };

  return createEvent(mockReq as any, mockRes as any);
}
