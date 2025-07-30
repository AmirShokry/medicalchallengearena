import type { SocialIO, SocialSocket } from "@/shared/types/socket";
export function registerMessage(socket: SocialSocket, io: SocialIO) {
  socket.on("sendChat", (data) => {
    const friendSocket = io.sockets.get(data?.id?.toString());
    if (!friendSocket || !friendSocket.id) return;
    io.to(friendSocket?.id!).emit("receiveChat", {
      id: Number(socket.id),
      content: data.content,
    });
  });
  socket.on("openChat", (data) => {});
}
