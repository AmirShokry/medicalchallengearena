<script setup lang="ts">
import type { FriendRequests } from "@/shared/types/common";
import { XIcon, CheckIcon } from "lucide-vue-next";
const friendsStore = useFriendsStore();
const requests = defineModel<FriendRequests>({ required: true });

const { $trpc } = useNuxtApp();
$trpc.friends.requests.all.useQuery(undefined, {
  transform: (data) => {
    if (!data) return;
    requests.value = data;
  },
});

const addedFriend = ref("");
async function handleAddFriend() {
  if (!addedFriend.value.trim()) return;
  try {
    const newFriend = await $trpc.friends.add.mutate(addedFriend.value);
    if (!newFriend) return;
    requests.value.outgoing.push(newFriend);
  } catch (error) {
    console.error("Error adding friend:", error);
    return;
  }

  addedFriend.value = "";
}

async function handleDeleteRequest(friendId: number) {
  try {
    await $trpc.friends.remove.mutate(friendId);
    const request = requests.value.outgoing.findIndex((r) => r.id === friendId);
    if (request !== -1) requests.value.outgoing.splice(request, 1);
  } catch (error) {
    console.error("Error deleting request:", error);
    return;
  }
}
async function handleRejectRequest(friendId: number) {
  try {
    await $trpc.friends.remove.mutate(friendId);
    const request = requests.value.incoming.findIndex((r) => r.id === friendId);
    if (request !== -1) requests.value.incoming.splice(request, 1);
  } catch (error) {
    console.error("Error deleting request:", error);
    return;
  }
}

async function handleAcceptRequest(friendId: number) {
  try {
    const newFriend = await $trpc.friends.accept.mutate(friendId);
    if (!newFriend) return;
    requests.value.incoming.splice(
      requests.value.incoming.findIndex((r) => r.id === friendId),
      1
    );
    await friendsStore.refresh();
  } catch (error) {
    console.error("Error accepting request:", error);
    return;
  }
}
</script>

<template>
  <div class="mt-10 px-2 h-full">
    <div class="px-4 flex flex-col gap-2">
      <UiLabel> Add friend </UiLabel>
      <UiInput @keyup.enter="handleAddFriend" v-model="addedFriend"></UiInput>
      <UiButton variant="secondary" @click="handleAddFriend">Send</UiButton>
    </div>
    <UiSeparator class="my-6" />
    <div class="px-4">
      <UiLabel>Requests </UiLabel>
    </div>
    <ul class="mt-4 overflow-y-auto">
      <li
        v-for="friend in requests.incoming"
        :key="friend.username"
        class="flex items-center p-2 gap-2 hover:bg-muted cursor-pointer"
      >
        <div class="flex items-center gap-2">
          <UiAvatar class="border border-border h-8 w-8">
            <UiAvatarImage
              v-if="friend.avatarUrl"
              :src="friend.avatarUrl"
              alt="Avatar"
            />
          </UiAvatar>
          <div>
            <p class="text-sm">{{ friend.username }}</p>
            <p class="text-xs text-muted-foreground">Incoming Request</p>
          </div>
          <UiButton
            @click="handleAcceptRequest(friend.id)"
            title="Accept request"
            class="cursor-pointer"
            variant="link"
          >
            <CheckIcon />
          </UiButton>
          <UiButton
            @click="handleRejectRequest(friend.id)"
            title="Reject request"
            class="cursor-pointer"
            variant="link"
          >
            <XIcon />
          </UiButton>
        </div>
      </li>
      <li><UiSeparator class="my-2" /></li>
      <li
        v-for="friend in requests.outgoing"
        :key="friend.username"
        class="flex items-center p-2 gap-2 hover:bg-muted"
      >
        <div class="flex items-center gap-2">
          <UiAvatar class="border border-border h-8 w-8">
            <UiAvatarImage
              v-if="friend.avatarUrl"
              :src="friend.avatarUrl"
              alt="Avatar"
            />
          </UiAvatar>
          <div>
            <p class="text-sm">{{ friend.username }}</p>
            <p class="text-xs text-muted-foreground">Outgoing Request</p>
          </div>
          <UiButton
            @click="handleDeleteRequest(friend.id)"
            title="Delete request"
            class="cursor-pointer"
            variant="link"
          >
            <XIcon />
          </UiButton>
        </div>
      </li>

      <li
        v-if="requests.incoming.length === 0 && requests.outgoing.length === 0"
        class="text-muted-foreground text-sm text-center"
      >
        <p>No incoming requests.</p>
      </li>
      <li
        v-if="requests.outgoing.length === 0"
        class="text-muted-foreground text-sm text-center"
      >
        No outgoing requests.
      </li>
    </ul>
  </div>
</template>
