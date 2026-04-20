<script setup lang="ts">
import { useRival } from "./useRivalChat";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  type SidebarProps,
} from "@/components/ui/sidebar";
import { SendHorizonalIcon } from "lucide-vue-next";
import { getAvatarSrc } from "@/composables/useAvatar";

const props = withDefaults(defineProps<Omit<SidebarProps, "side">>(), {
  collapsible: "offcanvas",
});

const rival = useRival();
const userStore = useUserStore();
const newMessage = ref("");
const hasRival = computed(() => !!rival.info.value?.username);

// --- Auto-resize textarea (matches friend chat sidebar) ---
const chatTextareaEl = ref<HTMLTextAreaElement | null>(null);
const CHAT_TA_MIN = 36;
const CHAT_TA_MAX = 160;
function autoResizeChatTa() {
  const el = chatTextareaEl.value;
  if (!el) return;
  el.style.height = "auto";
  const next = Math.min(Math.max(el.scrollHeight, CHAT_TA_MIN), CHAT_TA_MAX);
  el.style.height = next + "px";
}
watch(newMessage, () => nextTick(autoResizeChatTa));
onMounted(() => nextTick(autoResizeChatTa));

// --- Auto scroll to bottom on new messages ---
const scrollEl = ref<HTMLElement | null>(null);
async function scrollToBottom() {
  await nextTick();
  if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight;
}
watch(() => rival.messages.value.length, () => scrollToBottom());

function sendMessage() {
  if (!newMessage.value.trim() || !hasRival.value) return;
  rival.sendMessage(newMessage.value.trim());
  newMessage.value = "";
}

function handleChatKeydown(e: KeyboardEvent) {
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    sendMessage();
  }
}

function formatTime(ts: number | Date | string) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getSender(isSelf: boolean) {
  return isSelf
    ? {
        avatarUrl: userStore.user?.avatarUrl,
        gender: userStore.user?.gender,
        username: userStore.user?.username ?? "You",
      }
    : {
        avatarUrl: rival.info.value?.avatarUrl,
        gender: rival.info.value?.gender,
        username: rival.info.value?.username ?? "Rival",
      };
}
</script>

<template>
  <Sidebar side="right" class="flex top-0 h-svh z-1" v-bind="props">
    <SidebarHeader class="px-4 pt-4 pb-2">
      <p class="text-sm font-semibold">Rival chat</p>
      <UiSeparator class="mt-2" />
    </SidebarHeader>

    <SidebarContent class="flex-1 min-h-0">
      <div
        ref="scrollEl"
        class="flex-1 min-h-0 overflow-y-auto thin-scrollbar px-3 py-3 space-y-3"
      >
        <p
          v-if="!hasRival"
          class="text-xs text-muted-foreground text-center mt-6"
        >
          No rival yet.
        </p>
        <p
          v-else-if="rival.messages.value.length <= 0"
          class="text-xs text-muted-foreground text-center mt-6"
        >
          You may start chatting with your rival.
        </p>

        <div
          v-for="message in rival.messages.value"
          :key="message.timestamp"
          class="flex items-start gap-2"
        >
          <UiAvatar class="border border-border h-6 w-6 shrink-0">
            <UiAvatarImage
              :src="getAvatarSrc(getSender(message.self))"
              alt="Avatar"
            />
          </UiAvatar>
          <div class="min-w-0 flex-1">
            <div class="flex items-baseline gap-2">
              <p class="text-xs font-semibold truncate">
                {{ getSender(message.self).username }}
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
    </SidebarContent>

    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <div class="flex items-center gap-1">
            <textarea
              ref="chatTextareaEl"
              v-model="newMessage"
              :disabled="!hasRival"
              :placeholder="
                hasRival
                  ? 'Write your message.. (Shift+Enter for newline)'
                  : 'No rival yet'
              "
              rows="1"
              class="flex-1 resize-none overflow-y-auto thin-scrollbar text-xs leading-snug py-2 px-3 rounded-md border border-input bg-transparent shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              style="min-height: 36px; max-height: 160px"
              @keydown="handleChatKeydown"
            />
            <UiButton
              :disabled="!hasRival || !newMessage.trim()"
              class="shrink-0 self-center"
              @click="sendMessage()"
            >
              <SendHorizonalIcon class="cursor-pointer" />
            </UiButton>
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  </Sidebar>
</template>

<style scoped></style>
