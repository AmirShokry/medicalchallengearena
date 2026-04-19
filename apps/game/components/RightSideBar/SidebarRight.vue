<script setup lang="ts">
import { getAvatarSrc } from "@/composables/useAvatar";
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MessageCircleIcon,
  SearchIcon,
  SendHorizonalIcon,
  Settings2Icon,
  UserPlusIcon,
  UsersIcon,
  WifiIcon,
  XIcon,
} from "lucide-vue-next";
import ManagementContent from "./ManagementContent.vue";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  type SidebarProps,
} from "@/components/ui/sidebar";
import { Toggle } from "@/components/ui/toggle";
import { Input } from "@/components/ui/input";
import type { FriendRequests } from "@/shared/types/common";
import ChatContent from "./ChatContent.vue";
import useSocial from "@/composables/useSocial";
import { toast } from "vue-sonner";

const props = withDefaults(defineProps<Omit<SidebarProps, "side">>(), {
  collapsible: "offcanvas",
});

const isManagingFriends = ref(false);
const isChatting = ref(false);
const activeFriendId = ref(-1);

const social = useSocial();
const { $trpc } = useNuxtApp();
const friendsStore = useFriendsStore();
const userStore = useUserStore();

// --- Friends section: pagination + search ---
const PAGE_SIZE = 10;
const friendsPage = ref(0);
const friendsSearch = ref("");
const friendsSearchOpen = ref(false);
const friendsSearchInputEl = ref<any>(null);
async function toggleFriendsSearch() {
  friendsSearchOpen.value = !friendsSearchOpen.value;
  if (friendsSearchOpen.value) {
    await nextTick();
    const el =
      (friendsSearchInputEl.value?.$el as HTMLInputElement | undefined) ??
      (friendsSearchInputEl.value as HTMLInputElement | null);
    el?.focus();
  } else {
    friendsSearch.value = "";
  }
}
const friendsSearchActive = computed(
  () => friendsSearch.value.trim().length > 0
);

const friendsListInput = computed(() => friendsPage.value);
const friendsSearchInput = computed(() => ({
  username: friendsSearch.value.trim() || "_",
  page: friendsPage.value,
}));

const { data: friendsListData, refresh: refreshFriendsList } =
  $trpc.friends.list.useQuery(friendsListInput, {
    queryKey: "friendsListPaged",
  });
const { data: friendsSearchData, refresh: refreshFriendsSearch } =
  $trpc.friends.search.useQuery(friendsSearchInput, {
    queryKey: "friendsSearchPaged",
  });

const friendsItems = computed(() =>
  friendsSearchActive.value
    ? friendsSearchData.value?.items ?? []
    : friendsListData.value?.items ?? []
);
const friendsTotal = computed(() =>
  friendsSearchActive.value
    ? friendsSearchData.value?.total ?? 0
    : friendsListData.value?.total ?? 0
);

// Realtime status of currently visible friends
const friendStatusMap = ref<Record<number, string>>({});
watch(
  friendsItems,
  async (items) => {
    if (!items || items.length === 0) return;
    try {
      const statuses = await social.getFriendsStatus(items.map((f) => f.id));
      for (const [id, status] of Object.entries(statuses)) {
        friendStatusMap.value[Number(id)] = status;
      }
    } catch (e) {
      console.error("Failed to fetch friend statuses", e);
    }
  },
  { immediate: true }
);
function statusOf(id: number) {
  return friendStatusMap.value[id] ?? "offline";
}

// --- Online users section: pagination + search (excludes existing friends) ---
const onlinePage = ref(0);
const onlineSearch = ref("");
const onlineSearchOpen = ref(false);
const onlineSearchInputEl = ref<any>(null);
async function toggleOnlineSearch() {
  onlineSearchOpen.value = !onlineSearchOpen.value;
  if (onlineSearchOpen.value) {
    await nextTick();
    const el =
      (onlineSearchInputEl.value?.$el as HTMLInputElement | undefined) ??
      (onlineSearchInputEl.value as HTMLInputElement | null);
    el?.focus();
  } else {
    onlineSearch.value = "";
  }
}
const onlineInput = computed(() => ({
  page: onlinePage.value,
  search: onlineSearch.value.trim(),
  excludeFriends: true,
}));
const {
  data: onlineData,
  refresh: refreshOnline,
  pending: onlinePending,
} = $trpc.friends.online.useQuery(onlineInput, {
  queryKey: "onlineUsersPaged",
});
const onlineItems = computed(() => onlineData.value?.items ?? []);
const onlineTotal = computed(() => onlineData.value?.total ?? 0);

// Refresh online list when status updates come in (friends only)
const stopOnlineStatusListener = social.onFriendStatus(() => {
  refreshOnline();
});
// Refresh online list when ANY user's presence changes (connect/disconnect/status)
const stopPresenceListener = social.onPresenceChange((userId, _username, status) => {
  // Also keep visible friends' status dots in sync
  if (userId in friendStatusMap.value) {
    friendStatusMap.value[userId] = status;
  }
  refreshOnline();
});
onUnmounted(() => {
  stopOnlineStatusListener();
  stopPresenceListener();
});

function totalPages(total: number) {
  return Math.max(1, Math.ceil(total / PAGE_SIZE));
}
function changeFriendsPage(delta: number) {
  const next = friendsPage.value + delta;
  if (next < 0 || next >= totalPages(friendsTotal.value)) return;
  friendsPage.value = next;
}
function changeOnlinePage(delta: number) {
  const next = onlinePage.value + delta;
  if (next < 0 || next >= totalPages(onlineTotal.value)) return;
  onlinePage.value = next;
}

watch(friendsSearch, () => {
  friendsPage.value = 0;
});
watch(onlineSearch, () => {
  onlinePage.value = 0;
});

// --- Chat handling ---
async function openChatWithFriend(friend: {
  id: number;
  username: string;
  avatarUrl: string | null;
  gender?: "male" | "female" | "unspecified" | null;
  medSchool?: string | null;
  university: string | null;
  medPoints: number | null;
}) {
  friendsStore.ensureFriend({
    id: friend.id,
    username: friend.username,
    avatarUrl: friend.avatarUrl,
    gender: friend.gender ?? "male",
    medSchool: friend.medSchool ?? null,
    university: friend.university,
    medPoints: friend.medPoints,
    status: statusOf(friend.id) as any,
  });

  if (friendsStore.friendList) {
    for (const f of friendsStore.friendList) {
      f.isActive = f.id === friend.id;
    }
  }
  activeFriendId.value = friend.id;
  isChatting.value = true;

  try {
    const messages = await social.openChat(friend.id);
    const userId = userStore.user?.id;
    if (userId) friendsStore.setMessages(friend.id, messages, userId);
  } catch (error) {
    console.error("Error loading conversation:", error);
  }
}

const newMessage = ref("");
const isSending = ref(false);
async function sendMessage() {
  if (!newMessage.value.trim() || isSending.value) return;
  const activeFriend = friendsStore.friendList?.find(
    (f) => f.id === activeFriendId.value
  );
  if (!activeFriend) return;

  const messageContent = newMessage.value.trim();
  newMessage.value = "";
  isSending.value = true;
  try {
    const result = await social.sendMessage(activeFriend.id, messageContent);
    if (result.success) {
      friendsStore.addMessage(activeFriend.username, {
        type: "text",
        id: userStore.user?.id?.toString() || "",
        text: messageContent,
        content: messageContent,
        timestamp: new Date(),
        self: true,
      });
    } else {
      toast.error(result.error || "Failed to send message");
      newMessage.value = messageContent;
    }
  } catch (error) {
    console.error("Error sending message:", error);
    toast.error("Failed to send message");
    newMessage.value = messageContent;
  } finally {
    isSending.value = false;
  }
}

watch(
  () => isChatting.value,
  (newChattingValue) => {
    let listener: ((e: KeyboardEvent) => void) | null = null;
    if (newChattingValue) {
      listener = (e: KeyboardEvent) => {
        if (e.key === "Enter") sendMessage();
      };
      window.addEventListener("keydown", listener);
    } else if (listener) {
      window.removeEventListener("keydown", listener);
    }
  }
);

// --- Friend request actions ---
const requests = ref<FriendRequests>({ outgoing: [], incoming: [] });

async function handleDeleteFriend(friendId: number) {
  try {
    await $trpc.friends.remove.mutate(friendId);
    await Promise.all([
      friendsStore.refresh(),
      refreshFriendsList(),
      friendsSearchActive.value ? refreshFriendsSearch() : Promise.resolve(),
      refreshOnline(),
    ]);
  } catch (error) {
    console.error("Error deleting friend:", error);
  }
}

async function handleAddOnlineUser(user: { id: number; username: string }) {
  try {
    await $trpc.friends.add.mutate(user.username);
    toast.success(`Friend request sent to ${user.username}`);
    await refreshOnline();
  } catch (error) {
    console.error("Error sending friend request:", error);
    toast.error("Failed to send friend request");
  }
}

async function handleCancelOrReject(friendId: number) {
  try {
    await $trpc.friends.remove.mutate(friendId);
    await refreshOnline();
  } catch (error) {
    console.error("Error cancelling/rejecting:", error);
  }
}

async function handleAcceptOnlineRequest(friendId: number) {
  try {
    await $trpc.friends.accept.mutate(friendId);
    await Promise.all([friendsStore.refresh(), refreshOnline()]);
    toast.success("Friend request accepted");
  } catch (error) {
    console.error("Error accepting request:", error);
  }
}

function handleManagingContent() {
  isChatting.value = false;
}
</script>

<template>
  <Sidebar side="right" class="flex top-0 h-svh z-1" v-bind="props">
    <SidebarHeader class="px-4 pt-4 pb-2 z-1">
      <div
        v-if="!isChatting && !isManagingFriends"
        class="flex items-center justify-between"
      >
        <p class="text-sm font-semibold">Social</p>
        <Toggle v-model="isManagingFriends" variant="outline" size="sm">
          <Settings2Icon class="w-4 h-4" />
        </Toggle>
      </div>

      <div v-if="isChatting" class="flex items-center justify-between">
        <UiButton variant="ghost" class="p-1" @click="isChatting = false">
          <ArrowLeftIcon />
        </UiButton>
      </div>

      <div v-if="isManagingFriends" class="flex items-center justify-between">
        <p class="text-sm font-semibold">Friend Manager</p>
        <Toggle
          v-model="isManagingFriends"
          @update:model-value="handleManagingContent"
          variant="outline"
          size="sm"
        >
          <Settings2Icon class="w-4 h-4" />
        </Toggle>
      </div>
    </SidebarHeader>

    <SidebarContent class="px-0 gap-0">
      <!-- Default stacked view: Friends on top, Online users below -->
      <div
        v-if="!isChatting && !isManagingFriends"
        class="flex flex-col gap-6 px-3 pb-4"
      >
        <!-- ============== FRIENDS SECTION ============== -->
        <section class="flex flex-col gap-2">
          <header class="flex items-center justify-between px-1">
            <div class="flex items-center gap-2">
              <UsersIcon class="w-4 h-4 text-muted-foreground" />
              <h3 class="text-xs font-semibold uppercase tracking-wide">
                Friends
              </h3>
              <span class="text-xs text-muted-foreground">
                ({{ friendsTotal }})
              </span>
            </div>
            <UiButton
              variant="ghost"
              size="sm"
              class="h-7 w-7 p-0"
              :title="friendsSearchOpen ? 'Close search' : 'Search friends'"
              @click="toggleFriendsSearch"
            >
              <SearchIcon v-if="!friendsSearchOpen" class="w-4 h-4" />
              <XIcon v-else class="w-4 h-4" />
            </UiButton>
          </header>

          <div v-if="friendsSearchOpen" class="relative">
            <SearchIcon
              class="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              ref="friendsSearchInputEl"
              v-model="friendsSearch"
              placeholder="Search friends"
              class="h-8 pl-7 text-sm"
            />
          </div>

          <ul class="flex flex-col">
            <li
              v-for="friend in friendsItems"
              :key="friend.id"
              @click="openChatWithFriend(friend)"
              class="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted cursor-pointer group"
            >
              <UiAvatar class="border border-border h-9 w-9 shrink-0">
                <UiAvatarImage :src="getAvatarSrc(friend)" alt="Avatar" />
              </UiAvatar>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5">
                  <p class="text-sm font-medium truncate">
                    {{ friend.username }}
                  </p>
                  <span
                    class="w-2 h-2 rounded-full shrink-0"
                    :class="{
                      'bg-success': statusOf(friend.id) === 'online',
                      'bg-ring': statusOf(friend.id) === 'offline',
                      'bg-destructive':
                        statusOf(friend.id) === 'busy' ||
                        statusOf(friend.id) === 'ingame',
                      'bg-warning': statusOf(friend.id) === 'matchmaking',
                    }"
                  />
                </div>
                <p
                  class="text-xs truncate"
                  :class="{
                    'text-success': statusOf(friend.id) === 'online',
                    'text-muted-foreground': statusOf(friend.id) === 'offline',
                    'text-destructive':
                      statusOf(friend.id) === 'busy' ||
                      statusOf(friend.id) === 'ingame',
                    'text-warning': statusOf(friend.id) === 'matchmaking',
                  }"
                >
                  {{
                    statusOf(friend.id) === "ingame"
                      ? "in game"
                      : statusOf(friend.id)
                  }}
                </p>
              </div>
              <UiButton
                @click.stop="handleDeleteFriend(friend.id)"
                title="Remove friend"
                variant="ghost"
                size="sm"
                class="opacity-0 group-hover:opacity-100 h-7 w-7 p-0 shrink-0"
              >
                <XIcon class="w-4 h-4" />
              </UiButton>
            </li>
            <li
              v-if="friendsItems.length === 0"
              class="text-muted-foreground text-xs text-center py-4"
            >
              {{
                friendsSearchActive
                  ? "No friends match your search."
                  : "No friends yet."
              }}
            </li>
          </ul>

          <div
            v-if="friendsTotal > PAGE_SIZE"
            class="flex items-center justify-between px-1 text-xs text-muted-foreground"
          >
            <UiButton
              variant="ghost"
              size="sm"
              class="h-7 w-7 p-0"
              :disabled="friendsPage === 0"
              @click="changeFriendsPage(-1)"
            >
              <ChevronLeftIcon class="w-4 h-4" />
            </UiButton>
            <span>
              {{ friendsPage + 1 }} / {{ totalPages(friendsTotal) }}
            </span>
            <UiButton
              variant="ghost"
              size="sm"
              class="h-7 w-7 p-0"
              :disabled="friendsPage + 1 >= totalPages(friendsTotal)"
              @click="changeFriendsPage(1)"
            >
              <ChevronRightIcon class="w-4 h-4" />
            </UiButton>
          </div>
        </section>

        <UiSeparator />

        <!-- ============== ONLINE USERS SECTION ============== -->
        <section class="flex flex-col gap-2">
          <header class="flex items-center justify-between px-1">
            <div class="flex items-center gap-2">
              <WifiIcon class="w-4 h-4 text-success" />
              <h3 class="text-xs font-semibold uppercase tracking-wide">
                Online Users
              </h3>
              <span class="text-xs text-muted-foreground">
                ({{ onlineTotal }})
              </span>
            </div>
            <UiButton
              variant="ghost"
              size="sm"
              class="h-7 w-7 p-0"
              :title="onlineSearchOpen ? 'Close search' : 'Search online users'"
              @click="toggleOnlineSearch"
            >
              <SearchIcon v-if="!onlineSearchOpen" class="w-4 h-4" />
              <XIcon v-else class="w-4 h-4" />
            </UiButton>
          </header>

          <div v-if="onlineSearchOpen" class="relative">
            <SearchIcon
              class="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              ref="onlineSearchInputEl"
              v-model="onlineSearch"
              placeholder="Search online users"
              class="h-8 pl-7 text-sm"
            />
          </div>

          <ul class="flex flex-col">
            <li
              v-for="user in onlineItems"
              :key="user.id"
              @click="openChatWithFriend(user)"
              class="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted group cursor-pointer"
            >
              <UiAvatar class="border border-border h-9 w-9 shrink-0">
                <UiAvatarImage :src="getAvatarSrc(user)" alt="Avatar" />
              </UiAvatar>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5">
                  <p class="text-sm font-medium truncate">
                    {{ user.username }}
                  </p>
                  <span
                    class="w-2 h-2 rounded-full shrink-0"
                    :class="{
                      'bg-success': user.status === 'online',
                      'bg-destructive':
                        user.status === 'busy' || user.status === 'ingame',
                      'bg-warning': user.status === 'matchmaking',
                    }"
                  />
                </div>
                <p
                  class="text-xs truncate"
                  :class="{
                    'text-success': user.status === 'online',
                    'text-destructive':
                      user.status === 'busy' || user.status === 'ingame',
                    'text-warning': user.status === 'matchmaking',
                  }"
                >
                  {{ user.status === "ingame" ? "in game" : user.status }}
                </p>
              </div>

              <div class="flex items-center gap-0.5 shrink-0">
                <UiButton
                  variant="ghost"
                  size="sm"
                  title="Chat"
                  class="h-7 w-7 p-0"
                  @click.stop="openChatWithFriend(user)"
                >
                  <MessageCircleIcon class="w-4 h-4" />
                </UiButton>
                <UiButton
                  v-if="user.requestStatus === 'none'"
                  variant="ghost"
                  size="sm"
                  title="Add friend"
                  class="h-7 w-7 p-0"
                  @click.stop="handleAddOnlineUser(user)"
                >
                  <UserPlusIcon class="w-4 h-4" />
                </UiButton>

                <template v-else-if="user.requestStatus === 'outgoing'">
                  <span class="text-[10px] text-muted-foreground mr-1">
                    Pending
                  </span>
                  <UiButton
                    variant="ghost"
                    size="sm"
                    title="Cancel request"
                    class="h-7 w-7 p-0"
                    @click.stop="handleCancelOrReject(user.id)"
                  >
                    <XIcon class="w-4 h-4" />
                  </UiButton>
                </template>

                <template v-else-if="user.requestStatus === 'incoming'">
                  <UiButton
                    variant="ghost"
                    size="sm"
                    title="Accept"
                    class="h-7 w-7 p-0 text-success hover:text-success"
                    @click.stop="handleAcceptOnlineRequest(user.id)"
                  >
                    <CheckIcon class="w-4 h-4" />
                  </UiButton>
                  <UiButton
                    variant="ghost"
                    size="sm"
                    title="Reject"
                    class="h-7 w-7 p-0"
                    @click.stop="handleCancelOrReject(user.id)"
                  >
                    <XIcon class="w-4 h-4" />
                  </UiButton>
                </template>
              </div>
            </li>
            <li
              v-if="onlineItems.length === 0 && !onlinePending"
              class="text-muted-foreground text-xs text-center py-4"
            >
              No other users online right now.
            </li>
          </ul>

          <div
            v-if="onlineTotal > PAGE_SIZE"
            class="flex items-center justify-between px-1 text-xs text-muted-foreground"
          >
            <UiButton
              variant="ghost"
              size="sm"
              class="h-7 w-7 p-0"
              :disabled="onlinePage === 0"
              @click="changeOnlinePage(-1)"
            >
              <ChevronLeftIcon class="w-4 h-4" />
            </UiButton>
            <span>
              {{ onlinePage + 1 }} / {{ totalPages(onlineTotal) }}
            </span>
            <UiButton
              variant="ghost"
              size="sm"
              class="h-7 w-7 p-0"
              :disabled="onlinePage + 1 >= totalPages(onlineTotal)"
              @click="changeOnlinePage(1)"
            >
              <ChevronRightIcon class="w-4 h-4" />
            </UiButton>
          </div>
        </section>
      </div>

      <ChatContent
        v-model="activeFriendId"
        v-if="isChatting && !isManagingFriends"
      />
      <ManagementContent v-model="requests" v-if="isManagingFriends" />
    </SidebarContent>

    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <div
            class="flex items-center gap-1"
            v-if="isChatting && !isManagingFriends"
          >
            <Input v-model="newMessage" placeholder="Write your message.." />
            <UiButton @click="sendMessage()">
              <SendHorizonalIcon class="cursor-pointer" />
            </UiButton>
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  </Sidebar>
</template>