<script setup lang="ts">
import {
  AudioWaveform,
  Blocks,
  Calendar,
  Command,
  Home,
  Inbox,
  MessageCircleQuestion,
  SquareChartGanttIcon,
  Search,
  Settings2,
  Sparkles,
  SunMoonIcon,
  Trash2,
} from "lucide-vue-next";

import NavFavorites from "~/components/LeftSiderBar/NavFavorites.vue";
import NavMain from "~/components/LeftSiderBar/NavMain.vue";
import NavSecondary from "~/components/LeftSiderBar/NavSecondary.vue";
import NavSettings from "~/components/LeftSiderBar/NavSettings.vue";
import SidebarLogo from "~/components/LeftSiderBar/SidebarLogo.vue";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  type SidebarProps,
  SidebarRail,
} from "@/components/ui/sidebar";

const props = defineProps<SidebarProps>();

// This is sample data.
const data = {
  navMain: [
    {
      title: "Home",
      url: "/",
      icon: Home,
      isActive: true,
    },
    {
      title: "Review",
      url: "/game/review",
      icon: SquareChartGanttIcon,
      badge: "10",
    },
  ],

  favorites: [
    {
      name: "Rankings",
      url: "/ranks",
      emoji: "📊",
    },
    {
      name: "Statistics",
      url: "#",
      emoji: "🍳",
    },
    {
      name: "Progress",
      url: "#",
      emoji: "💪",
    },
    {
      name: "Mistakes",
      url: "#",
      emoji: "📚",
    },
    {
      name: "Partners",
      url: "#",
      emoji: "🌱",
    },
    {
      name: "News",
      url: "#",
      emoji: "📰",
    },
  ],
  settings: [
    {
      name: "Preferences",
      url: "#",
      emoji: "🏠",
    },
    {
      name: "Profile",
      url: "#",
      emoji: "🙎🏻‍♂️",
    },
  ],
  navSecondary: [
    {
      title: "Help",
      url: "#",
      icon: MessageCircleQuestion,
    },
  ],
};
</script>

<template>
  <Sidebar class="border-r-0" v-bind="props">
    <SidebarHeader>
      <SidebarLogo />
      <NavMain :items="data.navMain" />
    </SidebarHeader>
    <SidebarContent class="thin-scrollbar">
      <NavFavorites :favorites="data.favorites" />
      <NavSettings :settings="data.settings" />
      <NavSecondary :items="data.navSecondary" class="mt-auto" />
    </SidebarContent>
    <SidebarRail />
  </Sidebar>
</template>
