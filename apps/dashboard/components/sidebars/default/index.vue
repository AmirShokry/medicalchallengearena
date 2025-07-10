<script setup lang="ts">
import type { SidebarProps } from "@/components/ui/sidebar";

import { AudioWaveform, GalleryVerticalEnd } from "lucide-vue-next";
import {activeContentComponent} from "./utils";

import NavUser from "~/components/sidebars/default/NavUser.vue";
import RoleSwitcher from "~/components/sidebars/default/RoleSwitcher.vue";

import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
} from "@/components/ui/sidebar";

const props = withDefaults(defineProps<SidebarProps>(), {
	collapsible: "icon",
});

const data = {
	user: {
		name: "amir",
		email: "amir@example.com",
		avatar: "/avatars/shadcn.jpg",
	},
	roles: [
		{
			name: "MCA",
			logo: GalleryVerticalEnd,
			plan: "Super Admin",
		},
		{
			name: "Data Entry",
			logo: AudioWaveform,
			plan: "Standard",
		},
	],
};


</script>

<template>
	<Sidebar v-bind="props">
		<SidebarHeader>
			<RoleSwitcher :roles="data.roles" />
		</SidebarHeader>
		<SidebarContent class="thin-scrollbar">
			<component :is="activeContentComponent" />
		</SidebarContent>
		<SidebarFooter>
			<NavUser :user="data.user" />
		</SidebarFooter>
	</Sidebar>
</template>
