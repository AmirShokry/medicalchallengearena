<script setup lang="ts">
import {
  ChevronRight,
  Settings2,
  SquareTerminal,
  Users2Icon,
  KeyRound,
  Layers,
} from "lucide-vue-next";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { setActiveContent } from "./utils";
const items = ref([
  {
    title: "Entry",
    url: "#",
    icon: SquareTerminal,
    action: () => setActiveContent("ContentEntry"),
  },
  {
    title: "Settings",
    url: "#",
    icon: Settings2,
    items: [
      {
        title: "General",
        url: "#",
      },
      {
        title: "Roles",
        url: "#",
      },
      {
        title: "Preferences",
        url: "#",
      },
    ],
  },
]);
import { useSidebar } from "@/components/ui/sidebar/utils";
const { toggleSidebar } = useSidebar();
</script>

<template>
  <SidebarGroup>
    <SidebarGroupLabel>Data</SidebarGroupLabel>
    <SidebarMenu>
      <Collapsible
        v-for="item in items"
        :key="item.title"
        as-child
        class="group/collapsible"
      >
        <SidebarMenuItem>
          <CollapsibleTrigger
            as-child
            class="cursor-pointer"
            @click="item.action?.()"
          >
            <SidebarMenuButton :tooltip="item.title">
              <component :is="item.icon" v-if="item.icon" />
              <span>{{ item.title }}</span>
              <ChevronRight
                v-if="item.items?.length"
                class="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
              />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent v-if="item.items?.length">
            <SidebarMenuSub>
              <SidebarMenuSubItem
                v-for="subItem in item.items"
                :key="subItem.title"
              >
                <SidebarMenuSubButton as-child>
                  <a :href="subItem.url">
                    <span>{{ subItem.title }}</span>
                  </a>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
      <SidebarMenuItem>
        <SidebarMenuButton @click="toggleSidebar" as-child>
          <NuxtLink to="/systems">
            <Layers class="size-4" />
            <span>Systems</span>
          </NuxtLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton @click="toggleSidebar" as-child>
          <NuxtLink to="/users">
            <Users2Icon class="size-4" />
            <span>Users</span>
          </NuxtLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton @click="toggleSidebar" as-child>
          <NuxtLink to="/access-codes">
            <KeyRound class="size-4" />
            <span>Access Codes</span>
          </NuxtLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  </SidebarGroup>
</template>
