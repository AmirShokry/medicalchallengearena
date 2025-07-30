import type { SocialIO, SocialSocket } from "@/shared/types/socket";
export function registerSocial(socket: SocialSocket, io: SocialIO) {
  socket.on("getFriendsStatus", (data, callback) => {
    const statuses = io.helpers.getUsersStatusById(data);
    callback(Object.fromEntries(statuses));
  });
}
