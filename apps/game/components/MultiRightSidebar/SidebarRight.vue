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
import { Input } from "@/components/ui/input";
import { SendHorizonalIcon } from "lucide-vue-next";

const props = withDefaults(defineProps<Omit<SidebarProps, "side">>(), {
  collapsible: "offcanvas",
});

const rival = useRival();
const userStore = useUserStore();
const newMessage = ref("");

function sendMessage() {
  if (!newMessage.value.trim()) return;
  rival.sendMessage(newMessage.value);
  newMessage.value = "";
}

function getContent(isSelf: boolean) {
  return isSelf
    ? {
        avatarUrl: userStore.user?.avatarUrl,
        username: userStore.user?.username,
      }
    : {
        avatarUrl: rival.info.value?.avatarUrl,
        username: rival.info.value?.username,
      };
}
</script>

<template>
  <Sidebar side="right" class="flex top-0 h-svh z-1" v-bind="props">
    <SidebarHeader class="h-12 px-5 pt-6 z-1">
      <p>Rival chat</p>
      <UiSeparator />
    </SidebarHeader>
    <SidebarContent class="overflow-y-auto thin-scrollbar mt-2">
      <div class="mt-10 px-2 h-full">
        <div>
          <p
            v-if="!rival.info.value?.username"
            class="text-sm px-4 text-center"
          >
            No rival yet
          </p>
          <p
            v-if="
              rival.info.value?.username && rival.messages.value.length <= 0
            "
            class="text-sm px-4 text-center"
          >
            You may start chatting with your rival.
          </p>
        </div>

        <ul
          class="h-full"
          v-if="rival.info.value && rival.messages.value.length"
        >
          <li
            class="mb-2"
            v-for="message in rival.messages.value"
            :key="message.timestamp"
          >
            <div
              class="flex items-start gap-2 px-4 py-3 rounded-md"
              :class="{
                'justify-end': message.self,
                'justify-start': !message.self,
              }"
            >
              <div
                class="flex items gap-2 text-sm text-muted-foreground w-9/10"
              >
                <UiAvatar v-if="getContent(message.self).avatarUrl">
                  <UiAvatarImage :src="getContent(message.self)?.avatarUrl!" />
                </UiAvatar>
                <div class="flex flex-col">
                  <div class="flex items-center gap-1">
                    <span class="font-semibold">
                      {{ getContent(message.self)?.username }}
                    </span>
                    <span class="text-[10px]">{{
                      new Date(message.timestamp).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })
                    }}</span>
                  </div>
                  <p class="break-all">{{ message.text }}</p>
                </div>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </SidebarContent>
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <Input
            v-model="newMessage"
            :disabled="!rival.info.value?.username"
            placeholder="Type a message..."
            class="w-full"
            @keyup.enter="sendMessage"
          />
          <button
            class="absolute right-2 top-1/2 -translate-y-1/2"
            :disabled="!rival.info.value?.username"
            @click="sendMessage"
          >
            <SendHorizonalIcon
              class="h-5 w-5"
              :class="!rival.info.value?.username ? 'opacity-40' : undefined"
            />
          </button>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  </Sidebar>
</template>

<style scoped></style>
