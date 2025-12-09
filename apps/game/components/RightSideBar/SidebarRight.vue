<script setup lang="ts">
import { ArrowLeftIcon, XIcon } from "lucide-vue-next";
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
import { SearchIcon, SendHorizonalIcon, Settings2Icon } from "lucide-vue-next";
import type { FriendRequests } from "@/shared/types/common";
import ChatContent from "./ChatContent.vue";
import Fuse from "fuse.js";
import useSocial from "@/composables/useSocial";
import { toast } from "vue-sonner";

const props = withDefaults(defineProps<Omit<SidebarProps, "side">>(), {
  collapsible: "offcanvas",
});

const isSearching = ref(false);
const searchQuery = ref("");
const isManagingFriends = ref(false);
const isChatting = ref(false);
const activeFriendId = ref(-1);
const social = useSocial();
const { $trpc } = useNuxtApp();
const friendsStore = useFriendsStore();
const userStore = useUserStore();
const fuse = computed(() => {
  if (!friendsStore.friendList) return null;
  return new Fuse(friendsStore.friendList, {
    keys: ["username"],
    threshold: 0.3,
  });
});

const requests = ref<FriendRequests>({
  outgoing: [],
  incoming: [],
});

function handleSearchStart() {
  if (!searchQuery.value.trim()) {
    isSearching.value = false;
    return;
  }
  isSearching.value = true;
}

const friendsTarget = computed(() =>
  isSearching.value
    ? fuse.value &&
      fuse.value.search(searchQuery.value).map((result) => result.item)
    : friendsStore.friendList
);

async function handleChatClicked(friendId: number) {
  if (!friendsStore.friendList) return;

  for (const friend of friendsStore.friendList) {
    if (friend.id !== friendId) friend.isActive = false;
    if (friend.id === friendId) {
      friend.isActive = true;
      activeFriendId.value = friend.id;
    }
  }

  isSearching.value = false;
  isChatting.value = true;

  // Load conversation history from database
  try {
    const messages = await social.openChat(friendId);
    const userId = userStore.user?.id;
    if (userId) {
      friendsStore.setMessages(friendId, messages, userId);
    }
  } catch (error) {
    console.error("Error loading conversation:", error);
  }
}

const newMessage = ref("");
const isSending = ref(false);

async function sendMessage() {
  if (!newMessage.value.trim() || isSending.value) return;

  const activeFriend = friendsStore.friendList?.find(
    (friend) => friend.id === activeFriendId.value
  );
  if (!activeFriend) return;

  const messageContent = newMessage.value.trim();
  newMessage.value = "";
  isSending.value = true;

  try {
    // Send message via socket (stored in database)
    const result = await social.sendMessage(activeFriend.id, messageContent);

    if (result.success) {
      // Add message to local state
      friendsStore.addMessage(activeFriend.username, {
        type: "text",
        id: userStore.user?.id?.toString() || "",
        text: messageContent,
        content: messageContent,
        timestamp: new Date(),
        self: true,
      });
    } else {
      // Show error and restore message
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
    let sendMessageListener: ((e: KeyboardEvent) => void) | null = null;
    if (newChattingValue) {
      sendMessageListener = (e: KeyboardEvent) => {
        if (e.key === "Enter") sendMessage();
      };
      window.addEventListener("keydown", sendMessageListener);
    } else window.removeEventListener("keydown", sendMessageListener!);
  }
);

function handleManagingContent() {
  isChatting.value = false;
  isSearching.value = false;
}
function handleIsSearching() {
  isChatting.value = false;
  isManagingFriends.value = false;
}

async function handleDeleteFriend(friendId: number) {
  try {
    await $trpc.friends.remove.mutate(friendId);
    friendsStore.refresh();
  } catch (error) {
    console.error("Error deleting request:", error);
    return;
  }
}
</script>

<template>
  <Sidebar side="right" class="flex top-0 h-svh z-1" v-bind="props">
    <SidebarHeader class="h-12 px-5 pt-6 z-1">
      <div
        v-if="!isSearching && !isManagingFriends && !isChatting"
        class="flex items-center justify-between"
      >
        <p>Friends</p>
        <div>
          <Toggle v-model="isSearching" variant="outline">
            <SearchIcon />
          </Toggle>
          <Toggle v-model="isManagingFriends" variant="outline">
            <Settings2Icon />
          </Toggle>
        </div>
      </div>
      <div v-if="isChatting" class="flex items-center justify-between">
        <div>
          <UiButton variant="ghost" class="p-1" @click="isChatting = false">
            <ArrowLeftIcon />
          </UiButton>
        </div>
      </div>
      <div
        v-if="isSearching && !isManagingFriends && !isChatting"
        class="flex items-center justify-between gap-2"
      >
        <Input
          v-model="searchQuery"
          @update:model-value="handleSearchStart"
          placeholder="Enter username"
        />
        <Toggle
          v-model="isSearching"
          @update:model-value="handleIsSearching"
          variant="outline"
        >
          <SearchIcon />
        </Toggle>
      </div>
      <div v-if="isManagingFriends" class="flex items-center justify-between">
        <p>Friend Manager</p>
        <Toggle
          v-model="isManagingFriends"
          @update:model-value="handleManagingContent"
          variant="outline"
        >
          <Settings2Icon />
        </Toggle>
      </div>
      <UiSeparator />
    </SidebarHeader>
    <SidebarContent>
      <ul class="mt-10 px-2 h-full" v-if="!isChatting && !isManagingFriends">
        <li
          @click="handleChatClicked(friend.id)"
          v-for="friend in friendsTarget"
          :key="friend.username"
          class="flex items-center p-2 gap-2 hover:bg-muted cursor-pointer group"
        >
          <UiAvatar class="border border-border h-8 w-8">
            <UiAvatarImage :src="friend.avatarUrl" alt="Avatar" />
          </UiAvatar>
          <div>
            <div class="flex items-center gap-1">
              <p class="text-sm">{{ friend.username }}</p>
              <div
                class="w-2 h-2 rounded-full"
                :class="{
                  'bg-success': friend.status === 'online',
                  'bg-ring': friend.status === 'offline',
                  'bg-destructive':
                    friend.status === 'busy' || friend.status === 'ingame',
                  'bg-warning': friend.status === 'matchmaking',
                }"
              ></div>
            </div>
            <p
              class="text-xs"
              :class="{
                'text-success': friend.status === 'online',
                'text-ring': friend.status === 'offline',
                'text-destructive':
                  friend.status === 'busy' || friend.status === 'ingame',
                'text-warning': friend.status === 'matchmaking',
              }"
            >
              {{ friend.status === "ingame" ? "in game" : friend.status }}
            </p>
          </div>
          <UiButton
            @click.stop="handleDeleteFriend(friend.id)"
            title="Delete Friend"
            class="cursor-pointer ml-auto hidden group-hover:block hover:scale-125"
            variant="link"
          >
            <XIcon />
          </UiButton>
        </li>
      </ul>
      <ChatContent
        v-model="activeFriendId"
        v-if="isChatting && !isSearching && !isManagingFriends"
      />
      <ManagementContent v-model="requests" v-if="isManagingFriends" />
    </SidebarContent>
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <div
            class="flex items-center gap-1"
            v-if="isChatting && !isManagingFriends && !isSearching"
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
