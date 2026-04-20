<script setup lang="ts">
import { getAvatarSrc } from "@/composables/useAvatar";
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  // Always keep status dots in sync (incl. active chat user)
  friendStatusMap.value[userId] = status;
  refreshOnline();
});

// --- Unread message indicators ---
const unreadCounts = social.unreadCounts;
function hasUnread(id: number) {
  return (unreadCounts.value[id] ?? 0) > 0;
}
onMounted(() => {
  social.getUnreadCounts().catch((e) =>
    console.error("Failed to fetch unread counts", e)
  );
  refreshUnseenRequests();
});
// Refresh unread counts on incoming messages
const stopMessageListener = social.onMessage(() => {
  // unreadCounts is mutated inside useSocial.onMessage; nothing extra needed
});

// --- Unseen friend-request indicator ---
const unseenRequestsCount = ref(0);
async function refreshUnseenRequests() {
  try {
    unseenRequestsCount.value = await $trpc.friends.requests.unseenCount.query();
  } catch (e) {
    console.error("Failed to fetch unseen friend requests count", e);
  }
}

// --- Real-time friend request listeners ---
const stopFriendRequestReceived = social.onFriendRequestReceived((sender) => {
  toast.info(`${sender?.username ?? "Someone"} sent you a friend request`);
  refreshUnseenRequests();
  refreshFriendsList();
  refreshOnline();
});
const stopFriendRequestUpdated = social.onFriendRequestUpdated(() => {
  refreshUnseenRequests();
  friendsStore.refresh();
  refreshFriendsList();
  refreshOnline();
});
onUnmounted(() => {
  stopOnlineStatusListener();
  stopPresenceListener();
  stopMessageListener();
  stopFriendRequestReceived();
  stopFriendRequestUpdated();
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

  // Ensure header status is accurate even if friend was not in current page
  social
    .getFriendStatus(friend.id)
    .then((s) => {
      friendStatusMap.value[friend.id] = s;
    })
    .catch(() => {});

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
const chatTextareaEl = ref<HTMLTextAreaElement | null>(null);
const CHAT_TA_MIN = 36; // px (matches min-h-9)
const CHAT_TA_MAX = 160; // px (matches max-h-40)
function autoResizeChatTa() {
  const el = chatTextareaEl.value;
  if (!el) return;
  el.style.height = "auto";
  const next = Math.min(Math.max(el.scrollHeight, CHAT_TA_MIN), CHAT_TA_MAX);
  el.style.height = next + "px";
}
watch(newMessage, () => nextTick(autoResizeChatTa));
watch(isChatting, async (v) => {
  if (v) {
    await nextTick();
    autoResizeChatTa();
  }
});
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
  () => {
    // chat keydown handling is per-textarea now (see handleChatKeydown)
  }
);

const activeChatFriend = computed(() => {
  if (!friendsStore.friendList) return null;
  return (
    friendsStore.friendList.find((f) => f.id === activeFriendId.value) ?? null
  );
});

function handleChatKeydown(e: KeyboardEvent) {
  // Enter sends, Shift+Enter inserts newline (default textarea behavior)
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    sendMessage();
  }
}

// --- Friend request actions ---
const requests = ref<FriendRequests>({ outgoing: [], incoming: [] });

// --- Delete friend confirmation dialog ---
const deleteDialogOpen = ref(false);
const pendingDeleteFriend = ref<{ id: number; username: string } | null>(null);
function askDeleteFriend(friend: { id: number; username: string }) {
  pendingDeleteFriend.value = { id: friend.id, username: friend.username };
  deleteDialogOpen.value = true;
}
async function confirmDeleteFriend() {
  const target = pendingDeleteFriend.value;
  if (!target) return;
  deleteDialogOpen.value = false;
  pendingDeleteFriend.value = null;
  try {
    await $trpc.friends.remove.mutate(target.id);
    await Promise.all([
      friendsStore.refresh(),
      refreshFriendsList(),
      friendsSearchActive.value ? refreshFriendsSearch() : Promise.resolve(),
      refreshOnline(),
    ]);
  } catch (error) {
    console.error("Error deleting friend:", error);
    toast.error("Failed to remove friend");
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

// Mark incoming requests as seen when entering the manager view
watch(isManagingFriends, async (v) => {
  if (!v) return;
  if (unseenRequestsCount.value === 0) return;
  try {
    await $trpc.friends.requests.markSeen.mutate();
    unseenRequestsCount.value = 0;
  } catch (e) {
    console.error("Failed to mark friend requests as seen", e);
  }
});
</script>

<template>
  <Sidebar side="right" class="flex top-0 h-svh z-1" v-bind="props">
    <SidebarHeader
      class="px-4 pt-4 pb-2 z-1"
      :class="isChatting && !isManagingFriends ? 'border-b border-border' : ''"
    >
      <div
        v-if="!isChatting && !isManagingFriends"
        class="flex items-center justify-between"
      >
        <p class="text-sm font-semibold">Social</p>
        <Toggle
          v-model="isManagingFriends"
          variant="outline"
          size="sm"
          class="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary data-[state=on]:hover:bg-primary/90 data-[state=on]:hover:text-primary-foreground"
        >
          <span class="relative inline-flex">
            <Settings2Icon class="w-4 h-4" />
            <span
              v-if="unseenRequestsCount > 0"
              class="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-1 rounded-full bg-destructive text-[9px] leading-[14px] text-white font-bold text-center ring-2 ring-background"
              :title="`${unseenRequestsCount} new friend request${unseenRequestsCount > 1 ? 's' : ''}`"
            >
              {{ unseenRequestsCount > 9 ? "9+" : unseenRequestsCount }}
            </span>
          </span>
        </Toggle>
      </div>

      <div v-if="isChatting" class="flex items-center gap-2 min-w-0">
        <UiButton variant="ghost" class="p-1 shrink-0" @click="isChatting = false">
          <ArrowLeftIcon />
        </UiButton>
        <template v-if="activeChatFriend">
          <UiAvatar class="h-7 w-7 shrink-0 border border-border">
            <UiAvatarImage :src="getAvatarSrc(activeChatFriend)" alt="Avatar" />
          </UiAvatar>
          <div class="min-w-0">
            <p class="text-sm font-semibold truncate leading-tight">
              {{ activeChatFriend.username }}
            </p>
            <p
              class="text-[10px] truncate leading-tight"
              :class="{
                'text-success': statusOf(activeChatFriend.id) === 'online',
                'text-muted-foreground':
                  statusOf(activeChatFriend.id) === 'offline',
                'text-destructive':
                  statusOf(activeChatFriend.id) === 'busy' ||
                  statusOf(activeChatFriend.id) === 'ingame',
                'text-warning':
                  statusOf(activeChatFriend.id) === 'matchmaking',
              }"
            >
              {{
                statusOf(activeChatFriend.id) === "ingame"
                  ? "in game"
                  : statusOf(activeChatFriend.id)
              }}
            </p>
          </div>
        </template>
      </div>

      <div v-if="isManagingFriends" class="flex items-center justify-between">
        <p class="text-sm font-semibold">Friend Manager</p>
        <Toggle
          v-model="isManagingFriends"
          @update:model-value="handleManagingContent"
          variant="outline"
          size="sm"
          class="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary data-[state=on]:hover:bg-primary/90 data-[state=on]:hover:text-primary-foreground"
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
                @click.stop="askDeleteFriend(friend)"
                title="Remove friend"
                variant="ghost"
                size="sm"
                class="opacity-0 group-hover:opacity-100 h-7 w-7 p-0 shrink-0"
              >
                <XIcon class="w-4 h-4" />
              </UiButton>
              <span
                v-if="hasUnread(friend.id)"
                class="w-2.5 h-2.5 rounded-full bg-destructive shrink-0 mr-1"
                title="Unread messages"
              />
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
                <span
                  v-if="hasUnread(user.id)"
                  class="w-2.5 h-2.5 rounded-full bg-destructive shrink-0 mr-1"
                  title="Unread messages"
                />
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
                  <span
                    class="inline-flex items-center justify-center h-7 w-7 text-warning"
                    title="Request pending"
                  >
                    <ClockIcon class="w-4 h-4" />
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
            <textarea
              ref="chatTextareaEl"
              v-model="newMessage"
              placeholder="Write your message.. (Shift+Enter for newline)"
              rows="1"
              class="flex-1 resize-none overflow-y-auto thin-scrollbar text-xs leading-snug py-2 px-3 rounded-md border border-input bg-transparent shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              style="min-height: 36px; max-height: 160px;"
              @keydown="handleChatKeydown"
            />
            <UiButton @click="sendMessage()" class="shrink-0 self-center">
              <SendHorizonalIcon class="cursor-pointer" />
            </UiButton>
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  </Sidebar>

  <Dialog v-model:open="deleteDialogOpen">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Remove friend</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete
          <span class="font-semibold text-foreground">{{
            pendingDeleteFriend?.username
          }}</span>
          from your friend list?
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <UiButton variant="ghost" @click="deleteDialogOpen = false">
          Cancel
        </UiButton>
        <UiButton variant="destructive" @click="confirmDeleteFriend">
          Remove
        </UiButton>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>