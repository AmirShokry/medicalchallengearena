import { defineStore } from "pinia";
import type { AppRouter } from "@/server/api/v1/_trpc/routers";
import type { inferRouterOutputs } from "@trpc/server";
import { useLocalStorage } from "@vueuse/core";
import { type DataConnection } from "peerjs";
type FriendList = inferRouterOutputs<AppRouter>["friends"]["list"];
export interface FriendConnection {
  username: string;
  peerId: string;
  connection?: DataConnection;
  status: "online" | "offline" | "connecting" | "busy";
  retryCount: number;
}

export const useFriendsStore = defineStore("friends", () => {
  const { $trpc } = useNuxtApp();
  const friendMessages = useLocalStorage(
    "friendMessages",
    {} as Record<string, any[]>
  );
  const {
    data: friendList,
    error,
    pending,
    refresh,
  } = $trpc.friends.list.useQuery(undefined, {
    queryKey: "friendsList",
    transform: (data) => {
      return (
        data.map((friend) => ({
          ...friend,
          isActive: false,
          status: "offline" as "online" | "offline" | "connecting" | "busy",
          isTemp: false,
          messages: friendMessages.value[friend.username] || [],
        })) || []
      );
    },
    default: () => [] as any,
  });
  function addMessage(friendUsername: string, message: any) {
    const friend = friendList.value?.find(
      (friend) => friend.username === friendUsername
    );
    if (!friend) return;
    friend.messages.push({
      ...message,
    });
  }

  watch(
    () => friendList.value?.map((friend) => friend.messages),
    (newMessages) => {
      if (!newMessages) return;
      newMessages.forEach((messages, index) => {
        const friend = friendList.value?.[index];
        if (friend) friendMessages.value[friend.username] = messages;
      });
    },
    { deep: true }
  );

  return {
    friendList: friendList,
    pending: readonly(pending),
    error: readonly(error),
    refresh,
    addMessage,
  };
});
