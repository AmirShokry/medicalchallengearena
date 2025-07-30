<script setup lang="ts">
import { type LucideIcon, SunMoonIcon, LogOutIcon } from "lucide-vue-next";

import type { Component } from "vue";
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";

defineProps<{
	items: {
		title: string;
		url: string;
		icon: LucideIcon;
		badge?: Component;
	}[];
}>();

import { useColorMode } from "@vueuse/core";
const colorMode = useColorMode();

const nextColorMode = computed(() => {
	return colorMode.value === "dark" ? "Light Mode" : "Dark Mode";
});

function toggleColorMode() {
	colorMode.value = colorMode.value === "dark" ? "light" : "dark";
}
const { signOut } = useAuth();
</script>

<template>
	<SidebarGroup>
		<SidebarGroupContent>
			<SidebarMenu>
				<SidebarMenuItem v-for="item in items" :key="item.title">
					<SidebarMenuButton as-child>
						<a :href="item.url">
							<component :is="item.icon" />
							<span>{{ item.title }}</span>
						</a>
					</SidebarMenuButton>
					<SidebarMenuBadge v-if="item.badge">
						<component :is="item.badge" />
					</SidebarMenuBadge>
				</SidebarMenuItem>
				<SidebarMenuItem>
					<SidebarMenuButton
						class="cursor-pointer hover:bg-destructive"
						@click="() => signOut()">
						<LogOutIcon />
						<span>Sign Out</span>
					</SidebarMenuButton>
				</SidebarMenuItem>
				<SidebarMenuItem>
					<SidebarMenuButton
						class="cursor-pointer"
						@click="toggleColorMode">
						<SunMoonIcon />
						<span>{{ nextColorMode }}</span>
					</SidebarMenuButton>
				</SidebarMenuItem>
			</SidebarMenu>
		</SidebarGroupContent>
	</SidebarGroup>
</template>
