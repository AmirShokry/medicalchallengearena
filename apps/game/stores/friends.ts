import { defineStore } from "pinia";
import type { AppRouter } from "@/server/api/v1/_trpc/routers";
import type { inferRouterOutputs } from "@trpc/server";
import type { UserStatus, FriendMessage } from "@/composables/useSocial";

type FriendList = inferRouterOutputs<AppRouter>["friends"]["list"];

/** Extended friend data with status and messages
 * Status can be: online, offline, busy, matchmaking, ingame
 */
export interface FriendData {
  id: number;
  username: string;
  avatarUrl: string;
  medPoints: number | null;
  university: string;
  medSchool?: string | null;
  isActive: boolean;
  status: UserStatus;
  isTemp: boolean;
  messages: Array<{
    type: string;
    id: string;
    text: string;
    content: string;
    timestamp: Date;
    self?: boolean;
  }>;
}

export const useFriendsStore = defineStore("friends", () => {
  const { $trpc } = useNuxtApp();
  const { status } = useAuth();

  // Use a separate reactive ref for the friend list with proper typing
  const friendListData = ref<FriendData[]>([]);
  const isLoading = ref(false);
  const fetchError = ref<Error | null>(null);

  const {
    data: rawFriendList,
    error,
    pending,
    refresh: refreshQuery,
  } = $trpc.friends.list.useQuery(undefined, {
    queryKey: "friendsList",
    watch: [status],
  });

  // Transform raw data to FriendData when it changes
  watch(
    rawFriendList,
    (data) => {
      if (!data) {
        friendListData.value = [];
        return;
      }

      // Preserve existing status and messages when refreshing
      const existingMap = new Map(friendListData.value.map((f) => [f.id, f]));

      friendListData.value = data.map((friend): FriendData => {
        const existing = existingMap.get(friend.id);
        return {
          ...friend,
          medSchool: friend.medSchool,
          isActive: existing?.isActive ?? false,
          status: existing?.status ?? "offline",
          isTemp: existing?.isTemp ?? false,
          messages: existing?.messages ?? [],
        };
      });
    },
    { immediate: true }
  );

  /**
   * Add a message to a friend's conversation
   * This is called when receiving messages via socket or sending messages
   */
  function addMessage(
    friendUsername: string,
    message: FriendData["messages"][0]
  ) {
    const friend = friendListData.value.find(
      (friend) => friend.username === friendUsername
    );
    if (!friend) return;

    friend.messages.push({
      ...message,
    });
  }

  /**
   * Set messages for a friend (used when loading conversation history from DB)
   */
  function setMessages(
    friendId: number,
    messages: FriendMessage[],
    userId: number
  ) {
    const friend = friendListData.value.find((f) => f.id === friendId);
    if (!friend) return;

    friend.messages = messages.map((msg) => ({
      type: "text",
      id: msg.senderId.toString(),
      text: msg.content,
      content: msg.content,
      timestamp: new Date(msg.createdAt),
      self: msg.senderId === userId,
    }));
  }

  /**
   * Clear messages for a friend
   */
  function clearMessages(friendId: number) {
    const friend = friendListData.value.find((f) => f.id === friendId);
    if (!friend) return;
    friend.messages = [];
  }

  async function refresh() {
    await refreshQuery();
  }

  return {
    friendList: friendListData,
    pending: readonly(pending),
    error: readonly(error),
    refresh,
    addMessage,
    setMessages,
    clearMessages,
  };
});
