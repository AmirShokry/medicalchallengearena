<script setup lang="ts">
import SidebarLeft from "@/components/LeftSiderBar/SidebarLeft.vue";
import SidebarRight from "@/components/RightSideBar/SidebarRight.vue";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
</script>
<template>
  <SidebarProvider :defaultOpenRight="true" :defaultOpenLeft="false">
    <SidebarLeft side="left" collapsible="icon" />
    <SidebarInset>
      <slot />
    </SidebarInset>
    <SidebarRight side="right" variant="floating" />
  </SidebarProvider>
</template>
