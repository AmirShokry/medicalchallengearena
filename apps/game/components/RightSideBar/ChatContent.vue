<script setup lang="ts">
import { getAvatarSrc } from "@/composables/useAvatar";
const activeFriendId = defineModel<number>({ required: true });
const userStore = useUserStore();
const friendsStore = useFriendsStore();
const activeFriend = computed(() => {
  if (!friendsStore.friendList) return null;
  return friendsStore.friendList.find(
    (friend) => friend.id === activeFriendId.value
  );
});

function formatTime(ts: Date | string | number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const scrollEl = ref<HTMLElement | null>(null);
async function scrollToBottom() {
  await nextTick();
  if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight;
}
watch(
  () => activeFriend.value?.messages.length,
  () => scrollToBottom()
);
watch(activeFriendId, () => scrollToBottom());
onMounted(scrollToBottom);
</script>
<template>
  <div
    ref="scrollEl"
    class="flex-1 min-h-0 overflow-y-auto thin-scrollbar px-3 py-3 space-y-3"
    v-if="activeFriend"
  >
    <p
      v-if="!activeFriend.messages || activeFriend.messages.length <= 0"
      class="text-xs text-muted-foreground text-center mt-6"
    >
      No messages yet. Say hi!
    </p>

    <div
      v-for="message in activeFriend.messages"
      :key="message.timestamp.toString()"
      class="flex items-start gap-2"
    >
      <UiAvatar class="border border-border h-6 w-6 shrink-0">
        <UiAvatarImage
          v-if="!message.self"
          :src="getAvatarSrc(activeFriend)"
          alt="Avatar"
        />
        <UiAvatarImage
          v-else-if="userStore.user"
          :src="getAvatarSrc(userStore.user)"
          alt="Avatar"
        />
      </UiAvatar>
      <div class="min-w-0 flex-1">
        <div class="flex items-baseline gap-2">
          <p class="text-xs font-semibold truncate">
            {{
              message.self
                ? (userStore.user?.username ?? "You")
                : activeFriend.username
            }}
          </p>
          <span class="text-[10px] text-muted-foreground shrink-0">
            {{ formatTime(message.timestamp) }}
          </span>
        </div>
        <p class="text-xs whitespace-pre-wrap break-words leading-snug">
          {{ message.text }}
        </p>
      </div>
    </div>
  </div>
</template>
