<script setup lang="ts">
import SidebarLeft from "@/components/LeftSiderBar/SidebarLeft.vue";
import RivalSidebarRight from "@/components/MultiRightSidebar/SidebarRight.vue";
import DefaultSidebarRight from "@/components/RightSideBar/SidebarRight.vue";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

const gameStore = useGameStore();
const hasOpponent = computed(
  () => !!gameStore.players?.opponent?.info?.username
);
</script>
<template>
  <SidebarProvider :defaultOpenRight="true" :defaultOpenLeft="false">
    <SidebarLeft side="left" collapsible="icon" />
    <SidebarInset>
      <slot />
    </SidebarInset>
    <RivalSidebarRight v-if="hasOpponent" side="right" variant="floating" />
    <DefaultSidebarRight v-else side="right" variant="floating" />
  </SidebarProvider>
</template>
